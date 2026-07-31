/**
 * Restaurant Report Controller
 * Reports: restaurant sales, table utilization, order analysis
 */
const { Transaction, TransactionItem, TransactionPayment, sequelize } = require('../../models');
const RestaurantTable = require('../../models').RestaurantTable;
const Location = require('../../models').Location;
const { Op, fn, col, literal } = require('sequelize');
const { generateForecast } = require('../../utils/forecasting');
const logger = require('../../utils/logger');
const { getTenantTimezone } = require('../../utils/tenantTimezone');
const { mergeDateRangeInto } = require('../../utils/dateRange');
const {
  REVENUE_RECOGNIZED_TRANSACTION_STATUSES,
  COMPLETED_PAYMENT_STATUS,
  PAID_TRANSACTION_SEQUELIZE_LITERAL_SQL,
} = require('../../utils/reportingStatus');

// Pre-built Sequelize literal for payment-exists filter (correct Op.and usage).
const paidTxLiteral = sequelize.literal(PAID_TRANSACTION_SEQUELIZE_LITERAL_SQL);

/**
 * GET /reports/restaurant/sales
 * Restaurant sales report grouped by period
 */
async function getRestaurantSales(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, groupBy = 'daily', locationId } = req.query;

    const where = { transactionType: 'restaurant' };
    if (!isSuperAdmin) where.tenantId = tenantId;
    if (locationId) where.locationId = locationId;
    mergeDateRangeInto(where, 'createdAt', startDate, endDate, Op, getTenantTimezone(req));

    const completedWhere = { ...where, [Op.and]: paidTxLiteral, status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES } };

    const dateTruncMap = { daily: 'day', weekly: 'week', monthly: 'month' };
    const trunc = dateTruncMap[groupBy] || 'day';

    // Sales by period
    const salesByPeriod = await Transaction.findAll({
      where: completedWhere,
      attributes: [
        [fn('DATE_TRUNC', trunc, col('createdAt')), 'period'],
        [fn('COUNT', col('id')), 'orderCount'],
        [fn('SUM', col('totalAmount')), 'totalSales'],
        [fn('AVG', col('totalAmount')), 'avgOrderValue'],
        [fn('SUM', col('tax')), 'totalTax'],
        [fn('SUM', col('serviceCharge')), 'totalServiceCharge']
      ],
      group: [fn('DATE_TRUNC', trunc, col('createdAt'))],
      order: [[fn('DATE_TRUNC', trunc, col('createdAt')), 'ASC']],
      raw: true
    });

    // Summary totals
    const summary = await Transaction.findOne({
      where: completedWhere,
      attributes: [
        [fn('COUNT', col('id')), 'totalOrders'],
        [fn('SUM', col('totalAmount')), 'totalRevenue'],
        [fn('AVG', col('totalAmount')), 'avgOrderValue'],
        [fn('SUM', col('tax')), 'totalTax'],
        [fn('SUM', col('serviceCharge')), 'totalServiceCharge'],
        [fn('SUM', col('voucherDiscount')), 'totalDiscounts']
      ],
      raw: true
    });

    // Order type breakdown (dine-in, takeaway, delivery)
    const orderTypeBreakdown = await Transaction.findAll({
      where: completedWhere,
      attributes: [
        'orderType',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('totalAmount')), 'revenue']
      ],
      group: ['orderType'],
      raw: true
    });

    // Payment method breakdown
    const paymentBreakdown = await TransactionPayment.findAll({
      where: { status: COMPLETED_PAYMENT_STATUS },
      include: [{
        model: Transaction,
        as: 'transaction',
        where: completedWhere,
        attributes: []
      }],
      attributes: [
        'paymentMethod',
        [fn('COUNT', col('TransactionPayment.id')), 'count'],
        [fn('SUM', col('TransactionPayment.amount')), 'total']
      ],
      group: ['paymentMethod'],
      raw: true
    });

    // Forecast
    const forecastData = salesByPeriod.map(s => ({ period: s.period, value: parseFloat(s.totalSales) || 0 }));
    const forecast = generateForecast(forecastData, 3);

    res.json({
      success: true,
      data: {
        summary: {
          totalOrders: parseInt(summary?.totalOrders) || 0,
          totalRevenue: parseFloat(summary?.totalRevenue) || 0,
          avgOrderValue: Math.round((parseFloat(summary?.avgOrderValue) || 0) * 100) / 100,
          totalTax: parseFloat(summary?.totalTax) || 0,
          totalServiceCharge: parseFloat(summary?.totalServiceCharge) || 0,
          totalDiscounts: parseFloat(summary?.totalDiscounts) || 0
        },
        salesByPeriod,
        orderTypeBreakdown,
        paymentBreakdown,
        forecast
      },
      filters: { startDate, endDate, groupBy, locationId }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/restaurant/table-utilization
 * Table usage and performance metrics
 */
async function getTableUtilization(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, locationId } = req.query;

    const txWhere = { transactionType: 'restaurant', status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES } };
    if (!isSuperAdmin) txWhere.tenantId = tenantId;
    if (locationId) txWhere.locationId = locationId;
    mergeDateRangeInto(txWhere, 'transactionDate', startDate, endDate, Op, getTenantTimezone(req));

    // Orders per table
    const tableStats = await Transaction.findAll({
      where: { ...txWhere, tableId: { [Op.not]: null } },
      attributes: [
        'tableId',
        [fn('COUNT', col('Transaction.id')), 'orderCount'],
        [fn('SUM', col('totalAmount')), 'revenue'],
        [fn('AVG', col('totalAmount')), 'avgOrderValue']
      ],
      include: [{
        model: RestaurantTable,
        as: 'table',
        attributes: ['tableNumber', 'tableName', 'capacity']
      }],
      group: ['tableId', 'table.id', 'table.tableNumber', 'table.tableName', 'table.capacity'],
      order: [[fn('SUM', col('totalAmount')), 'DESC']],
      raw: true,
      nest: true
    });

    // Total tables
    const tableWhere = {};
    if (!isSuperAdmin) tableWhere.tenantId = tenantId;
    if (locationId) tableWhere.locationId = locationId;
    const totalTables = await RestaurantTable.count({ where: tableWhere });

    // Tables with orders in period
    const tablesUsed = tableStats.length;

    res.json({
      success: true,
      data: {
        summary: {
          totalTables,
          tablesUsed,
          utilizationRate: totalTables > 0 ? Math.round((tablesUsed / totalTables) * 10000) / 100 : 0
        },
        tablePerformance: tableStats
      },
      filters: { startDate, endDate, locationId }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/restaurant/top-items
 * Top selling restaurant menu items
 */
async function getTopRestaurantItems(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, limit = 20 } = req.query;

    const txWhere = { transactionType: 'restaurant', status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES } };
    if (!isSuperAdmin) txWhere.tenantId = tenantId;
    mergeDateRangeInto(txWhere, 'transactionDate', startDate, endDate, Op, getTenantTimezone(req));

    const topItems = await TransactionItem.findAll({
      include: [{
        model: Transaction,
        as: 'transaction',
        where: txWhere,
        attributes: []
      }],
      where: { itemType: 'product' },
      attributes: [
        'itemId',
        'itemName',
        [fn('SUM', col('quantity')), 'totalQuantity'],
        [fn('SUM', col('TransactionItem.total')), 'totalRevenue'],
        [fn('COUNT', fn('DISTINCT', col('transactionId'))), 'orderCount']
      ],
      group: ['itemId', 'itemName'],
      order: [[fn('SUM', col('TransactionItem.total')), 'DESC']],
      limit: parseInt(limit),
      raw: true
    });

    res.json({
      success: true,
      data: { topItems },
      filters: { startDate, endDate, limit }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRestaurantSales,
  getTableUtilization,
  getTopRestaurantItems
};
