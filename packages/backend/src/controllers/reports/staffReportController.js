/**
 * Staff Report Controller
 * Reports: staff attendance, daily composition from schedule
 */
const { StaffAttendance, EmployeeSchedule, Shift, User, DeviceEmployee, SchedulePeriod, sequelize } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');
const logger = require('../../utils/logger');

/**
 * GET /reports/staff/attendance
 * Staff attendance report with stats
 */
async function getStaffAttendanceReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, userId, groupBy = 'daily' } = req.query;

    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Op.gte] = startDate;
      if (endDate) where.date[Op.lte] = endDate;
    }

    const dateTruncMap = { daily: 'day', weekly: 'week', monthly: 'month' };
    const trunc = dateTruncMap[groupBy] || 'day';

    // Attendance by period
    const attendanceByPeriod = await StaffAttendance.findAll({
      where,
      attributes: [
        [fn('DATE_TRUNC', trunc, col('date')), 'period'],
        [fn('COUNT', col('id')), 'totalRecords'],
        [fn('COUNT', fn('DISTINCT', literal(`COALESCE("userId"::text, "deviceEmployeeId"::text)`))), 'uniqueStaff'],
        [fn('COUNT', literal(`CASE WHEN "status" = 'present' OR "checkInTime" IS NOT NULL THEN 1 END`)), 'presentCount'],
        [fn('COUNT', literal(`CASE WHEN "status" = 'late' THEN 1 END`)), 'lateCount'],
        [fn('COUNT', literal(`CASE WHEN "status" = 'absent' THEN 1 END`)), 'absentCount']
      ],
      group: [fn('DATE_TRUNC', trunc, col('date'))],
      order: [[fn('DATE_TRUNC', trunc, col('date')), 'ASC']],
      raw: true
    });

    // Summary totals
    const summary = await StaffAttendance.findOne({
      where,
      attributes: [
        [fn('COUNT', col('id')), 'totalRecords'],
        [fn('COUNT', fn('DISTINCT', literal(`COALESCE("userId"::text, "deviceEmployeeId"::text)`))), 'uniqueStaff'],
        [fn('COUNT', literal(`CASE WHEN "checkInTime" IS NOT NULL THEN 1 END`)), 'totalCheckIns'],
        [fn('COUNT', literal(`CASE WHEN "checkOutTime" IS NOT NULL THEN 1 END`)), 'totalCheckOuts']
      ],
      raw: true
    });

    // Per-staff summary (top-level)
    const perStaff = await StaffAttendance.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email'],
          required: false
        },
        {
          model: DeviceEmployee,
          as: 'deviceEmployee',
          attributes: ['name', 'employeeNo'],
          required: false
        }
      ],
      attributes: [
        [col('StaffAttendance.userId'), 'userId'],
        [col('StaffAttendance.deviceEmployeeId'), 'deviceEmployeeId'],
        [fn('COUNT', col('StaffAttendance.id')), 'totalDays'],
        [fn('COUNT', literal(`CASE WHEN "StaffAttendance"."checkInTime" IS NOT NULL THEN 1 END`)), 'presentDays'],
        [fn('MIN', col('StaffAttendance.checkInTime')), 'earliestCheckIn'],
        [fn('MAX', col('StaffAttendance.checkOutTime')), 'latestCheckOut']
      ],
      group: ['StaffAttendance.userId', 'StaffAttendance.deviceEmployeeId', 'user.id', 'user.firstName', 'user.lastName', 'user.email', 'deviceEmployee.id', 'deviceEmployee.name', 'deviceEmployee.employeeNo'],
      order: [[fn('COUNT', col('StaffAttendance.id')), 'DESC']],
      raw: true,
      nest: true
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalRecords: parseInt(summary?.totalRecords) || 0,
          uniqueStaff: parseInt(summary?.uniqueStaff) || 0,
          totalCheckIns: parseInt(summary?.totalCheckIns) || 0,
          totalCheckOuts: parseInt(summary?.totalCheckOuts) || 0
        },
        attendanceByPeriod,
        perStaff
      },
      filters: { startDate, endDate, userId, groupBy }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/staff/daily-composition
 * Staff composition per day based on schedule
 */
