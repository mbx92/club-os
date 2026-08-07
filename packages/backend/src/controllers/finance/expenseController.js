'use strict';

/**
 * Expense Management Controller
 * 
 * Handles CRUD operations for expenses
 * 
 * @module controllers/finance/expenseController
 */

const { Expense, ExpenseCategory, User, Location, PettyCash, PettyCashTransaction, VaultAccount, CashMutation, Account, CashRegisterSession, sequelize } = require('../../models');
const { Op, Transaction: SequelizeTransaction, fn, col } = require('sequelize');
const logger = require('../../utils/logger');
const { getClientIp, getUserAgent } = require('../../utils/requestHelper');
const { generateUniqueSequence, withRetry } = require('../../utils/concurrency');
const { buildOptionalDateRangeFilter } = require('../../utils/dateRange');
const accountService = require('../../services/accountService');
const { getTenantTimezone, todayInTz } = require('../../utils/tenantTimezone');
const { getRoleName } = require('../../utils/rbacUtils');

/** Apakah kombinasi fundSource/paymentMethod ini berarti dibayar dari laci kasir? */
function isCashDrawerFundSource({ fundSource, paymentMethod, accountId, vaultAccountId }) {
  const fs = String(fundSource || '').toLowerCase();
  if (fs === 'cash_drawer') return true;
  if (fs) return false;
  if (accountId || vaultAccountId) return false;
  return String(paymentMethod || '').toLowerCase() === 'cash';
}

async function generateCashMutationNumber(tenantId, transaction) {
  const year = new Date().getFullYear();
  const prefix = `CM-${year}-`;
  const lastMutation = await CashMutation.findOne({
    where: {
      tenantId,
      mutationNumber: { [Op.like]: `${prefix}%` },
    },
    order: [['mutationNumber', 'DESC']],
    paranoid: false,
    transaction,
  });
  let sequence = 1;
  if (lastMutation) {
    const lastSeq = parseInt(lastMutation.mutationNumber.split('-')[2], 10);
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }
  return `${prefix}${String(sequence).padStart(6, '0')}`;
}

function computeCollectibleBase(session, modalReturned = 0) {
  const physicalCash = parseFloat(session.actualCash ?? session.closingBalance ?? 0) || 0;
  const opening = parseFloat(session.openingBalance || 0) || 0;
  const nonSettle = Math.max(opening, parseFloat(modalReturned || 0) || 0);
  return Math.max(0, parseFloat((physicalCash - nonSettle).toFixed(2)));
}

/**
 * Ambil sesi cash register yang sedang open (+ expectedCash).
 * Dipakai saat CREATE expense laci agar terikat ke shift sejak dibuat.
 */
async function resolveOpenDrawerSession(tenantId, locationId, transaction) {
  const where = { tenantId, status: 'open', deletedAt: null };
  if (locationId) where.locationId = locationId;
  const session = await CashRegisterSession.findOne({
    where,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
    transaction: transaction || undefined,
  });
  if (!session) return null;
  const { expectedCash } = await session.getCashSummary(transaction);
  return {
    session,
    expectedCash: parseFloat(expectedCash) || 0,
  };
}

/**
 * Setelah expense laci di-paid/reopen pada shift yang sudah closed:
 * sync ulang closingBalance + actualCash agar collectible ikut berkurang/bertambah.
 * Selisih (difference) dijaga dengan menggeser actualCash sebesar perubahan closing.
 */
async function syncClosedSessionCash(session, transaction) {
  if (!session || session.status !== 'closed') return null;

  const { expectedCash } = await session.getCashSummary(transaction);
  const tipping = parseFloat(session.tipping || 0);
  const closingBalance = parseFloat((expectedCash + tipping).toFixed(2));
  const oldClosing = parseFloat(session.closingBalance || 0);
  const oldActual = parseFloat(session.actualCash || 0);
  const closingDelta = parseFloat((oldClosing - closingBalance).toFixed(2));
  const actualCash = Math.max(0, parseFloat((oldActual - closingDelta).toFixed(2)));
  const difference = parseFloat((actualCash - closingBalance).toFixed(2));

  await session.update(
    { closingBalance, actualCash, difference },
    { transaction }
  );

  // Reload so callers see fresh values
  await session.reload({ transaction });

  return { closingBalance, actualCash, difference, cashExpenseDelta: closingDelta };
}

/**
 * Jika shift sudah di-collect melebihi collectible baru (karena expense baru di-paid),
 * kurangi "sudah diambil" lewat mutasi reverse + potong saldo vault & akun Tunai.
 */
