'use strict';

const express = require('express');
const router = express.Router();

// Import all core route modules
const authRoutes = require('./auth');
const userRoutes = require('./user');
const tenantRoutes = require('./tenant');
const systemRoutes = require('./system/printerSettings.routes');

// Export for main router
module.exports = {
  authRoutes,
  userRoutes,
  tenantRoutes,
  systemRoutes
};
