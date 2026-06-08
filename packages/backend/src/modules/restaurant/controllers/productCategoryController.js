'use strict';

/**
 * Product Category Controller - Restaurant Module
 * 
 * Handles hierarchical product category CRUD operations.
 * Supports parent-child relationships, category trees, and breadcrumb paths.
 * 
 * @module modules/restaurant/controllers/productCategoryController
 */

const { ProductCategory, Product } = require('../../../models');
const { Op } = require('sequelize');
const { createError } = require('../../../utils/errorCodes');

/**
 * Get all categories (flat list or tree structure)
 */
const getAllCategories = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { tree, parentId, isActive, includeCount } = req.query;

    const where = {};
    
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (parentId !== undefined) {
      where.parentId = parentId === 'null' ? null : parentId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Get categories
    const categories = await ProductCategory.findAll({
      where,
      include: includeCount === 'true' ? [
        { 
          model: Product, 
          as: 'products',
          attributes: [],
          required: false
        }
      ] : [],
      attributes: includeCount === 'true' ? [
        'id', 'name', 'description', 'parentId', 'color', 'icon', 'sortOrder', 'isActive',
        [ProductCategory.sequelize.fn('COUNT', ProductCategory.sequelize.col('products.id')), 'productCount']
      ] : undefined,
      group: includeCount === 'true' ? ['ProductCategory.id'] : undefined,
      order: [['sortOrder', 'ASC'], ['name', 'ASC']]
    });

    // Build tree structure if requested
    if (tree === 'true') {
      const buildTree = (parentId = null) => {
        return categories
          .filter(cat => cat.parentId === parentId)
          .map(cat => ({
            ...cat.toJSON(),
            productCount: includeCount === 'true' ? parseInt(cat.productCount, 10) || 0 : undefined,
            children: buildTree(cat.id)
          }));
      };

      const categoryTree = buildTree();

      return res.json({
        success: true,
        data: categoryTree,
        count: categoryTree.length
      });
    }

    res.json({
      success: true,
      data: includeCount === 'true'
        ? categories.map(cat => ({ ...cat.toJSON(), productCount: parseInt(cat.productCount, 10) || 0 }))
        : categories,
      count: categories.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get category by ID with full path
 */
const getCategoryById = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const category = await ProductCategory.findOne({
      where,
      include: [
        { 
          model: ProductCategory, 
          as: 'parent',
          attributes: ['id', 'name', 'parentId']
        },
        {
          model: ProductCategory,
          as: 'children',
          attributes: ['id', 'name', 'sortOrder', 'isActive']
        },
        {
          model: Product,
          as: 'products',
          attributes: ['id', 'name', 'sku', 'price', 'isActive'],
          where: { isActive: true },
          required: false
        }
      ]
    });

    if (!category) {
      throw createError('CATEGORY_NOT_FOUND', 'Category not found');
    }

    // Get full path
    const fullPath = await category.getFullPath();

    res.json({
      success: true,
      data: {
        ...category.toJSON(),
        fullPath
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new category
 */
const createCategory = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const categoryData = {
      ...req.body,
      tenantId,
      createdBy: req.user.id
    };

    // Validate parent exists if provided
    if (categoryData.parentId) {
      const parent = await ProductCategory.findOne({
        where: { id: categoryData.parentId, tenantId }
      });

      if (!parent) {
        throw createError('PARENT_NOT_FOUND', 'Parent category not found');
      }
    }

    // Check for duplicate name at same level
    const existingCategory = await ProductCategory.findOne({
      where: {
        tenantId,
        name: categoryData.name,
        parentId: categoryData.parentId || null
      }
    });

    if (existingCategory) {
      throw createError('DUPLICATE_CATEGORY', 'Category with this name already exists at this level');
    }

    const category = await ProductCategory.create(categoryData);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update category
 */
const updateCategory = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const category = await ProductCategory.findOne({ where });

    if (!category) {
      throw createError('CATEGORY_NOT_FOUND', 'Category not found');
    }

    // Prevent circular reference
    if (req.body.parentId) {
      if (req.body.parentId === id) {
        throw createError('INVALID_PARENT', 'Category cannot be its own parent');
      }

      // Check if new parent is a descendant
      const descendants = await category.getDescendants();
      const descendantIds = descendants.map(d => d.id);
      
      if (descendantIds.includes(req.body.parentId)) {
        throw createError('INVALID_PARENT', 'Cannot set a descendant as parent (circular reference)');
      }
    }

    // Check for duplicate name if changed
    if (req.body.name && req.body.name !== category.name) {
      const existingCategory = await ProductCategory.findOne({
        where: {
          tenantId: category.tenantId,
          name: req.body.name,
          parentId: req.body.parentId !== undefined ? req.body.parentId : category.parentId,
          id: { [Op.ne]: id }
        }
      });

      if (existingCategory) {
        throw createError('DUPLICATE_CATEGORY', 'Category with this name already exists at this level');
      }
    }

    await category.update({
      ...req.body,
      updatedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete category
 */
const deleteCategory = async (req, res, next) => {
  const t = await ProductCategory.sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { moveProductsTo } = req.query;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const category = await ProductCategory.findOne({ where, transaction: t });

    if (!category) {
      throw createError('CATEGORY_NOT_FOUND', 'Category not found');
    }

    // Check for children
    const childCount = await ProductCategory.count({
      where: { parentId: id, tenantId: category.tenantId },
      transaction: t
    });

    if (childCount > 0) {
      throw createError('CATEGORY_HAS_CHILDREN', 'Cannot delete category with subcategories');
    }

    // Handle products
    const productCount = await Product.count({
      where: { categoryId: id, tenantId: category.tenantId },
      transaction: t
    });

    if (productCount > 0) {
      if (moveProductsTo) {
        // Move products to another category
        const targetCategory = await ProductCategory.findOne({
          where: { id: moveProductsTo, tenantId: category.tenantId },
          transaction: t
        });

        if (!targetCategory) {
          throw createError('TARGET_CATEGORY_NOT_FOUND', 'Target category not found');
        }

        await Product.update(
          { categoryId: moveProductsTo },
          { where: { categoryId: id, tenantId: category.tenantId }, transaction: t }
        );
      } else {
        throw createError('CATEGORY_HAS_PRODUCTS', 'Cannot delete category with products. Move products first or provide moveProductsTo parameter.');
      }
    }

    await category.destroy({ transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * Get category tree for specific tenant
 */
const getCategoryTree = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { includeInactive } = req.query;

    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (includeInactive !== 'true') {
      where.isActive = true;
    }

    const categories = await ProductCategory.findAll({
      where,
      order: [['sortOrder', 'ASC'], ['name', 'ASC']]
    });

    // Build hierarchical tree
    const categoryMap = new Map();
    categories.forEach(cat => categoryMap.set(cat.id, { ...cat.toJSON(), children: [] }));

    const tree = [];
    categoryMap.forEach(cat => {
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId).children.push(cat);
      } else {
        tree.push(cat);
      }
    });

    res.json({
      success: true,
      data: tree,
      count: tree.length,
      totalCategories: categories.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reorder categories
 */
const reorderCategories = async (req, res, next) => {
  const t = await ProductCategory.sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { orders } = req.body; // [{ id, displayOrder }, ...]

    if (!Array.isArray(orders) || orders.length === 0) {
      throw createError('INVALID_INPUT', 'Orders array is required');
    }

    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Update sort order for each category
    for (const { id, sortOrder } of orders) {
      await ProductCategory.update(
        { sortOrder },
        { where: { ...where, id }, transaction: t }
      );
    }

    await t.commit();

    res.json({
      success: true,
      message: 'Categories reordered successfully'
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree,
  reorderCategories
};
