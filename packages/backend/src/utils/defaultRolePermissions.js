/**
 * Default Role Permissions
 * 
 * Sumber default CASL rules per role.
 * Rules ini digunakan sebagai:
 * 1. Fallback jika Role.permissions di DB kosong
 * 2. Template awal saat seeder mengisi DB
 * 3. Referensi untuk admin UI saat konfigurasi role
 * 
 * Format conditions:
 *   "$tenantId" → akan di-resolve ke user.tenantId saat runtime
 *   "$userId"   → akan di-resolve ke user.id saat runtime
 * 
 * @module utils/defaultRolePermissions
 */

const DEFAULT_ROLE_PERMISSIONS = {

  // ─── ADMIN ────────────────────────────────────────────────────────────────
  admin: {
    caslRules: [
      { action: 'manage', subject: 'all',               conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'Tenant',            conditions: { id: '$tenantId' } },
      { action: 'update', subject: 'Tenant',            conditions: { id: '$tenantId' } },
      { action: 'manage', subject: 'User' },
      { action: 'manage', subject: 'Role' },
      { action: 'manage', subject: 'Log',               conditions: { tenantId: '$tenantId' } },
      { action: 'manage', subject: 'HikvisionDevice',   conditions: { tenantId: '$tenantId' } },
      { action: 'manage', subject: 'StaffAttendance',   conditions: { tenantId: '$tenantId' } },
      { action: 'manage', subject: 'EmployeeSchedule',  conditions: { tenantId: '$tenantId' } },
      { action: 'create', subject: 'DatabaseBackup' },
      { action: 'read',   subject: 'DatabaseBackup' },
      { action: 'delete', subject: 'DatabaseBackup' },
    ],
    menuAccess: ['dashboard', 'gym', 'pos', 'restaurant', 'classes', 'finance', 'reports', 'advancedReports', 'users', 'roles', 'settings', 'logs'],
    uiFlags: {
      canManageUsers: true,
      canManageRoles: true,
      canViewLogs: true,
      canManageSettings: true,
      canManageTenant: true,
    }
  },

  // ─── OWNER ────────────────────────────────────────────────────────────────
  owner: {
    caslRules: [
      { action: 'manage', subject: 'all',               conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'Tenant',            conditions: { id: '$tenantId' } },
      { action: 'update', subject: 'Tenant',            conditions: { id: '$tenantId' } },
      { action: 'manage', subject: 'User' },
      { action: 'manage', subject: 'Role' },
      { action: 'manage', subject: 'Log',               conditions: { tenantId: '$tenantId' } },
      { action: 'manage', subject: 'HikvisionDevice',   conditions: { tenantId: '$tenantId' } },
      { action: 'manage', subject: 'StaffAttendance',   conditions: { tenantId: '$tenantId' } },
      { action: 'manage', subject: 'EmployeeSchedule',  conditions: { tenantId: '$tenantId' } },
    ],
    menuAccess: ['dashboard', 'gym', 'pos', 'restaurant', 'classes', 'finance', 'reports', 'advancedReports', 'users', 'roles', 'settings', 'logs'],
    uiFlags: {
      canManageUsers: true,
      canManageRoles: true,
      canViewLogs: true,
      canManageSettings: true,
      canManageTenant: true,
    }
  },

  // ─── MANAGER ──────────────────────────────────────────────────────────────
  manager: {
    caslRules: [
      { action: 'read',   subject: 'Tenant',           conditions: { id: '$tenantId' } },
      { action: 'read',   subject: 'User',             conditions: { tenantId: '$tenantId' } },
      { action: 'update', subject: 'User',             conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'Member',           conditions: { tenantId: '$tenantId' } },
      { action: 'create', subject: 'Member',           conditions: { tenantId: '$tenantId' } },
      { action: 'update', subject: 'Member',           conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'Payment',          conditions: { tenantId: '$tenantId' } },
      { action: 'create', subject: 'Payment',          conditions: { tenantId: '$tenantId' } },
      { action: 'update', subject: 'Payment',          conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'CheckIn',          conditions: { tenantId: '$tenantId' } },
      { action: 'create', subject: 'CheckIn',          conditions: { tenantId: '$tenantId' } },
      { action: 'update', subject: 'CheckIn',          conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'HikvisionDevice',  conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'StaffAttendance',  conditions: { tenantId: '$tenantId' } },
      { action: 'create', subject: 'StaffAttendance',  conditions: { tenantId: '$tenantId' } },
      { action: 'update', subject: 'StaffAttendance',  conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'EmployeeSchedule', conditions: { tenantId: '$tenantId' } },
      { action: 'create', subject: 'EmployeeSchedule', conditions: { tenantId: '$tenantId' } },
      { action: 'update', subject: 'EmployeeSchedule', conditions: { tenantId: '$tenantId' } },
      { action: 'manage', subject: 'Product',          conditions: { tenantId: '$tenantId' } },
      { action: 'manage', subject: 'ProductCategory',  conditions: { tenantId: '$tenantId' } },
      { action: 'manage', subject: 'RestaurantTable',  conditions: { tenantId: '$tenantId' } },
      { action: 'manage', subject: 'Location',         conditions: { tenantId: '$tenantId' } },
      { action: 'manage', subject: 'StockMovement',    conditions: { tenantId: '$tenantId' } },
      { action: 'manage', subject: 'Transaction',      conditions: { tenantId: '$tenantId' } },
      { action: 'manage', subject: 'ActiveService',     conditions: { tenantId: '$tenantId' } },
      { action: 'manage', subject: 'PettyCash',        conditions: { tenantId: '$tenantId' } },
    ],
    menuAccess: ['dashboard', 'gym', 'pos', 'restaurant', 'classes', 'finance', 'reports'],
    uiFlags: {
      canManageUsers: false,
      canManageRoles: false,
      canViewLogs: false,
      canManageSettings: false,
      canManageTenant: false,
    }
  },

  // ─── CASHIER ──────────────────────────────────────────────────────────────
  cashier: {
    caslRules: [
      { action: 'read',   subject: 'Tenant',            conditions: { id: '$tenantId' } },
      { action: 'manage', subject: 'Product',           conditions: { tenantId: '$tenantId' } },
      { action: 'manage', subject: 'ProductCategory',   conditions: { tenantId: '$tenantId' } },
      { action: 'manage', subject: 'RestaurantTable',   conditions: { tenantId: '$tenantId' } },
      { action: 'manage', subject: 'Location',          conditions: { tenantId: '$tenantId' } },
      { action: 'manage', subject: 'StockMovement',     conditions: { tenantId: '$tenantId' } },
      { action: 'manage', subject: 'Transaction',       conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'Member',            conditions: { tenantId: '$tenantId' } },
      { action: 'create', subject: 'Member',            conditions: { tenantId: '$tenantId' } },
      { action: 'update', subject: 'Member',            conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'ServicePlan',       conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'Payment',           conditions: { tenantId: '$tenantId' } },
      { action: 'create', subject: 'Payment',           conditions: { tenantId: '$tenantId' } },
      { action: 'update', subject: 'Payment',           conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'CheckIn',           conditions: { tenantId: '$tenantId' } },
      { action: 'create', subject: 'CheckIn',           conditions: { tenantId: '$tenantId' } },
      { action: 'update', subject: 'CheckIn',           conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'ActiveService',     conditions: { tenantId: '$tenantId' } },
      { action: 'create', subject: 'ActiveService',     conditions: { tenantId: '$tenantId' } },
      { action: 'update', subject: 'ActiveService',     conditions: { tenantId: '$tenantId' } },
      { action: 'delete', subject: 'ActiveService',     conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'Voucher',           conditions: { tenantId: '$tenantId' } },
      { action: 'create', subject: 'Voucher',           conditions: { tenantId: '$tenantId' } },
      { action: 'update', subject: 'Voucher',           conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'Dashboard',         conditions: { tenantId: '$tenantId' } },
      { action: 'manage', subject: 'CashRegisterSession', conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'PettyCash',          conditions: { tenantId: '$tenantId' } },
      { action: 'update', subject: 'PettyCash',          conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'HikvisionDevice',   conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'StaffAttendance',   conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'EmployeeSchedule',  conditions: { tenantId: '$tenantId' } },
    ],
    menuAccess: ['dashboard', 'gym', 'pos', 'restaurant'],
    uiFlags: {
      canManageUsers: false,
      canManageRoles: false,
      canViewLogs: false,
      canManageSettings: false,
      canManageTenant: false,
    }
  },

  // ─── STAFF ────────────────────────────────────────────────────────────────
  staff: {
    caslRules: [
      { action: 'read',   subject: 'Tenant',            conditions: { id: '$tenantId' } },
      { action: 'read',   subject: 'Product',           conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'ProductCategory',   conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'RestaurantTable',   conditions: { tenantId: '$tenantId' } },
      { action: 'update', subject: 'RestaurantTable',   conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'Location',          conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'StockMovement',     conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'Transaction',       conditions: { tenantId: '$tenantId' } },
      { action: 'create', subject: 'Transaction',       conditions: { tenantId: '$tenantId' } },
      { action: 'update', subject: 'Transaction',       conditions: { tenantId: '$tenantId' } },
    ],
    menuAccess: ['dashboard', 'restaurant'],
    uiFlags: {
      canManageUsers: false,
      canManageRoles: false,
      canViewLogs: false,
      canManageSettings: false,
      canManageTenant: false,
    }
  },

  // ─── TRAINER ──────────────────────────────────────────────────────────────
  trainer: {
    caslRules: [
      { action: 'read',   subject: 'Tenant',            conditions: { id: '$tenantId' } },
      { action: 'read',   subject: 'Member',            conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'CheckIn',           conditions: { tenantId: '$tenantId' } },
      { action: 'create', subject: 'CheckIn',           conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'ActiveService',     conditions: { tenantId: '$tenantId' } },
      { action: 'update', subject: 'ActiveService',     conditions: { tenantId: '$tenantId' } },
    ],
    menuAccess: ['dashboard', 'gym'],
    uiFlags: {
      canManageUsers: false,
      canManageRoles: false,
      canViewLogs: false,
      canManageSettings: false,
      canManageTenant: false,
    }
  },

  // ─── KITCHEN ──────────────────────────────────────────────────────────────
  kitchen: {
    caslRules: [
      { action: 'read',   subject: 'Tenant',            conditions: { id: '$tenantId' } },
      { action: 'read',   subject: 'Product',           conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'Transaction',       conditions: { tenantId: '$tenantId' } },
      { action: 'update', subject: 'Transaction',       conditions: { tenantId: '$tenantId' } },
    ],
    menuAccess: ['restaurant'],
    uiFlags: {
      canManageUsers: false,
      canManageRoles: false,
      canViewLogs: false,
      canManageSettings: false,
      canManageTenant: false,
    }
  },

  // ─── WAITER ───────────────────────────────────────────────────────────────
  waiter: {
    caslRules: [
      { action: 'read',   subject: 'Tenant',            conditions: { id: '$tenantId' } },
      { action: 'read',   subject: 'Product',           conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'ProductCategory',   conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'RestaurantTable',   conditions: { tenantId: '$tenantId' } },
      { action: 'update', subject: 'RestaurantTable',   conditions: { tenantId: '$tenantId' } },
      { action: 'read',   subject: 'Transaction',       conditions: { tenantId: '$tenantId' } },
      { action: 'create', subject: 'Transaction',       conditions: { tenantId: '$tenantId' } },
      { action: 'update', subject: 'Transaction',       conditions: { tenantId: '$tenantId' } },
    ],
    menuAccess: ['restaurant'],
    uiFlags: {
      canManageUsers: false,
      canManageRoles: false,
      canViewLogs: false,
      canManageSettings: false,
      canManageTenant: false,
    }
  },

  // ─── USER (self-service) ──────────────────────────────────────────────────
  user: {
    caslRules: [      { action: 'read',   subject: 'Tenant',            conditions: { id: '$tenantId' } },      { action: 'read',   subject: 'User',              conditions: { id: '$userId' } },
      { action: 'update', subject: 'User',              conditions: { id: '$userId' } },
      { action: 'read',   subject: 'Member',            conditions: { userId: '$userId' } },
      { action: 'update', subject: 'Member',            conditions: { userId: '$userId' } },
    ],
    menuAccess: ['profile'],
    uiFlags: {
      canManageUsers: false,
      canManageRoles: false,
      canViewLogs: false,
      canManageSettings: false,
      canManageTenant: false,
    }
  }
};

