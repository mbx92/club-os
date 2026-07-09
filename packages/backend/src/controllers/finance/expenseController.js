'use strict';

/**
 * Expense Management Controller
 * 
 * Handles CRUD operations for expenses
 * 
 * @module controllers/finance/expenseController
 */

const { Expense, ExpenseCategory, User, Location, PettyCash, PettyCashTransaction, VaultAccount, CashMutation, sequelize } = require('../../models');
const { Op, Transaction: SequelizeTransaction } = require('sequelize');
const logger = require('../../utils/logger');
const { getClientIp, getUserAgent } = require('../../utils/requestHelper');
const { generateUniqueSequence, withRetry } = require('../../utils/concurrency');
const { buildOptionalDateRangeFilter } = require('../../utils/dateRange');

/**
 * Create new expense
 * @route POST /api/v1/finance/expenses
 */
async function createExpense(req, res, next) {
  const { tenantId, id: userId } = req.user;
  const {
    categoryId,
    locationId,
    title,
    description,
    amount,
    taxAmount = 0,
    expenseDate,
    dueDate,
    paymentMethod,
    bankName,
    paymentNotes,
    referenceNumber,
    vendor,
    status = 'draft',
    isRecurring = false,
    recurringFrequency,
    recurringEndDate,
    notes,
    tags,
    attachments,
    pettyCashId
    fundSource,
    vaultAccountId,
  } = req.body;

  // Validasi: jika langsung paid dengan petty_cash, pettyCashId wajib
  if (status === 'paid' && paymentMethod === 'petty_cash' && !pettyCashId) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'pettyCashId wajib disertakan saat paymentMethod adalah petty_cash'
    });
  }

  // Validasi: vault account wajib jika fundSource = vault
  if (status === 'paid' && fundSource === 'vault' && !vaultAccountId) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'vaultAccountId wajib disertakan saat fundSource adalah vault'
    });
  }

  try {
    const result = await withRetry(async () => {
      const transaction = await sequelize.transaction({
        isolationLevel: SequelizeTransaction.ISOLATION_LEVELS.REPEATABLE_READ
      });

      try {
        // Validate category exists with pessimistic lock to prevent concurrent deletion
        const category = await ExpenseCategory.findOne({
          where: { id: categoryId, tenantId },
          lock: transaction.LOCK.UPDATE,
          transaction
        });

        if (!category) {
          await transaction.rollback();
          return { categoryNotFound: true };
        }

        // Generate expense number (uses LOCK.UPDATE internally for atomicity)
        const expenseNumber = await generateUniqueSequence(
          Expense,
          { tenantId },
          'EXP-',
          'expenseNumber',
          transaction
        );

        // Create expense
        const expense = await Expense.create({
          tenantId,
          locationId: locationId || null,
          categoryId,
          expenseNumber,
          title,
          description,
          amount,
          taxAmount,
          totalAmount: parseFloat(amount) + parseFloat(taxAmount),
          expenseDate,
          dueDate: dueDate || null,
          paymentMethod: paymentMethod || null,
          bankName: bankName || null,
          paymentNotes: paymentNotes || null,
          referenceNumber: referenceNumber || null,
          vendor: vendor || null,
          status,
          isRecurring,
          recurringFrequency: recurringFrequency || null,
          recurringEndDate: recurringEndDate || null,
          notes: notes || null,
          tags,
          attachments,
          fundSource: fundSource || null,
          vaultAccountId: vaultAccountId || null,
          createdBy: userId
        }, { transaction });

        // Jika langsung paid dengan petty_cash, deduct saldo petty cash
        let pctTransaction = null;
        if (status === 'paid' && paymentMethod === 'petty_cash' && pettyCashId) {
          const pettyCash = await PettyCash.findOne({
            where: { id: pettyCashId, tenantId, status: 'active' },
            lock: transaction.LOCK.UPDATE,
            transaction
          });

          if (!pettyCash) {
            await transaction.rollback();
            return { pettyCashNotFound: true };
          }

          const expenseAmount = parseFloat(amount) + parseFloat(taxAmount);
          const balanceBefore = parseFloat(pettyCash.balance);

          if (balanceBefore < expenseAmount) {
            await transaction.rollback();
            return { insufficientBalance: true, currentBalance: balanceBefore, needed: expenseAmount };
          }

          const balanceAfter = balanceBefore - expenseAmount;
          await pettyCash.update({ balance: balanceAfter }, { transaction });

          const pctNumber = await generateUniqueSequence(
            PettyCashTransaction,
            { tenantId },
            'PCT-',
            'transactionNumber',
            transaction
          );

          pctTransaction = await PettyCashTransaction.create({
            tenantId,
            pettyCashId: pettyCash.id,
            transactionNumber: pctNumber,
            type: 'expense',
            fundSource: null,
            amount: -expenseAmount,
            balanceBefore,
            balanceAfter,
            referenceType: 'Expense',
            referenceId: expense.id,
            description: `Pembayaran expense: ${title}`,
            transactionDate: expenseDate
              ? new Date(expenseDate).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            performedBy: userId
          }, { transaction });
        }

        // Jika langsung paid dengan vault, deduct balance vault
        let vaultMutation = null;
        if (status === 'paid' && fundSource === 'vault' && vaultAccountId) {
          const vaultAccount = await VaultAccount.findOne({
            where: { id: vaultAccountId, tenantId, isActive: true },
            lock: transaction.LOCK.UPDATE,
            transaction
          });

          if (!vaultAccount) {
            await transaction.rollback();
            return { vaultAccountNotFound: true };
          }

          const expenseAmount = parseFloat(amount) + parseFloat(taxAmount);
          const balanceBefore = parseFloat(vaultAccount.balance || 0);

          if (balanceBefore < expenseAmount) {
            await transaction.rollback();
            return { vaultInsufficientBalance: true, currentBalance: balanceBefore, needed: expenseAmount, vaultName: vaultAccount.name };
          }

          const balanceAfter = balanceBefore - expenseAmount;
          await vaultAccount.update({ balance: balanceAfter }, { transaction });

          vaultMutation = await CashMutation.create({
            tenantId,
            sourceVaultAccountId: vaultAccount.id,
            sourceAccount: vaultAccount.name,
            amount: expenseAmount,
            mutationType: 'vault_expense',
            referenceType: 'Expense',
            referenceId: expense.id,
            referenceNumber: expenseNumber,
            status: 'posted',
            mutationDate: expenseDate
              ? new Date(expenseDate).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            notes: 'Pembayaran expense: ' + title,
            createdBy: userId,
          }, { transaction });
        }

        await transaction.commit();
        return { expense, expenseNumber, pctTransaction, vaultMutation };
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    }, 3, 150, 'CREATE_EXPENSE');

    if (result.categoryNotFound) {
      return res.status(404).json({
        success: false,
        code: 'CATEGORY_NOT_FOUND',
        message: 'Expense category not found'
      });
    }

    if (result.pettyCashNotFound) {
      return res.status(404).json({
        success: false,
        code: 'PETTY_CASH_NOT_FOUND',
        message: 'Petty cash fund tidak ditemukan atau tidak aktif'
      });
    }

    if (result.insufficientBalance) {
      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_BALANCE',
        message: `Saldo petty cash tidak cukup. Saldo saat ini: ${result.currentBalance}, dibutuhkan: ${result.needed}`
      });
    }

    if (result.vaultAccountNotFound) {
      return res.status(404).json({
        success: false,
        code: 'VAULT_ACCOUNT_NOT_FOUND',
        message: 'Akun vault tidak ditemukan atau tidak aktif'
      });
    }

    if (result.vaultInsufficientBalance) {
      return res.status(400).json({
        success: false,
        code: 'VAULT_INSUFFICIENT_BALANCE',
        message: `Saldo vault ${result.vaultName || ''} tidak cukup. Saldo: ${result.currentBalance}, dibutuhkan: ${result.needed}`
      });
    }

    const { expense, expenseNumber, pctTransaction, vaultMutation } = result;

    // Fetch with associations
    const createdExpense = await Expense.findByPk(expense.id, {
      include: [
        { model: ExpenseCategory, as: 'category' },
        { model: Location, as: 'location' },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    res.status(201).json({
      success: true,
      data: createdExpense,
      ...(pctTransaction ? {
        pettyCash: {
          transactionNumber: pctTransaction.transactionNumber,
          balanceBefore: pctTransaction.balanceBefore,
          balanceAfter: pctTransaction.balanceAfter
        }
      } : {}),
      ...(vaultMutation ? {
        vault: {
          vaultAccountId: vaultMutation.sourceVaultAccountId,
          amount: vaultMutation.amount,
        }
      } : {})
    });

    logger.logInfo('Expense created', {
      action: 'CREATE_EXPENSE',
      userId,
      tenantId,
      expenseId: expense.id,
      expenseNumber,
      amount: expense.totalAmount,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error creating expense', {
      action: 'CREATE_EXPENSE_ERROR',
      userId,
      tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Get all expenses with filters
 * @route GET /api/v1/finance/expenses
 */
async function getAllExpenses(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      page = 1,
      limit = 20,
      status,
      categoryId,
      locationId,
      startDate,
      endDate,
      search,
      sortBy = 'expenseDate',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    const expenseDateRange = buildOptionalDateRangeFilter(startDate, endDate, Op);
    if (expenseDateRange) {
      where.expenseDate = expenseDateRange;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { vendor: { [Op.iLike]: `%${search}%` } },
        { expenseNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: expenses } = await Expense.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      include: [
        { model: ExpenseCategory, as: 'category' },
        { model: Location, as: 'location' },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    res.json({
      success: true,
      data: {
        expenses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    logger.logError('Error fetching expenses', {
      action: 'GET_EXPENSES_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

/**
 * Get expense by ID
 * @route GET /api/v1/finance/expenses/:id
 */
async function getExpenseById(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const expense = await Expense.findOne({
      where,
      include: [
        { model: ExpenseCategory, as: 'category' },
        { model: Location, as: 'location' },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        code: 'EXPENSE_NOT_FOUND',
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: expense
    });

  } catch (error) {
    logger.logError('Error fetching expense', {
      action: 'GET_EXPENSE_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

/**
 * Update expense
 * @route PUT /api/v1/finance/expenses/:id
 */
async function updateExpense(req, res, next) {
  const transaction = await sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const updateData = req.body;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const expense = await Expense.findOne({ where, transaction });

    if (!expense) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        code: 'EXPENSE_NOT_FOUND',
        message: 'Expense not found'
      });
    }

    // Prevent updating paid expenses
    if (expense.status === 'paid' && updateData.amount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'EXPENSE_ALREADY_PAID',
        message: 'Cannot modify amount of paid expense'
      });
    }

    // Clean up empty strings for UUID, enum, and date fields
    const fieldsToClean = ['locationId', 'recurringFrequency', 'recurringEndDate', 'vendor', 'referenceNumber', 'notes', 'paymentMethod', 'bankName', 'paymentNotes', 'dueDate'];
    fieldsToClean.forEach(field => {
      if (updateData[field] === '') {
        updateData[field] = null;
      }
    });

    // Recalculate total if amount or tax changes
    if (updateData.amount !== undefined || updateData.taxAmount !== undefined) {
      const newAmount = updateData.amount !== undefined ? updateData.amount : expense.amount;
      const newTax = updateData.taxAmount !== undefined ? updateData.taxAmount : expense.taxAmount;
      updateData.totalAmount = parseFloat(newAmount) + parseFloat(newTax);
    }

    await expense.update(updateData, { transaction });
    await transaction.commit();

    // Fetch updated expense with associations
    const updatedExpense = await Expense.findByPk(id, {
      include: [
        { model: ExpenseCategory, as: 'category' },
        { model: Location, as: 'location' },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    res.json({
      success: true,
      data: updatedExpense
    });

    logger.logInfo('Expense updated', {
      action: 'UPDATE_EXPENSE',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      expenseId: id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    await transaction.rollback();
    logger.logError('Error updating expense', {
      action: 'UPDATE_EXPENSE_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Delete expense
 * @route DELETE /api/v1/finance/expenses/:id
 */
async function deleteExpense(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const expense = await Expense.findOne({ where });

    if (!expense) {
      return res.status(404).json({
        success: false,
        code: 'EXPENSE_NOT_FOUND',
        message: 'Expense not found'
      });
    }

    // Prevent deleting paid expenses
    if (expense.status === 'paid') {
      return res.status(400).json({
        success: false,
        code: 'EXPENSE_ALREADY_PAID',
        message: 'Cannot delete paid expense'
      });
    }

    await expense.destroy();

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });

    logger.logInfo('Expense deleted', {
      action: 'DELETE_EXPENSE',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      expenseId: id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error deleting expense', {
      action: 'DELETE_EXPENSE_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

/**
 * Approve expense
 * @route POST /api/v1/finance/expenses/:id/approve
 */
async function approveExpense(req, res, next) {
  const transaction = await sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin, id: userId } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const expense = await Expense.findOne({ where, transaction });

    if (!expense) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        code: 'EXPENSE_NOT_FOUND',
        message: 'Expense not found'
      });
    }

    if (expense.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'INVALID_STATUS',
        message: 'Only pending expenses can be approved'
      });
    }

    await expense.update({
      status: 'approved',
      approvedBy: userId,
      approvedAt: new Date()
    }, { transaction });

    await transaction.commit();

    const approvedExpense = await Expense.findByPk(id, {
      include: [
        { model: ExpenseCategory, as: 'category' },
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    res.json({
      success: true,
      data: approvedExpense
    });

    logger.logInfo('Expense approved', {
      action: 'APPROVE_EXPENSE',
      userId,
      tenantId,
      expenseId: id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    await transaction.rollback();
    logger.logError('Error approving expense', {
      action: 'APPROVE_EXPENSE_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

/**
 * Mark expense as paid
 * @route POST /api/v1/finance/expenses/:id/pay
 */
async function markExpenseAsPaid(req, res, next) {
  const transaction = await sequelize.transaction({
    isolationLevel: SequelizeTransaction.ISOLATION_LEVELS.REPEATABLE_READ
  });

  try {
    const { tenantId, isSuperAdmin, id: userId } = req.user;
    const { id } = req.params;
    const { paymentMethod, fundSource, bankName, paymentNotes, paidDate = new Date(), pettyCashId, vaultAccountId } = req.body;

    // Validasi: petty_cash harus menyertakan pettyCashId
    if (paymentMethod === 'petty_cash' && !pettyCashId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'pettyCashId wajib disertakan saat paymentMethod adalah petty_cash'
      });
    }

    // Validasi: vault account wajib jika fundSource = vault
    if (fundSource === 'vault' && !vaultAccountId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'vaultAccountId wajib disertakan saat fundSource adalah vault'
      });
    }

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const expense = await Expense.findOne({ where, transaction });

    if (!expense) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        code: 'EXPENSE_NOT_FOUND',
        message: 'Expense not found'
      });
    }

    if (expense.status === 'paid') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ALREADY_PAID',
        message: 'Expense already marked as paid'
      });
    }

    // --- Petty Cash deduction ---
    let pctTransaction = null;
    if (paymentMethod === 'petty_cash') {
      const pettyCash = await PettyCash.findOne({
        where: { id: pettyCashId, tenantId, status: 'active' },
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (!pettyCash) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          code: 'PETTY_CASH_NOT_FOUND',
          message: 'Petty cash fund tidak ditemukan atau tidak aktif'
        });
      }

      const expenseAmount = parseFloat(expense.totalAmount);
      const balanceBefore = parseFloat(pettyCash.balance);

      if (balanceBefore < expenseAmount) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'INSUFFICIENT_BALANCE',
          message: `Saldo petty cash tidak cukup. Saldo saat ini: ${balanceBefore}, dibutuhkan: ${expenseAmount}`
        });
      }

      const balanceAfter = balanceBefore - expenseAmount;

      // Kurangi saldo petty cash
      await pettyCash.update({ balance: balanceAfter }, { transaction });

      // Generate transaction number untuk PettyCashTransaction
      const transactionNumber = await generateUniqueSequence(
        PettyCashTransaction,
        { tenantId },
        'PCT-',
        'transactionNumber',
        transaction
      );

      // Catat di riwayat petty cash
      pctTransaction = await PettyCashTransaction.create({
        tenantId,
        pettyCashId: pettyCash.id,
        transactionNumber,
        type: 'expense',
        fundSource: null,
        amount: -expenseAmount,
        balanceBefore,
        balanceAfter,
        referenceType: 'Expense',
        referenceId: expense.id,
        description: `Pembayaran expense: ${expense.title}`,
        transactionDate: paidDate
          ? new Date(paidDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        performedBy: userId
      }, { transaction });
    }
    // ----------------------------

    await expense.update({
      status: 'paid',
      paymentMethod,
      bankName: bankName || null,
      paymentNotes: paymentNotes || null,
      paidDate
    }, { transaction });

    await transaction.commit();

    const paidExpense = await Expense.findByPk(id, {
      include: [
        { model: ExpenseCategory, as: 'category' }
      ]
    });

    res.json({
      success: true,
      data: paidExpense,
      ...(pctTransaction ? {
        pettyCash: {
          transactionNumber: pctTransaction.transactionNumber,
          balanceBefore: pctTransaction.balanceBefore,
          balanceAfter: pctTransaction.balanceAfter
        }
      } : {}),
      ...(vaultMutation ? {
        vault: {
          vaultAccountId: vaultMutation.sourceVaultAccountId,
          amount: vaultMutation.amount,
        }
      } : {})
    });

    logger.logInfo('Expense marked as paid', {
      action: 'PAY_EXPENSE',
      userId,
      tenantId,
      expenseId: id,
      amount: expense.totalAmount,
      paymentMethod,
      pettyCashId: pettyCashId || null,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    await transaction.rollback();
    logger.logError('Error marking expense as paid', {
      action: 'PAY_EXPENSE_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

/**
 * Reopen an expense — revert it back to 'pending' status.
 * Allowed from: approved, paid.
 * Clears approval fields so it can go through the approval flow again.
 * @route POST /api/v1/finance/expenses/:id/reopen
 */
async function reopenExpense(req, res, next) {
  const transaction = await sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin, id: userId } = req.user;
    const { id } = req.params;
    const { reason } = req.body || {};

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const expense = await Expense.findOne({ where, transaction });

    if (!expense) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        code: 'EXPENSE_NOT_FOUND',
        message: 'Expense not found'
      });
    }

    const reopenableStatuses = ['approved', 'paid'];
    if (!reopenableStatuses.includes(expense.status)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'INVALID_STATUS',
        message: `Only approved or paid expenses can be reopened. Current status: ${expense.status}`
      });
    }

    const previousStatus = expense.status;

    await expense.update({
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      paymentMethod: expense.status === 'paid' ? null : expense.paymentMethod,
      bankName: expense.status === 'paid' ? null : expense.bankName,
      paymentNotes: expense.status === 'paid' ? null : expense.paymentNotes,
      paidDate: expense.status === 'paid' ? null : expense.paidDate,
      notes: reason
        ? (expense.notes
            ? `${expense.notes}\n[${new Date().toISOString().split('T')[0]}] Reopened: ${reason}`
            : `[${new Date().toISOString().split('T')[0]}] Reopened: ${reason}`)
        : expense.notes
    }, { transaction });

    await transaction.commit();

    const reopenedExpense = await Expense.findByPk(id, {
      include: [
        { model: ExpenseCategory, as: 'category' },
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    logger.logInfo('Expense reopened', {
      action: 'REOPEN_EXPENSE',
      userId,
      tenantId,
      expenseId: id,
      previousStatus,
      reason: reason || null,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.json({
      success: true,
      message: `Expense reopened from '${previousStatus}' back to 'pending'`,
      data: reopenedExpense
    });

  } catch (error) {
    await transaction.rollback();
    logger.logError('Error reopening expense', {
      action: 'REOPEN_EXPENSE_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

module.exports = {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  approveExpense,
  markExpenseAsPaid,
  reopenExpense
};
