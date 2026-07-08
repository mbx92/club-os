/**
 * Canonical menu keys — must stay in sync with frontend navigation/menuKeys.js
 * Used by defaultRolePermissions, permissionService, and migration scripts.
 *
 * ⚠️  SYNC WARNING: This file is the SOURCE OF TRUTH for menu keys.
 * The frontend navigation/menuKeys.js MUST mirror any changes made here.
 * When modifying ADMIN_MENU_ACCESS, ROLE_MENU_MAP, or SUBJECT_MENU_MAP:
 *   1. Update this file first
 *   2. Copy the changes to packages/frontend/src/navigation/menuKeys.js
 *   3. Copy the changes to packages/frontend/src/navigation/menuKeyUtils.js
 */

const ADMIN_MENU_ACCESS = [
  'dashboard',
  'cash-register', 'cash-register.shift', 'cash-register.dashboard', 'cash-register.history', 'cash-register.daily-report', 'cash-register.daily-summary',
  'gym', 'gym.dashboard', 'gym.members', 'gym.instructors', 'gym.classes', 'gym.memberships', 'gym.pt', 'gym.active-services', 'gym.check-ins', 'gym.pos', 'gym.void-transactions', 'gym.reports',
  'restaurant', 'restaurant.dashboard', 'restaurant.categories', 'restaurant.products', 'restaurant.locations', 'restaurant.tables', 'restaurant.floor-plan', 'restaurant.pos', 'restaurant.floor-plan-pos', 'restaurant.orders', 'restaurant.void-transactions', 'restaurant.stock', 'restaurant.reports',
  'vouchers',
  'back-office', 'back-office.attendance', 'back-office.attendance-report', 'back-office.devices', 'back-office.employee', 'back-office.schedule',
  'finances', 'finances.dashboard', 'finances.incomes', 'finances.income-categories', 'finances.expenses', 'finances.expense-categories', 'finances.cash-flow', 'finances.petty-cash', 'finances.vault', 'finances.analytics', 'finances.transactions', 'finances.shareholders', 'finances.reports',
  'reports', 'reports.revenue', 'reports.attendance', 'reports.member-stats', 'reports.member-reports', 'reports.service-reports', 'reports.product-reports', 'reports.staff-reports', 'reports.forecasting',
  'subscription', 'subscription.plans', 'subscription.subscriptions', 'subscription.tenants', 'subscription.billing',
  'settings',
];

const MANAGER_MENU_ACCESS = [
  'dashboard',
  'cash-register', 'cash-register.shift', 'cash-register.dashboard', 'cash-register.history', 'cash-register.daily-report', 'cash-register.daily-summary',
  'gym', 'gym.dashboard', 'gym.members', 'gym.instructors', 'gym.classes', 'gym.memberships', 'gym.pt', 'gym.active-services', 'gym.check-ins', 'gym.pos', 'gym.void-transactions', 'gym.reports',
  'restaurant', 'restaurant.dashboard', 'restaurant.categories', 'restaurant.products', 'restaurant.locations', 'restaurant.tables', 'restaurant.floor-plan', 'restaurant.pos', 'restaurant.floor-plan-pos', 'restaurant.orders', 'restaurant.void-transactions', 'restaurant.stock', 'restaurant.reports',
  'vouchers',
  'back-office', 'back-office.attendance', 'back-office.attendance-report', 'back-office.devices', 'back-office.employee', 'back-office.schedule',
  'finances', 'finances.dashboard', 'finances.incomes', 'finances.income-categories', 'finances.expenses', 'finances.expense-categories', 'finances.cash-flow', 'finances.petty-cash', 'finances.vault', 'finances.analytics', 'finances.transactions', 'finances.shareholders', 'finances.reports',
  'reports', 'reports.revenue', 'reports.attendance', 'reports.member-stats', 'reports.member-reports', 'reports.service-reports', 'reports.product-reports', 'reports.staff-reports', 'reports.forecasting',
  'settings',
];

