'use strict';

/**
 * Global Report Controller
 *
 * Menyediakan data agregat lintas semua modul (gym, restaurant, finance)
 * dalam format chart-ready (time series, pie, bar) untuk keperluan infografis.
 *
 * @route GET /api/v1/dashboard/global-report
 * @query period    - 7d | 30d | 90d | 1y  (default: 30d)
 * @query startDate - custom start (ISO date), override period
 * @query endDate   - custom end   (ISO date), override period
 */

const db = require('../../models');
const {
  Transaction,
  ActiveService,
  Member,
  CheckIn,
  Expense,
  ServicePlan,
  TransactionItem,
  sequelize
} = db;
const { Op, fn, col, literal, QueryTypes } = require('sequelize');
const logger = require('../../utils/logger');
const {
  REVENUE_RECOGNIZED_TRANSACTION_STATUSES,
  REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL,
  COMPLETED_PAYMENT_STATUS,
  PAID_TRANSACTION_EXISTS_SQL,
  PAID_TRANSACTION_SEQUELIZE_LITERAL_SQL,
} = require('../../utils/reportingStatus');

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

/**
 * Buat array tanggal dari startDate sampai endDate (inklusif)
 * @returns {string[]} array ISO date string 'YYYY-MM-DD'
 */
function buildDateRange(startDate, endDate) {
  const dates = [];
  const cur = new Date(startDate);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

/**
 * Zero-fill time series dari query result ke array lengkap per tanggal
 * @param {string[]} dates - daftar tanggal
 * @param {object[]} rows  - [{date: 'YYYY-MM-DD', ...values}]
 * @param {object}   defaultValues - nilai default field selain 'date'
 */
function zeroFillSeries(dates, rows, defaultValues = {}) {
  const map = {};
  for (const row of rows) {
    const key = String(row.date).slice(0, 10);
    map[key] = row;
  }
  return dates.map(d => ({
    date: d,
    ...defaultValues,
    ...(map[d] || {})
  }));
}

/**
 * Hitung startDate berdasarkan period string
 */
function resolvePeriod(period, endDate) {
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const periodMap = {
    '7d':  7,
    '30d': 30,
    '90d': 90,
    '1y':  365
  };
  const days = periodMap[period] || 30;
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return start;
}

// ─────────────────────────────────────────
// Controller
// ─────────────────────────────────────────

async function getGlobalReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { period = '30d', startDate, endDate } = req.query;

    // --- Resolve date range ---
    const rangeEnd = endDate
      ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
      : new Date(new Date().setHours(23, 59, 59, 999));

    const rangeStart = startDate
      ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
      : resolvePeriod(period, rangeEnd);

    const dateList = buildDateRange(rangeStart, rangeEnd);
    const tenantFilter = isSuperAdmin ? '' : `AND t."tenantId" = '${tenantId}'`;
    const tenantWhere = isSuperAdmin ? {} : { tenantId };

    // ═══════════════════════════════════════════
    // 1. REVENUE TIME SERIES  (per hari, per modul)
    // ═══════════════════════════════════════════
    const revenueRows = await sequelize.query(`
      SELECT
        DATE_TRUNC('day', "createdAt") AS date,
        "transactionType"              AS module,
        SUM("totalAmount")             AS revenue,
        COUNT(id)                      AS transactions
      FROM "Transactions" t
      WHERE status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        AND ${PAID_TRANSACTION_EXISTS_SQL}
        AND "createdAt" >= :start
        AND "createdAt" <= :end
        AND "deletedAt" IS NULL
        ${tenantFilter}
      GROUP BY 1, 2
      ORDER BY 1
    `, {
      replacements: { start: rangeStart, end: rangeEnd },
      type: QueryTypes.SELECT
    });

    // Pivot per hari → { date, gym, restaurant, pos, total }
    const revByDate = {};
    for (const d of dateList) {
      revByDate[d] = { date: d, gym: 0, restaurant: 0, pos: 0, total: 0, transactions: 0 };
    }
    for (const row of revenueRows) {
      const key = String(row.date).slice(0, 10);
      if (!revByDate[key]) revByDate[key] = { date: key, gym: 0, restaurant: 0, pos: 0, total: 0, transactions: 0 };
      const rev = parseFloat(row.revenue || 0);
      const module = row.module || 'other';
      revByDate[key][module] = (revByDate[key][module] || 0) + rev;
      revByDate[key].total += rev;
      revByDate[key].transactions += parseInt(row.transactions || 0);
    }
    const revenueTimeSeries = Object.values(revByDate).map(r => ({
      date: r.date,
      gym: parseFloat((r.gym || 0).toFixed(2)),
      restaurant: parseFloat((r.restaurant || 0).toFixed(2)),
      pos: parseFloat((r.pos || 0).toFixed(2)),
      total: parseFloat(r.total.toFixed(2)),
      transactions: r.transactions
    }));

    // ═══════════════════════════════════════════
    // 2. REVENUE BY MODULE  (pie)
    // ═══════════════════════════════════════════
    const revenueByModule = await Transaction.findAll({
      where: {
        ...tenantWhere,
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: { [Op.between]: [rangeStart, rangeEnd] },
        [Op.and]: sequelize.literal(PAID_TRANSACTION_SEQUELIZE_LITERAL_SQL)
      },
      attributes: [
        'transactionType',
        [fn('SUM', col('totalAmount')), 'revenue'],
        [fn('COUNT', col('id')), 'transactions']
      ],
      group: ['transactionType'],
      raw: true
    });

    // ═══════════════════════════════════════════
    // 3. MEMBER GROWTH  (per hari, kumulatif)
    // ═══════════════════════════════════════════
    const memberGrowthRows = await sequelize.query(`
      SELECT
        DATE_TRUNC('day', "createdAt") AS date,
        COUNT(id) AS "newMembers"
      FROM "Members"
      WHERE "createdAt" >= :start
        AND "createdAt" <= :end
        ${isSuperAdmin ? '' : `AND "tenantId" = '${tenantId}'`}
      GROUP BY 1
      ORDER BY 1
    `, {
      replacements: { start: rangeStart, end: rangeEnd },
      type: QueryTypes.SELECT
    });

    // Hitung total member sebelum rangeStart untuk baseline kumulatif
    const memberBaseline = await Member.count({
      where: {
        ...tenantWhere,
        createdAt: { [Op.lt]: rangeStart }
      }
    });

    const memberGrowthFilled = zeroFillSeries(
      dateList,
      memberGrowthRows.map(r => ({ date: String(r.date).slice(0, 10), newMembers: parseInt(r.newMembers || 0) })),
      { newMembers: 0 }
    );
    let cumulative = memberBaseline;
    const memberGrowth = memberGrowthFilled.map(r => {
      cumulative += r.newMembers;
      return { ...r, cumulative };
    });

    // ═══════════════════════════════════════════
    // 4. ATTENDANCE TREND  (per hari)
    // ═══════════════════════════════════════════
    const attendanceRows = await sequelize.query(`
      SELECT
        DATE_TRUNC('day', "checkInTime") AS date,
        COUNT(id)                        AS "checkIns",
        COUNT(DISTINCT "memberId")       AS "uniqueMembers"
      FROM "CheckIns"
      WHERE "checkInTime" >= :start
        AND "checkInTime" <= :end
        ${isSuperAdmin ? '' : `AND "tenantId" = '${tenantId}'`}
      GROUP BY 1
      ORDER BY 1
    `, {
      replacements: { start: rangeStart, end: rangeEnd },
      type: QueryTypes.SELECT
    });

    const attendanceTrend = zeroFillSeries(
      dateList,
      attendanceRows.map(r => ({
        date: String(r.date).slice(0, 10),
        checkIns: parseInt(r.checkIns || 0),
        uniqueMembers: parseInt(r.uniqueMembers || 0)
      })),
      { checkIns: 0, uniqueMembers: 0 }
    );

    // ═══════════════════════════════════════════
    // 5. ATTENDANCE BY HOUR  (distribusi jam, bar)
    // ═══════════════════════════════════════════
    const attendanceByHourRows = await sequelize.query(`
      SELECT
        EXTRACT(HOUR FROM "checkInTime")::int AS hour,
        COUNT(id)                             AS "checkIns"
      FROM "CheckIns"
      WHERE "checkInTime" >= :start
        AND "checkInTime" <= :end
        ${isSuperAdmin ? '' : `AND "tenantId" = '${tenantId}'`}
      GROUP BY 1
      ORDER BY 1
    `, {
      replacements: { start: rangeStart, end: rangeEnd },
      type: QueryTypes.SELECT
    });

    const hourMap = {};
    for (let h = 0; h < 24; h++) hourMap[h] = 0;
    for (const row of attendanceByHourRows) hourMap[parseInt(row.hour)] = parseInt(row.checkIns || 0);
    const attendanceByHour = Object.entries(hourMap).map(([h, v]) => ({
      hour: parseInt(h),
      label: `${String(h).padStart(2, '0')}:00`,
      checkIns: v
    }));

    // ═══════════════════════════════════════════
    // 6. SERVICE PLAN DISTRIBUTION  (pie)
    // ═══════════════════════════════════════════
    const servicePlanDistribution = await sequelize.query(`
      SELECT
        sp.name               AS "planName",
        sp."serviceType",
        sp.price,
        COUNT(a.id)           AS "activeCount",
        COUNT(CASE WHEN a.status = 'active' AND a."endDate" >= NOW() THEN 1 END) AS "validCount"
      FROM "ActiveServices" a
      JOIN "ServicePlans" sp ON sp.id = a."servicePlanId"
      WHERE a."createdAt" >= :start
        AND a."createdAt" <= :end
        ${isSuperAdmin ? '' : `AND a."tenantId" = '${tenantId}'`}
      GROUP BY sp.id, sp.name, sp."serviceType", sp.price
      ORDER BY "activeCount" DESC
    `, {
      replacements: { start: rangeStart, end: rangeEnd },
      type: QueryTypes.SELECT
    });

    // ═══════════════════════════════════════════
    // 7. EXPIRING SERVICES  (countdown bands)
    // ═══════════════════════════════════════════
    const now = new Date();
    const in7  = new Date(now); in7.setDate(in7.getDate() + 7);
    const in14 = new Date(now); in14.setDate(in14.getDate() + 14);
    const in30 = new Date(now); in30.setDate(in30.getDate() + 30);

    const [exp7d, exp14d, exp30d] = await Promise.all([
      ActiveService.count({ where: { ...tenantWhere, status: 'active', endDate: { [Op.between]: [now, in7] } } }),
      ActiveService.count({ where: { ...tenantWhere, status: 'active', endDate: { [Op.between]: [in7, in14] } } }),
      ActiveService.count({ where: { ...tenantWhere, status: 'active', endDate: { [Op.between]: [in14, in30] } } })
    ]);

    const expiringBands = [
      { band: '0–7 hari',   days: 7,  count: exp7d },
      { band: '8–14 hari',  days: 14, count: exp14d },
      { band: '15–30 hari', days: 30, count: exp30d }
    ];

    // ═══════════════════════════════════════════
    // 8. RESTAURANT TREND  (per hari)
    // ═══════════════════════════════════════════
    const restaurantRows = await sequelize.query(`
      SELECT
        DATE_TRUNC('day', t."createdAt") AS date,
        COUNT(t.id)                      AS orders,
        SUM(t."totalAmount")             AS revenue,
        AVG(t."totalAmount")             AS "avgOrderValue"
      FROM "Transactions" t
      WHERE t."transactionType" = 'restaurant'
        AND t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        AND ${PAID_TRANSACTION_EXISTS_SQL}
        AND t."createdAt" >= :start
        AND t."createdAt" <= :end
        AND t."deletedAt" IS NULL
        ${isSuperAdmin ? '' : `AND t."tenantId" = '${tenantId}'`}
      GROUP BY 1
      ORDER BY 1
    `, {
      replacements: { start: rangeStart, end: rangeEnd },
      type: QueryTypes.SELECT
    });

    const restaurantTrend = zeroFillSeries(
      dateList,
      restaurantRows.map(r => ({
        date: String(r.date).slice(0, 10),
        orders: parseInt(r.orders || 0),
        revenue: parseFloat(parseFloat(r.revenue || 0).toFixed(2)),
        avgOrderValue: parseFloat(parseFloat(r.avgOrderValue || 0).toFixed(2))
      })),
      { orders: 0, revenue: 0, avgOrderValue: 0 }
    );

    // ═══════════════════════════════════════════
    // 9. TOP PRODUCTS RESTAURANT  (bar)
    // ═══════════════════════════════════════════
    const topProductRows = await sequelize.query(`
      SELECT
        ti.name            AS "productName",
        SUM(ti.quantity)   AS qty,
        SUM(ti."subtotal") AS revenue
      FROM "TransactionItems" ti
      JOIN "Transactions" t ON t.id = ti."transactionId"
      WHERE t."transactionType" = 'restaurant'
        AND t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        AND t."createdAt" >= :start
        AND t."createdAt" <= :end
        ${isSuperAdmin ? '' : `AND t."tenantId" = '${tenantId}'`}
      GROUP BY ti.name
      ORDER BY revenue DESC
      LIMIT 10
    `, {
      replacements: { start: rangeStart, end: rangeEnd },
      type: QueryTypes.SELECT
    });

    const topProducts = topProductRows.map(r => ({
      productName: r.productName,
      qty: parseInt(r.qty || 0),
      revenue: parseFloat(parseFloat(r.revenue || 0).toFixed(2))
    }));

    // ═══════════════════════════════════════════
    // 10. FINANCE BALANCE TREND  (per hari)
    // ═══════════════════════════════════════════
    let financeBalanceTrend = dateList.map(d => ({ date: d, revenue: 0, expense: 0, net: 0 }));

    if (Expense) {
      try {
        const expenseRows = await sequelize.query(`
          SELECT
            DATE_TRUNC('day', "expenseDate") AS date,
            SUM("totalAmount")               AS expense
          FROM "Expenses"
          WHERE status IN ('approved', 'paid')
            AND "expenseDate" >= :start
            AND "expenseDate" <= :end
            ${isSuperAdmin ? '' : `AND "tenantId" = '${tenantId}'`}
          GROUP BY 1
          ORDER BY 1
        `, {
          replacements: { start: rangeStart, end: rangeEnd },
          type: QueryTypes.SELECT
        });

        const expenseMap = {};
        for (const r of expenseRows) expenseMap[String(r.date).slice(0, 10)] = parseFloat(r.expense || 0);
        const revenueMap = {};
        for (const r of revenueTimeSeries) revenueMap[r.date] = r.total;

        financeBalanceTrend = dateList.map(d => {
          const revenue = revenueMap[d] || 0;
          const expense = expenseMap[d] || 0;
          return { date: d, revenue, expense, net: parseFloat((revenue - expense).toFixed(2)) };
        });
      } catch (err) {
        logger.logWarning('Finance balance trend error', { error: err.message });
      }
    }

    // ═══════════════════════════════════════════
    // 11. PAYMENT METHODS  (pie)
    // ═══════════════════════════════════════════
    const paymentMethodRows = await sequelize.query(`
      SELECT
        tp."paymentMethod"            AS method,
        COUNT(DISTINCT t.id)          AS "transactionCount",
        SUM(tp.amount)                AS total
      FROM "TransactionPayments" tp
      JOIN "Transactions" t ON t.id = tp."transactionId"
      WHERE t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        AND t."createdAt" >= :start
        AND t."createdAt" <= :end
        AND tp."status" = '${COMPLETED_PAYMENT_STATUS}'
        ${isSuperAdmin ? '' : `AND t."tenantId" = '${tenantId}'`}
      GROUP BY tp."paymentMethod"
      ORDER BY total DESC
    `, {
      replacements: { start: rangeStart, end: rangeEnd },
      type: QueryTypes.SELECT
    });

    const paymentMethods = paymentMethodRows.map(r => ({
      method: r.method,
      transactions: parseInt(r.transactionCount || 0),
      total: parseFloat(parseFloat(r.total || 0).toFixed(2))
    }));

    // ═══════════════════════════════════════════
    // 12. REVENUE BY SERVICE TYPE  (bar)
    // ═══════════════════════════════════════════
    const serviceTypeRevenueRows = await sequelize.query(`
      SELECT
        ti."itemType"        AS "serviceType",
        SUM(ti."subtotal")   AS revenue,
        COUNT(ti.id)         AS sold
      FROM "TransactionItems" ti
      JOIN "Transactions" t ON t.id = ti."transactionId"
      WHERE t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        AND t."createdAt" >= :start
        AND t."createdAt" <= :end
        ${isSuperAdmin ? '' : `AND t."tenantId" = '${tenantId}'`}
      GROUP BY ti."itemType"
      ORDER BY revenue DESC
    `, {
      replacements: { start: rangeStart, end: rangeEnd },
      type: QueryTypes.SELECT
    });

    const serviceTypeRevenue = serviceTypeRevenueRows.map(r => ({
      serviceType: r.serviceType,
      revenue: parseFloat(parseFloat(r.revenue || 0).toFixed(2)),
      sold: parseInt(r.sold || 0)
    }));

    // ═══════════════════════════════════════════
    // 13. KPI SUMMARY
    // ═══════════════════════════════════════════
    const totalRevenue = revenueTimeSeries.reduce((s, r) => s + r.total, 0);
    const totalTransactions = revenueTimeSeries.reduce((s, r) => s + r.transactions, 0);
    const totalCheckIns = attendanceTrend.reduce((s, r) => s + r.checkIns, 0);
    const totalRestaurantOrders = restaurantTrend.reduce((s, r) => s + r.orders, 0);
    const totalExpense = financeBalanceTrend.reduce((s, r) => s + r.expense, 0);
    const netProfit = totalRevenue - totalExpense;

    const [totalMembers, activeMembers] = await Promise.all([
      Member.count({ where: tenantWhere }),
      ActiveService.count({
        where: {
          ...tenantWhere,
          status: 'active',
          serviceType: 'membership',
          endDate: { [Op.gte]: now }
        }
      })
    ]);

    // Rata-rata harian
    const days = dateList.length || 1;
    const kpis = {
      period: {
        startDate: rangeStart.toISOString().slice(0, 10),
        endDate: rangeEnd.toISOString().slice(0, 10),
        days
      },
      revenue: {
        total: parseFloat(totalRevenue.toFixed(2)),
        avgPerDay: parseFloat((totalRevenue / days).toFixed(2)),
        transactions: totalTransactions
      },
      members: {
        total: totalMembers,
        active: activeMembers,
        newInPeriod: memberGrowth.reduce((s, r) => s + r.newMembers, 0)
      },
      attendance: {
        totalCheckIns,
        avgPerDay: parseFloat((totalCheckIns / days).toFixed(1))
      },
      restaurant: {
        orders: totalRestaurantOrders,
        avgOrdersPerDay: parseFloat((totalRestaurantOrders / days).toFixed(1))
      },
      finance: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalExpense: parseFloat(totalExpense.toFixed(2)),
        netProfit: parseFloat(netProfit.toFixed(2)),
        profitMargin: totalRevenue > 0
          ? parseFloat(((netProfit / totalRevenue) * 100).toFixed(1))
          : 0
      },
      expiring: {
        next7Days:  exp7d,
        next14Days: exp14d,
        next30Days: exp30d
      }
    };

    // ─────────────────────────────────────────
    // RESPONSE
    // ─────────────────────────────────────────
    res.json({
      success: true,
      data: {
        kpis,
        charts: {
          revenueTimeSeries,
          revenueByModule: revenueByModule.map(m => ({
            module: m.transactionType,
            revenue: parseFloat(parseFloat(m.revenue || 0).toFixed(2)),
            transactions: parseInt(m.transactions || 0)
          })),
          memberGrowth,
          attendanceTrend,
          attendanceByHour,
          servicePlanDistribution: servicePlanDistribution.map(s => ({
            planName: s.planName,
            serviceType: s.serviceType,
            price: parseFloat(s.price || 0),
            activeCount: parseInt(s.activeCount || 0),
            validCount: parseInt(s.validCount || 0)
          })),
          expiringBands,
          restaurantTrend,
          topProducts,
          financeBalanceTrend,
          paymentMethods,
          serviceTypeRevenue
        }
      }
    });

    logger.logInfo('Global report retrieved', {
      action: 'GLOBAL_REPORT',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      period,
      startDate: rangeStart,
      endDate: rangeEnd
    });

  } catch (error) {
    logger.logError('Error retrieving global report', {
      action: 'GLOBAL_REPORT_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

module.exports = { getGlobalReport };
