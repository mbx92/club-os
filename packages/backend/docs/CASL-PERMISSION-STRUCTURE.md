# CASL Permission Structure - Rekomendasi & Solusi

## 📋 Daftar CASL Subjects yang Digunakan di Frontend

### Dashboard & Core (5 subjects)
1. `Dashboard` - Dashboard utama
2. `CashRegisterSession` - Shift kasir
3. `Settings` - Halaman settings
4. `Subscription` - Management subscription (super admin)
5. `Billing` - Billing management

### Gym Module (16 subjects)
6. `Gym` - Dashboard gym & general gym access
7. `Member` - Management member
8. `Instructor` - Management instruktur/trainer
9. `Class` - Class management (parent)
10. `ClassPackage` - Paket kelas
11. `Membership` - Membership management
12. `MembershipPlan` - Membership plans/types
13. `PersonalTraining` - PT management (parent)
14. `PTPackage` - Paket PT
15. `PTSession` - Sesi PT
16. `ActiveService` - Active services (membership/class/PT yang aktif)
17. `CheckIn` - Check-in member
18. `Transaction` - Transaksi/POS
19. `GymReport` - Reports gym
20. `TrainerCommission` - Komisi trainer
21. `Nutrition` - Modul nutrition

### Psychology Module (11 subjects)
22. `Psychology` - Psychology module (parent)
23. `PsychologyDashboard` - Dashboard psychology
24. `Patient` - Patient management
25. `PsychologyPackage` - Paket psikologi
26. `PsychologyOrder` - Order/transaksi psikologi
27. `PsychologySession` - Sesi tes psikologi
28. `PsychologyInvitation` - Invitation psikogram
29. `TestType` - Tipe tes psikologi
30. `PsychologyLogs` - Log session
31. `PriceRule` - Aturan harga
32. `PsychologySettings` - Settings psychology

### Restaurant Module (8 subjects)
33. `Restaurant` - Restaurant module (parent)
34. `RestaurantCategory` - Kategori produk
35. `RestaurantProduct` - Produk
36. `RestaurantLocation` - Lokasi
37. `RestaurantTable` - Meja restaurant
38. `Order` - Order restaurant
39. `RestaurantStock` - Inventory/stock
40. `RestaurantReport` - Reports restaurant

### Finance Module (8 subjects)
41. `Finance` - Finance module (parent)
42. `FinanceDashboard` - Dashboard finance
43. `Income` - Pemasukan
44. `IncomeCategory` - Kategori pemasukan
45. `Expense` - Pengeluaran
46. `ExpenseCategory` - Kategori pengeluaran
47. `CashFlow` - Cash flow
48. `FinancialReport` - Laporan keuangan

### Back Office Module (3 subjects)
49. `BackOffice` - Back office module (parent)
50. `StaffAttendance` - Absensi staff
51. `HikvisionDevice` - Device Hikvision
52. `EmployeeSchedule` - Jadwal karyawan

### Reports Module (4 subjects)
53. `Reports` - Reports module (parent)
54. `RevenueReport` - Laporan revenue
55. `AttendanceReport` - Laporan kehadiran
56. `MemberReport` - Laporan member

### Subscription Management (3 subjects)
57. `SubscriptionPlan` - Subscription plans
58. `Tenant` - Tenant management
59. `Voucher` - Voucher management

### Core Entities (6 subjects)
60. `User` - User management
61. `Role` - Role management
62. `Log` - System logs
63. `Product` - Product management (shared)
64. `ProductCategory` - Product categories
65. `Location` - Location management

**Total: 65 CASL Subjects**

---

## 🚨 Masalah Saat Ini

### 1. Backend Mengirim Generic "Resource"

**Masalah:**
```json
{
  "permissions": {
    "roles": ["admin"],
    "actions": ["read"],
    "resource": "Resource"  // ❌ Generic! Tidak spesifik
  }
}
```

- Backend mengirim generic `"Resource"` untuk SEMUA endpoint
- Frontend menggunakan 65 CASL subjects yang spesifik
- Tidak ada mapping yang jelas

### 2. Format caslRules Salah

