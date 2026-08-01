'use strict';

const { Op } = require('sequelize');
const {
  sequelize,
  CashRegisterSession,
  User,
  Location,
  Transaction,
  TransactionPayment,
  TransactionItem,
  Expense,
  ExpenseCategory,
  ServicePlan,
  Tenant,
  PettyCash,
  PettyCashTransaction,
  Voucher,
  VoucherUsage,
} = require('../../../models');
const { fn, col } = require('sequelize');
const logger = require('../../../utils/logger');
const receiptPrinterService = require('../../../services/receiptPrinterService');
const {
  CASH_REGISTER_TRANSACTION_STATUSES,
  COMPLETED_PAYMENT_STATUS,
  shouldIncludeCashierTransaction,
} = require('../../../utils/reportingStatus');
const {
  getTenantTimezone,
  startOfDayInTz,
  endOfDayInTz,
  todayInTz,
} = require('../../../utils/tenantTimezone');

function getTransactionLocationWhere(locationId) {
  return locationId ? { locationId } : {};
}

function getExpenseLocationWhere(locationId) {
  return locationId
    ? { [Op.or]: [{ locationId }, { locationId: null }] }
    : {};
}

/**
 * Expense mengurangi laci kasir HANYA jika dibayar dari cash drawer.
 * Expense dari akun Tunai/Brankas juga paymentMethod=cash tapi fundSource=account — tidak masuk cash register.
 * Legacy: paymentMethod=cash tanpa fundSource/accountId dianggap dari laci.
 */
function isCashDrawerExpense(expense) {
  const fundSource = String(expense?.fundSource || '').toLowerCase();
  if (fundSource === 'cash_drawer') return true;
  if (fundSource && fundSource !== 'cash_drawer') return false;
  if (expense?.accountId || expense?.vaultAccountId) return false;
  return String(expense?.paymentMethod || '').toLowerCase() === 'cash';
}

/** Sequelize WHERE untuk expense yang mengurangi saldo laci. */
function getCashDrawerExpenseWhere(extra = {}) {
  return {
    ...extra,
    [Op.or]: [
      { fundSource: 'cash_drawer' },
      {
        paymentMethod: 'cash',
        accountId: { [Op.is]: null },
        vaultAccountId: { [Op.is]: null },
        fundSource: { [Op.is]: null },
      },
    ],
  };
}

function getPettyCashLocationInclude(locationId) {
  if (!locationId) {
    return [];
  }

  return [{
    model: PettyCash,
    as: 'pettyCash',
    where: {
      [Op.or]: [{ locationId }, { locationId: null }],
    },
    attributes: [],
    required: true,
  }];
}

/**
 * POST /gym/cash-register/open
 * Open a new shift / sesi kasir
 */
