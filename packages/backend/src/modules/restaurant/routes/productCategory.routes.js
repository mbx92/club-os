'use strict';

/**
 * Product Category Routes - Restaurant Module
 * 
 * @module modules/restaurant/routes/productCategory.routes
 */

const express = require('express');
const router = express.Router();
const productCategoryController = require('../controllers/productCategoryController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

// All routes require authentication and restaurant module access
router.use(authenticate);
router.use(requireModule('restaurant'));

/**
 * @route GET /api/v1/restaurant/categories
 * @desc Get all categories (flat list or tree structure)
 * @query tree=true - return hierarchical tree
 * @query parentId - filter by parent
 * @query includeCount=true - include product count
 * @access Private - requires 'read' permission on 'RestaurantCategory'
 */
router.get('/',
  authorize('read', 'RestaurantCategory'),
  productCategoryController.getAllCategories
);

/**
 * @route GET /api/v1/restaurant/categories/tree
 * @desc Get category tree structure
 * @access Private - requires 'read' permission on 'RestaurantCategory'
 */
router.get('/tree',
  authorize('read', 'RestaurantCategory'),
  productCategoryController.getCategoryTree
);

/**
 * @route POST /api/v1/restaurant/categories/reorder
 * @desc Reorder categories (update displayOrder)
 * @access Private - requires 'update' permission on 'RestaurantCategory'
 */
router.post('/reorder',
  authorize('update', 'RestaurantCategory'),
  productCategoryController.reorderCategories
);

/**
 * @route GET /api/v1/restaurant/categories/:id
 * @desc Get category by ID with full path
 * @access Private - requires 'read' permission on 'RestaurantCategory'
 */
router.get('/:id',
  authorize('read', 'RestaurantCategory'),
  productCategoryController.getCategoryById
);

/**
 * @route POST /api/v1/restaurant/categories
 * @desc Create new category
 * @access Private - requires 'create' permission on 'RestaurantCategory'
 */
router.post('/',
  authorize('create', 'RestaurantCategory'),
  productCategoryController.createCategory
);

/**
 * @route PUT /api/v1/restaurant/categories/:id
 * @desc Update category
 * @access Private - requires 'update' permission on 'RestaurantCategory'
 */
router.put('/:id',
  authorize('update', 'RestaurantCategory'),
  productCategoryController.updateCategory
);

/**
 * @route DELETE /api/v1/restaurant/categories/:id
 * @desc Delete category
 * @query moveProductsTo - category ID to move products to
 * @access Private - requires 'delete' permission on 'RestaurantCategory'
 */
router.delete('/:id',
  authorize('delete', 'RestaurantCategory'),
  productCategoryController.deleteCategory
);

module.exports = router;