**Masalah:**
```json
{
  "caslRules": [{
    "action": "manage",      // ❌ String (legacy format)
    "subject": "all",
    "actions": []            // ❌ Array kosong! Harusnya ["manage"]
  }]
}
```

**Yang Benar:**
```json
{
  "caslRules": [{
    "subject": "all",        // ✅ Subject first
    "actions": ["manage"],   // ✅ Array dengan value
    "conditions": { "tenantId": "$tenantId" }
  }]
}
```

### 3. Tidak Ada Mapping Route → Subject

**Masalah:**
- Backend route `/gym/members` → tidak jelas subject-nya apa
- Backend route `/transactions` → tidak jelas subject-nya apa
- Frontend butuh mapping yang konsisten

---

## ✅ Solusi & Rekomendasi

### 1. Backend Response Format yang Benar

```javascript
// Login/Refresh Token Response
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": { ... },
    "permissions": {
      // CASL Rules (modern, preferred)
      "caslRules": [
        {
          "subject": "all",
          "actions": ["manage"],
          "conditions": { "tenantId": "$tenantId" }
        },
        {
          "subject": "Member",
          "actions": ["read", "create", "update"],
          "conditions": { "tenantId": "$tenantId" }
        },
        {
          "subject": "CheckIn",
          "actions": ["read", "create"],
          "conditions": { "tenantId": "$tenantId" }
        },
        {
          "subject": "Transaction",
          "actions": ["read", "create"],
          "conditions": { "tenantId": "$tenantId" }
        },
        {
          "subject": "Dashboard",
          "actions": ["read"],
          "conditions": { "tenantId": "$tenantId" }
        }
      ],
      
      // Legacy rolePermissions (backward compatibility)
      "rolePermissions": {
        "members": ["read", "create", "update"],
        "checkIns": ["read", "create"],
        "transactions": ["read", "create"]
      },
      
      // UI Flags (optional, untuk behavior UI spesifik)
      "uiFlags": {
        "canManageUsers": true,
        "canManageRoles": true,
        "canViewLogs": true,
        "canManageSettings": true,
        "canManageTenant": true
      },
      
      // Menu Access (optional, untuk quick filter menu)
      "menuAccess": [
        "dashboard",
        "gym",
        "pos",
        "restaurant",
        "finance",
        "reports",
        "settings"
      ]
    },
    "subscription": { ... }
  }
}
```

---

### 2. Mapping Backend Routes → CASL Subjects

Backend perlu mapping table seperti ini:

