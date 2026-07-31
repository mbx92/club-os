'use strict';

/**
 * Top Selling Controller
 * 
 * Provides analytics for top selling products and services
 * based on TransactionItem data.
 * 
 * @module controllers/finance/topSellingController
 */

const { Transaction, TransactionItem, sequelize } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');
const logger = require('../../utils/logger');
const { getClientIp, getUserAgent } = require('../../utils/requestHelper');
const { buildUtcStartOfDay, buildUtcEndOfDay } = require('../../utils/dateRange');
const { getTenantTimezone } = require('../../utils/tenantTimezone');
const {
  REVENUE_RECOGNIZED_TRANSACTION_STATUSES,
  REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL,
} = require('../../utils/reportingStatus');

/**
 * Get top selling products
 * Ranked by quantity sold or revenue generated.
 * 
 * @route GET /api/v1/finance/analytics/top-products
 * @query startDate - Period start (required)
 * @query endDate - Period end (required)
 * @query locationId - Optional location filter
 * @query limit - Number of results (default 10, max 50)
 * @query sortBy - 'quantity' or 'revenue' (default: 'revenue')
 * @query transactionType - Filter by transaction type (pos, restaurant, etc.)
 */
async function getTopSellingProducts(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      startDate,
      endDate,
      locationId,
      limit = 10,
      sortBy = 'revenue',
      transactionType
    } = req.query;

    const resultLimit = Math.min(parseInt(limit) || 10, 50);

    // Default: last 30 days if not provided
    const tz = getTenantTimezone(req);
    const end = endDate ? buildUtcEndOfDay(endDate, tz) : new Date();
    const start = startDate ? buildUtcStartOfDay(startDate, tz) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Build transaction filter
    const transactionWhere = {
      status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
      createdAt: { [Op.between]: [start, end] }
    };
    if (!isSuperAdmin) {
      transactionWhere.tenantId = tenantId;
    }
    if (locationId) {
      transactionWhere.locationId = locationId;
    }
    if (transactionType) {
      transactionWhere.transactionType = transactionType;
    }

    // Query top selling products via raw SQL for better performance
    const topProducts = await sequelize.query(`
      SELECT 
        ti."itemId",
        ti."itemName",
        t."transactionType",
        SUM(ti.quantity) AS "totalQuantity",
        SUM(ti.total) AS "totalRevenue",
        COUNT(DISTINCT t.id) AS "transactionCount",
        AVG(ti."unitPrice") AS "avgUnitPrice"
      FROM "TransactionItems" ti
      INNER JOIN "Transactions" t ON t.id = ti."transactionId"
      WHERE ti."itemType" = 'product'
        AND ti."isRefunded" = false
        AND ti."deletedAt" IS NULL
        AND t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        AND t."createdAt" >= :startDate
        AND t."createdAt" <= :endDate
        ${!isSuperAdmin ? 'AND t."tenantId" = :tenantId' : ''}
        ${locationId ? 'AND t."locationId" = :locationId' : ''}
        ${transactionType ? 'AND t."transactionType" = :transactionType' : ''}
      GROUP BY ti."itemId", ti."itemName", t."transactionType"
      ORDER BY ${sortBy === 'quantity' ? '"totalQuantity"' : '"totalRevenue"'} DESC
      LIMIT :limit
    `, {
      replacements: {
        startDate: start,
        endDate: end,
        tenantId: isSuperAdmin ? null : tenantId,
        locationId: locationId || null,
        transactionType: transactionType || null,
        limit: resultLimit
      },
      type: sequelize.QueryTypes.SELECT
    });

    // Get total revenue for percentage calculation
    const totalRevenueResult = await sequelize.query(`
      SELECT COALESCE(SUM(ti.total), 0) AS "totalRevenue"
      FROM "TransactionItems" ti
      INNER JOIN "Transactions" t ON t.id = ti."transactionId"
      WHERE ti."itemType" = 'product'
        AND ti."isRefunded" = false
        AND ti."deletedAt" IS NULL
        AND t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        AND t."createdAt" >= :startDate
        AND t."createdAt" <= :endDate
        ${!isSuperAdmin ? 'AND t."tenantId" = :tenantId' : ''}
        ${locationId ? 'AND t."locationId" = :locationId' : ''}
        ${transactionType ? 'AND t."transactionType" = :transactionType' : ''}
    `, {
      replacements: {
        startDate: start,
        endDate: end,
        tenantId: isSuperAdmin ? null : tenantId,
        locationId: locationId || null,
        transactionType: transactionType || null
      },
      type: sequelize.QueryTypes.SELECT
    });

    const grandTotalRevenue = parseFloat(totalRevenueResult[0]?.totalRevenue || 0);

    res.json({
      success: true,
      data: {
        period: {
          startDate: start.toISOString(),
          endDate: end.toISOString()
        },
        sortBy,
        totalProductRevenue: parseFloat(grandTotalRevenue.toFixed(2)),
        products: topProducts.map((p, index) => ({
          rank: index + 1,
          itemId: p.itemId,
          itemName: p.itemName,
          transactionType: p.transactionType,
          totalQuantity: parseInt(p.totalQuantity || 0),
          totalRevenue: parseFloat(parseFloat(p.totalRevenue || 0).toFixed(2)),
          transactionCount: parseInt(p.transactionCount || 0),
          avgUnitPrice: parseFloat(parseFloat(p.avgUnitPrice || 0).toFixed(2)),
          revenuePercentage: grandTotalRevenue > 0
            ? parseFloat(((parseFloat(p.totalRevenue || 0) / grandTotalRevenue) * 100).toFixed(2))
            : 0
        }))
      }
    });

    logger.logInfo('Top selling products report generated', {
      action: 'TOP_SELLING_PRODUCTS',
      userId: req.user.id,
      tenantId,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: resultLimit,
      sortBy,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error generating top selling products report', {
      action: 'TOP_SELLING_PRODUCTS_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Get top selling services
 * Ranked by quantity sold or revenue generated.
 * Items with itemType = 'service_plan' or 'membership'.
 * 
 * @route GET /api/v1/finance/analytics/top-services
 * @query startDate - Period start (required)
 * @query endDate - Period end (required)
 * @query locationId - Optional location filter
 * @query limit - Number of results (default 10, max 50)
 * @query sortBy - 'quantity' or 'revenue' (default: 'revenue')
 * @query serviceType - Filter by item type: 'service_plan', 'membership', or 'all' (default: 'all')
 */
async function getTopSellingServices(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      startDate,
      endDate,
      locationId,
      limit = 10,
      sortBy = 'revenue',
      serviceType = 'all'
    } = req.query;

    const resultLimit = Math.min(parseInt(limit) || 10, 50);

    // Default: last 30 days if not provided
    const tz = getTenantTimezone(req);
    const end = endDate ? buildUtcEndOfDay(endDate, tz) : new Date();
    const start = startDate ? buildUtcStartOfDay(startDate, tz) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Determine which item types to include
    let itemTypeFilter;
    if (serviceType === 'service_plan') {
      itemTypeFilter = "ti.\"itemType\" = 'service_plan'";
    } else if (serviceType === 'membership') {
      itemTypeFilter = "ti.\"itemType\" = 'membership'";
    } else {
      itemTypeFilter = "ti.\"itemType\" IN ('service_plan', 'membership')";
    }

    // Query top selling services
    const topServices = await sequelize.query(`
      SELECT 
        ti."itemId",
        ti."itemName",
        ti."itemType",
        SUM(ti.quantity) AS "totalQuantity",
        SUM(ti.total) AS "totalRevenue",
        COUNT(DISTINCT t.id) AS "transactionCount",
        AVG(ti."unitPrice") AS "avgUnitPrice"
      FROM "TransactionItems" ti
      INNER JOIN "Transactions" t ON t.id = ti."transactionId"
      WHERE ${itemTypeFilter}
        AND ti."isRefunded" = false
        AND ti."deletedAt" IS NULL
        AND t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        AND t."createdAt" >= :startDate
        AND t."createdAt" <= :endDate
        ${!isSuperAdmin ? 'AND t."tenantId" = :tenantId' : ''}
        ${locationId ? 'AND t."locationId" = :locationId' : ''}
      GROUP BY ti."itemId", ti."itemName", ti."itemType"
      ORDER BY ${sortBy === 'quantity' ? '"totalQuantity"' : '"totalRevenue"'} DESC
      LIMIT :limit
    `, {
      replacements: {
        startDate: start,
        endDate: end,
        tenantId: isSuperAdmin ? null : tenantId,
        locationId: locationId || null,
        limit: resultLimit
      },
      type: sequelize.QueryTypes.SELECT
    });

    // Get total service revenue for percentage
    const totalRevenueResult = await sequelize.query(`
      SELECT COALESCE(SUM(ti.total), 0) AS "totalRevenue"
      FROM "TransactionItems" ti
      INNER JOIN "Transactions" t ON t.id = ti."transactionId"
      WHERE ${itemTypeFilter}
        AND ti."isRefunded" = false
        AND ti."deletedAt" IS NULL
        AND t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        AND t."createdAt" >= :startDate
        AND t."createdAt" <= :endDate
        ${!isSuperAdmin ? 'AND t."tenantId" = :tenantId' : ''}
        ${locationId ? 'AND t."locationId" = :locationId' : ''}
    `, {
      replacements: {
        startDate: start,
        endDate: end,
        tenantId: isSuperAdmin ? null : tenantId,
        locationId: locationId || null
      },
      type: sequelize.QueryTypes.SELECT
    });

    const grandTotalRevenue = parseFloat(totalRevenueResult[0]?.totalRevenue || 0);

    res.json({
      success: true,
      data: {
        period: {
          startDate: start.toISOString(),
          endDate: end.toISOString()
        },
        sortBy,
        serviceType,
        totalServiceRevenue: parseFloat(grandTotalRevenue.toFixed(2)),
        services: topServices.map((s, index) => ({
          rank: index + 1,
          itemId: s.itemId,
          itemName: s.itemName,
          itemType: s.itemType,
          totalQuantity: parseInt(s.totalQuantity || 0),
          totalRevenue: parseFloat(parseFloat(s.totalRevenue || 0).toFixed(2)),
          transactionCount: parseInt(s.transactionCount || 0),
          avgUnitPrice: parseFloat(parseFloat(s.avgUnitPrice || 0).toFixed(2)),
          revenuePercentage: grandTotalRevenue > 0
            ? parseFloat(((parseFloat(s.totalRevenue || 0) / grandTotalRevenue) * 100).toFixed(2))
            : 0
        }))
      }
    });

    logger.logInfo('Top selling services report generated', {
      action: 'TOP_SELLING_SERVICES',
      userId: req.user.id,
      tenantId,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: resultLimit,
      sortBy,
      serviceType,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error generating top selling services report', {
      action: 'TOP_SELLING_SERVICES_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Get products with zero sales in the given period (dead stock).
 * Queries all active products belonging to the tenant that do NOT appear
 * in any completed TransactionItem within the date range.
 *
 * @route GET /api/v1/finance/analytics/not-selling-products
 * @query startDate - Period start (default: last 30 days)
 * @query endDate   - Period end   (default: now)
 * @query locationId - Optional location filter
 * @query limit - Number of results (default 5, max 200)
 * @query transactionType - Filter by transaction type (pos, restaurant, etc.)
 */
async function getNotSellingProducts(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      startDate,
      endDate,
      locationId,
      limit = 5,
      transactionType
    } = req.query;

    const resultLimit = Math.min(parseInt(limit) || 5, 200);

    // Default: last 30 days
    const tz = getTenantTimezone(req);
    const end = endDate ? buildUtcEndOfDay(endDate, tz) : new Date();
    const start = startDate ? buildUtcStartOfDay(startDate, tz) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const notSellingProducts = await sequelize.query(`
      SELECT 
        p.id AS "itemId",
        p.name AS "itemName",
        p.sku,
        p.price,
        p.category,
        p."isActive"
      FROM "Products" p
      WHERE p."isActive" = true
        ${!isSuperAdmin ? 'AND p."tenantId" = :tenantId' : ''}
        AND p."deletedAt" IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "TransactionItems" ti
          INNER JOIN "Transactions" t ON t.id = ti."transactionId"
          WHERE ti."itemType" = 'product'
            AND ti."itemId" = p.id
            AND ti."isRefunded" = false
            AND ti."deletedAt" IS NULL
            AND t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
            AND t."createdAt" >= :startDate
            AND t."createdAt" <= :endDate
            ${locationId ? 'AND t."locationId" = :locationId' : ''}
            ${transactionType ? 'AND t."transactionType" = :transactionType' : ''}
        )
      ORDER BY p.name ASC
      LIMIT :limit
    `, {
      replacements: {
        tenantId: isSuperAdmin ? null : tenantId,
        startDate: start,
        endDate: end,
        locationId: locationId || null,
        transactionType: transactionType || null,
        limit: resultLimit
      },
      type: sequelize.QueryTypes.SELECT
    });

    // Total active product count for context
    const totalActiveResult = await sequelize.query(`
      SELECT COUNT(id) AS cnt
      FROM "Products"
      WHERE "isActive" = true
        ${!isSuperAdmin ? 'AND "tenantId" = :tenantId' : ''}
        AND "deletedAt" IS NULL
    `, {
      replacements: { tenantId: isSuperAdmin ? null : tenantId },
      type: sequelize.QueryTypes.SELECT
    });

    const totalActive = parseInt(totalActiveResult[0]?.cnt || 0);

    res.json({
      success: true,
      data: {
        period: {
          startDate: start.toISOString(),
          endDate: end.toISOString()
        },
        totalActiveProducts: totalActive,
        notSellingCount: notSellingProducts.length,
        notSellingPercentage: totalActive > 0
          ? parseFloat(((notSellingProducts.length / totalActive) * 100).toFixed(2))
          : 0,
        products: notSellingProducts.map(p => ({
          itemId: p.itemId,
          itemName: p.itemName,
          sku: p.sku,
          price: parseFloat(p.price || 0),
          category: p.category
        }))
      }
    });

    logger.logInfo('Not selling products report generated', {
      action: 'NOT_SELLING_PRODUCTS',
      userId: req.user.id,
      tenantId,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error generating not selling products report', {
      action: 'NOT_SELLING_PRODUCTS_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Get service plans with zero sales in the given period.
 * Queries all active ServicePlans that do NOT appear
 * in any completed TransactionItem within the date range.
 *
 * @route GET /api/v1/finance/analytics/not-selling-services
 * @query startDate - Period start (default: last 30 days)
 * @query endDate   - Period end   (default: now)
 * @query locationId - Optional location filter
 * @query limit - Number of results (default 5, max 200)
 * @query serviceType - 'service_plan', 'membership', or 'all' (default: 'all')
 */
async function getNotSellingServices(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      startDate,
      endDate,
      locationId,
      limit = 5,
      serviceType = 'all'
    } = req.query;

    const resultLimit = Math.min(parseInt(limit) || 5, 200);

    // Default: last 30 days
    const tz = getTenantTimezone(req);
    const end = endDate ? buildUtcEndOfDay(endDate, tz) : new Date();
    const start = startDate ? buildUtcStartOfDay(startDate, tz) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Determine item type filter for the NOT EXISTS subquery
    let itemTypeFilter;
    if (serviceType === 'service_plan') {
      itemTypeFilter = "ti.\"itemType\" = 'service_plan'";
    } else if (serviceType === 'membership') {
      itemTypeFilter = "ti.\"itemType\" = 'membership'";
    } else {
      itemTypeFilter = "ti.\"itemType\" IN ('service_plan', 'membership')";
    }

    const notSellingServices = await sequelize.query(`
      SELECT
        sp.id AS "itemId",
        sp.name AS "itemName",
        sp."serviceType",
        sp.price,
        sp."isActive",
        sp."durationType",
        sp."duration"
      FROM "ServicePlans" sp
      WHERE sp."isActive" = true
        ${!isSuperAdmin ? 'AND sp."tenantId" = :tenantId' : ''}
        AND sp."deletedAt" IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "TransactionItems" ti
          INNER JOIN "Transactions" t ON t.id = ti."transactionId"
          WHERE ${itemTypeFilter}
            AND ti."itemId" = sp.id
            AND ti."isRefunded" = false
            AND ti."deletedAt" IS NULL
            AND t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
            AND t."createdAt" >= :startDate
            AND t."createdAt" <= :endDate
            ${locationId ? 'AND t."locationId" = :locationId' : ''}
        )
      ORDER BY sp.name ASC
      LIMIT :limit
    `, {
      replacements: {
        tenantId: isSuperAdmin ? null : tenantId,
        startDate: start,
        endDate: end,
        locationId: locationId || null,
        limit: resultLimit
      },
      type: sequelize.QueryTypes.SELECT
    });

    // Total active service plan count for context
    const totalActiveResult = await sequelize.query(`
      SELECT COUNT(id) AS cnt
      FROM "ServicePlans"
      WHERE "isActive" = true
        ${!isSuperAdmin ? 'AND "tenantId" = :tenantId' : ''}
        AND "deletedAt" IS NULL
    `, {
      replacements: { tenantId: isSuperAdmin ? null : tenantId },
      type: sequelize.QueryTypes.SELECT
    });

    const totalActive = parseInt(totalActiveResult[0]?.cnt || 0);

    res.json({
      success: true,
      data: {
        period: {
          startDate: start.toISOString(),
          endDate: end.toISOString()
        },
        serviceType,
        totalActiveServices: totalActive,
        notSellingCount: notSellingServices.length,
        notSellingPercentage: totalActive > 0
          ? parseFloat(((notSellingServices.length / totalActive) * 100).toFixed(2))
          : 0,
        services: notSellingServices.map(s => ({
          itemId: s.itemId,
          itemName: s.itemName,
          serviceType: s.serviceType,
          price: parseFloat(s.price || 0),
          durationType: s.durationType,
          duration: s.duration
        }))
      }
    });

    logger.logInfo('Not selling services report generated', {
      action: 'NOT_SELLING_SERVICES',
      userId: req.user.id,
      tenantId,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error generating not selling services report', {
      action: 'NOT_SELLING_SERVICES_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

module.exports = {
  getTopSellingProducts,
  getTopSellingServices,
  getNotSellingProducts,
  getNotSellingServices
};
