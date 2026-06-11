/**
 * Gym Report Routes
 * Mount path: /reports/gym
 */
const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/permissionMiddleware');
const {
  getGymOverview,
  getCheckInTrends,
  getMembershipStats
} = require('../../controllers/reports');

const router = express.Router();

/**
 * @route GET /reports/gym/overview
 * @desc Gym overview: active members, check-ins today/week/month, active services
 * @access Private (read Member)
 */
router.get('/overview',
  authenticate,
  authorize('read', 'Member'),
  getGymOverview
);

/**
 * @route GET /reports/gym/checkin-trends
 * @desc Check-in trends over time with forecasting
 * @query startDate, endDate, groupBy (daily|weekly|monthly)
 * @access Private (read CheckIn)
 */
router.get('/checkin-trends',
  authenticate,
  authorize('read', 'CheckIn'),
  getCheckInTrends
);

/**
 * @route GET /reports/gym/membership-stats
 * @desc Membership/service plan statistics
 * @access Private (read ActiveService)
 */
router.get('/membership-stats',
  authenticate,
  authorize('read', 'ActiveService'),
  getMembershipStats
);

module.exports = router;
