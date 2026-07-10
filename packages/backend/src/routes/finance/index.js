const accountRoutes = require('./account.routes');
const vaultRoutes = require('./vault.routes');
const expenseRoutes = require('./expense.routes');
const expenseCategoryRoutes = require('./expenseCategory.routes');
const incomeRoutes = require('./income.routes');
const incomeCategoryRoutes = require('./incomeCategory.routes');
const cashFlowRoutes = require('./cashFlow.routes');
const reportRoutes = require('./report.routes');
const financeDashboardRoutes = require('./dashboard.routes');
const analyticsRoutes = require('./analytics.routes');
const pettyCashRoutes = require('./pettyCash.routes');
const supplierRoutes = require('./supplier.routes');
const shareholderRoutes = require('./shareholder.routes');

module.exports = {
  accountRoutes,
  expenseRoutes,
  expenseCategoryRoutes,
  incomeRoutes,
  incomeCategoryRoutes,
  cashFlowRoutes,
  reportRoutes,
  financeDashboardRoutes,
  analyticsRoutes,
  pettyCashRoutes,
  supplierRoutes,
  vaultRoutes,
  shareholderRoutes
};
