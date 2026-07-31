'use strict';

/**
 * Hikvision Event Processor
 *
 * Processes raw device attendance events:
 * 1. Stores raw log in DeviceAttendanceLogs (with dedup)
 * 2. Matches deviceEmployeeNo → DeviceEmployee (Staff) → StaffAttendance
 * 3. Optionally matches deviceEmployeeNo → Member → CheckIn
 */

const { Op } = require('sequelize');
const {
  DeviceAttendanceLog,
  StaffAttendance,
  EmployeeSchedule,
  CheckIn,
  DeviceEmployee,
  User,
  Member,
  HikvisionDevice,
  Tenant,
  sequelize,
} = require('../models');
const HikvisionService = require('./hikvisionService');
const {
  getNextDateOnly,
  getOvernightShiftAnchorDate,
  getPreviousDateOnly,
  getScheduleMetricsForEvent,
  isPlausibleCheckIn,
  isPlausibleCheckout,
  shouldSwapOvernightTimes,
  toLocalDateOnly,
} = require('../utils/attendanceSchedule');
const { startOfDayInTz } = require('../utils/tenantTimezone');
const logger = require('../utils/logger');

/**
 * Compare checkIn time against shiftStart in the correct local timezone.
 * Returns { status, lateMinutes }.
 */
function computeShiftStatus(eventDate, schedule, tz) {
  const metrics = getScheduleMetricsForEvent(eventDate, schedule, tz);
  const lateMinutes = metrics ? Math.max(0, Math.round(metrics.minsAfterStart)) : 0;
  return { status: lateMinutes === 0 ? 'on_time' : 'late', lateMinutes };
}

const ACCESS_DOOR_GUARDS = Object.freeze({
  // Extra debounce on top of eventCooldownMinutes: a checkout is only plausible
  // after a minimum amount of worked time has passed.
  minWorkedMinutesBeforeCheckout: 4 * 60,
  minWorkedMinutesBeforeCheckoutFloor: 90,
  // For access-door devices, taps in the middle of the shift should not be
  // treated as a checkout. We only accept a checkout when it is near shift end.
  maxCheckoutDistanceFromShiftEndMinutes: 2 * 60,
});

function toDateKey(value) {
  return String(value).split('T')[0];
}

function getAttendanceState(attendance) {
  if (!attendance) return 'none';
  if (attendance.checkInTime && attendance.checkOutTime) return 'complete';
  if (attendance.checkInTime) return 'open';
  if (attendance.checkOutTime) return 'checkout_only';
  return 'empty';
}

function resolveAttendanceSchedule(attendance, schedulesByDate, timezone) {
  const attendanceDate = toDateKey(attendance.date);
  const candidates = schedulesByDate.get(attendanceDate) || [];

  if (attendance.scheduleId) {
    return candidates.find((schedule) => schedule.id === attendance.scheduleId) || null;
  }

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const referenceTime = attendance.checkInTime || attendance.checkOutTime;
  if (!referenceTime) return candidates[0];

  return candidates
    .map((schedule) => ({
      schedule,
      metrics: getScheduleMetricsForEvent(new Date(referenceTime), schedule, timezone),
    }))
    .sort((a, b) => {
      const left = a.metrics ? a.metrics.distToStart : Number.MAX_SAFE_INTEGER;
      const right = b.metrics ? b.metrics.distToStart : Number.MAX_SAFE_INTEGER;
      return left - right;
    })[0]?.schedule || null;
}

function pickPreferredAttendance(current, candidate) {
  if (!current) return candidate;
  if (candidate.scheduleId && !current.scheduleId) return candidate;
  if (current.scheduleId && !candidate.scheduleId) return current;

  const currentState = getAttendanceState(current);
  const candidateState = getAttendanceState(candidate);
  if (candidateState === 'open' && currentState !== 'open') return candidate;
  if (currentState === 'open' && candidateState !== 'open') return current;

  return current;
}

async function finalizeAttendanceTimes(attendance, schedule, timezone, transaction) {
  if (!attendance?.checkInTime || !attendance?.checkOutTime || !schedule) {
    return attendance;
  }

  if (!shouldSwapOvernightTimes(attendance.checkInTime, attendance.checkOutTime, schedule, timezone)) {
    return attendance;
  }

  await attendance.update({
    checkInTime: attendance.checkOutTime,
    checkOutTime: attendance.checkInTime,
  }, { transaction });

  logger.info('StaffAttendance overnight times swapped to restore chronological order', {
    attendanceId: attendance.id,
    scheduleId: schedule.id,
    checkInTime: attendance.checkInTime,
    checkOutTime: attendance.checkOutTime,
  });

  return attendance;
}

