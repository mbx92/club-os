'use strict';

/**
 * Gym Module Report Controller
 * 
 * Provides comprehensive reporting for gym operations:
 * - Revenue reports (memberships, PT sessions, classes)
 * - Profit & Loss analysis
 * - Attendance reports
 * - Service plan status tracking
 * 
 * @module controllers/gym/report/reportController
 */

const { 
  Transaction,
  TransactionItem,
  TransactionPayment,
  ActiveService,
  ServicePlan,
  Member,
  CheckIn,
  Trainer,
  TrainerCommission,
  Tenant,
  sequelize 
} = require('../../../models');
const { Op, fn, col, literal } = require('sequelize');
const { createError } = require('../../../utils/errorCodes');
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');
const {
  REVENUE_RECOGNIZED_TRANSACTION_STATUSES,
  COMPLETED_PAYMENT_STATUS,
  PAID_TRANSACTION_SEQUELIZE_LITERAL_SQL,
} = require('../../../utils/reportingStatus');

/**
 * Get revenue report for gym operations
 * @route GET /api/v1/gym/reports/revenue
 * @query startDate - Start date (YYYY-MM-DD)
 * @query endDate - End date (YYYY-MM-DD)
 * @query groupBy - Group by: daily, weekly, monthly, yearly (default: daily)
 * @query serviceType - Filter by service type: membership, personal_training, class
 * @query locationId - Filter by location
 */
