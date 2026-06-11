const express = require('express');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');
const auditLog = require('../../../middlewares/auditMiddleware');
const {
  getDashboardOverview,
  getDashboardStats,
  getGymComprehensive,
  getPettyCashDashboard,
} = require('../../../controllers/gym/report/dashboardController');
const cashRegisterController = require('../../../controllers/gym/cashRegister/cashRegisterController');

const router = express.Router();

/**
 * @route GET /gym/dashboard/overview
 * @name gymDashboard.overview
 * @desc Get comprehensive gym dashboard overview with revenue, members, attendance
 * @access Private
 * @query locationId
 */
router.get('/overview',
  authenticate,
  requireModule('gym'),
  authorize('read', 'Transaction'),
  auditLog('GYM_DASHBOARD_OVERVIEW'),
  getDashboardOverview
);

/**
 * @route GET /gym/dashboard/stats
 * @name gymDashboard.stats
 * @desc Get simplified gym dashboard statistics
 * @access Private
 */
router.get('/stats',
  authenticate,
  requireModule('gym'),
  authorize('read', 'Member'),
  auditLog('GYM_DASHBOARD_STATS'),
  getDashboardStats
);

/**
 * @route GET /gym/dashboard/comprehensive
 * @name gymDashboard.comprehensive
 * @desc Get comprehensive all-in-one gym dashboard
 * @access Private
 * @query locationId
 */
router.get('/comprehensive',
  authenticate,
  requireModule('gym'),
  authorize('read', 'Transaction'),
  auditLog('GYM_DASHBOARD_COMPREHENSIVE'),
  getGymComprehensive
);

/**
 * @route GET /gym/dashboard/petty-cash
 * @name gymDashboard.pettyCash
 * @desc Dashboard petty cash — sesi shift aktif, ringkasan hari ini, riwayat 7 hari, detail transaksi
 * @access Private
 * @query locationId, date (YYYY-MM-DD, default: today), sessionId (optional: untuk lihat detail transaksi session tertentu)
 */
router.get('/petty-cash',
  authenticate,
  requireModule('gym'),
  authorize('read', 'CashRegisterSession'),
  getPettyCashDashboard
);

/**
 * @route POST /gym/dashboard/petty-cash/print-shift-report
 * @name gymDashboard.printShiftReport
 * @desc Print thermal receipt for cashier shift report
 * @access Private
 * @body sessionId (required) - ID of cash register session to print
 */
router.post('/petty-cash/print-shift-report',
  authenticate,
  requireModule('gym'),
  authorize('read', 'CashRegisterSession'),
  auditLog('PRINT_SHIFT_REPORT'),
  cashRegisterController.printShiftReport
);

/**
 * @route GET /gym/dashboard/petty-cash/daily-report
 * @name gymDashboard.dailyReport
 * @desc Get daily summary report — Report Gym (membership breakdown) + Report Cashier (sales breakdown)
 * @access Private
 * @query date (YYYY-MM-DD, default: today), type (all|cashier|gym, default: all), locationId (optional)
 */
router.get('/petty-cash/daily-report',
  authenticate,
  requireModule('gym'),
  authorize('read', 'CashRegisterSession'),
  cashRegisterController.getDailyReport
);

/**
 * @route POST /gym/dashboard/petty-cash/print-daily-report
 * @name gymDashboard.printDailyReport
 * @desc Print daily summary report to thermal printer — Report Gym + Report Cashier
 * @access Private
 * @body date (YYYY-MM-DD, default: today), type (all|cashier|gym, default: all), locationId (optional)
 */
router.post('/petty-cash/print-daily-report',
  authenticate,
  requireModule('gym'),
  authorize('read', 'CashRegisterSession'),
  auditLog('PRINT_DAILY_REPORT'),
  cashRegisterController.printDailyReport
);

module.exports = router;
