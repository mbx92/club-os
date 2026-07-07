'use strict';

/**
 * Payment Routes
 * 
 * Routes for Midtrans payment gateway integration
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');

// Public routes (no authentication)
router.post('/notification', paymentController.handleNotification);

// Protected routes (require authentication)
router.use(authenticate);

// Get payment configuration
router.get('/config', paymentController.getConfig);

// Create payment (Snap Token)
router.post('/create', authorize('create', 'Payment'), paymentController.createPayment);

// Create direct charge
router.post('/charge', authorize('create', 'Payment'), paymentController.createCharge);

// Check payment status
router.get('/status/:transactionNumber', authorize('read', 'Payment'), paymentController.checkStatus);

// RBAC-03 / RBAC-02: cancelling/refunding a payment gateway transaction sets
// the underlying Transaction's status to 'cancelled' directly — the exact
// same void action gated behind the 'cancel' permission on /transactions/:id/cancel.
// These routes previously had NO authorize() check at all (any authenticated
// user, any role, could cancel or refund any transaction in their tenant).
router.post('/cancel/:transactionNumber', authorize('cancel', 'Transaction'), paymentController.cancelPayment);

router.post('/refund/:transactionNumber', authorize('cancel', 'Transaction'), paymentController.refundPayment);

module.exports = router;
