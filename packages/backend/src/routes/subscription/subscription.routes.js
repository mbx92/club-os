const express = require('express');
const {
  getCurrentSubscription,
  getAvailablePlans,
  createSubscription,
  updateSubscription,
  upgradeSubscription,
  cancelSubscription,
  renewSubscription
} = require('../../controllers/subscription/subscriptionController');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/permissionMiddleware');
const auditLog = require('../../middlewares/auditMiddleware');

const router = express.Router();

/**
 * @route GET /subscription/current
 * @name subscription.current
 * @desc Get current tenant's subscription with full feature details
 * @access Private - Authenticated users
 */
router.get('/current', authenticate, getCurrentSubscription);

/**
 * @route GET /subscription/plans
 * @name subscription.plans
 * @desc Get all available subscription plans
 * @access Private - Authenticated users
 */
router.get('/plans', authenticate, getAvailablePlans, auditLog('GET_AVAILABLE_PLANS'));

/**
 * @route POST /subscription
 * @name subscription.create
 * @desc Create a new subscription for tenant
 * @access Private - Tenant owner or admin
 */
router.post('/', authenticate, authorize('create', 'Subscription'), createSubscription, auditLog('CREATE_SUBSCRIPTION'));

/**
 * @route PUT /subscription/:id
 * @name subscription.update
 * @desc Update subscription details
 * @access Private - Tenant owner or admin
 */
router.put('/:id', authenticate, authorize('update', 'Subscription'), updateSubscription, auditLog('UPDATE_SUBSCRIPTION'));

/**
 * @route POST /subscription/:id/upgrade
 * @name subscription.upgrade
 * @desc Upgrade subscription to a higher plan
 * @access Private - Tenant owner or admin
 */
router.post('/:id/upgrade', authenticate, authorize('update', 'Subscription'), upgradeSubscription, auditLog('UPGRADE_SUBSCRIPTION'));

/**
 * @route POST /subscription/:id/cancel
 * @name subscription.cancel
 * @desc Cancel subscription
 * @access Private - Tenant owner or admin
 */
router.post('/:id/cancel', authenticate, authorize('delete', 'Subscription'), cancelSubscription, auditLog('CANCEL_SUBSCRIPTION'));

/**
 * @route POST /subscription/:id/renew
 * @name subscription.renew
 * @desc Renew subscription
 * @access Private - Tenant owner or admin
 */
router.post('/:id/renew', authenticate, authorize('update', 'Subscription'), renewSubscription, auditLog('RENEW_SUBSCRIPTION'));

module.exports = router;
