const express = require('express');
const router = express.Router();
const transactionController = require('../../../controllers/gym/transaction/transactionController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const { autoAuthorize } = require('../../../middlewares/autoAuthorizeMiddleware');
const { requireFeature } = require('../../../middlewares/featureGateMiddleware');
const { requireActiveShift } = require('../../../middlewares/shiftMiddleware');

// All routes require authentication + auto-authorization from ROUTE_TO_SUBJECT_MAP
router.use(authenticate);
router.use(autoAuthorize);

/**
 * @route   POST /api/transactions
 * @desc    Create a new transaction
 * @access  Private — requires an open cash register shift
 */
router.post('/', authorize('create', 'Transaction'), requireActiveShift({ byLocation: true }), transactionController.createTransaction);

/**
 * @route   GET /api/transactions
 * @desc    Get all transactions for a tenant
 * @access  Private
 */
router.get('/', authorize('read', 'Transaction'), transactionController.getAllTransactions);

/**
 * @route   GET /api/transactions/statistics
 * @desc    Get transaction statistics for a tenant
 * @access  Private
 */
router.get('/statistics', authorize('read', 'Transaction'), transactionController.getTransactionStatistics);

/**
 * @route   GET /api/transactions/:id
 * @desc    Get a transaction by ID
 * @access  Private
 */
router.get('/:id', authorize('read', 'Transaction'), transactionController.getTransactionById);

/**
 * @route   PUT /api/transactions/:id/status
 * @desc    Update a transaction status
 * @access  Private
 */
router.put('/:id/status', authorize('update', 'Transaction'), transactionController.updateTransactionStatus);

// ========== FEATURE-GATED ROUTES (NEW) ==========

/**
 * @route   POST /api/transactions/combined
 * @desc    Create combined transaction (membership + POS + restaurant in one bill)
 * @access  Private (requires 'combinedBilling' feature)
 */
router.post('/combined',
  authorize('create', 'Transaction'),
  requireFeature('combinedBilling'),
  async (req, res) => {
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
  authorize('update', 'Transaction'),
  requireFeature('installments'),
  async (req, res) => {
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
 */
router.post('/:id/cancel',
  authorize('update', 'Transaction'),
  requireFeature('refunds'),
  transactionController.cancelTransaction
);

/**
 * @route   POST /api/transactions/:id/refund
 * @desc    Process full refund for transaction (cancels all services)
 * @access  Private (requires 'refunds' feature)
 */
router.post('/:id/refund',
  authorize('update', 'Transaction'),
  requireFeature('refunds'),
  transactionController.refundTransaction
);

/**
 * @route   POST /api/transactions/:id/refund-items
 * @desc    Partial refund — refund selected items only. Cancels linked active services.
 * @access  Private (requires 'refunds' feature)
 */
router.post('/:id/refund-items',
  authorize('update', 'Transaction'),
  requireFeature('refunds'),
  transactionController.refundItems
);

/**
 * @route   POST /api/transactions/:id/pre-print
 * @name    transactions.prePrintPayment
 * @desc    Pre-print payment receipt (bill/invoice) to thermal printer
 * @access  Private
 */
router.post('/:id/pre-print',
  authorize('read', 'Transaction'),
  transactionController.prePrintPayment
);

/**
 * @route   POST /api/transactions/:id/split-bill
 * @name    transactions.splitBillByItem
 * @desc    Split bill per item — divide one transaction into multiple bills by selected items.
 * @access  Private (requires 'splitPayment' feature)
 */
router.post('/:id/split-bill',
  authorize('update', 'Transaction'),
  requireFeature('splitPayment'),
  transactionController.splitBillByItem
);

module.exports = router;
