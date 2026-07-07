'use strict';

/**
 * Staff Attendance Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const { autoAuthorize } = require('../../../middlewares/autoAuthorizeMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

// All routes require authentication + auto-authorization from ROUTE_TO_SUBJECT_MAP
router.use(authenticate);
router.use(autoAuthorize);

const {
  listAttendance,
  attendanceReport,
  exportAttendanceReport,
  updateAttendance,
  createManualAttendance,
  reprocessUnmatchedLogs,
  syncAllDevices,
  fixSmartCheckInOut,
  fixOvernightScheduleAlignment,
  regenerateAttendanceFromLogsController,
} = require('../../../controllers/gym/staffAttendance/staffAttendanceController');

/**
 * @route   GET /gym/staff-attendance
 * @name    listStaffAttendance
 * @desc    List staff attendance records
 * @access  Private (admin/manager)
 * @query   page, limit, startDate, endDate, userId, employeeId, employeeQuery, deviceEmployeeId, status
 */
router.get('/',
  requireModule('gym'),
  authorize('read', 'StaffAttendance'),
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
  requireModule('gym'),
  authorize('read', 'StaffAttendance'),
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
  requireModule('gym'),
  authorize('read', 'StaffAttendance'),
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
  requireModule('gym'),
  authorize('create', 'StaffAttendance'),
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
  requireModule('gym'),
  authorize('create', 'StaffAttendance'),
  reprocessUnmatchedLogs
);

/**
 * @route   POST /gym/staff-attendance/fix-checkin
 * @name    fixSmartCheckInOut
 * @desc    Smart fix: detect attendance where checkIn is near shiftEnd (should be checkOut)
 *          or checkOut is near shiftStart (should be checkIn). Supports dry-run preview.
 * @access  Private (admin)
 * @query   dryRun=true|false (default: true), startDate, endDate, employeeId, employeeQuery, deviceEmployeeId
 */
router.post('/fix-checkin',
  requireModule('gym'),
  authorize('update', 'StaffAttendance'),
  fixSmartCheckInOut
);

/**
 * @route   POST /gym/staff-attendance/fix-overnight
 * @name    fixOvernightScheduleAlignment
 * @desc    Preview/apply fix for overnight schedules saved on checkout date
 * @access  Private (admin)
 * @query   dryRun=true|false, startDate, endDate, employeeQuery|employeeId
 */
router.post('/fix-overnight',
  requireModule('gym'),
  authorize('update', 'StaffAttendance'),
  fixOvernightScheduleAlignment
);

/**
 * @route   POST /gym/staff-attendance/regenerate-from-logs
 * @name    regenerateAttendanceFromLogs
 * @desc    Preview/apply attendance rebuild from existing matched device logs
 * @access  Private (admin)
 * @query   dryRun=true|false, startDate, endDate, employeeQuery, employeeId, deviceEmployeeId, forceAll=true|false
 */
router.post('/regenerate-from-logs',
  requireModule('gym'),
  authorize('update', 'StaffAttendance'),
  regenerateAttendanceFromLogsController
);

/**
 * @route   POST /gym/staff-attendance
 * @name    createManualStaffAttendance
 * @desc    Create manual staff attendance entry
 * @access  Private (admin/manager)
 */
router.post('/',
  requireModule('gym'),
  authorize('create', 'StaffAttendance'),
  createManualAttendance
);

/**
 * @route   PATCH /gym/staff-attendance/:id
 * @name    updateStaffAttendance
 * @desc    Manual correction of staff attendance
 * @access  Private (admin/manager)
 */
router.patch('/:id',
  requireModule('gym'),
  authorize('update', 'StaffAttendance'),
  updateAttendance
);

module.exports = router;
