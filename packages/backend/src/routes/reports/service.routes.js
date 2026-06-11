/**
 * Service Report Routes
 * Mount path: /reports/services
 */
const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/permissionMiddleware');
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
  authorize('read', 'Transaction'),
  getServicePerformance
);

/**
 * @route GET /reports/services/active
 * @desc Active services breakdown and expiry report
 * @access Private (read ActiveService)
 */
router.get('/active',
  authenticate,
  authorize('read', 'ActiveService'),
  getActiveServicesReport
);

module.exports = router;
