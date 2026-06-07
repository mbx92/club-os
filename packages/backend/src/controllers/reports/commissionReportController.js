/**
 * Commission Report Controller
 * Reports: trainer commission summary, commission by period, top earners
 */
const { TrainerCommission, Trainer, Transaction, sequelize } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');
const { generateForecast } = require('../../utils/forecasting');
const logger = require('../../utils/logger');

/**
 * GET /reports/commissions/summary
 * Commission summary with breakdown by trainer
 */
async function getCommissionSummary(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, status } = req.query;

    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) where.createdAt[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
    }

    // By trainer
    const byTrainer = await TrainerCommission.findAll({
      where,
      include: [{
        model: Trainer,
        as: 'trainer',
        attributes: ['firstName', 'lastName', 'commissionType', 'commissionValue']
      }],
      attributes: [
        'trainerId',
        [fn('COUNT', col('TrainerCommission.id')), 'transactionCount'],
        [fn('SUM', col('baseAmount')), 'totalBaseAmount'],
        [fn('SUM', col('commissionAmount')), 'totalCommission'],
        [fn('AVG', col('commissionAmount')), 'avgCommission']
      ],
      group: ['trainerId', 'trainer.id', 'trainer.firstName', 'trainer.lastName', 'trainer.commissionType', 'trainer.commissionValue'],
      order: [[fn('SUM', col('commissionAmount')), 'DESC']],
      raw: true,
      nest: true
    });

    // Status breakdown
    const whereNoStatus = { ...where };
    delete whereNoStatus.status;
    const statusBreakdown = await TrainerCommission.findAll({
      where: whereNoStatus,
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('commissionAmount')), 'total']
      ],
      group: ['status'],
      raw: true
    });

    // Grand totals
    const totalCommission = byTrainer.reduce((sum, t) => sum + (parseFloat(t.totalCommission) || 0), 0);
    const totalBase = byTrainer.reduce((sum, t) => sum + (parseFloat(t.totalBaseAmount) || 0), 0);
    const pendingAmount = statusBreakdown.find(s => s.status === 'pending');
    const paidAmount = statusBreakdown.find(s => s.status === 'paid');

    res.json({
      success: true,
      data: {
        summary: {
          totalBaseAmount: totalBase,
          totalCommission,
          avgCommissionRate: totalBase > 0 ? Math.round((totalCommission / totalBase) * 10000) / 100 : 0,
          pendingAmount: parseFloat(pendingAmount?.total) || 0,
          paidAmount: parseFloat(paidAmount?.total) || 0
        },
        byTrainer,
        statusBreakdown
      },
      filters: { startDate, endDate, status }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/commissions/trends
 * Commission trends over time
 */
async function getCommissionTrends(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, groupBy = 'monthly' } = req.query;

    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) where.createdAt[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
    }

    const dateTruncMap = { daily: 'day', weekly: 'week', monthly: 'month' };
    const trunc = dateTruncMap[groupBy] || 'month';

    const trends = await TrainerCommission.findAll({
      where,
      attributes: [
        [fn('DATE_TRUNC', trunc, col('createdAt')), 'period'],
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('commissionAmount')), 'totalCommission'],
        [fn('SUM', col('baseAmount')), 'totalBase'],
        [fn('COUNT', fn('DISTINCT', col('trainerId'))), 'uniqueTrainers']
      ],
      group: [fn('DATE_TRUNC', trunc, col('createdAt'))],
      order: [[fn('DATE_TRUNC', trunc, col('createdAt')), 'ASC']],
      raw: true
    });

    // Forecast
    const forecastData = trends.map(t => ({ period: t.period, value: parseFloat(t.totalCommission) || 0 }));
    const forecast = generateForecast(forecastData, 3);

    res.json({
      success: true,
      data: { trends, forecast },
      filters: { startDate, endDate, groupBy }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/commissions/by-trainer/:trainerId
 * Detailed commission report for a specific trainer
 */
async function getTrainerCommissionDetail(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { trainerId } = req.params;
    const { startDate, endDate, status, page = 1, limit = 20 } = req.query;

    const where = { trainerId };
    if (!isSuperAdmin) where.tenantId = tenantId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) where.createdAt[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await TrainerCommission.findAndCountAll({
      where,
      include: [
        {
          model: Trainer,
          as: 'trainer',
          attributes: ['firstName', 'lastName', 'commissionType', 'commissionValue']
        },
        {
          model: Transaction,
          as: 'transaction',
          attributes: ['transactionNumber', 'transactionDate', 'totalAmount', 'transactionType']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset
    });

    // Summary for this trainer in period
    const trainerSummary = await TrainerCommission.findOne({
      where,
      attributes: [
        [fn('COUNT', col('id')), 'totalTransactions'],
        [fn('SUM', col('commissionAmount')), 'totalCommission'],
        [fn('SUM', col('baseAmount')), 'totalBase']
      ],
      raw: true
    });

    const totalPages = Math.ceil(count / limitNum);

    res.json({
      success: true,
      data: {
        summary: {
          totalTransactions: parseInt(trainerSummary?.totalTransactions) || 0,
          totalCommission: parseFloat(trainerSummary?.totalCommission) || 0,
          totalBase: parseFloat(trainerSummary?.totalBase) || 0
        },
        commissions: rows
      },
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalRecords: count,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      filters: { startDate, endDate, status, trainerId }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCommissionSummary,
  getCommissionTrends,
  getTrainerCommissionDetail
};
