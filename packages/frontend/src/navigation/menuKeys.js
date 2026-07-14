// Static menu data for role permission admin editor.
// ALL_MENU_KEYS = all valid menu keys with labels (UI picker)
// ROLE_MENU_MAP = default menu templates per role
//
// ⚠️  SYNC WARNING: Must stay in sync with backend utils/menuKeys.js (SOURCE OF TRUTH).
// When modifying ROLE_MENU_MAP or menu keys:
//   1. Update backend utils/menuKeys.js first
//   2. Then mirror changes here

export const ROLE_MENU_MAP = {
  admin: [
    'dashboard',
    'cash-register', 'cash-register.shift', 'cash-register.dashboard', 'cash-register.history', 'cash-register.daily-report', 'cash-register.daily-summary',
    'gym', 'gym.dashboard', 'gym.members', 'gym.instructors', 'gym.classes', 'gym.memberships', 'gym.pt', 'gym.active-services', 'gym.check-ins', 'gym.pos', 'gym.void-transactions', 'gym.reports',
    'restaurant', 'restaurant.dashboard', 'restaurant.categories', 'restaurant.products', 'restaurant.locations', 'restaurant.tables', 'restaurant.floor-plan', 'restaurant.pos', 'restaurant.floor-plan-pos', 'restaurant.orders', 'restaurant.void-transactions', 'restaurant.stock', 'restaurant.reports',
    'vouchers',
    'back-office', 'back-office.attendance', 'back-office.attendance-report', 'back-office.devices', 'back-office.employee', 'back-office.schedule',
    'finances', 'finances.dashboard', 'finances.incomes', 'finances.income-categories', 'finances.expenses', 'finances.expense-categories', 'finances.cash-flow', 'finances.accounts', 'finances.vault', 'finances.analytics', 'finances.transactions', 'finances.shareholders', 'finances.reports',
    'reports', 'reports.revenue', 'reports.attendance', 'reports.member-stats', 'reports.member-reports', 'reports.service-reports', 'reports.product-reports', 'reports.staff-reports', 'reports.forecasting',
    'subscription', 'subscription.plans', 'subscription.subscriptions', 'subscription.tenants', 'subscription.billing',
    'settings',
  ],
  manager: [
    'dashboard',
    'cash-register', 'cash-register.shift', 'cash-register.dashboard', 'cash-register.history', 'cash-register.daily-report', 'cash-register.daily-summary',
    'gym', 'gym.dashboard', 'gym.members', 'gym.instructors', 'gym.classes', 'gym.memberships', 'gym.pt', 'gym.active-services', 'gym.check-ins', 'gym.pos', 'gym.void-transactions', 'gym.reports',
    'restaurant', 'restaurant.dashboard', 'restaurant.categories', 'restaurant.products', 'restaurant.locations', 'restaurant.tables', 'restaurant.floor-plan', 'restaurant.pos', 'restaurant.floor-plan-pos', 'restaurant.orders', 'restaurant.void-transactions', 'restaurant.stock', 'restaurant.reports',
    'vouchers',
    'back-office', 'back-office.attendance', 'back-office.attendance-report', 'back-office.devices', 'back-office.employee', 'back-office.schedule',
    'finances', 'finances.dashboard', 'finances.incomes', 'finances.income-categories', 'finances.expenses', 'finances.expense-categories', 'finances.cash-flow', 'finances.accounts', 'finances.vault', 'finances.analytics', 'finances.transactions', 'finances.shareholders', 'finances.reports',
    'reports', 'reports.revenue', 'reports.attendance', 'reports.member-stats', 'reports.member-reports', 'reports.service-reports', 'reports.product-reports', 'reports.staff-reports', 'reports.forecasting',
    'settings',
  ],
  trainer: [
    'dashboard',
    'gym', 'gym.dashboard', 'gym.members', 'gym.classes', 'gym.check-ins',
  ],
  cashier: [
    'dashboard',
    'cash-register', 'cash-register.shift', 'cash-register.dashboard', 'cash-register.history', 'cash-register.daily-report', 'cash-register.daily-summary',
    'gym', 'gym.dashboard', 'gym.members', 'gym.instructors', 'gym.classes', 'gym.memberships', 'gym.pt', 'gym.active-services', 'gym.check-ins', 'gym.pos', 'gym.void-transactions',
    'restaurant', 'restaurant.dashboard', 'restaurant.products', 'restaurant.tables', 'restaurant.floor-plan', 'restaurant.pos', 'restaurant.floor-plan-pos', 'restaurant.orders', 'restaurant.void-transactions',
    'vouchers',
    'back-office', 'back-office.attendance', 'back-office.devices', 'back-office.employee', 'back-office.schedule',
    'finances', 'finances.expenses',
  ],
  staff: ['dashboard', 'restaurant'],
  kitchen: ['restaurant'],
  waiter: ['restaurant'],
  owner: [
    'dashboard',
    'cash-register', 'cash-register.shift', 'cash-register.dashboard', 'cash-register.history', 'cash-register.daily-report', 'cash-register.daily-summary',
    'gym', 'gym.dashboard', 'gym.members', 'gym.instructors', 'gym.classes', 'gym.memberships', 'gym.pt', 'gym.active-services', 'gym.check-ins', 'gym.pos', 'gym.void-transactions', 'gym.reports',
    'restaurant', 'restaurant.dashboard', 'restaurant.categories', 'restaurant.products', 'restaurant.locations', 'restaurant.tables', 'restaurant.floor-plan', 'restaurant.pos', 'restaurant.floor-plan-pos', 'restaurant.orders', 'restaurant.void-transactions', 'restaurant.stock', 'restaurant.reports',
    'vouchers',
    'back-office', 'back-office.attendance', 'back-office.attendance-report', 'back-office.devices', 'back-office.employee', 'back-office.schedule',
    'finances', 'finances.dashboard', 'finances.incomes', 'finances.income-categories', 'finances.expenses', 'finances.expense-categories', 'finances.cash-flow', 'finances.accounts', 'finances.vault', 'finances.analytics', 'finances.transactions', 'finances.shareholders', 'finances.reports',
    'reports', 'reports.revenue', 'reports.attendance', 'reports.member-stats', 'reports.member-reports', 'reports.service-reports', 'reports.product-reports', 'reports.staff-reports', 'reports.forecasting',
    'subscription', 'subscription.plans', 'subscription.subscriptions', 'subscription.tenants', 'subscription.billing',
    'settings',
  ],
  user: ['dashboard'],
  member: [
    'dashboard',
  ],
}