class HikvisionEventProcessor {
  /**
   * Process a batch of events from a device push or pull
   *
   * @param {string} deviceId - HikvisionDevice UUID
   * @param {Object[]} rawEvents - Array of raw event objects from Hikvision
   * @param {string} source - 'push' | 'pull'
   * @returns {{ processed: number, duplicates: number, matched: number, unmatched: number }}
   */
  static async processEvents(deviceId, rawEvents, source = 'push') {
    const device = await HikvisionDevice.findByPk(deviceId, {
      paranoid: true,
      include: [{ model: Tenant, as: 'tenant', attributes: ['settings'] }],
    });
    if (!device) {
      logger.error('HikvisionEventProcessor: device not found', { deviceId });
      return { processed: 0, duplicates: 0, matched: 0, unmatched: 0 };
    }

    const stats = { processed: 0, duplicates: 0, cooldownSkipped: 0, matched: 0, unmatched: 0, skipped: 0 };
    const tenantTimezone = device.tenant?.settings?.timezone || process.env.TZ || 'Asia/Jakarta';

    const eventsWithNormalized = rawEvents.map((rawEvent) => {
      try {
        return {
          rawEvent,
          normalized: HikvisionService.normalizeEvent(rawEvent),
          normalizeError: null,
        };
      } catch (err) {
        return {
          rawEvent,
          normalized: null,
          normalizeError: err,
        };
      }
    });

    // Process in chronological order so delayed/out-of-order batches do not
    // let a later tap create/update attendance before an earlier tap.
    eventsWithNormalized.sort((a, b) => {
      const ta = a.normalized?.eventTime ? new Date(a.normalized.eventTime).getTime() : Number.MAX_SAFE_INTEGER;
      const tb = b.normalized?.eventTime ? new Date(b.normalized.eventTime).getTime() : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });

    for (const { rawEvent, normalized, normalizeError } of eventsWithNormalized) {
      try {
        if (normalizeError) {
          stats.skipped++;
          logger.warn('HikvisionEventProcessor: failed to normalize event', {
            deviceId,
            error: normalizeError.message,
            rawKeys: Object.keys(rawEvent || {}),
          });
          continue;
        }

        // Skip system events (major != 5) — only process access events
        // But allow events without major field (push format doesn't always include it)
        if (rawEvent.major !== undefined && rawEvent.major !== 5) {
          stats.skipped++;
          logger.debug('HikvisionEventProcessor: skipping non-access event', {
            deviceId,
            major: rawEvent.major,
            minor: rawEvent.minor,
          });
          continue; // major=2 is system/alarm, major=5 is access granted
        }

        if (!normalized.deviceEmployeeNo || !normalized.eventTime) {
          logger.warn('HikvisionEventProcessor: skipping event with missing data', {
            deviceId,
            employeeNo: normalized.deviceEmployeeNo,
            eventTime: normalized.eventTime,
            rawKeys: Object.keys(rawEvent),
          });
          continue;
        }

        const result = await this.processSingleEvent(device, normalized, rawEvent, source, tenantTimezone);
        if (result === 'duplicate') {
          stats.duplicates++;
        } else if (result === 'cooldown') {
          stats.cooldownSkipped++;
        } else if (result === 'matched') {
          stats.matched++;
          stats.processed++;
        } else {
          stats.unmatched++;
          stats.processed++;
        }
      } catch (err) {
        logger.error('HikvisionEventProcessor: error processing event', {
          deviceId,
          error: err.message,
          raw: rawEvent,
        });
      }
    }

    logger.info('HikvisionEventProcessor: batch complete', {
      deviceId,
      source,
      ...stats,
    });

    return stats;
  }

