const { User, Role } = require('../../../models');
const { buildUserPermissions } = require('../../../services/permissionService');
const { getDefaultPermissionsForRole, getAvailableDefaultRoles } = require('../../../utils/defaultRolePermissions');
const { getAllSubjects, getRoutesForSubject } = require('../../../config/routePermissions');
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');
const {
  buildRolePermissionsPayload,
  hasFullAccess,
  hasResourceAccess,
  resolveRolePermissions,
} = require('../../../utils/permissionUtils');

function normalizeRoleResponse(role) {
  const raw = typeof role.toJSON === 'function' ? role.toJSON() : role;
  const permissions = resolveRolePermissions(raw.permissions || {}, raw.name);

  return {
    ...raw,
    permissions,
  };
}

function getAllowedRoutesFromResources(resources) {
  if (!resources || typeof resources !== 'object') return [];

  const subjects = hasFullAccess(resources)
    ? getAllSubjects()
    : Object.keys(resources).filter(subject => subject !== '*');

  const allowedRoutes = [];
  for (const subject of subjects) {
    const routes = getRoutesForSubject(subject);
    for (const route of routes) {
      const requiredActions = route.actions || [];
      const isAllowed = hasFullAccess(resources)
        || requiredActions.every(action => hasResourceAccess(resources, action, subject));

      if (isAllowed) {
        allowedRoutes.push({
          path: route.path,
          method: route.method,
          subject: route.subject,
          actions: requiredActions,
        });
      }
    }
  }

  return allowedRoutes;
}

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
      resourceCount: Object.keys(payload.resources || {}).length,
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

