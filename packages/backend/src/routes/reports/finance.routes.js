/**
 * Finance Report Routes (Reports Module)
 * Mount path: /reports/finance
 */
const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../middlewares/caslMiddleware');
const {
  getRevenueReport,
  getProfitLossReport,
  getCashFlowReport,
  getShareholderReport
} = require('../../controllers/reports/financeReportController');

const router = express.Router();

/**
 * @route GET /reports/finance/revenue
 * @desc Comprehensive revenue report with module breakdown
 * @query startDate, endDate, groupBy (daily|weekly|monthly|yearly)
 * @access Private (read Transaction)
 */
router.get('/revenue',
  authenticate,
  authorizeCasl('read', 'Transaction'),
  getRevenueReport
);

/**
 * @route GET /reports/finance/profit-loss
 * @desc Profit & Loss statement
 * @query startDate, endDate, groupBy (daily|weekly|monthly|yearly)
 * @access Private (read Transaction)
 */
router.get('/profit-loss',
  authenticate,
  authorizeCasl('read', 'Transaction'),
  getProfitLossReport
);

/**
 * @route GET /reports/finance/cash-flow
 * @desc Cash flow summary report
 * @query startDate, endDate, groupBy (daily|weekly|monthly|yearly)
 * @access Private (read CashFlow)
 */
router.get('/cash-flow',
  authenticate,
  authorizeCasl('read', 'CashFlow'),
  getCashFlowReport
);

/**
 * @route GET /reports/finance/shareholder
 * @desc Shareholder revenue distribution report (waterfall: revenue - petty cash - salaries - expenses)
 * @query startDate (required), endDate (required)
 * @query shareholders - optional JSON: [{"name":"Owner A","percentage":60},{"name":"Owner B","percentage":40}]
 * @access Private (read Transaction)
 */
router.get('/shareholder',
  authenticate,
  authorizeCasl('read', 'Transaction'),
  getShareholderReport
);

module.exports = router;
