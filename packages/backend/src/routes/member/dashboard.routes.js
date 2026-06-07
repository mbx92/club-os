const express = require('express');
const { getDashboard } = require('../../controllers/member/memberDashboardController');
const { authenticate } = require('../../middlewares/authMiddleware');
const auditLog = require('../../middlewares/auditMiddleware');

const router = express.Router();

/**
 * @route GET /member/dashboard
 * @name member.dashboard
 * @desc Get member dashboard with active services, stats, and recent transactions
 * @access Private - Member role only
 */
router.get('/',
  authenticate,
  auditLog('MEMBER_DASHBOARD_VIEW'),
  getDashboard
);

module.exports = router;
