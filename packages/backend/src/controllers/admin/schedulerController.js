'use strict';

/**
 * Scheduler Monitoring Controller
 * 
 * Provides endpoints to monitor scheduled jobs status and trigger manual execution
 */

const { getSchedulerStatus, cleanupExpiredReports } = require('../../utils/scheduler');
const logService = require('../../services/logService');
const logger = require('../../utils/logger');
const { getClientIp, getUserAgent } = require('../../utils/requestHelper');

/**
 * Get scheduler status
 * GET /api/v1/admin/scheduler/status
 */
async function getStatus(req, res, next) {
  try {
    const status = getSchedulerStatus();

    res.json({
      success: true,
      data: status
    });

    logger.logInfo('Scheduler status retrieved', {
      action: 'SCHEDULER_STATUS_RETRIEVED',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Trigger log cleanup manually
 * POST /api/v1/admin/scheduler/trigger/log-cleanup
 */
async function triggerLogCleanup(req, res, next) {
  try {
    const { days = 7 } = req.body;

    logger.logInfo('Manual log cleanup triggered', {
      action: 'MANUAL_LOG_CLEANUP_TRIGGERED',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { days }
    });

    const deletedCount = await logService.cleanupOldLogs(parseInt(days));

    res.json({
      success: true,
      message: `Log cleanup completed successfully`,
      data: {
        deletedCount,
        days: parseInt(days)
      }
    });

    logger.logInfo('Manual log cleanup completed', {
      action: 'MANUAL_LOG_CLEANUP_COMPLETED',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { deletedCount, days }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Trigger report cleanup manually
 * POST /api/v1/admin/scheduler/trigger/report-cleanup
 */
async function triggerReportCleanup(req, res, next) {
  try {
    logger.logInfo('Manual report cleanup triggered', {
      action: 'MANUAL_REPORT_CLEANUP_TRIGGERED',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl
    });

    const result = await cleanupExpiredReports.cleanup();

    res.json({
      success: true,
      message: 'Report cleanup completed successfully',
      data: result
    });

    logger.logInfo('Manual report cleanup completed', {
      action: 'MANUAL_REPORT_CLEANUP_COMPLETED',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStatus,
  triggerLogCleanup,
  triggerReportCleanup
};
