const cron = require('node-cron');
const logService = require('../services/logService');
const logger = require('../utils/logger');
const cleanupExpiredReports = require('../jobs/cleanupExpiredReports');
const hikvisionSyncJob = require('../jobs/hikvisionSyncJob');
const attendanceRegenerationJob = require('../jobs/attendanceRegenerationJob');
const overnightFixJob = require('../jobs/overnightFixJob');
const accountSettlementJob = require('../jobs/accountSettlementJob');
const { createBackup } = require('../../scripts/backupDatabase');
const { createSequelizeBackup } = require('../../scripts/backupDatabaseSequelize');
const { resolveAutoBackupOptions } = require('./backupGoogleDriveConfig');

/**
 * Scheduled Jobs for Application
 */

// Scheduler status tracking
const schedulerStatus = {
  initialized: false,
  initializedAt: null,
  jobs: {
    logCleanup: {
      name: 'Log Cleanup',
      schedule: '0 2 * * *',
      description: 'Cleanup logs older than 7 days',
      lastRun: null,
      nextRun: null,
      status: 'pending',
      isRunning: false
    },
    reportCleanup: {
      name: 'Report Cleanup',
      schedule: '30 2 * * *',
      description: 'Cleanup expired PDF reports',
      lastRun: null,
      nextRun: null,
      status: 'pending',
      isRunning: false
    },
    autoBackup: {
      name: 'Auto Backup',
      schedule: '30 14,22 * * *',
      description: 'Auto backup database at 14:30 and 22:30 WITA',
      lastRun: null,
      nextRun: null,
      status: 'pending',
      isRunning: false
    },
    attendanceRepair: {
      name: 'Attendance Repair',
      schedule: process.env.ATTENDANCE_REPAIR_CRON || '0 * * * *',
      description: 'Rebuild suspect attendances from matched logs every hour',
      lastRun: null,
      nextRun: null,
      status: 'pending',
      isRunning: false
    },
    overnightFix: {
      name: 'Overnight Fix',
      schedule: process.env.OVERNIGHT_FIX_CRON || '30 7 * * *',
      description: 'Auto-correct overnight schedules saved on checkout date instead of shift start date',
      lastRun: null,
      nextRun: null,
      status: 'pending',
      isRunning: false
    },
    accountSettlement: {
      name: 'Account Settlement',
      schedule: process.env.ACCOUNT_SETTLEMENT_CRON || '0 1 * * *',
      description: 'Complete pending AccountEntry settlements (T+N) once settlementDate is due',
      lastRun: null,
      nextRun: null,
      status: 'pending',
      isRunning: false
    }
  }
};

/**
 * Auto cleanup logs older than 7 days
 * Runs daily at 2:00 AM
 */
function scheduleLogCleanup() {
  // Cron pattern: minute hour day month weekday
  // '0 2 * * *' = Every day at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    schedulerStatus.jobs.logCleanup.isRunning = true;
    schedulerStatus.jobs.logCleanup.status = 'running';
    const startTime = Date.now();
    
    try {
      logger.logSystem('Starting scheduled log cleanup...', {
      action: 'STARTING_SCHEDULED_LOG_CLEANUP',
      userId: null,
      tenantId: null,
      ip: 'system',
      userAgent: 'scheduled-task',
      method: 'SYSTEM',
      path: '/system/log-cleanup',
      skipDb: true
    });
      
      const deletedCount = await logService.cleanupOldLogs(7); // Keep only 7 days
      
      schedulerStatus.jobs.logCleanup.lastRun = {
        timestamp: new Date(),
        duration: Date.now() - startTime,
        success: true,
        deletedCount
      };
      schedulerStatus.jobs.logCleanup.status = 'success';
      
      logger.logSystem(`Scheduled log cleanup completed: ${deletedCount} logs deleted`, {
      action: 'SCHEDULED_LOG_CLEANUP_COMPLETED',
      userId: null,
      tenantId: null,
      ip: 'system',
      userAgent: 'scheduled-task',
      method: 'SYSTEM',
      path: '/system/log-cleanup',
      skipDb: true,
        deletedCount
    });
    } catch (err) {
      schedulerStatus.jobs.logCleanup.lastRun = {
        timestamp: new Date(),
        duration: Date.now() - startTime,
        success: false,
        error: err.message
      };
      schedulerStatus.jobs.logCleanup.status = 'error';
      
      logger.logError('Error in scheduled log cleanup', {
      action: 'ERROR_IN_SCHEDULED_LOG_CLEANUP',
      userId: null,
      tenantId: null,
      ip: 'system',
      userAgent: 'scheduled-task',
      method: 'SYSTEM',
      path: '/system/log-cleanup',
      skipDb: true,
        error: err.message,
        stack: err.stack
    });
    } finally {
      schedulerStatus.jobs.logCleanup.isRunning = false;
    }
  });

  logger.logSystem('Log cleanup scheduler initialized (daily at 2:00 AM)', {
      action: 'LOG_CLEANUP_SCHEDULER_INITIALIZED',
      userId: null,
      tenantId: null,
      ip: 'system',
      userAgent: 'scheduled-task',
      method: 'SYSTEM',
      path: '/system/scheduler',
      skipDb: true
    });
}

