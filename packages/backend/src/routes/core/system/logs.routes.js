const express = require('express');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireSuperAdmin } = require('../../../middlewares/superAdminMiddleware');
const auditLog = require('../../../middlewares/auditMiddleware');
const {
  getLogs,
  getLogById,
  getLogStats,
  cleanupLogs,
  cleanupLogFiles,
  deleteLogs,
  exportLogs
} = require('../../../controllers/core/system/logController');

const router = express.Router();

/**
 * @route GET /logs
 * @name logs.list
 * @desc Get all logs with pagination and filters
 * @access Private (Admin/Owner) - Super Admin can see all tenants
 * @query page, limit, level, action, userId, search, startDate, endDate, sortBy, sortOrder, filterTenantId
 */
router.get('/',
  authenticate,
  authorizeCasl('read', 'Log'),
  getLogs
);

/**
 * @route GET /logs/stats
 * @name logs.stats
 * @desc Get log statistics
 * @access Private (Admin/Owner)
 * @query startDate, endDate, filterTenantId (super admin only)
 */
router.get('/stats',
  authenticate,
  authorizeCasl('read', 'Log'),
  getLogStats
);

/**
 * @route GET /logs/export
 * @name logs.export
 * @desc Export logs to JSON file
 * @access Private (Admin/Owner)
 * @query level, action, userId, search, startDate, endDate, filterTenantId
 */
router.get('/export',
  authenticate,
  authorizeCasl('read', 'Log'),
  auditLog('EXPORT_LOGS'),
  exportLogs
);

/**
 * @route GET /logs/:id
 * @name logs.get
 * @desc Get single log by ID
 * @access Private (Admin/Owner)
 */
router.get('/:id',
  authenticate,
  authorizeCasl('read', 'Log'),
  getLogById
);

/**
 * @route POST /logs/cleanup
 * @name logs.cleanup
 * @desc Manual cleanup of old logs from database
 * @access Private (Admin/Owner) - Super Admin can cleanup all tenants
 * @body { days: number, filterTenantId?: string }
 */
router.post('/cleanup',
  authenticate,
  authorizeCasl('delete', 'Log'),
  auditLog('CLEANUP_LOGS'),
  cleanupLogs
);

/**
 * @route POST /logs/cleanup-files
 * @name logs.cleanupFiles
 * @desc Cleanup old log files from filesystem (keeps last N days)
 * @access Private (Super Admin only)
 * @body { days?: number } (default: 3 days)
 */
router.post('/cleanup-files',
  authenticate,
  requireSuperAdmin,
  auditLog('CLEANUP_LOG_FILES'),
  cleanupLogFiles
);

/**
 * @route POST /logs/delete
 * @name logs.deleteByIds
 * @desc Delete specific logs by IDs (POST method for better body support)
 * @access Private (Admin/Owner)
 * @body { logIds: string[] }
 */
router.post('/delete',
  authenticate,
  authorizeCasl('delete', 'Log'),
  auditLog('DELETE_LOGS'),
  deleteLogs
);

/**
 * @route DELETE /logs
 * @name logs.delete
 * @desc Delete specific logs by IDs (supports both body and query params)
 * @access Private (Admin/Owner)
 * @body { logIds: string[] }
 * @query logIds=id1,id2 (alternative to body)
 */
router.delete('/',
  authenticate,
  authorizeCasl('delete', 'Log'),
  auditLog('DELETE_LOGS'),
  deleteLogs
);

module.exports = router;