/**
 * Resolve placeholder conditions ke nilai aktual dari user object
 * "$tenantId" → user.tenantId
 * "$userId"   → user.id
 * 
 * @param {object} conditions
 * @param {object} user
 * @returns {object|undefined}
 */
function resolveConditions(conditions, user) {
  if (!conditions) return undefined;
  const resolved = {};
  for (const [key, val] of Object.entries(conditions)) {
    if (val === '$tenantId') resolved[key] = user.tenantId;
    else if (val === '$userId') resolved[key] = user.id;
    else resolved[key] = val;
  }
  return resolved;
}

/**
 * Ambil default permissions untuk role tertentu
 * @param {string} roleName
 * @returns {object|null}
 */
function getDefaultPermissionsForRole(roleName) {
  if (!roleName) return null;
  // Exact match first, then case-insensitive fallback
  // "Member" role maps to "user" defaults (gym member = end user)
  const ALIASES = { member: 'user' };
  const key = roleName.toLowerCase();
  return DEFAULT_ROLE_PERMISSIONS[roleName]
    || DEFAULT_ROLE_PERMISSIONS[key]
    || DEFAULT_ROLE_PERMISSIONS[ALIASES[key]]
    || null;
}

/**
 * Daftar semua nama role yang sudah memiliki default permissions
 * @returns {string[]}
 */
function getAvailableDefaultRoles() {
  return Object.keys(DEFAULT_ROLE_PERMISSIONS);
}

module.exports = {
  DEFAULT_ROLE_PERMISSIONS,
  resolveConditions,
  getDefaultPermissionsForRole,
  getAvailableDefaultRoles,
};
