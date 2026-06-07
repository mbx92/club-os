/**
 * Permission Service
 *
 * Membangun unified permission payload yang dikirim ke frontend.
 * Frontend menerima data lengkap dalam satu request dan TIDAK perlu
 * hard-code logika show/hide menu.
 *
 * Response shape:
 * {
 *   user:               { id, email, role, isSuperAdmin, tenantId }
 *   caslRules:          [ { action, subject, conditions, inverted } ]
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
const { defineAbilitiesFor } = require('../utils/casl');
const { MENU_CONFIG } = require('../utils/menuConfig');
const { getDefaultPermissionsForRole } = require('../utils/defaultRolePermissions');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch subscription info for a tenant.
 * Returns { modules, limits, features, status, planName, isInTrial }
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
    // Trial: semua modul terbuka
    return {
      modules:    { _trial: true },          // sentinel agar frontend tahu ini trial
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

  const f = subscription.plan.features || {};
  return {
    modules:   f.modules  || {},
    limits:    f.limits   || {},
    features:  f.features || {},
    status:    subscription.status,
    planName:  subscription.plan.name,
    isInTrial: false,
  };
}

/**
 * Decide whether a single menu item is visible for the user.
 *
 * @param {object}  item        - entry from MENU_CONFIG
 * @param {object}  ability     - CASL Ability instance
 * @param {object}  subInfo     - subscription info from getSubscriptionInfo
 * @param {object}  uiFlags     - { canManageUsers, … }
 * @param {boolean} isSuperAdmin
 * @returns {boolean}
 */
function isMenuItemVisible(item, ability, subInfo, uiFlags, isSuperAdmin) {
  // SuperAdmin sees everything (except regular items are already included)
  if (isSuperAdmin) return true;

  // SuperAdmin-only items
  if (item.superAdminOnly) return false;

  // Module check
  if (item.requiredModule) {
    // Trial => all modules open
    if (!subInfo.isInTrial && !subInfo.modules[item.requiredModule]) return false;
  }

  // CASL check
  if (item.requiredCasl) {
    const { action, subject } = item.requiredCasl;
    if (!ability.can(action, subject)) return false;
  }

  // UI flag check (role-level flag)
  if (item.requiredFlag) {
    if (!uiFlags[item.requiredFlag]) return false;
  }

  return true;
}

/**
 * Recursively filter a menu tree, returning only visible items.
 * A parent with no visible children is also hidden.
 */
function filterMenu(items, ability, subInfo, uiFlags, isSuperAdmin) {
  const result = [];
  for (const item of items) {
    const visible = isMenuItemVisible(item, ability, subInfo, uiFlags, isSuperAdmin);
    if (!visible) continue;

    const entry = { ...item };
    if (item.children?.length) {
      entry.children = filterMenu(item.children, ability, subInfo, uiFlags, isSuperAdmin);
      // hide parent if no visible children and it has no direct path
      if (!item.path && entry.children.length === 0) continue;
    }
    result.push(entry);
  }
  return result;
}

/**
 * Serialize CASL rules from an Ability instance.
 * Converts to frontend-compatible format with 'actions' array.
 */
function serializeAbility(ability) {
  return ability.rules.map(rule => ({
    subject:    typeof rule.subject === 'function' ? rule.subject.modelName : rule.subject,
    actions:    Array.isArray(rule.action) ? rule.action : [rule.action],  // Convert to array
    conditions: rule.conditions || undefined,
    fields:     rule.fields     || undefined,
    inverted:   rule.inverted   || undefined,
  }));
}

/**
 * Resolve uiFlags for a user: checks stored DB flags first, then defaults.
 */
function resolveUiFlags(user) {
  // If role has custom uiFlags stored in DB
  const stored = user.role?.permissions?.uiFlags;
  if (stored && typeof stored === 'object') return stored;

  // Fallback to compiled defaults
  const defaults = getDefaultPermissionsForRole(user.role?.name);
  return defaults?.uiFlags || {};
}

// ─── Main exported function ────────────────────────────────────────────────────

/**
 * Build the complete permission payload for a user.
 *
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function buildUserPermissions(userId) {
  const user = await User.findByPk(userId, {
    include: [{ model: Role, as: 'role' }],
  });

  if (!user) throw new Error('User not found');

  const ability    = defineAbilitiesFor(user);
  const caslRules  = serializeAbility(ability);
  const uiFlags    = resolveUiFlags(user);
  const subInfo    = await getSubscriptionInfo(user.tenantId);

  const menuItems  = filterMenu(
    MENU_CONFIG,
    ability,
    subInfo,
    uiFlags,
    user.isSuperAdmin,
  );

  // Resolve menuAccess list as a flat set for quick frontend lookup
  const menuAccessSet = new Set(menuItems.flatMap(i => [i.key, ...(i.children || []).map(c => c.key)]));

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
    caslRules,
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
    menuAccess: Array.from(menuAccessSet),
  };
}

/**
 * Populate Role.permissions with default caslRules + uiFlags for a given role name.
 * Used by admin seeder or "reset to default" endpoint.
 *
 * @param {object} roleInstance  – Sequelize Role model instance
 * @returns {Promise<void>}
 */
async function initDefaultPermissionsForRole(roleInstance) {
  const defaults = getDefaultPermissionsForRole(roleInstance.name);
  if (!defaults) return; // custom role without defaults – skip

  const current = roleInstance.permissions || {};
  // Only overwrite if caslRules not yet set
  if (!current.caslRules || current.caslRules.length === 0) {
    await roleInstance.update({
      permissions: {
        ...current,
        caslRules: defaults.caslRules,
        uiFlags:   defaults.uiFlags,
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
