'use strict';

/**
 * Dry-run / apply tools for historical cash-drawer expenses:
 * 1) Bind unstamped expenses to CashRegisterSession
 * 2) Sync closed session closing/actual (collectible)
 * 3) Optional: clawback over-collected amounts
 */

const { Op, fn, col } = require('sequelize');
const {
  Expense,
  CashRegisterSession,
  CashMutation,
  VaultAccount,
  sequelize,
} = require('../models');
const { getCashDrawerExpenseWhere, isCashDrawerExpense } = require('../utils/cashDrawerExpense');
const accountService = require('./accountService');
const { todayInTz } = require('../utils/tenantTimezone');
const logger = require('../utils/logger');

function computeCollectibleBase(session, modalReturned = 0) {
  const physicalCash = parseFloat(session.actualCash ?? session.closingBalance ?? 0) || 0;
  const opening = parseFloat(session.openingBalance || 0) || 0;
  const nonSettle = Math.max(opening, parseFloat(modalReturned || 0) || 0);
  return Math.max(0, parseFloat((physicalCash - nonSettle).toFixed(2)));
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

async function syncClosedSessionCash(session, transaction) {
  if (!session || session.status !== 'closed') return null;

  const before = {
    closingBalance: parseFloat(session.closingBalance || 0),
    actualCash: parseFloat(session.actualCash || 0),
    difference: parseFloat(session.difference || 0),
  };

  const { expectedCash } = await session.getCashSummary(transaction);
  const tipping = parseFloat(session.tipping || 0);
  const closingBalance = parseFloat((expectedCash + tipping).toFixed(2));
  const closingDelta = parseFloat((before.closingBalance - closingBalance).toFixed(2));
  const actualCash = Math.max(0, parseFloat((before.actualCash - closingDelta).toFixed(2)));
  const difference = parseFloat((actualCash - closingBalance).toFixed(2));

  await session.update(
    { closingBalance, actualCash, difference },
    { transaction }
  );
  await session.reload({ transaction });

  return {
    before,
    after: { closingBalance, actualCash, difference },
    cashExpenseDelta: closingDelta,
    willChange:
      Math.abs(before.closingBalance - closingBalance) >= 0.01
      || Math.abs(before.actualCash - actualCash) >= 0.01,
  };
}

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
    return { collectedBefore: collected, collectibleBase, clawbackAmount: 0 };
  }

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
  const mutationDate = todayInTz(timezone);
  const mutationIds = [];

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
      referenceId: expense?.id || null,
      referenceNumber: expense?.expenseNumber || 'RECALC',
      shiftSessionId: session.id,
      status: 'posted',
      mutationDate,
      notes: `Penyesuaian collect (recalc) — session ${session.shiftDate} ${session.shiftName || ''}`,
      metadata: {
        reason: 'drawer_expense_recalc_clawback',
        collectClawback: true,
        collectibleBase,
        collectedBefore: collected,
        sourceCollectMutationId: src.id,
      },
      createdBy: userId,
    }, { transaction });
    mutationIds.push(clawback.id);
    remainingOverage = parseFloat((remainingOverage - take).toFixed(2));
  }

  if (remainingOverage > 0) {
    const mutationNumber = await generateCashMutationNumber(tenantId, transaction);
    const clawback = await CashMutation.create({
      tenantId,
      locationId: session.locationId || null,
      mutationNumber,
      sourceAccount: 'vault',
      destinationAccount: 'cash_drawer',
      amount: -remainingOverage,
      mutationType: 'drawer_to_vault_transfer',
      referenceType: 'Expense',
      referenceId: expense?.id || null,
      referenceNumber: expense?.expenseNumber || 'RECALC',
      shiftSessionId: session.id,
      status: 'posted',
      mutationDate,
      notes: `Penyesuaian collect (recalc) — session ${session.shiftDate} ${session.shiftName || ''}`,
      metadata: {
        reason: 'drawer_expense_recalc_clawback',
        collectClawback: true,
        collectibleBase,
        collectedBefore: collected,
      },
      createdBy: userId,
    }, { transaction });
    mutationIds.push(clawback.id);
    remainingOverage = 0;
  }

  const clawbackAmount = parseFloat((overage - Math.max(0, remainingOverage)).toFixed(2));
  if (clawbackAmount > 0) {
    await accountService.debitFromCashCollectReversal({
      tenantId,
      amount: clawbackAmount,
      entryDate: mutationDate,
      description: `Penyesuaian setoran (recalc drawer expense) — shift ${session.shiftDate}`,
      referenceType: 'CashRegisterSession',
      referenceId: session.id,
      performedBy: userId,
      timezone,
    }, transaction);
  }

  return {
    collectedBefore: collected,
    collectibleBase,
    clawbackAmount,
    collectedAfter: parseFloat((collected - clawbackAmount).toFixed(2)),
    mutationIds,
  };
}

