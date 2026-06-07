'use strict';

/**
 * Income Management Controller
 * 
 * Handles CRUD operations for incomes (both transactional and manual)
 * 
 * @module controllers/finance/incomeController
 */

const { Income, IncomeCategory, User, Location, Transaction, sequelize } = require('../../models');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');
const { getClientIp, getUserAgent } = require('../../utils/requestHelper');
const { generateUniqueSequence } = require('../../utils/concurrency');
const { buildOptionalDateRangeFilter } = require('../../utils/dateRange');

/**
 * Create new income (manual entry)
 * @route POST /api/v1/finance/incomes
 */
async function createIncome(req, res, next) {
  const transaction = await sequelize.transaction();

  try {
    const { tenantId, id: userId } = req.user;
    const {
      categoryId,
      locationId,
      title,
      description,
      amount,
      taxAmount = 0,
      incomeDate,
      receivedDate,
      paymentMethod,
      referenceNumber,
      source,
      status = 'received',
      isRecurring = false,
      recurringFrequency,
      recurringEndDate,
      notes,
      tags,
      attachments
    } = req.body;

    // Validate category exists
    const category = await IncomeCategory.findOne({
      where: { id: categoryId, tenantId }
    });

    if (!category) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        code: 'CATEGORY_NOT_FOUND',
        message: 'Income category not found'
      });
    }

    // Generate income number
    const incomeNumber = await generateUniqueSequence(
      Income,
      { tenantId },
      'INC-',
      'incomeNumber',
      transaction
    );

    // Create income
    const income = await Income.create({
      tenantId,
      locationId: locationId || null,
      categoryId,
      incomeNumber,
      title,
      description,
      amount,
      taxAmount,
      totalAmount: parseFloat(amount) + parseFloat(taxAmount),
      incomeDate,
      receivedDate: receivedDate || incomeDate,
      paymentMethod: paymentMethod || null,
      referenceNumber: referenceNumber || null,
      source: source || null,
      type: 'manual',
      status,
      isRecurring,
      recurringFrequency: recurringFrequency || null,
      recurringEndDate: recurringEndDate || null,
      notes: notes || null,
      tags,
      attachments,
      createdBy: userId
    }, { transaction });

    await transaction.commit();

    // Fetch with associations
    const createdIncome = await Income.findByPk(income.id, {
      include: [
        { model: IncomeCategory, as: 'category' },
        { model: Location, as: 'location' },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    res.status(201).json({
      success: true,
      data: createdIncome
    });

    logger.logInfo('Income created', {
      action: 'CREATE_INCOME',
      userId,
      tenantId,
      incomeId: income.id,
      incomeNumber,
      amount: income.totalAmount,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    await transaction.rollback();
    logger.logError('Error creating income', {
      action: 'CREATE_INCOME_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Get all incomes with filters
 * @route GET /api/v1/finance/incomes
 */
async function getAllIncomes(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      page = 1,
      limit = 20,
      status,
      type,
      categoryId,
      locationId,
      startDate,
      endDate,
      search,
      sortBy = 'incomeDate',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    const incomeDateRange = buildOptionalDateRangeFilter(startDate, endDate, Op);
    if (incomeDateRange) {
      where.incomeDate = incomeDateRange;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { source: { [Op.iLike]: `%${search}%` } },
        { incomeNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: incomes } = await Income.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      include: [
        { model: IncomeCategory, as: 'category' },
        { model: Location, as: 'location' },
        { model: Transaction, as: 'transaction' },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    res.json({
      success: true,
      data: {
        incomes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    logger.logError('Error fetching incomes', {
      action: 'GET_INCOMES_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

/**
 * Get income by ID
 * @route GET /api/v1/finance/incomes/:id
 */
async function getIncomeById(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const income = await Income.findOne({
      where,
      include: [
        { model: IncomeCategory, as: 'category' },
        { model: Location, as: 'location' },
        { model: Transaction, as: 'transaction' },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    if (!income) {
      return res.status(404).json({
        success: false,
        code: 'INCOME_NOT_FOUND',
        message: 'Income not found'
      });
    }

    res.json({
      success: true,
      data: income
    });

  } catch (error) {
    logger.logError('Error fetching income', {
      action: 'GET_INCOME_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

/**
 * Update income
 * @route PUT /api/v1/finance/incomes/:id
 */
async function updateIncome(req, res, next) {
  const transaction = await sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const updateData = req.body;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const income = await Income.findOne({ where, transaction });

    if (!income) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        code: 'INCOME_NOT_FOUND',
        message: 'Income not found'
      });
    }

    // Prevent updating transactional income
    if (income.type === 'transactional') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'CANNOT_UPDATE_TRANSACTIONAL',
        message: 'Cannot manually update transactional income. It is auto-generated from transactions.'
      });
    }

    // Clean up empty strings for UUID, enum, and date fields
    const fieldsToClean = ['locationId', 'recurringFrequency', 'recurringEndDate', 'source', 'referenceNumber', 'notes', 'paymentMethod'];
    fieldsToClean.forEach(field => {
      if (updateData[field] === '') {
        updateData[field] = null;
      }
    });

    // Recalculate total if amount or tax changes
    if (updateData.amount !== undefined || updateData.taxAmount !== undefined) {
      const newAmount = updateData.amount !== undefined ? updateData.amount : income.amount;
      const newTax = updateData.taxAmount !== undefined ? updateData.taxAmount : income.taxAmount;
      updateData.totalAmount = parseFloat(newAmount) + parseFloat(newTax);
    }

    await income.update(updateData, { transaction });
    await transaction.commit();

    // Fetch updated income with associations
    const updatedIncome = await Income.findByPk(id, {
      include: [
        { model: IncomeCategory, as: 'category' },
        { model: Location, as: 'location' },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    res.json({
      success: true,
      data: updatedIncome
    });

    logger.logInfo('Income updated', {
      action: 'UPDATE_INCOME',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      incomeId: id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    await transaction.rollback();
    logger.logError('Error updating income', {
      action: 'UPDATE_INCOME_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Delete income
 * @route DELETE /api/v1/finance/incomes/:id
 */
async function deleteIncome(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const income = await Income.findOne({ where });

    if (!income) {
      return res.status(404).json({
        success: false,
        code: 'INCOME_NOT_FOUND',
        message: 'Income not found'
      });
    }

    // Prevent deleting transactional income
    if (income.type === 'transactional') {
      return res.status(400).json({
        success: false,
        code: 'CANNOT_DELETE_TRANSACTIONAL',
        message: 'Cannot delete transactional income. It is auto-generated from transactions.'
      });
    }

    await income.destroy();

    res.json({
      success: true,
      message: 'Income deleted successfully'
    });

    logger.logInfo('Income deleted', {
      action: 'DELETE_INCOME',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      incomeId: id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error deleting income', {
      action: 'DELETE_INCOME_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

module.exports = {
  createIncome,
  getAllIncomes,
  getIncomeById,
  updateIncome,
  deleteIncome
};
