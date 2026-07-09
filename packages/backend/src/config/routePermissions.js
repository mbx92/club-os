const { PERMISSION_CATALOG, PERMISSION_CATALOG_MAP } = require('./permissionCatalog');

/**
 * Route to Subject Mapping Configuration
 * 
 * Maps backend routes to RBAC subjects for consistent permission checking.
 * This is the single source of truth for route-level permissions.
 * 
 * Format:
 * - Simple routes: '/path': { subject: 'Subject', actions: ['read'] }
 * - HTTP method specific: '/path': { GET: {...}, POST: {...} }
 * 
 * @module config/routePermissions
 */

const ROUTE_TO_SUBJECT_MAP = {
  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN & SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Database Management
  '/admin/database/backup': { subject: 'DatabaseBackup', actions: ['create'] },
  '/admin/database/info': { subject: 'DatabaseBackup', actions: ['read'] },
  '/admin/database/download/:filename': { subject: 'DatabaseBackup', actions: ['read'] },
  '/admin/database/backups/:filename': { subject: 'DatabaseBackup', actions: ['delete'] },
  '/admin/database/google-drive/oauth/status': { subject: 'DatabaseBackup', actions: ['read'] },
  '/admin/database/google-drive/oauth/authorize-url': { subject: 'DatabaseBackup', actions: ['update'] },
  '/admin/database/google-drive/oauth/disconnect': { subject: 'DatabaseBackup', actions: ['update'] },
  '/admin/database/google-drive/oauth/test': { subject: 'DatabaseBackup', actions: ['read'] },
  '/admin/database/google-drive/oauth/callback': { subject: 'DatabaseBackup', actions: ['read'] },
  
  // Scheduler Management
  '/admin/scheduler/status': { subject: 'Scheduler', actions: ['read'] },
  
  // Feature Management
  '/admin/features/metadata': { subject: 'SubscriptionFeature', actions: ['read'] },
  '/admin/features/preview/:planName': { subject: 'SubscriptionFeature', actions: ['read'] },
  '/admin/features/create-missing': { subject: 'SubscriptionFeature', actions: ['create'] },
  '/admin/features/sync/:planId': { subject: 'SubscriptionFeature', actions: ['update'] },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH & USERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  '/auth/logout': { subject: 'Auth', actions: ['create'] },
  '/auth/profile': { subject: 'Auth', actions: ['read'] },
  '/auth/operator/list': { subject: 'Auth', actions: ['read'] },
  '/auth/operator/verify': { subject: 'Auth', actions: ['create'] },
  '/auth/operator/users/:id/pin': { subject: 'User', actions: ['update'] },
  
  '/users': {
    GET: { subject: 'User', actions: ['read'] },
    POST: { subject: 'User', actions: ['create'] }
  },
  '/users/:id': {
    GET: { subject: 'User', actions: ['read'] },
    PUT: { subject: 'User', actions: ['update'] },
    DELETE: { subject: 'User', actions: ['delete'] }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PERMISSIONS & ROLES
  // ═══════════════════════════════════════════════════════════════════════════
  
  '/permissions/menu': { subject: 'Role', actions: ['read'] },
  '/permissions/subjects': { subject: 'Role', actions: ['read'] },
  '/permissions/routes/regenerate': { subject: 'Permission', actions: ['create'] },
  '/permissions/roles': {
    GET: { subject: 'Role', actions: ['read'] },
    POST: { subject: 'Role', actions: ['create'] }
  },
  '/permissions/roles/:id': {
    GET: { subject: 'Role', actions: ['read'] },
    PUT: { subject: 'Role', actions: ['update'] },
    DELETE: { subject: 'Role', actions: ['delete'] }
  },
  '/permissions/roles/:id/permissions': { subject: 'Role', actions: ['update'] },
  '/permissions/roles/:id/preview': { subject: 'Role', actions: ['read'] },
  '/permissions/roles/:id/reset': { subject: 'Role', actions: ['update'] },
  // ═══════════════════════════════════════════════════════════════════════════
  // GYM MODULE
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Dashboard
  '/gym/dashboard': { subject: 'Dashboard', actions: ['read'] },
  '/gym/dashboard/overview': { subject: 'Dashboard', actions: ['read'] },
  '/gym/dashboard/stats': { subject: 'Member', actions: ['read'] },
  '/gym/dashboard/comprehensive': { subject: 'Transaction', actions: ['read'] },
  '/gym/dashboard/petty-cash': { subject: 'CashRegisterSession', actions: ['read'] },
  '/gym/dashboard/petty-cash/print-shift-report': { subject: 'CashRegisterSession', actions: ['create'] },
  '/gym/dashboard/petty-cash/daily-report': { subject: 'CashRegisterSession', actions: ['read'] },
  '/gym/dashboard/petty-cash/print-daily-report': { subject: 'CashRegisterSession', actions: ['read'] },
  
  // Members (gym admin CRUD — distinct from /member portal)
  '/gym/members': {
    GET: { subject: 'Member', actions: ['read'] },
    POST: { subject: 'Member', actions: ['create'] }
  },
  '/gym/members/:id': {
    GET: { subject: 'Member', actions: ['read'] },
    PUT: { subject: 'Member', actions: ['update'] },
    DELETE: { subject: 'Member', actions: ['delete'] }
  },
  '/gym/members/:id/reset-password': { subject: 'Member', actions: ['update'] },

  // Check-ins
  '/gym/check-ins': {
    GET: { subject: 'CheckIn', actions: ['read'] },
    POST: { subject: 'CheckIn', actions: ['create'] }
  },
  '/gym/check-ins/stats': { subject: 'CheckIn', actions: ['read'] },
  '/gym/check-ins/:id': {
    GET: { subject: 'CheckIn', actions: ['read'] },
    PUT: { subject: 'CheckIn', actions: ['update'] },
    DELETE: { subject: 'CheckIn', actions: ['delete'] }
  },
  
  // Trainers
  '/gym/trainers': {
    GET: { subject: 'Trainer', actions: ['read'] },
    POST: { subject: 'Trainer', actions: ['create'] }
  },
  '/gym/trainers/:id': {
    GET: { subject: 'Trainer', actions: ['read'] },
    PUT: { subject: 'Trainer', actions: ['update'] },
    DELETE: { subject: 'Trainer', actions: ['delete'] }
  },
  '/gym/trainers/:id/toggle-active': { subject: 'Trainer', actions: ['update'] },
  '/gym/trainers/:id/restore': { subject: 'Trainer', actions: ['update'] },
  '/gym/trainers/:id/reset-password': { subject: 'Trainer', actions: ['update'] },
  '/gym/trainers/:id/commissions': { subject: 'TrainerCommission', actions: ['read'] },
  '/gym/trainers/:id/commissions/:commissionId/pay': { subject: 'TrainerCommission', actions: ['update'] },
  '/gym/trainers/commissions/backfill': { subject: 'TrainerCommission', actions: ['manage'] },
  
  // PT Sessions
  '/gym/pt-sessions': {
    GET: { subject: 'PTSession', actions: ['read'] },
    POST: { subject: 'PTSession', actions: ['create'] }
  },
  '/gym/pt-sessions/:id': {
    GET: { subject: 'PTSession', actions: ['read'] },
    PUT: { subject: 'PTSession', actions: ['update'] },
    DELETE: { subject: 'PTSession', actions: ['delete'] }
  },
  
  // Reports
  '/gym/reports/revenue': { subject: 'Transaction', actions: ['read'] },
  '/gym/reports/profit-loss': { subject: 'Transaction', actions: ['read'] },
  '/gym/reports/attendance': { subject: 'CheckIn', actions: ['read'] },
  '/gym/reports/service-status': { subject: 'ActiveService', actions: ['read'] },
  '/gym/reports/service-commission-income': { subject: 'TrainerCommission', actions: ['read'] },
  '/gym/reports/trainer-commissions': { subject: 'TrainerCommission', actions: ['read'] },
  
  // Staff Attendance
  '/gym/staff-attendance': {
    GET: { subject: 'StaffAttendance', actions: ['read'] },
    POST: { subject: 'StaffAttendance', actions: ['create'] }
  },
  // Frontend SPA routes (enforced via Vue route meta; listed here for permission catalog sync)
  '/gym/hikvision/attendance': { subject: 'StaffAttendance', actions: ['read'] },
  '/gym/hikvision/attendance/report': { subject: 'StaffAttendance', actions: ['read'] },
  '/gym/hikvision/devices': { subject: 'HikvisionDevice', actions: ['read'] },
  '/gym/hikvision/employees': { subject: 'HikvisionDevice', actions: ['read'] },
  '/gym/staff-attendance/report': { subject: 'StaffAttendance', actions: ['read'] },
  '/gym/staff-attendance/report/export': { subject: 'StaffAttendance', actions: ['read'] },
  '/gym/staff-attendance/sync': { subject: 'StaffAttendance', actions: ['create'] },
  '/gym/staff-attendance/reprocess': { subject: 'StaffAttendance', actions: ['create'] },
  '/gym/staff-attendance/fix-checkin': { subject: 'StaffAttendance', actions: ['update'] },
  '/gym/staff-attendance/fix-overnight': { subject: 'StaffAttendance', actions: ['update'] },
  '/gym/staff-attendance/regenerate-from-logs': { subject: 'StaffAttendance', actions: ['update'] },
  '/gym/staff-attendance/:id': { subject: 'StaffAttendance', actions: ['update'] },

  // Frontend SPA routes — Restaurant (enforced via Vue route meta; listed here for permission catalog sync)
  '/restaurant/pos/floor-plan-pos': { subject: 'Transaction', actions: ['create', 'read', 'update'] },
  '/restaurant/pos': { subject: 'Transaction', actions: ['create', 'read', 'update'] },
  '/restaurant/orders': { subject: 'Transaction', actions: ['read', 'create', 'update'] },
  '/restaurant/orders/:id': { subject: 'Transaction', actions: ['read', 'create', 'update'] },
  '/restaurant/void-transactions': { subject: 'Transaction', actions: ['cancel'] },
  '/restaurant/tables/floor-plan': { subject: 'RestaurantTable', actions: ['read', 'update'] },
  
  // Employee Schedules
  '/gym/employee-schedules': {
    GET: { subject: 'EmployeeSchedule', actions: ['read'] },
    POST: { subject: 'EmployeeSchedule', actions: ['create'] }
  },
  '/gym/employee-schedules/export': { subject: 'EmployeeSchedule', actions: ['read'] },
  '/gym/employee-schedules/generate-from-templates': { subject: 'EmployeeSchedule', actions: ['create'] },
  '/gym/employee-schedules/employee/:employeeId': { subject: 'EmployeeSchedule', actions: ['delete'] },
  '/gym/employee-schedules/user/:userId': { subject: 'EmployeeSchedule', actions: ['delete'] },
  '/gym/employee-schedules/assign-shifts': { subject: 'EmployeeSchedule', actions: ['create'] },
  '/gym/employee-schedules/:id': {
    PUT: { subject: 'EmployeeSchedule', actions: ['update'] },
    DELETE: { subject: 'EmployeeSchedule', actions: ['delete'] }
  },
  
  '/gym/employee-schedule-templates/:id': {
    PUT: { subject: 'EmployeeSchedule', actions: ['update'] },
    DELETE: { subject: 'EmployeeSchedule', actions: ['delete'] }
  },
  '/gym/employee-schedule-templates': {
    GET: { subject: 'EmployeeSchedule', actions: ['read'] },
    POST: { subject: 'EmployeeSchedule', actions: ['create'] }
  },

  '/gym/schedule-periods': {
    GET: { subject: 'EmployeeSchedule', actions: ['read'] },
    POST: { subject: 'EmployeeSchedule', actions: ['create'] }
  },
  '/gym/schedule-periods/:id': {
    GET: { subject: 'EmployeeSchedule', actions: ['read'] },
    PUT: { subject: 'EmployeeSchedule', actions: ['update'] },
    DELETE: { subject: 'EmployeeSchedule', actions: ['delete'] }
  },
  '/gym/schedule-periods/:id/assignments/:assignmentId': { subject: 'EmployeeSchedule', actions: ['delete'] },
  '/gym/schedule-periods/:id/assignments/employee/:employeeId': { subject: 'EmployeeSchedule', actions: ['delete'] },
  '/gym/schedule-periods/:id/assignments/user/:userId': { subject: 'EmployeeSchedule', actions: ['delete'] },
  '/gym/schedule-periods/:id/status': { subject: 'EmployeeSchedule', actions: ['update'] },
  '/gym/schedule-periods/:id/assign': { subject: 'EmployeeSchedule', actions: ['create'] },
  '/gym/schedule-periods/:id/generate': { subject: 'EmployeeSchedule', actions: ['create'] },

  '/gym/shifts': {
    GET: { subject: 'EmployeeSchedule', actions: ['read'] },
    POST: { subject: 'EmployeeSchedule', actions: ['create'] }
  },
  '/gym/shifts/:id': {
    GET: { subject: 'Shift', actions: ['read'] },
    PUT: { subject: 'Shift', actions: ['update'] },
    DELETE: { subject: 'Shift', actions: ['delete'] }
  },
  
  // Cash Register Sessions
  '/gym/cash-register': {
    GET: { subject: 'CashRegisterSession', actions: ['read'] },
    POST: { subject: 'CashRegisterSession', actions: ['create'] }
  },
  '/gym/cash-register/current': { subject: 'CashRegisterSession', actions: ['read'] },
  '/gym/cash-register/:id': {
    GET: { subject: 'CashRegisterSession', actions: ['read'] },
    PUT: { subject: 'CashRegisterSession', actions: ['update'] }
  },
  '/gym/cash-register/:id/close': { subject: 'CashRegisterSession', actions: ['update'] },
  '/gym/cash-register/:id/report': { subject: 'CashRegisterSession', actions: ['read'] },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MEMBERS & SERVICES
  // ═══════════════════════════════════════════════════════════════════════════
  
  '/member': {
    GET: { subject: 'Member', actions: ['read'] },
    POST: { subject: 'Member', actions: ['create'] }
  },
  '/member/:id': {
    GET: { subject: 'Member', actions: ['read'] },
    PUT: { subject: 'Member', actions: ['update'] },
    DELETE: { subject: 'Member', actions: ['delete'] }
  },
  '/member/service': { subject: 'ActiveService', actions: ['read'] },
  '/member/service/my-services': { subject: 'ActiveService', actions: ['read'] },
  '/member/service/subscribe': { subject: 'ActiveService', actions: ['create'] },
  
  '/services/:memberId': { subject: 'ActiveService', actions: ['read'] },
  '/services/detail/:id': { subject: 'ActiveService', actions: ['read'] },
  '/services/bulk-purchase': { subject: 'ActiveService', actions: ['create'] },
  '/services/:id/use-session': { subject: 'ActiveService', actions: ['update'] },
  '/services/:id/assign-trainer': { subject: 'ActiveService', actions: ['update'] },
  '/services/:id/cancel': { subject: 'ActiveService', actions: ['delete'] },
  
  '/service/management/stats': { subject: 'ActiveService', actions: ['read'] },
  '/service/management/list': { subject: 'ActiveService', actions: ['read'] },
  '/service/management/calendar': { subject: 'ActiveService', actions: ['read'] },
  '/service/management/alerts': { subject: 'ActiveService', actions: ['read'] },
  '/service/management/member/:memberId': { subject: 'ActiveService', actions: ['read'] },
  '/service/management/:serviceId/assign-trainer': { subject: 'ActiveService', actions: ['update'] },
  '/service/active/walkin': { subject: 'ActiveService', actions: ['read'] },
  '/service/active/detail/:id': { subject: 'ActiveService', actions: ['read'] },
  '/service/active/purchase': { subject: 'ActiveService', actions: ['create'] },
  '/service/active/bulk-purchase': { subject: 'ActiveService', actions: ['create'] },
  '/service/active/:id/use-session': { subject: 'ActiveService', actions: ['update'] },
  '/service/active/:id/assign-trainer': { subject: 'ActiveService', actions: ['update'] },
  '/service/active/:id/cancel': { subject: 'ActiveService', actions: ['delete'] },
  
  '/service/plans': {
    GET: { subject: 'ServicePlan', actions: ['read'] },
    POST: { subject: 'ServicePlan', actions: ['create'] }
  },
  '/service/plans/stats': { subject: 'ServicePlan', actions: ['read'] },
  '/service/plans/:id': {
    GET: { subject: 'ServicePlan', actions: ['read'] },
    PUT: { subject: 'ServicePlan', actions: ['update'] },
    DELETE: { subject: 'ServicePlan', actions: ['delete'] }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BILLING & SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  '/billing/plans': {
    GET: { subject: 'MembershipPlan', actions: ['read'] },
    POST: { subject: 'MembershipPlan', actions: ['create'] }
  },
  '/billing/plans/:id': {
    GET: { subject: 'MembershipPlan', actions: ['read'] },
    PUT: { subject: 'MembershipPlan', actions: ['update'] },
    DELETE: { subject: 'MembershipPlan', actions: ['delete'] }
  },
  
  '/billing/subscriptions': { subject: 'Subscription', actions: ['create'] },
  '/billing/subscriptions/tenant/:tenantId': { subject: 'Subscription', actions: ['read'] },
  '/billing/subscriptions/:id': {
    PUT: { subject: 'Subscription', actions: ['update'] },
    DELETE: { subject: 'Subscription', actions: ['delete'] }
  },
  '/billing/subscriptions/:id/renew': { subject: 'Subscription', actions: ['update'] },
  '/billing/subscriptions/:id/activate': { subject: 'Subscription', actions: ['update'] },
  
  '/billing/invoices': {
    GET: { subject: 'Invoice', actions: ['read'] },
    POST: { subject: 'Invoice', actions: ['create'] }
  },
  '/billing/invoices/:id': {
    GET: { subject: 'Invoice', actions: ['read'] }
  },
  '/billing/invoices/:id/status': { subject: 'Invoice', actions: ['update'] },
  
  '/billing/payments': {
    GET: { subject: 'Payment', actions: ['read'] },
    POST: { subject: 'Payment', actions: ['create'] }
  },
  '/billing/payments/:id': { subject: 'Payment', actions: ['read'] },
  '/billing/payments/:id/refund': { subject: 'Payment', actions: ['update'] },

  // Midtrans payment gateway (RBAC-03)
  '/payment/midtrans/create': { subject: 'Payment', actions: ['create'] },
  '/payment/midtrans/charge': { subject: 'Payment', actions: ['create'] },
  '/payment/midtrans/status/:transactionNumber': { subject: 'Payment', actions: ['read'] },
  '/payment/midtrans/cancel/:transactionNumber': { subject: 'Transaction', actions: ['cancel'] },
  '/payment/midtrans/refund/:transactionNumber': { subject: 'Transaction', actions: ['cancel'] },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION MANAGEMENT (SaaS)
  // ═══════════════════════════════════════════════════════════════════════════
  
  '/subscription': { subject: 'Subscription', actions: ['create'] },
  '/subscription/:id': { subject: 'Subscription', actions: ['update'] },
  '/subscription/:id/upgrade': { subject: 'Subscription', actions: ['update'] },
  '/subscription/:id/cancel': { subject: 'Subscription', actions: ['delete'] },
  '/subscription/:id/renew': { subject: 'Subscription', actions: ['update'] },
  '/subscription/plans': { subject: 'SubscriptionPlan', actions: ['read'] },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TENANTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  '/tenants': {
    GET: { subject: 'Tenant', actions: ['read'] },
    POST: { subject: 'Tenant', actions: ['create'] }
  },
  '/tenants/:id': {
    GET: { subject: 'Tenant', actions: ['read'] },
    PUT: { subject: 'Tenant', actions: ['update'] },
    DELETE: { subject: 'Tenant', actions: ['delete'] }
  },
  '/tenants/settings': { subject: 'Tenant', actions: ['update'] },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  '/transactions': {
    GET: { subject: 'Transaction', actions: ['read'] },
    POST: { subject: 'Transaction', actions: ['create'] }
  },
  '/transactions/statistics': { subject: 'Transaction', actions: ['read'] },
  '/transactions/:id': { subject: 'Transaction', actions: ['read'] },
  '/transactions/:id/status': { subject: 'Transaction', actions: ['update'] },
  '/transactions/:id/installment': { subject: 'Transaction', actions: ['update'] },
  // RBAC-02: void/refund require the dedicated 'cancel' action, not 'update'.
  '/transactions/:id/cancel': { subject: 'Transaction', actions: ['cancel'] },
  '/transactions/:id/refund': { subject: 'Transaction', actions: ['cancel'] },
  '/transactions/:id/refund-items': { subject: 'Transaction', actions: ['cancel'] },
  '/transactions/:id/pre-print': { subject: 'Transaction', actions: ['read'] },
  '/transactions/:id/split-bill': { subject: 'Transaction', actions: ['update'] },
  '/transactions/combined': { subject: 'Transaction', actions: ['create'] },
  
  
  '/transaction-settings': {
    GET: { subject: 'Tenant', actions: ['read'] },
    PUT: { subject: 'Tenant', actions: ['update'] }
  },
  '/transaction-settings/reset': { subject: 'Tenant', actions: ['update'] },
  '/transaction-settings/tax': {
    GET: { subject: 'Tenant', actions: ['read'] },
    PUT: { subject: 'Tenant', actions: ['update'] }
  },
  '/transaction-settings/service-charge': {
    GET: { subject: 'Tenant', actions: ['read'] },
    PUT: { subject: 'Tenant', actions: ['update'] }
  },
  '/transaction-settings/currency': {
    GET: { subject: 'Tenant', actions: ['read'] },
    PUT: { subject: 'Tenant', actions: ['update'] }
  },
  '/transaction-settings/invoice': {
    GET: { subject: 'Tenant', actions: ['read'] },
    PUT: { subject: 'Tenant', actions: ['update'] }
  },
  '/transaction-settings/payment': {
    GET: { subject: 'Tenant', actions: ['read'] },
    PUT: { subject: 'Tenant', actions: ['update'] }
  },
  '/transaction-settings/discount': {
    GET: { subject: 'Tenant', actions: ['read'] },
    PUT: { subject: 'Tenant', actions: ['update'] }
  },
  '/transaction-settings/shipping': {
    GET: { subject: 'Tenant', actions: ['read'] },
    PUT: { subject: 'Tenant', actions: ['update'] }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RESTAURANT MODULE
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Dashboard
  '/restaurant/dashboard/overview': { subject: 'Transaction', actions: ['read'] },
  '/restaurant/dashboard/comprehensive': { subject: 'Transaction', actions: ['read'] },
  '/restaurant/dashboard/sales-trend': { subject: 'Transaction', actions: ['read'] },
  '/restaurant/dashboard/top-products': { subject: 'Transaction', actions: ['read'] },
  '/restaurant/dashboard/recent-orders': { subject: 'Transaction', actions: ['read'] },

  // Orders
  '/restaurant/orders': {
    GET: { subject: 'Transaction', actions: ['read'] },
    POST: { subject: 'Transaction', actions: ['create'] }
  },
  '/restaurant/orders/kitchen': { subject: 'Transaction', actions: ['read'] },
  '/restaurant/orders/queue': { subject: 'Transaction', actions: ['read'] },
  '/restaurant/orders/queue/stats': { subject: 'Transaction', actions: ['read'] },
  '/restaurant/orders/queue/stream': { subject: 'Transaction', actions: ['read'] },
  '/restaurant/orders/queue/display': { subject: 'Transaction', actions: ['read'] },
  '/restaurant/orders/kitchen/stream': { subject: 'Transaction', actions: ['read'] },
  '/restaurant/orders/:id': {
    GET: { subject: 'Transaction', actions: ['read'] },
    PUT: { subject: 'Transaction', actions: ['update'] },
    DELETE: { subject: 'Transaction', actions: ['delete'] }
  },
  '/restaurant/orders/:id/status': { subject: 'Transaction', actions: ['create', 'update'] },
  '/restaurant/orders/:id/items': {
    POST: { subject: 'Transaction', actions: ['create', 'update'] },
  },
  '/restaurant/orders/:orderId/items/grouped': { subject: 'Transaction', actions: ['read'] },
  '/restaurant/orders/:orderId/items/:itemId/status': { subject: 'Transaction', actions: ['create', 'update'] },
  '/restaurant/orders/:id/complete': { subject: 'Transaction', actions: ['create', 'update'] },
  '/restaurant/orders/:id/transfer-items': { subject: 'Transaction', actions: ['create', 'update'] },
  '/restaurant/orders/:id/move-table': { subject: 'Transaction', actions: ['create', 'update'] },
  '/restaurant/orders/:id/splits': { subject: 'Transaction', actions: ['read'] },
  '/restaurant/orders/table/:tableId': { subject: 'Transaction', actions: ['read'] },
  '/restaurant/orders/direct': { subject: 'Transaction', actions: ['create'] },
  '/restaurant/orders/validate-voucher': { subject: 'Voucher', actions: ['read'] },
  '/restaurant/orders/drawer/open': { subject: 'Transaction', actions: ['create', 'update'] },
  '/restaurant/orders/merge': { subject: 'Transaction', actions: ['create', 'update'] },
  '/restaurant/orders/queue/:id/status': { subject: 'Transaction', actions: ['create', 'update'] },
  '/restaurant/orders/queue/:id/call': { subject: 'Transaction', actions: ['create', 'update'] },
  '/restaurant/orders/:id/payment': { subject: 'Transaction', actions: ['create'] },
  '/restaurant/orders/:id/split': { subject: 'Transaction', actions: ['create', 'update'] },
  '/restaurant/orders/:id/merge': { subject: 'Transaction', actions: ['create', 'update'] },
  '/restaurant/orders/:id/void': { subject: 'Transaction', actions: ['delete'] },
  '/restaurant/orders/:id/print': { subject: 'Transaction', actions: ['read'] },
  
  // Products
  '/restaurant/products': {
    GET: { subject: 'RestaurantProduct', actions: ['read'] },
    POST: { subject: 'RestaurantProduct', actions: ['create'] }
  },
  '/restaurant/products/low-stock': { subject: 'RestaurantProduct', actions: ['read'] },
  '/restaurant/products/:id': {
    GET: { subject: 'RestaurantProduct', actions: ['read'] },
    PUT: { subject: 'RestaurantProduct', actions: ['update'] },
    DELETE: { subject: 'RestaurantProduct', actions: ['delete'] }
  },
  '/restaurant/products/:id/adjust-stock': { subject: 'RestaurantProduct', actions: ['update'] },
  '/restaurant/products/:productId/extras': {
    GET: { subject: 'RestaurantProduct', actions: ['read'] },
    POST: { subject: 'RestaurantProduct', actions: ['create'] }
  },
  '/restaurant/products/:productId/extras/:id': {
    PUT: { subject: 'RestaurantProduct', actions: ['update'] },
    DELETE: { subject: 'RestaurantProduct', actions: ['delete'] }
  },
  
  // Product Categories
  '/restaurant/categories': {
    GET: { subject: 'RestaurantCategory', actions: ['read'] },
    POST: { subject: 'RestaurantCategory', actions: ['create'] }
  },
  '/restaurant/categories/tree': { subject: 'RestaurantCategory', actions: ['read'] },
  '/restaurant/categories/reorder': { subject: 'RestaurantCategory', actions: ['update'] },
  '/restaurant/categories/:id': {
    GET: { subject: 'RestaurantCategory', actions: ['read'] },
    PUT: { subject: 'RestaurantCategory', actions: ['update'] },
    DELETE: { subject: 'RestaurantCategory', actions: ['delete'] }
  },
  
  // Locations
  '/restaurant/locations': {
    GET: { subject: 'RestaurantLocation', actions: ['read'] },
    POST: { subject: 'RestaurantLocation', actions: ['create'] }
  },
  '/restaurant/locations/with-stock': { subject: 'RestaurantLocation', actions: ['read'] },
  '/restaurant/locations/distance/:fromId/:toId': { subject: 'RestaurantLocation', actions: ['read'] },
  '/restaurant/locations/:id': {
    GET: { subject: 'RestaurantLocation', actions: ['read'] },
    PUT: { subject: 'RestaurantLocation', actions: ['update'] },
    DELETE: { subject: 'RestaurantLocation', actions: ['delete'] }
  },
  '/restaurant/locations/:id/stock-summary': { subject: 'RestaurantLocation', actions: ['read'] },
  '/restaurant/locations/:id/toggle': { subject: 'RestaurantLocation', actions: ['update'] },
  
  // Tables
  '/restaurant/tables': {
    GET: { subject: 'RestaurantTable', actions: ['read'] },
    POST: { subject: 'RestaurantTable', actions: ['create'] }
  },
  '/restaurant/tables/statistics': { subject: 'RestaurantTable', actions: ['read'] },
  '/restaurant/tables/stats': { subject: 'RestaurantTable', actions: ['read'] },
  '/restaurant/tables/layout/:locationId': { subject: 'RestaurantTable', actions: ['read'] },
  '/restaurant/tables/:id': {
    GET: { subject: 'RestaurantTable', actions: ['read'] },
    PUT: { subject: 'RestaurantTable', actions: ['update'] },
    DELETE: { subject: 'RestaurantTable', actions: ['delete'] }
  },
  '/restaurant/tables/:id/occupy': { subject: 'RestaurantTable', actions: ['update'] },
  '/restaurant/tables/:id/release': { subject: 'RestaurantTable', actions: ['update'] },
  '/restaurant/tables/:id/reserve': { subject: 'RestaurantTable', actions: ['update'] },
  '/restaurant/tables/:id/cleaning': { subject: 'RestaurantTable', actions: ['update'] },
  
  // Stock Movement
  '/restaurant/stock-movements': {
    GET: { subject: 'RestaurantStock', actions: ['read'] }
  },
  '/restaurant/stock-movements/report': { subject: 'RestaurantStock', actions: ['read'] },
  '/restaurant/stock-movements/summary': { subject: 'RestaurantStock', actions: ['read'] },
  '/restaurant/stock-movements/most-moved': { subject: 'RestaurantStock', actions: ['read'] },
  '/restaurant/stock-movements/product/:productId': { subject: 'RestaurantStock', actions: ['read'] },
  '/restaurant/stock-movements/:id': { subject: 'RestaurantStock', actions: ['read'] },
  '/restaurant/stock-movements/stock-in': { subject: 'RestaurantStock', actions: ['create'] },
  '/restaurant/stock-movements/stock-out': { subject: 'RestaurantStock', actions: ['create'] },
  '/restaurant/stock-movements/adjustment': { subject: 'RestaurantStock', actions: ['create'] },
  '/restaurant/stock-movements/transfer': { subject: 'RestaurantStock', actions: ['create'] },
  
  // Reports
  '/restaurant/reports/sales': { subject: 'Transaction', actions: ['read'] },
  '/restaurant/reports/products': { subject: 'Transaction', actions: ['read'] },
  '/restaurant/reports/tables': { subject: 'Transaction', actions: ['read'] },
  '/restaurant/reports/daily-summary': { subject: 'Transaction', actions: ['read'] },
  
  // Combined Billing
  '/restaurant/billing/combined': { subject: 'Transaction', actions: ['create'] },
  '/restaurant/billing/receipt/:id': { subject: 'Transaction', actions: ['read'] },
  '/restaurant/billing/validate-voucher': { subject: 'Voucher', actions: ['read'] },
  '/restaurant/stock-report': { subject: 'RestaurantStock', actions: ['read'] },
  '/restaurant/queue-display': { subject: 'Transaction', actions: ['read'] },

  // Product extras (bulk/migrate)
  '/restaurant/products/bulk': { subject: 'RestaurantProduct', actions: ['create'] },
  '/restaurant/products/migrate': { subject: 'RestaurantProduct', actions: ['update'] },
  '/restaurant/products/migrate-all': { subject: 'RestaurantProduct', actions: ['update'] },
  '/restaurant/products/json/:extraName': { subject: 'RestaurantProduct', actions: ['delete'] },
  '/restaurant/products/:extraId/toggle': { subject: 'RestaurantProduct', actions: ['update'] },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FINANCE MODULE
  // ═══════════════════════════════════════════════════════════════════════════
  
  '/finance/dashboard': { subject: 'FinanceDashboard', actions: ['read'] },
  '/finance/dashboard/overview': { subject: 'FinanceDashboard', actions: ['read'] },
  '/finance/dashboard/summary-cards': { subject: 'FinanceDashboard', actions: ['read'] },
  
  '/finance/incomes': {
    GET: { subject: 'Income', actions: ['read'] },
    POST: { subject: 'Income', actions: ['create'] }
  },
  '/finance/incomes/:id': {
    GET: { subject: 'Income', actions: ['read'] },
    PUT: { subject: 'Income', actions: ['update'] },
    DELETE: { subject: 'Income', actions: ['delete'] }
  },
  
  '/finance/income-categories': {
    GET: { subject: 'IncomeCategory', actions: ['read'] },
    POST: { subject: 'IncomeCategory', actions: ['create'] }
  },
  '/finance/income-categories/:id': {
    PUT: { subject: 'IncomeCategory', actions: ['update'] },
    DELETE: { subject: 'IncomeCategory', actions: ['delete'] }
  },
  
  '/finance/expenses': {
    GET: { subject: 'Expense', actions: ['read'] },
    POST: { subject: 'Expense', actions: ['create'] }
  },
  '/finance/expenses/:id': {
    GET: { subject: 'Expense', actions: ['read'] },
    PUT: { subject: 'Expense', actions: ['update'] },
    DELETE: { subject: 'Expense', actions: ['delete'] }
  },
  '/finance/expenses/:id/approve': { subject: 'Expense', actions: ['update'] },
  '/finance/expenses/:id/pay': { subject: 'Expense', actions: ['update'] },
  '/finance/expenses/:id/reopen': { subject: 'Expense', actions: ['update'] },
  
  '/finance/expense-categories': {
    GET: { subject: 'ExpenseCategory', actions: ['read'] },
    POST: { subject: 'ExpenseCategory', actions: ['create'] }
  },
  '/finance/expense-categories/:id': {
    PUT: { subject: 'ExpenseCategory', actions: ['update'] },
    DELETE: { subject: 'ExpenseCategory', actions: ['delete'] }
  },
  
  '/finance/cash-flow': { subject: 'CashFlow', actions: ['read'] },
  '/finance/cash-flow/projection': { subject: 'CashFlow', actions: ['read'] },
  '/finance/cash-flow/summary': { subject: 'CashFlow', actions: ['read'] },
  '/finance/cash-flow/by-category': { subject: 'CashFlow', actions: ['read'] },
  '/finance/cash-flow/statement': { subject: 'CashFlow', actions: ['read'] },
  
  '/finance/reports/financial': { subject: 'FinancialReport', actions: ['read'] },
  '/finance/reports/revenue': { subject: 'FinancialReport', actions: ['read'] },
  '/finance/reports/profit-loss': { subject: 'FinancialReport', actions: ['read'] },
  '/finance/reports/expenses': { subject: 'Expense', actions: ['read'] },
  
  // Petty Cash
  '/finance/petty-cash': {
    GET: { subject: 'PettyCash', actions: ['read'] },
    POST: { subject: 'PettyCash', actions: ['create'] }
  },
  '/finance/petty-cash/summary': { subject: 'PettyCash', actions: ['read'] },
  '/finance/petty-cash/:id': {
    GET: { subject: 'PettyCash', actions: ['read'] },
    PUT: { subject: 'PettyCash', actions: ['update'] },
    DELETE: { subject: 'PettyCash', actions: ['delete'] }
  },
  '/finance/petty-cash/:id/top-up': { subject: 'PettyCash', actions: ['update'] },
  '/finance/petty-cash/:id/expense': { subject: 'PettyCash', actions: ['update'] },
  '/finance/petty-cash/:id/sales-return': { subject: 'PettyCash', actions: ['update'] },
  '/finance/petty-cash/:id/income': { subject: 'PettyCash', actions: ['update'] },
  '/finance/petty-cash/:id/adjustment': { subject: 'PettyCash', actions: ['update'] },
  '/finance/petty-cash/:id/withdrawal': { subject: 'PettyCash', actions: ['update'] },
  '/finance/petty-cash/:id/transactions': { subject: 'PettyCash', actions: ['read'] },
  
  // Suppliers
  '/finance/suppliers': {
    GET: { subject: 'Supplier', actions: ['read'] },
    POST: { subject: 'Supplier', actions: ['create'] }
  },
  '/finance/suppliers/:id': {
    GET: { subject: 'Supplier', actions: ['read'] },
    PUT: { subject: 'Supplier', actions: ['update'] },
    DELETE: { subject: 'Supplier', actions: ['delete'] }
  },
  '/finance/suppliers/:id/toggle-status': { subject: 'Supplier', actions: ['update'] },
  
  // Shareholders
  '/finance/shareholders': {
    GET: { subject: 'FinancialReport', actions: ['read'] },
    POST: { subject: 'FinancialReport', actions: ['create'] }
  },
  '/finance/shareholders/reorder': { subject: 'FinancialReport', actions: ['update'] },
  '/finance/shareholders/:id': {
    PUT: { subject: 'FinancialReport', actions: ['update'] },
    DELETE: { subject: 'FinancialReport', actions: ['delete'] }
  },
  
  // Finance Analytics
  '/finance/analytics/top-products': { subject: 'Transaction', actions: ['read'] },
  '/finance/analytics/top-services': { subject: 'Transaction', actions: ['read'] },
  '/finance/analytics/not-selling-products': { subject: 'Transaction', actions: ['read'] },
  '/finance/analytics/not-selling-services': { subject: 'Transaction', actions: ['read'] },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VOUCHERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  '/vouchers': {
    GET: { subject: 'Voucher', actions: ['read'] },
    POST: { subject: 'Voucher', actions: ['create'] }
  },
  '/vouchers/:id': {
    GET: { subject: 'Voucher', actions: ['read'] },
    PUT: { subject: 'Voucher', actions: ['update'] },
    DELETE: { subject: 'Voucher', actions: ['delete'] }
  },
  '/vouchers/validate/:code': { subject: 'Voucher', actions: ['read'] },
  '/vouchers/:voucherId/statistics': { subject: 'Voucher', actions: ['read'] },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LOGS
  // ═══════════════════════════════════════════════════════════════════════════
  
  '/logs': {
    GET: { subject: 'Log', actions: ['read'] },
    DELETE: { subject: 'Log', actions: ['delete'] }
  },
  '/logs/:id': { subject: 'Log', actions: ['read'] },
  '/logs/export': { subject: 'Log', actions: ['read'] },
  '/logs/delete': { subject: 'Log', actions: ['create'] },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════
  
  '/system/printers': {
    GET: { subject: 'PrinterSettings', actions: ['read'] },
    POST: { subject: 'PrinterSettings', actions: ['create'] }
  },
  '/system/printers/statistics': { subject: 'PrinterSettings', actions: ['read'] },
  '/system/printers/scan': { subject: 'PrinterSettings', actions: ['create'] },
  '/system/printers/scan/quick': { subject: 'PrinterSettings', actions: ['create'] },
  '/system/printers/:id': {
    GET: { subject: 'PrinterSettings', actions: ['read'] },
    PUT: { subject: 'PrinterSettings', actions: ['update'] },
    DELETE: { subject: 'PrinterSettings', actions: ['delete'] }
  },
  '/system/printers/:id/test': { subject: 'PrinterSettings', actions: ['update'] },
  '/system/printers/health-check/bulk': { subject: 'PrinterSettings', actions: ['update'] },
  '/system/printers/cash-drawer/open': { subject: 'PrinterSettings', actions: ['update'] },
  '/system/printers/:id/stream/connection': { subject: 'PrinterSettings', actions: ['read'] },
  '/system/printers/:id/stream/health': { subject: 'PrinterSettings', actions: ['read'] },
  '/system/printers/:id/jobs': { subject: 'PrinterSettings', actions: ['read'] },
  '/system/printers/:id/test-print': { subject: 'PrinterSettings', actions: ['update'] },
  
  '/system/receipt-templates': {
    GET: { subject: 'ReceiptTemplate', actions: ['read'] },
    POST: { subject: 'ReceiptTemplate', actions: ['create'] }
  },
  '/system/receipt-templates/:id': {
    GET: { subject: 'ReceiptTemplate', actions: ['read'] },
    PATCH: { subject: 'ReceiptTemplate', actions: ['update'] },
    DELETE: { subject: 'ReceiptTemplate', actions: ['delete'] }
  },
  '/system/receipt-templates/:id/duplicate': { subject: 'ReceiptTemplate', actions: ['create'] },
  '/system/receipt-templates/preview-draft': { subject: 'ReceiptTemplate', actions: ['read'] },
  '/system/receipt-templates/:id/preview': { subject: 'ReceiptTemplate', actions: ['read'] },
  '/system/receipt-templates/:id/test-print': { subject: 'ReceiptTemplate', actions: ['read'] },
  '/system/receipt-templates/test-print-draft': { subject: 'ReceiptTemplate', actions: ['read'] },
  
  '/system/receipt-settings': {
    GET: { subject: 'SystemSettings', actions: ['read'] },
    POST: { subject: 'SystemSettings', actions: ['create'] },
    PUT: { subject: 'SystemSettings', actions: ['update'] }
  },
  '/system/receipt-settings/test-print': { subject: 'SystemSettings', actions: ['read'] },
  '/system/receipt-settings/test-print-actual': { subject: 'SystemSettings', actions: ['read'] },
  '/system/receipt-settings/reset': { subject: 'SystemSettings', actions: ['update'] },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HIKVISION INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Device Management
  '/integrations/hikvision/devices': {
    GET: { subject: 'HikvisionDevice', actions: ['read'] },
    POST: { subject: 'HikvisionDevice', actions: ['create'] }
  },
  '/integrations/hikvision/devices/:id': {
    GET: { subject: 'HikvisionDevice', actions: ['read'] },
    PUT: { subject: 'HikvisionDevice', actions: ['update'] },
    DELETE: { subject: 'HikvisionDevice', actions: ['delete'] }
  },
  
  // Device Operations
  '/integrations/hikvision/devices/:id/sync': { subject: 'HikvisionDevice', actions: ['update'] },
  '/integrations/hikvision/devices/:id/test': { subject: 'HikvisionDevice', actions: ['read'] },
  '/integrations/hikvision/devices/:id/logs': { subject: 'HikvisionDevice', actions: ['read'] },
  '/integrations/hikvision/devices/:id/sync-logs': { subject: 'HikvisionDevice', actions: ['read'] },
  '/integrations/hikvision/devices/:id/status': { subject: 'HikvisionDevice', actions: ['read'] },
  '/integrations/hikvision/devices/:id/sync-status': { subject: 'HikvisionDevice', actions: ['read'] },
  '/integrations/hikvision/devices/:id/push-pending-employees': { subject: 'HikvisionDevice', actions: ['update'] },
  
  // Device Employee Management (on hardware)
  '/integrations/hikvision/devices/:id/employees': {
    GET: { subject: 'HikvisionDevice', actions: ['read'] },
    POST: { subject: 'HikvisionDevice', actions: ['update'] }
  },
  '/integrations/hikvision/devices/:id/employees/:employeeNo': {
    DELETE: { subject: 'HikvisionDevice', actions: ['delete'] }
  },
  '/integrations/hikvision/devices/:id/employees/:employeeNo/enroll-fingerprint': { 
    POST: { subject: 'HikvisionDevice', actions: ['update'] }
  },
  '/integrations/hikvision/devices/:id/employees/:employeeNo/fingerprint': { 
    DELETE: { subject: 'HikvisionDevice', actions: ['delete'] }
  },
  '/integrations/hikvision/devices/:id/enrollment-lock': { 
    DELETE: { subject: 'HikvisionDevice', actions: ['update'] }
  },
  '/integrations/hikvision/devices/:id/sync-employees': { 
    POST: { subject: 'HikvisionDevice', actions: ['update'] }
  },
  
  // Device Configuration
  '/integrations/hikvision/devices/:id/configure-push': { 
    POST: { subject: 'HikvisionDevice', actions: ['update'] }
  },
  '/integrations/hikvision/devices/:id/push-status': { 
    GET: { subject: 'HikvisionDevice', actions: ['read'] }
  },
  '/integrations/hikvision/devices/:id/push': { 
    DELETE: { subject: 'HikvisionDevice', actions: ['update'] }
  },
  '/integrations/hikvision/devices/:id/sync-time': { 
    POST: { subject: 'HikvisionDevice', actions: ['update'] }
  },
  
  // Device Employee DB Records
  '/integrations/hikvision/device-employees': { 
    GET: { subject: 'HikvisionDevice', actions: ['read'] }
  },
  '/integrations/hikvision/device-employees/:id': {
    PUT: { subject: 'HikvisionDevice', actions: ['update'] },
    PATCH: { subject: 'HikvisionDevice', actions: ['update'] }
  },
  '/integrations/hikvision/device-employees/:id/status': { subject: 'HikvisionDevice', actions: ['update'] },
  '/integrations/hikvision/device-employees/duplicates': { subject: 'HikvisionDevice', actions: ['read'] },
  '/integrations/hikvision/device-employees/merge': { subject: 'HikvisionDevice', actions: ['update'] },
  
  // Staff Device Number Mapping
  '/integrations/hikvision/staff-mapping': { 
    GET: { subject: 'HikvisionDevice', actions: ['read'] }
  },
  '/integrations/hikvision/staff-mapping/:userId': {
    PUT: { subject: 'HikvisionDevice', actions: ['update'] },
    DELETE: { subject: 'HikvisionDevice', actions: ['delete'] }
  },
  
  // Log Reprocessing
  '/integrations/hikvision/reprocess-logs': { 
    POST: { subject: 'HikvisionDevice', actions: ['update'] }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // METRICS & MONITORING
  // ═══════════════════════════════════════════════════════════════════════════
  
  '/metrics': { subject: 'SystemMetrics', actions: ['read'] },
  '/health': { subject: 'Health', actions: ['read'] },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════
  
  '/dashboard/main': { subject: 'Transaction', actions: ['read'] },
  '/dashboard/global-report': { subject: 'Transaction', actions: ['read'] },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTS MODULE
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Gym Reports
  '/reports/gym/overview': { subject: 'Member', actions: ['read'] },
  '/reports/gym/checkin-trends': { subject: 'CheckIn', actions: ['read'] },
  '/reports/gym/membership-stats': { subject: 'ActiveService', actions: ['read'] },
  
  // Restaurant Reports
  '/reports/restaurant/sales': { subject: 'Transaction', actions: ['read'] },
  '/reports/restaurant/table-utilization': { subject: 'Transaction', actions: ['read'] },
  '/reports/restaurant/top-items': { subject: 'Transaction', actions: ['read'] },
  
  // Product Reports
  '/reports/products/performance': { subject: 'Transaction', actions: ['read'] },
  '/reports/products/top-selling': { subject: 'Transaction', actions: ['read'] },
  '/reports/products/by-category': { subject: 'Transaction', actions: ['read'] },
  
  // Service Reports
  '/reports/services/performance': { subject: 'Transaction', actions: ['read'] },
  '/reports/services/active': { subject: 'ActiveService', actions: ['read'] },
  // Vault / Brankas
  "/finance/vault/accounts": { subject: "Finance", actions: ["read", "create", "update", "delete"] },
  "/finance/vault/summary": { subject: "Finance", actions: ["read"] },
  "/finance/vault/collectibles": { subject: "Finance", actions: ["read"] },
  "/finance/vault/mutations": { subject: "Finance", actions: ["read"] },
  "/finance/vault/collect": { subject: "Finance", actions: ["create"] },
  "/finance/vault/transfer": { subject: "Finance", actions: ["create"] },
  "/finance/vault/adjust": { subject: "Finance", actions: ["update"] },
  
  // Finance Reports (Reports Module)
  '/reports/finance/revenue': { subject: 'Transaction', actions: ['read'] },
  '/reports/finance/profit-loss': { subject: 'Transaction', actions: ['read'] },
  '/reports/finance/cash-flow': { subject: 'CashFlow', actions: ['read'] },
  '/reports/finance/shareholder': { subject: 'Transaction', actions: ['read'] },
  
  // Commission Reports
  '/reports/commissions/summary': { subject: 'TrainerCommission', actions: ['read'] },
  '/reports/commissions/trends': { subject: 'TrainerCommission', actions: ['read'] },
  '/reports/commissions/by-trainer/:trainerId': { subject: 'TrainerCommission', actions: ['read'] },
  
  // Staff Reports
  '/reports/staff/attendance': { subject: 'StaffAttendance', actions: ['read'] },
  '/reports/staff/daily-composition': { subject: 'EmployeeSchedule', actions: ['read'] },
  '/reports/staff/shift-summary': { subject: 'EmployeeSchedule', actions: ['read'] },
  
  // Member Reports
  '/reports/members/active': { subject: 'Member', actions: ['read'] },
  '/reports/members/growth': { subject: 'Member', actions: ['read'] },
  '/reports/members/retention': { subject: 'Member', actions: ['read'] },
  
  '/reports/daily/daily-summary': { subject: 'Transaction', actions: ['read'] },
  '/reports/daily/daily-summary/export': { subject: 'Transaction', actions: ['read'] },

  // Forecasting Reports
  '/reports/forecasting/revenue': { subject: 'Transaction', actions: ['read'] },
  '/reports/forecasting/members': { subject: 'Member', actions: ['read'] },
  '/reports/forecasting/attendance': { subject: 'CheckIn', actions: ['read'] },
  '/reports/forecasting/expenses': { subject: 'Expense', actions: ['read'] },
  '/reports/forecasting/comprehensive': { subject: 'Transaction', actions: ['read'] },
};

/**
 * Get all unique RBAC subjects from the route mapping
 * @param {boolean} withActions - If true, returns objects with subject and actions
 * @returns {string[]|object[]} Array of unique subject names, or array of {subject, actions} objects
 */
function getAllSubjects(withActions = false) {
  const subjectsMap = new Map();

  for (const item of PERMISSION_CATALOG) {
    subjectsMap.set(item.subject, {
      subject: item.subject,
      label: item.label,
      module: item.module,
      actions: new Set(item.actions || []),
    });
  }

  for (const route in ROUTE_TO_SUBJECT_MAP) {
    const mapping = ROUTE_TO_SUBJECT_MAP[route];

    if (mapping.subject) {
      const subject = mapping.subject;
      const actions = mapping.actions || [];
      const existing = subjectsMap.get(subject) || {
        subject,
        label: PERMISSION_CATALOG_MAP.get(subject)?.label || subject,
        module: PERMISSION_CATALOG_MAP.get(subject)?.module || 'system',
        actions: new Set(),
      };

      if (!subjectsMap.has(subject)) {
        subjectsMap.set(subject, existing);
      }
      actions.forEach(action => existing.actions.add(action));
    } else {
      Object.values(mapping).forEach(methodMapping => {
        if (methodMapping.subject) {
          const subject = methodMapping.subject;
          const actions = methodMapping.actions || [];
          const existing = subjectsMap.get(subject) || {
            subject,
            label: PERMISSION_CATALOG_MAP.get(subject)?.label || subject,
            module: PERMISSION_CATALOG_MAP.get(subject)?.module || 'system',
            actions: new Set(),
          };

          if (!subjectsMap.has(subject)) {
            subjectsMap.set(subject, existing);
          }
          actions.forEach(action => existing.actions.add(action));
        }
      });
    }
  }

  const result = Array.from(subjectsMap.values())
    .map(item => ({
      subject: item.subject,
      label: item.label,
      module: item.module,
      actions: Array.from(item.actions).sort(),
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject));

  if (!withActions) {
    return result.map(item => item.subject);
  }

  return result;
}

/**
 * Get subject mapping for a specific route and method
 * @param {string} path - Route path (e.g., '/gym/members')
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @returns {object|null} Subject mapping or null if not found
 */
function getSubjectForRoute(path, method) {
  const mapping = ROUTE_TO_SUBJECT_MAP[path];
  
  if (!mapping) return null;
  
  // If direct mapping exists
  if (mapping.subject) {
    return mapping;
  }
  
  // If HTTP method specific
  const upperMethod = method.toUpperCase();
  if (mapping[upperMethod]) {
    return mapping[upperMethod];
  }
  
  return null;
}

/**
 * Get all routes for a specific subject
 * @param {string} subject - RBAC subject name
 * @returns {Array} Array of routes that use this subject
 */
function getRoutesForSubject(subject) {
  const routes = [];
  
  for (const [path, mapping] of Object.entries(ROUTE_TO_SUBJECT_MAP)) {
    if (mapping.subject === subject) {
      routes.push({ path, method: 'ALL', ...mapping });
    } else {
      // Check HTTP method specific mappings
      for (const [method, methodMapping] of Object.entries(mapping)) {
        if (methodMapping.subject === subject) {
          routes.push({ path, method, ...methodMapping });
        }
      }
    }
  }
  
  return routes;
}

module.exports = {
  ROUTE_TO_SUBJECT_MAP,
  getAllSubjects,
  getSubjectForRoute,
  getRoutesForSubject,
};
