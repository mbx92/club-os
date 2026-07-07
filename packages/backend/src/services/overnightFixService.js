'use strict';

/**
 * Overnight Fix Service
 *
 * Detects and corrects overnight schedules that were saved on the checkout date
 * instead of the shift start date.
 *
 * Example: shift 21:50→06:00 should have schedule.date = the night the shift STARTS.
 * If it was accidentally saved with date = the morning the shift ENDS, taps are
 * misassigned and attendance shows wrong late/early_leave values.
 *
 * This service is used by:
 * - staffAttendanceController.fixOvernightScheduleAlignment (manual HTTP trigger)
 * - overnightFixJob (automated daily cron)
 */

const { Op } = require('sequelize');
const {
  EmployeeSchedule,
  StaffAttendance,
  DeviceAttendanceLog,
  DeviceEmployee,
  Tenant,
  sequelize,
} = require('../models');
const HikvisionEventProcessor = require('./hikvisionEventProcessor');
const {
  getPreviousDateOnly,
  getScheduleMetricsForEvent,
  isPlausibleCheckout,
  isOvernightSchedule,
  toLocalDateOnly,
} = require('../utils/attendanceSchedule');
const logger = require('../utils/logger');

// ─── Local helpers ────────────────────────────────────────────────────────────

function toDateStr(d) {
  if (!d) return '';
  if (d instanceof Date) return d.toISOString().split('T')[0];
  return String(d).split('T')[0];
}

function dateOnlyUtc(dateStr, { dayOffset = 0, endOfDay = false } = {}) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  return new Date(Date.UTC(
    y, m - 1, d + dayOffset,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  ));
}

function formatLocalDateTime(date, timezone) {
  if (!date) return null;
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone || 'Asia/Jakarta',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date(date));
}

function isEventInCorrectedShiftWindow(eventDate, correctedSchedule, timezone) {
  const metrics = getScheduleMetricsForEvent(new Date(eventDate), correctedSchedule, timezone);
  if (!metrics) return false;
  return metrics.minsAfterStart >= -240
    && metrics.minsAfterStart <= metrics.shiftDuration + 240
    && (metrics.distToStart <= 240 || metrics.distToEnd <= 240 || isPlausibleCheckout(metrics, 240));
}

function buildAttendancePreviewRecord(record, correctedSchedule, timezone) {
  const ciM = record.checkInTime
    ? getScheduleMetricsForEvent(new Date(record.checkInTime), correctedSchedule, timezone) : null;
  const coM = record.checkOutTime
    ? getScheduleMetricsForEvent(new Date(record.checkOutTime), correctedSchedule, timezone) : null;
  return {
    id: record.id,
    date: toDateStr(record.date),
    scheduleId: record.scheduleId || null,
    checkInLocal: formatLocalDateTime(record.checkInTime, timezone),
    checkOutLocal: formatLocalDateTime(record.checkOutTime, timezone),
    checkInNearShiftStart: Boolean(ciM && ciM.distToStart <= 240),
    checkOutNearShiftEnd: Boolean(coM && isPlausibleCheckout(coM, 240)),
  };
}

function isAttendanceAlignedToSchedule(record, schedule, timezone) {
  if (!record || !schedule) return false;
  const ciM = record.checkInTime
    ? getScheduleMetricsForEvent(new Date(record.checkInTime), schedule, timezone) : null;
  const coM = record.checkOutTime
    ? getScheduleMetricsForEvent(new Date(record.checkOutTime), schedule, timezone) : null;
  const checkInAligned = !record.checkInTime || (
    ciM && ciM.dayOffset === 0 && ciM.minsAfterStart >= -240 && ciM.distToStart <= 240
  );
  const checkOutAligned = !record.checkOutTime || (
    coM && coM.minsAfterStart >= 0 && coM.distToEnd <= 240
  );
  return checkInAligned && checkOutAligned;
}

// ─── Core analysis ────────────────────────────────────────────────────────────

