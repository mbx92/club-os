'use strict';

const { Shareholder, sequelize } = require('../../models');
const { Op } = require('sequelize');

/**
 * GET /finance/shareholders
 * List all shareholders for the tenant
 */
async function getShareholders(req, res, next) {
  try {
    const { tenantId } = req.user;
    const shareholders = await Shareholder.findAll({
      where: { tenantId },
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
      attributes: ['id', 'name', 'percentage', 'notes', 'isActive', 'sortOrder', 'createdAt', 'updatedAt']
    });

    const activeTotal = shareholders
      .filter(s => s.isActive)
      .reduce((sum, s) => sum + parseFloat(s.percentage), 0);

    res.json({
      success: true,
      data: shareholders,
      meta: {
        total: shareholders.length,
        activeTotal: parseFloat(activeTotal.toFixed(2)),
        isValid: Math.abs(activeTotal - 100) < 0.01
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /finance/shareholders
 * Create a new shareholder
 */
async function createShareholder(req, res, next) {
  try {
    const { tenantId, id: userId } = req.user;
    const { name, percentage, notes, sortOrder } = req.body;

    if (!name || percentage === undefined || percentage === null) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'name and percentage are required'
      });
    }

    const pct = parseFloat(percentage);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PERCENTAGE',
        message: 'percentage must be between 0.01 and 100'
      });
    }

    const shareholder = await Shareholder.create({
      tenantId,
      name: name.trim(),
      percentage: pct,
      notes: notes || null,
      sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
      isActive: true,
      createdBy: userId
    });

    res.status(201).json({ success: true, data: shareholder });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /finance/shareholders/:id
 * Update a shareholder
 */
async function updateShareholder(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const { name, percentage, notes, isActive, sortOrder } = req.body;

    const shareholder = await Shareholder.findOne({ where: { id, tenantId } });
    if (!shareholder) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Shareholder not found' });
    }

    if (percentage !== undefined) {
      const pct = parseFloat(percentage);
      if (isNaN(pct) || pct <= 0 || pct > 100) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_PERCENTAGE',
          message: 'percentage must be between 0.01 and 100'
        });
      }
    }

    await shareholder.update({
      ...(name !== undefined && { name: name.trim() }),
      ...(percentage !== undefined && { percentage: parseFloat(percentage) }),
      ...(notes !== undefined && { notes }),
      ...(isActive !== undefined && { isActive }),
      ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) })
    });

    res.json({ success: true, data: shareholder });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /finance/shareholders/:id
 * Soft-delete a shareholder
 */
async function deleteShareholder(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;

    const shareholder = await Shareholder.findOne({ where: { id, tenantId } });
    if (!shareholder) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Shareholder not found' });
    }

    await shareholder.destroy();
    res.json({ success: true, message: 'Shareholder deleted' });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /finance/shareholders/reorder
 * Update sortOrder for all shareholders (bulk)
 * Body: [{ id, sortOrder }, ...]
 */
async function reorderShareholders(req, res, next) {
  try {
    const { tenantId } = req.user;
    const items = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, code: 'INVALID_BODY', message: 'Body must be a non-empty array of { id, sortOrder }' });
    }

    await sequelize.transaction(async (t) => {
      for (const item of items) {
        await Shareholder.update(
          { sortOrder: parseInt(item.sortOrder) },
          { where: { id: item.id, tenantId }, transaction: t }
        );
      }
    });

    res.json({ success: true, message: 'Order updated' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getShareholders,
  createShareholder,
  updateShareholder,
  deleteShareholder,
  reorderShareholders
};
