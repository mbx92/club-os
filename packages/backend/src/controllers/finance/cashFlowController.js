'use strict';

/**
 * Cash Flow Management Controller
 * 
 * Handles cash flow tracking, reporting, and projections
 * 
 * @module controllers/finance/cashFlowController
 */

const { CashFlow, Income, Expense, Transaction, Location, sequelize } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');
const logger = require('../../utils/logger');
const { getClientIp, getUserAgent } = require('../../utils/requestHelper');
const { buildInclusiveDateRange } = require('../../utils/dateRange');
const {
  REVENUE_RECOGNIZED_TRANSACTION_STATUSES,
  REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL,
  COMPLETED_PAYMENT_STATUS,
} = require('../../utils/reportingStatus');

/**
 * Get cash flow summary
 * @route GET /api/v1/finance/cash-flow/summary
 */
async function getCashFlowSummary(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      startDate,
      endDate,
      locationId,
      groupBy = 'month' // day, week, month, year
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_PARAMETERS',
        message: 'startDate and endDate are required'
      });
    }

    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }
    if (locationId) {
      where.locationId = locationId;
    }

    const { start, end } = buildInclusiveDateRange(startDate, endDate);

    // Calculate inflows (from completed transactions)
    const inflows = await Transaction.findAll({
      where: {
        ...where,
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: { [Op.between]: [start, end] }
      },
      attributes: [
        [literal(`DATE_TRUNC('${groupBy}', "Transaction"."createdAt")`), 'period'],
        [fn('SUM', col('totalAmount')), 'total'],
        [fn('COUNT', col('id')), 'count']
      ],
      group: [literal(`DATE_TRUNC('${groupBy}', "Transaction"."createdAt")`)],
      order: [[literal(`DATE_TRUNC('${groupBy}', "Transaction"."createdAt")`), 'ASC']],
      raw: true
    });

    // Calculate outflows (from paid expenses)
    const outflows = await Expense.findAll({
      where: {
        ...(isSuperAdmin ? {} : { tenantId }),
        ...(locationId ? { locationId } : {}),
        status: { [Op.in]: ['approved', 'paid'] },
        expenseDate: { [Op.between]: [start, end] }
      },
      attributes: [
        [literal(`DATE_TRUNC('${groupBy}', "Expense"."expenseDate")`), 'period'],
        [fn('SUM', col('totalAmount')), 'total'],
        [fn('COUNT', col('id')), 'count']
      ],
      group: [literal(`DATE_TRUNC('${groupBy}', "Expense"."expenseDate")`)],
      order: [[literal(`DATE_TRUNC('${groupBy}', "Expense"."expenseDate")`), 'ASC']],
      raw: true
    });

    // Build period map
    const periodMap = new Map();

    inflows.forEach(flow => {
      const periodKey = flow.period;
      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          period: periodKey,
          inflow: 0,
          outflow: 0,
          netFlow: 0
        });
      }
      const data = periodMap.get(periodKey);
      data.inflow = parseFloat(flow.total || 0);
    });

    outflows.forEach(flow => {
      const periodKey = flow.period;
      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          period: periodKey,
          inflow: 0,
          outflow: 0,
          netFlow: 0
        });
      }
      const data = periodMap.get(periodKey);
      data.outflow = parseFloat(flow.total || 0);
    });

    // Calculate net flow and running balance
    let runningBalance = 0;
    const cashFlowData = Array.from(periodMap.values())
      .sort((a, b) => new Date(a.period) - new Date(b.period))
      .map(period => {
        period.netFlow = period.inflow - period.outflow;
        runningBalance += period.netFlow;
        period.balance = runningBalance;
        return period;
      });

    // Summary totals
    const totalInflow = cashFlowData.reduce((sum, p) => sum + p.inflow, 0);
    const totalOutflow = cashFlowData.reduce((sum, p) => sum + p.outflow, 0);
    const netCashFlow = totalInflow - totalOutflow;

    res.json({
      success: true,
      data: {
        summary: {
          totalInflow: parseFloat(totalInflow.toFixed(2)),
          totalOutflow: parseFloat(totalOutflow.toFixed(2)),
          netCashFlow: parseFloat(netCashFlow.toFixed(2)),
          endingBalance: parseFloat(runningBalance.toFixed(2)),
          period: { startDate, endDate, groupBy }
        },
        cashFlow: cashFlowData.map(p => ({
          period: p.period,
          inflow: parseFloat(p.inflow.toFixed(2)),
          outflow: parseFloat(p.outflow.toFixed(2)),
          netFlow: parseFloat(p.netFlow.toFixed(2)),
          balance: parseFloat(p.balance.toFixed(2))
        }))
      }
    });

    logger.logInfo('Cash flow summary generated', {
      action: 'CASH_FLOW_SUMMARY',
      userId: req.user.id,
      tenantId,
      startDate,
      endDate,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error generating cash flow summary', {
      action: 'CASH_FLOW_SUMMARY_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Get cash flow by category
 * @route GET /api/v1/finance/cash-flow/by-category
 */
async function getCashFlowByCategory(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      startDate,
      endDate,
      locationId,
      type // 'inflow' or 'outflow'
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_PARAMETERS',
        message: 'startDate and endDate are required'
      });
    }

    const result = {
      inflows: [],
      outflows: []
    };

    if (!type || type === 'inflow') {
      // Inflows by transaction type
      const { start, end } = buildInclusiveDateRange(startDate, endDate);

      const inflows = await Transaction.findAll({
        where: {
          ...(isSuperAdmin ? {} : { tenantId }),
          ...(locationId ? { locationId } : {}),
          status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
          createdAt: {
            [Op.between]: [start, end]
          }
        },
        attributes: [
          'transactionType',
          [fn('SUM', col('totalAmount')), 'total'],
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['transactionType'],
        order: [[fn('SUM', col('totalAmount')), 'DESC']],
        raw: true
      });

      result.inflows = inflows.map(i => ({
        category: i.transactionType,
        total: parseFloat(i.total || 0),
        count: parseInt(i.count || 0)
      }));
    }

    if (!type || type === 'outflow') {
      // Outflows by expense category
      const { start, end } = buildInclusiveDateRange(startDate, endDate);

      const outflows = await Expense.findAll({
        where: {
          ...(isSuperAdmin ? {} : { tenantId }),
          ...(locationId ? { locationId } : {}),
          status: { [Op.in]: ['approved', 'paid'] },
          expenseDate: {
            [Op.between]: [start, end]
          }
        },
        attributes: [
          'categoryId',
          [fn('SUM', col('Expense.totalAmount')), 'total'],
          [fn('COUNT', col('Expense.id')), 'count']
        ],
        include: [
          {
            model: require('../../models').ExpenseCategory,
            as: 'category',
            attributes: ['name', 'type', 'color']
          }
        ],
        group: ['Expense.categoryId', 'category.id', 'category.name', 'category.type', 'category.color'],
        order: [[fn('SUM', col('Expense.totalAmount')), 'DESC']],
        raw: true
      });

      result.outflows = outflows.map(o => ({
        categoryId: o.categoryId,
        categoryName: o['category.name'],
        categoryType: o['category.type'],
        color: o['category.color'],
        total: parseFloat(o.total || 0),
        count: parseInt(o.count || 0)
      }));
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.logError('Error generating cash flow by category', {
      action: 'CASH_FLOW_BY_CATEGORY_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

/**
 * Get cash flow projection
 * @route GET /api/v1/finance/cash-flow/projection
 */
async function getCashFlowProjection(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      months = 3 // Number of months to project
    } = req.query;

    if (!isSuperAdmin && !tenantId) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Not authorized'
      });
    }

    // Get historical data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const historicalInflows = await Transaction.findAll({
      where: {
        ...(isSuperAdmin ? {} : { tenantId }),
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: { [Op.gte]: sixMonthsAgo }
      },
      attributes: [
        [literal("DATE_TRUNC('month', \"Transaction\".\"createdAt\")"), 'month'],
        [fn('SUM', col('totalAmount')), 'total']
      ],
      group: [literal("DATE_TRUNC('month', \"Transaction\".\"createdAt\")")],
      raw: true
    });

    const historicalOutflows = await Expense.findAll({
      where: {
        ...(isSuperAdmin ? {} : { tenantId }),
        status: { [Op.in]: ['approved', 'paid'] },
        expenseDate: { [Op.gte]: sixMonthsAgo }
      },
      attributes: [
        [literal("DATE_TRUNC('month', \"Expense\".\"expenseDate\")"), 'month'],
        [fn('SUM', col('totalAmount')), 'total']
      ],
      group: [literal("DATE_TRUNC('month', \"Expense\".\"expenseDate\")")],
      raw: true
    });

    // Calculate averages
    const avgInflow = historicalInflows.reduce((sum, i) => sum + parseFloat(i.total || 0), 0) / historicalInflows.length || 0;
    const avgOutflow = historicalOutflows.reduce((sum, o) => sum + parseFloat(o.total || 0), 0) / historicalOutflows.length || 0;

    // Generate projections
    const projections = [];
    let projectedBalance = 0;

    for (let i = 1; i <= parseInt(months); i++) {
      const projectionDate = new Date();
      projectionDate.setMonth(projectionDate.getMonth() + i);
      
      const projectedInflow = avgInflow;
      const projectedOutflow = avgOutflow;
      const netFlow = projectedInflow - projectedOutflow;
      projectedBalance += netFlow;

      projections.push({
        month: projectionDate.toISOString().substring(0, 7),
        projectedInflow: parseFloat(projectedInflow.toFixed(2)),
        projectedOutflow: parseFloat(projectedOutflow.toFixed(2)),
        projectedNetFlow: parseFloat(netFlow.toFixed(2)),
        projectedBalance: parseFloat(projectedBalance.toFixed(2))
      });
    }

    res.json({
      success: true,
      data: {
        historical: {
          avgMonthlyInflow: parseFloat(avgInflow.toFixed(2)),
          avgMonthlyOutflow: parseFloat(avgOutflow.toFixed(2)),
          avgNetFlow: parseFloat((avgInflow - avgOutflow).toFixed(2)),
          periodsAnalyzed: historicalInflows.length
        },
        projections
      }
    });

    logger.logInfo('Cash flow projection generated', {
      action: 'CASH_FLOW_PROJECTION',
      userId: req.user.id,
      tenantId,
      months,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error generating cash flow projection', {
      action: 'CASH_FLOW_PROJECTION_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Get cash flow statement — detailed per-period ledger
 * Built entirely from Transactions (inflows) and Expenses (outflows).
 *
 * @route GET /api/v1/finance/cash-flow/statement
 * @query startDate, endDate, groupBy (day|week|month), locationId, includeItems (true/false)
 */
async function getCashFlowStatement(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      startDate,
      endDate,
      locationId,
      groupBy = 'day',       // day | week | month
      includeItems = 'false', // include individual transaction list
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_PARAMETERS',
        message: 'startDate and endDate are required',
      });
    }

    const validGroups = ['day', 'week', 'month'];
    if (!validGroups.includes(groupBy)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PARAMETER',
        message: `groupBy must be one of: ${validGroups.join(', ')}`,
      });
    }

    const { start, end } = buildInclusiveDateRange(startDate, endDate);

    const tWhere = { status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES }, createdAt: { [Op.between]: [start, end] } };
    const eWhere = { status: { [Op.in]: ['approved', 'paid'] }, expenseDate: { [Op.between]: [start, end] } };

    if (!isSuperAdmin) {
      tWhere.tenantId = tenantId;
      eWhere.tenantId = tenantId;
    }
    if (locationId) {
      tWhere.locationId = locationId;
      eWhere.locationId = locationId;
    }

    const truncExpr = `DATE_TRUNC('${groupBy}', "Transaction"."createdAt")`;
    const truncExpExpr = `DATE_TRUNC('${groupBy}', "Expense"."expenseDate")`;

    // ── Inflows: grouped by period + transactionType ──────────────────────────
    const inflowsByType = await Transaction.findAll({
      where: tWhere,
      attributes: [
        [literal(truncExpr), 'period'],
        'transactionType',
        [fn('SUM', col('Transaction.totalAmount')), 'total'],
        [fn('COUNT', col('Transaction.id')), 'count'],
      ],
      group: [literal(truncExpr), 'transactionType'],
      order: [[literal(truncExpr), 'ASC']],
      raw: true,
    });

    // ── Inflows: grouped by period + paymentMethod (from TransactionPayments) ─
    const inflowsByPaymentRaw = await sequelize.query(`
      SELECT
        DATE_TRUNC('${groupBy}', t."createdAt")  AS period,
        tp."paymentMethod",
        SUM(tp.amount)                            AS total,
        COUNT(DISTINCT t.id)                      AS count
      FROM "TransactionPayments" tp
      INNER JOIN "Transactions" t ON t.id = tp."transactionId"
      WHERE ${!isSuperAdmin ? 't."tenantId" = :tenantId AND' : ''}
        t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        AND t."createdAt" BETWEEN :start AND :end
        AND tp."status" = '${COMPLETED_PAYMENT_STATUS}'
        ${locationId ? 'AND t."locationId" = :locationId' : ''}
      GROUP BY DATE_TRUNC('${groupBy}', t."createdAt"), tp."paymentMethod"
      ORDER BY period ASC
    `, {
      replacements: { tenantId, start, end, locationId: locationId || null },
      type: sequelize.QueryTypes.SELECT,
    });

    // ── Outflows: grouped by period + expenseCategory ─────────────────────────
    const outflowsByCategory = await Expense.findAll({
      where: eWhere,
      attributes: [
        [literal(truncExpExpr), 'period'],
        'categoryId',
        [fn('SUM', col('Expense.totalAmount')), 'total'],
        [fn('COUNT', col('Expense.id')), 'count'],
      ],
      include: [{ model: require('../../models').ExpenseCategory, as: 'category', attributes: ['name', 'color'] }],
      group: [literal(truncExpExpr), 'Expense.categoryId', 'category.id', 'category.name', 'category.color'],
      order: [[literal(truncExpExpr), 'ASC']],
      raw: true,
    });

    // ── Individual transaction items (optional) ───────────────────────────────
    let items = [];
    if (includeItems === 'true') {
      const [trxItems, expItems] = await Promise.all([
        Transaction.findAll({
          where: tWhere,
          attributes: ['id', 'transactionNumber', 'transactionType', 'totalAmount', 'createdAt'],
          order: [['createdAt', 'ASC']],
          raw: true,
        }),
        Expense.findAll({
          where: eWhere,
          attributes: ['id', 'expenseNumber', 'categoryId', 'totalAmount', 'expenseDate'],
          include: [{ model: require('../../models').ExpenseCategory, as: 'category', attributes: ['name'] }],
          order: [['expenseDate', 'ASC']],
          raw: true,
        }),
      ]);

      items = [
        ...trxItems.map(t => ({
          type: 'inflow',
          id: t.id,
          ref: t.transactionNumber,
          category: t.transactionType,
          amount: parseFloat(t.totalAmount || 0),
          date: t.createdAt,
        })),
        ...expItems.map(e => ({
          type: 'outflow',
          id: e.id,
          ref: e.expenseNumber,
          category: e['category.name'] || e.categoryId,
          amount: parseFloat(e.totalAmount || 0),
          date: e.expenseDate,
        })),
      ].sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // ── Build period map ──────────────────────────────────────────────────────
    const periodMap = new Map();

    function getOrCreate(periodKey) {
      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          period: periodKey,
          inflowTotal: 0,
          inflowByType: {},
          inflowByPayment: {},
          outflowTotal: 0,
          outflowByCategory: {},
          netFlow: 0,
          runningBalance: 0,
        });
      }
      return periodMap.get(periodKey);
    }

    inflowsByType.forEach(r => {
      const key  = r.period instanceof Date ? r.period.toISOString() : String(r.period);
      const row  = getOrCreate(key);
      const amt  = parseFloat(r.total || 0);
      row.inflowTotal += amt;
      row.inflowByType[r.transactionType] = (row.inflowByType[r.transactionType] || 0) + amt;
    });

    inflowsByPaymentRaw.forEach(r => {
      const key  = r.period instanceof Date ? r.period.toISOString() : String(r.period);
      const row  = getOrCreate(key);
      const amt  = parseFloat(r.total || 0);
      row.inflowByPayment[r.paymentMethod] = (row.inflowByPayment[r.paymentMethod] || 0) + amt;
    });

    outflowsByCategory.forEach(r => {
      const key     = r.period instanceof Date ? r.period.toISOString() : String(r.period);
      const row     = getOrCreate(key);
      const amt     = parseFloat(r.total || 0);
      const catName = r['category.name'] || r.categoryId || 'Lainnya';
      row.outflowTotal += amt;
      row.outflowByCategory[catName] = (row.outflowByCategory[catName] || 0) + amt;
    });

    // ── Sort periods & calculate running balance ───────────────────────────────
    let runningBalance = 0;
    const statement = Array.from(periodMap.values())
      .sort((a, b) => new Date(a.period) - new Date(b.period))
      .map(p => {
        p.netFlow        = parseFloat((p.inflowTotal - p.outflowTotal).toFixed(2));
        runningBalance  += p.netFlow;
        p.runningBalance = parseFloat(runningBalance.toFixed(2));
        p.inflowTotal    = parseFloat(p.inflowTotal.toFixed(2));
        p.outflowTotal   = parseFloat(p.outflowTotal.toFixed(2));

        // Round nested maps
        Object.keys(p.inflowByType).forEach(k => {
          p.inflowByType[k] = parseFloat(p.inflowByType[k].toFixed(2));
        });
        Object.keys(p.inflowByPayment).forEach(k => {
          p.inflowByPayment[k] = parseFloat(p.inflowByPayment[k].toFixed(2));
        });
        Object.keys(p.outflowByCategory).forEach(k => {
          p.outflowByCategory[k] = parseFloat(p.outflowByCategory[k].toFixed(2));
        });

        return p;
      });

    // ── Period-level totals ───────────────────────────────────────────────────
    const totalInflow  = statement.reduce((s, p) => s + p.inflowTotal,  0);
    const totalOutflow = statement.reduce((s, p) => s + p.outflowTotal, 0);
    const netCashFlow  = totalInflow - totalOutflow;

    // Aggregate inflow by type (global)
    const globalByType = {};
    statement.forEach(p => {
      Object.entries(p.inflowByType).forEach(([k, v]) => {
        globalByType[k] = (globalByType[k] || 0) + v;
      });
    });

    // Aggregate inflow by payment (global)
    const globalByPayment = {};
    statement.forEach(p => {
      Object.entries(p.inflowByPayment).forEach(([k, v]) => {
        globalByPayment[k] = (globalByPayment[k] || 0) + v;
      });
    });

    // Aggregate outflow by category (global)
    const globalByCategory = {};
    statement.forEach(p => {
      Object.entries(p.outflowByCategory).forEach(([k, v]) => {
        globalByCategory[k] = (globalByCategory[k] || 0) + v;
      });
    });

    logger.info('Cash flow statement generated', {
      action: 'CASH_FLOW_STATEMENT',
      userId: req.user.id,
      tenantId,
      startDate,
      endDate,
      groupBy,
    });

    return res.json({
      success: true,
      data: {
        summary: {
          totalInflow:  parseFloat(totalInflow.toFixed(2)),
          totalOutflow: parseFloat(totalOutflow.toFixed(2)),
          netCashFlow:  parseFloat(netCashFlow.toFixed(2)),
          endingBalance: parseFloat(runningBalance.toFixed(2)),
          inflowByType:    globalByType,
          inflowByPayment: globalByPayment,
          outflowByCategory: globalByCategory,
          period: { startDate, endDate, groupBy },
        },
        statement,
        ...(includeItems === 'true' ? { items } : {}),
      },
    });

  } catch (error) {
    logger.error('Error generating cash flow statement', {
      action: 'CASH_FLOW_STATEMENT_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
}

module.exports = {
  getCashFlowSummary,
  getCashFlowByCategory,
  getCashFlowProjection,
  getCashFlowStatement,
};