/**
 * Analyze one overnight schedule for possible date misalignment.
 * Returns a fixable candidate object, or null if the schedule looks fine.
 */
function analyzeOvernightScheduleIssue(schedule, logs, attendances, siblingSchedules, timezone) {
  if (!isOvernightSchedule(schedule)) return null;

  const currentScheduleDate = toDateStr(schedule.date);
  const suggestedScheduleDate = getPreviousDateOnly(currentScheduleDate);
  const correctedSchedule = {
    id: schedule.id,
    tenantId: schedule.tenantId,
    deviceEmployeeId: schedule.deviceEmployeeId,
    date: suggestedScheduleDate,
    shiftStart: schedule.shiftStart,
    shiftEnd: schedule.shiftEnd,
    isOff: schedule.isOff,
  };

  const sameSlotConflict = siblingSchedules.find((item) =>
    item.id !== schedule.id
    && item.deviceEmployeeId === schedule.deviceEmployeeId
    && toDateStr(item.date) === suggestedScheduleDate
    && item.shiftStart === schedule.shiftStart
    && item.shiftEnd === schedule.shiftEnd
    && Boolean(item.isOff) === Boolean(schedule.isOff)
  ) || null;

  if (sameSlotConflict) return null;

  const analyzedLogs = logs
    .map((log) => ({
      log,
      metrics: getScheduleMetricsForEvent(new Date(log.eventTime), correctedSchedule, timezone),
    }))
    .filter(({ metrics }) =>
      metrics
      && metrics.minsAfterStart >= -240
      && metrics.minsAfterStart <= metrics.shiftDuration + 240
    );

  const startCandidates = analyzedLogs
    .filter(({ metrics }) => metrics.dayOffset === 0 && metrics.distToStart <= 240)
    .sort((a, b) => {
      if (a.metrics.distToStart !== b.metrics.distToStart) return a.metrics.distToStart - b.metrics.distToStart;
      return new Date(a.log.eventTime) - new Date(b.log.eventTime);
    });

  const endCandidates = analyzedLogs
    .filter(({ metrics }) => isPlausibleCheckout(metrics, 240))
    .sort((a, b) => {
      if (a.metrics.distToEnd !== b.metrics.distToEnd) return a.metrics.distToEnd - b.metrics.distToEnd;
      return new Date(a.log.eventTime) - new Date(b.log.eventTime);
    });

  const currentScheduleAttendances = attendances.filter((record) =>
    record.scheduleId === schedule.id || toDateStr(record.date) === currentScheduleDate
  );

  const hasAlignedCurrentAttendance = currentScheduleAttendances.some((record) =>
    isAttendanceAlignedToSchedule(record, schedule, timezone)
  );

  if (hasAlignedCurrentAttendance) return null;

  const relatedAttendances = currentScheduleAttendances
    .filter((record) => {
      if (record.scheduleId === schedule.id) return true;
      if (!record.scheduleId && record.checkInTime && isEventInCorrectedShiftWindow(record.checkInTime, correctedSchedule, timezone)) return true;
      if (!record.scheduleId && record.checkOutTime && isEventInCorrectedShiftWindow(record.checkOutTime, correctedSchedule, timezone)) return true;
      return false;
    })
    .sort((a, b) => new Date(a.createdAt || a.checkInTime || a.checkOutTime) - new Date(b.createdAt || b.checkInTime || b.checkOutTime));

  const startCandidate = startCandidates[0] || null;
  const endCandidate = endCandidates[0] || null;
  const hasSignals = Boolean(startCandidate && endCandidate);

  if (!hasSignals) return null;

  const reasons = [];
  if (startCandidate) reasons.push('tap mulai shift terdeteksi di malam tanggal sebelumnya');
  if (endCandidate) reasons.push('tap checkout terdeteksi di pagi hari schedule sekarang');
  if (relatedAttendances.length > 0) reasons.push('attendance terkait terpecah atau belum terikat ke schedule malam');

  return {
    issueKey: `overnight:${schedule.id}`,
    scheduleId: schedule.id,
    employeeId: schedule.deviceEmployeeId,
    employeeNo: schedule.deviceEmployee?.employeeNo || null,
    employeeName: schedule.deviceEmployee?.name || null,
    currentScheduleDate,
    suggestedScheduleDate,
    shiftStart: schedule.shiftStart,
    shiftEnd: schedule.shiftEnd,
    startLogId: startCandidate?.log?.id || null,
    endLogId: endCandidate?.log?.id || null,
    detectedStartTapLocal: startCandidate ? formatLocalDateTime(startCandidate.log.eventTime, timezone) : null,
    detectedEndTapLocal: endCandidate ? formatLocalDateTime(endCandidate.log.eventTime, timezone) : null,
    relatedAttendanceCount: relatedAttendances.length,
    relatedAttendances: relatedAttendances.map((record) => buildAttendancePreviewRecord(record, correctedSchedule, timezone)),
    canFix: Boolean(startCandidate && endCandidate),
    reason: reasons.join('; '),
  };
}

