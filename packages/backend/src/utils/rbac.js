const { getDefaultPermissionsForRole } = require('./defaultRolePermissions');
const {
  applyMenuAccessResourceGrants,
  getStoredResources,
  hasFullAccess,
  hasResourceAccess,
  normalizeResourcePermissions,
} = require('./permissionUtils');
const { normalizeMenuAccess } = require('./menuKeys');

function getEffectiveResources(user) {
  if (!user) return {};

  const defaults = getDefaultPermissionsForRole(user.role?.name);
  const defaultResources = normalizeResourcePermissions(defaults?.resources || {});
  const storedResources = getStoredResources(user.role?.permissions || {});

  let resources;
  if (Object.keys(storedResources).length === 0) {
    resources = defaultResources;
  } else {
    // Legacy roles may only have partial `rules` stored (e.g. cashier seeded
    // before Tenant:read existed). Merge defaults underneath so boot-critical
    // reads like tenant settings / payment methods keep working.
    resources = normalizeResourcePermissions({
      ...defaultResources,
      ...storedResources,
    });
  }

  const rawMenuAccess = Array.isArray(user.role?.permissions?.menuAccess)
    ? user.role.permissions.menuAccess
    : (defaults?.menuAccess || []);

  return applyMenuAccessResourceGrants(
    resources,
    normalizeMenuAccess(rawMenuAccess, user.role?.name),
    user.role?.name
  );
}

function can(user, action, subject) {
  if (user?.isSuperAdmin) return true;

  const resources = getEffectiveResources(user);
  if (hasFullAccess(resources)) return true;

  const allowed = hasResourceAccess(resources, action, subject);
  if (!allowed && process.env.NODE_ENV !== 'production') {
    console.warn(
      `[permissions] DENIED ${action}:${subject} for role="${user?.role?.name}"`,
      { resources }
    );
  }

  return allowed;
}

module.exports = { can, getEffectiveResources };
