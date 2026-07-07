const { getDefaultPermissionsForRole } = require('./defaultRolePermissions');
const { normalizeMenuAccess, deriveMenuAccessFromResources } = require('./menuKeys');

const FULL_ACCESS_RESOURCE = '*';
const FULL_ACCESS_ACTION = '*';
const CRUD_ACTIONS = ['read', 'create', 'update', 'delete'];
const RESERVED_PERMISSION_KEYS = new Set([
  'resources',
  'menuAccess',
  'uiFlags',
  'rules',
  'rolePermissions',
]);

const LEGACY_RESOURCE_MAP = {
  tenants: 'Tenant',
  users: 'User',
  roles: 'Role',
  members: 'Member',
  memberships: 'MembershipPlan',
  servicePlans: 'ServicePlan',
  activeServices: 'ActiveService',
  payments: 'Payment',
  checkIns: 'CheckIn',
  transactions: 'Transaction',
  expenses: 'Expense',
  products: 'RestaurantProduct',
};

function normalizeUiFlags(uiFlags = {}) {
  if (!uiFlags || typeof uiFlags !== 'object' || Array.isArray(uiFlags)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(uiFlags).map(([key, value]) => [key, Boolean(value)])
  );
}

function normalizeActionList(actions, { expandFullAccess = true } = {}) {
  const input = Array.isArray(actions) ? actions : [actions];
  const normalized = new Set();

  for (const action of input) {
    if (!action || typeof action !== 'string') continue;

    const value = action.toLowerCase();
    if (value === 'manage' || value === FULL_ACCESS_ACTION) {
      if (expandFullAccess) {
        CRUD_ACTIONS.forEach(item => normalized.add(item));
      } else {
        normalized.add(FULL_ACCESS_ACTION);
      }
      continue;
    }

    normalized.add(value);
  }

  return [...normalized];
}

function normalizeResourceName(resource) {
  if (!resource || typeof resource !== 'string') return null;
  if (resource === FULL_ACCESS_RESOURCE) return FULL_ACCESS_RESOURCE;
  return LEGACY_RESOURCE_MAP[resource] || resource;
}

function normalizeResourcePermissions(resources = {}) {
  if (!resources || typeof resources !== 'object' || Array.isArray(resources)) {
    return {};
  }

  const normalized = {};

  for (const [rawResource, rawActions] of Object.entries(resources)) {
    const resource = normalizeResourceName(rawResource);
    if (!resource) continue;

    if (resource === FULL_ACCESS_RESOURCE) {
      // RBAC-04 fix: don't silently upgrade a partial wildcard grant (e.g.
      // { '*': ['read'] }, meaning "read access to every resource") into
      // full { '*': ['*'] } CRUD access. Only actually-requested actions —
      // including a literal '*' if that's what was granted — survive here.
      const actions = normalizeActionList(rawActions, { expandFullAccess: false });
      if (actions.length > 0) {
        normalized[resource] = actions;
      }
      continue;
    }

    const actions = normalizeActionList(rawActions);
    if (actions.length > 0) {
      normalized[resource] = actions;
    }
  }

  return normalized;
}

function resourcesFromRules(rules = []) {
  if (!Array.isArray(rules) || rules.length === 0) return {};

  const resources = {};

  for (const rule of rules) {
    const subject = rule?.subject;
    if (!subject || rule?.inverted) continue;

    const actions = normalizeActionList(rule.actions || rule.action, {
      expandFullAccess: subject !== 'all',
    });

    if (subject === 'all' && actions.length > 0) {
      return { [FULL_ACCESS_RESOURCE]: [FULL_ACCESS_ACTION] };
    }

    if (actions.length === 0) continue;

    resources[subject] = [...new Set([...(resources[subject] || []), ...actions])];
  }

  return normalizeResourcePermissions(resources);
}

function resourcesFromRolePermissions(rolePermissions = {}) {
  if (!rolePermissions || typeof rolePermissions !== 'object' || Array.isArray(rolePermissions)) {
    return {};
  }

  const resources = {};

  for (const [resource, value] of Object.entries(rolePermissions)) {
    if (Array.isArray(value)) {
      resources[resource] = value;
      continue;
    }

    if (!value || typeof value !== 'object') continue;

    const actions = Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([action]) => action);

    if (actions.length > 0) {
      resources[resource] = actions;
    }
  }

  return normalizeResourcePermissions(resources);
}

function resourcesFromLegacyFlatPermissions(permissions = {}) {
  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
    return {};
  }

  const resources = {};

  for (const [key, value] of Object.entries(permissions)) {
    if (RESERVED_PERMISSION_KEYS.has(key)) continue;
    if (!Array.isArray(value) || value.length === 0) continue;

    const resource = normalizeResourceName(
      LEGACY_RESOURCE_MAP[key] || (key.charAt(0).toUpperCase() + key.slice(1))
    );
    if (!resource) continue;

    resources[resource] = value;
  }

  return normalizeResourcePermissions(resources);
}

function getStoredResources(permissions = {}) {
  let merged = {};

  if (permissions?.resources && typeof permissions.resources === 'object') {
    merged = normalizeResourcePermissions(permissions.resources);
  }

  const fromRolePermissions = resourcesFromRolePermissions(permissions?.rolePermissions);
  if (Object.keys(fromRolePermissions).length > 0) {
    merged = normalizeResourcePermissions({ ...merged, ...fromRolePermissions });
  }

  const fromRules = resourcesFromRules(permissions?.rules);
  if (Object.keys(fromRules).length > 0) {
    merged = normalizeResourcePermissions({ ...merged, ...fromRules });
  }

  if (Object.keys(merged).length > 0) {
    return merged;
  }

  return resourcesFromLegacyFlatPermissions(permissions);
}

