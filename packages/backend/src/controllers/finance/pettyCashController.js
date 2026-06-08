'use strict';

/**
 * Petty Cash (Modal Awal) Controller
 * 
 * Handles CRUD and fund operations for petty cash management.
 * Supports: create fund, top-up, pay expense, sales return, adjustment, withdrawal.
 * 
 * @module controllers/finance/pettyCashController
 */

const { PettyCash, PettyCashTransaction, Expense, ExpenseCategory, User, Location, sequelize } = require('../../models');
const { Op, Transaction: SequelizeTransaction } = require('sequelize');
const logger = require('../../utils/logger');
const { getClientIp, getUserAgent } = require('../../utils/requestHelper');
const { generateUniqueSequence, withRetry } = require('../../utils/concurrency');

// ==========================================
// HELPERS
// ==========================================

/**
 * Find or auto-create the system expense category 'Modal Petty Cash' untuk tenant ini.
 * Digunakan saat petty cash di-fund dari revenue agar tercatat sebagai outflow di cashflow.
 */
async function findOrCreatePettyCashCategory(tenantId, transaction) {
  const CATEGORY_NAME = 'Modal Petty Cash';
  let category = await ExpenseCategory.findOne({
    where: { tenantId, name: CATEGORY_NAME },
    transaction
  });
  if (!category) {
    category = await ExpenseCategory.create({
      tenantId,
      name: CATEGORY_NAME,
      description: 'Alokasi dana dari revenue ke petty cash (auto-generated)',
      type: 'operational',
      color: '#6366f1',
      isActive: true
    }, { transaction });
  }
  return category;
}

// ==========================================
// FUND MANAGEMENT
// ==========================================

/**
 * Create a new petty cash fund (Modal Awal)
 * @route POST /api/v1/finance/petty-cash
 */