/**
 * Schedule PDF report cache cleanup
 * Runs daily at 2:30 AM to avoid conflict with log cleanup
 */
function scheduleReportCleanup() {
  // Wrap cleanup to track status
  const originalCleanup = cleanupExpiredReports.cleanup.bind(cleanupExpiredReports);
  cleanupExpiredReports.cleanup = async function() {
    schedulerStatus.jobs.reportCleanup.isRunning = true;
    schedulerStatus.jobs.reportCleanup.status = 'running';
    const startTime = Date.now();
    
    try {
      const result = await originalCleanup();
      schedulerStatus.jobs.reportCleanup.lastRun = {
        timestamp: new Date(),
        duration: Date.now() - startTime,
        success: true,
        ...result
      };
      schedulerStatus.jobs.reportCleanup.status = 'success';
      return result;
    } catch (err) {
      schedulerStatus.jobs.reportCleanup.lastRun = {
        timestamp: new Date(),
        duration: Date.now() - startTime,
        success: false,
        error: err.message
      };
      schedulerStatus.jobs.reportCleanup.status = 'error';
      throw err;
    } finally {
      schedulerStatus.jobs.reportCleanup.isRunning = false;
    }
  };
  
  cleanupExpiredReports.start('30 2 * * *'); // 2:30 AM daily
  
  logger.logSystem('Report cleanup scheduler initialized (daily at 2:30 AM)', {
    action: 'REPORT_CLEANUP_SCHEDULER_INITIALIZED',
    userId: null,
    tenantId: null,
    ip: 'system',
    userAgent: 'scheduled-task',
    method: 'SYSTEM',
    path: '/system/scheduler',
    skipDb: true
  });
}

/**
 * Schedule automatic database backup
 * Runs at 14:30 and 22:30 WITA every day
 */
