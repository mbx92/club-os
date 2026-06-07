/**
 * Daily Report Controller (Laporan Harian)
 *
 * Generates a daily summary report matching the "LAPORAN HARIAN" format:
 *   TGL | RESTO | SERVICE | TAX | GYM | TOTAL QRIS | TOTAL MANDIRI | TOTAL BCA
 *   | PENGELUARAN KASIR | KETERANGAN | TOTAL CASH | ACTUAL CASH | SELISIH CASH
 *
 * Data sources:
 *   - Transaction (restaurant & gym sales)
 *   - TransactionPayment (payment method breakdown)
 *   - Expense (cashier cash expenses, aligned to shift timing via createdAt)
 *   - CashRegisterSession (actual cash & variance)
 */
const { Transaction, TransactionPayment, Expense, CashRegisterSession, sequelize } = require('../../models');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');
const {
  REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL,
  COMPLETED_PAYMENT_STATUS,
  PAID_TRANSACTION_EXISTS_SQL,
} = require('../../utils/reportingStatus');

/**
 * GET /reports/finance/daily-summary
 *
 * @query startDate  YYYY-MM-DD (required)
 * @query endDate    YYYY-MM-DD (required)
 */
async function getDailySummaryReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required (YYYY-MM-DD)' });
    }

    const tenantFilter = isSuperAdmin ? '' : 'AND t."tenantId" = :tenantId';
    const tenantFilterExp = isSuperAdmin ? '' : 'AND e."tenantId" = :tenantId';
    const tenantFilterCrs = isSuperAdmin ? '' : 'AND crs."tenantId" = :tenantId';

    const replacements = {
      startDate: `${startDate}T00:00:00.000Z`,
      endDate: `${endDate}T23:59:59.999Z`,
      ...(isSuperAdmin ? {} : { tenantId }),
    };

    // ─── 1. Daily restaurant & gym revenue ─────────────────────────────
    // Uses createdAt (matching cashier), excludes compliment-only transactions
    const [revenueRows] = await sequelize.query(`
      SELECT
        DATE(t."createdAt") AS date,
        COALESCE(SUM(CASE WHEN t."transactionType" = 'restaurant' THEN t."subtotal" ELSE 0 END), 0) AS resto,
        COALESCE(SUM(CASE WHEN t."transactionType" = 'restaurant' THEN t."serviceCharge" ELSE 0 END), 0) AS service,
        COALESCE(SUM(CASE WHEN t."transactionType" = 'restaurant' THEN t."tax" ELSE 0 END), 0) AS tax,
        COALESCE(SUM(CASE WHEN t."transactionType" = 'gym' THEN t."totalAmount" ELSE 0 END), 0) AS gym
      FROM "Transactions" t
      WHERE t."status" IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        AND ${PAID_TRANSACTION_EXISTS_SQL}
        AND t."createdAt" BETWEEN :startDate AND :endDate
        AND t."deletedAt" IS NULL
        ${tenantFilter}
        AND NOT EXISTS (
          SELECT 1 FROM "TransactionPayments" tp3
          WHERE tp3."transactionId" = t."id"
            AND tp3."paymentMethod" = 'compliment'
            AND tp3."status" = '${COMPLETED_PAYMENT_STATUS}'
            AND tp3."deletedAt" IS NULL
        )
      GROUP BY DATE(t."createdAt")
      ORDER BY date
    `, { replacements });

    // ─── 2. Daily payment method breakdown ─────────────────────────────
    const [paymentRows] = await sequelize.query(`
      SELECT
        DATE(t."createdAt") AS date,
        LOWER(tp."paymentMethod") AS method,
        LOWER(COALESCE(tp."paymentDetails"->>'bank', tp."paymentDetails"->>'provider', '')) AS bank_name,
        COALESCE(SUM(tp."amount"), 0) AS total
      FROM "TransactionPayments" tp
      JOIN "Transactions" t ON tp."transactionId" = t."id"
      WHERE t."status" IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        AND tp."status" = '${COMPLETED_PAYMENT_STATUS}'
        AND t."createdAt" BETWEEN :startDate AND :endDate
        AND t."deletedAt" IS NULL
        AND tp."deletedAt" IS NULL
        ${tenantFilter}
      GROUP BY DATE(t."createdAt"), LOWER(tp."paymentMethod"),
               LOWER(COALESCE(tp."paymentDetails"->>'bank', tp."paymentDetails"->>'provider', ''))
      ORDER BY date
    `, { replacements });

    // ─── 3. Daily cashier expenses (pengeluaran kasir) ─────────────────
    // Use expenseDate matching the cashier's authoritative shift-close calculation.
    const [expenseRows] = await sequelize.query(`
      SELECT
        DATE(e."expenseDate") AS date,
        COALESCE(SUM(e."totalAmount"), 0) AS pengeluaran,
        STRING_AGG(DISTINCT e."title", ', ' ORDER BY e."title") AS keterangan
      FROM "Expenses" e
      WHERE e."paymentMethod" = 'cash'
        AND e."status" IN ('approved', 'paid')
        AND e."expenseDate" BETWEEN :startDate AND :endDate
        AND e."deletedAt" IS NULL
        ${tenantFilterExp}
      GROUP BY DATE(e."expenseDate")
      ORDER BY date
    `, { replacements });

    // ─── 4. Cash register sessions (actual cash & variance) ────────────
    const [cashRegisterRows] = await sequelize.query(`
      SELECT
        crs."shiftDate" AS date,
        COALESCE(SUM(crs."closingBalance"), 0)  AS expected_cash,
        COALESCE(SUM(crs."actualCash"), 0)      AS actual_cash,
        COALESCE(SUM(crs."difference"), 0)      AS difference
      FROM "CashRegisterSessions" crs
      WHERE crs."status" = 'closed'
        AND crs."shiftDate" BETWEEN :startDate AND :endDate
        AND crs."deletedAt" IS NULL
        ${tenantFilterCrs}
      GROUP BY crs."shiftDate"
      ORDER BY date
    `, { replacements: { startDate, endDate, ...(isSuperAdmin ? {} : { tenantId }) } });

    // ─── Build date range ──────────────────────────────────────────────
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().slice(0, 10));
    }

    // ─── Index lookup maps ─────────────────────────────────────────────
    const revenueMap = {};
    for (const r of revenueRows) {
      const key = r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10);
      revenueMap[key] = {
        resto: parseFloat(r.resto),
        service: parseFloat(r.service),
        tax: parseFloat(r.tax),
        gym: parseFloat(r.gym),
      };
    }

    // Payment: aggregate per date → qris / mandiri / bca / cash / other
    const paymentMap = {};
    for (const p of paymentRows) {
      const key = p.date instanceof Date ? p.date.toISOString().slice(0, 10) : String(p.date).slice(0, 10);
      if (!paymentMap[key]) paymentMap[key] = { qris: 0, mandiri: 0, bca: 0, cash: 0, other: 0 };
      const amount = parseFloat(p.total);
      const method = (p.method || '').toLowerCase();
      const bank = (p.bank_name || '').toLowerCase();

      if (method === 'qris') {
        paymentMap[key].qris += amount;
      } else if (method === 'cash') {
        paymentMap[key].cash += amount;
      } else if (bank.includes('mandiri') || (method === 'bank_transfer' && bank.includes('mandiri'))) {
        paymentMap[key].mandiri += amount;
      } else if (bank.includes('bca') || (method === 'bank_transfer' && bank.includes('bca'))) {
        paymentMap[key].bca += amount;
      } else if (method === 'debit_card' || method === 'credit_card' || method === 'bank_transfer' || method === 'e_wallet') {
        // Categorise card/transfer by bank name
        if (bank.includes('mandiri')) {
          paymentMap[key].mandiri += amount;
        } else if (bank.includes('bca')) {
          paymentMap[key].bca += amount;
        } else {
          paymentMap[key].other += amount;
        }
      } else if (method !== 'compliment') {
        paymentMap[key].other += amount;
      }
    }

    const expenseMap = {};
    for (const e of expenseRows) {
      const key = e.date instanceof Date ? e.date.toISOString().slice(0, 10) : String(e.date).slice(0, 10);
      expenseMap[key] = {
        pengeluaran: parseFloat(e.pengeluaran),
        keterangan: e.keterangan || '',
      };
    }

    const cashRegMap = {};
    for (const c of cashRegisterRows) {
      const key = c.date instanceof Date ? c.date.toISOString().slice(0, 10) : String(c.date).slice(0, 10);
      cashRegMap[key] = {
        expectedCash: parseFloat(c.expected_cash),
        actualCash: parseFloat(c.actual_cash),
        difference: parseFloat(c.difference),
      };
    }

    // ─── Assemble daily rows ───────────────────────────────────────────
    const totals = {
      resto: 0, service: 0, tax: 0, gym: 0,
      totalQris: 0, totalMandiri: 0, totalBca: 0,
      pengeluaranKasir: 0, totalCash: 0, actualCash: 0, selisihCash: 0,
    };

    const rows = dates.map(date => {
      const rev = revenueMap[date] || { resto: 0, service: 0, tax: 0, gym: 0 };
      const pay = paymentMap[date] || { qris: 0, mandiri: 0, bca: 0, cash: 0, other: 0 };
      const exp = expenseMap[date] || { pengeluaran: 0, keterangan: '' };
      const cr = cashRegMap[date] || null;

      // Use the stored shift closing balance/difference when available so daily summary
      // matches the authoritative shift-close cash calculation.
      const computedTotalCash = pay.cash - exp.pengeluaran;
      const totalCash = cr ? cr.expectedCash : computedTotalCash;
      const actualCash = cr ? cr.actualCash : null;
      const selisihCash = cr ? cr.difference : null;

      // Accumulate totals
      totals.resto += rev.resto;
      totals.service += rev.service;
      totals.tax += rev.tax;
      totals.gym += rev.gym;
      totals.totalQris += pay.qris;
      totals.totalMandiri += pay.mandiri;
      totals.totalBca += pay.bca;
      totals.pengeluaranKasir += exp.pengeluaran;
      totals.totalCash += totalCash;
      totals.actualCash += actualCash || 0;
      totals.selisihCash += selisihCash || 0;

      return {
        tanggal: date,
        resto: rev.resto,
        service: rev.service,
        tax: rev.tax,
        gym: rev.gym,
        totalQris: pay.qris,
        totalMandiri: pay.mandiri,
        totalBca: pay.bca,
        pengeluaranKasir: exp.pengeluaran,
        keterangan: exp.keterangan,
        totalCash,
        actualCash,
        selisihCash,
      };
    });

    res.json({
      report: 'daily-summary',
      period: { startDate, endDate },
      data: rows,
      totals: {
        resto: totals.resto,
        service: totals.service,
        tax: totals.tax,
        gym: totals.gym,
        totalQris: totals.totalQris,
        totalMandiri: totals.totalMandiri,
        totalBca: totals.totalBca,
        pengeluaranKasir: totals.pengeluaranKasir,
        totalCash: totals.totalCash,
        actualCash: totals.actualCash,
        selisihCash: totals.selisihCash,
      },
    });
  } catch (err) {
    logger.error('Daily summary report error:', err);
    next(err);
  }
}

