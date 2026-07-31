const logService = require('../../../services/logService');
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');
const { getTenantTimezone } = require('../../../utils/tenantTimezone');

/**
 * Get all logs with pagination and filters
 */
async function getLogs(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      page = 1,
      limit = 50,
      level = 'all',
      action,
      userId,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      filterTenantId // For super admin to filter by specific tenant
    } = req.query;

    const filters = {
      tenantId: isSuperAdmin && filterTenantId ? filterTenantId : tenantId,
      userId,
      level,
      action,
      search,
      startDate,
      endDate,
      isSuperAdmin,
      timezone: getTenantTimezone(req),
    };

    const pagination = { page, limit, sortBy, sortOrder };

    const result = await logService.getLogs(filters, pagination);

    return res.json(result);
  } catch (err) {
    logger.logError('Error retrieving logs', {
      action: 'GET_LOGS_ERROR',
      error: err.message,
      stack: err.stack,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });
    return next(err);
  }
}

/**
 * Get single log by ID
 */
async function getLogById(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const log = await logService.getLogById(id, tenantId, isSuperAdmin);

    return res.json({ data: log });
  } catch (err) {
    logger.logError('Error retrieving log', {
      action: 'GET_LOG_ERROR',
      error: err.message,
      logId: req.params.id,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });
    return next(err);
  }
}

/**
 * Get log statistics
 */
async function getLogStats(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, filterTenantId } = req.query;

    const stats = await logService.getLogStats(
      isSuperAdmin && filterTenantId ? filterTenantId : tenantId,
      isSuperAdmin,
      { startDate, endDate, timezone: getTenantTimezone(req) }
    );

    return res.json({ data: stats });
  } catch (err) {
    logger.logError('Error retrieving log stats', {
      action: 'GET_LOG_STATS_ERROR',
      error: err.message,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });
    return next(err);
  }
}

/**
 * Manual cleanup - delete old logs
 */
async function cleanupLogs(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    
    // Validate request body (optional for this endpoint, but good to check)
    const { days = 7, filterTenantId } = req.body || {};

    // Only super admin can cleanup all tenants
    const targetTenantId = isSuperAdmin && !filterTenantId ? null : 
                          isSuperAdmin && filterTenantId ? filterTenantId :
                          tenantId;

    const deletedCount = await logService.cleanupOldLogs(days, targetTenantId);

    logger.logAudit('Manual log cleanup performed', {
      action: 'CLEANUP_LOGS',
      tenantId: req.user.tenantId,
      userId: req.user.id,
      deletedCount,
      days,
      targetTenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });

    return res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} logs older than ${days} days`,
      data: {
        deletedCount,
        days,
        targetTenantId
      }
    });
  } catch (err) {
    logger.logError('Error cleaning up logs', {
      action: 'CLEANUP_LOGS_ERROR',
      error: err.message,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });
    return next(err);
  }
}

/**
 * Delete specific logs
 * Accepts logIds from body (POST/DELETE) or query parameter (DELETE with query string)
 */
async function deleteLogs(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    
    // Support both body and query parameter for flexibility
    // Body: { logIds: ["id1", "id2"] }
    // Query: ?logIds=id1,id2 or ?logIds[]=id1&logIds[]=id2
    let logIds = req.body?.logIds;
    
    // If no body, try query parameter
    if (!logIds && req.query?.logIds) {
      // Handle both comma-separated string and array formats
      logIds = Array.isArray(req.query.logIds) 
        ? req.query.logIds 
        : req.query.logIds.split(',').map(id => id.trim());
    }

    if (!logIds || !Array.isArray(logIds) || logIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'logIds is required (provide as body array or query parameter)',
        examples: {
          body: { logIds: ["uuid1", "uuid2"] },
          query: "?logIds=uuid1,uuid2"
        }
      });
    }

    const deletedCount = await logService.deleteLogs(logIds, tenantId, isSuperAdmin);

    logger.logAudit('Logs manually deleted', {
      action: 'DELETE_LOGS',
      tenantId: req.user.tenantId,
      userId: req.user.id,
      deletedCount,
      logIds,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });

    return res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} log(s)`,
      data: {
        deletedCount
      }
    });
  } catch (err) {
    logger.logError('Error deleting logs', {
      action: 'DELETE_LOGS_ERROR',
      error: err.message,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });
    return next(err);
  }
}

/**
 * Export logs to JSON
 */
async function exportLogs(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      level = 'all',
      action,
      userId,
      search,
      startDate,
      endDate,
      filterTenantId
    } = req.query;

    const filters = {
      tenantId: isSuperAdmin && filterTenantId ? filterTenantId : tenantId,
      userId,
      level,
      action,
      search,
      startDate,
      endDate,
      isSuperAdmin,
      timezone: getTenantTimezone(req),
    };

    const logs = await logService.exportLogs(filters);

    logger.logAudit('Logs exported', {
      action: 'EXPORT_LOGS',
      tenantId: req.user.tenantId,
      userId: req.user.id,
      exportedCount: logs.length,
      filters,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=logs-export-${Date.now()}.json`);
    
    return res.json(logs);
  } catch (err) {
    logger.logError('Error exporting logs', {
      action: 'EXPORT_LOGS_ERROR',
      error: err.message,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });
    return next(err);
  }
}

/**
 * Cleanup old log files from filesystem
 * Keeps only the last N days (default: 3 days)
 */
async function cleanupLogFiles(req, res, next) {
  try {
    const { days = 3 } = req.body || {};

    // Validate days parameter
    if (days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Days must be between 1 and 365'
      });
    }

    const result = await logService.cleanupLogFiles(days);

    logger.logAudit('Log files cleanup performed', {
      action: 'CLEANUP_LOG_FILES',
      tenantId: req.user.tenantId,
      userId: req.user.id,
      daysToKeep: days,
      deletedCount: result.deletedCount,
      deletedFiles: result.deletedFiles.map(f => f.fileName),
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });

    return res.json({
      success: true,
      message: result.message,
      data: {
        daysToKeep: result.daysToKeep,
        cutoffDate: result.cutoffDate,
        deletedCount: result.deletedCount,
        deletedFiles: result.deletedFiles,
        errors: result.errors
      }
    });
  } catch (err) {
    logger.logError('Error cleaning up log files', {
      action: 'CLEANUP_LOG_FILES_ERROR',
      error: err.message,
      stack: err.stack,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });
    return next(err);
  }
}

module.exports = {
  getLogs,
  getLogById,
  getLogStats,
  cleanupLogs,
  cleanupLogFiles,
  deleteLogs,
  exportLogs
};
