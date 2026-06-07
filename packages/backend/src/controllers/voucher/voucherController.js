const { Voucher, VoucherUsage, Tenant, User, sequelize } = require('../../models');
const { Op } = require('sequelize');
const { logAudit } = require('../../utils/auditLogger');
const ConcurrencyUtils = require('../../utils/concurrency');
const { createError } = require('../../utils/errorCodes');

/**
 * Create a new voucher
 * Superadmin: can create subscription vouchers (scope=subscription, tenantId=null, applicableTo=subscription_plan)
 * Tenant: can create tenant vouchers (scope=tenant, tenantId=user.tenantId)
 */
exports.createVoucher = async (req, res, next) => {
  try {
    // Use ConcurrencyUtils.withTransaction for proper isolation level
    return await ConcurrencyUtils.withTransaction(Voucher.sequelize, async (transaction) => {
      const {
        name,
        description,
        type,
        value,
        maxDiscountAmount,
        minPurchaseAmount,
        applicableTo,
        applicableItems,
        startDate,
        endDate,
        usageLimit,
        userUsageLimit,
        isActive = true,
        isPublic = true,
        tenantId: requestedTenantId // For superadmin creating tenant vouchers
      } = req.body;
      
      // Validation
      if (!name || !type || !value || !startDate || !endDate || !applicableTo) {
        throw createError('VALIDATION_ERROR', 'Missing required fields: name, type, value, startDate, endDate, applicableTo');
      }
      
      if (!['percentage', 'fixed'].includes(type)) {
        throw createError('VALIDATION_ERROR', 'Invalid type. Must be percentage or fixed');
      }
      
      if (type === 'percentage' && (value < 0 || value > 100)) {
        throw createError('VALIDATION_ERROR', 'Percentage value must be between 0 and 100');
      }
      
      if (type === 'fixed' && value <= 0) {
        throw createError('VALIDATION_ERROR', 'Fixed value must be greater than 0');
      }
      
      if (new Date(startDate) >= new Date(endDate)) {
        throw createError('VALIDATION_ERROR', 'Start date must be before end date');
      }
      
      // Determine scope and tenantId based on user role and applicableTo
      let scope, tenantId;
      
      if (req.user.isSuperAdmin) {
        if (applicableTo === 'subscription_plan') {
          // Superadmin creating subscription voucher (for billing)
          scope = 'subscription';
          tenantId = null;
        } else {
          // Superadmin creating tenant voucher (must specify tenantId)
          scope = 'tenant';
          tenantId = requestedTenantId;
          
          if (!tenantId) {
            throw createError('VALIDATION_ERROR', 'Superadmin must specify tenantId when creating tenant-scoped vouchers');
          }
          
          // Verify tenant exists
          const tenant = await Tenant.findByPk(tenantId, { transaction });
          if (!tenant) {
            throw createError('NOT_FOUND', 'Tenant not found');
          }
        }
      } else {
        // Regular tenant user
        scope = 'tenant';
        tenantId = req.user.tenantId;
        
        if (applicableTo === 'subscription_plan') {
          throw createError('FORBIDDEN', 'Only superadmin can create subscription_plan vouchers');
        }
      }
      
      // Check duplicate code (within scope)
      const existingVoucher = await Voucher.findOne({
        where: {
          code: req.body.code,
          ...(tenantId ? { tenantId } : { tenantId: null })
        },
        transaction
      });
      
      if (existingVoucher) {
        throw createError('DUPLICATE_ENTRY', `Voucher code '${req.body.code}' already exists`);
      }
    
      // Create voucher
      const newVoucher = await Voucher.create({
        tenantId,
        scope,
        code: req.body.code, // Will auto-generate if not provided via hook
        name,
        description,
        type,
        value,
        maxDiscountAmount,
        minPurchaseAmount,
        applicableTo,
        applicableItems: applicableItems || [],
        startDate,
        endDate,
        usageLimit,
        userUsageLimit,
        usageCount: 0,
        isActive,
        isPublic,
        createdBy: req.user.id,
        version: 0
      }, { transaction });
    
      // Log the action
      logAudit({
        action: 'CREATE_VOUCHER',
        user: req.user,
        tenant: { name: tenantId },
        request: req,
        response: { statusCode: 201 },
        executionTime: 0
      });
    
      return newVoucher;
    }).then(async newVoucher => {
      // Fetch with associations
      const createdVoucher = await Voucher.findByPk(newVoucher.id, {
        include: [
          {
            model: Tenant,
            as: 'tenant',
            attributes: ['id', 'name']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });
      
      res.status(201).json({
        success: true,
        message: 'Voucher created successfully',
        data: { voucher: createdVoucher }
      });
    }).catch(error => {
      console.error('Error creating voucher:', error);
      
      // Handle custom errors
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code
        });
      }
      
      // Handle unique constraint errors
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.errors[0]?.path || 'field';
        const value = error.errors[0]?.value || 'value';
        return res.status(409).json({
          success: false,
          message: `Voucher ${field} '${value}' already exists`,
          code: 'DUPLICATE_ENTRY',
          error: error.message
        });
      }
      
      // Handle optimistic locking errors
      if (error.message.includes('Optimistic locking error')) {
        return res.status(409).json({
          success: false,
          message: 'Conflict: Voucher was modified by another transaction',
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create voucher',
        error: error.message
      });
    });
  } catch (error) {
    console.error('Unexpected error in createVoucher:', error);
    next(error);
  }
};

