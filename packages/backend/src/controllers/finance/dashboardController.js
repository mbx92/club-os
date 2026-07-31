'use strict';

/**
 * Finance Dashboard Controller
 * 
 * Provides aggregated financial overview data including
 * revenue, expenses, profit/loss, and key metrics for dashboard widgets.
 * 
 * @module controllers/finance/dashboardController
 */

const { Transaction, Expense, Income, TransactionItem, TransactionPayment, CashRegisterSession, PettyCash, PettyCashTransaction, sequelize } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');
const logger = require('../../utils/logger');
const { getClientIp, getUserAgent } = require('../../utils/requestHelper');
const { buildInclusiveDateRange } = require('../../utils/dateRange');
const { getTenantTimezone } = require('../../utils/tenantTimezone');
const {
  REVENUE_RECOGNIZED_TRANSACTION_STATUSES,
  REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL,
  COMPLETED_PAYMENT_STATUS,
} = require('../../utils/reportingStatus');

/**
 * Normalize payment method aliases to canonical snake_case.
 * Keeps credit_card and debit_card as separate methods.
 */
function displayPaymentMethod(method) {
  if (!method) return 'other';
  const m = method.trim();
  const map = {
    creditcard: 'credit_card',
    creditCard: 'credit_card',
    debitcard: 'debit_card',
    debitCard: 'debit_card',
    banktransfer: 'bank_transfer',
    bankTransfer: 'bank_transfer',
    ewallet: 'e_wallet',
    eWallet: 'e_wallet',
    e_wallet: 'e_wallet',
  };
  return map[m] || map[m.toLowerCase()] || m.toLowerCase();
}

/**
 * Merge payment-method rows that map to the same canonical method.
 * Returns array of { method, total, transactionCount, detail }.
 */
