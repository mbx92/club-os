'use strict';

/**
 * Finance Dashboard Controller
 *
 * Provides KPI cards, revenue trends, expense breakdown, and cashflow summary
 * specifically for the finance module overview page.
 *
 * @module controllers/finance/financeDashboardController
 */

const {
  Transaction,
  TransactionPayment,
  Expense,
  ExpenseCategory,
  CashRegisterSession,
  sequelize,
} = require('../../models');
const { Op, fn, col, literal } = require('sequelize');
const logger = require('../../utils/logger');
const {
  REVENUE_RECOGNIZED_TRANSACTION_STATUSES,
  REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL,
  COMPLETED_PAYMENT_STATUS,
  PAID_TRANSACTION_SEQUELIZE_LITERAL_SQL,
} = require('../../utils/reportingStatus');

// Pre-built Sequelize condition for payment-exists filter (correct Op.and usage).
const PAID_TX_CONDITION = { [Op.and]: sequelize.literal(PAID_TRANSACTION_SEQUELIZE_LITERAL_SQL) };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize payment method label for display.
 * credit_card / debit_card → 'card'
 */
function displayPaymentMethod(method) {
  if (!method) return 'other';
  const m = method.toLowerCase().trim();
  if (m === 'credit_card' || m === 'debit_card' || m === 'creditcard' || m === 'debitcard') return 'card';
  return m;
}

/**
 * Merge raw payment rows + bank detail map into a clean array.
 * Groups methods that map to the same display name (e.g. credit_card + debit_card → card).
 * @param {Array}  rows         - rows from DB: { paymentMethod, total, transactionCount }
 * @param {Object} bankDetailMap - keyed by paymentMethod → [{ bankName, total, transactionCount }]
 * @param {number} grandTotal   - total revenue (for share %).
 * @returns {Array}
 */
function mergePaymentMethods(rows, bankDetailMap, grandTotal) {
  const merged = {};
  rows.forEach(pm => {
    const key = displayPaymentMethod(pm.paymentMethod);
    if (!merged[key]) merged[key] = { method: key, total: 0, transactions: 0, detail: [] };
    merged[key].total      += parseFloat(pm.total || 0);
    merged[key].transactions += parseInt(pm.transactionCount || 0, 10);
    const detailArr = bankDetailMap[pm.paymentMethod] || [];
    merged[key].detail = merged[key].detail.concat(detailArr);
  });
  return Object.values(merged)
    .map(v => ({
      method:       v.method,
      total:        f2(v.total),
      transactions: v.transactions,
      share:        pct(v.total, grandTotal),
      detail:       v.detail,
    }))
    .sort((a, b) => b.total - a.total);
}

function pct(value, base) {
  if (!base || base === 0) return 0;
  return parseFloat(((value / base) * 100).toFixed(2));
}

function changePct(current, previous) {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return parseFloat((((current - previous) / previous) * 100).toFixed(1));
}

function f2(n) {
  return parseFloat((n || 0).toFixed(2));
}

