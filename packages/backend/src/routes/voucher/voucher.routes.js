const express = require('express');
const router = express.Router();
const voucherController = require('../../controllers/voucher/voucherController');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/permissionMiddleware');
const { requireFeature } = require('../../middlewares/featureGateMiddleware');

// All routes require authentication
router.use(authenticate);

// Require vouchers feature (Professional/Enterprise only)
router.use(requireFeature('vouchers'));

/**
 * @route   POST /api/v1/vouchers
 * @desc    Create a new voucher (superadmin: subscription vouchers, tenant: tenant vouchers)
 * @access  Private + RBAC
 */
router.post('/', 
  authorize('create', 'Voucher'),
  voucherController.createVoucher
);

/**
 * @route   GET /api/v1/vouchers
 * @desc    Get all vouchers (superadmin: all vouchers with scope filter, tenant: only their vouchers)
 * @access  Private + RBAC
 * @query   ?page=1&limit=10&search=&type=&status=all&applicableTo=&scope=&sortBy=createdAt&sortOrder=DESC
 */
router.get('/', 
  authorize('read', 'Voucher'),
  voucherController.getAllVouchers
);

/**
 * @route   POST /api/v1/vouchers/validate/:code
 * @desc    Validate a voucher code
 * @access  Private + RBAC
 */
router.post('/validate/:code', 
  authorize('read', 'Voucher'),
  voucherController.validateVoucher
);

/**
 * @route   GET /api/v1/vouchers/:id
 * @desc    Get a voucher by ID
 * @access  Private + RBAC
 */
router.get('/:id', 
  authorize('read', 'Voucher'),
  voucherController.getVoucherById
);

/**
 * @route   PUT /api/v1/vouchers/:id
 * @desc    Update a voucher
 * @access  Private + RBAC
 */
router.put('/:id', 
  authorize('update', 'Voucher'),
  voucherController.updateVoucher
);

/**
 * @route   DELETE /api/v1/vouchers/:id
 * @desc    Delete a voucher (soft delete)
 * @access  Private + RBAC
 */
router.delete('/:id', 
  authorize('delete', 'Voucher'),
  voucherController.deleteVoucher
);

/**
 * @route   GET /api/v1/vouchers/:voucherId/statistics
 * @desc    Get voucher usage statistics
 * @access  Private + RBAC
 */
router.get('/:voucherId/statistics', 
  authorize('read', 'Voucher'),
  voucherController.getVoucherStatistics
);

module.exports = router;
