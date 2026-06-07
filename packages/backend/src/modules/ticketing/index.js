/**
 * Ticketing Module - Main Export
 * 
 * Central export point for ticketing module
 * @module modules/ticketing
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
