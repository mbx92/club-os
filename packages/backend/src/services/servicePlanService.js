const { ServicePlan, Tenant, ActiveService, Trainer, sequelize } = require('../models');
const { Op } = require('sequelize');
const { createError } = require('../utils/errorCodes');
const { withRetry } = require('../utils/concurrency');
const logger = require('../utils/logger');
const { getClientIp, getUserAgent } = require('../utils/requestHelper');

/**
 * Service Plan Business Logic Layer
 * Encapsulates all business logic for service plan operations
 */

/**
 * Helper: Get tenant's default currency
 */
function getTenantCurrency(tenant) {
  return tenant?.settings?.transaction?.currency || tenant?.settings?.currency || 'IDR';
}

/**
 * Helper: Sanitize currency value — frontend may send a currency config object instead of a string.
 * Extract the string currency code, or return null to let caller fall back to tenant default.
 */
function sanitizeCurrency(currency) {
  if (!currency) return null;
  if (typeof currency === 'string') return currency;
  if (typeof currency === 'object') {
    // e.g. { defaultCurrency: 'IDR', currencySymbol: 'Rp', ... }
    return currency.defaultCurrency || currency.code || null;
  }
  return null;
}

/**
 * Helper: Validate service plan data based on service type
 */
function validateServicePlanData(serviceType, durationType, data) {
  const errors = [];

  // Validate durationType consistency
  if (durationType === 'time_based') {
    if (!data.duration || data.duration <= 0) {
      errors.push('Duration is required and must be positive for time_based services');
    }
    if (serviceType !== 'membership') {
      errors.push('time_based durationType is only valid for membership service type');
    }
  }

  if (durationType === 'session_based') {
    if (!data.sessions || data.sessions <= 0) {
      errors.push('Sessions is required and must be positive for session_based services');
    }
    if (!data.validityDays || data.validityDays <= 0) {
      errors.push('ValidityDays is required and must be positive for session_based services');
    }
    if (serviceType === 'membership') {
      errors.push('session_based durationType is not valid for membership service type');
    }
  }

  // Validate service type specific requirements
  switch (serviceType) {
    case 'membership':
      if (durationType !== 'time_based') {
        errors.push('Membership must use time_based durationType');
      }
      break;
    case 'class_package':
      if (durationType !== 'session_based') {
        errors.push('Class package must use session_based durationType');
      }
      if (data.accessControl?.applicableClassTypes && !Array.isArray(data.accessControl.applicableClassTypes)) {
        errors.push('applicableClassTypes must be an array');
      }
      break;
    case 'pt_package':
      if (durationType !== 'session_based') {
        errors.push('PT package must use session_based durationType');
      }
      if (data.accessControl?.requiresTrainerAssignment === undefined) {
        data.accessControl = data.accessControl || {};
        data.accessControl.requiresTrainerAssignment = true; // Default untuk PT
      }
      break;
    case 'spa_package':
      if (durationType !== 'session_based') {
        errors.push('Spa package must use session_based durationType');
      }
      break;
  }

  return errors;
}

/**
 * Helper: Enrich service plan data with computed fields
 */
function enrichServicePlanData(servicePlan) {
  const plain = servicePlan.toJSON ? servicePlan.toJSON() : servicePlan;
  
  return {
    ...plain,
    pricePerSession: servicePlan.isSessionBased && servicePlan.isSessionBased() 
      ? servicePlan.getPricePerSession() 
      : null,
    isTimeBased: servicePlan.isTimeBased ? servicePlan.isTimeBased() : plain.durationType === 'time_based',
    isSessionBased: servicePlan.isSessionBased ? servicePlan.isSessionBased() : plain.durationType === 'session_based',
    requiresTrainer: servicePlan.requiresTrainer 
      ? servicePlan.requiresTrainer() 
      : plain.accessControl?.requiresTrainerAssignment === true,
    tenantCurrency: servicePlan.tenant ? getTenantCurrency(servicePlan.tenant) : null
  };
}

/**
 * Build where clause for service plan queries
 */
function buildWhereClause(filters) {
  const { tenantId, isSuperAdmin, search, serviceType, isActive } = filters;
  
  const where = isSuperAdmin ? {} : { tenantId };

  // Search by name or description
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } }
    ];
  }

  // Filter by service type
  if (serviceType && serviceType !== 'all') {
    where.serviceType = serviceType;
  }

  // Filter by active status
  if (isActive && isActive !== 'all') {
    where.isActive = isActive === 'true' || isActive === true;
  }

  return where;
}

/**
 * Get service plans with pagination and filters
 */
