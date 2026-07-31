'use strict';

/**
 * Gym Module Dashboard Controller
 * 
 * Provides main dashboard statistics for gym operations
 * 
 * @module controllers/gym/report/dashboardController
 */

const { 
  Transaction,
  TransactionPayment,
  TransactionItem,
  ActiveService,
  Member,
  CheckIn,
  Trainer,
  CashRegisterSession,
  Expense,
  User,
  Tenant,
  sequelize 
} = require('../../../models');
const { Op, fn, col, literal } = require('sequelize');
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');
const receiptPrinterService = require('../../../services/receiptPrinterService');
const {
  REVENUE_RECOGNIZED_TRANSACTION_STATUSES,
  REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL,
  CASH_REGISTER_TRANSACTION_STATUSES,
  COMPLETED_PAYMENT_STATUS,
  shouldIncludeCashierTransaction,
} = require('../../../utils/reportingStatus');
const { getTenantTimezone, todayInTz, startOfDayInTz, endOfDayInTz, addDays, firstDayOfMonth, firstDayOfPrevMonth, lastDayOfPrevMonth } = require('../../../utils/tenantTimezone');

function getDateAnchors(req) {
  const tz = getTenantTimezone(req);
  const todayStr = todayInTz(tz);
  return {
    tz,
    todayStr,
    today: startOfDayInTz(todayStr, tz),
    tomorrow: startOfDayInTz(addDays(todayStr, 1), tz),
    yesterday: startOfDayInTz(addDays(todayStr, -1), tz),
    thisMonthStart: startOfDayInTz(firstDayOfMonth(todayStr), tz),
    lastMonthStart: startOfDayInTz(firstDayOfPrevMonth(todayStr), tz),
    lastMonthEnd: endOfDayInTz(lastDayOfPrevMonth(todayStr), tz),
  };
}

/**
 * Get main dashboard overview for gym operations
 * @route GET /api/v1/gym/dashboard/overview
 * @query locationId - Filter by location
 */
