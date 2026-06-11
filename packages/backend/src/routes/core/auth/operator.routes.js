'use strict';

const express = require('express');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const {
  listOperators,
  verifyOperatorPin,
  getAllOperators,
  createOperator,
  updateOperator,
  deleteOperator
} = require('../../../controllers/core/auth/operatorAuthController');

const router = express.Router();

// ── Endpoint untuk PIN modal (semua authenticated user) ──────────────────────

/** GET /auth/operator/list — daftar nama operator aktif (untuk dropdown) */
router.get('/list', authenticate, listOperators);

/** POST /auth/operator/verify — input PIN, dapat operatorToken */
router.post('/verify', authenticate, verifyOperatorPin);

// ── Endpoint manajemen operator (hanya admin/owner) ──────────────────────────

/** GET /auth/operator/manage — semua operator termasuk nonaktif */
router.get('/manage', authenticate, authorize('read', 'User'), getAllOperators);

/** POST /auth/operator/manage — buat operator baru */
router.post('/manage', authenticate, authorize('create', 'User'), createOperator);

/** PUT /auth/operator/manage/:id — update operator */
router.put('/manage/:id', authenticate, authorize('update', 'User'), updateOperator);

/** DELETE /auth/operator/manage/:id — nonaktifkan operator */
router.delete('/manage/:id', authenticate, authorize('delete', 'User'), deleteOperator);

module.exports = router;
