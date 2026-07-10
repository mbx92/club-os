'use strict';

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

// Payment methods that should NOT be auto-matched to an Account
// (they are handled by CashRegisterSession or VaultAccount instead)
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

  logger.info('Pending settlements processed', { tenantId, count });
  return count;
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

module.exports = {
  findMatchingAccount,
  createEntry,
  creditFromPayment,
  debitFromExpense,
  processPendingSettlements,
  recalculateBalance,
  EXCLUDED_PAYMENT_METHODS,
};
