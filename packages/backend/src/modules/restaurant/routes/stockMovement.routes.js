'use strict';

/**
 * Stock Movement Routes - Restaurant Module
 * 
 * @module modules/restaurant/routes/stockMovement.routes
 */

const express = require('express');
const router = express.Router();
const stockMovementController = require('../controllers/stockMovementController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

// All routes require authentication and restaurant module access
router.use(authenticate);
router.use(requireModule('restaurant'));

/**
 * @route GET /api/v1/restaurant/stock-movements/report
 * @desc Get stock report (current, low-stock, or movements)
 * @access Private - requires 'read' permission on 'RestaurantStock'
 * @query reportType - 'current' | 'low-stock' | 'movements'
 * @query locationId - Optional location filter
 * @query categoryId - Optional category filter
 * @query startDate - Required for 'movements' report type
 * @query endDate - Required for 'movements' report type
 */
router.get('/report',
  authorize('read', 'RestaurantStock'),
  stockMovementController.getStockReport
);

/**
 * @route GET /api/v1/restaurant/stock-movements
 * @desc Get all stock movements with filters
 * @access Private - requires 'read' permission on 'RestaurantStock'
 */
router.get('/',
  authorize('read', 'RestaurantStock'),
  stockMovementController.getAllMovements
);

/**
 * @route GET /api/v1/restaurant/stock-movements/summary
 * @desc Get stock movement summary by date range
 * @access Private - requires 'read' permission on 'RestaurantStock'
 */
router.get('/summary',
  authorize('read', 'RestaurantStock'),
  stockMovementController.getSummary
);

/**
 * @route GET /api/v1/restaurant/stock-movements/most-moved
 * @desc Get most moved products
 * @access Private - requires 'read' permission on 'RestaurantStock'
 */
router.get('/most-moved',
  authorize('read', 'RestaurantStock'),
  stockMovementController.getMostMovedProducts
);

/**
 * @route GET /api/v1/restaurant/stock-movements/product/:productId
 * @desc Get stock movement history for a product
 * @access Private - requires 'read' permission on 'RestaurantStock'
 */
router.get('/product/:productId',
  authorize('read', 'RestaurantStock'),
  stockMovementController.getProductHistory
);

/**
 * @route GET /api/v1/restaurant/stock-movements/:id
 * @desc Get stock movement by ID
 * @access Private - requires 'read' permission on 'RestaurantStock'
 */
router.get('/:id',
  authorize('read', 'RestaurantStock'),
  stockMovementController.getMovementById
);

/**
 * @route POST /api/v1/restaurant/stock-movements/stock-in
 * @desc Record stock in (receive inventory)
 * @access Private - requires 'create' permission on 'RestaurantStock'
 */
router.post('/stock-in',
  authorize('create', 'RestaurantStock'),
  stockMovementController.recordStockIn
);

/**
 * @route POST /api/v1/restaurant/stock-movements/stock-out
 * @desc Record stock out (dispatch inventory)
 * @access Private - requires 'create' permission on 'RestaurantStock'
 */
router.post('/stock-out',
  authorize('create', 'RestaurantStock'),
  stockMovementController.recordStockOut
);

/**
 * @route POST /api/v1/restaurant/stock-movements/adjustment
 * @desc Record stock adjustment
 * @access Private - requires 'create' permission on 'RestaurantStock'
 */
router.post('/adjustment',
  authorize('create', 'RestaurantStock'),
  stockMovementController.recordAdjustment
);

/**
 * @route POST /api/v1/restaurant/stock-movements/bulk-stock-in
 * @desc Bulk stock in (multiple products)
 * @access Private - requires 'create' permission on 'RestaurantStock'
 */
router.post('/bulk-stock-in',
  authorize('create', 'RestaurantStock'),
  stockMovementController.bulkStockIn
);

module.exports = router;