async function getServicePlans(filters, pagination) {
  const { page = 1, limit = 10, sortBy = 'displayOrder', sortOrder = 'ASC' } = pagination;
  
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const where = buildWhereClause(filters);

  // Validate sort field
  const allowedSortFields = ['name', 'price', 'displayOrder', 'createdAt', 'serviceType'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'displayOrder';
  const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { count, rows: servicePlans } = await ServicePlan.findAndCountAll({
    where,
    order: [[sortField, order], ['createdAt', 'DESC']],
    limit: limitNum,
    offset,
    include: [
      {
        model: Tenant,
        as: 'tenant',
        attributes: ['id', 'name', 'settings']
      },
      {
        model: Trainer,
        as: 'trainer',
        attributes: ['id', 'firstName', 'lastName', 'specializations', 'isActive'],
        required: false
      }
    ]
  });

  // Enrich service plans with computed fields
  const enrichedServicePlans = servicePlans.map(enrichServicePlanData);
  const totalPages = Math.ceil(count / limitNum);

  return {
    data: enrichedServicePlans,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalRecords: count,
      limit: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
}

/**
 * Get service plans by specific type (helper for filtered queries)
 */
async function getServicePlansByType(tenantId, serviceType, options = {}) {
  const { isActive = true, isSuperAdmin = false } = options;
  
  const where = buildWhereClause({
    tenantId,
    isSuperAdmin,
    serviceType,
    isActive: isActive ? 'true' : 'all'
  });

  const servicePlans = await ServicePlan.findAll({
    where,
    order: [['displayOrder', 'ASC'], ['name', 'ASC']],
    include: [
      {
        model: Tenant,
        as: 'tenant',
        attributes: ['id', 'name', 'settings']
      },
      {
        model: Trainer,
        as: 'trainer',
        attributes: ['id', 'firstName', 'lastName', 'specializations', 'isActive'],
        required: false
      }
    ]
  });

  return servicePlans.map(enrichServicePlanData);
}

/**
 * Get single service plan by ID
 */
async function getServicePlanById(id, tenantId, isSuperAdmin = false) {
  const where = { id };
  if (!isSuperAdmin) {
    where.tenantId = tenantId;
  }

  const servicePlan = await ServicePlan.findOne({
    where,
    include: [
      {
        model: Tenant,
        as: 'tenant',
        attributes: ['id', 'name', 'settings']
      },
      {
        model: Trainer,
        as: 'trainer',
        attributes: ['id', 'firstName', 'lastName', 'specializations', 'isActive'],
        required: false
      }
    ]
  });

  if (!servicePlan) {
    throw createError('SERVICE_PLAN_NOT_FOUND', 'Service plan not found', 404);
  }

  return enrichServicePlanData(servicePlan);
}

/**
 * Create new service plan with validation
 */
async function createServicePlan(data, user) {
  const { tenantId, isSuperAdmin } = user;
  const {
    serviceType,
    name,
    description,
    price,
    currency,
    durationType,
    duration,
    sessions,
    validityDays,
    accessControl = {},
    isActive = true,
    isPopular = false,
    allowWalkIn = false,
    pax = 1,
    displayOrder,
    isBundle = false,
    bundledServices = null,
    trainerId = null
  } = data;

  const t = await sequelize.transaction();

  try {
    // Basic validation
    if (!serviceType || !name || !price || !durationType) {
      throw createError('VALIDATION_ERROR', 'Missing required fields: serviceType, name, price, durationType', 400);
    }

    // Validate price
    if (price <= 0) {
      throw createError('VALIDATION_ERROR', 'Price must be greater than 0', 400);
    }

    // Validate service type specific rules
    const validationErrors = validateServicePlanData(serviceType, durationType, {
      duration,
      sessions,
      validityDays,
      accessControl
    });

    if (validationErrors.length > 0) {
      throw createError('VALIDATION_ERROR', validationErrors.join('; '), 400);
    }

    // Validate trainerId if provided
    if (trainerId) {
      const trainer = await Trainer.findOne({
        where: { id: trainerId, tenantId: isSuperAdmin && data.tenantId ? data.tenantId : tenantId, isActive: true },
        transaction: t
      });
      if (!trainer) {
        throw createError('TRAINER_NOT_FOUND', 'Trainer not found or not active', 404);
      }
    }

    // Get tenant for currency and subscription check
    const targetTenantId = isSuperAdmin && data.tenantId ? data.tenantId : tenantId;
    const tenant = await Tenant.findByPk(targetTenantId, {
      include: [{ association: 'subscription', include: ['plan'] }],
      transaction: t
    });

    if (!tenant) {
      throw createError('TENANT_NOT_FOUND', 'Tenant not found', 404);
    }

    // Get currency from tenant settings (dynamic)
    const tenantCurrency = getTenantCurrency(tenant);
    const finalCurrency = sanitizeCurrency(currency) || tenantCurrency;

    // Check subscription limits
    const subscription = tenant.subscription;
    const planLimits = subscription?.plan?.features?.limits || {};
    const maxServicePlans = planLimits.maxServicePlans ?? 10;

    if (maxServicePlans > 0) {
      const currentCount = await ServicePlan.count({
        where: { tenantId: targetTenantId, isActive: true },
        transaction: t
      });

      if (currentCount >= maxServicePlans) {
        throw createError('LIMIT_EXCEEDED', `Service plan limit reached (${maxServicePlans}). Upgrade your subscription.`, 403);
      }
    }

    // Create service plan
    const servicePlan = await ServicePlan.create({
      tenantId: targetTenantId,
      serviceType,
      name,
      description,
      price,
      currency: finalCurrency,
      durationType,
      duration: durationType === 'time_based' ? duration : null,
      sessions: durationType === 'session_based' ? sessions : null,
      validityDays: durationType === 'session_based' ? validityDays : null,
      accessControl,
      isActive,
      isPopular,
      allowWalkIn,
      pax: Math.max(1, parseInt(pax) || 1),
      displayOrder,
      isBundle,
      bundledServices,
      trainerId: trainerId || null
    }, { transaction: t });

    // Reload with associations before commit
    await servicePlan.reload({
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'settings']
        },
        {
          model: Trainer,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'specializations', 'isActive'],
          required: false
        }
      ],
      transaction: t
    });

    await t.commit();

    logger.logInfo('Service plan created', {
      action: 'SERVICE_PLAN_CREATED',
      servicePlanId: servicePlan.id,
      serviceType: servicePlan.serviceType,
      tenantId: servicePlan.tenantId,
      userId: user.id
    });

    return enrichServicePlanData(servicePlan);
  } catch (err) {
    // Only rollback if transaction is still active
    if (t && !t.finished) {
      await t.rollback();
    }
    throw err;
  }
}

