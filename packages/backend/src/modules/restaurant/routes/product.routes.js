'use strict';

/**
 * Product Routes - Restaurant Module
 * 
 * @module modules/restaurant/routes/product.routes
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const productExtraRoutes = require('./productExtra.routes');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');
const { productUpload } = require('../../../middlewares/uploadMiddleware');

// All routes require authentication and restaurant module access
router.use(authenticate);
router.use(requireModule('restaurant'));

/**
 * @route GET /api/v1/restaurant/products
 * @desc Get all products with filters (search, category, location, low stock)
 * @access Private - requires 'read' permission on 'RestaurantProduct'
 */
router.get('/',
  authorize('read', 'RestaurantProduct'),
  productController.getAllProducts
);

/**
 * @route GET /api/v1/restaurant/products/low-stock
 * @desc Get products with low stock levels
 * @access Private - requires 'read' permission on 'RestaurantProduct'
 */
router.get('/low-stock',
  authorize('read', 'RestaurantProduct'),
  productController.getLowStockProducts
);

/**
 * @route GET /api/v1/restaurant/products/:id
 * @desc Get product by ID with stock movements
 * @access Private - requires 'read' permission on 'RestaurantProduct'
 */
router.get('/:id',
  authorize('read', 'RestaurantProduct'),
  productController.getProductById
);

/**
 * @route POST /api/v1/restaurant/products
 * @desc Create new product
 * @access Private - requires 'create' permission on 'RestaurantProduct'
 */
router.post('/',
  authorize('create', 'RestaurantProduct'),
  productUpload.single('image'),
  productController.createProduct
);

/**
 * @route PUT /api/v1/restaurant/products/:id
 * @desc Update product details
 * @access Private - requires 'update' permission on 'RestaurantProduct'
 */
router.put('/:id',
  authorize('update', 'RestaurantProduct'),
  productUpload.single('image'),
  productController.updateProduct
);

/**
 * @route DELETE /api/v1/restaurant/products/:id
 * @desc Delete product (soft delete)
 * @access Private - requires 'delete' permission on 'RestaurantProduct'
 */
router.delete('/:id',
  authorize('delete', 'RestaurantProduct'),
  productController.deleteProduct
);

/**
 * @route POST /api/v1/restaurant/products/:id/adjust-stock
 * @desc Adjust product stock quantity
 * @access Private - requires 'update' permission on 'RestaurantProduct'
 */
router.post('/:id/adjust-stock',
  authorize('update', 'RestaurantProduct'),
  productController.adjustStock
);

/**
 * Nested routes for product extras
 * Mounted at /api/v1/restaurant/products/:productId/extras
 */
router.use('/:productId/extras', productExtraRoutes);

module.exports = router;
