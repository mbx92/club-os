'use strict';

/**
 * Report Routes - Restaurant Module
 * 
 * Routes for restaurant reporting endpoints
 * @module modules/restaurant/routes/report.routes
 */

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

// All routes require authentication and restaurant module
router.use(authenticate);
router.use(requireModule('restaurant'));

/**
 * @route GET /api/v1/restaurant/reports/sales
 * @desc Get sales report with flexible grouping (day, week, month, hour)
 * @query startDate - Start date (YYYY-MM-DD) - required
 * @query endDate - End date (YYYY-MM-DD) - required
 * @query locationId - Filter by location (optional)
 * @query groupBy - Group by: day, week, month, hour (default: day)
 * @query orderType - Filter by order type: dine-in, takeaway, delivery (optional)
 * @access Private - requires 'read' permission on 'Transaction'
 */
router.get('/sales',
  authorize('read', 'Transaction'),
  reportController.getSalesReport
);

/**
 * @route GET /api/v1/restaurant/reports/products
 * @desc Get product performance report (top selling products)
 * @query startDate - Start date (YYYY-MM-DD) - required
 * @query endDate - End date (YYYY-MM-DD) - required
 * @query categoryId - Filter by product category (optional)
 * @query limit - Number of top products to return (default: 10)
 * @query sortBy - Sort by: quantity, revenue (default: quantity)
 * @access Private - requires 'read' permission on 'Transaction'
 */
router.get('/products',
  authorize('read', 'Transaction'),
  reportController.getProductReport
);

/**
 * @route GET /api/v1/restaurant/reports/tables
 * @desc Get table performance report (turnover, revenue per table)
 * @query startDate - Start date (YYYY-MM-DD) - required
 * @query endDate - End date (YYYY-MM-DD) - required
 * @query locationId - Filter by location (optional)
 * @access Private - requires 'read' permission on 'Transaction'
 */
router.get('/tables',
  authorize('read', 'Transaction'),
  reportController.getTableReport
);

/**
 * @route GET /api/v1/restaurant/reports/daily-summary
 * @desc Get comprehensive daily summary report
 * @query date - Date for the summary (YYYY-MM-DD) - required
 * @query locationId - Filter by location (optional)
 * @access Private - requires 'read' permission on 'Transaction'
 */
router.get('/daily-summary',
  authorize('read', 'Transaction'),
  reportController.getDailySummary
);

module.exports = router;