async function getDashboardOverview(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { locationId } = req.query;

    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }
    if (locationId) {
      where.locationId = locationId;
    }

    const {
      today, tomorrow, yesterday, thisMonthStart, lastMonthStart, lastMonthEnd
    } = getDateAnchors(req);

    // 1. TODAY'S REVENUE
    const todayTransactions = await Transaction.findAll({
      where: {
        ...where,
        transactionType: 'gym',
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      },
      attributes: ['totalAmount']
    });

    const todayRevenue = todayTransactions.reduce((sum, t) => sum + parseFloat(t.totalAmount || 0), 0);

    // Yesterday's revenue for comparison
    const yesterdayTransactions = await Transaction.findAll({
      where: {
        ...where,
        transactionType: 'gym',
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: {
          [Op.gte]: yesterday,
          [Op.lt]: today
        }
      },
      attributes: ['totalAmount']
    });

    const yesterdayRevenue = yesterdayTransactions.reduce((sum, t) => sum + parseFloat(t.totalAmount || 0), 0);
    const revenueChange = yesterdayRevenue > 0 
      ? (((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100).toFixed(1)
      : 0;

    // 2. THIS MONTH'S REVENUE
    const thisMonthTransactions = await Transaction.findAll({
      where: {
        ...where,
        transactionType: 'gym',
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: {
          [Op.gte]: thisMonthStart
        }
      },
      attributes: ['totalAmount']
    });

    const thisMonthRevenue = thisMonthTransactions.reduce((sum, t) => sum + parseFloat(t.totalAmount || 0), 0);

    // Last month's revenue for comparison
    const lastMonthTransactions = await Transaction.findAll({
      where: {
        ...where,
        transactionType: 'gym',
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: {
          [Op.gte]: lastMonthStart,
          [Op.lte]: lastMonthEnd
        }
      },
      attributes: ['totalAmount']
    });

    const lastMonthRevenue = lastMonthTransactions.reduce((sum, t) => sum + parseFloat(t.totalAmount || 0), 0);
    const monthlyRevenueChange = lastMonthRevenue > 0 
      ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
      : 0;

    // 3. ACTIVE MEMBERS
    // Count distinct member IDs (not rows) with endDate >= now to exclude
    // expired services that still carry status='active' and members with multiple active plans
    const activeMembersCount = await ActiveService.count({
      where: {
        ...(isSuperAdmin ? {} : { tenantId }),
        status: 'active',
        serviceType: 'membership',
        endDate: { [Op.gte]: new Date() }
      },
      distinct: true,
      col: 'memberId'
    });

    // 4. TODAY'S CHECK-INS
    const todayCheckIns = await CheckIn.count({
      where: {
        ...where,
        checkInTime: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });

    // Unique members checked in today
    const uniqueCheckInsToday = await CheckIn.count({
      where: {
        ...where,
        checkInTime: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      },
      distinct: true,
      col: 'memberId'
    });

    // 5. EXPIRING SERVICES (next 7 days)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const expiringSoon = await ActiveService.count({
      where: {
        ...(isSuperAdmin ? {} : { tenantId }),
        status: 'active',
        endDate: {
          [Op.between]: [new Date(), futureDate]
        }
      }
    });

    // 6. ACTIVE SERVICE BREAKDOWN
    const serviceBreakdown = await ActiveService.findAll({
      where: {
        ...(isSuperAdmin ? {} : { tenantId }),
        status: 'active'
      },
      attributes: [
        'serviceType',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['serviceType'],
      raw: true
    });

    // 7. RECENT TRANSACTIONS (last 5)
    const recentTransactions = await Transaction.findAll({
      where: {
        ...where,
        transactionType: 'gym'
      },
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'transactionNumber', 'totalAmount', 'status', 'createdAt']
    });

    // 8. MEMBER GROWTH (this month vs last month)
    const newMembersThisMonth = await Member.count({
      where: {
        ...(isSuperAdmin ? {} : { tenantId }),
        createdAt: {
          [Op.gte]: thisMonthStart
        }
      }
    });

    const newMembersLastMonth = await Member.count({
      where: {
        ...(isSuperAdmin ? {} : { tenantId }),
        createdAt: {
          [Op.gte]: lastMonthStart,
          [Op.lte]: lastMonthEnd
        }
      }
    });

    const memberGrowth = newMembersLastMonth > 0
      ? (((newMembersThisMonth - newMembersLastMonth) / newMembersLastMonth) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        revenue: {
          today: {
            amount: parseFloat(todayRevenue.toFixed(2)),
            change: parseFloat(revenueChange),
            transactions: todayTransactions.length
          },
          thisMonth: {
            amount: parseFloat(thisMonthRevenue.toFixed(2)),
            change: parseFloat(monthlyRevenueChange),
            transactions: thisMonthTransactions.length
          }
        },
        members: {
          active: activeMembersCount,
          newThisMonth: newMembersThisMonth,
          growth: parseFloat(memberGrowth)
        },
        attendance: {
          today: todayCheckIns,
          uniqueToday: uniqueCheckInsToday
        },
        services: {
          expiringSoon,
          breakdown: serviceBreakdown.map(item => ({
            type: item.serviceType,
            count: parseInt(item.count || 0)
          }))
        },
        recentTransactions: recentTransactions.map(t => ({
          id: t.id,
          transactionNumber: t.transactionNumber,
          amount: parseFloat(t.totalAmount),
          status: t.status,
          createdAt: t.createdAt
        }))
      }
    });

    logger.logInfo('Gym dashboard overview retrieved', {
      action: 'GYM_DASHBOARD_OVERVIEW',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error retrieving gym dashboard overview', {
      action: 'GYM_DASHBOARD_OVERVIEW_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Get dashboard statistics (simplified version)
 * @route GET /api/v1/gym/dashboard/stats
 */
async function getDashboardStats(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;

    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Total counts
    const totalMembers = await Member.count({ where });
    const activeServices = await ActiveService.count({
      where: {
        ...(isSuperAdmin ? {} : { tenantId }),
        status: 'active'
      }
    });

    const { today, tomorrow } = getDateAnchors(req);

    const todayCheckIns = await CheckIn.count({
      where: {
        ...where,
        checkInTime: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthRevenue = await Transaction.sum('totalAmount', {
      where: {
        ...where,
        transactionType: 'gym',
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: {
          [Op.gte]: thisMonthStart
        }
      }
    });

    res.json({
      success: true,
      data: {
        totalMembers,
        activeServices,
        todayCheckIns,
        thisMonthRevenue: parseFloat(thisMonthRevenue || 0)
      }
    });

  } catch (error) {
    logger.logError('Error retrieving gym dashboard stats', {
      action: 'GYM_DASHBOARD_STATS_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Get comprehensive gym dashboard overview
 * All-in-one endpoint for gym dashboard
 * @route GET /api/v1/gym/dashboard/comprehensive
 * @query locationId - Filter by location
 */
async function getGymComprehensive(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { locationId } = req.query;

    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }
    if (locationId) {
      where.locationId = locationId;
    }

    const {
      today, tomorrow, yesterday, thisMonthStart, lastMonthStart, lastMonthEnd
    } = getDateAnchors(req);

    // ======================
    // 1. REVENUE SECTION
    // ======================
    
    // Today's revenue
    const todayRevenue = await Transaction.findAll({
      where: {
        ...where,
        transactionType: 'gym',
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      },
      attributes: [
        [fn('SUM', col('subtotal')), 'subtotal'],
        [fn('SUM', col('tax')), 'tax'],
        [fn('SUM', col('voucherDiscount')), 'discount'],
        [fn('SUM', col('totalAmount')), 'total'],
        [fn('COUNT', col('id')), 'transactions']
      ],
      raw: true
    });

    // Yesterday's revenue for comparison
    const yesterdayRevenue = await Transaction.findAll({
      where: {
        ...where,
        transactionType: 'gym',
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: {
          [Op.gte]: yesterday,
          [Op.lt]: today
        }
      },
      attributes: [
        [fn('SUM', col('totalAmount')), 'total']
      ],
      raw: true
    });

    // This month's revenue
    const thisMonthRevenue = await Transaction.findAll({
      where: {
        ...where,
        transactionType: 'gym',
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: {
          [Op.gte]: thisMonthStart
        }
      },
      attributes: [
        [fn('SUM', col('totalAmount')), 'total'],
        [fn('COUNT', col('id')), 'transactions']
      ],
      raw: true
    });

    // Last month's revenue for comparison
    const lastMonthRevenue = await Transaction.findAll({
      where: {
        ...where,
        transactionType: 'gym',
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: {
          [Op.gte]: lastMonthStart,
          [Op.lte]: lastMonthEnd
        }
      },
      attributes: [
        [fn('SUM', col('totalAmount')), 'total']
      ],
      raw: true
    });

    const todayTotal = parseFloat(todayRevenue[0]?.total || 0);
    const yesterdayTotal = parseFloat(yesterdayRevenue[0]?.total || 0);
    const thisMonthTotal = parseFloat(thisMonthRevenue[0]?.total || 0);
    const lastMonthTotal = parseFloat(lastMonthRevenue[0]?.total || 0);

    const revenueChange = yesterdayTotal > 0 
      ? parseFloat((((todayTotal - yesterdayTotal) / yesterdayTotal) * 100).toFixed(1))
      : 0;
    
    const monthlyChange = lastMonthTotal > 0
      ? parseFloat((((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1))
      : 0;

    const avgOrderValue = parseInt(todayRevenue[0]?.transactions || 0) > 0
      ? todayTotal / parseInt(todayRevenue[0]?.transactions)
      : 0;

    // ======================
    // 2. MEMBERS SECTION
    // ======================

    // Total members
    const totalMembers = await Member.count({ where: isSuperAdmin ? {} : { tenantId } });

    // Active members (with active membership)
    // Count distinct member IDs (not rows) with endDate >= now to exclude
    // expired services that still carry status='active' and members with multiple active plans
    const activeMembers = await ActiveService.count({
      where: {
        ...(isSuperAdmin ? {} : { tenantId }),
        status: 'active',
        serviceType: 'membership',
        endDate: { [Op.gte]: new Date() }
      },
      distinct: true,
      col: 'memberId'
    });

    // New members this month
    const newMembersThisMonth = await Member.count({
      where: {
        ...(isSuperAdmin ? {} : { tenantId }),
        createdAt: {
          [Op.gte]: thisMonthStart
        }
      }
    });

    // New members last month
    const newMembersLastMonth = await Member.count({
      where: {
        ...(isSuperAdmin ? {} : { tenantId }),
        createdAt: {
          [Op.gte]: lastMonthStart,
          [Op.lte]: lastMonthEnd
        }
      }
    });

    const memberGrowth = newMembersLastMonth > 0
      ? parseFloat((((newMembersThisMonth - newMembersLastMonth) / newMembersLastMonth) * 100).toFixed(1))
      : 0;

    // Expiring memberships (next 7 days)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const expiringMemberships = await ActiveService.count({
      where: {
        ...(isSuperAdmin ? {} : { tenantId }),
        status: 'active',
        serviceType: 'membership',
        endDate: {
          [Op.between]: [now, futureDate]
        }
      }
    });

    // ======================
    // 3. ATTENDANCE SECTION
    // ======================

    // Today's check-ins
    const todayCheckIns = await CheckIn.count({
      where: {
        ...where,
        checkInTime: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });

    // Unique members today
    const uniqueMembersToday = await CheckIn.count({
      where: {
        ...where,
        checkInTime: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      },
      distinct: true,
      col: 'memberId'
    });

    // Yesterday's check-ins for comparison
    const yesterdayCheckIns = await CheckIn.count({
      where: {
        ...where,
        checkInTime: {
          [Op.gte]: yesterday,
          [Op.lt]: today
        }
      }
    });

    const attendanceChange = yesterdayCheckIns > 0
      ? parseFloat((((todayCheckIns - yesterdayCheckIns) / yesterdayCheckIns) * 100).toFixed(1))
      : 0;

    // Peak hours today (top 5)
    const peakHours = await CheckIn.findAll({
      where: {
        ...where,
        checkInTime: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      },
      attributes: [
        [fn('DATE_PART', literal("'hour'"), col('checkInTime')), 'hour'],
        [fn('COUNT', col('id')), 'count']
      ],
      group: [literal("DATE_PART('hour', \"CheckIn\".\"checkInTime\")")],
      order: [[fn('COUNT', col('id')), 'DESC']],
      limit: 5,
      raw: true
    });

    // ======================
    // 4. SERVICES SECTION
    // ======================

    // Active services breakdown
    const activeServicesBreakdown = await ActiveService.findAll({
      where: {
        ...(isSuperAdmin ? {} : { tenantId }),
        status: 'active'
      },
      attributes: [
        'serviceType',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['serviceType'],
      raw: true
    });

    const totalActiveServices = activeServicesBreakdown.reduce((sum, s) => sum + parseInt(s.count || 0), 0);

    // Services with low sessions (< 3 remaining)
    const lowSessionServices = await ActiveService.count({
      where: {
        ...(isSuperAdmin ? {} : { tenantId }),
        status: 'active',
        remainingSessions: {
          [Op.lte]: 3,
          [Op.gt]: 0
        }
      }
    });

    // ======================
    // 5. TRANSACTIONS SECTION
    // ======================

    // Recent transactions (last 5 today)
    const recentTransactions = await Transaction.findAll({
      where: {
        ...where,
        transactionType: 'gym',
        createdAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'transactionNumber', 'totalAmount', 'status', 'createdAt']
    });

    // Payment method breakdown today
    const paymentMethods = await sequelize.query(`
      SELECT 
        tp."paymentMethod",
        COUNT(DISTINCT t.id) as "transactionCount",
        SUM(tp.amount) as total
      FROM "TransactionPayments" tp
      INNER JOIN "Transactions" t ON t.id = tp."transactionId"
      WHERE t."tenantId" = :tenantId
        AND t."transactionType" = 'gym'
        AND t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        AND t."createdAt" >= :today
        AND t."createdAt" < :tomorrow
        AND tp."status" = '${COMPLETED_PAYMENT_STATUS}'
        ${locationId ? 'AND t."locationId" = :locationId' : ''}
      GROUP BY tp."paymentMethod"
      ORDER BY total DESC
    `, {
      replacements: { 
        tenantId: isSuperAdmin ? null : tenantId,
        today,
        tomorrow,
        locationId: locationId || null
      },
      type: sequelize.QueryTypes.SELECT
    });

    // ======================
    // 6. ALERTS SECTION
    // ======================

    const alerts = {
      expiringMemberships,
      lowSessionServices,
      newMembersToday: await Member.count({
        where: {
          ...(isSuperAdmin ? {} : { tenantId }),
          createdAt: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        }
      })
    };

    // Build response
    res.json({
      success: true,
      data: {
        revenue: {
          today: {
            total: parseFloat(todayTotal.toFixed(2)),
            subtotal: parseFloat((todayRevenue[0]?.subtotal || 0)),
            tax: parseFloat((todayRevenue[0]?.tax || 0)),
            discount: parseFloat((todayRevenue[0]?.discount || 0)),
            transactions: parseInt(todayRevenue[0]?.transactions || 0),
            change: revenueChange,
            avgOrderValue: parseFloat(avgOrderValue.toFixed(2))
          },
          thisMonth: {
            total: parseFloat(thisMonthTotal.toFixed(2)),
            transactions: parseInt(thisMonthRevenue[0]?.transactions || 0),
            change: monthlyChange
          }
        },
        members: {
          total: totalMembers,
          active: activeMembers,
          newThisMonth: newMembersThisMonth,
          growth: memberGrowth,
          expiringMemberships
        },
        attendance: {
          today: {
            total: todayCheckIns,
            unique: uniqueMembersToday,
            change: attendanceChange
          },
          peakHours: peakHours.map(p => ({
            hour: parseInt(p.hour),
            checkIns: parseInt(p.count)
          }))
        },
        services: {
          active: {
            total: totalActiveServices,
            breakdown: activeServicesBreakdown.map(s => ({
              type: s.serviceType,
              count: parseInt(s.count)
            }))
          },
          lowSessionAlerts: lowSessionServices
        },
        payments: {
          methods: paymentMethods.map(pm => ({
            method: pm.paymentMethod,
            transactions: parseInt(pm.transactionCount),
            total: parseFloat(pm.total || 0)
          }))
        },
        recentTransactions: recentTransactions.map(t => ({
          id: t.id,
          transactionNumber: t.transactionNumber,
          amount: parseFloat(t.totalAmount),
          status: t.status,
          createdAt: t.createdAt
        })),
        alerts
      }
    });

    logger.logInfo('Gym comprehensive dashboard retrieved', {
      action: 'GYM_COMPREHENSIVE_DASHBOARD',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error retrieving gym comprehensive dashboard', {
      action: 'GYM_COMPREHENSIVE_DASHBOARD_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * GET /gym/dashboard/petty-cash
 * Dashboard petty cash — ringkasan sesi shift hari ini + list shift terakhir + transaksi detail
 */
async function getPettyCashDashboard(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { locationId, date, sessionId } = req.query;

    const targetDate = date || new Date().toISOString().slice(0, 10);

    // ── 1. Sesi shift yang SEDANG OPEN ───────────────────────────────────────
    const openSession = await CashRegisterSession.findOne({
      where: {
        tenantId,
        status: 'open',
        deletedAt: null,
        ...(locationId ? { locationId } : {}),
      },
      include: [
        { model: User, as: 'openedBy', attributes: ['id', 'firstName', 'lastName'] },
      ],
      order: [['openedAt', 'DESC']],
    });

    // Live summary for open session
    let liveSummary = null;
    let openSessionTransactions = null;
    if (openSession) {
      const openSessionTransactionWhere = {
        tenantId,
        ...(openSession.locationId ? { locationId: openSession.locationId } : {}),
      };

      const cashPayments = await TransactionPayment.findAll({
        where: {
          paymentMethod: 'cash',
          createdAt: { [Op.gte]: openSession.openedAt },
        },
        include: [{
          model: Transaction,
          as: 'transaction',
          where: openSessionTransactionWhere,
          required: true,
          // changeAmount needed: cashIn = tendered - kembalian (e.g. 100000 - 99949 = 51)
          attributes: ['id', 'status', 'changeAmount', 'locationId'],
        }],
        attributes: ['amount', 'createdAt'],
      });

      // Exclude cancelled, refunded, and partially_refunded from cash inflow
      const EXCLUDED_FROM_CASHIN = ['cancelled', 'refunded', 'partially_refunded'];

      // Net cash in = tendered amount minus change returned to customer.
      const cashIn = cashPayments
        .filter(p => !EXCLUDED_FROM_CASHIN.includes(p.transaction.status))
        .reduce((s, p) => {
          const tendered = parseFloat(p.amount || 0);
          const change = parseFloat(p.transaction.changeAmount || 0);
          return s + Math.max(0, tendered - change);
        }, 0);
      const refundOut = cashPayments
        .filter(p => ['refunded', 'partially_refunded'].includes(p.transaction.status))
        .reduce((s, p) => s + Math.max(0, parseFloat(p.amount || 0) - parseFloat(p.transaction.changeAmount || 0)), 0);

      // Cash expenses (pengeluaran kas) selama shift ini
      const cashExpenseRows = await Expense.findAll({
        where: {
          tenantId,
          paymentMethod: 'cash',
          status: { [Op.in]: ['approved', 'paid'] },
          createdAt: { [Op.gte]: openSession.openedAt },
          ...(openSession.locationId ? { [Op.or]: [{ locationId: openSession.locationId }, { locationId: null }] } : {}),
        },
        attributes: ['totalAmount'],
      });
      const cashExpenseOut = cashExpenseRows.reduce((s, e) => s + parseFloat(e.totalAmount || 0), 0);

      const cashOut = refundOut + cashExpenseOut;

      liveSummary = {
        openingBalance: parseFloat(openSession.openingBalance),
        cashIn,
        cashOut,
        cashExpenseOut,
        expectedCash: parseFloat(openSession.openingBalance) + cashIn - cashOut,
        transactionCount: cashPayments.filter(p => !EXCLUDED_FROM_CASHIN.includes(p.transaction.status)).length,
      };

      // Get all transactions for open session
      openSessionTransactions = await Transaction.findAll({
        where: {
          ...openSessionTransactionWhere,
          createdAt: { [Op.gte]: openSession.openedAt },
          deletedAt: null,
        },
        include: [
          {
            model: TransactionPayment,
            as: 'payments',
            attributes: ['id', 'paymentMethod', 'amount', 'createdAt'],
          },
          {
            model: User,
            as: 'createdByUser',
            attributes: ['id', 'firstName', 'lastName'],
          },
        ],
        order: [['createdAt', 'DESC']],
      });
    }

    // ── 2. Semua sesi pada targetDate ────────────────────────────────────────
    const todaySessions = await CashRegisterSession.findAll({
      where: {
        tenantId,
        shiftDate: targetDate,
        deletedAt: null,
        ...(locationId ? { locationId } : {}),
      },
      include: [
        { model: User, as: 'openedBy', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'closedBy', attributes: ['id', 'firstName', 'lastName'], required: false },
      ],
      order: [['shiftNumber', 'ASC']],
    });

    // ── 2.1. Detail transaksi untuk session tertentu (jika diminta) ─────────
    let sessionTransactions = null;
    let selectedSession = null;
    if (sessionId) {
      selectedSession = await CashRegisterSession.findOne({
        where: {
          tenantId,
          id: sessionId,
          deletedAt: null,
        },
        include: [
          { model: User, as: 'openedBy', attributes: ['id', 'firstName', 'lastName'] },
          { model: User, as: 'closedBy', attributes: ['id', 'firstName', 'lastName'], required: false },
        ],
      });

      if (selectedSession) {
        const sessionWhere = {
          tenantId,
          createdAt: { [Op.gte]: selectedSession.openedAt },
          deletedAt: null,
        };
        
        // Jika session sudah closed, batasi sampai closedAt
        if (selectedSession.closedAt) {
          sessionWhere.createdAt[Op.lte] = selectedSession.closedAt;
        }

        sessionTransactions = await Transaction.findAll({
          where: sessionWhere,
          include: [
            {
              model: TransactionPayment,
              as: 'payments',
              attributes: ['id', 'paymentMethod', 'amount', 'createdAt'],
            },
            {
              model: User,
              as: 'createdByUser',
              attributes: ['id', 'firstName', 'lastName'],
            },
          ],
          order: [['createdAt', 'DESC']],
        });
      }
    }

    // Aggregate ringkasan hari ini dari sesi yang sudah closed
    const closedSessions = todaySessions.filter(s => s.status === 'closed');
    
    // Calculate total cash flow from closed sessions
    let totalCashIn = 0;
    let totalCashOut = 0;
    let totalExpectedCash = 0;
    
    for (const session of closedSessions) {
      const cashSummary = await session.getCashSummary();
      totalCashIn += cashSummary.cashIn;
      totalCashOut += cashSummary.cashOut;
      totalExpectedCash += cashSummary.expectedCash;
    }
    
    const todayAggregate = {
      totalShifts: todaySessions.length,
      openShifts: todaySessions.filter(s => s.status === 'open').length,
      closedShifts: closedSessions.length,
      // Cash flow metrics (only from closed sessions)
      totalCashIn: parseFloat(totalCashIn.toFixed(2)),
      totalCashOut: parseFloat(totalCashOut.toFixed(2)),
      totalExpectedCash: parseFloat(totalExpectedCash.toFixed(2)),
      totalActualCash: closedSessions.reduce((s, x) => s + parseFloat(x.actualCash || 0), 0),
      totalDifference: closedSessions.reduce((s, x) => s + parseFloat(x.difference || 0), 0),
      // Plain text summary (without special UTF-8 characters for better compatibility)
      summary: `${closedSessions.length} closed, ${todaySessions.filter(s => s.status === 'open').length} open`,
    };

    // ── 3. Riwayat 7 hari terakhir (per hari, ringkasan sesi) ───────────────
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const fromDate = sevenDaysAgo.toISOString().slice(0, 10);

    const recentSessions = await CashRegisterSession.findAll({
      where: {
        tenantId,
        shiftDate: { [Op.gte]: fromDate },
        deletedAt: null,
        ...(locationId ? { locationId } : {}),
      },
      attributes: [
        'shiftDate',
        [sequelize.fn('COUNT', sequelize.col('id')), 'shiftCount'],
        [sequelize.literal(`COUNT(CASE WHEN status = 'closed' THEN 1 END)`), 'closedCount'],
        [sequelize.literal(`COUNT(CASE WHEN status = 'open' THEN 1 END)`), 'openCount'],
        [sequelize.fn('SUM', sequelize.col('openingBalance')), 'totalOpeningBalance'],
        [sequelize.fn('SUM', sequelize.col('closingBalance')), 'totalClosingBalance'],
        [sequelize.fn('SUM', sequelize.col('actualCash')), 'totalActualCash'],
        [sequelize.fn('SUM', sequelize.col('difference')), 'totalDifference'],
      ],
      group: ['shiftDate'],
      order: [['shiftDate', 'ASC']],
      raw: true,
    });

    // Format all numeric fields to 2 decimal places
    const DECIMAL_FIELDS = ['totalOpeningBalance', 'totalClosingBalance', 'totalActualCash', 'totalDifference'];
    const formattedHistory = recentSessions.map((row) => {
      const formatted = { ...row };
      DECIMAL_FIELDS.forEach((field) => {
        if (formatted[field] !== null && formatted[field] !== undefined) {
          formatted[field] = parseFloat(parseFloat(formatted[field]).toFixed(2));
        }
      });
      formatted.shiftCount = parseInt(formatted.shiftCount, 10);
      formatted.closedCount = parseInt(formatted.closedCount, 10);
      formatted.openCount = parseInt(formatted.openCount, 10);
      return formatted;
    });

    // Grand totals across all 7 days
    const totals = {
      totalDays: formattedHistory.length,
      totalShifts: formattedHistory.reduce((s, r) => s + r.shiftCount, 0),
      totalClosedShifts: formattedHistory.reduce((s, r) => s + r.closedCount, 0),
      totalOpenShifts: formattedHistory.reduce((s, r) => s + r.openCount, 0),
      totalOpeningBalance: parseFloat(formattedHistory.reduce((s, r) => s + (r.totalOpeningBalance || 0), 0).toFixed(2)),
      totalClosingBalance: parseFloat(formattedHistory.reduce((s, r) => s + (r.totalClosingBalance || 0), 0).toFixed(2)),
      totalActualCash: parseFloat(formattedHistory.reduce((s, r) => s + (r.totalActualCash || 0), 0).toFixed(2)),
      totalDifference: parseFloat(formattedHistory.reduce((s, r) => s + (r.totalDifference || 0), 0).toFixed(2)),
    };

    return res.json({
      success: true,
      data: {
        targetDate,
        currentSession: openSession
          ? { 
              ...openSession.toJSON(), 
              liveSummary,
              transactions: openSessionTransactions || [],
            }
          : null,
        todaySessions,
        todayAggregate,
        recentHistory: formattedHistory,
        totals,
        // Detail transaksi untuk session tertentu (jika diminta via sessionId)
        selectedSession: selectedSession ? {
          ...selectedSession.toJSON(),
          transactions: sessionTransactions || [],
        } : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /gym/dashboard/petty-cash/print-shift-report
 * Print thermal receipt for cashier shift report
 * @body sessionId - Required: ID of the cash register session to print
 */
async function printShiftReport(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'sessionId is required',
      });
    }

    // Load session with details
    const session = await CashRegisterSession.findOne({
      where: {
        tenantId,
        id: sessionId,
        deletedAt: null,
      },
      include: [
        { model: User, as: 'openedBy', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'closedBy', attributes: ['id', 'firstName', 'lastName'], required: false },
      ],
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Get tenant for printer settings
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    // Get all transactions in this session (exclude cancelled/voided)
    const sessionWhere = {
      tenantId,
      createdAt: { [Op.gte]: session.openedAt },
      status: { [Op.in]: CASH_REGISTER_TRANSACTION_STATUSES },
      deletedAt: null,
      ...(session.locationId ? { locationId: session.locationId } : {}),
    };
    
    if (session.closedAt) {
      sessionWhere.createdAt[Op.lte] = session.closedAt;
    }

    const transactions = await Transaction.findAll({
      where: sessionWhere,
      include: [
        {
          model: TransactionPayment,
          as: 'payments',
          where: { status: COMPLETED_PAYMENT_STATUS },
          required: false,
          attributes: ['id', 'paymentMethod', 'amount', 'createdAt'],
        },
        {
          model: TransactionItem,
          as: 'items',
          attributes: ['id', 'itemName', 'quantity', 'unitPrice', 'total'],
        },
        {
          model: User,
          as: 'createdByUser',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    // Build receipt content
    const receiptContent = buildShiftReportReceipt(session, transactions, tenant);

    // Get printer settings
    const printer = receiptPrinterService.getReceiptPrinter(tenant);
    
    if (!printer) {
      return res.json({
        success: true,
        message: 'Receipt generated but printer not configured',
        data: {
          sessionId: session.id,
          printed: false,
          content: receiptContent,
        },
      });
    }

    // Check if printer is network type
    if (printer.connectionType !== 'network') {
      return res.json({
        success: true,
        message: 'Only network printers are supported',
        data: {
          sessionId: session.id,
          printed: false,
          connectionType: printer.connectionType,
          content: receiptContent,
        },
      });
    }

    // Send to printer
    try {
      await receiptPrinterService.sendToPrinter(
        printer.ipAddress,
        printer.port || 9100,
        receiptContent,
        5000
      );

      logger.info('Shift report printed successfully', {
        tenantId,
        sessionId: session.id,
        shiftDate: session.shiftDate,
        printer: printer.name,
      });

      return res.json({
        success: true,
        message: 'Shift report printed successfully',
        data: {
          sessionId: session.id,
          printed: true,
          printer: printer.name,
        },
      });
    } catch (printError) {
      logger.error('Failed to print shift report', {
        tenantId,
        sessionId: session.id,
        error: printError.message,
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to print shift report',
        error: printError.message,
        data: {
          sessionId: session.id,
          content: receiptContent,
        },
      });
    }
  } catch (err) {
    next(err);
  }
}

/**
 * Build thermal receipt content for shift report
 */
function buildShiftReportReceipt(session, transactions, tenant) {
  const ESC = '\x1b';
  const GS = '\x1d';
  const COMMANDS = {
    INIT: ESC + '@',
    ALIGN_CENTER: ESC + 'a' + '\x01',
    ALIGN_LEFT: ESC + 'a' + '\x00',
    BOLD_ON: ESC + 'E' + '\x01',
    BOLD_OFF: ESC + 'E' + '\x00',
    SIZE_NORMAL: GS + '!' + '\x00',
    SIZE_DOUBLE: GS + '!' + '\x11',
    LINE_FEED: '\n',
    FEED_AND_CUT: `${GS}V\x41\x03`,  // Feed 3 lines and cut (more reliable)
  };

  const width = 48;
  const separator = '-'.repeat(width);
  const doubleSeparator = '='.repeat(width);

  const formatCurrency = (amount) => {
    // Format currency for thermal printer (avoid non-breaking space issue)
    const formatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
    
    // Replace non-breaking space (U+00A0) with regular space
    // This fixes "Rpâ" issue in thermal printers
    return formatted.replace(/\u00A0/g, ' ');
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const padLine = (left, right) => {
    const leftStr = String(left);
    const rightStr = String(right);
    const spaces = width - leftStr.length - rightStr.length;
    return leftStr + ' '.repeat(Math.max(1, spaces)) + rightStr;
  };

  let content = COMMANDS.INIT;

  // Header
  content += COMMANDS.ALIGN_CENTER;
  content += COMMANDS.SIZE_DOUBLE;
  content += 'LAPORAN SHIFT KASIR' + COMMANDS.LINE_FEED;
  content += COMMANDS.SIZE_NORMAL;
  content += COMMANDS.LINE_FEED;

  // Tenant info
  if (tenant.name) {
    content += COMMANDS.BOLD_ON;
    content += tenant.name + COMMANDS.LINE_FEED;
    content += COMMANDS.BOLD_OFF;
  }
  if (tenant.address) {
    content += tenant.address + COMMANDS.LINE_FEED;
  }
  if (tenant.phone) {
    content += 'Telp: ' + tenant.phone + COMMANDS.LINE_FEED;
  }
  content += COMMANDS.LINE_FEED;

  // Session info
  content += COMMANDS.ALIGN_LEFT;
  content += doubleSeparator + COMMANDS.LINE_FEED;
  content += COMMANDS.BOLD_ON;
  content += 'INFORMASI SHIFT' + COMMANDS.LINE_FEED;
  content += COMMANDS.BOLD_OFF;
  content += separator + COMMANDS.LINE_FEED;
  
  content += padLine('Shift:', session.shiftName) + COMMANDS.LINE_FEED;
  content += padLine('Tanggal:', session.shiftDate) + COMMANDS.LINE_FEED;
  content += padLine('Dibuka:', formatDate(session.openedAt)) + COMMANDS.LINE_FEED;
  content += padLine('Oleh:', 
    `${session.openedBy?.firstName || ''} ${session.openedBy?.lastName || ''}`.trim()
  ) + COMMANDS.LINE_FEED;
  
  if (session.closedAt) {
    content += padLine('Ditutup:', formatDate(session.closedAt)) + COMMANDS.LINE_FEED;
    content += padLine('Oleh:', 
      `${session.closedBy?.firstName || ''} ${session.closedBy?.lastName || ''}`.trim()
    ) + COMMANDS.LINE_FEED;
  } else {
    content += padLine('Status:', 'MASIH BUKA') + COMMANDS.LINE_FEED;
  }
  
  content += doubleSeparator + COMMANDS.LINE_FEED;
  content += COMMANDS.LINE_FEED;

  // Calculate summaries by payment method
  const paymentSummary = {};
  let totalTransactions = 0;
  let totalAmount = 0;
  let totalDiscount = 0;
  let totalSubtotal = 0;

  transactions.forEach(trx => {
    // transactions already filtered at DB level, but guard here too
    if (shouldIncludeCashierTransaction(trx)) {
      totalTransactions++;
      totalAmount += parseFloat(trx.totalAmount || 0);
      totalDiscount += parseFloat(trx.voucherDiscount || 0);
      totalSubtotal += parseFloat(trx.subtotal || 0);

      trx.payments?.forEach(payment => {
        const method = payment.paymentMethod || 'unknown';
        if (!paymentSummary[method]) {
          paymentSummary[method] = { count: 0, amount: 0 };
        }
        paymentSummary[method].count++;
        paymentSummary[method].amount += parseFloat(payment.amount || 0);
      });
    }
  });

  // Financial summary
  content += COMMANDS.BOLD_ON;
  content += 'RINGKASAN KEUANGAN' + COMMANDS.LINE_FEED;
  content += COMMANDS.BOLD_OFF;
  content += separator + COMMANDS.LINE_FEED;
  
  content += padLine('Saldo Awal:', formatCurrency(session.openingBalance)) + COMMANDS.LINE_FEED;
  content += COMMANDS.LINE_FEED;

  // Payment methods breakdown
  content += COMMANDS.BOLD_ON;
  content += 'Pembayaran per Metode:' + COMMANDS.LINE_FEED;
  content += COMMANDS.BOLD_OFF;
  
  Object.entries(paymentSummary).forEach(([method, data]) => {
    const methodLabel = method === 'cash' ? 'Tunai' :
                       method === 'card' ? 'Kartu' :
                       method === 'qris' ? 'QRIS' :
                       method === 'e-wallet' ? 'E-Wallet' : method;
    content += padLine(`  ${methodLabel} (${data.count}x):`, formatCurrency(data.amount)) + COMMANDS.LINE_FEED;
  });
  
  content += COMMANDS.LINE_FEED;
  content += padLine('Penjualan Kotor:', formatCurrency(totalSubtotal)) + COMMANDS.LINE_FEED;
  if (totalDiscount > 0) {
    content += padLine('Total Diskon:', formatCurrency(totalDiscount)) + COMMANDS.LINE_FEED;
  }
  content += padLine('Total Penjualan:', formatCurrency(totalAmount)) + COMMANDS.LINE_FEED;
  
  const cashAmount = paymentSummary.cash?.amount || 0;
  const expectedCash = parseFloat(session.openingBalance) + cashAmount;
  
  content += padLine('Total Tunai:', formatCurrency(cashAmount)) + COMMANDS.LINE_FEED;
  content += padLine('Kas Diharapkan:', formatCurrency(expectedCash)) + COMMANDS.LINE_FEED;
  
  if (session.actualCash != null) {
    content += padLine('Kas Aktual:', formatCurrency(session.actualCash)) + COMMANDS.LINE_FEED;
    content += padLine('Selisih:', formatCurrency(session.difference)) + COMMANDS.LINE_FEED;
  }
  
  content += separator + COMMANDS.LINE_FEED;
  content += padLine('Jumlah Transaksi:', totalTransactions) + COMMANDS.LINE_FEED;
  content += doubleSeparator + COMMANDS.LINE_FEED;
  content += COMMANDS.LINE_FEED;

  // Transaction details
  content += COMMANDS.BOLD_ON;
  content += 'DETAIL TRANSAKSI' + COMMANDS.LINE_FEED;
  content += COMMANDS.BOLD_OFF;
  content += separator + COMMANDS.LINE_FEED;

  transactions.forEach((trx, idx) => {
    content += `${idx + 1}. ${trx.transactionNumber}` + COMMANDS.LINE_FEED;
    content += `   ${formatDate(trx.createdAt)}` + COMMANDS.LINE_FEED;
    content += `   Tipe: ${trx.transactionType || 'N/A'}` + COMMANDS.LINE_FEED;
    
    if (trx.items && trx.items.length > 0) {
      trx.items.forEach(item => {
        content += `   - ${item.quantity}x ${item.itemName}` + COMMANDS.LINE_FEED;
      });
    }
    
    content += padLine('   Subtotal:', formatCurrency(trx.subtotal)) + COMMANDS.LINE_FEED;
    
    if (parseFloat(trx.voucherDiscount || 0) > 0) {
      content += padLine('   Diskon:', formatCurrency(trx.voucherDiscount)) + COMMANDS.LINE_FEED;
    }
    if (parseFloat(trx.tax || 0) > 0) {
      content += padLine('   Pajak:', formatCurrency(trx.tax)) + COMMANDS.LINE_FEED;
    }
    if (parseFloat(trx.serviceCharge || 0) > 0) {
      content += padLine('   Service:', formatCurrency(trx.serviceCharge)) + COMMANDS.LINE_FEED;
    }
    
    content += COMMANDS.BOLD_ON;
    content += padLine('   TOTAL:', formatCurrency(trx.totalAmount)) + COMMANDS.LINE_FEED;
    content += COMMANDS.BOLD_OFF;
    
    if (trx.payments && trx.payments.length > 0) {
      content += '   Pembayaran:' + COMMANDS.LINE_FEED;
      trx.payments.forEach(pay => {
        const methodLabel = pay.paymentMethod === 'cash' ? 'Tunai' :
                           pay.paymentMethod === 'card' ? 'Kartu' :
                           pay.paymentMethod === 'qris' ? 'QRIS' :
                           pay.paymentMethod === 'e-wallet' ? 'E-Wallet' : pay.paymentMethod;
        content += `     ${methodLabel}: ${formatCurrency(pay.amount)}` + COMMANDS.LINE_FEED;
      });
    }
    
    content += separator + COMMANDS.LINE_FEED;
  });

  content += COMMANDS.LINE_FEED;

  // Footer
  content += COMMANDS.ALIGN_CENTER;
  content += 'Dicetak: ' + formatDate(new Date()) + COMMANDS.LINE_FEED;
  content += COMMANDS.LINE_FEED;
  content += 'Terima kasih' + COMMANDS.LINE_FEED;
  content += COMMANDS.LINE_FEED;
  content += COMMANDS.LINE_FEED;

  // Cut paper (feed and cut for reliable auto-cut)
  content += COMMANDS.FEED_AND_CUT;

  return content;
}

module.exports = {
  getDashboardOverview,
  getDashboardStats,
  getGymComprehensive,
  getPettyCashDashboard,
  printShiftReport,
};