async function clawbackOverCollected(session, {
  tenantId,
  userId,
  expense,
  timezone,
}, transaction) {
  if (!session || session.status !== 'closed') return null;

  const collectedResult = await CashMutation.findOne({
    where: {
      tenantId,
      shiftSessionId: session.id,
      mutationType: 'drawer_to_vault_transfer',
      status: 'posted',
    },
    attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
    raw: true,
    transaction,
  });
  const collected = parseFloat(collectedResult?.total || 0);
  const collectibleBase = computeCollectibleBase(session, 0);
  const overage = parseFloat((collected - collectibleBase).toFixed(2));
  if (overage <= 0) {
    return {
      collectedBefore: collected,
      collectibleBase,
      clawbackAmount: 0,
    };
  }

  // Ambil collect positif terbaru untuk tahu vault tujuan
  const sourceCollects = await CashMutation.findAll({
    where: {
      tenantId,
      shiftSessionId: session.id,
      mutationType: 'drawer_to_vault_transfer',
      status: 'posted',
      amount: { [Op.gt]: 0 },
    },
    order: [['mutationDate', 'DESC'], ['createdAt', 'DESC']],
    transaction,
  });

  let remainingOverage = overage;
  const clawbackMutations = [];
  const mutationDate = todayInTz(timezone);

  for (const src of sourceCollects) {
    if (remainingOverage <= 0) break;
    const available = parseFloat(src.amount || 0);
    if (available <= 0) continue;
    const take = Math.min(available, remainingOverage);
    const vaultAccountId = src.destinationVaultAccountId;

    if (vaultAccountId) {
      const vaultAccount = await VaultAccount.findOne({
        where: { id: vaultAccountId, tenantId },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });
      if (vaultAccount) {
        const newBal = Math.max(0, parseFloat((parseFloat(vaultAccount.balance || 0) - take).toFixed(2)));
        await vaultAccount.update({ balance: newBal }, { transaction });
      }
    }

    const mutationNumber = await generateCashMutationNumber(tenantId, transaction);
    const clawback = await CashMutation.create({
      tenantId,
      locationId: session.locationId || src.locationId || null,
      mutationNumber,
      sourceAccount: 'vault',
      destinationAccount: 'cash_drawer',
      sourceVaultAccountId: vaultAccountId || null,
      destinationVaultAccountId: null,
      amount: -take,
      mutationType: 'drawer_to_vault_transfer',
      referenceType: 'Expense',
      referenceId: expense.id,
      referenceNumber: expense.expenseNumber || null,
      shiftSessionId: session.id,
      status: 'posted',
      mutationDate,
      notes: `Penyesuaian collect — expense ${expense.expenseNumber || expense.title} dibayar setelah setoran`,
      metadata: {
        reason: 'expense_paid_after_collect',
        collectClawback: true,
        expenseId: expense.id,
        expenseAmount: parseFloat(expense.totalAmount || 0),
        collectibleBase,
        collectedBefore: collected,
        sourceCollectMutationId: src.id,
      },
      createdBy: userId,
    }, { transaction });

    clawbackMutations.push(clawback);
    remainingOverage = parseFloat((remainingOverage - take).toFixed(2));
  }

  // Sisa overage tanpa sumber vault spesifik — tetap catat agar "sudah diambil" turun
  if (remainingOverage > 0) {
    const mutationNumber = await generateCashMutationNumber(tenantId, transaction);
    const clawback = await CashMutation.create({
      tenantId,
      locationId: session.locationId || null,
      mutationNumber,
      sourceAccount: 'vault',
      destinationAccount: 'cash_drawer',
      sourceVaultAccountId: null,
      destinationVaultAccountId: null,
      amount: -remainingOverage,
      mutationType: 'drawer_to_vault_transfer',
      referenceType: 'Expense',
      referenceId: expense.id,
      referenceNumber: expense.expenseNumber || null,
      shiftSessionId: session.id,
      status: 'posted',
      mutationDate,
      notes: `Penyesuaian collect — expense ${expense.expenseNumber || expense.title} dibayar setelah setoran`,
      metadata: {
        reason: 'expense_paid_after_collect',
        collectClawback: true,
        expenseId: expense.id,
        expenseAmount: parseFloat(expense.totalAmount || 0),
        collectibleBase,
        collectedBefore: collected,
      },
      createdBy: userId,
    }, { transaction });
    clawbackMutations.push(clawback);
    remainingOverage = 0;
  }

  const clawbackAmount = parseFloat((overage - Math.max(0, remainingOverage)).toFixed(2));
  if (clawbackAmount > 0) {
    await accountService.debitFromCashCollectReversal({
      tenantId,
      amount: clawbackAmount,
      entryDate: mutationDate,
      description: `Penyesuaian setoran — expense ${expense.expenseNumber || expense.title} setelah collect`,
      referenceType: 'Expense',
      referenceId: expense.id,
      performedBy: userId,
      timezone,
    }, transaction);
  }

  return {
    collectedBefore: collected,
    collectibleBase,
    clawbackAmount,
    collectedAfter: parseFloat((collected - clawbackAmount).toFixed(2)),
    mutationIds: clawbackMutations.map((m) => m.id),
  };
}

/**
 * Batalkan clawback collect yang dibuat saat expense ini di-paid (untuk reopen).
 */