const getRoutesMetadata = async (req, res) => {
  try {
    const routesMetadata = require('../../../utils/routesMetadata');

    logger.logSystem('Routes metadata retrieved', {
      action: 'ROUTES_METADATA_RETRIEVED',
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      userId: req.user.id,
      routesCount: Object.keys(routesMetadata).length,
    });

    return res.status(200).json({
      success: true,
      data: {
        routes: routesMetadata,
      },
    });
  } catch (error) {
    logger.error('Error getting routes metadata', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id,
    });

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      attributes: ['id', 'name', 'description', 'permissions', 'isActive'],
    });

    logger.logSystem('All roles retrieved', {
      action: 'ALL_ROLES_RETRIEVED',
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      userId: req.user.id,
      rolesCount: roles.length,
    });

    return res.status(200).json({
      success: true,
      data: {
        roles: roles.map(normalizeRoleResponse),
      },
    });
  } catch (error) {
    logger.error('Error getting all roles', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id,
    });

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const createRole = async (req, res) => {
  try {
    const { name, description, permissions, menuAccess, uiFlags } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Role name is required',
      });
    }

    const existingRole = await Role.findOne({ where: { name } });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Role with this name already exists',
      });
    }

    const normalizedPermissions = buildRolePermissionsPayload(
      {
        resources: permissions,
        menuAccess,
        uiFlags,
      },
      name
    );

    const role = await Role.create({
      name,
      description: description || '',
      permissions: normalizedPermissions,
      isActive: true,
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
      permissions: normalizedPermissions,
    });

    return res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: {
        role: normalizeRoleResponse(role),
      },
    });
  } catch (error) {
    logger.error('Error creating role', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id,
    });

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, permissions, menuAccess, uiFlags } = req.body;

    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    const systemRoles = ['admin', 'manager', 'user'];
    if (systemRoles.includes(role.name) && name && name !== role.name) {
      return res.status(403).json({
        success: false,
        message: 'Cannot rename system roles',
      });
    }

    const nextRoleName = name || role.name;
    const nextPermissions = buildRolePermissionsPayload(
      {
        resources: permissions,
        menuAccess,
        uiFlags,
      },
      nextRoleName,
      role.permissions || {}
    );

    if (name) role.name = name;
    if (description !== undefined) role.description = description;
    if (isActive !== undefined) role.isActive = isActive;
    role.permissions = nextPermissions;

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
      updates: {
        name,
        description,
        isActive,
        permissions: nextPermissions,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: {
        role: normalizeRoleResponse(role),
      },
    });
  } catch (error) {
    logger.error('Error updating role', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id,
      roleId: req.params.id,
    });

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const updateRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body?.permissions;

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Valid permissions object is required',
      });
    }

    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    const nextPermissions = buildRolePermissionsPayload(
      {
        resources: payload.resources || payload,
        menuAccess: payload.menuAccess,
        uiFlags: payload.uiFlags,
      },
      role.name,
      role.permissions || {}
    );

    role.permissions = nextPermissions;
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
      newPermissions: nextPermissions,
    });

    return res.status(200).json({
      success: true,
      message: 'Role permissions updated successfully',
      data: {
        role: normalizeRoleResponse(role),
      },
    });
  } catch (error) {
    logger.error('Error updating role permissions', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id,
      roleId: req.params.id,
    });

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    const systemRoles = ['admin', 'manager', 'user'];
    if (systemRoles.includes(role.name)) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete system roles',
      });
    }

    const userCount = await User.count({ where: { roleId: id } });
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role. ${userCount} user(s) are assigned to this role.`,
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
      roleName: role.name,
    });

    return res.status(200).json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting role', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id,
      roleId: req.params.id,
    });

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const regenerateRoutesMetadata = async (req, res) => {
  try {
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
      isSuperAdmin: req.user.isSuperAdmin,
    });

    generateRoutesMetadata();

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
      routesCount: Object.keys(updatedMetadata).length,
    });

    return res.status(200).json({
      success: true,
      message: 'Routes metadata regenerated successfully',
      data: {
        routesCount: Object.keys(updatedMetadata).length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error regenerating routes metadata', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id,
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to regenerate routes metadata',
      error: error.message,
    });
  }
};

const resetRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const defaults = getDefaultPermissionsForRole(role.name);
    if (!defaults) {
      return res.status(400).json({
        success: false,
        message: `No default permissions defined for role "${role.name}". Available: ${getAvailableDefaultRoles().join(', ')}`,
      });
    }

    const permissions = buildRolePermissionsPayload(
      {
        resources: defaults.resources,
        menuAccess: defaults.menuAccess,
        uiFlags: defaults.uiFlags,
      },
      role.name
    );

    await role.update({ permissions });

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
      data: { role: normalizeRoleResponse(role) },
    });
  } catch (error) {
    logger.error('Error resetting role permissions', { error: error.message, userId: req.user.id });
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const getMenuConfig = async (req, res) => {
  try {
    const { MENU_CONFIG } = require('../../../utils/menuConfig');
    return res.status(200).json({ success: true, data: { menuConfig: MENU_CONFIG } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const getAllSubjectsList = async (req, res) => {
  try {
    const subjects = getAllSubjects(true);

    logger.logSystem('Permission resources list retrieved', {
      action: 'GET_SUBJECTS_LIST',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      count: subjects.length,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    return res.status(200).json({
      success: true,
      subjects,
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

    const normalizedRole = normalizeRoleResponse(role);
    const permissions = normalizedRole.permissions;
    const allowedRoutes = getAllowedRoutesFromResources(permissions.resources);

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
          id: normalizedRole.id,
          name: normalizedRole.name,
          description: normalizedRole.description,
        },
        permissions: {
          ...permissions,
          allowedRoutes,
          summary: {
            totalResources: Object.keys(permissions.resources || {}).length,
            totalRoutes: allowedRoutes.length,
            totalMenus: permissions.menuAccess.length,
            subjects: Object.keys(permissions.resources || {}).filter(subject => subject !== '*'),
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

module.exports = {
  createRole,
  deleteRole,
  getAllRoles,
  getAllSubjectsList,
  getMenuConfig,
  getRoutesMetadata,
  getUserPermissions,
  previewRolePermissions,
  regenerateRoutesMetadata,
  resetRolePermissions,
  updateRole,
  updateRolePermissions,
};
