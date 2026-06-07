/**
 * Member Report Controller
 * Reports: active members, member growth, retention
 */
const { Member, ActiveService, ServicePlan, CheckIn, sequelize } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');
const { generateForecast } = require('../../utils/forecasting');
const logger = require('../../utils/logger');

/**
 * GET /reports/members/active
 * Active member report with filtering
 */
async function getActiveMembersReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { search, gender, membershipStatus } = req.query;

    const where = { isActive: true };
    if (!isSuperAdmin) where.tenantId = tenantId;
    if (membershipStatus) where.membershipStatus = membershipStatus;
    if (gender) where.gender = gender;
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Active members list with active services
    const members = await Member.findAll({
      where,
      include: [{
        model: ActiveService,
        as: 'activeServices',
        where: { status: 'active' },
        required: false,
        include: [{
          model: ServicePlan,
          as: 'servicePlan',
          attributes: ['name', 'serviceType', 'price']
        }],
        attributes: ['id', 'serviceType', 'startDate', 'endDate', 'remainingSessions', 'status', 'pricePaid']
      }],
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'gender', 'joinDate', 'isActive', 'membershipStatus'],
      order: [['joinDate', 'DESC']]
    });

    // Summary stats
    const totalActive = members.length;
    const withActiveService = members.filter(m => m.activeServices && m.activeServices.length > 0).length;
    const withoutActiveService = totalActive - withActiveService;

    // Gender breakdown
    const genderBreakdown = {};
    members.forEach(m => {
      const g = m.gender || 'unspecified';
      genderBreakdown[g] = (genderBreakdown[g] || 0) + 1;
    });

    // Membership status breakdown
    const memberWhere = {};
    if (!isSuperAdmin) memberWhere.tenantId = tenantId;
    const statusBreakdown = await Member.findAll({
      where: memberWhere,
      attributes: [
        'membershipStatus',
        'isActive',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['membershipStatus', 'isActive'],
      raw: true
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalActive,
          withActiveService,
          withoutActiveService,
          genderBreakdown
        },
        statusBreakdown,
        members
      },
      filters: { search, gender, membershipStatus }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/members/growth
 * Member growth trends over time
 */
async function getMemberGrowthReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, groupBy = 'monthly' } = req.query;

    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;
    if (startDate) where.joinDate = { ...(where.joinDate || {}), [Op.gte]: new Date(`${startDate}T00:00:00.000Z`) };
    if (endDate) where.joinDate = { ...(where.joinDate || {}), [Op.lte]: new Date(`${endDate}T23:59:59.999Z`) };

    const dateTruncMap = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' };
    const trunc = dateTruncMap[groupBy] || 'month';

    // New members by period
    const growthByPeriod = await Member.findAll({
      where,
      attributes: [
        [fn('DATE_TRUNC', trunc, col('joinDate')), 'period'],
        [fn('COUNT', col('id')), 'newMembers']
      ],
      group: [fn('DATE_TRUNC', trunc, col('joinDate'))],
      order: [[fn('DATE_TRUNC', trunc, col('joinDate')), 'ASC']],
      raw: true
    });

    // Cumulative calculation
    let cumulative = 0;
    const withCumulative = growthByPeriod.map(g => {
      cumulative += parseInt(g.newMembers) || 0;
      return { ...g, cumulativeMembers: cumulative };
    });

    // Total members by active status
    const totalWhere = {};
    if (!isSuperAdmin) totalWhere.tenantId = tenantId;
    const totalActive = await Member.count({ where: { ...totalWhere, isActive: true } });
    const totalInactive = await Member.count({ where: { ...totalWhere, isActive: false } });

    // Forecast
    const forecastData = growthByPeriod.map(g => ({ period: g.period, value: parseInt(g.newMembers) || 0 }));
    const forecast = generateForecast(forecastData, 3);

    res.json({
      success: true,
      data: {
        summary: {
          totalActive,
          totalInactive,
          totalMembers: totalActive + totalInactive,
          retentionRate: (totalActive + totalInactive) > 0
            ? Math.round((totalActive / (totalActive + totalInactive)) * 10000) / 100
            : 0
        },
        growthByPeriod: withCumulative,
        forecast
      },
      filters: { startDate, endDate, groupBy }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/members/retention
 * Member retention/churn analysis
 */
async function getMemberRetentionReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { months = 6 } = req.query;

    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;

    // Monthly cohort analysis - members who joined each month and how many are still active
    const monthsBack = parseInt(months);
    const cohorts = [];

    for (let i = monthsBack; i >= 0; i--) {
      const start = new Date();
      start.setMonth(start.getMonth() - i, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);

      const joined = await Member.count({
        where: {
          ...where,
          joinDate: { [Op.between]: [start, end] }
        }
      });

      const stillActive = await Member.count({
        where: {
          ...where,
          joinDate: { [Op.between]: [start, end] },
          isActive: true
        }
      });

      cohorts.push({
        period: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        joined,
        stillActive,
        churned: joined - stillActive,
        retentionRate: joined > 0 ? Math.round((stillActive / joined) * 10000) / 100 : 0
      });
    }

    // Check-in frequency analysis (how often active members check in)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const checkInFrequency = await CheckIn.findAll({
      where: {
        ...where,
        checkInTime: { [Op.gte]: thirtyDaysAgo }
      },
      attributes: [
        'memberId',
        [fn('COUNT', col('id')), 'checkInCount']
      ],
      group: ['memberId'],
      raw: true
    });

    // Frequency distribution
    const freqDist = { '0': 0, '1-3': 0, '4-8': 0, '9-15': 0, '16+': 0 };
    checkInFrequency.forEach(m => {
      const c = parseInt(m.checkInCount);
      if (c === 0) freqDist['0']++;
      else if (c <= 3) freqDist['1-3']++;
      else if (c <= 8) freqDist['4-8']++;
      else if (c <= 15) freqDist['9-15']++;
      else freqDist['16+']++;
    });

    res.json({
      success: true,
      data: {
        cohorts,
        checkInFrequency: {
          last30Days: freqDist,
          totalActiveCheckingIn: checkInFrequency.length,
          avgCheckInsPerMember: checkInFrequency.length > 0
            ? Math.round(checkInFrequency.reduce((sum, m) => sum + parseInt(m.checkInCount), 0) / checkInFrequency.length * 100) / 100
            : 0
        }
      },
      filters: { months }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getActiveMembersReport,
  getMemberGrowthReport,
  getMemberRetentionReport
};