/**
 * Update service plan with validation
 */
async function updateServicePlan(id, data, user) {
  const { tenantId, isSuperAdmin } = user;
  const {
    serviceType,
    name,
    description,
    price,
    currency,
    durationType,
    duration,
    sessions,
    validityDays,
    accessControl,
    isActive,
    isPopular,
    allowWalkIn,
    pax,
    displayOrder,
    isBundle,
    bundledServices,
    trainerId
  } = data;

  const t = await sequelize.transaction();

  try {
    const where = isSuperAdmin ? { id } : { id, tenantId };

    // First, lock the service plan without include (to avoid FOR UPDATE on outer join)
    const servicePlan = await ServicePlan.findOne({
      where,
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!servicePlan) {
      throw createError('SERVICE_PLAN_NOT_FOUND', 'Service plan not found', 404);
    }

    // Then load tenant separately if needed
    if (servicePlan.tenantId) {
      servicePlan.tenant = await Tenant.findOne({
        where: { id: servicePlan.tenantId },
        attributes: ['id', 'name', 'settings'],
        transaction: t
      });
    }

    if (!servicePlan) {
      throw createError('SERVICE_PLAN_NOT_FOUND', 'Service plan not found', 404);
    }

    // Validate if serviceType or durationType is being changed
    const newServiceType = serviceType !== undefined ? serviceType : servicePlan.serviceType;
    const newDurationType = durationType !== undefined ? durationType : servicePlan.durationType;
    
    if (serviceType !== undefined || durationType !== undefined) {
      const validationErrors = validateServicePlanData(newServiceType, newDurationType, {
        duration: duration !== undefined ? duration : servicePlan.duration,
        sessions: sessions !== undefined ? sessions : servicePlan.sessions,
        validityDays: validityDays !== undefined ? validityDays : servicePlan.validityDays,
        accessControl: accessControl !== undefined ? accessControl : servicePlan.accessControl
      });

      if (validationErrors.length > 0) {
        throw createError('VALIDATION_ERROR', validationErrors.join('; '), 400);
      }
    }

    // Validate trainerId if provided
    if (trainerId !== undefined) {
      if (trainerId !== null) {
        const trainer = await Trainer.findOne({
          where: { id: trainerId, tenantId: servicePlan.tenantId, isActive: true },
          transaction: t
        });
        if (!trainer) {
          throw createError('TRAINER_NOT_FOUND', 'Trainer not found or not active', 404);
        }
      }
    }

    // Validate price if provided
    if (price !== undefined && price <= 0) {
      throw createError('VALIDATION_ERROR', 'Price must be greater than 0', 400);
    }

    // Update fields
    if (serviceType !== undefined) servicePlan.serviceType = serviceType;
    if (name !== undefined) servicePlan.name = name;
    if (description !== undefined) servicePlan.description = description;
    if (price !== undefined) servicePlan.price = price;
    if (currency !== undefined) servicePlan.currency = sanitizeCurrency(currency) || servicePlan.currency;
    if (durationType !== undefined) servicePlan.durationType = durationType;
    if (duration !== undefined) servicePlan.duration = duration;
    if (sessions !== undefined) servicePlan.sessions = sessions;
    if (validityDays !== undefined) servicePlan.validityDays = validityDays;
    if (accessControl !== undefined) servicePlan.accessControl = accessControl;
    if (isActive !== undefined) servicePlan.isActive = isActive;
    if (isPopular !== undefined) servicePlan.isPopular = isPopular;
    if (allowWalkIn !== undefined) servicePlan.allowWalkIn = allowWalkIn;
    if (pax !== undefined) servicePlan.pax = Math.max(1, parseInt(pax) || 1);
    if (displayOrder !== undefined) servicePlan.displayOrder = displayOrder;
    if (isBundle !== undefined) servicePlan.isBundle = isBundle;
    if (bundledServices !== undefined) servicePlan.bundledServices = bundledServices;
    if (trainerId !== undefined) servicePlan.trainerId = trainerId;

    // Use optimistic locking with retry
    await withRetry(async () => {
      await servicePlan.save({ transaction: t });
    });

    // Reload with associations before commit
    await servicePlan.reload({
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'settings']
        },
        {
          model: Trainer,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'specializations', 'isActive'],
          required: false
        }
      ],
      transaction: t
    });

    await t.commit();

    logger.logInfo('Service plan updated', {
      action: 'SERVICE_PLAN_UPDATED',
      servicePlanId: servicePlan.id,
      tenantId: servicePlan.tenantId,
      userId: user.id,
      updatedFields: Object.keys(data)
    });

    return enrichServicePlanData(servicePlan);
  } catch (err) {
    // Only rollback if transaction is still active
    if (t && !t.finished) {
      await t.rollback();
    }
    throw err;
  }
}

