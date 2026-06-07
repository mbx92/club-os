'use strict';

/**
 * Hikvision Integration Routes
 *
 * Device management, push receiver, employee management, and device configuration.
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

const {
  receiveEvent,
  listDevices,
  createDevice,
  updateDevice,
  deleteDevice,
  manualSync,
  testConnection,
  listDeviceEmployees,
  addDeviceEmployee,
  removeDeviceEmployee,
  enrollFingerprint,
  deleteFingerprint,
  unlockEnrollment,
  configurePush,
  getPushStatus,
  disablePush,
  syncDeviceTime,
  getDeviceLogs,
  listStaffMapping,
  assignStaffDeviceNo,
  unassignStaffDeviceNo,
  reprocessUnmatchedLogs,
  syncDeviceEmployees,
  listAllDeviceEmployees,
  updateDeviceEmployee,
  pushPendingEmployees,
  listDuplicateDeviceEmployees,
  mergeDeviceEmployees,
  setDeviceEmployeeStatus,
  getSyncStatus,
  getSyncLogs,
  getDeviceStatus,
} = require('../../../controllers/integrations/hikvision');

// ==========================================
// Push Event Receiver (from device — no auth)
// ==========================================

/**
 * @route   POST /integrations/hikvision/event
 * @name    receiveHikvisionEvent
 * @desc    Receive push events from Hikvision device
 * @access  Public (device pushes directly, validated by IP)
 */
router.post('/event', receiveEvent);

// ==========================================
// Device CRUD (authenticated)
// ==========================================

/**
 * @route   GET /integrations/hikvision/devices
 * @name    listHikvisionDevices
 * @desc    List all Hikvision devices for the tenant
 * @access  Private (admin/manager)
 */
router.get('/devices',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'HikvisionDevice'),
  listDevices
);

/**
 * @route   POST /integrations/hikvision/devices
 * @name    createHikvisionDevice
 * @desc    Add a new Hikvision device
 * @access  Private (admin)
 */
router.post('/devices',
  authenticate,
  requireModule('gym'),
  authorizeCasl('create', 'HikvisionDevice'),
  createDevice
);

/**
 * @route   PUT /integrations/hikvision/devices/:id
 * @name    updateHikvisionDevice
 * @desc    Update a Hikvision device
 * @access  Private (admin)
 */
router.put('/devices/:id',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'HikvisionDevice'),
  updateDevice
);

/**
 * @route   DELETE /integrations/hikvision/devices/:id
 * @name    deleteHikvisionDevice
 * @desc    Soft-delete a Hikvision device
 * @access  Private (admin)
 */
router.delete('/devices/:id',
  authenticate,
  requireModule('gym'),
  authorizeCasl('delete', 'HikvisionDevice'),
  deleteDevice
);

// ==========================================
// Sync & Test
// ==========================================

/**
 * @route   GET /integrations/hikvision/devices/:id/sync-logs
 * @name    getHikvisionSyncLogs
 * @desc    Riwayat semua operasi sync untuk satu device (pull log, push employee, import)
 * @access  Private (admin)
 * @query   syncType, trigger, status, startDate, endDate, page, limit
 */
router.get('/devices/:id/sync-logs',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'HikvisionDevice'),
  getSyncLogs
);

/**
 * @route   GET /integrations/hikvision/devices/:id/status
 * @name    getHikvisionDeviceStatus
 * @desc    Comprehensive real-time device health dashboard: connectivity, hardware info,
 *          clock drift, push-mode config, attendance stats (today/week/last tap), employee sync health
 * @access  Private (admin)
 */
router.get('/devices/:id/status',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'HikvisionDevice'),
  getDeviceStatus
);

/**
 * @route   GET /integrations/hikvision/devices/:id/sync-status
 * @name    getHikvisionSyncStatus
 * @desc    Overview status sync DB ↔ device: employee stats, last sync time, warnings, workflow guide
 * @access  Private (admin)
 */
router.get('/devices/:id/sync-status',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'HikvisionDevice'),
  getSyncStatus
);

/**
 * @route   POST /integrations/hikvision/devices/:id/sync
 * @name    syncHikvisionDevice
 * @desc    Manually pull events from a device
 * @access  Private (admin/manager)
 */
router.post('/devices/:id/sync',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'HikvisionDevice'),
  manualSync
);

