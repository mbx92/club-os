'use strict';

const { randomUUID } = require('crypto');
const { Op } = require('sequelize');
const { Account, AccountEntry, sequelize: db } = require('../models');
const { getTenantTimezone, todayInTz } = require('../utils/tenantTimezone');
const logger = require('../utils/logger');

// ─── Constants ──────────────────────────────────────────────────────────────

const INFLOW_TYPES = new Set([
  'opening', 'inflow', 'transfer_in', 'settlement', 'adjustment_credit',
]);
const OUTFLOW_TYPES = new Set([
  'outflow', 'transfer_out', 'adjustment_debit',
]);

// Payment methods that should NOT be auto-matched to an Account on payment.
// Cash stays in the cash drawer until collected/settled into Account type=cash.
const EXCLUDED_PAYMENT_METHODS = new Set(['cash', 'compliment']);

// ─── Auto-match ─────────────────────────────────────────────────────────────

/**
 * Find the Account that should receive a TransactionPayment.
 *
 * Matching priority (bank-first):
 *   1. Bank account → paymentDetails.bank matches Account.bankName
 *      (QRIS BCA, Transfer BCA, Kartu BCA all go to the same "BCA" account)
 *   2. Method catch-all → paymentMethod matches + bankName IS NULL
 *      (e_wallet / payment_gateway without bank details)
 *   3. null → no account configured
 *
 * @param {string}      tenantId
 * @param {string}      paymentMethod  e.g. 'qris', 'bank_transfer'
 * @param {string|null} bankName       e.g. 'BCA', 'MANDIRI' — from paymentDetails.bank
 * @returns {Promise<Account|null>}
 */
async function findMatchingAccount(tenantId, paymentMethod, bankName = null) {
  if (!tenantId) return null;
  if (paymentMethod && EXCLUDED_PAYMENT_METHODS.has(paymentMethod)) return null;

  const normalizedBank = bankName ? String(bankName).trim().toUpperCase() : null;

  // 1. Bank-first: all payment methods with the same bank details share one account
  if (normalizedBank) {
    const byBank = await Account.findOne({
      where: { tenantId, bankName: normalizedBank, isActive: true },
    });
    if (byBank) return byBank;
  }

  // 2. Method-only catch-all (no bank details) — e.g. e_wallet, payment_gateway
  if (paymentMethod) {
    const byMethod = await Account.findOne({
      where: { tenantId, paymentMethod, bankName: null, isActive: true },
    });
    if (byMethod) return byMethod;
  }

  return null;
}

// ─── Entry number sequence ───────────────────────────────────────────────────

async function generateEntryNumber(tenantId, t) {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `ACE-${ym}-`;

  const last = await AccountEntry.findOne({
    where: { tenantId, entryNumber: { [Op.like]: `${prefix}%` } },
    order: [['entryNumber', 'DESC']],
    transaction: t,
  });

  const seq = last
    ? String(parseInt(last.entryNumber.slice(-4), 10) + 1).padStart(4, '0')
    : '0001';
  return `${prefix}${seq}`;
}

// ─── Core ledger entry ───────────────────────────────────────────────────────

/**
 * Create an AccountEntry and update Account.balance atomically.
 *
 * Call inside your own transaction, or pass null to let this function
 * create a managed transaction.
 *
 * @param {object} opts
 * @param {string}  opts.accountId
 * @param {string}  opts.tenantId
 * @param {string}  opts.type          One of the ENUM values
 * @param {number}  opts.amount        Always positive
 * @param {string}  [opts.referenceType]
 * @param {string}  [opts.referenceId]
 * @param {string}  [opts.description]
 * @param {string}  [opts.entryDate]   YYYY-MM-DD; defaults to today (tenant tz)
 * @param {string}  [opts.settlementDate] YYYY-MM-DD; for pending_settlement entries
 * @param {string}  [opts.performedBy] userId
 * @param {object}  [opts.timezone]    Tenant timezone string
 * @param {object}  [externalTransaction] Sequelize transaction
 * @returns {Promise<{entry: AccountEntry, account: Account}>}
 */
