'use strict';

/**
 * ProductExtra Controller - Restaurant Module
 * 
 * Handles CRUD operations for product extras/additions.
 * Allows admin/staff to manage customizable extras for products.
 * 
 * @module modules/restaurant/controllers/productExtraController
 */

const { ProductExtra, Product, sequelize } = require('../../../models');
const logger = require('../../../utils/logger');
const { Op } = require('sequelize');

/**
 * Get all extras for a specific product
 * GET /api/v1/restaurant/products/:productId/extras
 * 
 * Supports two data sources:
 * 1. ProductExtra table (relational) - for manually created extras
 * 2. productDetails.extras (JSONB) - for imported extras from Dynasty menu
 */
exports.getProductExtras = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const tenantId = req.user.tenantId;
    const { grouped = false } = req.query;

    // Verify product exists and belongs to tenant
    const product = await Product.findOne({
      where: { id: productId, tenantId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Try to get extras from ProductExtra table first
    const extrasFromTable = await ProductExtra.findAll({
      where: {
        productId,
        tenantId
      },
      order: [
        ['groupName', 'ASC'],
        ['sortOrder', 'ASC'],
        ['name', 'ASC']
      ]
    });

    // If no extras in table, fallback to productDetails.extras (from import)
    let extras = extrasFromTable;
    let source = 'table';
    
    if (extrasFromTable.length === 0 && product.productDetails?.extras?.length > 0) {
      extras = product.productDetails.extras;
      source = 'productDetails';
    }

    if (grouped === 'true') {
      let groupedExtras = {};
      
      if (source === 'table') {
        // Use model method for table data
        groupedExtras = await ProductExtra.getGroupedExtras(productId, tenantId);
      } else {
        // Group productDetails.extras manually
        groupedExtras = extras.reduce((acc, extra) => {
          const group = extra.groupName || 'Default';
          if (!acc[group]) {
            acc[group] = [];
          }
          acc[group].push({
            id: extra.id || null,
            name: extra.name,
            price: parseFloat(extra.price || 0),
            isActive: extra.isActive !== false,
            source: 'productDetails'
          });
          return acc;
        }, {});
      }
      
      return res.json({
        success: true,
        data: {
          productId,
          productName: product.name,
          isCustomized: product.isCustomized,
          extras: groupedExtras,
          source
        }
      });
    }

    // Return flat list
    res.json({
      success: true,
      data: {
        productId,
        productName: product.name,
        isCustomized: product.isCustomized,
        extras,
        source
      }
    });
  } catch (err) {
    logger.error('Error fetching product extras', {
      error: err.message,
      stack: err.stack,
      productId: req.params.productId,
      tenantId: req.user.tenantId
    });
    next(err);
  }
};

/**
 * Create a new product extra
 * POST /api/v1/restaurant/products/:productId/extras
 */
exports.createProductExtra = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    const {
      name,
      price = 0,
      inputType = 'checkbox',
      groupName,
      isRequired = false,
      isMultiple = false,
      sortOrder = 0,
      isActive = true
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Extra name is required'
      });
    }

    if (!['radio', 'checkbox', 'select'].includes(inputType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input type. Must be radio, checkbox, or select'
      });
    }

    // Verify product exists and belongs to tenant
    const product = await Product.findOne({
      where: { id: productId, tenantId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Create extra
    const extra = await ProductExtra.create({
      tenantId,
      productId,
      name,
      price,
      inputType,
      groupName,
      isRequired,
      isMultiple,
      sortOrder,
      isActive,
      createdBy: userId,
      updatedBy: userId
    });

    // Update product isCustomized flag if not already set
    if (!product.isCustomized) {
      await product.update({
        isCustomized: true,
        updatedBy: userId
      });
    }

    logger.info('Product extra created', {
      extraId: extra.id,
      productId,
      name,
      tenantId,
      userId
    });

    res.status(201).json({
      success: true,
      message: 'Product extra created successfully',
      data: extra
    });
  } catch (err) {
    logger.error('Error creating product extra', {
      error: err.message,
      stack: err.stack,
      productId: req.params.productId,
      tenantId: req.user.tenantId
    });
    next(err);
  }
};

/**
 * Update a product extra
 * PUT /api/v1/restaurant/products/:productId/extras/:extraId
 */
exports.updateProductExtra = async (req, res, next) => {
  try {
    const { productId, extraId } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    const {
      name,
      price,
      inputType,
      groupName,
      isRequired,
      isMultiple,
      sortOrder,
      isActive
    } = req.body;

    // Find extra
    const extra = await ProductExtra.findOne({
      where: {
        id: extraId,
        productId,
        tenantId
      }
    });

    if (!extra) {
      return res.status(404).json({
        success: false,
        message: 'Product extra not found'
      });
    }

    // Validation
    if (inputType && !['radio', 'checkbox', 'select'].includes(inputType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input type. Must be radio, checkbox, or select'
      });
    }

    // Update fields
    const updateData = { updatedBy: userId };
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = price;
    if (inputType !== undefined) updateData.inputType = inputType;
    if (groupName !== undefined) updateData.groupName = groupName;
    if (isRequired !== undefined) updateData.isRequired = isRequired;
    if (isMultiple !== undefined) updateData.isMultiple = isMultiple;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    await extra.update(updateData);

    logger.info('Product extra updated', {
      extraId,
      productId,
      tenantId,
      userId
    });

    res.json({
      success: true,
      message: 'Product extra updated successfully',
      data: extra
    });
  } catch (err) {
    logger.error('Error updating product extra', {
      error: err.message,
      stack: err.stack,
      extraId: req.params.extraId,
      tenantId: req.user.tenantId
    });
    next(err);
  }
};