  /**
   * Process a single normalized event
   * @returns {'duplicate' | 'cooldown' | 'matched' | 'unmatched'}
   */
  static async processSingleEvent(device, normalized, rawEvent, source, timezone) {
    const t = await sequelize.transaction();

    try {
      // 1. Check for duplicate (same device + employeeNo + eventTime)
      const existing = await DeviceAttendanceLog.findOne({
        where: {
          deviceId: device.id,
          deviceEmployeeNo: normalized.deviceEmployeeNo,
          eventTime: new Date(normalized.eventTime),
        },
        transaction: t,
      });

      if (existing) {
        await t.rollback();
        return 'duplicate';
      }

      // 2. Cooldown check — ignore events too close together for the same person
      //    This prevents "tap twice = instant check-out" problem
      const cooldownMinutes = device.eventCooldownMinutes || 5;
      const cooldownThreshold = new Date(new Date(normalized.eventTime).getTime() - cooldownMinutes * 60 * 1000);

      const recentEvent = await DeviceAttendanceLog.findOne({
        where: {
          deviceId: device.id,
          deviceEmployeeNo: normalized.deviceEmployeeNo,
          eventTime: {
            [Op.gte]: cooldownThreshold,
            [Op.lt]: new Date(normalized.eventTime),
          },
        },
        order: [['eventTime', 'DESC']],
        transaction: t,
      });

      if (recentEvent) {
        await t.rollback();
        logger.info('HikvisionEventProcessor: event ignored (cooldown active)', {
          deviceId: device.id,
          employeeNo: normalized.deviceEmployeeNo,
          eventTime: normalized.eventTime,
          lastEventTime: recentEvent.eventTime,
          cooldownMinutes,
        });
        return 'cooldown';
      }

      // 3. Try to match against DeviceEmployee (staff)
      const matchedEmployee = await DeviceEmployee.findOne({
        where: {
          tenantId: device.tenantId,
          employeeNo: normalized.deviceEmployeeNo,
        },
        transaction: t,
      });

      // 4. Try to match against Members (if no employee match and enabled on the device)
      let matchedMember = null;
      if (!matchedEmployee && device.useForMemberCheckIn) {
        matchedMember = await Member.findOne({
          where: {
            tenantId: device.tenantId,
            deviceEmployeeNo: normalized.deviceEmployeeNo,
            isActive: true,
          },
          transaction: t,
        });
      }

      // 5. Create raw log entry
      const log = await DeviceAttendanceLog.create(
        {
          tenantId: device.tenantId,
          deviceId: device.id,
          deviceEmployeeNo: normalized.deviceEmployeeNo,
          eventTime: new Date(normalized.eventTime),
          cardNo: normalized.cardNo,
          verifyMode: normalized.verifyMode,
          rawPayload: rawEvent,
          source,
          matchedDeviceEmployeeId: matchedEmployee?.id || null,
          matchedUserId: matchedEmployee?.userId || null,
          matchedMemberId: matchedMember?.id || null,
          processedAt: new Date(),
        },
        { transaction: t }
      );

      // 6. Create/update StaffAttendance if matched a device employee
      if (matchedEmployee) {
        await this.upsertStaffAttendance(device, matchedEmployee, normalized, log.id, t, timezone);
      }

      // 7. Create MemberCheckIn if matched a member
      if (matchedMember) {
        await this.createMemberCheckIn(device, matchedMember, normalized, t, timezone);
      }

      await t.commit();

      return matchedEmployee || matchedMember ? 'matched' : 'unmatched';
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Create or update a StaffAttendance record for the given date.
   * Uses DeviceEmployee as primary identifier.
   * - First scan of the day → checkInTime
   * - Subsequent scans → update checkOutTime
   * - Cross-day: if no attendance today but yesterday has unclosed attendance,
   *   and tap is within 1 hour past yesterday's shiftEnd → close yesterday (checkout)
   */
  static async upsertStaffAttendance(device, employee, normalized, logId, transaction, timezone) {
    const eventDate = new Date(normalized.eventTime);
    const tz = timezone || process.env.TZ || 'Asia/Jakarta';
    const dateOnly = toLocalDateOnly(eventDate, tz);
    const previousDate = getPreviousDateOnly(dateOnly);
    const nextDate = getNextDateOnly(dateOnly);
    const candidateDates = [...new Set([previousDate, dateOnly, nextDate])];

    const schedules = await EmployeeSchedule.findAll({
      where: {
        tenantId: device.tenantId,
        deviceEmployeeId: employee.id,
        date: { [Op.in]: candidateDates },
        isOff: false,
      },
      order: [['date', 'ASC'], ['shiftStart', 'ASC']],
      transaction,
    });

    const schedulesByDate = new Map();
    for (const schedule of schedules) {
      const key = toDateKey(schedule.date);
      const list = schedulesByDate.get(key) || [];
      list.push(schedule);
      schedulesByDate.set(key, list);
    }

    const attendanceWhere = {
      tenantId: device.tenantId,
      deviceEmployeeId: employee.id,
      date: { [Op.in]: candidateDates },
    };

    const existingAttendances = await StaffAttendance.findAll({
      where: attendanceWhere,
      order: [['date', 'ASC'], ['checkInTime', 'ASC'], ['createdAt', 'ASC']],
      transaction,
    });

    const attendanceByScheduleId = new Map();
    const unresolvedAttendances = [];

    for (const attendance of existingAttendances) {
      const resolvedSchedule = resolveAttendanceSchedule(attendance, schedulesByDate, tz);
      if (!resolvedSchedule) {
        unresolvedAttendances.push(attendance);
        continue;
      }

      attendanceByScheduleId.set(
        resolvedSchedule.id,
        pickPreferredAttendance(attendanceByScheduleId.get(resolvedSchedule.id), attendance)
      );
    }

    const contexts = schedules.map((schedule) => ({
      schedule,
      anchorDate: getOvernightShiftAnchorDate(schedule, eventDate, tz),
      attendance: attendanceByScheduleId.get(schedule.id) || null,
      metrics: getScheduleMetricsForEvent(eventDate, schedule, tz),
    }));

    const openAttendanceCandidate = contexts
      .filter(({ attendance, metrics }) => {
        if (!attendance || !attendance.checkInTime || attendance.checkOutTime || !metrics) {
          return false;
        }

        if (eventDate <= new Date(attendance.checkInTime)) {
          return false;
        }

        const workedMinutes = (eventDate - new Date(attendance.checkInTime)) / (1000 * 60);
        const minimumWorkedMinutes = Math.max(
          ACCESS_DOOR_GUARDS.minWorkedMinutesBeforeCheckoutFloor,
          Math.min(ACCESS_DOOR_GUARDS.minWorkedMinutesBeforeCheckout, metrics.halfShift)
        );

        return workedMinutes >= minimumWorkedMinutes
          && isPlausibleCheckout(metrics, ACCESS_DOOR_GUARDS.maxCheckoutDistanceFromShiftEndMinutes);
      })
      .sort((a, b) => a.metrics.distToEnd - b.metrics.distToEnd)[0];

    if (openAttendanceCandidate) {
      await openAttendanceCandidate.attendance.update({
        checkOutTime: eventDate,
        deviceId: device.id,
        scheduleId: openAttendanceCandidate.schedule.id,
        date: openAttendanceCandidate.anchorDate,
      }, { transaction });

      await finalizeAttendanceTimes(
        openAttendanceCandidate.attendance,
        openAttendanceCandidate.schedule,
        tz,
        transaction
      );

      logger.info('StaffAttendance checkOut updated', {
        deviceEmployeeId: employee.id,
        employeeNo: employee.employeeNo,
        date: openAttendanceCandidate.schedule.date,
        scheduleId: openAttendanceCandidate.schedule.id,
        checkOutTime: eventDate,
      });
      return;
    }

    const checkoutOnlyCandidate = contexts
      .filter(({ attendance, metrics }) => {
        if (!attendance || attendance.checkInTime || !attendance.checkOutTime || !metrics) {
          return false;
        }

        return eventDate < new Date(attendance.checkOutTime)
          && !isPlausibleCheckout(metrics, ACCESS_DOOR_GUARDS.maxCheckoutDistanceFromShiftEndMinutes);
      })
      .sort((a, b) => a.metrics.distToStart - b.metrics.distToStart)[0];

    if (checkoutOnlyCandidate) {
      const computed = computeShiftStatus(eventDate, checkoutOnlyCandidate.schedule, tz);
      await checkoutOnlyCandidate.attendance.update({
        checkInTime: eventDate,
        deviceId: device.id,
        scheduleId: checkoutOnlyCandidate.schedule.id,
        date: checkoutOnlyCandidate.anchorDate,
        status: computed.status,
      }, { transaction });

      await finalizeAttendanceTimes(
        checkoutOnlyCandidate.attendance,
        checkoutOnlyCandidate.schedule,
        tz,
        transaction
      );

      logger.info('StaffAttendance checkIn backfilled on checkout-only record', {
        deviceEmployeeId: employee.id,
        employeeNo: employee.employeeNo,
        date: checkoutOnlyCandidate.schedule.date,
        scheduleId: checkoutOnlyCandidate.schedule.id,
        checkInTime: eventDate,
      });
      return;
    }

    const newScheduleCandidate = contexts
      .filter(({ attendance, metrics }) => !attendance && metrics)
      .map((context) => ({
        ...context,
        isCheckoutCandidate: isPlausibleCheckout(
          context.metrics,
          ACCESS_DOOR_GUARDS.maxCheckoutDistanceFromShiftEndMinutes
        ),
        isCheckInCandidate: isPlausibleCheckIn(
          context.metrics,
          ACCESS_DOOR_GUARDS.maxCheckoutDistanceFromShiftEndMinutes
        ),
        score: Math.min(context.metrics.distToStart, context.metrics.distToEnd),
      }))
      .filter((context) => context.isCheckoutCandidate || context.isCheckInCandidate)
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.metrics.distToStart - b.metrics.distToStart;
      })[0];

    if (newScheduleCandidate) {
      const computed = computeShiftStatus(eventDate, newScheduleCandidate.schedule, tz);

      const created = await StaffAttendance.create(
        {
          tenantId: device.tenantId,
          deviceEmployeeId: employee.id,
          userId: employee.userId || null,
          deviceId: device.id,
          scheduleId: newScheduleCandidate.schedule.id,
          logId,
          checkInTime: newScheduleCandidate.isCheckInCandidate ? eventDate : null,
          checkOutTime: newScheduleCandidate.isCheckoutCandidate ? eventDate : null,
          date: newScheduleCandidate.anchorDate,
          status: newScheduleCandidate.isCheckoutCandidate ? 'present' : computed.status,
        },
        { transaction }
      );

      await finalizeAttendanceTimes(
        created,
        newScheduleCandidate.schedule,
        tz,
        transaction
      );

      logger.info(
        newScheduleCandidate.isCheckoutCandidate
          ? 'StaffAttendance smart checkOut created (schedule-based)'
          : 'StaffAttendance checkIn created (schedule-based)',
        {
          deviceEmployeeId: employee.id,
          employeeNo: employee.employeeNo,
          date: newScheduleCandidate.schedule.date,
          scheduleId: newScheduleCandidate.schedule.id,
          eventTime: eventDate,
          shiftStart: newScheduleCandidate.schedule.shiftStart,
          shiftEnd: newScheduleCandidate.schedule.shiftEnd,
        }
      );
      return;
    }

    const fallbackOpenAttendance = unresolvedAttendances
      .filter((attendance) => attendance.checkInTime && !attendance.checkOutTime)
      .sort((a, b) => new Date(b.checkInTime) - new Date(a.checkInTime))[0];

    if (fallbackOpenAttendance && eventDate > new Date(fallbackOpenAttendance.checkInTime)) {
      const hoursSinceCheckIn = (eventDate - new Date(fallbackOpenAttendance.checkInTime)) / (1000 * 60 * 60);
      if (hoursSinceCheckIn <= 14) {
        await fallbackOpenAttendance.update({
          checkOutTime: eventDate,
          deviceId: device.id,
        }, { transaction });
        return;
      }
    }

    const fallbackExisting = existingAttendances
      .filter((attendance) => toDateKey(attendance.date) === dateOnly)
      .sort((a, b) => new Date(b.checkOutTime || b.checkInTime || b.createdAt) - new Date(a.checkOutTime || a.checkInTime || a.createdAt))[0];

    if (fallbackExisting) {
      const latestRecordedTime = fallbackExisting.checkOutTime || fallbackExisting.checkInTime;
      if (latestRecordedTime && eventDate <= new Date(latestRecordedTime)) {
        return;
      }

      if (fallbackExisting.checkInTime && !fallbackExisting.checkOutTime) {
        await fallbackExisting.update({
          checkOutTime: eventDate,
          deviceId: device.id,
        }, { transaction });
        return;
      }

      return;
    }

    await StaffAttendance.create(
      {
        tenantId: device.tenantId,
        deviceEmployeeId: employee.id,
        userId: employee.userId || null,
        deviceId: device.id,
        logId,
        checkInTime: eventDate,
        date: dateOnly,
        status: 'present',
      },
      { transaction }
    );
  }

