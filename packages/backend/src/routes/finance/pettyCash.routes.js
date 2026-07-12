'use strict';

/**
 * Petty Cash routes — DEPRECATED
 *
 * UI and menu access have been removed. Use Account (type=petty_cash / Modal)
 * via /finance/accounts instead.
 *
 * Write endpoints return 410 Gone. Read endpoints remain for legacy references.
 */

const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/permissionMiddleware');
const { requireModule } = require('../../middlewares/featureGateMiddleware');
const {
  getAllPettyCash,
  getPettyCashById,
  getPettyCashTransactions,
  getPettyCashSummary
} = require('../../controllers/finance');

const router = express.Router();

const deprecatedWrite = (req, res) => {
  return res.status(410).json({
    success: false,
    code: 'PETTY_CASH_DEPRECATED',
    message: 'Modul Petty Cash sudah tidak digunakan. Gunakan Akun Keuangan (tipe Petty Cash / Modal) di /finance/accounts.',
  });
};

router.use(authenticate, requireModule('finance'));

router.get('/summary', authorize('read', 'PettyCash'), getPettyCashSummary);
router.get('/', authorize('read', 'PettyCash'), getAllPettyCash);
router.get('/:id', authorize('read', 'PettyCash'), getPettyCashById);
router.get('/:id/transactions', authorize('read', 'PettyCash'), getPettyCashTransactions);

router.post('/', deprecatedWrite);
router.put('/:id', deprecatedWrite);
router.delete('/:id', deprecatedWrite);
router.post('/:id/top-up', deprecatedWrite);
router.post('/:id/expense', deprecatedWrite);
router.post('/:id/sales-return', deprecatedWrite);
router.post('/:id/income', deprecatedWrite);
router.post('/:id/adjustment', deprecatedWrite);
router.post('/:id/withdrawal', deprecatedWrite);

module.exports = router;
