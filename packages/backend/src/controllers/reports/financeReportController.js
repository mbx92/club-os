/**
 * Finance Report Controller (Dedicated Reports Module)
 * Reports: revenue breakdown, profit & loss, cash flow summary
 */
const { Transaction, TransactionItem, TransactionPayment, Expense, ExpenseCategory, Income, IncomeCategory, CashFlow, Shareholder, sequelize } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');
const { generateForecast } = require('../../utils/forecasting');
const logger = require('../../utils/logger');
const {
  getTenantTimezone,
  startOfDayInTz,
  endOfDayInTz,
} = require('../../utils/tenantTimezone');
const {
  REVENUE_RECOGNIZED_TRANSACTION_STATUSES,
  REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL,
  COMPLETED_PAYMENT_STATUS,
  PAID_TRANSACTION_EXISTS_SQL,
  PAID_TRANSACTION_SEQUELIZE_LITERAL_SQL,
} = require('../../utils/reportingStatus');

// Pre-built Sequelize literal for payment-exists filter (correct Op.and usage).
const paidTxLiteral = sequelize.literal(PAID_TRANSACTION_SEQUELIZE_LITERAL_SQL);

/**
 * Normalize payment method strings to a canonical snake_case form.
 * Handles camelCase variants stored by different parts of the codebase.
 */
function normalizePaymentMethod(method) {
  if (!method) return 'other';
  const m = method.trim();
  // camelCase → snake_case mapping
  const map = {
    creditcard:    'credit_card',
    creditCard:    'credit_card',
    debitcard:     'debit_card',
    debitCard:     'debit_card',
    banktransfer:  'bank_transfer',
    bankTransfer:  'bank_transfer',
    ewallet:       'e_wallet',
    eWallet:       'e_wallet',
    e_wallet:      'e_wallet',
  };
  return map[m] || map[m.toLowerCase()] || m.toLowerCase();
}

/**
 * Merge raw payment-method rows (from SQL) into normalized paymentDistribution.
 * Rows with the same canonical method name are summed together.
 * Bank details are de-duplicated / merged by case-insensitive bankName.
 * @param {Array} methodRows   - [{ paymentMethod, total, transactionCount }]
 * @param {Object} bankDetailMap - { rawPaymentMethod: [{ bankName, total, transactionCount }] }
 * @returns {Array}
 */
function mergePaymentDistribution(methodRows, bankDetailMap) {
  const merged = {};

  methodRows.forEach(row => {
    const key = normalizePaymentMethod(row.paymentMethod);
    if (!merged[key]) merged[key] = { paymentMethod: key, total: 0, transactionCount: 0, bankDetails: {} };
    merged[key].total            += parseFloat(row.total || 0);
    merged[key].transactionCount += parseInt(row.transactionCount || 0);

    // Merge bank details (case-insensitive bankName dedup)
    const details = bankDetailMap[row.paymentMethod] || [];
    details.forEach(d => {
      const bKey = (d.bankName || '').trim().toUpperCase();
      if (!bKey) return;
      if (!merged[key].bankDetails[bKey]) {
        merged[key].bankDetails[bKey] = { bankName: bKey, total: 0, transactionCount: 0 };
      }
      merged[key].bankDetails[bKey].total            += d.total;
      merged[key].bankDetails[bKey].transactionCount += d.transactionCount;
    });
  });

  const grandTotal = Object.values(merged).reduce((s, v) => s + v.total, 0);

  return Object.values(merged)
    .map(v => {
      const bankArr = Object.values(v.bankDetails).sort((a, b) => b.total - a.total);

      // Compute untracked portion (transactions with no bank/provider in paymentDetails)
      const trackedTotal = bankArr.reduce((s, d) => s + d.total, 0);
      const trackedCount = bankArr.reduce((s, d) => s + d.transactionCount, 0);
      const othersTotal  = v.total - trackedTotal;
      const othersCount  = v.transactionCount - trackedCount;
      if (othersTotal > 0.005) {
        bankArr.push({ bankName: 'Others', total: parseFloat(othersTotal.toFixed(2)), transactionCount: othersCount > 0 ? othersCount : 0 });
      }

      return {
        paymentMethod:    v.paymentMethod,
        total:            parseFloat(v.total.toFixed(2)),
        transactionCount: v.transactionCount,
        percentage:       grandTotal > 0 ? parseFloat(((v.total / grandTotal) * 100).toFixed(2)) : 0,
        bankDetails:      bankArr.map(d => ({ bankName: d.bankName, total: parseFloat(d.total.toFixed(2)), transactionCount: d.transactionCount }))
      };
    })
    .sort((a, b) => b.total - a.total);
}

/**
 * GET /reports/finance/revenue
 * Comprehensive revenue report with breakdown by module/type
 */