```javascript
// Backend: config/routePermissions.js
const ROUTE_TO_SUBJECT_MAP = {
  // Database & Admin
  '/admin/database/backup': { subject: 'DatabaseBackup', actions: ['create'] },
  '/admin/database/info': { subject: 'DatabaseBackup', actions: ['read'] },
  '/admin/database/download/:filename': { subject: 'DatabaseBackup', actions: ['read'] },
  '/admin/database/backups/:filename': { subject: 'DatabaseBackup', actions: ['delete'] },
  
  '/admin/revenue/invitation/preview': { subject: 'Revenue', actions: ['read'] },
  '/admin/revenue/invitation/recalculate': { subject: 'Revenue', actions: ['create'] },
  
  '/admin/scheduler/status': { subject: 'Scheduler', actions: ['read'] },
  '/admin/scheduler/trigger/session-cleanup': { subject: 'Scheduler', actions: ['create'] },
  
  '/admin/features/metadata': { subject: 'SubscriptionFeature', actions: ['read'] },
  '/admin/features/preview/:planName': { subject: 'SubscriptionFeature', actions: ['read'] },
  '/admin/features/create-missing': { subject: 'SubscriptionFeature', actions: ['create'] },
  '/admin/features/sync/:planId': { subject: 'SubscriptionFeature', actions: ['update'] },
  
  // Auth & Users
  '/auth/logout': { subject: 'Auth', actions: ['create'] },
  '/auth/profile': { subject: 'Auth', actions: ['read'] },
  
  '/users': { 
    GET: { subject: 'User', actions: ['read'] },
    POST: { subject: 'User', actions: ['create'] }
  },
  '/users/:id': {
    GET: { subject: 'User', actions: ['read'] },
    PUT: { subject: 'User', actions: ['update'] },
    DELETE: { subject: 'User', actions: ['delete'] }
  },
  
  // Permissions & Roles
  '/permissions/menu': { subject: 'Permission', actions: ['read'] },
  '/permissions/routes/regenerate': { subject: 'Permission', actions: ['create'] },
  '/permissions/roles': {
    GET: { subject: 'Role', actions: ['read'] },
    POST: { subject: 'Role', actions: ['create'] }
  },
  '/permissions/roles/:id': {
    PUT: { subject: 'Role', actions: ['update'] },
    DELETE: { subject: 'Role', actions: ['delete'] }
  },
  
  // Gym Module
  '/gym/dashboard': { subject: 'Gym', actions: ['read'] },
  '/gym/dashboard/petty-cash': { subject: 'CashRegisterSession', actions: ['read'] },
  '/gym/dashboard/petty-cash/print-shift-report': { subject: 'CashRegisterSession', actions: ['create'] },
  
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
  
  '/gym/trainers': {
    GET: { subject: 'Instructor', actions: ['read'] },
    POST: { subject: 'Instructor', actions: ['create'] }
  },
  '/gym/trainers/:id': {
    GET: { subject: 'Instructor', actions: ['read'] },
    PUT: { subject: 'Instructor', actions: ['update'] },
    DELETE: { subject: 'Instructor', actions: ['delete'] }
  },
  '/gym/trainers/:id/toggle-active': { subject: 'Instructor', actions: ['update'] },
  '/gym/trainers/:id/commissions/:commissionId/pay': { subject: 'TrainerCommission', actions: ['create'] },
  '/gym/trainers/commissions/backfill': { subject: 'TrainerCommission', actions: ['create'] },
  
  '/gym/pt-sessions/:id': {
    GET: { subject: 'PTSession', actions: ['read'] },
    PUT: { subject: 'PTSession', actions: ['update'] },
    DELETE: { subject: 'PTSession', actions: ['delete'] }
  },
  
  '/gym/reports/trainer-commissions': { subject: 'TrainerCommission', actions: ['read'] },
  
  '/gym/staff-attendance/report': { subject: 'StaffAttendance', actions: ['read'] },
  '/gym/staff-attendance/reprocess': { subject: 'StaffAttendance', actions: ['create'] },
  '/gym/staff-attendance/:id': { subject: 'StaffAttendance', actions: ['update'] },
  
  '/gym/employee-schedules/assign-shifts': { subject: 'EmployeeSchedule', actions: ['create'] },
  '/gym/employee-schedules/:id': {
    PUT: { subject: 'EmployeeSchedule', actions: ['update'] },
    DELETE: { subject: 'EmployeeSchedule', actions: ['delete'] }
  },
  
  '/gym/employee-schedule-templates/:id': {
    PUT: { subject: 'EmployeeSchedule', actions: ['update'] },
    DELETE: { subject: 'EmployeeSchedule', actions: ['delete'] }
  },
  
  '/gym/schedule-periods/:id': {
    GET: { subject: 'EmployeeSchedule', actions: ['read'] },
    PUT: { subject: 'EmployeeSchedule', actions: ['update'] },
    DELETE: { subject: 'EmployeeSchedule', actions: ['delete'] }
  },
  '/gym/schedule-periods/:id/assignments/:assignmentId': { subject: 'EmployeeSchedule', actions: ['delete'] },
  '/gym/schedule-periods/:id/assignments/employee/:employeeId': { subject: 'EmployeeSchedule', actions: ['delete'] },
  '/gym/schedule-periods/:id/assignments/user/:userId': { subject: 'EmployeeSchedule', actions: ['delete'] },
  
  '/gym/shifts/:id': {
    GET: { subject: 'Shift', actions: ['read'] },
    PUT: { subject: 'Shift', actions: ['update'] },
    DELETE: { subject: 'Shift', actions: ['delete'] }
  },
  
  // Members & Services
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
  
  '/service/management/stats': { subject: 'ActiveService', actions: ['read'] },
  '/service/management/member/:memberId': { subject: 'ActiveService', actions: ['read'] },
  '/service/management/:serviceId/assign-trainer': { subject: 'ActiveService', actions: ['update'] },
  
  '/service/plans/stats': { subject: 'MembershipPlan', actions: ['read'] },
  
  // Billing & Subscriptions
  '/billing/plans': {
    GET: { subject: 'MembershipPlan', actions: ['read'] },
    POST: { subject: 'MembershipPlan', actions: ['create'] }
  },
  '/billing/plans/:id': {
    GET: { subject: 'MembershipPlan', actions: ['read'] },
    PUT: { subject: 'MembershipPlan', actions: ['update'] },
    DELETE: { subject: 'MembershipPlan', actions: ['delete'] }
  },
  
  '/billing/subscriptions/tenant/:tenantId': { subject: 'Membership', actions: ['read'] },
  '/billing/subscriptions/:id': {
    PUT: { subject: 'Membership', actions: ['update'] },
    DELETE: { subject: 'Membership', actions: ['delete'] }
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
  
  '/membership-payments': {
    GET: { subject: 'MembershipPayment', actions: ['read'] },
    POST: { subject: 'MembershipPayment', actions: ['create'] }
  },
  '/membership-payments/statistics': { subject: 'MembershipPayment', actions: ['read'] },
  '/membership-payments/:id': {
    GET: { subject: 'MembershipPayment', actions: ['read'] },
    PUT: { subject: 'MembershipPayment', actions: ['update'] },
    DELETE: { subject: 'MembershipPayment', actions: ['delete'] }
  },
  
  // Subscription Management (SaaS)
  '/subscription': { subject: 'Subscription', actions: ['create'] },
  '/subscription/:id': { subject: 'Subscription', actions: ['update'] },
  '/subscription/:id/renew': { subject: 'Subscription', actions: ['create'] },
  '/subscription/plans': { subject: 'SubscriptionPlan', actions: ['read'] },
  
  // Tenants
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
  
  // Transactions
  '/transactions': {
    GET: { subject: 'Transaction', actions: ['read'] },
    POST: { subject: 'Transaction', actions: ['create'] }
  },
  '/transactions/:id': { subject: 'Transaction', actions: ['read'] },
  '/transactions/combined': { subject: 'Transaction', actions: ['create'] },
  
  '/modules/pos/sessions': { subject: 'CashRegisterSession', actions: ['read'] },
  '/modules/pos/transactions': { subject: 'Transaction', actions: ['create'] },
  
  '/transaction-settings/shipping': {
    GET: { subject: 'Settings', actions: ['read'] },
    PUT: { subject: 'Settings', actions: ['update'] }
  },
  '/transaction-settings/reset': { subject: 'Settings', actions: ['create'] },
  
  // Restaurant Module
  '/modules/restaurant/orders': {
    GET: { subject: 'Order', actions: ['read'] }
  },
  '/modules/restaurant/order': { subject: 'Order', actions: ['create'] },
  '/modules/restaurant/tables/layout': { subject: 'RestaurantTable', actions: ['read'] },
  '/modules/restaurant/kitchen/display': { subject: 'Order', actions: ['read'] },
  
  // Finance Module
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
  
  '/finance/expenses/:id': {
    GET: { subject: 'Expense', actions: ['read'] },
    PUT: { subject: 'Expense', actions: ['update'] },
    DELETE: { subject: 'Expense', actions: ['delete'] }
  },
  
  '/finance/expense-categories/:id': {
    PUT: { subject: 'ExpenseCategory', actions: ['update'] },
    DELETE: { subject: 'ExpenseCategory', actions: ['delete'] }
  },
  
  '/finance/cash-flow/projection': { subject: 'CashFlow', actions: ['read'] },
  
  // Vouchers
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
  
  // Logs
  '/logs': {
    GET: { subject: 'Log', actions: ['read'] },
    DELETE: { subject: 'Log', actions: ['delete'] }
  },
  '/logs/:id': { subject: 'Log', actions: ['read'] },
  '/logs/export': { subject: 'Log', actions: ['read'] },
  '/logs/delete': { subject: 'Log', actions: ['create'] },
  
  // System/Settings
  '/system/printers/scan': { subject: 'PrinterSettings', actions: ['read'] },
  '/system/printers/scan/quick': { subject: 'PrinterSettings', actions: ['read'] },
  '/system/printers/:id': {
    GET: { subject: 'PrinterSettings', actions: ['read'] },
    PUT: { subject: 'PrinterSettings', actions: ['update'] },
    DELETE: { subject: 'PrinterSettings', actions: ['delete'] }
  },
  '/system/printers/health-check/bulk': { subject: 'PrinterSettings', actions: ['create'] },
  '/system/printers/cash-drawer/open': { subject: 'PrinterSettings', actions: ['create'] },
  '/system/printers/:id/stream/health': { subject: 'PrinterSettings', actions: ['read'] },
  
  '/system/receipt-templates': {
    GET: { subject: 'ReceiptSettings', actions: ['read'] },
    POST: { subject: 'ReceiptSettings', actions: ['create'] }
  },
  '/system/receipt-templates/:id': {
    GET: { subject: 'ReceiptSettings', actions: ['read'] },
    PATCH: { subject: 'ReceiptSettings', actions: ['update'] },
    DELETE: { subject: 'ReceiptSettings', actions: ['delete'] }
  },
  '/system/receipt-templates/test-print-draft': { subject: 'ReceiptSettings', actions: ['create'] },
  
  '/system/receipt-settings': {
    GET: { subject: 'ReceiptSettings', actions: ['read'] },
    PUT: { subject: 'ReceiptSettings', actions: ['update'] }
  },
  '/system/receipt-settings/reset': { subject: 'ReceiptSettings', actions: ['create'] },
  
  // Hikvision Integration
  '/integrations/hikvision/devices/:id': {
    PUT: { subject: 'HikvisionDevice', actions: ['update'] },
    DELETE: { subject: 'HikvisionDevice', actions: ['delete'] }
  },
  '/integrations/hikvision/devices/:id/push-status': { subject: 'HikvisionDevice', actions: ['read'] },
  '/integrations/hikvision/devices/:id/push': { subject: 'HikvisionDevice', actions: ['delete'] },
  '/integrations/hikvision/devices/:id/employees/:employeeNo': { subject: 'HikvisionDevice', actions: ['delete'] },
  '/integrations/hikvision/devices/:id/employees/:employeeNo/enroll-fingerprint': { subject: 'HikvisionDevice', actions: ['create'] },
  '/integrations/hikvision/devices/:id/employees/:employeeNo/fingerprint': { subject: 'HikvisionDevice', actions: ['delete'] },
  
  '/integrations/hikvision/device-employees': { subject: 'HikvisionDevice', actions: ['read'] },
  '/integrations/hikvision/device-employees/:id': { subject: 'HikvisionDevice', actions: ['update'] },
  
  '/integrations/hikvision/staff-mapping/:userId': {
    PUT: { subject: 'HikvisionDevice', actions: ['update'] },
    DELETE: { subject: 'HikvisionDevice', actions: ['delete'] }
  },
  
  '/integrations/hikvision/reprocess-logs': { subject: 'HikvisionDevice', actions: ['create'] },
  
  // Metrics
  '/metrics': { subject: 'SystemMetrics', actions: ['read'] }
}
```

