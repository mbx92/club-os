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
  'restaurant.pos': 'restaurant.floor-plan-pos',
  // Petty Cash module deprecated — remap to Accounts
  'finances.petty-cash': 'finances.accounts',
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

const SUBJECT_MENU_MAP = {
  Dashboard: ['dashboard'],
  CashRegisterSession: ['cash-register'],
  Member: ['gym.members'],
  Trainer: ['gym.instructors'],
  CheckIn: ['gym.check-ins'],
  Membership: ['gym.memberships'],
  MembershipPlan: ['gym.memberships'],
  PTSession: ['gym.pt'],
  ServicePlan: ['gym.catalog', 'gym.active-services'],
  ActiveService: ['gym.active-services'],
  Transaction: ['gym.pos', 'gym.void-transactions', 'finances.transactions', 'restaurant.pos', 'restaurant.floor-plan-pos', 'restaurant.orders', 'restaurant.void-transactions', 'restaurant.dashboard', 'restaurant.reports'],
  GymReport: ['gym.reports', 'reports.service-reports', 'reports.product-reports', 'reports.staff-reports', 'reports.forecasting'],
  TrainerCommission: ['gym.instructors', 'gym.reports'],
  RestaurantCategory: ['restaurant.categories'],
  RestaurantProduct: ['restaurant.products'],
  RestaurantLocation: ['restaurant.locations'],
  RestaurantTable: ['restaurant.tables', 'restaurant.floor-plan'],
  RestaurantStock: ['restaurant.stock'],
  StaffAttendance: ['back-office.attendance', 'back-office.attendance-report'],
  BackOffice: ['back-office'],
  EmployeeSchedule: ['back-office.schedule'],
  Shift: ['back-office.schedule'],
  HikvisionDevice: ['back-office.devices', 'back-office.employee'],
  FinanceDashboard: ['finances.dashboard'],
  Income: ['finances.incomes'],
  IncomeCategory: ['finances.incomes'],
  Expense: ['finances.expenses'],
  ExpenseCategory: ['finances.expenses'],
  Supplier: ['finances.expenses'],
  // PettyCash module deprecated — use Account instead
  PettyCash: ['finances.accounts'],
  Account: ['finances.accounts'],
  CashFlow: ['finances.cash-flow'],
  FinancialReport: ['finances.reports', 'finances.shareholders'],
  Voucher: ['vouchers'],
  Subscription: ['subscription'],
  SubscriptionPlan: ['subscription'],
  Invoice: ['subscription'],
  Payment: ['subscription'],
  Tenant: ['settings'],
  User: ['settings'],
  Role: ['settings'],
  Permission: ['settings'],
  Log: ['settings'],
  PrinterSettings: ['settings'],
  ReceiptTemplate: ['settings'],
  SystemSettings: ['settings'],
  Settings: ['settings'],
}

/**
 * Normalize stored menuAccess from DB — remap legacy keys, drop stale entries.
 * Does NOT expand parent keys — the admin UI handles parent-child toggle explicitly.
 * Stored menuAccess should contain explicit sub-keys from the admin's checkbox selections.
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

  // Legacy POS key maps to Kasir POS page — grant canonical key for sidebar visibility
  if (result.has('restaurant.pos')) {
    result.add('restaurant.floor-plan-pos')
  }

  return [...result]
}

export function deriveMenuAccessFromSubjects(subjects) {
  if (!Array.isArray(subjects)) return []

  const result = new Set()
  subjects.forEach(subject => {
    const menuKeys = SUBJECT_MENU_MAP[subject] || []
    menuKeys.forEach(key => result.add(key))
  })

  return normalizeMenuAccess([...result])
}

export function deriveMenuAccessFromPermissions(permissions) {
  if (!permissions || typeof permissions !== 'object') return []

  const subjects = Object.entries(permissions)
    .filter(([, actions]) => Array.isArray(actions) && actions.length > 0)
    .map(([subject]) => subject)

  return deriveMenuAccessFromSubjects(subjects)
}

export function hasFullAccess(resources) {
  if (!resources || typeof resources !== 'object') return false
  return Array.isArray(resources['*']) && resources['*'].includes('*')
}

/** Resolve menu access for edit modal — normalize DB data or use role defaults */
export function resolveMenuAccessForRole(role) {
  const roleName = role?.name?.toLowerCase()
  const perms = role?.permissions || {}
  const resources = perms.resources || {}

  if (hasFullAccess(resources) || roleName === 'admin' || roleName === 'owner') {
    return getAllMenuKeyValues()
  }

  // Use stored menuAccess from DB as the source of truth (set by admin UI)
  if (Array.isArray(perms.menuAccess) && perms.menuAccess.length > 0) {
    return normalizeMenuAccess(perms.menuAccess)
  }

  // Fallback to role template defaults
  if (ROLE_MENU_MAP[roleName] && ROLE_MENU_MAP[roleName].length > 0) {
    return normalizeMenuAccess([...ROLE_MENU_MAP[roleName]])
  }

  return deriveMenuAccessFromPermissions(resources)
}

/** Legacy camelCase keys (pre-RBAC seeder) → PascalCase subjects */
const LEGACY_SUBJECT_MAP = {
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
}

/** Build form permissions with every available resource checked */
export function buildAllResourcePermissions(availableResources) {
  const result = {}
  availableResources.forEach(r => {
    result[r.name] = [...r.actions]
  })
  return result
}

/** Extract resource->actions map from any stored role.permissions shape (resources, rules, legacy). */
export function extractStoredResourcesFromRolePermissions(permissions = {}) {
  const merged = {}

  if (permissions?.resources && typeof permissions.resources === 'object') {
    Object.entries(permissions.resources).forEach(([resource, actions]) => {
      if (resource === '*' || !Array.isArray(actions) || actions.length === 0) return
      merged[resource] = [...new Set(actions)]
    })
  }

  if (Array.isArray(permissions?.rules)) {
    permissions.rules.forEach((rule) => {
      if (!rule?.subject || rule.inverted) return
      const actions = Array.isArray(rule.actions)
        ? rule.actions
        : [rule.action].filter(Boolean)
      if (!actions.length) return
      merged[rule.subject] = [...new Set([...(merged[rule.subject] || []), ...actions])]
    })
  }

  const reserved = new Set(['resources', 'rules', 'menuAccess', 'uiFlags', 'rolePermissions'])
  Object.entries(permissions).forEach(([key, value]) => {
    if (reserved.has(key)) return
    if (!Array.isArray(value) || value.length === 0) return
    const mapped = LEGACY_SUBJECT_MAP[key] || (key.charAt(0).toUpperCase() + key.slice(1))
    merged[mapped] = [...new Set(value)]
  })

  return merged
}

/** Resolve permissions form data from a resources map (or role defaults) */
export function resolvePermissionsFromResources(resources, availableResources, role = null) {
  const roleName = role?.name?.toLowerCase()
  const isFullAccess = hasFullAccess(resources) || roleName === 'admin' || roleName === 'owner'

  if (isFullAccess && availableResources.length > 0) {
    return buildAllResourcePermissions(availableResources)
  }

  if (!resources || typeof resources !== 'object') return {}

  return Object.fromEntries(
    Object.entries(resources)
      .filter(([resource, actions]) => resource !== '*' && Array.isArray(actions) && actions.length > 0)
      .map(([resource, actions]) => [resource, [...new Set(actions)]])
  )
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