async function getRevenueReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, groupBy = 'monthly' } = req.query;
    const tz = getTenantTimezone(req);

    const where = {
      status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
      [Op.and]: paidTxLiteral
    };
    if (!isSuperAdmin) where.tenantId = tenantId;
    if (startDate) where.createdAt = { ...(where.createdAt || {}), [Op.gte]: startOfDayInTz(startDate, tz) };
    if (endDate) where.createdAt = { ...(where.createdAt || {}), [Op.lte]: endOfDayInTz(endDate, tz) };

    const dateTruncMap = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' };
    const trunc = dateTruncMap[groupBy] || 'month';

    // Revenue by period
    const revenueByPeriod = await Transaction.findAll({
      where,
      attributes: [
        [fn('DATE_TRUNC', trunc, col('createdAt')), 'period'],
        [fn('SUM', col('subtotal')), 'subtotal'],
        [fn('SUM', col('tax')), 'tax'],
        [fn('SUM', col('serviceCharge')), 'serviceCharge'],
        [fn('SUM', col('voucherDiscount')), 'discounts'],
        [fn('SUM', col('totalAmount')), 'revenue'],
        [fn('SUM', col('roundingAmount')), 'rounding'],
        [fn('COUNT', col('id')), 'transactionCount']
      ],
      group: [fn('DATE_TRUNC', trunc, col('createdAt'))],
      order: [[fn('DATE_TRUNC', trunc, col('createdAt')), 'ASC']],
      raw: true
    });

    // Enrich period data with gross revenue & rounding
    const enrichedRevenueByPeriod = revenueByPeriod.map(r => {
      const gross = parseFloat(r.subtotal || 0) + parseFloat(r.tax || 0) + parseFloat(r.serviceCharge || 0);
      return {
        ...r,
        grossRevenue: Math.round(gross * 100) / 100,
        rounding: parseFloat(r.rounding || 0),
      };
    });

    // Revenue by module/type
    const revenueByModule = await Transaction.findAll({
      where,
      attributes: [
        'transactionType',
        [fn('SUM', col('subtotal')), 'subtotal'],
        [fn('SUM', col('tax')), 'tax'],
        [fn('SUM', col('serviceCharge')), 'serviceCharge'],
        [fn('SUM', col('voucherDiscount')), 'discounts'],
        [fn('SUM', col('totalAmount')), 'revenue'],
        [fn('SUM', col('roundingAmount')), 'rounding'],
        [fn('COUNT', col('id')), 'transactionCount'],
        [fn('AVG', col('totalAmount')), 'avgTransaction']
      ],
      group: ['transactionType'],
      order: [[fn('SUM', col('subtotal')), 'DESC']],
      raw: true
    });

    // Payment method distribution + bank detail breakdown
    const tenantFilter = !isSuperAdmin ? 't."tenantId" = :tenantId AND' : '';
    const dateStartVal = startDate ? startOfDayInTz(startDate, tz) : null;
    const dateEndVal   = endDate   ? endOfDayInTz(endDate, tz)     : null;
    const dateFilter = dateStartVal && dateEndVal
      ? 't."createdAt" BETWEEN :dateStart AND :dateEnd'
      : dateStartVal
        ? 't."createdAt" >= :dateStart'
        : dateEndVal
          ? 't."createdAt" <= :dateEnd'
          : '1=1';
    const sqlReplacements = { tenantId, dateStart: dateStartVal, dateEnd: dateEndVal };

    const [paymentMethodRows, bankDetailRows] = await Promise.all([
      sequelize.query(
        `SELECT
           tp."paymentMethod",
           COUNT(DISTINCT t.id)::int AS "transactionCount",
           SUM(
             CASE
               WHEN LOWER(tp."paymentMethod") = 'cash'
                 THEN GREATEST(COALESCE(tp.amount, 0) - COALESCE(t."changeAmount", 0), 0)
               ELSE COALESCE(tp.amount, 0)
             END
           ) AS total
         FROM "TransactionPayments" tp
         INNER JOIN "Transactions" t ON t.id = tp."transactionId"
         WHERE ${tenantFilter}
           t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
           AND ${dateFilter}
           AND tp."status" = '${COMPLETED_PAYMENT_STATUS}'
           AND tp."deletedAt" IS NULL
           AND t."deletedAt"  IS NULL
         GROUP BY tp."paymentMethod"
         ORDER BY total DESC`,
        { replacements: sqlReplacements, type: sequelize.QueryTypes.SELECT }
      ),
      sequelize.query(
        `SELECT
           tp."paymentMethod",
           COALESCE(tp."paymentDetails"->>'bank', tp."paymentDetails"->>'provider') AS "bankName",
           COUNT(DISTINCT t.id)::int AS "transactionCount",
           SUM(
             CASE
               WHEN LOWER(tp."paymentMethod") = 'cash'
                 THEN GREATEST(COALESCE(tp.amount, 0) - COALESCE(t."changeAmount", 0), 0)
               ELSE COALESCE(tp.amount, 0)
             END
           ) AS total
         FROM "TransactionPayments" tp
         INNER JOIN "Transactions" t ON t.id = tp."transactionId"
         WHERE ${tenantFilter}
           t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
           AND ${dateFilter}
           AND tp."status" = '${COMPLETED_PAYMENT_STATUS}'
           AND tp."deletedAt" IS NULL
           AND t."deletedAt"  IS NULL
           AND (
             tp."paymentDetails"->>'bank'     IS NOT NULL
             OR tp."paymentDetails"->>'provider' IS NOT NULL
           )
         GROUP BY tp."paymentMethod", "bankName"
         ORDER BY tp."paymentMethod", total DESC`,
        { replacements: sqlReplacements, type: sequelize.QueryTypes.SELECT }
      )
    ]);

    // Build bankDetailMap: { paymentMethod -> [{ bankName, total, transactionCount }] }
    const bankDetailMap = {};
    bankDetailRows.forEach(row => {
      if (!bankDetailMap[row.paymentMethod]) bankDetailMap[row.paymentMethod] = [];
      bankDetailMap[row.paymentMethod].push({
        bankName:         row.bankName,
        total:            parseFloat(row.total || 0),
        transactionCount: parseInt(row.transactionCount || 0)
      });
    });

    // Merge + normalize into final paymentDistribution
    const paymentDistribution = mergePaymentDistribution(paymentMethodRows, bankDetailMap);

    // Grand total
    const grandTotal = await Transaction.findOne({
      where,
      attributes: [
        [fn('SUM', col('subtotal')), 'grossSubtotal'],
        [fn('SUM', col('tax')), 'totalTax'],
        [fn('SUM', col('serviceCharge')), 'totalServiceCharge'],
        [fn('SUM', col('voucherDiscount')), 'totalDiscounts'],
        [fn('SUM', col('totalAmount')), 'netRevenue'],
        [fn('SUM', col('roundingAmount')), 'totalRounding'],
        [fn('COUNT', col('id')), 'totalTransactions'],
        [fn('AVG', col('totalAmount')), 'avgTransaction']
      ],
      raw: true
    });

    const grossSubtotal = parseFloat(grandTotal?.grossSubtotal) || 0;
    const totalTax = parseFloat(grandTotal?.totalTax) || 0;
    const totalServiceCharge = parseFloat(grandTotal?.totalServiceCharge) || 0;
    const totalDiscounts = parseFloat(grandTotal?.totalDiscounts) || 0;
    const netRevenue = parseFloat(grandTotal?.netRevenue) || 0;
    const totalRounding = Math.round((parseFloat(grandTotal?.totalRounding) || 0) * 100) / 100;
    const grossRevenue = grossSubtotal + totalTax + totalServiceCharge;

    // Revenue excl. rounding (rounding is shown separately)
    const totalRevenue = Math.round(grossRevenue * 100) / 100;

    // Forecast
    const forecastData = enrichedRevenueByPeriod.map(r => ({ period: r.period, value: r.grossRevenue }));
    const forecast = generateForecast(forecastData, 3);

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: totalRevenue,
          totalRounding: totalRounding,
          totalTransactions: parseInt(grandTotal?.totalTransactions) || 0,
          avgTransaction: Math.round((parseFloat(grandTotal?.avgTransaction) || 0) * 100) / 100,
          totalTax: totalTax,
          totalDiscounts: totalDiscounts,
          cashExpenseDeduction: 0,
          netRevenue: Math.round(netRevenue * 100) / 100,
          period: { startDate, endDate, groupBy }
        },
        revenueByPeriod: enrichedRevenueByPeriod,
        revenueByModule,
        paymentDistribution,
        forecast
      },
      filters: { startDate, endDate, groupBy }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/finance/profit-loss
 * Profit & Loss statement
 */
