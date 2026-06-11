/**
 * Member Report Routes
 * Mount path: /reports/members
 */
const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/permissionMiddleware');
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
  authorize('read', 'Member'),
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
  authorize('read', 'Member'),
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
  authorize('read', 'Member'),
  getMemberRetentionReport
);

module.exports = router;
