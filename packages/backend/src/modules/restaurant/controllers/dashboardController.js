'use strict';

/**
 * Restaurant Dashboard Controller
 * 
 * Provides comprehensive dashboard statistics for restaurant operations
 * 
 * @module modules/restaurant/controllers/dashboardController
 */

const { 
  Transaction, 
  TransactionItem, 
  RestaurantTable, 
  Location,
  sequelize 
} = require('../../../models');
const Product = require('../models/product')(sequelize, require('sequelize').DataTypes);
const { Op } = require('sequelize');
const { createError } = require('../../../utils/errorCodes');
const { REVENUE_RECOGNIZED_TRANSACTION_STATUSES } = require('../../../utils/reportingStatus');

/**
 * Get dashboard overview
 * Includes: today's sales, active orders, table stats, low stock items
 */
const getDashboardOverview = async (req, res, next) => {
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

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get yesterday's date range for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 1. TODAY'S SALES
    const todayWhere = {
      ...where,
      transactionType: 'restaurant',
      status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
      createdAt: {
        [Op.gte]: today,
        [Op.lt]: tomorrow
      }
    };

    const todayTransactions = await Transaction.findAll({
      where: todayWhere,
      attributes: ['id', 'totalAmount', 'status']
    });

    const todaySales = todayTransactions.reduce((sum, t) => sum + parseFloat(t.totalAmount || 0), 0);
    const todayCount = todayTransactions.length;

    // Get yesterday's sales for comparison
    const yesterdayWhere = {
      ...where,
      transactionType: 'restaurant',
      status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
      createdAt: {
        [Op.gte]: yesterday,
        [Op.lt]: today
      }
    };

    const yesterdayTransactions = await Transaction.findAll({
      where: yesterdayWhere,
      attributes: ['totalAmount']
    });

    const yesterdaySales = yesterdayTransactions.reduce((sum, t) => sum + parseFloat(t.totalAmount || 0), 0);
    const percentageChange = yesterdaySales > 0 
      ? ((todaySales - yesterdaySales) / yesterdaySales * 100).toFixed(1)
      : 0;

    // 2. ACTIVE ORDERS
    const activeOrdersWhere = {
      ...where,
      transactionType: 'restaurant',
      status: ['pending', 'confirmed', 'preparing', 'ready']
    };

    const activeOrders = await Transaction.findAll({
      where: activeOrdersWhere,
      attributes: ['id', 'status']
    });

    // Orders in 'preparing' are cooking, 'ready' are ready to serve
    const cookingCount = activeOrders.filter(order => ['confirmed', 'preparing'].includes(order.status)).length;
    const readyCount = activeOrders.filter(order => order.status === 'ready').length;

    // 3. TABLES
    const tablesWhere = { ...where };
    const tables = await RestaurantTable.findAll({
      where: tablesWhere,
      attributes: ['id', 'status']
    });

    const availableTables = tables.filter(t => t.status === 'available').length;
    const occupiedTables = tables.filter(t => t.status === 'occupied').length;
    const totalTables = tables.length;

    // 4. LOW STOCK ITEMS
    const productsWhere = {
      ...where,
      isActive: true,
      trackInventory: true
    };

    const products = await Product.findAll({
      where: productsWhere,
      attributes: ['id', 'name', 'stockQuantity', 'minStockLevel']
    });

    const lowStockItems = products.filter(p => 
      p.minStockLevel && p.stockQuantity <= p.minStockLevel
    );

    res.json({
      success: true,
      data: {
        todaySales: {
          amount: todaySales,
          transactions: todayCount,
          percentageChange: parseFloat(percentageChange)
        },
        activeOrders: {
          total: activeOrders.length,
          cooking: cookingCount,
          ready: readyCount
        },
        tables: {
          available: availableTables,
          occupied: occupiedTables,
          total: totalTables,
          occupancyRate: totalTables > 0 ? ((occupiedTables / totalTables) * 100).toFixed(1) : 0
        },
        lowStockItems: {
          count: lowStockItems.length,
          items: lowStockItems.slice(0, 5).map(item => ({
            id: item.id,
            name: item.name,
            currentStock: item.stockQuantity,
            minStockLevel: item.minStockLevel
          }))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get sales trend (last 7 days)
 */
const getSalesTrend = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { locationId, days = 7 } = req.query;

    const where = {
      transactionType: 'restaurant',
      status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
    };
    
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }
    if (locationId) {
      where.locationId = locationId;
    }

    // Get date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);

    where.createdAt = {
      [Op.between]: [startDate, endDate]
    };

    // Get transactions grouped by date
    const transactions = await Transaction.findAll({
      where,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalSales'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'transactionCount']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    // Calculate average
    const totalSales = transactions.reduce((sum, day) => sum + parseFloat(day.totalSales || 0), 0);
    const averageSales = transactions.length > 0 ? (totalSales / transactions.length) : 0;

    res.json({
      success: true,
      data: {
        trend: transactions.map(t => ({
          date: t.date,
          sales: parseFloat(t.totalSales || 0),
          transactionCount: parseInt(t.transactionCount || 0)
        })),
        average: averageSales,
        total: totalSales,
        days: parseInt(days)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get top products today
 */
const getTopProductsToday = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { locationId, limit = 5 } = req.query;

    const where = {
      transactionType: 'restaurant',
      status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
    };
    
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }
    if (locationId) {
      where.locationId = locationId;
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    where.createdAt = {
      [Op.gte]: today,
      [Op.lt]: tomorrow
    };

    // Get top products
    const topProducts = await TransactionItem.findAll({
      attributes: [
        'itemName',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.col('total')), 'totalRevenue']
      ],
      include: [
        {
          model: Transaction,
          as: 'transaction',
          attributes: [],
          where,
          required: true
        }
      ],
      where: {
        itemType: 'product'
      },
      group: ['TransactionItem.itemName'],
      order: [[sequelize.fn('SUM', sequelize.col('quantity')), 'DESC']],
      limit: parseInt(limit),
      raw: true
    });

    res.json({
      success: true,
      data: topProducts.map(p => ({
        productName: p.itemName,
        categoryName: 'Main Dish', // Default or parse from itemDetails if needed
        quantity: parseInt(p.totalQuantity || 0),
        revenue: parseFloat(p.totalRevenue || 0)
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent orders
 */
const getRecentOrders = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { locationId, limit = 10 } = req.query;

    const where = {
      transactionType: 'restaurant'
    };
    
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }
    if (locationId) {
      where.locationId = locationId;
    }

    const orders = await Transaction.findAll({
      where,
      attributes: ['id', 'transactionNumber', 'totalAmount', 'status', 'createdAt'],
      include: [
        {
          model: RestaurantTable,
          as: 'table',
          attributes: ['id', 'tableNumber', 'tableName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: orders.map(order => ({
        id: order.id,
        orderNumber: order.transactionNumber,
        table: order.table 
          ? `Table ${order.table.tableNumber}` 
          : 'Takeaway',
        tableId: order.table?.id,
        amount: parseFloat(order.totalAmount || 0),
        status: order.status,
        createdAt: order.createdAt,
        timeAgo: getTimeAgo(order.createdAt)
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to calculate time ago
 */
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  if (seconds < 60) return `${seconds} secs ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

/**
 * Get comprehensive restaurant overview
 * All-in-one endpoint for restaurant dashboard
 * @route GET /restaurant/dashboard/overview
 */
const getRestaurantOverview = async (req, res, next) => {
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

    // Date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

    // === TODAY'S REVENUE ===
    const todayTransactions = await Transaction.findAll({
      where: {
        ...where,
        transactionType: 'restaurant',
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: { [Op.gte]: today, [Op.lt]: tomorrow }
      },
      attributes: ['totalAmount', 'subtotal', 'tax', 'voucherDiscount']
    });

    const todayRevenue = todayTransactions.reduce((sum, t) => sum + parseFloat(t.totalAmount || 0), 0);
    const todaySubtotal = todayTransactions.reduce((sum, t) => sum + parseFloat(t.subtotal || 0), 0);
    const todayTax = todayTransactions.reduce((sum, t) => sum + parseFloat(t.tax || 0), 0);
    const todayDiscount = todayTransactions.reduce((sum, t) => sum + parseFloat(t.voucherDiscount || 0), 0);

    // Yesterday comparison
    const yesterdayTransactions = await Transaction.findAll({
      where: {
        ...where,
        transactionType: 'restaurant',
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: { [Op.gte]: yesterday, [Op.lt]: today }
      },
      attributes: ['totalAmount']
    });

    const yesterdayRevenue = yesterdayTransactions.reduce((sum, t) => sum + parseFloat(t.totalAmount || 0), 0);
    const revenueChange = yesterdayRevenue > 0 
      ? (((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100).toFixed(1)
      : 0;

    // === THIS MONTH'S REVENUE ===
    const thisMonthTransactions = await Transaction.findAll({
      where: {
        ...where,
        transactionType: 'restaurant',
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: { [Op.gte]: thisMonthStart }
      },
      attributes: ['totalAmount']
    });

    const thisMonthRevenue = thisMonthTransactions.reduce((sum, t) => sum + parseFloat(t.totalAmount || 0), 0);

    // Last month comparison
    const lastMonthTransactions = await Transaction.findAll({
      where: {
        ...where,
        transactionType: 'restaurant',
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: { [Op.gte]: lastMonthStart, [Op.lte]: lastMonthEnd }
      },
      attributes: ['totalAmount']
    });

    const lastMonthRevenue = lastMonthTransactions.reduce((sum, t) => sum + parseFloat(t.totalAmount || 0), 0);
    const monthlyRevenueChange = lastMonthRevenue > 0 
      ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
      : 0;

    // === ACTIVE ORDERS ===
    const activeOrders = await Transaction.findAll({
      where: {
        ...where,
        transactionType: 'restaurant',
        status: ['pending', 'confirmed', 'preparing', 'ready']
      },
      attributes: ['id', 'status', 'orderType', 'totalAmount', 'createdAt'],
      order: [['createdAt', 'ASC']],
      limit: 20
    });

    const ordersByStatus = {
      pending: activeOrders.filter(o => o.status === 'pending').length,
      confirmed: activeOrders.filter(o => o.status === 'confirmed').length,
      preparing: activeOrders.filter(o => o.status === 'preparing').length,
      ready: activeOrders.filter(o => o.status === 'ready').length
    };

    // === TABLES STATUS ===
    const tables = await RestaurantTable.findAll({
      where,
      attributes: ['id', 'status', 'tableNumber', 'capacity']
    });

    const tablesByStatus = {
      available: tables.filter(t => t.status === 'available').length,
      occupied: tables.filter(t => t.status === 'occupied').length,
      reserved: tables.filter(t => t.status === 'reserved').length,
      cleaning: tables.filter(t => t.status === 'cleaning').length,
      total: tables.length
    };

    const occupancyRate = tablesByStatus.total > 0 
      ? ((tablesByStatus.occupied / tablesByStatus.total) * 100).toFixed(1)
      : 0;

    // === TOP SELLING PRODUCTS TODAY ===
    const topProducts = await TransactionItem.findAll({
      attributes: [
        'itemName',
        [sequelize.fn('COUNT', sequelize.col('TransactionItem.id')), 'orderCount'],
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.col('total')), 'revenue']
      ],
      include: [{
        model: Transaction,
        as: 'transaction',
        where: {
          ...where,
          transactionType: 'restaurant',
          status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
          createdAt: { [Op.gte]: today, [Op.lt]: tomorrow }
        },
        attributes: []
      }],
      group: ['itemName'],
      order: [[sequelize.literal('revenue'), 'DESC']],
      limit: 5,
      raw: true
    });

    // === ORDER TYPE BREAKDOWN TODAY ===
    const orderTypeBreakdown = await Transaction.findAll({
      where: {
        ...where,
        transactionType: 'restaurant',
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: { [Op.gte]: today, [Op.lt]: tomorrow }
      },
      attributes: [
        'orderType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue']
      ],
      group: ['orderType'],
      raw: true
    });

    // === LOW STOCK ALERTS ===
    const lowStockProducts = await Product.findAll({
      where: {
        ...where,
        isActive: true,
        trackInventory: true,
        [Op.and]: [
          sequelize.literal('"stockQuantity" <= "minStockLevel"')
        ]
      },
      attributes: ['id', 'name', 'sku', 'stockQuantity', 'minStockLevel'],
      order: [
        [sequelize.literal('"stockQuantity"::float / "minStockLevel"::float'), 'ASC']
      ],
      limit: 10
    });

    // === RECENT COMPLETED ORDERS ===
    const recentCompletedOrders = await Transaction.findAll({
      where: {
        ...where,
        transactionType: 'restaurant',
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: { [Op.gte]: today }
      },
      attributes: ['id', 'transactionNumber', 'orderType', 'totalAmount', 'completedAt'],
      order: [['completedAt', 'DESC']],
      limit: 5
    });

    // === PERFORMANCE SUMMARY ===
    const avgOrderValue = todayTransactions.length > 0 
      ? (todayRevenue / todayTransactions.length).toFixed(2)
      : 0;

    const avgOrdersPerHour = todayTransactions.length > 0
      ? (todayTransactions.length / (new Date().getHours() || 1)).toFixed(1)
      : 0;

    // Response
    res.json({
      success: true,
      data: {
        revenue: {
          today: {
            total: parseFloat(todayRevenue.toFixed(2)),
            subtotal: parseFloat(todaySubtotal.toFixed(2)),
            tax: parseFloat(todayTax.toFixed(2)),
            discount: parseFloat(todayDiscount.toFixed(2)),
            transactions: todayTransactions.length,
            change: parseFloat(revenueChange),
            avgOrderValue: parseFloat(avgOrderValue)
          },
          thisMonth: {
            total: parseFloat(thisMonthRevenue.toFixed(2)),
            transactions: thisMonthTransactions.length,
            change: parseFloat(monthlyRevenueChange)
          }
        },
        orders: {
          active: {
            total: activeOrders.length,
            byStatus: ordersByStatus
          },
          today: {
            total: todayTransactions.length,
            avgPerHour: parseFloat(avgOrdersPerHour),
            byType: orderTypeBreakdown.map(o => ({
              type: o.orderType,
              count: parseInt(o.count || 0),
              revenue: parseFloat(o.revenue || 0)
            }))
          },
          recent: recentCompletedOrders.map(o => ({
            id: o.id,
            transactionNumber: o.transactionNumber,
            orderType: o.orderType,
            totalAmount: parseFloat(o.totalAmount),
            completedAt: o.completedAt
          }))
        },
        tables: {
          status: tablesByStatus,
          occupancyRate: parseFloat(occupancyRate)
        },
        topProducts: topProducts.map(p => ({
          name: p.itemName,
          orderCount: parseInt(p.orderCount || 0),
          totalQuantity: parseInt(p.totalQuantity || 0),
          revenue: parseFloat(p.revenue || 0)
        })),
        alerts: {
          lowStock: {
            count: lowStockProducts.length,
            items: lowStockProducts.map(p => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              stockQuantity: p.stockQuantity,
              minStockLevel: p.minStockLevel,
              stockPercentage: p.minStockLevel > 0 
                ? ((p.stockQuantity / p.minStockLevel) * 100).toFixed(1)
                : 0
            }))
          },
          activeOrders: activeOrders.length,
          readyOrders: ordersByStatus.ready
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardOverview,
  getSalesTrend,
  getTopProductsToday,
  getRecentOrders,
  getRestaurantOverview
};
