'use strict';

/**
 * Hikvision Integration Controller
 *
 * Handles:
 * - Push event receiver (from device)
 * - Device CRUD
 * - Manual sync / test connection
 * - Employee management on device (since no web UI)
 * - Device configuration (push URL, time sync)
 */

const { Op } = require('sequelize');
const { HikvisionDevice, DeviceAttendanceLog, DeviceEmployee, DeviceSyncLog, User, Member, Tenant, sequelize } = require('../../../models');
const HikvisionService = require('../../../services/hikvisionService');
const HikvisionEventProcessor = require('../../../services/hikvisionEventProcessor');
const { createError } = require('../../../utils/errorCodes');
const logger = require('../../../utils/logger');
const { getTenantTimezone, startOfDayInTz, endOfDayInTz, todayInTz } = require('../../../utils/tenantTimezone');
const { mergeDateRangeInto } = require('../../../utils/dateRange');

// ==========================================
// Internal utility: tulis sync log ke DB
// ==========================================

/**
 * Catat hasil operasi sync ke tabel DeviceSyncLogs.
 * Non-blocking (error diabaikan agar tidak ganggu operasi utama).
 *
 * @param {object} opts
 * @param {string}   opts.deviceId
 * @param {string}   opts.tenantId
 * @param {string}   opts.syncType   - 'attendance_pull' | 'employee_push_to_device' | 'employee_import_from_device'
 * @param {string}   opts.trigger    - 'manual' | 'cron' | 'push_event'
 * @param {string}   opts.status     - 'success' | 'partial' | 'failed'
 * @param {object}   [opts.stats]    - stats object bebas (processed, synced, dll)
 * @param {string}   [opts.errorMessage]
 * @param {Date}     [opts.syncFrom]
 * @param {Date}     [opts.syncTo]
 * @param {number}   [opts.durationMs]
 * @param {string}   [opts.triggeredByUserId]
 */
async function writeSyncLog(opts) {
  try {
    await DeviceSyncLog.create({
      deviceId: opts.deviceId,
      tenantId: opts.tenantId,
      syncType: opts.syncType,
      trigger: opts.trigger,
      status: opts.status,
      stats: opts.stats || null,
      errorMessage: opts.errorMessage || null,
      syncFrom: opts.syncFrom || null,
      syncTo: opts.syncTo || null,
      durationMs: opts.durationMs || null,
      triggeredByUserId: opts.triggeredByUserId || null,
    });
  } catch (err) {
    // Non-fatal — jangan sampai mengganggu flow utama
    logger.warn('[writeSyncLog] failed to write sync log (non-fatal)', { error: err.message, opts });
  }
}

// ==========================================
// Push Event Receiver
// ==========================================

/**
 * Extract events from various Hikvision push payload formats.
 * Hikvision devices send events in different formats depending on model/firmware:
 *  1. { Events: [...] }                          — batch push
 *  2. { AcsEvent: { InfoList: [...] } }           — search-style push
 *  3. { AccessControllerEvent: { ... } }          — single event notification (most common push)
 *  4. { EventNotificationAlert: { ... } }         — alert notification format
 *  5. Entire body is a single event (has employeeNoString or time)
 */
function extractPushEvents(body) {
  if (!body || typeof body !== 'object') return [];

  // Format 1: batch array
  if (Array.isArray(body.Events) && body.Events.length > 0) {
    return body.Events;
  }

  // Format 2: AcsEvent search result (pull-style, or some push configs)
  const infoList = body.AcsEvent?.InfoList;
  if (infoList) {
    if (Array.isArray(infoList)) return infoList;
    // Nested: { InfoList: { AcsEventInfo: [...] } }
    if (Array.isArray(infoList.AcsEventInfo)) return infoList.AcsEventInfo;
  }

  // Format 3: single AccessControllerEvent notification (most common for HTTP push)
  if (body.AccessControllerEvent) {
    const evt = body.AccessControllerEvent;
    // Map to the same shape as pull events
    return [{
      major: evt.majorEventType ?? evt.major ?? 5,
      minor: evt.subEventType ?? evt.minor ?? 0,
      time: evt.time || body.dateTime,
      employeeNoString: evt.employeeNoString || evt.employeeNo?.toString() || '',
      cardNo: evt.cardNo || '',
      currentVerifyMode: evt.currentVerifyMode || evt.attendenceStatus || null,
      serialNo: evt.serialNo,
      name: evt.name,
      // keep original for rawPayload
      _originalEvent: body,
    }];
  }

  // Format 4: EventNotificationAlert
  if (body.EventNotificationAlert) {
    const alert = body.EventNotificationAlert;
    if (alert.AccessControllerEvent) {
      const evt = alert.AccessControllerEvent;
      return [{
        major: evt.majorEventType ?? evt.major ?? 5,
        minor: evt.subEventType ?? evt.minor ?? 0,
        time: evt.time || alert.dateTime,
        employeeNoString: evt.employeeNoString || evt.employeeNo?.toString() || '',
        cardNo: evt.cardNo || '',
        currentVerifyMode: evt.currentVerifyMode || null,
        serialNo: evt.serialNo,
        name: evt.name,
        _originalEvent: body,
      }];
    }
  }

  // Format 5: body itself looks like an event (has employeeNoString or time field)
  if (body.employeeNoString || body.time || body.dateTime) {
    return [body];
  }

  return [];
}

/**
 * @route   POST /integrations/hikvision/event
 * @desc    Receive push events from Hikvision device
 * @access  Public (device pushes without JWT — validated by device IP/secret)
 */
async function receiveEvent(req, res, next) {
  try {
    const events = extractPushEvents(req.body);

    // Log the raw push payload for debugging (only first time or when empty)
    if (!events.length) {
      logger.warn('Hikvision push: no events extracted from payload', {
        bodyKeys: Object.keys(req.body || {}),
        bodyPreview: JSON.stringify(req.body).substring(0, 500),
        ip: (req.ip || req.connection.remoteAddress || '').replace('::ffff:', ''),
      });
      return res.json({ success: true, message: 'No events to process' });
    }

    // Identify which device sent this event (by IP)
    const sourceIp = req.ip || req.connection.remoteAddress;
    const cleanIp = sourceIp.replace('::ffff:', ''); // strip IPv6 prefix

    const device = await HikvisionDevice.findOne({
      where: { ipAddress: cleanIp, isActive: true },
    });

    if (!device) {
      logger.warn('Hikvision push from unknown device', { ip: cleanIp });
      return res.status(403).json({
        success: false,
        message: `Unknown device IP: ${cleanIp}`,
      });
    }

    logger.info('Hikvision push events received', {
      deviceId: device.id,
      ip: cleanIp,
      eventCount: events.length,
      format: req.body.AccessControllerEvent ? 'AccessControllerEvent'
        : req.body.Events ? 'Events'
          : req.body.AcsEvent ? 'AcsEvent'
            : req.body.EventNotificationAlert ? 'EventNotificationAlert'
              : 'raw',
    });

    // Respond immediately so device doesn't timeout waiting for processing.
    // Process events asynchronously in the background.
    res.json({ success: true, eventCount: events.length });

    // Background processing (no await — fire and forget)
    HikvisionEventProcessor.processEvents(device.id, events, 'push').catch(err => {
      logger.error('Hikvision push background processing failed', {
        deviceId: device.id,
        error: err.message,
      });
    });

    return;
  } catch (err) {
    logger.error('Hikvision receiveEvent error', { error: err.message });
    return next(err);
  }
}

// ==========================================
// Device CRUD
// ==========================================

/**
 * @route   GET /integrations/hikvision/devices
 * @desc    List all Hikvision devices for the tenant
 * @access  Private (admin/manager)
 */