async function getDailyStaffComposition(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;
    where.date = { [Op.between]: [startDate, endDate] };

    // Get schedules with shift info
    const schedules = await EmployeeSchedule.findAll({
      where: { ...where, isOff: false },
      include: [
        {
          model: Shift,
          as: 'shift',
          attributes: ['name', 'code', 'shiftStart', 'shiftEnd', 'color']
        },
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email', 'isSuperAdmin'],
          required: false
        },
        {
          model: DeviceEmployee,
          as: 'deviceEmployee',
          attributes: ['name', 'employeeNo'],
          required: false
        }
      ],
      attributes: ['id', 'date', 'shiftId', 'userId', 'deviceEmployeeId', 'shiftStart', 'shiftEnd'],
      order: [['date', 'ASC'], ['shiftStart', 'ASC']]
    });

    // Group by date
    const byDate = {};
    for (const schedule of schedules) {
      // Skip super admin users
      if (schedule.user?.isSuperAdmin) continue;

      const dateKey = schedule.date;
      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          date: dateKey,
          totalStaff: 0,
          shifts: {},
          staff: []
        };
      }
      byDate[dateKey].totalStaff++;

      const shiftName = schedule.shift?.name || 'Unassigned';
      if (!byDate[dateKey].shifts[shiftName]) {
        byDate[dateKey].shifts[shiftName] = {
          shiftName,
          shiftCode: schedule.shift?.code,
          shiftStart: schedule.shiftStart || schedule.shift?.shiftStart,
          shiftEnd: schedule.shiftEnd || schedule.shift?.shiftEnd,
          color: schedule.shift?.color,
          count: 0
        };
      }
      byDate[dateKey].shifts[shiftName].count++;

      let staffName;
      if (schedule.user) {
        staffName = `${schedule.user.firstName} ${schedule.user.lastName}`;
      } else if (schedule.deviceEmployee?.name) {
        staffName = schedule.deviceEmployee.name;
      } else {
        staffName = `Employee #${schedule.deviceEmployeeId}`;
      }

      byDate[dateKey].staff.push({
        userId: schedule.userId,
        deviceEmployeeId: schedule.deviceEmployeeId,
        name: staffName,
        shift: shiftName,
        shiftStart: schedule.shiftStart || schedule.shift?.shiftStart,
        shiftEnd: schedule.shiftEnd || schedule.shift?.shiftEnd
      });
    }

    // Convert shifts object to array
    const composition = Object.values(byDate).map(day => ({
      ...day,
      shifts: Object.values(day.shifts)
    }));

    // Summary - avg staff per day, shift distribution
    const totalDays = composition.length;
    const totalStaffEntries = composition.reduce((sum, d) => sum + d.totalStaff, 0);
    const avgStaffPerDay = totalDays > 0 ? Math.round((totalStaffEntries / totalDays) * 100) / 100 : 0;

    // Off-day count
    const offDays = await EmployeeSchedule.count({
      where: { ...where, isOff: true }
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalDays,
          avgStaffPerDay,
          totalScheduleEntries: totalStaffEntries,
          offDayEntries: offDays
        },
        composition
      },
      filters: { startDate, endDate }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/staff/shift-summary
 * Shift distribution summary
 */
async function getShiftSummary(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate } = req.query;

    const where = { isOff: false };
    if (!isSuperAdmin) where.tenantId = tenantId;
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    }

    const shiftDist = await EmployeeSchedule.findAll({
      where,
      include: [{
        model: Shift,
        as: 'shift',
        attributes: ['name', 'code', 'shiftStart', 'shiftEnd', 'color']
      }],
      attributes: [
        'shiftId',
        [fn('COUNT', col('EmployeeSchedule.id')), 'totalAssignments'],
        [fn('COUNT', fn('DISTINCT', col('EmployeeSchedule.userId'))), 'uniqueStaff'],
        [fn('COUNT', fn('DISTINCT', col('EmployeeSchedule.date'))), 'daysUsed']
      ],
      group: ['shiftId', 'shift.id', 'shift.name', 'shift.code', 'shift.shiftStart', 'shift.shiftEnd', 'shift.color'],
      order: [[fn('COUNT', col('EmployeeSchedule.id')), 'DESC']],
      raw: true,
      nest: true
    });

    res.json({
      success: true,
      data: { shiftDistribution: shiftDist },
      filters: { startDate, endDate }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStaffAttendanceReport,
  getDailyStaffComposition,
  getShiftSummary
};
