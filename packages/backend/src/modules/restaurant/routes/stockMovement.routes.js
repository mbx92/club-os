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
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

// All routes require authentication and restaurant module access
router.use(authenticate);
router.use(requireModule('restaurant'));

/**
 * @route GET /api/v1/restaurant/stock-movements/report
 * @desc Get stock report (current, low-stock, or movements)
 * @access Private - requires 'read' permission on 'StockMovement'
 * @query reportType - 'current' | 'low-stock' | 'movements'
 * @query locationId - Optional location filter
 * @query categoryId - Optional category filter
 * @query startDate - Required for 'movements' report type
 * @query endDate - Required for 'movements' report type
 */
router.get('/report',
  authorizeCasl('read', 'StockMovement'),
  stockMovementController.getStockReport
);

/**
 * @route GET /api/v1/restaurant/stock-movements
 * @desc Get all stock movements with filters
 * @access Private - requires 'read' permission on 'StockMovement'
 */
router.get('/',
  authorizeCasl('read', 'StockMovement'),
  stockMovementController.getAllMovements
);

/**
 * @route GET /api/v1/restaurant/stock-movements/summary
 * @desc Get stock movement summary by date range
 * @access Private - requires 'read' permission on 'StockMovement'
 */
router.get('/summary',
  authorizeCasl('read', 'StockMovement'),
  stockMovementController.getSummary
);

/**
 * @route GET /api/v1/restaurant/stock-movements/most-moved
 * @desc Get most moved products
 * @access Private - requires 'read' permission on 'StockMovement'
 */
router.get('/most-moved',
  authorizeCasl('read', 'StockMovement'),
  stockMovementController.getMostMovedProducts
);

/**
 * @route GET /api/v1/restaurant/stock-movements/product/:productId
 * @desc Get stock movement history for a product
 * @access Private - requires 'read' permission on 'StockMovement'
 */
router.get('/product/:productId',
  authorizeCasl('read', 'StockMovement'),
  stockMovementController.getProductHistory
);

/**
 * @route GET /api/v1/restaurant/stock-movements/:id
 * @desc Get stock movement by ID
 * @access Private - requires 'read' permission on 'StockMovement'
 */
router.get('/:id',
  authorizeCasl('read', 'StockMovement'),
  stockMovementController.getMovementById
);

/**
 * @route POST /api/v1/restaurant/stock-movements/stock-in
 * @desc Record stock in (receive inventory)
 * @access Private - requires 'create' permission on 'StockMovement'
 */
router.post('/stock-in',
  authorizeCasl('create', 'StockMovement'),
  stockMovementController.recordStockIn
);

/**
 * @route POST /api/v1/restaurant/stock-movements/stock-out
 * @desc Record stock out (dispatch inventory)
 * @access Private - requires 'create' permission on 'StockMovement'
 */
router.post('/stock-out',
  authorizeCasl('create', 'StockMovement'),
  stockMovementController.recordStockOut
);

/**
 * @route POST /api/v1/restaurant/stock-movements/adjustment
 * @desc Record stock adjustment
 * @access Private - requires 'create' permission on 'StockMovement'
 */
router.post('/adjustment',
  authorizeCasl('create', 'StockMovement'),
  stockMovementController.recordAdjustment
);

/**
 * @route POST /api/v1/restaurant/stock-movements/bulk-stock-in
 * @desc Bulk stock in (multiple products)
 * @access Private - requires 'create' permission on 'StockMovement'
 */
router.post('/bulk-stock-in',
  authorizeCasl('create', 'StockMovement'),
  stockMovementController.bulkStockIn
);

module.exports = router;