---

### 3. Contoh Permission Structure per Role

#### **ADMIN (Super Admin)**
```json
{
  "caslRules": [
    {
      "subject": "all",
      "actions": ["manage"],
      "conditions": { "tenantId": "$tenantId" }
    }
  ],
  "uiFlags": {
    "canManageUsers": true,
    "canManageRoles": true,
    "canViewLogs": true,
    "canManageSettings": true,
    "canManageTenant": true
  },
  "menuAccess": [
    "dashboard",
    "gym",
    "pos",
    "restaurant",
    "classes",
    "finance",
    "reports",
    "users",
    "roles",
    "settings",
    "logs",
    "psychology",
    "backoffice",
    "subscription"
  ]
}
```

#### **CASHIER**
```json
{
  "caslRules": [
    { "subject": "Dashboard", "actions": ["read"] },
    { "subject": "CashRegisterSession", "actions": ["read", "create", "update"] },
    { "subject": "Member", "actions": ["read", "create", "update"] },
    { "subject": "CheckIn", "actions": ["read", "create", "update"] },
    { "subject": "Transaction", "actions": ["read", "create"] },
    { "subject": "Order", "actions": ["read", "create", "update"] },
    { "subject": "Voucher", "actions": ["read", "create", "update"] },
    { "subject": "Membership", "actions": ["read", "create", "update"] },
    { "subject": "MembershipPlan", "actions": ["read"] },
    { "subject": "Payment", "actions": ["read", "create", "update"] },
    { "subject": "ActiveService", "actions": ["read"] },
    { "subject": "Patient", "actions": ["read", "create"] },
    { "subject": "PsychologyOrder", "actions": ["read", "create"] },
    { "subject": "PsychologyPackage", "actions": ["read"] },
    { "subject": "RestaurantTable", "actions": ["read"] },
    { "subject": "RestaurantProduct", "actions": ["read"] },
    { "subject": "RestaurantCategory", "actions": ["read"] },
    { "subject": "Expense", "actions": ["read", "create"] },
    { "subject": "ExpenseCategory", "actions": ["read"] },
    { "subject": "PrinterSettings", "actions": ["read"] }
  ],
  "uiFlags": {
    "canManageUsers": false,
    "canManageRoles": false,
    "canViewLogs": false,
    "canManageSettings": false,
    "canManageTenant": false
  },
  "menuAccess": [
    "dashboard",
    "gym",
    "pos",
    "restaurant",
    "psychology"
  ]
}
```

