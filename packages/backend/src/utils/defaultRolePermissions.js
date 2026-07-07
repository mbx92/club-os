const { getMenuAccessForRole } = require('./menuKeys');

const ALL = ['read', 'create', 'update', 'delete'];
const READ_ONLY = ['read'];
const READ_CREATE_UPDATE = ['read', 'create', 'update'];
// RBAC-02: 'cancel' (void transaction) is intentionally separate from the
// generic CRUD actions above — only roles that should be able to void a
// transaction/order get it explicitly, instead of it riding along with a
// broad 'update' grant meant for things like editing order status/notes.
const ALL_WITH_CANCEL = [...ALL, 'cancel'];

const DEFAULT_ROLE_PERMISSIONS = {
  admin: {
    resources: {
      '*': ['*'],
    },
    menuAccess: getMenuAccessForRole('admin'),
    uiFlags: {
      canManageUsers: true,
      canManageRoles: true,
      canViewLogs: true,
      canManageSettings: true,
      canManageTenant: true,
    },
  },

  owner: {
    resources: {
      '*': ['*'],
    },
    menuAccess: getMenuAccessForRole('owner'),
    uiFlags: {
      canManageUsers: true,
      canManageRoles: true,
      canViewLogs: true,
      canManageSettings: true,
      canManageTenant: true,
    },
  },

  manager: {
    resources: {
      Tenant: READ_ONLY,
      User: ['read', 'update'],
      Member: ALL,
      Payment: READ_CREATE_UPDATE,
      CheckIn: READ_CREATE_UPDATE,
      HikvisionDevice: READ_ONLY,
      StaffAttendance: READ_CREATE_UPDATE,
      EmployeeSchedule: READ_CREATE_UPDATE,
      RestaurantProduct: ALL,
      RestaurantCategory: ALL,
      RestaurantTable: ALL,
      RestaurantLocation: ALL,
      RestaurantStock: ALL,
      Transaction: ALL_WITH_CANCEL,
      ActiveService: ALL,
      PettyCash: ALL,
    },
    menuAccess: getMenuAccessForRole('manager'),
    uiFlags: {
      canManageUsers: false,
      canManageRoles: false,
      canViewLogs: false,
      canManageSettings: false,
      canManageTenant: false,
    },
  },

  cashier: {
    resources: {
      Tenant: READ_ONLY,
      RestaurantProduct: ALL,
      RestaurantCategory: ALL,
      RestaurantTable: ALL,
      RestaurantLocation: ALL,
      RestaurantStock: ALL,
      Transaction: ALL_WITH_CANCEL,
      Member: READ_CREATE_UPDATE,
      ServicePlan: READ_ONLY,
      Payment: READ_CREATE_UPDATE,
      CheckIn: READ_CREATE_UPDATE,
      ActiveService: ALL,
      Voucher: READ_CREATE_UPDATE,
      Dashboard: READ_ONLY,
      CashRegisterSession: ALL,
      PettyCash: ['read', 'update'],
      HikvisionDevice: READ_ONLY,
      StaffAttendance: READ_ONLY,
      EmployeeSchedule: READ_ONLY,
    },
    menuAccess: getMenuAccessForRole('cashier'),
    uiFlags: {
      canManageUsers: false,
      canManageRoles: false,
      canViewLogs: false,
      canManageSettings: false,
      canManageTenant: false,
    },
  },

  staff: {
    resources: {
      Tenant: READ_ONLY,
      RestaurantProduct: READ_ONLY,
      RestaurantCategory: READ_ONLY,
      RestaurantTable: ['read', 'update'],
      RestaurantLocation: READ_ONLY,
      RestaurantStock: READ_ONLY,
      Transaction: READ_CREATE_UPDATE,
    },
    menuAccess: getMenuAccessForRole('staff'),
    uiFlags: {
      canManageUsers: false,
      canManageRoles: false,
      canViewLogs: false,
      canManageSettings: false,
      canManageTenant: false,
    },
  },

  trainer: {
    resources: {
      Tenant: READ_ONLY,
      Member: READ_ONLY,
      CheckIn: ['read', 'create'],
      ActiveService: ['read', 'update'],
      TrainerCommission: READ_ONLY,
    },
    menuAccess: getMenuAccessForRole('trainer'),
    uiFlags: {
      canManageUsers: false,
      canManageRoles: false,
      canViewLogs: false,
      canManageSettings: false,
      canManageTenant: false,
    },
  },

  kitchen: {
    resources: {
      Tenant: READ_ONLY,
      RestaurantProduct: READ_ONLY,
      Transaction: ['read', 'update'],
    },
    menuAccess: getMenuAccessForRole('kitchen'),
    uiFlags: {
      canManageUsers: false,
      canManageRoles: false,
      canViewLogs: false,
      canManageSettings: false,
      canManageTenant: false,
    },
  },

  waiter: {
    resources: {
      Tenant: READ_ONLY,
      RestaurantProduct: READ_ONLY,
      RestaurantCategory: READ_ONLY,
      RestaurantTable: ['read', 'update'],
      Transaction: READ_CREATE_UPDATE,
    },
    menuAccess: getMenuAccessForRole('waiter'),
    uiFlags: {
      canManageUsers: false,
      canManageRoles: false,
      canViewLogs: false,
      canManageSettings: false,
      canManageTenant: false,
    },
  },

  user: {
    resources: {
      Tenant: READ_ONLY,
      User: ['read', 'update'],
      Member: ['read', 'update'],
    },
    menuAccess: getMenuAccessForRole('user'),
    uiFlags: {
      canManageUsers: false,
      canManageRoles: false,
      canViewLogs: false,
      canManageSettings: false,
      canManageTenant: false,
    },
  },
};

function getDefaultPermissionsForRole(roleName) {
  if (!roleName) return null;

  const aliases = { member: 'user' };
  const key = roleName.toLowerCase();

  return DEFAULT_ROLE_PERMISSIONS[roleName]
    || DEFAULT_ROLE_PERMISSIONS[key]
    || DEFAULT_ROLE_PERMISSIONS[aliases[key]]
    || null;
}

function getAvailableDefaultRoles() {
  return Object.keys(DEFAULT_ROLE_PERMISSIONS);
}

module.exports = {
  DEFAULT_ROLE_PERMISSIONS,
  getAvailableDefaultRoles,
  getDefaultPermissionsForRole,
};