async function getRevenueReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { 
      startDate, 
      endDate, 
      groupBy = 'daily',
      serviceType,
      locationId 
    } = req.query;

    // Build base where clause
    const where = {
      transactionType: 'gym',
      status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
      [Op.and]: sequelize.literal(PAID_TRANSACTION_SEQUELIZE_LITERAL_SQL)
    };

    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    // Date filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    // Determine date truncation for grouping
    let dateTrunc;
    switch (groupBy) {
      case 'weekly': dateTrunc = 'week'; break;
      case 'monthly': dateTrunc = 'month'; break;
      case 'yearly': dateTrunc = 'year'; break;
      default: dateTrunc = 'day';
    }

    // Revenue by period
    const revenueByPeriod = await Transaction.findAll({
      where,
      attributes: [
        [fn('DATE_TRUNC', dateTrunc, col('Transaction.createdAt')), 'period'],
        [fn('COUNT', col('Transaction.id')), 'transactionCount'],
        [fn('SUM', col('totalAmount')), 'revenue'],
        [fn('SUM', col('subtotal')), 'subtotal'],
        [fn('SUM', col('tax')), 'tax'],
        [fn('SUM', col('voucherDiscount')), 'discount']
      ],
      group: [fn('DATE_TRUNC', dateTrunc, col('Transaction.createdAt'))],
      order: [[fn('DATE_TRUNC', dateTrunc, col('Transaction.createdAt')), 'ASC']],
      raw: true
    });

    // Revenue by service type
    let revenueByServiceType;
    if (serviceType) {
      revenueByServiceType = await TransactionItem.findAll({
        attributes: [
          'itemType',
          [fn('COUNT', col('TransactionItem.id')), 'itemCount'],
          [fn('SUM', col('total')), 'revenue']
        ],
        include: [{
          model: Transaction,
          as: 'transaction',
          where,
          attributes: []
        }],
        where: { itemType: serviceType },
        group: ['itemType'],
        raw: true
      });
    } else {
      revenueByServiceType = await TransactionItem.findAll({
        attributes: [
          'itemType',
          [fn('COUNT', col('TransactionItem.id')), 'itemCount'],
          [fn('SUM', col('total')), 'revenue']
        ],
        include: [{
          model: Transaction,
          as: 'transaction',
          where,
          attributes: []
        }],
        group: ['itemType'],
        raw: true
      });
    }

    // Payment method breakdown
    const paymentBreakdown = await TransactionPayment.findAll({
      where: { status: COMPLETED_PAYMENT_STATUS },
      attributes: [
        'paymentMethod',
        [fn('COUNT', col('TransactionPayment.id')), 'count'],
        [fn('SUM', col('amount')), 'total']
      ],
      include: [{
        model: Transaction,
        as: 'transaction',
        where,
        attributes: []
      }],
      group: ['paymentMethod'],
      raw: true
    });

    // Overall summary
    const summary = await Transaction.findOne({
      where,
      attributes: [
        [fn('SUM', col('totalAmount')), 'totalRevenue'],
        [fn('SUM', col('subtotal')), 'subtotal'],
        [fn('SUM', col('tax')), 'totalTax'],
        [fn('SUM', col('voucherDiscount')), 'totalDiscount'],
        [fn('COUNT', col('id')), 'totalTransactions'],
        [fn('AVG', col('totalAmount')), 'averageOrderValue']
      ],
      raw: true
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: parseFloat(summary.totalRevenue || 0),
          subtotal: parseFloat(summary.subtotal || 0),
          totalTax: parseFloat(summary.totalTax || 0),
          totalDiscount: parseFloat(summary.totalDiscount || 0),
          totalTransactions: parseInt(summary.totalTransactions || 0),
          averageOrderValue: parseFloat(summary.averageOrderValue || 0)
        },
        revenueByPeriod: revenueByPeriod.map(item => ({
          period: item.period,
          transactionCount: parseInt(item.transactionCount || 0),
          revenue: parseFloat(item.revenue || 0),
          subtotal: parseFloat(item.subtotal || 0),
          tax: parseFloat(item.tax || 0),
          discount: parseFloat(item.discount || 0)
        })),
        revenueByServiceType: revenueByServiceType.map(item => ({
          serviceType: item.itemType,
          itemCount: parseInt(item.itemCount || 0),
          revenue: parseFloat(item.revenue || 0)
        })),
        paymentBreakdown: paymentBreakdown.map(item => ({
          method: item.paymentMethod,
          count: parseInt(item.count || 0),
          total: parseFloat(item.total || 0)
        }))
      },
      filters: {
        startDate,
        endDate,
        groupBy,
        serviceType: serviceType || null,
        locationId: locationId || null
      }
    });

    logger.logInfo('Gym revenue report generated', {
      action: 'GYM_REVENUE_REPORT',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl
    });

  } catch (error) {
    logger.logError('Error generating gym revenue report', {
      action: 'GYM_REVENUE_REPORT_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Get profit & loss report
 * @route GET /api/v1/gym/reports/profit-loss
 * @query startDate - Start date (YYYY-MM-DD)
 * @query endDate - End date (YYYY-MM-DD)
 * @query groupBy - Group by: daily, weekly, monthly, yearly (default: monthly)
 */
async function getProfitLossReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, groupBy = 'monthly' } = req.query;

    const where = {
      transactionType: 'gym',
      status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
      [Op.and]: sequelize.literal(PAID_TRANSACTION_SEQUELIZE_LITERAL_SQL)
    };

    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    // Determine date truncation
    let dateTrunc;
    switch (groupBy) {
      case 'daily': dateTrunc = 'day'; break;
      case 'weekly': dateTrunc = 'week'; break;
      case 'yearly': dateTrunc = 'year'; break;
      default: dateTrunc = 'month';
    }

    // Revenue (Income)
    const revenue = await Transaction.findAll({
      where,
      attributes: [
        [fn('DATE_TRUNC', dateTrunc, col('Transaction.createdAt')), 'period'],
        [fn('SUM', col('totalAmount')), 'totalRevenue'],
        [fn('SUM', col('subtotal')), 'subtotal'],
        [fn('SUM', col('tax')), 'tax'],
        [fn('SUM', col('voucherDiscount')), 'discount']
      ],
      group: [fn('DATE_TRUNC', dateTrunc, col('Transaction.createdAt'))],
      order: [[fn('DATE_TRUNC', dateTrunc, col('Transaction.createdAt')), 'ASC']],
      raw: true
    });

    // Get trainer commissions (Expenses)
    // Note: Trainer commissions are stored but not in the same transaction cycle
    // This is a simplified calculation - expand based on your commission model
    const commissionWhere = {};
    if (!isSuperAdmin) {
      commissionWhere.tenantId = tenantId;
    }
    if (startDate || endDate) {
      commissionWhere.createdAt = {};
      if (startDate) {
        commissionWhere.createdAt[Op.gte] = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        commissionWhere.createdAt[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    // Calculate gross profit (Revenue - Direct Costs)
    // Direct costs include: trainer commissions, discounts given
    const profitLossData = revenue.map(item => {
      const totalRevenue = parseFloat(item.totalRevenue || 0);
      const discount = parseFloat(item.discount || 0);
      const tax = parseFloat(item.tax || 0);
      
      // Simplified: Gross profit = revenue - discounts
      // In real scenario, you'd subtract COGS, commissions, etc.
      const grossProfit = totalRevenue - discount;
      const netProfit = grossProfit; // Before operating expenses
      
      return {
        period: item.period,
        revenue: totalRevenue,
        discount,
        tax,
        grossProfit,
        netProfit,
        profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0
      };
    });

    // Overall totals
    const totalRevenue = profitLossData.reduce((sum, item) => sum + item.revenue, 0);
    const totalDiscount = profitLossData.reduce((sum, item) => sum + item.discount, 0);
    const totalGrossProfit = profitLossData.reduce((sum, item) => sum + item.grossProfit, 0);
    const totalNetProfit = profitLossData.reduce((sum, item) => sum + item.netProfit, 0);

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalDiscount,
          totalGrossProfit,
          totalNetProfit,
          overallProfitMargin: totalRevenue > 0 ? ((totalNetProfit / totalRevenue) * 100).toFixed(2) : 0
        },
        profitLoss: profitLossData
      },
      filters: {
        startDate,
        endDate,
        groupBy
      }
    });

    logger.logInfo('Gym P&L report generated', {
      action: 'GYM_PROFIT_LOSS_REPORT',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error generating gym P&L report', {
      action: 'GYM_PROFIT_LOSS_REPORT_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Get attendance report
 * @route GET /api/v1/gym/reports/attendance
 * @query startDate - Start date (YYYY-MM-DD)
 * @query endDate - End date (YYYY-MM-DD)
 * @query groupBy - Group by: daily, weekly, monthly (default: daily)
 * @query locationId - Filter by location
 */
async function getAttendanceReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, groupBy = 'daily', locationId } = req.query;

    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    if (startDate || endDate) {
      where.checkInTime = {};
      if (startDate) {
        where.checkInTime[Op.gte] = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.checkInTime[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    // Determine date truncation
    let dateTrunc;
    switch (groupBy) {
      case 'weekly': dateTrunc = 'week'; break;
      case 'monthly': dateTrunc = 'month'; break;
      default: dateTrunc = 'day';
    }

    // Check-ins by period
    const checkInsByPeriod = await CheckIn.findAll({
      where,
      attributes: [
        [fn('DATE_TRUNC', dateTrunc, col('checkInTime')), 'period'],
        [fn('COUNT', col('CheckIn.id')), 'totalCheckIns'],
        [fn('COUNT', fn('DISTINCT', col('memberId'))), 'uniqueMembers']
      ],
      group: [fn('DATE_TRUNC', dateTrunc, col('checkInTime'))],
      order: [[fn('DATE_TRUNC', dateTrunc, col('checkInTime')), 'ASC']],
      raw: true
    });

    // Check-ins by service type
    const checkInsByServiceType = await CheckIn.findAll({
      where,
      attributes: [
        [col('activeService.serviceType'), 'serviceType'],
        [fn('COUNT', col('CheckIn.id')), 'count'],
        [fn('COUNT', fn('DISTINCT', col('CheckIn.memberId'))), 'uniqueMembers']
      ],
      include: [{
        model: ActiveService,
        as: 'activeService',
        attributes: []
      }],
      group: [col('activeService.serviceType')],
      raw: true
    });

    // Peak hours analysis (hour of day)
    const peakHours = await CheckIn.findAll({
      where,
      attributes: [
        [fn('EXTRACT', literal('HOUR FROM "checkInTime"')), 'hour'],
        [fn('COUNT', col('CheckIn.id')), 'count']
      ],
      group: [fn('EXTRACT', literal('HOUR FROM "checkInTime"'))],
      order: [[fn('COUNT', col('CheckIn.id')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Summary
    const summary = await CheckIn.findOne({
      where,
      attributes: [
        [fn('COUNT', col('id')), 'totalCheckIns'],
        [fn('COUNT', fn('DISTINCT', col('memberId'))), 'uniqueMembers']
      ],
      raw: true
    });

    // Average check-ins per day
    const avgCheckInsPerDay = checkInsByPeriod.length > 0
      ? (parseInt(summary.totalCheckIns || 0) / checkInsByPeriod.length).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalCheckIns: parseInt(summary.totalCheckIns || 0),
          uniqueMembers: parseInt(summary.uniqueMembers || 0),
          averageCheckInsPerDay: parseFloat(avgCheckInsPerDay),
          totalPeriods: checkInsByPeriod.length
        },
        checkInsByPeriod: checkInsByPeriod.map(item => ({
          period: item.period,
          totalCheckIns: parseInt(item.totalCheckIns || 0),
          uniqueMembers: parseInt(item.uniqueMembers || 0)
        })),
        checkInsByServiceType: checkInsByServiceType.map(item => ({
          serviceType: item.serviceType,
          count: parseInt(item.count || 0),
          uniqueMembers: parseInt(item.uniqueMembers || 0)
        })),
        peakHours: peakHours.map(item => ({
          hour: parseInt(item.hour),
          count: parseInt(item.count || 0)
        }))
      },
      filters: {
        startDate,
        endDate,
        groupBy,
        locationId: locationId || null
      }
    });

    logger.logInfo('Gym attendance report generated', {
      action: 'GYM_ATTENDANCE_REPORT',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error generating gym attendance report', {
      action: 'GYM_ATTENDANCE_REPORT_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Get service plan status report
 * @route GET /api/v1/gym/reports/service-status
 * @query status - Filter by status: active, expired, suspended, depleted
 * @query serviceType - Filter by service type: membership, personal_training, class
 */
async function getServiceStatusReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { status, serviceType } = req.query;

    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (status) {
      where.status = status;
    }

    if (serviceType) {
      where.serviceType = serviceType;
    }

    // Services by status
    const servicesByStatus = await ActiveService.findAll({
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('totalSessions')), 'totalSessions'],
        [fn('SUM', col('remainingSessions')), 'remainingSessions']
      ],
      where: !isSuperAdmin ? { tenantId } : {},
      group: ['status'],
      raw: true
    });

    // Services by type
    const servicesByType = await ActiveService.findAll({
      attributes: [
        'serviceType',
        [fn('COUNT', col('id')), 'count'],
        [fn('AVG', col('totalSessions')), 'avgSessions']
      ],
      where,
      group: ['serviceType'],
      raw: true
    });

    // Expiring soon (next 7 days)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    
    const expiringSoon = await ActiveService.findAll({
      where: {
        ...where,
        status: 'active',
        endDate: {
          [Op.between]: [new Date(), futureDate]
        }
      },
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: ServicePlan,
          as: 'servicePlan',
          attributes: ['id', 'name', 'serviceType']
        }
      ],
      order: [['endDate', 'ASC']],
      limit: 20
    });

    // Services with low sessions (less than 20% remaining)
    const lowSessions = await ActiveService.findAll({
      where: {
        ...where,
        status: 'active',
        totalSessions: { [Op.gt]: 0 },
        [Op.and]: [
          sequelize.literal('("remainingSessions"::float / "totalSessions"::float) < 0.2')
        ]
      },
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: ServicePlan,
          as: 'servicePlan',
          attributes: ['id', 'name', 'serviceType']
        }
      ],
      order: [[literal('"remainingSessions"::float / "totalSessions"::float'), 'ASC']],
      limit: 20
    });

    // Summary
    const summary = {
      totalServices: 0,
      activeServices: 0,
      expiredServices: 0,
      suspendedServices: 0,
      depletedServices: 0
    };

    const statusCounts = await ActiveService.findAll({
      where: !isSuperAdmin ? { tenantId } : {},
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    statusCounts.forEach(item => {
      const count = parseInt(item.count || 0);
      summary.totalServices += count;
      
      switch(item.status) {
        case 'active':
          summary.activeServices = count;
          break;
        case 'expired':
          summary.expiredServices = count;
          break;
        case 'suspended':
          summary.suspendedServices = count;
          break;
        case 'depleted':
          summary.depletedServices = count;
          break;
      }
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalServices: summary.totalServices,
          activeServices: summary.activeServices,
          expiredServices: summary.expiredServices,
          suspendedServices: summary.suspendedServices,
          depletedServices: summary.depletedServices
        },
        servicesByStatus: servicesByStatus.map(item => ({
          status: item.status,
          count: parseInt(item.count || 0),
          totalSessions: parseInt(item.totalSessions || 0),
          remainingSessions: parseInt(item.remainingSessions || 0)
        })),
        servicesByType: servicesByType.map(item => ({
          serviceType: item.serviceType,
          count: parseInt(item.count || 0),
          avgSessions: parseFloat(item.avgSessions || 0).toFixed(2)
        })),
        expiringSoon: expiringSoon.map(service => ({
          id: service.id,
          customerName: service.member
            ? `${service.member.firstName} ${service.member.lastName}`.trim()
            : service.customerName || null,
          member: service.member ? {
            id: service.member.id,
            name: `${service.member.firstName} ${service.member.lastName}`.trim(),
            email: service.member.email,
            phone: service.member.phone
          } : null,
          servicePlan: service.servicePlan ? {
            id: service.servicePlan.id,
            name: service.servicePlan.name,
            serviceType: service.servicePlan.serviceType
          } : null,
          startDate: service.startDate,
          endDate: service.endDate,
          remainingSessions: service.remainingSessions,
          totalSessions: service.totalSessions,
          status: service.status
        })),
        lowSessions: lowSessions.map(service => ({
          id: service.id,
          customerName: service.member
            ? `${service.member.firstName} ${service.member.lastName}`.trim()
            : service.customerName || null,
          member: service.member ? {
            id: service.member.id,
            name: `${service.member.firstName} ${service.member.lastName}`.trim(),
            email: service.member.email,
            phone: service.member.phone
          } : null,
          servicePlan: service.servicePlan ? {
            id: service.servicePlan.id,
            name: service.servicePlan.name,
            serviceType: service.servicePlan.serviceType
          } : null,
          remainingSessions: service.remainingSessions,
          totalSessions: service.totalSessions,
          usagePercentage: service.totalSessions > 0 
            ? (((service.totalSessions - service.remainingSessions) / service.totalSessions) * 100).toFixed(2)
            : 0
        }))
      },
      filters: {
        status: status || null,
        serviceType: serviceType || null
      }
    });

    logger.logInfo('Gym service status report generated', {
      action: 'GYM_SERVICE_STATUS_REPORT',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error generating gym service status report', {
      action: 'GYM_SERVICE_STATUS_REPORT_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Get trainer commission report (all trainers)
 * @route GET /api/v1/gym/reports/trainer-commissions
 * @query startDate - Start date (YYYY-MM-DD)
 * @query endDate - End date (YYYY-MM-DD)
 * @query status - Filter by status: pending, paid, cancelled
 * @query trainerId - Filter by specific trainer
 * @query groupBy - Group by: daily, weekly, monthly (default: none)
 * @query sortBy - Sort by: trainer, amount, date (default: date)
 * @query sortOrder - Sort order: asc, desc (default: desc)
 */
async function getTrainerCommissionReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { 
      startDate, 
      endDate, 
      status,
      trainerId,
      groupBy,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    // Build base where clause for commissions
    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (status) {
      where.status = status;
    }

    if (trainerId) {
      where.trainerId = trainerId;
    }

    // Date filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    // Get all commissions with trainer and transaction details
    const commissions = await TrainerCommission.findAll({
      where,
      include: [
        {
          model: Trainer,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'commissionType', 'commissionValue']
        },
        {
          model: Transaction,
          as: 'transaction',
          attributes: ['id', 'transactionNumber', 'totalAmount', 'createdAt']
        }
      ],
      order: [['createdAt', sortOrder.toUpperCase()]],
      raw: false
    });

    // Calculate summary by trainer
    const trainerSummary = {};
    commissions.forEach(commission => {
      const trainerId = commission.trainerId;
      if (!trainerSummary[trainerId]) {
        trainerSummary[trainerId] = {
          trainer: {
            id: commission.trainer?.id,
            name: commission.trainer ? `${commission.trainer.firstName} ${commission.trainer.lastName}`.trim() : 'Unknown',
            email: commission.trainer?.email,
            phone: commission.trainer?.phone,
            commissionType: commission.trainer?.commissionType,
            commissionValue: commission.trainer?.commissionValue
          },
          totalCommissions: 0,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          cancelledAmount: 0,
          commissionCount: 0,
          paidCount: 0,
          pendingCount: 0,
          cancelledCount: 0
        };
      }

      const amount = parseFloat(commission.commissionAmount || 0);
      trainerSummary[trainerId].totalAmount += amount;
      trainerSummary[trainerId].commissionCount++;

      if (commission.status === 'paid') {
        trainerSummary[trainerId].paidAmount += amount;
        trainerSummary[trainerId].paidCount++;
      } else if (commission.status === 'pending') {
        trainerSummary[trainerId].pendingAmount += amount;
        trainerSummary[trainerId].pendingCount++;
      } else if (commission.status === 'cancelled') {
        trainerSummary[trainerId].cancelledAmount += amount;
        trainerSummary[trainerId].cancelledCount++;
      }
    });

    // Convert to array and sort
    let trainerSummaryArray = Object.values(trainerSummary);
    
    if (sortBy === 'trainer') {
      trainerSummaryArray.sort((a, b) => {
        const comparison = a.trainer.name.localeCompare(b.trainer.name);
        return sortOrder === 'desc' ? -comparison : comparison;
      });
    } else if (sortBy === 'amount') {
      trainerSummaryArray.sort((a, b) => {
        const comparison = a.totalAmount - b.totalAmount;
        return sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    // Group by time period if requested
    let timeSeriesData = null;
    if (groupBy) {
      let dateTrunc;
      switch (groupBy) {
        case 'weekly': dateTrunc = 'week'; break;
        case 'monthly': dateTrunc = 'month'; break;
        case 'yearly': dateTrunc = 'year'; break;
        default: dateTrunc = 'day';
      }

      const timeSeriesResults = await TrainerCommission.findAll({
        where,
        attributes: [
          [fn('DATE_TRUNC', dateTrunc, col('createdAt')), 'period'],
          [fn('COUNT', col('id')), 'count'],
          [fn('SUM', col('commissionAmount')), 'totalAmount'],
          [fn('SUM', literal("CASE WHEN status = 'paid' THEN \"commissionAmount\" ELSE 0 END")), 'paidAmount'],
          [fn('SUM', literal("CASE WHEN status = 'pending' THEN \"commissionAmount\" ELSE 0 END")), 'pendingAmount']
        ],
        group: [fn('DATE_TRUNC', dateTrunc, col('createdAt'))],
        order: [[fn('DATE_TRUNC', dateTrunc, col('createdAt')), 'ASC']],
        raw: true
      });

      timeSeriesData = timeSeriesResults.map(item => ({
        period: item.period,
        count: parseInt(item.count) || 0,
        totalAmount: parseFloat(item.totalAmount) || 0,
        paidAmount: parseFloat(item.paidAmount) || 0,
        pendingAmount: parseFloat(item.pendingAmount) || 0
      }));
    }

    // Overall summary
    const overallSummary = {
      totalTrainers: trainerSummaryArray.length,
      totalCommissions: commissions.length,
      totalAmount: trainerSummaryArray.reduce((sum, item) => sum + item.totalAmount, 0),
      paidAmount: trainerSummaryArray.reduce((sum, item) => sum + item.paidAmount, 0),
      pendingAmount: trainerSummaryArray.reduce((sum, item) => sum + item.pendingAmount, 0),
      cancelledAmount: trainerSummaryArray.reduce((sum, item) => sum + item.cancelledAmount, 0),
      paidCount: trainerSummaryArray.reduce((sum, item) => sum + item.paidCount, 0),
      pendingCount: trainerSummaryArray.reduce((sum, item) => sum + item.pendingCount, 0),
      cancelledCount: trainerSummaryArray.reduce((sum, item) => sum + item.cancelledCount, 0)
    };

    // Detailed commissions list (limited to first 100 for performance)
    const detailedCommissions = commissions.slice(0, 100).map(commission => ({
      id: commission.id,
      trainer: {
        id: commission.trainer?.id,
        name: commission.trainer ? `${commission.trainer.firstName} ${commission.trainer.lastName}`.trim() : 'Unknown'
      },
      transaction: {
        id: commission.transaction?.id,
        transactionNumber: commission.transaction?.transactionNumber,
        totalAmount: commission.transaction?.totalAmount
      },
      commissionAmount: parseFloat(commission.commissionAmount || 0),
      status: commission.status,
      notes: commission.notes,
      paidAt: commission.paidAt,
      createdAt: commission.createdAt
    }));

    res.json({
      success: true,
      data: {
        summary: overallSummary,
        byTrainer: trainerSummaryArray,
        timeSeries: timeSeriesData,
        recentCommissions: detailedCommissions
      },
      filters: {
        startDate,
        endDate,
        status,
        trainerId,
        groupBy,
        sortBy,
        sortOrder
      },
      meta: {
        totalCommissionsCount: commissions.length,
        displayedCommissionsCount: detailedCommissions.length,
        note: commissions.length > 100 ? 'Recent commissions limited to 100 items' : null
      }
    });

    logger.logInfo('Trainer commission report generated', {
      action: 'TRAINER_COMMISSION_REPORT',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      filters: { startDate, endDate, status, trainerId, groupBy }
    });

  } catch (error) {
    logger.logError('Error generating trainer commission report', {
      action: 'TRAINER_COMMISSION_REPORT_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Get service commission income report
 * Menampilkan pendapatan dari active service, komisi trainer, dan pendapatan bersih bisnis.
 * Contoh: jika komisi trainer 60%, maka 40% adalah pendapatan usaha.
 * @route GET /api/v1/gym/reports/service-commission-income
 * @query startDate   - Start date (YYYY-MM-DD)
 * @query endDate     - End date (YYYY-MM-DD)
 * @query status      - Filter status komisi: pending | paid | cancelled
 * @query trainerId   - Filter berdasarkan trainer tertentu
 * @query serviceType - Filter berdasarkan tipe layanan: personal_training | class | etc
 * @query groupBy     - Grouping periode: daily | weekly | monthly | yearly
 * @query sortBy      - Sort: date | amount | trainer (default: date)
 * @query sortOrder   - asc | desc (default: desc)
 */
async function getServiceCommissionIncomeReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      startDate,
      endDate,
      status,
      trainerId,
      serviceType,
      groupBy,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    // Build base where clause
    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (status) {
      where.status = status;
    }

    if (trainerId) {
      where.trainerId = trainerId;
    }

    // Date filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    // Include ServicePlan for serviceType filter
    const transactionInclude = {
      model: Transaction,
      as: 'transaction',
      attributes: ['id', 'transactionNumber', 'totalAmount', 'createdAt', 'customerId', 'customerType', 'customerName', 'customerPhone'],
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'firstName', 'lastName', 'phone', 'email'],
          required: false
        }
      ]
    };

    const commissions = await TrainerCommission.findAll({
      where,
      include: [
        {
          model: Trainer,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'commissionType', 'commissionValue']
        },
        transactionInclude
      ],
      order: [['createdAt', sortOrder.toUpperCase()]],
      raw: false
    });

    // Fetch ActiveServices for all commission transactions (Transaction has no hasMany ActiveService)
    const transactionIds = [...new Set(commissions.map(c => c.transactionId).filter(Boolean))];
    const activeServicesForTx = transactionIds.length
      ? await ActiveService.findAll({
          where: { purchaseTransactionId: { [Op.in]: transactionIds } },
          attributes: ['id', 'serviceType', 'pricePaid', 'startDate', 'endDate', 'purchaseTransactionId', 'assignedTrainerId'],
          include: [
            {
              model: ServicePlan,
              as: 'servicePlan',
              attributes: ['id', 'name', 'serviceType'],
              required: false
            }
          ],
          raw: false
        })
      : [];

    // Map: transactionId -> activeService (first match per transaction)
    const activeServiceByTxId = {};
    activeServicesForTx.forEach(as => {
      if (!activeServiceByTxId[as.purchaseTransactionId]) {
        activeServiceByTxId[as.purchaseTransactionId] = as;
      }
    });

    // Calculate per-commission business revenue
    const enrichedCommissions = commissions.map(commission => {
      const base = parseFloat(commission.baseAmount || 0);
      const commAmt = parseFloat(commission.commissionAmount || 0);
      const businessRevenue = base - commAmt;

      // Commission rate as percentage of base (for display)
      let commissionPercent = 0;
      if (commission.commissionType === 'percentage') {
        commissionPercent = parseFloat(commission.commissionRate || 0);
      } else if (base > 0) {
        commissionPercent = (commAmt / base) * 100;
      }

      const businessPercent = base > 0 ? ((businessRevenue / base) * 100) : 0;

      const tx = commission.transaction;
      const txMember = tx?.member;
      const activeService = activeServiceByTxId[commission.transactionId];

      // Untuk member: ambil dari relasi Member, untuk walk-in: gunakan customerName
      const customerInfo = txMember
        ? {
            id: txMember.id,
            name: `${txMember.firstName} ${txMember.lastName}`.trim(),
            phone: txMember.phone,
            email: txMember.email,
            customerType: 'member'
          }
        : tx?.customerName
          ? {
              id: null,
              name: tx.customerName,
              phone: tx.customerPhone ?? null,
              email: null,
              customerType: tx?.customerType ?? 'non-member'
            }
          : null;

      return {
        id: commission.id,
        member: customerInfo,
        trainer: {
          id: commission.trainer?.id,
          name: commission.trainer
            ? `${commission.trainer.firstName} ${commission.trainer.lastName}`.trim()
            : 'Unknown',
          email: commission.trainer?.email,
          phone: commission.trainer?.phone,
          commissionType: commission.trainer?.commissionType,
          commissionValue: commission.trainer?.commissionValue
        },
        transaction: {
          id: tx?.id,
          transactionNumber: tx?.transactionNumber,
          totalAmount: parseFloat(tx?.totalAmount || 0),
          customerId: tx?.customerId ?? null,
          customerType: tx?.customerType ?? null
        },
        baseAmount: base,
        commissionAmount: commAmt,
        commissionPercent: Math.round(commissionPercent * 100) / 100,
        businessRevenue: Math.round(businessRevenue * 100) / 100,
        businessPercent: Math.round(businessPercent * 100) / 100,
        servicePackage: activeService
          ? {
              id: activeService.id,
              serviceType: activeService.serviceType,
              pricePaid: parseFloat(activeService.pricePaid || 0),
              startDate: activeService.startDate,
              endDate: activeService.endDate,
              planName: activeService.servicePlan?.name ?? null,
              planServiceType: activeService.servicePlan?.serviceType ?? null
            }
          : null,
        status: commission.status,
        notes: commission.notes,
        paidAt: commission.paidAt,
        createdAt: commission.createdAt
      };
    });

    // Apply serviceType filter in memory if requested
    const filteredCommissions = serviceType
      ? enrichedCommissions.filter(c =>
          c.servicePackage?.serviceType === serviceType ||
          c.servicePackage?.planServiceType === serviceType
        )
      : enrichedCommissions;

    // Summary per trainer
    const trainerMap = {};
    filteredCommissions.forEach(item => {
      const tid = item.trainer?.id || 'unknown';
      if (!trainerMap[tid]) {
        trainerMap[tid] = {
          trainer: item.trainer,
          totalBaseAmount: 0,
          totalCommissionAmount: 0,
          totalBusinessRevenue: 0,
          commissionCount: 0,
          paidCommissionAmount: 0,
          paidBusinessRevenue: 0,
          pendingCommissionAmount: 0,
          pendingBusinessRevenue: 0,
          cancelledCommissionAmount: 0,
          paidCount: 0,
          pendingCount: 0,
          cancelledCount: 0
        };
      }

      trainerMap[tid].totalBaseAmount += item.baseAmount;
      trainerMap[tid].totalCommissionAmount += item.commissionAmount;
      trainerMap[tid].totalBusinessRevenue += item.businessRevenue;
      trainerMap[tid].commissionCount++;

      if (item.status === 'paid') {
        trainerMap[tid].paidCommissionAmount += item.commissionAmount;
        trainerMap[tid].paidBusinessRevenue += item.businessRevenue;
        trainerMap[tid].paidCount++;
      } else if (item.status === 'pending') {
        trainerMap[tid].pendingCommissionAmount += item.commissionAmount;
        trainerMap[tid].pendingBusinessRevenue += item.businessRevenue;
        trainerMap[tid].pendingCount++;
      } else if (item.status === 'cancelled') {
        trainerMap[tid].cancelledCommissionAmount += item.commissionAmount;
        trainerMap[tid].cancelledCount++;
      }
    });

    // Convert to array and sort
    let byTrainer = Object.values(trainerMap).map(t => ({
      ...t,
      totalBaseAmount: Math.round(t.totalBaseAmount * 100) / 100,
      totalCommissionAmount: Math.round(t.totalCommissionAmount * 100) / 100,
      totalBusinessRevenue: Math.round(t.totalBusinessRevenue * 100) / 100,
      paidCommissionAmount: Math.round(t.paidCommissionAmount * 100) / 100,
      paidBusinessRevenue: Math.round(t.paidBusinessRevenue * 100) / 100,
      pendingCommissionAmount: Math.round(t.pendingCommissionAmount * 100) / 100,
      pendingBusinessRevenue: Math.round(t.pendingBusinessRevenue * 100) / 100,
      cancelledCommissionAmount: Math.round(t.cancelledCommissionAmount * 100) / 100,
      averageCommissionPercent: t.totalBaseAmount > 0
        ? Math.round((t.totalCommissionAmount / t.totalBaseAmount) * 10000) / 100
        : 0,
      averageBusinessPercent: t.totalBaseAmount > 0
        ? Math.round((t.totalBusinessRevenue / t.totalBaseAmount) * 10000) / 100
        : 0
    }));

    if (sortBy === 'trainer') {
      byTrainer.sort((a, b) => {
        const cmp = a.trainer.name.localeCompare(b.trainer.name);
        return sortOrder === 'desc' ? -cmp : cmp;
      });
    } else if (sortBy === 'amount') {
      byTrainer.sort((a, b) => {
        const cmp = a.totalBaseAmount - b.totalBaseAmount;
        return sortOrder === 'desc' ? -cmp : cmp;
      });
    }

    // Time series grouping
    let timeSeriesData = null;
    if (groupBy) {
      let dateTrunc;
      switch (groupBy) {
        case 'weekly': dateTrunc = 'week'; break;
        case 'monthly': dateTrunc = 'month'; break;
        case 'yearly': dateTrunc = 'year'; break;
        default: dateTrunc = 'day';
      }

      const timeSeriesResults = await TrainerCommission.findAll({
        where,
        attributes: [
          [fn('DATE_TRUNC', dateTrunc, col('createdAt')), 'period'],
          [fn('COUNT', col('id')), 'count'],
          [fn('SUM', col('baseAmount')), 'totalBaseAmount'],
          [fn('SUM', col('commissionAmount')), 'totalCommissionAmount'],
          [fn('SUM', literal('"baseAmount" - "commissionAmount"')), 'totalBusinessRevenue'],
          [fn('SUM', literal("CASE WHEN status = 'paid' THEN \"commissionAmount\" ELSE 0 END")), 'paidCommissionAmount'],
          [fn('SUM', literal("CASE WHEN status = 'paid' THEN (\"baseAmount\" - \"commissionAmount\") ELSE 0 END")), 'paidBusinessRevenue'],
          [fn('SUM', literal("CASE WHEN status = 'pending' THEN \"commissionAmount\" ELSE 0 END")), 'pendingCommissionAmount'],
          [fn('SUM', literal("CASE WHEN status = 'pending' THEN (\"baseAmount\" - \"commissionAmount\") ELSE 0 END")), 'pendingBusinessRevenue']
        ],
        group: [fn('DATE_TRUNC', dateTrunc, col('createdAt'))],
        order: [[fn('DATE_TRUNC', dateTrunc, col('createdAt')), 'ASC']],
        raw: true
      });

      timeSeriesData = timeSeriesResults.map(item => {
        const base = parseFloat(item.totalBaseAmount) || 0;
        const comm = parseFloat(item.totalCommissionAmount) || 0;
        const biz = parseFloat(item.totalBusinessRevenue) || 0;
        return {
          period: item.period,
          count: parseInt(item.count) || 0,
          totalBaseAmount: base,
          totalCommissionAmount: comm,
          totalBusinessRevenue: biz,
          averageCommissionPercent: base > 0 ? Math.round((comm / base) * 10000) / 100 : 0,
          averageBusinessPercent: base > 0 ? Math.round((biz / base) * 10000) / 100 : 0,
          paidCommissionAmount: parseFloat(item.paidCommissionAmount) || 0,
          paidBusinessRevenue: parseFloat(item.paidBusinessRevenue) || 0,
          pendingCommissionAmount: parseFloat(item.pendingCommissionAmount) || 0,
          pendingBusinessRevenue: parseFloat(item.pendingBusinessRevenue) || 0
        };
      });
    }

    // Overall summary
    const totalBaseAmount = byTrainer.reduce((s, t) => s + t.totalBaseAmount, 0);
    const totalCommissionAmount = byTrainer.reduce((s, t) => s + t.totalCommissionAmount, 0);
    const totalBusinessRevenue = byTrainer.reduce((s, t) => s + t.totalBusinessRevenue, 0);

    const summary = {
      totalTrainers: byTrainer.length,
      totalCommissions: filteredCommissions.length,
      totalBaseAmount: Math.round(totalBaseAmount * 100) / 100,
      totalCommissionAmount: Math.round(totalCommissionAmount * 100) / 100,
      totalBusinessRevenue: Math.round(totalBusinessRevenue * 100) / 100,
      averageCommissionPercent: totalBaseAmount > 0
        ? Math.round((totalCommissionAmount / totalBaseAmount) * 10000) / 100
        : 0,
      averageBusinessPercent: totalBaseAmount > 0
        ? Math.round((totalBusinessRevenue / totalBaseAmount) * 10000) / 100
        : 0,
      paidCommissionAmount: Math.round(byTrainer.reduce((s, t) => s + t.paidCommissionAmount, 0) * 100) / 100,
      paidBusinessRevenue: Math.round(byTrainer.reduce((s, t) => s + t.paidBusinessRevenue, 0) * 100) / 100,
      pendingCommissionAmount: Math.round(byTrainer.reduce((s, t) => s + t.pendingCommissionAmount, 0) * 100) / 100,
      pendingBusinessRevenue: Math.round(byTrainer.reduce((s, t) => s + t.pendingBusinessRevenue, 0) * 100) / 100
    };

    res.json({
      success: true,
      data: {
        summary,
        byTrainer,
        timeSeries: timeSeriesData,
        recentCommissions: filteredCommissions.slice(0, 100)
      },
      filters: {
        startDate,
        endDate,
        status,
        trainerId,
        serviceType,
        groupBy,
        sortBy,
        sortOrder
      },
      meta: {
        totalCommissionsCount: filteredCommissions.length,
        displayedCommissionsCount: Math.min(filteredCommissions.length, 100),
        note: filteredCommissions.length > 100
          ? 'Recent commissions limited to 100 items'
          : null
      }
    });

    logger.logInfo('Service commission income report generated', {
      action: 'SERVICE_COMMISSION_INCOME_REPORT',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      filters: { startDate, endDate, status, trainerId, serviceType, groupBy }
    });

  } catch (error) {
    logger.logError('Error generating service commission income report', {
      action: 'SERVICE_COMMISSION_INCOME_REPORT_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

module.exports = {
  getRevenueReport,
  getProfitLossReport,
  getAttendanceReport,
  getServiceStatusReport,
  getTrainerCommissionReport,
  getServiceCommissionIncomeReport
};