#### **MANAGER**
```json
{
  "caslRules": [
    { "subject": "Dashboard", "actions": ["read"] },
    { "subject": "Member", "actions": ["read", "create", "update", "delete"] },
    { "subject": "CheckIn", "actions": ["read", "create", "update", "delete"] },
    { "subject": "Transaction", "actions": ["read"] },
    { "subject": "Membership", "actions": ["read", "create", "update", "delete"] },
    { "subject": "MembershipPlan", "actions": ["read", "create", "update", "delete"] },
    { "subject": "Payment", "actions": ["read", "create", "update"] },
    { "subject": "ActiveService", "actions": ["read", "update"] },
    { "subject": "GymReport", "actions": ["read"] },
    { "subject": "RestaurantReport", "actions": ["read"] },
    { "subject": "FinancialReport", "actions": ["read"] },
    { "subject": "StaffAttendance", "actions": ["read", "create", "update"] },
    { "subject": "EmployeeSchedule", "actions": ["read", "create", "update"] },
    { "subject": "Product", "actions": ["read", "create", "update", "delete"] },
    { "subject": "ProductCategory", "actions": ["read", "create", "update", "delete"] },
    { "subject": "RestaurantTable", "actions": ["read", "create", "update", "delete"] },
    { "subject": "RestaurantStock", "actions": ["read", "update"] },
    { "subject": "Order", "actions": ["read", "create", "update"] },
    { "subject": "Patient", "actions": ["read", "create", "update"] },
    { "subject": "PsychologyOrder", "actions": ["read", "create", "update"] },
    { "subject": "Income", "actions": ["read", "create", "update"] },
    { "subject": "Expense", "actions": ["read", "create", "update"] },
    { "subject": "User", "actions": ["read", "update"] }
  ],
  "uiFlags": {
    "canManageUsers": false,
    "canManageRoles": false,
    "canViewLogs": false,
    "canManageSettings": false,
    "canManageTenant": false
  },
  "menuAccess": [
    "dashboard",
    "gym",
    "pos",
    "restaurant",
    "classes",
    "finance",
    "reports",
    "psychology",
    "backoffice"
  ]
}
```