function hasFullAccess(resources = {}) {
  const normalized = normalizeResourcePermissions(resources);
  return Array.isArray(normalized[FULL_ACCESS_RESOURCE])
    && normalized[FULL_ACCESS_RESOURCE].includes(FULL_ACCESS_ACTION);
}

function hasResourceAccess(resources = {}, action, resource) {
  const normalized = normalizeResourcePermissions(resources);

  if (hasFullAccess(normalized)) return true;

  // A partial wildcard grant, e.g. { '*': ['read'] }, grants that specific
  // action across every resource without escalating to full CRUD access
  // (see RBAC-04 fix in normalizeResourcePermissions above).
  const wildcardActions = normalized[FULL_ACCESS_RESOURCE] || [];
  if (wildcardActions.includes(action)) return true;

  const normalizedSubject = normalizeResourceName(resource) || resource;
  const actions = normalized[normalizedSubject] || [];
  return actions.includes(FULL_ACCESS_ACTION) || actions.includes(action);
}

function deriveUiFlags(resources = {}) {
  return {
    canManageUsers: hasResourceAccess(resources, 'update', 'User')
      || hasResourceAccess(resources, 'create', 'User')
      || hasResourceAccess(resources, 'delete', 'User'),
    canManageRoles: hasResourceAccess(resources, 'update', 'Role')
      || hasResourceAccess(resources, 'create', 'Role')
      || hasResourceAccess(resources, 'delete', 'Role'),
    canViewLogs: hasResourceAccess(resources, 'read', 'Log'),
    canManageSettings: hasResourceAccess(resources, 'update', 'Tenant')
      || hasResourceAccess(resources, 'update', 'SystemSettings')
      || hasResourceAccess(resources, 'update', 'PrinterSettings')
      || hasResourceAccess(resources, 'update', 'ReceiptTemplate')
      || hasResourceAccess(resources, 'create', 'DatabaseBackup')
      || hasResourceAccess(resources, 'read', 'Scheduler'),
    canManageTenant: hasResourceAccess(resources, 'update', 'Tenant'),
  };
}

function resolveRolePermissions(rawPermissions = {}, roleName) {
  const defaults = getDefaultPermissionsForRole(roleName);
  const defaultResources = normalizeResourcePermissions(defaults?.resources || {});
  const storedResources = getStoredResources(rawPermissions);
  const resolvedResources = Object.keys(storedResources).length > 0
    ? normalizeResourcePermissions({ ...defaultResources, ...storedResources })
    : defaultResources;

  const uiFlags = rawPermissions?.uiFlags
    ? normalizeUiFlags(rawPermissions.uiFlags)
    : normalizeUiFlags(defaults?.uiFlags || deriveUiFlags(resolvedResources));

  let menuAccess;
  if (Array.isArray(rawPermissions?.menuAccess)) {
    menuAccess = normalizeMenuAccess(rawPermissions.menuAccess, roleName);
  } else if (Array.isArray(defaults?.menuAccess)) {
    menuAccess = normalizeMenuAccess(defaults.menuAccess, roleName);
  } else {
    menuAccess = deriveMenuAccessFromResources(resolvedResources, roleName);
  }

  return {
    resources: resolvedResources,
    uiFlags,
    menuAccess,
  };
}

function buildRolePermissionsPayload(input = {}, roleName, currentPermissions = {}) {
  const current = resolveRolePermissions(currentPermissions, roleName);
  const storedResources = getStoredResources(currentPermissions);
  const defaultResources = normalizeResourcePermissions(
    getDefaultPermissionsForRole(roleName)?.resources || {}
  );
  const baseResources = normalizeResourcePermissions({
    ...defaultResources,
    ...storedResources,
  });

  const nextResources = input.resources !== undefined
    ? normalizeResourcePermissions({
        ...baseResources,
        ...normalizeResourcePermissions(input.resources),
      })
    : (Object.keys(storedResources).length > 0 ? baseResources : current.resources);
  const nextMenuAccess = input.menuAccess !== undefined
    ? normalizeMenuAccess(input.menuAccess, roleName)
    : current.menuAccess;
  const hasStoredUiFlags = currentPermissions?.uiFlags
    && typeof currentPermissions.uiFlags === 'object'
    && !Array.isArray(currentPermissions.uiFlags)
    && Object.keys(currentPermissions.uiFlags).length > 0;
  const nextUiFlags = input.uiFlags !== undefined
    ? normalizeUiFlags(input.uiFlags)
    : (hasStoredUiFlags ? current.uiFlags : deriveUiFlags(nextResources));

  return {
    resources: nextResources,
    uiFlags: nextUiFlags,
    menuAccess: nextMenuAccess,
  };
}

module.exports = {
  CRUD_ACTIONS,
  FULL_ACCESS_ACTION,
  FULL_ACCESS_RESOURCE,
  buildRolePermissionsPayload,
  deriveUiFlags,
  getStoredResources,
  hasFullAccess,
  hasResourceAccess,
  normalizeResourcePermissions,
  normalizeUiFlags,
  resolveRolePermissions,
  resourcesFromLegacyFlatPermissions,
  resourcesFromRolePermissions,
  resourcesFromRules,
};
