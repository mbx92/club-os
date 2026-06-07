const express = require('express');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const auditLog = require('../../../middlewares/auditMiddleware');
const {
  getTransactionSettings,
  updateTransactionSettings,
  getTaxConfiguration,
  updateTaxConfiguration,
  getServiceChargeConfiguration,
  updateServiceChargeConfiguration,
  getCurrencyConfiguration,
  updateCurrencyConfiguration,
  getInvoiceConfiguration,
  updateInvoiceConfiguration,
  getPaymentConfiguration,
  updatePaymentConfiguration,
  getDiscountConfiguration,
  updateDiscountConfiguration,
  getShippingConfiguration,
  updateShippingConfiguration,
  resetTransactionSettings
} = require('../../../controllers/core/tenant/transactionSettingsController');

const router = express.Router();

/**
 * @route GET /api/v1/transaction-settings
 * @name transaction-settings.get
 * @desc Get all transaction settings for tenant
 * @access Private
 */
router.get('/',
  authenticate,
  authorizeCasl('read', 'Tenant'),
  getTransactionSettings
);

/**
 * @route PUT /api/v1/transaction-settings
 * @name transaction-settings.update
 * @desc Update transaction settings for tenant
 * @access Private
 */
router.put('/',
  authenticate,
  authorizeCasl('update', 'Tenant'),
  auditLog('UPDATE_TRANSACTION_SETTINGS'),
  updateTransactionSettings
);

/**
 * @route POST /api/v1/transaction-settings/reset
 * @name transaction-settings.reset
 * @desc Reset transaction settings to defaults
 * @access Private (Admin only)
 */
router.post('/reset',
  authenticate,
  authorizeCasl('update', 'Tenant'),
  auditLog('RESET_TRANSACTION_SETTINGS'),
  resetTransactionSettings
);

// ============== TAX CONFIGURATION ==============

/**
 * @route GET /api/v1/transaction-settings/tax
 * @name transaction-settings.tax.get
 * @desc Get tax configuration
 * @access Private
 */
router.get('/tax',
  authenticate,
  authorizeCasl('read', 'Tenant'),
  getTaxConfiguration
);

/**
 * @route PUT /api/v1/transaction-settings/tax
 * @name transaction-settings.tax.update
 * @desc Update tax configuration
 * @body { enabled: boolean, rate: number, type: 'percentage'|'fixed' }
 * @access Private
 */
router.put('/tax',
  authenticate,
  authorizeCasl('update', 'Tenant'),
  auditLog('UPDATE_TAX_CONFIGURATION'),
  updateTaxConfiguration
);

// ============== SERVICE CHARGE CONFIGURATION ==============

/**
 * @route GET /api/v1/transaction-settings/service-charge
 * @name transaction-settings.service-charge.get
 * @desc Get service charge configuration
 * @access Private
 */
router.get('/service-charge',
  authenticate,
  authorizeCasl('read', 'Tenant'),
  getServiceChargeConfiguration
);

/**
 * @route PUT /api/v1/transaction-settings/service-charge
 * @name transaction-settings.service-charge.update
 * @desc Update service charge configuration
 * @body { enabled: boolean, rate: number, type: 'percentage'|'fixed' }
 * @access Private
 */
router.put('/service-charge',
  authenticate,
  authorizeCasl('update', 'Tenant'),
  auditLog('UPDATE_SERVICE_CHARGE_CONFIGURATION'),
  updateServiceChargeConfiguration
);

// ============== CURRENCY CONFIGURATION ==============

/**
 * @route GET /api/v1/transaction-settings/currency
 * @name transaction-settings.currency.get
 * @desc Get currency configuration
 * @access Private
 */
router.get('/currency',
  authenticate,
  authorizeCasl('read', 'Tenant'),
  getCurrencyConfiguration
);

/**
 * @route PUT /api/v1/transaction-settings/currency
 * @name transaction-settings.currency.update
 * @desc Update currency configuration
 * @access Private
 */
router.put('/currency',
  authenticate,
  authorizeCasl('update', 'Tenant'),
  auditLog('UPDATE_CURRENCY_CONFIGURATION'),
  updateCurrencyConfiguration
);

// ============== INVOICE CONFIGURATION ==============

/**
 * @route GET /api/v1/transaction-settings/invoice
 * @name transaction-settings.invoice.get
 * @desc Get invoice/document numbering configuration
 * @access Private
 */
router.get('/invoice',
  authenticate,
  authorizeCasl('read', 'Tenant'),
  getInvoiceConfiguration
);

/**
 * @route PUT /api/v1/transaction-settings/invoice
 * @name transaction-settings.invoice.update
 * @desc Update invoice/document numbering configuration
 * @access Private
 */
router.put('/invoice',
  authenticate,
  authorizeCasl('update', 'Tenant'),
  auditLog('UPDATE_INVOICE_CONFIGURATION'),
  updateInvoiceConfiguration
);

// ============== PAYMENT CONFIGURATION ==============

/**
 * @route GET /api/v1/transaction-settings/payment
 * @name transaction-settings.payment.get
 * @desc Get payment gateway configuration
 * @access Private
 */
router.get('/payment',
  authenticate,
  authorizeCasl('read', 'Tenant'),
  getPaymentConfiguration
);

/**
 * @route PUT /api/v1/transaction-settings/payment
 * @name transaction-settings.payment.update
 * @desc Update payment gateway configuration
 * @access Private
 */
router.put('/payment',
  authenticate,
  authorizeCasl('update', 'Tenant'),
  auditLog('UPDATE_PAYMENT_CONFIGURATION'),
  updatePaymentConfiguration
);

// ============== DISCOUNT CONFIGURATION ==============

/**
 * @route GET /api/v1/transaction-settings/discount
 * @name transaction-settings.discount.get
 * @desc Get discount configuration
 * @access Private
 */
router.get('/discount',
  authenticate,
  authorizeCasl('read', 'Tenant'),
  getDiscountConfiguration
);

/**
 * @route PUT /api/v1/transaction-settings/discount
 * @name transaction-settings.discount.update
 * @desc Update discount configuration
 * @access Private
 */
router.put('/discount',
  authenticate,
  authorizeCasl('update', 'Tenant'),
  auditLog('UPDATE_DISCOUNT_CONFIGURATION'),
  updateDiscountConfiguration
);

// ============== SHIPPING CONFIGURATION ==============

/**
 * @route GET /api/v1/transaction-settings/shipping
 * @name transaction-settings.shipping.get
 * @desc Get shipping configuration
 * @access Private
 */
router.get('/shipping',
  authenticate,
  authorizeCasl('read', 'Tenant'),
  getShippingConfiguration
);

/**
 * @route PUT /api/v1/transaction-settings/shipping
 * @name transaction-settings.shipping.update
 * @desc Update shipping configuration
 * @access Private
 */
router.put('/shipping',
  authenticate,
  authorizeCasl('update', 'Tenant'),
  auditLog('UPDATE_SHIPPING_CONFIGURATION'),
  updateShippingConfiguration
);

module.exports = router;
