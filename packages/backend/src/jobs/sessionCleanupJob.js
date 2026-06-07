'use strict';

/**
 * Session Cleanup Cron Job
 * 
 * Automatically runs session cleanup to mark timeout/abandoned sessions
 * Runs daily at 2:00 AM
 */

const cron = require('node-cron');
const { sessionCleanupService } = require('../modules/psychology/services');
const logger = require('../utils/logger');

/**
 * Run session cleanup task
 */
async function runCleanupTask() {
  const startTime = Date.now();
  
  try {
    logger.info('Starting scheduled session cleanup job');
    
    // Run cleanup for all tenants
    const result = await sessionCleanupService.runCleanup();
    
    const duration = Date.now() - startTime;
    
    logger.info('Session cleanup job completed', {
      duration: `${duration}ms`,
      timedOut: result.timedOut?.length || 0,
      abandoned: result.abandoned?.length || 0,
      total: (result.timedOut?.length || 0) + (result.abandoned?.length || 0)
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Session cleanup job failed', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });
    
    throw error;
  }
}

/**
 * Schedule the cleanup job
 * Runs every day at 2:00 AM
 */
function scheduleCleanupJob() {
  // Cron format: minute hour day month weekday
  // '0 2 * * *' = Every day at 2:00 AM
  const schedule = '0 2 * * *';
  
  const task = cron.schedule(schedule, async () => {
    logger.info('Triggered scheduled session cleanup job');
    await runCleanupTask();
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'Asia/Jakarta'
  });
  
  logger.info('Session cleanup cron job scheduled', {
    schedule: '2:00 AM daily',
    timezone: process.env.TZ || 'Asia/Jakarta'
  });
  
  return task;
}

/**
 * Manual trigger for testing
 */
async function triggerManually() {
  logger.info('Manually triggering session cleanup job');
  return await runCleanupTask();
}

module.exports = {
  scheduleCleanupJob,
  triggerManually,
  runCleanupTask
};
