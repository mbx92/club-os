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
  'gym', 'gym.dashboard', 'gym.members', 'gym.instructors', 'gym.classes', 'gym.memberships', 'gym.pt', 'gym.active-services', 'gym.check-ins', 'gym.pos', 'gym.reports',
  'restaurant', 'restaurant.dashboard', 'restaurant.categories', 'restaurant.products', 'restaurant.locations', 'restaurant.tables', 'restaurant.floor-plan', 'restaurant.pos', 'restaurant.orders', 'restaurant.stock', 'restaurant.reports',
  'vouchers',
  'back-office', 'back-office.attendance', 'back-office.attendance-report', 'back-office.devices', 'back-office.employee', 'back-office.schedule',
  'finances', 'finances.dashboard', 'finances.incomes', 'finances.income-categories', 'finances.expenses', 'finances.expense-categories', 'finances.cash-flow', 'finances.petty-cash', 'finances.vault', 'finances.analytics', 'finances.transactions', 'finances.shareholders', 'finances.reports',
  'reports', 'reports.revenue', 'reports.attendance', 'reports.member-stats', 'reports.member-reports', 'reports.service-reports', 'reports.product-reports', 'reports.staff-reports', 'reports.forecasting',
  'settings',
];

const MANAGER_MENU_ACCESS = [
  'dashboard',
  'cash-register', 'cash-register.shift', 'cash-register.dashboard', 'cash-register.history', 'cash-register.daily-report', 'cash-register.daily-summary',
  'gym', 'gym.dashboard', 'gym.members', 'gym.instructors', 'gym.classes', 'gym.memberships', 'gym.pt', 'gym.active-services', 'gym.check-ins', 'gym.pos', 'gym.reports',
  'restaurant', 'restaurant.dashboard', 'restaurant.categories', 'restaurant.products', 'restaurant.locations', 'restaurant.tables', 'restaurant.floor-plan', 'restaurant.pos', 'restaurant.orders', 'restaurant.stock', 'restaurant.reports',
  'vouchers',
  'back-office', 'back-office.attendance', 'back-office.attendance-report', 'back-office.devices', 'back-office.employee', 'back-office.schedule',
  'finances', 'finances.dashboard', 'finances.incomes', 'finances.income-categories', 'finances.expenses', 'finances.expense-categories', 'finances.cash-flow', 'finances.petty-cash', 'finances.vault', 'finances.analytics', 'finances.transactions', 'finances.shareholders', 'finances.reports',
  'reports', 'reports.revenue', 'reports.attendance', 'reports.member-stats', 'reports.member-reports', 'reports.service-reports', 'reports.product-reports', 'reports.staff-reports', 'reports.forecasting',
  'settings',
];

const CASHIER_MENU_ACCESS = [
  'dashboard',
  'cash-register', 'cash-register.shift', 'cash-register.dashboard', 'cash-register.history', 'cash-register.daily-report', 'cash-register.daily-summary',
  'gym', 'gym.dashboard', 'gym.members', 'gym.instructors', 'gym.classes', 'gym.memberships', 'gym.pt', 'gym.active-services', 'gym.check-ins', 'gym.pos',
  'restaurant', 'restaurant.dashboard', 'restaurant.products', 'restaurant.tables', 'restaurant.floor-plan', 'restaurant.pos', 'restaurant.orders',
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
  Transaction: ['gym.pos', 'finances.transactions', 'restaurant.pos', 'restaurant.orders', 'restaurant.dashboard', 'restaurant.reports'],
  GymReport: ['gym.reports', 'reports.service-reports', 'reports.product-reports', 'reports.staff-reports', 'reports.forecasting'],
  TrainerCommission: ['gym.instructors', 'gym.reports'],
  RestaurantCategory: ['restaurant.categories'],
  RestaurantProduct: ['restaurant.products'],
  RestaurantLocation: ['restaurant.locations'],
  RestaurantTable: ['restaurant.tables', 'restaurant.floor-plan'],
  RestaurantStock: ['restaurant.stock'],
  StaffAttendance: ['back-office.attendance', 'back-office.attendance-report'],
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
};

const VALID_MENU_KEYS = new Set(ADMIN_MENU_ACCESS);

/** When a parent key is present, include all its children from the canonical list */
function expandParentMenuKeys(keys) {
  const result = new Set(keys);
  for (const key of keys) {
    if (!key.includes('.')) {
      for (const valid of VALID_MENU_KEYS) {
        if (valid.startsWith(key + '.')) result.add(valid);
      }
    }
  }
  return [...result];
}

/**
 * Normalize stored menuAccess — remap legacy keys, drop unknown/stale entries.
 * @param {string[]} keys
 * @param {string} [roleName] - optional role name to restrict parent-key expansion
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

  // Expand parent-only keys to their children, but restrict to the role template
  // when available so cashier doesn't get admin-level children from parents like `gym`.
  return expandParentKeysInRoleContext([...result], roleName);
}

/**
 * Expand parent keys (e.g. 'gym') to their children, optionally restricted
 * by the role template from ROLE_MENU_MAP.
 */
function expandParentKeysInRoleContext(keys, roleName) {
  const result = new Set(keys);
  const roleTemplate = roleName ? (ROLE_MENU_MAP[roleName] || ROLE_MENU_MAP[roleName.toLowerCase()] || null) : null;
  const allowedChildren = roleTemplate ? new Set(roleTemplate) : VALID_MENU_KEYS;

  for (const key of keys) {
    if (!key.includes('.')) {
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

function hasManageAllRule(rules) {
  if (!Array.isArray(rules)) return false;
  return rules.some(r => {
    const actions = r.actions
      ? (Array.isArray(r.actions) ? r.actions : [r.actions])
      : (r.action ? [r.action] : []);
    return r.subject === 'all' && actions.includes('manage');
  });
}

function deriveMenuAccessFromRules(rules) {
  if (!Array.isArray(rules)) return [];

  const result = new Set();
  for (const rule of rules) {
    const subject = rule?.subject;
    if (!subject || subject === 'all') continue;

    const menuKeys = SUBJECT_MENU_MAP[subject] || [];
    for (const key of menuKeys) {
      result.add(key);
    }
  }

  return normalizeMenuAccess([...result]);
}

module.exports = {
  ADMIN_MENU_ACCESS,
  ROLE_MENU_MAP,
  normalizeMenuAccess,
  getMenuAccessForRole,
  hasManageAllRule,
  deriveMenuAccessFromRules,
  VALID_MENU_KEYS,
};
