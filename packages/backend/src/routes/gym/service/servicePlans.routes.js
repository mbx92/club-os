const express = require('express');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireModule, enforceLimit } = require('../../../middlewares/featureGateMiddleware');
const auditLog = require('../../../middlewares/auditMiddleware');
const {
  getServicePlans,
  getServicePlanById,
  createServicePlan,
  updateServicePlan,
  deleteServicePlan,
  getServiceTypeStats
} = require('../../../controllers/gym/service');
const { ServicePlan } = require('../../../models');

const router = express.Router();

/**
 * @route GET /service/plans
 * @name servicePlans.list
 * @desc Get all service plans for tenant
 * @access Private
 * @query page, limit, search, serviceType, isActive, sortBy, sortOrder
 */
router.get('/',
  authenticate,
  requireModule('serviceManagement'),
  authorizeCasl('read', 'ServicePlan'),
  auditLog('LIST_SERVICE_PLANS'),
  getServicePlans
);

/**
 * @route GET /service/plans/stats
 * @name servicePlans.stats
 * @desc Get service type statistics
 * @access Private
 */
router.get('/stats',
  authenticate,
  requireModule('serviceManagement'),
  authorizeCasl('read', 'ServicePlan'),
  getServiceTypeStats
);

/**
 * @route GET /service/plans/:id
 * @name servicePlans.get
 * @desc Get service plan by ID
 * @access Private
 */
router.get('/:id',
  authenticate,
  requireModule('serviceManagement'),
  authorizeCasl('read', 'ServicePlan'),
  auditLog('GET_SERVICE_PLAN'),
  getServicePlanById
);

/**
 * @route POST /service/plans
 * @name servicePlans.create
 * @desc Create a new service plan
 * @access Private
 * @limits Enforces maxServicePlans limit from subscription plan
 */
router.post('/',
  authenticate,
  requireModule('serviceManagement'),
  authorizeCasl('create', 'ServicePlan'),
  enforceLimit('maxServicePlans', async (tenantId) => {
    return await ServicePlan.count({ where: { tenantId, isActive: true } });
  }),
  auditLog('CREATE_SERVICE_PLAN'),
  createServicePlan
);

/**
 * @route PUT /service/plans/:id
 * @name servicePlans.update
 * @desc Update service plan
 * @access Private
 */
router.put('/:id',
  authenticate,
  requireModule('serviceManagement'),
  authorizeCasl('update', 'ServicePlan'),
  auditLog('UPDATE_SERVICE_PLAN'),
  updateServicePlan
);

/**
 * @route DELETE /service/plans/:id
 * @name servicePlans.delete
 * @desc Delete service plan (soft delete)
 * @access Private
 */
router.delete('/:id',
  authenticate,
  requireModule('serviceManagement'),
  authorizeCasl('delete', 'ServicePlan'),
  auditLog('DELETE_SERVICE_PLAN'),
  deleteServicePlan
);

module.exports = router;
