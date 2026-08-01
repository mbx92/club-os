/**
 * Forecasting Report Controller
 * Provides predictive analytics for revenue, members, attendance, and more
 */
const { Transaction, Member, CheckIn, ActiveService, Expense, TrainerCommission, sequelize } = require('../../models');
const { Op, fn, col } = require('sequelize');
const { generateForecast } = require('../../utils/forecasting');
const logger = require('../../utils/logger');
const { REVENUE_RECOGNIZED_TRANSACTION_STATUSES } = require('../../utils/reportingStatus');

/**
 * GET /reports/forecasting/revenue
 * Revenue forecast based on historical transaction data
 */
async function getRevenueForecast(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { months = 6, periodsAhead = 3, transactionType } = req.query;

    const where = { status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES } };
    if (!isSuperAdmin) where.tenantId = tenantId;
    if (transactionType) where.transactionType = transactionType;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    where.createdAt = { [Op.gte]: startDate };

    const monthlyRevenue = await Transaction.findAll({
      where,
      attributes: [
        [fn('DATE_TRUNC', 'month', col('createdAt')), 'period'],
        [fn('SUM', col('totalAmount')), 'revenue'],
        [fn('COUNT', col('id')), 'transactionCount']
      ],
      group: [fn('DATE_TRUNC', 'month', col('createdAt'))],
      order: [[fn('DATE_TRUNC', 'month', col('createdAt')), 'ASC']],
      raw: true
    });

    const forecastData = monthlyRevenue.map(r => ({
      period: r.period,
      value: parseFloat(r.revenue) || 0
    }));
    const forecast = generateForecast(forecastData, parseInt(periodsAhead));

    res.json({
      success: true,
      data: {
        historical: monthlyRevenue,
        forecast,
        metadata: {
          dataPoints: monthlyRevenue.length,
          basedOnMonths: parseInt(months),
          forecastPeriods: parseInt(periodsAhead)
        }
      },
      filters: { months, periodsAhead, transactionType }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/forecasting/members
 * Member growth forecast
 */
async function getMemberForecast(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { months = 12, periodsAhead = 3 } = req.query;

    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    where.joinDate = { [Op.gte]: startDate };

    const monthlyGrowth = await Member.findAll({
      where,
      attributes: [
        [fn('DATE_TRUNC', 'month', col('joinDate')), 'period'],
        [fn('COUNT', col('id')), 'newMembers']
      ],
      group: [fn('DATE_TRUNC', 'month', col('joinDate'))],
      order: [[fn('DATE_TRUNC', 'month', col('joinDate')), 'ASC']],
      raw: true
    });

    const forecastData = monthlyGrowth.map(m => ({
      period: m.period,
      value: parseInt(m.newMembers) || 0
    }));
    const forecast = generateForecast(forecastData, parseInt(periodsAhead));

    res.json({
      success: true,
      data: {
        historical: monthlyGrowth,
        forecast,
        metadata: {
          dataPoints: monthlyGrowth.length,
          basedOnMonths: parseInt(months),
          forecastPeriods: parseInt(periodsAhead)
        }
      },
      filters: { months, periodsAhead }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/forecasting/attendance
 * Check-in attendance forecast
 */
async function getAttendanceForecast(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { months = 6, periodsAhead = 3 } = req.query;

    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    where.checkInTime = { [Op.gte]: startDate };

    const monthlyAttendance = await CheckIn.findAll({
      where,
      attributes: [
        [fn('DATE_TRUNC', 'month', col('checkInTime')), 'period'],
        [fn('COUNT', col('id')), 'totalCheckIns'],
        [fn('COUNT', fn('DISTINCT', col('memberId'))), 'uniqueMembers']
      ],
      group: [fn('DATE_TRUNC', 'month', col('checkInTime'))],
      order: [[fn('DATE_TRUNC', 'month', col('checkInTime')), 'ASC']],
      raw: true
    });

    const forecastData = monthlyAttendance.map(a => ({
      period: a.period,
      value: parseInt(a.totalCheckIns) || 0
    }));
    const forecast = generateForecast(forecastData, parseInt(periodsAhead));

    res.json({
      success: true,
      data: {
        historical: monthlyAttendance,
        forecast,
        metadata: {
          dataPoints: monthlyAttendance.length,
          basedOnMonths: parseInt(months),
          forecastPeriods: parseInt(periodsAhead)
        }
      },
      filters: { months, periodsAhead }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/forecasting/expenses
 * Expense forecast
 */
async function getExpenseForecast(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { months = 6, periodsAhead = 3 } = req.query;

    const where = { status: { [Op.in]: ['paid'] } };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    where.expenseDate = { [Op.gte]: startDate };

    const monthlyExpenses = await Expense.findAll({
      where,
      attributes: [
        [fn('DATE_TRUNC', 'month', col('expenseDate')), 'period'],
        [fn('SUM', col('totalAmount')), 'totalExpense'],
        [fn('COUNT', col('id')), 'expenseCount']
      ],
      group: [fn('DATE_TRUNC', 'month', col('expenseDate'))],
      order: [[fn('DATE_TRUNC', 'month', col('expenseDate')), 'ASC']],
      raw: true
    });

    const forecastData = monthlyExpenses.map(e => ({
      period: e.period,
      value: parseFloat(e.totalExpense) || 0
    }));
    const forecast = generateForecast(forecastData, parseInt(periodsAhead));

    res.json({
      success: true,
      data: {
        historical: monthlyExpenses,
        forecast,
        metadata: {
          dataPoints: monthlyExpenses.length,
          basedOnMonths: parseInt(months),
          forecastPeriods: parseInt(periodsAhead)
        }
      },
      filters: { months, periodsAhead }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/forecasting/comprehensive
 * Combined forecast for all key metrics
 */
async function getComprehensiveForecast(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { months = 6, periodsAhead = 3 } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    const baseWhere = {};
    if (!isSuperAdmin) baseWhere.tenantId = tenantId;

    // Revenue
    const monthlyRevenue = await Transaction.findAll({
      where: {
        ...baseWhere,
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        [fn('DATE_TRUNC', 'month', col('createdAt')), 'period'],
        [fn('SUM', col('totalAmount')), 'value']
      ],
      group: [fn('DATE_TRUNC', 'month', col('createdAt'))],
      order: [[fn('DATE_TRUNC', 'month', col('createdAt')), 'ASC']],
      raw: true
    });

    // Members
    const monthlyMembers = await Member.findAll({
      where: { ...baseWhere, joinDate: { [Op.gte]: startDate } },
      attributes: [
        [fn('DATE_TRUNC', 'month', col('joinDate')), 'period'],
        [fn('COUNT', col('id')), 'value']
      ],
      group: [fn('DATE_TRUNC', 'month', col('joinDate'))],
      order: [[fn('DATE_TRUNC', 'month', col('joinDate')), 'ASC']],
      raw: true
    });

    // Check-ins
    const monthlyCheckIns = await CheckIn.findAll({
      where: { ...baseWhere, checkInTime: { [Op.gte]: startDate } },
      attributes: [
        [fn('DATE_TRUNC', 'month', col('checkInTime')), 'period'],
        [fn('COUNT', col('id')), 'value']
      ],
      group: [fn('DATE_TRUNC', 'month', col('checkInTime'))],
      order: [[fn('DATE_TRUNC', 'month', col('checkInTime')), 'ASC']],
      raw: true
    });

    // Expenses
    const monthlyExpenses = await Expense.findAll({
      where: {
        ...baseWhere,
        status: { [Op.in]: ['paid'] },
        expenseDate: { [Op.gte]: startDate }
      },
      attributes: [
        [fn('DATE_TRUNC', 'month', col('expenseDate')), 'period'],
        [fn('SUM', col('totalAmount')), 'value']
      ],
      group: [fn('DATE_TRUNC', 'month', col('expenseDate'))],
      order: [[fn('DATE_TRUNC', 'month', col('expenseDate')), 'ASC']],
      raw: true
    });

    const pa = parseInt(periodsAhead);

    res.json({
      success: true,
      data: {
        revenue: {
          historical: monthlyRevenue,
          forecast: generateForecast(monthlyRevenue.map(r => ({ period: r.period, value: parseFloat(r.value) || 0 })), pa)
        },
        members: {
          historical: monthlyMembers,
          forecast: generateForecast(monthlyMembers.map(m => ({ period: m.period, value: parseInt(m.value) || 0 })), pa)
        },
        attendance: {
          historical: monthlyCheckIns,
          forecast: generateForecast(monthlyCheckIns.map(c => ({ period: c.period, value: parseInt(c.value) || 0 })), pa)
        },
        expenses: {
          historical: monthlyExpenses,
          forecast: generateForecast(monthlyExpenses.map(e => ({ period: e.period, value: parseFloat(e.value) || 0 })), pa)
        },
        metadata: {
          basedOnMonths: parseInt(months),
          forecastPeriods: pa
        }
      },
      filters: { months, periodsAhead }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRevenueForecast,
  getMemberForecast,
  getAttendanceForecast,
  getExpenseForecast,
  getComprehensiveForecast
};