exports.openShift = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const {
      shiftName,
      openingBalance = 0,
      locationId = null,
      openingNotes = null,
    } = req.body;

    if (!shiftName) {
      return res.status(400).json({ success: false, message: 'shiftName wajib diisi (e.g. pagi, siang, malam)' });
    }
    if (openingBalance < 0) {
      return res.status(400).json({ success: false, message: 'openingBalance tidak boleh negatif' });
    }

    const now = new Date();
    // Use tenant timezone (or server TZ) for shiftDate to avoid UTC date mismatch
    const tenantTimezone = req.user?.tenant?.settings?.timezone || process.env.TZ || 'Asia/Jakarta';
    const shiftDate = now.toLocaleDateString('en-CA', { timeZone: tenantTimezone }); // YYYY-MM-DD (en-CA format)

    // Cek apakah sudah ada sesi open pada hari yang sama & lokasi yang sama
    const activeSession = await CashRegisterSession.findOne({
      where: {
        tenantId,
        status: 'open',
        ...(locationId ? { locationId } : {}),
        deletedAt: null,
      },
    });

    if (activeSession) {
      return res.status(409).json({
        success: false,
        message: 'Masih ada sesi shift yang belum ditutup',
        data: { sessionId: activeSession.id, shiftName: activeSession.shiftName, openedAt: activeSession.openedAt },
      });
    }

    // Hitung shiftNumber hari ini
    const todayCount = await CashRegisterSession.count({
      where: {
        tenantId,
        shiftDate,
        ...(locationId ? { locationId } : {}),
        deletedAt: null,
      },
    });

    // ── Opsi B: cek apakah ada transaksi hari ini sebelum shift dibuka ────────
    // Jika ada, geser openedAt mundur ke transaksi paling awal yang belum
    // ter-cover oleh session lain (sehingga tetap masuk laporan shift ini).
    const tenantTz = getTenantTimezone(req);
    const dayMidnight = startOfDayInTz(shiftDate, tenantTz);

    // Ambil semua session yang telah ada hari ini (lokasi sama atau null)
    const todaySessions = await CashRegisterSession.findAll({
      where: {
        tenantId,
        shiftDate,
        deletedAt: null,
        ...(locationId ? { [Op.or]: [{ locationId }, { locationId: null }] } : {}),
      },
      attributes: ['openedAt', 'closedAt'],
    });

    // Cari transaksi hari ini yang terjadi sebelum NOW dan belum masuk ke session manapun
    const uncoveredTxWhere = {
      tenantId,
      createdAt: { [Op.gte]: dayMidnight, [Op.lt]: now },
      status: { [Op.in]: CASH_REGISTER_TRANSACTION_STATUSES },
      deletedAt: null,
      ...(locationId ? { locationId } : {}),
    };

    const uncoveredTx = await Transaction.findAll({
      where: uncoveredTxWhere,
      attributes: ['id', 'createdAt', 'transactionNumber'],
      order: [['createdAt', 'ASC']],
    });

    // Filter: keluarkan yang sudah ter-cover oleh session sebelumnya
    const uncoveredFiltered = uncoveredTx.filter((tx) => {
      const txTime = new Date(tx.createdAt).getTime();
      return !todaySessions.some((s) => {
        const openT = new Date(s.openedAt).getTime();
        const closeT = s.closedAt ? new Date(s.closedAt).getTime() : Infinity;
        return txTime >= openT && txTime <= closeT;
      });
    });

    // Tentukan openedAt efektif (mundur ke transaksi tertua jika perlu)
    let effectiveOpenedAt = now;
    let backdatedCount = 0;
    if (uncoveredFiltered.length > 0) {
      effectiveOpenedAt = new Date(uncoveredFiltered[0].createdAt);
      backdatedCount = uncoveredFiltered.length;
      logger.warn(
        `openShift: ${backdatedCount} transaksi sebelum shift ditemukan — openedAt digeser ke ${effectiveOpenedAt.toISOString()}`,
        {
          tenantId,
          userId: req.user.id,
          earliestTx: uncoveredFiltered[0].transactionNumber,
          originalOpenedAt: now.toISOString(),
        }
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    const session = await CashRegisterSession.create({
      tenantId,
      locationId,
      shiftName: shiftName.trim(),
      shiftDate,
      shiftNumber: todayCount + 1,
      openingBalance: parseFloat(openingBalance),
      openedAt: effectiveOpenedAt,
      openedById: req.user.id,
      openingNotes,
      status: 'open',
    });

    // Inherit any pending/active restaurant orders from the previous shift.
    // These are orders whose createdAt < openedAt (created during a prior session
    // that was closed with carryOverOrders=true). We update their createdAt to
    // openedAt so they are visible in this session's summaries and active-order checks.
    const orphanedStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served'];
    const orphanedOrders = await Transaction.findAll({
      where: {
        tenantId,
        transactionType: 'restaurant',
        status: { [Op.in]: orphanedStatuses },
        createdAt: { [Op.lt]: now },
        ...(locationId ? { locationId } : {}),
      },
      attributes: ['id', 'transactionNumber', 'status'],
    });

    let inheritedCount = 0;
    if (orphanedOrders.length > 0) {
      await Transaction.update(
        { createdAt: now, transactionDate: now },
        {
          where: { id: { [Op.in]: orphanedOrders.map(o => o.id) } },
          silent: true,   // prevent Sequelize from auto-setting updatedAt
        }
      );
      inheritedCount = orphanedOrders.length;
      logger.info(`openShift: inherited ${inheritedCount} orphaned order(s) into session ${session.id}`, { tenantId });
    }

    const result = await CashRegisterSession.findByPk(session.id, {
      include: [
        { model: User, as: 'openedBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Location, as: 'location', attributes: ['id', 'name'], required: false },
      ],
    });

    logger.info(`Shift opened: ${session.id} by user ${req.user.id}`, { tenantId });

    // Bangun pesan respons
    const msgParts = [`Shift ${shiftName} berhasil dibuka`];
    if (backdatedCount > 0) {
      msgParts.push(`${backdatedCount} transaksi sebelum shift otomatis dimasukkan ke laporan shift ini.`);
    }
    if (inheritedCount > 0) {
      msgParts.push(`${inheritedCount} order dari shift sebelumnya dilanjutkan.`);
    }

    return res.status(201).json({
      success: true,
      message: msgParts.join(' '),
      data: result,
      ...(backdatedCount > 0 ? {
        backdatedTransactions: {
          count: backdatedCount,
          note: `openedAt digeser dari ${now.toISOString()} ke ${effectiveOpenedAt.toISOString()} untuk mencakup transaksi yang dibuat sebelum shift dibuka.`,
        },
      } : {}),
      ...(inheritedCount > 0 ? {
        inheritedOrders: orphanedOrders.map(o => ({
          id: o.id,
          transactionNumber: o.transactionNumber,
          status: o.status,
        })),
      } : {}),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /gym/cash-register/:id/close
 * Tutup sesi shift — input actual cash, sistem hitung selisih
 */
exports.closeShift = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const { actualCash, tipping = 0, closingNotes = null, carryOverOrders = false } = req.body;

    if (actualCash === undefined || actualCash === null) {
      return res.status(400).json({ success: false, message: 'actualCash wajib diisi' });
    }
    if (parseFloat(actualCash) < 0) {
      return res.status(400).json({ success: false, message: 'actualCash tidak boleh negatif' });
    }

    const session = await CashRegisterSession.findOne({
      where: { id, tenantId, status: 'open', deletedAt: null },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Sesi shift tidak ditemukan atau sudah ditutup' });
    }

    // Validasi: cek apakah masih ada transaksi aktif (belum selesai/dibatalkan)
    // 'split' TIDAK dimasukkan — parent 'split' sudah tidak aktif;
    // child split orders memiliki status 'pending' sendiri dan akan tertangkap di sini.
    const activeTransactions = await Transaction.findAll({
      where: {
        tenantId,
        status: { [Op.in]: ['pending', 'confirmed', 'preparing', 'ready', 'served'] },
        transactionType: 'restaurant',
        createdAt: { [Op.gte]: session.openedAt },
        ...getTransactionLocationWhere(session.locationId),
      },
      attributes: ['id', 'transactionNumber', 'status', 'tableId'],
      limit: 10,
    });

    if (activeTransactions.length > 0 && !carryOverOrders) {
      const orderList = activeTransactions.map(t => `${t.transactionNumber} (${t.status})`).join(', ');
      return res.status(400).json({
        success: false,
        message: `Tidak bisa menutup shift, masih ada ${activeTransactions.length} transaksi aktif: ${orderList}`,
        data: {
          activeCount: activeTransactions.length,
          activeOrders: activeTransactions.map(t => ({
            id: t.id,
            transactionNumber: t.transactionNumber,
            status: t.status,
          })),
        },
      });
    }

    // Hitung expected cash dari transaksi tunai selama shift ini
    const { cashIn, cashOut, expectedCash } = await session.getCashSummary();

    const actual = parseFloat(actualCash);
    // Tipping is physically stored in the drawer, so it increases the expected closing balance
    const closingBalance = parseFloat((expectedCash + parseFloat(tipping)).toFixed(2));
    const difference = parseFloat((actual - closingBalance).toFixed(2));

    await session.update({
      status: 'closed',
      closingBalance,
      actualCash: actual,
      difference,
      tipping: parseFloat(tipping),
      closedAt: new Date(),
      closedById: req.user.id,
      closingNotes,
    });

    const result = await CashRegisterSession.findByPk(session.id, {
      include: [
        { model: User, as: 'openedBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'closedBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Location, as: 'location', attributes: ['id', 'name'], required: false },
      ],
    });

    logger.info(`Shift closed: ${session.id} by user ${req.user.id}, difference: ${difference}`, { tenantId });

    // Build response — include carried-over orders info if applicable
    const carriedOverOrders = carryOverOrders && activeTransactions.length > 0
      ? activeTransactions.map(t => ({ id: t.id, transactionNumber: t.transactionNumber, status: t.status }))
      : [];

    return res.json({
      success: true,
      message: carriedOverOrders.length > 0
        ? `Shift berhasil ditutup. ${carriedOverOrders.length} order dilanjutkan ke shift berikutnya.`
        : 'Shift berhasil ditutup',
      data: {
        session: result,
        summary: {
          openingBalance: parseFloat(session.openingBalance),
          cashIn,
          cashOut,
          expectedCash: closingBalance,
          actualCash: actual,
          difference,
          status: difference === 0 ? 'balance' : difference > 0 ? 'surplus' : 'deficit',
        },
        carriedOverOrders,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /gym/cash-register/current
 * Ambil sesi shift yang sedang open untuk tenant (dan optional locationId)
 */
exports.getCurrentSession = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { locationId } = req.query;

    const session = await CashRegisterSession.findOne({
      where: {
        tenantId,
        status: 'open',
        deletedAt: null,
        ...(locationId ? { locationId } : {}),
      },
      include: [
        { model: User, as: 'openedBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Location, as: 'location', attributes: ['id', 'name'], required: false },
      ],
      order: [['openedAt', 'DESC']],
    });

    if (!session) {
      return res.json({ success: true, data: null, message: 'Tidak ada shift yang aktif' });
    }

    // Hitung summary realtime
    const { cashIn, cashOut, expectedCash } = await session.getCashSummary();

    return res.json({
      success: true,
      data: {
        session,
        liveSummary: {
          openingBalance: parseFloat(session.openingBalance),
          cashIn,
          cashOut,
          expectedCash: parseFloat(expectedCash.toFixed(2)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /gym/cash-register
 * List semua sesi (filter: date, status, locationId)
 */
exports.listSessions = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const {
      page = 1,
      limit = 20,
      status,
      locationId,
      dateFrom,
      dateTo,
      openedById,
    } = req.query;

    const where = { tenantId, deletedAt: null };

    if (status) where.status = status;
    if (locationId) where.locationId = locationId;
    if (openedById) where.openedById = openedById;
    if (dateFrom || dateTo) {
      where.shiftDate = {};
      if (dateFrom) where.shiftDate[Op.gte] = dateFrom;
      if (dateTo) where.shiftDate[Op.lte] = dateTo;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await CashRegisterSession.findAndCountAll({
      where,
      include: [
        { model: User, as: 'openedBy', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'closedBy', attributes: ['id', 'firstName', 'lastName'], required: false },
        { model: Location, as: 'location', attributes: ['id', 'name'], required: false },
      ],
      order: [['shiftDate', 'DESC'], ['shiftNumber', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    // ── Compute live sales summary for each session ────────────────────────
    const sessionsWithSummary = await Promise.all(
      rows.map(async (session) => {
        const sessionData = session.toJSON();
        try {
          const timeWhere = {
            [Op.gte]: session.openedAt,
            ...(session.closedAt ? { [Op.lte]: session.closedAt } : {}),
          };

          // Individual transaction list for this shift
          const transactionList = await Transaction.findAll({
            where: {
              tenantId,
              createdAt: timeWhere,
              status: { [Op.in]: CASH_REGISTER_TRANSACTION_STATUSES },
              deletedAt: null,
              ...getTransactionLocationWhere(session.locationId),
            },
            include: [
              {
                model: TransactionPayment,
                as: 'payments',
                where: { status: COMPLETED_PAYMENT_STATUS },
                required: false,
                attributes: ['id', 'paymentMethod', 'amount'],
              },
            ],
            attributes: [
              'id', 'transactionNumber', 'transactionType', 'orderType',
              'subtotal', 'totalAmount', 'tax', 'serviceCharge',
              'voucherDiscount', 'changeAmount', 'status', 'customerName', 'createdAt',
            ],
            order: [['createdAt', 'DESC']],
          });

          // Cash payments (net = tendered - change)
          const cashPayments = await TransactionPayment.findAll({
            where: {
              paymentMethod: 'cash',
              status: COMPLETED_PAYMENT_STATUS,
              createdAt: timeWhere,
            },
            include: [{
              model: Transaction,
              as: 'transaction',
              where: {
                tenantId,
                status: { [Op.in]: CASH_REGISTER_TRANSACTION_STATUSES },
                ...getTransactionLocationWhere(session.locationId),
              },
              required: true,
              attributes: ['id', 'changeAmount'],
            }],
          });

          const reportableTransactions = transactionList.filter(shouldIncludeCashierTransaction);

          const cashIn = cashPayments.reduce((sum, p) => {
            const tendered = parseFloat(p.amount || 0);
            const change = parseFloat(p.transaction.changeAmount || 0);
            return sum + Math.max(0, tendered - change);
          }, 0);

          // Cash drawer expenses only (bukan semua paymentMethod=cash dari akun Tunai/Brankas)
          // CATATAN: petty_cash TIDAK dimasukkan — keluar dari fund, bukan laci.
          const csTz = getTenantTimezone(req);
          const csShiftStart = startOfDayInTz(session.shiftDate, csTz);
          const csShiftEnd   = endOfDayInTz(session.shiftDate, csTz);
          const expenseResult = await Expense.findAll({
            where: getCashDrawerExpenseWhere({
              tenantId,
              status: { [Op.in]: ['paid'] },
              expenseDate: { [Op.gte]: csShiftStart, [Op.lte]: csShiftEnd },
              ...getExpenseLocationWhere(session.locationId),
            }),
            attributes: [
              [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('totalAmount')), 0), 'totalExpenses'],
            ],
            raw: true,
          });

          // Petty cash sales return (pengembalian modal petty cash dari hasil penjualan)
          const pettyCashReturns = await PettyCashTransaction.findAll({
            where: {
              tenantId,
              type: 'sales_return',
              createdAt: timeWhere,
            },
            include: getPettyCashLocationInclude(session.locationId),
            attributes: [
              [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalReturns'],
            ],
            raw: true,
          });
          const pettyCashReturnOut = parseFloat(pettyCashReturns[0]?.totalReturns || 0);

          const totalSales = reportableTransactions.reduce((sum, trx) => sum + parseFloat(trx.totalAmount || 0), 0);
          const totalSubtotal = reportableTransactions.reduce((sum, trx) => sum + parseFloat(trx.subtotal || 0), 0);
          const totalExpenses = parseFloat(expenseResult[0]?.totalExpenses || 0) + pettyCashReturnOut;

          sessionData.salesSummary = {
            transactionCount: reportableTransactions.length,
            totalSales: parseFloat(totalSales.toFixed(2)),
            subtotal: parseFloat(totalSubtotal.toFixed(2)),
            cashIn: parseFloat(cashIn.toFixed(2)),
            totalExpenses: parseFloat(totalExpenses.toFixed(2)),
            pettyCashIncome: parseFloat(pettyCashReturnOut.toFixed(2)),
            netCash: parseFloat((parseFloat(session.openingBalance || 0) + cashIn - totalExpenses).toFixed(2)),
            transactions: reportableTransactions.map(t => {
              const tJson = t.toJSON();
              const paymentMethods = (tJson.payments || []).map(p => p.paymentMethod);
              const primaryPayment = paymentMethods[0] || null;
              return {
                id: tJson.id,
                transactionNumber: tJson.transactionNumber,
                transactionType: tJson.transactionType,
                orderType: tJson.orderType,
                customerName: tJson.customerName,
                subtotal: parseFloat(tJson.subtotal || 0),
                totalAmount: parseFloat(tJson.totalAmount || 0),
                tax: parseFloat(tJson.tax || 0),
                serviceCharge: parseFloat(tJson.serviceCharge || 0),
                discount: parseFloat(tJson.voucherDiscount || 0),
                changeAmount: parseFloat(tJson.changeAmount || 0),
                status: tJson.status,
                paymentMethod: primaryPayment,
                paymentMethods: [...new Set(paymentMethods)],
                createdAt: tJson.createdAt,
              };
            }),
          };
        } catch (err) {
          logger.logError('Error computing sales summary for session', {
            sessionId: session.id,
            error: err.message,
          });
          sessionData.salesSummary = null;
        }
        return sessionData;
      })
    );

    return res.json({
      success: true,
      data: sessionsWithSummary,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /gym/cash-register/:id
 * Detail sesi shift tertentu beserta summary
 */
exports.getSession = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;

    const session = await CashRegisterSession.findOne({
      where: { id, tenantId, deletedAt: null },
      include: [
        { model: User, as: 'openedBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'closedBy', attributes: ['id', 'firstName', 'lastName', 'email'], required: false },
        { model: Location, as: 'location', attributes: ['id', 'name'], required: false },
      ],
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Sesi tidak ditemukan' });
    }

    // Summary (untuk open: live, untuk closed: simpan dari DB)
    let summary;
    if (session.status === 'open') {
      const { cashIn, cashOut, expectedCash } = await session.getCashSummary();
      summary = {
        openingBalance: parseFloat(session.openingBalance),
        cashIn,
        cashOut,
        expectedCash: parseFloat(expectedCash.toFixed(2)),
        actualCash: null,
        difference: null,
      };
    } else {
      summary = {
        openingBalance: parseFloat(session.openingBalance),
        closingBalance: parseFloat(session.closingBalance || 0),
        actualCash: parseFloat(session.actualCash || 0),
        difference: parseFloat(session.difference || 0),
        status: parseFloat(session.difference) > 0 ? 'surplus' : parseFloat(session.difference) < 0 ? 'deficit' : 'balance',
      };
    }

    return res.json({ success: true, data: { session, summary } });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// SHIFT REPORT — Report Cashier & Report Gym
// ============================================================================

/**
 * GET /gym/cash-register/:id/report
 *
 * Generate comprehensive shift report matching the manual paper reports:
 *   - Report Cashier (Restaurant/POS): sales, delivery, discount, tax, service,
 *     rounding, tipping, payment methods, expenses, cash calculation
 *   - Report Gym: membership breakdown by duration, payment methods, expenses
 *
 * Query:
 *   - type: 'all' (default) | 'cashier' | 'gym'  — which report section to return
 */
exports.getShiftReport = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const { type = 'all' } = req.query;

    // ── Load session ─────────────────────────────────────────────────────────
    const session = await CashRegisterSession.findOne({
      where: { id, tenantId, deletedAt: null },
      include: [
        { model: User, as: 'openedBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'closedBy', attributes: ['id', 'firstName', 'lastName', 'email'], required: false },
        { model: Location, as: 'location', attributes: ['id', 'name'], required: false },
      ],
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Sesi tidak ditemukan' });
    }

    // Time window for this session
    const timeWhere = {
      [Op.gte]: session.openedAt,
      ...(session.closedAt ? { [Op.lte]: session.closedAt } : {}),
    };

    // ── Load ALL transactions in this shift window ───────────────────────────
    const transactions = await Transaction.findAll({
      where: {
        tenantId,
        createdAt: timeWhere,
        // 'split' = order yang di-split tapi sudah ada pembayaran (uang masuk kas)
        // 'merged' = order yang digabung, pembayaran tetap tercatat
        status: { [Op.in]: CASH_REGISTER_TRANSACTION_STATUSES },
        deletedAt: null,
        ...getTransactionLocationWhere(session.locationId),
      },
      include: [
        {
          model: TransactionPayment,
          as: 'payments',
          where: { status: COMPLETED_PAYMENT_STATUS },
          required: false,
          attributes: ['id', 'paymentMethod', 'amount', 'paymentDetails', 'createdAt'],
        },
        {
          model: TransactionItem,
          as: 'items',
          required: false,
          attributes: ['id', 'itemType', 'itemId', 'itemName', 'quantity', 'unitPrice', 'subtotal', 'total'],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    // ── Load expenses for this shift's date (based on expenseDate, not createdAt) ──
    const shiftTz = getTenantTimezone(req);
    const shiftDayStart = startOfDayInTz(session.shiftDate, shiftTz);
    const shiftDayEnd   = endOfDayInTz(session.shiftDate, shiftTz);
    const expenses = await Expense.findAll({
      where: {
        tenantId,
        status: { [Op.in]: ['paid'] },
        expenseDate: { [Op.gte]: shiftDayStart, [Op.lte]: shiftDayEnd },
        ...getExpenseLocationWhere(session.locationId),
      },
      include: [
        { model: ExpenseCategory, as: 'category', attributes: ['id', 'name', 'type'], required: false },
      ],
      order: [['expenseDate', 'ASC']],
    });

    const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.totalAmount || 0), 0);
    const cashExpenses = expenses
      .filter(isCashDrawerExpense)
      .reduce((s, e) => s + parseFloat(e.totalAmount || 0), 0);
    const transferExpenses = expenses
      .filter(e => {
        const pm = (e.paymentMethod || '').toLowerCase();
        return pm === 'transfer' || pm === 'bank_transfer';
      })
      .reduce((s, e) => s + parseFloat(e.totalAmount || 0), 0);
    // Expense yg dibayar dari petty cash fund — tidak mempengaruhi saldo kas register
    const pettyCashPaidExpenses = expenses
      .filter(e => (e.paymentMethod || '').toLowerCase() === 'petty_cash')
      .reduce((s, e) => s + parseFloat(e.totalAmount || 0), 0);

    // ── Petty cash sales return during this shift (pengembalian modal dari penjualan) ──────
    const pettyCashReturns = await PettyCashTransaction.findAll({
      where: {
        tenantId,
        type: 'sales_return',
        createdAt: timeWhere,
      },
      include: getPettyCashLocationInclude(session.locationId),
      attributes: ['id', 'amount', 'description', 'transactionDate', 'transactionNumber'],
      order: [['createdAt', 'ASC']],
    });
    const pettyCashReturnTotal = pettyCashReturns
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0);

    // Add petty cash returns to cash expenses (cash taken from register)
    const cashExpensesWithPettyCash = cashExpenses + pettyCashReturnTotal;

    const expenseDetail = expenses
      .filter(isCashDrawerExpense)
      .map(e => {
      const pm = (e.paymentMethod || '').toLowerCase();
      const isPettyCash = pm === 'petty_cash';
      return {
        id: e.id,
        title: e.title,
        amount: parseFloat(e.totalAmount || 0),
        paymentMethod: e.paymentMethod,
        fundSource: e.fundSource || null,
        category: e.category?.name || null,
        expenseDate: e.expenseDate,
        // affectsCashRegister: hanya expense dari laci (fundSource=cash_drawer)
        affectsCashRegister: true,
        // affectsPettyCash: apakah expense ini mengurangi saldo petty cash fund
        affectsPettyCash: isPettyCash,
      };
    });

    // Include petty cash returns in expense detail (cash leaving the drawer)
    const pettyCashReturnDetail = pettyCashReturns.map(p => ({
      id: p.id,
      title: `Pemasukan ke petty cash: ${p.description || p.transactionNumber}`,
      amount: parseFloat(p.amount || 0),
      paymentMethod: 'petty_cash_return',
      category: 'Petty Cash',
      expenseDate: p.transactionDate,
      affectsPettyCash: true,
      affectsCashRegister: true,
    }));

    // ── Build response ───────────────────────────────────────────────────────
    const response = {
      session: {
        id: session.id,
        shiftName: session.shiftName,
        shiftDate: session.shiftDate,
        shiftNumber: session.shiftNumber,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        status: session.status,
        openedBy: session.openedBy
          ? `${session.openedBy.firstName || ''} ${session.openedBy.lastName || ''}`.trim()
          : null,
        closedBy: session.closedBy
          ? `${session.closedBy.firstName || ''} ${session.closedBy.lastName || ''}`.trim()
          : null,
        location: session.location?.name || null,
        openingBalance: parseFloat(session.openingBalance || 0),
        actualCash: session.actualCash != null ? parseFloat(session.actualCash) : null,
        difference: session.difference != null ? parseFloat(session.difference) : null,
        tipping: parseFloat(session.tipping || 0),
      },
    };

    // ── REPORT CASHIER (Restaurant + POS) ────────────────────────────────────
    if (type === 'all' || type === 'cashier') {
      const cashierTrx = transactions.filter(t => ['restaurant', 'pos'].includes(t.transactionType) && shouldIncludeCashierTransaction(t));

      response.reportCashier = buildCashierReport(cashierTrx, cashExpensesWithPettyCash, expenses, session);
    }

    // ── REPORT GYM ───────────────────────────────────────────────────────────
    if (type === 'all' || type === 'gym') {
      const gymTrx = transactions.filter(t => t.transactionType === 'gym' && shouldIncludeCashierTransaction(t));
      const refundedGymTrx = await Transaction.findAll({
        where: {
          tenantId,
          createdAt: timeWhere,
          transactionType: 'gym',
          status: { [Op.in]: ['refunded', 'partially_refunded'] },
          deletedAt: null,
          ...getTransactionLocationWhere(session.locationId),
        },
        attributes: ['id', 'transactionNumber', 'totalAmount'],
      });
      response.reportGym = await buildGymReport(gymTrx, cashExpensesWithPettyCash, expenses, tenantId, refundedGymTrx);
    }

    // ── Combined summary ─────────────────────────────────────────────────────
    response.expenseDetail = [...expenseDetail, ...pettyCashReturnDetail];
    // totalExpenses = cash-only expenses (yang mengurangi saldo kas register)
    // allExpenses   = semua pengeluaran termasuk transfer & petty_cash (informasi)
    response.totalExpenses = parseFloat(cashExpensesWithPettyCash.toFixed(2));
    response.allExpenses = parseFloat((totalExpenses + pettyCashReturnTotal).toFixed(2));
    response.cashExpenses = parseFloat(cashExpenses.toFixed(2));
    response.transferExpenses = parseFloat(transferExpenses.toFixed(2));
    // Expense dari petty cash fund — tidak mempengaruhi kas register, ditampilkan terpisah
    response.pettyCashPaidExpenses = parseFloat(pettyCashPaidExpenses.toFixed(2));
    response.pettyCashIncomeTotal = parseFloat(pettyCashReturnTotal.toFixed(2));
    response.cashExpensesWithPettyCash = parseFloat(cashExpensesWithPettyCash.toFixed(2));
    response.totalTransactions = transactions.filter(shouldIncludeCashierTransaction).length;

    // ── Petty Cash Fund Info ─────────────────────────────────────────────────
    try {
      const pcFunds = await PettyCash.findAll({
        where: {
          tenantId,
          ...(session.locationId ? { locationId: session.locationId } : {}),
          status: 'active'
        },
        attributes: ['id', 'name', 'balance', 'initialAmount'],
        raw: true
      });

      const pcTrxSummary = await PettyCashTransaction.findAll({
        where: {
          tenantId,
          createdAt: timeWhere,
          deletedAt: null
        },
        include: getPettyCashLocationInclude(session.locationId),
        attributes: [
          'type',
          [fn('COALESCE', fn('SUM', col('amount')), 0), 'totalAmount'],
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['type'],
        raw: true
      });

      const pcByType = {};
      pcTrxSummary.forEach(row => {
        pcByType[row.type] = {
          total: parseFloat(parseFloat(row.totalAmount || 0).toFixed(2)),
          count: parseInt(row.count || 0)
        };
      });

      response.pettyCash = {
        fundCount: pcFunds.length,
        totalBalance: parseFloat(pcFunds.reduce((s, f) => s + parseFloat(f.balance || 0), 0).toFixed(2)),
        totalInitialAmount: parseFloat(pcFunds.reduce((s, f) => s + parseFloat(f.initialAmount || 0), 0).toFixed(2)),
        transactionsByType: pcByType,
        funds: pcFunds.map(f => ({
          id: f.id,
          name: f.name,
          balance: parseFloat(f.balance || 0),
          initialAmount: parseFloat(f.initialAmount || 0)
        }))
      };
    } catch (_e) {
      response.pettyCash = { fundCount: 0, totalBalance: 0, totalInitialAmount: 0, transactionsByType: {}, funds: [] };
    }

    // ── Combined Cash Summary ─────────────────────────────────────────────────
    // totalSalesResto/Gym = total pendapatan semua metode (untuk Rekap Harian)
    // pengeluaran = cash expenses only (transfer tidak mengurangi kas)
    // grandTotal  = totalSalesResto + totalSalesGym - pengeluaran(cash)
    const totalSalesResto = response.reportCashier?.J_grandTotal || 0;
    const totalSalesGym   = response.reportGym?.grandTotal || 0;
    const totalSales      = totalSalesResto + totalSalesGym;
    const grandTotal      = parseFloat((totalSales - cashExpensesWithPettyCash).toFixed(2));

    // cash-only breakdown (dari payment methods — sudah termasuk rounding)
    const cashSalesResto  = response.reportCashier?.paymentMethods?.cash?.amount || 0;
    const cashSalesGym    = response.reportGym?.paymentCash || 0;

    // non-cash breakdown — dihitung langsung dari payment methods (bukan residual)
    const nonCashSalesResto = parseFloat(
      Object.entries(response.reportCashier?.paymentMethods || {})
        .filter(([k]) => k !== 'cash' && k !== 'compliment')
        .reduce((s, [, v]) => s + (v.amount || 0), 0)
        .toFixed(2)
    );
    const nonCashSalesGym = parseFloat(
      Object.entries(response.reportGym?.paymentMethods || {})
        .filter(([k]) => k !== 'cash' && k !== 'compliment')
        .reduce((s, [, v]) => s + (v.amount || 0), 0)
        .toFixed(2)
    );
    const totalNonCash = parseFloat((nonCashSalesResto + nonCashSalesGym).toFixed(2));

    // rounding (selisih pembulatan resto)
    const roundingResto = parseFloat((response.reportCashier?.H_rounding || 0).toFixed(2));

    response.cashSummary = {
      totalSalesResto:  parseFloat(totalSalesResto.toFixed(2)),
      totalSalesGym:    parseFloat(totalSalesGym.toFixed(2)),
      totalSales:       parseFloat(totalSales.toFixed(2)),
      pengeluaran:      parseFloat(cashExpensesWithPettyCash.toFixed(2)),
      grandTotal,
      // cash-only portion per modul (termasuk rounding — uang fisik di laci)
      cashSalesResto:   parseFloat(cashSalesResto.toFixed(2)),
      cashSalesGym:     parseFloat(cashSalesGym.toFixed(2)),
      cashGrandTotal:   parseFloat((cashSalesResto + cashSalesGym - cashExpensesWithPettyCash).toFixed(2)),
      // non-cash portion per modul (dari payment methods, bukan residual)
      nonCashSalesResto,
      nonCashSalesGym,
      totalNonCash,
      // rounding (selisih pembulatan resto)
      roundingResto,
    };

    return res.json({ success: true, data: response });
  } catch (err) {
    next(err);
  }
};

/**
 * Build payment method breakdown with optional bank/provider sub-detail.
 *
 * Reads paymentDetails.bank (or paymentDetails.provider) from each TransactionPayment
 * to create a detail array per method.  When the frontend sends
 *   paymentDetails: { bank: "BCA" }  or  paymentDetails: { provider: "Mandiri" }
 * the breakdown will automatically include sub-grouping.
 *
 * Result shape per method:
 *   { amount: 1000, count: 5, detail: [{ bankName: "BCA", total: 600, transactionCount: 3 }, ...] }
 *
 * @param {Array} transactions  - filtered transactions to include
 * @returns {Object}  { [normalizedMethod]: { amount, count, detail } }
 */
function buildPaymentBreakdown(transactions) {
  const breakdown = {};
  transactions.forEach(t => {
    // changeAmount is stored at the Transaction level (kasir kembalikan uang ke customer).
    // For cash payments we must deduct it so only the actual net cash entering the register
    // is counted — consistent with getCashSummary() in the model.
    const trxChange = parseFloat(t.changeAmount || 0);

    (t.payments || []).forEach(p => {
      const method = normalizePaymentMethod(p.paymentMethod);
      if (!breakdown[method]) {
        breakdown[method] = { amount: 0, count: 0, _detailMap: {}, transactions: [] };
      }

      const rawAmt = parseFloat(p.amount || 0);
      // Deduct kembalian hanya pada pembayaran cash
      const amt = method === 'cash'
        ? Math.max(0, rawAmt - trxChange)
        : rawAmt;

      breakdown[method].amount += amt;
      breakdown[method].count++;

      // Sub-group by bank/provider from paymentDetails
      const details = p.paymentDetails || {};
      const subKey = details.bank || details.provider || null;
      if (subKey) {
        const key = subKey.trim();
        if (!breakdown[method]._detailMap[key]) breakdown[method]._detailMap[key] = { amount: 0, count: 0 };
        breakdown[method]._detailMap[key].amount += amt;
        breakdown[method]._detailMap[key].count++;
      }

      // Detail card: list transaksi individual per payment method
      breakdown[method].transactions.push({
        transactionNumber: t.transactionNumber,
        transactionType: t.transactionType,
        orderType: t.orderType || null,
        customerName: t.customerName || null,
        // Nominal yang masuk untuk metode pembayaran ini (sudah dipotong kembalian untuk cash)
        amount: parseFloat(amt.toFixed(2)),
        // Nominal asli yang dibayar pelanggan (sebelum dipotong kembalian)
        amountTendered: parseFloat(rawAmt.toFixed(2)),
        changeAmount: method === 'cash' ? parseFloat(trxChange.toFixed(2)) : 0,
        // Sub-info bank/provider jika ada
        bank: details.bank || null,
        provider: details.provider || null,
        referenceNumber: details.referenceNumber || details.refNumber || null,
        createdAt: t.createdAt,
      });
    });
  });

  // Round amounts & convert detail map to array, sort transactions by createdAt
  Object.keys(breakdown).forEach(k => {
    breakdown[k].amount = parseFloat(breakdown[k].amount.toFixed(2));
    breakdown[k].detail = Object.entries(breakdown[k]._detailMap).map(([bankName, val]) => ({
      bankName,
      total: parseFloat(val.amount.toFixed(2)),
      transactionCount: val.count
    })).sort((a, b) => b.total - a.total);
    breakdown[k].transactions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    delete breakdown[k]._detailMap;
  });

  return breakdown;
}

/**
 * Build Report Cashier (Restaurant/POS) — matches the manual paper form
 *
 *   A  Penjualan           — gross sales (subtotal)
 *   B  Delivery             — delivery-type order subtotals
 *   C  Discount             — total voucher discounts
 *   D  Total Penj. - Delivery (A - B)
 *   E  Total Penj. - Disc  (A - C)   → net sales
 *   F  Service              — service charge total
 *   G  Tax                  — tax total
 *   H  Rounding             — rounding difference (informational, NOT added to grand total)
 *   I  Tipping              — tips (from paymentDetails if available)
 *   J  Grand Total          (E + F + G + I)  — rounding excluded
 *   K  Pengeluaran          — cash expenses during shift
 *   L…P Payment breakdown   — per payment method totals
 *   Q  Total Cash           (J - K - nonCashPayments)
 */
function buildCashierReport(cashierTrx, cashExpenses, allExpenses, session) {
  // Pisahkan transaksi compliment dari transaksi regular.
  // Compliment = order yang dibayar dengan payment method 'compliment' (gratis dari owner).
  // Subtotal-nya masuk ke R_complimentTotal, BUKAN ke A_penjualan / C_discount.
  const isComplimentTrx = (t) => (t.payments || []).some(
    p => normalizePaymentMethod(p.paymentMethod) === 'compliment'
  );
  const regularTrx     = cashierTrx.filter(t => !isComplimentTrx(t));
  const complimentTrxs = cashierTrx.filter(t =>  isComplimentTrx(t));

  // A: Penjualan (gross subtotal — transaksi regular saja)
  const penjualan = regularTrx.reduce((s, t) => s + parseFloat(t.subtotal || 0), 0);

  // B: Delivery orders subtotal
  const deliveryTrx = regularTrx.filter(t => t.orderType === 'delivery');
  const delivery = deliveryTrx.reduce((s, t) => s + parseFloat(t.subtotal || 0), 0);

  // C: Discount (regular voucher only — compliment voucher masuk R_complimentTotal)
  const discount = regularTrx.reduce((s, t) => s + parseFloat(t.voucherDiscount || 0), 0);

  // D: Total Penj. - Delivery (A - B)
  const totalPenjMinusDelivery = penjualan - delivery;

  // E: Total Penj. - Disc (A - C) → net sales after discount
  const netSales = penjualan - discount;

  // F: Service charge (transaksi regular saja)
  const serviceCharge = regularTrx.reduce((s, t) => s + parseFloat(t.serviceCharge || 0), 0);

  // G: Tax (transaksi regular saja)
  const tax = regularTrx.reduce((s, t) => s + parseFloat(t.tax || 0), 0);

  // H: Rounding
  const rounding = parseFloat(
    regularTrx.reduce((s, t) => s + parseFloat(t.roundingAmount || 0), 0).toFixed(2)
  );

  // I: Tipping — extract from payment details if stored, add manual session tipping
  let tipping = parseFloat(session.tipping || 0);
  regularTrx.forEach(t => {
    (t.payments || []).forEach(p => {
      if (p.paymentDetails && p.paymentDetails.tipping) {
        tipping += parseFloat(p.paymentDetails.tipping || 0);
      }
    });
  });

  // J: Grand Total = E + F + G + I  (rounding excluded — shown separately)
  const grandTotal = parseFloat((netSales + serviceCharge + tax + tipping).toFixed(2));

  // Payment method breakdown (transaksi regular saja — compliment trx punya totalAmount = 0)
  // Includes sub-detail per bank/provider from paymentDetails
  const paymentBreakdown = buildPaymentBreakdown(regularTrx);

  // K: Pengeluaran (cash expenses only for cash calculation)
  const pengeluaran = parseFloat(cashExpenses.toFixed(2));

  // R: Compliment total = subtotal order yang dibayar dengan payment method 'compliment'
  const complimentTotal = parseFloat(
    complimentTrxs.reduce((s, t) => s + parseFloat(t.subtotal || 0), 0).toFixed(2)
  );

  // Non-cash payment total (termasuk compliment agar Q_totalCash akurat)
  const nonCashTotal = Object.entries(paymentBreakdown)
    .filter(([method]) => method !== 'cash')
    .reduce((s, [, v]) => s + v.amount, 0);

  // Q: Total Cash = Grand Total - all non-cash payments (cash sales from cashier only, BEFORE expenses)
  // Pengeluaran TIDAK dikurangi di sini — hanya dikurangi sekali di cashSummary (combined dengan gym)
  const totalCash = parseFloat((grandTotal - nonCashTotal).toFixed(2));

  return {
    // Row A-I
    A_penjualan: parseFloat(penjualan.toFixed(2)),
    B_delivery: parseFloat(delivery.toFixed(2)),
    C_discount: parseFloat(discount.toFixed(2)),
    D_totalPenjMinusDelivery: parseFloat(totalPenjMinusDelivery.toFixed(2)),
    E_netSales: parseFloat(netSales.toFixed(2)),
    F_serviceCharge: parseFloat(serviceCharge.toFixed(2)),
    G_tax: parseFloat(tax.toFixed(2)),
    H_rounding: rounding,
    I_tipping: parseFloat(tipping.toFixed(2)),
    // Row J
    J_grandTotal: grandTotal,
    // Row K
    K_pengeluaran: pengeluaran,
    // Payment methods (L, M, N, O, P etc)
    paymentMethods: paymentBreakdown,
    // Row Q
    Q_totalCash: totalCash,
    // Row R: Compliment (nilai transaksi gratis dari owner — voucher compliment + payment method compliment)
    R_complimentTotal: complimentTotal,
    // Transaction count (total semua: regular + compliment)
    transactionCount: cashierTrx.length,
    deliveryCount: deliveryTrx.length,
    // Pax (number of completed transactions for this shift)
    pax: cashierTrx.length,
  };
}

/**
 * Build Report Gym — membership breakdown + payment methods + expenses
 *
 * Groups gym transactions by service plan duration:
 *   Daily (1 day), Weekly (7 days), 1 Month (30 days),
 *   3 Month (90 days), 6 Month (180 days), 12 Month (365 days)
 * Also includes product-type items (Bath Towel, etc.)
 */
async function buildGymReport(gymTrx, cashExpenses, allExpenses, tenantId, refundedGymTrx = []) {
  // Collect all service_plan itemIds to look up durations
  const servicePlanIds = new Set();
  const productItems = [];

  gymTrx.forEach(t => {
    (t.items || []).forEach(item => {
      if (item.itemType === 'service_plan' || item.itemType === 'membership') {
        servicePlanIds.add(item.itemId);
      } else if (item.itemType === 'product') {
        productItems.push(item);
      }
    });
  });

  // Load service plans for duration / session info
  const servicePlans = servicePlanIds.size > 0
    ? await ServicePlan.findAll({
      where: { id: { [Op.in]: [...servicePlanIds] } },
      attributes: ['id', 'name', 'duration', 'durationType', 'serviceType', 'price', 'pax', 'sessions', 'validityDays'],
    })
    : [];
  const planMap = {};
  servicePlans.forEach(sp => { planMap[sp.id] = sp; });

  /**
   * Extract pax count from service plan name as fallback.
   * e.g. "2 Pax Daily Pass" → 2, "3PAX" → 3, "Daily Pass" → 1
   */
  function parsePaxFromName(name) {
    if (!name) return 1;
    const m = String(name).match(/(\d+)\s*pax/i);
    return m ? parseInt(m[1], 10) : 1;
  }

  /**
   * Get effective pax count for a service plan item.
   * Priority: plan.pax (DB) if > 1, else parse from plan/item name.
   */
  function getPaxPerUnit(plan, itemName) {
    if (plan?.pax && plan.pax > 1) return plan.pax;
    return parsePaxFromName(plan?.name || itemName);
  }

  // Classify memberships by duration bucket
  const membershipBuckets = {
    daily:   { label: 'Daily',           durationDays: [1],            count: 0, amount: 0, planDetails: {} },
    weekly:  { label: 'Weekly Member',   durationDays: [7],            count: 0, amount: 0, planDetails: {} },
    '1month':  { label: '1 Month Member',  durationDays: [28, 30, 31],   count: 0, amount: 0, planDetails: {} },
    '3month':  { label: '3 Month Member',  durationDays: [84, 90, 92],   count: 0, amount: 0, planDetails: {} },
    '6month':  { label: '6 Month Member',  durationDays: [168, 180, 184],count: 0, amount: 0, planDetails: {} },
    '12month': { label: '12 Month Member', durationDays: [360, 365, 366],count: 0, amount: 0, planDetails: {} },
  };

  // Helper: find bucket by duration
  function getBucket(durationDays) {
    if (!durationDays || durationDays <= 0) return null;
    if (durationDays <= 1) return 'daily';
    if (durationDays <= 7) return 'weekly';
    if (durationDays <= 31) return '1month';
    if (durationDays <= 92) return '3month';
    if (durationDays <= 184) return '6month';
    return '12month';
  }

  // ── Session-based package buckets (PT, class, spa, custom) ─────────────
  // Grouped by: serviceType → then by session count key
  const SESSION_TYPE_LABELS = {
    pt_package:    'PT Package',
    class_package: 'Class Package',
    spa_package:   'Spa Package',
    custom:        'Custom Package',
    membership:    'Membership Package', // session-based membership (rare)
  };
  const sessionBuckets = {}; // { [serviceType]: { label, count, amount, planDetails: { [planKey]: {...} } } }

  // ── Helper: distribute transaction-level discount proportionally to items ──
  // Discount (voucherDiscount) is stored at the Transaction level, not per-item.
  // To show net (paid) amounts per item, we distribute discount proportionally
  // based on each item's share of the transaction subtotal.
  function getItemNetAmount(trx, item) {
    const itemGross = parseFloat(item.total || item.subtotal || 0);
    const trxSubtotal = parseFloat(trx.subtotal || 0);
    const trxDiscount = parseFloat(trx.voucherDiscount || 0);

    if (trxDiscount <= 0 || trxSubtotal <= 0) return itemGross;

    // Proportional discount: item gets (itemGross / trxSubtotal) share of total discount
    const discountShare = (itemGross / trxSubtotal) * trxDiscount;
    return Math.max(0, itemGross - discountShare);
  }

  // ── Classify each gym transaction item ───────────────────────────────────
  const otherItems = []; // non-membership items (bath towel, etc.)
  gymTrx.forEach(t => {
    (t.items || []).forEach(item => {
      if (item.itemType === 'service_plan' || item.itemType === 'membership') {
        const plan    = planMap[item.itemId];
        const planKey = item.itemId || item.itemName;
        const planName = plan?.name || item.itemName;
        const masterPrice = plan?.price != null ? parseFloat(plan.price) : null;
        const itemGross   = parseFloat(item.total || item.subtotal || 0);
        const itemAmount  = getItemNetAmount(t, item); // net amount after discount

        if (!plan || plan.durationType === 'time_based') {
          // ── TIME-BASED: bucket by duration ────────────────────────────
          const duration = plan?.duration || 0;
          const bucket   = getBucket(duration);
          if (bucket && membershipBuckets[bucket]) {
            const paxPerUnit   = getPaxPerUnit(plan, item.itemName);
            const personCount  = item.quantity * paxPerUnit;
            membershipBuckets[bucket].count  += personCount;
            membershipBuckets[bucket].amount += itemAmount;

            if (!membershipBuckets[bucket].planDetails[planKey]) {
              membershipBuckets[bucket].planDetails[planKey] = {
                id:          item.itemId || null,
                name:        planName,
                serviceType: plan?.serviceType || null,
                duration:    plan?.duration    || null,
                durationType: 'time_based',
                masterPrice,
                unitPrice:   parseFloat(item.unitPrice || 0),
                paxPerUnit,
                count:       0,
                personCount: 0,
                amount:      0,
              };
            }
            const pd = membershipBuckets[bucket].planDetails[planKey];
            pd.count       += item.quantity;
            pd.personCount += personCount;
            pd.amount      += itemAmount;
          }
        } else {
          // ── SESSION-BASED: bucket by serviceType ──────────────────────
          const svcType  = plan?.serviceType || 'custom';
          const sessions = plan?.sessions    || 0;
          const validity = plan?.validityDays || null;

          if (!sessionBuckets[svcType]) {
            sessionBuckets[svcType] = {
              label:       SESSION_TYPE_LABELS[svcType] || svcType,
              count:       0,
              amount:      0,
              planDetails: {},
            };
          }
          sessionBuckets[svcType].count  += item.quantity;
          sessionBuckets[svcType].amount += itemAmount;

          if (!sessionBuckets[svcType].planDetails[planKey]) {
            sessionBuckets[svcType].planDetails[planKey] = {
              id:           item.itemId || null,
              name:         planName,
              serviceType:  svcType,
              sessions,
              validityDays: validity,
              durationType: 'session_based',
              masterPrice,
              unitPrice:    parseFloat(item.unitPrice || 0),
              count:        0,
              amount:       0,
            };
          }
          const sp = sessionBuckets[svcType].planDetails[planKey];
          sp.count  += item.quantity;
          sp.amount += itemAmount;
        }
      } else {
        otherItems.push({
          name:     item.itemName,
          quantity: item.quantity,
          amount:   getItemNetAmount(t, item), // net amount after discount
        });
      }
    });
  });

  // ── Finalize time-based memberships ──────────────────────────────────────
  const memberships = {};
  Object.entries(membershipBuckets).forEach(([key, bucket]) => {
    const plans = Object.values(bucket.planDetails)
      .map(pd => ({ ...pd, amount: parseFloat(pd.amount.toFixed(2)) }))
      .sort((a, b) => b.amount - a.amount);
    memberships[key] = {
      label:  bucket.label,
      count:  bucket.count,
      amount: parseFloat(bucket.amount.toFixed(2)),
      plans,
    };
  });

  // ── Finalize session-based packages ──────────────────────────────────────
  const sessionPackages = {};
  Object.entries(sessionBuckets).forEach(([svcType, bucket]) => {
    const plans = Object.values(bucket.planDetails)
      .map(pd => ({ ...pd, amount: parseFloat(pd.amount.toFixed(2)) }))
      .sort((a, b) => b.amount - a.amount);
    sessionPackages[svcType] = {
      label:  bucket.label,
      count:  bucket.count,
      amount: parseFloat(bucket.amount.toFixed(2)),
      plans,
    };
  });

  // Other items (bath towel, etc.) — group by name
  const otherItemsGrouped = {};
  otherItems.forEach(item => {
    if (!otherItemsGrouped[item.name]) {
      otherItemsGrouped[item.name] = { count: 0, amount: 0 };
    }
    otherItemsGrouped[item.name].count += item.quantity;
    otherItemsGrouped[item.name].amount += item.amount;
  });
  Object.keys(otherItemsGrouped).forEach(k => {
    otherItemsGrouped[k].amount = parseFloat(otherItemsGrouped[k].amount.toFixed(2));
  });

  // ── Voucher usage breakdown ────────────────────────────────────────────
  // Query VoucherUsages for gym transactions to build per-voucher summary
  const gymTrxIds = gymTrx.map(t => t.id);
  let voucherSummary = { count: 0, totalDiscount: 0, vouchers: [] };

  if (gymTrxIds.length > 0) {
    const usages = await VoucherUsage.findAll({
      where: { transactionId: { [Op.in]: gymTrxIds } },
      include: [{
        model: Voucher,
        as: 'voucher',
        attributes: ['id', 'code', 'name'],
      }],
      attributes: ['id', 'voucherId', 'transactionId', 'discountAmount'],
    });

    const voucherMap = {};
    usages.forEach(u => {
      const code = u.voucher?.code || 'UNKNOWN';
      const name = u.voucher?.name || '';
      if (!voucherMap[code]) {
        voucherMap[code] = { code, name, count: 0, totalDiscount: 0 };
      }
      voucherMap[code].count += 1;
      voucherMap[code].totalDiscount += parseFloat(u.discountAmount || 0);
    });

    const voucherList = Object.values(voucherMap)
      .map(v => ({ ...v, totalDiscount: parseFloat(v.totalDiscount.toFixed(2)) }))
      .sort((a, b) => b.totalDiscount - a.totalDiscount);

    voucherSummary = {
      count: usages.length,
      totalDiscount: parseFloat(usages.reduce((s, u) => s + parseFloat(u.discountAmount || 0), 0).toFixed(2)),
      vouchers: voucherList,
    };
  }

  // Payment method breakdown for gym transactions
  // Includes sub-detail per bank/provider from paymentDetails
  const paymentBreakdown = buildPaymentBreakdown(gymTrx);

  // Expense (cash only for gym)
  const pengeluaran = parseFloat(cashExpenses.toFixed(2));

  // Totals
  const paymentCash = paymentBreakdown.cash?.amount || 0;

  // Compliment: transaksi gratis dari owner — gunakan subtotal (bukan payment amount yang selalu 0)
  const complimentTrxs  = gymTrx.filter(t =>
    (t.payments || []).some(p => normalizePaymentMethod(p.paymentMethod) === 'compliment')
  );
  const regularGymTrx = gymTrx.filter(t =>
    !(t.payments || []).some(p => normalizePaymentMethod(p.paymentMethod) === 'compliment')
  );
  const complimentTotal = parseFloat(
    complimentTrxs.reduce((s, t) => s + parseFloat(t.subtotal || 0), 0).toFixed(2)
  );

  // Discount voucher total — exclude compliment trx (100% voucher tidak masuk kolom discount)
  const totalDiscount = parseFloat(
    regularGymTrx.reduce((s, t) => s + parseFloat(t.voucherDiscount || 0), 0).toFixed(2)
  );

  // Non-cash = semua kecuali cash dan compliment
  // Compliment tetap ditampilkan di paymentBreakdown tapi TIDAK dihitung ke grand total
  const totalCardPayments = Object.entries(paymentBreakdown)
    .filter(([method]) => method !== 'cash' && method !== 'compliment')
    .reduce((s, [, v]) => s + v.amount, 0);

  // Compliment payment amount (dari paymentBreakdown, bukan subtotal)
  const complimentPaymentAmount = paymentBreakdown.compliment?.amount || 0;

  // totalCash = cash penjualan gym saja (SEBELUM pengeluaran)
  // Pengeluaran TIDAK dikurangi di sini — hanya dikurangi sekali di cashSummary (combined dengan resto)
  const totalCashAfterExpense = parseFloat(paymentCash.toFixed(2));
  // totalCard = non-cash, non-compliment
  const totalCard = parseFloat(totalCardPayments.toFixed(2));
  // grandTotal = total penerimaan (cash + non-cash) — EXCLUDE compliment
  const grandTotal = parseFloat((paymentCash + totalCard).toFixed(2));

  // Service charge & tax total — dari regularGymTrx saja (compliment tidak ada SC/tax)
  const serviceChargeTotal = parseFloat(
    regularGymTrx.reduce((s, t) => s + parseFloat(t.serviceCharge || 0), 0).toFixed(2)
  );
  const taxTotal = parseFloat(
    regularGymTrx.reduce((s, t) => s + parseFloat(t.tax || 0), 0).toFixed(2)
  );

  // Penjualan kotor gym = subtotal semua transaksi regular (sebelum diskon)
  const penjualanKotor = parseFloat(
    regularGymTrx.reduce((s, t) => s + parseFloat(t.subtotal || 0), 0).toFixed(2)
  );

  // Refunded transactions
  const refundedTotal = parseFloat(
    refundedGymTrx.reduce((s, t) => s + parseFloat(t.totalAmount || 0), 0).toFixed(2)
  );
  const refundedCount = refundedGymTrx.length;

  return {
    memberships,
    sessionPackages,
    otherItems: otherItemsGrouped,
    paymentMethods: paymentBreakdown,
    pengeluaran,
    penjualanKotor,
    totalDiscount,
    voucherSummary,
    serviceChargeTotal,
    taxTotal,
    paymentCash: parseFloat(paymentCash.toFixed(2)),
    totalCash: totalCashAfterExpense,
    totalCard,
    complimentTotal,
    refundedTotal,
    refundedCount,
    grandTotal,
    transactionCount: gymTrx.length,
  };
}

/**
 * Normalize payment method names for consistent grouping.
 * Maps variants to canonical names matching the paper report labels.
 */
function normalizePaymentMethod(method) {
  if (!method) return 'other';
  const m = method.toLowerCase().trim();

  // QRIS variants
  if (m.includes('qris')) return 'qris';

  // Bank-specific
  if (m.includes('bni')) return 'bni';
  if (m.includes('bca')) return 'bca';
  if (m.includes('mandiri')) return 'mandiri';

  // Gojek / GoPay
  if (m.includes('gojek') || m.includes('gopay')) return 'gojek';

  // Cash
  if (m === 'cash' || m === 'tunai') return 'cash';

  // Compliment (gratis dari owner, tidak masuk kas)
  if (m === 'compliment' || m === 'komplemen' || m === 'gratis') return 'compliment';

  // Credit/debit card
  if (m.includes('credit') || m.includes('debit') || m === 'card') return 'card';

  // E-wallet
  if (m.includes('e_wallet') || m.includes('e-wallet') || m.includes('ewallet')) return 'e_wallet';

  // Bank transfer
  if (m.includes('transfer') || m.includes('bank')) return 'bank_transfer';

  return m; // keep original if no match
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY REPORT — aggregate all shifts in one day
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /gym/cash-register/daily-report
 *
 * Revenue harian — aggregasi dari semua shift dalam 1 hari.
 * Query:
 *   - date: YYYY-MM-DD (default: today)
 *   - type: 'all' | 'cashier' | 'gym' (default: 'all')
 *   - locationId: filter by location (optional)
 */
exports.getDailyReport = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { type = 'all', locationId } = req.query;

    // Parse date — default to today in tenant timezone (from DB)
    const dailyTz = getTenantTimezone(req);
    let targetDate = req.query.date;
    if (!targetDate) {
      targetDate = todayInTz(dailyTz);
    }

    // Day window: all sessions whose shiftDate = targetDate
    const sessionWhere = {
      tenantId,
      shiftDate: targetDate,
      deletedAt: null,
    };
    if (locationId) sessionWhere.locationId = locationId;

    const sessions = await CashRegisterSession.findAll({
      where: sessionWhere,
      include: [
        { model: User, as: 'openedBy', attributes: ['id', 'firstName', 'lastName'], required: false },
        { model: User, as: 'closedBy', attributes: ['id', 'firstName', 'lastName'], required: false },
        { model: Location, as: 'location', attributes: ['id', 'name'], required: false },
      ],
      order: [['openedAt', 'ASC']],
    });

    if (sessions.length === 0) {
      return res.json({
        success: true,
        data: {
          date: targetDate,
          shifts: [],
          summary: null,
          reportCashier: null,
          reportGym: null,
        },
        message: 'Tidak ada shift pada tanggal ini',
      });
    }

    // Time window = openedAt of first session → closedAt of last closed session
    const firstOpenedAt = sessions[0].openedAt;
    const lastSession = [...sessions].sort((a, b) => {
      if (!a.closedAt) return 1;
      if (!b.closedAt) return -1;
      return new Date(b.closedAt) - new Date(a.closedAt);
    })[0];
    const lastClosedAt = lastSession.closedAt || null;

    const dayTimeWhere = {
      [Op.gte]: firstOpenedAt,
      ...(lastClosedAt ? { [Op.lte]: lastClosedAt } : {}),
    };

    // Load ALL transactions across the entire day
    const allTransactions = await Transaction.findAll({
      where: {
        tenantId,
        createdAt: dayTimeWhere,
        status: { [Op.in]: CASH_REGISTER_TRANSACTION_STATUSES },
        deletedAt: null,
        ...getTransactionLocationWhere(locationId),
      },
      include: [
        {
          model: TransactionPayment,
          as: 'payments',
          where: { status: COMPLETED_PAYMENT_STATUS },
          required: false,
          attributes: ['id', 'paymentMethod', 'amount', 'paymentDetails', 'createdAt'],
        },
        {
          model: TransactionItem,
          as: 'items',
          required: false,
          attributes: ['id', 'itemType', 'itemId', 'itemName', 'quantity', 'unitPrice', 'subtotal', 'total'],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    // Load ALL expenses for the target date (based on expenseDate, not createdAt)
    const dayStart = startOfDayInTz(targetDate, dailyTz);
    const dayEnd   = endOfDayInTz(targetDate, dailyTz);
    const allExpenses = await Expense.findAll({
      where: {
        tenantId,
        status: { [Op.in]: ['paid'] },
        expenseDate: { [Op.gte]: dayStart, [Op.lte]: dayEnd },
        ...getExpenseLocationWhere(locationId),
      },
      include: [
        { model: ExpenseCategory, as: 'category', attributes: ['id', 'name', 'type'], required: false },
      ],
      order: [['expenseDate', 'ASC']],
    });

    const totalExpenses = allExpenses.reduce((s, e) => s + parseFloat(e.totalAmount || 0), 0);
    const cashExpenses  = allExpenses
      .filter(isCashDrawerExpense)
      .reduce((s, e) => s + parseFloat(e.totalAmount || 0), 0);
    const transferExpenses = allExpenses
      .filter(e => {
        const pm = (e.paymentMethod || '').toLowerCase();
        return pm === 'transfer' || pm === 'bank_transfer';
      })
      .reduce((s, e) => s + parseFloat(e.totalAmount || 0), 0);

    // ── Petty cash sales return (pengembalian modal dari penjualan) ──
    const dayPettyCashReturns = await PettyCashTransaction.findAll({
      where: {
        tenantId,
        type: 'sales_return',
        transactionDate: dayTimeWhere,
        deletedAt: null,
      },
      include: getPettyCashLocationInclude(locationId),
      order: [['transactionDate', 'ASC']],
    });
    const dayPettyCashReturnTotal = dayPettyCashReturns.reduce(
      (s, r) => s + Math.abs(parseFloat(r.amount || 0)), 0
    );
    const dayPettyCashReturnDetail = dayPettyCashReturns.map(r => ({
      id: r.id,
      title: `Pemasukan ke petty cash: ${r.description || r.transactionNumber}`,
      amount: Math.abs(parseFloat(r.amount || 0)),
      paymentMethod: 'cash',
      category: 'Petty Cash Income',
      expenseDate: r.transactionDate,
    }));
    const dayCashExpensesWithPettyCash = cashExpenses + dayPettyCashReturnTotal;

    // ── Per-shift summaries ──────────────────────────────────────────────────
    const shiftsData = sessions.map(session => {
      const shiftTrx = allTransactions.filter(t => {
        const created = new Date(t.createdAt);
        const from = new Date(session.openedAt);
        const to   = session.closedAt ? new Date(session.closedAt) : new Date();
        return created >= from && created <= to;
      });
      const reportableShiftTrx = shiftTrx.filter(shouldIncludeCashierTransaction);

      const shiftExpenses = allExpenses.filter(e => {
        const ed = new Date(e.expenseDate);
        const from = new Date(session.openedAt);
        const to   = session.closedAt ? new Date(session.closedAt) : new Date();
        return ed >= from && ed <= to;
      });
      const shiftCashExpenses = shiftExpenses
        .filter(isCashDrawerExpense)
        .reduce((s, e) => s + parseFloat(e.totalAmount || 0), 0);

      // Petty cash returns within this shift
      const shiftPcReturns = dayPettyCashReturns.filter(r => {
        const rd = new Date(r.transactionDate);
        const from = new Date(session.openedAt);
        const to   = session.closedAt ? new Date(session.closedAt) : new Date();
        return rd >= from && rd <= to;
      });
      const shiftPcReturnTotal = shiftPcReturns.reduce(
        (s, r) => s + Math.abs(parseFloat(r.amount || 0)), 0
      );

      const cashierTrx = reportableShiftTrx.filter(t => ['restaurant', 'pos'].includes(t.transactionType));
      const gymTrx = reportableShiftTrx.filter(t => t.transactionType === 'gym');

      // Cash summary for shift (net = tendered - change, consistent with getCashSummary)
      const cashIn = shiftTrx.reduce((s, t) => {
        const change = parseFloat(t.changeAmount || 0);
        const cashPayments = (t.payments || []).filter(p => normalizePaymentMethod(p.paymentMethod) === 'cash');
        return s + cashPayments.reduce((ps, p) => ps + Math.max(0, parseFloat(p.amount || 0) - change), 0);
      }, 0);

      return {
        id: session.id,
        shiftName: session.shiftName,
        shiftNumber: session.shiftNumber,
        status: session.status,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        openedBy: session.openedBy
          ? `${session.openedBy.firstName || ''} ${session.openedBy.lastName || ''}`.trim() : null,
        closedBy: session.closedBy
          ? `${session.closedBy.firstName || ''} ${session.closedBy.lastName || ''}`.trim() : null,
        location: session.location?.name || null,
        openingBalance:  parseFloat(session.openingBalance || 0),
        actualCash:      session.actualCash != null ? parseFloat(session.actualCash) : null,
        closingBalance:  session.closingBalance != null ? parseFloat(session.closingBalance) : null,
        difference:      session.difference != null ? parseFloat(session.difference) : null,
        tipping:         parseFloat(session.tipping || 0),
        cashIn:          parseFloat(cashIn.toFixed(2)),
        cashExpenses:    parseFloat(shiftCashExpenses.toFixed(2)),
        pettyCashIncome: parseFloat(shiftPcReturnTotal.toFixed(2)),
        cashExpensesWithPettyCash: parseFloat((shiftCashExpenses + shiftPcReturnTotal).toFixed(2)),
        transactionCount: reportableShiftTrx.length,
        cashierCount:    cashierTrx.length,
        gymCount:        gymTrx.length,
      };
    });

    // ── Daily aggregated cashier report ─────────────────────────────────────
    const dailyCashierTrx = allTransactions.filter(t => ['restaurant', 'pos'].includes(t.transactionType) && shouldIncludeCashierTransaction(t));
    const dailyGymTrx = allTransactions.filter(t => t.transactionType === 'gym' && shouldIncludeCashierTransaction(t));
    const reportableDayTransactions = allTransactions.filter(shouldIncludeCashierTransaction);

    // Build a synthetic session object for tipping aggregation
    const syntheticSession = {
      tipping: sessions.reduce((s, sess) => s + parseFloat(sess.tipping || 0), 0),
    };

    // ── Session financial summary ─────────────────────────────────────────────
    const openSessions    = sessions.filter(s => s.status === 'open').length;
    const closedSessions  = sessions.filter(s => s.status === 'closed').length;
    const totalOpeningBalance = sessions[0] ? parseFloat(sessions[0].openingBalance || 0) : 0;
    const totalActualCash = sessions
      .filter(s => s.actualCash != null && s.status === 'closed')
      .reduce((sum, s) => sum + parseFloat(s.actualCash), 0);
    const totalDifference = sessions
      .filter(s => s.difference != null && s.status === 'closed')
      .reduce((sum, s) => sum + parseFloat(s.difference), 0);

    // ── Compose response ─────────────────────────────────────────────────────
    const response = {
      date:       targetDate,
      shifts:     shiftsData,
      summary: {
        totalShifts:    sessions.length,
        openShifts:     openSessions,
        closedShifts:   closedSessions,
        openingBalance: totalOpeningBalance,
        totalActualCash,
        totalDifference:   parseFloat(totalDifference.toFixed(2)),
        totalTransactions: reportableDayTransactions.length,
        cashierTransactions: dailyCashierTrx.length,
        gymTransactions:     dailyGymTrx.length,
        // totalExpenses = cash-only expenses (yang mengurangi saldo kas register)
        // allExpenses   = semua pengeluaran termasuk transfer & petty_cash (informasi)
        totalExpenses:       parseFloat(dayCashExpensesWithPettyCash.toFixed(2)),
        allExpenses:         parseFloat((totalExpenses + dayPettyCashReturnTotal).toFixed(2)),
        cashExpenses:        parseFloat(cashExpenses.toFixed(2)),
        transferExpenses:    parseFloat(transferExpenses.toFixed(2)),
        // Expense dari petty cash fund — tidak mempengaruhi kas register
        pettyCashPaidExpenses: parseFloat(
          allExpenses
            .filter(e => (e.paymentMethod || '').toLowerCase() === 'petty_cash')
            .reduce((s, e) => s + parseFloat(e.totalAmount || 0), 0)
            .toFixed(2)
        ),
        pettyCashIncomeTotal: parseFloat(dayPettyCashReturnTotal.toFixed(2)),
        cashExpensesWithPettyCash: parseFloat(dayCashExpensesWithPettyCash.toFixed(2)),
      },
    };

    if (type === 'all' || type === 'cashier') {
      response.reportCashier = buildCashierReport(dailyCashierTrx, dayCashExpensesWithPettyCash, allExpenses, syntheticSession);
      // Detail pengeluaran: hanya dari laci (+ return ke petty cash yang mengurangi kas)
      response.expenseDetail  = [
        ...allExpenses.filter(isCashDrawerExpense).map(e => {
          const pm = (e.paymentMethod || '').toLowerCase();
          const isPettyCash = pm === 'petty_cash';
          return {
            id: e.id,
            title: e.title,
            amount: parseFloat(e.totalAmount || 0),
            paymentMethod: e.paymentMethod,
            fundSource: e.fundSource || null,
            category: e.category?.name || null,
            expenseDate: e.expenseDate,
            affectsCashRegister: true,
            affectsPettyCash: isPettyCash,
          };
        }),
        ...dayPettyCashReturnDetail.map(d => ({ ...d, affectsPettyCash: true, affectsCashRegister: true })),
      ];
    }

    if (type === 'all' || type === 'gym') {
      const refundedGymTrx = await Transaction.findAll({
        where: {
          tenantId,
          createdAt: dayTimeWhere,
          transactionType: 'gym',
          status: { [Op.in]: ['refunded', 'partially_refunded'] },
          deletedAt: null,
          ...getTransactionLocationWhere(locationId),
        },
        attributes: ['id', 'transactionNumber', 'totalAmount'],
      });
      response.reportGym = await buildGymReport(dailyGymTrx, dayCashExpensesWithPettyCash, allExpenses, tenantId, refundedGymTrx);
    }

    // ── Petty Cash Fund Info ─────────────────────────────────────────────────
    try {
      const pcFunds = await PettyCash.findAll({
        where: {
          tenantId,
          ...(locationId ? { locationId } : {}),
          status: 'active'
        },
        attributes: ['id', 'name', 'balance', 'initialAmount'],
        raw: true
      });

      const pcTrxSummary = await PettyCashTransaction.findAll({
        where: {
          tenantId,
          transactionDate: dayTimeWhere,
          deletedAt: null
        },
        include: getPettyCashLocationInclude(locationId),
        attributes: [
          'type',
          [fn('COALESCE', fn('SUM', col('amount')), 0), 'totalAmount'],
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['type'],
        raw: true
      });

      const pcByType = {};
      pcTrxSummary.forEach(row => {
        pcByType[row.type] = {
          total: parseFloat(parseFloat(row.totalAmount || 0).toFixed(2)),
          count: parseInt(row.count || 0)
        };
      });

      response.pettyCash = {
        fundCount: pcFunds.length,
        totalBalance: parseFloat(pcFunds.reduce((s, f) => s + parseFloat(f.balance || 0), 0).toFixed(2)),
        totalInitialAmount: parseFloat(pcFunds.reduce((s, f) => s + parseFloat(f.initialAmount || 0), 0).toFixed(2)),
        transactionsByType: pcByType,
        funds: pcFunds.map(f => ({
          id: f.id,
          name: f.name,
          balance: parseFloat(f.balance || 0),
          initialAmount: parseFloat(f.initialAmount || 0)
        }))
      };
    } catch (_e) {
      response.pettyCash = { fundCount: 0, totalBalance: 0, totalInitialAmount: 0, transactionsByType: {}, funds: [] };
    }

    // ── Combined Cash Summary ─────────────────────────────────────────────────
    // totalSalesResto/Gym = total pendapatan semua metode (untuk Rekap Harian)
    // pengeluaran = cash expenses only (transfer tidak mengurangi kas)
    // grandTotal  = totalSalesResto + totalSalesGym - pengeluaran(cash)
    const dailyTotalSalesResto = response.reportCashier?.J_grandTotal || 0;
    const dailyTotalSalesGym   = response.reportGym?.grandTotal || 0;
    const dailyTotalSales      = dailyTotalSalesResto + dailyTotalSalesGym;
    const dailyGrandTotal      = parseFloat((dailyTotalSales - dayCashExpensesWithPettyCash).toFixed(2));

    // cash-only breakdown (dari payment methods — sudah termasuk rounding)
    const dailyCashSalesResto  = response.reportCashier?.paymentMethods?.cash?.amount || 0;
    const dailyCashSalesGym    = response.reportGym?.paymentCash || 0;

    // non-cash breakdown — dihitung langsung dari payment methods (bukan residual)
    // karena cash amount sudah termasuk rounding, sedangkan J_grandTotal tidak
    const dailyNonCashSalesResto = parseFloat(
      Object.entries(response.reportCashier?.paymentMethods || {})
        .filter(([k]) => k !== 'cash' && k !== 'compliment')
        .reduce((s, [, v]) => s + (v.amount || 0), 0)
        .toFixed(2)
    );
    const dailyNonCashSalesGym = parseFloat(
      Object.entries(response.reportGym?.paymentMethods || {})
        .filter(([k]) => k !== 'cash' && k !== 'compliment')
        .reduce((s, [, v]) => s + (v.amount || 0), 0)
        .toFixed(2)
    );
    const dailyTotalNonCash = parseFloat((dailyNonCashSalesResto + dailyNonCashSalesGym).toFixed(2));

    // rounding (selisih pembulatan — tidak masuk revenue, tapi masuk cash drawer)
    const dailyRoundingResto = parseFloat((response.reportCashier?.H_rounding || 0).toFixed(2));

    response.cashSummary = {
      totalSalesResto:  parseFloat(dailyTotalSalesResto.toFixed(2)),
      totalSalesGym:    parseFloat(dailyTotalSalesGym.toFixed(2)),
      totalSales:       parseFloat(dailyTotalSales.toFixed(2)),
      pengeluaran:      parseFloat(dayCashExpensesWithPettyCash.toFixed(2)),
      grandTotal:       dailyGrandTotal,
      // cash-only portion per modul (termasuk rounding — uang fisik di laci)
      cashSalesResto:   parseFloat(dailyCashSalesResto.toFixed(2)),
      cashSalesGym:     parseFloat(dailyCashSalesGym.toFixed(2)),
      cashGrandTotal:   parseFloat((dailyCashSalesResto + dailyCashSalesGym - dayCashExpensesWithPettyCash).toFixed(2)),
      // non-cash portion per modul (dari payment methods, bukan residual)
      nonCashSalesResto: dailyNonCashSalesResto,
      nonCashSalesGym:   dailyNonCashSalesGym,
      totalNonCash:      dailyTotalNonCash,
      // rounding (selisih pembulatan resto)
      roundingResto:     dailyRoundingResto,
    };

    return res.json({ success: true, data: response });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PRINT DAILY REPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build ESC/POS content for daily report thermal print
 * Ringkas: header, per-shift summary, cashier totals, gym totals, payment breakdown, difference
 */
function buildDailyReportReceipt(date, shiftsData, reportCashier, reportGym, summary, tenant) {
  const { COMMANDS, createSeparator: sep, padLine, formatCurrency } = receiptPrinterService;

  // fallback helpers if not exported separately
  const W = 48;
  const LF = '\n';
  const LINE = '-'.repeat(W);
  const DLINE = '='.repeat(W);

  const pad = (l, r, w = W) => {
    const ls = String(l || ''), rs = String(r || '');
    const spaces = w - ls.length - rs.length;
    return ls + (spaces > 0 ? ' '.repeat(spaces) : ' ') + rs;
  };
  const fc = (n) => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
  const fd = (d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  let c = '';
  c += COMMANDS.INIT;

  // ── Header ──────────────────────────────────────────────────────────────────
  c += COMMANDS.ALIGN_CENTER;
  c += COMMANDS.BOLD_ON;
  c += COMMANDS.DOUBLE_HEIGHT_ON;
  c += (tenant.name || 'GYM') + LF;
  c += COMMANDS.NORMAL_SIZE;
  c += COMMANDS.BOLD_OFF;
  if (tenant.address) c += tenant.address + LF;
  if (tenant.phone)   c += 'Tel: ' + tenant.phone + LF;
  c += LF;
  c += DLINE + LF;
  c += COMMANDS.BOLD_ON;
  c += 'LAPORAN HARIAN' + LF;
  c += COMMANDS.BOLD_OFF;
  c += 'Tanggal: ' + fd(date + 'T00:00:00') + LF;
  c += DLINE + LF;
  c += COMMANDS.ALIGN_LEFT;

  // ── Per-shift summary ────────────────────────────────────────────────────────
  shiftsData.forEach((s, i) => {
    c += COMMANDS.BOLD_ON;
    c += `Shift ${i + 1}: ${s.shiftName}` + LF;
    c += COMMANDS.BOLD_OFF;
    c += pad('  Status:', s.status === 'closed' ? 'Tutup' : 'Buka') + LF;
    c += pad('  Opening:', fc(s.openingBalance)) + LF;
    c += pad('  Cash Masuk:', fc(s.cashIn)) + LF;
    if (s.status === 'closed') {
      c += pad('  Actual Cash:', fc(s.actualCash)) + LF;
      c += pad('  Selisih:', fc(s.difference)) + LF;
    }
    if (i < shiftsData.length - 1) c += LINE + LF;
  });
  c += DLINE + LF;

  // ── Report Cashier (Restaurant/POS) ─────────────────────────────────────────
  if (reportCashier) {
    c += COMMANDS.ALIGN_CENTER;
    c += COMMANDS.BOLD_ON;
    c += 'REPORT KASIR (RESTO/POS)' + LF;
    c += COMMANDS.BOLD_OFF;
    c += COMMANDS.ALIGN_LEFT;
    c += LINE + LF;
    c += pad('Penjualan',           fc(reportCashier.A_penjualan)) + LF;
    if (reportCashier.B_delivery > 0)
      c += pad('Delivery',           fc(reportCashier.B_delivery)) + LF;
    if (reportCashier.C_discount > 0)
      c += pad('Diskon',             fc(reportCashier.C_discount)) + LF;
    if (reportCashier.R_complimentTotal > 0)
      c += pad('Compliment',         fc(reportCashier.R_complimentTotal)) + LF;
    c += pad('Net Sales',           fc(reportCashier.E_netSales)) + LF;
    if (reportCashier.F_serviceCharge > 0)
      c += pad('Service Charge',    fc(reportCashier.F_serviceCharge)) + LF;
    if (reportCashier.G_tax > 0)
      c += pad('Pajak',             fc(reportCashier.G_tax)) + LF;
    if (reportCashier.H_rounding !== 0)
      c += pad('Rounding',          fc(reportCashier.H_rounding)) + LF;
    if (reportCashier.I_tipping > 0)
      c += pad('Tipping',           fc(reportCashier.I_tipping)) + LF;
    c += LINE + LF;
    c += COMMANDS.BOLD_ON;
    c += pad('Grand Total',         fc(reportCashier.J_grandTotal)) + LF;
    c += COMMANDS.BOLD_OFF;
    if (reportCashier.K_pengeluaran > 0)
      c += pad('Pengeluaran',       fc(reportCashier.K_pengeluaran)) + LF;
    c += LINE + LF;
    // Payment breakdown
    const pm = reportCashier.paymentMethods || {};
    Object.entries(pm).forEach(([method, val]) => {
      c += pad('   ' + method.toUpperCase(), fc(val.amount)) + LF;
    });
    c += LINE + LF;
    c += COMMANDS.BOLD_ON;
    c += pad('Total Cash',          fc(reportCashier.Q_totalCash)) + LF;
    c += COMMANDS.BOLD_OFF;
    c += pad('   Transaksi',        reportCashier.transactionCount + ' trx') + LF;
    c += DLINE + LF;
  }

  // ── Report Gym ───────────────────────────────────────────────────────────────
  if (reportGym) {
    c += COMMANDS.ALIGN_CENTER;
    c += COMMANDS.BOLD_ON;
    c += 'REPORT GYM' + LF;
    c += COMMANDS.BOLD_OFF;
    c += COMMANDS.ALIGN_LEFT;
    c += LINE + LF;
    // ── Table header ──
    c += pad('Item', 'Qty') + LF;
    c += LINE + LF;

    // Membership buckets with plan details
    const mb = reportGym.memberships || {};
    Object.entries(mb).forEach(([, bucket]) => {
      const plans = bucket.plans || [];
      const hasPlans = plans.length > 0;
      // Always show bucket row (bold label)
      if (bucket.count > 0 || hasPlans) {
        c += COMMANDS.BOLD_ON;
        c += pad(bucket.label, bucket.count > 0 ? (bucket.count + ' org') : '-') + LF;
        c += COMMANDS.BOLD_OFF;
        // Show each plan name as sub-item with net amount
        plans.forEach(pl => {
          if (pl.count > 0) {
            const qty = pl.count + 'x';
            c += pad(' - ' + pl.name, qty) + LF;
            c += pad('', fc(pl.amount)) + LF;
          }
        });
      } else {
        // Empty bucket — show dash
        c += pad(bucket.label, '-') + LF;
      }
    });

    // Session-based packages with plan details
    const sp = reportGym.sessionPackages || {};
    Object.entries(sp).forEach(([, bucket]) => {
      if (bucket.count > 0) {
        c += COMMANDS.BOLD_ON;
        c += pad(bucket.label, bucket.count + ' pkg') + LF;
        c += COMMANDS.BOLD_OFF;
        const plans = bucket.plans || [];
        plans.forEach(pl => {
          if (pl.count > 0) {
            const qty = pl.count + 'x';
            c += pad(' - ' + pl.name, qty) + LF;
            c += pad('', fc(pl.amount)) + LF;
          }
        });
      }
    });

    c += LINE + LF;

    // Other items (Kartu, towel, etc.)
    const oi = reportGym.otherItems || {};
    Object.entries(oi).forEach(([name, val]) => {
      if (val.count > 0)
        c += pad(name, val.count + 'x  ' + fc(val.amount)) + LF;
    });
    c += LINE + LF;
    c += pad('Penjualan',           fc(reportGym.penjualanKotor)) + LF;
    if (reportGym.totalDiscount > 0)
      c += pad('Diskon',             fc(reportGym.totalDiscount)) + LF;
    if (reportGym.complimentTotal > 0)
      c += pad('Compliment',         fc(reportGym.complimentTotal)) + LF;
    if (reportGym.serviceChargeTotal > 0)
      c += pad('Service Charge',     fc(reportGym.serviceChargeTotal)) + LF;
    if (reportGym.taxTotal > 0)
      c += pad('Pajak',              fc(reportGym.taxTotal)) + LF;
    c += LINE + LF;
    c += COMMANDS.BOLD_ON;
    c += pad('Grand Total',          fc(reportGym.grandTotal)) + LF;
    c += COMMANDS.BOLD_OFF;
    if (reportGym.refundedTotal > 0)
      c += pad('Refund',             '(' + reportGym.refundedCount + 'x) -' + fc(reportGym.refundedTotal)) + LF;
    c += LINE + LF;
    // Payment breakdown
    const gpm = reportGym.paymentMethods || {};
    Object.entries(gpm).forEach(([method, val]) => {
      if (val.amount > 0 || method !== 'compliment')
        c += pad('   ' + method.toUpperCase(), fc(val.amount)) + LF;
    });
    c += LINE + LF;
    c += COMMANDS.BOLD_ON;
    c += pad('   Total Cash',        fc(reportGym.paymentCash)) + LF;
    c += pad('   Non-Cash',          fc(reportGym.totalCard)) + LF;
    c += COMMANDS.BOLD_OFF;
    c += pad('   Transaksi',         reportGym.transactionCount + ' trx') + LF;
    c += DLINE + LF;
  }

  // ── Daily summary ────────────────────────────────────────────────────────────
  c += COMMANDS.ALIGN_CENTER;
  c += COMMANDS.BOLD_ON;
  c += 'RINGKASAN HARIAN' + LF;
  c += COMMANDS.BOLD_OFF;
  c += COMMANDS.ALIGN_LEFT;
  c += LINE + LF;
  c += pad('Total Transaksi',  summary.totalTransactions + ' trx') + LF;
  c += pad('Pengeluaran (Cash)', fc(summary.cashExpensesWithPettyCash || 0)) + LF;
  if (summary.transferExpenses > 0)
    c += pad('Pengeluaran (Transfer)', fc(summary.transferExpenses)) + LF;
  if (summary.closedShifts === summary.totalShifts) {
    c += pad('Total Selisih',    fc(summary.totalDifference)) + LF;
  } else {
    c += '(ada shift belum tutup)' + LF;
  }
  c += DLINE + LF;

  // ── Footer ──────────────────────────────────────────────────────────────────
  c += COMMANDS.ALIGN_CENTER;
  c += 'Dicetak: ' + new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }) + LF;
  c += LF;
  c += COMMANDS.FEED_AND_CUT;

  return c;
}

/**
 * POST /gym/cash-register/print-daily-report
 * Cetak laporan revenue harian ke thermal printer (tanpa detail transaksi)
 * Body: { date?: 'YYYY-MM-DD', type?: 'all'|'cashier'|'gym', locationId? }
 */
exports.printDailyReport = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { type = 'all', locationId } = req.body;

    const printTz = getTenantTimezone(req);
    let targetDate = req.body.date;
    if (!targetDate) {
      targetDate = todayInTz(printTz);
    }

    // Reuse getDailyReport logic — call the same data pipeline
    const sessionWhere = { tenantId, shiftDate: targetDate, deletedAt: null };
    if (locationId) sessionWhere.locationId = locationId;

    const sessions = await CashRegisterSession.findAll({
      where: sessionWhere,
      include: [
        { model: User, as: 'openedBy', attributes: ['id', 'firstName', 'lastName'], required: false },
        { model: User, as: 'closedBy', attributes: ['id', 'firstName', 'lastName'], required: false },
        { model: Location, as: 'location', attributes: ['id', 'name'], required: false },
      ],
      order: [['openedAt', 'ASC']],
    });

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Tidak ada shift pada tanggal ${targetDate}`,
      });
    }

    const firstOpenedAt = sessions[0].openedAt;
    const lastSession = [...sessions].sort((a, b) => {
      if (!a.closedAt) return 1;
      if (!b.closedAt) return -1;
      return new Date(b.closedAt) - new Date(a.closedAt);
    })[0];
    const dayTimeWhere = {
      [Op.gte]: firstOpenedAt,
      ...(lastSession.closedAt ? { [Op.lte]: lastSession.closedAt } : {}),
    };

    const allTransactions = await Transaction.findAll({
      where: {
        tenantId,
        createdAt: dayTimeWhere,
        status: { [Op.in]: CASH_REGISTER_TRANSACTION_STATUSES },
        deletedAt: null,
        ...getTransactionLocationWhere(locationId),
      },
      include: [
        { model: TransactionPayment, as: 'payments', where: { status: COMPLETED_PAYMENT_STATUS }, required: false, attributes: ['id', 'paymentMethod', 'amount', 'paymentDetails'] },
        { model: TransactionItem, as: 'items', required: false, attributes: ['id', 'itemType', 'itemId', 'itemName', 'quantity', 'unitPrice', 'subtotal', 'total'] },
      ],
      order: [['createdAt', 'ASC']],
    });

    const pDayStart = startOfDayInTz(targetDate, printTz);
    const pDayEnd   = endOfDayInTz(targetDate, printTz);
    const allExpenses = await Expense.findAll({
      where: {
        tenantId,
        status: { [Op.in]: ['paid'] },
        expenseDate: { [Op.gte]: pDayStart, [Op.lte]: pDayEnd },
        ...getExpenseLocationWhere(locationId),
      },
      attributes: ['totalAmount', 'paymentMethod', 'fundSource', 'accountId', 'vaultAccountId'],
    });

    const totalExpenses = allExpenses.reduce((s, e) => s + parseFloat(e.totalAmount || 0), 0);
    const cashExpenses  = allExpenses.filter(isCashDrawerExpense).reduce((s, e) => s + parseFloat(e.totalAmount || 0), 0);
    const transferExpenses = allExpenses.filter(e => {
      const pm = (e.paymentMethod || '').toLowerCase();
      return pm === 'transfer' || pm === 'bank_transfer';
    }).reduce((s, e) => s + parseFloat(e.totalAmount || 0), 0);

    // Petty cash sales returns for the day
    const dayPcReturns = await PettyCashTransaction.findAll({
      where: { tenantId, type: 'sales_return', transactionDate: dayTimeWhere, deletedAt: null },
      include: getPettyCashLocationInclude(locationId),
    });
    const dayPcReturnTotal = dayPcReturns.reduce((s, r) => s + Math.abs(parseFloat(r.amount || 0)), 0);
    const dayCashExpensesWithPc = cashExpenses + dayPcReturnTotal;

    // Per-shift cashIn summary
    const shiftsData = sessions.map(s => {
      const cashIn = allTransactions
        .filter(t => {
          const ct = new Date(t.createdAt), from = new Date(s.openedAt), to = s.closedAt ? new Date(s.closedAt) : new Date();
          return ct >= from && ct <= to;
        })
        .reduce((sum, t) => {
          const change = parseFloat(t.changeAmount || 0);
          return sum + (t.payments || []).filter(p => normalizePaymentMethod(p.paymentMethod) === 'cash').reduce((ps, p) => ps + Math.max(0, parseFloat(p.amount || 0) - change), 0);
        }, 0);
      return {
        shiftName:      s.shiftName,
        status:         s.status,
        openingBalance: parseFloat(s.openingBalance || 0),
        actualCash:     s.actualCash != null ? parseFloat(s.actualCash) : null,
        closingBalance: s.closingBalance != null ? parseFloat(s.closingBalance) : null,
        difference:     s.difference != null ? parseFloat(s.difference) : null,
        cashIn:         parseFloat(cashIn.toFixed(2)),
      };
    });

    const dailyCashierTrx = allTransactions.filter(t => ['restaurant', 'pos'].includes(t.transactionType) && shouldIncludeCashierTransaction(t));
    const dailyGymTrx = allTransactions.filter(t => t.transactionType === 'gym' && shouldIncludeCashierTransaction(t));
    const syntheticSession = { tipping: sessions.reduce((s, sess) => s + parseFloat(sess.tipping || 0), 0) };

    const reportCashier = (type === 'all' || type === 'cashier')
      ? buildCashierReport(dailyCashierTrx, dayCashExpensesWithPc, allExpenses, syntheticSession)
      : null;
    let reportGym = null;
    if (type === 'all' || type === 'gym') {
      const refundedGymTrx = await Transaction.findAll({
        where: {
          tenantId,
          createdAt: dayTimeWhere,
          transactionType: 'gym',
          status: { [Op.in]: ['refunded', 'partially_refunded'] },
          deletedAt: null,
          ...getTransactionLocationWhere(locationId),
        },
        attributes: ['id', 'transactionNumber', 'totalAmount'],
      });
      reportGym = await buildGymReport(dailyGymTrx, dayCashExpensesWithPc, allExpenses, tenantId, refundedGymTrx);
    }

    const summary = {
      totalShifts:   sessions.length,
      closedShifts:  sessions.filter(s => s.status === 'closed').length,
      totalTransactions: allTransactions.filter(shouldIncludeCashierTransaction).length,
      totalExpenses: parseFloat((totalExpenses + dayPcReturnTotal).toFixed(2)),
      cashExpensesWithPettyCash: parseFloat(dayCashExpensesWithPc.toFixed(2)),
      transferExpenses: parseFloat(transferExpenses.toFixed(2)),
      totalDifference: parseFloat(
        sessions.filter(s => s.difference != null && s.status === 'closed')
          .reduce((sum, s) => sum + parseFloat(s.difference), 0).toFixed(2)
      ),
    };

    // ── Load tenant for printer config ───────────────────────────────────────
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant tidak ditemukan' });
    }

    // ── Build receipt content ────────────────────────────────────────────────
    const content = buildDailyReportReceipt(targetDate, shiftsData, reportCashier, reportGym, summary, tenant);

    // ── Send to printer ──────────────────────────────────────────────────────
    const printer = receiptPrinterService.getReceiptPrinter(tenant);

    if (!printer) {
      return res.json({
        success: true,
        printed: false,
        message: 'Printer belum dikonfigurasi - konten tersedia di data.content',
        data: { date: targetDate, content },
      });
    }

    if (printer.connectionType !== 'network') {
      return res.json({
        success: true,
        printed: false,
        message: 'Hanya printer jaringan (TCP/IP) yang didukung',
        data: { date: targetDate, content },
      });
    }

    try {
      await receiptPrinterService.sendToPrinter(printer.ipAddress, printer.port || 9100, content, 5000);

      logger.info('Daily report printed', { tenantId, date: targetDate, printer: printer.name });

      return res.json({
        success: true,
        printed: true,
        message: 'Laporan harian berhasil dicetak',
        data: { date: targetDate, printer: printer.name },
      });
    } catch (printErr) {
      logger.error('Failed to print daily report', { tenantId, date: targetDate, error: printErr.message });
      return res.status(500).json({
        success: false,
        message: 'Gagal mengirim ke printer: ' + printErr.message,
        data: { date: targetDate, content },
      });
    }
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PRINT SHIFT REPORT — same detail level as daily report but for 1 shift
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /gym/dashboard/petty-cash/print-shift-report
 * Cetak laporan shift ke thermal printer — Report Gym + Report Kasir (detail lengkap)
 * Body: { sessionId: UUID, type?: 'all'|'cashier'|'gym' }
 */
exports.printShiftReport = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { sessionId, type = 'all' } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId wajib diisi' });
    }

    // ── Load session ─────────────────────────────────────────────────────────
    const session = await CashRegisterSession.findOne({
      where: { id: sessionId, tenantId, deletedAt: null },
      include: [
        { model: User, as: 'openedBy', attributes: ['id', 'firstName', 'lastName'], required: false },
        { model: User, as: 'closedBy', attributes: ['id', 'firstName', 'lastName'], required: false },
        { model: Location, as: 'location', attributes: ['id', 'name'], required: false },
      ],
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Sesi tidak ditemukan' });
    }

    // Time window for this session
    const timeWhere = {
      [Op.gte]: session.openedAt,
      ...(session.closedAt ? { [Op.lte]: session.closedAt } : {}),
    };

    // ── Load transactions in this shift ──────────────────────────────────────
    const transactions = await Transaction.findAll({
      where: {
        tenantId,
        createdAt: timeWhere,
        status: { [Op.in]: CASH_REGISTER_TRANSACTION_STATUSES },
        deletedAt: null,
        ...getTransactionLocationWhere(session.locationId),
      },
      include: [
        { model: TransactionPayment, as: 'payments', where: { status: COMPLETED_PAYMENT_STATUS }, required: false, attributes: ['id', 'paymentMethod', 'amount', 'paymentDetails', 'createdAt'] },
        { model: TransactionItem, as: 'items', required: false, attributes: ['id', 'itemType', 'itemId', 'itemName', 'quantity', 'unitPrice', 'subtotal', 'total'] },
      ],
      order: [['createdAt', 'ASC']],
    });

    // ── Load expenses for this shift's date (based on expenseDate, not createdAt) ──
    const pShiftTz = getTenantTimezone(req);
    const pShiftStart = startOfDayInTz(session.shiftDate, pShiftTz);
    const pShiftEnd   = endOfDayInTz(session.shiftDate, pShiftTz);
    const expenses = await Expense.findAll({
      where: {
        tenantId,
        status: { [Op.in]: ['paid'] },
        expenseDate: { [Op.gte]: pShiftStart, [Op.lte]: pShiftEnd },
        ...getExpenseLocationWhere(session.locationId),
      },
      include: [
        { model: ExpenseCategory, as: 'category', attributes: ['id', 'name', 'type'], required: false },
      ],
      order: [['expenseDate', 'ASC']],
    });

    const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.totalAmount || 0), 0);
    const cashExpenses  = expenses.filter(isCashDrawerExpense).reduce((s, e) => s + parseFloat(e.totalAmount || 0), 0);
    const transferExpenses = expenses.filter(e => {
      const pm = (e.paymentMethod || '').toLowerCase();
      return pm === 'transfer' || pm === 'bank_transfer';
    }).reduce((s, e) => s + parseFloat(e.totalAmount || 0), 0);

    // Petty cash sales returns for this shift
    const shiftPcReturns = await PettyCashTransaction.findAll({
      where: { tenantId, type: 'sales_return', transactionDate: timeWhere, deletedAt: null },
      include: getPettyCashLocationInclude(session.locationId),
    });
    const shiftPcReturnTotal = shiftPcReturns.reduce((s, r) => s + Math.abs(parseFloat(r.amount || 0)), 0);
    const shiftCashExpensesWithPc = cashExpenses + shiftPcReturnTotal;

    // ── Build reports using same functions as getShiftReport / getDailyReport
    const cashierTrx = transactions.filter(t => ['restaurant', 'pos'].includes(t.transactionType) && shouldIncludeCashierTransaction(t));
    const gymTrx = transactions.filter(t => t.transactionType === 'gym' && shouldIncludeCashierTransaction(t));

    let reportCashier = null;
    if (type === 'all' || type === 'cashier') {
      reportCashier = buildCashierReport(cashierTrx, shiftCashExpensesWithPc, expenses, session);
    }

    let reportGym = null;
    if (type === 'all' || type === 'gym') {
      const refundedGymTrx = await Transaction.findAll({
        where: {
          tenantId,
          createdAt: timeWhere,
          transactionType: 'gym',
          status: { [Op.in]: ['refunded', 'partially_refunded'] },
          deletedAt: null,
          ...getTransactionLocationWhere(session.locationId),
        },
        attributes: ['id', 'transactionNumber', 'totalAmount'],
      });
      reportGym = await buildGymReport(gymTrx, shiftCashExpensesWithPc, expenses, tenantId, refundedGymTrx);
    }

    // ── Shift data for receipt (net = tendered - change, consistent with getCashSummary) ──
    const cashIn = transactions.reduce((s, t) => {
      const change = parseFloat(t.changeAmount || 0);
      const cashPayments = (t.payments || []).filter(p => normalizePaymentMethod(p.paymentMethod) === 'cash');
      return s + cashPayments.reduce((ps, p) => ps + Math.max(0, parseFloat(p.amount || 0) - change), 0);
    }, 0);

    const shiftData = {
      shiftName:      session.shiftName,
      shiftNumber:    session.shiftNumber,
      shiftDate:      session.shiftDate,
      status:         session.status,
      openedAt:       session.openedAt,
      closedAt:       session.closedAt,
      openedBy:       session.openedBy ? `${session.openedBy.firstName || ''} ${session.openedBy.lastName || ''}`.trim() : null,
      closedBy:       session.closedBy ? `${session.closedBy.firstName || ''} ${session.closedBy.lastName || ''}`.trim() : null,
      location:       session.location?.name || null,
      openingBalance: parseFloat(session.openingBalance || 0),
      actualCash:     session.actualCash != null ? parseFloat(session.actualCash) : null,
      closingBalance: session.closingBalance != null ? parseFloat(session.closingBalance) : null,
      difference:     session.difference != null ? parseFloat(session.difference) : null,
      tipping:        parseFloat(session.tipping || 0),
      cashIn:         parseFloat(cashIn.toFixed(2)),
    };

    const summary = {
      totalTransactions: transactions.length,
      cashierTransactions: cashierTrx.length,
      gymTransactions: gymTrx.length,
      totalExpenses: parseFloat((totalExpenses + shiftPcReturnTotal).toFixed(2)),
      cashExpenses: parseFloat(cashExpenses.toFixed(2)),
      transferExpenses: parseFloat(transferExpenses.toFixed(2)),
      pettyCashReturnTotal: parseFloat(shiftPcReturnTotal.toFixed(2)),
      cashExpensesWithPettyCash: parseFloat(shiftCashExpensesWithPc.toFixed(2)),
    };

    // ── Load tenant for printer config ───────────────────────────────────────
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant tidak ditemukan' });
    }

    // ── Build receipt content ────────────────────────────────────────────────
    const drawerExpensesForReceipt = expenses.filter(isCashDrawerExpense);
    const content = buildShiftReportReceiptFull(shiftData, reportCashier, reportGym, summary, drawerExpensesForReceipt, tenant);

    // ── Send to printer ──────────────────────────────────────────────────────
    const printer = receiptPrinterService.getReceiptPrinter(tenant);

    if (!printer) {
      return res.json({
        success: true,
        printed: false,
        message: 'Printer belum dikonfigurasi - konten tersedia di data.content',
        data: { sessionId, content, reportCashier, reportGym, shiftData, summary },
      });
    }

    if (printer.connectionType !== 'network') {
      return res.json({
        success: true,
        printed: false,
        message: 'Hanya printer jaringan (TCP/IP) yang didukung',
        data: { sessionId, content, reportCashier, reportGym, shiftData, summary },
      });
    }

    try {
      await receiptPrinterService.sendToPrinter(printer.ipAddress, printer.port || 9100, content, 5000);

      logger.info('Shift report printed', {
        tenantId,
        sessionId,
        shiftDate: session.shiftDate,
        printer: printer.name,
      });

      return res.json({
        success: true,
        printed: true,
        message: 'Laporan shift berhasil dicetak',
        data: { sessionId, printer: printer.name, reportCashier, reportGym, shiftData, summary },
      });
    } catch (printErr) {
      logger.error('Failed to print shift report', { tenantId, sessionId, error: printErr.message });
      return res.status(500).json({
        success: false,
        message: 'Gagal mengirim ke printer: ' + printErr.message,
        data: { sessionId, content, reportCashier, reportGym, shiftData, summary },
      });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Build ESC/POS receipt for SHIFT report (same detail level as daily report)
 * Mirip buildDailyReportReceipt tapi untuk 1 shift saja.
 */
function buildShiftReportReceiptFull(shiftData, reportCashier, reportGym, summary, expenses, tenant) {
  const { COMMANDS } = receiptPrinterService;

  const W = 48;
  const LF = '\n';
  const LINE = '-'.repeat(W);
  const DLINE = '='.repeat(W);

  const pad = (l, r, w = W) => {
    const ls = String(l || ''), rs = String(r || '');
    const spaces = w - ls.length - rs.length;
    return ls + (spaces > 0 ? ' '.repeat(spaces) : ' ') + rs;
  };
  const fc = (n) => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
  const fd = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' });
  };

  let c = '';
  c += COMMANDS.INIT;

  // ── Header ──────────────────────────────────────────────────────────────────
  c += COMMANDS.ALIGN_CENTER;
  c += COMMANDS.BOLD_ON;
  c += COMMANDS.DOUBLE_HEIGHT_ON;
  c += (tenant.name || 'GYM') + LF;
  c += COMMANDS.NORMAL_SIZE;
  c += COMMANDS.BOLD_OFF;
  if (tenant.address) c += tenant.address + LF;
  if (tenant.phone)   c += 'Tel: ' + tenant.phone + LF;
  c += LF;
  c += DLINE + LF;
  c += COMMANDS.BOLD_ON;
  c += 'LAPORAN SHIFT' + LF;
  c += COMMANDS.BOLD_OFF;
  c += LF;

  // ── Shift info ──────────────────────────────────────────────────────────────
  c += COMMANDS.ALIGN_LEFT;
  c += pad('Shift:', shiftData.shiftName) + LF;
  c += pad('Tanggal:', shiftData.shiftDate) + LF;
  c += pad('Lokasi:', shiftData.location || '-') + LF;
  c += pad('Dibuka:', fd(shiftData.openedAt)) + LF;
  c += pad('Oleh:', shiftData.openedBy || '-') + LF;
  if (shiftData.closedAt) {
    c += pad('Ditutup:', fd(shiftData.closedAt)) + LF;
    c += pad('Oleh:', shiftData.closedBy || '-') + LF;
  } else {
    c += pad('Status:', 'MASIH BUKA') + LF;
  }
  c += pad('Opening:', fc(shiftData.openingBalance)) + LF;
  c += pad('Cash Masuk:', fc(shiftData.cashIn)) + LF;
  if (shiftData.status === 'closed') {
    c += pad('Actual Cash:', fc(shiftData.actualCash)) + LF;
    c += pad('Selisih:', fc(shiftData.difference)) + LF;
  }
  c += DLINE + LF;

  // ── Report Cashier (Restaurant/POS) ─────────────────────────────────────────
  if (reportCashier) {
    c += COMMANDS.ALIGN_CENTER;
    c += COMMANDS.BOLD_ON;
    c += 'REPORT KASIR (RESTO/POS)' + LF;
    c += COMMANDS.BOLD_OFF;
    c += COMMANDS.ALIGN_LEFT;
    c += LINE + LF;
    c += pad('Penjualan',           fc(reportCashier.A_penjualan)) + LF;
    if (reportCashier.B_delivery > 0)
      c += pad('Delivery',           fc(reportCashier.B_delivery)) + LF;
    if (reportCashier.C_discount > 0)
      c += pad('Diskon',             fc(reportCashier.C_discount)) + LF;
    if (reportCashier.R_complimentTotal > 0)
      c += pad('Compliment',         fc(reportCashier.R_complimentTotal)) + LF;
    c += pad('Net Sales',           fc(reportCashier.E_netSales)) + LF;
    if (reportCashier.F_serviceCharge > 0)
      c += pad('Service Charge',    fc(reportCashier.F_serviceCharge)) + LF;
    if (reportCashier.G_tax > 0)
      c += pad('Pajak',             fc(reportCashier.G_tax)) + LF;
    if (reportCashier.H_rounding !== 0)
      c += pad('Rounding',          fc(reportCashier.H_rounding)) + LF;
    if (reportCashier.I_tipping > 0)
      c += pad('Tipping',           fc(reportCashier.I_tipping)) + LF;
    c += LINE + LF;
    c += COMMANDS.BOLD_ON;
    c += pad('Grand Total',         fc(reportCashier.J_grandTotal)) + LF;
    c += COMMANDS.BOLD_OFF;
    if (reportCashier.K_pengeluaran > 0)
      c += pad('Pengeluaran',       fc(reportCashier.K_pengeluaran)) + LF;
    c += LINE + LF;
    // Payment breakdown
    const pm = reportCashier.paymentMethods || {};
    Object.entries(pm).forEach(([method, val]) => {
      c += pad('   ' + method.toUpperCase(), fc(val.amount)) + LF;
    });
    c += LINE + LF;
    c += COMMANDS.BOLD_ON;
    c += pad('Total Cash',          fc(reportCashier.Q_totalCash)) + LF;
    c += COMMANDS.BOLD_OFF;
    c += pad('   Transaksi',        reportCashier.transactionCount + ' trx') + LF;
    c += DLINE + LF;
  }

  // ── Report Gym ───────────────────────────────────────────────────────────────
  if (reportGym) {
    c += COMMANDS.ALIGN_CENTER;
    c += COMMANDS.BOLD_ON;
    c += 'REPORT GYM' + LF;
    c += COMMANDS.BOLD_OFF;
    c += COMMANDS.ALIGN_LEFT;
    c += LINE + LF;
    // ── Table header ──
    c += pad('Item', 'Qty') + LF;
    c += LINE + LF;

    // Membership buckets with plan details
    const mb = reportGym.memberships || {};
    Object.entries(mb).forEach(([, bucket]) => {
      const plans = bucket.plans || [];
      const hasPlans = plans.some(pl => pl.count > 0);
      if (bucket.count > 0 || hasPlans) {
        c += COMMANDS.BOLD_ON;
        c += pad(bucket.label, bucket.count > 0 ? (bucket.count + ' org') : '-') + LF;
        c += COMMANDS.BOLD_OFF;
        plans.forEach(pl => {
          if (pl.count > 0) {
            c += pad(' - ' + pl.name, pl.count + 'x') + LF;
            c += pad('', fc(pl.amount)) + LF;
          }
        });
      } else {
        c += pad(bucket.label, '-') + LF;
      }
    });

    // Session-based packages with plan details
    const sp = reportGym.sessionPackages || {};
    Object.entries(sp).forEach(([, bucket]) => {
      if (bucket.count > 0) {
        c += COMMANDS.BOLD_ON;
        c += pad(bucket.label, bucket.count + ' pkg') + LF;
        c += COMMANDS.BOLD_OFF;
        const plans = bucket.plans || [];
        plans.forEach(pl => {
          if (pl.count > 0) {
            c += pad(' - ' + pl.name, pl.count + 'x') + LF;
            c += pad('', fc(pl.amount)) + LF;
          }
        });
      }
    });

    c += LINE + LF;

    // Other items (towel, etc.)
    const oi = reportGym.otherItems || {};
    Object.entries(oi).forEach(([name, val]) => {
      if (val.count > 0)
        c += pad(name, val.count + 'x  ' + fc(val.amount)) + LF;
    });
    c += LINE + LF;
    c += pad('Penjualan',           fc(reportGym.penjualanKotor)) + LF;
    if (reportGym.totalDiscount > 0)
      c += pad('Diskon',             fc(reportGym.totalDiscount)) + LF;
    if (reportGym.complimentTotal > 0)
      c += pad('Compliment',         fc(reportGym.complimentTotal)) + LF;
    if (reportGym.serviceChargeTotal > 0)
      c += pad('Service Charge',     fc(reportGym.serviceChargeTotal)) + LF;
    if (reportGym.taxTotal > 0)
      c += pad('Pajak',              fc(reportGym.taxTotal)) + LF;
    c += LINE + LF;
    c += COMMANDS.BOLD_ON;
    c += pad('Grand Total',          fc(reportGym.grandTotal)) + LF;
    c += COMMANDS.BOLD_OFF;
    if (reportGym.refundedTotal > 0)
      c += pad('Refund',             '(' + reportGym.refundedCount + 'x) -' + fc(reportGym.refundedTotal)) + LF;
    c += LINE + LF;
    // Payment breakdown
    const gpm = reportGym.paymentMethods || {};
    Object.entries(gpm).forEach(([method, val]) => {
      if (val.amount > 0 || method !== 'compliment')
        c += pad('   ' + method.toUpperCase(), fc(val.amount)) + LF;
    });
    c += LINE + LF;
    c += COMMANDS.BOLD_ON;
    c += pad('   Total Cash',        fc(reportGym.paymentCash)) + LF;
    c += pad('   Non-Cash',          fc(reportGym.totalCard)) + LF;
    c += COMMANDS.BOLD_OFF;
    c += pad('   Transaksi',         reportGym.transactionCount + ' trx') + LF;
    c += DLINE + LF;
  }

  // ── Expense detail ─────────────────────────────────────────────────────────
  if (expenses && expenses.length > 0) {
    c += COMMANDS.ALIGN_CENTER;
    c += COMMANDS.BOLD_ON;
    c += 'PENGELUARAN' + LF;
    c += COMMANDS.BOLD_OFF;
    c += COMMANDS.ALIGN_LEFT;
    c += LINE + LF;
    expenses.forEach(e => {
      c += pad('  ' + (e.title || '-'), fc(parseFloat(e.totalAmount || 0))) + LF;
      c += '    ' + (e.paymentMethod || '-') + (e.category?.name ? ' | ' + e.category.name : '') + LF;
    });
    c += LINE + LF;
    c += COMMANDS.BOLD_ON;
    c += pad('Pengeluaran (Cash)',   fc(summary.cashExpensesWithPettyCash || 0)) + LF;
    c += COMMANDS.BOLD_OFF;
    if (summary.transferExpenses > 0) {
      c += pad('Pengeluaran (Transfer)', fc(summary.transferExpenses)) + LF;
    }
    c += DLINE + LF;
  }

  // ── Shift summary ──────────────────────────────────────────────────────────
  c += COMMANDS.ALIGN_CENTER;
  c += COMMANDS.BOLD_ON;
  c += 'RINGKASAN SHIFT' + LF;
  c += COMMANDS.BOLD_OFF;
  c += COMMANDS.ALIGN_LEFT;
  c += LINE + LF;
  c += pad('Total Transaksi',    summary.totalTransactions + ' trx') + LF;
  c += pad('  Kasir (Resto/POS)', summary.cashierTransactions + ' trx') + LF;
  c += pad('  Gym',              summary.gymTransactions + ' trx') + LF;
  c += pad('Pengeluaran (Cash)',  fc(summary.cashExpensesWithPettyCash || 0)) + LF;
  if (summary.transferExpenses > 0)
    c += pad('Pengeluaran (Transfer)', fc(summary.transferExpenses)) + LF;
  if (shiftData.status === 'closed') {
    c += pad('Selisih Kas',       fc(shiftData.difference)) + LF;
  }
  c += DLINE + LF;

  // ── Footer ──────────────────────────────────────────────────────────────────
  c += COMMANDS.ALIGN_CENTER;
  c += 'Dicetak: ' + new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }) + LF;
  c += LF;
  c += COMMANDS.FEED_AND_CUT;

  return c;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status sets
// ─────────────────────────────────────────────────────────────────────────────
const REPORT_STATUSES_OLD = ['completed', 'paid', 'served'];
const REPORT_STATUSES_NEW = [...CASH_REGISTER_TRANSACTION_STATUSES];

/**
 * POST /gym/cash-register/:id/diagnose-report
 * @desc  Diagnose selisih Q_totalCash di report shift.
 *        Transaksi berstatus 'split'/'merged' sudah bayar tunai dan masuk kas
 *        (getCashSummary) tetapi tidak masuk buildCashierReport → difference minus.
 *        Mode dryRun=true  → hanya tampilkan analisis.
 *        Mode dryRun=false → update kolom difference & closingBalance di DB.
 * @query dryRun=true|false  (default true)
 */
/**
 * PATCH /gym/cash-register/:id/correct-payment
 * Koreksi paymentMethod (dan optional amount) pada TransactionPayment
 * yang terdeteksi salah dari endpoint diagnose-report.
 *
 * Body:
 * {
 *   corrections: [
 *     {
 *       paymentId:        string (UUID TransactionPayment),
 *       newPaymentMethod: string (cash | transfer | qris | ...),
 *       newAmount?:       number,
 *       reason?:          string
 *     }
 *   ]
 * }
 */
exports.correctPayment = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { id: sessionId } = req.params;
    const { corrections } = req.body;

    if (!Array.isArray(corrections) || corrections.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'corrections harus berupa array dan tidak boleh kosong',
      });
    }

    // Validate session belongs to tenant
    const session = await CashRegisterSession.findOne({
      where: { id: sessionId, tenantId, deletedAt: null },
    });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Sesi tidak ditemukan' });
    }

    const timeWhere = {
      [Op.gte]: session.openedAt,
      ...(session.closedAt ? { [Op.lte]: session.closedAt } : {}),
    };

    const results = [];
    const errors  = [];

    for (const item of corrections) {
      const { paymentId, newPaymentMethod, newAmount, reason } = item;

      if (!paymentId || !newPaymentMethod) {
        errors.push({ paymentId, error: 'paymentId dan newPaymentMethod wajib diisi' });
        continue;
      }

      // Find payment — must belong to a transaction inside the session window
      const payment = await TransactionPayment.findOne({
        where: { id: paymentId, deletedAt: null },
        include: [{
          model: Transaction,
          as: 'transaction',
          where: { tenantId, createdAt: timeWhere, deletedAt: null, ...getTransactionLocationWhere(session.locationId) },
          attributes: ['id', 'transactionNumber', 'transactionType', 'status', 'totalAmount'],
          required: true,
        }],
      });

      if (!payment) {
        errors.push({ paymentId, error: 'Payment tidak ditemukan atau bukan bagian dari sesi ini' });
        continue;
      }

      const before = {
        paymentMethod: payment.paymentMethod,
        amount: parseFloat(payment.amount),
      };

      const updateData = { paymentMethod: newPaymentMethod };
      if (newAmount !== undefined && newAmount !== null) {
        updateData.amount = parseFloat(newAmount);
      }

      await payment.update(updateData);

      const after = {
        paymentMethod: payment.paymentMethod,
        amount: parseFloat(payment.amount),
      };

      logger.info('correctPayment: payment method corrected', {
        tenantId,
        sessionId,
        paymentId,
        transactionId: payment.transaction.id,
        transactionNumber: payment.transaction.transactionNumber,
        before,
        after,
        reason: reason || null,
        correctedBy: userId,
      });

      results.push({
        paymentId,
        transactionNumber: payment.transaction.transactionNumber,
        transactionType:   payment.transaction.transactionType,
        before,
        after,
        reason: reason || null,
      });
    }

    return res.json({
      success: true,
      data: {
        sessionId,
        corrected: results.length,
        failed:    errors.length,
        results,
        errors,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.diagnoseReport = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const dryRun = req.query.dryRun !== 'false';

    const session = await CashRegisterSession.findOne({
      where: { id, tenantId, deletedAt: null },
      include: [
        { model: User, as: 'openedBy', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'closedBy', attributes: ['id', 'firstName', 'lastName'], required: false },
      ],
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Sesi tidak ditemukan' });
    }

    const timeWhere = {
      [Op.gte]: session.openedAt,
      ...(session.closedAt ? { [Op.lte]: session.closedAt } : {}),
    };

    // Load transactions — with AND without split/merged
    const allTrxs = await Transaction.findAll({
      where: {
        tenantId,
        createdAt: timeWhere,
        status: { [Op.in]: REPORT_STATUSES_NEW },
        deletedAt: null,
        ...getTransactionLocationWhere(session.locationId),
      },
      include: [{
        model: TransactionPayment, as: 'payments',
        where: { status: COMPLETED_PAYMENT_STATUS }, required: false,
        attributes: ['id', 'paymentMethod', 'amount'],
      }],
      attributes: [
        'id', 'transactionNumber', 'transactionType', 'status',
        'subtotal', 'voucherDiscount', 'serviceCharge', 'tax', 'roundingAmount', 'totalAmount',
      ],
      order: [['createdAt', 'ASC']],
    });

    // Expenses for this shift's date (based on expenseDate, not createdAt)
    const dShiftTz = getTenantTimezone(req);
    const dShiftStart = startOfDayInTz(session.shiftDate, dShiftTz);
    const dShiftEnd   = endOfDayInTz(session.shiftDate, dShiftTz);
    const expenses = await Expense.findAll({
      where: {
        tenantId,
        status: { [Op.in]: ['paid'] },
        expenseDate: { [Op.gte]: dShiftStart, [Op.lte]: dShiftEnd },
        ...getExpenseLocationWhere(session.locationId),
      },
      attributes: ['totalAmount', 'paymentMethod', 'fundSource', 'accountId', 'vaultAccountId'],
    });
    const cashExpenses = expenses
      .filter(isCashDrawerExpense)
      .reduce((s, e) => s + parseFloat(e.totalAmount || 0), 0);

    // Helper: compute Q from a set of transactions
    function computeMetrics(cashierTrx) {
      const penjualan    = cashierTrx.reduce((s, t) => s + parseFloat(t.subtotal       || 0), 0);
      const discount     = cashierTrx.reduce((s, t) => s + parseFloat(t.voucherDiscount || 0), 0);
      const netSales     = penjualan - discount;
      const serviceCharge = cashierTrx.reduce((s, t) => s + parseFloat(t.serviceCharge || 0), 0);
      const tax          = cashierTrx.reduce((s, t) => s + parseFloat(t.tax            || 0), 0);
      const rounding     = cashierTrx.reduce((s, t) => s + parseFloat(t.roundingAmount || 0), 0);
      const grandTotal   = parseFloat((netSales + serviceCharge + tax).toFixed(2)); // rounding excluded — shown separately

      const bd = {};
      cashierTrx.forEach(t => {
        (t.payments || []).forEach(p => {
          const m = normalizePaymentMethod(p.paymentMethod);
          if (!bd[m]) bd[m] = { amount: 0, count: 0 };
          bd[m].amount += parseFloat(p.amount || 0);
          bd[m].count++;
        });
      });

      const nonCash = Object.entries(bd).filter(([m]) => m !== 'cash').reduce((s, [, v]) => s + v.amount, 0);
      const Q = parseFloat((grandTotal - cashExpenses - nonCash).toFixed(2));

      return {
        penjualan: parseFloat(penjualan.toFixed(2)),
        discount:  parseFloat(discount.toFixed(2)),
        netSales:  parseFloat(netSales.toFixed(2)),
        serviceCharge: parseFloat(serviceCharge.toFixed(2)),
        tax:       parseFloat(tax.toFixed(2)),
        rounding:  parseFloat(rounding.toFixed(2)),
        grandTotal: parseFloat(grandTotal.toFixed(2)),
        nonCash:   parseFloat(nonCash.toFixed(2)),
        cashExpenses: parseFloat(cashExpenses.toFixed(2)),
        Q_totalCash: Q,
        paymentBreakdown: Object.entries(bd).reduce((acc, [k, v]) => {
          acc[k] = { amount: parseFloat(v.amount.toFixed(2)), count: v.count };
          return acc;
        }, {}),
        transactionCount: cashierTrx.length,
      };
    }

    const cashierOld = allTrxs.filter(t =>
      ['restaurant', 'pos'].includes(t.transactionType) &&
      REPORT_STATUSES_OLD.includes(t.status)
    );
    const cashierNew = allTrxs.filter(t => {
      if (!['restaurant', 'pos'].includes(t.transactionType)) return false;
      // Exclude new-style split parent (no direct payments — children carry payments)
      if (t.status === 'split' && (t.payments || []).length === 0) return false;
      return true;
    });

    const metricsOld = computeMetrics(cashierOld);
    const metricsNew = computeMetrics(cashierNew);

    // ── Cause 1: split/merged restaurant/pos transactions ────────────────────
    // Hanya 'split' yang PUNYA payments langsung (old-style split bill pre-child)
    // 'split' tanpa payments = new-style parent → sudah dikecualikan dari cashierNew
    const splitMergedTrxs = cashierNew
      .filter(t => ['split', 'merged'].includes(t.status))
      .map(t => ({
        id: t.id,
        transactionNumber: t.transactionNumber,
        transactionType: t.transactionType,
        cause: 'split_merged_status',
        status: t.status,
        totalAmount: parseFloat(t.totalAmount || 0),
        payments: (t.payments || []).map(p => ({
          paymentMethod: normalizePaymentMethod(p.paymentMethod),
          amount: parseFloat(p.amount || 0),
        })),
      }));

    // ── Cause 2: gym transactions with cash payments ─────────────────────────
    // getCashSummary counts ALL cash payments regardless of transactionType,
    // but Q_totalCash in reportCashier only covers restaurant + pos.
    // Gym cash payments go into the drawer but are missing from Q_totalCash.
    const gymCashTrxs = allTrxs
      .filter(t => t.transactionType === 'gym')
      .filter(t => (t.payments || []).some(p => normalizePaymentMethod(p.paymentMethod) === 'cash'))
      .map(t => ({
        id: t.id,
        transactionNumber: t.transactionNumber,
        transactionType: t.transactionType,
        cause: 'gym_cash_payment',
        status: t.status,
        totalAmount: parseFloat(t.totalAmount || 0),
        payments: (t.payments || []).map(p => ({
          paymentMethod: normalizePaymentMethod(p.paymentMethod),
          amount: parseFloat(p.amount || 0),
        })),
      }));

    const gymCashTotal = gymCashTrxs.reduce((s, t) =>
      s + t.payments.filter(p => p.paymentMethod === 'cash').reduce((ps, p) => ps + p.amount, 0),
    0);

    // All causes combined
    const allCauses = [...splitMergedTrxs, ...gymCashTrxs];

    // ── Cause 3: recalculate cash directly from TransactionPayment records ───
    // Sum ALL cash payments across ALL transaction types/statuses in shift window.
    // Detects wrong payment method entry (cash entered as transfer or vice versa).
    const openingBalance = parseFloat(session.openingBalance || 0);

    // Direct sum of cash payments from TransactionPayment table
    const directCashTotal = allTrxs.reduce((sum, t) =>
      sum + (t.payments || [])
        .filter(p => normalizePaymentMethod(p.paymentMethod) === 'cash')
        .reduce((s, p) => s + parseFloat(p.amount || 0), 0),
    0);

    const recalcExpectedCash = parseFloat(
      (openingBalance + directCashTotal - cashExpenses).toFixed(2)
    );
    const storedClosingBalance = parseFloat(session.closingBalance || 0);
    const recalcDifference = parseFloat(
      (parseFloat(session.actualCash || 0) - recalcExpectedCash).toFixed(2)
    );

    // Payment breakdown per-method from all transactions (direct from DB)
    const directPaymentBreakdown = {};
    allTrxs.forEach(t => {
      (t.payments || []).forEach(p => {
        const m = normalizePaymentMethod(p.paymentMethod);
        if (!directPaymentBreakdown[m]) directPaymentBreakdown[m] = { amount: 0, count: 0 };
        directPaymentBreakdown[m].amount += parseFloat(p.amount || 0);
        directPaymentBreakdown[m].count++;
      });
    });
    Object.keys(directPaymentBreakdown).forEach(k => {
      directPaymentBreakdown[k].amount = parseFloat(directPaymentBreakdown[k].amount.toFixed(2));
    });

    // Flag transactions where payments total != totalAmount (possible misclassification)
    const paymentMismatchTrxs = allTrxs
      .filter(t => {
        const paidTotal = (t.payments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
        const expected  = parseFloat(t.totalAmount || 0);
        return Math.abs(paidTotal - expected) >= 1; // allow Rp 1 rounding tolerance
      })
      .map(t => {
        const paidTotal = parseFloat(
          (t.payments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0).toFixed(2)
        );
        return {
          id: t.id,
          transactionNumber: t.transactionNumber,
          transactionType: t.transactionType,
          status: t.status,
          totalAmount: parseFloat(t.totalAmount || 0),
          paidTotal,
          gap: parseFloat((parseFloat(t.totalAmount || 0) - paidTotal).toFixed(2)),
          payments: (t.payments || []).map(p => ({
            paymentMethod: normalizePaymentMethod(p.paymentMethod),
            amount: parseFloat(p.amount || 0),
          })),
        };
      });

    const recalcDiscrepancy = Math.abs(storedClosingBalance - recalcExpectedCash) >= 1;

    // getCashSummary — the authoritative expected cash (used at close time)
    const cashSummary = await session.getCashSummary();
    const correctedDifference = parseFloat(
      (parseFloat(session.actualCash || 0) - cashSummary.expectedCash).toFixed(2)
    );

    const storedDifference   = parseFloat(session.difference || 0);
    const correctedClosingBalance = parseFloat(cashSummary.expectedCash.toFixed(2));
    const hasDiscrepancy = Math.abs(storedDifference - correctedDifference) >= 0.01;

    // ── Apply fix ────────────────────────────────────────────────────────────
    let fixed = false;
    if (!dryRun && hasDiscrepancy && session.status === 'closed') {
      await session.update({
        difference:     correctedDifference,
        closingBalance: correctedClosingBalance,
      });
      fixed = true;
      logger.info(`diagnoseReport: fixed difference for session ${session.id}`, {
        tenantId,
        sessionId: session.id,
        before: { difference: storedDifference, closingBalance: storedClosingBalance },
        after:  { difference: correctedDifference, closingBalance: correctedClosingBalance },
        userId: req.user.id,
      });
    }

    return res.json({
      success: true,
      mode: dryRun ? 'dry_run' : 'applied',
      data: {
        session: {
          id:             session.id,
          shiftName:      session.shiftName,
          shiftDate:      session.shiftDate,
          status:         session.status,
          openedAt:       session.openedAt,
          closedAt:       session.closedAt,
          openingBalance: parseFloat(session.openingBalance || 0),
          actualCash:     parseFloat(session.actualCash || 0),
        },
        diagnosis: {
          hasDiscrepancy,
          // Cause 1
          splitMergedCount:        splitMergedTrxs.length,
          splitMergedTransactions: splitMergedTrxs,
          // Cause 2
          gymCashCount:            gymCashTrxs.length,
          gymCashTotal:            parseFloat(gymCashTotal.toFixed(2)),
          gymCashTransactions:     gymCashTrxs,
          // All causes
          allCauses,
        },
        stored: {
          difference:     storedDifference,
          closingBalance: storedClosingBalance,
        },
        corrected: {
          difference:     correctedDifference,
          closingBalance: correctedClosingBalance,
          Q_totalCash:    metricsNew.Q_totalCash,
        },
        recalculate: {
          // Direct sum from TransactionPayment records — independent of status/type filter
          openingBalance,
          directCashTotal:      parseFloat(directCashTotal.toFixed(2)),
          cashExpenses,
          recalcExpectedCash,
          recalcDifference,
          hasRecalcDiscrepancy: recalcDiscrepancy,
          paymentBreakdown:     directPaymentBreakdown,
          // Transactions where sum of payments != totalAmount
          paymentMismatchCount: paymentMismatchTrxs.length,
          paymentMismatchTransactions: paymentMismatchTrxs,
        },
        metricsOld,
        metricsNew,
        cashSummary: {
          cashIn:         cashSummary.cashIn,
          cashExpenseOut: cashSummary.cashExpenseOut,
          expectedCash:   cashSummary.expectedCash,
        },
        fixed,
      },
    });
  } catch (err) {
    next(err);
  }
};
