const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../middlewares/caslMiddleware');
const { requireModule } = require('../../middlewares/featureGateMiddleware');
const auditLog = require('../../middlewares/auditMiddleware');
const {
  createPettyCash,
  getAllPettyCash,
  getPettyCashById,
  updatePettyCash,
  deletePettyCash,
  topUpPettyCash,
  payExpenseFromPettyCash,
  addSalesReturnToPettyCash,
  adjustPettyCash,
  withdrawPettyCash,
  getPettyCashTransactions,
  getPettyCashSummary
} = require('../../controllers/finance');

const router = express.Router();

// Semua petty cash routes memerlukan autentikasi dan modul 'finance' aktif di subscription
router.use(authenticate, requireModule('finance'));

// ==========================================
// SUMMARY (must be before /:id routes)
// ==========================================

/**
 * @route GET /finance/petty-cash/summary
 * @desc Get summary of all petty cash funds
 * @access Private (read PettyCash)
 */
router.get('/summary',
  authorizeCasl('read', 'PettyCash'),
  getPettyCashSummary
);

// ==========================================
// CRUD OPERATIONS
// ==========================================

/**
 * @route POST /finance/petty-cash
 * @desc Create new petty cash fund (modal awal)
 * @access Private (create PettyCash)
 */
router.post('/',
  authorizeCasl('create', 'PettyCash'),
  createPettyCash,
  auditLog('CREATE_PETTY_CASH')
);

/**
 * @route GET /finance/petty-cash
 * @desc Get all petty cash funds
 * @access Private (read PettyCash)
 */
router.get('/',
  authorizeCasl('read', 'PettyCash'),
  getAllPettyCash
);

/**
 * @route GET /finance/petty-cash/:id
 * @desc Get petty cash fund by ID with recent transactions
 * @access Private (read PettyCash)
 */
router.get('/:id',
  authorizeCasl('read', 'PettyCash'),
  getPettyCashById
);

/**
 * @route PUT /finance/petty-cash/:id
 * @desc Update petty cash fund info
 * @access Private (update PettyCash)
 */
router.put('/:id',
  authorizeCasl('update', 'PettyCash'),
  updatePettyCash,
  auditLog('UPDATE_PETTY_CASH')
);

/**
 * @route DELETE /finance/petty-cash/:id
 * @desc Delete petty cash fund
 * @access Private (delete PettyCash)
 */
router.delete('/:id',
  authorizeCasl('delete', 'PettyCash'),
  deletePettyCash,
  auditLog('DELETE_PETTY_CASH')
);

// ==========================================
// FUND OPERATIONS
// ==========================================

/**
 * @route POST /finance/petty-cash/:id/top-up
 * @desc Top up (add funds to) petty cash
 * @access Private (update PettyCash)
 */
router.post('/:id/top-up',
  authorizeCasl('update', 'PettyCash'),
  topUpPettyCash,
  auditLog('TOP_UP_PETTY_CASH')
);

/**
 * @route POST /finance/petty-cash/:id/expense
 * @desc Use petty cash to pay an expense
 * @access Private (update PettyCash)
 */
router.post('/:id/expense',
  authorizeCasl('update', 'PettyCash'),
  payExpenseFromPettyCash,
  auditLog('PAY_EXPENSE_PETTY_CASH')
);

/**
 * @route POST /finance/petty-cash/:id/sales-return
 * @route POST /finance/petty-cash/:id/income (backward compat)
 * Pengembalian modal petty cash dari hasil penjualan shift.
 * @desc Return funds from sales to petty cash
 * @access Private (update PettyCash)
 */
// Route utama
router.post('/:id/sales-return',
  authorizeCasl('update', 'PettyCash'),
  addSalesReturnToPettyCash,
  auditLog('SALES_RETURN_PETTY_CASH')
);
// Backward compat alias
router.post('/:id/income',
  authorizeCasl('update', 'PettyCash'),
  addSalesReturnToPettyCash,
  auditLog('SALES_RETURN_PETTY_CASH')
);

/**
 * @route POST /finance/petty-cash/:id/adjustment
 * @desc Make balance adjustment to petty cash
 * @access Private (update PettyCash)
 */
router.post('/:id/adjustment',
  authorizeCasl('update', 'PettyCash'),
  adjustPettyCash,
  auditLog('ADJUST_PETTY_CASH')
);

/**
 * @route POST /finance/petty-cash/:id/withdrawal
 * @desc Withdraw from petty cash
 * @access Private (update PettyCash)
 */
router.post('/:id/withdrawal',
  authorizeCasl('update', 'PettyCash'),
  withdrawPettyCash,
  auditLog('WITHDRAW_PETTY_CASH')
);

// ==========================================
// TRANSACTION HISTORY
// ==========================================

/**
 * @route GET /finance/petty-cash/:id/transactions
 * @desc Get petty cash transaction history
 * @access Private (read PettyCash)
 */
router.get('/:id/transactions',
  authorizeCasl('read', 'PettyCash'),
  getPettyCashTransactions
);

module.exports = router;
