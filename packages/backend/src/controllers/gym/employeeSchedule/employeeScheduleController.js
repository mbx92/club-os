'use strict';

/**
 * Employee Schedule Controller
 *
 * Direct schedule listing/management per employee per date.
 * Schedules now belong to a SchedulePeriod (periodId).
 * Legacy endpoints still work for backward compatibility.
 */

const { Op } = require('sequelize');
const { EmployeeSchedule, EmployeeScheduleTemplate, SchedulePeriod, Shift, User, DeviceEmployee, sequelize } = require('../../../models');
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

/**
 * @route   GET /gym/employee-schedules
 * @desc    List employee schedules with filters
 * @query   userId, employeeId, startDate, endDate, periodId, isOff, page, limit
 */
async function listSchedules(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { userId, employeeId, startDate, endDate, periodId, isOff, page = 1, limit = 100 } = req.query;

    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;

    // Resolve employeeId (employeeNo) → deviceEmployeeId if provided
    if (employeeId) {
      const effectiveTenantId = isSuperAdmin ? req.query.tenantId || tenantId : tenantId;
      const empMap = await resolveEmployeeIds([employeeId], effectiveTenantId);
      const resolved = empMap.get(String(employeeId));
      where.deviceEmployeeId = resolved.deviceEmployeeId;
    } else if (userId) {
      where.userId = userId;
    }

    if (periodId) where.periodId = periodId;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Op.gte] = startDate;
      if (endDate) where.date[Op.lte] = endDate;
    }

    if (isOff !== undefined) where.isOff = isOff === 'true';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await EmployeeSchedule.findAndCountAll({
      where,
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
        {
          model: SchedulePeriod,
          as: 'period',
          attributes: ['id', 'name', 'startDate', 'endDate', 'status'],
        },
      ],
      order: [['date', 'ASC'], ['userId', 'ASC']],
      limit: parseInt(limit),
      offset,
    });

    return res.json({
      success: true,
      data: rows,
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
 * @route   POST /gym/employee-schedules
 * @desc    Create schedule(s) for employee(s)
 * @body    Single: { periodId, userId|employeeId, date, shiftStart, shiftEnd, isOff, notes }
 *          Bulk:   { periodId, schedules: [{ userId|employeeId, date, shiftStart, shiftEnd, isOff, notes }] }
 *          employeeId = DeviceEmployee.employeeNo (frontend sends this instead of userId)
 */
async function createSchedule(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const effectiveTenantId = isSuperAdmin ? req.body.tenantId || tenantId : tenantId;
    const { periodId } = req.body;

    // Support both single and bulk creation
    const items = req.body.schedules || [req.body];

    if (!Array.isArray(items) || items.length === 0) {
      throw createError('VALIDATION_ERROR', 'At least one schedule entry is required');
    }

    // Validate period if provided
    if (periodId) {
      const period = await SchedulePeriod.findOne({
        where: { id: periodId, tenantId: effectiveTenantId },
      });
      if (!period) {
        throw createError('NOT_FOUND', 'Schedule period not found');
      }
    }

    // Resolve employeeId → userId for items that use employeeId
    const employeeIds = items.filter(i => i.employeeId && !i.userId).map(i => i.employeeId);
    const employeeMap = await resolveEmployeeIds(employeeIds, effectiveTenantId);

    // Validate all entries
    for (const item of items) {
      const resolved = getEffectiveEmployee(item, employeeMap);
      if (!resolved || !item.date) {
        throw createError('VALIDATION_ERROR', 'userId or employeeId, and date are required for each schedule entry');
      }
      // If shiftId provided, shiftStart/shiftEnd are optional (resolved from master)
      if (!item.shiftId && !item.isOff && (!item.shiftStart || !item.shiftEnd)) {
        throw createError('VALIDATION_ERROR', `shiftStart/shiftEnd or shiftId are required when isOff is false (date: ${item.date})`);
      }
    }

    // Pre-load shifts if any item uses shiftId
    const shiftIds = [...new Set(items.filter(i => i.shiftId).map(i => i.shiftId))];
    const shiftMap = {};
    if (shiftIds.length > 0) {
      const shifts = await Shift.findAll({ where: { id: { [Op.in]: shiftIds }, tenantId: effectiveTenantId } });
      for (const s of shifts) { shiftMap[s.id] = s; }
    }

    const result = await sequelize.transaction(async (t) => {
      const created = [];

      for (const item of items) {
        let shiftStart = item.shiftStart;
        let shiftEnd = item.shiftEnd;
        let shiftId = item.shiftId || null;
        const resolved = getEffectiveEmployee(item, employeeMap);

        // Resolve from master shift if shiftId given
        if (shiftId) {
          const shift = shiftMap[shiftId];
          if (!shift) throw createError('NOT_FOUND', `Shift with id "${shiftId}" not found for this tenant`);
          shiftStart = shiftStart || shift.shiftStart;
          shiftEnd = shiftEnd || shift.shiftEnd;
        }

        const [record] = await EmployeeSchedule.upsert(
          {
            tenantId: effectiveTenantId,
            periodId: periodId || null,
            deviceEmployeeId: resolved.deviceEmployeeId,
            userId: resolved.userId || null,
            date: item.date,
            shiftId,
            shiftStart: item.isOff ? null : shiftStart,
            shiftEnd: item.isOff ? null : shiftEnd,
            isOff: item.isOff || false,
            notes: item.notes || null,
          },
          {
            conflictFields: ['tenantId', 'periodId', 'deviceEmployeeId', 'date'],
            transaction: t,
          }
        );
        created.push(record);
      }

      return created;
    });

    logger.info(`Employee schedules created/updated: ${result.length} entries`, {
      tenantId: effectiveTenantId,
      count: result.length,
    });

    return res.status(201).json({
      success: true,
      message: `${result.length} schedule(s) saved`,
      data: result,
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return next(createError('VALIDATION_ERROR', 'Duplicate schedule entry detected'));
    }
    return next(err);
  }
}

/**
 * @route   PUT /gym/employee-schedules/:id
 * @desc    Update a schedule entry
 */
async function updateSchedule(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const schedule = await EmployeeSchedule.findOne({ where });
    if (!schedule) {
      throw createError('NOT_FOUND', 'Schedule not found');
    }

    const { date, shiftStart, shiftEnd, isOff, notes } = req.body;

    const effectiveIsOff = isOff !== undefined ? isOff : schedule.isOff;
    if (!effectiveIsOff) {
      const effectiveStart = shiftStart !== undefined ? shiftStart : schedule.shiftStart;
      const effectiveEnd = shiftEnd !== undefined ? shiftEnd : schedule.shiftEnd;
      if (!effectiveStart || !effectiveEnd) {
        throw createError('VALIDATION_ERROR', 'shiftStart and shiftEnd are required when isOff is false');
      }
    }

    await schedule.update({
      ...(date !== undefined && { date }),
      ...(shiftStart !== undefined && { shiftStart: effectiveIsOff ? null : shiftStart }),
      ...(shiftEnd !== undefined && { shiftEnd: effectiveIsOff ? null : shiftEnd }),
      ...(isOff !== undefined && { isOff }),
      ...(notes !== undefined && { notes }),
    });

    return res.json({
      success: true,
      data: schedule,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   DELETE /gym/employee-schedules/:id
 * @desc    Delete a schedule entry
 */
async function deleteSchedule(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const schedule = await EmployeeSchedule.findOne({ where });
    if (!schedule) {
      throw createError('NOT_FOUND', 'Schedule not found');
    }

    await schedule.destroy();

    return res.json({
      success: true,
      message: 'Schedule deleted',
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   DELETE /gym/employee-schedules/user/:userId
 * @route   DELETE /gym/employee-schedules/employee/:employeeId
 * @desc    Delete all schedules for a specific employee (optionally by date range)
 * @query   startDate, endDate
 */
async function deleteUserSchedules(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { userId, employeeId } = req.params;
    const { startDate, endDate } = req.query;
    const effectiveTenantId = isSuperAdmin ? req.query.tenantId || tenantId : tenantId;

    let resolvedDeviceEmployeeId;
    // Resolve employeeId (employeeNo) to deviceEmployeeId if provided
    if (employeeId && !userId) {
      const empMap = await resolveEmployeeIds([employeeId], effectiveTenantId);
      const resolved = empMap.get(String(employeeId));
      resolvedDeviceEmployeeId = resolved.deviceEmployeeId;
    }

    const where = {};
    if (resolvedDeviceEmployeeId) {
      where.deviceEmployeeId = resolvedDeviceEmployeeId;
    } else if (userId) {
      where.userId = userId;
    }
    if (!isSuperAdmin) where.tenantId = tenantId;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Op.gte] = startDate;
      if (endDate) where.date[Op.lte] = endDate;
    }

    const deleted = await EmployeeSchedule.destroy({ where });

    return res.json({
      success: true,
      message: `${deleted} schedule(s) deleted for ${employeeId ? 'employee ' + employeeId : 'user ' + userId}`,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   POST /gym/employee-schedules/generate-from-templates
 * @desc    Generate concrete date-based schedules from weekly templates.
 *          Expands each template (dayOfWeek) into EmployeeSchedule rows
 *          for every matching date in the given range.
 * @body    { startDate, endDate, userId?, periodId? }  — userId omit = all staff in tenant
 * @access  Private (admin/manager)
 */
async function generateFromTemplates(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const effectiveTenantId = isSuperAdmin ? req.body.tenantId || tenantId : tenantId;
    const { startDate, endDate, userId, employeeId, periodId } = req.body;

    if (!startDate || !endDate) {
      throw createError('VALIDATION_ERROR', 'startDate and endDate are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start) || isNaN(end) || start > end) {
      throw createError('VALIDATION_ERROR', 'Invalid date range');
    }

    // Max 90 days per request to prevent abuse
    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 90) {
      throw createError('VALIDATION_ERROR', 'Date range cannot exceed 90 days');
    }

    // Resolve employeeId → deviceEmployeeId if provided
    let resolvedDeviceEmployeeId;
    let resolvedUserId;
    if (employeeId && !userId) {
      const empMap = await resolveEmployeeIds([employeeId], effectiveTenantId);
      const resolved = empMap.get(String(employeeId));
      resolvedDeviceEmployeeId = resolved.deviceEmployeeId;
      resolvedUserId = resolved.userId;
    }

    // Load templates
    const templateWhere = { tenantId: effectiveTenantId };
    if (resolvedDeviceEmployeeId) {
      templateWhere.deviceEmployeeId = resolvedDeviceEmployeeId;
    } else if (userId) {
      templateWhere.userId = userId;
    }

    const templates = await EmployeeScheduleTemplate.findAll({
      where: templateWhere,
    });

    if (!templates.length) {
      return res.json({
        success: true,
        message: 'No templates found. Create templates via POST /gym/employee-schedule-templates first.',
        stats: { generated: 0, skipped: 0, days: diffDays },
      });
    }

    // Build lookup: deviceEmployeeId → { dayOfWeek → template }
    const lookup = {};
    for (const tpl of templates) {
      const key = tpl.deviceEmployeeId;
      if (!lookup[key]) lookup[key] = { userId: tpl.userId, templates: {} };
      lookup[key].templates[tpl.dayOfWeek] = tpl;
    }

    // Enumerate every date in the range
    const dates = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      dates.push(cursor.toISOString().split('T')[0]); // YYYY-MM-DD
      cursor.setDate(cursor.getDate() + 1);
    }

    let generated = 0;
    let skipped = 0;

    await sequelize.transaction(async (t) => {
      for (const [deId, entry] of Object.entries(lookup)) {
        for (const dateStr of dates) {
          const dow = new Date(dateStr).getDay(); // 0=Sun … 6=Sat
          const tpl = entry.templates[dow];
          if (!tpl) {
            // No template for this day of week — skip (leave unscheduled)
            skipped++;
            continue;
          }

          await EmployeeSchedule.upsert(
            {
              tenantId: effectiveTenantId,
              periodId: periodId || null,
              deviceEmployeeId: deId,
              userId: entry.userId || null,
              date: dateStr,
              shiftId: tpl.shiftId || null,
              shiftStart: tpl.isOff ? null : tpl.shiftStart,
              shiftEnd: tpl.isOff ? null : tpl.shiftEnd,
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

    logger.info('Employee schedules generated from templates', {
      tenantId: effectiveTenantId,
      startDate,
      endDate,
      generated,
      skipped,
    });

    return res.status(201).json({
      success: true,
      message: `${generated} schedule(s) generated from templates`,
      stats: {
        generated,
        skipped,
        days: diffDays,
        usersProcessed: Object.keys(lookup).length,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   POST /gym/employee-schedules/assign-shifts
 * @desc    Assign shifts to employees for a date range.
 *          Most practical input:
 *          {
 *            startDate: "2026-03-01",
 *            endDate: "2026-03-31",
 *            assignments: [
 *              { userId: "...", dates: { "2026-03-01": "shiftId-pagi", "2026-03-02": "shiftId-siang", ... } }
 *            ]
 *          }
 *          Or simplified: assign same shift to all dates:
 *          {
 *            startDate: "2026-03-01",
 *            endDate: "2026-03-31",
 *            assignments: [
 *              { userId: "...", shiftId: "shiftId-pagi", offDays: [0, 6] }
 *            ]
 *          }
 *          offDays = array of dayOfWeek (0=Sun..6=Sat) that are days off.
 * @access  Private (admin/manager)
 */
async function assignShifts(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const effectiveTenantId = isSuperAdmin ? req.body.tenantId || tenantId : tenantId;
    const { startDate, endDate, assignments, periodId } = req.body;

    if (!startDate || !endDate) {
      throw createError('VALIDATION_ERROR', 'startDate and endDate are required');
    }
    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      throw createError('VALIDATION_ERROR', 'assignments array is required');
    }

    // Resolve employeeId → userId for assignments that use employeeId
    const empIds = assignments.filter(a => a.employeeId && !a.userId).map(a => a.employeeId);
    const employeeMap = await resolveEmployeeIds(empIds, effectiveTenantId);

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start) || isNaN(end) || start > end) {
      throw createError('VALIDATION_ERROR', 'Invalid date range');
    }
    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 90) {
      throw createError('VALIDATION_ERROR', 'Date range cannot exceed 90 days');
    }

    // Enumerate dates
    const dates = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      dates.push(cursor.toISOString().split('T')[0]);
      cursor.setDate(cursor.getDate() + 1);
    }

    // Pre-load all referenced shifts
    const allShiftIds = new Set();
    for (const a of assignments) {
      if (a.shiftId) allShiftIds.add(a.shiftId);
      if (a.dates) {
        for (const sid of Object.values(a.dates)) {
          if (sid && sid !== 'OFF') allShiftIds.add(sid);
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

    let generated = 0;
    let offDaysCount = 0;

    await sequelize.transaction(async (t) => {
      for (const assignment of assignments) {
        const resolved = getEffectiveEmployee(assignment, employeeMap);
        if (!resolved) {
          throw createError('VALIDATION_ERROR', 'Each assignment must have a userId or employeeId');
        }

        // Mode 1: Per-date shift mapping { dates: { "2026-03-01": "shiftId", ... } }
        if (assignment.dates && typeof assignment.dates === 'object') {
          for (const [dateStr, value] of Object.entries(assignment.dates)) {
            const isOff = value === 'OFF' || value === null;
            let shiftId = null;
            let shiftStart = null;
            let shiftEnd = null;

            if (!isOff) {
              shiftId = value;
              const shift = shiftMap[shiftId];
              if (!shift) throw createError('NOT_FOUND', `Shift "${shiftId}" not found`);
              shiftStart = shift.shiftStart;
              shiftEnd = shift.shiftEnd;
            }

            await EmployeeSchedule.upsert(
              {
                tenantId: effectiveTenantId,
                periodId: periodId || null,
                deviceEmployeeId: resolved.deviceEmployeeId,
                userId: resolved.userId || null,
                date: dateStr,
                shiftId,
                shiftStart,
                shiftEnd,
                isOff,
                notes: null,
              },
              { conflictFields: ['tenantId', 'periodId', 'deviceEmployeeId', 'date'], transaction: t }
            );
            if (isOff) offDaysCount++;
            else generated++;
          }
        }
        // Mode 2: Same shift for all dates + offDays array
        else if (assignment.shiftId) {
          const shift = shiftMap[assignment.shiftId];
          if (!shift) throw createError('NOT_FOUND', `Shift "${assignment.shiftId}" not found`);
          const offDays = assignment.offDays || []; // e.g. [0, 6]

          for (const dateStr of dates) {
            const dow = new Date(dateStr).getDay();
            const isOff = offDays.includes(dow);

            await EmployeeSchedule.upsert(
              {
                tenantId: effectiveTenantId,
                periodId: periodId || null,
                deviceEmployeeId: resolved.deviceEmployeeId,
                userId: resolved.userId || null,
                date: dateStr,
                shiftId: isOff ? null : shift.id,
                shiftStart: isOff ? null : shift.shiftStart,
                shiftEnd: isOff ? null : shift.shiftEnd,
                isOff,
                notes: null,
              },
              { conflictFields: ['tenantId', 'periodId', 'deviceEmployeeId', 'date'], transaction: t }
            );
            if (isOff) offDaysCount++;
            else generated++;
          }
        } else {
          throw createError('VALIDATION_ERROR', 'Each assignment must have either shiftId or dates object');
        }
      }
    });

    logger.info('Employee schedules assigned via shifts', {
      tenantId: effectiveTenantId,
      startDate,
      endDate,
      generated,
      offDaysCount,
    });

    return res.status(201).json({
      success: true,
      message: `${generated} schedule(s) assigned, ${offDaysCount} day(s) off`,
      stats: { generated, offDaysCount, days: diffDays, employees: assignments.length },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   GET /gym/employee-schedules/export
 * @desc    Export employee schedules as a styled pivot-style Excel (.xlsx)
 *          Uses exceljs for full cell styling (colors, borders, bold, merges).
 * @query   startDate (required), endDate (required), userId, employeeId, periodId, isOff
 * @access  Private (admin/manager)
 */
async function exportSchedules(req, res, next) {
  try {
    const ExcelJS = require('exceljs');
    const { tenantId, isSuperAdmin } = req.user;
    const { userId, employeeId, startDate, endDate, periodId, isOff } = req.query;

    if (!startDate || !endDate) {
      throw createError('VALIDATION_ERROR', 'startDate and endDate are required for export');
    }

    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;

    if (employeeId) {
      const effectiveTenantId = isSuperAdmin ? req.query.tenantId || tenantId : tenantId;
      const empMap = await resolveEmployeeIds([employeeId], effectiveTenantId);
      const resolved = empMap.get(String(employeeId));
      where.deviceEmployeeId = resolved.deviceEmployeeId;
    } else if (userId) {
      where.userId = userId;
    }

    if (periodId) where.periodId = periodId;

    where.date = {};
    if (startDate) where.date[Op.gte] = startDate;
    if (endDate) where.date[Op.lte] = endDate;

    if (isOff !== undefined) where.isOff = isOff === 'true';

    const rows = await EmployeeSchedule.findAll({
      where,
      include: [
        { model: DeviceEmployee, as: 'deviceEmployee', attributes: ['id', 'employeeNo', 'name'] },
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Shift, as: 'shift', attributes: ['id', 'name', 'code', 'shiftStart', 'shiftEnd', 'color'] },
        { model: SchedulePeriod, as: 'period', attributes: ['id', 'name', 'startDate', 'endDate'] },
      ],
      order: [['date', 'ASC'], ['deviceEmployeeId', 'ASC']],
    });

    /* ── Build date columns ─────────────────────────────────── */
    const DAY_NAMES = ['MG', 'SN', 'SL', 'RB', 'KM', 'JM', 'SB'];
    const dates = [];
    const cursor = new Date(startDate);
    const endD = new Date(endDate);
    while (cursor <= endD) {
      const dateStr = cursor.toISOString().split('T')[0];
      const dow = cursor.getDay();
      dates.push({ date: dateStr, dayName: DAY_NAMES[dow], dayNum: cursor.getDate(), isSunday: dow === 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    /* ── Group schedules by employee + build shift color map ── */
    const employeeDataMap = new Map();
    const allShiftCodes = new Set();
    const shiftColorMap = {}; // shift code → hex color from DB

    for (const row of rows) {
      const empKey = row.deviceEmployeeId || row.userId || 'unknown';
      if (!employeeDataMap.has(empKey)) {
        const empNo = row.deviceEmployee ? row.deviceEmployee.employeeNo : '';
        const empName = row.deviceEmployee
          ? row.deviceEmployee.name
          : row.user
            ? `${row.user.firstName || ''} ${row.user.lastName || ''}`.trim()
            : '';
        employeeDataMap.set(empKey, { employeeNo: empNo, name: empName, schedules: {} });
      }
      const code = row.isOff ? 'L' : (row.shift ? row.shift.code : '');
      if (code && code !== 'L') allShiftCodes.add(code);
      // Capture shift color from the DB
      if (row.shift && row.shift.code && row.shift.color && !shiftColorMap[row.shift.code]) {
        shiftColorMap[row.shift.code] = row.shift.color;
      }
      employeeDataMap.get(empKey).schedules[row.date] = code;
    }

    /* ── Determine TOTAL sub-columns ────────────────────────── */
    const KNOWN_CODES = ['P', 'S', 'P1', 'S1', 'M1', 'CT'];
    const totalCodes = [];
    for (const c of KNOWN_CODES) {
      if (allShiftCodes.has(c)) totalCodes.push(c);
    }
    for (const c of allShiftCodes) {
      if (!totalCodes.includes(c)) totalCodes.push(c);
    }
    totalCodes.push('L', 'HK');

    /* ── Period label ───────────────────────────────────────── */
    const MONTHS_ID = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    let periodLabel = '';
    if (rows.length > 0 && rows[0].period) periodLabel = rows[0].period.name;
    if (!periodLabel) {
      const sM = parseInt(startDate.split('-')[1]);
      const eM = parseInt(endDate.split('-')[1]);
      const sY = startDate.split('-')[0];
      const eY = endDate.split('-')[0];
      periodLabel = sM === eM && sY === eY
        ? `${MONTHS_ID[sM]} ${sY}`
        : `${MONTHS_ID[sM]}${sY !== eY ? ' ' + sY : ''} - ${MONTHS_ID[eM]} ${eY}`;
    }

    /* ── Style constants ────────────────────────────────────── */
    const thinBorder = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
    const boldFont = { bold: true, size: 10, name: 'Calibri' };
    const normalFont = { size: 10, name: 'Calibri' };
    const centerAlign = { horizontal: 'center', vertical: 'middle', wrapText: true };
    const leftAlign = { vertical: 'middle', wrapText: true };

    // Shift code → cell fill color map
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };   // light blue
    const totalHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }; // light blue
    const summaryFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };  // light gray
    const redFont = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FFFF0000' } };

    // Convert hex color (e.g. "#00CED1" or "00CED1") to exceljs fill object
    function hexToFill(hex) {
      if (!hex) return null;
      const clean = hex.replace('#', '').toUpperCase();
      return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + clean } };
    }

    /* ── Create workbook & worksheet ────────────────────────── */
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Jadwal Karyawan');

    const totalColCount = 3 + dates.length + totalCodes.length;
    const dateStartCol = 4; // column D (1-indexed)
    const totalStartCol = 4 + dates.length;

    /* ── Row 1: Period header ───────────────────────────────── */
    const periodRow = ws.getRow(1);
    periodRow.getCell(1).value = `PERIODE : ${periodLabel}`;
    periodRow.getCell(1).font = { bold: true, size: 12, name: 'Calibri' };
    ws.mergeCells(1, 1, 1, totalColCount);

    /* ── Row 2: blank ───────────────────────────────────────── */
    // (leave empty)

    /* ── Row 3: Header row 1 (NO, NAMA, NIK, day names, TOTAL) */
    const hdrRow1 = ws.getRow(3);
    hdrRow1.getCell(1).value = 'NO';
    hdrRow1.getCell(2).value = 'NAMA KARYAWAN';
    hdrRow1.getCell(3).value = 'NIK';

    // Day-name headers
    dates.forEach((d, i) => {
      const cell = hdrRow1.getCell(dateStartCol + i);
      cell.value = d.dayName;
      cell.font = d.isSunday ? redFont : boldFont;
      cell.fill = headerFill;
      cell.alignment = centerAlign;
      cell.border = thinBorder;
    });

    // TOTAL merged header
    const totalCell = hdrRow1.getCell(totalStartCol);
    totalCell.value = 'TOTAL';
    totalCell.font = boldFont;
    totalCell.fill = totalHeaderFill;
    totalCell.alignment = centerAlign;
    totalCell.border = thinBorder;
    if (totalCodes.length > 1) {
      ws.mergeCells(3, totalStartCol, 3, totalStartCol + totalCodes.length - 1);
    }

    // Style NO, NAMA, NIK header cells
    for (let c = 1; c <= 3; c++) {
      const cell = hdrRow1.getCell(c);
      cell.font = boldFont;
      cell.fill = headerFill;
      cell.alignment = centerAlign;
      cell.border = thinBorder;
    }

    /* ── Row 4: Header row 2 (date numbers + total code labels) */
    const hdrRow2 = ws.getRow(4);
    dates.forEach((d, i) => {
      const cell = hdrRow2.getCell(dateStartCol + i);
      cell.value = d.dayNum;
      cell.font = d.isSunday ? redFont : boldFont;
      cell.fill = headerFill;
      cell.alignment = centerAlign;
      cell.border = thinBorder;
    });

    totalCodes.forEach((c, i) => {
      const cell = hdrRow2.getCell(totalStartCol + i);
      cell.value = c;
      cell.font = boldFont;
      cell.fill = totalHeaderFill;
      cell.alignment = centerAlign;
      cell.border = thinBorder;
    });

    // Empty styled cells for NO, NAMA, NIK in row 4
    for (let c = 1; c <= 3; c++) {
      const cell = hdrRow2.getCell(c);
      cell.font = boldFont;
      cell.fill = headerFill;
      cell.alignment = centerAlign;
      cell.border = thinBorder;
    }

    // Merge NO, NAMA, NIK across rows 3-4
    ws.mergeCells(3, 1, 4, 1);
    ws.mergeCells(3, 2, 4, 2);
    ws.mergeCells(3, 3, 4, 3);

    /* ── Employee data rows ─────────────────────────────────── */
    const employees = Array.from(employeeDataMap.values());
    let empIdx = 1;
    let currentRow = 5;

    for (const emp of employees) {
      const row = ws.getRow(currentRow);
      const codeCounts = {};

      // NO
      row.getCell(1).value = empIdx;
      row.getCell(1).font = normalFont;
      row.getCell(1).alignment = centerAlign;
      row.getCell(1).border = thinBorder;

      // NAMA
      row.getCell(2).value = emp.name;
      row.getCell(2).font = normalFont;
      row.getCell(2).alignment = leftAlign;
      row.getCell(2).border = thinBorder;

      // NIK
      row.getCell(3).value = emp.employeeNo;
      row.getCell(3).font = normalFont;
      row.getCell(3).alignment = centerAlign;
      row.getCell(3).border = thinBorder;

      // Date cells
      dates.forEach((d, i) => {
        const code = emp.schedules[d.date] || '';
        const cell = row.getCell(dateStartCol + i);
        cell.value = code;
        cell.font = normalFont;
        cell.alignment = centerAlign;
        cell.border = thinBorder;

        if (code) codeCounts[code] = (codeCounts[code] || 0) + 1;

        // Color the cell based on shift color from DB
        if (code && code !== 'L' && shiftColorMap[code]) {
          const fill = hexToFill(shiftColorMap[code]);
          if (fill) cell.fill = fill;
        }
      });

      // TOTAL sub-columns
      totalCodes.forEach((c, i) => {
        const cell = row.getCell(totalStartCol + i);
        if (c === 'HK') {
          let hk = 0;
          for (const d of dates) {
            const sc = emp.schedules[d.date] || '';
            if (sc && sc !== 'L' && sc !== 'CT') hk++;
          }
          cell.value = hk;
        } else {
          cell.value = codeCounts[c] || 0;
        }
        cell.font = normalFont;
        cell.alignment = centerAlign;
        cell.border = thinBorder;
      });

      empIdx++;
      currentRow++;
    }

    /* ── Summary rows ───────────────────────────────────────── */
    currentRow++; // blank separator row

    const SHIFT_LABELS = {
      P: 'RSU PAGI (P)', S: 'RSU SORE (S)', P1: 'RSIA PAGI (P1)',
      S1: 'SORE 1 (S1)', M1: 'MALAM (M1)', CT: 'CUTI (CT)', L: 'LIBUR (L)',
    };

    const summaryCodes = totalCodes.filter(c => c !== 'HK');
    for (const code of summaryCodes) {
      const row = ws.getRow(currentRow);
      const label = SHIFT_LABELS[code] || code;

      row.getCell(2).value = label;
      row.getCell(2).font = boldFont;
      row.getCell(2).alignment = leftAlign;
      row.getCell(2).border = thinBorder;
      row.getCell(2).fill = summaryFill;
      row.getCell(1).border = thinBorder;
      row.getCell(1).fill = summaryFill;
      row.getCell(3).border = thinBorder;
      row.getCell(3).fill = summaryFill;

      dates.forEach((d, i) => {
        let count = 0;
        for (const emp of employees) {
          if (emp.schedules[d.date] === code) count++;
        }
        const cell = row.getCell(dateStartCol + i);
        cell.value = count || '';
        cell.font = boldFont;
        cell.alignment = centerAlign;
        cell.border = thinBorder;
        cell.fill = summaryFill;
      });

      currentRow++;
    }

    // Grand total row
    const grandRow = ws.getRow(currentRow);
    grandRow.getCell(1).border = thinBorder;
    grandRow.getCell(2).border = thinBorder;
    grandRow.getCell(3).border = thinBorder;
    dates.forEach((d, i) => {
      let count = 0;
      for (const emp of employees) {
        if (emp.schedules[d.date]) count++;
      }
      const cell = grandRow.getCell(dateStartCol + i);
      cell.value = count;
      cell.font = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FFFF0000' } };
      cell.alignment = centerAlign;
      cell.border = thinBorder;
    });

    /* ── Column widths ──────────────────────────────────────── */
    ws.getColumn(1).width = 5;      // NO
    ws.getColumn(2).width = 28;     // NAMA KARYAWAN
    ws.getColumn(3).width = 10;     // NIK
    for (let i = 0; i < dates.length; i++) {
      ws.getColumn(dateStartCol + i).width = 5;
    }
    for (let i = 0; i < totalCodes.length; i++) {
      ws.getColumn(totalStartCol + i).width = 5;
    }

    /* ── Write buffer & send ────────────────────────────────── */
    const buffer = await workbook.xlsx.writeBuffer();

    const filename = `jadwal-karyawan-${startDate}-${endDate}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    logger.info('Employee schedule exported to styled Excel (pivot)', {
      tenantId, startDate, endDate,
      employees: employees.length,
      totalSchedules: rows.length,
    });

    return res.send(buffer);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listSchedules,
  exportSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  deleteUserSchedules,
  generateFromTemplates,
  assignShifts,
};
