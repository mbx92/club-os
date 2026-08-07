'use strict';

/**
 * Vault / Brankas Management Controller
 *
 * Multi-account vault system. Each vault account represents a place where
 * cash / revenue is stored — e.g. "Kas" (physical cash drawer), "QRIS BCA",
 * "Mandiri", "BCA" (bank accounts), etc.
 *
 * Mutasi vault dicatat di tabel CashMutations.
 *
 * @module controllers/finance/vaultController
 */

const { Op, fn, col, literal } = require('sequelize');
const {
  sequelize,
  VaultAccount,
  CashMutation,
  CashRegisterSession,
  Location,
  User,
  Expense,
  Transaction,
  TransactionPayment,
  AccountEntry,
} = require('../../models');
const logger = require('../../utils/logger');
const { getClientIp, getUserAgent } = require('../../utils/requestHelper');
const { buildInclusiveDateRange } = require('../../utils/dateRange');
const { generateUniqueSequence, withRetry } = require('../../utils/concurrency');
const accountService = require('../../services/accountService');
const { getTenantTimezone, todayInTz } = require('../../utils/tenantTimezone');

// ── Helpers ───────────────────────────────────────────────────────────────────

const ACCOUNT_LABELS = {
  cash_drawer: 'Laci Kasir',
  vault: 'Vault / Brankas',
  petty_cash: 'Petty Cash',
  bank: 'Bank / Transfer',
  revenue: 'Revenue',
  external: 'Eksternal',
};

const MUTATION_TYPES = {
  drawer_to_vault_transfer: 'Drawer ke Vault',
  vault_expense: 'Expense Vault',
  vault_adjustment: 'Penyesuaian Vault',
  transfer_between_accounts: 'Transfer Antar Akun',
  payment_inflow: 'Pemasukan Pembayaran',
};

/**
 * Generate nomor mutasi otomatis: CM-{tahun}-{nomor urut 6 digit}
 */
async function generateMutationNumber(VaultMutation, tenantId, transaction) {
  const year = new Date().getFullYear();
  const prefix = `CM-${year}-`;
  
  // Find the last mutation number for this tenant and year
  const lastMutation = await VaultMutation.findOne({
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

function paginate(page = 1, limit = 20) {
  const p = Math.max(1, parseInt(page));
  const l = Math.min(Math.max(1, parseInt(limit)), 200);
  return { offset: (p - 1) * l, limit: l, page: p, limitSize: l };
}

/**
 * Sum of legacy "Pengembalian modal kasir" AccountEntry inflows per CashRegisterSession.
 * Kept for sessions closed before petty-cash modal was decoupled from the drawer.
 */
async function getPettyCashModalReturnMap(tenantId, sessionIds, transaction) {
  if (!sessionIds.length) return {};
  const rows = await AccountEntry.findAll({
    where: {
      tenantId,
      referenceType: 'CashRegisterSession',
      referenceId: { [Op.in]: sessionIds },
      type: 'inflow',
    },
    attributes: ['referenceId', [fn('SUM', col('amount')), 'total']],
    group: ['referenceId'],
    raw: true,
    ...(transaction ? { transaction } : {}),
  });
  const map = {};
  rows.forEach(r => { map[r.referenceId] = parseFloat(r.total || 0); });
  return map;
}

/**
 * Amount that should settle into the Tunai Account on drawer collect.
 *
 * physicalCash (actualCash/closingBalance) = opening + cash sales − drawer expenses ± selisih.
 * Setoran ke akun = physicalCash − opening float
 *                 = cash sales − pengeluaran laci ± selisih.
 *
 * Legacy closeShift credited (opening − expenses) back to petty cash on paper while
 * that cash stayed in the drawer. Subtracting only that modal return left collectible
 * = full cash sales (expenses were NOT deducted from the Tunai credit). Prefer
 * excluding openingBalance so expenses always reduce the settled amount; still honor
 * modalReturned when it exceeds opening (defensive for odd legacy rows).
 */
function computeCollectibleBase(session, modalReturned = 0) {
  const physicalCash = parseFloat(session.actualCash ?? session.closingBalance ?? 0) || 0;
  const opening = parseFloat(session.openingBalance || 0) || 0;
  const nonSettle = Math.max(opening, parseFloat(modalReturned || 0) || 0);
  return Math.max(0, parseFloat((physicalCash - nonSettle).toFixed(2)));
}

// ── Vault Account CRUD ────────────────────────────────────────────────────────

/**
 * GET /finance/vault/accounts
 * Daftar semua vault account untuk tenant
 */
async function getAccounts(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { isActive } = req.query;

    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;
    if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;

    const accounts = await VaultAccount.findAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
      ],
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
    });

    return res.json({ success: true, data: accounts });
  } catch (error) {
    logger.logError('Error fetching vault accounts', {
      action: 'GET_VAULT_ACCOUNTS_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message,
    });
    next(error);
  }
}

/**
 * POST /finance/vault/accounts
 * Buat vault account baru
 */
async function createAccount(req, res, next) {
  try {
    const { tenantId, id: userId } = req.user;
    const { name, accountType, paymentMethod, bankName, description, balance = 0, sortOrder = 0 } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: 'Nama vault account wajib diisi' });
    }

    const existing = await VaultAccount.findOne({
      where: { tenantId, name: name.trim() },
      paranoid: false,
    });

    if (existing) {
      return res.status(409).json({
        success: false, code: 'DUPLICATE',
        message: `Vault account "${name.trim()}" sudah ada`,
      });
    }

    const account = await VaultAccount.create({
      tenantId,
      name: name.trim(),
      accountType: accountType || 'other',
      paymentMethod: paymentMethod || null,
      bankName: bankName || null,
      description: description || null,
      balance: parseFloat(balance) || 0,
      sortOrder: parseInt(sortOrder) || 0,
      createdBy: userId,
    });

    logger.logInfo('Vault account created', {
      action: 'CREATE_VAULT_ACCOUNT',
      userId, tenantId,
      accountId: account.id,
      name: account.name,
      ip: getClientIp(req),
    });

    return res.status(201).json({ success: true, data: account });
  } catch (error) {
    logger.logError('Error creating vault account', {
      action: 'CREATE_VAULT_ACCOUNT_ERROR',
      userId: req.user.id, tenantId: req.user.tenantId,
      error: error.message,
    });
    next(error);
  }
}

