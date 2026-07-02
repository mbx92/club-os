'use strict';

const { Op } = require('sequelize');
const {
  sequelize,
  Tenant,
  DeviceEmployee,
  DeviceAttendanceLog,
  EmployeeSchedule,
  StaffAttendance,
} = require('../models');
const HikvisionEventProcessor = require('./hikvisionEventProcessor');
const {
  getPreviousDateOnly,
  toLocalDateOnly,
} = require('../utils/attendanceSchedule');
const logger = require('../utils/logger');

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

function shiftDateOnly(dateStr, dayOffset) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + dayOffset));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

function dateOnlyUtc(dateStr, { dayOffset = 0, endOfDay = false } = {}) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  return new Date(Date.UTC(
    y,
    m - 1,
    d + dayOffset,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  ));
}

function formatLocalDateTime(date, timezone) {
  if (!date) return null;
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone || process.env.TZ || 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(date));
}

async function resolveEmployeeIds({ tenantId, employeeQuery }) {
  const lookup = String(employeeQuery || '').trim();
  if (!lookup) return null;

  const where = { tenantId };
  if (isUuidLike(lookup)) where.id = lookup;
  else where.employeeNo = lookup;

  const employees = await DeviceEmployee.findAll({
    where,
    attributes: ['id'],
  });

  return employees.map((item) => item.id);
}

function buildIssueReasons({ schedules, attendances, attendanceByScheduleId, logs }) {
  const reasons = [];

  const hasIncompleteAttendance = attendances.some((item) => !item.checkInTime || !item.checkOutTime);
  const hasUnscheduledAttendance = attendances.some((item) => !item.scheduleId);
  const hasMissingShiftMetadata = attendances.some((item) => item.scheduleId && !attendanceByScheduleId.get(item.scheduleId));
  const hasMissingScheduleAttendance = schedules.some((item) => !attendanceByScheduleId.has(item.id));
  const hasLogsWithoutAttendance = logs.length > 0 && attendances.length === 0;

  if (hasIncompleteAttendance) reasons.push('attendance belum lengkap');
  if (hasUnscheduledAttendance) reasons.push('attendance belum terhubung ke schedule');
  if (hasMissingShiftMetadata) reasons.push('attendance terhubung ke schedule tanpa jam shift');
  if (hasMissingScheduleAttendance) reasons.push('ada schedule yang belum punya attendance');
  if (hasLogsWithoutAttendance) reasons.push('ada log tapi attendance belum terbentuk');

  return reasons;
}

