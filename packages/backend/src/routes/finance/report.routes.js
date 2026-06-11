const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/permissionMiddleware');
const {
  getProfitLossReport,
  getRevenueReport,
  getExpenseReport
} = require('../../controllers/finance');

const router = express.Router();

/**
 * @route GET /finance/reports/profit-loss
 * @desc Get Profit & Loss report
 * @access Private (read Transaction, Expense)
 */
router.get('/profit-loss',
  authenticate,
  authorize('read', 'Transaction'),
  getProfitLossReport
);

/**
 * @route GET /finance/reports/revenue
 * @desc Get Revenue report
 * @access Private (read Transaction)
 */
router.get('/revenue',
  authenticate,
  authorize('read', 'Transaction'),
  getRevenueReport
);

/**
 * @route GET /finance/reports/expenses
 * @desc Get Expense report
 * @access Private (read Expense)
 */
router.get('/expenses',
  authenticate,
  authorize('read', 'Expense'),
  getExpenseReport
);

module.exports = router;