/**
 * PUT /finance/vault/accounts/:id
 * Update vault account
 */
async function updateAccount(req, res, next) {
  try {
    const { tenantId, isSuperAdmin, id: userId } = req.user;
    const { id } = req.params;
    const { name, accountType, paymentMethod, bankName, description, isActive, sortOrder } = req.body;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const account = await VaultAccount.findOne({ where });
    if (!account) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Vault account tidak ditemukan' });
    }

    if (name && name.trim() !== account.name) {
      const duplicate = await VaultAccount.findOne({
        where: { tenantId: account.tenantId, name: name.trim(), id: { [Op.ne]: id } },
        paranoid: false,
      });
      if (duplicate) {
        return res.status(409).json({
          success: false, code: 'DUPLICATE',
          message: `Nama vault account "${name.trim()}" sudah digunakan`,
        });
      }
    }

    await account.update({
      name: name !== undefined ? name.trim() : account.name,
      accountType: accountType !== undefined ? accountType : account.accountType,
      paymentMethod: paymentMethod !== undefined ? paymentMethod : account.paymentMethod,
      bankName: bankName !== undefined ? bankName : account.bankName,
      description: description !== undefined ? description : account.description,
      isActive: isActive !== undefined ? isActive : account.isActive,
      sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : account.sortOrder,
    });

    logger.logInfo('Vault account updated', {
      action: 'UPDATE_VAULT_ACCOUNT',
      userId, tenantId, accountId: id,
      ip: getClientIp(req),
    });

    return res.json({ success: true, data: account });
  } catch (error) {
    logger.logError('Error updating vault account', {
      action: 'UPDATE_VAULT_ACCOUNT_ERROR',
      userId: req.user.id, tenantId: req.user.tenantId,
      error: error.message,
    });
    next(error);
  }
}

/**
 * DELETE /finance/vault/accounts/:id
 * Soft-delete vault account
 */
async function deleteAccount(req, res, next) {
  try {
    const { tenantId, isSuperAdmin, id: userId } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const account = await VaultAccount.findOne({ where });
    if (!account) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Vault account tidak ditemukan' });
    }

    await account.destroy();

    logger.logInfo('Vault account deleted', {
      action: 'DELETE_VAULT_ACCOUNT',
      userId, tenantId, accountId: id,
      ip: getClientIp(req),
    });

    return res.json({ success: true, message: 'Vault account berhasil dihapus' });
  } catch (error) {
    logger.logError('Error deleting vault account', {
      action: 'DELETE_VAULT_ACCOUNT_ERROR',
      userId: req.user.id, tenantId: req.user.tenantId,
      error: error.message,
    });
    next(error);
  }
}

// ── Vault Summary ─────────────────────────────────────────────────────────────

/**
 * GET /finance/vault/summary
 * Summary vault: balance per account, total in/out, pending collections
 */