function toDayKey(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  try {
    return value.toISOString().slice(0, 10);
  } catch {
    return String(value).slice(0, 10);
  }
}

function findBestSessionForExpense(expense, sessions) {
  const anchor = expense.paidDate || expense.createdAt;
  const t = anchor ? new Date(anchor).getTime() : NaN;

  if (!Number.isNaN(t)) {
    const inWindow = sessions.filter((s) => {
      if (expense.locationId && s.locationId && String(expense.locationId) !== String(s.locationId)) {
        return false;
      }
      const open = new Date(s.openedAt).getTime();
      const close = s.closedAt ? new Date(s.closedAt).getTime() : Date.now();
      return t >= open && t <= close;
    });
    if (inWindow.length === 1) return { session: inWindow[0], match: 'time_window' };
    if (inWindow.length > 1) {
      inWindow.sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
      return { session: inWindow[0], match: 'time_window_latest' };
    }
  }

  const expDay = toDayKey(expense.expenseDate) || toDayKey(expense.paidDate) || toDayKey(expense.createdAt);
  if (!expDay) return { session: null, match: 'none' };

  const byDate = sessions.filter((s) => {
    if (expense.locationId && s.locationId && String(expense.locationId) !== String(s.locationId)) {
      return false;
    }
    return toDayKey(s.shiftDate) === expDay;
  });
  if (byDate.length === 1) return { session: byDate[0], match: 'shift_date' };
  if (byDate.length > 1) {
    byDate.sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
    return { session: byDate[0], match: 'shift_date_latest' };
  }
  return { session: null, match: 'none' };
}

/**
 * @param {object} opts
 * @param {string} opts.tenantId
 * @param {string} [opts.startDate] YYYY-MM-DD
 * @param {string} [opts.endDate] YYYY-MM-DD
 * @param {string} [opts.locationId]
 * @param {boolean} [opts.dryRun=true]
 * @param {boolean} [opts.syncSessions=true]
 * @param {boolean} [opts.clawbackCollect=false]
 * @param {string} [opts.userId]
 * @param {string} [opts.timezone]
 */
