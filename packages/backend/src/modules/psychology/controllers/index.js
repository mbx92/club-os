'use strict';

/**
 * Psychology Module Controllers
 */

const testTypeController = require('./testTypeController');
const patientController = require('./patientController');
const packageController = require('./packageController');
const priceRuleController = require('./priceRuleController');
const orderController = require('./orderController');
const sessionController = require('./sessionController');
const publicController = require('./publicController');
const invitationController = require('./invitationController');
const dashboardController = require('./dashboardController');
const reportController = require('./reportController');
const psikogramController = require('./psikogramController');
const settingsController = require('./settingsController');
const utilityController = require('./utilityController');
const sessionLogController = require('./sessionLogController');
const sessionProgressController = require('./sessionProgressController');

module.exports = {
  testTypeController,
  patientController,
  packageController,
  priceRuleController,
  orderController,
  sessionController,
  publicController,
  invitationController,
  dashboardController,
  reportController,
  psikogramController,
  settingsController,
  utilityController,
  sessionLogController,
  sessionProgressController
};