async function getSummary(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, locationId } = req.query;

    const tz = getTenantTimezone(req);
    const today = todayInTz(tz);

    const dateFilter = {};
    if (startDate || endDate) {
      const { start, end } = buildInclusiveDateRange(
        startDate || today,
        endDate || today,
        tz
      );
      dateFilter.mutationDate = { [Op.between]: [start, end] };
    }

    const mutationWhere = { tenantId, status: 'posted' };
    if (!isSuperAdmin) mutationWhere.tenantId = tenantId;
    if (locationId) mutationWhere.locationId = locationId;

    // --- Vault accounts with balances ---
    const accounts = await VaultAccount.findAll({
      where: { tenantId, isActive: true },
      attributes: ['id', 'name', 'accountType', 'paymentMethod', 'bankName', 'balance', 'sortOrder'],
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
    });

    // --- Total inflow ke vault accounts (dari payment_inflow + drawer_to_vault) ---
    const inflowWhere = { ...mutationWhere, ...dateFilter };
    inflowWhere.destinationVaultAccountId = { [Op.ne]: null };
    inflowWhere.mutationType = { [Op.in]: ['payment_inflow', 'drawer_to_vault_transfer', 'transfer_between_accounts', 'vault_adjustment'] };

    const inflowResult = await CashMutation.findOne({
      where: inflowWhere,
      attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
      raw: true,
    });

    // --- Total outflow dari vault accounts (vault_expense + transfer keluar) ---
    const outflowWhere = { ...mutationWhere, ...dateFilter };
    outflowWhere.sourceVaultAccountId = { [Op.ne]: null };
    outflowWhere.mutationType = { [Op.in]: ['vault_expense', 'transfer_between_accounts'] };

    const outflowResult = await CashMutation.findOne({
      where: outflowWhere,
      attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
      raw: true,
    });

    // --- Hari ini collected (kept for backward compatibility) ---
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCollectedResult = await CashMutation.findOne({
      where: {
        tenantId,
        mutationType: 'drawer_to_vault_transfer',
        status: 'posted',
        mutationDate: todayStr,
        ...(locationId ? { locationId } : {}),
      },
      attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
      raw: true,
    });

    // --- Period collected (drawer_to_vault within date range) ---
    const periodCollectedWhere = {
      ...mutationWhere,
      ...dateFilter,
      mutationType: 'drawer_to_vault_transfer',
    };
    const periodCollectedResult = await CashMutation.findOne({
      where: periodCollectedWhere,
      attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
      raw: true,
    });

    // --- Pending cash drawer (all closed sessions with remaining, filtered like collectibles) ---
    const sessionWhere = {
      tenantId,
      status: 'closed',
      deletedAt: null,
    };
    if (locationId) sessionWhere.locationId = locationId;
    if (startDate) sessionWhere.shiftDate = { ...sessionWhere.shiftDate, [Op.gte]: startDate };
    if (endDate) sessionWhere.shiftDate = { ...sessionWhere.shiftDate, [Op.lte]: endDate };

    const pendingSessions = await CashRegisterSession.findAll({
      where: sessionWhere,
      attributes: ['id', 'shiftDate', 'shiftName', 'shiftNumber', 'openingBalance', 'closingBalance', 'actualCash', 'locationId'],
      include: [
        { model: Location, as: 'location', attributes: ['id', 'name'], required: false },
      ],
      order: [['shiftDate', 'DESC'], ['shiftNumber', 'DESC']],
    });

    const sessionIds = pendingSessions.map(s => s.id);
    const collectedPerSession = sessionIds.length > 0 ? await CashMutation.findAll({
      where: {
        tenantId,
        shiftSessionId: { [Op.in]: sessionIds },
        mutationType: 'drawer_to_vault_transfer',
        status: 'posted',
      },
      attributes: ['shiftSessionId', [fn('SUM', col('amount')), 'collected']],
      group: ['shiftSessionId'],
      raw: true,
    }) : [];

    const collectedMap = {};
    collectedPerSession.forEach(c => {
      collectedMap[c.shiftSessionId] = parseFloat(c.collected || 0);
    });

    const modalReturnMap = await getPettyCashModalReturnMap(tenantId, sessionIds);

    const pendingItems = pendingSessions
      .map(s => {
        const base = computeCollectibleBase(s, modalReturnMap[s.id] || 0);
        const collected = collectedMap[s.id] || 0;
        const remaining = Math.max(0, base - collected);
        return {
          sessionId: s.id,
          shiftDate: s.shiftDate,
          shiftName: s.shiftName,
          shiftNumber: s.shiftNumber,
          location: s.location || null,
          collectibleBase: base,
          collectedAmount: collected,
          remainingAmount: remaining,
          collectionStatus: remaining <= 0 ? 'collected' : collected > 0 ? 'partially_collected' : 'uncollected',
        };
      })
      .filter(s => s.remainingAmount > 0);

    const pendingDrawerCash = pendingItems.reduce((sum, s) => sum + s.remainingAmount, 0);
    const pendingPreview = pendingItems.slice(0, 5);

    return res.json({
      success: true,
      data: {
        summary: {
          accounts,
          vaultBalance: accounts.reduce((sum, a) => sum + parseFloat(a.balance || 0), 0),
          totalIn: parseFloat(inflowResult?.total || 0),
          totalOut: parseFloat(outflowResult?.total || 0),
          todayCollected: parseFloat(todayCollectedResult?.total || 0),
          periodCollected: parseFloat(periodCollectedResult?.total || 0),
          pendingDrawerCash,
          pendingSessionCount: pendingItems.length,
        },
        pendingCollectionsPreview: pendingPreview,
      },
    });
  } catch (error) {
    logger.logError('Error generating vault summary', {
      action: 'VAULT_SUMMARY_ERROR',
      userId: req.user.id, tenantId: req.user.tenantId,
      error: error.message,
    });
    next(error);
  }
}

// ── Collectibles (Pending Cash Drawer) ────────────────────────────────────────

/**
 * GET /finance/vault/collectibles
 * Daftar cash register session yang belum di-collect ke vault
 */
async function getCollectibles(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, locationId, page = 1, limit = 50 } = req.query;
    const { offset, limitSize } = paginate(page, limit);

    const sessionWhere = { tenantId, status: 'closed', deletedAt: null };
    if (!isSuperAdmin) sessionWhere.tenantId = tenantId;
    if (locationId) sessionWhere.locationId = locationId;
    if (startDate) sessionWhere.shiftDate = { ...sessionWhere.shiftDate, [Op.gte]: startDate };
    if (endDate) sessionWhere.shiftDate = { ...sessionWhere.shiftDate, [Op.lte]: endDate };

    const { count, rows: sessions } = await CashRegisterSession.findAndCountAll({
      where: sessionWhere,
      include: [
        { model: Location, as: 'location', attributes: ['id', 'name'], required: false },
      ],
      order: [['shiftDate', 'DESC'], ['shiftNumber', 'DESC']],
      limit: limitSize,
      offset,
    });

    // Get collected amounts per session
    const sessionIds = sessions.map(s => s.id);
    const collectedAmounts = sessionIds.length > 0 ? await CashMutation.findAll({
      where: {
        tenantId,
        shiftSessionId: { [Op.in]: sessionIds },
        mutationType: 'drawer_to_vault_transfer',
        status: 'posted',
      },
      attributes: ['shiftSessionId', [fn('SUM', col('amount')), 'collected']],
      group: ['shiftSessionId'],
      raw: true,
    }) : [];

    const collectedMap = {};
    collectedAmounts.forEach(c => {
      collectedMap[c.shiftSessionId] = parseFloat(c.collected || 0);
    });

    const modalReturnMap = await getPettyCashModalReturnMap(tenantId, sessionIds);

    // Build session list
    const sessionList = sessions.map(s => {
      const rawCash = parseFloat(s.actualCash || s.closingBalance || 0);
      const modalReturned = modalReturnMap[s.id] || 0;
      const openingBalance = parseFloat(s.openingBalance || 0);
      // Setoran = kas fisik − modal awal (= penjualan tunai − pengeluaran laci ± selisih)
      const base = computeCollectibleBase(s, modalReturned);
      const collected = collectedMap[s.id] || 0;
      const remaining = Math.max(0, base - collected);
      const status = remaining <= 0 ? 'collected' : collected > 0 ? 'partially_collected' : 'uncollected';
      return {
        id: s.id,
        shiftDate: s.shiftDate,
        shiftName: s.shiftName,
        shiftNumber: s.shiftNumber,
        location: s.location || null,
        openingBalance,
        closingBalance: parseFloat(s.closingBalance || 0),
        actualCash: parseFloat(s.actualCash || 0),
        pettyCashModalReturned: modalReturned,
        collectibleBase: base,
        collectedAmount: collected,
        remainingAmount: remaining,
        collectionStatus: status,
      };
    });

    // Build daily grouping
    const dailyMap = {};
    sessionList.forEach(s => {
      const key = `${s.shiftDate}-${s.location?.id || 'none'}`;
      if (!dailyMap[key]) {
        dailyMap[key] = {
          shiftDate: s.shiftDate,
          location: s.location,
          sessionCount: 0,
          collectibleBase: 0,
          collectedAmount: 0,
          remainingAmount: 0,
          collectionStatus: 'uncollected',
          sessions: [],
        };
      }
      const d = dailyMap[key];
      d.sessionCount += 1;
      d.collectibleBase += s.collectibleBase;
      d.collectedAmount += s.collectedAmount;
      d.remainingAmount += s.remainingAmount;
      if (d.remainingAmount <= 0) d.collectionStatus = 'collected';
      else if (d.collectedAmount > 0) d.collectionStatus = 'partially_collected';
      d.sessions.push(s);
    });

    return res.json({
      success: true,
      data: {
        sessions: sessionList,
        daily: Object.values(dailyMap),
        pagination: {
          total: count,
          page: parseInt(page),
          limit: limitSize,
          totalPages: Math.ceil(count / limitSize),
        },
      },
    });
  } catch (error) {
    logger.logError('Error fetching collectibles', {
      action: 'GET_COLLECTIBLES_ERROR',
      userId: req.user.id, tenantId: req.user.tenantId,
      error: error.message,
    });
    next(error);
  }
}

