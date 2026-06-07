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
const logger = require('../utils/logger');

/**
 * Get date string 'YYYY-MM-DD' in target timezone (avoids UTC date mismatch).
 * Uses same pattern as cashRegisterController: toLocaleDateString with 'en-CA' locale.
 */
function getLocalDateOnly(date, tz) {
  return date.toLocaleDateString('en-CA', { timeZone: tz || process.env.TZ || 'Asia/Jakarta' });
}

/**
 * Subtract 1 day from a YYYY-MM-DD string (local date arithmetic).
 */
function getPreviousLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const prev = new Date(y, m - 1, d - 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
}

/**
 * Compare checkIn time against shiftStart in the correct local timezone.
 * Returns { status, lateMinutes }.
 */
function computeShiftStatus(eventDate, shiftStart, tz) {
  const timezone = tz || process.env.TZ || 'Asia/Jakarta';
  const localTime = eventDate.toLocaleTimeString('en-GB', { timeZone: timezone, hour12: false });
  const [eh, em] = localTime.split(':').map(Number);
  const [sh, sm] = shiftStart.split(':').map(Number);
  const checkInMinutes = eh * 60 + em;
  const shiftMinutes = sh * 60 + sm;
  const lateMinutes = Math.max(0, checkInMinutes - shiftMinutes);
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

function getLocalMinutes(date, tz) {
  const localTime = date.toLocaleTimeString('en-GB', { timeZone: tz, hour12: false });
  const [h, m] = localTime.split(':').map(Number);
  return h * 60 + m;
}

function getScheduleMetrics(eventDate, schedule, tz) {
  if (!schedule || schedule.isOff || !schedule.shiftStart || !schedule.shiftEnd) {
    return null;
  }

  const eventMins = getLocalMinutes(eventDate, tz);
  const [ssh, ssm] = schedule.shiftStart.split(':').map(Number);
  const [seh, sem] = schedule.shiftEnd.split(':').map(Number);
  const shiftStartMins = ssh * 60 + ssm;
  const shiftEndMins = seh * 60 + sem;
  const shiftDuration = shiftEndMins > shiftStartMins
    ? shiftEndMins - shiftStartMins
    : (1440 - shiftStartMins) + shiftEndMins; // overnight shift
  const halfShift = shiftDuration / 2;
  const minsAfterStart = eventMins >= shiftStartMins
    ? eventMins - shiftStartMins
    : (1440 - shiftStartMins) + eventMins; // after midnight

  return {
    eventMins,
    shiftStartMins,
    shiftEndMins,
    shiftDuration,
    halfShift,
    minsAfterStart,
    distToStart: Math.abs(eventMins - shiftStartMins),
    distToEnd: Math.abs(eventMins - shiftEndMins),
  };
}

function isPlausibleCheckout(metrics) {
  if (!metrics) return false;

  return metrics.distToEnd < metrics.distToStart
    && metrics.minsAfterStart > metrics.halfShift
    && metrics.distToEnd <= ACCESS_DOOR_GUARDS.maxCheckoutDistanceFromShiftEndMinutes;
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
    const dateOnly = getLocalDateOnly(eventDate, tz); // YYYY-MM-DD in tenant timezone

    // --- 1. Same-day: update checkOut ---
    const existing = await StaffAttendance.findOne({
      where: {
        tenantId: device.tenantId,
        deviceEmployeeId: employee.id,
        date: dateOnly,
      },
      transaction,
    });

    const schedule = await EmployeeSchedule.findOne({
      where: {
        tenantId: device.tenantId,
        deviceEmployeeId: employee.id,
        date: dateOnly,
      },
      transaction,
    });

    if (existing) {
      const latestRecordedTime = existing.checkOutTime || existing.checkInTime;
      if (latestRecordedTime && eventDate <= new Date(latestRecordedTime)) {
        logger.info('StaffAttendance same-day event ignored (stale/out-of-order)', {
          deviceEmployeeId: employee.id,
          employeeNo: employee.employeeNo,
          date: dateOnly,
          eventTime: eventDate,
          latestRecordedTime,
        });
        return;
      }

      // Once a day already has both checkIn and checkOut, extra taps from an
      // access-door device should not mutate the attendance again.
      if (existing.checkInTime && existing.checkOutTime) {
        logger.info('StaffAttendance same-day event ignored (attendance already complete)', {
          deviceEmployeeId: employee.id,
          employeeNo: employee.employeeNo,
          date: dateOnly,
          eventTime: eventDate,
        });
        return;
      }

      const metrics = getScheduleMetrics(eventDate, schedule, tz);

      // If a checkout-only record already exists, avoid turning later door taps
      // into a new, even later checkout. Historical repair is handled by the
      // dedicated attendance fix endpoint.
      if (!existing.checkInTime && existing.checkOutTime) {
        logger.info('StaffAttendance same-day event ignored (checkout-only record already exists)', {
          deviceEmployeeId: employee.id,
          employeeNo: employee.employeeNo,
          date: dateOnly,
          eventTime: eventDate,
        });
        return;
      }

      const workedMinutes = existing.checkInTime
        ? (eventDate - new Date(existing.checkInTime)) / (1000 * 60)
        : 0;
      const minimumWorkedMinutes = metrics
        ? Math.max(
          ACCESS_DOOR_GUARDS.minWorkedMinutesBeforeCheckoutFloor,
          Math.min(ACCESS_DOOR_GUARDS.minWorkedMinutesBeforeCheckout, metrics.halfShift)
        )
        : ACCESS_DOOR_GUARDS.minWorkedMinutesBeforeCheckout;

      if (
        workedMinutes < minimumWorkedMinutes
        || (metrics && !isPlausibleCheckout(metrics))
      ) {
        logger.info('StaffAttendance same-day event ignored (repeat tap not a plausible checkout)', {
          deviceEmployeeId: employee.id,
          employeeNo: employee.employeeNo,
          date: dateOnly,
          eventTime: eventDate,
          workedMinutes: Math.round(workedMinutes),
          minimumWorkedMinutes: Math.round(minimumWorkedMinutes),
          shiftStart: schedule?.shiftStart || null,
          shiftEnd: schedule?.shiftEnd || null,
          distToStart: metrics?.distToStart ?? null,
          distToEnd: metrics?.distToEnd ?? null,
        });
        return;
      }

      await existing.update({ checkOutTime: eventDate, deviceId: device.id }, { transaction });
      logger.info('StaffAttendance checkOut updated', {
        deviceEmployeeId: employee.id,
        employeeNo: employee.employeeNo,
        date: dateOnly,
        checkOutTime: eventDate,
      });
      return;
    }

    // --- 2. Cross-day checkout check ---
    // If yesterday has an unclosed attendance and the tap is within 1h of shift end
    // treat this as checkout for yesterday, not a new check-in today.
    const CHECKOUT_GRACE_MINUTES = 60;
    const yesterdayDate = getPreviousLocalDate(dateOnly);

    const prevAttendance = await StaffAttendance.findOne({
      where: {
        tenantId: device.tenantId,
        deviceEmployeeId: employee.id,
        date: yesterdayDate,
        checkOutTime: null,
      },
      transaction,
    });

    if (prevAttendance) {
      // Load both schedules to compare proximity
      const [prevSchedule, todaySchedule] = await Promise.all([
        EmployeeSchedule.findOne({
          where: { tenantId: device.tenantId, deviceEmployeeId: employee.id, date: yesterdayDate },
          transaction,
        }),
        EmployeeSchedule.findOne({
          where: { tenantId: device.tenantId, deviceEmployeeId: employee.id, date: dateOnly, isOff: false },
          transaction,
        }),
      ]);

      const localTime = eventDate.toLocaleTimeString('en-GB', { timeZone: tz, hour12: false });
      const [eh, em] = localTime.split(':').map(Number);
      const eventLocalMins = eh * 60 + em;

      // Distance (minutes) from tap to yesterday's shiftEnd
      // overnight shift: shiftEnd falls on TODAY's local date → direct delta
      // normal shift:    shiftEnd was YESTERDAY → minutes elapsed since then = eventLocalMins + (1440 - shiftEndMins)
      let distToYesterdayEnd = Infinity;
      if (prevSchedule && !prevSchedule.isOff && prevSchedule.shiftEnd && prevSchedule.shiftStart) {
        const [seh, sem] = prevSchedule.shiftEnd.split(':').map(Number);
        const [ssh, ssm] = prevSchedule.shiftStart.split(':').map(Number);
        const shiftEndMins = seh * 60 + sem;
        const isOvernightShift = shiftEndMins < (ssh * 60 + ssm);
        distToYesterdayEnd = isOvernightShift
          ? Math.abs(eventLocalMins - shiftEndMins)           // shiftEnd on today's local date
          : eventLocalMins + (1440 - shiftEndMins);           // shiftEnd was yesterday
      }

      // Distance (minutes) from tap to today's shiftStart
      let distToTodayStart = Infinity;
      if (todaySchedule && todaySchedule.shiftStart) {
        const [ssh, ssm] = todaySchedule.shiftStart.split(':').map(Number);
        distToTodayStart = Math.abs(eventLocalMins - (ssh * 60 + ssm));
      }

      let isCrossCheckOut = false;
      if (distToYesterdayEnd !== Infinity || distToTodayStart !== Infinity) {
        // At least one schedule reference exists → decide by proximity
        // Checkout only if tap is closer to yesterday's end AND within grace window
        isCrossCheckOut = distToYesterdayEnd <= distToTodayStart
          && distToYesterdayEnd <= CHECKOUT_GRACE_MINUTES;
      } else {
        // No schedule data at all → fallback: within 14 hours of checkIn
        const hoursSinceCheckIn = (eventDate - new Date(prevAttendance.checkInTime)) / (1000 * 60 * 60);
        isCrossCheckOut = hoursSinceCheckIn <= 14;
      }

      if (isCrossCheckOut) {
        await prevAttendance.update({ checkOutTime: eventDate }, { transaction });
        logger.info('StaffAttendance cross-day checkOut', {
          deviceEmployeeId: employee.id,
          employeeNo: employee.employeeNo,
          closedDate: yesterdayDate,
          checkOutTime: eventDate,
          distToYesterdayEnd,
          distToTodayStart,
        });
        return; // Do NOT create new check-in for today
      }
    }

    // --- 3. Smart check-in / check-out detection ---
    // When there's no existing attendance for today, determine whether the tap
    // is a check-IN or check-OUT based on proximity to schedule times:
    //   closer to shiftStart → checkIn
    //   closer to shiftEnd   → checkOut (employee missed checkIn earlier)
    let status = 'present';
    let isCheckOut = false; // default: treat as checkIn

    const metrics = getScheduleMetrics(eventDate, schedule, tz);
    if (metrics) {
      if (isPlausibleCheckout(metrics)) {
        isCheckOut = true;
      }
      if (!isCheckOut) {
        const computed = computeShiftStatus(eventDate, schedule.shiftStart, tz);
        status = computed.status;
      }
    }

    if (isCheckOut) {
      // Store as checkOut (checkIn stays null — employee missed checkIn)
      await StaffAttendance.create(
        {
          tenantId: device.tenantId,
          deviceEmployeeId: employee.id,
          userId: employee.userId || null,
          deviceId: device.id,
          logId,
          checkInTime: null,
          checkOutTime: eventDate,
          date: dateOnly,
          status: 'present',
        },
        { transaction }
      );

      logger.info('StaffAttendance smart checkOut created (no prior checkIn)', {
        deviceEmployeeId: employee.id,
        employeeNo: employee.employeeNo,
        date: dateOnly,
        checkOutTime: eventDate,
        shiftEnd: schedule.shiftEnd,
      });
    } else {
      await StaffAttendance.create(
        {
          tenantId: device.tenantId,
          deviceEmployeeId: employee.id,
          userId: employee.userId || null,
          deviceId: device.id,
          logId,
          checkInTime: eventDate,
          date: dateOnly,
          status,
        },
        { transaction }
      );

      logger.info('StaffAttendance checkIn created', {
        deviceEmployeeId: employee.id,
        employeeNo: employee.employeeNo,
        date: dateOnly,
        checkInTime: eventDate,
        status,
        scheduledShiftStart: schedule?.shiftStart || null,
      });
    }
  }

  /**
   * Create a member check-in record using the existing CheckIn model
   */
  static async createMemberCheckIn(device, member, normalized, transaction, timezone) {
    const eventDate = new Date(normalized.eventTime);
    const tz = timezone || process.env.TZ || 'Asia/Jakarta';

    // Check if member already checked in today (and hasn't checked out yet)
    const today = getLocalDateOnly(eventDate, tz);
    const existingCheckIn = await CheckIn.findOne({
      where: {
        tenantId: device.tenantId,
        memberId: member.id,
        checkOutTime: null,
        checkInTime: {
          [Op.gte]: new Date(`${today}T00:00:00`),
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