async function createEntry(opts, externalTransaction = null) {
  const run = async (t) => {
    const {
      accountId, tenantId, type, amount,
      referenceType, referenceId, description,
      entryDate, settlementDate, performedBy, timezone,
    } = opts;

    if (!INFLOW_TYPES.has(type) && !OUTFLOW_TYPES.has(type)) {
      throw new Error(`Invalid entry type: ${type}`);
    }
    if (!amount || amount <= 0) {
      throw new Error(`Entry amount must be positive, got: ${amount}`);
    }

    // Lock the account row for this update
    const account = await Account.findOne({
      where: { id: accountId, tenantId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (!account) throw new Error(`Account ${accountId} not found`);

    const today = entryDate || todayInTz(timezone || 'Asia/Makassar');
    const balanceBefore = parseFloat(account.balance);
    const delta = INFLOW_TYPES.has(type) ? +amount : -amount;
    const balanceAfter = parseFloat((balanceBefore + delta).toFixed(2));

    const isPendingSettlement = !!settlementDate;
    const status = isPendingSettlement ? 'pending_settlement' : 'completed';

    const entryNumber = await generateEntryNumber(tenantId, t);

    const entry = await AccountEntry.create({
      tenantId,
      accountId,
      entryNumber,
      type,
      amount: parseFloat(amount),
      balanceBefore,
      // For pending entries the balance is only updated when settled
      balanceAfter: isPendingSettlement ? balanceBefore : balanceAfter,
      referenceType: referenceType || null,
      referenceId: referenceId || null,
      description: description || null,
      entryDate: today,
      settlementDate: settlementDate || null,
      status,
      performedBy: performedBy || null,
    }, { transaction: t });

    // Only update the live balance for completed entries
    if (!isPendingSettlement) {
      await account.update(
        { balance: balanceAfter, version: account.version + 1 },
        { transaction: t }
      );
    }

    return { entry, account };
  };

  if (externalTransaction) return run(externalTransaction);
  return db.transaction(run);
}

// ─── Settlement processing ───────────────────────────────────────────────────

/**
 * Settle all pending AccountEntries whose settlementDate <= today.
 * Typically called by a nightly cron job or on-demand from admin.
 *
 * @param {string} tenantId
 * @param {string} [timezone]
 * @returns {Promise<number>} Number of entries settled
 */
async function processPendingSettlements(tenantId, timezone = 'Asia/Makassar') {
  const today = todayInTz(timezone);

  const pending = await AccountEntry.findAll({
    where: {
      tenantId,
      status: 'pending_settlement',
      settlementDate: { [Op.lte]: today },
    },
    include: [{ model: Account, as: 'account' }],
  });

  let count = 0;
  for (const entry of pending) {
    await db.transaction(async (t) => {
      const account = await Account.findOne({
        where: { id: entry.accountId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (!account) return;

      const balanceBefore = parseFloat(account.balance);
      const delta = INFLOW_TYPES.has(entry.type) ? +entry.amount : -entry.amount;
      const balanceAfter = parseFloat((balanceBefore + delta).toFixed(2));

      await entry.update(
        { status: 'completed', balanceAfter },
        { transaction: t }
      );
      await account.update(
        { balance: balanceAfter, version: account.version + 1 },
        { transaction: t }
      );
    });
    count++;
  }

  if (count > 0) {
    logger.logInfo('Pending settlements processed', { action: 'PROCESS_SETTLEMENTS', tenantId, count });
  }
  return count;
}

/**
 * Process due pending settlements for every tenant that has any.
 * Used by the nightly cron job.
 *
 * @returns {Promise<{tenantsProcessed: number, settled: number}>}
 */
async function processAllPendingSettlements() {
  const { Tenant } = require('../models');

  const rows = await AccountEntry.findAll({
    where: { status: 'pending_settlement' },
    attributes: ['tenantId'],
    group: ['tenantId'],
    raw: true,
  });

  const tenantIds = [...new Set(rows.map((r) => r.tenantId).filter(Boolean))];

  let settled = 0;
  for (const tenantId of tenantIds) {
    let timezone = 'Asia/Makassar';
    try {
      const tenant = await Tenant.findByPk(tenantId, { attributes: ['id', 'settings'] });
      timezone = tenant?.settings?.timezone || timezone;
    } catch {
      // keep default
    }
    settled += await processPendingSettlements(tenantId, timezone);
  }

  return { tenantsProcessed: tenantIds.length, settled };
}

// ─── TransactionPayment auto-credit ──────────────────────────────────────────

/**
 * Called after a TransactionPayment status transitions to 'completed'.
 * Finds the matching Account and creates an AccountEntry (or pending_settlement
 * if settlementDays > 0).
 *
 * Cash payments (paymentMethod = 'cash') are handled by CashRegisterSession
 * and must NOT be passed here.
 *
 * @param {object} payment   TransactionPayment instance
 * @param {object} opts
 * @param {string} opts.tenantId
 * @param {string} opts.timezone
 * @param {string} [opts.performedBy]
 * @param {object} [t]       Sequelize transaction
 * @returns {Promise<{entry: AccountEntry, account: Account}|null>}
 */
async function creditFromPayment(payment, opts, t = null) {
  const { tenantId, timezone, performedBy } = opts;

  const bankName = payment.paymentDetails?.bank
    || payment.paymentDetails?.bankName
    || null;

  const account = await findMatchingAccount(tenantId, payment.paymentMethod, bankName);
  if (!account) return null;

  const today = todayInTz(timezone);

  // Determine settlement date
  let settlementDate = null;
  if (account.settlementDays > 0) {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + account.settlementDays);
    settlementDate = d.toISOString().slice(0, 10);
  }

  // Net cash: amount already reflects the net value from the transaction layer
  // (e.g. 80k for a 100k sale with 20k change — handled before this call)
  const result = await createEntry({
    accountId: account.id,
    tenantId,
    type: settlementDate ? 'settlement' : 'inflow',
    amount: parseFloat(payment.amount),
    referenceType: 'TransactionPayment',
    referenceId: payment.id,
    description: `Pembayaran ${payment.paymentMethod}${bankName ? ` ${bankName}` : ''} — ${payment.receiptNumber || payment.id}`,
    entryDate: today,
    settlementDate,
    performedBy,
    timezone,
  }, t);

  // Link payment → account
  await payment.update({ accountId: account.id }, { transaction: t });

  return result;
}

/**
 * Reverse Account credits created by creditFromPayment when a transaction
 * is cancelled or refunded.
 *
 * - Completed inflow/settlement → create matching outflow
 * - Pending settlement (T+N, balance not yet credited) → soft-delete the pending entry
 *
 * Cash / compliment payments are skipped (never credited Account).
 *
 * @param {object} payment  TransactionPayment instance (or plain object with id)
 * @param {object} opts
 * @param {string} opts.tenantId
 * @param {string} opts.timezone
 * @param {string} [opts.performedBy]
 * @param {string} [opts.reason]
 * @param {object} [t]
 * @returns {Promise<Array>}
 */
async function reversePaymentCredit(payment, opts, t = null) {
  if (!payment?.id) return [];

  const pm = String(payment.paymentMethod || '').toLowerCase();
  if (EXCLUDED_PAYMENT_METHODS.has(pm)) return [];

  const { tenantId, timezone, performedBy, reason } = opts;
  const today = todayInTz(timezone);

  const run = async (trx) => {
    const entries = await AccountEntry.findAll({
      where: {
        tenantId,
        referenceType: 'TransactionPayment',
        referenceId: payment.id,
        type: { [Op.in]: ['inflow', 'settlement'] },
        status: { [Op.in]: ['completed', 'pending_settlement'] },
      },
      lock: trx.LOCK.UPDATE,
      transaction: trx,
    });

    const results = [];
    for (const entry of entries) {
      if (entry.status === 'pending_settlement') {
        // Balance was never credited — remove so cron won't settle it
        await entry.destroy({ transaction: trx });
        results.push({ action: 'deleted_pending', entryId: entry.id, amount: parseFloat(entry.amount) });
        continue;
      }

      const amount = parseFloat(entry.amount || 0);
      if (amount <= 0) continue;

      const reversed = await createEntry({
        accountId: entry.accountId,
        tenantId,
        type: 'outflow',
        amount,
        referenceType: 'TransactionPayment',
        referenceId: payment.id,
        description: `Batal/refund pembayaran${reason ? `: ${reason}` : ''} — ${payment.receiptNumber || payment.id}`,
        entryDate: today,
        performedBy,
        timezone,
      }, trx);

      results.push({ action: 'outflow', ...reversed });
    }

    return results;
  };

  if (t) return run(t);
  return db.transaction(run);
}

// ─── Expense deduction ───────────────────────────────────────────────────────

/**
 * Called when an Expense is marked as paid and has an accountId.
 *
 * @param {object} expense   Expense instance
 * @param {object} opts
 * @param {string} opts.tenantId
 * @param {string} opts.timezone
 * @param {string} [opts.performedBy]
 * @param {object} [t]       Sequelize transaction
 * @returns {Promise<{entry: AccountEntry, account: Account}|null>}
 */
async function debitFromExpense(expense, opts, t = null) {
  if (!expense?.accountId) return null;

  const { tenantId, timezone, performedBy } = opts;
  const today = todayInTz(timezone);

  // Prefer fields on the payload; reload from DB if title is missing
  let title = expense.title
    || expense.description
    || (typeof expense.category === 'string' ? expense.category : expense.category?.name)
    || expense.expenseNumber
    || null;

  if (!title && expense.id) {
    const { Expense } = require('../models');
    const fresh = await Expense.findByPk(expense.id, {
      attributes: ['id', 'title', 'description', 'expenseNumber'],
      transaction: t || undefined,
    });
    if (fresh) {
      title = fresh.title || fresh.description || fresh.expenseNumber || null;
      expense = { ...expense, ...fresh.toJSON() };
    }
  }

  return createEntry({
    accountId: expense.accountId,
    tenantId,
    type: 'outflow',
    amount: parseFloat(expense.totalAmount || expense.amount),
    referenceType: 'Expense',
    referenceId: expense.id,
    description: `Pengeluaran: ${title || '-'}`,
    entryDate: expense.expenseDate || today,
    performedBy,
    timezone,
  }, t);
}

/**
 * Reverse an expense debit when the expense is reopened (paid → pending).
 * Credits the account balance back and records an inflow mutation.
 *
 * @param {object} expense
 * @param {object} opts
 * @param {string} opts.tenantId
 * @param {string} opts.timezone
 * @param {string} [opts.performedBy]
 * @param {string} [opts.reason]
 * @param {object} [t]
 */
async function creditFromExpenseReversal(expense, opts, t = null) {
  if (!expense?.accountId) return null;

  const { tenantId, timezone, performedBy, reason } = opts;
  const today = todayInTz(timezone);
  const amount = parseFloat(expense.totalAmount || expense.amount || 0);
  if (!amount || amount <= 0) return null;

  const title = expense.title
    || expense.description
    || expense.expenseNumber
    || '-';

  const reasonSuffix = reason ? ` (${reason})` : '';

  return createEntry({
    accountId: expense.accountId,
    tenantId,
    type: 'inflow',
    amount,
    referenceType: 'Expense',
    referenceId: expense.id,
    description: `Reopen pengeluaran: ${title}${reasonSuffix}`,
    entryDate: today,
    performedBy,
    timezone,
  }, t);
}

/**
 * Find the active cash (tunai) Account for a tenant.
 * @param {string} tenantId
 * @param {object} [t]
 * @returns {Promise<Account|null>}
 */
async function findCashAccount(tenantId, t = null) {
  return Account.findOne({
    where: { tenantId, type: 'cash', isActive: true },
    order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    transaction: t || undefined,
  });
}

/**
 * Settle cash from the cash drawer into the finance cash Account.
 * Called when cash is collected from a closed shift (drawer → setoran).
 * POS cash itself never credits Account — only this settlement does.
 *
 * @param {object} opts
 * @param {string} opts.tenantId
 * @param {number} opts.amount
 * @param {string} [opts.accountId]        Preferred cash Account; falls back to findCashAccount
 * @param {string} [opts.entryDate]
 * @param {string} [opts.description]
 * @param {string} [opts.referenceType]    e.g. CashMutation / CashRegisterSession
 * @param {string} [opts.referenceId]
 * @param {string} [opts.performedBy]
 * @param {string} [opts.timezone]
 * @param {object} [t]
 * @returns {Promise<{entry: AccountEntry, account: Account}|null>}
 */
async function creditFromCashCollect(opts, t = null) {
  const {
    tenantId,
    amount,
    accountId = null,
    entryDate,
    description,
    referenceType = 'CashMutation',
    referenceId = null,
    performedBy,
    timezone,
  } = opts;

  const cashAmount = parseFloat(amount);
  if (!tenantId || !cashAmount || cashAmount <= 0) return null;

  let account = null;
  if (accountId) {
    account = await Account.findOne({
      where: { id: accountId, tenantId, type: 'cash', isActive: true },
      transaction: t || undefined,
    });
  }
  if (!account) {
    account = await findCashAccount(tenantId, t);
  }
  if (!account) {
    logger.logInfo('No cash Account configured — skip drawer settlement credit', {
      action: 'CASH_COLLECT_NO_ACCOUNT',
      tenantId,
      amount: cashAmount,
    });
    return null;
  }

  return createEntry({
    accountId: account.id,
    tenantId,
    type: 'settlement',
    amount: cashAmount,
    referenceType,
    referenceId,
    description: description || 'Setoran kas dari laci kasir',
    entryDate,
    performedBy,
    timezone,
  }, t);
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Recalculate and correct an Account's balance from all completed entries.
 * Use only in audits / data-fix scripts.
 *
 * @param {string} accountId
 * @returns {Promise<{before: number, after: number}>}
 */
async function recalculateBalance(accountId) {
  const account = await Account.findByPk(accountId);
  if (!account) throw new Error(`Account ${accountId} not found`);

  const inflowResult = await AccountEntry.findOne({
    attributes: [[db.fn('COALESCE', db.fn('SUM', db.col('amount')), 0), 'total']],
    where: {
      accountId,
      type: { [Op.in]: [...INFLOW_TYPES] },
      status: 'completed',
    },
    raw: true,
  });

  const outflowResult = await AccountEntry.findOne({
    attributes: [[db.fn('COALESCE', db.fn('SUM', db.col('amount')), 0), 'total']],
    where: {
      accountId,
      type: { [Op.in]: [...OUTFLOW_TYPES] },
      status: 'completed',
    },
    raw: true,
  });

  const inflow = parseFloat(inflowResult?.total || 0);
  const outflow = parseFloat(outflowResult?.total || 0);
  const correctedBalance = parseFloat((inflow - outflow).toFixed(2));

  const before = parseFloat(account.balance);
  await account.update({ balance: correctedBalance, version: account.version + 1 });

  return { before, after: correctedBalance };
}

/**
 * Transfer balance between Accounts (Tunai → Brankas Utama).
 * Creates paired transfer_out + transfer_in entries atomically.
 *
 * @param {object} opts
 * @param {string} opts.tenantId
 * @param {string} opts.fromAccountId
 * @param {string} opts.toAccountId
 * @param {number} opts.amount
 * @param {string} [opts.entryDate]
 * @param {string} [opts.notes]
 * @param {string} [opts.performedBy]
 * @param {string} [opts.timezone]
 * @param {object} [externalTransaction]
 */
async function transferBetweenAccounts(opts, externalTransaction = null) {
  const {
    tenantId,
    fromAccountId,
    toAccountId,
    amount,
    entryDate,
    notes,
    performedBy,
    timezone,
  } = opts;

  const parsedAmount = parseFloat(amount);
  if (!fromAccountId || !toAccountId) {
    throw Object.assign(new Error('fromAccountId dan toAccountId wajib diisi'), { status: 400 });
  }
  if (fromAccountId === toAccountId) {
    throw Object.assign(new Error('Akun sumber dan tujuan tidak boleh sama'), { status: 400 });
  }
  if (!parsedAmount || parsedAmount <= 0) {
    throw Object.assign(new Error('amount harus positif'), { status: 400 });
  }

  const run = async (t) => {
    const fromAccount = await Account.findOne({
      where: { id: fromAccountId, tenantId, isActive: true },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    const toAccount = await Account.findOne({
      where: { id: toAccountId, tenantId, isActive: true },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!fromAccount) {
      throw Object.assign(new Error('Akun sumber tidak ditemukan'), { status: 404 });
    }
    if (!toAccount) {
      throw Object.assign(new Error('Akun tujuan tidak ditemukan'), { status: 404 });
    }
    if (fromAccount.type !== 'cash') {
      throw Object.assign(new Error('Mutasi ke Brankas Utama hanya bisa dari akun Tunai'), { status: 400 });
    }
    if (toAccount.type !== 'main_vault') {
      throw Object.assign(new Error('Akun tujuan harus Brankas Utama'), { status: 400 });
    }
    if (parseFloat(fromAccount.balance) < parsedAmount) {
      throw Object.assign(
        new Error(`Saldo Tunai tidak cukup. Saldo: ${fromAccount.balance}, diminta: ${parsedAmount}`),
        { status: 400 }
      );
    }

    const transferId = randomUUID();
    const date = entryDate || todayInTz(timezone || 'Asia/Makassar');
    const description = notes?.trim()
      ? notes.trim()
      : `Mutasi Tunai → ${toAccount.name}`;

    const outResult = await createEntry({
      accountId: fromAccount.id,
      tenantId,
      type: 'transfer_out',
      amount: parsedAmount,
      referenceType: 'AccountTransfer',
      referenceId: transferId,
      description,
      entryDate: date,
      performedBy,
      timezone,
    }, t);

    const inResult = await createEntry({
      accountId: toAccount.id,
      tenantId,
      type: 'transfer_in',
      amount: parsedAmount,
      referenceType: 'AccountTransfer',
      referenceId: transferId,
      description: notes?.trim()
        ? notes.trim()
        : `Mutasi dari ${fromAccount.name}`,
      entryDate: date,
      performedBy,
      timezone,
    }, t);

    return {
      transferId,
      amount: parsedAmount,
      entryDate: date,
      from: {
        account: outResult.account,
        entry: outResult.entry,
      },
      to: {
        account: inResult.account,
        entry: inResult.entry,
      },
    };
  };

  if (externalTransaction) return run(externalTransaction);
  return db.transaction(run);
}

module.exports = {
  findMatchingAccount,
  findCashAccount,
  createEntry,
  creditFromPayment,
  creditFromCashCollect,
  reversePaymentCredit,
  debitFromExpense,
  creditFromExpenseReversal,
  processPendingSettlements,
  processAllPendingSettlements,
  recalculateBalance,
  transferBetweenAccounts,
  EXCLUDED_PAYMENT_METHODS,
};