async function reverseCollectClawbacksForExpense(expense, {
  tenantId,
  userId,
  timezone,
}, transaction) {
  const clawbacks = await CashMutation.findAll({
    where: {
      tenantId,
      referenceType: 'Expense',
      referenceId: expense.id,
      mutationType: 'drawer_to_vault_transfer',
      status: 'posted',
      amount: { [Op.lt]: 0 },
    },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });

  if (!clawbacks.length) return null;

  let restored = 0;
  const mutationDate = todayInTz(timezone);

  for (const m of clawbacks) {
    const amount = Math.abs(parseFloat(m.amount || 0));
    if (amount <= 0) continue;

    if (m.sourceVaultAccountId) {
      const vaultAccount = await VaultAccount.findOne({
        where: { id: m.sourceVaultAccountId, tenantId },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });
      if (vaultAccount) {
        const newBal = parseFloat((parseFloat(vaultAccount.balance || 0) + amount).toFixed(2));
        await vaultAccount.update({ balance: newBal }, { transaction });
      }
    }

    await m.update({
      status: 'cancelled',
      notes: `${m.notes || ''}\n[reopen] Clawback dibatalkan`.trim(),
      metadata: {
        ...(m.metadata || {}),
        clawbackReversedAt: new Date().toISOString(),
        clawbackReversedBy: userId,
      },
    }, { transaction });

    restored = parseFloat((restored + amount).toFixed(2));
  }

  if (restored > 0) {
    await accountService.creditFromCashCollect({
      tenantId,
      amount: restored,
      entryDate: mutationDate,
      description: `Pulihkan setoran — reopen expense ${expense.expenseNumber || expense.title}`,
      referenceType: 'Expense',
      referenceId: expense.id,
      performedBy: userId,
      timezone,
    }, transaction);
  }

  return { restoredAmount: restored, cancelledMutationIds: clawbacks.map((m) => m.id) };
}

/**
 * Expense yang boleh dilihat kasir: dari laci (cash_drawer, termasuk legacy cash
 * tanpa fundSource/account) atau dari Petty Cash (berangkas kecil, entitas terpisah dari laci).
 */
function getCashierVisibleExpenseWhere() {
  return {
    [Op.or]: [
      { fundSource: 'cash_drawer' },
      { fundSource: 'petty_cash' },
      {
        paymentMethod: 'cash',
        accountId: { [Op.is]: null },
        vaultAccountId: { [Op.is]: null },
        fundSource: { [Op.is]: null },
      },
    ],
  };
}

function isCashierUser(user) {
  const role = getRoleName(user);
  return role === 'cashier' || role === 'kasir';
}

/** Cashier may only create/update expenses as draft or pending — no approve/paid. */
const CASHIER_ALLOWED_STATUSES = new Set(['draft', 'pending']);

function rejectCashierExpenseAction(res, actionLabel) {
  return res.status(403).json({
    success: false,
    code: 'FORBIDDEN',
    message: `Kasir tidak boleh ${actionLabel}. Status maksimal: pending.`,
  });
}

