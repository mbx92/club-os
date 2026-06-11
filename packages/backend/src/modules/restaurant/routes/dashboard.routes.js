'use strict';

/**
 * Restaurant Dashboard Routes - Restaurant Module
 * 
 * @module modules/restaurant/routes/dashboard.routes
 */

const express = require('express');
const router = express.Router();
const { dashboardController } = require('../controllers');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

// All routes require authentication and restaurant module access
router.use(authenticate);
router.use(requireModule('restaurant'));

/**
 * @route GET /api/v1/restaurant/dashboard/overview
 * @desc Get dashboard overview (today's sales, active orders, tables, low stock)
 * @query locationId - filter by location
 * @access Private - requires 'read' permission on 'Transaction'
 */
router.get('/overview',
  authorize('read', 'Transaction'),
  dashboardController.getDashboardOverview
);

/**
 * @route GET /api/v1/restaurant/dashboard/comprehensive
 * @desc Get comprehensive restaurant overview (all-in-one dashboard data)
 * @query locationId - filter by location
 * @access Private - requires 'read' permission on 'Transaction'
 */
router.get('/comprehensive',
  authorize('read', 'Transaction'),
  dashboardController.getRestaurantOverview
);

/**
 * @route GET /api/v1/restaurant/dashboard/sales-trend
 * @desc Get sales trend for last N days
 * @query locationId - filter by location
 * @query days - number of days (default: 7)
 * @access Private - requires 'read' permission on 'Transaction'
 */
router.get('/sales-trend',
  authorize('read', 'Transaction'),
  dashboardController.getSalesTrend
);

/**
 * @route GET /api/v1/restaurant/dashboard/top-products
 * @desc Get top selling products today
 * @query locationId - filter by location
 * @query limit - number of products (default: 5)
 * @access Private - requires 'read' permission on 'Transaction'
 */
router.get('/top-products',
  authorize('read', 'Transaction'),
  dashboardController.getTopProductsToday
);

/**
 * @route GET /api/v1/restaurant/dashboard/recent-orders
 * @desc Get recent orders
 * @query locationId - filter by location
 * @query limit - number of orders (default: 10)
 * @access Private - requires 'read' permission on 'Transaction'
 */
router.get('/recent-orders',
  authorize('read', 'Transaction'),
  dashboardController.getRecentOrders
);

module.exports = router;
