/**
 * Canonical menu keys — must stay in sync with frontend navigation/menuKeys.js
 * Used by defaultRolePermissions, permissionService, and migration scripts.
 */

const ADMIN_MENU_ACCESS = [
  'dashboard',
  'cash-register', 'cash-register.shift', 'cash-register.dashboard', 'cash-register.history', 'cash-register.daily-report', 'cash-register.daily-summary',
  'gym', 'gym.dashboard', 'gym.members', 'gym.instructors', 'gym.classes', 'gym.memberships', 'gym.pt', 'gym.active-services', 'gym.check-ins', 'gym.pos', 'gym.reports',
  'restaurant', 'restaurant.dashboard', 'restaurant.categories', 'restaurant.products', 'restaurant.locations', 'restaurant.tables', 'restaurant.floor-plan', 'restaurant.pos', 'restaurant.orders', 'restaurant.stock', 'restaurant.reports',
  'vouchers',
  'back-office', 'back-office.attendance', 'back-office.attendance-report', 'back-office.devices', 'back-office.employee', 'back-office.schedule',
  'finances', 'finances.dashboard', 'finances.incomes', 'finances.income-categories', 'finances.expenses', 'finances.expense-categories', 'finances.cash-flow', 'finances.petty-cash', 'finances.analytics', 'finances.transactions', 'finances.shareholders', 'finances.reports',
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
  'finances', 'finances.expenses',
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

/**
 * Normalize stored menuAccess — remap legacy keys, drop unknown/stale entries.
 */
function normalizeMenuAccess(keys) {
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

  return expandParentMenuKeys([...result]);
}

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

module.exports = {
  ADMIN_MENU_ACCESS,
  ROLE_MENU_MAP,
  normalizeMenuAccess,
  getMenuAccessForRole,
  hasManageAllRule,
  VALID_MENU_KEYS,
};
