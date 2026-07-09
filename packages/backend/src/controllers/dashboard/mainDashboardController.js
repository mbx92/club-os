'use strict';

/**
 * Main Dashboard Controller
 * 
 * Provides unified dashboard combining gym, restaurant, and financial data
 * 
 * @module controllers/dashboard/mainDashboardController
 */

const db = require('../../models');
const { 
  Transaction,
  ActiveService,
  Member,
  CheckIn,
  Expense,
  ExpenseCategory,
  sequelize 
} = db;
const { Op, fn, col, literal } = require('sequelize');
const logger = require('../../utils/logger');
const { getClientIp, getUserAgent } = require('../../utils/requestHelper');
const {
  REVENUE_RECOGNIZED_TRANSACTION_STATUSES,
  REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL,
  COMPLETED_PAYMENT_STATUS,
} = require('../../utils/reportingStatus');
const {
  getTenantTimezone,
  todayInTz,
  startOfDayInTz,
  endOfDayInTz,
  addDays,
  firstDayOfMonth,
  lastDayOfPrevMonth,
  firstDayOfPrevMonth,
} = require('../../utils/tenantTimezone');

// Import restaurant models (these are already loaded in main models/index.js)
const RestaurantTable = db.RestaurantTable;
const Product = db.Product;

/**
 * Get main dashboard overview (all modules)
 * Combines data from gym, restaurant, and financial modules
 * @route GET /api/v1/dashboard/main
 * @query locationId - Filter by location
 */
