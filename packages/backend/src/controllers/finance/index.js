const expenseController = require('./expenseController');
const expenseCategoryController = require('./expenseCategoryController');
const incomeController = require('./incomeController');
const incomeCategoryController = require('./incomeCategoryController');
const cashFlowController = require('./cashFlowController');
const reportController = require('./reportController');
const financeDashboardController = require('./financeDashboardController');
const dashboardController = require('./dashboardController');
const topSellingController = require('./topSellingController');
const pettyCashController = require('./pettyCashController');
const supplierController = require('./supplierController');

module.exports = {
  ...expenseController,
  ...expenseCategoryController,
  ...incomeController,
  ...incomeCategoryController,
  ...cashFlowController,
  ...reportController,
  ...financeDashboardController,
  ...dashboardController,
  ...topSellingController,
  ...pettyCashController,
  ...supplierController
};
