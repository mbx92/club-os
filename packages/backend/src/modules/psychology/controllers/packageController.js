'use strict';

/**
 * Package Controller
 * 
 * Manages psychology test packages
 */

const db = require('../../../models');
const { pricingService } = require('../services');
const { PsychologyPackage, PsychologyPackageItem, PsychologyTestType } = db;
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');

/**
 * Get all packages for tenant
 */
async function getAll(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { isActive, packageType } = req.query;

    const where = {};
    // allow superadmin to view all packages or filter by tenantId query
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    } else if (req.query.tenantId) {
      where.tenantId = req.query.tenantId;
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    if (packageType) {
      where.packageType = packageType;
    }
    
    const packages = await PsychologyPackage.findAll({
      where,
      include: [
        {
          model: PsychologyPackageItem,
          as: 'items',
          include: [
            {
              model: PsychologyTestType,
              as: 'testType'
            }
          ]
        }
      ],
      order: [['name', 'ASC']]
    });
    
    res.json({
      success: true,
      data: packages
    });

    logger.logInfo('Psychology packages retrieved', {
      action: 'PSYCHOLOGY_PACKAGE_LIST',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { count: packages.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get single package by ID
 */
async function getById(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    
    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }
    
    const pkg = await PsychologyPackage.findOne({
      where,
      include: [
        {
          model: PsychologyPackageItem,
          as: 'items',
          include: [
            {
              model: PsychologyTestType,
              as: 'testType'
            }
          ]
        }
      ]
    });
    
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }
    
    res.json({
      success: true,
      data: pkg
    });

    logger.logInfo('Psychology package retrieved', {
      action: 'PSYCHOLOGY_PACKAGE_GET',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { packageId: id, packageName: pkg.name }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create new package
 */
async function create(req, res, next) {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { tenantId: currentTenantId, isSuperAdmin } = req.user;
    // allow superadmin to create package for a specific tenant by providing tenantId in body
    let tenantId = currentTenantId;
    if (isSuperAdmin && req.body.tenantId) {
      // validate tenant exists
      const tenant = await db.Tenant.findOne({ where: { id: req.body.tenantId } });
      if (!tenant) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Tenant not found' });
      }
      tenantId = req.body.tenantId;
    }
    const {
      code, name, description, packageType,
      singlePrice, basePrice, bundlePrice,
      discountPercent, discountType, discountValue,
      testTypeIds, validityDays, isActive, metadata
    } = req.body;
    
    // Validate test type IDs
    if (!testTypeIds || testTypeIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one test type is required'
      });
    }
    
    const testTypes = await PsychologyTestType.findAll({
      where: {
        id: testTypeIds,
        tenantId
      }
    });
    
    if (testTypes.length !== testTypeIds.length) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'One or more test types not found'
      });
    }
    
    // Calculate estimated duration from test types
    const estimatedDuration = testTypes.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0);
    
    // Determine price and discount
    const finalBasePrice = basePrice || singlePrice || 0;
    let finalDiscountType = discountType || 'none';
    let finalDiscountValue = discountValue || 0;
    
    // Support legacy discountPercent field
    if (discountPercent && !discountValue) {
      finalDiscountType = 'percentage';
      finalDiscountValue = discountPercent;
    }
    
    // Create package
    const pkg = await PsychologyPackage.create({
      tenantId,
      code: code || name.toUpperCase().replace(/\s+/g, '_').substring(0, 50),
      name,
      description,
      packageType: packageType || 'single',
      basePrice: finalBasePrice,
      discountType: finalDiscountType,
      discountValue: finalDiscountValue,
      estimatedDuration,
      testCount: testTypes.length,
      validityDays: validityDays || 7,
      isActive: isActive !== false,
      metadata: metadata || {}
    }, { transaction });
    
    // Create package items
    const itemsData = testTypeIds.map((testTypeId, index) => ({
      packageId: pkg.id,
      testTypeId,
      sortOrder: index + 1
    }));
    
    await PsychologyPackageItem.bulkCreate(itemsData, { transaction });
    
    await transaction.commit();
    
    // Reload with associations
    const result = await PsychologyPackage.findByPk(pkg.id, {
      include: [
        {
          model: PsychologyPackageItem,
          as: 'items',
          include: [
            {
              model: PsychologyTestType,
              as: 'testType'
            }
          ]
        }
      ]
    });
    
    res.status(201).json({
      success: true,
      message: 'Package created successfully',
      data: result
    });

    logger.logAudit('Psychology package created', {
      action: 'PSYCHOLOGY_PACKAGE_CREATE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { packageId: pkg.id, packageName: name, testTypeIds }
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}

/**
 * Update package
 */
async function update(req, res, next) {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const {
      code, name, description, packageType,
      singlePrice, basePrice, bundlePrice,
      discountPercent, discountType, discountValue,
      testTypeIds, validityDays, isActive, metadata
    } = req.body;
    
    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }
    
    const pkg = await PsychologyPackage.findOne({ where });
    
    if (!pkg) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }
    
    // Use package's tenantId for testType validation
    const pkgTenantId = pkg.tenantId;
    
    // Update basic fields
    if (code !== undefined) pkg.code = code;
    if (name !== undefined) pkg.name = name;
    if (description !== undefined) pkg.description = description;
    if (packageType !== undefined) pkg.packageType = packageType;
    if (validityDays !== undefined) pkg.validityDays = validityDays;
    if (isActive !== undefined) pkg.isActive = isActive;
    if (metadata !== undefined) pkg.metadata = metadata;
    
    // Update price fields - support both old and new field names
    if (basePrice !== undefined) {
      pkg.basePrice = basePrice;
    } else if (singlePrice !== undefined) {
      pkg.basePrice = singlePrice;
    }
    
    // Legacy bundlePrice support (if model still has it)
    if (bundlePrice !== undefined && pkg.bundlePrice !== undefined) {
      pkg.bundlePrice = bundlePrice;
    }
    
    // Update discount fields
    if (discountType !== undefined) {
      pkg.discountType = discountType;
    }
    if (discountValue !== undefined) {
      pkg.discountValue = discountValue;
    }
    // Support legacy discountPercent field
    if (discountPercent !== undefined && discountType === undefined) {
      pkg.discountType = 'percentage';
      pkg.discountValue = discountPercent;
    }
    
    await pkg.save({ transaction });
    
    // Update test type associations if provided
    if (testTypeIds && testTypeIds.length > 0) {
      // Validate test types against package's tenant
      const testTypes = await PsychologyTestType.findAll({
        where: { id: testTypeIds, tenantId: pkgTenantId }
      });
      
      if (testTypes.length !== testTypeIds.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'One or more test types not found'
        });
      }
      
      // Delete existing items
      await PsychologyPackageItem.destroy({
        where: { packageId: id },
        transaction
      });
      
      // Create new items
      const itemsData = testTypeIds.map((testTypeId, index) => ({
        packageId: id,
        testTypeId,
        sortOrder: index + 1
      }));
      
      await PsychologyPackageItem.bulkCreate(itemsData, { transaction });
    }
    
    await transaction.commit();
    
    // Reload with associations
    const result = await PsychologyPackage.findByPk(id, {
      include: [
        {
          model: PsychologyPackageItem,
          as: 'items',
          include: [
            {
              model: PsychologyTestType,
              as: 'testType'
            }
          ]
        }
      ]
    });
    
    res.json({
      success: true,
      message: 'Package updated successfully',
      data: result
    });

    logger.logAudit('Psychology package updated', {
      action: 'PSYCHOLOGY_PACKAGE_UPDATE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { packageId: id, packageName: result.name }
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}

/**
 * Delete package
 */
async function remove(req, res, next) {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    
    const pkg = await PsychologyPackage.findOne({
      where: { id, tenantId }
    });
    
    if (!pkg) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }
    
    // Check for existing orders
    const orderCount = await db.PsychologyOrder.count({
      where: { packageId: id }
    });
    
    if (orderCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot delete: package has ${orderCount} order(s)`
      });
    }
    
    // Check for active invitations
    const activeInvitationCount = await db.PsychologyInvitation.count({
      where: { 
        packageId: id,
        isActive: true
      }
    });
    
    if (activeInvitationCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot delete: package has ${activeInvitationCount} active invitation(s). Please deactivate or delete invitations first.`
      });
    }
    
    // Delete related data in order (to avoid foreign key constraints)
    
    // 1. Delete inactive invitations (active ones already blocked above)
    await db.PsychologyInvitation.destroy({
      where: { 
        packageId: id,
        isActive: false
      },
      transaction
    });
    
    // 2. Delete price rules
    await db.PsychologyPriceRule.destroy({
      where: { packageId: id },
      transaction
    });
    
    // 2. Delete package items
    await PsychologyPackageItem.destroy({
      where: { packageId: id },
      transaction
    });
    
    // 3. Delete package
    await pkg.destroy({ transaction });
    
    await transaction.commit();
    
    res.json({
      success: true,
      message: 'Package deleted successfully'
    });

    logger.logAudit('Psychology package deleted', {
      action: 'PSYCHOLOGY_PACKAGE_DELETE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { packageId: id, packageName: pkg.name }
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}

/**
 * Calculate price for package
 */
async function calculatePrice(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const { promoCode, quantity, isMember } = req.query;
    
    const pkg = await PsychologyPackage.findOne({
      where: { id, tenantId }
    });
    
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }
    
    const priceBreakdown = await pricingService.calculatePrice(
      pkg,
      {
        promoCode,
        quantity: parseInt(quantity) || 1,
        isMember: isMember === 'true'
      },
      db
    );
    
    res.json({
      success: true,
      data: priceBreakdown
    });

    logger.logInfo('Psychology package price calculated', {
      action: 'PSYCHOLOGY_PACKAGE_PRICE_CALCULATE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { packageId: id, promoCode, quantity, isMember, total: priceBreakdown.total }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  calculatePrice
};
