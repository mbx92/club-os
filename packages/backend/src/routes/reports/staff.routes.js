/**
 * Staff Report Routes
 * Mount path: /reports/staff
 */
const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/permissionMiddleware');
const {
  getStaffAttendanceReport,
  getDailyStaffComposition,
  getShiftSummary
} = require('../../controllers/reports');

const router = express.Router();

/**
 * @route GET /reports/staff/attendance
 * @desc Staff attendance report with stats
 * @query startDate, endDate, userId, groupBy (daily|weekly|monthly)
 * @access Private (read StaffAttendance)
 */
router.get('/attendance',
  authenticate,
  authorize('read', 'StaffAttendance'),
  getStaffAttendanceReport
);

/**
 * @route GET /reports/staff/daily-composition
 * @desc Staff composition per day based on schedule
 * @query startDate (required), endDate (required)
 * @access Private (read EmployeeSchedule)
 */
router.get('/daily-composition',
  authenticate,
  authorize('read', 'EmployeeSchedule'),
  getDailyStaffComposition
);

/**
 * @route GET /reports/staff/shift-summary
 * @desc Shift distribution summary
 * @query startDate, endDate
 * @access Private (read EmployeeSchedule)
 */
router.get('/shift-summary',
  authenticate,
  authorize('read', 'EmployeeSchedule'),
  getShiftSummary
);

module.exports = router;