/**
 * Get all vouchers for a tenant or superadmin
 * Superadmin: can see all vouchers (filter by scope if needed)
 * Tenant: only sees their own vouchers
 */
exports.getAllVouchers = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type,
      status = 'all',
      applicableTo = '',
      scope = '',
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    const where = {};
    
    // Scope filtering: superadmin can see all, tenant only sees their vouchers
    if (req.user.isSuperAdmin) {
      // Superadmin: filter by scope if provided
      if (scope === 'subscription') {
        where.scope = 'subscription';
        where.tenantId = null;
      } else if (scope === 'tenant') {
        where.scope = 'tenant';
        where.tenantId = { [Op.ne]: null };
      }
      // If scope not provided, show all vouchers
    } else {
      // Tenant: only show their own vouchers
      where.tenantId = req.user.tenantId;
      where.scope = 'tenant';
    }
    
    // Type filter
    if (type && ['percentage', 'fixed'].includes(type)) {
      where.type = type;
    }
    
    // Status filter
    if (status !== 'all') {
      if (status === 'active') {
        where.isActive = true;
        where.startDate = { [Op.lte]: new Date() };
        where.endDate = { [Op.gte]: new Date() };
      } else if (status === 'inactive') {
        where.isActive = false;
      } else if (status === 'expired') {
        where.endDate = { [Op.lt]: new Date() };
      } else if (status === 'upcoming') {
        where.startDate = { [Op.gt]: new Date() };
      }
    }
    
    // ApplicableTo filter
    if (applicableTo && ['all', 'membership', 'product', 'specific_items', 'subscription_plan'].includes(applicableTo)) {
      where.applicableTo = applicableTo;
    }
    
    // Search filter
    if (search) {
      where[Op.or] = [
        { code: { [Op.iLike]: `%${search}%` } },
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Find vouchers with pagination
    const { count, rows: vouchers } = await Voucher.findAndCountAll({
      where,
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: VoucherUsage,
          as: 'voucherUsages',
          attributes: ['id', 'discountAmount', 'createdAt'],
          limit: 5,
          separate: true
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });
    
    res.status(200).json({
      success: true,
      message: 'Vouchers retrieved successfully',
      data: {
        vouchers,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error retrieving vouchers:', error);
    next(error);
  }
};

/**
 * Get a voucher by ID
 */
exports.getVoucherById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const where = { id };
    
    // Access control: superadmin can see all, tenant only sees their vouchers
    if (!req.user.isSuperAdmin) {
      where.tenantId = req.user.tenantId;
      where.scope = 'tenant';
    }
    
    const voucher = await Voucher.findOne({
      where,
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'settings'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: VoucherUsage,
          as: 'voucherUsages',
          limit: 10,
          order: [['createdAt', 'DESC']],
          separate: true
        }
      ]
    });
    
    if (!voucher) {
      return next(createError('NOT_FOUND', 'Voucher not found'));
    }
    
    res.status(200).json({
      success: true,
      message: 'Voucher retrieved successfully',
      data: { voucher }
    });
  } catch (error) {
    console.error('Error retrieving voucher:', error);
    next(error);
  }
};

