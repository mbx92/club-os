/**
 * Cleanup Expired Reports Job
 * 
 * Scheduled job that runs daily to clean up expired PDF report caches.
 * Deletes both the cache records and the physical PDF files.
 * 
 * @module jobs/cleanupExpiredReports
 */

const cron = require('node-cron');
const path = require('path');
const fs = require('fs').promises;
const { PsychologyReportCache } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class ReportCleanupJob {
  constructor() {
    this.isRunning = false;
    this.lastRunStats = null;
    this.scheduledTask = null;
  }

  /**
   * Start the cleanup scheduler
   * Default: Runs daily at 2:00 AM server time
   * @param {string} schedule - Cron expression (default: '0 2 * * *')
   */
  start(schedule = '0 2 * * *') {
    if (this.scheduledTask) {
      logger.logInfo('Cleanup job already scheduled, skipping', {
        action: 'CLEANUP_JOB_ALREADY_SCHEDULED'
      });
      return;
    }

    this.scheduledTask = cron.schedule(schedule, async () => {
      await this.cleanup();
    });
    
    logger.logInfo('Report cleanup job scheduled', {
      action: 'CLEANUP_JOB_SCHEDULED',
      schedule,
      description: 'Runs daily at 2:00 AM to clean up expired PDF reports'
    });
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
      logger.logInfo('Report cleanup job stopped', {
        action: 'CLEANUP_JOB_STOPPED'
      });
    }
  }

  /**
   * Run cleanup manually (for testing or admin trigger)
   * @returns {Object} Cleanup statistics
   */
  async cleanup() {
    if (this.isRunning) {
      logger.logInfo('Cleanup job already running, skipping', {
        action: 'CLEANUP_JOB_SKIPPED'
      });
      return { skipped: true, reason: 'Already running' };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const stats = {
      filesDeleted: 0,
      recordsDeleted: 0,
      bytesFreed: 0,
      errors: [],
      startedAt: new Date(),
      completedAt: null,
      duration: null
    };

    try {
      logger.logInfo('Starting expired reports cleanup', {
        action: 'CLEANUP_JOB_STARTED'
      });

      // Find all expired cache records
      const expiredRecords = await PsychologyReportCache.findAll({
        where: {
          expiresAt: {
            [Op.lt]: new Date()
          }
        }
      });

      logger.logInfo(`Found ${expiredRecords.length} expired reports`, {
        action: 'CLEANUP_EXPIRED_FOUND',
        count: expiredRecords.length
      });

      // Delete each expired record and its file
      for (const record of expiredRecords) {
        try {
          // Delete file from disk
          const filePath = record.filePath;
          try {
            await fs.access(filePath);
            const fileStats = await fs.stat(filePath);
            stats.bytesFreed += fileStats.size;
            await fs.unlink(filePath);
            stats.filesDeleted++;
          } catch (fileErr) {
            if (fileErr.code !== 'ENOENT') {
              stats.errors.push({
                type: 'file_delete',
                recordId: record.id,
                filePath: record.filePath,
                error: fileErr.message
              });
            }
            // File doesn't exist, continue with record deletion
          }

          // Delete database record
          await record.destroy();
          stats.recordsDeleted++;

        } catch (err) {
          stats.errors.push({
            type: 'record_delete',
            recordId: record.id,
            error: err.message
          });
        }
      }

      // Cleanup empty tenant directories
      await this.cleanupEmptyDirectories();

      stats.completedAt = new Date();
      stats.duration = Date.now() - startTime;
      this.lastRunStats = stats;

      logger.logInfo('Report cleanup completed', {
        action: 'CLEANUP_JOB_COMPLETED',
        duration: `${stats.duration}ms`,
        filesDeleted: stats.filesDeleted,
        recordsDeleted: stats.recordsDeleted,
        bytesFreed: this.formatBytes(stats.bytesFreed),
        errorsCount: stats.errors.length
      });

      return stats;

    } catch (err) {
      stats.completedAt = new Date();
      stats.duration = Date.now() - startTime;
      stats.errors.push({
        type: 'job_error',
        error: err.message
      });

      logger.logError('Report cleanup job failed', {
        action: 'CLEANUP_JOB_FAILED',
        error: err.message,
        stack: err.stack
      });

      throw err;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Remove empty tenant directories in uploads/reports
   */
  async cleanupEmptyDirectories() {
    const reportsDir = path.join(process.cwd(), 'uploads', 'reports');
    
    try {
      await fs.access(reportsDir);
      const tenantDirs = await fs.readdir(reportsDir);
      
      for (const dir of tenantDirs) {
        const tenantPath = path.join(reportsDir, dir);
        try {
          const stat = await fs.stat(tenantPath);
          
          if (stat.isDirectory()) {
            const files = await fs.readdir(tenantPath);
            if (files.length === 0) {
              await fs.rmdir(tenantPath);
              logger.logInfo('Removed empty tenant directory', {
                action: 'CLEANUP_EMPTY_DIR_REMOVED',
                path: tenantPath
              });
            }
          }
        } catch (dirErr) {
          // Ignore errors for individual directories
        }
      }
    } catch (err) {
      // Reports directory might not exist yet
      if (err.code !== 'ENOENT') {
        logger.logError('Error cleaning up directories', {
          action: 'CLEANUP_DIR_ERROR',
          error: err.message
        });
      }
    }
  }

  /**
   * Get last run statistics
   */
  getLastRunStats() {
    return this.lastRunStats;
  }

  /**
   * Check if job is currently running
   */
  getIsRunning() {
    return this.isRunning;
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isScheduled: !!this.scheduledTask,
      lastRunStats: this.lastRunStats
    };
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

// Export singleton instance
module.exports = new ReportCleanupJob();
