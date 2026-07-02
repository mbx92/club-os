'use strict';

/**
 * ProductExtra Routes - Restaurant Module
 * 
 * Routes for managing product extras/additions (e.g., "Extra Telur +5000").
 * Nested under product routes.
 * 
 * @module modules/restaurant/routes/productExtra.routes
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :productId from parent router
const productExtraController = require('../controllers/productExtraController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

// All routes require authentication and restaurant module access
router.use(authenticate);
router.use(requireModule('restaurant'));

/**
 * @route GET /api/v1/restaurant/products/:productId/extras
 * @desc Get all extras for a product (optional: ?grouped=true for grouped format)
 * @access Private - requires 'read' permission on 'RestaurantProduct'
 */
router.get('/',
  authorize('read', 'RestaurantProduct'),
  productExtraController.getProductExtras
);

/**
 * @route GET /api/v1/restaurant/products/:productId/extras/groups
 * @desc Get extras grouped by groupName
 * @access Private - requires 'read' permission on 'RestaurantProduct'
 */
router.get('/groups',
  authorize('read', 'RestaurantProduct'),
  productExtraController.getExtrasByGroup
);

/**
 * @route POST /api/v1/restaurant/products/:productId/extras
 * @desc Create a new extra for a product
 * @access Private - requires 'create' permission on 'RestaurantProduct'
 */
router.post('/',
  authorize('create', 'RestaurantProduct'),
  productExtraController.createProductExtra
);

/**
 * @route POST /api/v1/restaurant/products/:productId/extras/bulk
 * @desc Bulk create extras for a product
 * @access Private - requires 'create' permission on 'RestaurantProduct'
 */
router.post('/bulk',
  authorize('create', 'RestaurantProduct'),
  productExtraController.bulkCreateExtras
);

/**
 * @route POST /api/v1/restaurant/products/:productId/extras/migrate
 * @desc Migrate extras from productDetails (JSONB) to ProductExtras table
 * @access Private - requires 'update' permission on 'RestaurantProduct'
 */
router.post('/migrate',
  authorize('update', 'RestaurantProduct'),
  productExtraController.migrateExtrasToTable
);

/**
 * @route POST /api/v1/restaurant/products/:productId/extras/migrate-all
 * @desc Bulk migrate ALL products' extras from productDetails to table
 * @access Private - requires 'update' permission on 'RestaurantProduct'
 */
router.post('/migrate-all',
  authorize('update', 'RestaurantProduct'),
  productExtraController.migrateAllExtrasToTable
);

/**
 * @route DELETE /api/v1/restaurant/products/:productId/extras/json/:extraName
 * @desc Delete an extra from productDetails.extras (JSONB) by name
 * @access Private - requires 'delete' permission on 'RestaurantProduct'
 */
router.delete('/json/:extraName',
  authorize('delete', 'RestaurantProduct'),
  productExtraController.deleteJsonExtra
);

/**
 * @route PUT /api/v1/restaurant/products/:productId/extras/:extraId
 * @desc Update a product extra
 * @access Private - requires 'update' permission on 'RestaurantProduct'
 */
router.put('/:extraId',
  authorize('update', 'RestaurantProduct'),
  productExtraController.updateProductExtra
);

/**
 * @route PATCH /api/v1/restaurant/products/:productId/extras/:extraId/toggle
 * @desc Toggle extra status (active/inactive)
 * @access Private - requires 'update' permission on 'RestaurantProduct'
 */
router.patch('/:extraId/toggle',
  authorize('update', 'RestaurantProduct'),
  productExtraController.toggleExtraStatus
);

/**
 * @route DELETE /api/v1/restaurant/products/:productId/extras/:extraId
 * @desc Delete a product extra (soft delete)
 * @access Private - requires 'delete' permission on 'RestaurantProduct'
 */
router.delete('/:extraId',
  authorize('delete', 'RestaurantProduct'),
  productExtraController.deleteProductExtra
);

module.exports = router;