/**
 * Update a voucher
 */
exports.updateVoucher = async (req, res, next) => {
  try {
    // Use ConcurrencyUtils.withTransaction for proper isolation level
    return await ConcurrencyUtils.withTransaction(Voucher.sequelize, async (transaction) => {
      const { id } = req.params;
      const {
        name,
        description,
        type,
        value,
        maxDiscountAmount,
        minPurchaseAmount,
        applicableTo,
        applicableItems,
        startDate,
        endDate,
        usageLimit,
        userUsageLimit,
        isActive,
        isPublic
      } = req.body;
    
      const where = { id };
      
      // Access control
      if (!req.user.isSuperAdmin) {
        where.tenantId = req.user.tenantId;
        where.scope = 'tenant';
      }
      
      const voucher = await Voucher.findOne({
        where,
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      
      if (!voucher) {
        throw createError('NOT_FOUND', 'Voucher not found');
      }
      
      // Validation
      if (type && !['percentage', 'fixed'].includes(type)) {
        throw createError('VALIDATION_ERROR', 'Invalid type. Must be percentage or fixed');
      }
      
      if (type === 'percentage' && value && (value < 0 || value > 100)) {
        throw createError('VALIDATION_ERROR', 'Percentage value must be between 0 and 100');
      }
      
      if (type === 'fixed' && value && value <= 0) {
        throw createError('VALIDATION_ERROR', 'Fixed value must be greater than 0');
      }
      
      if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
        throw createError('VALIDATION_ERROR', 'Start date must be before end date');
      }
      
      // Prevent changing scope or applicableTo for subscription vouchers
      if (voucher.scope === 'subscription' && applicableTo && applicableTo !== 'subscription_plan') {
        throw createError('VALIDATION_ERROR', 'Cannot change applicableTo for subscription vouchers');
      }
      
      // Build update data
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type;
      if (value !== undefined) updateData.value = value;
      if (maxDiscountAmount !== undefined) updateData.maxDiscountAmount = maxDiscountAmount;
      if (minPurchaseAmount !== undefined) updateData.minPurchaseAmount = minPurchaseAmount;
      if (applicableTo !== undefined) updateData.applicableTo = applicableTo;
      if (applicableItems !== undefined) updateData.applicableItems = applicableItems;
      if (startDate !== undefined) updateData.startDate = startDate;
      if (endDate !== undefined) updateData.endDate = endDate;
      if (usageLimit !== undefined) updateData.usageLimit = usageLimit;
      if (userUsageLimit !== undefined) updateData.userUsageLimit = userUsageLimit;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      updateData.updatedBy = req.user.id;
      
      // Update the voucher with optimistic locking
      await voucher.update(updateData, {
        transaction,
        version: voucher.version
      });
      
      // Log the action
      logAudit({
        action: 'UPDATE_VOUCHER',
        user: req.user,
        tenant: { name: voucher.tenantId },
        request: req,
        response: { statusCode: 200 },
        executionTime: 0
      });
      
      return voucher;
    }).then(async () => {
      // Fetch updated voucher
      const updatedVoucher = await Voucher.findByPk(req.params.id, {
        include: [
          {
            model: Tenant,
            as: 'tenant',
            attributes: ['id', 'name']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: User,
            as: 'updater',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        message: 'Voucher updated successfully',
        data: { voucher: updatedVoucher }
      });
    }).catch(error => {
      console.error('Error updating voucher:', error);
      
      // Handle custom errors
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code
        });
      }
      
      // Handle optimistic locking errors
      if (error.message.includes('Optimistic locking error')) {
        return res.status(409).json({
          success: false,
          message: 'Voucher was modified by another user. Please refresh and try again',
          code: 'RESOURCE_LOCKED'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update voucher',
        error: error.message
      });
    });
  } catch (error) {
    console.error('Unexpected error in updateVoucher:', error);
    next(error);
  }
};

/**
 * Delete a voucher (soft delete)
 */
exports.deleteVoucher = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    const where = { id };
    
    // Access control
    if (!req.user.isSuperAdmin) {
      where.tenantId = req.user.tenantId;
      where.scope = 'tenant';
    }
    
    const voucher = await Voucher.findOne({
      where,
      transaction
    });
    
    if (!voucher) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      return next(createError('NOT_FOUND', 'Voucher not found'));
    }
    
    // Check if voucher has usage records
    const hasUsage = await VoucherUsage.count({
      where: { voucherId: id },
      transaction
    });
    
    if (hasUsage > 0) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      return next(createError('VALIDATION_ERROR', 'Cannot delete voucher with existing usage records'));
    }
    
    // Soft delete the voucher
    await voucher.destroy({ transaction });
    
    await transaction.commit();

    // Log the action after commit
    logAudit({
      action: 'DELETE_VOUCHER',
      user: req.user,
      tenant: { name: voucher.tenantId },
      request: req,
      response: { statusCode: 200 },
      executionTime: 0
    });
    
    res.status(200).json({
      success: true,
      message: 'Voucher deleted successfully'
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('Error deleting voucher:', error);
    next(error);
  }
};

