import { ALL_MENU_KEYS, ROLE_MENU_MAP } from './menuKeys'

/** Map legacy / stale DB keys → canonical navigation keys */
const LEGACY_MENU_KEY_MAP = {
  finance: 'finances',
  finances: 'finances',
  pos: 'gym.pos',
  classes: 'gym.classes',
  advancedReports: 'reports',
  users: 'settings',
  roles: 'settings',
  logs: 'settings',
  psychology: null,
}

/** Flatten ALL_MENU_KEYS tree into a flat array of all valid keys */
export function getAllMenuKeyValues() {
  const keys = []
  for (const menu of ALL_MENU_KEYS) {
    keys.push(menu.key)
    if (menu.children) {
      menu.children.forEach(c => keys.push(c.key))
    }
  }
  return keys
}

const VALID_MENU_KEYS = new Set(getAllMenuKeyValues())

/**
 * Normalize stored menuAccess from DB — remap legacy keys, drop stale entries.
 */
export function normalizeMenuAccess(keys) {
  if (!Array.isArray(keys)) return []

  const result = new Set()
  for (const key of keys) {
    if (!key || typeof key !== 'string') continue
    if (key.startsWith('psychology')) continue

    if (VALID_MENU_KEYS.has(key)) {
      result.add(key)
      continue
    }

    const topLevel = key.includes('.') ? key.split('.')[0] : key
    const mapped = LEGACY_MENU_KEY_MAP[key] ?? LEGACY_MENU_KEY_MAP[topLevel]
    if (mapped === null) continue
    if (mapped && VALID_MENU_KEYS.has(mapped)) {
      result.add(mapped)
    }
  }

  return expandParentMenuKeys([...result])
}

/** When a parent key is present, include all its children from the canonical list */
function expandParentMenuKeys(keys) {
  const result = new Set(keys)
  for (const key of keys) {
    if (!key.includes('.')) {
      for (const valid of VALID_MENU_KEYS) {
        if (valid.startsWith(key + '.')) result.add(valid)
      }
    }
  }
  return [...result]
}

/** Check if rules array contains manage-all */
export function hasManageAllRule(rules) {
  if (!Array.isArray(rules)) return false
  return rules.some(r => {
    const actions = r.actions
      ? (Array.isArray(r.actions) ? r.actions : [r.actions])
      : (r.action ? [r.action] : [])
    return r.subject === 'all' && actions.includes('manage')
  })
}

/** Resolve menu access for edit modal — normalize DB data or use role defaults */
export function resolveMenuAccessForRole(role) {
  const roleName = role?.name?.toLowerCase()
  const perms = role?.permissions || {}
  const rules = perms.rules || role?.rules || []

  // Admin/owner with manage-all → all menus checked
  if (hasManageAllRule(rules) || roleName === 'admin' || roleName === 'owner') {
    return getAllMenuKeyValues()
  }

  if (Array.isArray(perms.menuAccess) && perms.menuAccess.length > 0) {
    const normalized = normalizeMenuAccess(perms.menuAccess)
    if (normalized.length > 0) return normalized
  }

  return ROLE_MENU_MAP[roleName] || []
}

/** Legacy camelCase keys (pre-RBAC seeder) → PascalCase subjects */
const LEGACY_SUBJECT_MAP = {
  tenants: 'Tenant',
  users: 'User',
  roles: 'Role',
  members: 'Member',
  memberships: 'Membership',
  servicePlans: 'ServicePlan',
  activeServices: 'ActiveService',
  payments: 'Payment',
  checkIns: 'CheckIn',
  transactions: 'Transaction',
  expenses: 'Expense',
  products: 'POSProduct',
}

/** Build form permissions with every available resource checked */
export function buildAllResourcePermissions(availableResources) {
  const result = {}
  availableResources.forEach(r => {
    result[r.name] = [...r.actions]
  })
  return result
}

/** Resolve permissions form data from rules (or role defaults) */
export function resolvePermissionsFromRules(rules, availableResources, role = null) {
  const roleName = role?.name?.toLowerCase()
  const isFullAccess = hasManageAllRule(rules) || roleName === 'admin' || roleName === 'owner'

  if (isFullAccess && availableResources.length > 0) {
    return buildAllResourcePermissions(availableResources)
  }

  if (!Array.isArray(rules) || rules.length === 0) return {}

  const result = {}
  rules.forEach(rule => {
    if (rule.subject && rule.subject !== 'all') {
      const actions = rule.actions
        ? (Array.isArray(rule.actions) ? rule.actions : [rule.actions])
        : (rule.action ? [rule.action] : [])
      if (actions.length > 0) result[rule.subject] = actions.filter(a => a !== 'manage')
    }
  })
  return result
}

/** Map legacy flat permissions object to PascalCase subjects */
export function mapLegacyPermissions(legacyPerms, availableResources) {
  const result = {}
  const validNames = new Set(availableResources.map(r => r.name))

  Object.entries(legacyPerms).forEach(([key, actions]) => {
    if (!Array.isArray(actions) || actions.length === 0) return
    const mapped = LEGACY_SUBJECT_MAP[key] || (key.charAt(0).toUpperCase() + key.slice(1))
    if (validNames.has(mapped)) {
      result[mapped] = actions
    }
  })
  return result
}