export const ALL_MENU_KEYS = [
  {
    key: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard',
  },
  {
    key: 'cash-register', label: 'Cash Register', icon: 'report-money',
    children: [
      { key: 'cash-register.shift', label: 'Shift Kasir' },
      { key: 'cash-register.dashboard', label: 'Dashboard Kasir' },
      { key: 'cash-register.history', label: 'Riwayat Shift' },
      { key: 'cash-register.daily-report', label: 'Laporan Harian' },
      { key: 'cash-register.daily-summary', label: 'Rekap Penjualan' },
    ],
  },
  {
    key: 'gym', label: 'Gym', icon: 'barbell',
    children: [
      { key: 'gym.dashboard', label: 'Dashboard' },
      { key: 'gym.members', label: 'Members' },
      { key: 'gym.instructors', label: 'Instructors' },
      { key: 'gym.classes', label: 'Classes' },
      { key: 'gym.memberships', label: 'Memberships' },
      { key: 'gym.pt', label: 'Personal Training' },
      { key: 'gym.active-services', label: 'Active Services' },
      { key: 'gym.check-ins', label: 'Check-ins' },
      { key: 'gym.pos', label: 'Point of Sale' },
      { key: 'gym.void-transactions', label: 'Batal Transaksi' },
      { key: 'gym.reports', label: 'Reports' },
    ],
  },
  {
    key: 'restaurant', label: 'Restaurant', icon: 'tools-kitchen-2',
    children: [
      { key: 'restaurant.dashboard', label: 'Dashboard' },
      { key: 'restaurant.categories', label: 'Categories' },
      { key: 'restaurant.products', label: 'Products' },
      { key: 'restaurant.locations', label: 'Locations' },
      { key: 'restaurant.tables', label: 'Tables' },
      { key: 'restaurant.floor-plan', label: 'Floor Plan' },
      { key: 'restaurant.pos', label: 'POS (Legacy)' },
      { key: 'restaurant.floor-plan-pos', label: 'Kasir POS' },
      { key: 'restaurant.orders', label: 'Orders' },
      { key: 'restaurant.void-transactions', label: 'Batal Transaksi' },
      { key: 'restaurant.stock', label: 'Stock' },
      { key: 'restaurant.reports', label: 'Reports' },
    ],
  },
  {
    key: 'vouchers', label: 'Vouchers', icon: 'ticket',
  },
  {
    key: 'back-office', label: 'Back Office', icon: 'building-skyscraper',
    children: [
      { key: 'back-office.attendance', label: 'Staff Attendance' },
      { key: 'back-office.attendance-report', label: 'Attendance Report' },
      { key: 'back-office.devices', label: 'Devices' },
      { key: 'back-office.employee', label: 'Employee' },
      { key: 'back-office.schedule', label: 'Employee Schedule' },
    ],
  },
  {
    key: 'finances', label: 'Finances', icon: 'file-invoice',
    children: [
      { key: 'finances.dashboard', label: 'Dashboard' },
      { key: 'finances.incomes', label: 'Incomes' },
      { key: 'finances.income-categories', label: 'Income Categories' },
      { key: 'finances.expenses', label: 'Expenses' },
      { key: 'finances.expense-categories', label: 'Expense Categories' },
      { key: 'finances.cash-flow', label: 'Cash Flow' },
      { key: 'finances.accounts', label: 'Akun Keuangan' },
      { key: 'finances.vault', label: 'Drawer' },
      { key: 'finances.analytics', label: 'Analytics' },
      { key: 'finances.transactions', label: 'Transactions' },
      { key: 'finances.shareholders', label: 'Pemegang Saham' },
      { key: 'finances.reports', label: 'Reports' },
    ],
  },
  {
    key: 'reports', label: 'Reports', icon: 'chart-bar',
    children: [
      { key: 'reports.revenue', label: 'Revenue' },
      { key: 'reports.attendance', label: 'Attendance' },
      { key: 'reports.member-stats', label: 'Member Stats' },
      { key: 'reports.member-reports', label: 'Member Reports' },
      { key: 'reports.service-reports', label: 'Service Reports' },
      { key: 'reports.product-reports', label: 'Product Reports' },
      { key: 'reports.staff-reports', label: 'Staff Reports' },
      { key: 'reports.forecasting', label: 'Forecasting' },
    ],
  },
  {
    key: 'subscription', label: 'Subscription', icon: 'crown',
    children: [
      { key: 'subscription.plans', label: 'Plans' },
      { key: 'subscription.subscriptions', label: 'Subscriptions' },
      { key: 'subscription.tenants', label: 'Tenants' },
      { key: 'subscription.billing', label: 'Billing' },
    ],
  },
  {
    key: 'settings', label: 'Settings', icon: 'settings',
  },
]
