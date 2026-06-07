/**
 * Member Report Routes
 * Mount path: /reports/members
 */
const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../middlewares/caslMiddleware');
const {
  getActiveMembersReport,
  getMemberGrowthReport,
  getMemberRetentionReport
} = require('../../controllers/reports');

const router = express.Router();

/**
 * @route GET /reports/members/active
 * @desc Active member report with service details
 * @query search, gender, membershipStatus
 * @access Private (read Member)
 */
router.get('/active',
  authenticate,
  authorizeCasl('read', 'Member'),
  getActiveMembersReport
);

/**
 * @route GET /reports/members/growth
 * @desc Member growth trends with forecasting
 * @query startDate, endDate, groupBy (daily|weekly|monthly|yearly)
 * @access Private (read Member)
 */
router.get('/growth',
  authenticate,
  authorizeCasl('read', 'Member'),
  getMemberGrowthReport
);

/**
 * @route GET /reports/members/retention
 * @desc Member retention/churn cohort analysis
 * @query months (lookback months, default 6)
 * @access Private (read Member)
 */
router.get('/retention',
  authenticate,
  authorizeCasl('read', 'Member'),
  getMemberRetentionReport
);

module.exports = router;