/**
 * Delete service plan (soft delete)
 */
async function deleteServicePlan(id, user) {
  const { tenantId, isSuperAdmin } = user;

  const where = { id };
  if (!isSuperAdmin) {
    where.tenantId = tenantId;
  }

  const servicePlan = await ServicePlan.findOne({ where });

  if (!servicePlan) {
    throw createError('SERVICE_PLAN_NOT_FOUND', 'Service plan not found', 404);
  }

  // Check if service plan has active services
  const activeServicesCount = await ActiveService.count({
    where: {
      servicePlanId: id,
      status: 'active'
    }
  });

  if (activeServicesCount > 0) {
    throw createError('CANNOT_DELETE', `Cannot delete service plan with ${activeServicesCount} active services. Deactivate it instead.`, 400);
  }

  await servicePlan.destroy(); // Soft delete

  logger.logInfo('Service plan deleted', {
      action: 'SERVICE_PLAN_DELETED',
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      servicePlanId: id,
    tenantId: servicePlan.tenantId,
    userId: user.id
    });

  return { success: true };
}

/**
 * Get service type statistics
 */
async function getServiceTypeStats(tenantId, isSuperAdmin = false) {
  const where = isSuperAdmin ? {} : { tenantId, isActive: true };

  const stats = await ServicePlan.findAll({
    where,
    attributes: [
      'serviceType',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.cast(sequelize.col('price'), 'DECIMAL')), 'totalValue'],
      [sequelize.fn('AVG', sequelize.cast(sequelize.col('price'), 'DECIMAL')), 'avgPrice']
    ],
    group: ['serviceType'],
    raw: true
  });

  // Format decimal values to 2 decimal places
  return stats.map(stat => ({
    serviceType: stat.serviceType,
    count: parseInt(stat.count, 10),
    totalValue: parseFloat(stat.totalValue || 0).toFixed(2),
    avgPrice: parseFloat(stat.avgPrice || 0).toFixed(2)
  }));
}

module.exports = {
  getServicePlans,
  getServicePlansByType,
  getServicePlanById,
  createServicePlan,
  updateServicePlan,
  deleteServicePlan,
  getServiceTypeStats,
  // Export helpers for reuse
  getTenantCurrency,
  validateServicePlanData,
  enrichServicePlanData,
  buildWhereClause
};
