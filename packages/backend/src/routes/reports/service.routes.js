/**
 * Service Report Routes
 * Mount path: /reports/services
 */
const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../middlewares/caslMiddleware');
const {
  getServicePerformance,
  getActiveServicesReport
} = require('../../controllers/reports');

const router = express.Router();

/**
 * @route GET /reports/services/performance
 * @desc Service sales performance over time
 * @query startDate, endDate, groupBy (daily|weekly|monthly), serviceType
 * @access Private (read Transaction)
 */
router.get('/performance',
  authenticate,
  authorizeCasl('read', 'Transaction'),
  getServicePerformance
);

/**
 * @route GET /reports/services/active
 * @desc Active services breakdown and expiry report
 * @access Private (read ActiveService)
 */
router.get('/active',
  authenticate,
  authorizeCasl('read', 'ActiveService'),
  getActiveServicesReport
);

module.exports = router;