/**
 * Validate a voucher code
 * 
 * Super admin:
 * - Can validate subscription vouchers: set applicableTo: 'subscription_plan'
 * - Can validate tenant vouchers: include tenantId in request body
 * - Without tenantId, will search all vouchers
 * 
 * Regular users:
 * - Can only validate their own tenant vouchers
 * 
 * @route POST /api/v1/vouchers/validate/:code
 * @body { amount, applicableTo?, itemId?, userId?, tenantId? }
 */
exports.validateVoucher = async (req, res, next) => {
  try {
    const { code } = req.params;
    const { amount, applicableTo, itemId, userId } = req.body;
    
    if (!amount) {
      return next(createError('VALIDATION_ERROR', 'Amount is required'));
    }
    
    const where = {
      code,
      isActive: true,
      startDate: { [Op.lte]: new Date() },
      endDate: { [Op.gte]: new Date() }
    };
    
    // Scope filtering
    if (req.user.isSuperAdmin) {
      // Superadmin can validate any voucher
      // If applicableTo is subscription_plan, look for subscription vouchers
      // Otherwise, look for specific tenant voucher (if tenantId provided in body) or any
      if (applicableTo === 'subscription_plan') {
        where.scope = 'subscription';
        where.tenantId = null;
      } else if (req.body.tenantId) {
        // Superadmin validating specific tenant voucher
        where.tenantId = req.body.tenantId;
        where.scope = 'tenant';
      }
      // If no tenantId specified, will search all vouchers (subscription + all tenants)
    } else {
      // Regular tenant user - only their own vouchers
      where.tenantId = req.user.tenantId;
      where.scope = 'tenant';
    }
    
    const voucher = await Voucher.findOne({ where });
    
    if (!voucher) {
      // Check if voucher exists but is expired or not yet started
      const whereExists = { code };
      
      if (req.user.isSuperAdmin) {
        if (applicableTo === 'subscription_plan') {
          whereExists.scope = 'subscription';
          whereExists.tenantId = null;
        } else if (req.body.tenantId) {
          whereExists.tenantId = req.body.tenantId;
          whereExists.scope = 'tenant';
        }
      } else {
        whereExists.tenantId = req.user.tenantId;
        whereExists.scope = 'tenant';
      }
      
      const voucherExists = await Voucher.findOne({ where: whereExists });
      
      if (voucherExists) {
        const now = new Date();
        if (new Date(voucherExists.startDate) > now) {
          return next(createError('INVALID_INPUT', `Voucher is not yet active. Starts on ${new Date(voucherExists.startDate).toLocaleDateString()}`));
        }
        if (new Date(voucherExists.endDate) < now) {
          return next(createError('INVALID_INPUT', `Voucher has expired on ${new Date(voucherExists.endDate).toLocaleDateString()}`));
        }
        if (!voucherExists.isActive) {
          return next(createError('INVALID_INPUT', 'Voucher is currently inactive'));
        }
      }
      
      return next(createError('NOT_FOUND', 'Voucher not found'));
    }
    
    // Check usage limit
    if (!voucher.isValid()) {
      return next(createError('INVALID_INPUT', 'Voucher has reached usage limit'));
    }
    
    // Check user usage limit
    if (userId && voucher.userUsageLimit) {
      const userUsageCount = await VoucherUsage.count({
        where: {
          voucherId: voucher.id,
          userId: userId
        }
      });
      
      if (userUsageCount >= voucher.userUsageLimit) {
        return next(createError('INVALID_INPUT', 'You have reached the usage limit for this voucher'));
      }
    }
    
    // Check applicability
    if (applicableTo && itemId) {
      if (!voucher.isApplicableTo(applicableTo, itemId)) {
        return next(createError('INVALID_INPUT', 'Voucher is not applicable to this item'));
      }
    }
    
    // Calculate discount
    const discountAmount = voucher.calculateDiscount(parseFloat(amount));
    
    if (discountAmount === 0) {
      return next(createError('INVALID_INPUT', `Minimum purchase amount is ${voucher.minPurchaseAmount}`));
    }
    
    res.json({
      success: true,
      data: {
        voucher: {
          id: voucher.id,
          code: voucher.code,
          name: voucher.name,
          type: voucher.type,
          value: voucher.value,
          version: voucher.version
        },
        validation: {
          isValid: true,
          discountAmount,
          originalAmount: parseFloat(amount),
          finalAmount: parseFloat(amount) - discountAmount
        }
      }
    });
  } catch (error) {
    console.error('Error validating voucher:', error);
    next(error);
  }
};