#### **TRAINER**
```json
{
  "caslRules": [
    { "subject": "Dashboard", "actions": ["read"] },
    { "subject": "Member", "actions": ["read"] },
    { "subject": "CheckIn", "actions": ["read", "create"] },
    { "subject": "PTSession", "actions": ["read", "update"] },
    { "subject": "PTPackage", "actions": ["read"] },
    { "subject": "TrainerCommission", "actions": ["read"] },
    { "subject": "ActiveService", "actions": ["read"] },
    { "subject": "Class", "actions": ["read", "update"] },
    { "subject": "ClassPackage", "actions": ["read"] }
  ],
  "uiFlags": {
    "canManageUsers": false,
    "canManageRoles": false,
    "canViewLogs": false,
    "canManageSettings": false,
    "canManageTenant": false
  },
  "menuAccess": [
    "dashboard",
    "gym"
  ]
}
```

#### **MEMBER (Portal Member)**
```json
{
  "caslRules": [
    {
      "subject": "User",
      "actions": ["read", "update"],
      "conditions": { "id": "$userId" }
    },
    {
      "subject": "Member",
      "actions": ["read", "update"],
      "conditions": { "userId": "$userId" }
    },
    {
      "subject": "Membership",
      "actions": ["read"],
      "conditions": { "memberId": "$memberId" }
    },
    {
      "subject": "Payment",
      "actions": ["read"],
      "conditions": { "memberId": "$memberId" }
    },
    {
      "subject": "CheckIn",
      "actions": ["read", "create"],
      "conditions": { "memberId": "$memberId" }
    },
    {
      "subject": "ActiveService",
      "actions": ["read"],
      "conditions": { "memberId": "$memberId" }
    }
  ],
  "uiFlags": {
    "canManageUsers": false,
    "canManageRoles": false,
    "canViewLogs": false,
    "canManageSettings": false,
    "canManageTenant": false
  },
  "menuAccess": [
    "profile",
    "myServices",
    "myPayments"
  ]
}
```

