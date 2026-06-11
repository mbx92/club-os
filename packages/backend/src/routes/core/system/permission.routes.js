const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const { requireSuperAdmin } = require('../../../middlewares/superAdminMiddleware');
const auditLog = require('../../../middlewares/auditMiddleware');
const { 
  getUserPermissions, 
  getRoutesMetadata,
  regenerateRoutesMetadata,
  getAllRoles,
  createRole,
  updateRole,
  updateRolePermissions,
  resetRolePermissions,
  getMenuConfig,
  getAllSubjectsList,
  previewRolePermissions,
  generateRules,
  deleteRole
} = require('../../../controllers/core/system/permissionController');

/**
 * @route GET /permissions/user
 * @name permissions.user
 * @desc Get current user permissions (RBAC rules and role permissions)
 * @access Private
 */
router.get('/user', authenticate, auditLog('GET_USER_PERMISSIONS'), getUserPermissions);

/**
 * @route GET /permissions/routes
 * @name permissions.routes
 * @desc Get all routes metadata
 * @access Private
 */
router.get('/routes', authenticate, auditLog('GET_ROUTES_METADATA'), getRoutesMetadata);

/**
 * @route POST /permissions/routes/regenerate
 * @name permissions.regenerateRoutes
 * @desc Regenerate routes metadata from route files
 * @access Private (Superadmin only)
 */
router.post('/routes/regenerate', authenticate, requireSuperAdmin, auditLog('REGENERATE_ROUTES_METADATA'), regenerateRoutesMetadata);

/**
 * @route GET /permissions/roles
 * @name permissions.roles
 * @desc Get all roles with permissions
 * @access Private
 */
router.get('/roles', authenticate, auditLog('GET_ALL_ROLES'), getAllRoles);

/**
 * @route POST /permissions/roles
 * @name permissions.createRole
 * @desc Create a new role with permissions
 * @access Private (Admin/Superadmin only)
 */
router.post('/roles', authenticate, authorize('create', 'Role'), auditLog('CREATE_ROLE'), createRole);

/**
 * @route PUT /permissions/roles/:id
 * @name permissions.updateRole
 * @desc Update role details (name, description, isActive)
 * @access Private (Admin/Superadmin only)
 */
router.put('/roles/:id', authenticate, authorize('update', 'Role'), auditLog('UPDATE_ROLE'), updateRole);

/**
 * @route PATCH /permissions/roles/:id/permissions
 * @name permissions.updateRolePermissions
 * @desc Update role permissions
 * @access Private (Admin/Superadmin only)
 */
router.patch('/roles/:id/permissions', authenticate, authorize('update', 'Role'), auditLog('UPDATE_ROLE_PERMISSIONS'), updateRolePermissions);

/**
 * @route DELETE /permissions/roles/:id
 * @name permissions.deleteRole
 * @desc Delete a role
 * @access Private (Admin/Superadmin only)
 */
router.delete('/roles/:id', authenticate, authorize('delete', 'Role'), auditLog('DELETE_ROLE'), deleteRole);

/**
 * @route POST /permissions/roles/:id/reset
 * @name permissions.resetRolePermissions
 * @desc Reset role permissions to system defaults
 * @access Private (Superadmin only)
 */
router.post('/roles/:id/reset', authenticate, requireSuperAdmin, auditLog('RESET_ROLE_PERMISSIONS'), resetRolePermissions);

/**
 * @route GET /permissions/menu
 * @name permissions.menuConfig
 * @desc Get full menu config (for admin role editor UI)
 * @access Private (Admin/Superadmin)
 */
router.get('/menu', authenticate, authorize('read', 'Role'), auditLog('GET_MENU_CONFIG'), getMenuConfig);

/**
 * @route GET /permissions/subjects
 * @name permissions.subjects
 * @desc Get all available RBAC subjects
 * @access Private (Admin/Superadmin)
 */
router.get('/subjects', authenticate, authorize('read', 'Role'), auditLog('GET_SUBJECTS_LIST'), getAllSubjectsList);

/**
 * @route GET /permissions/roles/:id/preview
 * @name permissions.previewRolePermissions
 * @desc Preview computed permissions for a role
 * @access Private (Admin/Superadmin)
 */
router.get('/roles/:id/preview', authenticate, authorize('read', 'Role'), auditLog('PREVIEW_ROLE_PERMISSIONS'), previewRolePermissions);

/**
 * @route POST /permissions/roles/:roleId/generate-rules
 * @name permissions.generateRules
 * @desc Generate RBAC rules from simplified form
 * @access Private (Admin/Superadmin)
 */
router.post('/roles/:roleId/generate-rules', authenticate, authorize('update', 'Role'), auditLog('GENERATE_RULES'), generateRules);

module.exports = router;
