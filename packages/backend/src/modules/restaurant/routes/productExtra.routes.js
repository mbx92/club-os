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
 * @access Private - requires 'read' permission on 'Product'
 */
router.get('/',
  authorize('read', 'Product'),
  productExtraController.getProductExtras
);

/**
 * @route GET /api/v1/restaurant/products/:productId/extras/groups
 * @desc Get extras grouped by groupName
 * @access Private - requires 'read' permission on 'Product'
 */
router.get('/groups',
  authorize('read', 'Product'),
  productExtraController.getExtrasByGroup
);

/**
 * @route POST /api/v1/restaurant/products/:productId/extras
 * @desc Create a new extra for a product
 * @access Private - requires 'create' permission on 'Product'
 */
router.post('/',
  authorize('create', 'Product'),
  productExtraController.createProductExtra
);

/**
 * @route POST /api/v1/restaurant/products/:productId/extras/bulk
 * @desc Bulk create extras for a product
 * @access Private - requires 'create' permission on 'Product'
 */
router.post('/bulk',
  authorize('create', 'Product'),
  productExtraController.bulkCreateExtras
);

/**
 * @route POST /api/v1/restaurant/products/:productId/extras/migrate
 * @desc Migrate extras from productDetails (JSONB) to ProductExtras table
 * @access Private - requires 'update' permission on 'Product'
 */
router.post('/migrate',
  authorize('update', 'Product'),
  productExtraController.migrateExtrasToTable
);

/**
 * @route POST /api/v1/restaurant/products/:productId/extras/migrate-all
 * @desc Bulk migrate ALL products' extras from productDetails to table
 * @access Private - requires 'update' permission on 'Product'
 */
router.post('/migrate-all',
  authorize('update', 'Product'),
  productExtraController.migrateAllExtrasToTable
);

/**
 * @route DELETE /api/v1/restaurant/products/:productId/extras/json/:extraName
 * @desc Delete an extra from productDetails.extras (JSONB) by name
 * @access Private - requires 'delete' permission on 'Product'
 */
router.delete('/json/:extraName',
  authorize('delete', 'Product'),
  productExtraController.deleteJsonExtra
);

/**
 * @route PUT /api/v1/restaurant/products/:productId/extras/:extraId
 * @desc Update a product extra
 * @access Private - requires 'update' permission on 'Product'
 */
router.put('/:extraId',
  authorize('update', 'Product'),
  productExtraController.updateProductExtra
);

/**
 * @route PATCH /api/v1/restaurant/products/:productId/extras/:extraId/toggle
 * @desc Toggle extra status (active/inactive)
 * @access Private - requires 'update' permission on 'Product'
 */
router.patch('/:extraId/toggle',
  authorize('update', 'Product'),
  productExtraController.toggleExtraStatus
);

/**
 * @route DELETE /api/v1/restaurant/products/:productId/extras/:extraId
 * @desc Delete a product extra (soft delete)
 * @access Private - requires 'delete' permission on 'Product'
 */
router.delete('/:extraId',
  authorize('delete', 'Product'),
  productExtraController.deleteProductExtra
);

module.exports = router;
