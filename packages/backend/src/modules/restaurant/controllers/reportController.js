'use strict';

/**
 * Report Controller - Restaurant Module
 * 
 * Handles restaurant reporting endpoints including sales reports,
 * product performance, table analytics, and daily summaries.
 * 
 * @module modules/restaurant/controllers/reportController
 */

const { 
  Transaction, 
  TransactionItem, 
  TransactionPayment,
  Product, 
  RestaurantTable, 
  Location,
  User,
  Tenant
} = require('../../../models');
const { Op, fn, col, literal } = require('sequelize');
const { createError } = require('../../../utils/errorCodes');
const {
  REVENUE_RECOGNIZED_TRANSACTION_STATUSES,
  COMPLETED_PAYMENT_STATUS,
} = require('../../../utils/reportingStatus');

/**
 * Get sales report with flexible grouping
 * @route GET /api/v1/restaurant/reports/sales
 * @query startDate - Start date (YYYY-MM-DD)
 * @query endDate - End date (YYYY-MM-DD)
 * @query locationId - Filter by location (optional)
 * @query groupBy - Group by: day, week, month, hour (default: day)
 */
const getSalesReport = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { 
      startDate, 
      endDate, 
      locationId, 
      groupBy = 'day',
      orderType // dine-in, takeaway, delivery
    } = req.query;

    if (!startDate || !endDate) {
      throw createError('VALIDATION_ERROR', 'startDate and endDate are required');
    }

    const where = {
      transactionType: 'restaurant',
      status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
      completedAt: {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(`${endDate}T23:59:59.999Z`)
      }
    };

    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    if (orderType) {
      where.orderType = orderType;
    }

    // Determine date grouping format based on groupBy parameter
    let dateFormat;
    let groupByClause;
    
    switch (groupBy) {
      case 'hour':
        dateFormat = 'YYYY-MM-DD HH24:00';
        groupByClause = literal("TO_CHAR(\"completedAt\", 'YYYY-MM-DD HH24:00')");
        break;
      case 'week':
        dateFormat = 'IYYY-IW'; // ISO week
        groupByClause = literal("TO_CHAR(\"completedAt\", 'IYYY-IW')");
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        groupByClause = literal("TO_CHAR(\"completedAt\", 'YYYY-MM')");
        break;
      case 'day':
      default:
        dateFormat = 'YYYY-MM-DD';
        groupByClause = literal("TO_CHAR(\"completedAt\", 'YYYY-MM-DD')");
        break;
    }

    // Get aggregated sales data
    const salesData = await Transaction.findAll({
      where,
      attributes: [
        [groupByClause, 'period'],
        [fn('COUNT', col('id')), 'orderCount'],
        [fn('SUM', col('subtotal')), 'subtotal'],
        [fn('SUM', col('tax')), 'taxTotal'],
        [fn('SUM', col('voucherDiscount')), 'discountTotal'],
        [fn('SUM', col('totalAmount')), 'totalRevenue'],
        [fn('AVG', col('totalAmount')), 'averageOrderValue']
      ],
      group: [groupByClause],
      order: [[groupByClause, 'ASC']],
      raw: true
    });

    // Get payment method breakdown
    const paymentBreakdown = await TransactionPayment.findAll({
      where: {
        status: COMPLETED_PAYMENT_STATUS
      },
      include: [{
        model: Transaction,
        as: 'transaction',
        where,
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

    // Get order type breakdown
    const orderTypeBreakdown = await Transaction.findAll({
      where,
      attributes: [
        'orderType',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('totalAmount')), 'total']
      ],
      group: ['orderType'],
      raw: true
    });

    // Calculate summary totals
    const summary = {
      totalOrders: salesData.reduce((sum, d) => sum + parseInt(d.orderCount || 0), 0),
      totalRevenue: salesData.reduce((sum, d) => sum + parseFloat(d.totalRevenue || 0), 0),
      totalTax: salesData.reduce((sum, d) => sum + parseFloat(d.taxTotal || 0), 0),
      totalDiscount: salesData.reduce((sum, d) => sum + parseFloat(d.discountTotal || 0), 0),
      averageOrderValue: 0
    };
    
    if (summary.totalOrders > 0) {
      summary.averageOrderValue = summary.totalRevenue / summary.totalOrders;
    }

    res.json({
      success: true,
      data: {
        summary,
        salesByPeriod: salesData.map(d => ({
          period: d.period,
          orderCount: parseInt(d.orderCount || 0),
          subtotal: parseFloat(d.subtotal || 0),
          taxTotal: parseFloat(d.taxTotal || 0),
          discountTotal: parseFloat(d.discountTotal || 0),
          totalRevenue: parseFloat(d.totalRevenue || 0),
          averageOrderValue: parseFloat(d.averageOrderValue || 0)
        })),
        paymentBreakdown: paymentBreakdown.map(p => ({
          method: p.paymentMethod,
          count: parseInt(p.count || 0),
          total: parseFloat(p.total || 0)
        })),
        orderTypeBreakdown: orderTypeBreakdown.map(o => ({
          type: o.orderType,
          count: parseInt(o.count || 0),
          total: parseFloat(o.total || 0)
        }))
      },
      filters: {
        startDate,
        endDate,
        locationId: locationId || null,
        groupBy,
        orderType: orderType || null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product performance report
 * @route GET /api/v1/restaurant/reports/products
 * @query startDate - Start date (YYYY-MM-DD)
 * @query endDate - End date (YYYY-MM-DD)
 * @query categoryId - Filter by category (optional)
 * @query limit - Number of top products to return (default: 10)
 */
const getProductReport = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { 
      startDate, 
      endDate, 
      categoryId,
      limit = 10,
      sortBy = 'quantity' // quantity, revenue
    } = req.query;

    if (!startDate || !endDate) {
      throw createError('VALIDATION_ERROR', 'startDate and endDate are required');
    }

    const transactionWhere = {
      transactionType: 'restaurant',
      status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
      completedAt: {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(`${endDate}T23:59:59.999Z`)
      }
    };

    if (!isSuperAdmin) {
      transactionWhere.tenantId = tenantId;
    }

    // Build product where clause
    const productWhere = {};
    if (categoryId) {
      productWhere.categoryId = categoryId;
    }
    if (!isSuperAdmin) {
      productWhere.tenantId = tenantId;
    }

    // Get top selling products
    const topProducts = await TransactionItem.findAll({
      attributes: [
        'itemId',
        'itemName',
        [fn('SUM', col('quantity')), 'totalQuantity'],
        [fn('SUM', col('TransactionItem.total')), 'totalRevenue'],
        [fn('COUNT', col('TransactionItem.id')), 'orderCount'],
        [fn('AVG', col('unitPrice')), 'averagePrice']
      ],
      include: [
        {
          model: Transaction,
          as: 'transaction',
          where: transactionWhere,
          attributes: []
        },
        {
          model: Product,
          as: 'product',
          where: Object.keys(productWhere).length > 0 ? productWhere : undefined,
          attributes: ['id', 'name', 'sku', 'categoryId', 'price'],
          required: Object.keys(productWhere).length > 0
        }
      ],
      where: {
        itemType: 'product'
      },
      group: ['itemId', 'itemName', 'product.id', 'product.name', 'product.sku', 'product.categoryId', 'product.price'],
      order: [[fn('SUM', col(sortBy === 'revenue' ? 'TransactionItem.total' : 'quantity')), 'DESC']],
      limit: parseInt(limit),
      raw: false
    });

    // Get category breakdown
    const categoryBreakdown = await TransactionItem.findAll({
      attributes: [
        [col('product.categoryId'), 'categoryId'],
        [fn('SUM', col('quantity')), 'totalQuantity'],
        [fn('SUM', col('TransactionItem.total')), 'totalRevenue'],
        [fn('COUNT', col('TransactionItem.id')), 'orderCount']
      ],
      include: [
        {
          model: Transaction,
          as: 'transaction',
          where: transactionWhere,
          attributes: []
        },
        {
          model: Product,
          as: 'product',
          attributes: [],
          required: true
        }
      ],
      where: {
        itemType: 'product'
      },
      group: [col('product.categoryId')],
      order: [[fn('SUM', col('TransactionItem.total')), 'DESC']],
      raw: true
    });

    // Calculate summary
    const summary = {
      totalProductsSold: topProducts.reduce((sum, p) => sum + parseInt(p.getDataValue('totalQuantity') || 0), 0),
      totalRevenue: topProducts.reduce((sum, p) => sum + parseFloat(p.getDataValue('totalRevenue') || 0), 0),
      uniqueProducts: topProducts.length
    };

    res.json({
      success: true,
      data: {
        summary,
        topProducts: topProducts.map(p => ({
          productId: p.itemId,
          productName: p.itemName,
          sku: p.product?.sku || null,
          categoryId: p.product?.categoryId || null,
          currentPrice: parseFloat(p.product?.price || 0),
          totalQuantity: parseInt(p.getDataValue('totalQuantity') || 0),
          totalRevenue: parseFloat(p.getDataValue('totalRevenue') || 0),
          orderCount: parseInt(p.getDataValue('orderCount') || 0),
          averagePrice: parseFloat(p.getDataValue('averagePrice') || 0)
        })),
        categoryBreakdown: categoryBreakdown.map(c => ({
          categoryId: c.categoryId,
          totalQuantity: parseInt(c.totalQuantity || 0),
          totalRevenue: parseFloat(c.totalRevenue || 0),
          orderCount: parseInt(c.orderCount || 0)
        }))
      },
      filters: {
        startDate,
        endDate,
        categoryId: categoryId || null,
        limit: parseInt(limit),
        sortBy
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get table performance report
 * @route GET /api/v1/restaurant/reports/tables
 * @query startDate - Start date (YYYY-MM-DD)
 * @query endDate - End date (YYYY-MM-DD)
 * @query locationId - Filter by location (optional)
 */
const getTableReport = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { 
      startDate, 
      endDate, 
      locationId
    } = req.query;

    if (!startDate || !endDate) {
      throw createError('VALIDATION_ERROR', 'startDate and endDate are required');
    }

    const transactionWhere = {
      transactionType: 'restaurant',
      status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
      orderType: 'dine-in',
      tableId: { [Op.ne]: null },
      completedAt: {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(`${endDate}T23:59:59.999Z`)
      }
    };

    if (!isSuperAdmin) {
      transactionWhere.tenantId = tenantId;
    }

    if (locationId) {
      transactionWhere.locationId = locationId;
    }

    // Get table performance data
    const tablePerformance = await Transaction.findAll({
      attributes: [
        'tableId',
        [fn('COUNT', col('Transaction.id')), 'orderCount'],
        [fn('SUM', col('totalAmount')), 'totalRevenue'],
        [fn('AVG', col('totalAmount')), 'averageOrderValue'],
        [fn('AVG', literal('EXTRACT(EPOCH FROM ("Transaction"."completedAt" - "Transaction"."createdAt"))')), 'avgDurationSeconds']
      ],
      where: transactionWhere,
      include: [{
        model: RestaurantTable,
        as: 'table',
        attributes: ['id', 'tableNumber', 'tableName', 'capacity', 'locationId']
      }],
      group: ['tableId', 'table.id', 'table.tableNumber', 'table.tableName', 'table.capacity', 'table.locationId'],
      order: [[fn('SUM', col('totalAmount')), 'DESC']],
      raw: false
    });

    // Get all tables for utilization calculation
    const tableWhere = {};
    if (!isSuperAdmin) {
      tableWhere.tenantId = tenantId;
    }
    if (locationId) {
      tableWhere.locationId = locationId;
    }

    const allTables = await RestaurantTable.findAll({
      where: tableWhere,
      attributes: ['id', 'tableNumber', 'tableName', 'capacity', 'locationId']
    });

    // Create a map of table performance
    const performanceMap = new Map(
      tablePerformance.map(t => [t.tableId, t])
    );

    // Calculate summary
    const summary = {
      totalTables: allTables.length,
      tablesUsed: tablePerformance.length,
      totalOrders: tablePerformance.reduce((sum, t) => sum + parseInt(t.getDataValue('orderCount') || 0), 0),
      totalRevenue: tablePerformance.reduce((sum, t) => sum + parseFloat(t.getDataValue('totalRevenue') || 0), 0),
      averageOrderValue: 0,
      averageTurnoverTime: 0
    };

    if (summary.totalOrders > 0) {
      summary.averageOrderValue = summary.totalRevenue / summary.totalOrders;
      const totalDuration = tablePerformance.reduce((sum, t) => sum + parseFloat(t.getDataValue('avgDurationSeconds') || 0), 0);
      summary.averageTurnoverTime = totalDuration / tablePerformance.length; // in seconds
    }

    res.json({
      success: true,
      data: {
        summary,
        tablePerformance: allTables.map(table => {
          const perf = performanceMap.get(table.id);
          return {
            tableId: table.id,
            tableNumber: table.tableNumber,
            tableName: table.tableName,
            capacity: table.capacity,
            locationId: table.locationId,
            orderCount: perf ? parseInt(perf.getDataValue('orderCount') || 0) : 0,
            totalRevenue: perf ? parseFloat(perf.getDataValue('totalRevenue') || 0) : 0,
            averageOrderValue: perf ? parseFloat(perf.getDataValue('averageOrderValue') || 0) : 0,
            avgDurationMinutes: perf ? Math.round(parseFloat(perf.getDataValue('avgDurationSeconds') || 0) / 60) : 0
          };
        }).sort((a, b) => b.totalRevenue - a.totalRevenue)
      },
      filters: {
        startDate,
        endDate,
        locationId: locationId || null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get daily summary report
 * @route GET /api/v1/restaurant/reports/daily-summary
 * @query date - Date for the summary (YYYY-MM-DD)
 * @query locationId - Filter by location (optional)
 */
const getDailySummary = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { 
      date, 
      locationId
    } = req.query;

    if (!date) {
      throw createError('VALIDATION_ERROR', 'date is required');
    }

    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const baseWhere = {
      transactionType: 'restaurant',
      createdAt: {
        [Op.gte]: startOfDay,
        [Op.lte]: endOfDay
      }
    };

    if (!isSuperAdmin) {
      baseWhere.tenantId = tenantId;
    }

    if (locationId) {
      baseWhere.locationId = locationId;
    }

    // Get all orders for the day
    const allOrders = await Transaction.findAll({
      where: baseWhere,
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('totalAmount')), 'total']
      ],
      group: ['status'],
      raw: true
    });

    // Get completed orders summary
    const completedWhere = { ...baseWhere, status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES } };
    
    const completedOrders = await Transaction.findAll({
      where: completedWhere,
      include: [
        { model: TransactionItem, as: 'items' },
        { model: TransactionPayment, as: 'payments', where: { status: COMPLETED_PAYMENT_STATUS }, required: false }
      ]
    });

    // Calculate hourly breakdown for completed orders
    const hourlyBreakdown = await Transaction.findAll({
      where: completedWhere,
      attributes: [
        [literal("EXTRACT(HOUR FROM \"completedAt\")"), 'hour'],
        [fn('COUNT', col('id')), 'orderCount'],
        [fn('SUM', col('totalAmount')), 'revenue']
      ],
      group: [literal("EXTRACT(HOUR FROM \"completedAt\")")],
      order: [[literal("EXTRACT(HOUR FROM \"completedAt\")"), 'ASC']],
      raw: true
    });

    // Calculate payment method totals
    const paymentTotals = {};
    completedOrders.forEach(order => {
      order.payments?.forEach(payment => {
        const method = payment.paymentMethod || 'unknown';
        if (!paymentTotals[method]) {
          paymentTotals[method] = { count: 0, total: 0 };
        }
        paymentTotals[method].count++;
        paymentTotals[method].total += parseFloat(payment.amount || 0);
      });
    });

    // Calculate order type breakdown
    const orderTypeTotals = {};
    completedOrders.forEach(order => {
      const type = order.orderType || 'unknown';
      if (!orderTypeTotals[type]) {
        orderTypeTotals[type] = { count: 0, total: 0 };
      }
      orderTypeTotals[type].count++;
      orderTypeTotals[type].total += parseFloat(order.totalAmount || 0);
    });

    // Calculate totals
    const totalRevenue = completedOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);
    const totalTax = completedOrders.reduce((sum, o) => sum + parseFloat(o.tax || 0), 0);
    const totalDiscount = completedOrders.reduce((sum, o) => sum + parseFloat(o.voucherDiscount || 0), 0);
    const totalItemsSold = completedOrders.reduce((sum, o) => 
      sum + o.items?.reduce((iSum, item) => iSum + (item.quantity || 0), 0) || 0
    , 0);

    // Get top 5 products for the day
    const topProducts = await TransactionItem.findAll({
      attributes: [
        'itemId',
        'itemName',
        [fn('SUM', col('quantity')), 'totalQuantity'],
        [fn('SUM', col('TransactionItem.total')), 'totalRevenue']
      ],
      include: [{
        model: Transaction,
        as: 'transaction',
        where: completedWhere,
        attributes: []
      }],
      where: { itemType: 'product' },
      group: ['itemId', 'itemName'],
      order: [[fn('SUM', col('quantity')), 'DESC']],
      limit: 5,
      raw: true
    });

    // Build status summary
    const statusSummary = {};
    allOrders.forEach(o => {
      statusSummary[o.status] = {
        count: parseInt(o.count || 0),
        total: parseFloat(o.total || 0)
      };
    });

    res.json({
      success: true,
      data: {
        date,
        summary: {
          totalOrders: completedOrders.length,
          totalRevenue,
          totalTax,
          totalDiscount,
          netRevenue: totalRevenue - totalTax,
          totalItemsSold,
          averageOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0
        },
        statusBreakdown: statusSummary,
        orderTypeBreakdown: Object.entries(orderTypeTotals).map(([type, data]) => ({
          type,
          count: data.count,
          total: data.total
        })),
        paymentBreakdown: Object.entries(paymentTotals).map(([method, data]) => ({
          method,
          count: data.count,
          total: data.total
        })),
        hourlyBreakdown: hourlyBreakdown.map(h => ({
          hour: parseInt(h.hour),
          orderCount: parseInt(h.orderCount || 0),
          revenue: parseFloat(h.revenue || 0)
        })),
        topProducts: topProducts.map(p => ({
          productId: p.itemId,
          productName: p.itemName,
          quantity: parseInt(p.totalQuantity || 0),
          revenue: parseFloat(p.totalRevenue || 0)
        }))
      },
      filters: {
        date,
        locationId: locationId || null
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSalesReport,
  getProductReport,
  getTableReport,
  getDailySummary
};
