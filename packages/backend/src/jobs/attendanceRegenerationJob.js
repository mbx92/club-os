'use strict';

const cron = require('node-cron');
const { Tenant } = require('../models');
const { regenerateAttendanceFromLogs } = require('../services/attendanceRegenerationService');
const { toLocalDateOnly, getPreviousDateOnly } = require('../utils/attendanceSchedule');
const logger = require('../utils/logger');

let scheduledTask = null;
let isRunning = false;
let lastRun = null;

function getRepairWindow(timezone) {
  const lookbackDays = Number.parseInt(process.env.ATTENDANCE_REPAIR_LOOKBACK_DAYS || '3', 10);
  const endDate = toLocalDateOnly(new Date(), timezone);
  let startDate = endDate;
  for (let i = 0; i < lookbackDays; i += 1) {
    startDate = getPreviousDateOnly(startDate);
  }
  return { startDate, endDate };
}

async function runAttendanceRegenerationJob() {
  if (isRunning) {
    return { skipped: true, reason: 'already_running' };
  }

  isRunning = true;
  const startedAt = new Date();
  const startedAtMs = Date.now();

  try {
    const tenants = await Tenant.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'settings'],
    });

    const results = [];
    for (const tenant of tenants) {
      const timezone = tenant?.settings?.timezone || process.env.TZ || 'Asia/Jakarta';
      const { startDate, endDate } = getRepairWindow(timezone);
      const result = await regenerateAttendanceFromLogs({
        tenantId: tenant.id,
        startDate,
        endDate,
        forceAll: false,
        dryRun: false,
        trigger: 'cron_hourly',
      });

      results.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        startDate,
        endDate,
        summary: result.summary,
      });
    }

    lastRun = {
      startedAt,
      completedAt: new Date(),
      durationMs: Date.now() - startedAtMs,
      success: true,
      results,
    };

    logger.info('[attendanceRegenerationJob] completed', {
      tenantsProcessed: results.length,
      durationMs: lastRun.durationMs,
      employeesRebuilt: results.reduce((sum, item) => sum + (item.summary?.employeesRebuilt || 0), 0),
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

    logger.error('[attendanceRegenerationJob] failed', {
      error: error.message,
      stack: error.stack,
      durationMs: lastRun.durationMs,
    });

    throw error;
  } finally {
    isRunning = false;
  }
}

function scheduleAttendanceRegenerationJob() {
  if (scheduledTask) return scheduledTask;

  const schedule = process.env.ATTENDANCE_REPAIR_CRON || '0 * * * *';
  const timezone = process.env.TZ || 'Asia/Jakarta';

  scheduledTask = cron.schedule(schedule, async () => {
    await runAttendanceRegenerationJob();
  }, {
    scheduled: true,
    timezone,
  });

  logger.info('[attendanceRegenerationJob] scheduled', {
    schedule,
    timezone,
  });

  return scheduledTask;
}

function getAttendanceRegenerationJobStatus() {
  return {
    isScheduled: Boolean(scheduledTask),
    isRunning,
    lastRun,
  };
}

module.exports = {
  scheduleAttendanceRegenerationJob,
  runAttendanceRegenerationJob,
  getAttendanceRegenerationJobStatus,
};
