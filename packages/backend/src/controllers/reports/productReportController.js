/**
 * Product Report Controller
 * Reports: product performance, top selling products, stock analysis
 */
const { Transaction, TransactionItem, sequelize } = require('../../models');
const Product = require('../../models').Product;
const ProductCategory = require('../../models').ProductCategory;
const StockMovement = require('../../models').StockMovement;
const { Op, fn, col, literal } = require('sequelize');
const { generateForecast } = require('../../utils/forecasting');
const logger = require('../../utils/logger');
const { getTenantTimezone } = require('../../utils/tenantTimezone');
const { mergeDateRangeInto, buildStartOfDay, buildEndOfDay } = require('../../utils/dateRange');
const { REVENUE_RECOGNIZED_TRANSACTION_STATUSES, REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL } = require('../../utils/reportingStatus');

/**
 * GET /reports/products/performance
 * Product sales performance over time
 */
async function getProductPerformance(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, groupBy = 'daily', categoryId, productType } = req.query;

    const txWhere = { status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES } };
    if (!isSuperAdmin) txWhere.tenantId = tenantId;
    mergeDateRangeInto(txWhere, 'createdAt', startDate, endDate, Op, getTenantTimezone(req));

    const dateTruncMap = { daily: 'day', weekly: 'week', monthly: 'month' };
    const trunc = dateTruncMap[groupBy] || 'day';

    // Product sales by period
    const salesByPeriod = await TransactionItem.findAll({
      include: [{
        model: Transaction,
        as: 'transaction',
        where: txWhere,
        attributes: []
      }],
      where: { itemType: 'product' },
      attributes: [
        [fn('DATE_TRUNC', trunc, col('transaction.createdAt')), 'period'],
        [fn('SUM', col('quantity')), 'totalQuantity'],
        [fn('SUM', col('TransactionItem.total')), 'totalRevenue'],
        [fn('COUNT', fn('DISTINCT', col('transactionId'))), 'transactionCount']
      ],
      group: [fn('DATE_TRUNC', trunc, col('transaction.createdAt'))],
      order: [[fn('DATE_TRUNC', trunc, col('transaction.createdAt')), 'ASC']],
      raw: true
    });

    // Overall summary
    const summary = await TransactionItem.findOne({
      include: [{
        model: Transaction,
        as: 'transaction',
        where: txWhere,
        attributes: []
      }],
      where: { itemType: 'product' },
      attributes: [
        [fn('SUM', col('quantity')), 'totalQuantitySold'],
        [fn('SUM', col('TransactionItem.total')), 'totalRevenue'],
        [fn('COUNT', fn('DISTINCT', col('TransactionItem.itemId'))), 'uniqueProducts'],
        [fn('COUNT', fn('DISTINCT', col('transactionId'))), 'totalTransactions']
      ],
      raw: true
    });

    // Forecast
    const forecastData = salesByPeriod.map(s => ({ period: s.period, value: parseFloat(s.totalRevenue) || 0 }));
    const forecast = generateForecast(forecastData, 3);

    res.json({
      success: true,
      data: {
        summary: {
          totalQuantitySold: parseInt(summary?.totalQuantitySold) || 0,
          totalRevenue: parseFloat(summary?.totalRevenue) || 0,
          uniqueProducts: parseInt(summary?.uniqueProducts) || 0,
          totalTransactions: parseInt(summary?.totalTransactions) || 0
        },
        salesByPeriod,
        forecast
      },
      filters: { startDate, endDate, groupBy, categoryId, productType }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/products/top-selling
 * Ranked list of top selling products
 */
async function getTopSellingProducts(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, limit = 20, sortBy = 'revenue' } = req.query;

    const txWhere = { status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES } };
    if (!isSuperAdmin) txWhere.tenantId = tenantId;
    mergeDateRangeInto(txWhere, 'createdAt', startDate, endDate, Op, getTenantTimezone(req));

    const orderCol = sortBy === 'quantity' ? fn('SUM', col('quantity')) : fn('SUM', col('TransactionItem.total'));

    const topProducts = await TransactionItem.findAll({
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
        [fn('AVG', col('unitPrice')), 'avgPrice'],
        [fn('COUNT', fn('DISTINCT', col('transactionId'))), 'orderCount']
      ],
      group: ['itemId', 'itemName'],
      order: [[orderCol, 'DESC']],
      limit: parseInt(limit),
      raw: true
    });

    // Add rank
    const ranked = topProducts.map((p, i) => ({ rank: i + 1, ...p }));

    res.json({
      success: true,
      data: { topProducts: ranked },
      filters: { startDate, endDate, limit, sortBy }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/products/by-category
 * Product sales grouped by category
 */
async function getProductsByCategory(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate } = req.query;

    const txWhere = { status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES } };
    if (!isSuperAdmin) txWhere.tenantId = tenantId;
    mergeDateRangeInto(txWhere, 'createdAt', startDate, endDate, Op, getTenantTimezone(req));

    // Use raw query for category join via Product
    const results = await sequelize.query(`
      SELECT 
        p."categoryId",
        pc."name" AS "categoryName",
        COUNT(DISTINCT ti."transactionId") AS "orderCount",
        SUM(ti."quantity") AS "totalQuantity",
        SUM(ti."total") AS "totalRevenue"
      FROM "TransactionItems" ti
      INNER JOIN "Transactions" t ON ti."transactionId" = t."id"
      INNER JOIN "Products" p ON ti."itemId" = p."id"
      LEFT JOIN "ProductCategories" pc ON p."categoryId" = pc."id"
      WHERE ti."itemType" = 'product'
        AND t."status" IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        ${!isSuperAdmin ? `AND t."tenantId" = :tenantId` : ''}
        ${startDate ? `AND t."createdAt" >= :startDate` : ''}
        ${endDate ? `AND t."createdAt" <= :endDate` : ''}
        AND ti."deletedAt" IS NULL
        AND t."deletedAt" IS NULL
      GROUP BY p."categoryId", pc."name"
      ORDER BY SUM(ti."total") DESC
    `, {
      replacements: {
        tenantId,
        startDate: startDate ? buildStartOfDay(startDate, getTenantTimezone(req)).toISOString() : undefined,
        endDate: endDate ? buildEndOfDay(endDate, getTenantTimezone(req)).toISOString() : undefined
      },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: { byCategory: results },
      filters: { startDate, endDate }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProductPerformance,
  getTopSellingProducts,
  getProductsByCategory
};