async function getMainDashboard(req, res, next) {
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

    // Date ranges — computed in tenant timezone read from DB
    const now = new Date();
    const tz = getTenantTimezone(req);
    const todayStr     = todayInTz(tz);
    const yesterdayStr = addDays(todayStr, -1);
    const tomorrowStr  = addDays(todayStr, 1);

    const today        = startOfDayInTz(todayStr, tz);
    const tomorrow     = startOfDayInTz(tomorrowStr, tz);
    const yesterday    = startOfDayInTz(yesterdayStr, tz);

    const thisMonthStart = startOfDayInTz(firstDayOfMonth(todayStr), tz);
    const lastMonthStart = startOfDayInTz(firstDayOfPrevMonth(todayStr), tz);
    const lastMonthEnd   = endOfDayInTz(lastDayOfPrevMonth(todayStr), tz);

    // ===============================
    // FINANCIAL OVERVIEW (ALL MODULES)
    // ===============================

    // Today's revenue by module
    const todayRevenueByModule = await Transaction.findAll({
      where: {
        ...where,
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      },
      attributes: [
        'transactionType',
        [fn('SUM', col('subtotal')), 'subtotal'],
        [fn('SUM', col('tax')), 'tax'],
        [fn('SUM', col('voucherDiscount')), 'discount'],
        [fn('SUM', col('totalAmount')), 'total'],
        [fn('COUNT', col('id')), 'transactions']
      ],
      group: ['transactionType'],
      raw: true
    });

    // Yesterday's total for comparison
    const yesterdayTotal = await Transaction.sum('totalAmount', {
      where: {
        ...where,
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: {
          [Op.gte]: yesterday,
          [Op.lt]: today
        }
      }
    });

    // This month's revenue
    const thisMonthTotal = await Transaction.sum('totalAmount', {
      where: {
        ...where,
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: {
          [Op.gte]: thisMonthStart
        }
      }
    });

    // Last month's revenue
    const lastMonthTotal = await Transaction.sum('totalAmount', {
      where: {
        ...where,
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: {
          [Op.gte]: lastMonthStart,
          [Op.lte]: lastMonthEnd
        }
      }
    });

    // Calculate totals
    const todayTotalRevenue = todayRevenueByModule.reduce((sum, m) => sum + parseFloat(m.total || 0), 0);
    const todayTotalTransactions = todayRevenueByModule.reduce((sum, m) => sum + parseInt(m.transactions || 0), 0);

    const revenueChange = yesterdayTotal > 0
      ? parseFloat((((todayTotalRevenue - yesterdayTotal) / yesterdayTotal) * 100).toFixed(1))
      : 0;

    const monthlyChange = lastMonthTotal > 0
      ? parseFloat((((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1))
      : 0;

    // ===============================
    // GYM MODULE DATA
    // ===============================

    const gymData = {
      members: {
        total: 0,
        active: 0,
        newToday: 0
      },
      attendance: {
        today: 0,
        unique: 0
      },
      services: {
        active: 0,
        expiringSoon: 0
      }
    };

    // Check if gym module is enabled
    const hasGymModule = todayRevenueByModule.some(m => m.transactionType === 'gym');
    
    if (hasGymModule) {
      // Total members
      gymData.members.total = await Member.count({ 
        where: isSuperAdmin ? {} : { tenantId } 
      });

      // Active members (with active membership and not yet expired)
      gymData.members.active = await ActiveService.count({
        where: {
          ...(isSuperAdmin ? {} : { tenantId }),
          status: 'active',
          serviceType: 'membership',
          endDate: { [Op.gte]: now }
        }
      });

      // New members today
      gymData.members.newToday = await Member.count({
        where: {
          ...(isSuperAdmin ? {} : { tenantId }),
          createdAt: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        }
      });

      // Today's check-ins
      gymData.attendance.today = await CheckIn.count({
        where: {
          ...where,
          checkInTime: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        }
      });

      // Unique members checked in
      gymData.attendance.unique = await CheckIn.count({
        where: {
          ...where,
          checkInTime: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        },
        distinct: true,
        col: 'memberId'
      });

      // Total active services
      gymData.services.active = await ActiveService.count({
        where: {
          ...(isSuperAdmin ? {} : { tenantId }),
          status: 'active'
        }
      });

      // Expiring services (next 7 days)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      gymData.services.expiringSoon = await ActiveService.count({
        where: {
          ...(isSuperAdmin ? {} : { tenantId }),
          status: 'active',
          endDate: {
            [Op.between]: [now, futureDate]
          }
        }
      });
    }

    // ===============================
    // RESTAURANT MODULE DATA
    // ===============================

    const restaurantData = {
      orders: {
        active: 0,
        todayCompleted: 0,
        avgPerHour: 0
      },
      tables: {
        total: 0,
        occupied: 0,
        available: 0,
        occupancyRate: 0
      },
      inventory: {
        lowStock: 0,
        outOfStock: 0
      }
    };

    // Check if restaurant module is enabled
    const hasRestaurantModule = todayRevenueByModule.some(m => m.transactionType === 'restaurant');

    if (hasRestaurantModule && RestaurantTable && Product) {
      // Active orders
      restaurantData.orders.active = await Transaction.count({
        where: {
          ...where,
          transactionType: 'restaurant',
          status: {
            [Op.in]: ['pending', 'confirmed', 'preparing', 'ready']
          }
        }
      });

      // Today's completed orders
      restaurantData.orders.todayCompleted = await Transaction.count({
        where: {
          ...where,
          transactionType: 'restaurant',
          status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
          createdAt: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        }
      });

      // Calculate average orders per hour
      const currentHour = now.getHours();
      restaurantData.orders.avgPerHour = currentHour > 0 
        ? parseFloat((restaurantData.orders.todayCompleted / currentHour).toFixed(1))
        : restaurantData.orders.todayCompleted;

      // Table status - Only query if RestaurantTable model exists
      try {
        const tableStatus = await RestaurantTable.findAll({
          where: isSuperAdmin ? {} : { tenantId },
          attributes: [
            'status',
            [fn('COUNT', col('id')), 'count']
          ],
          group: ['status'],
          raw: true
        });

        tableStatus.forEach(ts => {
          const count = parseInt(ts.count || 0);
          restaurantData.tables.total += count;
          if (ts.status === 'occupied') {
            restaurantData.tables.occupied = count;
          } else if (ts.status === 'available') {
            restaurantData.tables.available = count;
          }
        });

        restaurantData.tables.occupancyRate = restaurantData.tables.total > 0
          ? parseFloat(((restaurantData.tables.occupied / restaurantData.tables.total) * 100).toFixed(1))
          : 0;
      } catch (tableError) {
        logger.logWarning('Error fetching table status', {
          action: 'MAIN_DASHBOARD_TABLE_STATUS_ERROR',
          error: tableError.message
        });
      }

      // Low stock items - Only query if Product model exists
      try {
        restaurantData.inventory.lowStock = await Product.count({
          where: {
            ...(isSuperAdmin ? {} : { tenantId }),
            trackInventory: true,  // Only track products with inventory tracking enabled
            stockQuantity: {
              [Op.lte]: col('minStockLevel'),
              [Op.gt]: 0
            }
          }
        });

        // Out of stock
        restaurantData.inventory.outOfStock = await Product.count({
          where: {
            ...(isSuperAdmin ? {} : { tenantId }),
            trackInventory: true,  // Only track products with inventory tracking enabled
            stockQuantity: 0
          }
        });
      } catch (inventoryError) {
        logger.logWarning('Error fetching inventory data', {
          action: 'MAIN_DASHBOARD_INVENTORY_ERROR',
          error: inventoryError.message
        });
      }
    }

    // ===============================
    // FINANCE MODULE DATA
    // ===============================

    const financeData = {
      expenses: {
        today: 0,
        thisMonth: 0,
        pending: 0,
        overdue: 0
      },
      cashflow: {
        todayIncome: todayTotalRevenue,
        todayExpenses: 0,
        netCashflow: 0
      },
      profitMargin: 0
    };

    // Check if Expense model exists
    if (Expense && ExpenseCategory) {
      try {
        // Today's expenses
        const todayExpenses = await Expense.sum('totalAmount', {
          where: {
            ...(isSuperAdmin ? {} : { tenantId }),
            ...(locationId ? { locationId } : {}),
            status: { [Op.in]: ['approved', 'paid'] },
            expenseDate: {
              [Op.gte]: today,
              [Op.lt]: tomorrow
            }
          }
        });

        financeData.expenses.today = parseFloat(todayExpenses || 0);

        // This month's expenses
        const thisMonthExpenses = await Expense.sum('totalAmount', {
          where: {
            ...(isSuperAdmin ? {} : { tenantId }),
            ...(locationId ? { locationId } : {}),
            status: { [Op.in]: ['approved', 'paid'] },
            expenseDate: {
              [Op.gte]: thisMonthStart
            }
          }
        });

        financeData.expenses.thisMonth = parseFloat(thisMonthExpenses || 0);

        // Pending expenses
        financeData.expenses.pending = await Expense.count({
          where: {
            ...(isSuperAdmin ? {} : { tenantId }),
            ...(locationId ? { locationId } : {}),
            status: 'pending'
          }
        });

        // Overdue expenses (approved but not paid, past due date)
        financeData.expenses.overdue = await Expense.count({
          where: {
            ...(isSuperAdmin ? {} : { tenantId }),
            ...(locationId ? { locationId } : {}),
            status: 'approved',
            dueDate: {
              [Op.lt]: now
            }
          }
        });

        // Calculate cashflow
        financeData.cashflow.todayExpenses = financeData.expenses.today;
        financeData.cashflow.netCashflow = todayTotalRevenue - financeData.expenses.today;

        // Calculate profit margin (this month)
        if (thisMonthTotal > 0) {
          financeData.profitMargin = parseFloat((
            ((thisMonthTotal - financeData.expenses.thisMonth) / thisMonthTotal) * 100
          ).toFixed(1));
        }

      } catch (financeError) {
        logger.logWarning('Error fetching finance data', {
          action: 'MAIN_DASHBOARD_FINANCE_ERROR',
          error: financeError.message
        });
      }
    }

    // ===============================
    // PAYMENT METHODS BREAKDOWN
    // ===============================

    const paymentMethods = await sequelize.query(`
      SELECT 
        tp."paymentMethod",
        COUNT(DISTINCT t.id) as "transactionCount",
        SUM(tp.amount) as total
      FROM "TransactionPayments" tp
      INNER JOIN "Transactions" t ON t.id = tp."transactionId"
      WHERE ${!isSuperAdmin ? 't."tenantId" = :tenantId AND' : ''}
        t.status IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        AND t."createdAt" >= :today
        AND t."createdAt" < :tomorrow
        AND tp."status" = '${COMPLETED_PAYMENT_STATUS}'
        ${locationId ? 'AND t."locationId" = :locationId' : ''}
      GROUP BY tp."paymentMethod"
      ORDER BY total DESC
    `, {
      replacements: { 
        tenantId: isSuperAdmin ? null : tenantId,
        today,
        tomorrow,
        locationId: locationId || null
      },
      type: sequelize.QueryTypes.SELECT
    });

    // ===============================
    // RECENT ACTIVITY
    // ===============================

    const recentTransactions = await Transaction.findAll({
      where: {
        ...where,
        createdAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 10,
      attributes: ['id', 'transactionNumber', 'transactionType', 'totalAmount', 'status', 'createdAt']
    });

    // ===============================
    // ALERTS & NOTIFICATIONS
    // ===============================

    const alerts = {
      critical: [],
      warning: [],
      info: []
    };

    // Critical alerts
    if (restaurantData.inventory.outOfStock > 0) {
      alerts.critical.push({
        type: 'OUT_OF_STOCK',
        message: `${restaurantData.inventory.outOfStock} product(s) are out of stock`,
        count: restaurantData.inventory.outOfStock
      });
    }

    // Warning alerts
    if (gymData.services.expiringSoon > 0) {
      alerts.warning.push({
        type: 'EXPIRING_SERVICES',
        message: `${gymData.services.expiringSoon} service(s) expiring in 7 days`,
        count: gymData.services.expiringSoon
      });
    }

    if (restaurantData.inventory.lowStock > 0) {
      alerts.warning.push({
        type: 'LOW_STOCK',
        message: `${restaurantData.inventory.lowStock} product(s) are low on stock`,
        count: restaurantData.inventory.lowStock
      });
    }

    if (financeData.expenses.overdue > 0) {
      alerts.warning.push({
        type: 'OVERDUE_EXPENSES',
        message: `${financeData.expenses.overdue} expense(s) are overdue`,
        count: financeData.expenses.overdue
      });
    }

    // Info alerts
    if (gymData.members.newToday > 0) {
      alerts.info.push({
        type: 'NEW_MEMBERS',
        message: `${gymData.members.newToday} new member(s) registered today`,
        count: gymData.members.newToday
      });
    }

    if (financeData.expenses.pending > 0) {
      alerts.info.push({
        type: 'PENDING_EXPENSES',
        message: `${financeData.expenses.pending} expense(s) pending approval`,
        count: financeData.expenses.pending
      });
    }

    // ===============================
    // BUILD RESPONSE
    // ===============================

    res.json({
      success: true,
      data: {
        summary: {
          revenue: {
            today: {
              total: parseFloat(todayTotalRevenue.toFixed(2)),
              transactions: todayTotalTransactions,
              change: revenueChange,
              byModule: todayRevenueByModule.map(m => ({
                module: m.transactionType,
                total: parseFloat(m.total || 0),
                subtotal: parseFloat(m.subtotal || 0),
                tax: parseFloat(m.tax || 0),
                discount: parseFloat(m.discount || 0),
                transactions: parseInt(m.transactions || 0)
              }))
            },
            thisMonth: {
              total: parseFloat(thisMonthTotal || 0),
              change: monthlyChange
            }
          },
          payments: paymentMethods.map(pm => ({
            method: pm.paymentMethod,
            transactions: parseInt(pm.transactionCount),
            total: parseFloat(pm.total || 0)
          }))
        },
        modules: {
          gym: gymData,
          restaurant: restaurantData,
          finance: financeData
        },
        recentActivity: recentTransactions.map(t => ({
          id: t.id,
          transactionNumber: t.transactionNumber,
          module: t.transactionType,
          amount: parseFloat(t.totalAmount),
          status: t.status,
          createdAt: t.createdAt
        })),
        alerts
      }
    });

    logger.logInfo('Main dashboard retrieved', {
      action: 'MAIN_DASHBOARD',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error retrieving main dashboard', {
      action: 'MAIN_DASHBOARD_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

module.exports = {
  getMainDashboard
};
