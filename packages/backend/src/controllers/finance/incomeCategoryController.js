'use strict';

/**
 * Income Category Management Controller
 * 
 * @module controllers/finance/incomeCategoryController
 */

const { IncomeCategory, Income, sequelize } = require('../../models');
const { Op, fn, col } = require('sequelize');
const logger = require('../../utils/logger');
const { getClientIp, getUserAgent } = require('../../utils/requestHelper');

/**
 * Create income category
 * @route POST /api/v1/finance/income-categories
 */
async function createCategory(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { name, description, type, color, icon } = req.body;

    // Check if category with same name exists
    const existing = await IncomeCategory.findOne({
      where: { tenantId, name }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        code: 'CATEGORY_EXISTS',
        message: 'Category with this name already exists'
      });
    }

    const category = await IncomeCategory.create({
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

    logger.logInfo('Income category created', {
      action: 'CREATE_INCOME_CATEGORY',
      userId: req.user.id,
      tenantId,
      categoryId: category.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error creating income category', {
      action: 'CREATE_INCOME_CATEGORY_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

/**
 * Get all income categories
 * @route GET /api/v1/finance/income-categories
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

    const categories = await IncomeCategory.findAll({
      where,
      order: [['name', 'ASC']]
    });

    // Include income stats if requested
    if (includeStats === 'true') {
      const categoriesWithStats = await Promise.all(
        categories.map(async (category) => {
          const stats = await Income.findAll({
            where: {
              categoryId: category.id,
              status: 'received'
            },
            attributes: [
              [fn('SUM', col('totalAmount')), 'totalIncome'],
              [fn('COUNT', col('id')), 'incomeCount'],
              [fn('AVG', col('totalAmount')), 'avgIncomeAmount']
            ],
            raw: true
          });

          return {
            ...category.toJSON(),
            stats: {
              totalIncome: parseFloat(stats[0].totalIncome || 0),
              incomeCount: parseInt(stats[0].incomeCount || 0),
              avgIncomeAmount: parseFloat(stats[0].avgIncomeAmount || 0)
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
    logger.logError('Error fetching income categories', {
      action: 'GET_INCOME_CATEGORIES_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

/**
 * Update income category
 * @route PUT /api/v1/finance/income-categories/:id
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

    const category = await IncomeCategory.findOne({ where });

    if (!category) {
      return res.status(404).json({
        success: false,
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found'
      });
    }

    // Check if new name conflicts
    if (updateData.name && updateData.name !== category.name) {
      const existing = await IncomeCategory.findOne({
        where: {
          tenantId: category.tenantId,
          name: updateData.name,
          id: { [Op.ne]: id }
        }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          code: 'CATEGORY_NAME_EXISTS',
          message: 'Category with this name already exists'
        });
      }
    }

    await category.update(updateData);

    res.json({
      success: true,
      data: category
    });

    logger.logInfo('Income category updated', {
      action: 'UPDATE_INCOME_CATEGORY',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      categoryId: id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error updating income category', {
      action: 'UPDATE_INCOME_CATEGORY_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

/**
 * Delete income category
 * @route DELETE /api/v1/finance/income-categories/:id
 */
async function deleteCategory(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const category = await IncomeCategory.findOne({ where });

    if (!category) {
      return res.status(404).json({
        success: false,
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found'
      });
    }

    // Check if category has incomes
    const incomeCount = await Income.count({
      where: { categoryId: id }
    });

    if (incomeCount > 0) {
      return res.status(400).json({
        success: false,
        code: 'CATEGORY_IN_USE',
        message: `Cannot delete category. It has ${incomeCount} income(s) associated with it.`
      });
    }

    await category.destroy();

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });

    logger.logInfo('Income category deleted', {
      action: 'DELETE_INCOME_CATEGORY',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      categoryId: id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error deleting income category', {
      action: 'DELETE_INCOME_CATEGORY_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

module.exports = {
  createIncomeCategory: createCategory,
  getAllIncomeCategories: getAllCategories,
  updateIncomeCategory: updateCategory,
  deleteIncomeCategory: deleteCategory
};