async function previewTenantAttendanceRegeneration({
  tenant,
  startDate,
  endDate,
  employeeQuery = '',
  forceAll = false,
}) {
  const tenantTimezone = tenant?.settings?.timezone || process.env.TZ || 'Asia/Jakarta';
  const prevStartDate = getPreviousDateOnly(startDate);
  const nextEndDate = shiftDateOnly(endDate, 1);
  const scopedEmployeeIds = await resolveEmployeeIds({ tenantId: tenant.id, employeeQuery });

  if (scopedEmployeeIds && scopedEmployeeIds.length === 0) {
    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      timezone: tenantTimezone,
      employees: [],
      stats: {
        employeesScanned: 0,
        employeesToRepair: 0,
        logsScanned: 0,
        attendancesInWindow: 0,
      },
    };
  }

  const logWhere = {
    tenantId: tenant.id,
    matchedDeviceEmployeeId: { [Op.ne]: null },
    eventTime: {
      [Op.gte]: dateOnlyUtc(prevStartDate, { dayOffset: -1 }),
      [Op.lte]: dateOnlyUtc(nextEndDate, { endOfDay: true }),
    },
  };
  if (scopedEmployeeIds) logWhere.matchedDeviceEmployeeId = { [Op.in]: scopedEmployeeIds };

  const logs = await DeviceAttendanceLog.findAll({
    where: logWhere,
    order: [['eventTime', 'ASC']],
  });

  const filteredLogs = logs.filter((log) => {
    const localDate = toLocalDateOnly(new Date(log.eventTime), tenantTimezone);
    return localDate >= prevStartDate && localDate <= nextEndDate;
  });

  const employeeIds = [...new Set(filteredLogs.map((log) => log.matchedDeviceEmployeeId))];
  if (employeeIds.length === 0) {
    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      timezone: tenantTimezone,
      employees: [],
      stats: {
        employeesScanned: 0,
        employeesToRepair: 0,
        logsScanned: 0,
        attendancesInWindow: 0,
      },
    };
  }

  const [employees, schedules, attendances] = await Promise.all([
    DeviceEmployee.findAll({
      where: { id: { [Op.in]: employeeIds } },
      attributes: ['id', 'employeeNo', 'name', 'tenantId', 'deviceId', 'userId'],
    }),
    EmployeeSchedule.findAll({
      where: {
        tenantId: tenant.id,
        deviceEmployeeId: { [Op.in]: employeeIds },
        date: { [Op.gte]: prevStartDate, [Op.lte]: endDate },
      },
      order: [['date', 'ASC'], ['shiftStart', 'ASC']],
    }),
    StaffAttendance.findAll({
      where: {
        tenantId: tenant.id,
        deviceEmployeeId: { [Op.in]: employeeIds },
        date: { [Op.gte]: prevStartDate, [Op.lte]: endDate },
      },
      order: [['date', 'ASC'], ['createdAt', 'ASC']],
    }),
  ]);

  const logsByEmployee = new Map();
  for (const log of filteredLogs) {
    const list = logsByEmployee.get(log.matchedDeviceEmployeeId) || [];
    list.push(log);
    logsByEmployee.set(log.matchedDeviceEmployeeId, list);
  }

  const schedulesByEmployee = new Map();
  for (const schedule of schedules) {
    const list = schedulesByEmployee.get(schedule.deviceEmployeeId) || [];
    list.push(schedule);
    schedulesByEmployee.set(schedule.deviceEmployeeId, list);
  }

  const attendancesByEmployee = new Map();
  for (const attendance of attendances) {
    const list = attendancesByEmployee.get(attendance.deviceEmployeeId) || [];
    list.push(attendance);
    attendancesByEmployee.set(attendance.deviceEmployeeId, list);
  }

  const employeePreviews = [];

  for (const employee of employees) {
    const employeeLogs = logsByEmployee.get(employee.id) || [];
    const employeeSchedules = schedulesByEmployee.get(employee.id) || [];
    const employeeAttendances = attendancesByEmployee.get(employee.id) || [];
    const attendanceByScheduleId = new Map(
      employeeSchedules
        .filter((item) => item.shiftStart || item.shiftEnd)
        .map((item) => [item.id, item])
    );

    const reasons = buildIssueReasons({
      schedules: employeeSchedules.filter((item) => !item.isOff && (item.shiftStart || item.shiftEnd)),
      attendances: employeeAttendances,
      attendanceByScheduleId,
      logs: employeeLogs,
    });

    if (!forceAll && reasons.length === 0) {
      continue;
    }

    employeePreviews.push({
      employeeId: employee.id,
      employeeNo: employee.employeeNo,
      employeeName: employee.name,
      reason: reasons.length > 0 ? reasons.join('; ') : 'force regenerate',
      logCount: employeeLogs.length,
      attendanceCount: employeeAttendances.length,
      scheduleCount: employeeSchedules.length,
      logWindow: {
        first: employeeLogs[0] ? formatLocalDateTime(employeeLogs[0].eventTime, tenantTimezone) : null,
        last: employeeLogs[employeeLogs.length - 1]
          ? formatLocalDateTime(employeeLogs[employeeLogs.length - 1].eventTime, tenantTimezone)
          : null,
      },
      incompleteAttendanceCount: employeeAttendances.filter((item) => !item.checkInTime || !item.checkOutTime).length,
      missingScheduleAttendanceCount: employeeSchedules.filter((item) => !item.isOff && (item.shiftStart || item.shiftEnd))
        .filter((schedule) => !employeeAttendances.some((attendance) => attendance.scheduleId === schedule.id)).length,
    });
  }

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    timezone: tenantTimezone,
    employees: employeePreviews,
    stats: {
      employeesScanned: employees.length,
      employeesToRepair: employeePreviews.length,
      logsScanned: filteredLogs.length,
      attendancesInWindow: attendances.length,
    },
  };
}

async function regenerateAttendanceForEmployee({
  tenant,
  employee,
  startDate,
  endDate,
  logs,
  transaction,
}) {
  const tenantTimezone = tenant?.settings?.timezone || process.env.TZ || 'Asia/Jakarta';
  const prevStartDate = getPreviousDateOnly(startDate);

  const deletedCount = await StaffAttendance.destroy({
    where: {
      tenantId: tenant.id,
      deviceEmployeeId: employee.id,
      date: { [Op.gte]: prevStartDate, [Op.lte]: endDate },
    },
    transaction,
  });

  for (const log of logs) {
    await HikvisionEventProcessor.upsertStaffAttendance(
      { id: log.deviceId, tenantId: log.tenantId },
      employee,
      { eventTime: log.eventTime, verifyMode: log.verifyMode, cardNo: log.cardNo },
      log.id,
      transaction,
      tenantTimezone
    );
  }

  const rebuiltCount = await StaffAttendance.count({
    where: {
      tenantId: tenant.id,
      deviceEmployeeId: employee.id,
      date: { [Op.gte]: prevStartDate, [Op.lte]: endDate },
    },
    transaction,
  });

  return {
    employeeId: employee.id,
    employeeNo: employee.employeeNo,
    employeeName: employee.name,
    logsProcessed: logs.length,
    deletedCount,
    rebuiltCount,
  };
}

