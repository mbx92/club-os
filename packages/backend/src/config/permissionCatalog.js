const PERMISSION_CATALOG = [
  { subject: 'Dashboard', label: 'Dashboard', module: 'dashboard', actions: ['read'] },

  { subject: 'CashRegisterSession', label: 'Cash Register Session', module: 'cash-register', actions: ['create', 'read', 'update'] },

  { subject: 'Member', label: 'Members', module: 'gym', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'MembershipPlan', label: 'Membership Plans', module: 'gym', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'ActiveService', label: 'Active Services', module: 'gym', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'CheckIn', label: 'Check-ins', module: 'gym', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'Trainer', label: 'Trainers', module: 'gym', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'TrainerCommission', label: 'Trainer Commissions', module: 'gym', actions: ['create', 'read', 'update'] },
  { subject: 'PTSession', label: 'PT Sessions', module: 'gym', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'ServicePlan', label: 'Service Plans', module: 'gym', actions: ['create', 'delete', 'read', 'update'] },

  { subject: 'BackOffice', label: 'Back Office', module: 'back-office', actions: ['read'] },
  { subject: 'StaffAttendance', label: 'Staff Attendance', module: 'back-office', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'EmployeeSchedule', label: 'Employee Schedules', module: 'back-office', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'Shift', label: 'Shifts', module: 'back-office', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'HikvisionDevice', label: 'Hikvision Devices', module: 'back-office', actions: ['create', 'delete', 'read', 'update'] },

  { subject: 'RestaurantCategory', label: 'Restaurant Categories', module: 'restaurant', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'RestaurantLocation', label: 'Restaurant Locations', module: 'restaurant', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'RestaurantProduct', label: 'Restaurant Products', module: 'restaurant', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'RestaurantStock', label: 'Restaurant Stock', module: 'restaurant', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'RestaurantTable', label: 'Restaurant Tables', module: 'restaurant', actions: ['create', 'delete', 'read', 'update'] },

  // 'cancel' (void transaction) is intentionally separate from 'update' — see RBAC-02.
  { subject: 'Transaction', label: 'Transactions', module: 'cash-register', actions: ['create', 'delete', 'read', 'update', 'cancel'] },
  { subject: 'Voucher', label: 'Vouchers', module: 'vouchers', actions: ['create', 'delete', 'read', 'update'] },

  { subject: 'FinanceDashboard', label: 'Finance Dashboard', module: 'finances', actions: ['read'] },
  { subject: 'Income', label: 'Incomes', module: 'finances', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'IncomeCategory', label: 'Income Categories', module: 'finances', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'Expense', label: 'Expenses', module: 'finances', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'ExpenseCategory', label: 'Expense Categories', module: 'finances', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'CashFlow', label: 'Cash Flow', module: 'finances', actions: ['read'] },
  { subject: 'Account', label: 'Akun Keuangan', module: 'finances', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'FinancialReport', label: 'Financial Reports', module: 'reports', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'PettyCash', label: 'Petty Cash', module: 'finances', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'Supplier', label: 'Suppliers', module: 'finances', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'Payment', label: 'Payments', module: 'finances', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'Invoice', label: 'Invoices', module: 'finances', actions: ['create', 'delete', 'read', 'update'] },

  { subject: 'Subscription', label: 'Subscriptions', module: 'subscription', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'SubscriptionPlan', label: 'Subscription Plans', module: 'subscription', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'SubscriptionFeature', label: 'Subscription Features', module: 'subscription', actions: ['create', 'delete', 'read', 'update'] },

  { subject: 'Tenant', label: 'Tenants', module: 'settings', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'User', label: 'Users', module: 'settings', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'Role', label: 'Roles', module: 'settings', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'Permission', label: 'Permissions', module: 'settings', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'Log', label: 'Audit Logs', module: 'settings', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'PrinterSettings', label: 'Printer Settings', module: 'settings', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'ReceiptTemplate', label: 'Receipt Templates', module: 'settings', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'SystemSettings', label: 'System Settings', module: 'settings', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'DatabaseBackup', label: 'Database Backup', module: 'settings', actions: ['create', 'delete', 'read', 'update'] },
  { subject: 'Scheduler', label: 'Scheduler', module: 'settings', actions: ['read', 'update'] },

  { subject: 'Auth', label: 'Authentication', module: 'system', actions: ['create', 'read', 'update'] },
  { subject: 'Health', label: 'Health Check', module: 'system', actions: ['read'] },
  { subject: 'SystemMetrics', label: 'System Metrics', module: 'system', actions: ['read'] },
]

const PERMISSION_CATALOG_MAP = new Map(
  PERMISSION_CATALOG.map(item => [item.subject, item])
)

module.exports = {
  PERMISSION_CATALOG,
  PERMISSION_CATALOG_MAP,
}
