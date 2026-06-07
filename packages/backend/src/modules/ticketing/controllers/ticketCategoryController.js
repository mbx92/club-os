'use strict';

/**
 * Ticket Category Controller - Ticketing Module
 * 
 * Handles ticket category CRUD operations
 * 
 * @module modules/ticketing/controllers/ticketCategoryController
 */

const { TicketCategory } = require('../../../models');
const { Op } = require('sequelize');
const { createError } = require('../../../utils/errorCodes');

/**
 * Get all categories
 */
const getAllCategories = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { search, isActive } = req.query;

    const where = {};

    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const categories = await TicketCategory.findAll({
      where,
      order: [['sortOrder', 'ASC'], ['name', 'ASC']]
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get category by ID
 */
const getCategoryById = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const category = await TicketCategory.findOne({ where });

    if (!category) {
      throw createError('RESOURCE_NOT_FOUND', 'Category not found');
    }

    res.json({
      success: true,
      data: category
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create category
 */
const createCategory = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { name, description, color, icon, sortOrder } = req.body;

    const category = await TicketCategory.create({
      tenantId,
      name,
      description: description || null,
      color: color || null,
      icon: icon || null,
      sortOrder: sortOrder || 0
    });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update category
 */
const updateCategory = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { name, description, color, icon, sortOrder, isActive } = req.body;

    const category = await TicketCategory.findOne({
      where: {
        id,
        ...(isSuperAdmin ? {} : { tenantId })
      }
    });

    if (!category) {
      throw createError('RESOURCE_NOT_FOUND', 'Category not found');
    }

    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (color !== undefined) category.color = color;
    if (icon !== undefined) category.icon = icon;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({
      success: true,
      data: category
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete category
 */
const deleteCategory = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const category = await TicketCategory.findOne({
      where: {
        id,
        ...(isSuperAdmin ? {} : { tenantId })
      }
    });

    if (!category) {
      throw createError('RESOURCE_NOT_FOUND', 'Category not found');
    }

    await category.destroy();

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
