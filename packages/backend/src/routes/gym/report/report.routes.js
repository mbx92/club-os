const express = require('express');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');
const auditLog = require('../../../middlewares/auditMiddleware');
const {
  getRevenueReport,
  getProfitLossReport,
  getAttendanceReport,
  getServiceStatusReport,
  getTrainerCommissionReport,
  getServiceCommissionIncomeReport
} = require('../../../controllers/gym/report/reportController');

const router = express.Router();

/**
 * @route GET /gym/reports/revenue
 * @name gymReports.revenue
 * @desc Get gym revenue report with breakdown by period and service type
 * @access Private
 * @query startDate, endDate, groupBy, serviceType, locationId
 */
router.get('/revenue',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'Transaction'),
  auditLog('GYM_REVENUE_REPORT'),
  getRevenueReport
);

/**
 * @route GET /gym/reports/profit-loss
 * @name gymReports.profitLoss
 * @desc Get gym profit & loss report
 * @access Private
 * @query startDate, endDate, groupBy
 */
router.get('/profit-loss',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'Transaction'),
  auditLog('GYM_PROFIT_LOSS_REPORT'),
  getProfitLossReport
);

/**
 * @route GET /gym/reports/attendance
 * @name gymReports.attendance
 * @desc Get gym attendance report with check-in statistics
 * @access Private
 * @query startDate, endDate, groupBy, locationId
 */
router.get('/attendance',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'CheckIn'),
  auditLog('GYM_ATTENDANCE_REPORT'),
  getAttendanceReport
);

/**
 * @route GET /gym/reports/service-status
 * @name gymReports.serviceStatus
 * @desc Get service plan status report with expiring and low session alerts
 * @access Private
 * @query status, serviceType
 */
router.get('/service-status',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'ActiveService'),
  auditLog('GYM_SERVICE_STATUS_REPORT'),
  getServiceStatusReport
);

/**
 * @route GET /gym/reports/trainer-commissions
 * @name gymReports.trainerCommissions
 * @desc Get trainer commission report for all trainers
 * @access Private
 * @query startDate, endDate, status, trainerId, groupBy, sortBy, sortOrder
 * @feature Requires trainerCommission feature
 */
router.get('/trainer-commissions',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'TrainerCommission'),
  auditLog('GYM_TRAINER_COMMISSION_REPORT'),
  getTrainerCommissionReport
);

/**
 * @route GET /gym/reports/service-commission-income
 * @name gymReports.serviceCommissionIncome
 * @desc Laporan pendapatan komisi dari active service: baseAmount, komisi trainer, dan pendapatan bersih bisnis
 * @access Private
 * @query startDate, endDate, status, trainerId, serviceType, groupBy, sortBy, sortOrder
 * @feature Requires trainerCommission feature
 */
router.get('/service-commission-income',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'TrainerCommission'),
  auditLog('GYM_SERVICE_COMMISSION_INCOME_REPORT'),
  getServiceCommissionIncomeReport
);

module.exports = router;
