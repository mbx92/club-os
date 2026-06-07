/**
 * Reports Module - Controller Index
 * Aggregates all report controllers
 */
const gymReportController = require('./gymReportController');
const restaurantReportController = require('./restaurantReportController');
const productReportController = require('./productReportController');
const serviceReportController = require('./serviceReportController');
const financeReportController = require('./financeReportController');
const commissionReportController = require('./commissionReportController');
const staffReportController = require('./staffReportController');
const memberReportController = require('./memberReportController');
const forecastingReportController = require('./forecastingReportController');
const dailyReportController = require('./dailyReportController');

module.exports = {
  ...gymReportController,
  ...restaurantReportController,
  ...productReportController,
  ...serviceReportController,
  ...financeReportController,
  ...commissionReportController,
  ...staffReportController,
  ...memberReportController,
  ...forecastingReportController,
  ...dailyReportController
};
