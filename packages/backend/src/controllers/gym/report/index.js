const reportController = require('./reportController');
const dashboardController = require('./dashboardController');

module.exports = {
  ...reportController,
  ...dashboardController
};
