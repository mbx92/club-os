const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../middlewares/caslMiddleware');
const {
  getFinanceDashboard,
  getFinanceDashboardOverview,
  getFinanceSummaryCards
} = require('../../controllers/finance');

const router = express.Router();

/**
 * @route  GET /finance/dashboard
 * @desc   Finance dashboard — KPI cards, revenue trends, expense breakdown,
 *         payment methods, recent transactions, session summary
 * @query  locationId, timezone
 * @access Private (read Transaction)
 */
router.get(
  '/',
  authenticate,
  authorizeCasl('read', 'Transaction'),
  getFinanceDashboard
);

/**
 * @route GET /finance/dashboard/overview
 * @desc Get full finance dashboard overview with revenue, expenses, profit, trends
 * @access Private (read Transaction)
 */
router.get('/overview',
  authenticate,
  authorizeCasl('read', 'Transaction'),
  getFinanceDashboardOverview
);

/**
 * @route GET /finance/dashboard/summary-cards
 * @desc Get quick KPI summary cards (today, this week, this month)
 * @access Private (read Transaction)
 */
router.get('/summary-cards',
  authenticate,
  authorizeCasl('read', 'Transaction'),
  getFinanceSummaryCards
);

module.exports = router;