// ── Collect dari Cash Drawer ke Vault ─────────────────────────────────────────

/**
 * POST /finance/vault/collect
 * Collect cash dari beberapa shift session ke vault account tertentu
 * Setiap session bisa di-collect ke vault account yang berbeda (default: "Kas")
 */
async function collectToVault(req, res, next) {
  try {
    const { tenantId, id: userId } = req.user;
    const { mutationDate, notes, collections, vaultAccountId } = req.body;

    if (!collections || !Array.isArray(collections) || collections.length === 0) {
      return res.status(400).json({
        success: false, code: 'VALIDATION_ERROR',
        message: 'Minimal pilih satu shift session untuk di-collect',
      });
    }

    if (!mutationDate) {
      return res.status(400).json({
        success: false, code: 'VALIDATION_ERROR',
        message: 'Tanggal mutasi wajib diisi',
      });
    }

    // Determine destination vault account
    let destVaultAccount = null;
    if (vaultAccountId) {
      destVaultAccount = await VaultAccount.findOne({
        where: { id: vaultAccountId, tenantId, isActive: true },
      });
      if (!destVaultAccount) {
        // Try to find or create default "Kas" vault account
        destVaultAccount = await VaultAccount.findOne({
          where: { tenantId, name: 'Kas', isActive: true },
        });
      }
    } else {
      destVaultAccount = await VaultAccount.findOne({
        where: { tenantId, name: 'Kas', isActive: true },
      });
    }

    if (!destVaultAccount) {
      // Auto-create the default "Kas" vault account
      destVaultAccount = await VaultAccount.create({
        tenantId,
        name: 'Kas',
        accountType: 'cash',
        paymentMethod: 'cash',
        description: 'Akun vault default untuk uang tunai',
        balance: 0,
        sortOrder: 1,
        createdBy: userId,
      });
    }

    const result = await withRetry(async () => {
      const transaction = await sequelize.transaction();

      try {
        const mutations = [];
        let totalAmount = 0;

        for (const item of collections) {
          const { sessionId, amount, notes: itemNotes } = item;

          const session = await CashRegisterSession.findOne({
            where: { id: sessionId, tenantId, status: 'closed' },
            lock: transaction.LOCK.UPDATE,
            transaction,
          });

          if (!session) {
            await transaction.rollback();
            return { error: `Shift session ${sessionId} tidak ditemukan` };
          }

          const rawCashAmount = parseFloat(session.actualCash || session.closingBalance || 0);
          const modalReturnMap = await getPettyCashModalReturnMap(tenantId, [session.id], transaction);
          const modalReturned = modalReturnMap[session.id] || 0;
          const openingBalance = parseFloat(session.openingBalance || 0);
          // Setoran ke akun Tunai = kas fisik − modal awal
          // (= penjualan tunai − pengeluaran laci ± selisih). Jangan sweep modal float.
          const baseAmount = computeCollectibleBase(session, modalReturned);

          // Hitung sudah berapa banyak yang sudah di-collect
          const collectedResult = await CashMutation.findOne({
            where: {
              tenantId,
              shiftSessionId: sessionId,
              mutationType: 'drawer_to_vault_transfer',
              status: 'posted',
            },
            attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
            raw: true,
            transaction,
          });

          const alreadyCollected = parseFloat(collectedResult?.total || 0);
          const remaining = Math.max(0, baseAmount - alreadyCollected);

          let collectAmount;
          if (amount !== undefined && amount !== null && amount !== '') {
            collectAmount = parseFloat(amount);
            if (collectAmount < 0) {
              await transaction.rollback();
              return { error: `Amount collect untuk session ${sessionId} tidak boleh negatif` };
            }
            if (collectAmount > remaining) {
              await transaction.rollback();
              return { error: `Amount collect untuk session ${sessionId} (${collectAmount}) melebihi sisa (${remaining})` };
            }
          } else {
            collectAmount = remaining;
          }

          if (collectAmount <= 0) continue;

          // Generate mutation number
          const mutationNumber = await generateMutationNumber(CashMutation, tenantId, transaction);

          const cashMutation = await CashMutation.create({
            tenantId,
            locationId: session.locationId,
            mutationNumber,
            sourceAccount: 'cash_drawer',
            destinationAccount: 'vault',
            sourceVaultAccountId: null,
            destinationVaultAccountId: destVaultAccount.id,
            amount: collectAmount,
            mutationType: 'drawer_to_vault_transfer',
            referenceType: 'CashRegisterSession',
            referenceId: session.id,
            referenceNumber: `Shift #${session.shiftNumber} ${session.shiftDate}`,
            shiftSessionId: session.id,
            status: 'posted',
            mutationDate,
            notes: itemNotes || notes || null,
            metadata: {
              shiftDate: session.shiftDate,
              rawCashAmount,
              openingBalance,
              pettyCashModalReturned: modalReturned,
              collectibleBase: baseAmount,
              alreadyCollected,
            },
            createdBy: userId,
          }, { transaction });

          totalAmount += collectAmount;
          mutations.push(cashMutation);
        }

        if (mutations.length === 0) {
          await transaction.rollback();
          return { error: 'Tidak ada session yang bisa di-collect (semua sudah penuh atau saldo 0)' };
        }

        // Update vault account balance (operational vault storage)
        const newBalance = parseFloat(destVaultAccount.balance || 0) + totalAmount;
        await destVaultAccount.update({ balance: newBalance }, { transaction });

        // Settle into finance cash Account (akun tunai) — separate from cash drawer.
        // POS cash never credits Account; this collect/setoran is the settlement step.
        const timezone = getTenantTimezone(req);
        const accountEntries = [];
        for (const cashMutation of mutations) {
          const settled = await accountService.creditFromCashCollect({
            tenantId,
            amount: cashMutation.amount,
            entryDate: mutationDate,
            description: `Setoran kas dari laci — ${cashMutation.referenceNumber || cashMutation.mutationNumber}`,
            referenceType: 'CashMutation',
            referenceId: cashMutation.id,
            performedBy: userId,
            timezone,
          }, transaction);
          if (settled?.entry) accountEntries.push(settled.entry);
        }

        await transaction.commit();

        // Fetch created mutations with associations
        const createdMutations = await CashMutation.findAll({
          where: { id: { [Op.in]: mutations.map(m => m.id) } },
          include: [
            { model: Location, as: 'location', attributes: ['id', 'name'], required: false },
            { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
            { model: CashRegisterSession, as: 'shiftSession', attributes: ['id', 'shiftDate', 'shiftName', 'shiftNumber'] },
          ],
        });

        return {
          mutations: createdMutations,
          totalAmount,
          vaultAccount: destVaultAccount,
          accountEntries,
        };
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    }, 3, 150, 'COLLECT_TO_VAULT');

    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }

    logger.logInfo('Cash collected to vault', {
      action: 'COLLECT_TO_VAULT',
      userId, tenantId,
      totalAmount: result.totalAmount,
      vaultAccountId: destVaultAccount.id,
      shiftsCount: result.mutations.length,
      ip: getClientIp(req),
    });

    return res.json({
      success: true,
      message: `Berhasil meng-collect ${result.mutations.length} shift ke ${destVaultAccount.name} dengan total ${result.totalAmount}`,
      data: {
        mutations: result.mutations,
        totalAmount: result.totalAmount,
        vaultAccount: {
          id: destVaultAccount.id,
          name: destVaultAccount.name,
          balance: parseFloat(destVaultAccount.balance),
        },
        cashAccountSettled: (result.accountEntries || []).length > 0,
        accountEntries: result.accountEntries || [],
      },
    });
  } catch (error) {
    logger.logError('Error collecting to vault', {
      action: 'COLLECT_TO_VAULT_ERROR',
      userId: req.user.id, tenantId: req.user.tenantId,
      error: error.message,
    });
    next(error);
  }
}

// ── Mutations Ledger ──────────────────────────────────────────────────────────

/**
 * GET /finance/vault/mutations
 * Riwayat mutasi vault dengan filter
 */
async function getMutations(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      startDate, endDate, locationId,
      mutationType, sourceAccount, destinationAccount,
      sourceVaultAccountId, destinationVaultAccountId,
      status, search,
      page = 1, limit = 20,
    } = req.query;
    const { offset, limitSize } = paginate(page, limit);

    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;
    if (locationId) where.locationId = locationId;
    if (mutationType) where.mutationType = mutationType;
    if (sourceAccount) where.sourceAccount = sourceAccount;
    if (destinationAccount) where.destinationAccount = destinationAccount;
    if (sourceVaultAccountId) where.sourceVaultAccountId = sourceVaultAccountId;
    if (destinationVaultAccountId) where.destinationVaultAccountId = destinationVaultAccountId;
    if (status) where.status = status;

    const tz = getTenantTimezone(req);
    const today = todayInTz(tz);

    if (startDate || endDate) {
      const { start, end } = buildInclusiveDateRange(
        startDate || today,
        endDate || today,
        tz
      );
      where.mutationDate = { [Op.between]: [start, end] };
    }

    if (search) {
      where[Op.or] = [
        { mutationNumber: { [Op.iLike]: `%${search}%` } },
        { notes: { [Op.iLike]: `%${search}%` } },
        { referenceNumber: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows: mutations } = await CashMutation.findAndCountAll({
      where,
      include: [
        { model: Location, as: 'location', attributes: ['id', 'name'], required: false },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
        { model: CashRegisterSession, as: 'shiftSession', attributes: ['id', 'shiftDate', 'shiftName', 'shiftNumber'], required: false },
        { model: VaultAccount, as: 'sourceVaultAccount', attributes: ['id', 'name', 'accountType'], required: false },
        { model: VaultAccount, as: 'destinationVaultAccount', attributes: ['id', 'name', 'accountType'], required: false },
      ],
      order: [['mutationDate', 'DESC'], ['createdAt', 'DESC']],
      limit: limitSize,
      offset,
    });

    // Enrich with reference entities for display
    const enrichedMutations = await Promise.all(mutations.map(async (mutation) => {
      const m = mutation.toJSON();
      const refType = (m.referenceType || '').toLowerCase().trim();

      // Load reference display data
      if (m.referenceId && refType) {
        try {
          switch (refType) {
            case 'expense': {
              const expense = await Expense.findByPk(m.referenceId, {
                attributes: ['id', 'expenseNumber', 'title'],
              });
              if (expense) m.expense = expense;
              break;
            }
            case 'cashregistersession': {
              const session = await CashRegisterSession.findByPk(m.referenceId, {
                attributes: ['id', 'shiftDate', 'shiftName', 'shiftNumber'],
              });
              if (session) m.shiftSession = session;
              break;
            }
            case 'transaction': {
              const trx = await Transaction.findByPk(m.referenceId, {
                attributes: ['id', 'transactionNumber'],
              });
              if (trx) m.transaction = trx;
              break;
            }
          }
        } catch (e) {
          // Reference entity might be deleted
        }
      }

      return m;
    }));

    return res.json({
      success: true,
      data: {
        mutations: enrichedMutations,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: limitSize,
          totalPages: Math.ceil(count / limitSize),
        },
      },
    });
  } catch (error) {
    logger.logError('Error fetching vault mutations', {
      action: 'GET_MUTATIONS_ERROR',
      userId: req.user.id, tenantId: req.user.tenantId,
      error: error.message,
    });
    next(error);
  }
}

