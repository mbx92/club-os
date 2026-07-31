'use strict';

/**
 * Stock Movement Controller - Restaurant Module
 * 
 * Handles stock movement operations including stock in, out, adjustments, and transfers.
 * Provides history tracking and analytics.
 * 
 * @module modules/restaurant/controllers/stockMovementController
 */

const { StockMovement, Product, Location, User } = require('../../../models');
const { Op } = require('sequelize');
const { createError } = require('../../../utils/errorCodes');
const { getTenantTimezone } = require('../../../utils/tenantTimezone');
const { mergeDateRangeInto, buildInclusiveDateRange, buildStartOfDay, buildEndOfDay } = require('../../../utils/dateRange');

/**
 * Get all stock movements with filters
 */
const getAllMovements = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      page = 1,
      limit = 50,
      productId,
      locationId,
      movementType,
      referenceType,
      startDate,
      endDate
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Tenant filtering
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Product filter
    if (productId) {
      where.productId = productId;
    }

    // Location filter
    if (locationId) {
      where.locationId = locationId;
    }

    // Movement type filter
    if (movementType) {
      where.movementType = movementType;
    }

    // Reference type filter
    if (referenceType) {
      where.referenceType = referenceType;
    }

    // Date range filter
    mergeDateRangeInto(where, 'createdAt', startDate, endDate, Op, getTenantTimezone(req));

    const { count, rows: movements } = await StockMovement.findAndCountAll({
      where,
      include: [
        { 
          model: Product, 
          as: 'product',
          attributes: ['id', 'name', 'sku', 'stockQuantity']
        },
        { 
          model: Location, 
          as: 'location',
          attributes: ['id', 'name', 'code']
        },
        { 
          model: User, 
          as: 'performer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: movements,
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
 * Get stock movement by ID
 */
const getMovementById = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const movement = await StockMovement.findOne({
      where,
      include: [
        { model: Product, as: 'product' },
        { model: Location, as: 'location' },
        { model: User, as: 'performer', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    if (!movement) {
      throw createError('NOT_FOUND', 'Stock movement not found');
    }

    res.json({
      success: true,
      data: movement
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Record stock in (receive inventory)
 */
const recordStockIn = async (req, res, next) => {
  const t = await StockMovement.sequelize.transaction();

  try {
    const { tenantId } = req.user;
    const { productId, locationId, quantity, referenceType, referenceId, notes } = req.body;

    if (quantity <= 0) {
      throw createError('VALIDATION_ERROR', 'Quantity must be positive');
    }

    // Verify product exists and belongs to tenant
    const product = await Product.findOne({
      where: { id: productId, tenantId },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!product) {
      throw createError('NOT_FOUND', 'Product not found');
    }

    // Record stock in
    const movement = await StockMovement.recordStockIn({
      tenantId,
      productId,
      locationId: locationId || product.locationId,
      quantity,
      referenceType: referenceType || 'manual_stock_in',
      referenceId,
      notes,
      performedBy: req.user.id,
      transaction: t
    });

    await t.commit();

    // Reload with associations
    const createdMovement = await StockMovement.findByPk(movement.id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'stockQuantity'] },
        { model: Location, as: 'location', attributes: ['id', 'name', 'code'] }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Stock in recorded successfully',
      data: createdMovement
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * Record stock out (dispatch inventory)
 */
const recordStockOut = async (req, res, next) => {
  const t = await StockMovement.sequelize.transaction();

  try {
    const { tenantId } = req.user;
    const { productId, locationId, quantity, referenceType, referenceId, notes } = req.body;

    if (quantity <= 0) {
      throw createError('VALIDATION_ERROR', 'Quantity must be positive');
    }

    // Verify product exists and belongs to tenant
    const product = await Product.findOne({
      where: { id: productId, tenantId },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!product) {
      throw createError('NOT_FOUND', 'Product not found');
    }

    // Record stock out
    const movement = await StockMovement.recordStockOut({
      tenantId,
      productId,
      locationId: locationId || product.locationId,
      quantity,
      referenceType: referenceType || 'manual_stock_out',
      referenceId,
      notes,
      performedBy: req.user.id,
      transaction: t
    });

    await t.commit();

    // Reload with associations
    const createdMovement = await StockMovement.findByPk(movement.id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'stockQuantity'] },
        { model: Location, as: 'location', attributes: ['id', 'name', 'code'] }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Stock out recorded successfully',
      data: createdMovement
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * Record stock adjustment
 */
const recordAdjustment = async (req, res, next) => {
  const t = await StockMovement.sequelize.transaction();

  try {
    const { tenantId } = req.user;
    const { productId, locationId, newQuantity, notes } = req.body;

    if (newQuantity < 0) {
      throw createError('VALIDATION_ERROR', 'New quantity cannot be negative');
    }

    // Verify product exists and belongs to tenant
    const product = await Product.findOne({
      where: { id: productId, tenantId },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!product) {
      throw createError('NOT_FOUND', 'Product not found');
    }

    // Record adjustment
    const movement = await StockMovement.recordAdjustment({
      tenantId,
      productId,
      locationId: locationId || product.locationId,
      newQuantity,
      notes,
      performedBy: req.user.id,
      transaction: t
    });

    await t.commit();

    // Reload with associations
    const createdMovement = await StockMovement.findByPk(movement.id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'stockQuantity'] },
        { model: Location, as: 'location', attributes: ['id', 'name', 'code'] }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Stock adjustment recorded successfully',
      data: createdMovement
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * Get product stock history
 */
const getProductHistory = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { productId } = req.params;
    const { limit = 50 } = req.query;

    // Verify product access
    const productWhere = { id: productId };
    if (!isSuperAdmin) {
      productWhere.tenantId = tenantId;
    }

    const product = await Product.findOne({ where: productWhere });
    if (!product) {
      throw createError('NOT_FOUND', 'Product not found');
    }

    const movements = await StockMovement.getProductHistory(productId, parseInt(limit));

    res.json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          currentStock: product.stockQuantity
        },
        movements
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get stock movement summary by date range
 */
const getSummary = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { 
      startDate, 
      endDate, 
      locationId 
    } = req.query;

    const effectiveTenantId = isSuperAdmin ? req.query.tenantId : tenantId;

    if (!effectiveTenantId) {
      throw createError('VALIDATION_ERROR', 'Tenant ID is required');
    }

    if (!startDate || !endDate) {
      throw createError('VALIDATION_ERROR', 'Start date and end date are required');
    }

    const tz = getTenantTimezone(req);
    const { start, end } = buildInclusiveDateRange(startDate, endDate, tz);

    const summary = await StockMovement.getSummaryByDateRange(
      effectiveTenantId,
      start,
      end,
      locationId
    );

    res.json({
      success: true,
      data: {
        dateRange: {
          from: startDate,
          to: endDate
        },
        locationId: locationId || 'all',
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get most moved products
 */
const getMostMovedProducts = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { 
      startDate, 
      endDate, 
      limit = 10 
    } = req.query;

    const effectiveTenantId = isSuperAdmin ? req.query.tenantId : tenantId;

    if (!effectiveTenantId) {
      throw createError('VALIDATION_ERROR', 'Tenant ID is required');
    }

    // Default to last 30 days if not specified
    const tz = getTenantTimezone(req);
    const end = endDate ? buildEndOfDay(endDate, tz) : new Date();
    const start = startDate ? buildStartOfDay(startDate, tz) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const products = await StockMovement.getMostMovedProducts(
      effectiveTenantId,
      start,
      end,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        dateRange: {
          from: start.toISOString(),
          to: end.toISOString()
        },
        products
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk stock in (multiple products)
 */
const bulkStockIn = async (req, res, next) => {
  const t = await StockMovement.sequelize.transaction();

  try {
    const { tenantId } = req.user;
    const { items, referenceType, referenceId, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw createError('VALIDATION_ERROR', 'Items array is required');
    }

    const movements = [];
    const errors = [];

    for (const item of items) {
      try {
        const { productId, locationId, quantity } = item;

        if (quantity <= 0) {
          errors.push({ productId, error: 'Quantity must be positive' });
          continue;
        }

        const product = await Product.findOne({
          where: { id: productId, tenantId },
          transaction: t,
          lock: t.LOCK.UPDATE
        });

        if (!product) {
          errors.push({ productId, error: 'Product not found' });
          continue;
        }

        const movement = await StockMovement.recordStockIn({
          tenantId,
          productId,
          locationId: locationId || product.locationId,
          quantity,
          referenceType: referenceType || 'bulk_stock_in',
          referenceId,
          notes: item.notes || notes,
          performedBy: req.user.id,
          transaction: t
        });

        movements.push({
          productId,
          productName: product.name,
          quantity,
          newQuantity: movement.newQuantity
        });
      } catch (err) {
        errors.push({ productId: item.productId, error: err.message });
      }
    }

    if (movements.length === 0) {
      await t.rollback();
      throw createError('VALIDATION_ERROR', 'No items were processed successfully', { errors });
    }

    await t.commit();

    res.status(201).json({
      success: true,
      message: `${movements.length} items processed successfully`,
      data: {
        processed: movements,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * Get stock report
 * 
 * Supports multiple report types:
 * - current: Current stock levels for all products
 * - low-stock: Products below their minimum stock threshold
 * - movements: Summary of stock movements (in/out/adjustments)
 */
const getStockReport = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { 
      reportType = 'current', 
      locationId, 
      categoryId,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const effectiveTenantId = isSuperAdmin ? req.query.tenantId : tenantId;

    if (!effectiveTenantId) {
      throw createError('VALIDATION_ERROR', 'Tenant ID is required');
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let reportData;

    switch (reportType) {
      case 'current': {
        // Current stock levels
        const where = { tenantId: effectiveTenantId, trackInventory: true };
        if (locationId) where.locationId = locationId;
        if (categoryId) where.categoryId = categoryId;

        const { count, rows: products } = await Product.findAndCountAll({
          where,
          attributes: ['id', 'name', 'sku', 'stockQuantity', 'minStockLevel', 'unit', 'locationId', 'categoryId'],
          include: [
            { model: Location, as: 'location', attributes: ['id', 'name', 'code'] }
          ],
          order: [['name', 'ASC']],
          limit: parseInt(limit),
          offset
        });

        reportData = {
          reportType: 'current',
          products: products.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            stockQuantity: p.stockQuantity,
            minStockLevel: p.minStockLevel,
            unit: p.unit,
            status: p.stockQuantity <= 0 ? 'out-of-stock' : 
                    (p.minStockLevel && p.stockQuantity <= p.minStockLevel) ? 'low-stock' : 'in-stock',
            location: p.location
          })),
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / parseInt(limit))
          }
        };
        break;
      }

      case 'low-stock': {
        // Products below minimum stock threshold
        const where = { 
          tenantId: effectiveTenantId, 
          trackInventory: true,
          [Op.and]: [
            { minStockLevel: { [Op.ne]: null } },
            { minStockLevel: { [Op.gt]: 0 } }
          ]
        };
        if (locationId) where.locationId = locationId;
        if (categoryId) where.categoryId = categoryId;

        const products = await Product.findAll({
          where,
          attributes: ['id', 'name', 'sku', 'stockQuantity', 'minStockLevel', 'unit', 'locationId'],
          include: [
            { model: Location, as: 'location', attributes: ['id', 'name', 'code'] }
          ],
          order: [['stockQuantity', 'ASC']]
        });

        // Filter products where stock is at or below minimum
        const lowStockProducts = products.filter(p => p.stockQuantity <= p.minStockLevel);

        reportData = {
          reportType: 'low-stock',
          totalLowStockItems: lowStockProducts.length,
          products: lowStockProducts.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            stockQuantity: p.stockQuantity,
            minStockLevel: p.minStockLevel,
            shortage: p.minStockLevel - p.stockQuantity,
            unit: p.unit,
            status: p.stockQuantity <= 0 ? 'out-of-stock' : 'low-stock',
            location: p.location
          }))
        };
        break;
      }

      case 'movements': {
        // Stock movements summary
        if (!startDate || !endDate) {
          throw createError('VALIDATION_ERROR', 'Start date and end date are required for movements report');
        }

        const tz = getTenantTimezone(req);
        const { start, end } = buildInclusiveDateRange(startDate, endDate, tz);

        const movementWhere = {
          tenantId: effectiveTenantId,
          createdAt: { [Op.between]: [start, end] }
        };
        if (locationId) movementWhere.locationId = locationId;

        const summary = await StockMovement.getSummaryByDateRange(
          effectiveTenantId,
          start,
          end,
          locationId
        );

        // Get recent movements
        const { count, rows: movements } = await StockMovement.findAndCountAll({
          where: movementWhere,
          include: [
            { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
            { model: Location, as: 'location', attributes: ['id', 'name', 'code'] },
            { model: User, as: 'performer', attributes: ['id', 'firstName', 'lastName', 'email'] }
          ],
          order: [['createdAt', 'DESC']],
          limit: parseInt(limit),
          offset
        });

        reportData = {
          reportType: 'movements',
          dateRange: {
            from: startDate,
            to: endDate
          },
          summary: {
            stockIn: summary.in || { count: 0, totalQuantity: 0 },
            stockOut: summary.out || { count: 0, totalQuantity: 0 },
            adjustments: summary.adjustment || { count: 0, totalQuantity: 0 },
            transfers: summary.transfer || { count: 0, totalQuantity: 0 }
          },
          movements,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / parseInt(limit))
          }
        };
        break;
      }

      default:
        throw createError('VALIDATION_ERROR', 'Invalid report type. Must be "current", "low-stock", or "movements"');
    }

    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllMovements,
  getMovementById,
  recordStockIn,
  recordStockOut,
  recordAdjustment,
  getProductHistory,
  getSummary,
  getMostMovedProducts,
  bulkStockIn,
  getStockReport
};
