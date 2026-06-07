'use strict';

/**
 * Financial Reports Controller
 * 
 * Provides P&L, Revenue, and other financial reports
 * 
 * @module controllers/finance/reportController
 */

const { Transaction, Expense, ExpenseCategory, sequelize } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');
const logger = require('../../utils/logger');
const { getClientIp, getUserAgent } = require('../../utils/requestHelper');
const { buildInclusiveDateRange } = require('../../utils/dateRange');
const {
  REVENUE_RECOGNIZED_TRANSACTION_STATUSES,
  REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL,
  COMPLETED_PAYMENT_STATUS,
  PAID_TRANSACTION_SEQUELIZE_LITERAL_SQL,
} = require('../../utils/reportingStatus');

/**
 * Get Profit & Loss Report
 * @route GET /api/v1/finance/reports/profit-loss
 * @query startDate, endDate, locationId, groupBy
 */
async function getProfitLossReport(req, res, next) {
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

    // =================
    // INCOME (Revenue from all modules)
    // =================

    const revenue = await Transaction.findAll({
      where: {
        ...where,
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: {
          [Op.between]: [start, end]
        },
        [Op.and]: sequelize.literal(PAID_TRANSACTION_SEQUELIZE_LITERAL_SQL)
      },
      attributes: [
        'transactionType',
        [literal(`DATE_TRUNC('${groupBy}', "Transaction"."createdAt")`), 'period'],
        [fn('SUM', col('Transaction.subtotal')), 'subtotal'],
        [fn('SUM', col('Transaction.tax')), 'tax'],
        [fn('SUM', col('Transaction.totalAmount')), 'total'],
        [fn('COUNT', col('Transaction.id')), 'transactionCount']
      ],
      group: [literal(`DATE_TRUNC('${groupBy}', "Transaction"."createdAt")`), 'transactionType'],
      order: [[literal(`DATE_TRUNC('${groupBy}', "Transaction"."createdAt")`), 'ASC']],
      raw: true
    });

    // =================
    // EXPENSES
    // =================

    const expenses = await Expense.findAll({
      where: {
        ...(isSuperAdmin ? {} : { tenantId }),
        ...(locationId ? { locationId } : {}),
        status: { [Op.in]: ['approved', 'paid'] },
        expenseDate: {
          [Op.between]: [start, end]
        }
      },
      attributes: [
        [literal(`DATE_TRUNC('${groupBy}', "Expense"."expenseDate")`), 'period'],
        [fn('SUM', col('Expense.totalAmount')), 'total'],
        [fn('COUNT', col('Expense.id')), 'expenseCount']
      ],
      group: [literal(`DATE_TRUNC('${groupBy}', "Expense"."expenseDate")`)],
      order: [[literal(`DATE_TRUNC('${groupBy}', "Expense"."expenseDate")`), 'ASC']],
      raw: true
    });

    // Expenses by category
    const expensesByCategory = await Expense.findAll({
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
          model: ExpenseCategory,
          as: 'category',
          attributes: ['name', 'type', 'color']
        }
      ],
      group: ['Expense.categoryId', 'category.id', 'category.name', 'category.type', 'category.color'],
      order: [[fn('SUM', col('Expense.totalAmount')), 'DESC']],
      raw: true
    });

    // =================
    // Calculate P&L by Period
    // =================

    // Create period map
    const periodMap = new Map();

    // Add revenue to periods
    revenue.forEach(r => {
      const periodKey = r.period;
      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          period: periodKey,
          revenue: { total: 0, byModule: {} },
          expenses: 0,
          netProfit: 0,
          profitMargin: 0
        });
      }

      const periodData = periodMap.get(periodKey);
      const revenueAmount = parseFloat(r.total || 0);
      periodData.revenue.total += revenueAmount;
      periodData.revenue.byModule[r.transactionType] = revenueAmount;
    });

    // Add expenses to periods
    expenses.forEach(e => {
      const periodKey = e.period;
      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          period: periodKey,
          revenue: { total: 0, byModule: {} },
          expenses: 0,
          netProfit: 0,
          profitMargin: 0
        });
      }

      const periodData = periodMap.get(periodKey);
      periodData.expenses += parseFloat(e.total || 0);
    });

    // Calculate net profit and margin
    periodMap.forEach((data, key) => {
      data.netProfit = data.revenue.total - data.expenses;
      data.profitMargin = data.revenue.total > 0
        ? parseFloat(((data.netProfit / data.revenue.total) * 100).toFixed(2))
        : 0;
    });

    // Convert map to array and sort by period
    const periodData = Array.from(periodMap.values()).sort((a, b) => 
      new Date(a.period) - new Date(b.period)
    );

    // =================
    // Summary Totals
    // =================

    const totalRevenue = periodData.reduce((sum, p) => sum + p.revenue.total, 0);
    const totalExpenses = periodData.reduce((sum, p) => sum + p.expenses, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0
      ? parseFloat(((netProfit / totalRevenue) * 100).toFixed(2))
      : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalExpenses: parseFloat(totalExpenses.toFixed(2)),
          netProfit: parseFloat(netProfit.toFixed(2)),
          profitMargin,
          period: {
            startDate,
            endDate,
            groupBy
          }
        },
        periodData: periodData.map(p => ({
          period: p.period,
          revenue: parseFloat(p.revenue.total.toFixed(2)),
          revenueByModule: p.revenue.byModule,
          expenses: parseFloat(p.expenses.toFixed(2)),
          netProfit: parseFloat(p.netProfit.toFixed(2)),
          profitMargin: p.profitMargin
        })),
        expensesByCategory: expensesByCategory.map(e => ({
          categoryId: e.categoryId,
          categoryName: e['category.name'],
          categoryType: e['category.type'],
          color: e['category.color'],
          total: parseFloat(e.total || 0),
          count: parseInt(e.count || 0),
          percentage: totalExpenses > 0
            ? parseFloat(((e.total / totalExpenses) * 100).toFixed(2))
            : 0
        }))
      }
    });

    logger.logInfo('P&L report generated', {
      action: 'PROFIT_LOSS_REPORT',
      userId: req.user.id,
      tenantId,
      startDate,
      endDate,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error generating P&L report', {
      action: 'PROFIT_LOSS_REPORT_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Get Revenue Report
 * @route GET /api/v1/finance/reports/revenue
 * @query startDate, endDate, locationId, groupBy
 */
async function getRevenueReport(req, res, next) {
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

    // Revenue by period and module
    const revenueByPeriod = await Transaction.findAll({
      where: {
        ...where,
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: {
          [Op.between]: [start, end]
        },
        [Op.and]: sequelize.literal(PAID_TRANSACTION_SEQUELIZE_LITERAL_SQL)
      },
      attributes: [
        [literal(`DATE_TRUNC('${groupBy}', "Transaction"."createdAt")`), 'period'],
        'transactionType',
        [fn('SUM', col('Transaction.subtotal')), 'subtotal'],
        [fn('SUM', col('Transaction.tax')), 'tax'],
        [fn('SUM', col('Transaction.voucherDiscount')), 'discount'],
        [fn('SUM', col('Transaction.totalAmount')), 'total'],
        [fn('COUNT', col('Transaction.id')), 'transactionCount']
      ],
      group: [literal(`DATE_TRUNC('${groupBy}', "Transaction"."createdAt")`), 'transactionType'],
      order: [[literal(`DATE_TRUNC('${groupBy}', "Transaction"."createdAt")`), 'ASC']],
      raw: true
    });

    // Total revenue by module
    const revenueByModule = await Transaction.findAll({
      where: {
        ...where,
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: {
          [Op.between]: [start, end]
        },
        [Op.and]: sequelize.literal(PAID_TRANSACTION_SEQUELIZE_LITERAL_SQL)
      },
      attributes: [
        'transactionType',
        [fn('SUM', col('Transaction.totalAmount')), 'total'],
        [fn('COUNT', col('Transaction.id')), 'transactionCount']
      ],
      group: ['transactionType'],
      order: [[fn('SUM', col('Transaction.totalAmount')), 'DESC']],
      raw: true
    });

    // Payment methods breakdown
    // Normalize camelCase legacy values to snake_case at query time so that
    // e.g. 'creditCard' (old data) and 'credit_card' (new data) are grouped together.
    const [paymentMethods] = await Promise.all([
      sequelize.query(`
        SELECT 
          CASE
            WHEN LOWER(REPLACE(tp."paymentMethod", '_', '')) = 'creditcard' THEN 'credit_card'
            WHEN LOWER(REPLACE(tp."paymentMethod", '_', '')) = 'debitcard'  THEN 'debit_card'
            WHEN LOWER(REPLACE(tp."paymentMethod", '_', '')) = 'banktransfer' THEN 'bank_transfer'
            WHEN LOWER(REPLACE(tp."paymentMethod", '_', '')) = 'ewallet'    THEN 'e_wallet'
            ELSE tp."paymentMethod"
          END AS "paymentMethod",
          COUNT(DISTINCT t.id) as "transactionCount",
          SUM(
            CASE
              WHEN LOWER(tp."paymentMethod") = 'cash'
                THEN GREATEST(COALESCE(tp.amount, 0) - COALESCE(t."changeAmount", 0), 0)
              ELSE COALESCE(tp.amount, 0)
            END
          ) as total
        FROM "TransactionPayments" tp
        INNER JOIN "Transactions" t ON t.id = tp."transactionId"
        WHERE ${!isSuperAdmin ? 't."tenantId" = :tenantId AND' : ''}
          t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
          AND t."createdAt" >= :startDate
          AND t."createdAt" <= :endDate
          AND tp."status" = '${COMPLETED_PAYMENT_STATUS}'
          ${locationId ? 'AND t."locationId" = :locationId' : ''}
        GROUP BY CASE
            WHEN LOWER(REPLACE(tp."paymentMethod", '_', '')) = 'creditcard' THEN 'credit_card'
            WHEN LOWER(REPLACE(tp."paymentMethod", '_', '')) = 'debitcard'  THEN 'debit_card'
            WHEN LOWER(REPLACE(tp."paymentMethod", '_', '')) = 'banktransfer' THEN 'bank_transfer'
            WHEN LOWER(REPLACE(tp."paymentMethod", '_', '')) = 'ewallet'    THEN 'e_wallet'
            ELSE tp."paymentMethod"
          END
        ORDER BY total DESC
      `, {
        replacements: {
          tenantId: isSuperAdmin ? null : tenantId,
          startDate: start,
          endDate: end,
          locationId: locationId || null
        },
        type: sequelize.QueryTypes.SELECT
      })
    ]);
    const paymentMethodsTotal = paymentMethods.reduce((sum, pm) => sum + (parseFloat(pm.total || 0)), 0);

    // Calculate summary
    const totalRevenue = revenueByModule.reduce((sum, m) => sum + parseFloat(m.total || 0), 0);
    const totalTransactions = revenueByModule.reduce((sum, m) => sum + parseInt(m.transactionCount || 0), 0);
    const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalTransactions,
          avgTransactionValue: parseFloat(avgTransactionValue.toFixed(2)),
          cashExpenseDeduction: 0,
          period: {
            startDate,
            endDate,
            groupBy
          }
        },
        byPeriod: revenueByPeriod.map(r => ({
          period: r.period,
          module: r.transactionType,
          subtotal: parseFloat(r.subtotal || 0),
          tax: parseFloat(r.tax || 0),
          discount: parseFloat(r.discount || 0),
          total: parseFloat(r.total || 0),
          transactionCount: parseInt(r.transactionCount || 0)
        })),
        byModule: revenueByModule.map(m => ({
          module: m.transactionType,
          total: parseFloat(m.total || 0),
          transactionCount: parseInt(m.transactionCount || 0),
          percentage: totalRevenue > 0
            ? parseFloat(((m.total / totalRevenue) * 100).toFixed(2))
            : 0
        })),
        paymentMethods: paymentMethods.map(pm => ({
          method: pm.paymentMethod,
          total: parseFloat(pm.total || 0),
          transactionCount: parseInt(pm.transactionCount || 0),
          percentage: paymentMethodsTotal > 0
            ? parseFloat(((pm.total / paymentMethodsTotal) * 100).toFixed(2))
            : 0
        }))
      }
    });

    logger.logInfo('Revenue report generated', {
      action: 'REVENUE_REPORT',
      userId: req.user.id,
      tenantId,
      startDate,
      endDate,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error generating revenue report', {
      action: 'REVENUE_REPORT_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Get Expense Report
 * @route GET /api/v1/finance/reports/expenses
 * @query startDate, endDate, locationId, categoryId, groupBy
 */
async function getExpenseReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      startDate,
      endDate,
      locationId,
      categoryId,
      groupBy = 'month'
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_PARAMETERS',
        message: 'startDate and endDate are required'
      });
    }

    const { start, end } = buildInclusiveDateRange(startDate, endDate);

    const where = {
      status: { [Op.in]: ['approved', 'paid'] },
      expenseDate: {
        [Op.between]: [start, end]
      }
    };

    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }
    if (locationId) {
      where.locationId = locationId;
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Expenses by period
    const expensesByPeriod = await Expense.findAll({
      where,
      attributes: [
        [literal(`DATE_TRUNC('${groupBy}', "Expense"."expenseDate")`), 'period'],
        [fn('SUM', col('Expense.amount')), 'amount'],
        [fn('SUM', col('Expense.taxAmount')), 'tax'],
        [fn('SUM', col('Expense.totalAmount')), 'total'],
        [fn('COUNT', col('Expense.id')), 'expenseCount']
      ],
      group: [literal(`DATE_TRUNC('${groupBy}', "Expense"."expenseDate")`)],
      order: [[literal(`DATE_TRUNC('${groupBy}', "Expense"."expenseDate")`), 'ASC']],
      raw: true
    });

    // Expenses by category
    const expensesByCategory = await Expense.findAll({
      where,
      attributes: [
        'categoryId',
        [fn('SUM', col('Expense.totalAmount')), 'total'],
        [fn('COUNT', col('Expense.id')), 'count']
      ],
      include: [
        {
          model: ExpenseCategory,
          as: 'category',
          attributes: ['name', 'type', 'color']
        }
      ],
      group: ['Expense.categoryId', 'category.id', 'category.name', 'category.type', 'category.color'],
      order: [[fn('SUM', col('Expense.totalAmount')), 'DESC']],
      raw: true
    });

    // Expenses by status
    const expensesByStatus = await Expense.findAll({
      where: {
        ...(isSuperAdmin ? {} : { tenantId }),
        ...(locationId ? { locationId } : {}),
        expenseDate: {
          [Op.between]: [start, end]
        }
      },
      attributes: [
        'status',
        [fn('SUM', col('Expense.totalAmount')), 'total'],
        [fn('COUNT', col('Expense.id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const totalExpenses = expensesByPeriod.reduce((sum, e) => sum + parseFloat(e.total || 0), 0);
    const totalCount = expensesByPeriod.reduce((sum, e) => sum + parseInt(e.expenseCount || 0), 0);

    res.json({
      success: true,
      data: {
        summary: {
          totalExpenses: parseFloat(totalExpenses.toFixed(2)),
          totalCount,
          avgExpenseAmount: totalCount > 0 ? parseFloat((totalExpenses / totalCount).toFixed(2)) : 0,
          period: {
            startDate,
            endDate,
            groupBy
          }
        },
        byPeriod: expensesByPeriod.map(e => ({
          period: e.period,
          amount: parseFloat(e.amount || 0),
          tax: parseFloat(e.tax || 0),
          total: parseFloat(e.total || 0),
          count: parseInt(e.expenseCount || 0)
        })),
        byCategory: expensesByCategory.map(e => ({
          categoryId: e.categoryId,
          categoryName: e['category.name'],
          categoryType: e['category.type'],
          color: e['category.color'],
          total: parseFloat(e.total || 0),
          count: parseInt(e.count || 0),
          percentage: totalExpenses > 0
            ? parseFloat(((e.total / totalExpenses) * 100).toFixed(2))
            : 0
        })),
        byStatus: expensesByStatus.map(e => ({
          status: e.status,
          total: parseFloat(e.total || 0),
          count: parseInt(e.count || 0)
        }))
      }
    });

    logger.logInfo('Expense report generated', {
      action: 'EXPENSE_REPORT',
      userId: req.user.id,
      tenantId,
      startDate,
      endDate,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error generating expense report', {
      action: 'EXPENSE_REPORT_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

module.exports = {
  getProfitLossReport,
  getRevenueReport,
  getExpenseReport
};