// ── Transfer Between Accounts ─────────────────────────────────────────────────

/**
 * POST /finance/vault/transfer
 * Transfer dana antar vault accounts
 */
async function transferBetweenAccounts(req, res, next) {
  try {
    const { tenantId, id: userId } = req.user;
    const { sourceVaultAccountId, destinationVaultAccountId, amount, mutationDate, notes } = req.body;

    if (!sourceVaultAccountId || !destinationVaultAccountId) {
      return res.status(400).json({
        success: false, code: 'VALIDATION_ERROR',
        message: 'Akun vault sumber dan tujuan wajib diisi',
      });
    }

    if (sourceVaultAccountId === destinationVaultAccountId) {
      return res.status(400).json({
        success: false, code: 'VALIDATION_ERROR',
        message: 'Akun sumber dan tujuan tidak boleh sama',
      });
    }

    const transferAmount = parseFloat(amount);
    if (!transferAmount || transferAmount <= 0) {
      return res.status(400).json({
        success: false, code: 'VALIDATION_ERROR',
        message: 'Jumlah transfer harus lebih dari 0',
      });
    }

    const result = await withRetry(async () => {
      const transaction = await sequelize.transaction();

      try {
        const sourceAccount = await VaultAccount.findOne({
          where: { id: sourceVaultAccountId, tenantId, isActive: true },
          lock: transaction.LOCK.UPDATE,
          transaction,
        });

        if (!sourceAccount) {
          await transaction.rollback();
          return { error: 'Akun vault sumber tidak ditemukan atau tidak aktif' };
        }

        const sourceBalance = parseFloat(sourceAccount.balance || 0);
        if (sourceBalance < transferAmount) {
          await transaction.rollback();
          return { error: `Saldo ${sourceAccount.name} tidak mencukupi. Saldo: ${sourceBalance}` };
        }

        const destAccount = await VaultAccount.findOne({
          where: { id: destinationVaultAccountId, tenantId, isActive: true },
          lock: transaction.LOCK.UPDATE,
          transaction,
        });

        if (!destAccount) {
          await transaction.rollback();
          return { error: 'Akun vault tujuan tidak ditemukan atau tidak aktif' };
        }

        // Generate mutation number
        const mutationNumber = await generateMutationNumber(CashMutation, tenantId, transaction);

        // Update balances
        await sourceAccount.update({
          balance: sourceBalance - transferAmount,
        }, { transaction });

        await destAccount.update({
          balance: parseFloat(destAccount.balance || 0) + transferAmount,
        }, { transaction });

        // Create mutation record
        const mutation = await CashMutation.create({
          tenantId,
          mutationNumber,
          sourceVaultAccountId: sourceAccount.id,
          destinationVaultAccountId: destAccount.id,
          sourceAccount: sourceAccount.name,
          destinationAccount: destAccount.name,
          amount: transferAmount,
          mutationType: 'transfer_between_accounts',
          status: 'posted',
          mutationDate: mutationDate || new Date().toISOString().split('T')[0],
          notes: notes || `Transfer dari ${sourceAccount.name} ke ${destAccount.name}`,
          metadata: {
            sourceBalanceBefore: sourceBalance,
            sourceBalanceAfter: sourceBalance - transferAmount,
            destBalanceBefore: parseFloat(destAccount.balance || 0),
            destBalanceAfter: parseFloat(destAccount.balance || 0) + transferAmount,
          },
          createdBy: userId,
        }, { transaction });

        await transaction.commit();

        return { mutation, sourceAccount, destAccount };
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    }, 3, 150, 'TRANSFER_VAULT');

    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }

    logger.logInfo('Vault transfer completed', {
      action: 'TRANSFER_VAULT',
      userId, tenantId,
      from: result.sourceAccount.name,
      to: result.destAccount.name,
      amount: transferAmount,
      ip: getClientIp(req),
    });

    return res.json({
      success: true,
      message: `Berhasil transfer ${transferAmount} dari ${result.sourceAccount.name} ke ${result.destAccount.name}`,
      data: {
        mutation: result.mutation,
        sourceAccount: { id: result.sourceAccount.id, name: result.sourceAccount.name, balance: parseFloat(result.sourceAccount.balance) },
        destAccount: { id: result.destAccount.id, name: result.destAccount.name, balance: parseFloat(result.destAccount.balance) },
      },
    });
  } catch (error) {
    logger.logError('Error transferring vault', {
      action: 'TRANSFER_VAULT_ERROR',
      userId: req.user.id, tenantId: req.user.tenantId,
      error: error.message,
    });
    next(error);
  }
}

