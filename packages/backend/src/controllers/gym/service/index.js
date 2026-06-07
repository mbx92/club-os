const servicePlanController = require('./servicePlanController');
const activeServiceController = require('./activeServiceController');
const serviceManagementController = require('./serviceManagementController');

module.exports = {
  ...servicePlanController,
  ...activeServiceController,
  ...serviceManagementController
};
