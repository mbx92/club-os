/**
 * Service Report Controller
 * Reports: service plan performance, active services breakdown, service revenue
 */
const { ActiveService, ServicePlan, TransactionItem, Transaction, sequelize } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');
const { generateForecast } = require('../../utils/forecasting');
const logger = require('../../utils/logger');
const { getTenantTimezone } = require('../../utils/tenantTimezone');
const { mergeDateRangeInto } = require('../../utils/dateRange');
const { REVENUE_RECOGNIZED_TRANSACTION_STATUSES } = require('../../utils/reportingStatus');

/**
 * GET /reports/services/performance
 * Service sales performance over time
 */
async function getServicePerformance(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, groupBy = 'monthly', serviceType } = req.query;

    const txWhere = { status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES } };
    if (!isSuperAdmin) txWhere.tenantId = tenantId;
    mergeDateRangeInto(txWhere, 'createdAt', startDate, endDate, Op, getTenantTimezone(req));

    const itemWhere = { itemType: { [Op.in]: ['membership', 'service_plan'] } };

    const dateTruncMap = { daily: 'day', weekly: 'week', monthly: 'month' };
    const trunc = dateTruncMap[groupBy] || 'month';

    // Service sales by period
    const salesByPeriod = await TransactionItem.findAll({
      include: [{
        model: Transaction,
        as: 'transaction',
        where: txWhere,
        attributes: []
      }],
      where: itemWhere,
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

    // By service type
    const byServiceType = await TransactionItem.findAll({
      include: [{
        model: Transaction,
        as: 'transaction',
        where: txWhere,
        attributes: []
      }],
      where: itemWhere,
      attributes: [
        'itemType',
        [fn('SUM', col('quantity')), 'totalQuantity'],
        [fn('SUM', col('TransactionItem.total')), 'totalRevenue']
      ],
      group: ['itemType'],
      raw: true
    });

    // Top service plans
    const topPlans = await TransactionItem.findAll({
      include: [{
        model: Transaction,
        as: 'transaction',
        where: txWhere,
        attributes: []
      }],
      where: itemWhere,
      attributes: [
        'itemId',
        'itemName',
        [fn('SUM', col('quantity')), 'totalSold'],
        [fn('SUM', col('TransactionItem.total')), 'totalRevenue']
      ],
      group: ['itemId', 'itemName'],
      order: [[fn('SUM', col('TransactionItem.total')), 'DESC']],
      limit: 20,
      raw: true
    });

    // Forecast
    const forecastData = salesByPeriod.map(s => ({ period: s.period, value: parseFloat(s.totalRevenue) || 0 }));
    const forecast = generateForecast(forecastData, 3);

    res.json({
      success: true,
      data: {
        salesByPeriod,
        byServiceType,
        topPlans,
        forecast
      },
      filters: { startDate, endDate, groupBy, serviceType }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/services/active
 * Active services breakdown and expiry report
 */
async function getActiveServicesReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;

    const now = new Date();

    // Status distribution
    const statusDist = await ActiveService.findAll({
      where,
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // By service type
    const byType = await ActiveService.findAll({
      where: { ...where, status: 'active' },
      attributes: [
        'serviceType',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('pricePaid')), 'totalRevenue']
      ],
      group: ['serviceType'],
      raw: true
    });

    // Expiring in 7 days
    const expiring7d = await ActiveService.findAll({
      where: {
        ...where,
        status: 'active',
        endDate: { [Op.between]: [now, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)] }
      },
      include: [{
        model: ServicePlan,
        as: 'servicePlan',
        attributes: ['name', 'serviceType']
      }],
      attributes: ['id', 'memberId', 'customerName', 'serviceType', 'startDate', 'endDate', 'remainingSessions'],
      order: [['endDate', 'ASC']],
      limit: 50
    });

    // Expiring in 30 days
    const expiring30dCount = await ActiveService.count({
      where: {
        ...where,
        status: 'active',
        endDate: { [Op.between]: [now, new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)] }
      }
    });

    // Auto-renew stats
    const autoRenewCount = await ActiveService.count({
      where: { ...where, status: 'active', autoRenew: true }
    });

    res.json({
      success: true,
      data: {
        statusDistribution: statusDist,
        byServiceType: byType,
        expiringSoon: {
          within7Days: expiring7d,
          within30DaysCount: expiring30dCount
        },
        autoRenewEnabled: autoRenewCount
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getServicePerformance,
  getActiveServicesReport
};
