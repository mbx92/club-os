const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../middlewares/caslMiddleware');
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
  authorizeCasl('read', 'Transaction'),
  getTopSellingProducts
);

/**
 * @route GET /finance/analytics/top-services
 * @desc Get top selling services ranked by revenue or quantity
 * @access Private (read Transaction)
 */
router.get('/top-services',
  authenticate,
  authorizeCasl('read', 'Transaction'),
  getTopSellingServices
);

/**
 * @route GET /finance/analytics/not-selling-products
 * @desc Get active products with zero sales in the period (dead stock)
 * @access Private (read Transaction)
 */
router.get('/not-selling-products',
  authenticate,
  authorizeCasl('read', 'Transaction'),
  getNotSellingProducts
);

/**
 * @route GET /finance/analytics/not-selling-services
 * @desc Get active service plans with zero sales in the period
 * @access Private (read Transaction)
 */
router.get('/not-selling-services',
  authenticate,
  authorizeCasl('read', 'Transaction'),
  getNotSellingServices
);

module.exports = router;
