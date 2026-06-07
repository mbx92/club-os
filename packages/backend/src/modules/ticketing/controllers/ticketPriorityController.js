'use strict';

/**
 * Ticket Priority Controller - Ticketing Module
 * 
 * Handles ticket priority CRUD operations
 * 
 * @module modules/ticketing/controllers/ticketPriorityController
 */

const { TicketPriority } = require('../../../models');
const { Op } = require('sequelize');
const { createError } = require('../../../utils/errorCodes');

/**
 * Get all priorities
 */
const getAllPriorities = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { search, isActive } = req.query;

    const where = {};

    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const priorities = await TicketPriority.findAll({
      where,
      order: [['level', 'ASC']]
    });

    res.json({
      success: true,
      data: priorities
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get priority by ID
 */
const getPriorityById = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const priority = await TicketPriority.findOne({ where });

    if (!priority) {
      throw createError('RESOURCE_NOT_FOUND', 'Priority not found');
    }

    res.json({
      success: true,
      data: priority
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create priority
 */
const createPriority = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { name, level, color, slaHours } = req.body;

    const priority = await TicketPriority.create({
      tenantId,
      name,
      level,
      color: color || null,
      slaHours: slaHours || null
    });

    res.status(201).json({
      success: true,
      data: priority
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update priority
 */
const updatePriority = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { name, level, color, slaHours, isActive } = req.body;

    const priority = await TicketPriority.findOne({
      where: {
        id,
        ...(isSuperAdmin ? {} : { tenantId })
      }
    });

    if (!priority) {
      throw createError('RESOURCE_NOT_FOUND', 'Priority not found');
    }

    if (name !== undefined) priority.name = name;
    if (level !== undefined) priority.level = level;
    if (color !== undefined) priority.color = color;
    if (slaHours !== undefined) priority.slaHours = slaHours;
    if (isActive !== undefined) priority.isActive = isActive;

    await priority.save();

    res.json({
      success: true,
      data: priority
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete priority
 */
const deletePriority = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const priority = await TicketPriority.findOne({
      where: {
        id,
        ...(isSuperAdmin ? {} : { tenantId })
      }
    });

    if (!priority) {
      throw createError('RESOURCE_NOT_FOUND', 'Priority not found');
    }

    await priority.destroy();

    res.json({
      success: true,
      message: 'Priority deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllPriorities,
  getPriorityById,
  createPriority,
  updatePriority,
  deletePriority
};
