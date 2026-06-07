'use strict';

/**
 * Combined Billing Routes
 * 
 * Supports combined transactions: service plans + products in one bill
 * Feature-gated: requires 'combinedBilling' feature
 * 
 * @module modules/restaurant/routes/combinedBilling.routes
 */

const express = require('express');
const router = express.Router();
const combinedBillingController = require('../controllers/combinedBillingController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireFeature } = require('../../../middlewares/featureGateMiddleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route POST /api/v1/restaurant/billing/combined
 * @desc Create combined transaction (service_plan + products)
 * @access Private - requires 'combinedBilling' feature and 'create' permission on 'Transaction'
 * 
 * @body {
 *   customerId: UUID (optional),
 *   customerType: 'member' | 'non-member',
 *   customerName: string,
 *   customerPhone: string,
 *   tableId: UUID (optional),
 *   locationId: UUID (optional),
 *   orderType: 'dine-in' | 'takeaway' | 'delivery' (optional),
 *   items: [
 *     { type: 'product', productId: UUID, quantity: number, notes: string },
 *     { type: 'service_plan', servicePlanId: UUID, startDate: Date }
 *   ],
 *   payments: [
 *     { method: 'cash' | 'credit_card' | 'debit_card' | 'e_wallet' | 'qris', amount: number }
 *   ],
 *   voucherCode: string (optional),
 *   notes: string (optional)
 * }
 */
router.post('/combined',
  requireFeature('transactions', 'combinedBilling'),
  authorizeCasl('create', 'Transaction'),
  combinedBillingController.createCombinedTransaction
);

/**
 * @route GET /api/v1/restaurant/billing/receipt/:id
 * @desc Get transaction receipt data with printer settings
 * @access Private - requires 'read' permission on 'Transaction'
 */
router.get('/receipt/:id',
  authorizeCasl('read', 'Transaction'),
  combinedBillingController.getTransactionReceipt
);

/**
 * @route POST /api/v1/restaurant/billing/validate-voucher
 * @desc Validate voucher for combined billing
 * @access Private
 * 
 * @body {
 *   code: string,
 *   subtotal: number,
 *   customerId: UUID (optional)
 * }
 */
router.post('/validate-voucher',
  combinedBillingController.validateVoucher
);

module.exports = router;