function mergePaymentMethods(rows, bankDetailMap) {
  const merged = {};
  rows.forEach(pm => {
    const key = displayPaymentMethod(pm.paymentMethod);
    if (!merged[key]) merged[key] = { method: key, total: 0, transactionCount: 0, detail: [] };
    merged[key].total += parseFloat(pm.total || 0);
    merged[key].transactionCount += parseInt(pm.transactionCount || 0);
    // merge bank detail arrays
    const detailArr = bankDetailMap[pm.paymentMethod] || [];
    merged[key].detail = merged[key].detail.concat(detailArr);
  });
  const grandTotal = Object.values(merged).reduce((s, v) => s + v.total, 0);
  return Object.values(merged)
    .map(v => ({
      method: v.method,
      total: parseFloat(v.total.toFixed(2)),
      transactionCount: v.transactionCount,
      percentage: grandTotal > 0 ? parseFloat(((v.total / grandTotal) * 100).toFixed(2)) : 0,
      detail: v.detail
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Get finance dashboard overview
 * Aggregates revenue, expenses, net profit, comparisons with previous period,
 * revenue by module, and recent transactions.
 * 
 * @route GET /api/v1/finance/dashboard/overview
 * @query startDate - Period start (required)
 * @query endDate - Period end (required)
 * @query locationId - Optional location filter
 */
async function getFinanceDashboardOverview(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      startDate,
      endDate,
      locationId
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_PARAMETERS',
        message: 'startDate and endDate are required'
      });
    }

    const { start, end } = buildInclusiveDateRange(startDate, endDate, getTenantTimezone(req));

    // Calculate previous period for comparison
    const periodDuration = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - periodDuration);

    const tenantFilter = isSuperAdmin ? {} : { tenantId };
    const locationFilter = locationId ? { locationId } : {};

    // =====================
    // Current Period Revenue
    // =====================
    const currentRevenue = await Transaction.findOne({
      where: {
        ...tenantFilter,
        ...locationFilter,
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: { [Op.between]: [start, end] }
      },
      attributes: [
        [fn('COALESCE', fn('SUM', col('totalAmount')), 0), 'total'],
        [fn('COUNT', col('id')), 'count']
      ],
      raw: true
    });

    // =====================
    // Previous Period Revenue (for comparison)
    // =====================
    const previousRevenue = await Transaction.findOne({
      where: {
        ...tenantFilter,
        ...locationFilter,
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: { [Op.between]: [prevStart, prevEnd] }
      },
      attributes: [
        [fn('COALESCE', fn('SUM', col('totalAmount')), 0), 'total'],
        [fn('COUNT', col('id')), 'count']
      ],
      raw: true
    });

    // =====================
    // Current Period Expenses
    // =====================
    const currentExpenses = await Expense.findOne({
      where: {
        ...tenantFilter,
        ...locationFilter,
        status: { [Op.in]: ['approved', 'paid'] },
        expenseDate: { [Op.between]: [start, end] }
      },
      attributes: [
        [fn('COALESCE', fn('SUM', col('totalAmount')), 0), 'total'],
        [fn('COUNT', col('id')), 'count']
      ],
      raw: true
    });

    // =====================
    // Previous Period Expenses
    // =====================
    const previousExpenses = await Expense.findOne({
      where: {
        ...tenantFilter,
        ...locationFilter,
        status: { [Op.in]: ['approved', 'paid'] },
        expenseDate: { [Op.between]: [prevStart, prevEnd] }
      },
      attributes: [
        [fn('COALESCE', fn('SUM', col('totalAmount')), 0), 'total'],
        [fn('COUNT', col('id')), 'count']
      ],
      raw: true
    });

    // =====================
    // Revenue by Module (current period)
    // =====================
    const revenueByModule = await Transaction.findAll({
      where: {
        ...tenantFilter,
        ...locationFilter,
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: { [Op.between]: [start, end] }
      },
      attributes: [
        'transactionType',
        [fn('COALESCE', fn('SUM', col('totalAmount')), 0), 'total'],
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['transactionType'],
      order: [[fn('SUM', col('totalAmount')), 'DESC']],
      raw: true
    });

    // =====================
    // Revenue Trend (daily within period)
    // =====================
    const revenueTrend = await Transaction.findAll({
      where: {
        ...tenantFilter,
        ...locationFilter,
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: { [Op.between]: [start, end] }
      },
      attributes: [
        [literal("DATE_TRUNC('day', \"Transaction\".\"createdAt\")"), 'date'],
        [fn('COALESCE', fn('SUM', col('totalAmount')), 0), 'total'],
        [fn('COUNT', col('id')), 'count']
      ],
      group: [literal("DATE_TRUNC('day', \"Transaction\".\"createdAt\")")],
      order: [[literal("DATE_TRUNC('day', \"Transaction\".\"createdAt\")"), 'ASC']],
      raw: true
    });

    // =====================
    // Service Charge (current period)
    // =====================
    const currentServiceCharge = await Transaction.findOne({
      where: {
        ...tenantFilter,
        ...locationFilter,
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: { [Op.between]: [start, end] }
      },
      attributes: [
        [fn('COALESCE', fn('SUM', col('serviceCharge')), 0), 'totalServiceCharge'],
        [fn('COUNT', literal('CASE WHEN "serviceCharge" > 0 THEN 1 END')), 'serviceChargeCount']
      ],
      raw: true
    });

    // =====================
    // Payment Method Grouping (current period)
    // =====================
    const paymentMethodQuery = `
      SELECT
        tp."paymentMethod",
        COUNT(DISTINCT t.id)   AS "transactionCount",
        SUM(tp.amount)         AS total
      FROM "TransactionPayments" tp
      INNER JOIN "Transactions" t ON t.id = tp."transactionId"
      WHERE ${!isSuperAdmin ? 't."tenantId" = :tenantId AND' : ''}
        t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        AND t."createdAt" BETWEEN :start AND :end
        AND tp."status" = '${COMPLETED_PAYMENT_STATUS}'
        ${locationId ? 'AND t."locationId" = :locationId' : ''}
      GROUP BY tp."paymentMethod"
      ORDER BY total DESC
    `;

    const paymentMethodBreakdown = await sequelize.query(paymentMethodQuery, {
      replacements: { tenantId, start, end, locationId: locationId || null },
      type: sequelize.QueryTypes.SELECT
    });

    // Sub-detail: breakdown per bank/provider from paymentDetails JSON
    const bankDetailQuery = `
      SELECT
        tp."paymentMethod",
        COALESCE(tp."paymentDetails"->>'bank', tp."paymentDetails"->>'provider') AS "bankName",
        COUNT(DISTINCT t.id)   AS "transactionCount",
        SUM(tp.amount)         AS total
      FROM "TransactionPayments" tp
      INNER JOIN "Transactions" t ON t.id = tp."transactionId"
      WHERE ${!isSuperAdmin ? 't."tenantId" = :tenantId AND' : ''}
        t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        AND t."createdAt" BETWEEN :start AND :end
        AND tp."status" = '${COMPLETED_PAYMENT_STATUS}'
        ${locationId ? 'AND t."locationId" = :locationId' : ''}
        AND (tp."paymentDetails"->>'bank' IS NOT NULL OR tp."paymentDetails"->>'provider' IS NOT NULL)
      GROUP BY tp."paymentMethod", "bankName"
      ORDER BY tp."paymentMethod", total DESC
    `;

    const bankDetailRows = await sequelize.query(bankDetailQuery, {
      replacements: { tenantId, start, end, locationId: locationId || null },
      type: sequelize.QueryTypes.SELECT
    });

    // Group bank detail by payment method
    const bankDetailMap = {};
    bankDetailRows.forEach(row => {
      if (!bankDetailMap[row.paymentMethod]) bankDetailMap[row.paymentMethod] = [];
      bankDetailMap[row.paymentMethod].push({
        bankName: row.bankName,
        total: parseFloat(parseFloat(row.total || 0).toFixed(2)),
        transactionCount: parseInt(row.transactionCount || 0)
      });
    });

    // =====================
    // Petty Cash Summary (current period)
    // =====================
    let pettyCashData = { fundCount: 0, totalBalance: 0, totalInitialAmount: 0, periodInflow: 0, periodOutflow: 0, transactionsByType: {}, funds: [] };
    try {
      const funds = await PettyCash.findAll({
        where: {
          ...tenantFilter,
          ...(locationId ? { locationId } : {}),
          status: 'active'
        },
        attributes: ['id', 'name', 'balance', 'initialAmount'],
        raw: true
      });

      const trxSummary = await PettyCashTransaction.findAll({
        where: {
          ...tenantFilter,
          transactionDate: { [Op.between]: [start, end] },
          deletedAt: null
        },
        attributes: [
          'type',
          [fn('COALESCE', fn('SUM', col('amount')), 0), 'totalAmount'],
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['type'],
        raw: true
      });

      const byType = {};
      trxSummary.forEach(row => {
        byType[row.type] = {
          total: parseFloat(parseFloat(row.totalAmount || 0).toFixed(2)),
          count: parseInt(row.count || 0)
        };
      });

      const inflow = (byType.top_up?.total || 0) + (byType.income?.total || 0) + (byType.initial?.total || 0) + (byType.adjustment?.total > 0 ? byType.adjustment.total : 0);
      const outflow = Math.abs(byType.expense?.total || 0) + Math.abs(byType.withdrawal?.total || 0) + (byType.adjustment?.total < 0 ? Math.abs(byType.adjustment.total) : 0);

      const totalBalance = funds.reduce((s, f) => s + parseFloat(f.balance || 0), 0);
      const totalInitialAmount = funds.reduce((s, f) => s + parseFloat(f.initialAmount || 0), 0);

      pettyCashData = {
        fundCount: funds.length,
        totalBalance: parseFloat(totalBalance.toFixed(2)),
        totalInitialAmount: parseFloat(totalInitialAmount.toFixed(2)),
        periodInflow: parseFloat(inflow.toFixed(2)),
        periodOutflow: parseFloat(outflow.toFixed(2)),
        transactionsByType: byType,
        funds: funds.map(f => ({
          id: f.id,
          name: f.name,
          balance: parseFloat(f.balance || 0),
          initialAmount: parseFloat(f.initialAmount || 0)
        }))
      };
    } catch (_e) { /* PettyCash model may not exist */ }

    // =====================
    // Recent Transactions
    // =====================
    const recentTransactions = await Transaction.findAll({
      where: {
        ...tenantFilter,
        ...locationFilter,
        createdAt: { [Op.between]: [start, end] }
      },
      attributes: ['id', 'transactionNumber', 'transactionType', 'totalAmount', 'status', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 10,
      raw: true
    });

    // =====================
    // Compute metrics
    // =====================
    const totalRevenue = parseFloat(currentRevenue.total || 0);
    const totalTransactions = parseInt(currentRevenue.count || 0);
    const totalExpenses = parseFloat(currentExpenses.total || 0);
    const totalServiceCharge = parseFloat(currentServiceCharge.totalServiceCharge || 0);
    const serviceChargeTransactionCount = parseInt(currentServiceCharge.serviceChargeCount || 0);

    // Revenue excluding service charge (pure product/service revenue)
    const revenueExcludingServiceCharge = totalRevenue - totalServiceCharge;

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0
      ? parseFloat(((netProfit / totalRevenue) * 100).toFixed(2))
      : 0;

    const prevTotalRevenue = parseFloat(previousRevenue.total || 0);
    const prevTotalExpenses = parseFloat(previousExpenses.total || 0);
    const prevNetProfit = prevTotalRevenue - prevTotalExpenses;

    const revenueGrowth = prevTotalRevenue > 0
      ? parseFloat((((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100).toFixed(2))
      : 0;
    const expenseGrowth = prevTotalExpenses > 0
      ? parseFloat((((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100).toFixed(2))
      : 0;
    const profitGrowth = prevNetProfit !== 0
      ? parseFloat((((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100).toFixed(2))
      : 0;

    const avgTransactionValue = totalTransactions > 0
      ? parseFloat((totalRevenue / totalTransactions).toFixed(2))
      : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          revenueExcludingServiceCharge: parseFloat(revenueExcludingServiceCharge.toFixed(2)),
          totalExpenses: parseFloat(totalExpenses.toFixed(2)),
          netProfit: parseFloat(netProfit.toFixed(2)),
          profitMargin,
          totalTransactions,
          avgTransactionValue,
          period: { startDate, endDate }
        },
        serviceCharge: {
          total: parseFloat(totalServiceCharge.toFixed(2)),
          transactionCount: serviceChargeTransactionCount,
          percentageOfRevenue: totalRevenue > 0
            ? parseFloat(((totalServiceCharge / totalRevenue) * 100).toFixed(2))
            : 0
        },
        pettyCash: pettyCashData,
        paymentMethods: mergePaymentMethods(paymentMethodBreakdown, bankDetailMap),
        comparison: {
          revenueGrowth,
          expenseGrowth,
          profitGrowth,
          previousPeriod: {
            revenue: parseFloat(prevTotalRevenue.toFixed(2)),
            expenses: parseFloat(prevTotalExpenses.toFixed(2)),
            netProfit: parseFloat(prevNetProfit.toFixed(2))
          }
        },
        revenueByModule: revenueByModule.map(m => ({
          module: m.transactionType,
          total: parseFloat(m.total || 0),
          count: parseInt(m.count || 0),
          percentage: totalRevenue > 0
            ? parseFloat(((parseFloat(m.total || 0) / totalRevenue) * 100).toFixed(2))
            : 0
        })),
        revenueTrend: revenueTrend.map(t => ({
          date: t.date,
          total: parseFloat(t.total || 0),
          count: parseInt(t.count || 0)
        })),
        recentTransactions: recentTransactions.map(t => ({
          id: t.id,
          transactionNumber: t.transactionNumber,
          type: t.transactionType,
          totalAmount: parseFloat(t.totalAmount || 0),
          status: t.status,
          createdAt: t.createdAt
        }))
      }
    });

    logger.logInfo('Finance dashboard overview generated', {
      action: 'FINANCE_DASHBOARD_OVERVIEW',
      userId: req.user.id,
      tenantId,
      startDate,
      endDate,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error generating finance dashboard overview', {
      action: 'FINANCE_DASHBOARD_OVERVIEW_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Get finance dashboard summary cards
 * Quick KPI data for today, this week, this month.
 * 
 * @route GET /api/v1/finance/dashboard/summary-cards
 * @query locationId - Optional location filter
 */
async function getFinanceSummaryCards(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { locationId } = req.query;

    const tenantFilter = isSuperAdmin ? {} : { tenantId };
    const locationFilter = locationId ? { locationId } : {};

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Helper to get revenue for a period
    const getRevenueForPeriod = async (from, to) => {
      const result = await Transaction.findOne({
        where: {
          ...tenantFilter,
          ...locationFilter,
          status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
          createdAt: { [Op.between]: [from, to] }
        },
        attributes: [
          [fn('COALESCE', fn('SUM', col('totalAmount')), 0), 'total'],
          [fn('COUNT', col('id')), 'count']
        ],
        raw: true
      });
      return {
        revenue: parseFloat(result.total || 0),
        transactions: parseInt(result.count || 0)
      };
    };

    // Helper to get expenses for a period
    const getExpensesForPeriod = async (from, to) => {
      const result = await Expense.findOne({
        where: {
          ...tenantFilter,
          ...locationFilter,
          status: { [Op.in]: ['approved', 'paid'] },
          expenseDate: { [Op.between]: [from, to] }
        },
        attributes: [
          [fn('COALESCE', fn('SUM', col('totalAmount')), 0), 'total'],
          [fn('COUNT', col('id')), 'count']
        ],
        raw: true
      });
      return {
        expenses: parseFloat(result.total || 0),
        count: parseInt(result.count || 0)
      };
    };

    // Helper to get service charge for a period
    const getServiceChargeForPeriod = async (from, to) => {
      const result = await Transaction.findOne({
        where: {
          ...tenantFilter,
          ...locationFilter,
          status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
          createdAt: { [Op.between]: [from, to] }
        },
        attributes: [
          [fn('COALESCE', fn('SUM', col('serviceCharge')), 0), 'totalServiceCharge'],
          [fn('COUNT', literal('CASE WHEN "serviceCharge" > 0 THEN 1 END')), 'serviceChargeCount']
        ],
        raw: true
      });
      return {
        total: parseFloat(result.totalServiceCharge || 0),
        transactionCount: parseInt(result.serviceChargeCount || 0)
      };
    };

    // Helper to get petty cash summary
    const getPettyCashForPeriod = async (from, to) => {
      try {
        // Current balance of all active petty cash funds
        const funds = await PettyCash.findAll({
          where: {
            ...tenantFilter,
            ...(locationId ? { locationId } : {}),
            status: 'active'
          },
          attributes: ['id', 'name', 'balance', 'initialAmount'],
          raw: true
        });

        const totalBalance = funds.reduce((s, f) => s + parseFloat(f.balance || 0), 0);
        const totalInitialAmount = funds.reduce((s, f) => s + parseFloat(f.initialAmount || 0), 0);

        // Transactions within the period
        const trxSummary = await PettyCashTransaction.findAll({
          where: {
            ...tenantFilter,
            transactionDate: { [Op.between]: [from, to] },
            deletedAt: null
          },
          attributes: [
            'type',
            [fn('COALESCE', fn('SUM', col('amount')), 0), 'totalAmount'],
            [fn('COUNT', col('id')), 'count']
          ],
          group: ['type'],
          raw: true
        });

        const byType = {};
        trxSummary.forEach(row => {
          byType[row.type] = {
            total: parseFloat(parseFloat(row.totalAmount || 0).toFixed(2)),
            count: parseInt(row.count || 0)
          };
        });

        // Calculate period inflow / outflow
        const inflow = (byType.top_up?.total || 0) + (byType.income?.total || 0) + (byType.initial?.total || 0) + (byType.adjustment?.total > 0 ? byType.adjustment.total : 0);
        const outflow = Math.abs(byType.expense?.total || 0) + Math.abs(byType.withdrawal?.total || 0) + (byType.adjustment?.total < 0 ? Math.abs(byType.adjustment.total) : 0);

        return {
          fundCount: funds.length,
          totalBalance: parseFloat(totalBalance.toFixed(2)),
          totalInitialAmount: parseFloat(totalInitialAmount.toFixed(2)),
          periodInflow: parseFloat(inflow.toFixed(2)),
          periodOutflow: parseFloat(outflow.toFixed(2)),
          transactionsByType: byType,
          funds: funds.map(f => ({
            id: f.id,
            name: f.name,
            balance: parseFloat(f.balance || 0),
            initialAmount: parseFloat(f.initialAmount || 0)
          }))
        };
      } catch (_e) {
        return {
          fundCount: 0,
          totalBalance: 0,
          totalInitialAmount: 0,
          periodInflow: 0,
          periodOutflow: 0,
          transactionsByType: {},
          funds: []
        };
      }
    };

    // Helper to get payment method breakdown for a period
    const getPaymentMethodsForPeriod = async (from, to) => {
      const query = `
        SELECT
          tp."paymentMethod",
          COUNT(DISTINCT t.id)   AS "transactionCount",
          SUM(tp.amount)         AS total
        FROM "TransactionPayments" tp
        INNER JOIN "Transactions" t ON t.id = tp."transactionId"
        WHERE ${!isSuperAdmin ? 't."tenantId" = :tenantId AND' : ''}
          t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
          AND t."createdAt" BETWEEN :from AND :to
          AND tp."status" = '${COMPLETED_PAYMENT_STATUS}'
          ${locationId ? 'AND t."locationId" = :locationId' : ''}
        GROUP BY tp."paymentMethod"
        ORDER BY total DESC
      `;
      const results = await sequelize.query(query, {
        replacements: { tenantId, from, to, locationId: locationId || null },
        type: sequelize.QueryTypes.SELECT
      });

      // Sub-detail: breakdown per bank/provider from paymentDetails JSON
      const detailQuery = `
        SELECT
          tp."paymentMethod",
          COALESCE(tp."paymentDetails"->>'bank', tp."paymentDetails"->>'provider') AS "bankName",
          COUNT(DISTINCT t.id)   AS "transactionCount",
          SUM(tp.amount)         AS total
        FROM "TransactionPayments" tp
        INNER JOIN "Transactions" t ON t.id = tp."transactionId"
        WHERE ${!isSuperAdmin ? 't."tenantId" = :tenantId AND' : ''}
          t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
          AND t."createdAt" BETWEEN :from AND :to
          AND tp."status" = '${COMPLETED_PAYMENT_STATUS}'
          ${locationId ? 'AND t."locationId" = :locationId' : ''}
          AND (tp."paymentDetails"->>'bank' IS NOT NULL OR tp."paymentDetails"->>'provider' IS NOT NULL)
        GROUP BY tp."paymentMethod", "bankName"
        ORDER BY tp."paymentMethod", total DESC
      `;
      const detailRows = await sequelize.query(detailQuery, {
        replacements: { tenantId, from, to, locationId: locationId || null },
        type: sequelize.QueryTypes.SELECT
      });

      // Group bank detail by payment method
      const detailMap = {};
      detailRows.forEach(row => {
        if (!detailMap[row.paymentMethod]) detailMap[row.paymentMethod] = [];
        detailMap[row.paymentMethod].push({
          bankName: row.bankName,
          total: parseFloat(parseFloat(row.total || 0).toFixed(2)),
          transactionCount: parseInt(row.transactionCount || 0)
        });
      });

      const grandTotal = results.reduce((sum, pm) => sum + parseFloat(pm.total || 0), 0);
      return mergePaymentMethods(results, detailMap);
    };

    const [
      todayRev, weekRev, monthRev,
      todayExp, weekExp, monthExp,
      todaySC, weekSC, monthSC,
      todayPM, weekPM, monthPM,
      todayPC, weekPC, monthPC
    ] = await Promise.all([
      getRevenueForPeriod(todayStart, now),
      getRevenueForPeriod(weekStart, now),
      getRevenueForPeriod(monthStart, now),
      getExpensesForPeriod(todayStart, now),
      getExpensesForPeriod(weekStart, now),
      getExpensesForPeriod(monthStart, now),
      getServiceChargeForPeriod(todayStart, now),
      getServiceChargeForPeriod(weekStart, now),
      getServiceChargeForPeriod(monthStart, now),
      getPaymentMethodsForPeriod(todayStart, now),
      getPaymentMethodsForPeriod(weekStart, now),
      getPaymentMethodsForPeriod(monthStart, now),
      getPettyCashForPeriod(todayStart, now),
      getPettyCashForPeriod(weekStart, now),
      getPettyCashForPeriod(monthStart, now)
    ]);

    // Helper to build period data
    const buildPeriodData = (rev, exp, sc, pm, pc) => ({
      revenue: parseFloat(rev.revenue.toFixed(2)),
      revenueExcludingServiceCharge: parseFloat((rev.revenue - sc.total).toFixed(2)),
      expenses: parseFloat(exp.expenses.toFixed(2)),
      netProfit: parseFloat((rev.revenue - exp.expenses).toFixed(2)),
      transactions: rev.transactions,
      serviceCharge: {
        total: parseFloat(sc.total.toFixed(2)),
        transactionCount: sc.transactionCount
      },
      pettyCash: pc,
      paymentMethods: pm
    });

    res.json({
      success: true,
      data: {
        today: buildPeriodData(todayRev, todayExp, todaySC, todayPM, todayPC),
        thisWeek: buildPeriodData(weekRev, weekExp, weekSC, weekPM, weekPC),
        thisMonth: buildPeriodData(monthRev, monthExp, monthSC, monthPM, monthPC)
      }
    });

    logger.logInfo('Finance summary cards generated', {
      action: 'FINANCE_SUMMARY_CARDS',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error generating finance summary cards', {
      action: 'FINANCE_SUMMARY_CARDS_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

module.exports = {
  getFinanceDashboardOverview,
  getFinanceSummaryCards
};
