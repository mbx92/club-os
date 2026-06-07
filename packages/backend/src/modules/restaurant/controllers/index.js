/**
 * Restaurant Module - Controllers Index
 * 
 * Exports all restaurant endpoint controllers
 * @module modules/restaurant/controllers
 */

const productController = require('./productController');
const productCategoryController = require('./productCategoryController');
const productExtraController = require('./productExtraController');
const tableController = require('./tableController');
const locationController = require('./locationController');
const stockMovementController = require('./stockMovementController');
const orderController = require('./orderController');
const combinedBillingController = require('./combinedBillingController');
const reportController = require('./reportController');
const dashboardController = require('./dashboardController');

module.exports = {
  productController,
  productCategoryController,
  productExtraController,
  tableController,
  locationController,
  stockMovementController,
  orderController,
  combinedBillingController,
  reportController,
  dashboardController
};
