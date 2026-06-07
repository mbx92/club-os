const express = require('express');
const router = express.Router();

// Core module routes (auth, user, tenant, system)
const { authRoutes } = require('./core/auth');
const { userRoutes } = require('./core/user');
const { tenantRoutes, transactionSettingsRoutes } = require('./core/tenant');
const { permissionRoutes, featureSyncRoutes, logsRoutes, printerSettingsRoutes, receiptTemplateRoutes, receiptSettingsRoutes } = require('./core/system');
const schedulerRoutes = require('./admin/scheduler.routes');
const databaseRoutes = require('./admin/database.routes');

// Business module routes
const { billingRoutes, subscriptionRoutes } = require('./subscription');
const { voucherRoutes } = require('./voucher');
const { posRoutes, restaurantRoutes, membersRoutes, trainerRoutes, transactionRoutes, checkInRoutes, servicePlansRouter, activeServicesRouter, serviceManagementRouter, reportRoutes, dashboardRoutes, ptSessionsRoutes, cashRegisterRoutes, staffAttendanceRoutes, employeeScheduleRoutes, employeeScheduleTemplateRoutes, shiftRoutes, schedulePeriodRoutes } = require('./gym');
const restaurantModuleRoutes = require('../modules/restaurant/routes');
const metricsRoutes = require('./metricsRoutes');

// Integration routes
const { hikvisionRoutes } = require('./integrations');

// Member portal routes
const memberPortalRoutes = require('./member');

// Main dashboard routes
const { dashboardRoutes: mainDashboardRoutes } = require('./dashboard');

// Reports module routes (dedicated report endpoints)
const {
  gymReportRoutes,
  restaurantReportRoutes,
  productReportRoutes,
  serviceReportRoutes,
  financeReportRoutes: reportsFinanceRoutes,
  commissionReportRoutes,
  staffReportRoutes,
  memberReportRoutes,
  forecastingReportRoutes,
  dailyReportRoutes
} = require('./reports');

// Finance module routes
const { 
  expenseRoutes, 
  expenseCategoryRoutes, 
  incomeRoutes,
  incomeCategoryRoutes,
  cashFlowRoutes,
  reportRoutes: financeReportRoutes,
  financeDashboardRoutes,
  analyticsRoutes,
  pettyCashRoutes,
  supplierRoutes,
  shareholderRoutes
} = require('./finance');

// ==========================================
// CORE ROUTES (Infrastructure)
// ==========================================

// Auth module
router.use('/auth', authRoutes);

// User module
router.use('/users', userRoutes);

// Tenant module
router.use('/tenants', tenantRoutes);
router.use('/transaction-settings', transactionSettingsRoutes);

// System module
router.use('/permissions', permissionRoutes);
router.use('/admin/features', featureSyncRoutes);
router.use('/admin/scheduler', schedulerRoutes);
router.use('/admin/database', databaseRoutes);
router.use('/logs', logsRoutes);
router.use('/system/printers', printerSettingsRoutes);
router.use('/system/receipt-templates', receiptTemplateRoutes);
router.use('/system/receipt-settings', receiptSettingsRoutes);

// ==========================================
// BUSINESS ROUTES (Domain Logic)
// ==========================================

// Subscription module
router.use('/subscription', subscriptionRoutes);
router.use('/billing', billingRoutes);
// Transaction module
router.use('/transactions', transactionRoutes);

// Voucher module
router.use('/vouchers', voucherRoutes);

// Main Dashboard (unified view of all modules)
router.use('/dashboard', mainDashboardRoutes);

// Finance module
router.use('/finance/dashboard', financeDashboardRoutes);
router.use('/finance/expenses', expenseRoutes);
router.use('/finance/expense-categories', expenseCategoryRoutes);
router.use('/finance/incomes', incomeRoutes);
router.use('/finance/income-categories', incomeCategoryRoutes);
router.use('/finance/cash-flow', cashFlowRoutes);
router.use('/finance/reports', financeReportRoutes);
router.use('/finance/analytics', analyticsRoutes);
router.use('/finance/petty-cash', pettyCashRoutes);
router.use('/finance/suppliers', supplierRoutes);
router.use('/finance/shareholders', shareholderRoutes);

// Gym module (feature-gated)
router.use('/modules/pos', posRoutes);
router.use('/modules/restaurant', restaurantRoutes); // Legacy gym restaurant routes
router.use('/gym/members', membersRoutes);
router.use('/gym/trainers', trainerRoutes);
router.use('/gym/check-ins', checkInRoutes);
router.use('/gym/reports', reportRoutes);
router.use('/gym/dashboard', dashboardRoutes);
router.use('/gym/pt-sessions', ptSessionsRoutes);
router.use('/gym/cash-register', cashRegisterRoutes);
router.use('/gym/staff-attendance', staffAttendanceRoutes);
router.use('/gym/employee-schedules', employeeScheduleRoutes);
router.use('/gym/employee-schedule-templates', employeeScheduleTemplateRoutes);
router.use('/gym/shifts', shiftRoutes);
router.use('/gym/schedule-periods', schedulePeriodRoutes);

// ==========================================
// REPORTS MODULE (Dedicated Report Endpoints)
// ==========================================
router.use('/reports/gym', gymReportRoutes);
router.use('/reports/restaurant', restaurantReportRoutes);
router.use('/reports/products', productReportRoutes);
router.use('/reports/services', serviceReportRoutes);
router.use('/reports/finance', reportsFinanceRoutes);
router.use('/reports/commissions', commissionReportRoutes);
router.use('/reports/staff', staffReportRoutes);
router.use('/reports/members', memberReportRoutes);
router.use('/reports/forecasting', forecastingReportRoutes);
router.use('/reports/daily', dailyReportRoutes);

// Integration routes (Hikvision fingerprint devices)
router.use('/integrations/hikvision', hikvisionRoutes);

// Restaurant module (new modular structure)
router.use('/restaurant', restaurantModuleRoutes);

// Service module (unified service management)
router.use('/service/plans', servicePlansRouter);
router.use('/service/active', activeServicesRouter);
router.use('/service/management', serviceManagementRouter);

// Alias for backward compatibility
router.use('/services', activeServicesRouter);

// Member Portal (self-service member dashboard and actions)
router.use('/member', memberPortalRoutes);

// Metrics
router.use('/', metricsRoutes);

// ==========================================
// Midtrans Payment Gateway Routes
// ==========================================
const paymentRoutes = require('../modules/payment-getway/routes/payment.routes');
router.use('/payment/midtrans', paymentRoutes);

module.exports = router;
