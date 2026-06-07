'use strict';

/**
 * Session Logs Cleanup Cron Job
 * 
 * Automatically cleanup old session logs to prevent database bloat
 * Runs every 6 hours
 * Deletes logs older than 12 hours (only debug and info levels)
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const db = require('../models');
const { TestSessionLog } = db;
const logger = require('../utils/logger');

/**
 * Run logs cleanup task
 */
async function runLogsCleanupTask() {
  const startTime = Date.now();
  
  try {
    logger.logInfo('Starting scheduled session logs cleanup job', {
      action: 'SESSION_LOGS_CLEANUP_JOB_START'
    });
    
    // Calculate cutoff time (12 hours ago)
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 12);
    
    // Only delete debug and info logs, keep warn and error
    const result = await TestSessionLog.destroy({
      where: {
        createdAt: { [Op.lt]: cutoffTime },
        level: { [Op.in]: ['debug', 'info'] }
      }
    });
    
    const duration = Date.now() - startTime;
    
    logger.logInfo('Session logs cleanup job completed', {
      action: 'SESSION_LOGS_CLEANUP_JOB_COMPLETED',
      metadata: {
        deletedCount: result,
        cutoffTime: cutoffTime.toISOString(),
        duration: `${duration}ms`,
        hoursBack: 12
      }
    });
    
    return {
      success: true,
      deletedCount: result,
      cutoffTime,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.logError('Session logs cleanup job failed', {
      action: 'SESSION_LOGS_CLEANUP_JOB_ERROR',
      error: error.message,
      stack: error.stack,
      metadata: { duration: `${duration}ms` }
    });
    
    return {
      success: false,
      error: error.message,
      duration
    };
  }
}

/**
 * Schedule the cleanup job
 * Runs every 6 hours
 */
function scheduleLogsCleanupJob() {
  // Cron format: minute hour day month weekday
  // '0 */6 * * *' = Every 6 hours (at minute 0)
  const schedule = '0 */6 * * *';
  
  const task = cron.schedule(schedule, async () => {
    logger.logInfo('Triggered scheduled session logs cleanup job', {
      action: 'SESSION_LOGS_CLEANUP_JOB_TRIGGERED'
    });
    await runLogsCleanupTask();
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'Asia/Jakarta'
  });
  
  logger.logInfo('Session logs cleanup cron job scheduled', {
    action: 'SESSION_LOGS_CLEANUP_JOB_SCHEDULED',
    metadata: {
      schedule: 'Every 6 hours',
      timezone: process.env.TZ || 'Asia/Jakarta',
      retention: '12 hours',
      levels: 'debug, info (warn and error are kept)'
    }
  });
  
  return task;
}

/**
 * Manual trigger for testing
 */
async function triggerManually() {
  logger.logInfo('Manually triggering session logs cleanup job', {
    action: 'SESSION_LOGS_CLEANUP_JOB_MANUAL_TRIGGER'
  });
  return await runLogsCleanupTask();
}

module.exports = {
  scheduleLogsCleanupJob,
  triggerManually,
  runLogsCleanupTask
};
