// Navigation menu untuk gym management system
// Menggunakan permission resource/action untuk kontrol akses
// icon menggunakan tabler icons

// Mode tenant: 'gym' (default), 'fitness', atau 'full'
// - Mode 'gym': menu standar gym (Dashboard, Members, Classes, Memberships, Settings)
// - Mode 'fitness': menu fitness center lengkap (tambahan Personal Training, Nutrition)
// - Mode 'full': semua menu tampil

// requireModule: nama module yang dibutuhkan dari subscription (optional)
// Jika requireModule ada, menu hanya tampil jika subscription memiliki module tersebut
// Example: requireModule: "gym" → check modules.gym

// requireFeature: object { category, name } untuk check feature (optional)
// Jika requireFeature ada, menu hanya tampil jika subscription memiliki feature tersebut
// Example: requireFeature: { category: "transactions", name: "vouchers" }

export const navigation = [
  {
    label: "Dashboard",
    to: "/",
    icon: "layout-dashboard",
    menuKey: "dashboard",
    action: "read",
    subject: "Dashboard",
    modes: ["gym", "fitness", "full"], // tersedia di semua mode
    requireModule: "dashboard", // Requires dashboard module
  },
  {
    label: "Cash Register",
    icon: "report-money",
    menuKey: "cash-register",
    action: "read",
    subject: "CashRegisterSession",
    modes: ["gym", "fitness", "full"],
    requireModule: "gym",
    children: [
      {
        label: "Shift Kasir",
        to: "/cash-register",
        icon: "cash-register",
        menuKey: "cash-register.shift",
        action: "create",
        subject: "CashRegisterSession",
      },
      {
        label: "Dashboard Kasir",
        to: "/cash-register/dashboard",
        icon: "report-money",
        menuKey: "cash-register.dashboard",
        action: "read",
        subject: "CashRegisterSession",
      },
      {
        label: "Riwayat Shift",
        to: "/cash-register/history",
        icon: "history",
        menuKey: "cash-register.history",
        action: "read",
        subject: "CashRegisterSession",
      },
      {
        label: "Laporan Harian",
        to: "/cash-register/daily-report",
        icon: "calendar-stats",
        menuKey: "cash-register.daily-report",
        action: "read",
        subject: "CashRegisterSession",
      },
      {
        label: "Rekap Penjualan",
        to: "/cash-register/daily-summary",
        icon: "table",
        menuKey: "cash-register.daily-summary",
        action: "read",
        subject: "CashRegisterSession",
      },
    ],
  },
  {
    label: "Gym",
    icon: "barbell",
    menuKey: "gym",
    action: "read",
    subject: "Gym",
    modes: ["gym", "fitness", "full"],
    requireModule: "gym",
    children: [
      {
        label: "Dashboard",
        to: "/gym",
        icon: "layout-dashboard",
        menuKey: "gym.dashboard",
        action: "read",
        subject: "Gym",
      },
      {
        label: "Members",
        to: "/gym/members",
        icon: "users",
        menuKey: "gym.members",
        action: "read",
        subject: "Member",
      },
      {
        label: "Instructors",
        to: "/gym/instructors",
        icon: "user-star",
        menuKey: "gym.instructors",
        action: "read",
        subject: "Instructor",
      },
      {
        label: "Classes",
        icon: "calendar-clock",
        menuKey: "gym.classes",
        action: "read",
        subject: "Class",
        children: [
          {
            label: "Class Packages",
            to: "/gym/classes/packages",
            icon: "package",
            action: "read",
            subject: "ClassPackage",
          },
          {
            label: "Active Packages",
            to: "/gym/classes/active",
            icon: "calendar-check",
            action: "read",
            subject: "ClassPackage",
          },
        ],
      },
      {
        label: "Memberships",
        icon: "receipt",
        menuKey: "gym.memberships",
        action: "read",
        subject: "Membership",
        children: [
          {
            label: "Membership Plans",
            to: "/gym/memberships/plans",
            icon: "file-text",
            action: "read",
            subject: "MembershipPlan",
          },
          {
            label: "Active Memberships",
            to: "/gym/memberships/active",
            icon: "user-check",
            action: "read",
            subject: "Membership",
          },
        ],
      },
      {
        label: "Personal Training",
        icon: "barbell",
        menuKey: "gym.pt",
        action: "read",
        subject: "PersonalTraining",
        children: [
          {
            label: "PT Packages",
            to: "/gym/personal-training/packages",
            icon: "package",
            action: "read",
            subject: "PTPackage",
          },
          {
            label: "Active PT Packages",
            to: "/gym/personal-training/active",
            icon: "calendar-check",
            action: "read",
            subject: "PTPackage",
          },
          {
            label: "PT Sessions",
            to: "/gym/personal-training/sessions",
            icon: "calendar-time",
            action: "read",
            subject: "PTSession",
          },
        ],
      },
      // {
      //   label: "Spa & Wellness",
      //   icon: "massage",
      //   action: "read",
      //   subject: "Spa",
      //   modes: ["gym", "fitness", "full"],
      //   requireModule: "gym",
      //   children: [
      //     {
      //       label: "Spa Packages",
      //       to: "/gym/spa/packages",
      //       icon: "package",
      //       action: "read",
      //       subject: "Spa",
      //     },
      //     {
      //       label: "Active Spa Packages",
      //       to: "/gym/spa/active",
      //       icon: "calendar-check",
      //       action: "read",
      //       subject: "Spa",
      //     },
      //   ],
      // },
      {
        label: "Active Services",
        icon: "calendar-stats",
        menuKey: "gym.active-services",
        action: "read",
        subject: "ActiveService",
        children: [
          {
            label: "All Services",
            to: "/gym/active-services",
            icon: "list-details",
            action: "read",
            subject: "ActiveService",
          },
          {
            label: "Service Alerts",
            to: "/gym/active-services/alerts",
            icon: "bell-ringing",
            action: "read",
            subject: "ActiveService",
          },
          {
            label: "Service Calendar",
            to: "/gym/active-services/calendar",
            icon: "calendar-event",
            action: "read",
            subject: "ActiveService",
          },
          {
            label: "Walk-in Services",
            to: "/gym/active-services/walkin",
            icon: "door-enter",
            action: "read",
            subject: "ActiveService",
          },
          {
            label: "Add-on Items",
            to: "/gym/addon-items",
            icon: "shopping-bag",
            action: "read",
            subject: "ServicePlan",
          },
        ],
      },
      {
        label: "Check-ins",
        to: "/gym/check-ins",
        icon: "door-enter",
        menuKey: "gym.check-ins",
        action: "read",
        subject: "CheckIn",
      },
      {
        label: "Point of Sale",
        to: "/gym/transactions/pos",
        icon: "cash-register",
        menuKey: "gym.pos",
        action: "create",
        subject: "Transaction",
      },
      {
        label: "Batal Transaksi",
        to: "/gym/void-transactions",
        icon: "file-x",
        menuKey: "gym.void-transactions",
        action: "cancel",
        subject: "Transaction",
      },
      {
        label: "Reports",
        icon: "chart-bar",
        menuKey: "gym.reports",
        action: "read",
        subject: "GymReport",
        children: [
          {
            label: "Overview",
            to: "/gym/reports",
            icon: "dashboard",
            action: "read",
            subject: "GymReport",
          },
          {
            label: "Revenue Report",
            to: "/gym/reports/revenue",
            icon: "cash",
            action: "read",
            subject: "GymReport",
          },
          {
            label: "Profit & Loss",
            to: "/gym/reports/profit-loss",
            icon: "file-analytics",
            action: "read",
            subject: "GymReport",
          },
          {
            label: "Attendance",
            to: "/gym/reports/attendance",
            icon: "calendar-event",
            action: "read",
            subject: "GymReport",
          },
          {
            label: "Service Status",
            to: "/gym/reports/service-status",
            icon: "ticket",
            action: "read",
            subject: "GymReport",
          },
          {
            label: "Trainer Commissions",
            to: "/gym/reports/trainer-commissions",
            icon: "user-dollar",
            action: "read",
            subject: "TrainerCommission",
          },
        ],
      },
      // {
      //   label: "Nutrition",
      //   to: "/gym/nutrition",
      //   icon: "apple",
      //   action: "read",
      //   subject: "Nutrition",
      //   requireModule: "nutrition",
      // },
    ],
  },
  // {
  //   label: "Nutrition",
  //   to: "/nutrition",
  //   icon: "apple",
  //   action: "read",
  //   subject: "Nutrition",
  //   modes: ["gym", "fitness", "full"],
  //   requireModule: "nutrition",
  // },
  // {
  //   label: "Psychology",
  //   icon: "brain",
  //   action: "read",
  //   subject: "Psychology",
  //   modes: ["gym", "fitness", "full"],
  //   requireModule: "psychology",
  //   children: [
  //     {
  //       label: "Dashboard",
  //       to: "/psychology",
  //       icon: "layout-dashboard",
  //       action: "read",
  //       subject: "PsychologyDashboard",
  //     },
  //     {
  //       label: "Patients",
  //       to: "/psychology/patients",
  //       icon: "users",
  //       action: "read",
  //       subject: "Patient",
  //     },
  //     {
  //       label: "Packages",
  //       to: "/psychology/packages",
  //       icon: "package",
  //       action: "read",
  //       subject: "PsychologyPackage",
  //     },
  //     {
  //       label: "Orders",
  //       to: "/psychology/orders",
  //       icon: "receipt",
  //       action: "read",
  //       subject: "PsychologyOrder",
  //     },
  //     {
  //       label: "Sessions",
  //       to: "/psychology/sessions",
  //       icon: "clipboard",
  //       action: "read",
  //       subject: "PsychologySession",
  //     },
  //     {
  //       label: "Psikogram",
  //       to: "/psychology/psikogram",
  //       icon: "file-analytics",
  //       action: "read",
  //       subject: "PsychologySession",
  //     },
  //     {
  //       label: "Invitations",
  //       to: "/psychology/invitations",
  //       icon: "mail",
  //       action: "read",
  //       subject: "PsychologyInvitation",
  //     },
  //     {
  //       label: "Test Types",
  //       to: "/psychology/test-types",
  //       icon: "list-check",
  //       action: "manage",
  //       subject: "TestType",
  //     },
  //     {
  //       label: "Session Logs",
  //       to: "/psychology/logs",
  //       icon: "file-text",
  //       action: "manage",
  //       subject: "PsychologyLogs",
  //     },
  //     {
  //       label: "Billing Report",
  //       to: "/psychology/reports/billing",
  //       icon: "report-money",
  //       action: "read",
  //       subject: "PsychologySession",
  //     },
  //     {
  //       label: "Price Rules",
  //       to: "/psychology/price-rules",
  //       icon: "discount",
  //       action: "manage",
  //       subject: "PriceRule",
  //     },
  //     {
  //       label: "Settings",
  //       to: "/psychology/settings",
  //       icon: "settings",
  //       action: "manage",
  //       subject: "PsychologySettings",
  //     },
  //   ],
  // },
  {
    label: "Restaurant",
    icon: "tools-kitchen-2",
    menuKey: "restaurant",
    action: "read",
    subject: "Transaction",
    modes: ["gym", "fitness", "full"],
    requireModule: "restaurant",
    children: [
      {
        label: "Dashboard",
        to: "/restaurant",
        icon: "dashboard",
        menuKey: "restaurant.dashboard",
        action: "read",
        subject: "Transaction",
      },
      {
        label: "Categories",
        to: "/restaurant/categories",
        icon: "folder",
        menuKey: "restaurant.categories",
        action: "read",
        subject: "RestaurantCategory",
      },
      {
        label: "Products",
        to: "/restaurant/products",
        icon: "package",
        menuKey: "restaurant.products",
        action: "read",
        subject: "RestaurantProduct",
      },
      {
        label: "Locations",
        to: "/restaurant/locations",
        icon: "map-pin",
        menuKey: "restaurant.locations",
        action: "read",
        subject: "RestaurantLocation",
      },
      {
        label: "Tables",
        to: "/restaurant/tables",
        icon: "armchair",
        menuKey: "restaurant.tables",
        action: "read",
        subject: "RestaurantTable",
      },
      {
        label: "Floor Plan",
        to: "/restaurant/tables/floor-plan",
        icon: "layout-grid",
        menuKey: "restaurant.floor-plan",
        action: "manage",
        subject: "RestaurantTable",
      },
      {
        label: "Kasir POS",
        to: "/restaurant/pos/floor-plan-pos",
        icon: "cash-register",
        menuKey: "restaurant.floor-plan-pos",
        action: "create",
        subject: "Transaction",
      },
      // {
      //   label: "POS",
      //   to: "/restaurant/pos",
      //   icon: "shopping-cart",
      //   action: "create",
      //   subject: "Order",
      // },
      {
        label: "Orders",
        to: "/restaurant/orders",
        icon: "receipt",
        menuKey: "restaurant.orders",
        action: "read",
        subject: "Transaction",
      },
      {
        label: "Batal Transaksi",
        to: "/restaurant/void-transactions",
        icon: "file-x",
        menuKey: "restaurant.void-transactions",
        action: "cancel",
        subject: "Transaction",
      },
      // {
      //   label: "Queue Management",
      //   to: "/restaurant/queue/manage",
      //   icon: "list-numbers",
      //   action: "manage",
      //   subject: "Order",
      // },
      // {
      //   label: "Kitchen Display",
      //   to: "/restaurant/kitchen/display",
      //   icon: "chef-hat",
      //   action: "read",
      //   subject: "Order",
      // },
      {
        label: "Stock",
        icon: "box",
        menuKey: "restaurant.stock",
        action: "read",
        subject: "RestaurantStock",
        children: [
          {
            label: "Overview",
            to: "/restaurant/stock",
            icon: "chart-bar",
            action: "read",
            subject: "RestaurantStock",
          },
          {
            label: "Movements",
            to: "/restaurant/stock/movements",
            icon: "history",
            action: "read",
            subject: "RestaurantStock",
          },
          {
            label: "Transfers",
            to: "/restaurant/stock/transfers",
            icon: "transfer",
            action: "read",
            subject: "RestaurantStock",
          },
          {
            label: "Alerts",
            to: "/restaurant/stock/alerts",
            icon: "alert-triangle",
            action: "read",
            subject: "RestaurantStock",
          },
        ],
      },
      {
        label: "Reports",
        icon: "chart-bar",
        menuKey: "restaurant.reports",
        action: "read",
        subject: "RestaurantReport",
        children: [
          {
            label: "Overview",
            to: "/restaurant/reports",
            icon: "dashboard",
            action: "read",
            subject: "RestaurantReport",
          },
          {
            label: "Sales Report",
            to: "/restaurant/reports/sales",
            icon: "cash",
            action: "read",
            subject: "RestaurantReport",
          },
          {
            label: "Product Performance",
            to: "/restaurant/reports/products",
            icon: "shopping-cart",
            action: "read",
            subject: "RestaurantReport",
          },
          {
            label: "Table Analytics",
            to: "/restaurant/reports/tables",
            icon: "armchair",
            action: "read",
            subject: "RestaurantReport",
          },
          {
            label: "Daily Summary",
            to: "/restaurant/reports/daily",
            icon: "calendar",
            action: "read",
            subject: "RestaurantReport",
          },
        ],
      },
    ],
  },
  // {
  //   label: "Point of Sale",
  //   to: "/billing/combined",
  //   icon: "receipt-2",
  //   action: "read", // Changed from "manage" and subject "Settings"
  //   subject: "Transaction", // Use existing Transaction subject
  //   modes: ["gym", "fitness", "full"],
  //   requireModule: "pos",
  // },
  {
    label: "Vouchers",
    to: "/vouchers",
    icon: "ticket",
    menuKey: "vouchers",
    action: "read",
    subject: "Voucher",
    requireFeature: { category: "transactions", name: "vouchers" },
  },
  {
    label: "Back Office",
    icon: "building-skyscraper",
    menuKey: "back-office",
    action: "read",
    subject: "BackOffice",
    modes: ["gym", "fitness", "full"],
    requireModule: "gym",
    children: [
      {
        label: "Staff Attendance",
        to: "/gym/hikvision/attendance",
        icon: "fingerprint",
        menuKey: "back-office.attendance",
        action: "read",
        subject: "StaffAttendance",
      },
      {
        label: "Attendance Report",
        to: "/gym/hikvision/attendance/report",
        icon: "report-analytics",
        menuKey: "back-office.attendance-report",
        action: "read",
        subject: "StaffAttendance",
      },
      {
        label: "Devices",
        to: "/gym/hikvision/devices",
        icon: "device-cctv",
        menuKey: "back-office.devices",
        action: "read",
        subject: "HikvisionDevice",
      },
      {
        label: "Employee",
        to: "/gym/hikvision/employees",
        icon: "users-group",
        menuKey: "back-office.employee",
        action: "read",
        subject: "HikvisionDevice",
      },
      {
        label: "Employee Schedule",
        to: "/gym/backoffice/employee-schedule",
        icon: "clock-hour-4",
        menuKey: "back-office.schedule",
        action: "read",
        subject: "EmployeeSchedule",
      },
      // {
      //   label: "Staff Mapping",
      //   to: "/gym/hikvision/staff-mapping",
      //   icon: "link",
      //   action: "manage",
      //   subject: "HikvisionDevice",
      // },
    ],
  },
  {
    label: "Finances",
    icon: "file-invoice",
    menuKey: "finances",
    action: "read",
    subject: "Finance",
    modes: ["gym", "fitness", "full"],
    requireModule: "finance",
    children: [
      {
        label: "Dashboard",
        to: "/finances",
        icon: "file-invoice",
        menuKey: "finances.dashboard",
        action: "read",
        subject: "FinanceDashboard",
      },
      {
        label: "Expenses",
        to: "/finances/expenses",
        icon: "file-invoice",
        menuKey: "finances.expenses",
        action: "read",
        subject: "Expense",
      },
      {
        label: "Petty Cash",
        to: "/finances/petty-cash",
        icon: "wallet",
        menuKey: "finances.petty-cash",
        action: "read",
        subject: "PettyCash",
      },
      {
        label: "Vault",
        to: "/finances/vault",
        icon: "building-bank",
        menuKey: "finances.vault",
        action: "read",
        subject: "Finance",
      },
      {
        label: "Income",
        to: "/finances/incomes",
        icon: "trending-up",
        menuKey: "finances.incomes",
        action: "read",
        subject: "Income",
      },
      {
        label: "Cash Flow",
        to: "/finances/cash-flow",
        icon: "cash",
        menuKey: "finances.cash-flow",
        action: "read",
        subject: "CashFlow",
      },
      {
        label: "Top Selling",
        to: "/finances/analytics",
        icon: "chart-bar",
        menuKey: "finances.analytics",
        action: "read",
        subject: "Finance",
      },
      {
        label: "Transactions",
        to: "/finances/transactions",
        icon: "receipt",
        menuKey: "finances.transactions",
        action: "read",
        subject: "Transaction",
      },
      {
        label: "Pemegang Saham",
        to: "/finances/shareholders",
        icon: "users",
        menuKey: "finances.shareholders",
        action: "read",
        subject: "FinancialReport",
      },
      {
        label: "Reports",
        icon: "chart-bar",
        menuKey: "finances.reports",
        action: "read",
        subject: "FinancialReport",
        children: [
          {
            label: "Profit & Loss",
            to: "/finances/reports/profit-loss",
            icon: "file-analytics",
            action: "read",
            subject: "FinancialReport",
          },
          {
            label: "Revenue",
            to: "/finances/reports/revenue",
            icon: "chart-line",
            action: "read",
            subject: "FinancialReport",
          },
          {
            label: "Pengeluaran",
            to: "/finances/reports/expenses",
            icon: "file-invoice",
            action: "read",
            subject: "FinancialReport",
          },
          {
            label: "Komisi Layanan",
            to: "/finances/reports/service-commission",
            icon: "receipt-2",
            action: "read",
            subject: "FinancialReport",
          },
          {
            label: "Distribusi Saham",
            to: "/finances/reports/shareholder",
            icon: "chart-pie",
            action: "read",
            subject: "FinancialReport",
          },
        ],
      },
    ],
  },
  {
    label: "Reports",
    icon: "chart-bar",
    menuKey: "reports",
    action: "read",
    subject: "Reports",
    modes: ["gym", "fitness", "full"],
    requireModule: "reports", // Requires reports module
    children: [
      {
        label: "Revenue",
        to: "/reports/revenue",
        icon: "cash",
        menuKey: "reports.revenue",
        action: "read",
        subject: "RevenueReport",
      },
      {
        label: "Attendance",
        to: "/reports/attendance",
        icon: "clock",
        menuKey: "reports.attendance",
        action: "read",
        subject: "AttendanceReport",
      },
      {
        label: "Member Stats",
        to: "/reports/members",
        icon: "chart-line",
        menuKey: "reports.member-stats",
        action: "read",
        subject: "MemberReport",
      },
      {
        label: "Service Reports",
        to: "/gym/reports/services",
        icon: "ticket",
        menuKey: "reports.service-reports",
        action: "read",
        subject: "GymReport",
      },
      {
        label: "Product Reports",
        to: "/gym/reports/products",
        icon: "package",
        menuKey: "reports.product-reports",
        action: "read",
        subject: "GymReport",
      },
      {
        label: "Staff Reports",
        to: "/gym/reports/staff",
        icon: "user-square",
        menuKey: "reports.staff-reports",
        action: "read",
        subject: "GymReport",
      },
      {
        label: "Forecasting",
        to: "/gym/reports/forecasting",
        icon: "chart-line",
        menuKey: "reports.forecasting",
        action: "read",
        subject: "GymReport",
      },
    ],
  },
  {
    label: "Subscription",
    icon: "crown",
    menuKey: "subscription",
    action: "manage",
    subject: "Subscription",
    modes: ["gym", "fitness", "full"],
    requireSuperAdmin: true, // hanya untuk admin dengan isSuperAdmin = true
    children: [
      {
        label: "Plans",
        to: "/subscription/plans",
        icon: "package",
        action: "manage",
        subject: "SubscriptionPlan",
      },
      {
        label: "Subscriptions",
        to: "/subscription/subscriptions",
        icon: "receipt",
        action: "manage",
        subject: "Subscription",
      },
      {
        label: "Tenants",
        to: "/subscription/tenants",
        icon: "building",
        action: "manage",
        subject: "Tenant",
      },
      {
        label: "Billing",
        to: "/subscription/billing",
        icon: "credit-card",
        action: "manage",
        subject: "Billing",
      },
    ],
  },
  {
    label: "Settings",
    to: "/core/settings",
    icon: "settings",
    menuKey: "settings",
    action: "read", // Changed from "manage" - Settings tabs have their own permissions
    subject: "Settings",
    modes: ["gym", "fitness", "full"],
  },
];

/**
 * Filter navigation berdasarkan mode tenant dan user permissions
 * @param {string} mode - Mode tenant: 'gym', 'fitness', atau 'full'
 * @param {Object} user - User object dengan role dan isSuperAdmin flag
 * @returns {Array} Navigation items yang sesuai dengan mode dan permissions
 */
export function getNavigationByMode(mode = "gym", user = null) {
  if (!mode) mode = "gym"; // default ke gym

  return navigation.filter((item) => {
    // Filter berdasarkan mode
    if (item.modes && Array.isArray(item.modes)) {
      if (!item.modes.includes(mode)) {
        return false;
      }
    }

    // Filter berdasarkan requireSuperAdmin
    if (item.requireSuperAdmin === true) {
      if (!user || !user.isSuperAdmin) {
        return false;
      }
    }

    // Filter berdasarkan roles (untuk backward compatibility)
    if (item.roles && Array.isArray(item.roles)) {
      if (!user || !item.roles.includes(user.role)) {
        return false;
      }
    }

    return true;
  });
}