const CASHIER_MENU_ACCESS = [
  'dashboard',
  'cash-register', 'cash-register.shift', 'cash-register.dashboard', 'cash-register.history', 'cash-register.daily-report', 'cash-register.daily-summary',
  'gym', 'gym.dashboard', 'gym.members', 'gym.instructors', 'gym.classes', 'gym.memberships', 'gym.pt', 'gym.active-services', 'gym.check-ins', 'gym.pos', 'gym.void-transactions',
  'restaurant', 'restaurant.dashboard', 'restaurant.products', 'restaurant.tables', 'restaurant.floor-plan', 'restaurant.pos', 'restaurant.floor-plan-pos', 'restaurant.orders', 'restaurant.void-transactions',
  'vouchers',
  'back-office', 'back-office.attendance', 'back-office.devices', 'back-office.employee', 'back-office.schedule',
  'finances', 'finances.expenses', 'finances.petty-cash',
];

const TRAINER_MENU_ACCESS = [
  'dashboard',
  'gym', 'gym.dashboard', 'gym.members', 'gym.classes', 'gym.check-ins',
];

const STAFF_MENU_ACCESS = ['dashboard', 'restaurant'];
const KITCHEN_MENU_ACCESS = ['restaurant'];
const WAITER_MENU_ACCESS = ['restaurant'];
const USER_MENU_ACCESS = ['dashboard'];

const ROLE_MENU_MAP = {
  admin: ADMIN_MENU_ACCESS,
  owner: ADMIN_MENU_ACCESS,
  manager: MANAGER_MENU_ACCESS,
  cashier: CASHIER_MENU_ACCESS,
  trainer: TRAINER_MENU_ACCESS,
  staff: STAFF_MENU_ACCESS,
  kitchen: KITCHEN_MENU_ACCESS,
  waiter: WAITER_MENU_ACCESS,
  user: USER_MENU_ACCESS,
  member: USER_MENU_ACCESS,
};

const SUBJECT_MENU_MAP = {
  Dashboard: ['dashboard'],
  CashRegisterSession: ['cash-register'],
  Member: ['gym.members'],
  Trainer: ['gym.instructors'],
  CheckIn: ['gym.check-ins'],
  Membership: ['gym.memberships'],
  MembershipPlan: ['gym.memberships'],
  PTSession: ['gym.pt'],
  ServicePlan: ['gym.active-services'],
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
  PettyCash: ['finances.petty-cash'],
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
  DatabaseBackup: ['settings'],
  Scheduler: ['settings'],
  SubscriptionFeature: ['subscription'],
};

/** Map legacy / stale keys → canonical navigation keys */
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
};

const VALID_MENU_KEYS = new Set(ADMIN_MENU_ACCESS);

/**
 * Normalize stored menuAccess — remap legacy keys, drop unknown/stale entries.
 * Stored menuAccess should preserve explicit child selections from the admin UI.
 * If a parent key exists without any explicit children, we still expand it as a
 * legacy compatibility fallback for older records that stored parent-only keys.
 *
 * @param {string[]} keys
 * @param {string} [roleName] - optional role name to restrict legacy parent-key expansion
 */
function normalizeMenuAccess(keys, roleName) {
  if (!Array.isArray(keys)) return [];

  const result = new Set();
  for (const key of keys) {
    if (!key || typeof key !== 'string') continue;
    if (key.startsWith('psychology')) continue;

    if (VALID_MENU_KEYS.has(key)) {
      result.add(key);
      continue;
    }

    const topLevel = key.includes('.') ? key.split('.')[0] : key;
    const mapped = LEGACY_MENU_KEY_MAP[key] ?? LEGACY_MENU_KEY_MAP[topLevel];
    if (mapped === null) continue;
    if (mapped && VALID_MENU_KEYS.has(mapped)) {
      result.add(mapped);
    }
  }

  // Legacy POS key maps to Kasir POS page — grant canonical key for sidebar visibility
  if (result.has('restaurant.pos')) {
    result.add('restaurant.floor-plan-pos');
  }

  return expandLegacyParentOnlyKeys([...result], roleName);
}

