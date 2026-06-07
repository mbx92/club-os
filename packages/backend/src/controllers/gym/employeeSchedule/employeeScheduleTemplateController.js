'use strict';

/**
 * Employee Schedule Template Controller
 *
 * Manages recurring weekly schedule templates per employee (dayOfWeek-based).
 * Templates represent a default weekly pattern, e.g. Mon-Fri 08:00–17:00.
 *
 * Routes:
 *   GET    /gym/employee-schedule-templates          → list templates
 *   POST   /gym/employee-schedule-templates          → upsert template(s) (single or bulk)
 *   PUT    /gym/employee-schedule-templates/:id      → update one template entry
 *   DELETE /gym/employee-schedule-templates/user/:userId → delete all templates for a user
 *   DELETE /gym/employee-schedule-templates/:id      → delete one template entry
 */

const { Op } = require('sequelize');
const { EmployeeScheduleTemplate, User, DeviceEmployee, sequelize } = require('../../../models');
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
 * @route   GET /gym/employee-schedule-templates
 * @desc    List schedule templates with optional filters
 * @query   userId, employeeId, dayOfWeek, page, limit
 */
async function listTemplates(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { userId, employeeId, dayOfWeek, page = 1, limit = 100 } = req.query;

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

    if (dayOfWeek !== undefined) where.dayOfWeek = parseInt(dayOfWeek);

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await EmployeeScheduleTemplate.findAndCountAll({
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
      ],
      order: [['deviceEmployeeId', 'ASC'], ['dayOfWeek', 'ASC']],
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
 * @route   POST /gym/employee-schedule-templates
 * @desc    Create / upsert weekly schedule template(s)
 * @body    Single: { userId|employeeId, dayOfWeek, shiftStart, shiftEnd, isOff, notes }
 *          Bulk:   { schedules: [{ userId|employeeId, dayOfWeek, ... }] }
 *          employeeId = DeviceEmployee.employeeNo (frontend sends this instead of userId)
 */
async function createTemplate(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const effectiveTenantId = isSuperAdmin ? req.body.tenantId || tenantId : tenantId;

    // Support both single and bulk
    const items = req.body.schedules || [req.body];

    if (!Array.isArray(items) || items.length === 0) {
      throw createError('VALIDATION_ERROR', 'At least one schedule entry is required');
    }

    // Resolve employeeId → { deviceEmployeeId, userId } for items that use employeeId
    const employeeIds = items.filter(i => i.employeeId && !i.userId).map(i => i.employeeId);
    const employeeMap = await resolveEmployeeIds(employeeIds, effectiveTenantId);

    // Validate all entries
    for (const item of items) {
      // Resolve employeeId to deviceEmployeeId if needed
      if (item.employeeId && !item.deviceEmployeeId) {
        const resolved = employeeMap.get(String(item.employeeId));
        if (resolved) {
          item.deviceEmployeeId = resolved.deviceEmployeeId;
          item.userId = resolved.userId || null;
        }
      }
      if (!item.deviceEmployeeId || item.dayOfWeek === undefined || item.dayOfWeek === null) {
        throw createError('VALIDATION_ERROR', 'employeeId (or deviceEmployeeId), and dayOfWeek (0-6) are required for each entry');
      }
      const dow = parseInt(item.dayOfWeek);
      if (isNaN(dow) || dow < 0 || dow > 6) {
        throw createError('VALIDATION_ERROR', `Invalid dayOfWeek "${item.dayOfWeek}". Must be 0 (Sun) to 6 (Sat)`);
      }
      if (!item.isOff && (!item.shiftStart || !item.shiftEnd)) {
        throw createError('VALIDATION_ERROR', `shiftStart and shiftEnd are required when isOff is false (dayOfWeek: ${item.dayOfWeek})`);
      }
    }

    const result = await sequelize.transaction(async (t) => {
      const saved = [];

      for (const item of items) {
        const dow = parseInt(item.dayOfWeek);
        const [record] = await EmployeeScheduleTemplate.upsert(
          {
            tenantId: effectiveTenantId,
            deviceEmployeeId: item.deviceEmployeeId,
            userId: item.userId || null,
            dayOfWeek: dow,
            shiftStart: item.isOff ? null : item.shiftStart,
            shiftEnd: item.isOff ? null : item.shiftEnd,
            isOff: item.isOff || false,
            notes: item.notes || null,
          },
          {
            conflictFields: ['tenantId', 'deviceEmployeeId', 'dayOfWeek'],
            transaction: t,
          }
        );
        saved.push(record);
      }

      return saved;
    });

    logger.info(`Employee schedule templates upserted: ${result.length} entries`, {
      tenantId: effectiveTenantId,
      count: result.length,
    });

    return res.status(201).json({
      success: true,
      message: `${result.length} template(s) saved`,
      data: result,
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return next(createError('VALIDATION_ERROR', 'Duplicate template entry detected'));
    }
    return next(err);
  }
}

/**
 * @route   PUT /gym/employee-schedule-templates/:id
 * @desc    Update one template entry
 */
async function updateTemplate(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const template = await EmployeeScheduleTemplate.findOne({ where });
    if (!template) throw createError('NOT_FOUND', 'Schedule template not found');

    const { dayOfWeek, shiftStart, shiftEnd, isOff, notes } = req.body;

    if (dayOfWeek !== undefined) {
      const dow = parseInt(dayOfWeek);
      if (isNaN(dow) || dow < 0 || dow > 6) {
        throw createError('VALIDATION_ERROR', `Invalid dayOfWeek "${dayOfWeek}". Must be 0 (Sun) to 6 (Sat)`);
      }
    }

    const effectiveIsOff = isOff !== undefined ? isOff : template.isOff;
    if (!effectiveIsOff) {
      const effectiveStart = shiftStart !== undefined ? shiftStart : template.shiftStart;
      const effectiveEnd = shiftEnd !== undefined ? shiftEnd : template.shiftEnd;
      if (!effectiveStart || !effectiveEnd) {
        throw createError('VALIDATION_ERROR', 'shiftStart and shiftEnd are required when isOff is false');
      }
    }

    await template.update({
      ...(dayOfWeek !== undefined && { dayOfWeek: parseInt(dayOfWeek) }),
      ...(shiftStart !== undefined && { shiftStart: effectiveIsOff ? null : shiftStart }),
      ...(shiftEnd !== undefined && { shiftEnd: effectiveIsOff ? null : shiftEnd }),
      ...(isOff !== undefined && { isOff }),
      ...(notes !== undefined && { notes }),
    });

    return res.json({ success: true, data: template });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   DELETE /gym/employee-schedule-templates/:id
 * @desc    Delete one template entry
 */
async function deleteTemplate(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const template = await EmployeeScheduleTemplate.findOne({ where });
    if (!template) throw createError('NOT_FOUND', 'Schedule template not found');

    await template.destroy();

    return res.json({ success: true, message: 'Schedule template deleted' });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   DELETE /gym/employee-schedule-templates/user/:userId
 * @route   DELETE /gym/employee-schedule-templates/employee/:employeeId
 * @desc    Delete all templates for a specific employee
 */
async function deleteUserTemplates(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { userId, employeeId } = req.params;
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

    const deleted = await EmployeeScheduleTemplate.destroy({ where });

    return res.json({
      success: true,
      message: `${deleted} template(s) deleted for ${employeeId ? 'employee ' + employeeId : 'user ' + userId}`,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  deleteUserTemplates,
};