/**
 * @route   GET /integrations/hikvision/devices/:id/test
 * @name    testHikvisionDevice
 * @desc    Test connection to a Hikvision device
 * @access  Private (admin)
 */
router.get('/devices/:id/test',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'HikvisionDevice'),
  testConnection
);

/**
 * @route   GET /integrations/hikvision/devices/:id/logs
 * @name    getHikvisionDeviceLogs
 * @desc    Get raw attendance logs for a device
 * @access  Private (admin/manager)
 */
router.get('/devices/:id/logs',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'HikvisionDevice'),
  getDeviceLogs
);

// ==========================================
// Employee Management on Device
// (Since device has no web UI)
// ==========================================

/**
 * @route   GET /integrations/hikvision/devices/:id/employees
 * @name    listHikvisionDeviceEmployees
 * @desc    List employees registered on a device
 * @access  Private (admin)
 */
router.get('/devices/:id/employees',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'HikvisionDevice'),
  listDeviceEmployees
);

/**
 * @route   POST /integrations/hikvision/devices/:id/employees
 * @name    addHikvisionDeviceEmployee
 * @desc    Add an employee to the device
 * @access  Private (admin)
 */
router.post('/devices/:id/employees',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'HikvisionDevice'),
  addDeviceEmployee
);

/**
 * @route   DELETE /integrations/hikvision/devices/:id/employees/:employeeNo
 * @name    removeHikvisionDeviceEmployee
 * @desc    Remove an employee from the device
 * @access  Private (admin)
 */
router.delete('/devices/:id/employees/:employeeNo',
  authenticate,
  requireModule('gym'),
  authorizeCasl('delete', 'HikvisionDevice'),
  removeDeviceEmployee
);

/**
 * @route   POST /integrations/hikvision/devices/:id/employees/:employeeNo/enroll-fingerprint
 * @name    enrollHikvisionFingerprint
 * @desc    Start fingerprint enrollment for an employee on the device
 * @access  Private (admin)
 */
router.post('/devices/:id/employees/:employeeNo/enroll-fingerprint',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'HikvisionDevice'),
  enrollFingerprint
);

/**
 * @route   DELETE /integrations/hikvision/devices/:id/employees/:employeeNo/fingerprint
 * @name    deleteHikvisionFingerprint
 * @desc    Delete fingerprint(s) for an employee on the device
 * @access  Private (admin)
 */
router.delete('/devices/:id/employees/:employeeNo/fingerprint',
  authenticate,
  requireModule('gym'),
  authorizeCasl('delete', 'HikvisionDevice'),
  deleteFingerprint
);

/**
 * @route   DELETE /integrations/hikvision/devices/:id/enrollment-lock
 * @name    unlockHikvisionEnrollment
 * @desc    Release enrollment lock so device sync resumes
 * @access  Private (admin)
 */
router.delete('/devices/:id/enrollment-lock',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'HikvisionDevice'),
  unlockEnrollment
);

// ==========================================
// Device Configuration
// ==========================================

/**
 * @route   POST /integrations/hikvision/devices/:id/configure-push
 * @name    configureHikvisionPush
 * @desc    Configure event push URL on the device
 * @access  Private (admin)
 */
router.post('/devices/:id/configure-push',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'HikvisionDevice'),
  configurePush
);

/**
 * @route   GET /integrations/hikvision/devices/:id/push-status
 * @name    getHikvisionPushStatus
 * @desc    Get current push configuration from device hardware & database
 * @access  Private (admin)
 */
router.get('/devices/:id/push-status',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'HikvisionDevice'),
  getPushStatus
);

/**
 * @route   DELETE /integrations/hikvision/devices/:id/push
 * @name    disableHikvisionPush
 * @desc    Disable push events on device and clear saved push URL
 * @access  Private (admin)
 */
router.delete('/devices/:id/push',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'HikvisionDevice'),
  disablePush
);

/**
 * @route   POST /integrations/hikvision/devices/:id/sync-time
 * @name    syncHikvisionDeviceTime
 * @desc    Sync device time with server time
 * @access  Private (admin)
 */
router.post('/devices/:id/sync-time',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'HikvisionDevice'),
  syncDeviceTime
);

// ==========================================
// Staff ↔ Device Mapping
// ==========================================

