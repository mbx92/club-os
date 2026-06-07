// Role-based menu access configuration (FE-only)
// SuperAdmin bypasses all checks — tidak perlu di-list
// Jika backend sudah set menuAccess via our UI, itu akan di-prioritaskan

/**
 * Default menu access per role
 * Key = role name (lowercase)
 * Value = array of menuKey yang boleh diakses (parent + child keys)
 *
 * Parent keys   : 'gym', 'restaurant', etc.
 * Child keys    : 'gym.members', 'restaurant.pos', etc.
 *
 * Jika parent key ada → seluruh parent group tampil.
 * Jika child key ada  → child tersebut tampil di dalam parent.
 * Parent harus ada supaya child bisa tampil.
 */
export const ROLE_MENU_MAP = {
  admin: [
    'dashboard',
    'cash-register', 'cash-register.shift', 'cash-register.dashboard', 'cash-register.history', 'cash-register.daily-report', 'cash-register.daily-summary',
    'gym', 'gym.dashboard', 'gym.members', 'gym.instructors', 'gym.classes', 'gym.memberships', 'gym.pt', 'gym.active-services', 'gym.check-ins', 'gym.pos', 'gym.reports',
    'restaurant', 'restaurant.dashboard', 'restaurant.categories', 'restaurant.products', 'restaurant.locations', 'restaurant.tables', 'restaurant.floor-plan', 'restaurant.pos', 'restaurant.orders', 'restaurant.stock', 'restaurant.reports',
    'vouchers',
    'back-office', 'back-office.attendance', 'back-office.attendance-report', 'back-office.devices', 'back-office.employee', 'back-office.schedule',
    'finances', 'finances.dashboard', 'finances.incomes', 'finances.income-categories', 'finances.expenses', 'finances.expense-categories', 'finances.cash-flow', 'finances.petty-cash', 'finances.analytics', 'finances.transactions', 'finances.shareholders', 'finances.reports',
    'reports', 'reports.revenue', 'reports.attendance', 'reports.member-stats', 'reports.member-reports', 'reports.service-reports', 'reports.product-reports', 'reports.staff-reports', 'reports.forecasting',
    'settings',
  ],
  manager: [
    'dashboard',
    'cash-register', 'cash-register.shift', 'cash-register.dashboard', 'cash-register.history', 'cash-register.daily-report', 'cash-register.daily-summary',
    'gym', 'gym.dashboard', 'gym.members', 'gym.instructors', 'gym.classes', 'gym.memberships', 'gym.pt', 'gym.active-services', 'gym.check-ins', 'gym.pos', 'gym.reports',
    'restaurant', 'restaurant.dashboard', 'restaurant.categories', 'restaurant.products', 'restaurant.locations', 'restaurant.tables', 'restaurant.floor-plan', 'restaurant.pos', 'restaurant.orders', 'restaurant.stock', 'restaurant.reports',
    'vouchers',
    'back-office', 'back-office.attendance', 'back-office.attendance-report', 'back-office.devices', 'back-office.employee', 'back-office.schedule',
    'finances', 'finances.dashboard', 'finances.incomes', 'finances.income-categories', 'finances.expenses', 'finances.expense-categories', 'finances.cash-flow', 'finances.petty-cash', 'finances.vault', 'finances.analytics', 'finances.transactions', 'finances.shareholders', 'finances.reports',
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
    'gym', 'gym.dashboard', 'gym.members','gym.instructors', 'gym.classes', 'gym.memberships', 'gym.pt', 'gym.active-services', 'gym.check-ins', 'gym.pos',
    'restaurant', 'restaurant.dashboard', 'restaurant.products', 'restaurant.tables', 'restaurant.floor-plan', 'restaurant.pos', 'restaurant.orders',
    'vouchers',
    'back-office', 'back-office.attendance', 'back-office.devices', 'back-office.employee', 'back-office.schedule',
    'finances', 'finances.expenses',
  ],
  member: [
    'dashboard',
  ],
}

/**
 * Daftar semua menu keys yang tersedia (hierarki untuk UI editor)
 * Parent items + nested children
 */
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
      { key: 'restaurant.pos', label: 'Kasir POS' },
      { key: 'restaurant.orders', label: 'Orders' },
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
      { key: 'finances.vault', label: 'Vault / Brankas' },
      { key: 'finances.analytics', label: 'Analytics' },
      { key: 'finances.transactions', label: 'Transactions' },
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
  },
  {
    key: 'settings', label: 'Settings', icon: 'settings',
  },
]

// Build flat set of all valid keys (parent + child) for validation
const VALID_MENU_KEYS = new Set()
ALL_MENU_KEYS.forEach(item => {
  VALID_MENU_KEYS.add(item.key)
  if (item.children) {
    item.children.forEach(child => VALID_MENU_KEYS.add(child.key))
  }
})

/**
 * Get allowed menu keys for a given role
 * @param {string} role - User role (case-insensitive)
 * @param {Array|null} backendMenuAccess - menuAccess from backend (overrides default)
 * @returns {Array<string>} - Array of allowed menuKey strings
 */
export function getAllowedMenuKeys(role, backendMenuAccess = null) {
  // Priority 1: Backend override (only if set via our UI — validate format)
  if (Array.isArray(backendMenuAccess) && backendMenuAccess.length > 0) {
    // Only use backend data if ALL keys match our menuKey format
    const allKeysValid = backendMenuAccess.every(k => VALID_MENU_KEYS.has(k))
    if (allKeysValid) {
      return backendMenuAccess
    }
    // If any key doesn't match our format, it's old backend data — ignore
  }

  // Priority 2: Default FE config
  const normalizedRole = (role || '').toLowerCase()
  return ROLE_MENU_MAP[normalizedRole] || []
}