---

## 🔧 Request ke Backend Developer

### Prioritas 1: Fix caslRules Format ⚡
**Status: URGENT**

```javascript
// ❌ SALAH (sekarang)
{
  "action": "manage",      // Property "action" (singular, legacy)
  "subject": "all",
  "actions": []            // Array kosong
}

// ✅ BENAR (yang diinginkan)
{
  "subject": "all",        // Subject first
  "actions": ["manage"],   // Array dengan values, bukan kosong!
  "conditions": {          // Conditions (optional)
    "tenantId": "$tenantId"
  }
}
```

**Backend Action Required:**
- Hapus property `action` (singular)
- Pastikan `actions` adalah array dengan values
- Tambahkan `conditions` untuk field-level permission

---

### Prioritas 2: Ganti "Resource" dengan Subject Spesifik
**Status: HIGH PRIORITY**

**Backend Action Required:**
1. Update database schema:
```sql
-- Table: route_permissions
CREATE TABLE route_permissions (
  id UUID PRIMARY KEY,
  route_path VARCHAR(255) NOT NULL,
  http_method VARCHAR(10) NOT NULL,
  subject VARCHAR(100) NOT NULL,        -- Contoh: "Member", "Transaction", "CheckIn"
  required_actions JSONB NOT NULL,       -- ["read"] atau ["create", "update"]
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(route_path, http_method)
);
```

2. Seed initial data dengan mapping di atas
3. Update middleware untuk check permission berdasarkan subject, bukan "Resource"

---

### Prioritas 3: Endpoint untuk Generate/Manage Permissions
**Status: MEDIUM PRIORITY**

Backend perlu provide endpoints:

```bash
# 1. Get available subjects
GET /permissions/subjects
Response: {
  "subjects": [
    "Dashboard", "Member", "CheckIn", "Transaction", ...
  ]
}

# 2. Get routes metadata (untuk UI management)
GET /permissions/routes/metadata
Response: {
  "routes": [
    {
      "path": "/gym/members",
      "method": "GET",
      "subject": "Member",
      "actions": ["read"],
      "description": "Get list of members"
    },
    {
      "path": "/gym/members",
      "method": "POST",
      "subject": "Member",
      "actions": ["create"],
      "description": "Create new member"
    }
  ]
}

# 3. Generate CASL rules untuk role
POST /permissions/roles/:roleId/generate-casl
Body: {
  "subjects": [
    { "subject": "Member", "actions": ["read", "create", "update"] },
    { "subject": "CheckIn", "actions": ["read", "create"] }
  ]
}
Response: {
  "caslRules": [...],
  "rolePermissions": {...}
}

# 4. Preview permissions untuk role
GET /permissions/roles/:roleId/preview
Response: {
  "role": "cashier",
  "permissions": {
    "caslRules": [...],
    "allowedRoutes": [...],
    "allowedMenus": [...]
  }
}
```

---

### Prioritas 4: Migration Script
**Status: MEDIUM PRIORITY**

Backend perlu migration untuk convert existing permissions:

```javascript
// Migration: convert_resource_to_subjects.js
async function migratePermissions() {
  const roles = await db.roles.findAll()
  
  for (const role of roles) {
    const oldPermissions = role.permissions
    const newCaslRules = []
    
    // Convert old rolePermissions to caslRules
    if (oldPermissions.rolePermissions) {
      for (const [resource, actions] of Object.entries(oldPermissions.rolePermissions)) {
        const subject = resourceToSubject(resource) // "members" → "Member"
        
        newCaslRules.push({
          subject: subject,
          actions: actions,
          conditions: { tenantId: '$tenantId' }
        })
      }
    }
    
    // Save new format
    await db.roles.update(role.id, {
      permissions: {
        caslRules: newCaslRules,
        rolePermissions: oldPermissions.rolePermissions, // Keep for backward compatibility
        uiFlags: oldPermissions.uiFlags || {},
        menuAccess: oldPermissions.menuAccess || []
      }
    })
  }
}

// Helper: convert lowercase plural to PascalCase singular
function resourceToSubject(resource) {
  const RESOURCE_MAP = {
    'members': 'Member',
    'users': 'User',
    'checkIns': 'CheckIn',
    'checkins': 'CheckIn',
    'transactions': 'Transaction',
    'payments': 'Payment',
    // ... 65 mapping lainnya
  }
  
  return RESOURCE_MAP[resource] || resource
}
```

---

### Prioritas 5: Documentation
**Status: LOW PRIORITY**

Backend perlu dokumentasi:

1. **subjects.md** - List semua CASL subjects yang supported
2. **routes-mapping.md** - Mapping routes → subjects
3. **permission-examples.md** - Contoh caslRules per role
4. **migration-guide.md** - Cara migrate dari format lama ke baru

---

## 📊 Frontend Implementation (Already Done)

Frontend sudah siap untuk menerima format baru:

### File yang sudah diadaptasi:
1. ✅ `src/stores/auth.js` - Handle permissions dari login response
2. ✅ `src/composables/core/useNavigation.js` - Filter menu berdasarkan caslRules
3. ✅ `src/router/index.js` - Route guard check dengan CASL
4. ✅ `src/composables/admin/useRolesPermissions.js` - Skip caslRules/uiFlags dari iteration

### Frontend sudah handle:
- ✅ Parse `caslRules` array dengan `actions` array
- ✅ Fallback ke `rolePermissions` jika caslRules kosong
- ✅ Admin role bypass untuk development
- ✅ Debug logging (disabled by default)
- ✅ Fallback ke legacy `rule.action` (string) jika `actions` array kosong

---

## 🎯 Summary

### Backend TODO Checklist:
- [ ] Fix caslRules format: hapus `action` (string), isi `actions` (array)
- [ ] Buat tabel `route_permissions` dengan mapping route → subject
- [ ] Update middleware permission check untuk gunakan subject spesifik
- [ ] Buat endpoint `/permissions/subjects` dan `/permissions/routes/metadata`
- [ ] Buat migration script untuk convert "Resource" → specific subjects
- [ ] Test dengan role cashier, manager, trainer (bukan cuma admin)
- [ ] Dokumentasi mapping route → subject

### Frontend TODO Checklist:
- [x] Handle multiple permission formats (caslRules + rolePermissions)
- [x] Admin role bypass (temporary untuk development)
- [x] Debug logging dengan flag ENABLE_ACL_DEBUG
- [x] Fallback untuk backward compatibility
- [ ] Test dengan backend yang sudah fixed (setelah backend selesai)
- [ ] Remove admin bypass setelah backend production ready

---

## 📞 Contact

Jika ada pertanyaan atau butuh klarifikasi lebih lanjut:
- Frontend: Sudah siap, tinggal tunggu backend update
- Backend: Follow checklist di atas, prioritas 1-3 critical path

**Expected Timeline:**
- Prioritas 1 (Fix format): 1-2 hari
- Prioritas 2 (Mapping): 3-5 hari
- Prioritas 3 (Endpoints): 2-3 hari
- Prioritas 4 (Migration): 1-2 hari
- Testing: 2-3 hari

**Total: ~2 minggu untuk full implementation**