async function createPettyCash(req, res, next) {
  const { tenantId, id: userId } = req.user;
  const {
    name,
    description,
    initialAmount,
    locationId,
    fundSource,
  } = req.body;

  try {
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Fund name is required'
      });
    }

    if (initialAmount === undefined || initialAmount === null || parseFloat(initialAmount) < 0) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Initial amount must be a non-negative number (0 is allowed)'
      });
    }

    const VALID_FUND_SOURCES = ['owner_cash', 'bank_transfer', 'revenue', 'other'];
    const resolvedFundSource = VALID_FUND_SOURCES.includes(fundSource) ? fundSource : 'owner_cash';

    const result = await withRetry(async () => {
      const transaction = await sequelize.transaction({
        isolationLevel: SequelizeTransaction.ISOLATION_LEVELS.REPEATABLE_READ
      });

      try {
        // Create the petty cash fund
        const pettyCash = await PettyCash.create({
          tenantId,
          locationId: locationId || null,
          name: name.trim(),
          description: description || null,
          initialAmount: parseFloat(initialAmount),
          balance: parseFloat(initialAmount),
          status: 'active',
          createdBy: userId
        }, { transaction });

        // Generate transaction number for the initial deposit
        const transactionNumber = await generateUniqueSequence(
          PettyCashTransaction,
          { tenantId },
          'PCT-',
          'transactionNumber',
          transaction
        );

        // Auto-create Expense ketika fundSource = 'revenue' dan amount > 0
        // → mencatat outflow di cashflow (revenue berkurang sesuai alokasi ke petty cash)
        let autoExpense = null;
        if (resolvedFundSource === 'revenue' && parseFloat(initialAmount) > 0) {
          const category = await findOrCreatePettyCashCategory(tenantId, transaction);
          const expenseNumber = await generateUniqueSequence(
            Expense,
            { tenantId },
            'EXP-',
            'expenseNumber',
            transaction
          );
          autoExpense = await Expense.create({
            tenantId,
            locationId: locationId || null,
            categoryId: category.id,
            expenseNumber,
            title: `Modal Petty Cash: ${name.trim()}`,
            description: description || `Dana awal petty cash '${name.trim()}' diambil dari revenue`,
            amount: parseFloat(initialAmount),
            taxAmount: 0,
            totalAmount: parseFloat(initialAmount),
            expenseDate: new Date(),
            paymentMethod: 'cash',
            status: 'paid',
            paidDate: new Date(),
            paymentNotes: `Auto-dibuat dari pembuatan petty cash: ${name.trim()}`,
            createdBy: userId
          }, { transaction });
        }

        // Record the initial deposit transaction
        const pctTransaction = await PettyCashTransaction.create({
          tenantId,
          pettyCashId: pettyCash.id,
          transactionNumber,
          type: 'initial',
          fundSource: parseFloat(initialAmount) > 0 ? resolvedFundSource : null,
          amount: parseFloat(initialAmount),
          balanceBefore: 0,
          balanceAfter: parseFloat(initialAmount),
          referenceType: autoExpense ? 'Expense' : null,
          referenceId: autoExpense ? autoExpense.id : null,
          description: `Modal awal: ${name.trim()}`,
          transactionDate: new Date().toISOString().split('T')[0],
          performedBy: userId
        }, { transaction });

        await transaction.commit();
        return { pettyCash, pctTransaction, autoExpense };
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    }, 3, 150, 'CREATE_PETTY_CASH');

    const { pettyCash } = result;

    // Fetch with associations
    const created = await PettyCash.findByPk(pettyCash.id, {
      include: [
        { model: Location, as: 'location' },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    res.status(201).json({
      success: true,
      data: created
    });

    logger.logInfo('Petty cash fund created', {
      action: 'CREATE_PETTY_CASH',
      userId,
      tenantId,
      pettyCashId: pettyCash.id,
      initialAmount,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
  } catch (error) {
    logger.logError('Error creating petty cash fund', {
      action: 'CREATE_PETTY_CASH_ERROR',
      userId,
      tenantId,
      error: error.message,
      ip: getClientIp(req)
    });
    next(error);
  }
}

/**
 * Get all petty cash funds
 * @route GET /api/v1/finance/petty-cash
 */
async function getAllPettyCash(req, res, next) {
  const { tenantId } = req.user;
  const {
    status,
    locationId,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'DESC'
  } = req.query;

  try {
    const where = { tenantId };

    if (status) {
      where.status = status;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const validSortFields = ['name', 'balance', 'initialAmount', 'status', 'createdAt'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows } = await PettyCash.findAndCountAll({
      where,
      include: [
        { model: Location, as: 'location' },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ],
      order: [[orderField, orderDir]],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    logger.logError('Error getting petty cash funds', {
      action: 'GET_ALL_PETTY_CASH_ERROR',
      tenantId,
      error: error.message
    });
    next(error);
  }
}

/**
 * Get petty cash fund by ID with recent transactions
 * @route GET /api/v1/finance/petty-cash/:id
 */
async function getPettyCashById(req, res, next) {
  const { tenantId } = req.user;
  const { id } = req.params;

  try {
    const pettyCash = await PettyCash.findOne({
      where: { id, tenantId },
      include: [
        { model: Location, as: 'location' },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
        {
          model: PettyCashTransaction,
          as: 'transactions',
          limit: 10,
          order: [['createdAt', 'DESC']],
          include: [
            { model: User, as: 'performer', attributes: ['id', 'firstName', 'lastName', 'email'] }
          ]
        }
      ]
    });

    if (!pettyCash) {
      return res.status(404).json({
        success: false,
        code: 'PETTY_CASH_NOT_FOUND',
        message: 'Petty cash fund not found'
      });
    }

    res.json({
      success: true,
      data: pettyCash
    });
  } catch (error) {
    logger.logError('Error getting petty cash fund', {
      action: 'GET_PETTY_CASH_ERROR',
      tenantId,
      pettyCashId: id,
      error: error.message
    });
    next(error);
  }
}

/**
 * Update petty cash fund info (name, description, status)
 * @route PUT /api/v1/finance/petty-cash/:id
 */
async function updatePettyCash(req, res, next) {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;
  const { name, description, status, locationId } = req.body;

  try {
    const result = await withRetry(async () => {
      const transaction = await sequelize.transaction({
        isolationLevel: SequelizeTransaction.ISOLATION_LEVELS.REPEATABLE_READ
      });

      try {
        const pettyCash = await PettyCash.findOne({
          where: { id, tenantId },
          lock: transaction.LOCK.UPDATE,
          transaction
        });

        if (!pettyCash) {
          await transaction.rollback();
          return { notFound: true };
        }

        // Fund yang sudah closed tidak dapat diubah statusnya (termasuk re-activate)
        // Jika perlu dana baru, buat fund baru
        if (pettyCash.status === 'closed') {
          await transaction.rollback();
          return { closed: true };
        }

        const updates = {};
        if (name !== undefined) updates.name = name.trim();
        if (description !== undefined) updates.description = description;
        if (status !== undefined) updates.status = status;
        if (locationId !== undefined) updates.locationId = locationId || null;

        await pettyCash.update(updates, { transaction });
        await transaction.commit();
        return { pettyCash };
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    }, 3, 150, 'UPDATE_PETTY_CASH');

    if (result.notFound) {
      return res.status(404).json({
        success: false,
        code: 'PETTY_CASH_NOT_FOUND',
        message: 'Petty cash fund not found'
      });
    }

    if (result.closed) {
      return res.status(400).json({
        success: false,
        code: 'FUND_CLOSED',
        message: 'Fund sudah ditutup dan tidak dapat diubah. Jika membutuhkan dana baru, buat fund baru.'
      });
    }

    const updated = await PettyCash.findByPk(id, {
      include: [
        { model: Location, as: 'location' },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    res.json({
      success: true,
      data: updated
    });

    logger.logInfo('Petty cash fund updated', {
      action: 'UPDATE_PETTY_CASH',
      userId,
      tenantId,
      pettyCashId: id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
  } catch (error) {
    logger.logError('Error updating petty cash fund', {
      action: 'UPDATE_PETTY_CASH_ERROR',
      userId,
      tenantId,
      pettyCashId: id,
      error: error.message
    });
    next(error);
  }
}

/**
 * Delete (soft) petty cash fund
 * @route DELETE /api/v1/finance/petty-cash/:id
 */
async function deletePettyCash(req, res, next) {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;

  try {
    const pettyCash = await PettyCash.findOne({
      where: { id, tenantId }
    });

    if (!pettyCash) {
      return res.status(404).json({
        success: false,
        code: 'PETTY_CASH_NOT_FOUND',
        message: 'Petty cash fund not found'
      });
    }

    if (parseFloat(pettyCash.balance) > 0) {
      return res.status(400).json({
        success: false,
        code: 'FUND_HAS_BALANCE',
        message: 'Cannot delete a fund with remaining balance. Please withdraw the balance first.'
      });
    }

    // Cek apakah ada Expense yang ter-link ke fund ini (dari revenue funding)
    // Expense tidak ikut dihapus — hanya koneksi referenceId yang jadi orphan
    const linkedExpenseCount = await PettyCashTransaction.count({
      where: { pettyCashId: id, tenantId, referenceType: 'Expense' }
    });

    await pettyCash.destroy();

    res.json({
      success: true,
      message: 'Petty cash fund deleted successfully',
      ...(linkedExpenseCount > 0 ? {
        warning: `Fund memiliki ${linkedExpenseCount} transaksi yang ter-link ke Expense. Expense tersebut tetap ada di sistem dan tidak ikut dihapus.`
      } : {})
    });

    logger.logInfo('Petty cash fund deleted', {
      action: 'DELETE_PETTY_CASH',
      userId,
      tenantId,
      pettyCashId: id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
  } catch (error) {
    logger.logError('Error deleting petty cash fund', {
      action: 'DELETE_PETTY_CASH_ERROR',
      userId,
      tenantId,
      pettyCashId: id,
      error: error.message
    });
    next(error);
  }
}

// ==========================================
// FUND OPERATIONS
// ==========================================

/**
 * Top up (add funds to) petty cash
 * @route POST /api/v1/finance/petty-cash/:id/top-up
 */
async function topUpPettyCash(req, res, next) {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;
  const { amount, description, transactionDate, fundSource } = req.body;

  try {
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Amount must be a positive number'
      });
    }

    const VALID_FUND_SOURCES = ['owner_cash', 'bank_transfer', 'revenue', 'other'];
    const resolvedFundSource = fundSource && VALID_FUND_SOURCES.includes(fundSource)
      ? fundSource
      : 'owner_cash';

    const result = await withRetry(async () => {
      const transaction = await sequelize.transaction({
        isolationLevel: SequelizeTransaction.ISOLATION_LEVELS.REPEATABLE_READ
      });

      try {
        const pettyCash = await PettyCash.findOne({
          where: { id, tenantId, status: 'active' },
          lock: transaction.LOCK.UPDATE,
          transaction
        });

        if (!pettyCash) {
          await transaction.rollback();
          return { notFound: true };
        }

        const balanceBefore = parseFloat(pettyCash.balance);
        const topUpAmount = parseFloat(amount);
        const balanceAfter = balanceBefore + topUpAmount;

        // Update balance
        await pettyCash.update({ balance: balanceAfter }, { transaction });

        // Generate transaction number
        const transactionNumber = await generateUniqueSequence(
          PettyCashTransaction,
          { tenantId },
          'PCT-',
          'transactionNumber',
          transaction
        );

        // Auto-create Expense ketika fundSource = 'revenue'
        let autoExpense = null;
        if (resolvedFundSource === 'revenue') {
          const category = await findOrCreatePettyCashCategory(tenantId, transaction);
          const expenseNumber = await generateUniqueSequence(
            Expense,
            { tenantId },
            'EXP-',
            'expenseNumber',
            transaction
          );
          autoExpense = await Expense.create({
            tenantId,
            locationId: pettyCash.locationId || null,
            categoryId: category.id,
            expenseNumber,
            title: `Top Up Petty Cash: ${pettyCash.name}`,
            description: description || `Top up petty cash '${pettyCash.name}' diambil dari revenue`,
            amount: topUpAmount,
            taxAmount: 0,
            totalAmount: topUpAmount,
            expenseDate: transactionDate ? new Date(transactionDate) : new Date(),
            paymentMethod: 'cash',
            status: 'paid',
            paidDate: transactionDate ? new Date(transactionDate) : new Date(),
            paymentNotes: `Auto-dibuat dari top up petty cash: ${pettyCash.name}`,
            createdBy: userId
          }, { transaction });
        }

        // Record transaction
        const pctTransaction = await PettyCashTransaction.create({
          tenantId,
          pettyCashId: pettyCash.id,
          transactionNumber,
          type: 'top_up',
          fundSource: resolvedFundSource,
          amount: topUpAmount,
          balanceBefore,
          balanceAfter,
          referenceType: autoExpense ? 'Expense' : null,
          referenceId: autoExpense ? autoExpense.id : null,
          description: description || 'Top up modal',
          transactionDate: transactionDate || new Date().toISOString().split('T')[0],
          performedBy: userId
        }, { transaction });

        await transaction.commit();
        return { pettyCash, pctTransaction, balanceBefore, balanceAfter, autoExpense };
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    }, 3, 150, 'TOP_UP_PETTY_CASH');

    if (result.notFound) {
      return res.status(404).json({
        success: false,
        code: 'PETTY_CASH_NOT_FOUND',
        message: 'Active petty cash fund not found'
      });
    }

    res.json({
      success: true,
      data: {
        pettyCashId: result.pettyCash.id,
        transactionNumber: result.pctTransaction.transactionNumber,
        amount: parseFloat(amount),
        balanceBefore: result.balanceBefore,
        balanceAfter: result.balanceAfter,
        ...(result.autoExpense ? {
          autoExpense: {
            id: result.autoExpense.id,
            expenseNumber: result.autoExpense.expenseNumber
          }
        } : {})
      },
      message: 'Top up successful'
    });

    logger.logInfo('Petty cash topped up', {
      action: 'TOP_UP_PETTY_CASH',
      userId,
      tenantId,
      pettyCashId: id,
      amount,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
  } catch (error) {
    logger.logError('Error topping up petty cash', {
      action: 'TOP_UP_PETTY_CASH_ERROR',
      userId,
      tenantId,
      pettyCashId: id,
      error: error.message
    });
    next(error);
  }
}

/**
 * Record an outflow from petty cash (used for operational expenses / purchases).
 *
 * Model: petty cash is treated as a WALLET (kantong / saldo mengendap).
 * Using petty cash for a payment ONLY:
 *   1. Deducts the balance from the petty cash fund.
 *   2. Creates a PettyCashTransaction of type 'expense' for full tracking.
 *
 * The Expense record (if provided via expenseId) is stored as a reference link
 * in the PettyCashTransaction for context/display, but its status is deliberately
 * NOT changed to 'paid' here.
 *
 * Rationale: when petty cash is funded from 'revenue', an auto-Expense is already
 * created to record the cashflow outflow. Marking individual purchases as paid
 * expenses would double-count the same money in finance reports.
 * If the petty cash was funded from 'owner_cash' / 'bank_transfer', the purchases
 * are internal fund movements and should not create separate expense outflows either.
 *
 * @route POST /api/v1/finance/petty-cash/:id/expense
 */
async function payExpenseFromPettyCash(req, res, next) {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;
  const { expenseId, amount, description, transactionDate } = req.body;

  try {
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Amount must be a positive number'
      });
    }

    const result = await withRetry(async () => {
      const transaction = await sequelize.transaction({
        isolationLevel: SequelizeTransaction.ISOLATION_LEVELS.REPEATABLE_READ
      });

      try {
        // Lock petty cash for update
        const pettyCash = await PettyCash.findOne({
          where: { id, tenantId, status: 'active' },
          lock: transaction.LOCK.UPDATE,
          transaction
        });

        if (!pettyCash) {
          await transaction.rollback();
          return { notFound: true };
        }

        const balanceBefore = parseFloat(pettyCash.balance);
        const expenseAmount = parseFloat(amount);

        // Check if sufficient balance
        if (balanceBefore < expenseAmount) {
          await transaction.rollback();
          return { insufficientBalance: true, currentBalance: balanceBefore };
        }

        const balanceAfter = balanceBefore - expenseAmount;

        // If expenseId is provided, only use it as a reference link for context.
        // We do NOT update the Expense status — the Expense system is kept separate
        // from petty cash internal movements to avoid double-counting in finance reports.
        let expenseRef = null;
        if (expenseId) {
          expenseRef = await Expense.findOne({
            where: { id: expenseId, tenantId },
            attributes: ['id', 'title'],
            transaction
          });

          if (!expenseRef) {
            await transaction.rollback();
            return { expenseNotFound: true };
          }
        }

        // Update balance
        await pettyCash.update({ balance: balanceAfter }, { transaction });

        // Generate transaction number
        const transactionNumber = await generateUniqueSequence(
          PettyCashTransaction,
          { tenantId },
          'PCT-',
          'transactionNumber',
          transaction
        );

        // Record the outflow in petty cash tracking only
        const pctTransaction = await PettyCashTransaction.create({
          tenantId,
          pettyCashId: pettyCash.id,
          transactionNumber,
          type: 'expense',
          amount: -expenseAmount,
          balanceBefore,
          balanceAfter,
          referenceType: expenseRef ? 'Expense' : null,
          referenceId: expenseRef ? expenseRef.id : null,
          description: description || (expenseRef ? `Pengeluaran: ${expenseRef.title}` : 'Pengeluaran dari petty cash'),
          transactionDate: transactionDate || new Date().toISOString().split('T')[0],
          performedBy: userId
        }, { transaction });

        await transaction.commit();
        return { pettyCash, pctTransaction, balanceBefore, balanceAfter, expenseRef };
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    }, 3, 150, 'PAY_EXPENSE_PETTY_CASH');

    if (result.notFound) {
      return res.status(404).json({
        success: false,
        code: 'PETTY_CASH_NOT_FOUND',
        message: 'Active petty cash fund not found'
      });
    }

    if (result.insufficientBalance) {
      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_BALANCE',
        message: `Insufficient balance. Current balance: ${result.currentBalance}`
      });
    }

    if (result.expenseNotFound) {
      return res.status(404).json({
        success: false,
        code: 'EXPENSE_NOT_FOUND',
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: {
        pettyCashId: result.pettyCash.id,
        transactionNumber: result.pctTransaction.transactionNumber,
        amount: parseFloat(amount),
        balanceBefore: result.balanceBefore,
        balanceAfter: result.balanceAfter,
        expenseRef: result.expenseRef
          ? { id: result.expenseRef.id, title: result.expenseRef.title }
          : null
      },
      message: 'Petty cash outflow recorded successfully'
    });

    logger.logInfo('Petty cash outflow recorded', {
      action: 'PAY_EXPENSE_PETTY_CASH',
      userId,
      tenantId,
      pettyCashId: id,
      expenseId: expenseId || null,
      amount,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
  } catch (error) {
    logger.logError('Error recording petty cash outflow', {
      action: 'PAY_EXPENSE_PETTY_CASH_ERROR',
      userId,
      tenantId,
      pettyCashId: id,
      error: error.message
    });
    next(error);
  }
}

/**
 * Add sales return to petty cash (pengembalian modal petty cash dari hasil penjualan)
 * Digunakan untuk mengembalikan dana petty cash yang terpakai untuk expenses
 * dari hasil penjualan di hari/shift tersebut.
 * @route POST /api/v1/finance/petty-cash/:id/sales-return
 * @alias POST /api/v1/finance/petty-cash/:id/income (backward compat)
 */
async function addSalesReturnToPettyCash(req, res, next) {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;
  const { amount, description, transactionDate, referenceId } = req.body;

  try {
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Amount must be a positive number'
      });
    }

    const result = await withRetry(async () => {
      const transaction = await sequelize.transaction({
        isolationLevel: SequelizeTransaction.ISOLATION_LEVELS.REPEATABLE_READ
      });

      try {
        const pettyCash = await PettyCash.findOne({
          where: { id, tenantId, status: 'active' },
          lock: transaction.LOCK.UPDATE,
          transaction
        });

        if (!pettyCash) {
          await transaction.rollback();
          return { notFound: true };
        }

        const balanceBefore = parseFloat(pettyCash.balance);
        const returnAmount = parseFloat(amount);
        const balanceAfter = balanceBefore + returnAmount;

        // Update balance
        await pettyCash.update({ balance: balanceAfter }, { transaction });

        // Generate transaction number
        const transactionNumber = await generateUniqueSequence(
          PettyCashTransaction,
          { tenantId },
          'PCT-',
          'transactionNumber',
          transaction
        );

        // Record transaction
        const pctTransaction = await PettyCashTransaction.create({
          tenantId,
          pettyCashId: pettyCash.id,
          transactionNumber,
          type: 'sales_return',
          fundSource: 'revenue',
          amount: returnAmount,
          balanceBefore,
          balanceAfter,
          referenceType: referenceId ? 'Transaction' : null,
          referenceId: referenceId || null,
          description: description || 'Pengembalian modal petty cash dari hasil penjualan',
          transactionDate: transactionDate || new Date().toISOString().split('T')[0],
          performedBy: userId
        }, { transaction });

        await transaction.commit();
        return { pettyCash, pctTransaction, balanceBefore, balanceAfter };
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    }, 3, 150, 'SALES_RETURN_PETTY_CASH');

    if (result.notFound) {
      return res.status(404).json({
        success: false,
        code: 'PETTY_CASH_NOT_FOUND',
        message: 'Active petty cash fund not found'
      });
    }

    res.json({
      success: true,
      data: {
        pettyCashId: result.pettyCash.id,
        transactionNumber: result.pctTransaction.transactionNumber,
        amount: parseFloat(amount),
        balanceBefore: result.balanceBefore,
        balanceAfter: result.balanceAfter
      },
      message: 'Sales return to petty cash successful'
    });

    logger.logInfo('Sales return added to petty cash', {
      action: 'SALES_RETURN_PETTY_CASH',
      userId,
      tenantId,
      pettyCashId: id,
      amount,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
  } catch (error) {
    logger.logError('Error adding sales return to petty cash', {
      action: 'SALES_RETURN_PETTY_CASH_ERROR',
      userId,
      tenantId,
      pettyCashId: id,
      error: error.message
    });
    next(error);
  }
}

/**
 * Make a balance adjustment to petty cash
 * @route POST /api/v1/finance/petty-cash/:id/adjustment
 */
async function adjustPettyCash(req, res, next) {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;
  const { amount, description, transactionDate, fundSource } = req.body;

  try {
    if (amount === undefined || amount === null || parseFloat(amount) === 0) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Amount must be a non-zero number (positive to add, negative to subtract)'
      });
    }

    const result = await withRetry(async () => {
      const transaction = await sequelize.transaction({
        isolationLevel: SequelizeTransaction.ISOLATION_LEVELS.REPEATABLE_READ
      });

      try {
        const pettyCash = await PettyCash.findOne({
          where: { id, tenantId, status: 'active' },
          lock: transaction.LOCK.UPDATE,
          transaction
        });

        if (!pettyCash) {
          await transaction.rollback();
          return { notFound: true };
        }

        const balanceBefore = parseFloat(pettyCash.balance);
        const adjustmentAmount = parseFloat(amount);
        const balanceAfter = balanceBefore + adjustmentAmount;

        if (balanceAfter < 0) {
          await transaction.rollback();
          return { negativeBalance: true, currentBalance: balanceBefore };
        }

        // Update balance
        await pettyCash.update({ balance: balanceAfter }, { transaction });

        // Generate transaction number
        const transactionNumber = await generateUniqueSequence(
          PettyCashTransaction,
          { tenantId },
          'PCT-',
          'transactionNumber',
          transaction
        );

        // Record transaction - fundSource hanya relevan jika adjustment positif (penambahan)
        const VALID_FUND_SOURCES = ['owner_cash', 'bank_transfer', 'revenue', 'other'];
        const resolvedFundSource = adjustmentAmount > 0
          ? (fundSource && VALID_FUND_SOURCES.includes(fundSource) ? fundSource : 'other')
          : null;

        // Auto-create Expense jika adjustment positif dengan fundSource = 'revenue'
        // Konsisten dengan behavior createPettyCash dan topUpPettyCash
        let autoExpense = null;
        if (resolvedFundSource === 'revenue' && adjustmentAmount > 0) {
          const category = await findOrCreatePettyCashCategory(tenantId, transaction);
          const expenseNumber = await generateUniqueSequence(
            Expense,
            { tenantId },
            'EXP-',
            'expenseNumber',
            transaction
          );
          autoExpense = await Expense.create({
            tenantId,
            locationId: pettyCash.locationId || null,
            categoryId: category.id,
            expenseNumber,
            title: `Adjustment Petty Cash: ${pettyCash.name}`,
            description: description || `Penyesuaian saldo petty cash '${pettyCash.name}' dari revenue`,
            amount: adjustmentAmount,
            taxAmount: 0,
            totalAmount: adjustmentAmount,
            expenseDate: transactionDate ? new Date(transactionDate) : new Date(),
            paymentMethod: 'cash',
            status: 'paid',
            paidDate: transactionDate ? new Date(transactionDate) : new Date(),
            paymentNotes: `Auto-dibuat dari adjustment petty cash: ${pettyCash.name}`,
            createdBy: userId
          }, { transaction });
        }

        const pctTransaction = await PettyCashTransaction.create({
          tenantId,
          pettyCashId: pettyCash.id,
          transactionNumber,
          type: 'adjustment',
          fundSource: resolvedFundSource,
          amount: adjustmentAmount,
          balanceBefore,
          balanceAfter,
          referenceType: autoExpense ? 'Expense' : null,
          referenceId: autoExpense ? autoExpense.id : null,
          description: description || `Penyesuaian saldo: ${adjustmentAmount > 0 ? '+' : ''}${adjustmentAmount}`,
          transactionDate: transactionDate || new Date().toISOString().split('T')[0],
          performedBy: userId
        }, { transaction });

        await transaction.commit();
        return { pettyCash, pctTransaction, balanceBefore, balanceAfter, autoExpense };
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    }, 3, 150, 'ADJUST_PETTY_CASH');

    if (result.notFound) {
      return res.status(404).json({
        success: false,
        code: 'PETTY_CASH_NOT_FOUND',
        message: 'Active petty cash fund not found'
      });
    }

    if (result.negativeBalance) {
      return res.status(400).json({
        success: false,
        code: 'NEGATIVE_BALANCE',
        message: `Adjustment would result in negative balance. Current balance: ${result.currentBalance}`
      });
    }

    res.json({
      success: true,
      data: {
        pettyCashId: result.pettyCash.id,
        transactionNumber: result.pctTransaction.transactionNumber,
        amount: parseFloat(amount),
        balanceBefore: result.balanceBefore,
        balanceAfter: result.balanceAfter,
        ...(result.autoExpense ? {
          autoExpense: {
            id: result.autoExpense.id,
            expenseNumber: result.autoExpense.expenseNumber
          }
        } : {})
      },
      message: 'Adjustment successful'
    });

    logger.logInfo('Petty cash adjusted', {
      action: 'ADJUST_PETTY_CASH',
      userId,
      tenantId,
      pettyCashId: id,
      amount,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
  } catch (error) {
    logger.logError('Error adjusting petty cash', {
      action: 'ADJUST_PETTY_CASH_ERROR',
      userId,
      tenantId,
      pettyCashId: id,
      error: error.message
    });
    next(error);
  }
}

/**
 * Withdraw from petty cash
 * @route POST /api/v1/finance/petty-cash/:id/withdrawal
 */
async function withdrawPettyCash(req, res, next) {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;
  const { amount, description, transactionDate } = req.body;

  try {
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Amount must be a positive number'
      });
    }

    const result = await withRetry(async () => {
      const transaction = await sequelize.transaction({
        isolationLevel: SequelizeTransaction.ISOLATION_LEVELS.REPEATABLE_READ
      });

      try {
        const pettyCash = await PettyCash.findOne({
          where: { id, tenantId, status: 'active' },
          lock: transaction.LOCK.UPDATE,
          transaction
        });

        if (!pettyCash) {
          await transaction.rollback();
          return { notFound: true };
        }

        const balanceBefore = parseFloat(pettyCash.balance);
        const withdrawAmount = parseFloat(amount);

        if (balanceBefore < withdrawAmount) {
          await transaction.rollback();
          return { insufficientBalance: true, currentBalance: balanceBefore };
        }

        const balanceAfter = balanceBefore - withdrawAmount;

        // Update balance
        await pettyCash.update({ balance: balanceAfter }, { transaction });

        // Generate transaction number
        const transactionNumber = await generateUniqueSequence(
          PettyCashTransaction,
          { tenantId },
          'PCT-',
          'transactionNumber',
          transaction
        );

        // Record transaction
        const pctTransaction = await PettyCashTransaction.create({
          tenantId,
          pettyCashId: pettyCash.id,
          transactionNumber,
          type: 'withdrawal',
          amount: -withdrawAmount,
          balanceBefore,
          balanceAfter,
          description: description || 'Penarikan dari modal',
          transactionDate: transactionDate || new Date().toISOString().split('T')[0],
          performedBy: userId
        }, { transaction });

        await transaction.commit();
        return { pettyCash, pctTransaction, balanceBefore, balanceAfter };
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    }, 3, 150, 'WITHDRAW_PETTY_CASH');

    if (result.notFound) {
      return res.status(404).json({
        success: false,
        code: 'PETTY_CASH_NOT_FOUND',
        message: 'Active petty cash fund not found'
      });
    }

    if (result.insufficientBalance) {
      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_BALANCE',
        message: `Insufficient balance. Current balance: ${result.currentBalance}`
      });
    }

    res.json({
      success: true,
      data: {
        pettyCashId: result.pettyCash.id,
        transactionNumber: result.pctTransaction.transactionNumber,
        amount: parseFloat(amount),
        balanceBefore: result.balanceBefore,
        balanceAfter: result.balanceAfter
      },
      message: 'Withdrawal successful'
    });

    logger.logInfo('Petty cash withdrawal', {
      action: 'WITHDRAW_PETTY_CASH',
      userId,
      tenantId,
      pettyCashId: id,
      amount,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
  } catch (error) {
    logger.logError('Error withdrawing from petty cash', {
      action: 'WITHDRAW_PETTY_CASH_ERROR',
      userId,
      tenantId,
      pettyCashId: id,
      error: error.message
    });
    next(error);
  }
}

// ==========================================
// TRANSACTION HISTORY
// ==========================================

/**
 * Get petty cash transaction history
 * @route GET /api/v1/finance/petty-cash/:id/transactions
 */
async function getPettyCashTransactions(req, res, next) {
  const { tenantId } = req.user;
  const { id } = req.params;
  const {
    type,
    fundSource,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    sortBy = 'transactionDate',
    sortOrder = 'DESC'
  } = req.query;

  try {
    // Verify petty cash exists and belongs to tenant
    const pettyCash = await PettyCash.findOne({
      where: { id, tenantId }
    });

    if (!pettyCash) {
      return res.status(404).json({
        success: false,
        code: 'PETTY_CASH_NOT_FOUND',
        message: 'Petty cash fund not found'
      });
    }

    const where = { tenantId, pettyCashId: id };

    if (type) {
      where.type = type;
    }

    // Filter by fundSource (only relevant for inflow types)
    const VALID_FUND_SOURCES = ['owner_cash', 'bank_transfer', 'revenue', 'other'];
    if (fundSource && VALID_FUND_SOURCES.includes(fundSource)) {
      where.fundSource = fundSource;
    }

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate[Op.gte] = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) where.transactionDate[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const validSortFields = ['transactionDate', 'amount', 'type', 'createdAt'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'transactionDate';
    const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows } = await PettyCashTransaction.findAndCountAll({
      where,
      include: [
        { model: User, as: 'performer', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ],
      order: [[orderField, orderDir], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    logger.logError('Error getting petty cash transactions', {
      action: 'GET_PETTY_CASH_TRANSACTIONS_ERROR',
      tenantId,
      pettyCashId: id,
      error: error.message
    });
    next(error);
  }
}

/**
 * Get summary of all petty cash funds
 * @route GET /api/v1/finance/petty-cash/summary
 */
async function getPettyCashSummary(req, res, next) {
  const { tenantId } = req.user;
  const { startDate, endDate } = req.query;

  try {
    // Get all active funds
    const funds = await PettyCash.findAll({
      where: { tenantId, status: 'active' },
      include: [
        { model: Location, as: 'location' }
      ]
    });

    // Calculate totals
    const totalBalance = funds.reduce((sum, f) => sum + parseFloat(f.balance), 0);
    const totalInitialAmount = funds.reduce((sum, f) => sum + parseFloat(f.initialAmount), 0);

    // Get transaction summaries per type
    const txWhere = { tenantId };
    if (startDate || endDate) {
      txWhere.transactionDate = {};
      if (startDate) txWhere.transactionDate[Op.gte] = startDate;
      if (endDate) txWhere.transactionDate[Op.lte] = endDate;
    }

    const transactionSummary = await PettyCashTransaction.findAll({
      where: txWhere,
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount']
      ],
      group: ['type'],
      raw: true
    });

    // Build summary by type
    const summaryByType = {};
    transactionSummary.forEach(row => {
      summaryByType[row.type] = {
        count: parseInt(row.count),
        totalAmount: parseFloat(row.totalAmount) || 0
      };
    });

    res.json({
      success: true,
      data: {
        totalFunds: funds.length,
        totalBalance,
        totalInitialAmount,
        funds: funds.map(f => ({
          id: f.id,
          name: f.name,
          balance: parseFloat(f.balance),
          initialAmount: parseFloat(f.initialAmount),
          location: f.location?.name || null
        })),
        transactionSummary: summaryByType
      }
    });
  } catch (error) {
    logger.logError('Error getting petty cash summary', {
      action: 'GET_PETTY_CASH_SUMMARY_ERROR',
      tenantId,
      error: error.message
    });
    next(error);
  }
}

module.exports = {
  createPettyCash,
  getAllPettyCash,
  getPettyCashById,
  updatePettyCash,
  deletePettyCash,
  topUpPettyCash,
  payExpenseFromPettyCash,
  addSalesReturnToPettyCash,
  adjustPettyCash,
  withdrawPettyCash,
  getPettyCashTransactions,
  getPettyCashSummary
};
