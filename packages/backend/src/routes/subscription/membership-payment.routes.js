const express = require('express');
const router = express.Router();
const membershipPaymentController = require('../../controllers/subscription/membershipPaymentController');
const { authenticate } = require('../../middlewares/authMiddleware');
const { checkSubscription } = require('../../middlewares/subscriptionMiddleware');

// All routes require authentication and active subscription
router.use(authenticate);
router.use(checkSubscription);

/**
 * @route   POST /api/membership-payments
 * @desc    Create a new membership payment
 * @access  Private
 */
router.post('/', membershipPaymentController.createMembershipPayment);

/**
 * @route   GET /api/membership-payments
 * @desc    Get all membership payments for a tenant
 * @access  Private
 */
router.get('/', membershipPaymentController.getAllMembershipPayments);

/**
 * @route   GET /api/membership-payments/statistics
 * @desc    Get membership payment statistics for a tenant
 * @access  Private
 */
router.get('/statistics', membershipPaymentController.getMembershipPaymentStatistics);

/**
 * @route   GET /api/membership-payments/:id
 * @desc    Get a membership payment by ID
 * @access  Private
 */
router.get('/:id', membershipPaymentController.getMembershipPaymentById);

/**
 * @route   PUT /api/membership-payments/:id
 * @desc    Update a membership payment
 * @access  Private
 */
router.put('/:id', membershipPaymentController.updateMembershipPayment);

/**
 * @route   POST /api/membership-payments/:id/process
 * @desc    Process a membership payment (mark as completed)
 * @access  Private
 */
router.post('/:id/process', membershipPaymentController.processMembershipPayment);

/**
 * @route   DELETE /api/membership-payments/:id
 * @desc    Delete a membership payment (soft delete)
 * @access  Private
 */
router.delete('/:id', membershipPaymentController.deleteMembershipPayment);

module.exports = router;