async function regenerateAttendanceFromLogs({
  tenantId = null,
  startDate,
  endDate,
  employeeQuery = '',
  forceAll = false,
  dryRun = true,
  trigger = 'manual',
}) {
  const tenants = tenantId
    ? await Tenant.findAll({ where: { id: tenantId }, attributes: ['id', 'name', 'settings', 'isActive'] })
    : await Tenant.findAll({ where: { isActive: true }, attributes: ['id', 'name', 'settings', 'isActive'] });

  const previewResults = [];
  for (const tenant of tenants) {
    previewResults.push(await previewTenantAttendanceRegeneration({
      tenant,
      startDate,
      endDate,
      employeeQuery,
      forceAll,
    }));
  }

  const previewSummary = previewResults.reduce((acc, item) => {
    acc.tenantsScanned += 1;
    acc.employeesScanned += item.stats.employeesScanned;
    acc.employeesToRepair += item.stats.employeesToRepair;
    acc.logsScanned += item.stats.logsScanned;
    acc.attendancesInWindow += item.stats.attendancesInWindow;
    return acc;
  }, {
    tenantsScanned: 0,
    employeesScanned: 0,
    employeesToRepair: 0,
    logsScanned: 0,
    attendancesInWindow: 0,
  });

  if (dryRun) {
    return {
      success: true,
      mode: 'dry_run',
      trigger,
      startDate,
      endDate,
      forceAll,
      summary: previewSummary,
      tenants: previewResults,
    };
  }

  const applied = [];
  for (const tenantPreview of previewResults) {
    if (tenantPreview.employees.length === 0) continue;

    const tenant = tenants.find((item) => item.id === tenantPreview.tenantId);
    const tenantTimezone = tenant?.settings?.timezone || process.env.TZ || 'Asia/Jakarta';
    const prevStartDate = getPreviousDateOnly(startDate);
    const nextEndDate = shiftDateOnly(endDate, 1);
    const tenantEmployeeIds = tenantPreview.employees.map((item) => item.employeeId);

    const [employees, logs] = await Promise.all([
      DeviceEmployee.findAll({
        where: { id: { [Op.in]: tenantEmployeeIds } },
        attributes: ['id', 'employeeNo', 'name', 'tenantId', 'deviceId', 'userId'],
      }),
      DeviceAttendanceLog.findAll({
        where: {
          tenantId: tenant.id,
          matchedDeviceEmployeeId: { [Op.in]: tenantEmployeeIds },
          eventTime: {
            [Op.gte]: dateOnlyUtc(prevStartDate, { dayOffset: -1 }),
            [Op.lte]: dateOnlyUtc(nextEndDate, { endOfDay: true }),
          },
        },
        order: [['eventTime', 'ASC']],
      }),
    ]);

    const employeeMap = new Map(employees.map((item) => [item.id, item]));
    const logsByEmployee = new Map();
    for (const log of logs) {
      const localDate = toLocalDateOnly(new Date(log.eventTime), tenantTimezone);
      if (localDate < prevStartDate || localDate > nextEndDate) continue;
      const list = logsByEmployee.get(log.matchedDeviceEmployeeId) || [];
      list.push(log);
      logsByEmployee.set(log.matchedDeviceEmployeeId, list);
    }

    for (const employeePreview of tenantPreview.employees) {
      const employee = employeeMap.get(employeePreview.employeeId);
      if (!employee) continue;

      const employeeLogs = logsByEmployee.get(employee.id) || [];
      if (employeeLogs.length === 0) continue;

      const result = await sequelize.transaction(async (transaction) => (
        regenerateAttendanceForEmployee({
          tenant,
          employee,
          startDate,
          endDate,
          logs: employeeLogs,
          transaction,
        })
      ));

      applied.push(result);
    }
  }

  logger.info('[attendanceRegenerationService] attendance regenerated from logs', {
    trigger,
    tenantId: tenantId || null,
    startDate,
    endDate,
    forceAll,
    employeesRebuilt: applied.length,
  });

  return {
    success: true,
    mode: 'applied',
    trigger,
    startDate,
    endDate,
    forceAll,
    summary: {
      ...previewSummary,
      employeesRebuilt: applied.length,
      logsProcessed: applied.reduce((sum, item) => sum + item.logsProcessed, 0),
      attendancesDeleted: applied.reduce((sum, item) => sum + item.deletedCount, 0),
      attendancesRebuilt: applied.reduce((sum, item) => sum + item.rebuiltCount, 0),
    },
    tenants: previewResults,
    applied,
  };
}

module.exports = {
  regenerateAttendanceFromLogs,
  previewTenantAttendanceRegeneration,
};
