/**
 * Shared RBAC utilities — single source of truth for admin checks.
 *
 * Used by permissionMiddleware, featureGateMiddleware, and route files
 * to avoid duplicating "who is an admin" logic.
 *
 * @module utils/rbacUtils
 */

const TENANT_ADMIN_ROLES = new Set(['admin', 'owner']);

/**
 * Resolve role name from a user object — handles Sequelize model, plain object, and string.
 */
function getRoleName(user) {
  if (!user) return null;
  if (typeof user.role === 'string') return user.role.toLowerCase();
  if (user.role?.name) return user.role.name.toLowerCase();
  return null;
}

/**
 * Is the user a tenant-level administrator (admin or owner)?
 */
function isTenantAdmin(user) {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return TENANT_ADMIN_ROLES.has(getRoleName(user));
}

module.exports = { getRoleName, isTenantAdmin, TENANT_ADMIN_ROLES };
