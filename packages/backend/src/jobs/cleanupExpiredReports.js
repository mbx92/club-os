/**
 * Cleanup Expired Reports Job
 * 
 * Scheduled job that runs daily to clean up empty report directories.
 * 
 * @module jobs/cleanupExpiredReports
 */

const cron = require('node-cron');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

class ReportCleanupJob {
  constructor() {
    this.isRunning = false;
    this.lastRunStats = null;
    this.scheduledTask = null;
  }

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
      description: 'Runs daily at 2:00 AM to clean up empty report directories'
    });
  }

  stop() {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
      logger.logInfo('Report cleanup job stopped', {
        action: 'CLEANUP_JOB_STOPPED'
      });
    }
  }

  async cleanup() {
    if (this.isRunning) {
      return { skipped: true, reason: 'Already running' };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const stats = {
      dirsRemoved: 0,
      errors: [],
      startedAt: new Date(),
      completedAt: null,
      duration: null
    };

    try {
      await this.cleanupEmptyDirectories(stats);

      stats.completedAt = new Date();
      stats.duration = Date.now() - startTime;
      this.lastRunStats = stats;

      return stats;
    } catch (err) {
      stats.completedAt = new Date();
      stats.duration = Date.now() - startTime;
      throw err;
    } finally {
      this.isRunning = false;
    }
  }

  async cleanupEmptyDirectories(stats) {
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
              stats.dirsRemoved++;
            }
          }
        } catch (dirErr) {
          // Ignore errors for individual directories
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        // Reports directory might not exist yet, that's ok
      }
    }
  }

  getLastRunStats() {
    return this.lastRunStats;
  }

  getIsRunning() {
    return this.isRunning;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isScheduled: !!this.scheduledTask,
      lastRunStats: this.lastRunStats
    };
  }
}

module.exports = new ReportCleanupJob();