async function getProfitLossReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, groupBy = 'monthly' } = req.query;
    const tz = getTenantTimezone(req);

    const txWhere = {
      status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
      [Op.and]: paidTxLiteral
    };
    if (!isSuperAdmin) txWhere.tenantId = tenantId;
    if (startDate) txWhere.createdAt = { ...(txWhere.createdAt || {}), [Op.gte]: startOfDayInTz(startDate, tz) };
    if (endDate) txWhere.createdAt = { ...(txWhere.createdAt || {}), [Op.lte]: endOfDayInTz(endDate, tz) };

    const expWhere = { status: { [Op.in]: ['approved', 'paid'] } };
    if (!isSuperAdmin) expWhere.tenantId = tenantId;
    if (startDate) expWhere.expenseDate = { ...(expWhere.expenseDate || {}), [Op.gte]: startOfDayInTz(startDate, tz) };
    if (endDate) expWhere.expenseDate = { ...(expWhere.expenseDate || {}), [Op.lte]: endOfDayInTz(endDate, tz) };

    const dateTruncMap = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' };
    const trunc = dateTruncMap[groupBy] || 'month';

    // Revenue by period
    const revenueByPeriod = await Transaction.findAll({
      where: txWhere,
      attributes: [
        [fn('DATE_TRUNC', trunc, col('createdAt')), 'period'],
        [fn('SUM', col('totalAmount')), 'revenue']
      ],
      group: [fn('DATE_TRUNC', trunc, col('createdAt'))],
      order: [[fn('DATE_TRUNC', trunc, col('createdAt')), 'ASC']],
      raw: true
    });

    // Expense by period
    const expenseByPeriod = await Expense.findAll({
      where: expWhere,
      attributes: [
        [fn('DATE_TRUNC', trunc, col('expenseDate')), 'period'],
        [fn('SUM', col('totalAmount')), 'expense']
      ],
      group: [fn('DATE_TRUNC', trunc, col('expenseDate'))],
      order: [[fn('DATE_TRUNC', trunc, col('expenseDate')), 'ASC']],
      raw: true
    });

    // Revenue by module
    const revenueByModule = await Transaction.findAll({
      where: txWhere,
      attributes: [
        'transactionType',
        [fn('SUM', col('totalAmount')), 'revenue']
      ],
      group: ['transactionType'],
      raw: true
    });

    // Expense by category
    const expenseByCategory = await Expense.findAll({
      where: expWhere,
      include: [{
        model: ExpenseCategory,
        as: 'category',
        attributes: ['name', 'type']
      }],
      attributes: [
        'categoryId',
        [fn('SUM', col('Expense.totalAmount')), 'total']
      ],
      group: ['categoryId', 'category.id', 'category.name', 'category.type'],
      order: [[fn('SUM', col('Expense.totalAmount')), 'DESC']],
      raw: true,
      nest: true
    });

    // Totals
    const totalRevenue = revenueByPeriod.reduce((sum, r) => sum + (parseFloat(r.revenue) || 0), 0);
    const totalExpense = expenseByPeriod.reduce((sum, e) => sum + (parseFloat(e.expense) || 0), 0);
    const netProfit = totalRevenue - totalExpense;
    const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 10000) / 100 : 0;

    // Merge revenue and expense by period for P&L timeline
    const periodMap = {};
    revenueByPeriod.forEach(r => {
      periodMap[r.period] = { period: r.period, revenue: parseFloat(r.revenue) || 0, expense: 0 };
    });
    expenseByPeriod.forEach(e => {
      if (!periodMap[e.period]) {
        periodMap[e.period] = { period: e.period, revenue: 0, expense: 0 };
      }
      periodMap[e.period].expense = parseFloat(e.expense) || 0;
    });
    const plTimeline = Object.values(periodMap)
      .sort((a, b) => new Date(a.period) - new Date(b.period))
      .map(p => ({
        ...p,
        netProfit: p.revenue - p.expense,
        profitMargin: p.revenue > 0 ? Math.round(((p.revenue - p.expense) / p.revenue) * 10000) / 100 : 0
      }));

    // Forecast net profit
    const forecastData = plTimeline.map(p => ({ period: p.period, value: p.netProfit }));
    const forecast = generateForecast(forecastData, 3);

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalExpense,
          netProfit,
          profitMargin,
          period: { startDate, endDate, groupBy }
        },
        timeline: plTimeline,
        revenueByModule,
        expenseByCategory,
        forecast
      },
      filters: { startDate, endDate, groupBy }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/finance/cash-flow
 * Cash flow report derived from Transactions (inflow), manual Income (inflow), and Expenses (outflow)
 */