// ── Vault Adjustment ──────────────────────────────────────────────────────────

/**
 * POST /finance/vault/adjust
 * Penyesuaian saldo vault account (positif atau negatif)
 */
async function adjustVault(req, res, next) {
  try {
    const { tenantId, id: userId } = req.user;
    const { vaultAccountId, amount, mutationDate, notes, reason } = req.body;

    if (!vaultAccountId) {
      return res.status(400).json({
        success: false, code: 'VALIDATION_ERROR',
        message: 'Akun vault wajib diisi',
      });
    }

    const adjAmount = parseFloat(amount);
    if (!adjAmount || adjAmount === 0) {
      return res.status(400).json({
        success: false, code: 'VALIDATION_ERROR',
        message: 'Jumlah penyesuaian tidak boleh 0',
      });
    }

    const result = await withRetry(async () => {
      const transaction = await sequelize.transaction();

      try {
        const account = await VaultAccount.findOne({
          where: { id: vaultAccountId, tenantId, isActive: true },
          lock: transaction.LOCK.UPDATE,
          transaction,
        });

        if (!account) {
          await transaction.rollback();
          return { error: 'Akun vault tidak ditemukan atau tidak aktif' };
        }

        const currentBalance = parseFloat(account.balance || 0);
        const newBalance = currentBalance + adjAmount;

        if (newBalance < 0) {
          await transaction.rollback();
          return { error: `Saldo ${account.name} tidak mencukupi untuk pengurangan ${adjAmount}. Saldo: ${currentBalance}` };
        }

        // Generate mutation number
        const mutationNumber = await generateMutationNumber(CashMutation, tenantId, transaction);

        await account.update({ balance: newBalance }, { transaction });

        const mutation = await CashMutation.create({
          tenantId,
          mutationNumber,
          destinationVaultAccountId: adjAmount > 0 ? account.id : null,
          sourceVaultAccountId: adjAmount < 0 ? account.id : null,
          sourceAccount: adjAmount < 0 ? account.name : 'adjustment',
          destinationAccount: adjAmount > 0 ? account.name : 'adjustment',
          amount: Math.abs(adjAmount),
          mutationType: 'vault_adjustment',
          status: 'posted',
          mutationDate: mutationDate || new Date().toISOString().split('T')[0],
          notes: notes || reason || `Penyesuaian ${adjAmount > 0 ? 'masuk' : 'keluar'} ${account.name}`,
          metadata: {
            reason: reason || null,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
          },
          createdBy: userId,
        }, { transaction });

        await transaction.commit();
        return { mutation, account, newBalance };
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    }, 3, 150, 'ADJUST_VAULT');

    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }

    logger.logInfo('Vault adjustment completed', {
      action: 'ADJUST_VAULT',
      userId, tenantId,
      account: result.account.name,
      amount: adjAmount,
      ip: getClientIp(req),
    });

    return res.json({
      success: true,
      message: `Penyesuaian ${result.account.name} berhasil. Saldo: ${result.account.name} = ${result.newBalance}`,
      data: {
        mutation: result.mutation,
        account: { id: result.account.id, name: result.account.name, balance: parseFloat(result.account.balance) },
      },
    });
  } catch (error) {
    logger.logError('Error adjusting vault', {
      action: 'ADJUST_VAULT_ERROR',
      userId: req.user.id, tenantId: req.user.tenantId,
      error: error.message,
    });
    next(error);
  }
}