  /**
   * Create a member check-in record using the existing CheckIn model
   */
  static async createMemberCheckIn(device, member, normalized, transaction, timezone) {
    const eventDate = new Date(normalized.eventTime);
    const tz = timezone || process.env.TZ || 'Asia/Jakarta';

    // Check if member already checked in today (and hasn't checked out yet)
    const today = toLocalDateOnly(eventDate, tz);
    const existingCheckIn = await CheckIn.findOne({
      where: {
        tenantId: device.tenantId,
        memberId: member.id,
        checkOutTime: null,
        checkInTime: {
          [Op.gte]: startOfDayInTz(today, tz),
        },
      },
      transaction,
    });

    if (existingCheckIn) {
      // Set checkOut on existing check-in
      await existingCheckIn.update(
        { checkOutTime: eventDate },
        { transaction }
      );

      logger.info('Member checkOut via device', {
        memberId: member.id,
        checkOutTime: eventDate,
      });
    } else {
      // Create new check-in
      await CheckIn.create(
        {
          tenantId: device.tenantId,
          memberId: member.id,
          checkInTime: eventDate,
          notes: `Auto check-in via Hikvision device`,
        },
        { transaction }
      );

      logger.info('Member checkIn via device', {
        memberId: member.id,
        checkInTime: eventDate,
      });
    }
  }
}

module.exports = HikvisionEventProcessor;
