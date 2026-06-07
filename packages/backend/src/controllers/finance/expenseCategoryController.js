'use strict';

/**
 * Expense Category Management Controller
 * 
 * @module controllers/finance/expenseCategoryController
 */

const { ExpenseCategory, Expense, sequelize } = require('../../models');
const { Op, fn, col } = require('sequelize');
const logger = require('../../utils/logger');
const { getClientIp, getUserAgent } = require('../../utils/requestHelper');

/**
 * Create expense category
 * @route POST /api/v1/finance/expense-categories
 */
async function createCategory(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { name, description, type, color, icon } = req.body;

    // Check if category with same name exists
    const existing = await ExpenseCategory.findOne({
      where: { tenantId, name }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        code: 'CATEGORY_EXISTS',
        message: 'Category with this name already exists'
      });
    }

    const category = await ExpenseCategory.create({
      tenantId,
      name,
      description,
      type,
      color,
      icon
    });

    res.status(201).json({
      success: true,
      data: category
    });

    logger.logInfo('Expense category created', {
      action: 'CREATE_EXPENSE_CATEGORY',
      userId: req.user.id,
      tenantId,
      categoryId: category.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error creating expense category', {
      action: 'CREATE_EXPENSE_CATEGORY_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

/**
 * Get all expense categories
 * @route GET /api/v1/finance/expense-categories
 */
async function getAllCategories(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { isActive, includeStats } = req.query;

    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const categories = await ExpenseCategory.findAll({
      where,
      order: [['name', 'ASC']]
    });

    // Include expense stats if requested
    if (includeStats === 'true') {
      const categoriesWithStats = await Promise.all(
        categories.map(async (category) => {
          const stats = await Expense.findAll({
            where: {
              categoryId: category.id,
              status: { [Op.in]: ['approved', 'paid'] }
            },
            attributes: [
              [fn('COUNT', col('id')), 'expenseCount'],
              [fn('SUM', col('totalAmount')), 'totalAmount']
            ],
            raw: true
          });

          return {
            ...category.toJSON(),
            stats: {
              expenseCount: parseInt(stats[0]?.expenseCount || 0),
              totalAmount: parseFloat(stats[0]?.totalAmount || 0)
            }
          };
        })
      );

      return res.json({
        success: true,
        data: categoriesWithStats
      });
    }

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    logger.logError('Error fetching expense categories', {
      action: 'GET_EXPENSE_CATEGORIES_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

/**
 * Update expense category
 * @route PUT /api/v1/finance/expense-categories/:id
 */
async function updateCategory(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const updateData = req.body;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const category = await ExpenseCategory.findOne({ where });

    if (!category) {
      return res.status(404).json({
        success: false,
        code: 'CATEGORY_NOT_FOUND',
        message: 'Expense category not found'
      });
    }

    // Check for duplicate name if name is being changed
    if (updateData.name && updateData.name !== category.name) {
      const existing = await ExpenseCategory.findOne({
        where: {
          tenantId,
          name: updateData.name,
          id: { [Op.ne]: id }
        }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          code: 'CATEGORY_EXISTS',
          message: 'Category with this name already exists'
        });
      }
    }

    await category.update(updateData);

    res.json({
      success: true,
      data: category
    });

    logger.logInfo('Expense category updated', {
      action: 'UPDATE_EXPENSE_CATEGORY',
      userId: req.user.id,
      tenantId,
      categoryId: id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error updating expense category', {
      action: 'UPDATE_EXPENSE_CATEGORY_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

/**
 * Delete expense category
 * @route DELETE /api/v1/finance/expense-categories/:id
 */
async function deleteCategory(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const category = await ExpenseCategory.findOne({ where });

    if (!category) {
      return res.status(404).json({
        success: false,
        code: 'CATEGORY_NOT_FOUND',
        message: 'Expense category not found'
      });
    }

    // Check if category has expenses
    const expenseCount = await Expense.count({
      where: { categoryId: id }
    });

    if (expenseCount > 0) {
      return res.status(400).json({
        success: false,
        code: 'CATEGORY_IN_USE',
        message: `Cannot delete category with ${expenseCount} expense(s)`
      });
    }

    await category.destroy();

    res.json({
      success: true,
      message: 'Expense category deleted successfully'
    });

    logger.logInfo('Expense category deleted', {
      action: 'DELETE_EXPENSE_CATEGORY',
      userId: req.user.id,
      tenantId,
      categoryId: id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error deleting expense category', {
      action: 'DELETE_EXPENSE_CATEGORY_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

module.exports = {
  createExpenseCategory: createCategory,
  getAllExpenseCategories: getAllCategories,
  updateExpenseCategory: updateCategory,
  deleteExpenseCategory: deleteCategory
};