function scheduleAutoBackup() {
  const jobConfig = schedulerStatus.jobs.autoBackup;

  async function runBackup() {
    if (jobConfig.isRunning) {
      logger.logSystem('Auto backup skipped — previous run still in progress', {
        action: 'AUTO_BACKUP_SKIPPED',
        userId: null, tenantId: null, ip: 'system',
        userAgent: 'scheduled-task', method: 'SYSTEM',
        path: '/system/scheduler/auto-backup', skipDb: true
      });
      return;
    }

    jobConfig.isRunning = true;
    jobConfig.status = 'running';
    const startTime = Date.now();

    logger.logSystem('Auto backup starting', {
      action: 'AUTO_BACKUP_STARTING',
      userId: null, tenantId: null, ip: 'system',
      userAgent: 'scheduled-task', method: 'SYSTEM',
      path: '/system/scheduler/auto-backup', skipDb: true
    });

    try {
      let result;
      const backupOptions = await resolveAutoBackupOptions();

      logger.logSystem('Auto backup resolved cloud backup configuration', {
        action: 'AUTO_BACKUP_CONFIG_RESOLVED',
        userId: null, tenantId: backupOptions.targetTenantId || null, ip: 'system',
        userAgent: 'scheduled-task', method: 'SYSTEM',
        path: '/system/scheduler/auto-backup', skipDb: true,
        metadata: {
          targetTenantId: backupOptions.targetTenantId,
          targetTenantName: backupOptions.targetTenantName,
          resolutionSource: backupOptions.resolutionSource,
          googleDriveEnabled: backupOptions.googleDriveConfig?.enabled,
          googleDriveRequired: backupOptions.googleDriveConfig?.required,
          googleDriveFolderId: backupOptions.googleDriveConfig?.folderId || null,
          googleDriveSource: backupOptions.googleDriveConfig?.source || 'env',
          minioEnabled: backupOptions.minioConfig?.enabled,
          minioRequired: backupOptions.minioConfig?.required,
          minioBucket: backupOptions.minioConfig?.bucket || null,
          minioEndpoint: backupOptions.minioConfig?.endpoint || null,
          minioSource: backupOptions.minioConfig?.source || 'env',
        }
      });

      try {
        result = await createBackup(backupOptions);
        result.format = 'sql';
      } catch (error) {
        if (error.code !== 'NATIVE_BACKUP_FAILED') {
          throw error;
        }

        logger.logSystem('Auto backup native dump unavailable, falling back to Sequelize JSON backup', {
          action: 'AUTO_BACKUP_FALLBACK_TO_JSON',
          userId: null, tenantId: null, ip: 'system',
          userAgent: 'scheduled-task', method: 'SYSTEM',
          path: '/system/scheduler/auto-backup', skipDb: true,
          metadata: { error: error.message }
        });

        result = await createSequelizeBackup(backupOptions);
        result.format = 'json';
      }

      const duration = Date.now() - startTime;
      jobConfig.status = 'success';
      jobConfig.isRunning = false;
      jobConfig.lastRun = {
        timestamp: new Date(),
        duration,
        success: true,
        filename: result.filename,
        sizeMB: result.sizeMB,
        format: result.format,
        googleDrive: result.googleDrive,
        minio: result.minio,
        targetTenantId: backupOptions.targetTenantId,
        targetTenantName: backupOptions.targetTenantName,
        resolutionSource: backupOptions.resolutionSource,
      };

      logger.logSystem(`Auto backup completed — ${result.filename} (${result.sizeMB} MB, ${duration}ms)`, {
        action: 'AUTO_BACKUP_COMPLETED',
        userId: null, tenantId: null, ip: 'system',
        userAgent: 'scheduled-task', method: 'SYSTEM',
        path: '/system/scheduler/auto-backup', skipDb: true,
        metadata: {
          filename: result.filename,
          sizeMB: result.sizeMB,
          duration: `${duration}ms`,
          format: result.format,
          googleDriveUploaded: result.googleDrive?.uploaded || false,
          googleDriveSource: result.googleDrive?.source || 'env',
          googleDriveFileId: result.googleDrive?.fileId || null,
          googleDriveError: result.googleDrive?.error || null,
          minioUploaded: result.minio?.uploaded || false,
          minioSource: result.minio?.source || 'env',
          minioBucket: result.minio?.bucket || null,
          minioObjectKey: result.minio?.objectKey || null,
          minioError: result.minio?.error || null,
          targetTenantId: backupOptions.targetTenantId || null,
          targetTenantName: backupOptions.targetTenantName || null,
          resolutionSource: backupOptions.resolutionSource,
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      jobConfig.status = 'error';
      jobConfig.isRunning = false;
      jobConfig.lastRun = {
        timestamp: new Date(),
        duration,
        success: false,
        error: error.message,
      };

      logger.logError(`Auto backup failed: ${error.message}`, {
        action: 'AUTO_BACKUP_FAILED',
        userId: null, tenantId: null, ip: 'system',
        userAgent: 'scheduled-task', method: 'SYSTEM',
        path: '/system/scheduler/auto-backup', skipDb: true,
        metadata: { duration: `${duration}ms`, error: error.message }
      });
    }
  }

  // Run at 14:30 and 22:30 WITA every day
  cron.schedule(jobConfig.schedule, runBackup, {
    scheduled: true,
    timezone: 'Asia/Makassar'
  });

  logger.logSystem('Auto backup scheduler initialized (daily at 14:30 and 22:30 WITA)', {
    action: 'AUTO_BACKUP_SCHEDULER_INITIALIZED',
    userId: null, tenantId: null, ip: 'system',
    userAgent: 'scheduled-task', method: 'SYSTEM',
    path: '/system/scheduler', skipDb: true
  });
}

/**
 * Initialize all scheduled jobs
 */
/**
 * Schedule Hikvision device sync
 * Pulls attendance events from all active devices every 5 minutes
 */
function scheduleHikvisionSync() {
  hikvisionSyncJob.scheduleSyncJob();
  
  logger.logSystem('Hikvision sync scheduler initialized (every 5 minutes)', {
    action: 'HIKVISION_SYNC_SCHEDULER_INITIALIZED',
    userId: null,
    tenantId: null,
    ip: 'system',
    userAgent: 'scheduled-task',
    method: 'SYSTEM',
    path: '/system/scheduler',
    skipDb: true
  });
}

function scheduleAttendanceRepair() {
  attendanceRegenerationJob.scheduleAttendanceRegenerationJob();

  logger.logSystem('Attendance repair scheduler initialized (hourly)', {
    action: 'ATTENDANCE_REPAIR_SCHEDULER_INITIALIZED',
    userId: null,
    tenantId: null,
    ip: 'system',
    userAgent: 'scheduled-task',
    method: 'SYSTEM',
    path: '/system/scheduler',
    skipDb: true,
  });
}

function scheduleOvernightFix() {
  overnightFixJob.scheduleOvernightFixJob();

  logger.logSystem('Overnight fix scheduler initialized (daily 07:30)', {
    action: 'OVERNIGHT_FIX_SCHEDULER_INITIALIZED',
    userId: null,
    tenantId: null,
    ip: 'system',
    userAgent: 'scheduled-task',
    method: 'SYSTEM',
    path: '/system/scheduler',
    skipDb: true,
  });
}

function scheduleAccountSettlement() {
  accountSettlementJob.scheduleAccountSettlementJob();

  logger.logSystem('Account settlement scheduler initialized (daily 01:00)', {
    action: 'ACCOUNT_SETTLEMENT_SCHEDULER_INITIALIZED',
    userId: null,
    tenantId: null,
    ip: 'system',
    userAgent: 'scheduled-task',
    method: 'SYSTEM',
    path: '/system/scheduler',
    skipDb: true,
  });
}

function initializeScheduledJobs() {
  scheduleLogCleanup();
  scheduleReportCleanup();
  scheduleHikvisionSync();
  scheduleAttendanceRepair();
  scheduleOvernightFix();
  scheduleAccountSettlement();
  scheduleAutoBackup();
  
  schedulerStatus.initialized = true;
  schedulerStatus.initializedAt = new Date();
  
  logger.logSystem('All scheduled jobs initialized', {
      action: 'ALL_SCHEDULED_JOBS_INITIALIZED',
      userId: null,
      tenantId: null,
      ip: 'system',
      userAgent: 'scheduled-task',
      method: 'SYSTEM',
      path: '/system/scheduler',
      skipDb: true
    });
}

/**
 * Get current scheduler status
 * @returns {Object} Scheduler status with all jobs info
 */
function getSchedulerStatus() {
  const attendanceRepairStatus = attendanceRegenerationJob.getAttendanceRegenerationJobStatus();
  const accountSettlementStatus = accountSettlementJob.getAccountSettlementJobStatus();

  return {
    ...schedulerStatus,
    jobs: {
      ...schedulerStatus.jobs,
      attendanceRepair: {
        ...schedulerStatus.jobs.attendanceRepair,
        isRunning: attendanceRepairStatus.isRunning,
        lastRun: attendanceRepairStatus.lastRun,
        status: attendanceRepairStatus.lastRun
          ? (attendanceRepairStatus.lastRun.success ? 'success' : 'error')
          : (attendanceRepairStatus.isScheduled ? 'scheduled' : schedulerStatus.jobs.attendanceRepair.status),
      },
      accountSettlement: {
        ...schedulerStatus.jobs.accountSettlement,
        isRunning: accountSettlementStatus.isRunning,
        lastRun: accountSettlementStatus.lastRun,
        status: accountSettlementStatus.lastRun
          ? (accountSettlementStatus.lastRun.success ? 'success' : 'error')
          : (accountSettlementStatus.isScheduled ? 'scheduled' : schedulerStatus.jobs.accountSettlement.status),
      },
    },
    uptime: schedulerStatus.initializedAt 
      ? Math.floor((Date.now() - new Date(schedulerStatus.initializedAt).getTime()) / 1000)
      : 0,
    uptimeFormatted: schedulerStatus.initializedAt
      ? formatUptime(Date.now() - new Date(schedulerStatus.initializedAt).getTime())
      : 'Not initialized'
  };
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

module.exports = {
  initializeScheduledJobs,
  scheduleLogCleanup,
  scheduleReportCleanup,
  scheduleHikvisionSync,
  scheduleAttendanceRepair,
  scheduleAccountSettlement,
  cleanupExpiredReports,
  hikvisionSyncJob,
  attendanceRegenerationJob,
  accountSettlementJob,
  getSchedulerStatus
};
