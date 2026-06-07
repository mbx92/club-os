const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../middlewares/caslMiddleware');
const {
  getCashFlowSummary,
  getCashFlowByCategory,
  getCashFlowProjection,
  getCashFlowStatement,
} = require('../../controllers/finance');

const router = express.Router();

/**
 * @route GET /finance/cash-flow/summary
 * @desc Get cash flow summary with period breakdown
 * @access Private (read CashFlow)
 */
router.get('/summary',
  authenticate,
  authorizeCasl('read', 'CashFlow'),
  getCashFlowSummary
);

/**
 * @route GET /finance/cash-flow/by-category
 * @desc Get cash flow breakdown by category
 * @access Private (read CashFlow)
 */
router.get('/by-category',
  authenticate,
  authorizeCasl('read', 'CashFlow'),
  getCashFlowByCategory
);

/**
 * @route GET /finance/cash-flow/projection
 * @desc Get cash flow projections based on historical data
 * @access Private (read CashFlow)
 */
router.get('/projection',
  authenticate,
  authorizeCasl('read', 'CashFlow'),
  getCashFlowProjection
);

/**
 * @route GET /finance/cash-flow/statement
 * @desc  Detailed per-period cashflow statement (inflows by type & payment method,
 *        outflows by expense category, net flow, running balance)
 * @query startDate*, endDate*, groupBy (day|week|month), locationId, includeItems
 * @access Private (read CashFlow)
 */
router.get('/statement',
  authenticate,
  authorizeCasl('read', 'CashFlow'),
  getCashFlowStatement
);

module.exports = router;
