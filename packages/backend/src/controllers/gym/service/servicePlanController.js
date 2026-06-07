const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');
const servicePlanService = require('../../../services/servicePlanService');

/**
 * Get all service plans for tenant
 * Supports pagination, search, and filtering by serviceType
 */
async function getServicePlans(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      page = 1,
      limit = 10,
      search = '',
      serviceType = 'all',
      isActive = 'all',
      sortBy = 'displayOrder',
      sortOrder = 'ASC'
    } = req.query;

    const filters = { tenantId, isSuperAdmin, search, serviceType, isActive };
    const pagination = { page, limit, sortBy, sortOrder };

    const result = await servicePlanService.getServicePlans(filters, pagination);

    logger.logInfo('Service plans retrieved', {
      action: 'SERVICE_PLANS_RETRIEVED',
      userId: req.user?.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      count: result.data.length,
      totalRecords: result.pagination.totalRecords,
      tenantId: req.user.tenantId,
      filters: { serviceType, isActive }
    });

    return res.json({
      ...result,
      filters: { search, serviceType, isActive, sortBy, sortOrder }
    });
  } catch (err) {
    logger.logSecurity('Error retrieving service plans', {
      action: 'RETRIEVING_SERVICE_PLANS',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      tenantId: req.user.tenantId,
    userId: req.user?.id,
    ip: getClientIp(req)
    });
    return next(err);
  }
}

/**
 * Get a single service plan by ID
 */
async function getServicePlanById(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const servicePlan = await servicePlanService.getServicePlanById(id, tenantId, isSuperAdmin);

    logger.logInfo('Service plan retrieved', {
      action: 'SERVICE_PLAN_RETRIEVED',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      servicePlanId: id,
      tenantId: req.user.tenantId,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    return res.json({ data: servicePlan });
  } catch (err) {
    logger.logSecurity('Error retrieving service plan', {
      action: 'RETRIEVING_SERVICE_PLAN',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      servicePlanId: req.params.id,
    userId: req.user?.id,
    ip: getClientIp(req)
    });
    return next(err);
  }
}

/**
 * Create a new service plan
 */
async function createServicePlan(req, res, next) {
  try {
    const servicePlan = await servicePlanService.createServicePlan(req.body, req.user);

    return res.status(201).json({
      message: 'Service plan created successfully',
      data: servicePlan
    });
  } catch (err) {
    logger.logSecurity('Error creating service plan', {
      action: 'CREATING_SERVICE_PLAN',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      tenantId: req.user.tenantId,
      userId: req.user.id,
    userId: req.user?.id,
    ip: getClientIp(req)
    });
    return next(err);
  }
}

/**
 * Update a service plan
 */
async function updateServicePlan(req, res, next) {
  try {
    const { id } = req.params;
    const servicePlan = await servicePlanService.updateServicePlan(id, req.body, req.user);

    return res.json({
      message: 'Service plan updated successfully',
      data: servicePlan
    });
  } catch (err) {
    logger.logSecurity('Error updating service plan', {
      action: 'UPDATING_SERVICE_PLAN',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      servicePlanId: req.params.id,
      tenantId: req.user.tenantId,
    userId: req.user?.id,
    ip: getClientIp(req)
    });
    return next(err);
  }
}

/**
 * Delete (soft delete) a service plan
 */
async function deleteServicePlan(req, res, next) {
  try {
    const { id } = req.params;
    await servicePlanService.deleteServicePlan(id, req.user);

    return res.json({
      message: 'Service plan deleted successfully'
    });
  } catch (err) {
    logger.logSecurity('Error deleting service plan', {
      action: 'DELETING_SERVICE_PLAN',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      servicePlanId: req.params.id,
      tenantId: req.user.tenantId,
    userId: req.user?.id,
    ip: getClientIp(req)
    });
    return next(err);
  }
}

/**
 * Get service types statistics
 */
async function getServiceTypeStats(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const stats = await servicePlanService.getServiceTypeStats(tenantId, isSuperAdmin);

    logger.logInfo('Service type stats retrieved', {
      action: 'SERVICE_TYPE_STATS_RETRIEVED',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      tenantId: req.user.tenantId,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    return res.json({ data: stats });
  } catch (err) {
    logger.logSecurity('Error retrieving service type stats', {
      action: 'RETRIEVING_SERVICE_TYPE_STATS',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      tenantId: req.user.tenantId,
    userId: req.user?.id,
    ip: getClientIp(req)
    });
    return next(err);
  }
}

module.exports = {
  getServicePlans,
  getServicePlanById,
  createServicePlan,
  updateServicePlan,
  deleteServicePlan,
  getServiceTypeStats
};