/**
 * @route   GET /integrations/hikvision/staff-mapping
 * @name    listHikvisionStaffMapping
 * @desc    List users with their deviceEmployeeNo mapping
 * @access  Private (admin)
 */
router.get('/staff-mapping',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'HikvisionDevice'),
  listStaffMapping
);

/**
 * @route   PUT /integrations/hikvision/staff-mapping/:userId
 * @name    assignHikvisionStaffDeviceNo
 * @desc    Assign a deviceEmployeeNo to a user (staff)
 * @access  Private (admin)
 */
router.put('/staff-mapping/:userId',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'HikvisionDevice'),
  assignStaffDeviceNo
);

/**
 * @route   DELETE /integrations/hikvision/staff-mapping/:userId
 * @name    unassignHikvisionStaffDeviceNo
 * @desc    Remove deviceEmployeeNo mapping from a user
 * @access  Private (admin)
 */
router.delete('/staff-mapping/:userId',
  authenticate,
  requireModule('gym'),
  authorizeCasl('delete', 'HikvisionDevice'),
  unassignStaffDeviceNo
);

/**
 * @route   POST /integrations/hikvision/reprocess-logs
 * @name    reprocessHikvisionUnmatchedLogs
 * @desc    Re-process unmatched logs after staff mapping fix
 * @access  Private (admin)
 */
router.post('/reprocess-logs',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'HikvisionDevice'),
  reprocessUnmatchedLogs
);

// ==========================================
// Device Employee DB Records
// ==========================================

/**
 * @route   POST /integrations/hikvision/devices/:id/push-pending-employees
 * @name    pushHikvisionPendingEmployees
 * @desc    Push all pending_sync employees (registered in system but not yet on device) to the device.
 *          Use this after registering employees with syncToDevice:false.
 * @access  Private (admin)
 */
router.post('/devices/:id/push-pending-employees',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'HikvisionDevice'),
  pushPendingEmployees
);

/**
 * @route   POST /integrations/hikvision/devices/:id/sync-employees
 * @name    syncHikvisionDeviceEmployees
 * @desc    Sync employees from device hardware to database
 * @access  Private (admin)
 */
router.post('/devices/:id/sync-employees',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'HikvisionDevice'),
  syncDeviceEmployees
);

/**
 * @route   GET /integrations/hikvision/device-employees
 * @name    listAllHikvisionDeviceEmployees
 * @desc    List all device employees from database
 * @access  Private (admin)
 * @query   deviceId, userId, status, hasFingerprint
 */
router.get('/device-employees',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'HikvisionDevice'),
  listAllDeviceEmployees
);

/**
 * @route   PUT /integrations/hikvision/device-employees/:id
 * @name    updateHikvisionDeviceEmployee
 * @desc    Update a device employee record (link to user, update name/status)
 * @access  Private (admin)
 */
router.put('/device-employees/:id',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'HikvisionDevice'),
  updateDeviceEmployee
);

/**
 * @route   PATCH /integrations/hikvision/device-employees/:id/status
 * @name    setHikvisionDeviceEmployeeStatus
 * @desc    Set active / inactive (or any valid status) for a device employee
 * @access  Private (admin)
 * @body    { status: 'active' | 'inactive' | 'pending_sync' | 'sync_failed' }
 */
router.patch('/device-employees/:id/status',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'HikvisionDevice'),
  setDeviceEmployeeStatus
);

// ==========================================
// Duplicate Detection & Merge
// ==========================================

/**
 * @route   GET /integrations/hikvision/device-employees/duplicates
 * @name    listDuplicateHikvisionDeviceEmployees
 * @desc    Find DeviceEmployee records that appear to be duplicates
 *          (grouped by same name or same linked userId)
 * @access  Private (admin)
 */
router.get('/device-employees/duplicates',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'HikvisionDevice'),
  listDuplicateDeviceEmployees
);

/**
 * @route   POST /integrations/hikvision/device-employees/merge
 * @name    mergeHikvisionDeviceEmployees
 * @desc    Merge two DeviceEmployee records: move all attendance, schedules, and
 *          device logs from `removeId` into `keepId`, then delete `removeId`.
 * @access  Private (admin)
 * @body    { keepId: string, removeId: string }
 */
router.post('/device-employees/merge',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'HikvisionDevice'),
  mergeDeviceEmployees
);

module.exports = router;
