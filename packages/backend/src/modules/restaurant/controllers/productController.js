'use strict';

/**
 * Product Controller - Restaurant Module
 * 
 * Handles product CRUD operations with JSONB support for variants and customizations.
 * Includes stock management, low stock alerts, and multi-location support.
 * 
 * @module modules/restaurant/controllers/productController
 */

const { Product, ProductCategory, Location, StockMovement } = require('../../../models');
const { Op } = require('sequelize');
const { JsonbQueryHelper } = require('../utils');
const { createError } = require('../../../utils/errorCodes');

/**
 * Get all products with filters
 */
const getAllProducts = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      page = 1,
      limit = 50,
      search,
      categoryId,
      locationId,
      isActive,
      trackInventory,
      lowStock,
      productType
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Tenant filtering
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Search by name or SKU
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
        { barcode: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Category filter
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Location filter
    if (locationId) {
      where.locationId = locationId;
    }

    // Active filter
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Track inventory filter
    if (trackInventory !== undefined) {
      where.trackInventory = trackInventory === 'true';
    }

    // Low stock filter
    if (lowStock === 'true') {
      where[Op.and] = [
        { trackInventory: true },
        { stockQuantity: { [Op.lte]: Product.sequelize.col('minStockLevel') } }
      ];
    }

    // Product type filter (JSONB)
    if (productType) {
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push(
        Product.sequelize.where(
          Product.sequelize.cast(Product.sequelize.json('productDetails.productType'), 'text'),
          '=',
          productType
        )
      );
    }

    const { count, rows: products } = await Product.findAndCountAll({
      where,
      include: [
        { model: ProductCategory, as: 'productCategory', attributes: ['id', 'name', 'color'] },
        { model: Location, as: 'location', attributes: ['id', 'name', 'code'] }
      ],
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: products,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product by ID
 */
const getProductById = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const product = await Product.findOne({
      where,
      include: [
        { model: ProductCategory, as: 'productCategory' },
        { model: Location, as: 'location' },
        {
          model: StockMovement,
          as: 'stockMovements',
          limit: 10,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!product) {
      throw createError('PRODUCT_NOT_FOUND', 'Product not found');
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new product
 */
const createProduct = async (req, res, next) => {
  const t = await Product.sequelize.transaction();

  try {
    const { tenantId } = req.user;
    const productData = {
      ...req.body,
      tenantId,
      createdBy: req.user.id
    };

    // Handle image upload
    if (req.file) {
      productData.image = `uploads/products/${req.file.filename}`;
    }

    // Validate SKU uniqueness
    const existingSku = await Product.findOne({
      where: { tenantId, sku: productData.sku },
      transaction: t
    });

    if (existingSku) {
      throw createError('DUPLICATE_SKU', 'Product with this SKU already exists');
    }

    // Create product
    const product = await Product.create(productData, { transaction: t });

    // If initial stock > 0, create stock movement
    if (product.stockQuantity > 0 && product.trackInventory) {
      await StockMovement.create({
        tenantId,
        productId: product.id,
        locationId: product.locationId,
        movementType: 'in',
        quantity: product.stockQuantity,
        previousQuantity: 0,
        newQuantity: product.stockQuantity,
        referenceType: 'initial_stock',
        notes: 'Initial stock entry',
        performedBy: req.user.id
      }, { transaction: t });
    }

    await t.commit();

    const createdProduct = await Product.findByPk(product.id, {
      include: [
        { model: ProductCategory, as: 'productCategory' },
        { model: Location, as: 'location' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: createdProduct
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * Update product
 */
const updateProduct = async (req, res, next) => {
  const t = await Product.sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const product = await Product.findOne({ where, transaction: t, lock: t.LOCK.UPDATE });

    if (!product) {
      throw createError('PRODUCT_NOT_FOUND', 'Product not found');
    }

    // Check SKU uniqueness if changed
    if (req.body.sku && req.body.sku !== product.sku) {
      const existingSku = await Product.findOne({
        where: {
          tenantId: product.tenantId,
          sku: req.body.sku,
          id: { [Op.ne]: id }
        },
        transaction: t
      });

      if (existingSku) {
        throw createError('DUPLICATE_SKU', 'Product with this SKU already exists');
      }
    }

    // Track stock changes
    const oldStock = product.stockQuantity;
    const newStock = req.body.stockQuantity !== undefined ? req.body.stockQuantity : oldStock;
    const stockChanged = newStock !== oldStock && product.trackInventory;

    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };

    // Handle image upload
    if (req.file) {
      updateData.image = `uploads/products/${req.file.filename}`;
    }

    // Update product
    await product.update(updateData, { transaction: t });

    // Record stock adjustment if changed
    if (stockChanged) {
      await StockMovement.create({
        tenantId: product.tenantId,
        productId: product.id,
        locationId: product.locationId,
        movementType: 'adjustment',
        quantity: newStock - oldStock,
        previousQuantity: oldStock,
        newQuantity: newStock,
        referenceType: 'manual_adjustment',
        notes: req.body.adjustmentNotes || 'Stock adjustment via product update',
        performedBy: req.user.id
      }, { transaction: t });
    }

    await t.commit();

    const updatedProduct = await Product.findByPk(id, {
      include: [
        { model: ProductCategory, as: 'productCategory' },
        { model: Location, as: 'location' }
      ]
    });

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * Delete product (soft delete)
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const product = await Product.findOne({ where });

    if (!product) {
      throw createError('PRODUCT_NOT_FOUND', 'Product not found');
    }

    await product.destroy();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get low stock products
 */
const getLowStockProducts = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { locationId } = req.query;

    const where = {
      trackInventory: true,
      isActive: true,
      [Op.and]: Product.sequelize.where(
        Product.sequelize.col('stockQuantity'),
        Op.lte,
        Product.sequelize.col('minStockLevel')
      )
    };

    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    const products = await Product.findAll({
      where,
      include: [
        { model: ProductCategory, as: 'productCategory' },
        { model: Location, as: 'location' }
      ],
      order: [
        [Product.sequelize.literal('("stockQuantity" / NULLIF("minStockLevel", 0))'), 'ASC']
      ]
    });

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Adjust product stock
 * 
 * Supports two request formats for backward compatibility:
 * - New format: { quantity, type: 'add'|'remove'|'set', notes }
 * - Legacy format: { newQuantity, notes } (treated as type: 'set')
 */
const adjustStock = async (req, res, next) => {
  const t = await Product.sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { quantity, newQuantity: legacyNewQuantity, type, notes } = req.body;

    // Support legacy format: { newQuantity } treated as { quantity, type: 'set' }
    const effectiveQuantity = quantity !== undefined ? quantity : legacyNewQuantity;
    const effectiveType = type || 'set';

    // Validate input
    const adjustmentQty = parseInt(effectiveQuantity, 10);
    if (isNaN(adjustmentQty) || adjustmentQty < 0) {
      throw createError('VALIDATION_ERROR', 'Quantity must be a non-negative number');
    }

    if (!['add', 'remove', 'set'].includes(effectiveType)) {
      throw createError('VALIDATION_ERROR', 'Type must be "add", "remove", or "set"');
    }

    // For add/remove, quantity must be positive
    if ((effectiveType === 'add' || effectiveType === 'remove') && adjustmentQty <= 0) {
      throw createError('VALIDATION_ERROR', 'Quantity must be positive for add/remove operations');
    }

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const product = await Product.findOne({ where, transaction: t, lock: t.LOCK.UPDATE });

    if (!product) {
      throw createError('PRODUCT_NOT_FOUND', 'Product not found');
    }

    if (!product.trackInventory) {
      throw createError('INVALID_OPERATION', 'Product does not track inventory');
    }

    const previousQuantity = parseInt(product.stockQuantity, 10) || 0;
    let resultQuantity;
    let movementQuantity;
    let movementType;

    if (effectiveType === 'add') {
      resultQuantity = previousQuantity + adjustmentQty;
      movementQuantity = adjustmentQty;
      movementType = 'in';
    } else if (effectiveType === 'remove') {
      resultQuantity = previousQuantity - adjustmentQty;
      if (resultQuantity < 0) {
        throw createError('INSUFFICIENT_STOCK', `Insufficient stock. Available: ${previousQuantity}, Requested: ${adjustmentQty}`);
      }
      movementQuantity = -adjustmentQty;
      movementType = 'out';
    } else { // effectiveType === 'set'
      resultQuantity = adjustmentQty;
      movementQuantity = adjustmentQty - previousQuantity;
      movementType = 'adjustment';
    }

    // Update stock
    await product.update({ stockQuantity: resultQuantity }, { transaction: t });

    // Record movement
    await StockMovement.create({
      tenantId: product.tenantId,
      productId: product.id,
      locationId: product.locationId || null,
      movementType,
      quantity: movementQuantity,
      previousQuantity,
      newQuantity: resultQuantity,
      referenceType: 'manual_adjustment',
      notes: notes || `Manual stock ${effectiveType}`,
      performedBy: req.user.id
    }, { transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: {
        productId: product.id,
        productName: product.name,
        previousQuantity,
        newQuantity: resultQuantity,
        adjustment: movementQuantity,
        type: effectiveType
      }
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  adjustStock
};
