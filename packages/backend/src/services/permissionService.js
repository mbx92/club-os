/**
 * Permission Service
 *
 * Membangun unified permission payload yang dikirim ke frontend.
 * Frontend menerima data lengkap dalam satu request.
 *
 * Response shape:
 * {
 *   user:               { id, email, role, isSuperAdmin, tenantId }
 *   resources:          { Member: ['read', 'create'], ... }
 *   uiFlags:            { canManageUsers, canManageRoles, ... }
 *   subscription: {
 *     modules:          { gym: true, pos: false, ... }
 *     limits:           { maxUsers: 10, maxMembers: 500, ... }
 *     features:         { ... }
 *     status:           'active' | 'trial' | 'expired' | null
 *     planName:         'Enterprise' | null
 *   }
 *   menuItems:          [ { key, label, icon, path, visible, children? } ]
 * }
 *
 * @module services/permissionService
 */

const { Subscription, SubscriptionPlan, Tenant, User, Role } = require('../models');
const { can, getEffectiveResources } = require('../utils/rbac');
const { MENU_CONFIG } = require('../utils/menuConfig');
const { getDefaultPermissionsForRole } = require('../utils/defaultRolePermissions');
const { getMenuAccessForRole, hasFullAccess } = require('../utils/menuKeys');
const { resolveRolePermissions } = require('../utils/permissionUtils');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch subscription info for a tenant.
 */
async function getSubscriptionInfo(tenantId) {
  if (!tenantId) {
    return { modules: {}, limits: {}, features: {}, status: null, planName: null, isInTrial: false };
  }

  const tenant = await Tenant.findByPk(tenantId);
  const isInTrial = !!(
    tenant?.isOnTrial &&
    tenant.trialEndDate &&
    new Date() < new Date(tenant.trialEndDate)
  );

  if (isInTrial) {
    return {
      modules:    { _trial: true },
      limits:     {},
      features:   {},
      status:     'trial',
      planName:   'Trial',
      isInTrial:  true,
    };
  }

  const subscription = await Subscription.findOne({
    where: { tenantId, status: 'active' },
    include: [{ model: SubscriptionPlan, as: 'plan' }],
    order: [['createdAt', 'DESC']],
  });

  if (!subscription) {
    return { modules: {}, limits: {}, features: {}, status: 'none', planName: null, isInTrial: false };
  }

  // plan.features shape: { modules, limits, transactions, payments, ... }
  // There is no nested `features` key — categories live at the top level.
  const f = subscription.plan?.features || {};
  const { modules = {}, limits = {}, ...featureCategories } = f;
  return {
    modules,
    limits,
    features: featureCategories,
    status: subscription.status,
    planName: subscription.plan.name,
    isInTrial: false,
  };
}

/**
 * Decide whether a single menu item is visible for the user.
 */
function isMenuItemVisible(item, user, subInfo, uiFlags) {
  if (user?.isSuperAdmin) return true;
  if (item.superAdminOnly) return false;

  // Admin/owner roles are tenant-level administrators — show everything
  const isAdmin = user?.role?.name === 'admin' || user?.role?.name === 'owner';
  if (isAdmin) return true;

  // Module check
  if (item.requiredModule) {
    if (!subInfo.isInTrial && !subInfo.modules[item.requiredModule]) return false;
  }

  // Permission check
  if (item.requiredPermission) {
    const { action, subject } = item.requiredPermission;
    if (!can(user, action, subject)) return false;
  }

  // UI flag check
  if (item.requiredFlag) {
    if (!uiFlags[item.requiredFlag]) return false;
  }

  return true;
}

/**
 * Recursively filter a menu tree.
 */
function filterMenu(items, user, subInfo, uiFlags) {
  const result = [];
  for (const item of items) {
    const visible = isMenuItemVisible(item, user, subInfo, uiFlags);
    if (!visible) continue;

    const entry = { ...item };
    if (item.children?.length) {
      entry.children = filterMenu(item.children, user, subInfo, uiFlags);
      if (!item.path && entry.children.length === 0) continue;
    }
    result.push(entry);
  }
  return result;
}

// ─── Main exported function ────────────────────────────────────────────────────

/**
 * Build the complete permission payload for a user.
 */
async function buildUserPermissions(userId) {
  const user = await User.findByPk(userId, {
    include: [{ model: Role, as: 'role' }],
  });

  if (!user) throw new Error('User not found');

  const resolvedPermissions = resolveRolePermissions(user.role?.permissions || {}, user.role?.name);
  const resources = getEffectiveResources(user);
  const uiFlags = resolvedPermissions.uiFlags;
  const subInfo = await getSubscriptionInfo(user.tenantId);

  const menuItems = filterMenu(MENU_CONFIG, user, subInfo, uiFlags);
  const roleName = user.role?.name;
  let menuAccess = resolvedPermissions.menuAccess;
  if (user.isSuperAdmin || hasFullAccess(resources) || ['admin', 'owner'].includes(roleName)) {
    menuAccess = getMenuAccessForRole(roleName) || getMenuAccessForRole('admin');
  }

  return {
    user: {
      id:          user.id,
      email:       user.email,
      firstName:   user.firstName,
      lastName:    user.lastName,
      isSuperAdmin: user.isSuperAdmin,
      tenantId:    user.tenantId,
      role: user.role ? { id: user.role.id, name: user.role.name } : null,
    },
    resources,
    uiFlags,
    subscription: {
      modules:  subInfo.modules,
      limits:   subInfo.limits,
      features: subInfo.features,
      status:   subInfo.status,
      planName: subInfo.planName,
      isInTrial: subInfo.isInTrial,
    },
    menuItems,
    menuAccess,
  };
}

/**
 * Populate Role.permissions with default resources + uiFlags for a given role name.
 */
async function initDefaultPermissionsForRole(roleInstance) {
  const defaults = getDefaultPermissionsForRole(roleInstance.name);
  if (!defaults) return;

  const current = roleInstance.permissions || {};
  if (!current.resources || Object.keys(current.resources).length === 0) {
    await roleInstance.update({
      permissions: {
        ...current,
        resources: defaults.resources,
        uiFlags: defaults.uiFlags,
        menuAccess: defaults.menuAccess,
      },
    });
  }
}

module.exports = {
  buildUserPermissions,
  initDefaultPermissionsForRole,
  getSubscriptionInfo,
  filterMenu,
  MENU_CONFIG,
};
