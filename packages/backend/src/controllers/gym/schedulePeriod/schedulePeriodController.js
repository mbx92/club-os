'use strict';

/**
 * Schedule Period Controller
 *
 * Manages schedule periods — date ranges that group staff scheduling.
 * Each period has a startDate/endDate. Within a period, multiple staff
 * can be assigned to each date with their shifts.
 *
 * Routes:
 *   GET    /gym/schedule-periods              → List all periods
 *   GET    /gym/schedule-periods/:id          → Get period detail with assignments
 *   POST   /gym/schedule-periods              → Create a new period
 *   PUT    /gym/schedule-periods/:id          → Update period info
 *   DELETE /gym/schedule-periods/:id          → Delete period + all assignments
 *   POST   /gym/schedule-periods/:id/assign   → Assign staff to period dates
 *   DELETE /gym/schedule-periods/:id/assignments/:assignmentId → Remove one assignment
 *   POST   /gym/schedule-periods/:id/generate → Generate assignments from templates
 *   PUT    /gym/schedule-periods/:id/status   → Change period status
 */

const { Op } = require('sequelize');
const { SchedulePeriod, EmployeeSchedule, EmployeeScheduleTemplate, Shift, User, DeviceEmployee, sequelize } = require('../../../models');
const { createError } = require('../../../utils/errorCodes');
const logger = require('../../../utils/logger');

/**
 * Resolve employeeId (DeviceEmployee.employeeNo) to { deviceEmployeeId, userId }.
 * Accepts an array of employeeNo strings.
 * Returns a Map<employeeNo, { deviceEmployeeId, userId|null }>.
 * userId is optional — employees don't need to be system users.
 */
async function resolveEmployeeIds(employeeNos, tenantId) {
  if (!employeeNos || employeeNos.length === 0) return new Map();

  const uniqueNos = [...new Set(employeeNos.map(String))];
  const records = await DeviceEmployee.findAll({
    where: {
      employeeNo: { [Op.in]: uniqueNos },
      tenantId,
    },
    attributes: ['id', 'employeeNo', 'userId', 'name'],
  });

  const map = new Map();
  const missing = [];

  for (const no of uniqueNos) {
    const rec = records.find(r => String(r.employeeNo) === no);
    if (!rec) {
      missing.push(no);
    } else {
      map.set(no, { deviceEmployeeId: rec.id, userId: rec.userId || null });
    }
  }

  if (missing.length > 0) {
    throw createError('NOT_FOUND', `Employee(s) not found: ${missing.join(', ')}`);
  }

  return map;
}

/**
 * For a single item, resolve to { deviceEmployeeId, userId }.
 * Accepts items with userId (legacy) or employeeId (frontend).
 */
function getEffectiveEmployee(item, employeeMap) {
  if (item.employeeId) {
    const resolved = employeeMap.get(String(item.employeeId));
    if (!resolved) throw createError('NOT_FOUND', `Employee "${item.employeeId}" could not be resolved`);
    return resolved;
  }
  // Legacy: userId provided directly (no deviceEmployeeId known)
  if (item.userId) {
    return { deviceEmployeeId: null, userId: item.userId };
  }
  return null;
}

// ─── PERIOD CRUD ────────────────────────────────────────

/**
 * @route   GET /gym/schedule-periods
 * @desc    List all schedule periods with optional filters
 * @query   status, startDate, endDate, page, limit
 */
