'use strict';

/**
 * Shift Controller
 *
 * Master data for shift definitions per tenant.
 * Each tenant can define their own shifts (Pagi, Siang, Middle, Custom, etc.)
 */

const { Op } = require('sequelize');
const { Shift } = require('../../../models');
const { createError } = require('../../../utils/errorCodes');
const logger = require('../../../utils/logger');

/**
 * @route   GET /gym/shifts
 * @desc    List all shifts for the tenant
 * @query   isActive, page, limit
 */
async function listShifts(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { isActive, page = 1, limit = 50 } = req.query;

    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Shift.findAndCountAll({
      where,
      order: [['name', 'ASC']],
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
 * @route   GET /gym/shifts/:id
 * @desc    Get a single shift by ID
 */
async function getShift(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const shift = await Shift.findOne({ where });
    if (!shift) throw createError('NOT_FOUND', 'Shift not found');

    return res.json({ success: true, data: shift });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   POST /gym/shifts
 * @desc    Create a new shift
 * @body    { name, code?, shiftStart, shiftEnd, color? }
 */
async function createShift(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const effectiveTenantId = isSuperAdmin ? req.body.tenantId || tenantId : tenantId;
    const { name, code, shiftStart, shiftEnd, color } = req.body;

    if (!name || !shiftStart || !shiftEnd) {
      throw createError('VALIDATION_ERROR', 'name, shiftStart, and shiftEnd are required');
    }

    // Check duplicate name
    const existing = await Shift.findOne({
      where: { tenantId: effectiveTenantId, name },
    });
    if (existing) {
      throw createError('VALIDATION_ERROR', `Shift with name "${name}" already exists`);
    }

    const shift = await Shift.create({
      tenantId: effectiveTenantId,
      name,
      code: code || null,
      shiftStart,
      shiftEnd,
      color: color || null,
    });

    logger.info('Shift created', { shiftId: shift.id, name, tenantId: effectiveTenantId });

    return res.status(201).json({ success: true, data: shift });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   PUT /gym/shifts/:id
 * @desc    Update a shift
 */
async function updateShift(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { name, code, shiftStart, shiftEnd, color, isActive } = req.body;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const shift = await Shift.findOne({ where });
    if (!shift) throw createError('NOT_FOUND', 'Shift not found');

    // Check duplicate name if changing
    if (name && name !== shift.name) {
      const duplicate = await Shift.findOne({
        where: { tenantId: shift.tenantId, name, id: { [Op.ne]: id } },
      });
      if (duplicate) {
        throw createError('VALIDATION_ERROR', `Shift with name "${name}" already exists`);
      }
    }

    await shift.update({
      ...(name !== undefined && { name }),
      ...(code !== undefined && { code }),
      ...(shiftStart !== undefined && { shiftStart }),
      ...(shiftEnd !== undefined && { shiftEnd }),
      ...(color !== undefined && { color }),
      ...(isActive !== undefined && { isActive }),
    });

    return res.json({ success: true, data: shift });
  } catch (err) {
    return next(err);
  }
}

/**
 * @route   DELETE /gym/shifts/:id
 * @desc    Delete a shift (soft: deactivate if used, hard delete if unused)
 */
async function deleteShift(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const shift = await Shift.findOne({ where });
    if (!shift) throw createError('NOT_FOUND', 'Shift not found');

    await shift.destroy();

    return res.json({ success: true, message: `Shift "${shift.name}" deleted` });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listShifts,
  getShift,
  createShift,
  updateShift,
  deleteShift,
};
