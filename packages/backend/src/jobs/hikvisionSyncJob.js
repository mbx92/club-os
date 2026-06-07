'use strict';

/**
 * Hikvision Sync Job
 *
 * Cron job that pulls attendance events from all active Hikvision devices
 * every 5 minutes as a fallback mechanism. The primary method is push from
 * the device, but this ensures no events are missed.
 */

const cron = require('node-cron');
const { HikvisionDevice } = require('../models');
const HikvisionService = require('../services/hikvisionService');
const HikvisionEventProcessor = require('../services/hikvisionEventProcessor');
const { writeSyncLog } = require('../controllers/integrations/hikvision');
const logger = require('../utils/logger');

/**
 * Run the sync task for all active devices
 */
async function runSyncTask() {
  const startTime = Date.now();

  try {
    logger.info('Starting Hikvision sync job');

    // Get all active devices
    const devices = await HikvisionDevice.findAll({
      where: { isActive: true },
    });

    if (!devices.length) {
      logger.info('Hikvision sync: no active devices found');
      return { devicesProcessed: 0, totalEvents: 0 };
    }

    let totalEvents = 0;
    const results = [];

    for (const device of devices) {
      try {
        // Skip devices currently in enrollment mode
        if (HikvisionService.isEnrollmentLocked(device.id)) {
          logger.info('Hikvision sync: skipping device (enrollment in progress)', {
            deviceId: device.id,
            name: device.name,
          });
          results.push({
            deviceId: device.id,
            name: device.name,
            ip: device.ipAddress,
            skipped: 'enrollment in progress',
          });
          continue;
        }

        // Pull events since last sync (or last 10 minutes if never synced)
        // Add 2-minute overlap buffer to compensate for clock skew between server and device.
        // Duplicates are safely handled by the de-duplication logic in processEvents().
        const endTime = new Date();
        const OVERLAP_MS = 2 * 60 * 1000; // 2 minutes overlap
        const baseSyncStart = device.lastSyncAt || new Date(endTime.getTime() - 10 * 60 * 1000);
        const syncStart = new Date(Math.max(baseSyncStart.getTime() - OVERLAP_MS, 0));
        const _deviceStart = Date.now();

        logger.info('Hikvision sync: pulling events for device', {
          deviceId: device.id,
          name: device.name,
          ip: device.ipAddress,
          syncStart: syncStart.toISOString(),
          endTime: endTime.toISOString(),
          lastSyncAt: device.lastSyncAt?.toISOString() || null,
          overlapApplied: true,
        });

        const rawEvents = await HikvisionService.pullEvents(device, syncStart, endTime);

        if (rawEvents.length > 0) {
          const stats = await HikvisionEventProcessor.processEvents(device.id, rawEvents, 'pull');
          totalEvents += stats.processed;
          results.push({
            deviceId: device.id,
            name: device.name,
            ip: device.ipAddress,
            eventsFound: rawEvents.length,
            ...stats,
          });
          await writeSyncLog({
            deviceId: device.id,
            tenantId: device.tenantId,
            syncType: 'attendance_pull',
            trigger: 'cron',
            status: 'success',
            stats: { ...stats, rawEventCount: rawEvents.length },
            syncFrom: syncStart,
            syncTo: endTime,
            durationMs: Date.now() - _deviceStart,
          });
        }

        // Update lastSyncAt regardless
        await device.update({ lastSyncAt: endTime });
      } catch (err) {
        logger.error('Hikvision sync failed for device', {
          deviceId: device.id,
          name: device.name,
          ip: device.ipAddress,
          error: err.message,
        });
        await writeSyncLog({
          deviceId: device.id,
          tenantId: device.tenantId,
          syncType: 'attendance_pull',
          trigger: 'cron',
          status: 'failed',
          errorMessage: err.message,
        });
        results.push({
          deviceId: device.id,
          name: device.name,
          ip: device.ipAddress,
          error: err.message,
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('Hikvision sync job completed', {
      duration: `${duration}ms`,
      devicesProcessed: devices.length,
      totalEvents,
    });

    return { devicesProcessed: devices.length, totalEvents, results };
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error('Hikvision sync job failed', {
      error: err.message,
      stack: err.stack,
      duration: `${duration}ms`,
    });
    throw err;
  }
}

/**
 * Schedule the sync job — every 5 minutes
 */
function scheduleSyncJob() {
  const schedule = '*/5 * * * *'; // every 5 minutes

  const task = cron.schedule(
    schedule,
    async () => {
      logger.info('Triggered scheduled Hikvision sync job');
      await runSyncTask();
    },
    {
      scheduled: true,
      timezone: process.env.TZ || 'Asia/Jakarta',
    }
  );

  logger.info('Hikvision sync cron job scheduled', {
    schedule: 'Every 5 minutes',
    timezone: process.env.TZ || 'Asia/Jakarta',
  });

  return task;
}

/**
 * Manual trigger for testing
 */
async function triggerManually() {
  logger.info('Manually triggering Hikvision sync job');
  return await runSyncTask();
}

module.exports = {
  scheduleSyncJob,
  triggerManually,
  runSyncTask,
};
