'use strict';

/**
 * Dashboard Routes - Ticketing Module
 * 
 * Routes for ticketing analytics and dashboard
 * @module modules/ticketing/routes/dashboard
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

// All routes require authentication and ticketing module access
router.use(authenticate);
router.use(requireModule('ticketing'));

/**
 * @route GET /api/v1/ticketing/dashboard/stats
 * @desc Get dashboard statistics
 * @access Private - requires 'read' permission on 'Ticket'
 */
router.get('/stats',
  authorizeCasl('read', 'Ticket'),
  dashboardController.getDashboardStats
);

/**
 * @route GET /api/v1/ticketing/dashboard/trends
 * @desc Get ticket trends over time
 * @access Private - requires 'read' permission on 'Ticket'
 */
router.get('/trends',
  authorizeCasl('read', 'Ticket'),
  dashboardController.getTicketTrends
);

module.exports = router;
