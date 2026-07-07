'use strict';

/**
 * Overnight Fix Job
 *
 * Automatically detects and corrects overnight schedules that were saved on the
 * checkout date instead of the shift start date.
 *
 * Root cause of the error:
 *   Shift 21:50→06:00 should have schedule.date = the evening the shift STARTS
 *   (e.g. Jul 6). If it was saved with date = Jul 7 (the morning it ends), the
 *   event processor assigns all July-6-evening taps to the wrong date and the
 *   attendance ends up showing 431 lateMinutes and early_leave instead of on_time.
 *
 * This job runs daily at 07:30 WIB (after all overnight shifts have ended) and
 * automatically moves misaligned schedules to the correct date, then rebuilds
 * the attendance records from raw log taps.
 *
 * Schedule: controlled by OVERNIGHT_FIX_CRON env var (default: daily 07:30 WIB)
 */

const cron = require('node-cron');
const { runOvernightFixForAllTenants } = require('../services/overnightFixService');
const logger = require('../utils/logger');

let scheduledTask = null;
let isRunning = false;
let lastRun = null;

async function runOvernightFixJob() {
  if (isRunning) {
    logger.warn('[overnightFixJob] skipped — previous run still in progress');
    return { skipped: true, reason: 'already_running' };
  }

  isRunning = true;
  const startedAt = new Date();
  const startedAtMs = Date.now();

  try {
    logger.info('[overnightFixJob] starting');

    const result = await runOvernightFixForAllTenants();

    lastRun = {
      startedAt,
      completedAt: new Date(),
      durationMs: Date.now() - startedAtMs,
      success: true,
      ...result,
    };

    logger.info('[overnightFixJob] completed', {
      tenantsProcessed: result.tenantsProcessed,
      totalDetected: result.totalDetected,
      totalApplied: result.totalApplied,
      totalSkipped: result.totalSkipped,
      durationMs: lastRun.durationMs,
    });

    return lastRun;
  } catch (error) {
    lastRun = {
      startedAt,
      completedAt: new Date(),
      durationMs: Date.now() - startedAtMs,
      success: false,
      error: error.message,
    };

    logger.error('[overnightFixJob] failed', {
      error: error.message,
      stack: error.stack,
      durationMs: lastRun.durationMs,
    });

    throw error;
  } finally {
    isRunning = false;
  }
}

function scheduleOvernightFixJob() {
  if (scheduledTask) return scheduledTask;

  // Default: 07:30 WIB — well after all overnight shifts (ending ~06:00) have closed
  const schedule = process.env.OVERNIGHT_FIX_CRON || '30 7 * * *';
  const timezone = process.env.TZ || 'Asia/Jakarta';

  scheduledTask = cron.schedule(schedule, async () => {
    await runOvernightFixJob();
  }, {
    scheduled: true,
    timezone,
  });

  logger.info('[overnightFixJob] scheduled', { schedule, timezone });

  return scheduledTask;
}

function getOvernightFixJobStatus() {
  return {
    isScheduled: Boolean(scheduledTask),
    isRunning,
    lastRun,
  };
}

module.exports = {
  scheduleOvernightFixJob,
  runOvernightFixJob,
  getOvernightFixJobStatus,
};
