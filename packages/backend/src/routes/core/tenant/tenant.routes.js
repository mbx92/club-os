const express = require('express');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const auditLog = require('../../../middlewares/auditMiddleware');
const { getTenants, getTenant, createTenant, updateTenant, deleteTenant, updateTenantSettings } = require('../../../controllers/core/tenant/tenantController');

const router = express.Router();

/**
 * @route GET /tenants
 * @name tenants.list
 * @desc Get all tenants
 * @access Private (Admin only)
 */
router.get('/', authenticate, authorizeCasl('read', 'Tenant'), auditLog('LIST_TENANTS'), getTenants);

/**
 * @route GET /tenants/:id
 * @name tenants.get
 * @desc Get tenant by ID
 * @access Private
 */
router.get('/:id', authenticate, authorizeCasl('read', 'Tenant'), auditLog('GET_TENANT'), getTenant);

/**
 * @route POST /tenants
 * @name tenants.create
 * @desc Create a new tenant
 * @access Private (Admin only)
 */
router.post('/', authenticate, authorizeCasl('create', 'Tenant'), auditLog('CREATE_TENANT'), createTenant);

/**
 * @route PUT /tenants/:id
 * @name tenants.update
 * @desc Update tenant
 * @access Private
 */
router.put('/:id', authenticate, authorizeCasl('update', 'Tenant'), auditLog('UPDATE_TENANT'), updateTenant);

/**
 * @route DELETE /tenants/:id
 * @name tenants.delete
 * @desc Delete tenant
 * @access Private (Admin only)
 */
router.delete('/:id', authenticate, authorizeCasl('delete', 'Tenant'), auditLog('DELETE_TENANT'), deleteTenant);

/**
 * @route PATCH /tenants/settings
 * @name tenants.updateSettings
 * @desc Update tenant settings (theme, preferences, etc)
 * @access Private
 */
router.patch('/settings', authenticate, auditLog('UPDATE_TENANT_SETTINGS'), updateTenantSettings);

module.exports = router;
