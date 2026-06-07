'use strict';

/**
 * Staff Attendance Controller
 *
 * Handles staff attendance listing, reports, manual corrections,
 * and reprocessing unmatched device logs.
 */

const { Op } = require('sequelize');
const { StaffAttendance, DeviceAttendanceLog, EmployeeSchedule, User, DeviceEmployee, HikvisionDevice, Shift, sequelize } = require('../../../models');
const HikvisionService = require('../../../services/hikvisionService');
const HikvisionEventProcessor = require('../../../services/hikvisionEventProcessor');
const { createError } = require('../../../utils/errorCodes');
const logger = require('../../../utils/logger');

/** Normalize any date value (Date object or string) to "YYYY-MM-DD" */
function toDateStr(d) {
  if (!d) return '';
  if (d instanceof Date) return d.toISOString().split('T')[0];
  return String(d).split('T')[0];
}

/**
 * Format total minutes into human-readable Indonesian string.
 * e.g. 510 → "8jam 30mnt", 60 → "1jam 0mnt", 45 → "45mnt"
 */
function formatWorkingHours(minutes) {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}mnt`;
  return `${h}jam ${m}mnt`;
}

/**
 * Derive a single holistic "overallStatus" from check-in status + checkout status.
 *
 * Priority logic:
 *  - absent / scheduled / off_day / off_day_work → pass through as-is
 *  - Has check-in but no checkout AND shift has ended  → 'incomplete'
 *  - Has check-in but shift hasn't ended yet           → 'working'
 *  - Checked out with overtime (>30min past shiftEnd)  → 'overtime'
 *  - Checked out early                                 → 'early_leave'
 *  - Checked in late + checked out normally            → 'complete_late'
 *  - Checked in on-time + checked out normally         → 'complete'
 *  - Fallback                                          → computedStatus
 */
function deriveOverallStatus(computedStatus, checkoutStatus, overtimeMinutes, statusDetail) {
  // Special statuses pass through
  if (['absent', 'scheduled'].includes(computedStatus)) return computedStatus;
  if (statusDetail === 'off_day') return 'off_day';
  if (statusDetail === 'off_day_work') return 'off_day_work';

  // Has check-in (computedStatus = on_time | late | present)
  if (checkoutStatus === 'no_checkout') return 'incomplete';
  if (checkoutStatus === null) return 'working'; // shift hasn't ended yet

  // Has checkout
  if (checkoutStatus === 'early_leave') return 'early_leave';
  if (overtimeMinutes > 30) return 'overtime'; // Only flag overtime if >30 min past shiftEnd

  // checkoutStatus === 'on_time' → complete or complete_late
  if (computedStatus === 'late') return 'complete_late';
  return 'complete';
}

/**
 * Compare checkInTime against schedule shiftStart to compute attendance status,
 * and checkOutTime against shiftEnd to compute checkout status.
 * Uses tenant timezone to avoid UTC date mismatch (e.g. WIB late-night taps).
 *
 * Returns:
 *   computedStatus    – 'on_time' | 'late' | 'absent' | 'scheduled' | 'present'
 *                        'scheduled' → future date or today's shift hasn't started yet
 *                        'present'   → has attendance but no schedule / off-day work
 *   statusDetail      – contextual detail string:
 *                        'no_schedule'       → attendance exists but no schedule found
 *                        'off_day'           → off day, no work
 *                        'off_day_work'      → off day but employee came to work
 *                        'shift_not_started'  → today's shift hasn't started yet
 *                        'future_date'       → schedule is for a future date
 *                        null                → normal comparison result
 *   lateMinutes       – minutes late on check-in (0 if on time)
 *   checkoutStatus    – 'on_time' | 'early_leave' | 'no_checkout' | null
 *   earlyLeaveMinutes – minutes left early on check-out
 *   overtimeMinutes   – minutes worked beyond shiftEnd (0 if not applicable)
 *   overallStatus     – holistic single status combining check-in + check-out:
 *                        'complete'      → checked in + checked out normally
 *                        'complete_late' → checked in late + checked out normally
 *                        'overtime'      → checked out after shiftEnd (lembur)
 *                        'early_leave'   → checked out before shiftEnd
 *                        'incomplete'    → checked in but no checkout (shift ended)
 *                        'working'       → currently working (shift not ended yet)
 *                        'on_time'       → checked in on time + checkout OK (redirect to complete)
 *                        'late'          → checked in late, still working or no checkout context
 *                        'absent'        → no check-in, shift has passed
 *                        'scheduled'     → future date or shift not started
 *                        'off_day'       → scheduled off day, no work
 *                        'off_day_work'  → off day but employee worked
 *                        'present'       → present, no schedule to compare
 */
function computeScheduleStatus(attendance, schedule, timezone) {
  const tz = timezone || process.env.TZ || 'Asia/Jakarta';
  const nowDateLocal = new Date().toLocaleDateString('en-CA', { timeZone: tz });
  const nowLocal = new Date().toLocaleTimeString('en-GB', { timeZone: tz, hour12: false });
  const [nh, nm] = nowLocal.split(':').map(Number);
  const nowMinutes = nh * 60 + nm;
  const attendanceDateStr = toDateStr(attendance.date || attendance.checkInTime);

  const base = { lateMinutes: 0, checkoutStatus: null, earlyLeaveMinutes: 0, overtimeMinutes: 0 };

  // ── No schedule → keep original status, add detail ──────────────────
  if (!schedule) {
    let checkoutStatus = null;
    if (attendance.checkInTime && !attendance.checkOutTime) {
      checkoutStatus = attendanceDateStr < nowDateLocal ? 'no_checkout' : null;
    } else if (attendance.checkInTime && attendance.checkOutTime) {
      checkoutStatus = 'on_time';
    }
    const cs = attendance.status || 'present';
    return { ...base, computedStatus: cs, statusDetail: 'no_schedule', checkoutStatus, overallStatus: deriveOverallStatus(cs, checkoutStatus, 0, 'no_schedule') };
  }

  // ── Off day ──────────────────────────────────────────────────────────
  if (schedule.isOff) {
    if (attendance.checkInTime) {
      // Staff worked on scheduled off day
      const coStatus = attendance.checkOutTime
        ? 'on_time'
        : (attendanceDateStr < nowDateLocal ? 'no_checkout' : null);
      return { ...base, computedStatus: 'present', statusDetail: 'off_day_work', checkoutStatus: coStatus, overallStatus: 'off_day_work' };
    }
    return { ...base, computedStatus: null, statusDetail: 'off_day', overallStatus: 'off_day' };
  }

  // ── No check-in: smart absent vs scheduled (pending) ────────────────
  if (!attendance.checkInTime) {
    // Future date → scheduled (not absent)
    if (attendanceDateStr > nowDateLocal) {
      return { ...base, computedStatus: 'scheduled', statusDetail: 'future_date', overallStatus: 'scheduled' };
    }
    // Today but shift hasn't started yet → scheduled
    if (attendanceDateStr === nowDateLocal && schedule.shiftStart) {
      const [sh, sm] = schedule.shiftStart.split(':').map(Number);
      if (nowMinutes < sh * 60 + sm) {
        return { ...base, computedStatus: 'scheduled', statusDetail: 'shift_not_started', overallStatus: 'scheduled' };
      }
    }
    return { ...base, computedStatus: 'absent', statusDetail: null, overallStatus: 'absent' };
  }

  // ── Check-in vs shiftStart ────────────────────────────────────────────
  const checkIn = new Date(attendance.checkInTime);
  const localTime = checkIn.toLocaleTimeString('en-GB', { timeZone: tz, hour12: false });
  const [eh, em] = localTime.split(':').map(Number);
  const [sh, sm] = schedule.shiftStart.split(':').map(Number);
  const lateMinutes = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
  const computedStatus = lateMinutes === 0 ? 'on_time' : 'late';

  // ── Check-out vs shiftEnd (with overtime detection) ───────────────────
  let checkoutStatus = null;
  let earlyLeaveMinutes = 0;
  let overtimeMinutes = 0;

  if (schedule.shiftEnd) {
    const [seh, seM] = schedule.shiftEnd.split(':').map(Number);
    const shiftEndMinutes = seh * 60 + seM;

    if (attendance.checkOutTime) {
      const checkOut = new Date(attendance.checkOutTime);
      const coLocal = checkOut.toLocaleTimeString('en-GB', { timeZone: tz, hour12: false });
      const [coh, com] = coLocal.split(':').map(Number);
      const coMinutes = coh * 60 + com;
      const diff = coMinutes - shiftEndMinutes;

      if (diff >= 0) {
        // Checked out at or after shiftEnd
        checkoutStatus = 'on_time';
        overtimeMinutes = diff; // 0 = tepat waktu, >0 = lembur
        earlyLeaveMinutes = 0;
      } else {
        // Checked out before shiftEnd → early leave
        checkoutStatus = 'early_leave';
        earlyLeaveMinutes = Math.abs(diff);
      }
    } else {
      // No checkout — flag only if shiftEnd has already passed
      if (attendanceDateStr < nowDateLocal) {
        checkoutStatus = 'no_checkout';
      } else if (attendanceDateStr === nowDateLocal && nowMinutes > shiftEndMinutes) {
        checkoutStatus = 'no_checkout';
      }
      // else: shift hasn't ended yet → null (still working)
    }
  }

  // ── Overall status (single holistic value) ────────────────────────────
  const overallStatus = deriveOverallStatus(computedStatus, checkoutStatus, overtimeMinutes, null);

  return { computedStatus, statusDetail: null, lateMinutes, checkoutStatus, earlyLeaveMinutes, overtimeMinutes, overallStatus };
}

/**
 * @route   GET /gym/staff-attendance
 * @desc    List staff attendance records.
 *          When startDate+endDate are provided, also includes employees who have
 *          a schedule in that range but no attendance record (shown as absent).
 * @access  Private (admin/manager)
 * @query   page, limit, startDate, endDate, userId, employeeId, status, includeAbsent
 */
async function listAttendance(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      page = 1,
      limit = 50,
      startDate,
      endDate,
      userId,
      employeeId,
      status,
      includeAbsent = 'true',
    } = req.query;

    const tenantTimezone = req.user?.tenant?.settings?.timezone || process.env.TZ || 'Asia/Jakarta';
    const pageNum   = parseInt(page);
    const limitNum  = parseInt(limit);
    const offset    = (pageNum - 1) * limitNum;

    // Resolve effective date range for absent detection
    // If no date range given, default to today in tenant timezone
    const todayLocal = new Date().toLocaleDateString('en-CA', { timeZone: tenantTimezone });
    const effectiveStart = startDate || (includeAbsent !== 'false' ? todayLocal : null);
    const effectiveEnd   = endDate   || (includeAbsent !== 'false' ? todayLocal : null);
    const showAbsent     = includeAbsent !== 'false' && !!(effectiveStart && effectiveEnd);

    // ── 1. attendance records ─────────────────────────────────────────────
    const attWhere = {};
    if (!isSuperAdmin) attWhere.tenantId = tenantId;
    if (startDate || endDate) {
      attWhere.date = {};
      if (startDate) attWhere.date[Op.gte] = startDate;
      if (endDate)   attWhere.date[Op.lte] = endDate;
    }
    if (employeeId) attWhere.deviceEmployeeId = employeeId;
    else if (userId) attWhere.userId = userId;
    // Virtual/computed statuses — not stored in DB, handled after merge
    const virtualStatuses = [
      'absent', 'off_day', 'off_day_work', 'scheduled', 'no_checkout', 'early_leave', 'has_overtime',
      'complete', 'complete_late', 'incomplete', 'working', 'overtime',
    ];
    if (status && !virtualStatuses.includes(status)) attWhere.status = status;

    const attendanceRows = await StaffAttendance.findAll({
      where: attWhere,
      include: [
        { model: DeviceEmployee, as: 'deviceEmployee', attributes: ['id', 'employeeNo', 'name'] },
        { model: User,           as: 'user',           attributes: ['id', 'firstName', 'lastName', 'email', 'deviceEmployeeNo'] },
        { model: HikvisionDevice,as: 'device',         attributes: ['id', 'name', 'ipAddress'] },
      ],
      order: [['date', 'DESC'], ['checkInTime', 'DESC']],
    });

    // ── 2. schedules for date range ───────────────────────────────────────
    // Build schedule map regardless (needed for enrichment)
    const dateEmployeePairs = attendanceRows.map(r => ({ date: r.date, deviceEmployeeId: r.deviceEmployeeId }));

    // Load ALL schedules in the effective date range (for absent detection + enrichment)
    const scheduleRangeWhere = {};
    if (!isSuperAdmin) scheduleRangeWhere.tenantId = tenantId;
    if (effectiveStart || effectiveEnd) {
      scheduleRangeWhere.date = {};
      if (effectiveStart) scheduleRangeWhere.date[Op.gte] = effectiveStart;
      if (effectiveEnd)   scheduleRangeWhere.date[Op.lte] = effectiveEnd;
    }
    if (employeeId) scheduleRangeWhere.deviceEmployeeId = employeeId;

    // Load ALL schedules including off-days (isOff:true → shown as off_day, isOff:false → absent if no tap)
    const allSchedules = (effectiveStart || effectiveEnd)
      ? await EmployeeSchedule.findAll({
          where: { ...scheduleRangeWhere },
          include: [{ model: DeviceEmployee, as: 'deviceEmployee', attributes: ['id', 'employeeNo', 'name'] }],
        })
      : [];

    // schedule lookup: "deviceEmployeeId|YYYY-MM-DD" → schedule
    const scheduleMap = {};
    for (const s of allSchedules) {
      scheduleMap[`${s.deviceEmployeeId}|${toDateStr(s.date)}`] = s;
    }

    // Supplement with schedules for attendance rows outside the range query
    if (dateEmployeePairs.length > 0) {
      const extraPairs = dateEmployeePairs.filter(p => !scheduleMap[`${p.deviceEmployeeId}|${toDateStr(p.date)}`]);
      if (extraPairs.length > 0) {
        const extraSchedules = await EmployeeSchedule.findAll({
          where: {
            [Op.or]: extraPairs.map(p => ({ date: p.date, deviceEmployeeId: p.deviceEmployeeId })),
          },
        });
        for (const s of extraSchedules) {
          scheduleMap[`${s.deviceEmployeeId}|${toDateStr(s.date)}`] = s;
        }
      }
    }

    // attendance lookup: "deviceEmployeeId|YYYY-MM-DD" → attendance (for absent detection)
    const attMap = {};
    for (const r of attendanceRows) {
      attMap[`${r.deviceEmployeeId}|${toDateStr(r.date)}`] = r;
    }

    // ── 2b. load device attendance logs for cross-reference ────────────
    // Fetch raw tap logs to enrich each record with tap count & detect unmatched logs
    const logRangeWhere = {};
    if (!isSuperAdmin) logRangeWhere.tenantId = tenantId;
    logRangeWhere.matchedDeviceEmployeeId = { [Op.ne]: null };
    if (effectiveStart || effectiveEnd) {
      // Use eventTime to approximate date range (slight overlap is OK)
      logRangeWhere.eventTime = {};
      if (effectiveStart) logRangeWhere.eventTime[Op.gte] = new Date(`${effectiveStart}T00:00:00`);
      if (effectiveEnd) logRangeWhere.eventTime[Op.lte] = new Date(`${effectiveEnd}T23:59:59`);
    }
    if (employeeId) logRangeWhere.matchedDeviceEmployeeId = employeeId;

    const rawLogs = (effectiveStart || effectiveEnd)
      ? await DeviceAttendanceLog.findAll({
          where: logRangeWhere,
          attributes: ['matchedDeviceEmployeeId', 'eventTime'],
          order: [['eventTime', 'ASC']],
        })
      : [];

    // Build log map: "deviceEmployeeId|YYYY-MM-DD" → { tapCount, firstTap, lastTap }
    const logMap = {};
    for (const log of rawLogs) {
      const localDate = log.eventTime.toLocaleDateString('en-CA', { timeZone: tenantTimezone });
      const key = `${log.matchedDeviceEmployeeId}|${localDate}`;
      if (!logMap[key]) {
        logMap[key] = { tapCount: 0, firstTap: log.eventTime, lastTap: log.eventTime };
      }
      logMap[key].tapCount++;
      if (log.eventTime < logMap[key].firstTap) logMap[key].firstTap = log.eventTime;
      if (log.eventTime > logMap[key].lastTap) logMap[key].lastTap = log.eventTime;
    }

    // ── 3. build absent / off_day / scheduled virtual records from schedule ─
    const absentRecords = [];
    if (showAbsent) {
      for (const s of allSchedules) {
        const key = `${s.deviceEmployeeId}|${toDateStr(s.date)}`;
        if (attMap[key]) continue; // has attendance already — skip

        const dateStr = toDateStr(s.date);
        const logData = logMap[key] || null;

        // Determine virtual status using smart logic
        let virtStatus;
        let statusDetail = null;
        if (s.isOff) {
          virtStatus = null;
          statusDetail = 'off_day';
        } else if (dateStr > todayLocal) {
          // Future date → scheduled, not absent
          virtStatus = 'scheduled';
          statusDetail = 'future_date';
        } else if (dateStr === todayLocal && s.shiftStart) {
          // Today: check if shift has started
          const nowLocal = new Date().toLocaleTimeString('en-GB', { timeZone: tenantTimezone, hour12: false });
          const [nh, nm] = nowLocal.split(':').map(Number);
          const [sh, sm] = s.shiftStart.split(':').map(Number);
          if (nh * 60 + nm < sh * 60 + sm) {
            virtStatus = 'scheduled';
            statusDetail = 'shift_not_started';
          } else {
            virtStatus = 'absent';
          }
        } else {
          virtStatus = 'absent';
        }

        absentRecords.push({
          id: null,
          tenantId: s.tenantId,
          deviceEmployeeId: s.deviceEmployeeId,
          userId: null,
          deviceId: null,
          logId: null,
          checkInTime: null,
          checkOutTime: null,
          date: dateStr,
          isOff: s.isOff,
          status: virtStatus,
          notes: s.notes || null,
          createdAt: null,
          updatedAt: null,
          deviceEmployee: s.deviceEmployee?.toJSON?.() ?? s.deviceEmployee ?? null,
          user: null,
          device: null,
          schedule: { shiftStart: s.shiftStart, shiftEnd: s.shiftEnd, isOff: s.isOff },
          computedStatus: virtStatus,
          statusDetail,
          lateMinutes: 0,
          checkoutStatus: null,
          earlyLeaveMinutes: 0,
          overtimeMinutes: 0,
          overallStatus: virtStatus === 'absent' ? 'absent'
            : virtStatus === 'scheduled' ? 'scheduled'
            : statusDetail === 'off_day' ? 'off_day'
            : virtStatus,
          // Log cross-reference: detect unmatched device taps for "absent" employees
          tapCount: logData?.tapCount || 0,
          firstTap: logData?.firstTap || null,
          lastTap: logData?.lastTap || null,
          hasUnmatchedLogs: !!(logData && logData.tapCount > 0),
          workingMinutes: null,
          workingHoursFormatted: null,
        });
      }
    }

    // ── 4. enrich attendance rows ─────────────────────────────────────────
    const enrichedAtt = attendanceRows.map(r => {
      const plain = r.toJSON();
      const key = `${r.deviceEmployeeId}|${toDateStr(r.date)}`;
      const sch = scheduleMap[key] || null;
      const logData = logMap[key] || null;
      const { computedStatus, statusDetail, lateMinutes, checkoutStatus, earlyLeaveMinutes, overtimeMinutes, overallStatus } = computeScheduleStatus(r, sch, tenantTimezone);

      plain.schedule = sch ? { shiftStart: sch.shiftStart, shiftEnd: sch.shiftEnd, isOff: sch.isOff } : null;
      plain.computedStatus = computedStatus;
      plain.statusDetail = statusDetail;
      plain.lateMinutes = lateMinutes;
      plain.checkoutStatus = checkoutStatus;
      plain.earlyLeaveMinutes = earlyLeaveMinutes;
      plain.overtimeMinutes = overtimeMinutes;
      plain.overallStatus = overallStatus;

      // Device log cross-reference
      plain.tapCount = logData?.tapCount || 0;
      plain.firstTap = logData?.firstTap || null;
      plain.lastTap = logData?.lastTap || null;

      // Working hours calculation
      if (r.checkInTime && r.checkOutTime) {
        const diffMs = new Date(r.checkOutTime) - new Date(r.checkInTime);
        if (diffMs > 0) {
          plain.workingMinutes = Math.floor(diffMs / 60000);
          plain.workingHoursFormatted = formatWorkingHours(plain.workingMinutes);
        } else {
          plain.workingMinutes = null;
          plain.workingHoursFormatted = null;
        }
      } else {
        plain.workingMinutes = null;
        plain.workingHoursFormatted = null;
      }

      return plain;
    });

    // ── 5. merge + filter by status ───────────────────────────────────────
    let combined = [...enrichedAtt, ...absentRecords];

    // Filter by status after merge
    // Supports both legacy computedStatus values and new overallStatus values
    if (status) {
      const overallStatusFilters = ['complete', 'complete_late', 'incomplete', 'working', 'overtime', 'early_leave', 'off_day', 'off_day_work', 'absent', 'scheduled'];
      if (overallStatusFilters.includes(status)) {
        combined = combined.filter(r => r.overallStatus === status);
      } else if (status === 'no_checkout') {
        combined = combined.filter(r => r.checkoutStatus === 'no_checkout' || r.overallStatus === 'incomplete');
      } else if (status === 'has_overtime') {
        combined = combined.filter(r => r.overtimeMinutes > 0);
      } else {
        combined = combined.filter(r => r.computedStatus === status || r.status === status);
      }
    }

    // Sort: date DESC, then checkInTime DESC (nulls last)
    combined.sort((a, b) => {
      const dateDiff = (b.date || '').localeCompare(a.date || '');
      if (dateDiff !== 0) return dateDiff;
      if (!a.checkInTime && !b.checkInTime) return 0;
      if (!a.checkInTime) return 1;
      if (!b.checkInTime) return -1;
      return new Date(b.checkInTime) - new Date(a.checkInTime);
    });

    // ── 6. paginate ───────────────────────────────────────────────────────
    const total  = combined.length;
    const paged  = combined.slice(offset, offset + limitNum);

    return res.json({
      success: true,
      data: paged,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   GET /gym/staff-attendance/report
 * @desc    Generate staff attendance summary report
 * @access  Private (admin/manager)
 * @query   startDate, endDate, userId
 */
async function attendanceReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, userId, employeeId } = req.query;

    if (!startDate || !endDate) {
      throw createError('VALIDATION_ERROR', 'startDate and endDate are required');
    }

    const tenantTimezone = req.user?.tenant?.settings?.timezone || process.env.TZ || 'Asia/Jakarta';

    // ── 1. Load attendance records ─────────────────────────────────────────
    const attWhere = {
      date: { [Op.gte]: startDate, [Op.lte]: endDate },
    };
    if (!isSuperAdmin) attWhere.tenantId = tenantId;
    if (employeeId) attWhere.deviceEmployeeId = employeeId;
    else if (userId) attWhere.userId = userId;

    const records = await StaffAttendance.findAll({
      where: attWhere,
      include: [
        { model: DeviceEmployee, as: 'deviceEmployee', attributes: ['id', 'employeeNo', 'name'] },
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      order: [['deviceEmployeeId', 'ASC'], ['date', 'ASC']],
    });

    // ── 2. Load ALL schedules in period (including isOff:true) ────────────
    const scheduleWhere = {
      date: { [Op.gte]: startDate, [Op.lte]: endDate },
    };
    if (!isSuperAdmin) scheduleWhere.tenantId = tenantId;
    if (employeeId) scheduleWhere.deviceEmployeeId = employeeId;
    else if (userId) scheduleWhere.userId = userId;

    const schedules = await EmployeeSchedule.findAll({
      where: scheduleWhere,
      include: [
        { model: DeviceEmployee, as: 'deviceEmployee', attributes: ['id', 'employeeNo', 'name'] },
        { model: Shift, as: 'shift', attributes: ['id', 'name', 'shiftStart'] },
      ],
    });

    // schedule lookup: "deviceEmployeeId|YYYY-MM-DD" → schedule
    const scheduleMap = {};
    for (const s of schedules) {
      scheduleMap[`${s.deviceEmployeeId}|${toDateStr(s.date)}`] = s;
    }

    // attendance lookup: "deviceEmployeeId|YYYY-MM-DD" → record
    const attMap = {};
    for (const r of records) {
      attMap[`${r.deviceEmployeeId}|${toDateStr(r.date)}`] = r;
    }

    // ── 3. Collect all employees across both sets ─────────────────────────
    const employeeIndex = {}; // id → { deviceEmployee, user }
    for (const r of records) {
      if (!employeeIndex[r.deviceEmployeeId]) {
        employeeIndex[r.deviceEmployeeId] = {
          deviceEmployee: r.deviceEmployee,
          user: r.user,
        };
      }
    }
    for (const s of schedules) {
      if (!employeeIndex[s.deviceEmployeeId]) {
        employeeIndex[s.deviceEmployeeId] = {
          deviceEmployee: s.deviceEmployee,
          user: null,
        };
      }
    }

    // ── 4. Build summary per employee ─────────────────────────────────────
    const summary = {};

    // All unique date+employee combinations from both tables
    const allKeys = new Set([
      ...records.map(r => `${r.deviceEmployeeId}|${toDateStr(r.date)}`),
      ...schedules.map(s => `${s.deviceEmployeeId}|${toDateStr(s.date)}`),
    ]);

    for (const key of allKeys) {
      const [empId] = key.split('|');
      const schedule = scheduleMap[key] || null;
      const record   = attMap[key] || null;

      if (!summary[empId]) {
        const empInfo = employeeIndex[empId];
        summary[empId] = {
          deviceEmployee: empInfo?.deviceEmployee ?? null,
          user: empInfo?.user ?? null,
          primaryShiftStart: null,   // first non-off shiftStart, used for sorting
          shiftName: null,           // name of that shift
          totalScheduledDays: 0,
          workDays: 0,      // isOff:false scheduled days
          offDays: 0,       // isOff:true scheduled days
          onTime: 0,
          late: 0,
          absent: 0,
          earlyLeave: 0,
          noCheckout: 0,
          totalLateMinutes: 0,
          totalEarlyLeaveMinutes: 0,
          totalOvertimeMinutes: 0,
          overtimeDays: 0,
          totalWorkingMinutes: 0,
          daysWithWorkingHours: 0,
          records: [],
        };
      }

      const emp = summary[empId];

      // Count scheduled days
      if (schedule) {
        emp.totalScheduledDays++;
        if (schedule.isOff) emp.offDays++;
        else {
          emp.workDays++;
          // Track first work-day shift for sorting
          if (!emp.primaryShiftStart && schedule.shiftStart) {
            emp.primaryShiftStart = schedule.shiftStart;
            emp.shiftName = schedule.shift?.name || null;
          }
        }
      }

      if (schedule?.isOff) {
        // Off day — no attendance status expected
        emp.records.push({
          date: key.split('|')[1],
          isOff: true,
          checkInTime: record?.checkInTime ?? null,
          checkOutTime: record?.checkOutTime ?? null,
          computedStatus: null,
          lateMinutes: 0,
          schedule: { shiftStart: null, shiftEnd: null, isOff: true },
        });
        continue;
      }

      // Work day
      if (!record) {
        // Has schedule but no tap → absent
        emp.absent++;
        emp.records.push({
          date: key.split('|')[1],
          isOff: false,
          checkInTime: null,
          checkOutTime: null,
          computedStatus: 'absent',
          lateMinutes: 0,
          workingMinutes: null,
          workingHoursFormatted: null,
          schedule: schedule ? { shiftStart: schedule.shiftStart, shiftEnd: schedule.shiftEnd, isOff: false } : null,
        });
      } else {
        // Has attendance
        const { computedStatus, statusDetail, lateMinutes, checkoutStatus, earlyLeaveMinutes, overtimeMinutes } = computeScheduleStatus(record, schedule, tenantTimezone);
        if (computedStatus === 'on_time') emp.onTime++;
        else if (computedStatus === 'late') { emp.late++; emp.totalLateMinutes += lateMinutes; }
        else if (computedStatus === 'absent') emp.absent++;

        // Accumulate checkout-related counters
        if (checkoutStatus === 'early_leave') { emp.earlyLeave++; emp.totalEarlyLeaveMinutes += earlyLeaveMinutes; }
        else if (checkoutStatus === 'no_checkout') emp.noCheckout++;

        // Accumulate overtime
        if (overtimeMinutes > 0) {
          emp.totalOvertimeMinutes = (emp.totalOvertimeMinutes || 0) + overtimeMinutes;
          emp.overtimeDays = (emp.overtimeDays || 0) + 1;
        }

        // Calculate working hours (checkIn → checkOut)
        let workingMinutes = null;
        let workingHoursFormatted = null;
        if (record.checkInTime && record.checkOutTime) {
          const diffMs = new Date(record.checkOutTime) - new Date(record.checkInTime);
          if (diffMs > 0) {
            workingMinutes = Math.floor(diffMs / 60000);
            workingHoursFormatted = formatWorkingHours(workingMinutes);
            emp.totalWorkingMinutes += workingMinutes;
            emp.daysWithWorkingHours++;
          }
        }

        emp.records.push({
          date: toDateStr(record.date),
          isOff: false,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          status: record.status,
          computedStatus,
          statusDetail,
          lateMinutes,
          checkoutStatus,
          earlyLeaveMinutes,
          overtimeMinutes,
          workingMinutes,
          workingHoursFormatted,
          schedule: schedule ? { shiftStart: schedule.shiftStart, shiftEnd: schedule.shiftEnd, isOff: false } : null,
        });
      }
    }

    // Sort each employee's records by date ASC
    for (const empSummary of Object.values(summary)) {
      empSummary.records.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    }

    // Compute per-employee working hours totals/averages
    for (const emp of Object.values(summary)) {
      emp.totalWorkingHoursFormatted = formatWorkingHours(emp.totalWorkingMinutes);
      emp.averageWorkingMinutes = emp.daysWithWorkingHours > 0
        ? Math.round(emp.totalWorkingMinutes / emp.daysWithWorkingHours)
        : null;
      emp.averageWorkingHoursFormatted = formatWorkingHours(emp.averageWorkingMinutes);
      emp.totalOvertimeHoursFormatted = formatWorkingHours(emp.totalOvertimeMinutes);
    }

    // Sort employees: by shiftStart ASC (nulls last), then by employeeNo ASC
    const sortedData = Object.values(summary).sort((a, b) => {
      const shiftA = a.primaryShiftStart || '99:99';
      const shiftB = b.primaryShiftStart || '99:99';
      if (shiftA !== shiftB) return shiftA.localeCompare(shiftB);
      const noA = a.deviceEmployee?.employeeNo || '';
      const noB = b.deviceEmployee?.employeeNo || '';
      return noA.localeCompare(noB, undefined, { numeric: true });
    });

    return res.json({
      success: true,
      period: { startDate, endDate },
      data: sortedData,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   PATCH /gym/staff-attendance/:id
 * @desc    Manual correction of staff attendance
 * @access  Private (admin/manager)
 */
async function updateAttendance(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { checkInTime, checkOutTime, status, notes } = req.body;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const attendance = await StaffAttendance.findOne({ where });
    if (!attendance) throw createError('NOT_FOUND', 'Attendance record not found');

    await attendance.update({
      ...(checkInTime !== undefined && { checkInTime }),
      ...(checkOutTime !== undefined && { checkOutTime }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
    });

    logger.info('Staff attendance manually updated', {
      attendanceId: id,
      updatedBy: req.user.id,
    });

    return res.json({ success: true, data: attendance });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   POST /gym/staff-attendance
 * @desc    Create manual staff attendance entry
 * @access  Private (admin/manager)
 */
async function createManualAttendance(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { employeeId, userId, date, checkInTime, checkOutTime, status, notes } = req.body;

    if ((!employeeId && !userId) || !date) {
      throw createError('VALIDATION_ERROR', 'employeeId (or userId) and date are required');
    }

    // Resolve employeeId to deviceEmployeeId if provided
    let deviceEmployeeId;
    let resolvedUserId = userId || null;
    if (employeeId) {
      const employee = await DeviceEmployee.findOne({
        where: { employeeNo: String(employeeId), tenantId },
      });
      if (!employee) throw createError('NOT_FOUND', `Employee not found: ${employeeId}`);
      deviceEmployeeId = employee.id;
      resolvedUserId = employee.userId || null;
    } else {
      // Legacy: userId provided, find DeviceEmployee
      const employee = await DeviceEmployee.findOne({
        where: { userId, tenantId },
      });
      if (!employee) throw createError('NOT_FOUND', 'No DeviceEmployee linked to this userId');
      deviceEmployeeId = employee.id;
    }

    // Check for existing record
    const existing = await StaffAttendance.findOne({
      where: { tenantId, deviceEmployeeId, date },
    });

    if (existing) {
      throw createError('VALIDATION_ERROR', 'Attendance record already exists for this employee on this date');
    }

    const attendance = await StaffAttendance.create({
      tenantId,
      deviceEmployeeId,
      userId: resolvedUserId,
      date,
      checkInTime: checkInTime || null,
      checkOutTime: checkOutTime || null,
      status: status || 'present',
      notes: notes || 'Manual entry',
    });

    return res.status(201).json({ success: true, data: attendance });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   POST /gym/staff-attendance/reprocess
 * @desc    Reprocess unmatched DeviceAttendanceLogs → create StaffAttendance records
 *          Uses DeviceEmployee.employeeNo for matching against device logs.
 * @access  Private (admin)
 * @query   startDate, endDate (optional filters)
 */
async function reprocessUnmatchedLogs(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate } = req.query;

    // 1. Find all DeviceEmployees for this tenant
    const empWhere = {};
    if (!isSuperAdmin) empWhere.tenantId = tenantId;

    const employees = await DeviceEmployee.findAll({
      where: empWhere,
      attributes: ['id', 'tenantId', 'employeeNo', 'userId', 'name'],
    });

    if (employees.length === 0) {
      return res.json({
        success: true,
        message: 'No device employees found.',
        stats: { processed: 0, matched: 0, skipped: 0 },
      });
    }

    // Build lookup: employeeNo → DeviceEmployee
    const employeeNoToEmp = {};
    for (const emp of employees) {
      employeeNoToEmp[emp.employeeNo] = emp;
    }

    // 2. Find unmatched logs (matchedDeviceEmployeeId is null)
    const logWhere = { matchedDeviceEmployeeId: null };
    if (!isSuperAdmin) logWhere.tenantId = tenantId;

    // Only process logs whose deviceEmployeeNo is in our employee list
    logWhere.deviceEmployeeNo = { [Op.in]: Object.keys(employeeNoToEmp) };

    if (startDate || endDate) {
      logWhere.eventTime = {};
      if (startDate) logWhere.eventTime[Op.gte] = new Date(startDate);
      if (endDate) logWhere.eventTime[Op.lte] = new Date(`${endDate}T23:59:59`);
    }

    const unmatchedLogs = await DeviceAttendanceLog.findAll({
      where: logWhere,
      order: [['eventTime', 'ASC']],
    });

    if (unmatchedLogs.length === 0) {
      return res.json({
        success: true,
        message: 'No unmatched logs found that match current employees.',
        stats: { processed: 0, matched: 0, skipped: 0 },
      });
    }

    // 3. Process each log → create/update StaffAttendance
    let matched = 0;
    let skipped = 0;

    await sequelize.transaction(async (t) => {
      for (const log of unmatchedLogs) {
        const emp = employeeNoToEmp[log.deviceEmployeeNo];
        if (!emp) {
          skipped++;
          continue;
        }

        const eventDate = new Date(log.eventTime);
        const dateOnly = eventDate.toISOString().split('T')[0];

        // Check existing StaffAttendance for this employee+date
        const existing = await StaffAttendance.findOne({
          where: {
            tenantId: log.tenantId,
            deviceEmployeeId: emp.id,
            date: dateOnly,
          },
          transaction: t,
        });

        if (existing) {
          // Update checkOutTime if this event is later
          if (!existing.checkOutTime || eventDate > new Date(existing.checkOutTime)) {
            await existing.update(
              { checkOutTime: eventDate, deviceId: log.deviceId },
              { transaction: t }
            );
          }
        } else {
          // Create new attendance record
          await StaffAttendance.create(
            {
              tenantId: log.tenantId,
              deviceEmployeeId: emp.id,
              userId: emp.userId || null,
              deviceId: log.deviceId,
              logId: log.id,
              checkInTime: eventDate,
              date: dateOnly,
              status: 'present',
            },
            { transaction: t }
          );
        }

        // Update the log record
        await log.update({
          matchedDeviceEmployeeId: emp.id,
          matchedUserId: emp.userId || null,
        }, { transaction: t });
        matched++;
      }
    });

    logger.info('Staff attendance reprocess completed', {
      tenantId,
      totalLogs: unmatchedLogs.length,
      matched,
      skipped,
      employeesMapped: employees.length,
    });

    return res.json({
      success: true,
      message: `Reprocessed ${unmatchedLogs.length} unmatched logs`,
      stats: {
        processed: unmatchedLogs.length,
        matched,
        skipped,
        employeesMapped: employees.map(e => ({
          deviceEmployeeId: e.id,
          name: e.name,
          employeeNo: e.employeeNo,
        })),
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   POST /gym/staff-attendance/sync
 * @desc    Pull latest events from ALL active Hikvision devices and process into StaffAttendance.
 *          This is a manual "refresh" button for the staff attendance page.
 * @access  Private (admin/manager)
 * @query   startDate (optional) - pull events from this date instead of lastSyncAt
 */
async function syncAllDevices(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate } = req.query;

    // Find all active Hikvision devices for this tenant
    const deviceWhere = { isActive: true };
    if (!isSuperAdmin) deviceWhere.tenantId = tenantId;

    const devices = await HikvisionDevice.findAll({ where: deviceWhere });

    if (!devices.length) {
      return res.json({
        success: true,
        message: 'No active Hikvision devices found',
        data: { devicesProcessed: 0, totalEvents: 0, results: [] },
      });
    }

    const endTime = new Date();
    const results = [];
    let totalProcessed = 0;
    let totalDuplicates = 0;
    let totalMatched = 0;

    for (const device of devices) {
      // Skip devices in enrollment mode
      if (HikvisionService.isEnrollmentLocked(device.id)) {
        results.push({
          deviceId: device.id,
          name: device.name,
          skipped: 'enrollment in progress',
        });
        continue;
      }

      let syncStart;
      if (startDate) {
        syncStart = new Date(startDate);
      } else {
        // From last sync, or last 24 hours if never synced
        syncStart = device.lastSyncAt || new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
      }

      try {
        const rawEvents = await HikvisionService.pullEvents(device, syncStart, endTime);

        if (rawEvents.length > 0) {
          const stats = await HikvisionEventProcessor.processEvents(device.id, rawEvents, 'pull');
          totalProcessed += stats.processed;
          totalDuplicates += stats.duplicates;
          totalMatched += stats.matched;

          results.push({
            deviceId: device.id,
            name: device.name,
            ip: device.ipAddress,
            eventsFound: rawEvents.length,
            ...stats,
          });
        } else {
          results.push({
            deviceId: device.id,
            name: device.name,
            ip: device.ipAddress,
            eventsFound: 0,
          });
        }

        // Update lastSyncAt
        await device.update({ lastSyncAt: endTime });
      } catch (pullErr) {
        logger.error('Staff attendance sync: device pull failed', {
          deviceId: device.id,
          name: device.name,
          error: pullErr.message,
        });
        results.push({
          deviceId: device.id,
          name: device.name,
          ip: device.ipAddress,
          error: pullErr.message,
        });
      }
    }

    logger.info('Staff attendance manual sync completed', {
      tenantId,
      devicesProcessed: devices.length,
      totalProcessed,
      totalMatched,
      totalDuplicates,
    });

    return res.json({
      success: true,
      message: `Synced ${devices.length} device(s), ${totalProcessed} new event(s) processed, ${totalMatched} matched to staff`,
      data: {
        syncedFrom: startDate || 'lastSyncAt per device',
        syncedTo: endTime,
        devicesProcessed: devices.length,
        totalProcessed,
        totalDuplicates,
        totalMatched,
        results,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   POST /gym/staff-attendance/fix-checkin
 * @desc    Smart fix: detect attendance where checkIn is actually near shiftEnd
 *          and should be checkOut instead. Also detect checkOut near shiftStart
 *          that should be checkIn.
 *
 *          Supports dry-run (preview) and apply modes.
 *
 * @access  Private (admin)
 * @query   dryRun=true|false (default: true)
 *          startDate, endDate (optional — limit date range)
 *          employeeId (optional — limit to specific employee)
 */
async function fixSmartCheckInOut(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      dryRun = 'true',
      startDate,
      endDate,
      employeeId,
    } = req.query;

    const isDryRun = dryRun !== 'false';
    const tenantTimezone = req.user?.tenant?.settings?.timezone || process.env.TZ || 'Asia/Jakarta';

    // ── 1. Find attendance with checkIn but no checkOut ──────────────────
    const where = {
      checkInTime: { [Op.ne]: null },
      checkOutTime: null,
    };
    if (!isSuperAdmin) where.tenantId = tenantId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Op.gte] = startDate;
      if (endDate)   where.date[Op.lte] = endDate;
    }
    if (employeeId) where.deviceEmployeeId = employeeId;

    const records = await StaffAttendance.findAll({
      where,
      include: [
        { model: DeviceEmployee, as: 'deviceEmployee', attributes: ['id', 'employeeNo', 'name'] },
      ],
      order: [['date', 'ASC']],
    });

    // ── 2. Also find attendance with checkOut but no checkIn ─────────────
    const whereReverse = {
      checkInTime: null,
      checkOutTime: { [Op.ne]: null },
    };
    if (!isSuperAdmin) whereReverse.tenantId = tenantId;
    if (startDate || endDate) {
      whereReverse.date = {};
      if (startDate) whereReverse.date[Op.gte] = startDate;
      if (endDate)   whereReverse.date[Op.lte] = endDate;
    }
    if (employeeId) whereReverse.deviceEmployeeId = employeeId;

    const reverseRecords = await StaffAttendance.findAll({
      where: whereReverse,
      include: [
        { model: DeviceEmployee, as: 'deviceEmployee', attributes: ['id', 'employeeNo', 'name'] },
      ],
      order: [['date', 'ASC']],
    });

    const allRecords = [...records, ...reverseRecords];
    const fixes = [];

    for (const rec of allRecords) {
      const emp = rec.deviceEmployee;
      if (!emp) continue;

      const recDate = toDateStr(rec.date);
      const schedule = await EmployeeSchedule.findOne({
        where: {
          tenantId: rec.tenantId,
          deviceEmployeeId: emp.id,
          date: recDate,
          isOff: false,
        },
      });

      if (!schedule || !schedule.shiftStart || !schedule.shiftEnd) continue;

      const [ssh, ssm] = schedule.shiftStart.split(':').map(Number);
      const [seh, sem] = schedule.shiftEnd.split(':').map(Number);
      const shiftStartMins = ssh * 60 + ssm;
      const shiftEndMins   = seh * 60 + sem;
      const shiftDuration  = shiftEndMins > shiftStartMins
        ? shiftEndMins - shiftStartMins
        : (1440 - shiftStartMins) + shiftEndMins;
      const halfShift = shiftDuration / 2;

      // ── Case A: has checkIn, no checkOut → maybe checkIn is actually checkOut
      if (rec.checkInTime && !rec.checkOutTime) {
        const tapTime = new Date(rec.checkInTime);
        const localTime = tapTime.toLocaleTimeString('en-GB', { timeZone: tenantTimezone, hour12: false });
        const [eh, em] = localTime.split(':').map(Number);
        const eventMins = eh * 60 + em;

        const distToStart = Math.abs(eventMins - shiftStartMins);
        const distToEnd   = Math.abs(eventMins - shiftEndMins);
        const minsAfterStart = eventMins >= shiftStartMins
          ? eventMins - shiftStartMins
          : (1440 - shiftStartMins) + eventMins;

        if (distToEnd < distToStart && minsAfterStart > halfShift) {
          const fix = {
            id: rec.id,
            employee: `${emp.employeeNo} - ${emp.name}`,
            date: recDate,
            action: 'checkIn_to_checkOut',
            tapTime: localTime,
            shiftStart: schedule.shiftStart,
            shiftEnd: schedule.shiftEnd,
            distToStart,
            distToEnd,
          };

          if (!isDryRun) {
            await rec.update({ checkOutTime: rec.checkInTime, checkInTime: null });
            fix.applied = true;
          }

          fixes.push(fix);
        }
      }

      // ── Case B: has checkOut, no checkIn → maybe checkOut is actually checkIn
      if (!rec.checkInTime && rec.checkOutTime) {
        const tapTime = new Date(rec.checkOutTime);
        const localTime = tapTime.toLocaleTimeString('en-GB', { timeZone: tenantTimezone, hour12: false });
        const [eh, em] = localTime.split(':').map(Number);
        const eventMins = eh * 60 + em;

        const distToStart = Math.abs(eventMins - shiftStartMins);
        const distToEnd   = Math.abs(eventMins - shiftEndMins);
        const minsAfterStart = eventMins >= shiftStartMins
          ? eventMins - shiftStartMins
          : (1440 - shiftStartMins) + eventMins;

        if (distToStart < distToEnd && minsAfterStart < halfShift) {
          const fix = {
            id: rec.id,
            employee: `${emp.employeeNo} - ${emp.name}`,
            date: recDate,
            action: 'checkOut_to_checkIn',
            tapTime: localTime,
            shiftStart: schedule.shiftStart,
            shiftEnd: schedule.shiftEnd,
            distToStart,
            distToEnd,
          };

          if (!isDryRun) {
            await rec.update({ checkInTime: rec.checkOutTime, checkOutTime: null });
            fix.applied = true;
          }

          fixes.push(fix);
        }
      }
    }

    const checkInToOut = fixes.filter(f => f.action === 'checkIn_to_checkOut').length;
    const checkOutToIn = fixes.filter(f => f.action === 'checkOut_to_checkIn').length;

    logger.info(`[fixSmartCheckInOut] ${isDryRun ? 'DRY RUN' : 'APPLIED'}: ${fixes.length} fixes (${checkInToOut} in→out, ${checkOutToIn} out→in)`);

    return res.json({
      success: true,
      mode: isDryRun ? 'dry_run' : 'applied',
      total: fixes.length,
      summary: {
        checkInToCheckOut: checkInToOut,
        checkOutToCheckIn: checkOutToIn,
        scannedRecords: allRecords.length,
      },
      fixes,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   GET /gym/staff-attendance/report/export
 * @desc    Export staff attendance report as Excel (.xlsx)
 *          Sheet 1: Ringkasan per karyawan
 *          Sheet 2: Detail harian
 * @access  Private (admin/manager)
 * @query   startDate, endDate, userId, employeeId
 */
async function exportAttendanceReport(req, res, next) {
  try {
    const ExcelJS = require('exceljs');
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, userId, employeeId } = req.query;

    if (!startDate || !endDate) {
      throw createError('VALIDATION_ERROR', 'startDate and endDate are required');
    }

    const tenantTimezone = req.user?.tenant?.settings?.timezone || process.env.TZ || 'Asia/Jakarta';

    // ── Same data loading logic as attendanceReport ─────────────────────
    const attWhere = { date: { [Op.gte]: startDate, [Op.lte]: endDate } };
    if (!isSuperAdmin) attWhere.tenantId = tenantId;
    if (employeeId) attWhere.deviceEmployeeId = employeeId;
    else if (userId) attWhere.userId = userId;

    const records = await StaffAttendance.findAll({
      where: attWhere,
      include: [
        { model: DeviceEmployee, as: 'deviceEmployee', attributes: ['id', 'employeeNo', 'name'] },
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      order: [['deviceEmployeeId', 'ASC'], ['date', 'ASC']],
    });

    const scheduleWhere = { date: { [Op.gte]: startDate, [Op.lte]: endDate } };
    if (!isSuperAdmin) scheduleWhere.tenantId = tenantId;
    if (employeeId) scheduleWhere.deviceEmployeeId = employeeId;
    else if (userId) scheduleWhere.userId = userId;

    const schedules = await EmployeeSchedule.findAll({
      where: scheduleWhere,
      include: [
        { model: DeviceEmployee, as: 'deviceEmployee', attributes: ['id', 'employeeNo', 'name'] },
        { model: Shift, as: 'shift', attributes: ['id', 'name', 'shiftStart'] },
      ],
    });

    const scheduleMap = {};
    for (const s of schedules) scheduleMap[`${s.deviceEmployeeId}|${toDateStr(s.date)}`] = s;

    const attMap = {};
    for (const r of records) attMap[`${r.deviceEmployeeId}|${toDateStr(r.date)}`] = r;

    const employeeIndex = {};
    for (const r of records) {
      if (!employeeIndex[r.deviceEmployeeId]) employeeIndex[r.deviceEmployeeId] = { deviceEmployee: r.deviceEmployee, user: r.user };
    }
    for (const s of schedules) {
      if (!employeeIndex[s.deviceEmployeeId]) employeeIndex[s.deviceEmployeeId] = { deviceEmployee: s.deviceEmployee, user: null };
    }

    const summary = {};
    const allKeys = new Set([
      ...records.map(r => `${r.deviceEmployeeId}|${toDateStr(r.date)}`),
      ...schedules.map(s => `${s.deviceEmployeeId}|${toDateStr(s.date)}`),
    ]);

    for (const key of allKeys) {
      const [empId] = key.split('|');
      const schedule = scheduleMap[key] || null;
      const record   = attMap[key] || null;
      if (!summary[empId]) {
        const empInfo = employeeIndex[empId];
        summary[empId] = {
          deviceEmployee: empInfo?.deviceEmployee ?? null,
          user: empInfo?.user ?? null,
          primaryShiftStart: null,
          shiftName: null,
          totalScheduledDays: 0,
          workDays: 0,
          offDays: 0,
          onTime: 0,
          late: 0,
          absent: 0,
          earlyLeave: 0,
          noCheckout: 0,
          incomplete: 0,
          totalLateMinutes: 0,
          totalEarlyLeaveMinutes: 0,
          totalOvertimeMinutes: 0,
          overtimeDays: 0,
          totalWorkingMinutes: 0,
          daysWithWorkingHours: 0,
          records: [],
        };
      }
      const emp = summary[empId];
      if (schedule) {
        emp.totalScheduledDays++;
        if (schedule.isOff) { emp.offDays++; }
        else {
          emp.workDays++;
          if (!emp.primaryShiftStart && schedule.shiftStart) {
            emp.primaryShiftStart = schedule.shiftStart;
            emp.shiftName = schedule.shift?.name || null;
          }
        }
      }
      if (schedule?.isOff) {
        const offOverall = (record && record.checkInTime) ? 'off_day_work' : 'off_day';
        emp.records.push({ date: key.split('|')[1], isOff: true, checkInTime: record?.checkInTime ?? null, checkOutTime: record?.checkOutTime ?? null, computedStatus: null, lateMinutes: 0, workingMinutes: null, workingHoursFormatted: null, overallStatus: offOverall, checkoutStatus: null, earlyLeaveMinutes: 0, overtimeMinutes: 0, schedule: { shiftStart: null, shiftEnd: null, isOff: true } });
        continue;
      }
      if (!record) {
        emp.absent++;
        emp.records.push({ date: key.split('|')[1], isOff: false, checkInTime: null, checkOutTime: null, computedStatus: 'absent', lateMinutes: 0, checkoutStatus: null, earlyLeaveMinutes: 0, overtimeMinutes: 0, workingMinutes: null, workingHoursFormatted: null, overallStatus: 'absent', schedule: schedule ? { shiftStart: schedule.shiftStart, shiftEnd: schedule.shiftEnd, isOff: false } : null });
      } else {
        const { computedStatus, statusDetail, lateMinutes, checkoutStatus, earlyLeaveMinutes, overtimeMinutes, overallStatus } = computeScheduleStatus(record, schedule, tenantTimezone);
        if (computedStatus === 'on_time') emp.onTime++;
        else if (computedStatus === 'late') { emp.late++; emp.totalLateMinutes += lateMinutes; }
        else if (computedStatus === 'absent') emp.absent++;
        if (checkoutStatus === 'early_leave') { emp.earlyLeave++; emp.totalEarlyLeaveMinutes += earlyLeaveMinutes; }
        else if (checkoutStatus === 'no_checkout') { emp.noCheckout++; emp.incomplete = (emp.incomplete || 0) + 1; }
        if (overtimeMinutes > 0) {
          emp.totalOvertimeMinutes = (emp.totalOvertimeMinutes || 0) + overtimeMinutes;
          emp.overtimeDays = (emp.overtimeDays || 0) + 1;
        }
        let workingMinutes = null;
        let workingHoursFormatted = null;
        if (record.checkInTime && record.checkOutTime) {
          const diffMs = new Date(record.checkOutTime) - new Date(record.checkInTime);
          if (diffMs > 0) {
            workingMinutes = Math.floor(diffMs / 60000);
            workingHoursFormatted = formatWorkingHours(workingMinutes);
            emp.totalWorkingMinutes += workingMinutes;
            emp.daysWithWorkingHours++;
          }
        }
        emp.records.push({ date: toDateStr(record.date), isOff: false, checkInTime: record.checkInTime, checkOutTime: record.checkOutTime, status: record.status, computedStatus, statusDetail, lateMinutes, checkoutStatus, earlyLeaveMinutes, overtimeMinutes, workingMinutes, workingHoursFormatted, overallStatus, schedule: schedule ? { shiftStart: schedule.shiftStart, shiftEnd: schedule.shiftEnd, isOff: false } : null });
      }
    }
    for (const empSummary of Object.values(summary)) {
      empSummary.records.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      empSummary.totalWorkingHoursFormatted = formatWorkingHours(empSummary.totalWorkingMinutes);
      empSummary.averageWorkingMinutes = empSummary.daysWithWorkingHours > 0 ? Math.round(empSummary.totalWorkingMinutes / empSummary.daysWithWorkingHours) : null;
      empSummary.averageWorkingHoursFormatted = formatWorkingHours(empSummary.averageWorkingMinutes);
      empSummary.totalOvertimeHoursFormatted = formatWorkingHours(empSummary.totalOvertimeMinutes);
    }

    // Sort employees: by shiftStart ASC, then employeeNo ASC
    const sortedData = Object.values(summary).sort((a, b) => {
      const shiftA = a.primaryShiftStart || '99:99';
      const shiftB = b.primaryShiftStart || '99:99';
      if (shiftA !== shiftB) return shiftA.localeCompare(shiftB);
      const noA = a.deviceEmployee?.employeeNo || '';
      const noB = b.deviceEmployee?.employeeNo || '';
      return noA.localeCompare(noB, undefined, { numeric: true });
    });

    // ── Build Excel ─────────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Gym Management System';
    workbook.created = new Date();

    // ── Style helpers ────────────────────────────────────────────────────
    const thinBorder = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
    const boldFont   = { bold: true, size: 10, name: 'Calibri' };
    const normalFont = { size: 10, name: 'Calibri' };
    const centerAlign = { horizontal: 'center', vertical: 'middle', wrapText: true };
    const leftAlign   = { vertical: 'middle', wrapText: true };
    const headerFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    const onTimeFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
    const lateFill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
    const absentFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
    const offFill     = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };

    const MONTHS_ID = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const sM = parseInt(startDate.split('-')[1]);
    const eM = parseInt(endDate.split('-')[1]);
    const sY = startDate.split('-')[0];
    const eY = endDate.split('-')[0];
    const periodLabel = sM === eM && sY === eY
      ? `${MONTHS_ID[sM]} ${sY}`
      : `${MONTHS_ID[sM]}${sY !== eY ? ' ' + sY : ''} - ${MONTHS_ID[eM]} ${eY}`;

    function formatLocalTime(dt) {
      if (!dt) return '-';
      return new Date(dt).toLocaleTimeString('en-GB', { timeZone: tenantTimezone, hour12: false });
    }
    function formatLocalDate(dt) {
      if (!dt) return '-';
      return String(dt).split('T')[0];
    }
    const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    function dayName(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return DAY_NAMES_ID[d.getUTCDay()] || '';
    }
    const incompleteFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8C00' } }; // dark orange
    const overtimeFill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6F42C1' } }; // purple
    const scheduledFill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6D8DB' } }; // gray
    const completeFill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF28A745' } }; // green

    /** Map overallStatus → Indonesian label for excel cells */
    function statusLabel(computedStatus, isOff, overallStatus) {
      const os = overallStatus || computedStatus;
      if (isOff && os !== 'off_day_work') return 'Off';
      switch (os) {
        case 'complete':       return 'Lengkap';
        case 'complete_late':  return 'Lengkap (Telat)';
        case 'overtime':       return 'Lembur';
        case 'early_leave':    return 'Pulang Awal';
        case 'incomplete':     return 'Belum Checkout';
        case 'working':        return 'Sedang Bekerja';
        case 'on_time':        return 'Tepat Waktu';
        case 'late':           return 'Terlambat';
        case 'absent':         return 'Tidak Hadir';
        case 'scheduled':      return 'Terjadwal';
        case 'off_day':        return 'Off';
        case 'off_day_work':   return 'Off (Masuk Kerja)';
        default:               return os || '-';
      }
    }
    /** Map overallStatus → cell background fill */
    function statusFill(computedStatus, isOff, overallStatus) {
      const os = overallStatus || computedStatus;
      if (isOff && os !== 'off_day_work') return offFill;
      switch (os) {
        case 'complete':       return completeFill;
        case 'complete_late':  return lateFill;
        case 'overtime':       return overtimeFill;
        case 'early_leave':    return lateFill;
        case 'incomplete':     return incompleteFill;
        case 'working':        return onTimeFill;
        case 'on_time':        return onTimeFill;
        case 'late':           return lateFill;
        case 'absent':         return absentFill;
        case 'scheduled':      return scheduledFill;
        case 'off_day':        return offFill;
        case 'off_day_work':   return incompleteFill;
        default:               return null;
      }
    }

    // ========================================================
    // SHEET 1: Ringkasan per Karyawan
    // ========================================================
    const ws1 = workbook.addWorksheet('Ringkasan');

    // Title row
    ws1.mergeCells('A1:R1');
    const titleCell = ws1.getCell('A1');
    titleCell.value = `LAPORAN ABSENSI KARYAWAN - ${periodLabel.toUpperCase()}`;
    titleCell.font = { bold: true, size: 13, name: 'Calibri' };
    titleCell.alignment = centerAlign;

    ws1.mergeCells('A2:R2');
    ws1.getCell('A2').value = `Periode: ${startDate} s/d ${endDate}`;
    ws1.getCell('A2').font = { size: 10, name: 'Calibri', italic: true };
    ws1.getCell('A2').alignment = centerAlign;

    // Header
    const s1Headers = [
      'No', 'Nama Karyawan', 'NIK', 'Shift',
      'Jml Jadwal', 'Hari Kerja', 'Hari Off',
      'Tepat Waktu', 'Terlambat', 'Tidak Hadir',
      'Pulang Awal', 'Blm Checkout', 'Lembur (hari)',
      'Total Telat (mnt)', 'Total Lembur',
      'Hari Ada Jam', 'Total Jam Kerja', 'Rata-rata Jam/Hari',
    ];
    const hdrRow = ws1.getRow(4);
    s1Headers.forEach((h, i) => {
      const cell = hdrRow.getCell(i + 1);
      cell.value = h;
      cell.font = boldFont;
      cell.fill = headerFill;
      cell.alignment = centerAlign;
      cell.border = thinBorder;
    });
    hdrRow.height = 30;

    ws1.columns = [
      { width: 5 },  // No
      { width: 25 }, // Nama
      { width: 12 }, // NIK
      { width: 15 }, // Shift
      { width: 12 }, // Jml Jadwal
      { width: 12 }, // Hari Kerja
      { width: 10 }, // Hari Off
      { width: 13 }, // Tepat Waktu
      { width: 13 }, // Terlambat
      { width: 13 }, // Tidak Hadir
      { width: 13 }, // Pulang Awal
      { width: 15 }, // Blm Checkout
      { width: 14 }, // Lembur (hari)
      { width: 18 }, // Total Telat
      { width: 16 }, // Total Lembur
      { width: 14 }, // Hari Ada Jam
      { width: 16 }, // Total Jam
      { width: 18 }, // Rata-rata Jam
    ];

    sortedData.forEach((emp, idx) => {
      const empName = emp.deviceEmployee?.name ||
        (emp.user ? `${emp.user.firstName || ''} ${emp.user.lastName || ''}`.trim() : '-');
      const row = ws1.addRow([
        idx + 1,
        empName,
        emp.deviceEmployee?.employeeNo || '-',
        emp.shiftName || '-',
        emp.totalScheduledDays,
        emp.workDays,
        emp.offDays,
        emp.onTime,
        emp.late,
        emp.absent,
        emp.earlyLeave,
        emp.incomplete || emp.noCheckout,
        emp.overtimeDays,
        emp.totalLateMinutes,
        emp.totalOvertimeHoursFormatted || '-',
        emp.daysWithWorkingHours,
        emp.totalWorkingHoursFormatted || '-',
        emp.averageWorkingHoursFormatted || '-',
      ]);
      row.eachCell((cell, colNum) => {
        cell.font = normalFont;
        cell.border = thinBorder;
        cell.alignment = colNum <= 4 ? leftAlign : centerAlign;
      });
      row.height = 18;
    });

    // ========================================================
    // SHEET 2: Detail Harian
    // ========================================================
    const ws2 = workbook.addWorksheet('Detail Harian');

    ws2.mergeCells('A1:L1');
    const t2Cell = ws2.getCell('A1');
    t2Cell.value = `DETAIL ABSENSI HARIAN - ${periodLabel.toUpperCase()}`;
    t2Cell.font = { bold: true, size: 13, name: 'Calibri' };
    t2Cell.alignment = centerAlign;

    ws2.mergeCells('A2:L2');
    ws2.getCell('A2').value = `Periode: ${startDate} s/d ${endDate}`;
    ws2.getCell('A2').font = { size: 10, name: 'Calibri', italic: true };
    ws2.getCell('A2').alignment = centerAlign;

    const s2Headers = [
      'No', 'Nama Karyawan', 'NIK',
      'Tanggal', 'Hari', 'Shift',
      'Check In', 'Check Out',
      'Jam Kerja', 'Status', 'Keterlambatan (mnt)', 'Lembur (mnt)',
    ];
    const hdrRow2 = ws2.getRow(4);
    s2Headers.forEach((h, i) => {
      const cell = hdrRow2.getCell(i + 1);
      cell.value = h;
      cell.font = boldFont;
      cell.fill = headerFill;
      cell.alignment = centerAlign;
      cell.border = thinBorder;
    });
    hdrRow2.height = 30;

    ws2.columns = [
      { width: 5 },  // No
      { width: 25 }, // Nama
      { width: 12 }, // NIK
      { width: 14 }, // Tanggal
      { width: 12 }, // Hari
      { width: 16 }, // Shift
      { width: 12 }, // Check In
      { width: 12 }, // Check Out
      { width: 14 }, // Jam Kerja
      { width: 18 }, // Status
      { width: 20 }, // Keterlambatan
      { width: 14 }, // Lembur
    ];

    let rowNum2 = 0;
    sortedData.forEach((emp) => {
      const empName = emp.deviceEmployee?.name ||
        (emp.user ? `${emp.user.firstName || ''} ${emp.user.lastName || ''}`.trim() : '-');
      const nik = emp.deviceEmployee?.employeeNo || '-';

      emp.records.forEach((rec) => {
        rowNum2++;
        const fill = statusFill(rec.computedStatus, rec.isOff, rec.overallStatus);
        const shiftText = rec.schedule && !rec.schedule.isOff && rec.schedule.shiftStart && rec.schedule.shiftEnd
          ? `${rec.schedule.shiftStart.substring(0,5)}-${rec.schedule.shiftEnd.substring(0,5)}`
          : rec.isOff ? 'Off' : '-';
        const row = ws2.addRow([
          rowNum2,
          empName,
          nik,
          formatLocalDate(rec.date),
          dayName(rec.date),
          shiftText,
          formatLocalTime(rec.checkInTime),
          formatLocalTime(rec.checkOutTime),
          rec.workingHoursFormatted || '-',
          statusLabel(rec.computedStatus, rec.isOff, rec.overallStatus),
          rec.isOff ? '' : (rec.lateMinutes || 0),
          rec.overtimeMinutes > 0 ? rec.overtimeMinutes : '',
        ]);
        row.eachCell((cell, colNum) => {
          cell.font = normalFont;
          cell.border = thinBorder;
          cell.alignment = colNum <= 3 ? leftAlign : centerAlign;
          if (colNum === 10 && fill) cell.fill = fill; // Status cell colored
        });
        row.height = 18;
      });
    });

    // ========================================================
    // SHEET 3: Tampilan Frontend (grouped by employee)
    // Columns: Date | Shift | Check In | Check Out | Status | Late (min) | Overtime (min) | Working Time
    // ========================================================
    const ws3 = workbook.addWorksheet('Per Karyawan');

    // Column definitions (8 data columns)
    ws3.columns = [
      { width: 16 }, // Date
      { width: 18 }, // Shift
      { width: 14 }, // Check In
      { width: 14 }, // Check Out
      { width: 20 }, // Status
      { width: 16 }, // Late (min)
      { width: 16 }, // Overtime (min)
      { width: 22 }, // Working Time
    ];

    const COL_COUNT = 8;

    // ── Title ────────────────────────────────────────────────
    ws3.mergeCells(1, 1, 1, COL_COUNT);
    const ws3Title = ws3.getCell('A1');
    ws3Title.value = `LAPORAN ABSENSI KARYAWAN - ${periodLabel.toUpperCase()}`;
    ws3Title.font = { bold: true, size: 13, name: 'Calibri' };
    ws3Title.alignment = centerAlign;
    ws3.getRow(1).height = 22;

    ws3.mergeCells(2, 1, 2, COL_COUNT);
    ws3.getCell('A2').value = `Periode: ${startDate} s/d ${endDate}`;
    ws3.getCell('A2').font = { size: 10, name: 'Calibri', italic: true };
    ws3.getCell('A2').alignment = centerAlign;
    ws3.getRow(2).height = 16;

    // ── Column header row (row 4) ─────────────────────────────
    const COL_HDR_LABELS = ['Date', 'Shift', 'Check In', 'Check Out', 'Status', 'Late (min)', 'Overtime (min)', 'Working Time'];
    const colHdrRow = ws3.getRow(4);
    COL_HDR_LABELS.forEach((h, i) => {
      const cell = colHdrRow.getCell(i + 1);
      cell.value = h;
      cell.font = boldFont;
      cell.fill = headerFill;
      cell.alignment = centerAlign;
      cell.border = thinBorder;
    });
    colHdrRow.height = 22;

    // Employee group header fill  
    const empHdrFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } }; // light gray like frontend

    function shiftLabel(rec) {
      if (!rec.schedule || rec.schedule.isOff) return '—';
      if (rec.schedule.shiftStart && rec.schedule.shiftEnd) {
        return `${rec.schedule.shiftStart.substring(0,5)} – ${rec.schedule.shiftEnd.substring(0,5)}`;
      }
      return '—';
    }

    let currentRow3 = 5; // start after title + blank + col header

    sortedData.forEach((emp) => {
      const empName = emp.deviceEmployee?.name ||
        (emp.user ? `${emp.user.firstName || ''} ${emp.user.lastName || ''}`.trim() : '-');
      const nik = emp.deviceEmployee?.employeeNo || '-';

      // Working days with working hours count
      const daysLabel = `${emp.daysWithWorkingHours} day(s)`;
      const totalLabel = emp.totalWorkingHoursFormatted ? `${daysLabel} • ${emp.totalWorkingHoursFormatted}` : `${daysLabel}`;

      // ── Employee header row ───────────────────────────────
      const empHdrRow = ws3.getRow(currentRow3);

      // Merge A:E for the NIK + name  
      ws3.mergeCells(currentRow3, 1, currentRow3, 6);
      const nameCell = empHdrRow.getCell(1);
      nameCell.value = `  ${nik}   ${empName}`;
      nameCell.font = { bold: true, size: 11, name: 'Calibri' };
      nameCell.fill = empHdrFill;
      nameCell.alignment = { vertical: 'middle', wrapText: false };
      nameCell.border = thinBorder;

      // Merge G:H for summary on the right
      ws3.mergeCells(currentRow3, 7, currentRow3, 8);
      const summaryCell = empHdrRow.getCell(7);
      summaryCell.value = totalLabel;
      summaryCell.font = { bold: false, size: 10, name: 'Calibri', color: { argb: 'FF555555' } };
      summaryCell.fill = empHdrFill;
      summaryCell.alignment = { horizontal: 'right', vertical: 'middle' };
      summaryCell.border = thinBorder;

      empHdrRow.height = 22;
      currentRow3++;

      // ── Data rows ─────────────────────────────────────────
      emp.records.forEach((rec) => {
        const fill = statusFill(rec.computedStatus, rec.isOff, rec.overallStatus);
        const dataRow = ws3.getRow(currentRow3);

        // Date
        const dateCell = dataRow.getCell(1);
        dateCell.value = formatLocalDate(rec.date);
        dateCell.font = normalFont;
        dateCell.alignment = leftAlign;
        dateCell.border = thinBorder;

        // Shift
        const shiftCell = dataRow.getCell(2);
        shiftCell.value = shiftLabel(rec);
        shiftCell.font = { ...normalFont, color: { argb: 'FF007BFF' } };
        shiftCell.alignment = centerAlign;
        shiftCell.border = thinBorder;

        // Check In
        const ciCell = dataRow.getCell(3);
        ciCell.value = formatLocalTime(rec.checkInTime);
        ciCell.font = normalFont;
        ciCell.alignment = centerAlign;
        ciCell.border = thinBorder;

        // Check Out
        const coCell = dataRow.getCell(4);
        coCell.value = formatLocalTime(rec.checkOutTime);
        coCell.font = normalFont;
        coCell.alignment = centerAlign;
        coCell.border = thinBorder;

        // Status (badge-style: colored background, white bold text - using overallStatus)
        const stCell = dataRow.getCell(5);
        stCell.value = statusLabel(rec.computedStatus, rec.isOff, rec.overallStatus);
        stCell.font = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
        if (fill) stCell.fill = fill;
        stCell.alignment = centerAlign;
        stCell.border = thinBorder;

        // Late (min)
        const lateCell = dataRow.getCell(6);
        lateCell.value = rec.isOff ? '—' : (rec.lateMinutes ? rec.lateMinutes : '—');
        lateCell.font = normalFont;
        lateCell.alignment = centerAlign;
        lateCell.border = thinBorder;

        // Overtime (min)
        const otCell = dataRow.getCell(7);
        otCell.value = rec.overtimeMinutes > 0 ? rec.overtimeMinutes : '—';
        otCell.font = normalFont;
        otCell.alignment = centerAlign;
        otCell.border = thinBorder;

        // Working Time
        const wtCell = dataRow.getCell(8);
        wtCell.value = rec.workingHoursFormatted
          ? `${rec.workingHoursFormatted} (${rec.workingMinutes} min)`
          : '—';
        wtCell.font = normalFont;
        wtCell.alignment = { horizontal: 'right', vertical: 'middle' };
        wtCell.border = thinBorder;

        dataRow.height = 18;
        currentRow3++;
      });

      // Blank separator row between employees
      ws3.getRow(currentRow3).height = 6;
      currentRow3++;
    });

    // ── Protect sheets (read-only with password) ──────────────────────
    const sheetPassword = 'gym@2026!protect';
    const protectOpts = {
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatCells: false,
      formatColumns: false,
      formatRows: false,
      insertColumns: false,
      insertRows: false,
      insertHyperlinks: false,
      deleteColumns: false,
      deleteRows: false,
      sort: false,
      autoFilter: true,
      pivotTables: false,
    };
    await ws1.protect(sheetPassword, protectOpts);
    await ws2.protect(sheetPassword, protectOpts);
    await ws3.protect(sheetPassword, protectOpts);

    // ── Send file ───────────────────────────────────────────────────────
    const filename = `absensi_staff_${startDate}_${endDate}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listAttendance,
  attendanceReport,
  exportAttendanceReport,
  updateAttendance,
  createManualAttendance,
  reprocessUnmatchedLogs,
  syncAllDevices,
  fixSmartCheckInOut,
};
