const express = require('express');
const {
  getSubscriptionPlans,
  getSubscriptionPlan,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  createSubscription,
  getTenantSubscription,
  updateSubscription,
  cancelSubscription,
  renewSubscription,
  activateSubscription,
  getCurrentSubscription,
  getAvailablePlans,
  upgradeSubscription
} = require('../../controllers/subscription/subscriptionController');
const {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoiceStatus,
  processPayment,
  getPayments,
  getPayment,
  refundPayment
} = require('../../controllers/subscription/paymentController');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../middlewares/caslMiddleware');
const { requireSuperAdmin } = require('../../middlewares/superAdminMiddleware');
const auditLog = require('../../middlewares/auditMiddleware');

const router = express.Router();

// ============================================
// Frontend Integration Routes
// ============================================

/**
 * @route GET /billing/subscription/current
 * @name billing.currentSubscription
 * @desc Get current tenant's subscription with full feature details
 * @access Private - Authenticated users
 */
router.get('/subscription/current', authenticate, getCurrentSubscription);

/**
 * @route GET /billing/subscription/plans
 * @name billing.availablePlans
 * @desc Get all available plans for upgrade/selection
 * @access Private - Authenticated users
 */
router.get('/subscription/plans', authenticate, getAvailablePlans, auditLog('GET_AVAILABLE_PLANS'));

/**
 * @route POST /billing/subscription/upgrade
 * @name billing.upgradeSubscription
 * @desc Upgrade to a new subscription plan
 * @access Private - Authenticated users with Subscription management permission
 */
router.post('/subscription/upgrade', authenticate, authorizeCasl('update', 'Subscription'), upgradeSubscription, auditLog('UPGRADE_SUBSCRIPTION'));

// ============================================
// Subscription Plans Routes
// ============================================

/**
 * @route GET /billing/plans
 * @name billing.plans
 * @desc Get all subscription plans
 * @access Public
 */
router.get('/plans', getSubscriptionPlans, auditLog('GET_SUBSCRIPTION_PLANS'));

/**
 * @route GET /billing/plans/:id
 * @name billing.plan
 * @desc Get a specific subscription plan
 * @access Public
 */
router.get('/plans/:id', getSubscriptionPlan, auditLog('GET_SUBSCRIPTION_PLAN'));

/**
 * @route POST /billing/plans
 * @name billing.createPlan
 * @desc Create a new subscription plan
 * @access Private - Super Admin only
 */
router.post('/plans', authenticate, requireSuperAdmin, createSubscriptionPlan, auditLog('CREATE_SUBSCRIPTION_PLAN'));

/**
 * @route PUT /billing/plans/:id
 * @name billing.updatePlan
 * @desc Update a subscription plan
 * @access Private - Super Admin only
 */
router.put('/plans/:id', authenticate, requireSuperAdmin, updateSubscriptionPlan, auditLog('UPDATE_SUBSCRIPTION_PLAN'));

/**
 * @route DELETE /billing/plans/:id
 * @name billing.deletePlan
 * @desc Delete/Deactivate a subscription plan
 * @access Private - Super Admin only
 */
router.delete('/plans/:id', authenticate, requireSuperAdmin, deleteSubscriptionPlan, auditLog('DELETE_SUBSCRIPTION_PLAN'));

// Subscription Routes
/**
 * @route POST /billing/subscriptions
 * @name billing.createSubscription
 * @desc Create a new subscription
 * @access Private
 */
router.post('/subscriptions', authenticate, authorizeCasl('create', 'Subscription'), createSubscription, auditLog('CREATE_SUBSCRIPTION'));

/**
 * @route GET /billing/subscriptions/tenant/:tenantId
 * @name billing.tenantSubscription
 * @desc Get tenant's subscription
 * @access Private
 */
router.get('/subscriptions/tenant/:tenantId', authenticate, authorizeCasl('read', 'Subscription'), getTenantSubscription, auditLog('GET_TENANT_SUBSCRIPTION'));

/**
 * @route PUT /billing/subscriptions/:id
 * @name billing.updateSubscription
 * @desc Update a subscription
 * @access Private
 */
router.put('/subscriptions/:id', authenticate, authorizeCasl('update', 'Subscription'), updateSubscription, auditLog('UPDATE_SUBSCRIPTION'));

/**
 * @route DELETE /billing/subscriptions/:id
 * @name billing.cancelSubscription
 * @desc Cancel a subscription
 * @access Private
 */
router.delete('/subscriptions/:id', authenticate, authorizeCasl('delete', 'Subscription'), cancelSubscription, auditLog('CANCEL_SUBSCRIPTION'));

/**
 * @route POST /billing/subscriptions/:id/renew
 * @name billing.renewSubscription
 * @desc Renew a subscription
 * @access Private
 */
router.post('/subscriptions/:id/renew', authenticate, authorizeCasl('update', 'Subscription'), renewSubscription, auditLog('RENEW_SUBSCRIPTION'));

/**
 * @route POST /billing/subscriptions/:id/activate
 * @name billing.activateSubscription
 * @desc Activate a subscription (after payment)
 * @access Private
 */
router.post('/subscriptions/:id/activate', authenticate, authorizeCasl('update', 'Subscription'), activateSubscription, auditLog('ACTIVATE_SUBSCRIPTION'));

// Invoice Routes
/**
 * @route POST /billing/invoices
 * @name billing.createInvoice
 * @desc Create a new invoice
 * @access Private
 */
router.post('/invoices', authenticate, authorizeCasl('create', 'Invoice'), createInvoice, auditLog('CREATE_INVOICE'));

/**
 * @route GET /billing/invoices
 * @name billing.invoices
 * @desc Get all invoices
 * @access Private
 */
router.get('/invoices', authenticate, authorizeCasl('read', 'Invoice'), getInvoices, auditLog('GET_INVOICES'));

/**
 * @route GET /billing/invoices/:id
 * @name billing.invoice
 * @desc Get a specific invoice
 * @access Private
 */
router.get('/invoices/:id', authenticate, authorizeCasl('read', 'Invoice'), getInvoice, auditLog('GET_INVOICE'));

/**
 * @route PUT /billing/invoices/:id/status
 * @name billing.updateInvoiceStatus
 * @desc Update invoice status
 * @access Private
 */
router.put('/invoices/:id/status', authenticate, authorizeCasl('update', 'Invoice'), updateInvoiceStatus, auditLog('UPDATE_INVOICE_STATUS'));

// Payment Routes
/**
 * @route POST /billing/payments
 * @name billing.processPayment
 * @desc Process a payment
 * @access Private
 */
router.post('/payments', authenticate, authorizeCasl('create', 'Payment'), processPayment, auditLog('PROCESS_PAYMENT'));

/**
 * @route GET /billing/payments
 * @name billing.payments
 * @desc Get all payments
 * @access Private
 */
router.get('/payments', authenticate, authorizeCasl('read', 'Payment'), getPayments, auditLog('GET_PAYMENTS'));

/**
 * @route GET /billing/payments/:id
 * @name billing.payment
 * @desc Get a specific payment
 * @access Private
 */
router.get('/payments/:id', authenticate, authorizeCasl('read', 'Payment'), getPayment, auditLog('GET_PAYMENT'));

/**
 * @route POST /billing/payments/:id/refund
 * @name billing.refundPayment
 * @desc Refund a payment
 * @access Private
 */
router.post('/payments/:id/refund', authenticate, authorizeCasl('update', 'Payment'), refundPayment, auditLog('REFUND_PAYMENT'));

module.exports = router;