async function listDevices(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;

    const devices = await HikvisionDevice.findAll({
      where,
      attributes: { exclude: ['password'] }, // never expose password
      include: [{ model: require('../../../models').Location, as: 'location', required: false }],
      order: [['createdAt', 'DESC']],
    });

    return res.json({ success: true, data: devices });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   POST /integrations/hikvision/devices
 * @desc    Add a new Hikvision device
 * @access  Private (admin)
 */
async function createDevice(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { name, ipAddress, port, username, password, serialNumber, locationId, useForMemberCheckIn, pushUrl, pushEnabled, eventCooldownMinutes } = req.body;

    if (!name || !ipAddress || !username || !password) {
      throw createError('VALIDATION_ERROR', 'name, ipAddress, username, and password are required');
    }

    const device = await HikvisionDevice.create({
      tenantId,
      name,
      ipAddress,
      port: port || 80,
      username,
      password, // TODO: encrypt with AES before storing
      serialNumber,
      locationId: locationId || null,
      useForMemberCheckIn: useForMemberCheckIn || false,
      pushUrl: pushUrl || null,
      pushEnabled: pushEnabled || false,
      eventCooldownMinutes: eventCooldownMinutes !== undefined ? Number(eventCooldownMinutes) : 5,
    });

    // Exclude password from response
    const result = device.toJSON();
    delete result.password;

    logger.info('Hikvision device created', { deviceId: device.id, tenantId });

    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   PUT /integrations/hikvision/devices/:id
 * @desc    Update a Hikvision device
 * @access  Private (admin)
 */
async function updateDevice(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const device = await HikvisionDevice.findOne({ where });
    if (!device) throw createError('NOT_FOUND', 'Device not found');

    const { name, ipAddress, port, username, password, serialNumber, locationId, useForMemberCheckIn, isActive, pushUrl, pushEnabled, eventCooldownMinutes } = req.body;

    // Validate cooldown range (0-60 minutes, 0 = disabled)
    if (eventCooldownMinutes !== undefined) {
      const cooldown = Number(eventCooldownMinutes);
      if (isNaN(cooldown) || cooldown < 0 || cooldown > 60) {
        throw createError('VALIDATION_ERROR', 'eventCooldownMinutes must be between 0 and 60');
      }
    }

    await device.update({
      ...(name !== undefined && { name }),
      ...(ipAddress !== undefined && { ipAddress }),
      ...(port !== undefined && { port }),
      ...(username !== undefined && { username }),
      ...(password !== undefined && { password }),
      ...(serialNumber !== undefined && { serialNumber }),
      ...(locationId !== undefined && { locationId }),
      ...(useForMemberCheckIn !== undefined && { useForMemberCheckIn }),
      ...(isActive !== undefined && { isActive }),
      ...(pushUrl !== undefined && { pushUrl }),
      ...(pushEnabled !== undefined && { pushEnabled }),
      ...(eventCooldownMinutes !== undefined && { eventCooldownMinutes: Number(eventCooldownMinutes) }),
    });

    const result = device.toJSON();
    delete result.password;

    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   DELETE /integrations/hikvision/devices/:id
 * @desc    Soft-delete a Hikvision device
 * @access  Private (admin)
 */
async function deleteDevice(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const device = await HikvisionDevice.findOne({ where });
    if (!device) throw createError('NOT_FOUND', 'Device not found');

    await device.destroy(); // soft delete (paranoid)

    return res.json({ success: true, message: 'Device deleted' });
  } catch (err) {
    return next(err);
  }
}

// ==========================================
// Manual Sync & Test
// ==========================================

/**
 * @route   POST /integrations/hikvision/devices/:id/sync
 * @desc    Manually pull events from a device (last 24h by default)
 * @access  Private (admin/manager)
 */
async function manualSync(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const device = await HikvisionDevice.findOne({ where });
    if (!device) throw createError('NOT_FOUND', 'Device not found');

    const _manualSyncStart = Date.now();

    // Support query params for custom time range
    const tz = getTenantTimezone(req);
    const { startDate, fullDay } = req.query;
    const endTime = new Date();
    let startTime;

    if (startDate) {
      startTime = /^\d{4}-\d{2}-\d{2}$/.test(String(startDate))
        ? startOfDayInTz(startDate, tz)
        : new Date(startDate);
    } else if (fullDay === 'true') {
      startTime = startOfDayInTz(todayInTz(tz), tz);
    } else {
      // Default: from last sync, or last 24 hours if never synced
      startTime = device.lastSyncAt || new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
    }

    logger.info('[manualSync] pulling attendance logs from device', {
      deviceId: device.id,
      deviceName: device.name,
      ip: device.ipAddress,
      syncFrom: startTime,
      syncTo: endTime,
    });

    let rawEvents;
    try {
      rawEvents = await HikvisionService.pullEvents(device, startTime, endTime);
    } catch (pullErr) {
      logger.error('[manualSync] pull failed — device unreachable or credentials wrong', {
        deviceId: device.id,
        deviceName: device.name,
        ip: device.ipAddress,
        port: device.port,
        error: pullErr.message,
      });
      await writeSyncLog({
        deviceId: device.id,
        tenantId: device.tenantId,
        syncType: 'attendance_pull',
        trigger: 'manual',
        status: 'failed',
        errorMessage: pullErr.message,
        syncFrom: startTime,
        syncTo: endTime,
        durationMs: Date.now() - _manualSyncStart,
        triggeredByUserId: req.user?.id || null,
      });
      return res.status(502).json({
        success: false,
        message: `Failed to pull events from device (${device.ipAddress}:${device.port})`,
        error: pullErr.message,
        hint: pullErr.message.includes('timeout')
          ? 'Device not reachable. Check IP, port, and network connectivity. Try test connection first.'
          : 'Check device credentials and ISAPI availability.',
      });
    }

    logger.info('[manualSync] events pulled from device', {
      deviceId: device.id,
      deviceName: device.name,
      rawEventCount: rawEvents.length,
      syncFrom: startTime,
      syncTo: endTime,
    });

    const stats = await HikvisionEventProcessor.processEvents(device.id, rawEvents, 'pull');

    logger.info('[manualSync] attendance logs processed and saved to DB', {
      deviceId: device.id,
      deviceName: device.name,
      ...stats,
    });

    // Update lastSyncAt
    await device.update({ lastSyncAt: endTime });

    const syncMode = startDate ? 'custom_date' : fullDay === 'true' ? 'full_day' : 'since_last_sync';
    const manualSyncDuration = Date.now() - _manualSyncStart;

    // Tulis sync log
    await writeSyncLog({
      deviceId: device.id,
      tenantId: device.tenantId,
      syncType: 'attendance_pull',
      trigger: 'manual',
      status: stats.processed > 0 ? 'success' : 'success',
      stats: { ...stats, rawEventCount: rawEvents.length, syncMode },
      syncFrom: startTime,
      syncTo: endTime,
      durationMs: manualSyncDuration,
      triggeredByUserId: req.user?.id || null,
    });

    // Fetch the actual logs that were inserted/updated during this sync window
    const pulledLogs = await DeviceAttendanceLog.findAll({
      where: {
        deviceId: device.id,
        eventTime: { [Op.gte]: startTime, [Op.lte]: endTime },
      },
      order: [['eventTime', 'DESC']],
      limit: 30,
      attributes: ['id', 'eventTime', 'deviceEmployeeNo', 'verifyMode', 'eventType', 'matchedUserId', 'matchedDeviceEmployeeId'],
      include: [
        {
          model: DeviceEmployee,
          as: 'matchedDeviceEmployee',
          attributes: ['id', 'employeeNo', 'name'],
          required: false,
        },
      ],
    });

    return res.json({
      success: true,
      syncedFrom: startTime,
      syncedTo: endTime,
      syncMode,
      rawEventCount: rawEvents.length,
      processed: stats.processed,
      duplicates: stats.duplicates,
      matched: stats.matched,
      unmatched: stats.unmatched,
      cooldownSkipped: stats.cooldownSkipped || 0,
      durationMs: manualSyncDuration,
      pulledLogs: pulledLogs.map(l => ({
        id: l.id,
        eventTime: l.eventTime,
        employeeNo: l.deviceEmployeeNo,
        employeeName: l.matchedDeviceEmployee?.name || null,
        verifyMode: l.verifyMode,
        eventType: l.eventType,
        isMatched: !!(l.matchedUserId || l.matchedDeviceEmployeeId),
      })),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   GET /integrations/hikvision/devices/:id/test
 * @desc    Test connection to a Hikvision device (auto-discovers port if needed)
 * @access  Private (admin)
 */
async function testConnection(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const device = await HikvisionDevice.findOne({ where });
    if (!device) throw createError('NOT_FOUND', 'Device not found');

    const result = await HikvisionService.testConnection(device);

    // If a different port was discovered, auto-update device record
    if (result.success && result.discoveredPort && result.discoveredPort !== device.port) {
      await device.update({ port: result.discoveredPort });
      logger.info('Hikvision device port auto-updated', {
        deviceId: device.id,
        oldPort: device.port,
        newPort: result.discoveredPort,
      });
    }

    // Auto-save serial number if discovered and not yet stored
    if (result.success && result.serialNumber && !device.serialNumber) {
      await device.update({ serialNumber: result.serialNumber });
      logger.info('Hikvision device serial number auto-saved', {
        deviceId: device.id,
        serialNumber: result.serialNumber,
      });
    }

    return res.json({ success: result.success, ...result });
  } catch (err) {
    return next(err);
  }
}

// ==========================================
// Employee Management on Device
// (Since device has no web UI)
// ==========================================

// ==========================================
// Staff ↔ Device Mapping
// ==========================================

/**
 * @route   GET /integrations/hikvision/staff-mapping
 * @desc    List all users (staff) with their deviceEmployeeNo mapping status
 * @access  Private (admin)
 */
async function listStaffMapping(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const where = { isActive: true };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const users = await User.findAll({
      where,
      attributes: ['id', 'firstName', 'lastName', 'email', 'deviceEmployeeNo'],
      include: [{ model: require('../../../models').Role, as: 'role', attributes: ['id', 'name'] }],
      order: [['firstName', 'ASC']],
    });

    // Summarize
    const mapped = users.filter(u => u.deviceEmployeeNo);
    const unmapped = users.filter(u => !u.deviceEmployeeNo);

    return res.json({
      success: true,
      data: users,
      summary: {
        total: users.length,
        mapped: mapped.length,
        unmapped: unmapped.length,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   PUT /integrations/hikvision/staff-mapping/:userId
 * @desc    Assign a deviceEmployeeNo to a user (staff)
 * @access  Private (admin)
 */
async function assignStaffDeviceNo(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { userId } = req.params;
    const { deviceEmployeeNo } = req.body;

    if (!deviceEmployeeNo) {
      throw createError('VALIDATION_ERROR', 'deviceEmployeeNo is required');
    }

    // Validate userId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!userId || !uuidRegex.test(userId)) {
      throw createError('VALIDATION_ERROR', `Invalid userId: "${userId}". Must be a valid UUID.`);
    }

    const userWhere = { id: userId };
    if (!isSuperAdmin) userWhere.tenantId = tenantId;

    const user = await User.findOne({ where: userWhere });
    if (!user) throw createError('NOT_FOUND', 'User not found');

    // Check for duplicate — no two users should have the same deviceEmployeeNo in one tenant
    const duplicate = await User.findOne({
      where: {
        tenantId: user.tenantId,
        deviceEmployeeNo: String(deviceEmployeeNo),
        id: { [Op.ne]: userId },
      },
    });
    if (duplicate) {
      throw createError('VALIDATION_ERROR',
        `deviceEmployeeNo "${deviceEmployeeNo}" is already assigned to ${duplicate.firstName} ${duplicate.lastName}`);
    }

    await user.update({ deviceEmployeeNo: String(deviceEmployeeNo) });

    logger.info('Staff deviceEmployeeNo assigned', {
      userId,
      deviceEmployeeNo,
      tenantId: user.tenantId,
    });

    return res.json({
      success: true,
      message: `deviceEmployeeNo "${deviceEmployeeNo}" assigned to ${user.firstName} ${user.lastName}`,
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        deviceEmployeeNo: user.deviceEmployeeNo,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   DELETE /integrations/hikvision/staff-mapping/:userId
 * @desc    Remove deviceEmployeeNo mapping from a user
 * @access  Private (admin)
 */
async function unassignStaffDeviceNo(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { userId } = req.params;

    const userWhere = { id: userId };
    if (!isSuperAdmin) userWhere.tenantId = tenantId;

    const user = await User.findOne({ where: userWhere });
    if (!user) throw createError('NOT_FOUND', 'User not found');

    const oldNo = user.deviceEmployeeNo;
    await user.update({ deviceEmployeeNo: null });

    logger.info('Staff deviceEmployeeNo unassigned', {
      userId,
      oldDeviceEmployeeNo: oldNo,
      tenantId: user.tenantId,
    });

    return res.json({
      success: true,
      message: `deviceEmployeeNo removed from ${user.firstName} ${user.lastName}`,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   POST /integrations/hikvision/reprocess-logs
 * @desc    Re-process unmatched device logs to create StaffAttendance records
 *          (useful after assigning deviceEmployeeNo to users)
 * @access  Private (admin)
 */
async function reprocessUnmatchedLogs(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate } = req.body;

    const where = {
      matchedUserId: null,
      matchedMemberId: null,
    };
    if (!isSuperAdmin) where.tenantId = tenantId;

    mergeDateRangeInto(where, 'eventTime', startDate, endDate, Op, getTenantTimezone(req));

    // Find all unmatched logs
    const unmatchedLogs = await DeviceAttendanceLog.findAll({
      where,
      order: [['eventTime', 'ASC']],
    });

    if (!unmatchedLogs.length) {
      return res.json({ success: true, message: 'No unmatched logs found', stats: { total: 0, matched: 0, stillUnmatched: 0 } });
    }

    let matched = 0;
    let stillUnmatched = 0;

    for (const log of unmatchedLogs) {
      // Try to find matching DeviceEmployee now
      const matchedEmployee = await DeviceEmployee.findOne({
        where: {
          tenantId: log.tenantId,
          employeeNo: log.deviceEmployeeNo,
        },
      });

      if (matchedEmployee) {
        const t = await sequelize.transaction();
        try {
          // Update log with matched employee
          await log.update({
            matchedDeviceEmployeeId: matchedEmployee.id,
            matchedUserId: matchedEmployee.userId || null,
          }, { transaction: t });

          // Load tenant timezone for correct local date calculation
          const logTenant = await Tenant.findByPk(log.tenantId, { attributes: ['settings'] });
          const logTimezone = logTenant?.settings?.timezone || process.env.TZ || 'Asia/Jakarta';

          // Upsert StaffAttendance
          await HikvisionEventProcessor.upsertStaffAttendance(
            { id: log.deviceId, tenantId: log.tenantId },
            matchedEmployee,
            { eventTime: log.eventTime, cardNo: log.cardNo, verifyMode: log.verifyMode },
            log.id,
            t,
            logTimezone
          );

          await t.commit();
          matched++;
        } catch (err) {
          await t.rollback();
          logger.error('reprocessUnmatchedLogs: error reprocessing log', {
            logId: log.id,
            error: err.message,
          });
        }
      } else {
        // Also try matching member
        let matchedMember = null;
        const device = await HikvisionDevice.findByPk(log.deviceId);
        if (device && device.useForMemberCheckIn) {
          matchedMember = await Member.findOne({
            where: {
              tenantId: log.tenantId,
              deviceEmployeeNo: log.deviceEmployeeNo,
              isActive: true,
            },
          });

          if (matchedMember) {
            const t = await sequelize.transaction();
            try {
              await log.update({ matchedMemberId: matchedMember.id }, { transaction: t });
              await HikvisionEventProcessor.createMemberCheckIn(
                device,
                matchedMember,
                { eventTime: log.eventTime },
                t
              );
              await t.commit();
              matched++;
              continue;
            } catch (err) {
              await t.rollback();
              logger.error('reprocessUnmatchedLogs: error reprocessing member log', {
                logId: log.id,
                error: err.message,
              });
            }
          }
        }

        if (!matchedMember) {
          stillUnmatched++;
        }
      }
    }

    logger.info('reprocessUnmatchedLogs complete', { total: unmatchedLogs.length, matched, stillUnmatched });

    return res.json({
      success: true,
      message: `Reprocessed ${unmatchedLogs.length} unmatched logs`,
      stats: {
        total: unmatchedLogs.length,
        matched,
        stillUnmatched,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   GET /integrations/hikvision/devices/:id/employees
 * @desc    List employees registered on a device
 * @access  Private (admin)
 */
async function listDeviceEmployees(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    // Pagination params
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const device = await HikvisionDevice.findOne({ where });
    if (!device) throw createError('NOT_FOUND', 'Device not found');

    const employees = await HikvisionService.listEmployees(device);

    // Merge with DB records for mapping info
    const dbRecords = await DeviceEmployee.findAll({
      where: { deviceId: device.id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    const dbMap = {};
    for (const rec of dbRecords) {
      dbMap[rec.employeeNo] = rec;
    }

    // Fetch real-time FP counts from device
    const fpCountMap = await HikvisionService.getFingerprintCountMap(device);

    // Enrich all device data with DB info + real-time FP data from device
    const enriched = employees.map(emp => {
      const dbRec = dbMap[emp.employeeNo];
      const realFpCount = fpCountMap ? (fpCountMap[String(emp.employeeNo)] || 0) : null;
      return {
        ...emp,
        fingerprintCount: realFpCount !== null ? realFpCount : (dbRec?.fingerprintCount || 0),
        hasFingerprint: realFpCount !== null ? realFpCount > 0 : (dbRec?.hasFingerprint || false),
        dbRecord: dbRec ? {
          id: dbRec.id,
          userId: dbRec.userId,
          user: dbRec.user,
          hasFingerprint: dbRec.hasFingerprint,
          fingerprintCount: dbRec.fingerprintCount,
          status: dbRec.status,
        } : null,
      };
    });

    // Apply pagination on the enriched result
    const total = enriched.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedData = enriched.slice(offset, offset + limit);

    return res.json({
      success: true,
      data: paginatedData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   POST /integrations/hikvision/devices/:id/employees
 * @desc    Add an employee to the device
 * @access  Private (admin)
 */
async function addDeviceEmployee(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { employeeNo, name, userId, syncToDevice = true } = req.body;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const device = await HikvisionDevice.findOne({ where });
    if (!device) throw createError('NOT_FOUND', 'Device not found');

    if (!employeeNo) {
      throw createError('VALIDATION_ERROR', 'employeeNo is required');
    }

    // ── DB-only mode: simpan ke database dulu, belum push ke device ──
    if (!syncToDevice) {
      const [deviceEmployee, created] = await DeviceEmployee.upsert(
        {
          tenantId: device.tenantId,
          deviceId: device.id,
          employeeNo: String(employeeNo),
          name: name || `Employee ${employeeNo}`,
          userId: userId || null,
          status: 'pending_sync',
          lastSyncAt: null,
        },
        { conflictFields: ['deviceId', 'employeeNo'] }
      );

      if (userId) {
        const userWhere = { id: userId };
        if (!isSuperAdmin) userWhere.tenantId = tenantId;
        await User.update(
          { deviceEmployeeNo: String(employeeNo) },
          { where: userWhere }
        );
      }

      logger.info('Device employee registered (pending sync to device)', {
        deviceId: device.id,
        employeeNo,
        userId: userId || null,
        deviceEmployeeId: deviceEmployee.id,
        created,
      });

      return res.status(201).json({
        success: true,
        message: created
          ? 'Employee registered in system. Use POST /push-pending-employees to sync to device.'
          : 'Employee record updated (status set to pending_sync). Use POST /push-pending-employees to sync.',
        data: deviceEmployee,
        syncedToDevice: false,
      });
    }

    // ── Default mode: push ke device sekaligus ──
    const result = await HikvisionService.setEmployee(device, { employeeNo, name });

    // Persist to DeviceEmployee table
    const [deviceEmployee] = await DeviceEmployee.upsert(
      {
        tenantId: device.tenantId,
        deviceId: device.id,
        employeeNo: String(employeeNo),
        name: name || `Employee ${employeeNo}`,
        userId: userId || null,
        status: 'active',
        lastSyncAt: new Date(),
      },
      { conflictFields: ['deviceId', 'employeeNo'] }
    );

    // If a userId was provided, update the User's deviceEmployeeNo
    if (userId) {
      const userWhere = { id: userId };
      if (!isSuperAdmin) userWhere.tenantId = tenantId;

      await User.update(
        { deviceEmployeeNo: String(employeeNo) },
        { where: userWhere }
      );
    }

    // Treat "deviceUserAlreadyExist" as a soft-success:
    // the employee already exists on the device — DB upsert is still correct.
    let deviceResultParsed = null;
    try {
      deviceResultParsed = typeof result.result === 'string' ? JSON.parse(result.result) : result.result;
    } catch (_) { /* non-JSON response, ignore */ }

    const alreadyExists = deviceResultParsed?.subStatusCode === 'deviceUserAlreadyExist';
    const effectiveSuccess = result.success || alreadyExists;

    logger.info('Device employee added/updated', {
      deviceId: device.id,
      employeeNo,
      userId: userId || null,
      deviceEmployeeId: deviceEmployee.id,
      deviceSuccess: result.success,
      alreadyExistsOnDevice: alreadyExists,
    });

    const message = effectiveSuccess
      ? alreadyExists
        ? 'Employee already exists on device, database record updated'
        : 'Employee added to device'
      : 'Failed to add employee to device';

    return res.json({
      success: effectiveSuccess,
      message,
      data: deviceEmployee,
      deviceResult: result,
      ...(alreadyExists ? { warning: 'Employee already registered on device (deviceUserAlreadyExist)' } : {}),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   DELETE /integrations/hikvision/devices/:id/employees/:employeeNo
 * @desc    Remove an employee from the device
 * @access  Private (admin)
 */
async function removeDeviceEmployee(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id, employeeNo } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const device = await HikvisionDevice.findOne({ where });
    if (!device) throw createError('NOT_FOUND', 'Device not found');

    const result = await HikvisionService.deleteEmployee(device, employeeNo);

    // Remove from DeviceEmployee table
    await DeviceEmployee.destroy({
      where: { deviceId: device.id, employeeNo: String(employeeNo) },
    });

    logger.info('Device employee removed', {
      deviceId: device.id,
      employeeNo,
    });

    return res.json({ success: result.success, message: 'Employee removed from device' });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   POST /integrations/hikvision/devices/:id/employees/:employeeNo/enroll-fingerprint
 * @desc    Start fingerprint enrollment for an employee on the device
 * @access  Private (admin)
 */
async function enrollFingerprint(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id, employeeNo } = req.params;
    let { fingerNo, fingerType } = req.body;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const device = await HikvisionDevice.findOne({ where });
    if (!device) throw createError('NOT_FOUND', 'Device not found');

    // Auto-detect next available finger slot if not specified
    if (!fingerNo) {
      const existingFps = await HikvisionService.getEmployeeFingerprints(device, employeeNo);
      const usedSlots = existingFps.map(fp => fp.fingerPrintID);
      // Find next available slot (1-10)
      fingerNo = 1;
      for (let i = 1; i <= 10; i++) {
        if (!usedSlots.includes(i)) {
          fingerNo = i;
          break;
        }
      }
      logger.info('Auto-detected next finger slot', {
        deviceId: device.id,
        employeeNo,
        usedSlots,
        selectedSlot: fingerNo,
      });
    }

    // Lock device so cron job won't interrupt enrollment (2 min TTL)
    HikvisionService.lockForEnrollment(device.id, employeeNo, 120_000);

    const result = await HikvisionService.startFingerprintEnroll(
      device,
      employeeNo,
      fingerNo,
      fingerType || 'normalFP'
    );

    if (!result.success) {
      // Setup step failed — release lock immediately
      HikvisionService.unlockEnrollment(device.id);

      // Provide helpful error diagnostics based on SetUp step failure
      const setupResult = result.result?.setup || result.result;
      const subStatus = setupResult?.subStatusCode;
      let errorHint = '';
      if (subStatus === 'noEmployee' || setupResult?.errorMsg === 'employeeNo') {
        errorHint = `Employee ${employeeNo} is not registered on the device. Add the employee first via POST /devices/${id}/employees.`;
      } else if (subStatus === 'badJsonContent') {
        errorHint = 'Device rejected the request body. Check device firmware compatibility.';
      } else if (subStatus === 'methodNotAllowed') {
        errorHint = 'Device does not support remote fingerprint enrollment via ISAPI on this firmware version.';
      }

      return res.status(result.status || 400).json({
        success: false,
        message: errorHint || 'Fingerprint enrollment failed at setup step.',
        result: result.result,
        step: result.step,
        hint: errorHint || undefined,
      });
    }

    // Update DeviceEmployee record with fingerprint info
    // (Background capture will update this asynchronously)
    DeviceEmployee.update(
      {
        hasFingerprint: true,
        fingerprintCount: sequelize.literal('"fingerprintCount" + 1'),
      },
      { where: { deviceId: device.id, employeeNo: String(employeeNo) } }
    ).catch(err => {
      logger.warn('Failed to update DeviceEmployee fingerprint status (non-critical)', {
        deviceId: device.id,
        employeeNo,
        error: err.message,
      });
    });

    return res.json({
      success: result.success,
      message: `Fingerprint enrollment started on finger slot ${fingerNo}. Please place finger on the device scanner (3 times).`,
      result: result.result,
      fingerSlot: fingerNo,
      enrollmentLock: {
        locked: result.success,
        expiresInSeconds: result.success ? 120 : 0,
        note: 'Device sync is paused during enrollment. Lock auto-expires after 2 minutes.',
      },
      instructions: [
        '1. Device screen will show fingerprint enrollment prompt',
        '2. Employee must place the same finger on the scanner 3 times',
        '3. Device will beep/confirm when enrollment is complete',
        `4. Finger slot ${fingerNo} of 10 will be used (each employee can have up to 10 fingerprints)`,
        '5. After enrollment, call DELETE /enrollment-lock to resume sync (or wait 2 min auto-expire)',
      ],
    });
  } catch (err) {
    // On error, make sure lock is released
    if (req.params.id) HikvisionService.unlockEnrollment(req.params.id);
    return next(err);
  }
}

/**
 * @route   DELETE /integrations/hikvision/devices/:id/employees/:employeeNo/fingerprint
 * @desc    Delete fingerprint(s) for an employee on the device
 * @access  Private (admin)
 */
async function deleteFingerprint(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id, employeeNo } = req.params;
    const { fingerPrintIDs } = req.body || {}; // optional array of finger IDs to delete

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const device = await HikvisionDevice.findOne({ where });
    if (!device) throw createError('NOT_FOUND', 'Device not found');

    const result = await HikvisionService.deleteFingerprint(device, employeeNo, fingerPrintIDs);

    return res.json({
      success: result.success,
      message: fingerPrintIDs
        ? `Fingerprint(s) ${fingerPrintIDs.join(', ')} deleted for employee ${employeeNo}`
        : `All fingerprints deleted for employee ${employeeNo}`,
      result: result.result,
    });
  } catch (err) {
    return next(err);
  }
}

// ==========================================
// Device Configuration
// (Since device has no web UI or schedule management)
// ==========================================

/**
 * @route   POST /integrations/hikvision/devices/:id/configure-push
 * @desc    Configure event push URL on the device
 * @access  Private (admin)
 */
async function configurePush(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { serverUrl } = req.body;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const device = await HikvisionDevice.findOne({ where });
    if (!device) throw createError('NOT_FOUND', 'Device not found');

    if (!serverUrl) {
      throw createError('VALIDATION_ERROR', 'serverUrl is required');
    }

    const result = await HikvisionService.configureEventPush(device, serverUrl);

    if (result.success) {
      await device.update({ pushUrl: serverUrl, pushEnabled: true });
    }

    return res.json({
      success: result.success,
      message: result.success ? 'Push URL configured on device' : 'Failed to configure push URL on device',
      data: {
        pushUrl: result.success ? serverUrl : device.pushUrl,
        pushEnabled: result.success ? true : device.pushEnabled,
        ...(result.usedVariant && { usedVariant: result.usedVariant }),
        ...(result.error && { error: result.error }),
        ...(result.rawDeviceConfig && { rawDeviceConfig: result.rawDeviceConfig }),
      }
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   GET /integrations/hikvision/devices/:id/push-status
 * @desc    Get current push configuration from device hardware & database
 * @access  Private (admin)
 */
async function getPushStatus(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const device = await HikvisionDevice.findOne({ where });
    if (!device) throw createError('NOT_FOUND', 'Device not found');

    // Read from device hardware
    const hwConfig = await HikvisionService.getEventPushConfig(device);

    // Compare with database
    let dbPushUrl = device.pushUrl || null;
    let dbPushEnabled = device.pushEnabled || false;

    // Auto-sync DB if out of date (only when device query succeeded)
    if (hwConfig.success && hwConfig.enabled !== dbPushEnabled) {
      await device.update({
        pushUrl: hwConfig.pushUrl || dbPushUrl,
        pushEnabled: hwConfig.enabled,
      });
      // Update local vars to reflect new DB state
      dbPushUrl = hwConfig.pushUrl || dbPushUrl;
      dbPushEnabled = hwConfig.enabled;
    }

    // DS-K1T8003 behavior: device doesn't store url path, shows EHome protocol, 
    // but ipAddress+portNo are set correctly. Compare by IP:port match, not exact URL.
    let urlInSync = false;
    if (hwConfig.success && dbPushUrl && hwConfig.pushUrl) {
      try {
        const dbU = new URL(dbPushUrl);
        const hwU = new URL(hwConfig.pushUrl);
        // Match if hostname/IP and port are the same (ignore path — device may not store it)
        urlInSync = dbU.hostname === hwU.hostname && dbU.port === hwU.port;
      } catch {
        urlInSync = dbPushUrl === hwConfig.pushUrl;
      }
    }
    // Also consider in-sync if device reports ipAddress+portNo matching DB URL
    if (!urlInSync && hwConfig.success && hwConfig.ipAddress && hwConfig.portNo && dbPushUrl) {
      try {
        const dbU = new URL(dbPushUrl);
        urlInSync = dbU.hostname === hwConfig.ipAddress && 
          parseInt(dbU.port || (dbU.protocol === 'https:' ? '443' : '80'), 10) === hwConfig.portNo;
      } catch { /* ignore */ }
    }

    return res.json({
      success: true,
      data: {
        database: {
          pushUrl: dbPushUrl,
          pushEnabled: dbPushEnabled,
        },
        device: {
          reachable: hwConfig.success,
          pushUrl: hwConfig.pushUrl,
          pushEnabled: hwConfig.enabled,
          protocolType: hwConfig.protocolType,
          ...(hwConfig.ipAddress && { ipAddress: hwConfig.ipAddress }),
          ...(hwConfig.portNo && { portNo: hwConfig.portNo }),
          ...(hwConfig.error && { error: hwConfig.error }),
          ...(hwConfig.rawResponse && { rawResponse: hwConfig.rawResponse }),
        },
        inSync: hwConfig.success && urlInSync && dbPushEnabled === hwConfig.enabled,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   DELETE /integrations/hikvision/devices/:id/push
 * @desc    Disable push events on device and clear saved push URL
 * @access  Private (admin)
 */
async function disablePush(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const device = await HikvisionDevice.findOne({ where });
    if (!device) throw createError('NOT_FOUND', 'Device not found');

    const result = await HikvisionService.disableEventPush(device);

    if (result.success) {
      await device.update({ pushUrl: null, pushEnabled: false });
    }

    return res.json({ success: true, message: 'Push events disabled on device', data: { pushUrl: null, pushEnabled: false } });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   POST /integrations/hikvision/devices/:id/sync-time
 * @desc    Sync device time with server time
 * @access  Private (admin)
 */
async function syncDeviceTime(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const device = await HikvisionDevice.findOne({ where });
    if (!device) throw createError('NOT_FOUND', 'Device not found');

    const result = await HikvisionService.setDeviceTime(device);

    return res.json({
      success: result.success,
      message: 'Device configured to NTP auto-sync (pool.ntp.org, interval 60 min, WITA UTC+8)',
      httpStatus: result.status,
      deviceResponse: result.responseBody || null,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   GET /integrations/hikvision/devices/:id/logs
 * @desc    Get raw attendance logs for a device. Supports ?sync=true to pull fresh events first.
 * @access  Private (admin/manager)
 */
async function getDeviceLogs(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { page = 1, limit = 50, startDate, endDate, sync } = req.query;

    const deviceWhere = { id };
    if (!isSuperAdmin) deviceWhere.tenantId = tenantId;

    const device = await HikvisionDevice.findOne({ where: deviceWhere });
    if (!device) throw createError('NOT_FOUND', 'Device not found');

    // Auto-sync: pull fresh events from device before returning logs
    let syncResult = null;
    if (sync === 'true') {
      try {
        const endTime = new Date();
        const syncStart = device.lastSyncAt || new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
        const rawEvents = await HikvisionService.pullEvents(device, syncStart, endTime);

        if (rawEvents.length > 0) {
          syncResult = await HikvisionEventProcessor.processEvents(device.id, rawEvents, 'pull');
        } else {
          syncResult = { processed: 0, duplicates: 0, matched: 0, unmatched: 0 };
        }
        await device.update({ lastSyncAt: endTime });
      } catch (syncErr) {
        logger.warn('getDeviceLogs auto-sync failed (continuing with cached data)', {
          deviceId: id,
          error: syncErr.message,
        });
        syncResult = { error: syncErr.message };
      }
    }

    const where = { deviceId: id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    mergeDateRangeInto(where, 'eventTime', startDate, endDate, Op, getTenantTimezone(req));

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await DeviceAttendanceLog.findAndCountAll({
      where,
      include: [
        { model: User, as: 'matchedUser', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Member, as: 'matchedMember', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: DeviceEmployee, as: 'matchedDeviceEmployee', attributes: ['id', 'employeeNo', 'name'] },
      ],
      order: [['eventTime', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    const response = {
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
      lastSyncAt: device.lastSyncAt,
    };

    if (syncResult) {
      response.syncResult = syncResult;
    }

    return res.json(response);
  } catch (err) {
    return next(err);
  }
}

// ==========================================
// Enrollment Lock Management
// ==========================================

/**
 * @route   DELETE /integrations/hikvision/devices/:id/enrollment-lock
 * @desc    Release enrollment lock so sync job resumes for this device
 * @access  Private (gym admin)
 */
async function unlockEnrollment(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const device = await HikvisionDevice.findOne({ where });
    if (!device) throw createError('NOT_FOUND', 'Device not found');

    const lockInfo = HikvisionService.getEnrollmentLock(device.id);
    HikvisionService.unlockEnrollment(device.id);

    return res.json({
      success: true,
      message: lockInfo
        ? 'Enrollment lock released. Device sync will resume on next cycle.'
        : 'No active enrollment lock found for this device.',
      previousLock: lockInfo || null,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   POST /integrations/hikvision/devices/:id/sync-employees
 * @desc    Sync employees from device to database (import existing employees)
 * @access  Private (admin)
 */
async function syncDeviceEmployees(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const device = await HikvisionDevice.findOne({ where });
    if (!device) throw createError('NOT_FOUND', 'Device not found');

    // Get all employees from device
    const deviceEmployees = await HikvisionService.listEmployees(device);

    // Get real fingerprint counts from device (separate endpoint + UserInfo fallback)
    // Returns null if all strategies fail
    let fpCountMap = await HikvisionService.getFingerprintCountMap(device);
    let hasFpData = fpCountMap !== null;

    // Last-resort fallback: use numOfFP from the listEmployees response we already have
    if (!hasFpData && deviceEmployees.length > 0) {
      const anyHasNumOfFP = deviceEmployees.some(e => e.numOfFP !== undefined || e.numOfFingerPrint !== undefined);
      if (anyHasNumOfFP) {
        fpCountMap = {};
        for (const emp of deviceEmployees) {
          const count = emp.numOfFP || emp.numOfFingerPrint || 0;
          if (count > 0) {
            fpCountMap[String(emp.employeeNo)] = count;
          }
        }
        hasFpData = true;
        logger.info('Using numOfFP from UserInfo response as fingerprint count source', {
          deviceId: device.id,
          employeesWithFP: Object.keys(fpCountMap).length,
        });
      }
    }

    if (!hasFpData) {
      logger.warn('Fingerprint count data unavailable from device — preserving existing DB fingerprint data', {
        deviceId: device.id,
      });
    }

    let created = 0;
    let updated = 0;

    for (const emp of deviceEmployees) {
      // Try to find matching User by deviceEmployeeNo
      const matchedUser = await User.findOne({
        where: {
          tenantId: device.tenantId,
          deviceEmployeeNo: String(emp.employeeNo),
        },
      });

      // Build upsert data — only include FP fields when we have reliable data from device
      const upsertData = {
        tenantId: device.tenantId,
        deviceId: device.id,
        employeeNo: String(emp.employeeNo),
        name: emp.name || `Employee ${emp.employeeNo}`,
        userId: matchedUser ? matchedUser.id : null,
        status: 'active',
        lastSyncAt: new Date(),
      };

      // Only update fingerprint fields when we have real data from device FP search
      if (hasFpData) {
        const realFpCount = fpCountMap[String(emp.employeeNo)] || 0;
        upsertData.hasFingerprint = realFpCount > 0;
        upsertData.fingerprintCount = realFpCount;
      }

      const [record, isNew] = await DeviceEmployee.upsert(
        upsertData,
        { conflictFields: ['deviceId', 'employeeNo'] }
      );

      if (isNew) created++;
      else updated++;
    }

    // Mark employees NOT on device as inactive
    const deviceEmployeeNos = deviceEmployees.map(e => String(e.employeeNo));
    if (deviceEmployeeNos.length > 0) {
      await DeviceEmployee.update(
        { status: 'inactive' },
        {
          where: {
            deviceId: device.id,
            employeeNo: { [Op.notIn]: deviceEmployeeNos },
            status: 'active',
          },
        }
      );
    }

    logger.info('Device employees synced to DB', {
      deviceId: device.id,
      total: deviceEmployees.length,
      created,
      updated,
      fingerprintDataAvailable: hasFpData,
    });

    await writeSyncLog({
      deviceId: device.id,
      tenantId: device.tenantId,
      syncType: 'employee_import_from_device',
      trigger: 'manual',
      status: 'success',
      stats: { total: deviceEmployees.length, created, updated, fingerprintDataSynced: hasFpData },
      triggeredByUserId: req.user?.id || null,
    });

    return res.json({
      success: true,
      message: `Synced ${deviceEmployees.length} employees from device`,
      stats: {
        total: deviceEmployees.length,
        created,
        updated,
        fingerprintDataSynced: hasFpData,
      },
      ...(hasFpData ? {} : {
        warning: 'Fingerprint count data could not be retrieved from device. Existing fingerprint data in database was preserved.',
      }),
      howItWorks: [
        'sync-employees membaca daftar employee yang sudah ada di hardware device lalu menyimpannya ke database.',
        'Berguna saat device sudah berisi data tapi database kosong atau tidak sinkron.',
        'Employee yang ADA di device → status active di DB.',
        'Employee yang ada di DB tapi TIDAK di device → status diubah ke inactive.',
        'TIDAK mendaftarkan employee baru ke device — gunakan POST /devices/:id/employees untuk itu.',
      ],
      nextStep: created > 0
        ? 'Employee baru berhasil diimport ke DB. Link ke user via PUT /device-employees/:id jika diperlukan.'
        : undefined,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   GET /integrations/hikvision/device-employees
 * @desc    List all device employees from database (across all devices)
 * @access  Private (admin)
 */
async function listAllDeviceEmployees(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { deviceId, userId, status, hasFingerprint, employeeNo, search } = req.query;

    // Pagination params — default 100 so all employees fit on one page for most gyms
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const offset = (page - 1) * limit;

    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;
    if (deviceId) where.deviceId = deviceId;
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (hasFingerprint !== undefined && hasFingerprint !== '') {
      where.hasFingerprint = hasFingerprint === 'true';
    }

    // Filter by exact employeeNo
    if (employeeNo) where.employeeNo = String(employeeNo);

    // Search by name or employeeNo (partial match)
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { employeeNo: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows: records } = await DeviceEmployee.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'deviceEmployeeNo'],
        },
        {
          model: HikvisionDevice,
          as: 'device',
          attributes: ['id', 'name', 'ipAddress'],
        },
      ],
      // Sort numerically by employeeNo (cast to integer for proper numeric ordering)
      order: [[sequelize.literal('CAST("DeviceEmployee"."employeeNo" AS INTEGER)'), 'ASC']],
      limit,
      offset,
    });

    const totalPages = Math.ceil(count / limit);

    return res.json({
      success: true,
      data: records,
      pagination: {
        total: count,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   PUT /integrations/hikvision/device-employees/:id
 * @desc    Update a device employee record (e.g., link to user)
 * @access  Private (admin)
 */
async function updateDeviceEmployee(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const record = await DeviceEmployee.findOne({ where });
    if (!record) throw createError('NOT_FOUND', 'Device employee record not found');

    const { userId, name, status } = req.body;

    await record.update({
      ...(userId !== undefined && { userId }),
      ...(name !== undefined && { name }),
      ...(status !== undefined && { status }),
    });

    // If linking to a user, also update User.deviceEmployeeNo
    if (userId) {
      const userWhere = { id: userId };
      if (!isSuperAdmin) userWhere.tenantId = tenantId;
      await User.update(
        { deviceEmployeeNo: record.employeeNo },
        { where: userWhere }
      );
    }

    // Reload with associations
    await record.reload({
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: HikvisionDevice, as: 'device', attributes: ['id', 'name', 'ipAddress'] },
      ],
    });

    return res.json({
      success: true,
      data: record,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   POST /integrations/hikvision/devices/:id/push-pending-employees
 * @desc    Push all pending_sync employees to the device, then update status to active.
 *          Allows the "input to system first, sync later" workflow.
 * @access  Private (admin)
 */
async function pushPendingEmployees(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const device = await HikvisionDevice.findOne({ where });
    if (!device) throw createError('NOT_FOUND', 'Device not found');

    // Find all pending employees for this device
    const pendingEmployees = await DeviceEmployee.findAll({
      where: {
        deviceId: device.id,
        status: 'pending_sync',
      },
    });

    if (!pendingEmployees.length) {
      return res.json({
        success: true,
        message: 'No pending employees to sync.',
        stats: { total: 0, synced: 0, failed: 0 },
        results: [],
      });
    }

    const results = [];
    let synced = 0;
    let failed = 0;

    for (const emp of pendingEmployees) {
      try {
        const result = await HikvisionService.setEmployee(device, {
          employeeNo: emp.employeeNo,
          name: emp.name,
        });

        // Treat "deviceUserAlreadyExist" as success
        let parsed = null;
        try { parsed = typeof result.result === 'string' ? JSON.parse(result.result) : result.result; } catch (_) { /* ignore */ }
        const alreadyExists = parsed?.subStatusCode === 'deviceUserAlreadyExist';
        const ok = result.success || alreadyExists;

        if (ok) {
          await emp.update({ status: 'active', lastSyncAt: new Date() });
          synced++;
          results.push({
            employeeNo: emp.employeeNo,
            name: emp.name,
            status: 'synced',
            alreadyExisted: alreadyExists || false,
          });
        } else {
          await emp.update({ status: 'sync_failed' });
          failed++;
          results.push({
            employeeNo: emp.employeeNo,
            name: emp.name,
            status: 'failed',
            error: result.result || 'Unknown device error',
          });
        }
      } catch (err) {
        await emp.update({ status: 'sync_failed' });
        failed++;
        results.push({
          employeeNo: emp.employeeNo,
          name: emp.name,
          status: 'failed',
          error: err.message,
        });
        logger.warn('pushPendingEmployees: failed to push employee to device', {
          deviceId: device.id,
          employeeNo: emp.employeeNo,
          error: err.message,
        });
      }
    }

    logger.info('[pushPendingEmployees] completed — all pending employees processed', {
      deviceId: device.id,
      deviceName: device.name,
      total: pendingEmployees.length,
      synced,
      failed,
    });

    await writeSyncLog({
      deviceId: device.id,
      tenantId: device.tenantId,
      syncType: 'employee_push_to_device',
      trigger: 'manual',
      status: failed === 0 ? 'success' : synced > 0 ? 'partial' : 'failed',
      stats: {
        total: pendingEmployees.length,
        synced,
        failed,
        results,
      },
      triggeredByUserId: req.user?.id || null,
    });

    return res.json({
      success: failed === 0,
      message: `Pushed ${synced} of ${pendingEmployees.length} pending employees to device.${failed > 0 ? ` ${failed} failed (status set to sync_failed).` : ''}`,
      stats: { total: pendingEmployees.length, synced, failed },
      results,
      howItWorks: [
        'pushPendingEmployees mem-push semua employee berstatus pending_sync ke hardware device.',
        'Employee dengan status pending_sync ada di DB tapi BELUM di device — absensi belum bisa berjalan.',
        'Setelah berhasil push, status berubah menjadi active dan employee bisa melakukan absensi.',
        'Jika gagal, status berubah menjadi sync_failed — cek koneksi device lalu jalankan endpoint ini lagi.',
      ],
      nextStep: synced > 0
        ? 'Employee sudah terdaftar di device. Daftarkan sidik jari via POST /devices/:id/employees/:employeeNo/enroll-fingerprint'
        : failed > 0
          ? `${failed} employee gagal di-push. Pastikan device online dan coba lagi endpoint ini.`
          : undefined,
    });
  } catch (err) {
    return next(err);
  }
}

// ==========================================
// Sync Log History
// ==========================================

/**
 * @route   GET /integrations/hikvision/devices/:id/sync-logs
 * @desc    Riwayat semua operasi sync untuk satu device: pull log, push employee, import employee
 * @access  Private (admin)
 * @query   syncType, trigger, status, startDate, endDate, page, limit
 */
async function getSyncLogs(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { syncType, trigger, status, startDate, endDate } = req.query;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    // Validate device belongs to tenant
    const deviceWhere = { id };
    if (!isSuperAdmin) deviceWhere.tenantId = tenantId;
    const device = await HikvisionDevice.findOne({ where: deviceWhere });
    if (!device) throw createError('NOT_FOUND', 'Device not found');

    const where = { deviceId: id };
    if (!isSuperAdmin) where.tenantId = tenantId;
    if (syncType) where.syncType = syncType;
    if (trigger) where.trigger = trigger;
    if (status) where.status = status;
    mergeDateRangeInto(where, 'createdAt', startDate, endDate, Op, getTenantTimezone(req));

    const { count, rows } = await DeviceSyncLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'triggeredByUser',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    // Summary stats
    const summary = await DeviceSyncLog.findAll({
      where: { deviceId: id, ...(!isSuperAdmin ? { tenantId } : {}) },
      attributes: [
        'syncType',
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('MAX', sequelize.col('createdAt')), 'lastOccurred'],
      ],
      group: ['syncType', 'status'],
      raw: true,
    });

    return res.json({
      success: true,
      device: { id: device.id, name: device.name, ipAddress: device.ipAddress },
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        hasNextPage: page < Math.ceil(count / limit),
        hasPrevPage: page > 1,
      },
      summary,
      filterOptions: {
        syncType: ['attendance_pull', 'employee_push_to_device', 'employee_import_from_device'],
        trigger: ['manual', 'cron', 'push_event'],
        status: ['success', 'partial', 'failed'],
      },
    });
  } catch (err) {
    return next(err);
  }
}

// ==========================================
// Sync Status Overview
// ==========================================

/**
 * @route   GET /integrations/hikvision/devices/:id/sync-status
 * @desc    Overview status sync antara DB dan device: employee stats, last sync, workflow guide
 * @access  Private (admin)
 */
async function getSyncStatus(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const device = await HikvisionDevice.findOne({ where });
    if (!device) throw createError('NOT_FOUND', 'Device not found');

    // Employee stats per status
    const employeeRows = await DeviceEmployee.findAll({
      where: { deviceId: device.id },
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true,
    });

    const byStatus = {};
    let totalEmployees = 0;
    for (const row of employeeRows) {
      byStatus[row.status] = parseInt(row.count, 10);
      totalEmployees += parseInt(row.count, 10);
    }

    // Employee detail list for pending & sync_failed
    const needAttention = await DeviceEmployee.findAll({
      where: {
        deviceId: device.id,
        status: { [Op.in]: ['pending_sync', 'sync_failed'] },
      },
      attributes: ['id', 'employeeNo', 'name', 'status', 'lastSyncAt', 'updatedAt'],
      order: [['status', 'ASC'], ['updatedAt', 'DESC']],
    });

    // Latest attendance log
    const latestLog = await DeviceAttendanceLog.findOne({
      where: { deviceId: device.id },
      order: [['eventTime', 'DESC']],
      attributes: ['eventTime', 'deviceEmployeeNo', 'verifyMode', 'matchedUserId', 'matchedMemberId'],
    });

    const now = new Date();
    const lastSyncMs = device.lastSyncAt ? now - new Date(device.lastSyncAt) : null;
    const minutesSinceSync = lastSyncMs !== null ? Math.round(lastSyncMs / 60000) : null;
    const nextAutoSyncIn = minutesSinceSync !== null ? Math.max(0, 5 - (minutesSinceSync % 5)) : 0;

    const warnings = [];
    if (byStatus.pending_sync > 0) {
      warnings.push({
        level: 'warning',
        message: `${byStatus.pending_sync} employee ada di DB tapi BELUM di device (pending_sync). Absensi tidak akan berjalan untuk mereka.`,
        action: `POST /integrations/hikvision/devices/${id}/push-pending-employees`,
      });
    }
    if (byStatus.sync_failed > 0) {
      warnings.push({
        level: 'error',
        message: `${byStatus.sync_failed} employee gagal saat push ke device (sync_failed). Perlu push ulang.`,
        action: `POST /integrations/hikvision/devices/${id}/push-pending-employees`,
      });
    }
    if (!device.isActive) {
      warnings.push({
        level: 'error',
        message: 'Device tidak aktif (isActive: false). Sync otomatis tidak berjalan untuk device ini.',
        action: `PUT /integrations/hikvision/devices/${id} — set isActive: true`,
      });
    }
    if (minutesSinceSync !== null && minutesSinceSync > 30) {
      warnings.push({
        level: 'warning',
        message: `Sync terakhir ${minutesSinceSync} menit lalu. Jika push mode tidak aktif, ada kemungkinan log terlewat.`,
        action: `POST /integrations/hikvision/devices/${id}/sync — atau aktifkan push mode`,
      });
    }

    logger.info('[getSyncStatus] status checked', {
      deviceId: device.id,
      deviceName: device.name,
      totalEmployees,
      pendingSync: byStatus.pending_sync || 0,
      syncFailed: byStatus.sync_failed || 0,
      minutesSinceSync,
    });

    return res.json({
      success: true,
      device: {
        id: device.id,
        name: device.name,
        ipAddress: device.ipAddress,
        port: device.port,
        isActive: device.isActive,
        lastSyncAt: device.lastSyncAt,
        minutesSinceLastSync: minutesSinceSync,
      },
      employeeSyncStats: {
        total: totalEmployees,
        active: byStatus.active || 0,
        pending_sync: byStatus.pending_sync || 0,
        sync_failed: byStatus.sync_failed || 0,
        inactive: byStatus.inactive || 0,
      },
      employeesNeedingAttention: needAttention,
      latestAttendanceLog: latestLog
        ? {
            eventTime: latestLog.eventTime,
            employeeNo: latestLog.deviceEmployeeNo,
            verifyMode: latestLog.verifyMode,
            isMatched: !!(latestLog.matchedUserId || latestLog.matchedMemberId),
          }
        : null,
      autoSync: {
        enabled: device.isActive,
        intervalMinutes: 5,
        description: 'Cron job berjalan setiap 5 menit untuk menarik attendance log dari device (backup dari push mode)',
        estimatedNextRunInMinutes: nextAutoSyncIn,
      },
      warnings,
      syncWorkflow: {
        description: 'Panduan alur sync Database ↔ Device Hikvision',
        flow: [
          {
            step: 1,
            action: 'Tambah employee ke DB + device',
            method: 'POST',
            path: `/integrations/hikvision/devices/${id}/employees`,
            body: { employeeNo: '001', name: 'Nama Karyawan', syncToDevice: true },
            notes: 'syncToDevice:true (default) = langsung push ke device. syncToDevice:false = simpan ke DB dulu (status: pending_sync)',
          },
          {
            step: '1b',
            action: 'Push employee pending ke device (batch)',
            method: 'POST',
            path: `/integrations/hikvision/devices/${id}/push-pending-employees`,
            notes: 'Gunakan ini jika step 1 dilakukan dengan syncToDevice:false, atau saat device kembali online setelah offline',
          },
          {
            step: 2,
            action: 'Daftarkan sidik jari di device',
            method: 'POST',
            path: `/integrations/hikvision/devices/${id}/employees/:employeeNo/enroll-fingerprint`,
            notes: 'Wajib jika device menggunakan mode fingerprint. Employee harus sudah step 1 berhasil.',
          },
          {
            step: 3,
            action: 'Attendance log masuk ke DB',
            notes: 'Otomatis via push dari device (real-time). Backup: cron setiap 5 menit. Manual: POST /sync',
            methods: [
              { mode: 'Push (utama, real-time)', path: `/integrations/hikvision/event`, note: 'Device push otomatis setiap tap' },
              { mode: 'Pull manual', method: 'POST', path: `/integrations/hikvision/devices/${id}/sync`, note: 'Tarik log dari device secara manual' },
              { mode: 'Auto cron', note: 'Setiap 5 menit otomatis di background' },
            ],
          },
          {
            step: '4 (opsional)',
            action: 'Import employee dari device ke DB',
            method: 'POST',
            path: `/integrations/hikvision/devices/${id}/sync-employees`,
            notes: 'Berguna jika device sudah memiliki data employee tapi DB masih kosong (misal: device lama atau migrasi)',
          },
        ],
        statusGuide: {
          active: 'Employee ada di DB dan device — absensi berjalan normal ✓',
          pending_sync: 'Employee ada di DB tapi BELUM di device — absensi TIDAK berjalan, harus push dulu',
          sync_failed: 'Push ke device gagal — cek koneksi device, lalu jalankan push-pending-employees lagi',
          inactive: 'Employee tidak ditemukan saat import dari device, atau dinonaktifkan manual',
        },
        quickLinks: {
          checkEmployeesInDB: `GET /integrations/hikvision/device-employees?deviceId=${id}`,
          checkEmployeesOnDevice: `GET /integrations/hikvision/devices/${id}/employees`,
          pushPending: `POST /integrations/hikvision/devices/${id}/push-pending-employees`,
          pullLogs: `POST /integrations/hikvision/devices/${id}/sync`,
          importFromDevice: `POST /integrations/hikvision/devices/${id}/sync-employees`,
          viewAttendanceLogs: `GET /integrations/hikvision/devices/${id}/logs`,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
}

// ==========================================
// Device Status Dashboard
// ==========================================

/**
 * @route   GET /integrations/hikvision/devices/:id/status
 * @desc    Comprehensive real-time device health & stats dashboard.
 *          Combines: live connectivity, hardware info, device clock drift,
 *          push-mode config, DB attendance stats, and employee sync health.
 * @access  Private (admin)
 */
async function getDeviceStatus(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const device = await HikvisionDevice.findOne({ where });
    if (!device) throw createError('NOT_FOUND', 'Device not found');

    const tz = getTenantTimezone(req);
    const todayStr = todayInTz(tz);
    const todayStart = startOfDayInTz(todayStr, tz);
    const weekStart  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // ── 1. Connectivity + hardware info (live call to device) ──────────
    let connectivity = { online: false, error: null };
    let hardware     = null;

    try {
      const connResult = await HikvisionService.testConnection(device);
      connectivity.online = connResult.success;
      if (!connResult.success) {
        connectivity.error = connResult.error || 'Device unreachable';
      } else {
        const di = connResult.deviceInfo || {};
        hardware = {
          model:           di.model           || di.DeviceInfo?.model           || di.deviceType  || null,
          deviceName:      di.deviceName      || di.DeviceInfo?.deviceName      || device.name,
          serialNumber:    connResult.serialNumber || di.serialNumber || device.serialNumber || null,
          firmwareVersion: di.firmwareVersion  || di.DeviceInfo?.firmwareVersion  || null,
          hardwareVersion: di.hardwareVersion  || di.DeviceInfo?.hardwareVersion  || null,
          macAddress:      di.macAddress       || di.DeviceInfo?.macAddress       || null,
          deviceType:      di.deviceType       || di.DeviceInfo?.deviceType       || null,
        };
      }
    } catch (connErr) {
      connectivity.online = false;
      connectivity.error  = connErr.message;
    }

    // ── 2. Device clock (ISAPI /System/time) ──────────────────────────
    let clockInfo = null;
    if (connectivity.online) {
      try {
        const client  = HikvisionService.createClient(device);
        const timeUrl = `${HikvisionService.baseUrl(device)}/ISAPI/System/time`;
        const timeRes = await HikvisionService.fetchWithTimeout(client, timeUrl, {
          method: 'GET', headers: { Accept: 'application/json' },
        }, 5000);
        if (timeRes.ok) {
          const text = await timeRes.text();
          let timeData;
          try {
            timeData = JSON.parse(text);
          } catch {
            // XML fallback
            const dtMatch = text.match(/<localTime>(.*?)<\/localTime>/i);
            const tzMatch = text.match(/<timeZone>(.*?)<\/timeZone>/i);
            timeData = { localTime: dtMatch?.[1] || null, timeZone: tzMatch?.[1] || null };
          }
          const deviceTimeStr = timeData?.Time?.localTime || timeData?.localTime || null;
          const deviceTz      = timeData?.Time?.timeZone  || timeData?.timeZone  || null;
          if (deviceTimeStr) {
            const deviceTime  = new Date(deviceTimeStr);
            const driftSec    = Math.round(Math.abs(now - deviceTime) / 1000);
            clockInfo = {
              deviceTime:   deviceTimeStr,
              serverTime:   now.toISOString(),
              timeZone:     deviceTz,
              driftSeconds: driftSec,
              status:       driftSec <= 60 ? 'synced' : driftSec <= 300 ? 'minor_drift' : 'out_of_sync',
            };
          }
        }
      } catch { /* non-fatal — clock info simply stays null */ }
    }

    // ── 3. Push-mode config (live call) ───────────────────────────────
    let pushConfig = null;
    if (connectivity.online) {
      try {
        pushConfig = await HikvisionService.getEventPushConfig(device);
      } catch {
        pushConfig = { success: false, enabled: false, error: 'Failed to fetch push config' };
      }
    }

    // ── 4. DB attendance stats ────────────────────────────────────────
    const [todayTaps, weekTaps, totalLogs] = await Promise.all([
      DeviceAttendanceLog.count({ where: { deviceId: device.id, eventTime: { [Op.gte]: todayStart } } }),
      DeviceAttendanceLog.count({ where: { deviceId: device.id, eventTime: { [Op.gte]: weekStart  } } }),
      DeviceAttendanceLog.count({ where: { deviceId: device.id } }),
    ]);

    const lastLog = await DeviceAttendanceLog.findOne({
      where:   { deviceId: device.id },
      order:   [['eventTime', 'DESC']],
      attributes: ['id', 'eventTime', 'deviceEmployeeNo', 'verifyMode', 'eventType', 'matchedUserId', 'matchedDeviceEmployeeId'],
      include: [{ model: DeviceEmployee, as: 'matchedDeviceEmployee', attributes: ['id', 'name'], required: false }],
    });

    const todayLogs = await DeviceAttendanceLog.findAll({
      where:   { deviceId: device.id, eventTime: { [Op.gte]: todayStart } },
      order:   [['eventTime', 'DESC']],
      limit:   15,
      attributes: ['id', 'eventTime', 'deviceEmployeeNo', 'verifyMode', 'eventType', 'matchedUserId', 'matchedDeviceEmployeeId'],
      include: [{ model: DeviceEmployee, as: 'matchedDeviceEmployee', attributes: ['id', 'name'], required: false }],
    });

    // ── 5. Employee sync stats ────────────────────────────────────────
    const empRows = await DeviceEmployee.findAll({
      where: { deviceId: device.id },
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true,
    });
    const byStatus = {};
    let totalEmployees = 0;
    for (const row of empRows) {
      byStatus[row.status] = parseInt(row.count, 10);
      totalEmployees += parseInt(row.count, 10);
    }

    // Fingerprint count on device (best-effort)
    let fingerprintsOnDevice = null;
    if (connectivity.online) {
      try {
        const fpMap = await HikvisionService.getFingerprintCountMap(device);
        fingerprintsOnDevice = Object.values(fpMap).reduce((a, b) => a + b, 0);
      } catch { /* non-fatal */ }
    }

    // ── 6. Warnings ───────────────────────────────────────────────────
    const lastSyncMs        = device.lastSyncAt ? now - new Date(device.lastSyncAt) : null;
    const minutesSinceSync  = lastSyncMs !== null ? Math.round(lastSyncMs / 60000) : null;
    const nextAutoSyncIn    = minutesSinceSync !== null ? Math.max(0, 5 - (minutesSinceSync % 5)) : 0;

    const warnings = [];
    if (!connectivity.online) {
      warnings.push({ level: 'error',   code: 'device_offline',   message: 'Device tidak dapat dihubungi. Periksa koneksi jaringan, IP, dan port.' });
    }
    if (!device.isActive) {
      warnings.push({ level: 'error',   code: 'device_disabled',  message: 'Device dinonaktifkan (isActive: false). Auto-sync cron tidak berjalan.' });
    }
    if (byStatus.pending_sync > 0) {
      warnings.push({ level: 'warning', code: 'pending_sync',      message: `${byStatus.pending_sync} karyawan belum terdaftar di device — absensi tidak berjalan untuk mereka.` });
    }
    if (byStatus.sync_failed > 0) {
      warnings.push({ level: 'error',   code: 'sync_failed',       message: `${byStatus.sync_failed} karyawan gagal saat push ke device — perlu push ulang.` });
    }
    if (clockInfo?.status === 'out_of_sync') {
      warnings.push({ level: 'warning', code: 'clock_drift',       message: `Jam device berbeda ${clockInfo.driftSeconds} detik dari server. Disarankan sinkronisasi waktu (POST /sync-time).` });
    }
    if (pushConfig && !pushConfig.enabled) {
      warnings.push({ level: 'warning', code: 'push_disabled',     message: 'Push mode tidak aktif. Log absensi hanya masuk via cron atau manual sync.' });
    }
    if (minutesSinceSync !== null && minutesSinceSync > 30 && !(pushConfig?.enabled)) {
      warnings.push({ level: 'warning', code: 'sync_stale',        message: `Sync terakhir ${minutesSinceSync} menit lalu dan push mode tidak aktif — ada kemungkinan log terlewat.` });
    }

    return res.json({
      success: true,
      retrievedAt: now.toISOString(),

      device: {
        id:                  device.id,
        name:                device.name,
        ipAddress:           device.ipAddress,
        port:                device.port,
        isActive:            device.isActive,
        serialNumber:        hardware?.serialNumber || device.serialNumber || null,
        lastSyncAt:          device.lastSyncAt,
        minutesSinceLastSync: minutesSinceSync,
        createdAt:           device.createdAt,
      },

      connectivity: {
        online:         connectivity.online,
        error:          connectivity.error || null,
        lastCheckedAt:  now.toISOString(),
      },

      hardware,

      clock: clockInfo,

      pushMode: pushConfig
        ? {
            enabled:  pushConfig.enabled,
            pushUrl:  pushConfig.pushUrl  || null,
            protocol: pushConfig.activeHost?.protocolType || null,
          }
        : null,

      attendance: {
        totalLogsInDb:  totalLogs,
        todayTaps,
        last7DaysTaps:  weekTaps,
        lastTap: lastLog
          ? {
              id:           lastLog.id,
              eventTime:    lastLog.eventTime,
              employeeNo:   lastLog.deviceEmployeeNo,
              employeeName: lastLog.matchedDeviceEmployee?.name || null,
              verifyMode:   lastLog.verifyMode,
              eventType:    lastLog.eventType,
              isMatched:    !!(lastLog.matchedUserId || lastLog.matchedDeviceEmployeeId),
            }
          : null,
        recentTodayLogs: todayLogs.map(l => ({
          id:           l.id,
          eventTime:    l.eventTime,
          employeeNo:   l.deviceEmployeeNo,
          employeeName: l.matchedDeviceEmployee?.name || null,
          verifyMode:   l.verifyMode,
          eventType:    l.eventType,
          isMatched:    !!(l.matchedUserId || l.matchedDeviceEmployeeId),
        })),
      },

      employees: {
        total:               totalEmployees,
        active:              byStatus.active       || 0,
        pending_sync:        byStatus.pending_sync  || 0,
        sync_failed:         byStatus.sync_failed   || 0,
        inactive:            byStatus.inactive      || 0,
        fingerprintsOnDevice,
      },

      autoSync: {
        enabled:                    device.isActive,
        intervalMinutes:            5,
        estimatedNextRunInMinutes:  nextAutoSyncIn,
      },

      warnings,
    });
  } catch (err) {
    return next(err);
  }
}

// ==========================================
// Duplicate Employee Detection & Merge
// ==========================================

/**
 * @route   GET /integrations/hikvision/device-employees/duplicates
 * @desc    Find DeviceEmployee records that appear to be duplicates
 *          (same name — case-insensitive, or multiple empNos linked to same userId)
 * @access  Private (admin)
 * @query   threshold — min similarity for name grouping (default: exact)
 */
async function listDuplicateDeviceEmployees(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;

    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;

    const allEmployees = await DeviceEmployee.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'deviceEmployeeNo'],
          required: false,
        },
        {
          model: HikvisionDevice,
          as: 'device',
          attributes: ['id', 'name', 'ipAddress'],
        },
      ],
      order: [[sequelize.literal('CAST("DeviceEmployee"."employeeNo" AS INTEGER)'), 'ASC']],
    });

    const duplicateGroups = [];

    // Group 1: same trimmed lowercased name
    const byName = {};
    for (const emp of allEmployees) {
      const key = (emp.name || '').trim().toLowerCase();
      if (!key) continue;
      if (!byName[key]) byName[key] = [];
      byName[key].push(emp);
    }
    for (const [nameKey, group] of Object.entries(byName)) {
      if (group.length > 1) {
        duplicateGroups.push({
          reason: 'same_name',
          nameKey,
          count: group.length,
          records: group,
        });
      }
    }

    // Group 2: same userId (non-null)
    const byUser = {};
    for (const emp of allEmployees) {
      if (!emp.userId) continue;
      if (!byUser[emp.userId]) byUser[emp.userId] = [];
      byUser[emp.userId].push(emp);
    }
    for (const [userId, group] of Object.entries(byUser)) {
      if (group.length > 1) {
        // Avoid double-reporting if already caught by name
        const alreadyReported = duplicateGroups.some(
          g => g.reason === 'same_name' &&
               g.records.length === group.length &&
               g.records.every(r => group.find(g2 => g2.id === r.id))
        );
        if (!alreadyReported) {
          duplicateGroups.push({
            reason: 'same_user',
            userId,
            userName: group[0].user ? `${group[0].user.firstName} ${group[0].user.lastName}` : null,
            count: group.length,
            records: group,
          });
        }
      }
    }

    return res.json({
      success: true,
      totalGroups: duplicateGroups.length,
      data: duplicateGroups,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   POST /integrations/hikvision/device-employees/merge
 * @desc    Merge two DeviceEmployee records:
 *          - Move all StaffAttendance, EmployeeSchedule, DeviceAttendanceLogs from `removeId` to `keepId`
 *          - Delete the `removeId` record
 * @access  Private (admin)
 * @body    { keepId, removeId }
 */
async function mergeDeviceEmployees(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { keepId, removeId } = req.body;

    if (!keepId || !removeId) {
      throw createError('VALIDATION_ERROR', 'keepId and removeId are required');
    }
    if (keepId === removeId) {
      throw createError('VALIDATION_ERROR', 'keepId and removeId must be different');
    }

    const empWhere = isSuperAdmin ? {} : { tenantId };

    const [keepEmp, removeEmp] = await Promise.all([
      DeviceEmployee.findOne({ where: { id: keepId, ...empWhere } }),
      DeviceEmployee.findOne({ where: { id: removeId, ...empWhere } }),
    ]);

    if (!keepEmp)   throw createError('NOT_FOUND', `Device employee keepId=${keepId} not found`);
    if (!removeEmp) throw createError('NOT_FOUND', `Device employee removeId=${removeId} not found`);

    const { StaffAttendance, EmployeeSchedule, DeviceAttendanceLog } = require('../../../models');

    const [attCount, schCount, logCount] = await Promise.all([
      StaffAttendance.count({ where: { deviceEmployeeId: removeEmp.id } }),
      EmployeeSchedule.count({ where: { deviceEmployeeId: removeEmp.id } }),
      DeviceAttendanceLog.count({ where: { matchedDeviceEmployeeId: removeEmp.id } }),
    ]);

    const t = await sequelize.transaction();
    const stats = { attendanceMoved: 0, attendanceSkipped: 0, scheduleMoved: 0, scheduleSkipped: 0, logsMoved: 0 };

    try {
      // 1. Move StaffAttendance (skip conflict dates)
      if (attCount > 0) {
        const removedAtt = await StaffAttendance.findAll({
          where: { deviceEmployeeId: removeEmp.id },
          transaction: t,
        });
        for (const att of removedAtt) {
          const dateStr = att.date instanceof Date
            ? att.date.toISOString().split('T')[0]
            : String(att.date).split('T')[0];
          const conflict = await StaffAttendance.findOne({
            where: { deviceEmployeeId: keepEmp.id, date: dateStr },
            transaction: t,
          });
          if (conflict) {
            stats.attendanceSkipped++;
          } else {
            await att.update({ deviceEmployeeId: keepEmp.id }, { transaction: t });
            stats.attendanceMoved++;
          }
        }
      }

      // 2. Move EmployeeSchedule (skip conflict dates)
      if (schCount > 0) {
        const removedSch = await EmployeeSchedule.findAll({
          where: { deviceEmployeeId: removeEmp.id },
          transaction: t,
        });
        for (const sch of removedSch) {
          const dateStr = sch.date instanceof Date
            ? sch.date.toISOString().split('T')[0]
            : String(sch.date).split('T')[0];
          const conflict = await EmployeeSchedule.findOne({
            where: { deviceEmployeeId: keepEmp.id, date: dateStr },
            transaction: t,
          });
          if (conflict) {
            stats.scheduleSkipped++;
          } else {
            await sch.update({ deviceEmployeeId: keepEmp.id }, { transaction: t });
            stats.scheduleMoved++;
          }
        }
      }

      // 3. Update DeviceAttendanceLog matched references
      if (logCount > 0) {
        await DeviceAttendanceLog.update(
          { matchedDeviceEmployeeId: keepEmp.id },
          { where: { matchedDeviceEmployeeId: removeEmp.id }, transaction: t }
        );
        stats.logsMoved = logCount;
      }

      // 4. Delete the duplicate record
      await removeEmp.destroy({ transaction: t });

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    // Re-fetch the surviving record with associations
    const updated = await DeviceEmployee.findOne({
      where: { id: keepEmp.id },
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'deviceEmployeeNo'] },
        { model: HikvisionDevice, as: 'device', attributes: ['id', 'name', 'ipAddress'] },
      ],
    });

    logger.info(`[mergeDeviceEmployees] keepId=${keepId} absorbed removeId=${removeId} (empNo=${removeEmp.employeeNo})`, { stats });

    return res.json({
      success: true,
      message: `Merged empNo=${removeEmp.employeeNo} ("${removeEmp.name}") into empNo=${keepEmp.employeeNo} ("${keepEmp.name}")`,
      stats,
      data: updated,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   PATCH /integrations/hikvision/device-employees/:id/status
 * @desc    Set active / inactive (or any valid status) for a device employee.
 *          For 'active' and 'inactive', the change is also pushed to the device:
 *            active   → Valid.enable: true  (restores tap access)
 *            inactive → Valid.enable: false (revokes access, keeps fingerprints)
 *          'pending_sync' and 'sync_failed' only update the DB record.
 * @access  Private (admin)
 * @body    { status: 'active' | 'inactive' | 'pending_sync' | 'sync_failed', syncToDevice?: boolean }
 */
async function setDeviceEmployeeStatus(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { status, syncToDevice = true } = req.body;

    const VALID = ['active', 'inactive', 'pending_sync', 'sync_failed'];
    if (!status || !VALID.includes(status)) {
      throw createError('VALIDATION_ERROR', `status must be one of: ${VALID.join(', ')}`);
    }

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const record = await DeviceEmployee.findOne({
      where,
      include: [{ model: HikvisionDevice, as: 'device' }],
    });
    if (!record) throw createError('NOT_FOUND', 'Device employee record not found');

    const previousStatus = record.status;
    await record.update({ status });

    // ── Sync to device for active/inactive changes ──────────────────────────
    let deviceSync = null;
    const syncableStatuses = ['active', 'inactive'];
    if (syncToDevice && syncableStatuses.includes(status) && record.device) {
      try {
        const enable = status === 'active';
        const syncResult = await HikvisionService.setEmployeeValidity(
          record.device,
          record.employeeNo,
          enable,
          record.name
        );
        deviceSync = {
          attempted: true,
          success: syncResult.success,
          httpStatus: syncResult.status,
          deviceId: record.device.id,
          deviceName: record.device.name,
        };

        // If device accepted, update lastSyncAt
        if (syncResult.success) {
          await record.update({ lastSyncAt: new Date() });
        }
      } catch (syncErr) {
        // Sync failure is non-fatal — DB already updated
        logger.warn(`[setDeviceEmployeeStatus] device sync failed for empNo=${record.employeeNo}: ${syncErr.message}`);
        deviceSync = {
          attempted: true,
          success: false,
          error: syncErr.message,
          deviceId: record.device?.id,
          deviceName: record.device?.name,
        };
      }
    } else if (syncableStatuses.includes(status)) {
      deviceSync = {
        attempted: false,
        reason: syncToDevice ? 'no_device_linked' : 'syncToDevice=false',
      };
    }

    await record.reload({
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: HikvisionDevice, as: 'device', attributes: ['id', 'name', 'ipAddress'] },
      ],
    });

    logger.info(`[setDeviceEmployeeStatus] id=${id} empNo=${record.employeeNo} status: ${previousStatus} → ${status}`);

    return res.json({
      success: true,
      message: `Status updated: ${previousStatus} → ${status}`,
      deviceSync,
      data: record,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  receiveEvent,
  listDevices,
  createDevice,
  updateDevice,
  deleteDevice,
  manualSync,
  testConnection,
  listDeviceEmployees,
  addDeviceEmployee,
  removeDeviceEmployee,
  enrollFingerprint,
  deleteFingerprint,
  unlockEnrollment,
  configurePush,
  getPushStatus,
  disablePush,
  syncDeviceTime,
  getDeviceLogs,
  listStaffMapping,
  assignStaffDeviceNo,
  unassignStaffDeviceNo,
  reprocessUnmatchedLogs,
  syncDeviceEmployees,
  listAllDeviceEmployees,
  updateDeviceEmployee,
  pushPendingEmployees,
  listDuplicateDeviceEmployees,
  mergeDeviceEmployees,
  setDeviceEmployeeStatus,
  getSyncStatus,
  getSyncLogs,
  getDeviceStatus,
  writeSyncLog,
};
