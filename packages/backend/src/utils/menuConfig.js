/**
 * Menu Configuration
 *
 * Definisi struktur menu yang dikirimkan ke frontend.
 * Backend akan filter setiap item berdasarkan:
 *   1. requiredModule  — apakah modul aktif di subscription plan tenant
 *   2. requiredPermission — apakah user punya RBAC permission untuk resource tsb
 *   3. requiredFlag       — apakah flag uiFlags aktif di role permissions
 *   4. superAdminOnly  — hanya tampil untuk superadmin
 *
 * Frontend menerima array menu yang sudah di-filter dan tinggal di-render.
 * Tidak ada logika "hide/show" yang perlu di-hardcode di frontend.
 *
 * @module utils/menuConfig
 */

const MENU_CONFIG = [

  // ─── DASHBOARD ────────────────────────────────────────────────────────────
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    path: '/dashboard',
    requiredModule: null,          // always visible if user is logged in
    requiredPermission: null,
  },

  // ─── GYM ──────────────────────────────────────────────────────────────────
  {
    key: 'gym',
    label: 'Gym Management',
    icon: 'Dumbbell',
    path: null,
    requiredModule: 'gym',
    requiredPermission: { action: 'read', subject: 'Member' },
    children: [
      {
        key: 'gym.members',
        label: 'Members',
        icon: 'Users',
        path: '/gym/members',
        requiredModule: 'gym',
        requiredPermission: { action: 'read', subject: 'Member' },
      },
      {
        key: 'gym.check-ins',
        label: 'Check-ins',
        icon: 'CheckSquare',
        path: '/gym/check-ins',
        requiredModule: 'gym',
        requiredPermission: { action: 'read', subject: 'CheckIn' },
      },
      {
        key: 'gym.service-plans',
        label: 'Service Plans',
        icon: 'Tag',
        path: '/gym/service-plans',
        requiredModule: 'serviceManagement',
        requiredPermission: { action: 'read', subject: 'ServicePlan' },
      },
      {
        key: 'gym.active-services',
        label: 'Active Services',
        icon: 'Activity',
        path: '/gym/active-services',
        requiredModule: 'serviceManagement',
        requiredPermission: { action: 'read', subject: 'ActiveService' },
      },
      {
        key: 'gym.trainers',
        label: 'Trainers',
        icon: 'PersonStanding',
        path: '/gym/trainers',
        requiredModule: 'gym',
        requiredPermission: { action: 'read', subject: 'Trainer' },
      },
    ],
  },

  // ─── POS ──────────────────────────────────────────────────────────────────
  {
    key: 'pos',
    label: 'Point of Sale',
    icon: 'ShoppingCart',
    path: null,
    requiredModule: 'pos',
    requiredPermission: { action: 'read', subject: 'RestaurantProduct' },
    children: [
      {
        key: 'pos.products',
        label: 'Products',
        icon: 'Package',
        path: '/pos/products',
        requiredModule: 'pos',
        requiredPermission: { action: 'read', subject: 'Product' },
      },
      {
        key: 'pos.transactions',
        label: 'Transactions',
        icon: 'Receipt',
        path: '/pos/transactions',
        requiredModule: 'pos',
        requiredPermission: { action: 'read', subject: 'Transaction' },
      },
    ],
  },

  // ─── RESTAURANT ───────────────────────────────────────────────────────────
  {
    key: 'restaurant',
    label: 'Restaurant',
    icon: 'UtensilsCrossed',
    path: null,
    requiredModule: 'restaurant',
    requiredPermission: { action: 'read', subject: 'Transaction' },
    children: [
      {
        key: 'restaurant.floor-plan-pos',
        label: 'Kasir POS',
        icon: 'CashRegister',
        path: '/restaurant/pos/floor-plan-pos',
        requiredModule: 'restaurant',
        requiredPermission: { action: 'create', subject: 'Transaction' },
      },
      {
        key: 'restaurant.orders',
        label: 'Orders',
        icon: 'ClipboardList',
        path: '/restaurant/orders',
        requiredModule: 'restaurant',
        requiredPermission: { action: 'read', subject: 'Transaction' },
      },
      {
        key: 'restaurant.tables',
        label: 'Tables',
        icon: 'LayoutGrid',
        path: '/restaurant/tables',
        requiredModule: 'restaurant',
        requiredPermission: { action: 'read', subject: 'RestaurantTable' },
      },
      {
        key: 'restaurant.products',
        label: 'Menu / Products',
        icon: 'BookOpen',
        path: '/restaurant/products',
        requiredModule: 'restaurant',
        requiredPermission: { action: 'read', subject: 'RestaurantProduct' },
      },
      {
        key: 'restaurant.stock',
        label: 'Stock',
        icon: 'Boxes',
        path: '/restaurant/stock',
        requiredModule: 'restaurant',
        requiredPermission: { action: 'read', subject: 'RestaurantStock' },
      },
    ],
  },

  // ─── CLASSES ──────────────────────────────────────────────────────────────
  {
    key: 'classes',
    label: 'Classes',
    icon: 'CalendarDays',
    path: '/classes',
    requiredModule: 'classes',
    requiredPermission: { action: 'read', subject: 'ActiveService' },
  },

  // ─── FINANCE ──────────────────────────────────────────────────────────────
  {
    key: 'finance',
    label: 'Finance',
    icon: 'Wallet',
    path: null,
    requiredModule: 'finance',
    requiredPermission: { action: 'read', subject: 'Payment' },
    children: [
      {
        key: 'finance.expenses',
        label: 'Expenses',
        icon: 'TrendingDown',
        path: '/finance/expenses',
        requiredModule: 'finance',
        requiredPermission: { action: 'read', subject: 'Payment' },
      },
      {
        key: 'finance.incomes',
        label: 'Incomes',
        icon: 'TrendingUp',
        path: '/finance/incomes',
        requiredModule: 'finance',
        requiredPermission: { action: 'read', subject: 'Payment' },
      },
      {
        key: 'finance.cash-flow',
        label: 'Cash Flow',
        icon: 'ArrowLeftRight',
        path: '/finance/cash-flow',
        requiredModule: 'finance',
        requiredPermission: { action: 'read', subject: 'Payment' },
      },
      {
        key: 'finance.vouchers',
        label: 'Vouchers',
        icon: 'Ticket',
        path: '/finance/vouchers',
        requiredModule: 'finance',
        requiredPermission: { action: 'read', subject: 'Voucher' },
      },
    ],
  },

  // ─── REPORTS ──────────────────────────────────────────────────────────────
  {
    key: 'reports',
    label: 'Reports',
    icon: 'BarChart2',
    path: '/reports',
    requiredModule: 'reports',
    requiredPermission: { action: 'read', subject: 'Member' },
  },
  {
    key: 'advancedReports',
    label: 'Advanced Analytics',
    icon: 'LineChart',
    path: '/reports/advanced',
    requiredModule: 'advancedReports',
    requiredPermission: { action: 'read', subject: 'Member' },
  },

  // ─── USER MANAGEMENT (back-office) ────────────────────────────────────────
  {
    key: 'users',
    label: 'User Management',
    icon: 'UserCog',
    path: '/users',
    requiredModule: null,
    requiredPermission: { action: 'read', subject: 'User' },
    requiredFlag: 'canManageUsers',
  },
  {
    key: 'roles',
    label: 'Roles & Permissions',
    icon: 'ShieldCheck',
    path: '/roles',
    requiredModule: null,
    requiredPermission: { action: 'read', subject: 'Role' },
    requiredFlag: 'canManageRoles',
  },

  // ─── SETTINGS ─────────────────────────────────────────────────────────────
  {
    key: 'settings',
    label: 'Settings',
    icon: 'Settings',
    path: '/settings',
    requiredModule: null,
    requiredPermission: { action: 'update', subject: 'Tenant' },
    requiredFlag: 'canManageSettings',
  },

  // ─── LOGS ─────────────────────────────────────────────────────────────────
  {
    key: 'logs',
    label: 'Audit Logs',
    icon: 'ScrollText',
    path: '/logs',
    requiredModule: null,
    requiredPermission: { action: 'read', subject: 'Log' },
    requiredFlag: 'canViewLogs',
  },

  // ─── SUPER ADMIN ──────────────────────────────────────────────────────────
  {
    key: 'tenants',
    label: 'Tenants',
    icon: 'Building2',
    path: '/tenants',
    requiredModule: null,
    requiredPermission: null,
    superAdminOnly: true,
  },
  {
    key: 'billing',
    label: 'Billing & Plans',
    icon: 'CreditCard',
    path: '/billing',
    requiredModule: null,
    requiredPermission: null,
    superAdminOnly: true,
  },
  {
    key: 'system',
    label: 'System',
    icon: 'ServerCog',
    path: '/system',
    requiredModule: null,
    requiredPermission: null,
    superAdminOnly: true,
  },
];

module.exports = { MENU_CONFIG };
