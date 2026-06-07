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
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');
const { productUpload } = require('../../../middlewares/uploadMiddleware');

// All routes require authentication and restaurant module access
router.use(authenticate);
router.use(requireModule('restaurant'));

/**
 * @route GET /api/v1/restaurant/products
 * @desc Get all products with filters (search, category, location, low stock)
 * @access Private - requires 'read' permission on 'Product'
 */
router.get('/',
  authorizeCasl('read', 'Product'),
  productController.getAllProducts
);

/**
 * @route GET /api/v1/restaurant/products/low-stock
 * @desc Get products with low stock levels
 * @access Private - requires 'read' permission on 'Product'
 */
router.get('/low-stock',
  authorizeCasl('read', 'Product'),
  productController.getLowStockProducts
);

/**
 * @route GET /api/v1/restaurant/products/:id
 * @desc Get product by ID with stock movements
 * @access Private - requires 'read' permission on 'Product'
 */
router.get('/:id',
  authorizeCasl('read', 'Product'),
  productController.getProductById
);

/**
 * @route POST /api/v1/restaurant/products
 * @desc Create new product
 * @access Private - requires 'create' permission on 'Product'
 */
router.post('/',
  authorizeCasl('create', 'Product'),
  productUpload.single('image'),
  productController.createProduct
);

/**
 * @route PUT /api/v1/restaurant/products/:id
 * @desc Update product details
 * @access Private - requires 'update' permission on 'Product'
 */
router.put('/:id',
  authorizeCasl('update', 'Product'),
  productUpload.single('image'),
  productController.updateProduct
);

/**
 * @route DELETE /api/v1/restaurant/products/:id
 * @desc Delete product (soft delete)
 * @access Private - requires 'delete' permission on 'Product'
 */
router.delete('/:id',
  authorizeCasl('delete', 'Product'),
  productController.deleteProduct
);

/**
 * @route POST /api/v1/restaurant/products/:id/adjust-stock
 * @desc Adjust product stock quantity
 * @access Private - requires 'update' permission on 'Product'
 */
router.post('/:id/adjust-stock',
  authorizeCasl('update', 'Product'),
  productController.adjustStock
);

/**
 * Nested routes for product extras
 * Mounted at /api/v1/restaurant/products/:productId/extras
 */
router.use('/:productId/extras', productExtraRoutes);

module.exports = router;
