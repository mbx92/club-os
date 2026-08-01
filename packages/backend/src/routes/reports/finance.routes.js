/**
 * Finance Report Routes (Reports Module)
 * Mount path: /reports/finance
 */
const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/permissionMiddleware');
const {
  getRevenueReport,
  getProfitLossReport,
  getCashFlowReport,
  getShareholderReport,
  getAccountsReport,
  getAccountTransactionsReport,
  getTransactionDetailsReport,
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
  authorize('read', 'Transaction'),
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
  authorize('read', 'Transaction'),
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
  authorize('read', 'CashFlow'),
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
  authorize('read', 'Transaction'),
  getShareholderReport
);

/**
 * @route GET /reports/finance/accounts
 * @desc Account balances & period movement summary
 */
router.get('/accounts',
  authenticate,
  authorize('read', 'FinancialReport'),
  getAccountsReport
);

/**
 * @route GET /reports/finance/account-transactions
 * @desc Account ledger / mutasi report
 */
router.get('/account-transactions',
  authenticate,
  authorize('read', 'FinancialReport'),
  getAccountTransactionsReport
);

/**
 * @route GET /reports/finance/transaction-details
 * @desc Detail transaksi gym + restaurant (subtotal / service charge / tax / total)
 */
router.get('/transaction-details',
  authenticate,
  authorize('read', 'FinancialReport'),
  getTransactionDetailsReport
);

module.exports = router;