/**
 * Record a payment_inflow mutation to the appropriate vault account.
 *
 * This is called automatically whenever a non-cash transaction payment completes.
 * Cash payments are skipped (they go through manual drawer→vault collection).
 * Compliment payments are skipped (free/owner-gratis transactions).
 *
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string|null} params.locationId
 * @param {string} params.paymentMethod - normalized payment method (qris, bank_transfer, debit_card, etc.)
 * @param {number} params.amount - payment amount
 * @param {Object} params.paymentDetails - raw paymentDetails from TransactionPayment
 * @param {string} params.referenceType - e.g. 'transaction', 'order'
 * @param {string} params.referenceId - UUID of the transaction/order
 * @param {string} params.referenceNumber - human-readable reference number
 * @param {string} params.createdBy - user UUID who processed the payment
 * @param {Object} params.dbTransaction - Sequelize transaction object
 * @returns {Object|null} The created CashMutation or null if skipped
 */
async function recordPaymentInflow({
  tenantId,
  locationId = null,
  paymentMethod,
  amount,
  paymentDetails = {},
  referenceType,
  referenceId,
  referenceNumber,
  createdBy,
  dbTransaction,
}) {
  // Skip cash — cash goes through manual drawer→vault collection
  if (paymentMethod === 'cash') return null;

  // Skip compliment — free/owner-gratis, no actual money
  if (paymentMethod === 'compliment') return null;

  // Skip if amount is zero or negative
  if (!amount || parseFloat(amount) <= 0) return null;

  const paymentAmount = parseFloat(amount);

  // ── Find or create vault account ──────────────────────────────────────────

  // Try exact match on paymentMethod first
  let vaultAccount = await VaultAccount.findOne({
    where: { tenantId, paymentMethod, isActive: true },
    lock: dbTransaction?.LOCK?.UPDATE,
    transaction: dbTransaction,
  });

  // If not found by paymentMethod, try matching by accountType
  if (!vaultAccount) {
    const accountType = mapPaymentMethodToAccountType(paymentMethod);
    vaultAccount = await VaultAccount.findOne({
      where: { tenantId, accountType, isActive: true },
      lock: dbTransaction?.LOCK?.UPDATE,
      transaction: dbTransaction,
    });
  }

  // Auto-create if still not found
  if (!vaultAccount) {
    const name = buildVaultAccountName(paymentMethod, paymentDetails);
    vaultAccount = await VaultAccount.create({
      tenantId,
      name,
      accountType: mapPaymentMethodToAccountType(paymentMethod),
      paymentMethod,
      bankName: paymentDetails?.bankName || paymentDetails?.bank_name || null,
      balance: 0,
      description: `Auto-created dari transaksi pembayaran ${paymentMethod}`,
      createdBy,
    }, { transaction: dbTransaction });
  }

  // ── Generate mutation number ──────────────────────────────────────────────

  const mutationNumber = await generateMutationNumber(CashMutation, tenantId, dbTransaction);

  // ── Create CashMutation ───────────────────────────────────────────────────

  const cashMutation = await CashMutation.create({
    tenantId,
    locationId,
    mutationNumber,
    destinationVaultAccountId: vaultAccount.id,
    destinationAccount: vaultAccount.name,
    sourceAccount: 'revenue',
    amount: paymentAmount,
    mutationType: 'payment_inflow',
    referenceType,
    referenceId,
    referenceNumber,
    status: 'posted',
    mutationDate: new Date().toISOString().split('T')[0],
    notes: `Pemasukan otomatis dari pembayaran ${paymentMethod}`,
    metadata: {
      paymentMethod,
      paymentDetails,
      autoCreated: true,
    },
    createdBy,
  }, { transaction: dbTransaction });

  // ── Update vault account balance ──────────────────────────────────────────

  const newBalance = parseFloat(vaultAccount.balance || 0) + paymentAmount;
  await vaultAccount.update({ balance: newBalance }, { transaction: dbTransaction });

  return cashMutation;
}

