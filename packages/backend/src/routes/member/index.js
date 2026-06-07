const express = require('express');
const router = express.Router();

// Import member sub-routes
const dashboardRoutes = require('./dashboard.routes');
const serviceRoutes = require('./service.routes');
const transactionRoutes = require('./transaction.routes');
const restaurantRoutes = require('./restaurant.routes');

/**
 * Member Portal Routes
 * Base path: /api/v1/member
 * 
 * All routes require authentication and are intended for member role.
 * Additional role checking can be added via CASL middleware if needed.
 */

// Mount sub-routes
router.use('/dashboard', dashboardRoutes);
router.use('/services', serviceRoutes);
router.use('/transactions', transactionRoutes);
router.use('/restaurant', restaurantRoutes);

module.exports = router;
