'use strict';

/**
 * Account Settlement Job
 *
 * Completes AccountEntries with status=pending_settlement once
 * settlementDate <= today (tenant timezone).
 *
 * These entries are created when a payment credits an Account that has
 * settlementDays > 0 (e.g. QRIS / card T+1). Without this job they stay
 * "Pending" forever.
 *
 * Schedule: controlled by ACCOUNT_SETTLEMENT_CRON (default: daily 01:00 WITA)
 */

const cron = require('node-cron');
const accountService = require('../services/accountService');
const logger = require('../utils/logger');

let scheduledTask = null;
let isRunning = false;
let lastRun = null;

async function runAccountSettlementJob() {
  if (isRunning) {
    logger.warn('[accountSettlementJob] skipped — previous run still in progress');
    return { skipped: true, reason: 'already_running' };
  }

  isRunning = true;
  const startedAt = new Date();

  try {
    const result = await accountService.processAllPendingSettlements();
    lastRun = {
      success: true,
      startedAt,
      finishedAt: new Date(),
      ...result,
    };
    logger.logInfo('Account settlement job completed', {
      action: 'ACCOUNT_SETTLEMENT_JOB',
      tenantsProcessed: result.tenantsProcessed,
      settled: result.settled,
    });
    return lastRun;
  } catch (error) {
    lastRun = {
      success: false,
      startedAt,
      finishedAt: new Date(),
      error: error.message,
    };
    logger.logError('Account settlement job failed', {
      action: 'ACCOUNT_SETTLEMENT_JOB_ERROR',
      error: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    isRunning = false;
  }
}

function scheduleAccountSettlementJob() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  // Default: 01:00 Asia/Makassar — after midnight so T+1 from previous day settles
  const schedule = process.env.ACCOUNT_SETTLEMENT_CRON || '0 1 * * *';
  const timezone = process.env.ACCOUNT_SETTLEMENT_TZ || 'Asia/Makassar';

  scheduledTask = cron.schedule(schedule, () => {
    runAccountSettlementJob().catch(() => {});
  }, {
    scheduled: true,
    timezone,
  });

  logger.logInfo('[accountSettlementJob] scheduled', { schedule, timezone });
  return scheduledTask;
}

function getAccountSettlementJobStatus() {
  return {
    isScheduled: !!scheduledTask,
    isRunning,
    lastRun,
    schedule: process.env.ACCOUNT_SETTLEMENT_CRON || '0 1 * * *',
  };
}

module.exports = {
  runAccountSettlementJob,
  scheduleAccountSettlementJob,
  getAccountSettlementJobStatus,
};