/**
 * Expand parent keys only when no explicit child for that parent is present.
 * This preserves partial selections like:
 *   ['back-office', 'back-office.attendance', 'back-office.schedule']
 * and avoids re-adding unchecked children such as `back-office.devices`.
 */
function expandLegacyParentOnlyKeys(keys, roleName) {
  const result = new Set(keys);
  const roleTemplate = roleName ? (ROLE_MENU_MAP[roleName] || ROLE_MENU_MAP[roleName.toLowerCase()] || null) : null;
  const allowedChildren = roleTemplate ? new Set(roleTemplate) : VALID_MENU_KEYS;

  for (const key of keys) {
    if (!key.includes('.')) {
      const hasExplicitChild = keys.some(candidate => candidate.startsWith(key + '.'));
      if (hasExplicitChild) continue;

      for (const valid of VALID_MENU_KEYS) {
        if (valid.startsWith(key + '.') && allowedChildren.has(valid)) {
          result.add(valid);
        }
      }
    }
  }
  return [...result];
}

function getMenuAccessForRole(roleName) {
  if (!roleName) return [];
  const key = roleName.toLowerCase();
  return ROLE_MENU_MAP[roleName] || ROLE_MENU_MAP[key] || [];
}

function hasFullAccess(resources) {
  if (!resources || typeof resources !== 'object') return false;
  return Array.isArray(resources['*']) && resources['*'].includes('*');
}

function deriveMenuAccessFromResources(resources, roleName) {
  if (!resources || typeof resources !== 'object') return [];
  if (hasFullAccess(resources)) {
    return roleName ? getMenuAccessForRole(roleName) : [...VALID_MENU_KEYS];
  }

  const result = new Set();
  for (const subject of Object.keys(resources)) {
    if (!subject || subject === 'all' || subject === '*') continue;

    const menuKeys = SUBJECT_MENU_MAP[subject] || [];
    for (const key of menuKeys) {
      result.add(key);
    }
  }

  return normalizeMenuAccess([...result], roleName);
}

/**
 * Minimum API permissions implied by checked menu keys.
 * Prevents 403 when menu access is granted but the matching resource
 * checkbox was never saved (common after new subjects are added to the catalog).
 */
const MENU_KEY_MIN_ACTIONS = {
  'gym.pos': { Transaction: ['read', 'create', 'update'] },
  'restaurant.floor-plan-pos': { Transaction: ['read', 'create', 'update'] },
  'restaurant.pos': { Transaction: ['read', 'create', 'update'] },
  'restaurant.orders': { Transaction: ['read', 'create', 'update'] },
  'restaurant.floor-plan': { RestaurantTable: ['read', 'update'] },
  'restaurant.void-transactions': { Transaction: ['read', 'cancel'] },
  'gym.void-transactions': { Transaction: ['read', 'cancel'] },
};

function deriveMinimumResourcesFromMenuAccess(menuAccess = []) {
  if (!Array.isArray(menuAccess) || menuAccess.length === 0) return {};

  const keys = new Set(menuAccess);
  const resources = {};

  for (const [subject, menuKeys] of Object.entries(SUBJECT_MENU_MAP)) {
    if (menuKeys.some(key => keys.has(key))) {
      resources[subject] = ['read'];
    }
  }

  for (const [menuKey, grants] of Object.entries(MENU_KEY_MIN_ACTIONS)) {
    if (!keys.has(menuKey)) continue;
    for (const [subject, actions] of Object.entries(grants)) {
      resources[subject] = [...new Set([...(resources[subject] || []), ...actions])];
    }
  }

  return resources;
}

module.exports = {
  ADMIN_MENU_ACCESS,
  ROLE_MENU_MAP,
  SUBJECT_MENU_MAP,
  deriveMenuAccessFromResources,
  deriveMinimumResourcesFromMenuAccess,
  hasFullAccess,
  normalizeMenuAccess,
  getMenuAccessForRole,
  VALID_MENU_KEYS,
};