/**
 * Delete a product extra (soft delete)
 * DELETE /api/v1/restaurant/products/:productId/extras/:extraId
 */
exports.deleteProductExtra = async (req, res, next) => {
  try {
    const { productId, extraId } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    // Find extra
    const extra = await ProductExtra.findOne({
      where: {
        id: extraId,
        productId,
        tenantId
      }
    });

    if (!extra) {
      return res.status(404).json({
        success: false,
        message: 'Product extra not found'
      });
    }

    // Soft delete
    await extra.destroy();

    // Check if product still has other extras
    const remainingExtras = await ProductExtra.count({
      where: {
        productId,
        tenantId
      }
    });

    // If no extras remain, update product isCustomized flag
    if (remainingExtras === 0) {
      await Product.update(
        { isCustomized: false, updatedBy: userId },
        { where: { id: productId, tenantId } }
      );
    }

    logger.info('Product extra deleted', {
      extraId,
      productId,
      tenantId,
      userId
    });

    res.json({
      success: true,
      message: 'Product extra deleted successfully'
    });
  } catch (err) {
    logger.error('Error deleting product extra', {
      error: err.message,
      stack: err.stack,
      extraId: req.params.extraId,
      tenantId: req.user.tenantId
    });
    next(err);
  }
};

/**
 * Bulk create product extras
 * POST /api/v1/restaurant/products/:productId/extras/bulk
 */