/**
 * Reverse auto payment_inflow CashMutations for a cancelled/refunded transaction.
 * Debits vault balance and records vault_adjustment (outflow) for audit.
 */
async function reversePaymentInflows({
  tenantId,
  referenceType = 'transaction',
  referenceId,
  notes,
  createdBy,
  dbTransaction = null,
}) {
  if (!tenantId || !referenceId) return [];

  const run = async (transaction) => {
    const mutations = await CashMutation.findAll({
      where: {
        tenantId,
        referenceType,
        referenceId,
        mutationType: 'payment_inflow',
        status: 'posted',
      },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    const results = [];
    for (const mutation of mutations) {
      const vaultAccountId = mutation.destinationVaultAccountId;
      if (!vaultAccountId) continue;

      const vaultAccount = await VaultAccount.findOne({
        where: { id: vaultAccountId, tenantId },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });
      if (!vaultAccount) continue;

      const amount = parseFloat(mutation.amount || 0);
      if (amount <= 0) continue;

      const balanceBefore = parseFloat(vaultAccount.balance || 0);
      const balanceAfter = Math.max(0, balanceBefore - amount);
      await vaultAccount.update({ balance: balanceAfter }, { transaction });

      const mutationNumber = await generateMutationNumber(CashMutation, tenantId, transaction);
      const reversal = await CashMutation.create({
        tenantId,
        locationId: mutation.locationId,
        mutationNumber,
        sourceVaultAccountId: vaultAccount.id,
        sourceAccount: vaultAccount.name,
        destinationAccount: 'transaction_cancel',
        amount,
        mutationType: 'vault_adjustment',
        referenceType,
        referenceId,
        referenceNumber: mutation.referenceNumber,
        status: 'posted',
        mutationDate: new Date().toISOString().split('T')[0],
        notes: notes || `Batal/refund pemasukan: ${mutation.notes || mutation.mutationNumber}`,
        metadata: {
          reversalOf: mutation.id,
          balanceBefore,
          balanceAfter,
        },
        createdBy,
      }, { transaction });

      await mutation.update({ status: 'cancelled' }, { transaction });

      results.push(reversal);
    }

    return results;
  };

  if (dbTransaction) return run(dbTransaction);
  return sequelize.transaction(run);
}

/**
 * Map a normalized paymentMethod to a VaultAccount.accountType.
 */
function mapPaymentMethodToAccountType(paymentMethod) {
  const mapping = {
    qris: 'qris',
    bank_transfer: 'bank_transfer',
    credit_card: 'credit_card',
    debit_card: 'debit_card',
    e_wallet: 'e_wallet',
  };
  return mapping[paymentMethod] || 'other';
}

/**
 * Build a human-readable vault account name from payment method and details.
 */
function buildVaultAccountName(paymentMethod, paymentDetails) {
  const bankName = paymentDetails?.bankName || paymentDetails?.bank_name || '';

  // If we have a bank name, use it in the label
  if (bankName) {
    const methodLabel = {
      qris: `QRIS ${bankName}`,
      bank_transfer: `Transfer ${bankName}`,
      debit_card: `Debit ${bankName}`,
      credit_card: `Kredit ${bankName}`,
      e_wallet: bankName,
    };
    return methodLabel[paymentMethod] || `${bankName}`;
  }

  // Fallback names by payment method
  const fallback = {
    qris: 'QRIS',
    bank_transfer: 'Transfer Bank',
    credit_card: 'Kartu Kredit',
    debit_card: 'Kartu Debit',
    e_wallet: 'E-Wallet',
  };
  return fallback[paymentMethod] || paymentMethod;
}

module.exports = {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getSummary,
  getCollectibles,
  collectToVault,
  getMutations,
  transferBetweenAccounts,
  adjustVault,
  recordPaymentInflow,
  reversePaymentInflows,
};
