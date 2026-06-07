'use strict';

/**
 * Staff Attendance Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

const {
  listAttendance,
  attendanceReport,
  exportAttendanceReport,
  updateAttendance,
  createManualAttendance,
  reprocessUnmatchedLogs,
  syncAllDevices,
  fixSmartCheckInOut,
} = require('../../../controllers/gym/staffAttendance/staffAttendanceController');

/**
 * @route   GET /gym/staff-attendance
 * @name    listStaffAttendance
 * @desc    List staff attendance records
 * @access  Private (admin/manager)
 * @query   page, limit, startDate, endDate, userId, status
 */
router.get('/',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'StaffAttendance'),
  listAttendance
);

/**
 * @route   GET /gym/staff-attendance/report
 * @name    staffAttendanceReport
 * @desc    Generate staff attendance summary report
 * @access  Private (admin/manager)
 * @query   startDate, endDate, userId
 */
router.get('/report',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'StaffAttendance'),
  attendanceReport
);

/**
 * @route   GET /gym/staff-attendance/report/export
 * @name    exportStaffAttendanceReport
 * @desc    Export staff attendance report as Excel (.xlsx) — 2 sheets: Ringkasan & Detail Harian
 * @access  Private (admin/manager)
 * @query   startDate, endDate, userId, employeeId
 */
router.get('/report/export',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'StaffAttendance'),
  exportAttendanceReport
);

/**
 * @route   POST /gym/staff-attendance/sync
 * @name    syncStaffAttendanceDevices
 * @desc    Pull latest events from ALL Hikvision devices and process into attendance records
 * @access  Private (admin/manager)
 * @query   startDate (optional)
 */
router.post('/sync',
  authenticate,
  requireModule('gym'),
  authorizeCasl('create', 'StaffAttendance'),
  syncAllDevices
);

/**
 * @route   POST /gym/staff-attendance/reprocess
 * @name    reprocessUnmatchedAttendanceLogs
 * @desc    Reprocess unmatched device logs to create attendance records
 * @access  Private (admin)
 * @query   startDate, endDate
 */
router.post('/reprocess',
  authenticate,
  requireModule('gym'),
  authorizeCasl('create', 'StaffAttendance'),
  reprocessUnmatchedLogs
);

/**
 * @route   POST /gym/staff-attendance/fix-checkin
 * @name    fixSmartCheckInOut
 * @desc    Smart fix: detect attendance where checkIn is near shiftEnd (should be checkOut)
 *          or checkOut is near shiftStart (should be checkIn). Supports dry-run preview.
 * @access  Private (admin)
 * @query   dryRun=true|false (default: true), startDate, endDate, employeeId
 */
router.post('/fix-checkin',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'StaffAttendance'),
  fixSmartCheckInOut
);

/**
 * @route   POST /gym/staff-attendance
 * @name    createManualStaffAttendance
 * @desc    Create manual staff attendance entry
 * @access  Private (admin/manager)
 */
router.post('/',
  authenticate,
  requireModule('gym'),
  authorizeCasl('create', 'StaffAttendance'),
  createManualAttendance
);

/**
 * @route   PATCH /gym/staff-attendance/:id
 * @name    updateStaffAttendance
 * @desc    Manual correction of staff attendance
 * @access  Private (admin/manager)
 */
router.patch('/:id',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'StaffAttendance'),
  updateAttendance
);

module.exports = router;
