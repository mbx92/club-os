/**
 * Forecasting Report Routes
 * Mount path: /reports/forecasting
 */
const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/permissionMiddleware');
const {
  getRevenueForecast,
  getMemberForecast,
  getAttendanceForecast,
  getExpenseForecast,
  getComprehensiveForecast
} = require('../../controllers/reports');

const router = express.Router();

/**
 * @route GET /reports/forecasting/revenue
 * @desc Revenue forecast using linear regression
 * @query months (lookback, default 6), periodsAhead (default 3), transactionType
 * @access Private (read Transaction)
 */
router.get('/revenue',
  authenticate,
  authorize('read', 'Transaction'),
  getRevenueForecast
);

/**
 * @route GET /reports/forecasting/members
 * @desc Member growth forecast
 * @query months (lookback, default 12), periodsAhead (default 3)
 * @access Private (read Member)
 */
router.get('/members',
  authenticate,
  authorize('read', 'Member'),
  getMemberForecast
);

/**
 * @route GET /reports/forecasting/attendance
 * @desc Check-in attendance forecast
 * @query months (lookback, default 6), periodsAhead (default 3)
 * @access Private (read CheckIn)
 */
router.get('/attendance',
  authenticate,
  authorize('read', 'CheckIn'),
  getAttendanceForecast
);

/**
 * @route GET /reports/forecasting/expenses
 * @desc Expense forecast
 * @query months (lookback, default 6), periodsAhead (default 3)
 * @access Private (read Expense)
 */
router.get('/expenses',
  authenticate,
  authorize('read', 'Expense'),
  getExpenseForecast
);

/**
 * @route GET /reports/forecasting/comprehensive
 * @desc Combined forecast for all key metrics (revenue, members, attendance, expenses)
 * @query months (lookback, default 6), periodsAhead (default 3)
 * @access Private (read Transaction)
 */
router.get('/comprehensive',
  authenticate,
  authorize('read', 'Transaction'),
  getComprehensiveForecast
);

module.exports = router;
