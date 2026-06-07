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

// Public routes (no authentication)
router.post('/notification', paymentController.handleNotification);

// Protected routes (require authentication)
router.use(authenticate);

// Get payment configuration
router.get('/config', paymentController.getConfig);

// Create payment (Snap Token)
router.post('/create', paymentController.createPayment);

// Create direct charge
router.post('/charge', paymentController.createCharge);

// Check payment status
router.get('/status/:transactionNumber', paymentController.checkStatus);

// Cancel payment
router.post('/cancel/:transactionNumber', paymentController.cancelPayment);

// Refund payment
router.post('/refund/:transactionNumber', paymentController.refundPayment);

module.exports = router;