// ─── DB queries ───────────────────────────────────────────────────────────────

/**
 * Collect all overnight schedule misalignment candidates for a given scope.
 * Returns { candidates, summary }.
 */
async function collectOvernightShiftIssues({
  tenantId,
  isSuperAdmin = false,
  tenantTimezone,
  startDate,
  endDate,
  resolvedEmployeeId = null,
}) {
  const scheduleWhere = {
    isOff: false,
    shiftStart: { [Op.ne]: null },
    shiftEnd: { [Op.ne]: null },
  };
  if (!isSuperAdmin) scheduleWhere.tenantId = tenantId;
  if (startDate || endDate) {
    scheduleWhere.date = {};
    if (startDate) scheduleWhere.date[Op.gte] = startDate;
    if (endDate) scheduleWhere.date[Op.lte] = endDate;
  }
  if (resolvedEmployeeId) scheduleWhere.deviceEmployeeId = resolvedEmployeeId;

  const baseSchedules = await EmployeeSchedule.findAll({
    where: scheduleWhere,
    include: [{ model: DeviceEmployee, as: 'deviceEmployee', attributes: ['id', 'employeeNo', 'name'] }],
    order: [['date', 'ASC'], ['shiftStart', 'ASC']],
  });

  const overnightSchedules = baseSchedules.filter((s) => isOvernightSchedule(s));

  if (overnightSchedules.length === 0) {
    return {
      candidates: [],
      summary: { scannedSchedules: baseSchedules.length, overnightSchedules: 0, fixable: 0, blocked: 0 },
    };
  }

  const employeeIds = [...new Set(overnightSchedules.map((s) => s.deviceEmployeeId))];
  const scheduleDates = overnightSchedules.map((s) => toDateStr(s.date)).sort();
  const broadStartDate = getPreviousDateOnly(scheduleDates[0]);
  const broadEndDate = scheduleDates[scheduleDates.length - 1];

  const [siblingSchedules, attendances, logs] = await Promise.all([
    EmployeeSchedule.findAll({
      where: {
        ...(isSuperAdmin ? {} : { tenantId }),
        deviceEmployeeId: { [Op.in]: employeeIds },
        date: { [Op.gte]: broadStartDate, [Op.lte]: broadEndDate },
        isOff: false,
      },
      include: [{ model: DeviceEmployee, as: 'deviceEmployee', attributes: ['id', 'employeeNo', 'name'] }],
    }),
    StaffAttendance.findAll({
      where: {
        ...(isSuperAdmin ? {} : { tenantId }),
        deviceEmployeeId: { [Op.in]: employeeIds },
        date: { [Op.gte]: broadStartDate, [Op.lte]: broadEndDate },
      },
      order: [['date', 'ASC'], ['createdAt', 'ASC']],
    }),
    DeviceAttendanceLog.findAll({
      where: {
        ...(isSuperAdmin ? {} : { tenantId }),
        matchedDeviceEmployeeId: { [Op.in]: employeeIds },
        eventTime: {
          [Op.gte]: dateOnlyUtc(broadStartDate, { dayOffset: -1 }),
          [Op.lte]: dateOnlyUtc(broadEndDate, { dayOffset: 1, endOfDay: true }),
        },
      },
      order: [['eventTime', 'ASC']],
    }),
  ]);

  const logsByEmployee = new Map();
  for (const log of logs) {
    const list = logsByEmployee.get(log.matchedDeviceEmployeeId) || [];
    list.push(log);
    logsByEmployee.set(log.matchedDeviceEmployeeId, list);
  }

  const attendancesByEmployee = new Map();
  for (const att of attendances) {
    const list = attendancesByEmployee.get(att.deviceEmployeeId) || [];
    list.push(att);
    attendancesByEmployee.set(att.deviceEmployeeId, list);
  }

  const siblingsByEmployee = new Map();
  for (const s of siblingSchedules) {
    const list = siblingsByEmployee.get(s.deviceEmployeeId) || [];
    list.push(s);
    siblingsByEmployee.set(s.deviceEmployeeId, list);
  }

  const candidates = overnightSchedules
    .map((schedule) => analyzeOvernightScheduleIssue(
      schedule,
      logsByEmployee.get(schedule.deviceEmployeeId) || [],
      attendancesByEmployee.get(schedule.deviceEmployeeId) || [],
      siblingsByEmployee.get(schedule.deviceEmployeeId) || [],
      tenantTimezone,
    ))
    .filter(Boolean);

  return {
    candidates,
    summary: {
      scannedSchedules: baseSchedules.length,
      overnightSchedules: overnightSchedules.length,
      fixable: candidates.filter((c) => c.canFix).length,
      blocked: candidates.filter((c) => !c.canFix).length,
    },
  };
}