async function getCashFlowReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, groupBy = 'monthly' } = req.query;
    const tz = getTenantTimezone(req);

    const dateTruncMap = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' };
    const trunc = dateTruncMap[groupBy] || 'month';

    const dateStart = startDate ? startOfDayInTz(startDate, tz) : null;
    const dateEnd   = endDate   ? endOfDayInTz(endDate, tz)     : null;

    const tenantWhere = !isSuperAdmin ? { tenantId } : {};

    const txWhere = {
      ...tenantWhere,
      status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
      [Op.and]: paidTxLiteral
    };
    if (dateStart) txWhere.createdAt = { ...(txWhere.createdAt || {}), [Op.gte]: dateStart };
    if (dateEnd)   txWhere.createdAt = { ...(txWhere.createdAt || {}), [Op.lte]: dateEnd };

    const incWhere = {
      ...tenantWhere,
      status: 'received',
      type: 'manual' // exclude transactional to avoid double-counting with Transactions
    };
    if (dateStart) incWhere.incomeDate = { ...(incWhere.incomeDate || {}), [Op.gte]: dateStart };
    if (dateEnd)   incWhere.incomeDate = { ...(incWhere.incomeDate || {}), [Op.lte]: dateEnd };

    const expWhere = {
      ...tenantWhere,
      status: { [Op.in]: ['approved', 'paid'] }
    };
    if (dateStart) expWhere.expenseDate = { ...(expWhere.expenseDate || {}), [Op.gte]: dateStart };
    if (dateEnd)   expWhere.expenseDate = { ...(expWhere.expenseDate || {}), [Op.lte]: dateEnd };

    // ── Parallel queries ─────────────────────────────────────────────────────
    const [
      txByPeriod,
      incByPeriod,
      expByPeriod,
      txByModule,
      incByCategory,
      expByCategory,
      txPaymentRows,
      txPaymentBankRows
    ] = await Promise.all([
      // Transactions by period (inflow)
      Transaction.findAll({
        where: txWhere,
        attributes: [
          [fn('DATE_TRUNC', trunc, col('createdAt')), 'period'],
          [fn('SUM', col('totalAmount')), 'total'],
          [fn('COUNT', col('id')), 'count']
        ],
        group: [fn('DATE_TRUNC', trunc, col('createdAt'))],
        order: [[fn('DATE_TRUNC', trunc, col('createdAt')), 'ASC']],
        raw: true
      }),

      // Manual income by period (inflow)
      Income.findAll({
        where: incWhere,
        attributes: [
          [fn('DATE_TRUNC', trunc, col('incomeDate')), 'period'],
          [fn('SUM', col('totalAmount')), 'total'],
          [fn('COUNT', col('id')), 'count']
        ],
        group: [fn('DATE_TRUNC', trunc, col('incomeDate'))],
        order: [[fn('DATE_TRUNC', trunc, col('incomeDate')), 'ASC']],
        raw: true
      }),

      // Expenses by period (outflow)
      Expense.findAll({
        where: expWhere,
        attributes: [
          [fn('DATE_TRUNC', trunc, col('expenseDate')), 'period'],
          [fn('SUM', col('totalAmount')), 'total'],
          [fn('COUNT', col('id')), 'count']
        ],
        group: [fn('DATE_TRUNC', trunc, col('expenseDate'))],
        order: [[fn('DATE_TRUNC', trunc, col('expenseDate')), 'ASC']],
        raw: true
      }),

      // Inflow breakdown by transaction type
      Transaction.findAll({
        where: txWhere,
        attributes: [
          'transactionType',
          [fn('SUM', col('totalAmount')), 'total'],
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['transactionType'],
        order: [[fn('SUM', col('totalAmount')), 'DESC']],
        raw: true
      }),

      // Manual income breakdown by category
      Income.findAll({
        where: incWhere,
        attributes: [
          'categoryId',
          [fn('SUM', col('Income.totalAmount')), 'total'],
          [fn('COUNT', col('Income.id')), 'count']
        ],
        include: [{ model: IncomeCategory, as: 'category', attributes: ['name'] }],
        group: ['Income.categoryId', 'category.id', 'category.name'],
        order: [[fn('SUM', col('Income.totalAmount')), 'DESC']],
        raw: true,
        nest: true
      }),

      // Outflow breakdown by expense category
      Expense.findAll({
        where: expWhere,
        attributes: [
          'categoryId',
          [fn('SUM', col('Expense.totalAmount')), 'total'],
          [fn('COUNT', col('Expense.id')), 'count']
        ],
        include: [{ model: ExpenseCategory, as: 'category', attributes: ['name', 'type', 'color'] }],
        group: ['Expense.categoryId', 'category.id', 'category.name', 'category.type', 'category.color'],
        order: [[fn('SUM', col('Expense.totalAmount')), 'DESC']],
        raw: true,
        nest: true
      }),

      // Payment method totals (from transactions)
      sequelize.query(
        `SELECT
           tp."paymentMethod",
           COUNT(DISTINCT t.id)::int AS "transactionCount",
           SUM(tp.amount)           AS total
         FROM "TransactionPayments" tp
         INNER JOIN "Transactions" t ON t.id = tp."transactionId"
         WHERE ${!isSuperAdmin ? 't."tenantId" = :tenantId AND' : ''}
           t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
           ${dateStart ? 'AND t."createdAt" >= :dateStart' : ''}
           ${dateEnd   ? 'AND t."createdAt" <= :dateEnd'   : ''}
           AND tp."status" = '${COMPLETED_PAYMENT_STATUS}'
           AND tp."deletedAt" IS NULL
           AND t."deletedAt"  IS NULL
         GROUP BY tp."paymentMethod"
         ORDER BY total DESC`,
        { replacements: { tenantId, dateStart, dateEnd }, type: sequelize.QueryTypes.SELECT }
      ),

      // Payment method bank details
      sequelize.query(
        `SELECT
           tp."paymentMethod",
           COALESCE(tp."paymentDetails"->>'bank', tp."paymentDetails"->>'provider') AS "bankName",
           COUNT(DISTINCT t.id)::int AS "transactionCount",
           SUM(tp.amount)           AS total
         FROM "TransactionPayments" tp
         INNER JOIN "Transactions" t ON t.id = tp."transactionId"
         WHERE ${!isSuperAdmin ? 't."tenantId" = :tenantId AND' : ''}
           t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
           ${dateStart ? 'AND t."createdAt" >= :dateStart' : ''}
           ${dateEnd   ? 'AND t."createdAt" <= :dateEnd'   : ''}
           AND tp."status" = '${COMPLETED_PAYMENT_STATUS}'
           AND tp."deletedAt" IS NULL
           AND t."deletedAt"  IS NULL
           AND (tp."paymentDetails"->>'bank' IS NOT NULL OR tp."paymentDetails"->>'provider' IS NOT NULL)
         GROUP BY tp."paymentMethod", "bankName"
         ORDER BY tp."paymentMethod", total DESC`,
        { replacements: { tenantId, dateStart, dateEnd }, type: sequelize.QueryTypes.SELECT }
      )
    ]);

    // ── Build period timeline ────────────────────────────────────────────────
    const periodMap = {};
    const ensurePeriod = (p) => {
      if (!periodMap[p]) periodMap[p] = { period: p, transactionInflow: 0, manualInflow: 0, outflow: 0, txCount: 0, incCount: 0, expCount: 0 };
    };

    txByPeriod.forEach(r  => { ensurePeriod(r.period); periodMap[r.period].transactionInflow = parseFloat(r.total) || 0; periodMap[r.period].txCount = parseInt(r.count) || 0; });
    incByPeriod.forEach(r => { ensurePeriod(r.period); periodMap[r.period].manualInflow      = parseFloat(r.total) || 0; periodMap[r.period].incCount = parseInt(r.count) || 0; });
    expByPeriod.forEach(r => { ensurePeriod(r.period); periodMap[r.period].outflow           = parseFloat(r.total) || 0; periodMap[r.period].expCount = parseInt(r.count) || 0; });

    let runningBalance = 0;
    const timeline = Object.values(periodMap)
      .sort((a, b) => new Date(a.period) - new Date(b.period))
      .map(p => {
        const inflow = p.transactionInflow + p.manualInflow;
        const netFlow = inflow - p.outflow;
        runningBalance += netFlow;
        return {
          period:           p.period,
          inflow:           parseFloat(inflow.toFixed(2)),
          transactionInflow: parseFloat(p.transactionInflow.toFixed(2)),
          manualInflow:     parseFloat(p.manualInflow.toFixed(2)),
          outflow:          parseFloat(p.outflow.toFixed(2)),
          netFlow:          parseFloat(netFlow.toFixed(2)),
          balance:          parseFloat(runningBalance.toFixed(2)),
          txCount:          p.txCount,
          incCount:         p.incCount,
          expCount:         p.expCount
        };
      });

    // ── Summaries ────────────────────────────────────────────────────────────
    const totalTransactionInflow = txByPeriod.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
    const totalManualInflow      = incByPeriod.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
    const totalInflow            = totalTransactionInflow + totalManualInflow;
    const totalOutflow           = expByPeriod.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
    const netCashFlow            = totalInflow - totalOutflow;

    // ── Payment method distribution ──────────────────────────────────────────
    const bankDetailMap = {};
    txPaymentBankRows.forEach(row => {
      if (!bankDetailMap[row.paymentMethod]) bankDetailMap[row.paymentMethod] = [];
      bankDetailMap[row.paymentMethod].push({
        bankName:         row.bankName,
        total:            parseFloat(row.total || 0),
        transactionCount: parseInt(row.transactionCount || 0)
      });
    });
    const paymentDistribution = mergePaymentDistribution(txPaymentRows, bankDetailMap);

    // ── Forecast ─────────────────────────────────────────────────────────────
    const forecastData = timeline.map(t => ({ period: t.period, value: t.netFlow }));
    const forecast = generateForecast(forecastData, 3);

    res.json({
      success: true,
      data: {
        summary: {
          totalInflow:            parseFloat(totalInflow.toFixed(2)),
          totalTransactionInflow: parseFloat(totalTransactionInflow.toFixed(2)),
          totalManualInflow:      parseFloat(totalManualInflow.toFixed(2)),
          totalOutflow:           parseFloat(totalOutflow.toFixed(2)),
          netCashFlow:            parseFloat(netCashFlow.toFixed(2)),
          endingBalance:          parseFloat(runningBalance.toFixed(2)),
          period: { startDate, endDate, groupBy }
        },
        timeline,
        inflowByModule: txByModule.map(r => ({
          module:           r.transactionType,
          total:            parseFloat(parseFloat(r.total || 0).toFixed(2)),
          transactionCount: parseInt(r.count || 0)
        })),
        inflowByIncomeCategory: incByCategory.map(r => ({
          categoryId:   r.categoryId,
          categoryName: r.category?.name || null,
          total:        parseFloat(parseFloat(r.total || 0).toFixed(2)),
          count:        parseInt(r.count || 0)
        })),
        outflowByCategory: expByCategory.map(r => ({
          categoryId:   r.categoryId,
          categoryName: r.category?.name || null,
          categoryType: r.category?.type || null,
          color:        r.category?.color || null,
          total:        parseFloat(parseFloat(r.total || 0).toFixed(2)),
          count:        parseInt(r.count || 0)
        })),
        paymentDistribution,
        forecast
      },
      filters: { startDate, endDate, groupBy }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/finance/shareholder
 * Waterfall revenue distribution report for shareholders.
 *
 * Calculation flow:
 *   Gross Revenue  (Transactions, status completed/paid)
 *   - Compliment   (TransactionPayments with paymentMethod = 'compliment')
 *   = Net Billed Revenue
 *   - Petty Cash Allocation  (Expenses auto-created by petty cash funding from revenue)
 *   - Staff Salaries         (Expenses whose category name contains salary/gaji/payroll keywords)
 *   - Other Operational Expenses
 *   = Distributable Profit
 *   → Shareholder split (optional: pass ?shareholders=[{"name":"A","percentage":60},{"name":"B","percentage":40}])
 *
 * Shareholders are loaded from the DB (configured via GET/POST /finance/shareholders).
 * The optional query param `shareholders` can override DB values for one-off calculations.
 *
 * @query startDate     - YYYY-MM-DD (required)
 * @query endDate       - YYYY-MM-DD (required)
 * @query shareholders  - optional JSON override: [{"name":"A","percentage":60},{"name":"B","percentage":40}] (must sum to 100)
 */
async function getShareholderReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, shareholders: shareholdersParam } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_PARAMETERS',
        message: 'startDate and endDate are required'
      });
    }

    // Resolve shareholders: query param > DB
    let shareholders = [];
    let shareholdersSource = 'db';

    if (shareholdersParam) {
      // One-off override via query param
      try {
        shareholders = JSON.parse(shareholdersParam);
        if (!Array.isArray(shareholders)) throw new Error('must be array');
        const totalPct = shareholders.reduce((s, sh) => s + (parseFloat(sh.percentage) || 0), 0);
        if (Math.abs(totalPct - 100) > 0.01) {
          return res.status(400).json({
            success: false,
            code: 'INVALID_SHAREHOLDERS',
            message: `Total shareholder percentage must equal 100 (got ${totalPct})`
          });
        }
        shareholdersSource = 'override';
      } catch (e) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_SHAREHOLDERS',
          message: 'shareholders must be a valid JSON array: [{"name":"A","percentage":60}]'
        });
      }
    } else {
      // Load active shareholders from DB for this tenant
      const dbShareholders = await Shareholder.findAll({
        where: { tenantId, isActive: true },
        order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
        attributes: ['id', 'name', 'percentage', 'notes']
      });
      shareholders = dbShareholders.map(s => ({
        id: s.id,
        name: s.name,
        percentage: parseFloat(s.percentage),
        notes: s.notes
      }));
    }

    const tz = getTenantTimezone(req);
    const dateStart = startOfDayInTz(startDate, tz);
    const dateEnd   = endOfDayInTz(endDate, tz);
    const tenantFilter = !isSuperAdmin ? { tenantId } : {};

    const txWhere = {
      ...tenantFilter,
      status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
      createdAt: { [Op.between]: [dateStart, dateEnd] },
      [Op.and]: paidTxLiteral
    };

    const expWhere = {
      ...tenantFilter,
      status: { [Op.in]: ['approved', 'paid'] },
      expenseDate: { [Op.between]: [dateStart, dateEnd] }
    };

    // Keywords that identify salary/payroll expense categories
    const SALARY_KEYWORDS = ['gaji', 'salary', 'salari', 'payroll', 'penggajian', 'tunjangan', 'upah', 'honorarium'];
    // Exact category name used by petty cash auto-expense
    const PETTY_CASH_CATEGORY = 'Modal Petty Cash';

    const [grossRow, complimentRow, expensesByCategory] = await Promise.all([
      // 1. Gross revenue (all transactions)
      Transaction.findOne({
        where: txWhere,
        attributes: [
          [fn('SUM', col('totalAmount')), 'total'],
          [fn('COUNT', col('id')), 'count'],
          [fn('SUM', col('tax')), 'totalTax'],
          [fn('SUM', col('voucherDiscount')), 'totalDiscount']
        ],
        raw: true
      }),

      // 2. Compliment total (payment method = compliment, linked to completed transactions)
      sequelize.query(
        `SELECT COALESCE(SUM(tp.amount), 0) AS total, COUNT(DISTINCT t.id)::int AS count
         FROM "TransactionPayments" tp
         INNER JOIN "Transactions" t ON t.id = tp."transactionId"
         WHERE ${!isSuperAdmin ? 't."tenantId" = :tenantId AND' : ''}
           t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
           AND t."createdAt" BETWEEN :dateStart AND :dateEnd
           AND tp."paymentMethod" = 'compliment'
           AND tp."status" = '${COMPLETED_PAYMENT_STATUS}'
           AND tp."deletedAt" IS NULL AND t."deletedAt" IS NULL`,
        { replacements: { tenantId, dateStart, dateEnd }, type: sequelize.QueryTypes.SELECT }
      ),

      // 3. All approved/paid expenses with category details
      Expense.findAll({
        where: expWhere,
        attributes: [
          'categoryId',
          [fn('SUM', col('Expense.totalAmount')), 'total'],
          [fn('COUNT', col('Expense.id')), 'count']
        ],
        include: [{ model: ExpenseCategory, as: 'category', attributes: ['name', 'type', 'color'] }],
        group: ['Expense.categoryId', 'category.id', 'category.name', 'category.type', 'category.color'],
        order: [[fn('SUM', col('Expense.totalAmount')), 'DESC']],
        raw: true,
        nest: true
      })
    ]);

    const grossRevenue   = parseFloat(grossRow?.total || 0);
    const totalTax       = parseFloat(grossRow?.totalTax || 0);
    const totalDiscount  = parseFloat(grossRow?.totalDiscount || 0);
    const complimentAmt  = parseFloat(complimentRow[0]?.total || 0);
    const complimentCnt  = parseInt(complimentRow[0]?.count || 0);

    // Categorise expenses
    let pettyCashExpense   = 0;
    let salaryExpense      = 0;
    let otherExpense       = 0;
    const pettyCashItems   = [];
    const salaryItems      = [];
    const otherItems       = [];

    expensesByCategory.forEach(row => {
      const catName  = (row.category?.name || '').trim();
      const rowTotal = parseFloat(row.total || 0);
      const rowCount = parseInt(row.count || 0);
      const item = {
        categoryId:   row.categoryId,
        categoryName: catName,
        categoryType: row.category?.type || null,
        color:        row.category?.color || null,
        total:        parseFloat(rowTotal.toFixed(2)),
        count:        rowCount
      };

      if (catName === PETTY_CASH_CATEGORY) {
        pettyCashExpense += rowTotal;
        pettyCashItems.push(item);
      } else if (SALARY_KEYWORDS.some(kw => catName.toLowerCase().includes(kw))) {
        salaryExpense += rowTotal;
        salaryItems.push(item);
      } else {
        otherExpense += rowTotal;
        otherItems.push(item);
      }
    });

    const totalDeductions    = pettyCashExpense + salaryExpense + otherExpense;
    const distributableProfit = grossRevenue - totalDeductions;

    // Shareholder distribution
    const shareholderDistribution = shareholders.map(sh => ({
      name:       sh.name,
      percentage: parseFloat(sh.percentage),
      amount:     parseFloat((distributableProfit * (parseFloat(sh.percentage) / 100)).toFixed(2))
    }));

    res.json({
      success: true,
      data: {
        summary: {
          grossRevenue:        parseFloat(grossRevenue.toFixed(2)),
          totalTax:            parseFloat(totalTax.toFixed(2)),
          totalDiscount:       parseFloat(totalDiscount.toFixed(2)),
          compliment: {
            total: parseFloat(complimentAmt.toFixed(2)),
            transactionCount: complimentCnt
          },
          totalDeductions:     parseFloat(totalDeductions.toFixed(2)),
          distributableProfit: parseFloat(distributableProfit.toFixed(2)),
          profitMargin:        grossRevenue > 0
            ? parseFloat(((distributableProfit / grossRevenue) * 100).toFixed(2))
            : 0,
          period: { startDate, endDate }
        },
        deductions: {
          pettyCashAllocation: {
            total: parseFloat(pettyCashExpense.toFixed(2)),
            items: pettyCashItems
          },
          staffSalaries: {
            total: parseFloat(salaryExpense.toFixed(2)),
            items: salaryItems
          },
          otherExpenses: {
            total: parseFloat(otherExpense.toFixed(2)),
            items: otherItems
          }
        },
        shareholderDistribution: shareholderDistribution.length > 0
          ? shareholderDistribution
          : null
      },
      filters: { startDate, endDate, shareholdersSource, shareholders: shareholders.length > 0 ? shareholders : undefined }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRevenueReport,
  getProfitLossReport,
  getCashFlowReport,
  getShareholderReport
};
