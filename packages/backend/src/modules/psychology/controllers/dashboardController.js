'use strict';

/**
 * Dashboard Controller
 * 
 * Provides dashboard statistics and analytics for psychology module
 */

const db = require('../../../models');
const { Op } = require('sequelize');
const {
  PsychologyOrder, PsychologySession, PsychologyPackage,
  PsychologyTestType, Patient
} = db;
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');

/**
 * Get dashboard overview statistics
 */
async function getOverview(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate } = req.query;

    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    } else if (req.query.tenantId) {
      where.tenantId = req.query.tenantId;
    }

    // Date range filter
    const dateFilter = {};
    if (startDate) {
      dateFilter[Op.gte] = new Date(startDate);
    }
    if (endDate) {
      dateFilter[Op.lte] = new Date(endDate + 'T23:59:59.999Z');
    }
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    // Default to current month if no date filter specified
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Apply default current month filter if no date range specified
    // This ensures ALL dashboard data is consistent (monthly by default)
    if (!startDate && !endDate) {
      where.createdAt = {
        [Op.gte]: firstDayOfMonth
      };
    }

    // For sessions, we need to filter by order's createdAt
    const orderWhereForSessions = {
      tenantId: where.tenantId || tenantId
    };
    if (where.createdAt) {
      orderWhereForSessions.createdAt = where.createdAt;
    }

    // For patients, count unique patients from orders in the period
    const patientWhere = {
      include: [{
        model: PsychologyOrder,
        as: 'orders',
        where: { ...where },
        required: true
      }]
    };

    // Get order statistics (all use consistent date filter)
    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      completedRevenue,
      outstandingRevenue,
      totalPatients,
      totalSessions,
      completedSessions
    ] = await Promise.all([
      PsychologyOrder.count({ where }),
      PsychologyOrder.count({ where: { ...where, status: 'pending' } }),
      PsychologyOrder.count({ where: { ...where, status: 'completed' } }),
      PsychologyOrder.count({ where: { ...where, status: 'cancelled' } }),
      PsychologyOrder.sum('finalAmount', { 
        where: { 
          ...where, 
          status: 'completed'
        } 
      }),
      PsychologyOrder.sum('finalAmount', { 
        where: { 
          ...where, 
          status: { [Op.in]: ['paid', 'in_progress', 'verified'] }
        } 
      }),
      // Count unique patients who have orders in this period
      Patient.count({
        distinct: true,
        include: [{
          model: PsychologyOrder,
          as: 'orders',
          where: { ...where },
          required: true,
          attributes: []
        }]
      }),
      // Count sessions from orders in this period
      PsychologySession.count({
        include: [{
          model: PsychologyOrder,
          as: 'order',
          where: orderWhereForSessions,
          required: true,
          attributes: []
        }]
      }),
      // Count completed sessions from orders in this period
      PsychologySession.count({
        where: { status: 'completed' },
        include: [{
          model: PsychologyOrder,
          as: 'order',
          where: orderWhereForSessions,
          required: true,
          attributes: []
        }]
      })
    ]);

    // Calculate completion rate
    const completionRate = totalSessions > 0 
      ? ((completedSessions / totalSessions) * 100).toFixed(1) 
      : 0;
    
    // Calculate total revenue
    const totalRevenue = (completedRevenue || 0) + (outstandingRevenue || 0);

    // Determine period being shown
    const period = {
      startDate: startDate || firstDayOfMonth.toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
      isCurrentMonth: !startDate && !endDate
    };

    res.json({
      success: true,
      data: {
        period,
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          completed: completedOrders,
          cancelled: cancelledOrders
        },
        revenue: {
          total: totalRevenue,
          completed: completedRevenue || 0,
          outstanding: outstandingRevenue || 0
        },
        patients: {
          total: totalPatients
        },
        sessions: {
          total: totalSessions,
          completed: completedSessions,
          completionRate: parseFloat(completionRate)
        }
      }
    });

    logger.logInfo('Psychology dashboard overview retrieved', {
      action: 'PSYCHOLOGY_DASHBOARD_OVERVIEW',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get popular packages
 */
async function getPopularPackages(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { limit = 5, startDate, endDate } = req.query;

    const orderWhere = {};
    if (!isSuperAdmin) {
      orderWhere.tenantId = tenantId;
    } else if (req.query.tenantId) {
      orderWhere.tenantId = req.query.tenantId;
    }

    // Date range filter
    if (startDate) {
      orderWhere.createdAt = { [Op.gte]: new Date(startDate) };
    }
    if (endDate) {
      orderWhere.createdAt = { 
        ...orderWhere.createdAt, 
        [Op.lte]: new Date(endDate + 'T23:59:59.999Z') 
      };
    }

    const packages = await PsychologyPackage.findAll({
      where: isSuperAdmin && !req.query.tenantId ? {} : { tenantId: orderWhere.tenantId || tenantId },
      attributes: [
        'id',
        'name',
        'packageType',
        'basePrice',
        [db.sequelize.fn('COUNT', db.sequelize.col('orders.id')), 'orderCount'],
        [db.sequelize.fn('SUM', db.sequelize.col('orders.finalAmount')), 'totalRevenue']
      ],
      include: [{
        model: PsychologyOrder,
        as: 'orders',
        attributes: [],
        where: orderWhere,
        required: false
      }],
      group: ['PsychologyPackage.id'],
      order: [[db.sequelize.literal('COUNT("orders"."id")'), 'DESC']],
      limit: parseInt(limit),
      subQuery: false
    });

    res.json({
      success: true,
      data: packages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        packageType: pkg.packageType,
        basePrice: pkg.basePrice,
        orderCount: parseInt(pkg.dataValues.orderCount) || 0,
        totalRevenue: parseFloat(pkg.dataValues.totalRevenue) || 0
      }))
    });

    logger.logInfo('Psychology popular packages retrieved', {
      action: 'PSYCHOLOGY_DASHBOARD_POPULAR_PACKAGES',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get recent orders
 */
async function getRecentOrders(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { limit = 10 } = req.query;

    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    } else if (req.query.tenantId) {
      where.tenantId = req.query.tenantId;
    }

    const orders = await PsychologyOrder.findAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'fullName', 'email']
        },
        {
          model: PsychologyPackage,
          as: 'package',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: orders
    });

    logger.logInfo('Psychology recent orders retrieved', {
      action: 'PSYCHOLOGY_DASHBOARD_RECENT_ORDERS',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get revenue chart data (daily/weekly/monthly)
 */
async function getRevenueChart(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { period = 'daily', startDate, endDate } = req.query;

    const where = { 
      status: { [Op.in]: ['paid', 'in_progress', 'completed', 'verified'] }
    };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    } else if (req.query.tenantId) {
      where.tenantId = req.query.tenantId;
    }

    // Default date range: last 30 days
    const end = endDate ? new Date(endDate + 'T23:59:59.999Z') : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    where.createdAt = {
      [Op.between]: [start, end]
    };

    // Determine date truncation based on period
    let dateTrunc;
    switch (period) {
      case 'weekly':
        dateTrunc = 'week';
        break;
      case 'monthly':
        dateTrunc = 'month';
        break;
      default:
        dateTrunc = 'day';
    }

    const revenueData = await PsychologyOrder.findAll({
      where,
      attributes: [
        [db.sequelize.fn('DATE_TRUNC', dateTrunc, db.sequelize.col('createdAt')), 'date'],
        [db.sequelize.fn('SUM', db.sequelize.col('finalAmount')), 'revenue'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'orderCount']
      ],
      group: [db.sequelize.fn('DATE_TRUNC', dateTrunc, db.sequelize.col('createdAt'))],
      order: [[db.sequelize.fn('DATE_TRUNC', dateTrunc, db.sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    res.json({
      success: true,
      data: {
        period,
        startDate: start,
        endDate: end,
        chart: revenueData.map(item => ({
          date: item.date,
          revenue: parseFloat(item.revenue) || 0,
          orderCount: parseInt(item.orderCount) || 0
        }))
      }
    });

    logger.logInfo('Psychology revenue chart retrieved', {
      action: 'PSYCHOLOGY_DASHBOARD_REVENUE_CHART',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { period, startDate: start, endDate: end }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get test completion statistics
 */
async function getTestCompletionStats(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate } = req.query;

    const orderWhere = {};
    if (!isSuperAdmin) {
      orderWhere.tenantId = tenantId;
    } else if (req.query.tenantId) {
      orderWhere.tenantId = req.query.tenantId;
    }

    if (startDate) {
      orderWhere.createdAt = { [Op.gte]: new Date(startDate) };
    }
    if (endDate) {
      orderWhere.createdAt = { 
        ...orderWhere.createdAt, 
        [Op.lte]: new Date(endDate + 'T23:59:59.999Z') 
      };
    }

    // Get session status breakdown
    const sessionStats = await PsychologySession.findAll({
      attributes: [
        [db.sequelize.col('PsychologySession.status'), 'status'],
        [db.sequelize.fn('COUNT', db.sequelize.col('PsychologySession.id')), 'count']
      ],
      include: [{
        model: PsychologyOrder,
        as: 'order',
        attributes: [],
        where: orderWhere,
        required: true
      }],
      group: [db.sequelize.col('PsychologySession.status')],
      raw: true
    });

    // Get test type breakdown
    const testTypeStats = await PsychologySession.findAll({
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('PsychologySession.id')), 'count']
      ],
      include: [
        {
          model: PsychologyOrder,
          as: 'order',
          attributes: [],
          where: orderWhere,
          required: true
        },
        {
          model: PsychologyTestType,
          as: 'testType',
          attributes: ['id', 'name', 'code']
        }
      ],
      group: ['testType.id', 'testType.name', 'testType.code'],
      raw: true
    });

    const statusBreakdown = {};
    sessionStats.forEach(stat => {
      statusBreakdown[stat.status] = parseInt(stat.count);
    });

    res.json({
      success: true,
      data: {
        statusBreakdown,
        testTypeBreakdown: testTypeStats.map(stat => ({
          testTypeId: stat['testType.id'],
          testTypeName: stat['testType.name'],
          testTypeCode: stat['testType.code'],
          count: parseInt(stat.count)
        }))
      }
    });

    logger.logInfo('Psychology test completion stats retrieved', {
      action: 'PSYCHOLOGY_DASHBOARD_TEST_STATS',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOverview,
  getPopularPackages,
  getRecentOrders,
  getRevenueChart,
  getTestCompletionStats
};
