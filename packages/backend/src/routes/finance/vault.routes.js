const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/permissionMiddleware');
const {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getSummary,
  getCollectibles,
  collectToVault,
  getMutations,
  transferBetweenAccounts,
  adjustVault,
} = require('../../controllers/finance/vaultController');

const router = express.Router();

// ── Vault Account CRUD ────────────────────────────────────────────────────────

/**
 * @route GET /finance/vault/accounts
 * @desc List all vault accounts
 * @access Private
 */
router.get('/accounts',
  authenticate,
  authorize('read', 'Finance'),
  getAccounts
);

/**
 * @route POST /finance/vault/accounts
 * @desc Create a new vault account
 * @access Private
 */
router.post('/accounts',
  authenticate,
  authorize('create', 'Finance'),
  createAccount
);

/**
 * @route PUT /finance/vault/accounts/:id
 * @desc Update a vault account
 * @access Private
 */
router.put('/accounts/:id',
  authenticate,
  authorize('update', 'Finance'),
  updateAccount
);

/**
 * @route DELETE /finance/vault/accounts/:id
 * @desc Soft-delete a vault account
 * @access Private
 */
router.delete('/accounts/:id',
  authenticate,
  authorize('delete', 'Finance'),
  deleteAccount
);

// ── Vault Operations ─────────────────────────────────────────────────────────

/**
 * @route GET /finance/vault/summary
 * @desc Vault summary: balances, totals, pending sessions
 * @access Private
 */
router.get('/summary',
  authenticate,
  authorize('read', 'Finance'),
  getSummary
);

/**
 * @route GET /finance/vault/collectibles
 * @desc List closed cash register sessions with remaining collectible amounts
 * @access Private
 */
router.get('/collectibles',
  authenticate,
  authorize('read', 'Finance'),
  getCollectibles
);

/**
 * @route POST /finance/vault/collect
 * @desc Collect cash from drawer sessions to vault account
 * @access Private
 */
router.post('/collect',
  authenticate,
  authorize('create', 'Finance'),
  collectToVault
);

/**
 * @route GET /finance/vault/mutations
 * @desc Vault mutation ledger with filters
 * @access Private
 */
router.get('/mutations',
  authenticate,
  authorize('read', 'Finance'),
  getMutations
);

/**
 * @route POST /finance/vault/transfer
 * @desc Transfer between vault accounts
 * @access Private
 */
router.post('/transfer',
  authenticate,
  authorize('create', 'Finance'),
  transferBetweenAccounts
);

/**
 * @route POST /finance/vault/adjust
 * @desc Adjust vault account balance (positive or negative)
 * @access Private
 */
router.post('/adjust',
  authenticate,
  authorize('update', 'Finance'),
  adjustVault
);

module.exports = router;
