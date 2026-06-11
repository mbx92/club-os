/**
 * Restaurant Report Routes
 * Mount path: /reports/restaurant
 */
const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/permissionMiddleware');
const { requireModule } = require('../../middlewares/featureGateMiddleware');
const {
  getRestaurantSales,
  getTableUtilization,
  getTopRestaurantItems
} = require('../../controllers/reports');

const router = express.Router();

/**
 * @route GET /reports/restaurant/sales
 * @desc Restaurant sales report by period
 * @query startDate, endDate, groupBy (daily|weekly|monthly), locationId
 * @access Private (read Transaction, restaurant module)
 */
router.get('/sales',
  authenticate,
  requireModule('restaurant'),
  authorize('read', 'Transaction'),
  getRestaurantSales
);

/**
 * @route GET /reports/restaurant/table-utilization
 * @desc Table utilization report
 * @query startDate, endDate, locationId
 * @access Private (read Transaction, restaurant module)
 */
router.get('/table-utilization',
  authenticate,
  requireModule('restaurant'),
  authorize('read', 'Transaction'),
  getTableUtilization
);

/**
 * @route GET /reports/restaurant/top-items
 * @desc Top selling restaurant menu items
 * @query startDate, endDate, limit
 * @access Private (read Transaction, restaurant module)
 */
router.get('/top-items',
  authenticate,
  requireModule('restaurant'),
  authorize('read', 'Transaction'),
  getTopRestaurantItems
);

module.exports = router;
