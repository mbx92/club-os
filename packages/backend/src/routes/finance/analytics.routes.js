const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/permissionMiddleware');
const {
  getTopSellingProducts,
  getTopSellingServices,
  getNotSellingProducts,
  getNotSellingServices
} = require('../../controllers/finance');

const router = express.Router();

/**
 * @route GET /finance/analytics/top-products
 * @desc Get top selling products ranked by revenue or quantity
 * @access Private (read Transaction)
 */
router.get('/top-products',
  authenticate,
  authorize('read', 'Transaction'),
  getTopSellingProducts
);

/**
 * @route GET /finance/analytics/top-services
 * @desc Get top selling services ranked by revenue or quantity
 * @access Private (read Transaction)
 */
router.get('/top-services',
  authenticate,
  authorize('read', 'Transaction'),
  getTopSellingServices
);

/**
 * @route GET /finance/analytics/not-selling-products
 * @desc Get active products with zero sales in the period (dead stock)
 * @access Private (read Transaction)
 */
router.get('/not-selling-products',
  authenticate,
  authorize('read', 'Transaction'),
  getNotSellingProducts
);

/**
 * @route GET /finance/analytics/not-selling-services
 * @desc Get active service plans with zero sales in the period
 * @access Private (read Transaction)
 */
router.get('/not-selling-services',
  authenticate,
  authorize('read', 'Transaction'),
  getNotSellingServices
);

module.exports = router;