function isCashierVisibleExpenseRecord(expense) {
  const fundSource = String(expense?.fundSource || '').toLowerCase();
  if (fundSource === 'cash_drawer' || fundSource === 'petty_cash') return true;
  if (fundSource) return false;
  if (expense?.accountId || expense?.vaultAccountId) return false;
  return String(expense?.paymentMethod || '').toLowerCase() === 'cash';
}

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
    pettyCashId,
    fundSource,
    vaultAccountId,
    accountId = null,
  } = req.body;

  if (isCashierUser(req.user) && !CASHIER_ALLOWED_STATUSES.has(String(status || 'draft'))) {
    return rejectCashierExpenseAction(res, 'approve atau menandai paid');
  }

  // Validasi: jika langsung paid dengan petty_cash (legacy PettyCash model), pettyCashId wajib —
  // kecuali sudah pakai accountId (Petty Cash sebagai Account, entitas terpisah dari laci).
  if (status === 'paid' && paymentMethod === 'petty_cash' && !pettyCashId && !accountId) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'pettyCashId atau accountId wajib disertakan saat paymentMethod adalah petty_cash'
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

  // Validasi: account wajib jika fundSource = account/petty_cash dan langsung paid
  if (status === 'paid' && ['account', 'petty_cash'].includes(fundSource) && !accountId) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'accountId wajib disertakan saat fundSource adalah account atau petty_cash'
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

        // Expense laci terikat ke shift SEJAK dibuat (pending/draft/paid).
        // Paid boleh belakangan tanpa shift harus masih open.
        let drawerSessionId = null;
        let drawerLocationId = locationId || null;
        if (isCashDrawerFundSource({ fundSource, paymentMethod, accountId, vaultAccountId })) {
          const drawer = await resolveOpenDrawerSession(tenantId, locationId || null, transaction);
          if (!drawer) {
            await transaction.rollback();
            return { drawerSessionRequired: true };
          }
          if (status === 'paid') {
            const expenseAmount = parseFloat(amount) + parseFloat(taxAmount);
            if (drawer.expectedCash < expenseAmount) {
              await transaction.rollback();
              return {
                drawerInsufficientBalance: true,
                currentBalance: drawer.expectedCash,
                needed: expenseAmount,
              };
            }
          }
          drawerSessionId = drawer.session.id;
          if (!drawerLocationId && drawer.session.locationId) {
            drawerLocationId = drawer.session.locationId;
          }
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
          locationId: drawerLocationId,
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
          vaultAccountId: fundSource === 'vault' ? (vaultAccountId || null) : null,
          accountId: ['account', 'petty_cash'].includes(fundSource) ? (accountId || null) : null,
          cashRegisterSessionId: drawerSessionId,
          paidDate: status === 'paid' ? new Date() : null,
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

        // Jika langsung paid dari akun keuangan (Tunai/Brankas/Bank) atau Petty Cash, debit Account
        if (status === 'paid' && ['account', 'petty_cash'].includes(fundSource) && accountId) {
          const { Account } = require('../../models');
          const financeAccount = await Account.findOne({
            where: { id: accountId, tenantId, isActive: true },
            lock: transaction.LOCK.UPDATE,
            transaction,
          });
          if (!financeAccount) {
            await transaction.rollback();
            return { accountNotFound: true };
          }
          if (fundSource === 'petty_cash' && financeAccount.type !== 'petty_cash') {
            await transaction.rollback();
            return { accountTypeMismatch: true, expected: 'petty_cash', actual: financeAccount.type };
          }
          const expenseAmount = parseFloat(amount) + parseFloat(taxAmount);
          if (parseFloat(financeAccount.balance) < expenseAmount) {
            await transaction.rollback();
            return {
              accountInsufficientBalance: true,
              currentBalance: financeAccount.balance,
              needed: expenseAmount,
              accountName: financeAccount.name,
            };
          }
          await accountService.debitFromExpense(
            {
              id: expense.id,
              title: expense.title,
              description: expense.description,
              expenseNumber: expense.expenseNumber,
              accountId,
              totalAmount: expenseAmount,
              amount: expense.amount,
              expenseDate,
            },
            { tenantId, timezone: getTenantTimezone(req), performedBy: userId },
            transaction
          );
        }

        await transaction.commit();
        return { expense, expenseNumber, pctTransaction, vaultMutation };
      } catch (err) {
        if (!transaction.finished) {
          await transaction.rollback();
        }
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

    if (result.drawerInsufficientBalance) {
      return res.status(400).json({
        success: false,
        code: 'DRAWER_INSUFFICIENT_BALANCE',
        message: `Kas di laci tidak cukup. Kas tersedia: ${result.currentBalance}, dibutuhkan: ${result.needed}`
      });
    }

    if (result.drawerSessionRequired) {
      return res.status(400).json({
        success: false,
        code: 'DRAWER_SESSION_REQUIRED',
        message: 'Tidak ada shift kasir yang terbuka. Buka shift dulu sebelum membuat pengeluaran dari laci agar terikat ke shift tersebut.',
      });
    }

    if (result.accountNotFound) {
      return res.status(404).json({
        success: false,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Akun keuangan tidak ditemukan atau tidak aktif'
      });
    }

    if (result.accountTypeMismatch) {
      return res.status(400).json({
        success: false,
        code: 'ACCOUNT_TYPE_MISMATCH',
        message: `Akun yang dipilih bukan akun Petty Cash (tipe: ${result.actual})`
      });
    }

    if (result.accountInsufficientBalance) {
      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_BALANCE',
        message: `Saldo akun ${result.accountName || ''} tidak cukup. Saldo: ${result.currentBalance}, dibutuhkan: ${result.needed}`
      });
    }

    const { expense, expenseNumber, pctTransaction, vaultMutation } = result;

    // Fetch with associations
    const createdExpense = await Expense.findByPk(expense.id, {
      include: [
        { model: ExpenseCategory, as: 'category' },
        { model: Location, as: 'location' },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Account, as: 'account', attributes: ['id', 'name', 'type', 'bankName', 'paymentMethod', 'balance'] },
        { model: VaultAccount, as: 'vaultAccount', attributes: ['id', 'name', 'balance'] },
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
    const andConditions = [];

    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Kasir hanya melihat pengeluaran dari laci (bukan Tunai/Brankas/petty cash)
    if (isCashierUser(req.user)) {
      andConditions.push(getCashierVisibleExpenseWhere());
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

    const expenseDateRange = buildOptionalDateRangeFilter(startDate, endDate, Op, getTenantTimezone(req));
    if (expenseDateRange) {
      where.expenseDate = expenseDateRange;
    }

    if (search) {
      andConditions.push({
        [Op.or]: [
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { vendor: { [Op.iLike]: `%${search}%` } },
          { expenseNumber: { [Op.iLike]: `%${search}%` } }
        ]
      });
    }

    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
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
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Account, as: 'account', attributes: ['id', 'name', 'type', 'bankName', 'paymentMethod', 'balance'] },
        { model: VaultAccount, as: 'vaultAccount', attributes: ['id', 'name', 'balance'] },
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
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Account, as: 'account', attributes: ['id', 'name', 'type', 'bankName', 'paymentMethod', 'balance'], required: false },
        { model: VaultAccount, as: 'vaultAccount', attributes: ['id', 'name', 'balance'], required: false },
        {
          model: CashRegisterSession,
          as: 'cashRegisterSession',
          attributes: ['id', 'shiftDate', 'shiftName', 'shiftNumber', 'status', 'openingBalance', 'closingBalance', 'actualCash'],
          required: false,
        },
      ]
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        code: 'EXPENSE_NOT_FOUND',
        message: 'Expense not found'
      });
    }

    if (isCashierUser(req.user) && !isCashierVisibleExpenseRecord(expense)) {
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

    if (isCashierUser(req.user)) {
      const nextStatus = updateData.status !== undefined ? updateData.status : expense.status;
      if (!CASHIER_ALLOWED_STATUSES.has(String(nextStatus || ''))) {
        await transaction.rollback();
        return rejectCashierExpenseAction(res, 'mengubah status ke approved/paid');
      }
      if (!CASHIER_ALLOWED_STATUSES.has(String(expense.status || ''))) {
        await transaction.rollback();
        return rejectCashierExpenseAction(res, 'mengubah expense yang sudah di-approve/paid');
      }
    }

    // Clean up empty strings for UUID, enum, and date fields
    const fieldsToClean = ['locationId', 'recurringFrequency', 'recurringEndDate', 'vendor', 'referenceNumber', 'notes', 'paymentMethod', 'bankName', 'paymentNotes', 'dueDate', 'accountId', 'vaultAccountId', 'fundSource'];
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
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Account, as: 'account', attributes: ['id', 'name', 'type', 'bankName', 'paymentMethod', 'balance'] },
        { model: VaultAccount, as: 'vaultAccount', attributes: ['id', 'name', 'balance'] },
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

    if (isCashierUser(req.user) && !CASHIER_ALLOWED_STATUSES.has(String(expense.status || ''))) {
      return rejectCashierExpenseAction(res, 'menghapus expense yang sudah di-approve/paid');
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

    if (isCashierUser(req.user)) {
      await transaction.rollback();
      return rejectCashierExpenseAction(res, 'approve expense');
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
    const { paymentMethod, fundSource, bankName, paymentNotes, paidDate = new Date(), pettyCashId, vaultAccountId, accountId = null } = req.body;

    if (isCashierUser(req.user)) {
      await transaction.rollback();
      return rejectCashierExpenseAction(res, 'menandai expense sebagai paid');
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

    const resolvedFundSource = fundSource || expense.fundSource || null;
    const resolvedAccountId = accountId || expense.accountId || null;
    const resolvedVaultAccountId = vaultAccountId || expense.vaultAccountId || null;

    // Validasi: petty_cash (legacy PettyCash model) harus menyertakan pettyCashId —
    // kecuali sudah pakai accountId (Petty Cash sebagai Account, entitas terpisah dari laci).
    if (paymentMethod === 'petty_cash' && !pettyCashId && !resolvedAccountId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'pettyCashId atau accountId wajib disertakan saat paymentMethod adalah petty_cash'
      });
    }

    // Validasi: account wajib jika fundSource = account/petty_cash
    if (['account', 'petty_cash'].includes(resolvedFundSource) && !resolvedAccountId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'accountId wajib disertakan saat fundSource adalah account atau petty_cash'
      });
    }

    if (resolvedFundSource === 'vault' && !resolvedVaultAccountId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'vaultAccountId wajib disertakan saat fundSource adalah vault'
      });
    }

    // Bayar dari laci: pakai session yang sudah di-stamp saat create.
    // Tidak wajib shift masih open — jika session closed, sync ulang closing/actual setelah paid.
    let drawerSession = null;
    if (isCashDrawerFundSource({ fundSource: resolvedFundSource, paymentMethod, accountId: resolvedAccountId, vaultAccountId: resolvedVaultAccountId })) {
      const expenseAmount = parseFloat(expense.totalAmount);

      if (expense.cashRegisterSessionId) {
        drawerSession = await CashRegisterSession.findOne({
          where: { id: expense.cashRegisterSessionId, tenantId, deletedAt: null },
          lock: transaction.LOCK.UPDATE,
          transaction,
        });
        if (!drawerSession) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            code: 'DRAWER_SESSION_NOT_FOUND',
            message: 'Shift kasir yang terikat ke pengeluaran ini tidak ditemukan.',
          });
        }
      } else {
        // Legacy expense tanpa stamp: ikat ke shift open sekarang
        const drawer = await resolveOpenDrawerSession(tenantId, expense.locationId, transaction);
        if (!drawer) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            code: 'DRAWER_SESSION_REQUIRED',
            message: 'Pengeluaran laci belum terikat shift dan tidak ada shift terbuka. Buka shift atau buat ulang expense saat shift aktif.',
          });
        }
        drawerSession = drawer.session;
      }

      if (drawerSession.status === 'open') {
        const { expectedCash } = await drawerSession.getCashSummary(transaction);
        if (parseFloat(expectedCash || 0) < expenseAmount) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            code: 'DRAWER_INSUFFICIENT_BALANCE',
            message: `Kas di laci tidak cukup. Kas tersedia: ${expectedCash}, dibutuhkan: ${expenseAmount}`,
          });
        }
      }
    }

    // --- Petty Cash deduction ---
    let pctTransaction = null;
    let vaultMutation = null;

    // Legacy PettyCash model deduction — only when pettyCashId is explicitly provided.
    // New flow (Petty Cash as Account, entitas terpisah dari laci) uses accountId below instead.
    if (paymentMethod === 'petty_cash' && pettyCashId) {
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

    // --- Vault deduction ---
    if (resolvedFundSource === 'vault' && resolvedVaultAccountId) {
      const vaultAccount = await VaultAccount.findOne({
        where: { id: resolvedVaultAccountId, tenantId, isActive: true },
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (!vaultAccount) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          code: 'VAULT_ACCOUNT_NOT_FOUND',
          message: 'Akun vault tidak ditemukan atau tidak aktif'
        });
      }

      const expenseAmount = parseFloat(expense.totalAmount);
      const balanceBefore = parseFloat(vaultAccount.balance || 0);

      if (balanceBefore < expenseAmount) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'VAULT_INSUFFICIENT_BALANCE',
          message: `Saldo vault ${vaultAccount.name} tidak cukup. Saldo: ${balanceBefore}, dibutuhkan: ${expenseAmount}`
        });
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
        referenceNumber: expense.expenseNumber,
        status: 'posted',
        mutationDate: paidDate
          ? new Date(paidDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        notes: 'Pembayaran expense: ' + expense.title,
        createdBy: userId,
      }, { transaction });
    }
    // ----------------------------

    // Validate finance account exists + sufficient balance before debit
    if (resolvedAccountId) {
      const { Account } = require('../../models');
      const financeAccount = await Account.findOne({
        where: { id: resolvedAccountId, tenantId, isActive: true },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });
      if (!financeAccount) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Akun keuangan tidak ditemukan atau tidak aktif',
        });
      }
      if (resolvedFundSource === 'petty_cash' && financeAccount.type !== 'petty_cash') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'ACCOUNT_TYPE_MISMATCH',
          message: `Akun yang dipilih bukan akun Petty Cash (tipe: ${financeAccount.type})`,
        });
      }
      const expenseAmount = parseFloat(expense.totalAmount);
      if (parseFloat(financeAccount.balance) < expenseAmount) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'INSUFFICIENT_BALANCE',
          message: `Saldo akun ${financeAccount.name} tidak cukup. Saldo: ${financeAccount.balance}, dibutuhkan: ${expenseAmount}`,
        });
      }
    }

    const paidFromAccount = ['account', 'petty_cash'].includes(resolvedFundSource) && !!resolvedAccountId;
    const paidFromVault = resolvedFundSource === 'vault' && !!resolvedVaultAccountId;
    const paidFromDrawer = !!drawerSession;

    await expense.update({
      status: 'paid',
      paymentMethod,
      bankName: bankName || expense.bankName || null,
      paymentNotes: paymentNotes || expense.paymentNotes || null,
      paidDate,
      fundSource: resolvedFundSource,
      // Clear stale cross-source IDs so reopen/pay never double-deduct
      accountId: paidFromAccount ? resolvedAccountId : null,
      vaultAccountId: paidFromVault ? resolvedVaultAccountId : null,
      // Keep / set shift binding — jangan hapus saat paid
      cashRegisterSessionId: paidFromDrawer
        ? drawerSession.id
        : (expense.cashRegisterSessionId || null),
      ...(paidFromDrawer && !expense.locationId && drawerSession.locationId
        ? { locationId: drawerSession.locationId }
        : {}),
    }, { transaction });

    // Debit Account when paying from finance account or Petty Cash (not vault / drawer)
    if (paidFromAccount) {
      await accountService.debitFromExpense(
        {
          id: expense.id,
          title: expense.title,
          description: expense.description,
          expenseNumber: expense.expenseNumber,
          accountId: resolvedAccountId,
          totalAmount: expense.totalAmount,
          amount: expense.amount,
          expenseDate: paidDate,
        },
        { tenantId, timezone: getTenantTimezone(req), performedBy: userId },
        transaction
      );
    }

    // Shift sudah closed: sync closing/actual supaya collectible ikut berkurang.
    // Jika sudah di-collect melebihi collectible baru, kurangi "sudah diambil" juga.
    let sessionCashSync = null;
    let collectClawback = null;
    if (paidFromDrawer && drawerSession.status === 'closed') {
      sessionCashSync = await syncClosedSessionCash(drawerSession, transaction);
      collectClawback = await clawbackOverCollected(drawerSession, {
        tenantId,
        userId,
        expense: {
          id: expense.id,
          expenseNumber: expense.expenseNumber,
          title: expense.title,
          totalAmount: expense.totalAmount,
        },
        timezone: getTenantTimezone(req),
      }, transaction);
    }

    await transaction.commit();

    const paidExpense = await Expense.findByPk(id, {
      include: [
        { model: ExpenseCategory, as: 'category' },
        { model: Account, as: 'account', attributes: ['id', 'name', 'type', 'bankName', 'paymentMethod', 'balance'] },
        { model: VaultAccount, as: 'vaultAccount', attributes: ['id', 'name', 'balance'] },
        {
          model: CashRegisterSession,
          as: 'cashRegisterSession',
          attributes: ['id', 'shiftDate', 'shiftName', 'shiftNumber', 'status', 'closingBalance', 'actualCash'],
          required: false,
        },
      ]
    });

    res.json({
      success: true,
      data: paidExpense,
      ...(sessionCashSync ? { sessionCashSync } : {}),
      ...(collectClawback?.clawbackAmount > 0 ? { collectClawback } : {}),
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
      accountId: resolvedAccountId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
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
 * Jika status sebelumnya 'paid', rollback nominal ke sumber dana (akun / vault / petty cash)
 * dan catat mutasi balik.
 * Clears approval / payment fields so it can go through the approval flow again.
 * @route POST /api/v1/finance/expenses/:id/reopen
 */
async function reopenExpense(req, res, next) {
  const transaction = await sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin, id: userId } = req.user;
    const { id } = req.params;
    const { reason } = req.body || {};

    if (isCashierUser(req.user)) {
      await transaction.rollback();
      return rejectCashierExpenseAction(res, 'reopen expense');
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
    const tz = getTenantTimezone(req);
    const today = new Date().toISOString().split('T')[0];
    const expenseAmount = parseFloat(expense.totalAmount || expense.amount || 0);
    const reversalNotes = [];

    // ── Rollback money movement if previously paid ──────────────────────────
    if (previousStatus === 'paid' && expenseAmount > 0) {
      // 1) Finance Account (Tunai / Brankas / Bank)
      if (expense.accountId) {
        await accountService.creditFromExpenseReversal(
          {
            id: expense.id,
            title: expense.title,
            description: expense.description,
            expenseNumber: expense.expenseNumber,
            accountId: expense.accountId,
            totalAmount: expenseAmount,
            amount: expense.amount,
          },
          {
            tenantId,
            timezone: tz,
            performedBy: userId,
            reason: reason || null,
          },
          transaction
        );
        reversalNotes.push('akun keuangan');
      }

      // 2) Legacy VaultAccount
      if (expense.fundSource === 'vault' && expense.vaultAccountId) {
        const vaultAccount = await VaultAccount.findOne({
          where: { id: expense.vaultAccountId, tenantId },
          lock: transaction.LOCK.UPDATE,
          transaction,
        });

        if (vaultAccount) {
          const balanceBefore = parseFloat(vaultAccount.balance || 0);
          const balanceAfter = balanceBefore + expenseAmount;
          await vaultAccount.update({ balance: balanceAfter }, { transaction });

          await CashMutation.create({
            tenantId,
            destinationVaultAccountId: vaultAccount.id,
            sourceAccount: 'expense_reopen',
            destinationAccount: vaultAccount.name,
            amount: expenseAmount,
            mutationType: 'vault_adjustment',
            referenceType: 'Expense',
            referenceId: expense.id,
            referenceNumber: expense.expenseNumber,
            status: 'posted',
            mutationDate: today,
            notes: `Reopen pengeluaran: ${expense.title || expense.expenseNumber || '-'}${reason ? ` (${reason})` : ''}`,
            metadata: {
              reason: reason || null,
              balanceBefore,
              balanceAfter,
              reversalOf: 'vault_expense',
            },
            createdBy: userId,
          }, { transaction });

          reversalNotes.push('vault');
        }
      }

      // 3) Petty cash (find original PCT by expense reference)
      if (expense.fundSource === 'petty_cash' || expense.paymentMethod === 'petty_cash') {
        const originalPct = await PettyCashTransaction.findOne({
          where: {
            tenantId,
            referenceType: 'Expense',
            referenceId: expense.id,
            type: 'expense',
          },
          order: [['createdAt', 'DESC']],
          transaction,
        });

        if (originalPct?.pettyCashId) {
          const pettyCash = await PettyCash.findOne({
            where: { id: originalPct.pettyCashId, tenantId },
            lock: transaction.LOCK.UPDATE,
            transaction,
          });

          if (pettyCash) {
            const refundAmount = Math.abs(parseFloat(originalPct.amount || expenseAmount));
            const balanceBefore = parseFloat(pettyCash.balance || 0);
            const balanceAfter = balanceBefore + refundAmount;
            await pettyCash.update({ balance: balanceAfter }, { transaction });

            const transactionNumber = await generateUniqueSequence(
              PettyCashTransaction,
              { tenantId },
              'PCT-',
              'transactionNumber',
              transaction
            );

            await PettyCashTransaction.create({
              tenantId,
              pettyCashId: pettyCash.id,
              transactionNumber,
              type: 'adjustment',
              fundSource: null,
              amount: refundAmount,
              balanceBefore,
              balanceAfter,
              referenceType: 'Expense',
              referenceId: expense.id,
              description: `Reopen pengeluaran: ${expense.title || expense.expenseNumber || '-'}${reason ? ` (${reason})` : ''}`,
              transactionDate: today,
              performedBy: userId,
            }, { transaction });

            reversalNotes.push('petty cash');
          }
        }
      }
      // cash_drawer: no ledger debit at pay-time — sync session cash after status flip below
    }

    const wasPaid = previousStatus === 'paid';
    const wasDrawerPaid = wasPaid && isCashDrawerFundSource({
      fundSource: expense.fundSource,
      paymentMethod: expense.paymentMethod,
      accountId: expense.accountId,
      vaultAccountId: expense.vaultAccountId,
    });
    const boundSessionId = expense.cashRegisterSessionId || null;

    await expense.update({
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      paymentMethod: wasDrawerPaid ? 'cash' : (wasPaid ? null : expense.paymentMethod),
      bankName: wasPaid && !wasDrawerPaid ? null : expense.bankName,
      paymentNotes: wasPaid ? null : expense.paymentNotes,
      paidDate: wasPaid ? null : expense.paidDate,
      // Expense laci tetap milik shift; jangan lepas binding saat reopen
      fundSource: wasDrawerPaid ? 'cash_drawer' : (wasPaid ? null : expense.fundSource),
      accountId: wasPaid ? null : expense.accountId,
      vaultAccountId: wasPaid ? null : expense.vaultAccountId,
      cashRegisterSessionId: boundSessionId,
      notes: reason
        ? (expense.notes
            ? `${expense.notes}\n[${today}] Reopened: ${reason}${reversalNotes.length ? ` — rollback: ${reversalNotes.join(', ')}` : ''}`
            : `[${today}] Reopened: ${reason}${reversalNotes.length ? ` — rollback: ${reversalNotes.join(', ')}` : ''}`)
        : expense.notes
    }, { transaction });

    let sessionCashSync = null;
    let collectClawbackReversal = null;
    if (wasDrawerPaid && boundSessionId) {
      const boundSession = await CashRegisterSession.findOne({
        where: { id: boundSessionId, tenantId, deletedAt: null },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });
      if (boundSession?.status === 'closed') {
        // Pulihkan "sudah diambil" yang sempat dikurangi saat paid-after-collect
        collectClawbackReversal = await reverseCollectClawbacksForExpense(expense, {
          tenantId,
          userId,
          timezone: getTenantTimezone(req),
        }, transaction);
        sessionCashSync = await syncClosedSessionCash(boundSession, transaction);
      }
    }

    await transaction.commit();

    const reopenedExpense = await Expense.findByPk(id, {
      include: [
        { model: ExpenseCategory, as: 'category' },
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Account, as: 'account', attributes: ['id', 'name', 'type', 'bankName', 'paymentMethod', 'balance'], required: false },
        {
          model: CashRegisterSession,
          as: 'cashRegisterSession',
          attributes: ['id', 'shiftDate', 'shiftName', 'shiftNumber', 'status'],
          required: false,
        },
      ]
    });

    logger.logInfo('Expense reopened', {
      action: 'REOPEN_EXPENSE',
      userId,
      tenantId,
      expenseId: id,
      previousStatus,
      reason: reason || null,
      moneyReversal: reversalNotes,
      sessionCashSync,
      collectClawbackReversal,
    });

    return res.json({
      success: true,
      data: reopenedExpense,
      ...(sessionCashSync ? { sessionCashSync } : {}),
      ...(collectClawbackReversal ? { collectClawbackReversal } : {}),
      reversal: reversalNotes,
      message: wasPaid && reversalNotes.length
        ? `Expense reopened; dana dikembalikan ke: ${reversalNotes.join(', ')}`
        : `Expense reopened from '${previousStatus}' back to 'pending'`,
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

/**
 * POST /finance/expenses/recalculate-drawer-binding
 * Dry-run / apply: bind expense laci historis ke CashRegisterSession + sync collectible.
 * Query: dryRun=true|false (default true)
 * Body: { startDate, endDate, locationId, syncSessions, clawbackCollect }
 */
async function recalculateDrawerExpenseBinding(req, res, next) {
  try {
    const { tenantId, id: userId } = req.user;
    const dryRun = req.query.dryRun !== 'false';
    const {
      startDate = null,
      endDate = null,
      locationId = null,
      syncSessions = true,
      clawbackCollect = false,
    } = req.body || {};

    const { recalculateDrawerExpenseHistory } = require('../../services/drawerExpenseRecalcService');
    const data = await recalculateDrawerExpenseHistory({
      tenantId,
      startDate: startDate || null,
      endDate: endDate || null,
      locationId: locationId || null,
      dryRun,
      syncSessions: syncSessions !== false,
      clawbackCollect: clawbackCollect === true,
      userId,
      timezone: getTenantTimezone(req),
    });

    return res.json({
      success: true,
      message: dryRun
        ? 'Preview recalculate drawer expense selesai'
        : 'Recalculate drawer expense diterapkan',
      ...data,
    });
  } catch (error) {
    logger.logError('Error recalculating drawer expense binding', {
      action: 'DRAWER_EXPENSE_RECALC_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: error.message,
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
  reopenExpense,
  recalculateDrawerExpenseBinding,
};
