/**
 * Restaurant Module - Main Export
 * 
 * Central export point for restaurant module
 * @module modules/restaurant
 */

const models = require('./models');
const controllers = require('./controllers');
const routes = require('./routes');
const services = require('./services');
const utils = require('./utils');

module.exports = {
  models,
  controllers,
  routes,
  services,
  utils
};
