/**
 * Restaurant Module - Routes Index
 * 
 * Aggregates all restaurant module routes
 * @module modules/restaurant/routes
 */

const express = require('express');
const router = express.Router();

// Import routes
const productRoutes = require('./product.routes');
const productCategoryRoutes = require('./productCategory.routes');
const tableRoutes = require('./table.routes');
const locationRoutes = require('./location.routes');
const stockMovementRoutes = require('./stockMovement.routes');
const orderRoutes = require('./order.routes');
const combinedBillingRoutes = require('./combinedBilling.routes');
const reportRoutes = require('./report.routes');
const dashboardRoutes = require('./dashboard.routes');

// Import controller for direct stock-report route
const stockMovementController = require('../controllers/stockMovementController');
const orderController = require('../controllers/orderController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

// ===== PUBLIC ROUTES (no auth required) =====

/**
 * @route GET /api/v1/restaurant/queue-display
 * @desc Get queue display data (for customer-facing monitor)
 * @query {UUID} tenantId - Tenant ID (required)
 * @query {UUID} [locationId] - Filter by location
 * @access Public - no auth required for display screens
 */
router.get('/queue-display', orderController.getQueueDisplay);

// ===== PROTECTED ROUTES =====

// Mount routes
router.use('/products', productRoutes);
router.use('/categories', productCategoryRoutes);
router.use('/tables', tableRoutes);
router.use('/locations', locationRoutes);
router.use('/stock-movements', stockMovementRoutes);
router.use('/orders', orderRoutes);
router.use('/billing', combinedBillingRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);

/**
 * @route GET /api/v1/restaurant/stock-report
 * @desc Get stock report (convenience alias for /stock-movements/report)
 * @access Private - requires 'read' permission on 'StockMovement'
 */
router.get('/stock-report',
  authenticate,
  requireModule('restaurant'),
  authorizeCasl('read', 'StockMovement'),
  stockMovementController.getStockReport
);

module.exports = router;
