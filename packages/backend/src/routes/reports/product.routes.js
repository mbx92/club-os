/**
 * Product Report Routes
 * Mount path: /reports/products
 */
const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/permissionMiddleware');
const {
  getProductPerformance,
  getTopSellingProducts,
  getProductsByCategory
} = require('../../controllers/reports');

const router = express.Router();

/**
 * @route GET /reports/products/performance
 * @desc Product sales performance over time
 * @query startDate, endDate, groupBy (daily|weekly|monthly), categoryId, productType
 * @access Private (read Transaction)
 */
router.get('/performance',
  authenticate,
  authorize('read', 'Transaction'),
  getProductPerformance
);

/**
 * @route GET /reports/products/top-selling
 * @desc Ranked list of top selling products
 * @query startDate, endDate, limit, sortBy (revenue|quantity)
 * @access Private (read Transaction)
 */
router.get('/top-selling',
  authenticate,
  authorize('read', 'Transaction'),
  getTopSellingProducts
);

/**
 * @route GET /reports/products/by-category
 * @desc Product sales grouped by category
 * @query startDate, endDate
 * @access Private (read Transaction)
 */
router.get('/by-category',
  authenticate,
  authorize('read', 'Transaction'),
  getProductsByCategory
);

module.exports = router;