async function listPeriods(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { status, startDate, endDate, page = 1, limit = 20 } = req.query;

    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;
    if (status) where.status = status;

    if (startDate || endDate) {
      if (startDate && endDate) {
        // Periods that overlap with the given range
        where[Op.or] = [
          { startDate: { [Op.between]: [startDate, endDate] } },
          { endDate: { [Op.between]: [startDate, endDate] } },
          {
            [Op.and]: [
              { startDate: { [Op.lte]: startDate } },
              { endDate: { [Op.gte]: endDate } },
            ],
          },
        ];
      } else if (startDate) {
        where.endDate = { [Op.gte]: startDate };
      } else if (endDate) {
        where.startDate = { [Op.lte]: endDate };
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await SchedulePeriod.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
      order: [['startDate', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    // Add assignment counts for each period
    const periodsWithCounts = await Promise.all(
      rows.map(async (period) => {
        const periodData = period.toJSON();

        const [assignmentCount, staffCount] = await Promise.all([
          EmployeeSchedule.count({ where: { periodId: period.id } }),
          EmployeeSchedule.count({
            where: { periodId: period.id },
            distinct: true,
            col: 'userId',
          }),
        ]);

        return {
          ...periodData,
          assignmentCount,
          staffCount,
        };
      })
    );

    return res.json({
      success: true,
      data: periodsWithCounts,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   GET /gym/schedule-periods/:id
 * @desc    Get period detail with all staff assignments
 * @query   userId — optional filter by specific staff
 */
async function getPeriod(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { userId } = req.query;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const period = await SchedulePeriod.findOne({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
    });

    if (!period) {
      throw createError('NOT_FOUND', 'Schedule period not found');
    }

    // Load assignments
    const assignmentWhere = { periodId: id };
    if (userId) assignmentWhere.userId = userId;

    const assignments = await EmployeeSchedule.findAll({
      where: assignmentWhere,
      include: [
        {
          model: DeviceEmployee,
          as: 'deviceEmployee',
          attributes: ['id', 'employeeNo', 'name'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'deviceEmployeeNo'],
        },
        {
          model: Shift,
          as: 'shift',
          attributes: ['id', 'name', 'code', 'shiftStart', 'shiftEnd', 'color'],
        },
      ],
      order: [['date', 'ASC'], ['deviceEmployeeId', 'ASC']],
    });

    // Group assignments by date for easy frontend consumption
    const byDate = {};
    const staffSet = new Set();

    for (const a of assignments) {
      const dateStr = a.date;
      if (!byDate[dateStr]) byDate[dateStr] = [];
      byDate[dateStr].push(a);
      staffSet.add(a.deviceEmployeeId || a.userId);
    }

    return res.json({
      success: true,
      data: {
        period: period.toJSON(),
        assignments,
        byDate,
        summary: {
          totalAssignments: assignments.length,
          totalStaff: staffSet.size,
          totalDates: Object.keys(byDate).length,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   POST /gym/schedule-periods
 * @desc    Create a new schedule period
 * @body    { name, startDate, endDate, notes? }
 */
async function createPeriod(req, res, next) {
  try {
    const { tenantId, isSuperAdmin, id: currentUserId } = req.user;
    const effectiveTenantId = isSuperAdmin ? req.body.tenantId || tenantId : tenantId;
    const { name, startDate, endDate, notes } = req.body;

    if (!name || !startDate || !endDate) {
      throw createError('VALIDATION_ERROR', 'name, startDate, and endDate are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start) || isNaN(end)) {
      throw createError('VALIDATION_ERROR', 'Invalid date format');
    }
    if (start > end) {
      throw createError('VALIDATION_ERROR', 'startDate must be before or equal to endDate');
    }

    // Max 366 days per period
    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 366) {
      throw createError('VALIDATION_ERROR', 'Period cannot exceed 366 days');
    }

    const period = await SchedulePeriod.create({
      tenantId: effectiveTenantId,
      name,
      startDate,
      endDate,
      notes: notes || null,
      createdBy: currentUserId,
    });

    logger.info('Schedule period created', {
      tenantId: effectiveTenantId,
      periodId: period.id,
      name,
      startDate,
      endDate,
    });

    return res.status(201).json({
      success: true,
      message: 'Schedule period created',
      data: period,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   PUT /gym/schedule-periods/:id
 * @desc    Update period info (name, dates, notes)
 */
async function updatePeriod(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const period = await SchedulePeriod.findOne({ where });
    if (!period) {
      throw createError('NOT_FOUND', 'Schedule period not found');
    }

    const { name, startDate, endDate, notes } = req.body;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        throw createError('VALIDATION_ERROR', 'startDate must be before or equal to endDate');
      }
    }

    await period.update({
      ...(name !== undefined && { name }),
      ...(startDate !== undefined && { startDate }),
      ...(endDate !== undefined && { endDate }),
      ...(notes !== undefined && { notes }),
    });

    return res.json({
      success: true,
      message: 'Schedule period updated',
      data: period,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   DELETE /gym/schedule-periods/:id
 * @desc    Delete a period and all its assignments
 */
async function deletePeriod(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const period = await SchedulePeriod.findOne({ where });
    if (!period) {
      throw createError('NOT_FOUND', 'Schedule period not found');
    }

    // Cascade: assignments are deleted via FK onDelete CASCADE
    await period.destroy();

    logger.info('Schedule period deleted', {
      tenantId: period.tenantId,
      periodId: id,
      name: period.name,
    });

    return res.json({
      success: true,
      message: 'Schedule period and all assignments deleted',
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   PUT /gym/schedule-periods/:id/status
 * @desc    Change period status (draft → active → closed)
 * @body    { status: 'draft' | 'active' | 'closed' }
 */
async function updatePeriodStatus(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['draft', 'active', 'closed'].includes(status)) {
      throw createError('VALIDATION_ERROR', 'status must be one of: draft, active, closed');
    }

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const period = await SchedulePeriod.findOne({ where });
    if (!period) {
      throw createError('NOT_FOUND', 'Schedule period not found');
    }

    await period.update({ status });

    logger.info('Schedule period status updated', {
      tenantId: period.tenantId,
      periodId: id,
      oldStatus: period.previous('status'),
      newStatus: status,
    });

    return res.json({
      success: true,
      message: `Period status changed to "${status}"`,
      data: period,
    });
  } catch (err) {
    return next(err);
  }
}

// ─── STAFF ASSIGNMENTS ──────────────────────────────────

/**
 * @route   POST /gym/schedule-periods/:id/assign
 * @desc    Assign staff to dates within this period.
 *          Supports multiple staff per date, and multiple dates per request.
 *
 * @body    {
 *            assignments: [
 *              {
 *                userId: "uuid",
 *                dates: [
 *                  { date: "2026-02-01", shiftId: "uuid-shift" },
 *                  { date: "2026-02-02", shiftId: "uuid-shift" },
 *                  { date: "2026-02-03", isOff: true }
 *                ]
 *              },
 *              {
 *                userId: "uuid-2",
 *                shiftId: "uuid-shift",     // uniform shift for all dates
 *                offDays: [0, 6]             // Sunday, Saturday off
 *              }
 *            ]
 *          }
 *
 *   Mode 1 (per-date): Each assignment has a `dates` array with specific date+shift combos
 *   Mode 2 (uniform):  Each assignment has a `shiftId` applied to all dates in the period, with optional offDays
 *
 *   Each assignment can use `userId` (system UUID) or `employeeId` (DeviceEmployee.employeeNo).
 *   Frontend typically sends employeeId.
 */
async function assignStaff(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id: periodId } = req.params;

    const periodWhere = { id: periodId };
    if (!isSuperAdmin) periodWhere.tenantId = tenantId;

    const period = await SchedulePeriod.findOne({ where: periodWhere });
    if (!period) {
      throw createError('NOT_FOUND', 'Schedule period not found');
    }

    const effectiveTenantId = period.tenantId;
    const { assignments } = req.body;

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      throw createError('VALIDATION_ERROR', 'assignments array is required');
    }

    // Resolve employeeId → userId for assignments that use employeeId
    const empIds = assignments.filter(a => a.employeeId && !a.userId).map(a => a.employeeId);
    const employeeMap = await resolveEmployeeIds(empIds, effectiveTenantId);

    // Pre-load all referenced shifts
    const allShiftIds = new Set();
    for (const a of assignments) {
      if (a.shiftId) allShiftIds.add(a.shiftId);
      if (a.dates) {
        for (const d of a.dates) {
          if (d.shiftId) allShiftIds.add(d.shiftId);
        }
      }
    }

    const shiftMap = {};
    if (allShiftIds.size > 0) {
      const shifts = await Shift.findAll({
        where: { id: { [Op.in]: [...allShiftIds] }, tenantId: effectiveTenantId },
      });
      for (const s of shifts) { shiftMap[s.id] = s; }
    }

    // Build enumerated dates for the period (for uniform mode)
    const periodDates = [];
    const cursor = new Date(period.startDate);
    const endDate = new Date(period.endDate);
    while (cursor <= endDate) {
      periodDates.push(cursor.toISOString().split('T')[0]);
      cursor.setDate(cursor.getDate() + 1);
    }

    let created = 0;
    let offCount = 0;

    await sequelize.transaction(async (t) => {
      for (const assignment of assignments) {
        const resolved = getEffectiveEmployee(assignment, employeeMap);
        if (!resolved) {
          throw createError('VALIDATION_ERROR', 'Each assignment must have a userId or employeeId');
        }

        // Mode 1: Per-date assignments
        if (assignment.dates && Array.isArray(assignment.dates)) {
          for (const dateEntry of assignment.dates) {
            if (!dateEntry.date) {
              throw createError('VALIDATION_ERROR', 'Each date entry must have a date field');
            }

            // Validate date is within period range
            if (dateEntry.date < period.startDate || dateEntry.date > period.endDate) {
              throw createError('VALIDATION_ERROR', `Date ${dateEntry.date} is outside period range (${period.startDate} to ${period.endDate})`);
            }

            const isOff = dateEntry.isOff || false;
            let shiftId = null;
            let shiftStart = null;
            let shiftEnd = null;

            if (!isOff) {
              if (!dateEntry.shiftId) {
                throw createError('VALIDATION_ERROR', `shiftId is required for date ${dateEntry.date} when not off`);
              }
              shiftId = dateEntry.shiftId;
              const shift = shiftMap[shiftId];
              if (!shift) throw createError('NOT_FOUND', `Shift "${shiftId}" not found`);
              shiftStart = shift.shiftStart;
              shiftEnd = shift.shiftEnd;
            }

            await EmployeeSchedule.upsert(
              {
                tenantId: effectiveTenantId,
                periodId,
                deviceEmployeeId: resolved.deviceEmployeeId,
                userId: resolved.userId || null,
                date: dateEntry.date,
                shiftId,
                shiftStart,
                shiftEnd,
                isOff,
                notes: dateEntry.notes || null,
              },
              {
                conflictFields: ['tenantId', 'periodId', 'deviceEmployeeId', 'date'],
                transaction: t,
              }
            );

            if (isOff) offCount++;
            else created++;
          }
        }
        // Mode 2: Uniform shift for all dates in period
        else if (assignment.shiftId) {
          const shift = shiftMap[assignment.shiftId];
          if (!shift) throw createError('NOT_FOUND', `Shift "${assignment.shiftId}" not found`);
          const offDays = assignment.offDays || [];

          for (const dateStr of periodDates) {
            const dow = new Date(dateStr).getDay();
            const isOff = offDays.includes(dow);

            await EmployeeSchedule.upsert(
              {
                tenantId: effectiveTenantId,
                periodId,
                deviceEmployeeId: resolved.deviceEmployeeId,
                userId: resolved.userId || null,
                date: dateStr,
                shiftId: isOff ? null : shift.id,
                shiftStart: isOff ? null : shift.shiftStart,
                shiftEnd: isOff ? null : shift.shiftEnd,
                isOff,
                notes: null,
              },
              {
                conflictFields: ['tenantId', 'periodId', 'deviceEmployeeId', 'date'],
                transaction: t,
              }
            );

            if (isOff) offCount++;
            else created++;
          }
        } else {
          throw createError('VALIDATION_ERROR', 'Each assignment must have either "dates" array or "shiftId" for uniform mode');
        }
      }
    });

    logger.info('Staff assigned to schedule period', {
      tenantId: effectiveTenantId,
      periodId,
      created,
      offCount,
      employees: assignments.length,
    });

    return res.status(201).json({
      success: true,
      message: `${created} schedule(s) assigned, ${offCount} day(s) off`,
      stats: {
        created,
        offCount,
        employees: assignments.length,
        periodDays: periodDates.length,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   DELETE /gym/schedule-periods/:id/assignments/:assignmentId
 * @desc    Remove a single assignment from a period
 */
async function removeAssignment(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id: periodId, assignmentId } = req.params;

    // Verify period belongs to tenant
    const periodWhere = { id: periodId };
    if (!isSuperAdmin) periodWhere.tenantId = tenantId;
    const period = await SchedulePeriod.findOne({ where: periodWhere });
    if (!period) {
      throw createError('NOT_FOUND', 'Schedule period not found');
    }

    const assignment = await EmployeeSchedule.findOne({
      where: { id: assignmentId, periodId },
    });
    if (!assignment) {
      throw createError('NOT_FOUND', 'Assignment not found in this period');
    }

    await assignment.destroy();

    return res.json({
      success: true,
      message: 'Assignment removed',
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   DELETE /gym/schedule-periods/:id/assignments/user/:userId
 * @route   DELETE /gym/schedule-periods/:id/assignments/employee/:employeeId
 * @desc    Remove all assignments for a specific staff from this period
 * @query   startDate, endDate — optional date range filter
 */
async function removeUserAssignments(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id: periodId, userId, employeeId } = req.params;
    const { startDate, endDate } = req.query;

    const periodWhere = { id: periodId };
    if (!isSuperAdmin) periodWhere.tenantId = tenantId;
    const period = await SchedulePeriod.findOne({ where: periodWhere });
    if (!period) {
      throw createError('NOT_FOUND', 'Schedule period not found');
    }

    // Resolve employeeId (employeeNo) to deviceEmployeeId if provided
    let resolvedDeviceEmployeeId;
    if (employeeId && !userId) {
      const empMap = await resolveEmployeeIds([employeeId], period.tenantId);
      const resolved = empMap.get(String(employeeId));
      resolvedDeviceEmployeeId = resolved.deviceEmployeeId;
    }

    const where = { periodId };
    if (resolvedDeviceEmployeeId) {
      where.deviceEmployeeId = resolvedDeviceEmployeeId;
    } else if (userId) {
      where.userId = userId;
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Op.gte] = startDate;
      if (endDate) where.date[Op.lte] = endDate;
    }

    const deleted = await EmployeeSchedule.destroy({ where });

    return res.json({
      success: true,
      message: `${deleted} assignment(s) removed for ${employeeId ? 'employee ' + employeeId : 'user ' + userId}`,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   POST /gym/schedule-periods/:id/generate
 * @desc    Generate assignments from weekly templates into this period.
 *          Each staff's weekly template is expanded into concrete date-based assignments
 *          for every matching date in the period range.
 * @body    { userIds?: string[], employeeIds?: string[] }  — optional filter, omit = all staff with templates
 *          employeeIds = DeviceEmployee.employeeNo values (frontend sends these instead of userIds)
 */
async function generateFromTemplates(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id: periodId } = req.params;

    const periodWhere = { id: periodId };
    if (!isSuperAdmin) periodWhere.tenantId = tenantId;

    const period = await SchedulePeriod.findOne({ where: periodWhere });
    if (!period) {
      throw createError('NOT_FOUND', 'Schedule period not found');
    }

    const effectiveTenantId = period.tenantId;
    const { userIds, employeeIds } = req.body;

    // Resolve employeeIds (employeeNo) to deviceEmployeeIds if provided
    let resolvedDeviceEmployeeIds = [];
    let resolvedUserIds = userIds || [];
    if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
      const empMap = await resolveEmployeeIds(employeeIds, effectiveTenantId);
      resolvedDeviceEmployeeIds = employeeIds.map(eid => empMap.get(String(eid)).deviceEmployeeId);
    }

    // Load templates
    const templateWhere = { tenantId: effectiveTenantId };
    if (resolvedDeviceEmployeeIds.length > 0) {
      templateWhere.deviceEmployeeId = { [Op.in]: resolvedDeviceEmployeeIds };
    } else if (resolvedUserIds.length > 0) {
      templateWhere.userId = { [Op.in]: resolvedUserIds };
    }

    const templates = await EmployeeScheduleTemplate.findAll({
      where: templateWhere,
      include: [
        {
          model: Shift,
          as: 'shift',
          attributes: ['id', 'name', 'shiftStart', 'shiftEnd'],
        },
      ],
    });

    if (!templates.length) {
      return res.json({
        success: true,
        message: 'No templates found. Create templates via POST /gym/employee-schedule-templates first.',
        stats: { generated: 0, skipped: 0 },
      });
    }

    // Build lookup: deviceEmployeeId → { userId, templates: { dayOfWeek → template } }
    const lookup = {};
    for (const tpl of templates) {
      const key = tpl.deviceEmployeeId;
      if (!lookup[key]) lookup[key] = { userId: tpl.userId, templates: {} };
      lookup[key].templates[tpl.dayOfWeek] = tpl;
    }

    // Enumerate every date in the period
    const dates = [];
    const cursor = new Date(period.startDate);
    const endDate = new Date(period.endDate);
    while (cursor <= endDate) {
      dates.push(cursor.toISOString().split('T')[0]);
      cursor.setDate(cursor.getDate() + 1);
    }

    let generated = 0;
    let skipped = 0;

    await sequelize.transaction(async (t) => {
      for (const [deId, entry] of Object.entries(lookup)) {
        for (const dateStr of dates) {
          const dow = new Date(dateStr).getDay();
          const tpl = entry.templates[dow];
          if (!tpl) {
            skipped++;
            continue;
          }

          // Resolve shift times from template or from shift master
          let shiftStart = tpl.shiftStart;
          let shiftEnd = tpl.shiftEnd;
          if (!shiftStart && tpl.shift) {
            shiftStart = tpl.shift.shiftStart;
            shiftEnd = tpl.shift.shiftEnd;
          }

          await EmployeeSchedule.upsert(
            {
              tenantId: effectiveTenantId,
              periodId,
              deviceEmployeeId: deId,
              userId: entry.userId || null,
              date: dateStr,
              shiftId: tpl.shiftId || null,
              shiftStart: tpl.isOff ? null : shiftStart,
              shiftEnd: tpl.isOff ? null : shiftEnd,
              isOff: tpl.isOff,
              notes: tpl.notes || null,
            },
            {
              conflictFields: ['tenantId', 'periodId', 'deviceEmployeeId', 'date'],
              transaction: t,
            }
          );
          generated++;
        }
      }
    });

    logger.info('Schedule period generated from templates', {
      tenantId: effectiveTenantId,
      periodId,
      generated,
      skipped,
    });

    return res.status(201).json({
      success: true,
      message: `${generated} schedule(s) generated from templates`,
      stats: {
        generated,
        skipped,
        days: dates.length,
        usersProcessed: Object.keys(lookup).length,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listPeriods,
  getPeriod,
  createPeriod,
  updatePeriod,
  deletePeriod,
  updatePeriodStatus,
  assignStaff,
  removeAssignment,
  removeUserAssignments,
  generateFromTemplates,
};
