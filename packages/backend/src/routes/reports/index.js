/**
 * Reports Module - Route Index
 * Aggregates all report route groups
 */
const gymReportRoutes = require('./gym.routes');
const restaurantReportRoutes = require('./restaurant.routes');
const productReportRoutes = require('./product.routes');
const serviceReportRoutes = require('./service.routes');
const financeReportRoutes = require('./finance.routes');
const commissionReportRoutes = require('./commission.routes');
const staffReportRoutes = require('./staff.routes');
const memberReportRoutes = require('./member.routes');
const forecastingReportRoutes = require('./forecasting.routes');
const dailyReportRoutes = require('./daily.routes');

module.exports = {
  gymReportRoutes,
  restaurantReportRoutes,
  productReportRoutes,
  serviceReportRoutes,
  financeReportRoutes,
  commissionReportRoutes,
  staffReportRoutes,
  memberReportRoutes,
  forecastingReportRoutes,
  dailyReportRoutes
};