// ─── Apply fixes ──────────────────────────────────────────────────────────────

/**
 * Apply fixable overnight candidates (move schedule date -1 day, rebuild attendance).
 * Returns { applied, skipped }.
 */
async function applyOvernightFixes(candidates, tenantTimezone) {
  const fixableCandidates = candidates.filter((c) => c.canFix);
  const applied = [];
  const skipped = [];

  await sequelize.transaction(async (transaction) => {
    for (const candidate of fixableCandidates) {
      const schedule = await EmployeeSchedule.findByPk(candidate.scheduleId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!schedule) {
        skipped.push({ scheduleId: candidate.scheduleId, employeeNo: candidate.employeeNo, reason: 'schedule tidak ditemukan' });
        continue;
      }

      const deviceEmployee = await DeviceEmployee.findByPk(schedule.deviceEmployeeId, {
        attributes: ['id', 'employeeNo', 'name', 'userId', 'deviceId', 'tenantId'],
        transaction,
      });

      const currentScheduleDate = toDateStr(schedule.date);
      const suggestedScheduleDate = getPreviousDateOnly(currentScheduleDate);

      const sameSlotConflict = await EmployeeSchedule.findOne({
        where: {
          id: { [Op.ne]: schedule.id },
          tenantId: schedule.tenantId,
          deviceEmployeeId: schedule.deviceEmployeeId,
          date: suggestedScheduleDate,
          shiftStart: schedule.shiftStart,
          shiftEnd: schedule.shiftEnd,
          isOff: false,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (sameSlotConflict) {
        skipped.push({ scheduleId: schedule.id, employeeNo: deviceEmployee?.employeeNo || null, reason: 'slot shift yang sama sudah ada di tanggal sebelumnya' });
        continue;
      }

      const freshLogs = await DeviceAttendanceLog.findAll({
        where: {
          tenantId: schedule.tenantId,
          matchedDeviceEmployeeId: schedule.deviceEmployeeId,
          eventTime: {
            [Op.gte]: dateOnlyUtc(suggestedScheduleDate, { dayOffset: -1 }),
            [Op.lte]: dateOnlyUtc(currentScheduleDate, { dayOffset: 1, endOfDay: true }),
          },
        },
        order: [['eventTime', 'ASC']],
        transaction,
      });

      const freshAttendances = await StaffAttendance.findAll({
        where: {
          tenantId: schedule.tenantId,
          deviceEmployeeId: schedule.deviceEmployeeId,
          date: { [Op.gte]: suggestedScheduleDate, [Op.lte]: currentScheduleDate },
        },
        order: [['date', 'ASC'], ['createdAt', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      const freshSiblingSchedules = await EmployeeSchedule.findAll({
        where: {
          tenantId: schedule.tenantId,
          deviceEmployeeId: schedule.deviceEmployeeId,
          date: { [Op.gte]: suggestedScheduleDate, [Op.lte]: currentScheduleDate },
          isOff: false,
        },
        include: [{ model: DeviceEmployee, as: 'deviceEmployee', attributes: ['id', 'employeeNo', 'name'] }],
        transaction,
      });

      const analysis = analyzeOvernightScheduleIssue(
        schedule,
        freshLogs,
        freshAttendances,
        freshSiblingSchedules,
        tenantTimezone,
      );

      if (!analysis?.canFix || !analysis.startLogId || !analysis.endLogId) {
        skipped.push({ scheduleId: schedule.id, employeeNo: deviceEmployee?.employeeNo || null, reason: analysis?.reason || 'sinyal log tidak cukup untuk rebuild shift malam' });
        continue;
      }

      const startLog = freshLogs.find((log) => log.id === analysis.startLogId);
      const endLog = freshLogs.find((log) => log.id === analysis.endLogId);

      if (!startLog || !endLog) {
        skipped.push({ scheduleId: schedule.id, employeeNo: deviceEmployee?.employeeNo || null, reason: 'raw log untuk rebuild tidak ditemukan' });
        continue;
      }

      await schedule.update({ date: suggestedScheduleDate }, { transaction });

      const relatedAttendanceIds = analysis.relatedAttendances.map((r) => r.id);
      if (relatedAttendanceIds.length > 0) {
        await StaffAttendance.destroy({ where: { id: { [Op.in]: relatedAttendanceIds } }, transaction });
      }

      const replayLogs = [startLog, endLog]
        .sort((a, b) => new Date(a.eventTime) - new Date(b.eventTime));

      for (const log of replayLogs) {
        await HikvisionEventProcessor.upsertStaffAttendance(
          { id: log.deviceId, tenantId: log.tenantId },
          deviceEmployee,
          { eventTime: log.eventTime, verifyMode: log.verifyMode, cardNo: log.cardNo },
          log.id,
          transaction,
          tenantTimezone,
        );
      }

      const rebuiltAttendance = await StaffAttendance.findOne({
        where: {
          tenantId: schedule.tenantId,
          deviceEmployeeId: schedule.deviceEmployeeId,
          scheduleId: schedule.id,
          date: suggestedScheduleDate,
        },
        order: [['createdAt', 'DESC']],
        transaction,
      });

      applied.push({
        scheduleId: schedule.id,
        employeeId: schedule.deviceEmployeeId,
        employeeNo: deviceEmployee?.employeeNo || null,
        employeeName: deviceEmployee?.name || null,
        fromDate: currentScheduleDate,
        toDate: suggestedScheduleDate,
        shiftStart: schedule.shiftStart,
        shiftEnd: schedule.shiftEnd,
        rebuiltAttendanceId: rebuiltAttendance?.id || null,
        checkInLocal: rebuiltAttendance?.checkInTime ? formatLocalDateTime(rebuiltAttendance.checkInTime, tenantTimezone) : null,
        checkOutLocal: rebuiltAttendance?.checkOutTime ? formatLocalDateTime(rebuiltAttendance.checkOutTime, tenantTimezone) : null,
      });
    }
  });

  return { applied, skipped };
}

// ─── High-level orchestrator ──────────────────────────────────────────────────

/**
 * Run overnight detection + fix for a single tenant.
 *
 * @param {Object} opts
 * @param {string}  opts.tenantId
 * @param {string}  opts.tenantTimezone
 * @param {string}  [opts.startDate]   - filter schedule.date from
 * @param {string}  [opts.endDate]     - filter schedule.date to
 * @param {string}  [opts.resolvedEmployeeId] - pre-resolved DeviceEmployee UUID (optional)
 * @param {boolean} [opts.dryRun=false]
 * @returns {{ summary, candidates, applied, skipped }}
 */
async function runOvernightFixForTenant({
  tenantId,
  tenantTimezone,
  startDate,
  endDate,
  resolvedEmployeeId = null,
  dryRun = false,
}) {
  const auditResult = await collectOvernightShiftIssues({
    tenantId,
    isSuperAdmin: false,
    tenantTimezone,
    startDate,
    endDate,
    resolvedEmployeeId,
  });

  if (dryRun || auditResult.candidates.filter((c) => c.canFix).length === 0) {
    return {
      summary: auditResult.summary,
      candidates: auditResult.candidates,
      applied: [],
      skipped: [],
    };
  }

  const { applied, skipped } = await applyOvernightFixes(auditResult.candidates, tenantTimezone);

  return {
    summary: { ...auditResult.summary, applied: applied.length, skipped: skipped.length },
    candidates: auditResult.candidates,
    applied,
    skipped,
  };
}

/**
 * Run overnight fix for ALL active tenants.
 * Called by the daily cron job.
 *
 * @param {Object} opts
 * @param {string} [opts.startDate]  - defaults to 14 days ago
 * @param {string} [opts.endDate]    - defaults to today
 * @returns {{ tenantsProcessed, totalDetected, totalApplied, totalSkipped, results }}
 */
async function runOvernightFixForAllTenants({ startDate, endDate } = {}) {
  const tenants = await Tenant.findAll({
    where: { isActive: true },
    attributes: ['id', 'name', 'settings'],
  });

  const results = [];
  let totalDetected = 0;
  let totalApplied = 0;
  let totalSkipped = 0;

  for (const tenant of tenants) {
    const timezone = tenant?.settings?.timezone || process.env.TZ || 'Asia/Jakarta';
    const todayLocal = toLocalDateOnly(new Date(), timezone);

    // Default: scan last 14 days to catch multi-day overnight backlogs
    const effectiveEnd = endDate || todayLocal;
    let effectiveStart = startDate;
    if (!effectiveStart) {
      const [y, m, d] = effectiveEnd.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d - 14));
      effectiveStart = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
    }

    try {
      const result = await runOvernightFixForTenant({
        tenantId: tenant.id,
        tenantTimezone: timezone,
        startDate: effectiveStart,
        endDate: effectiveEnd,
        dryRun: false,
      });

      totalDetected += result.candidates.length;
      totalApplied += result.applied.length;
      totalSkipped += result.skipped.length;

      results.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        detected: result.candidates.length,
        fixable: result.summary.fixable,
        applied: result.applied.length,
        skipped: result.skipped.length,
      });

      if (result.applied.length > 0) {
        logger.info('[overnightFixService] applied fixes', {
          tenantId: tenant.id,
          tenantName: tenant.name,
          applied: result.applied.length,
          details: result.applied.map((a) => `${a.employeeNo} ${a.fromDate}→${a.toDate}`),
        });
      }
    } catch (err) {
      logger.error('[overnightFixService] tenant failed', {
        tenantId: tenant.id,
        tenantName: tenant.name,
        error: err.message,
      });
      results.push({ tenantId: tenant.id, tenantName: tenant.name, error: err.message });
    }
  }

  return { tenantsProcessed: tenants.length, totalDetected, totalApplied, totalSkipped, results };
}

module.exports = {
  analyzeOvernightScheduleIssue,
  collectOvernightShiftIssues,
  applyOvernightFixes,
  runOvernightFixForTenant,
  runOvernightFixForAllTenants,
  formatLocalDateTime,
  toDateStr,
};