exports.bulkCreateExtras = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const { extras } = req.body;

    if (!Array.isArray(extras) || extras.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'extras array is required and must not be empty'
      });
    }

    // Verify product exists
    const product = await Product.findOne({
      where: { id: productId, tenantId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Prepare bulk data
    const bulkData = extras.map(extra => ({
      tenantId,
      productId,
      name: extra.name,
      price: extra.price || 0,
      inputType: extra.inputType || 'checkbox',
      groupName: extra.groupName,
      isRequired: extra.isRequired || false,
      isMultiple: extra.isMultiple || false,
      sortOrder: extra.sortOrder || 0,
      isActive: extra.isActive !== false,
      createdBy: userId,
      updatedBy: userId
    }));

    // Bulk create
    const created = await ProductExtra.bulkCreate(bulkData);

    // Update product isCustomized flag
    if (!product.isCustomized) {
      await product.update({
        isCustomized: true,
        updatedBy: userId
      });
    }

    logger.info('Bulk product extras created', {
      productId,
      count: created.length,
      tenantId,
      userId
    });

    res.status(201).json({
      success: true,
      message: `${created.length} product extras created successfully`,
      data: created
    });
  } catch (err) {
    logger.error('Error bulk creating product extras', {
      error: err.message,
      stack: err.stack,
      productId: req.params.productId,
      tenantId: req.user.tenantId
    });
    next(err);
  }
};

/**
 * Get extras by group for a product
 * GET /api/v1/restaurant/products/:productId/extras/groups
 */
exports.getExtrasByGroup = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const tenantId = req.user.tenantId;

    // Verify product exists
    const product = await Product.findOne({
      where: { id: productId, tenantId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const groupedExtras = await ProductExtra.getGroupedExtras(productId, tenantId);

    res.json({
      success: true,
      data: {
        productId,
        productName: product.name,
        isCustomized: product.isCustomized,
        groups: groupedExtras
      }
    });
  } catch (err) {
    logger.error('Error fetching grouped extras', {
      error: err.message,
      stack: err.stack,
      productId: req.params.productId,
      tenantId: req.user.tenantId
    });
    next(err);
  }
};

/**
 * Toggle extra status (active/inactive)
 * PATCH /api/v1/restaurant/products/:productId/extras/:extraId/toggle
 */
exports.toggleExtraStatus = async (req, res, next) => {
  try {
    const { productId, extraId } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    // Find extra
    const extra = await ProductExtra.findOne({
      where: {
        id: extraId,
        productId,
        tenantId
      }
    });

    if (!extra) {
      return res.status(404).json({
        success: false,
        message: 'Product extra not found'
      });
    }

    // Toggle status
    await extra.update({
      isActive: !extra.isActive,
      updatedBy: userId
    });

    logger.info('Product extra status toggled', {
      extraId,
      productId,
      newStatus: extra.isActive,
      tenantId,
      userId
    });

    res.json({
      success: true,
      message: `Product extra ${extra.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: extra.id,
        name: extra.name,
        isActive: extra.isActive
      }
    });
  } catch (err) {
    logger.error('Error toggling product extra status', {
      error: err.message,
      stack: err.stack,
      extraId: req.params.extraId,
      tenantId: req.user.tenantId
    });
    next(err);
  }
};

/**
 * Migrate extras from productDetails.extras (JSONB) to ProductExtras table
 * POST /api/v1/restaurant/products/:productId/extras/migrate
 *
 * Moves imported/seeded extras into the relational ProductExtras table so they
 * get proper UUIDs and can be managed (edited/deleted) through normal CRUD.
 * After migration, productDetails.extras is cleared.
 */
exports.migrateExtrasToTable = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    const product = await Product.findOne({
      where: { id: productId, tenantId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const jsonExtras = product.productDetails?.extras;
    if (!Array.isArray(jsonExtras) || jsonExtras.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No extras found in productDetails to migrate'
      });
    }

    const result = await sequelize.transaction(async (t) => {
      // Create ProductExtra rows from JSONB data
      const bulkData = jsonExtras.map((extra, idx) => ({
        tenantId,
        productId,
        name: extra.name,
        price: extra.price || 0,
        inputType: extra.inputType || 'checkbox',
        groupName: extra.groupName || null,
        isRequired: extra.isRequired || false,
        isMultiple: extra.isMultiple || false,
        sortOrder: extra.sortOrder ?? idx,
        isActive: extra.isActive !== false,
        createdBy: userId,
        updatedBy: userId
      }));

      const created = await ProductExtra.bulkCreate(bulkData, { transaction: t });

      // Clear extras from productDetails JSONB
      const updatedDetails = { ...(product.productDetails || {}) };
      updatedDetails.extras = [];
      updatedDetails.hasExtras = false;

      await product.update({
        productDetails: updatedDetails,
        isCustomized: true,
        updatedBy: userId
      }, { transaction: t });

      return created;
    });

    logger.info('Migrated productDetails extras to ProductExtras table', {
      productId,
      productName: product.name,
      count: result.length,
      tenantId,
      userId
    });

    res.json({
      success: true,
      message: `${result.length} extras migrated from productDetails to ProductExtras table`,
      data: result
    });
  } catch (err) {
    logger.error('Error migrating product extras', {
      error: err.message,
      stack: err.stack,
      productId: req.params.productId,
      tenantId: req.user.tenantId
    });
    next(err);
  }
};

/**
 * Bulk migrate ALL products' extras from productDetails to ProductExtras table
 * POST /api/v1/restaurant/extras/migrate-all
 *
 * Scans all products for tenant that have productDetails.extras and migrates
 * them to the ProductExtras table in one go.
 */
exports.migrateAllExtrasToTable = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    // Find all products that have extras in productDetails
    const products = await Product.findAll({
      where: {
        tenantId,
        isCustomized: true
      }
    });

    const productsWithJsonExtras = products.filter(p => {
      const extras = p.productDetails?.extras;
      return Array.isArray(extras) && extras.length > 0;
    });

    if (productsWithJsonExtras.length === 0) {
      return res.json({
        success: true,
        message: 'No products with productDetails extras found to migrate',
        data: { migrated: 0, products: [] }
      });
    }

    const results = await sequelize.transaction(async (t) => {
      const migrated = [];

      for (const product of productsWithJsonExtras) {
        const jsonExtras = product.productDetails.extras;

        const bulkData = jsonExtras.map((extra, idx) => ({
          tenantId,
          productId: product.id,
          name: extra.name,
          price: extra.price || 0,
          inputType: extra.inputType || 'checkbox',
          groupName: extra.groupName || null,
          isRequired: extra.isRequired || false,
          isMultiple: extra.isMultiple || false,
          sortOrder: extra.sortOrder ?? idx,
          isActive: extra.isActive !== false,
          createdBy: userId,
          updatedBy: userId
        }));

        const created = await ProductExtra.bulkCreate(bulkData, { transaction: t });

        // Clear extras from productDetails
        const updatedDetails = { ...(product.productDetails || {}) };
        updatedDetails.extras = [];
        updatedDetails.hasExtras = false;

        await product.update({
          productDetails: updatedDetails,
          isCustomized: true,
          updatedBy: userId
        }, { transaction: t });

        migrated.push({
          productId: product.id,
          productName: product.name,
          extrasCount: created.length
        });
      }

      return migrated;
    });

    const totalExtras = results.reduce((sum, r) => sum + r.extrasCount, 0);

    logger.info('Bulk migrated all productDetails extras to ProductExtras table', {
      productsCount: results.length,
      totalExtras,
      tenantId,
      userId
    });

    res.json({
      success: true,
      message: `Migrated ${totalExtras} extras from ${results.length} products`,
      data: {
        migrated: totalExtras,
        products: results
      }
    });
  } catch (err) {
    logger.error('Error bulk migrating product extras', {
      error: err.message,
      stack: err.stack,
      tenantId: req.user.tenantId
    });
    next(err);
  }
};

/**
 * Delete an extra from productDetails.extras (JSONB) by name
 * DELETE /api/v1/restaurant/products/:productId/extras/json/:extraName
 *
 * For extras stored in productDetails (from seeder/import) that don't have UUIDs.
 * Removes the extra by matching its name.
 */
exports.deleteJsonExtra = async (req, res, next) => {
  try {
    const { productId, extraName } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    const product = await Product.findOne({
      where: { id: productId, tenantId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const jsonExtras = product.productDetails?.extras;
    if (!Array.isArray(jsonExtras) || jsonExtras.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No extras found in productDetails'
      });
    }

    const decodedName = decodeURIComponent(extraName);
    const idx = jsonExtras.findIndex(e => e.name === decodedName);

    if (idx === -1) {
      return res.status(404).json({
        success: false,
        message: `Extra "${decodedName}" not found in productDetails`
      });
    }

    // Remove the extra
    const removed = jsonExtras.splice(idx, 1)[0];

    const updatedDetails = { ...(product.productDetails || {}) };
    updatedDetails.extras = jsonExtras;
    updatedDetails.hasExtras = jsonExtras.length > 0;

    await product.update({
      productDetails: updatedDetails,
      isCustomized: jsonExtras.length > 0,
      updatedBy: userId
    });

    logger.info('Deleted extra from productDetails', {
      productId,
      productName: product.name,
      extraName: decodedName,
      remainingExtras: jsonExtras.length,
      tenantId,
      userId
    });

    res.json({
      success: true,
      message: `Extra "${decodedName}" deleted from productDetails`,
      data: {
        removed,
        remainingExtras: jsonExtras.length
      }
    });
  } catch (err) {
    logger.error('Error deleting JSON extra', {
      error: err.message,
      stack: err.stack,
      productId: req.params.productId,
      extraName: req.params.extraName,
      tenantId: req.user.tenantId
    });
    next(err);
  }
};