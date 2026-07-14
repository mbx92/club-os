'use strict';

const { Op } = require('sequelize');
const { Account, AccountEntry, sequelize: db } = require('../../models');
const accountService = require('../../services/accountService');
const { getTenantTimezone, todayInTz } = require('../../utils/tenantTimezone');
const { createError } = require('../../utils/errorCodes');
const logger = require('../../utils/logger');

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * POST /finance/accounts
 * Create a new Account.
 * Body: { name, type, paymentMethod, bankName, openingBalance, openingDate, settlementDays, description, locationId, sortOrder }
 */
async function createAccount(req, res, next) {
  try {
    const tenantId = req.user.tenantId;
    const {
      name, type = 'bank',
      paymentMethod, bankName,
      openingBalance = 0, openingDate,
      settlementDays = 0,
      description, locationId, sortOrder = 0,
    } = req.body;

    if (!name) return next(createError('VALIDATION_ERROR', 'name wajib diisi', 400));
    if (!openingDate) return next(createError('VALIDATION_ERROR', 'openingDate wajib diisi (YYYY-MM-DD)', 400));

    const normalizedBank = bankName ? String(bankName).trim().toUpperCase() : null;
    const resolvedType = type || (normalizedBank ? 'bank' : (paymentMethod || 'custom'));

    // Bank accounts: one per bank — paymentMethod left null so all methods with that bank match
    if (resolvedType === 'bank' && !normalizedBank) {
      return next(createError('VALIDATION_ERROR', 'bankName wajib diisi untuk akun bank (BCA, MANDIRI, dll)', 400));
    }

    // Cash account: only one active cash account per tenant
    if (resolvedType === 'cash') {
      const existingCash = await Account.findOne({
        where: { tenantId, type: 'cash', isActive: true },
      });
      if (existingCash) {
        return next(createError(
          'VALIDATION_ERROR',
          `Akun Tunai sudah ada (${existingCash.name}). Gunakan akun tersebut.`,
          400
        ));
      }
    }

    // Main vault: only one active Brankas Utama per tenant
    if (resolvedType === 'main_vault') {
      const existingVault = await Account.findOne({
        where: { tenantId, type: 'main_vault', isActive: true },
      });
      if (existingVault) {
        return next(createError(
          'VALIDATION_ERROR',
          `Brankas Utama sudah ada (${existingVault.name}). Gunakan akun tersebut.`,
          400
        ));
      }
    }

    if (normalizedBank) {
      const existingBank = await Account.findOne({
        where: { tenantId, bankName: normalizedBank, isActive: true },
      });
      if (existingBank) {
        return next(createError(
          'VALIDATION_ERROR',
          `Akun bank ${normalizedBank} sudah ada (${existingBank.name}). Semua payment method dengan bank ${normalizedBank} masuk ke akun tersebut.`,
          400
        ));
      }
    }

    const account = await db.transaction(async (t) => {
      const isBank = resolvedType === 'bank' || !!normalizedBank;
      const isCash = resolvedType === 'cash';
      const isMainVault = resolvedType === 'main_vault';
      const acc = await Account.create({
        tenantId,
        name,
        type: isBank ? 'bank' : resolvedType,
        // Bank: matched by bankName only.
        // Cash + Main Vault: paymentMethod = cash (expense mapping); excluded from method unique index.
        paymentMethod: isBank
          ? null
          : ((isCash || isMainVault) ? 'cash' : (paymentMethod || null)),
        bankName: isBank ? normalizedBank : null,
        openingBalance: parseFloat(openingBalance),
        openingDate,
        balance: 0, // createEntry will set this correctly via balanceBefore + amount
        settlementDays: parseInt(settlementDays) || 0,
        description, locationId, sortOrder,
        createdBy: req.user.id,
      }, { transaction: t });

      // Seed opening balance entry — this also updates account.balance
      if (parseFloat(openingBalance) !== 0) {
        const tz = getTenantTimezone(req);
        await accountService.createEntry({
          accountId: acc.id,
          tenantId,
          type: 'opening',
          amount: Math.abs(parseFloat(openingBalance)),
          description: `Saldo awal per ${openingDate}`,
          entryDate: openingDate,
          performedBy: req.user.id,
          timezone: tz,
        }, t);
      }

      return acc.reload({ transaction: t });
    });

    return res.status(201).json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /finance/accounts
 * List all accounts for the tenant.
 */
async function getAllAccounts(req, res, next) {
  try {
    const tenantId = req.user.tenantId;
    const { type, isActive, paymentMethod } = req.query;

    const where = { tenantId };
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (paymentMethod) where.paymentMethod = paymentMethod;

    const accounts = await Account.findAll({
      where,
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
    });

    return res.json({ success: true, data: accounts });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /finance/accounts/:id
 */
async function getAccountById(req, res, next) {
  try {
    const account = await Account.findOne({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    });
    if (!account) return next(createError('NOT_FOUND', 'Account tidak ditemukan', 404));
    return res.json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /finance/accounts/:id
 */
async function updateAccount(req, res, next) {
  try {
    const account = await Account.findOne({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    });
    if (!account) return next(createError('NOT_FOUND', 'Account tidak ditemukan', 404));

    const allowed = ['name', 'description', 'sortOrder', 'isActive', 'settlementDays', 'locationId'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (req.body.bankName !== undefined) {
      updates.bankName = req.body.bankName ? String(req.body.bankName).trim().toUpperCase() : null;
    }

    await account.update(updates);
    return res.json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /finance/accounts/:id
 * Soft-delete only if balance is zero.
 */
async function deleteAccount(req, res, next) {
  try {
    const account = await Account.findOne({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    });
    if (!account) return next(createError('NOT_FOUND', 'Account tidak ditemukan', 404));

    if (parseFloat(account.balance) !== 0) {
      return next(createError('VALIDATION_ERROR', 'Tidak bisa hapus akun dengan saldo bukan nol', 400));
    }

    await account.destroy();
    return res.json({ success: true, message: 'Account dihapus' });
  } catch (err) {
    next(err);
  }
}

// ─── Ledger / Statement ───────────────────────────────────────────────────────

/**
 * GET /finance/accounts/:id/entries
 * Query: startDate, endDate, type, status, page, limit
 */
async function getAccountEntries(req, res, next) {
  try {
    const tenantId = req.user.tenantId;
    const account = await Account.findOne({
      where: { id: req.params.id, tenantId },
    });
    if (!account) return next(createError('NOT_FOUND', 'Account tidak ditemukan', 404));

    const { startDate, endDate, type, status } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    const offset = (page - 1) * limit;

    const where = { accountId: account.id };
    if (startDate) where.entryDate = { ...where.entryDate, [Op.gte]: startDate };
    if (endDate)   where.entryDate = { ...where.entryDate, [Op.lte]: endDate };
    if (type)      where.type   = type;
    if (status)    where.status = status;

    const { count, rows } = await AccountEntry.findAndCountAll({
      where,
      order: [['entryDate', 'DESC'], ['createdAt', 'DESC']],
      limit,
      offset,
    });

    // Enrich Expense-linked entries that are missing a proper title in description
    const expenseIds = [...new Set(
      rows
        .filter((e) => e.referenceType === 'Expense' && e.referenceId)
        .filter((e) => !e.description || e.description === 'Pengeluaran: -' || e.description === '-')
        .map((e) => e.referenceId)
    )];

    let expenseTitleById = {};
    if (expenseIds.length) {
      const { Expense } = require('../../models');
      const expenses = await Expense.findAll({
        where: { id: { [Op.in]: expenseIds } },
        attributes: ['id', 'title', 'expenseNumber'],
      });
      expenseTitleById = Object.fromEntries(
        expenses.map((exp) => [exp.id, exp.title || exp.expenseNumber || null])
      );
    }

    const data = rows.map((row) => {
      const json = row.toJSON();
      if (json.referenceType === 'Expense' && json.referenceId) {
        const title = expenseTitleById[json.referenceId];
        if (title && (!json.description || json.description === 'Pengeluaran: -' || json.description === '-')) {
          json.description = `Pengeluaran: ${title}`;
        }
      }
      return json;
    });

    return res.json({
      success: true,
      data,
      meta: { total: count, page, limit, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /finance/accounts/:id/balance
 * Returns current balance + pending settlement total.
 */
async function getAccountBalance(req, res, next) {
  try {
    const account = await Account.findOne({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    });
    if (!account) return next(createError('NOT_FOUND', 'Account tidak ditemukan', 404));

    const pending = await AccountEntry.sum('amount', {
      where: { accountId: account.id, status: 'pending_settlement' },
    }) || 0;

    return res.json({
      success: true,
      data: {
        id: account.id,
        name: account.name,
        balance: parseFloat(account.balance),
        pendingSettlement: parseFloat(pending),
        projectedBalance: parseFloat(account.balance) + parseFloat(pending),
        currency: account.currency,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Manual Adjustment ────────────────────────────────────────────────────────

/**
 * POST /finance/accounts/:id/adjustment
 * Body: { type: 'adjustment_credit'|'adjustment_debit', amount, description }
 */
async function createAdjustment(req, res, next) {
  try {
    const tenantId = req.user.tenantId;
    const account = await Account.findOne({
      where: { id: req.params.id, tenantId },
    });
    if (!account) return next(createError('NOT_FOUND', 'Account tidak ditemukan', 404));

    const { type, amount, description } = req.body;
    if (!['adjustment_credit', 'adjustment_debit'].includes(type)) {
      return next(createError('VALIDATION_ERROR', 'type harus adjustment_credit atau adjustment_debit', 400));
    }
    if (!amount || parseFloat(amount) <= 0) {
      return next(createError('VALIDATION_ERROR', 'amount harus positif', 400));
    }

    const tz = getTenantTimezone(req);
    const result = await accountService.createEntry({
      accountId: account.id,
      tenantId,
      type,
      amount: parseFloat(amount),
      description: description || `Penyesuaian manual`,
      performedBy: req.user.id,
      timezone: tz,
    });

    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /finance/accounts/transfer
 * Body: { fromAccountId, toAccountId, amount, entryDate?, notes? }
 * Fase 1: Tunai (cash) → Brankas Utama (main_vault)
 */
async function transferBetweenAccounts(req, res, next) {
  try {
    const tenantId = req.user.tenantId;
    const { fromAccountId, toAccountId, amount, entryDate, notes } = req.body;

    if (!fromAccountId || !toAccountId) {
      return next(createError('VALIDATION_ERROR', 'fromAccountId dan toAccountId wajib diisi', 400));
    }
    if (!amount || parseFloat(amount) <= 0) {
      return next(createError('VALIDATION_ERROR', 'amount harus positif', 400));
    }

    const tz = getTenantTimezone(req);
    const result = await accountService.transferBetweenAccounts({
      tenantId,
      fromAccountId,
      toAccountId,
      amount: parseFloat(amount),
      entryDate,
      notes,
      performedBy: req.user.id,
      timezone: tz,
    });

    logger.logInfo('Account transfer completed', {
      action: 'ACCOUNT_TRANSFER',
      userId: req.user.id,
      tenantId,
      transferId: result.transferId,
      amount: result.amount,
      fromAccountId,
      toAccountId,
    });

    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (err.status) {
      return next(createError(
        err.status === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR',
        err.message,
        err.status
      ));
    }
    next(err);
  }
}

// ─── Settlement trigger (admin / cron) ───────────────────────────────────────

/**
 * POST /finance/accounts/process-settlements
 * Manually trigger settlement processing (also runs via nightly cron).
 */
async function processSettlements(req, res, next) {
  try {
    const tenantId = req.user.tenantId;
    const tz = getTenantTimezone(req);
    const count = await accountService.processPendingSettlements(tenantId, tz);
    return res.json({ success: true, settled: count });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createAccount,
  getAllAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
  getAccountEntries,
  getAccountBalance,
  createAdjustment,
  transferBetweenAccounts,
  processSettlements,
};