/**
 * GET /reports/finance/daily-summary/export
 *
 * Export the daily report as XLSX with multiple sheets:
 *   1. LAPORAN HARIAN - daily summary
 *   2. DETAIL TRANSAKSI - individual transactions with items
 *   3. PAYMENT METHOD - payment breakdown per transaction
 *   4. DETAIL PENGELUARAN - cash expense details included in cashier totals
 *   5. SUMMARY - period summary by type & payment method
 *
 * @query startDate  YYYY-MM-DD (required)
 * @query endDate    YYYY-MM-DD (required)
 */
async function exportDailySummaryReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required (YYYY-MM-DD)' });
    }

    // Re-use JSON logic for sheet 1
    let reportData;
    const fakeRes = {
      json: (data) => { reportData = data; },
      status: () => fakeRes,
    };
    await getDailySummaryReport(req, fakeRes, (err) => { if (err) throw err; });

    const tenantFilter = isSuperAdmin ? '' : 'AND t."tenantId" = :tenantId';
    const replacements = {
      startDate: `${startDate}T00:00:00.000Z`,
      endDate: `${endDate}T23:59:59.999Z`,
      ...(isSuperAdmin ? {} : { tenantId }),
    };

    // ─── Query: transaction details with items ─────────────────────────
    const [detailRows] = await sequelize.query(`
      SELECT
        t."transactionNumber",
        DATE(t."createdAt")                      AS date,
        t."transactionType",
        t."orderType",
        t."status",
        t."customerName",
        NULLIF(TRIM(CONCAT_WS(' ', m."firstName", m."lastName")), '') AS "memberName",
        t."subtotal",
        t."serviceCharge",
        t."tax",
        t."voucherDiscount",
        t."totalAmount",
        t."paidAmount",
        t."changeAmount",
        t."notes",
        ti."itemName",
        ti."quantity",
        ti."unitPrice",
        ti."total"                              AS "itemTotal",
        ti."itemType"
      FROM "Transactions" t
      LEFT JOIN "Members" m ON m."id" = t."customerId" AND m."deletedAt" IS NULL
      LEFT JOIN "TransactionItems" ti ON ti."transactionId" = t."id" AND ti."deletedAt" IS NULL
      WHERE t."status" IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        AND ${PAID_TRANSACTION_EXISTS_SQL}
        AND t."createdAt" BETWEEN :startDate AND :endDate
        AND t."deletedAt" IS NULL
        ${tenantFilter}
      ORDER BY t."createdAt", t."transactionNumber", ti."itemName"
    `, { replacements });

    // ─── Query: payment methods per transaction ────────────────────────
    const [paymentDetailRows] = await sequelize.query(`
      SELECT
        t."transactionNumber",
        DATE(t."createdAt")                     AS date,
        t."transactionType",
        t."totalAmount",
        tp."paymentMethod",
        tp."amount"                             AS "paymentAmount",
        tp."status"                             AS "paymentStatus",
        COALESCE(tp."paymentDetails"->>'bank', tp."paymentDetails"->>'provider', '') AS "bankProvider",
        tp."notes"                              AS "paymentNotes"
      FROM "TransactionPayments" tp
      JOIN "Transactions" t ON tp."transactionId" = t."id"
      WHERE t."status" IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        AND tp."status" = '${COMPLETED_PAYMENT_STATUS}'
        AND tp."deletedAt" IS NULL
        AND t."deletedAt" IS NULL
        AND t."createdAt" BETWEEN :startDate AND :endDate
        ${tenantFilter}
      ORDER BY t."createdAt", t."transactionNumber", tp."paymentMethod"
    `, { replacements });

    // ─── Query: expense details (aligned to expenseDate matching cashier) ─
    const [expenseDetailRows] = await sequelize.query(`
      SELECT
        DATE(e."expenseDate")                    AS date,
        e."createdAt"                            AS "createdAt",
        e."expenseDate"                          AS "expenseDate",
        e."expenseNumber",
        e."title",
        COALESCE(ec."name", '')                  AS "categoryName",
        e."paymentMethod",
        e."bankName",
        e."status",
        e."vendor",
        e."referenceNumber",
        e."totalAmount",
        e."notes"
      FROM "Expenses" e
      LEFT JOIN "ExpenseCategories" ec
        ON ec."id" = e."categoryId"
       AND ec."deletedAt" IS NULL
      WHERE e."paymentMethod" = 'cash'
        AND e."status" IN ('approved', 'paid')
        AND e."expenseDate" BETWEEN :startDate AND :endDate
        AND e."deletedAt" IS NULL
        ${isSuperAdmin ? '' : 'AND e."tenantId" = :tenantId'}
      ORDER BY e."expenseDate", e."expenseNumber"
    `, { replacements });

    // ─── Query: summary aggregations ───────────────────────────────────
    const [summaryByType] = await sequelize.query(`
      SELECT
        t."transactionType",
        COUNT(DISTINCT t."id")                  AS "transactionCount",
        COALESCE(SUM(t."subtotal"), 0)          AS "subtotal",
        COALESCE(SUM(t."serviceCharge"), 0)     AS "serviceCharge",
        COALESCE(SUM(t."tax"), 0)               AS "tax",
        COALESCE(SUM(t."voucherDiscount"), 0)   AS "discount",
        COALESCE(SUM(t."totalAmount"), 0)       AS "totalAmount"
      FROM "Transactions" t
      WHERE t."status" IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        AND ${PAID_TRANSACTION_EXISTS_SQL}
        AND t."createdAt" BETWEEN :startDate AND :endDate
        AND t."deletedAt" IS NULL
        ${tenantFilter}
      GROUP BY t."transactionType"
      ORDER BY t."transactionType"
    `, { replacements });

    const [summaryByPayment] = await sequelize.query(`
      SELECT
        tp."paymentMethod",
        COALESCE(tp."paymentDetails"->>'bank', tp."paymentDetails"->>'provider', '') AS "bankProvider",
        COUNT(*)                                AS "transactionCount",
        COALESCE(SUM(tp."amount"), 0)           AS "totalAmount"
      FROM "TransactionPayments" tp
      JOIN "Transactions" t ON tp."transactionId" = t."id"
      WHERE t."status" IN (${REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL})
        AND tp."status" = '${COMPLETED_PAYMENT_STATUS}'
        AND tp."deletedAt" IS NULL
        AND t."deletedAt" IS NULL
        AND t."createdAt" BETWEEN :startDate AND :endDate
        ${tenantFilter}
      GROUP BY tp."paymentMethod",
               COALESCE(tp."paymentDetails"->>'bank', tp."paymentDetails"->>'provider', '')
      ORDER BY SUM(tp."amount") DESC
    `, { replacements });

    // ═══════════════════════════════════════════════════════════════════
    //  BUILD XLSX
    // ═══════════════════════════════════════════════════════════════════
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();

    // Accounting number format: #,##0 (no decimals, thousand separator)
    const ACCT_FMT = '#,##0';

    /**
     * Apply accounting format to numeric cells in a worksheet.
     * @param {Object} ws - XLSX worksheet
     * @param {number[]} cols - 0-based column indices to format
     * @param {number} startRow - 1-based first data row (skip header)
     */
    function applyAccountingFormat(ws, cols, startRow) {
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let r = startRow; r <= range.e.r; r++) {
        for (const c of cols) {
          const addr = XLSX.utils.encode_cell({ r, c });
          if (ws[addr] && typeof ws[addr].v === 'number') {
            ws[addr].z = ACCT_FMT;
          }
        }
      }
    }

    // ─── Sheet 1: LAPORAN HARIAN ───────────────────────────────────────
    const lhHeaders = [
      'TGL', 'RESTO', 'SERVICE', 'TAX', 'GYM',
      'TOTAL QRIS', 'TOTAL MANDIRI', 'TOTAL BCA',
      'PENGELUARAN KASIR', 'KETERANGAN',
      'TOTAL CASH', 'ACTUAL CASH', 'SELISIH CASH',
    ];
    const lhData = [lhHeaders];
    for (const row of reportData.data) {
      lhData.push([
        row.tanggal, row.resto, row.service, row.tax, row.gym,
        row.totalQris, row.totalMandiri, row.totalBca,
        row.pengeluaranKasir, row.keterangan,
        row.totalCash, row.actualCash, row.selisihCash,
      ]);
    }
    const t = reportData.totals;
    lhData.push([
      'TOTAL', t.resto, t.service, t.tax, t.gym,
      t.totalQris, t.totalMandiri, t.totalBca,
      t.pengeluaranKasir, '', t.totalCash, t.actualCash, t.selisihCash,
    ]);
    const wsLH = XLSX.utils.aoa_to_sheet(lhData);
    wsLH['!cols'] = [
      { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 14 },
      { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 30 },
      { wch: 14 }, { wch: 14 }, { wch: 14 },
    ];
    // Accounting format: cols B-I (1-8), K-M (10-12) — skip J(keterangan)
    applyAccountingFormat(wsLH, [1,2,3,4,5,6,7,8,10,11,12], 1);
    XLSX.utils.book_append_sheet(wb, wsLH, 'LAPORAN HARIAN');

    // ─── Sheet 2: DETAIL TRANSAKSI ─────────────────────────────────────
    const dtHeaders = [
      'TGL', 'NO TRANSAKSI', 'TIPE', 'ORDER TYPE', 'STATUS',
      'CUSTOMER', 'MEMBER', 'NAMA ITEM', 'TIPE ITEM', 'QTY', 'HARGA SATUAN', 'TOTAL ITEM',
      'SUBTOTAL', 'SERVICE', 'TAX', 'DISKON VOUCHER', 'TOTAL', 'DIBAYAR', 'KEMBALIAN', 'CATATAN',
    ];
    const dtData = [dtHeaders];
    let prevTxn = '';
    for (const r of detailRows) {
      const txn = r.transactionNumber || '';
      const isNewTxn = txn !== prevTxn;
      dtData.push([
        isNewTxn ? (r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date || '').slice(0, 10)) : '',
        isNewTxn ? txn : '',
        isNewTxn ? (r.transactionType || '') : '',
        isNewTxn ? (r.orderType || '') : '',
        isNewTxn ? (r.status || '') : '',
        isNewTxn ? (r.customerName || '') : '',
        isNewTxn ? (r.memberName || '') : '',
        r.itemName || '',
        r.itemType || '',
        r.quantity != null ? r.quantity : '',
        r.unitPrice != null ? parseFloat(r.unitPrice) : '',
        r.itemTotal != null ? parseFloat(r.itemTotal) : '',
        isNewTxn ? parseFloat(r.subtotal || 0) : '',
        isNewTxn ? parseFloat(r.serviceCharge || 0) : '',
        isNewTxn ? parseFloat(r.tax || 0) : '',
        isNewTxn ? parseFloat(r.voucherDiscount || 0) : '',
        isNewTxn ? parseFloat(r.totalAmount || 0) : '',
        isNewTxn ? parseFloat(r.paidAmount || 0) : '',
        isNewTxn ? parseFloat(r.changeAmount || 0) : '',
        isNewTxn ? (r.notes || '') : '',
      ]);
      prevTxn = txn;
    }
    const wsDT = XLSX.utils.aoa_to_sheet(dtData);
    wsDT['!cols'] = [
      { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 20 }, { wch: 22 }, { wch: 30 }, { wch: 14 }, { wch: 6 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 25 },
    ];
    // Accounting format: HARGA SATUAN(10), TOTAL ITEM(11), SUBTOTAL(12), SERVICE(13), TAX(14), DISKON(15), TOTAL(16), DIBAYAR(17), KEMBALIAN(18)
    applyAccountingFormat(wsDT, [10,11,12,13,14,15,16,17,18], 1);
    XLSX.utils.book_append_sheet(wb, wsDT, 'DETAIL TRANSAKSI');

    // ─── Sheet 3: PAYMENT METHOD ───────────────────────────────────────
    const pmHeaders = [
      'TGL', 'NO TRANSAKSI', 'TIPE TRANSAKSI', 'TOTAL TRANSAKSI',
      'METODE BAYAR', 'JUMLAH BAYAR', 'BANK/PROVIDER', 'STATUS BAYAR', 'CATATAN',
    ];
    const pmData = [pmHeaders];
    for (const r of paymentDetailRows) {
      pmData.push([
        r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date || '').slice(0, 10),
        r.transactionNumber || '',
        r.transactionType || '',
        parseFloat(r.totalAmount || 0),
        r.paymentMethod || '',
        parseFloat(r.paymentAmount || 0),
        r.bankProvider || '',
        r.paymentStatus || '',
        r.paymentNotes || '',
      ]);
    }
    const wsPM = XLSX.utils.aoa_to_sheet(pmData);
    wsPM['!cols'] = [
      { wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 16 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 25 },
    ];
    // Accounting format: TOTAL TRANSAKSI(3), JUMLAH BAYAR(5)
    applyAccountingFormat(wsPM, [3,5], 1);
    XLSX.utils.book_append_sheet(wb, wsPM, 'PAYMENT METHOD');

    // ─── Sheet 4: DETAIL PENGELUARAN ───────────────────────────────────
    const exHeaders = [
      'TGL LAPORAN', 'WAKTU INPUT', 'TGL EXPENSE', 'NO EXPENSE', 'JUDUL',
      'KATEGORI', 'METODE BAYAR', 'BANK', 'STATUS', 'VENDOR',
      'NO REFERENSI', 'TOTAL', 'CATATAN',
    ];
    const exData = [exHeaders];
    for (const r of expenseDetailRows) {
      exData.push([
        r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date || '').slice(0, 10),
        r.createdAt ? new Date(r.createdAt).toISOString().replace('T', ' ').slice(0, 19) : '',
        r.expenseDate ? new Date(r.expenseDate).toISOString().slice(0, 10) : '',
        r.expenseNumber || '',
        r.title || '',
        r.categoryName || '',
        r.paymentMethod || '',
        r.bankName || '',
        r.status || '',
        r.vendor || '',
        r.referenceNumber || '',
        parseFloat(r.totalAmount || 0),
        r.notes || '',
      ]);
    }
    const wsEX = XLSX.utils.aoa_to_sheet(exData);
    wsEX['!cols'] = [
      { wch: 12 }, { wch: 21 }, { wch: 12 }, { wch: 20 }, { wch: 28 },
      { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 18 },
      { wch: 18 }, { wch: 14 }, { wch: 28 },
    ];
    // Accounting format: TOTAL(11)
    applyAccountingFormat(wsEX, [11], 1);
    XLSX.utils.book_append_sheet(wb, wsEX, 'DETAIL PENGELUARAN');

    // ─── Sheet 5: SUMMARY ──────────────────────────────────────────────
    const sumData = [];
    sumData.push([`SUMMARY PERIODE: ${startDate} s/d ${endDate}`]);
    sumData.push([]);

    // Summary by transaction type
    sumData.push(['RINGKASAN PER TIPE TRANSAKSI']);
    sumData.push(['TIPE', 'JML TRANSAKSI', 'SUBTOTAL', 'SERVICE', 'TAX', 'DISKON', 'TOTAL']);
    let grandTotal = 0;
    let grandCount = 0;
    for (const r of summaryByType) {
      const row = [
        (r.transactionType || '').toUpperCase(),
        parseInt(r.transactionCount || 0),
        parseFloat(r.subtotal || 0),
        parseFloat(r.serviceCharge || 0),
        parseFloat(r.tax || 0),
        parseFloat(r.discount || 0),
        parseFloat(r.totalAmount || 0),
      ];
      sumData.push(row);
      grandTotal += parseFloat(r.totalAmount || 0);
      grandCount += parseInt(r.transactionCount || 0);
    }
    sumData.push(['TOTAL', grandCount, '', '', '', '', grandTotal]);

    sumData.push([]);
    sumData.push([]);

    // Summary by payment method
    sumData.push(['RINGKASAN PER METODE PEMBAYARAN']);
    sumData.push(['METODE BAYAR', 'BANK/PROVIDER', 'JML TRANSAKSI', 'TOTAL']);
    let payGrandTotal = 0;
    for (const r of summaryByPayment) {
      sumData.push([
        r.paymentMethod || '',
        r.bankProvider || '',
        parseInt(r.transactionCount || 0),
        parseFloat(r.totalAmount || 0),
      ]);
      payGrandTotal += parseFloat(r.totalAmount || 0);
    }
    sumData.push(['TOTAL', '', '', payGrandTotal]);

    sumData.push([]);
    sumData.push([]);

    // Daily totals from LAPORAN HARIAN
    sumData.push(['RINGKASAN LAPORAN HARIAN']);
    sumData.push(['', 'JUMLAH']);
    sumData.push(['Total Resto', t.resto]);
    sumData.push(['Total Service', t.service]);
    sumData.push(['Total Tax', t.tax]);
    sumData.push(['Total Gym', t.gym]);
    sumData.push(['Total QRIS', t.totalQris]);
    sumData.push(['Total Mandiri', t.totalMandiri]);
    sumData.push(['Total BCA', t.totalBca]);
    sumData.push(['Pengeluaran Kasir', t.pengeluaranKasir]);
    sumData.push(['Total Cash', t.totalCash]);
    sumData.push(['Actual Cash', t.actualCash]);
    sumData.push(['Selisih Cash', t.selisihCash]);

    const wsSUM = XLSX.utils.aoa_to_sheet(sumData);
    wsSUM['!cols'] = [
      { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
    ];
    // Apply accounting format to all numeric cells in summary
    applyAccountingFormat(wsSUM, [1,2,3,4,5,6], 0);
    XLSX.utils.book_append_sheet(wb, wsSUM, 'SUMMARY');

    // ─── Write & send ──────────────────────────────────────────────────
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `Laporan_Harian_${startDate}_${endDate}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    logger.error('Daily summary export error:', err);
    next(err);
  }
}

module.exports = {
  getDailySummaryReport,
  exportDailySummaryReport,
};
