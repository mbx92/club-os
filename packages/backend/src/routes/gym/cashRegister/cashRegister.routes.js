'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');
const auditLog = require('../../../middlewares/auditMiddleware');
const cashRegisterController = require('../../../controllers/gym/cashRegister/cashRegisterController');

/**
 * GET /gym/cash-register
 * List semua sesi shift (filter: date, status, locationId)
 */
router.get(
  '/',
  authenticate,
  requireModule('gym'),
  authorize('read', 'CashRegisterSession'),
  cashRegisterController.listSessions
);

/**
 * POST /gym/cash-register/print-daily-report
 * Cetak laporan revenue harian ke thermal printer (tanpa detail transaksi)
 * Body: { date?: 'YYYY-MM-DD', type?: 'all'|'cashier'|'gym', locationId? }
 */
router.post(
  '/print-daily-report',
  authenticate,
  requireModule('gym'),
  authorize('read', 'CashRegisterSession'),
  cashRegisterController.printDailyReport
);

/**
 * GET /gym/cash-register/daily-report
 * Laporan revenue harian (agregasi semua shift dalam 1 hari)
 * Query: date=YYYY-MM-DD (default today), type=all|cashier|gym, locationId=
 */
router.get(
  '/daily-report',
  authenticate,
  requireModule('gym'),
  authorize('read', 'CashRegisterSession'),
  cashRegisterController.getDailyReport
);

/**
 * GET /gym/cash-register/current
 * Ambil sesi shift yang sedang open saat ini
 */
router.get(
  '/current',
  authenticate,
  requireModule('gym'),
  authorize('read', 'CashRegisterSession'),
  cashRegisterController.getCurrentSession
);

/**
 * GET /gym/cash-register/petty-cash-accounts
 * Daftar akun Petty Cash / Modal aktif untuk modal awal shift
 */
router.get(
  '/petty-cash-accounts',
  authenticate,
  requireModule('gym'),
  authorize('create', 'CashRegisterSession'),
  cashRegisterController.listPettyCashAccounts
);

/**
 * GET /gym/cash-register/:id/report
 * Laporan lengkap shift (Report Cashier + Report Gym)
 * Query: type=all|cashier|gym
 */
router.get(
  '/:id/report',
  authenticate,
  requireModule('gym'),
  authorize('read', 'CashRegisterSession'),
  cashRegisterController.getShiftReport
);

/**
 * GET /gym/cash-register/:id
 * Detail sesi shift lengkap dengan summary
 */
router.get(
  '/:id',
  authenticate,
  requireModule('gym'),
  authorize('read', 'CashRegisterSession'),
  cashRegisterController.getSession
);

/**
 * POST /gym/cash-register/open
 * Buka shift baru — input openingBalance (petty cash)
 */
router.post(
  '/open',
  authenticate,
  requireModule('gym'),
  authorize('create', 'CashRegisterSession'),
  auditLog('open_shift', 'CashRegisterSession'),
  cashRegisterController.openShift
);

/**
 * POST /gym/cash-register/:id/close
 * Tutup shift — input actualCash, sistem hitung selisih
 */
router.post(
  '/:id/close',
  authenticate,
  requireModule('gym'),
  authorize('update', 'CashRegisterSession'),
  auditLog('close_shift', 'CashRegisterSession'),
  cashRegisterController.closeShift
);

/**
 * PATCH /gym/cash-register/:id/correct-payment
 * Koreksi paymentMethod (dan optional amount) pada TransactionPayment
 * Body: { corrections: [{ paymentId, newPaymentMethod, newAmount?, reason? }] }
 */
router.patch(
  '/:id/correct-payment',
  authenticate,
  requireModule('gym'),
  authorize('update', 'CashRegisterSession'),
  auditLog('correct_payment', 'CashRegisterSession'),
  cashRegisterController.correctPayment
);

/**
 * POST /gym/cash-register/:id/diagnose-report
 * @desc  Diagnose selisih Q_totalCash & difference pada report shift.
 *        Transaksi berstatus 'split'/'merged' yang sudah bayar tunai
 *        tidak masuk kalkulasi lama → difference tampak minus.
 * @query dryRun=true  → preview saja (default)
 * @query dryRun=false → update difference & closingBalance di DB
 */
router.post(
  '/:id/diagnose-report',
  authenticate,
  requireModule('gym'),
  authorize('update', 'CashRegisterSession'),
  cashRegisterController.diagnoseReport
);

module.exports = router;
