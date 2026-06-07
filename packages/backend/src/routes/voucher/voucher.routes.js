const express = require('express');
const router = express.Router();
const voucherController = require('../../controllers/voucher/voucherController');
const { authenticate } = require('../../middlewares/authMiddleware');
const { checkSubscription } = require('../../middlewares/subscriptionMiddleware');
const { authorizeCasl } = require('../../middlewares/caslMiddleware');
const { requireFeature } = require('../../middlewares/featureGateMiddleware');

// All routes require authentication
router.use(authenticate);

// Apply subscription check only for non-superadmin users
router.use((req, res, next) => {
  if (req.user.isSuperAdmin) {
    return next(); // Skip subscription check for superadmin
  }
  return checkSubscription(req, res, next);
});

// Require vouchers feature (Professional/Enterprise only)
router.use(requireFeature('transactions', 'vouchers'));

/**
 * @route   POST /api/v1/vouchers
 * @desc    Create a new voucher (superadmin: subscription vouchers, tenant: tenant vouchers)
 * @access  Private + CASL
 */
router.post('/', 
  authorizeCasl('create', 'Voucher'),
  voucherController.createVoucher
);

/**
 * @route   GET /api/v1/vouchers
 * @desc    Get all vouchers (superadmin: all vouchers with scope filter, tenant: only their vouchers)
 * @access  Private + CASL
 * @query   ?page=1&limit=10&search=&type=&status=all&applicableTo=&scope=&sortBy=createdAt&sortOrder=DESC
 */
router.get('/', 
  authorizeCasl('read', 'Voucher'),
  voucherController.getAllVouchers
);

/**
 * @route   POST /api/v1/vouchers/validate/:code
 * @desc    Validate a voucher code
 * @access  Private + CASL
 */
router.post('/validate/:code', 
  authorizeCasl('read', 'Voucher'),
  voucherController.validateVoucher
);

/**
 * @route   GET /api/v1/vouchers/:id
 * @desc    Get a voucher by ID
 * @access  Private + CASL
 */
router.get('/:id', 
  authorizeCasl('read', 'Voucher'),
  voucherController.getVoucherById
);

/**
 * @route   PUT /api/v1/vouchers/:id
 * @desc    Update a voucher
 * @access  Private + CASL
 */
router.put('/:id', 
  authorizeCasl('update', 'Voucher'),
  voucherController.updateVoucher
);

/**
 * @route   DELETE /api/v1/vouchers/:id
 * @desc    Delete a voucher (soft delete)
 * @access  Private + CASL
 */
router.delete('/:id', 
  authorizeCasl('delete', 'Voucher'),
  voucherController.deleteVoucher
);

/**
 * @route   GET /api/v1/vouchers/:voucherId/statistics
 * @desc    Get voucher usage statistics
 * @access  Private + CASL
 */
router.get('/:voucherId/statistics', 
  authorizeCasl('read', 'Voucher'),
  voucherController.getVoucherStatistics
);

module.exports = router;