async function recalculateDrawerExpenseHistory(opts = {}) {
  const {
    tenantId,
    startDate = null,
    endDate = null,
    locationId = null,
    dryRun = true,
    syncSessions = true,
    clawbackCollect = false,
    userId = null,
    timezone = 'Asia/Jakarta',
  } = opts;

  if (!tenantId) throw new Error('tenantId required');

  const dateFilter = {};
  if (startDate) dateFilter[Op.gte] = new Date(`${startDate}T00:00:00.000Z`);
  if (endDate) dateFilter[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);

  const expenseWhere = getCashDrawerExpenseWhere({
    tenantId,
    cashRegisterSessionId: { [Op.is]: null },
    status: { [Op.in]: ['pending', 'approved', 'paid'] },
    ...(locationId ? { locationId } : {}),
    ...(Object.keys(dateFilter).length
      ? {
        [Op.or]: [
          { expenseDate: dateFilter },
          { paidDate: dateFilter },
          { createdAt: dateFilter },
        ],
      }
      : {}),
  });

  const unboundExpenses = await Expense.findAll({
    where: expenseWhere,
    attributes: [
      'id', 'expenseNumber', 'title', 'totalAmount', 'status',
      'expenseDate', 'paidDate', 'createdAt', 'locationId',
      'fundSource', 'paymentMethod', 'accountId', 'vaultAccountId',
      'cashRegisterSessionId',
    ],
    order: [['expenseDate', 'ASC'], ['createdAt', 'ASC']],
  });

  const drawerExpenses = unboundExpenses.filter(isCashDrawerExpense);

  const sessionWhere = {
    tenantId,
    deletedAt: null,
    ...(locationId ? { locationId } : {}),
  };
  if (startDate || endDate) {
    sessionWhere.shiftDate = {};
    if (startDate) sessionWhere.shiftDate[Op.gte] = startDate;
    if (endDate) sessionWhere.shiftDate[Op.lte] = endDate;
  }

  const sessions = await CashRegisterSession.findAll({
    where: sessionWhere,
    attributes: [
      'id', 'shiftDate', 'shiftName', 'shiftNumber', 'status',
      'locationId', 'openedAt', 'closedAt',
      'openingBalance', 'closingBalance', 'actualCash', 'difference', 'tipping',
    ],
    order: [['openedAt', 'ASC']],
  });

  const bindRows = [];
  const affectedSessionIds = new Set();

  for (const expense of drawerExpenses) {
    const { session, match } = findBestSessionForExpense(expense, sessions);
    if (!session) {
      bindRows.push({
        expenseId: expense.id,
        expenseNumber: expense.expenseNumber,
        title: expense.title,
        totalAmount: parseFloat(expense.totalAmount || 0),
        status: expense.status,
        action: 'unmatched',
        match,
        sessionId: null,
      });
      continue;
    }

    bindRows.push({
      expenseId: expense.id,
      expenseNumber: expense.expenseNumber,
      title: expense.title,
      totalAmount: parseFloat(expense.totalAmount || 0),
      status: expense.status,
      action: 'bind',
      match,
      sessionId: session.id,
      shiftDate: session.shiftDate,
      shiftName: session.shiftName,
      shiftNumber: session.shiftNumber,
    });
    affectedSessionIds.add(session.id);
  }

  // Also include closed sessions in range that already have stamped drawer expenses
  // (so sync can fix collectible even if no new binds)
  if (syncSessions) {
    const stamped = await Expense.findAll({
      where: getCashDrawerExpenseWhere({
        tenantId,
        cashRegisterSessionId: { [Op.ne]: null },
        status: { [Op.in]: ['paid'] },
        ...(locationId ? { locationId } : {}),
        ...(Object.keys(dateFilter).length
          ? {
            [Op.or]: [
              { expenseDate: dateFilter },
              { paidDate: dateFilter },
              { createdAt: dateFilter },
            ],
          }
          : {}),
      }),
      attributes: ['cashRegisterSessionId'],
      raw: true,
    });
    stamped.forEach((r) => {
      if (r.cashRegisterSessionId) affectedSessionIds.add(r.cashRegisterSessionId);
    });
  }

  const sessionSyncRows = [];
  const clawbackRows = [];

  const run = async (transaction) => {
    const tx = transaction ? { transaction } : {};

    // Apply binds
    for (const row of bindRows.filter((r) => r.action === 'bind')) {
      if (!dryRun) {
        await Expense.update(
          { cashRegisterSessionId: row.sessionId },
          { where: { id: row.expenseId, tenantId }, ...tx }
        );
      }
    }

    if (!syncSessions) return;

    const sessionIds = [...affectedSessionIds];
    if (!sessionIds.length) return;

    const closedSessions = await CashRegisterSession.findAll({
      where: {
        tenantId,
        id: { [Op.in]: sessionIds },
        status: 'closed',
        deletedAt: null,
      },
      ...tx,
      ...(dryRun ? {} : { lock: transaction.LOCK.UPDATE }),
    });

    for (const session of closedSessions) {
      if (dryRun) {
        const { expectedCash } = await session.getCashSummary(transaction || undefined);
        // Expense yang hanya match by shift_date belum masuk getCashSummary (belum di-bind)
        const bindExtra = bindRows
          .filter((r) => (
            r.action === 'bind'
            && r.sessionId === session.id
            && r.status === 'paid'
            && String(r.match || '').startsWith('shift_date')
          ))
          .reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
        const tipping = parseFloat(session.tipping || 0);
        const closingBalance = parseFloat((expectedCash - bindExtra + tipping).toFixed(2));
        const beforeClosing = parseFloat(session.closingBalance || 0);
        const beforeActual = parseFloat(session.actualCash || 0);
        const closingDelta = parseFloat((beforeClosing - closingBalance).toFixed(2));
        const actualCash = Math.max(0, parseFloat((beforeActual - closingDelta).toFixed(2)));
        const collectibleBefore = computeCollectibleBase(session, 0);
        const previewSession = {
          ...session.toJSON(),
          closingBalance,
          actualCash,
        };
        const collectibleAfter = computeCollectibleBase(previewSession, 0);

        const collectedResult = await CashMutation.findOne({
          where: {
            tenantId,
            shiftSessionId: session.id,
            mutationType: 'drawer_to_vault_transfer',
            status: 'posted',
          },
          attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
          raw: true,
          ...tx,
        });
        const collected = parseFloat(collectedResult?.total || 0);
        const overage = Math.max(0, parseFloat((collected - collectibleAfter).toFixed(2)));

        sessionSyncRows.push({
          sessionId: session.id,
          shiftDate: session.shiftDate,
          shiftName: session.shiftName,
          shiftNumber: session.shiftNumber,
          willChange: Math.abs(beforeClosing - closingBalance) >= 0.01 || Math.abs(beforeActual - actualCash) >= 0.01,
          before: {
            closingBalance: beforeClosing,
            actualCash: beforeActual,
            collectibleBase: collectibleBefore,
            collected,
          },
          after: {
            closingBalance,
            actualCash,
            collectibleBase: collectibleAfter,
            collected: clawbackCollect ? Math.max(0, collected - overage) : collected,
          },
          clawbackPreview: clawbackCollect ? overage : 0,
        });
        continue;
      }

      const sync = await syncClosedSessionCash(session, transaction);
      let clawback = null;
      if (clawbackCollect) {
        clawback = await clawbackOverCollected(session, {
          tenantId,
          userId,
          expense: null,
          timezone,
        }, transaction);
      }

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

      sessionSyncRows.push({
        sessionId: session.id,
        shiftDate: session.shiftDate,
        shiftName: session.shiftName,
        shiftNumber: session.shiftNumber,
        willChange: !!sync?.willChange,
        before: {
          ...sync.before,
          collectibleBase: computeCollectibleBase({
            actualCash: sync.before.actualCash,
            closingBalance: sync.before.closingBalance,
            openingBalance: session.openingBalance,
          }, 0),
        },
        after: {
          ...sync.after,
          collectibleBase: computeCollectibleBase(session, 0),
          collected: parseFloat(collectedResult?.total || 0),
        },
        clawbackAmount: clawback?.clawbackAmount || 0,
      });

      if (clawback?.clawbackAmount > 0) {
        clawbackRows.push({
          sessionId: session.id,
          ...clawback,
        });
      }
    }
  };

  if (dryRun) {
    await run(null);
  } else {
    await sequelize.transaction(async (transaction) => {
      await run(transaction);
    });
  }

  const summary = {
    expensesScanned: drawerExpenses.length,
    expensesToBind: bindRows.filter((r) => r.action === 'bind').length,
    expensesUnmatched: bindRows.filter((r) => r.action === 'unmatched').length,
    sessionsToSync: sessionSyncRows.filter((r) => r.willChange).length,
    sessionsScanned: sessionSyncRows.length,
    clawbackTotal: sessionSyncRows.reduce((s, r) => s + (r.clawbackPreview || r.clawbackAmount || 0), 0),
  };

  logger.logInfo('Drawer expense history recalc', {
    action: dryRun ? 'DRAWER_EXPENSE_RECALC_PREVIEW' : 'DRAWER_EXPENSE_RECALC_APPLY',
    tenantId,
    userId,
    summary,
  });

  return {
    mode: dryRun ? 'dry_run' : 'applied',
    options: {
      startDate,
      endDate,
      locationId,
      syncSessions,
      clawbackCollect,
    },
    summary,
    binds: bindRows,
    sessionSyncs: sessionSyncRows,
    clawbacks: clawbackRows,
  };
}

module.exports = {
  recalculateDrawerExpenseHistory,
  syncClosedSessionCash,
  clawbackOverCollected,
  computeCollectibleBase,
};