/**
 * Get voucher usage statistics and history
 */
exports.getVoucherStatistics = async (req, res, next) => {
  try {
    const { voucherId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const offset = (page - 1) * limit;
    const where = { id: voucherId };
    
    // Access control
    if (!req.user.isSuperAdmin) {
      where.tenantId = req.user.tenantId;
      where.scope = 'tenant';
    }
    
    // Find the voucher
    const voucher = await Voucher.findOne({ where });
    
    if (!voucher) {
      return next(createError('NOT_FOUND', 'Voucher not found'));
    }
    
    // Get voucher usage statistics
    const { count, rows: voucherUsages } = await VoucherUsage.findAndCountAll({
      where: { voucherId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Calculate statistics
    const totalDiscount = voucherUsages.reduce((sum, usage) => sum + parseFloat(usage.discountAmount), 0);
    const averageDiscount = count > 0 ? totalDiscount / count : 0;
    
    res.status(200).json({
      success: true,
      message: 'Voucher statistics retrieved successfully',
      data: {
        voucher: {
          id: voucher.id,
          name: voucher.name,
          code: voucher.code,
          type: voucher.type,
          value: voucher.value,
          scope: voucher.scope,
          usageLimit: voucher.usageLimit,
          usageCount: voucher.usageCount
        },
        statistics: {
          totalUsage: count,
          totalDiscount,
          averageDiscount,
          remainingUsage: voucher.usageLimit ? voucher.usageLimit - voucher.usageCount : 'Unlimited'
        },
        usages: voucherUsages,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error retrieving voucher statistics:', error);
    next(error);
  }
};