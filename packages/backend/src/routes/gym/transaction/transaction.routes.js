const express = require('express');
const router = express.Router();
const transactionController = require('../../../controllers/gym/transaction/transactionController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { checkSubscription } = require('../../../middlewares/subscriptionMiddleware');
const { requireFeature } = require('../../../middlewares/featureGateMiddleware');
const { requireActiveShift } = require('../../../middlewares/shiftMiddleware');

// All routes require authentication and active subscription
router.use(authenticate);
router.use(checkSubscription);

/**
 * @route   POST /api/transactions
 * @desc    Create a new transaction
 * @access  Private — requires an open cash register shift
 */
router.post('/', requireActiveShift({ byLocation: true }), transactionController.createTransaction);

/**
 * @route   GET /api/transactions
 * @desc    Get all transactions for a tenant
 * @access  Private
 */
router.get('/', transactionController.getAllTransactions);

/**
 * @route   GET /api/transactions/statistics
 * @desc    Get transaction statistics for a tenant
 * @access  Private
 */
router.get('/statistics', transactionController.getTransactionStatistics);

/**
 * @route   GET /api/transactions/:id
 * @desc    Get a transaction by ID
 * @access  Private
 */
router.get('/:id', transactionController.getTransactionById);

/**
 * @route   PUT /api/transactions/:id/status
 * @desc    Update a transaction status
 * @access  Private
 */
router.put('/:id/status', transactionController.updateTransactionStatus);

// ========== FEATURE-GATED ROUTES (NEW) ==========

/**
 * @route   POST /api/transactions/combined
 * @desc    Create combined transaction (membership + POS + restaurant in one bill)
 * @access  Private (requires 'combinedBilling' feature)
 */
router.post('/combined',
  requireFeature('transactions', 'combinedBilling'),
  async (req, res) => {
    // Placeholder - implementation coming in Fase 6
    res.json({
      success: true,
      message: 'Combined billing - implementation coming in Fase 6',
      data: null
    });
  }
);

/**
 * @route   POST /api/transactions/:id/installment
 * @desc    Create installment payment for transaction
 * @access  Private (requires 'installments' feature)
 */
router.post('/:id/installment',
  requireFeature('transactions', 'installments'),
  async (req, res) => {
    // Placeholder - implementation coming in future phase
    res.json({
      success: true,
      message: 'Installment payment - implementation coming soon',
      data: null
    });
  }
);

/**
 * @route   POST /api/transactions/:id/cancel
 * @desc    Cancel transaction due to wrong input (void transaction)
 * @access  Private (requires 'refunds' feature)
 * @body    notes - Cancellation reason (required)
 */
router.post('/:id/cancel',
  requireFeature('transactions', 'refunds'),
  transactionController.cancelTransaction
);

/**
 * @route   POST /api/transactions/:id/refund
 * @desc    Process full refund for transaction (cancels all services)
 * @access  Private (requires 'refunds' feature)
 */
router.post('/:id/refund',
  requireFeature('transactions', 'refunds'),
  transactionController.refundTransaction
);

/**
 * @route   POST /api/transactions/:id/refund-items
 * @desc    Partial refund — refund selected items only. Cancels linked active services.
 *          Transaction status becomes 'partially_refunded' or 'refunded'.
 * @access  Private (requires 'refunds' feature)
 * @body    itemIds[] - Array of TransactionItem UUIDs to refund
 * @body    notes - Refund reason (required)
 */
router.post('/:id/refund-items',
  requireFeature('transactions', 'refunds'),
  transactionController.refundItems
);

/**
 * @route   POST /api/transactions/:id/pre-print
 * @name    transactions.prePrintPayment
 * @desc    Pre-print payment receipt (bill/invoice) to thermal printer
 * @access  Private
 * @params  id - Transaction UUID
 */
router.post('/:id/pre-print',
  transactionController.prePrintPayment
);

/**
 * @route   POST /api/transactions/:id/split-bill
 * @name    transactions.splitBillByItem
 * @desc    Split bill per item — divide one transaction into multiple bills by selected items.
 *          Each split creates a new transaction. Original is marked as 'split'.
 * @access  Private (requires 'splitPayment' feature)
 * @params  id - Transaction UUID
 * @body    splits[] - Array of { itemIds: [uuid], customerName?, notes? }
 */
router.post('/:id/split-bill',
  requireFeature('transactions', 'splitPayment'),
  transactionController.splitBillByItem
);

module.exports = router;
