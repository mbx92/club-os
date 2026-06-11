const { User, Role } = require('../../../models');
const { can } = require('../../../utils/rbac');
const { buildUserPermissions, initDefaultPermissionsForRole } = require('../../../services/permissionService');
const { getDefaultPermissionsForRole, getAvailableDefaultRoles } = require('../../../utils/defaultRolePermissions');
const { getAllSubjects, getSubjectForRoute, getRoutesForSubject } = require('../../../config/routePermissions');
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');

/**
 * GET /permissions/user
 *
 * Unified permission payload: CASL rules + subscription modules/limits + filtered menu.
 * Frontend uses this single call after login to build navigation and guard routes.
 */
const getUserPermissions = async (req, res) => {
  try {
    const payload = await buildUserPermissions(req.user.id);

    logger.logAuth('User permissions retrieved', {
      action: 'GET_USER_PERMISSIONS',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      role: payload.user.role?.name ?? 'no-role',
      rulesCount: payload.rules.length,
      menuItemCount: payload.menuItems.length,
    });

    return res.status(200).json({ success: true, data: payload });
  } catch (error) {
    logger.error('Error getting user permissions', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id,
    });
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

/**
 * Get all available routes with their metadata
 * This endpoint will be used by frontend to get route information
 */
const getRoutesMetadata = async (req, res) => {
  try {
    // Import routes metadata from the routes metadata file
    const routesMetadata = require('../../../utils/routesMetadata');
    
    logger.logSystem('Routes metadata retrieved', {
      action: 'ROUTES_METADATA_RETRIEVED',
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      userId: req.user.id,
      routesCount: Object.keys(routesMetadata).length
    });
    
    res.status(200).json({
      success: true,
      data: {
        routes: routesMetadata
      }
    });
  } catch (error) {
    logger.error('Error getting routes metadata', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get all roles with their permissions
 * This endpoint will be used by frontend to get all available roles
 */
const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      attributes: ['id', 'name', 'description', 'permissions', 'isActive']
    });
    
    logger.logSystem('All roles retrieved', {
      action: 'ALL_ROLES_RETRIEVED',
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      userId: req.user.id,
      rolesCount: roles.length
    });
    
    // Normalize rules for frontend: ensure `actions` is always an array
    const normalizedRoles = roles.map(role => {
      const raw = role.toJSON();
      if (raw.permissions?.rules) {
        raw.permissions.rules = raw.permissions.rules.map(rule => ({
          ...rule,
          actions: Array.isArray(rule.actions)
            ? rule.actions
            : Array.isArray(rule.action)
              ? rule.action
              : [rule.action],
        }));
      }
      return raw;
    });

    res.status(200).json({
      success: true,
      data: {
        roles: normalizedRoles
      }
    });
  } catch (error) {
    logger.error('Error getting all roles', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Create a new role
 * This endpoint allows admins to create new roles with permissions
 */
const createRole = async (req, res) => {
  try {
    const { name, description, permissions, menuAccess } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Role name is required'
      });
    }
    
    // Check if role already exists
    const existingRole = await Role.findOne({ where: { name } });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Role with this name already exists'
      });
    }
    
    // Merge menuAccess into permissions if provided
    const mergedPermissions = { ...(permissions || {}) };
    if (Array.isArray(menuAccess)) {
      mergedPermissions.menuAccess = menuAccess;
    }
    
    // Create role
    const role = await Role.create({
      name,
      description: description || '',
      permissions: mergedPermissions,
      isActive: true
    });
    
    logger.logAudit('Role created', {
      action: 'ROLE_CREATED',
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      userId: req.user.id,
      roleId: role.id,
      roleName: role.name,
      permissions
    });
    
    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: {
        role
      }
    });
  } catch (error) {
    logger.error('Error creating role', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Update role details (name, description, isActive, permissions)
 * This endpoint allows admins to update role information including permissions
 */
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, permissions, menuAccess } = req.body;
    
    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }
    
    // Prevent updating system roles (admin, manager, user)
    const systemRoles = ['admin', 'manager', 'user'];
    if (systemRoles.includes(role.name) && name && name !== role.name) {
      return res.status(403).json({
        success: false,
        message: 'Cannot rename system roles'
      });
    }
    
    // Build merged permissions
    const currentPermissions = role.permissions || {};
    let mergedPermissions = { ...currentPermissions };
    if (permissions !== undefined && typeof permissions === 'object') {
      mergedPermissions = { ...mergedPermissions, ...permissions };
    }
    // Merge menuAccess into permissions if provided (top-level, not nested)
    if (Array.isArray(menuAccess)) {
      mergedPermissions.menuAccess = menuAccess;
    }
    
    // Update role
    if (name) role.name = name;
    if (description !== undefined) role.description = description;
    if (isActive !== undefined) role.isActive = isActive;
    role.permissions = mergedPermissions;
    
    await role.save();
    
    logger.logAudit('Role updated', {
      action: 'ROLE_UPDATED',
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      userId: req.user.id,
      roleId: role.id,
      roleName: role.name,
      updates: { name, description, isActive, permissions }
    });
    
    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: {
        role
      }
    });
  } catch (error) {
    logger.error('Error updating role', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id,
      roleId: req.params.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Update role permissions
 * This endpoint allows admins to update permissions for a specific role
 */
const updateRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Valid permissions object is required'
      });
    }
    
    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }
    
    // Merge permissions (partial update)
    const currentPermissions = role.permissions || {};

    // De-normalize incoming rules: frontend sends `actions: string[]`, DB stores `action`
    if (permissions.rules && Array.isArray(permissions.rules)) {
      permissions.rules = permissions.rules.map(({ actions, action, ...rest }) => ({
        ...rest,
        action: actions !== undefined
          ? (Array.isArray(actions) && actions.length === 1 ? actions[0] : actions)
          : action,
      }));
    }

    const updatedPermissions = {
      ...currentPermissions,
      ...permissions
    };
    
    role.permissions = updatedPermissions;
    await role.save();
    
    logger.logAudit('Role permissions updated', {
      action: 'ROLE_PERMISSIONS_UPDATED',
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      userId: req.user.id,
      roleId: role.id,
      roleName: role.name,
      oldPermissions: currentPermissions,
      newPermissions: updatedPermissions
    });
    
    res.status(200).json({
      success: true,
      message: 'Role permissions updated successfully',
      data: {
        role
      }
    });
  } catch (error) {
    logger.error('Error updating role permissions', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id,
      roleId: req.params.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Delete a role
 * This endpoint allows admins to delete a role
 */
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    
    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }
    
    // Prevent deleting system roles
    const systemRoles = ['admin', 'manager', 'user'];
    if (systemRoles.includes(role.name)) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete system roles'
      });
    }
    
    // Check if role is in use
    const userCount = await User.count({ where: { roleId: id } });
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role. ${userCount} user(s) are assigned to this role.`
      });
    }
    
    await role.destroy();
    
    logger.logAudit('Role deleted', {
      action: 'ROLE_DELETED',
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      userId: req.user.id,
      roleId: role.id,
      roleName: role.name
    });
    
    res.status(200).json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting role', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id,
      roleId: req.params.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Regenerate routes metadata from route files
 * This endpoint triggers the generateRoutesMetadata script
 * Only accessible by superadmin
 */
const regenerateRoutesMetadata = async (req, res) => {
  try {
    // Import the generator script
    const { generateRoutesMetadata } = require('../../../../scripts/generateRoutesMetadata-v2');
    
    logger.logSystem('Routes metadata regeneration triggered', {
      action: 'ROUTES_METADATA_REGENERATION_TRIGGERED',
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      userId: req.user.id,
      userEmail: req.user.email,
      isSuperAdmin: req.user.isSuperAdmin
    });
    
    // Run the generation
    const result = generateRoutesMetadata();
    
    // Reload the metadata module to get fresh data
    delete require.cache[require.resolve('../../../utils/routesMetadata')];
    const updatedMetadata = require('../../../utils/routesMetadata');
    
    logger.logSystem('Routes metadata regenerated successfully', {
      action: 'ROUTES_METADATA_REGENERATED_SUCCESSFULLY',
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      userId: req.user.id,
      routesCount: Object.keys(updatedMetadata).length
    });
    
    res.status(200).json({
      success: true,
      message: 'Routes metadata regenerated successfully',
      data: {
        routesCount: Object.keys(updatedMetadata).length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error regenerating routes metadata', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate routes metadata',
      error: error.message
    });
  }
};

/**
 * POST /permissions/roles/:id/reset
 *
 * Reset role permissions ke default bawaan sistem.
 * Berguna jika admin salah konfigurasi dan ingin kembali ke awal.
 */
const resetRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findByPk(id);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

    const defaults = getDefaultPermissionsForRole(role.name);
    if (!defaults) {
      return res.status(400).json({
        success: false,
        message: `No default permissions defined for role "${role.name}". Available: ${getAvailableDefaultRoles().join(', ')}`,
      });
    }

    await role.update({
      permissions: {
        rules:     defaults.rules,
        uiFlags:    defaults.uiFlags,
        menuAccess: defaults.menuAccess,
      },
    });

    logger.logAudit('Role permissions reset to default', {
      action: 'ROLE_PERMISSIONS_RESET',
      userId: req.user.id,
      roleId: role.id,
      roleName: role.name,
      ip: getClientIp(req),
    });

    return res.status(200).json({
      success: true,
      message: `Permissions for role "${role.name}" reset to defaults`,
      data: { role: { id: role.id, name: role.name, permissions: role.permissions } },
    });
  } catch (error) {
    logger.error('Error resetting role permissions', { error: error.message, userId: req.user.id });
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /permissions/menu
 *
 * Kembalikan seluruh menu config tanpa filter (untuk admin UI / role editor).
 */
const getMenuConfig = async (req, res) => {
  try {
    const { MENU_CONFIG } = require('../../../utils/menuConfig');
    return res.status(200).json({ success: true, data: { menuConfig: MENU_CONFIG } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /permissions/subjects
 *
 * Get all available CASL subjects from route mappings.
 * Used by frontend for permission management UI.
 * 
 * Returns format:
 * {
 *   subjects: [
 *     { subject: "Member", actions: ["read", "create", "update", "delete"] },
 *     { subject: "Restaurant", actions: ["read"] },
 *     ...
 *   ]
 * }
 */
const getAllSubjectsList = async (req, res) => {
  try {
    // Get subjects with their possible actions
    const subjects = getAllSubjects(true);
    
    logger.logSystem('CASL subjects list retrieved', {
      action: 'GET_SUBJECTS_LIST',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      count: subjects.length,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });
    
    return res.status(200).json({
      success: true,
      subjects,  // Return array directly for frontend compatibility
      count: subjects.length,
    });
  } catch (error) {
    logger.error('Error getting subjects list', { error: error.message, userId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * GET /permissions/roles/:id/preview
 *
 * Preview computed permissions for a role including:
 * - CASL rules
 * - Allowed routes
 * - Menu access
 * - UI flags
 */
const previewRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findByPk(id);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }
    
    // Get stored permissions
    const permissions = role.permissions || {};
    const rules = permissions.rules || [];
    const uiFlags = permissions.uiFlags || {};
    const menuAccess = permissions.menuAccess || [];
    
    // Compute allowed routes based on rules
    const allowedRoutes = [];
    const subjectActionsMap = {};
    
    // Build subject-actions map from rules
    rules.forEach(rule => {
      const subject = rule.subject;
      const actions = rule.actions || (rule.action ? [rule.action] : []);
      
      if (!subjectActionsMap[subject]) {
        subjectActionsMap[subject] = new Set();
      }
      
      actions.forEach(action => {
        if (action === 'manage') {
          // 'manage' means all actions
          ['read', 'create', 'update', 'delete'].forEach(a => subjectActionsMap[subject].add(a));
        } else {
          subjectActionsMap[subject].add(action);
        }
      });
    });
    
    // Find matching routes
    const allSubjects = getAllSubjects();
    allSubjects.forEach(subject => {
      if (subjectActionsMap[subject]) {
        const routes = getRoutesForSubject(subject);
        routes.forEach(route => {
          const requiredActions = route.actions || [];
          const hasPermission = requiredActions.every(action => 
            subjectActionsMap[subject].has(action) || subjectActionsMap[subject].has('manage')
          );
          
          if (hasPermission) {
            allowedRoutes.push({
              path: route.path,
              method: route.method,
              subject: route.subject,
              actions: requiredActions,
            });
          }
        });
      }
    });
    
    logger.logSystem('Role permissions previewed', {
      action: 'PREVIEW_ROLE_PERMISSIONS',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      roleId: role.id,
      roleName: role.name,
      allowedRoutesCount: allowedRoutes.length,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });
    
    return res.status(200).json({
      success: true,
      data: {
        role: {
          id: role.id,
          name: role.name,
          description: role.description,
        },
        permissions: {
          rules,
          uiFlags,
          menuAccess,
          allowedRoutes,
          summary: {
            totalRules: rules.length,
            totalRoutes: allowedRoutes.length,
            totalMenus: menuAccess.length,
            subjects: Object.keys(subjectActionsMap),
          },
        },
      },
    });
  } catch (error) {
    logger.error('Error previewing role permissions', { error: error.message, userId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * POST /permissions/roles/:roleId/generate-rules
 *
 * Generate RBAC rules from simplified frontend form.
 * Frontend sends: { subjects: [{ subject, actions }] }
 * Backend returns: { rules: [...] }
 */
const generateRules = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { subjects, fullAccess } = req.body;
    
    if (!fullAccess && !Array.isArray(subjects)) {
      return res.status(400).json({
        success: false,
        message: 'subjects must be an array',
      });
    }
    
    const role = await Role.findByPk(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }
    
    // Full access: single manage-all rule (admin/owner pattern)
    const rules = fullAccess
      ? [{ subject: 'all', actions: ['manage'], conditions: { tenantId: '$tenantId' } }]
      : subjects.map(({ subject, actions }) => ({
          subject,
          actions: Array.isArray(actions) ? actions : [actions],
          conditions: { tenantId: '$tenantId' },
        }));
    
    // Get current permissions
    const currentPermissions = role.permissions || {};
    
    // Update role with new rules
    await role.update({
      permissions: {
        ...currentPermissions,
        rules,
      },
    });
    
    logger.logAudit('Rules generated for role', {
      action: 'GENERATE_RULES',
      userId: req.user.id,
      roleId: role.id,
      roleName: role.name,
      rulesCount: rules.length,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });
    
    return res.status(200).json({
      success: true,
      message: `Generated ${rules.length} rules for role "${role.name}"`,
      data: {
        role: {
          id: role.id,
          name: role.name,
        },
        rules,
      },
    });
  } catch (error) {
    logger.error('Error generating rules', { error: error.message, userId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = {
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
  deleteRole,
};