function buildTenantWhere(isSuperAdmin, tenantId, locationId = null) {
  const w = {};
  if (!isSuperAdmin) w.tenantId = tenantId;
  if (locationId) w.locationId = locationId;
  return w;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /finance/dashboard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Finance dashboard: KPIs + trends + recent activity.
 *
 * @route   GET /api/v1/finance/dashboard
 * @query   locationId, timezone
 */
async function getFinanceDashboard(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { locationId } = req.query;
    const timezone = req.query.timezone || req.user?.tenant?.settings?.timezone || 'Asia/Jakarta';

    // ── Date anchors ──────────────────────────────────────────────────────────
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: timezone }); // YYYY-MM-DD

    const dayStart = new Date(`${todayStr}T00:00:00`);
    const dayEnd   = new Date(`${todayStr}T23:59:59.999`);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart  = new Date(now.getFullYear(), 0, 1);

    const yesterday = new Date(dayStart);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEnd = new Date(dayStart);
    yesterdayEnd.setMilliseconds(yesterdayEnd.getMilliseconds() - 1);

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const w = buildTenantWhere(isSuperAdmin, tenantId, locationId);

    // ── Revenue KPIs ─────────────────────────────────────────────────────────

    const [todayRev, yesterdayRev, monthRev, lastMonthRev, yearRev] = await Promise.all([
      Transaction.sum('totalAmount', { where: { ...w, ...PAID_TX_CONDITION, status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES }, createdAt: { [Op.between]: [dayStart, dayEnd] } } }),
      Transaction.sum('totalAmount', { where: { ...w, ...PAID_TX_CONDITION, status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES }, createdAt: { [Op.between]: [yesterday, yesterdayEnd] } } }),
      Transaction.sum('totalAmount', { where: { ...w, ...PAID_TX_CONDITION, status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES }, createdAt: { [Op.gte]: monthStart } } }),
      Transaction.sum('totalAmount', { where: { ...w, ...PAID_TX_CONDITION, status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES }, createdAt: { [Op.between]: [lastMonthStart, lastMonthEnd] } } }),
      Transaction.sum('totalAmount', { where: { ...w, ...PAID_TX_CONDITION, status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES }, createdAt: { [Op.gte]: yearStart } } }),
    ]);

    // ── Expense KPIs ──────────────────────────────────────────────────────────

    const expW = buildTenantWhere(isSuperAdmin, tenantId, locationId);
    const [todayExp, monthExp, pendingExpCount] = await Promise.all([
      Expense.sum('totalAmount', { where: { ...expW, status: { [Op.in]: ['approved', 'paid'] }, expenseDate: { [Op.between]: [dayStart, dayEnd] } } }),
      Expense.sum('totalAmount', { where: { ...expW, status: { [Op.in]: ['approved', 'paid'] }, expenseDate: { [Op.gte]: monthStart } } }),
      Expense.count({ where: { ...expW, status: 'pending' } }),
    ]);

    // ── Revenue by module (today + month) ────────────────────────────────────

    const [todayByModule, monthByModule] = await Promise.all([
      Transaction.findAll({
        where: { ...w, ...PAID_TX_CONDITION, status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES }, createdAt: { [Op.between]: [dayStart, dayEnd] } },
        attributes: [
          'transactionType',
          [fn('SUM', col('Transaction.totalAmount')), 'total'],
          [fn('COUNT', col('Transaction.id')), 'count'],
        ],
        group: ['transactionType'],
        raw: true,
      }),
      Transaction.findAll({
        where: { ...w, ...PAID_TX_CONDITION, status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES }, createdAt: { [Op.gte]: monthStart } },
        attributes: [
          'transactionType',
          [fn('SUM', col('Transaction.totalAmount')), 'total'],
          [fn('COUNT', col('Transaction.id')), 'count'],
        ],
        group: ['transactionType'],
        raw: true,
      }),
    ]);

    // ── Revenue trend: last 30 days ──────────────────────────────────────────

    const thirtyDaysAgo = new Date(dayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

    const revenueTrend = await Transaction.findAll({
      where: { ...w, ...PAID_TX_CONDITION, status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES }, createdAt: { [Op.between]: [thirtyDaysAgo, dayEnd] } },
      attributes: [
        [literal(`DATE("Transaction"."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE '${timezone}')`), 'date'],
        [fn('SUM', col('Transaction.totalAmount')), 'revenue'],
        [fn('COUNT', col('Transaction.id')), 'transactions'],
      ],
      group: [literal(`DATE("Transaction"."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE '${timezone}')`)],
      order: [[literal(`DATE("Transaction"."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE '${timezone}')`), 'ASC']],
      raw: true,
    });

    // Fill missing dates in the trend with zero
    const trendMap = new Map(revenueTrend.map(r => [r.date, r]));
    const trendFull = [];
    for (let d = new Date(thirtyDaysAgo); d <= dayStart; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      const row = trendMap.get(key);
      trendFull.push({
        date: key,
        revenue: row ? f2(parseFloat(row.revenue)) : 0,
        transactions: row ? parseInt(row.transactions, 10) : 0,
      });
    }

    // ── Payment methods (today + month) ─────────────────────────────────────
    // Each query returns method totals; a second query fetches the bank/provider
    // sub-detail from paymentDetails JSON so the card can show e.g. BCA, Mandiri.

    const buildPaymentQueries = (dateFilter, replacements) => ({
      methods: `
        SELECT
          tp."paymentMethod",
          COUNT(DISTINCT t.id)   AS "transactionCount",
          SUM(tp.amount)         AS total
        FROM "TransactionPayments" tp
        INNER JOIN "Transactions" t ON t.id = tp."transactionId"
        WHERE ${!isSuperAdmin ? 't."tenantId" = :tenantId AND' : ''}
          t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
          AND ${dateFilter}
          AND tp."status" = '${COMPLETED_PAYMENT_STATUS}'
          ${locationId ? 'AND t."locationId" = :locationId' : ''}
        GROUP BY tp."paymentMethod"
        ORDER BY total DESC
      `,
      banks: `
        SELECT
          tp."paymentMethod",
          COALESCE(tp."paymentDetails"->>'bank', tp."paymentDetails"->>'provider') AS "bankName",
          COUNT(DISTINCT t.id)   AS "transactionCount",
          SUM(tp.amount)         AS total
        FROM "TransactionPayments" tp
        INNER JOIN "Transactions" t ON t.id = tp."transactionId"
        WHERE ${!isSuperAdmin ? 't."tenantId" = :tenantId AND' : ''}
          t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
          AND ${dateFilter}
          AND tp."status" = '${COMPLETED_PAYMENT_STATUS}'
          ${locationId ? 'AND t."locationId" = :locationId' : ''}
          AND (tp."paymentDetails"->>'bank' IS NOT NULL OR tp."paymentDetails"->>'provider' IS NOT NULL)
        GROUP BY tp."paymentMethod", "bankName"
        ORDER BY tp."paymentMethod", total DESC
      `,
    });

    const todayQ  = buildPaymentQueries('t."createdAt" BETWEEN :dayStart AND :dayEnd', {});
    const monthQ  = buildPaymentQueries('t."createdAt" >= :monthStart', {});

    const [
      paymentMethods, paymentMethodsBankToday,
      paymentMethodsMonth, paymentMethodsBankMonth
    ] = await Promise.all([
      sequelize.query(todayQ.methods, { replacements: { tenantId, dayStart, dayEnd, locationId: locationId || null }, type: sequelize.QueryTypes.SELECT }),
      sequelize.query(todayQ.banks,   { replacements: { tenantId, dayStart, dayEnd, locationId: locationId || null }, type: sequelize.QueryTypes.SELECT }),
      sequelize.query(monthQ.methods, { replacements: { tenantId, monthStart, locationId: locationId || null }, type: sequelize.QueryTypes.SELECT }),
      sequelize.query(monthQ.banks,   { replacements: { tenantId, monthStart, locationId: locationId || null }, type: sequelize.QueryTypes.SELECT }),
    ]);

    // Build bank detail maps keyed by paymentMethod
    const buildBankDetailMap = (bankRows) => {
      const map = {};
      bankRows.forEach(row => {
        if (!map[row.paymentMethod]) map[row.paymentMethod] = [];
        map[row.paymentMethod].push({
          bankName:         row.bankName,
          total:            f2(parseFloat(row.total || 0)),
          transactionCount: parseInt(row.transactionCount || 0, 10),
        });
      });
      return map;
    };

    const bankDetailMapToday = buildBankDetailMap(paymentMethodsBankToday);
    const bankDetailMapMonth = buildBankDetailMap(paymentMethodsBankMonth);

    // ── Top expense categories this month ────────────────────────────────────

    const topExpenseCategories = await Expense.findAll({
      where: { ...expW, status: { [Op.in]: ['approved', 'paid'] }, expenseDate: { [Op.gte]: monthStart } },
      attributes: [
        'categoryId',
        [fn('SUM', col('Expense.totalAmount')), 'total'],
        [fn('COUNT', col('Expense.id')), 'count'],
      ],
      include: [{ model: ExpenseCategory, as: 'category', attributes: ['name', 'color'] }],
      group: ['Expense.categoryId', 'category.id', 'category.name', 'category.color'],
      order: [[fn('SUM', col('Expense.totalAmount')), 'DESC']],
      limit: 5,
      raw: true,
    });

    // ── Recent transactions (last 10) ────────────────────────────────────────

    const recentTransactions = await Transaction.findAll({
      where: { ...w },
      order: [['createdAt', 'DESC']],
      limit: 10,
      attributes: ['id', 'transactionNumber', 'transactionType', 'totalAmount', 'status', 'paymentStatus', 'createdAt'],
      raw: true,
    });

    // ── Cash register sessions today ─────────────────────────────────────────

    const cashRegWhere = buildTenantWhere(isSuperAdmin, tenantId, locationId);
    let sessionsToday = [];
    try {
      sessionsToday = await CashRegisterSession.findAll({
        where: { ...cashRegWhere, shiftDate: todayStr },
        attributes: ['id', 'shiftName', 'shiftNumber', 'status', 'openingBalance', 'closingBalance', 'actualCash', 'difference', 'openedAt', 'closedAt'],
        order: [['shiftNumber', 'ASC']],
        raw: true,
      });
    } catch (_e) { /* model may not exist */ }

    // ── Assemble totals ───────────────────────────────────────────────────────

    const todayRevTotal  = f2(parseFloat(todayRev  || 0));
    const monthRevTotal  = f2(parseFloat(monthRev  || 0));
    const yearRevTotal   = f2(parseFloat(yearRev   || 0));
    const todayExpTotal  = f2(parseFloat(todayExp  || 0));
    const monthExpTotal  = f2(parseFloat(monthExp  || 0));
    const netProfitMonth = f2(monthRevTotal - monthExpTotal);
    const profitMarginMonth = pct(netProfitMonth, monthRevTotal);

    const todayTrx   = todayByModule.reduce((s, m) => s + parseInt(m.count, 10), 0);
    const monthTrx   = monthByModule.reduce((s, m) => s + parseInt(m.count, 10), 0);

    return res.json({
      success: true,
      data: {
        // ── KPI Cards ────────────────────────────────────────
        kpis: {
          todayRevenue:      { value: todayRevTotal,    change: changePct(todayRevTotal, parseFloat(yesterdayRev || 0)), transactions: todayTrx },
          monthRevenue:      { value: monthRevTotal,    change: changePct(monthRevTotal, parseFloat(lastMonthRev || 0)), transactions: monthTrx },
          yearRevenue:       { value: yearRevTotal },
          todayExpenses:     { value: todayExpTotal },
          monthExpenses:     { value: monthExpTotal },
          netProfitMonth:    { value: netProfitMonth,   margin: profitMarginMonth },
          pendingExpenses:   { count: pendingExpCount },
        },

        // ── Revenue by Module ─────────────────────────────────
        revenueByModule: {
          today: todayByModule.map(m => ({
            module:       m.transactionType,
            total:        f2(parseFloat(m.total)),
            transactions: parseInt(m.count, 10),
            share:        pct(parseFloat(m.total), todayRevTotal),
          })),
          month: monthByModule.map(m => ({
            module:       m.transactionType,
            total:        f2(parseFloat(m.total)),
            transactions: parseInt(m.count, 10),
            share:        pct(parseFloat(m.total), monthRevTotal),
          })),
        },

        // ── 30-Day Revenue Trend ──────────────────────────────
        revenueTrend: trendFull,

        // ── Payment Methods ───────────────────────────────────
        // Each entry includes a `detail` array with per-bank/provider breakdown
        // (e.g. BCA, Mandiri) sourced from paymentDetails entered by the cashier.
        paymentMethods: {
          today: mergePaymentMethods(paymentMethods, bankDetailMapToday, todayRevTotal),
          month: mergePaymentMethods(paymentMethodsMonth, bankDetailMapMonth, monthRevTotal),
        },

        // ── Top Expense Categories (this month) ───────────────
        topExpenseCategories: topExpenseCategories.map(e => ({
          categoryId:   e.categoryId,
          categoryName: e['category.name'],
          color:        e['category.color'],
          total:        f2(parseFloat(e.total || 0)),
          count:        parseInt(e.count, 10),
          share:        pct(parseFloat(e.total || 0), monthExpTotal),
        })),

        // ── Recent Transactions ───────────────────────────────
        recentTransactions: recentTransactions.map(t => ({
          id:                t.id,
          transactionNumber: t.transactionNumber,
          module:            t.transactionType,
          amount:            f2(parseFloat(t.totalAmount || 0)),
          status:            t.status,
          paymentStatus:     t.paymentStatus,
          createdAt:         t.createdAt,
        })),

        // ── Cash Register Sessions (today) ────────────────────
        sessionsToday: sessionsToday.map(s => ({
          id:             s.id,
          shiftName:      s.shiftName,
          shiftNumber:    s.shiftNumber,
          status:         s.status,
          openingBalance: f2(parseFloat(s.openingBalance || 0)),
          closingBalance: s.closingBalance != null ? f2(parseFloat(s.closingBalance)) : null,
          actualCash:     s.actualCash != null ? f2(parseFloat(s.actualCash)) : null,
          difference:     s.difference != null ? f2(parseFloat(s.difference)) : null,
          openedAt:       s.openedAt,
          closedAt:       s.closedAt,
        })),

        // ── Quick Cashflow Summary (this month) ───────────────
        cashflowSummary: {
          totalInflow:  monthRevTotal,
          totalOutflow: monthExpTotal,
          netFlow:      netProfitMonth,
          profitMargin: profitMarginMonth,
          period:       { from: monthStart, to: now },
        },
      },
    });
  } catch (err) {
    logger.logError('Finance dashboard error', {
      action: 'FINANCE_DASHBOARD_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: err.message,
      stack: err.stack,
    });
    next(err);
  }
}

module.exports = { getFinanceDashboard };
