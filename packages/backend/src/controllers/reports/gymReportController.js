/**
 * Gym Report Controller
 * Reports: active members overview, check-in trends, membership stats
 */
const { Member, CheckIn, ActiveService, ServicePlan, sequelize } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');
const { generateForecast } = require('../../utils/forecasting');
const logger = require('../../utils/logger');

/**
 * GET /reports/gym/overview
 * High-level gym stats: total active members, check-ins today/this week/month, active services breakdown
 */
async function getGymOverview(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Active members count
    const activeMembersCount = await Member.count({
      where: { ...where, isActive: true }
    });

    // Total members
    const totalMembers = await Member.count({ where });

    // Check-ins today
    const checkInsToday = await CheckIn.count({
      where: {
        ...where,
        checkInTime: { [Op.gte]: todayStart }
      }
    });

    // Check-ins this week
    const checkInsWeek = await CheckIn.count({
      where: {
        ...where,
        checkInTime: { [Op.gte]: weekStart }
      }
    });

    // Check-ins this month
    const checkInsMonth = await CheckIn.count({
      where: {
        ...where,
        checkInTime: { [Op.gte]: monthStart }
      }
    });

    // Active services breakdown by type
    const activeServicesBreakdown = await ActiveService.findAll({
      where: { ...where, status: 'active' },
      attributes: [
        'serviceType',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['serviceType'],
      raw: true
    });

    // Expiring soon (within 7 days)
    const expiringSoon = await ActiveService.count({
      where: {
        ...where,
        status: 'active',
        endDate: {
          [Op.between]: [now, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)]
        }
      }
    });

    res.json({
      success: true,
      data: {
        members: {
          total: totalMembers,
          active: activeMembersCount,
          inactiveRate: totalMembers > 0 ? Math.round((1 - activeMembersCount / totalMembers) * 10000) / 100 : 0
        },
        checkIns: {
          today: checkInsToday,
          thisWeek: checkInsWeek,
          thisMonth: checkInsMonth
        },
        activeServices: {
          breakdown: activeServicesBreakdown,
          total: activeServicesBreakdown.reduce((sum, s) => sum + parseInt(s.count), 0),
          expiringSoon
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/gym/checkin-trends
 * Check-in trends over time (daily/weekly/monthly)
 */
async function getCheckInTrends(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, groupBy = 'daily' } = req.query;

    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;

    if (startDate) where.checkInTime = { ...(where.checkInTime || {}), [Op.gte]: new Date(`${startDate}T00:00:00.000Z`) };
    if (endDate) where.checkInTime = { ...(where.checkInTime || {}), [Op.lte]: new Date(`${endDate}T23:59:59.999Z`) };

    const dateTruncMap = { daily: 'day', weekly: 'week', monthly: 'month' };
    const trunc = dateTruncMap[groupBy] || 'day';

    const trends = await CheckIn.findAll({
      where,
      attributes: [
        [fn('DATE_TRUNC', trunc, col('checkInTime')), 'period'],
        [fn('COUNT', col('id')), 'count'],
        [fn('COUNT', fn('DISTINCT', col('memberId'))), 'uniqueMembers']
      ],
      group: [fn('DATE_TRUNC', trunc, col('checkInTime'))],
      order: [[fn('DATE_TRUNC', trunc, col('checkInTime')), 'ASC']],
      raw: true
    });

    // Forecasting
    const forecastData = trends.map(t => ({ period: t.period, value: parseInt(t.count) }));
    const forecast = generateForecast(forecastData, 3);

    res.json({
      success: true,
      data: {
        trends,
        forecast
      },
      filters: { startDate, endDate, groupBy }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/gym/membership-stats
 * Membership/service plan statistics
 */
async function getMembershipStats(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;

    // Active services by plan
    const byPlan = await ActiveService.findAll({
      where: { ...where, status: 'active' },
      attributes: [
        'servicePlanId',
        [fn('COUNT', col('ActiveService.id')), 'count'],
        [fn('SUM', col('pricePaid')), 'totalRevenue']
      ],
      include: [{
        model: ServicePlan,
        as: 'servicePlan',
        attributes: ['name', 'serviceType', 'price']
      }],
      group: ['servicePlanId', 'servicePlan.id', 'servicePlan.name', 'servicePlan.serviceType', 'servicePlan.price'],
      raw: true,
      nest: true
    });

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

    // New subscriptions this month
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const newThisMonth = await ActiveService.count({
      where: {
        ...where,
        purchaseDate: { [Op.gte]: monthStart }
      }
    });

    res.json({
      success: true,
      data: {
        byPlan,
        statusDistribution: statusDist,
        newSubscriptionsThisMonth: newThisMonth
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getGymOverview,
  getCheckInTrends,
  getMembershipStats
};
