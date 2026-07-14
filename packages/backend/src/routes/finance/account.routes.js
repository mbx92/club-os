const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/permissionMiddleware');
const { requireModule } = require('../../middlewares/featureGateMiddleware');
const auditLog = require('../../middlewares/auditMiddleware');
const {
  createAccount,
  getAllAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
  getAccountEntries,
  getAccountBalance,
  createAdjustment,
  transferBetweenAccounts,
  processSettlements,
} = require('../../controllers/finance/accountController');

const router = express.Router();

router.use(authenticate, requireModule('finance'));

// ─── Special actions (before /:id) ───────────────────────────────────────────

router.post('/process-settlements',
  authorize('update', 'Account'),
  processSettlements
);

router.post('/transfer',
  authorize('update', 'Account'),
  transferBetweenAccounts,
  auditLog('ACCOUNT_TRANSFER')
);

// ─── CRUD ─────────────────────────────────────────────────────────────────────

router.get('/',
  authorize('read', 'Account'),
  getAllAccounts
);

router.post('/',
  authorize('create', 'Account'),
  createAccount,
  auditLog('CREATE_ACCOUNT')
);

router.get('/:id',
  authorize('read', 'Account'),
  getAccountById
);

router.put('/:id',
  authorize('update', 'Account'),
  updateAccount,
  auditLog('UPDATE_ACCOUNT')
);

router.delete('/:id',
  authorize('delete', 'Account'),
  deleteAccount,
  auditLog('DELETE_ACCOUNT')
);

// ─── Account-scoped sub-resources ────────────────────────────────────────────

router.get('/:id/entries',
  authorize('read', 'Account'),
  getAccountEntries
);

router.get('/:id/balance',
  authorize('read', 'Account'),
  getAccountBalance
);

router.post('/:id/adjustment',
  authorize('update', 'Account'),
  createAdjustment,
  auditLog('ACCOUNT_ADJUSTMENT')
);

module.exports = router;
