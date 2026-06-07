const db = require('../src/models');

async function listAll() {
  try {
    const sessionId = '1c944e71-f19a-4b59-a310-ca30695f62f2';

    // Session info
    const [session] = await db.sequelize.query(`
      SELECT "openingBalance", "closingBalance", "actualCash", "difference", 
             "openedAt", "closedAt"
      FROM "CashRegisterSessions"
      WHERE id = '${sessionId}'
    `);
    const s = session[0];

    // All transactions in this session period
    const [transactions] = await db.sequelize.query(`
      SELECT 
        t.id,
        t."transactionNumber",
        t."transactionDate",
        t."transactionType",
        t."status",
        t."subtotal",
        t."voucherDiscount",
        t."serviceCharge",
        t."tax",
        t."roundingAmount",
        t."totalAmount",
        t."paidAmount",
        t."changeAmount",
        t."customerType",
        t."customerName",
        t."notes",
        t."splitFromId"
      FROM "Transactions" t
      WHERE t."transactionDate" >= (SELECT "openedAt" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
        AND t."transactionDate" < (SELECT "closedAt" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
        AND t."tenantId" = (SELECT "tenantId" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
      ORDER BY t."transactionDate"
    `);

    // All payments
    const [payments] = await db.sequelize.query(`
      SELECT 
        tp."transactionId",
        tp."paymentMethod",
        tp."amount",
        tp."status",
        tp."paymentDate",
        tp."notes"
      FROM "TransactionPayments" tp
      JOIN "Transactions" t ON tp."transactionId" = t.id
      WHERE t."transactionDate" >= (SELECT "openedAt" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
        AND t."transactionDate" < (SELECT "closedAt" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
        AND t."tenantId" = (SELECT "tenantId" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
      ORDER BY tp."paymentDate"
    `);

    // All items
    const [items] = await db.sequelize.query(`
      SELECT 
        ti."transactionId",
        ti."itemName",
        ti."quantity",
        ti."unitPrice",
        ti."subtotal",
        ti."total",
        ti."status" as "itemStatus",
        ti."isRefunded"
      FROM "TransactionItems" ti
      JOIN "Transactions" t ON ti."transactionId" = t.id
      WHERE t."transactionDate" >= (SELECT "openedAt" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
        AND t."transactionDate" < (SELECT "closedAt" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
        AND t."tenantId" = (SELECT "tenantId" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
      ORDER BY ti."createdAt"
    `);

    // Group payments & items by transactionId
    const paymentMap = {};
    payments.forEach(p => {
      if (!paymentMap[p.transactionId]) paymentMap[p.transactionId] = [];
      paymentMap[p.transactionId].push(p);
    });

    const itemMap = {};
    items.forEach(i => {
      if (!itemMap[i.transactionId]) itemMap[i.transactionId] = [];
      itemMap[i.transactionId].push(i);
    });

    // Print
    console.log('══════════════════════════════════════════════════════════════════════════');
    console.log('  DAFTAR LENGKAP TRANSAKSI — Sesi Siang 21 Feb 2026');
    console.log('══════════════════════════════════════════════════════════════════════════');
    console.log(`  Session  : ${sessionId}`);
    console.log(`  Modal    : Rp ${fmt(s.openingBalance)}`);
    console.log(`  Expected : Rp ${fmt(s.closingBalance)}`);
    console.log(`  Actual   : Rp ${fmt(s.actualCash)}`);
    console.log(`  Selisih  : Rp ${fmt(s.difference)}`);
    console.log(`  Jumlah Transaksi: ${transactions.length}`);
    console.log('══════════════════════════════════════════════════════════════════════════\n');

    let totalCash = 0;
    let totalNonCash = 0;
    let totalChange = 0;
    let grandTotal = 0;

    transactions.forEach((t, idx) => {
      const txItems = itemMap[t.id] || [];
      const txPayments = paymentMap[t.id] || [];

      console.log(`──────────────────────────────────────────────────────────────────────────`);
      console.log(`  #${idx + 1}  ${t.transactionNumber}`);
      console.log(`──────────────────────────────────────────────────────────────────────────`);
      console.log(`  Tanggal     : ${t.transactionDate}`);
      console.log(`  Tipe        : ${t.transactionType}`);
      console.log(`  Status      : ${t.status}`);
      if (t.customerName) console.log(`  Customer    : ${t.customerName} (${t.customerType})`);
      if (t.notes) console.log(`  Notes       : ${t.notes}`);
      if (t.splitFromId) console.log(`  Split From  : ${t.splitFromId}`);

      // Items
      console.log(`\n  📦 Items:`);
      txItems.forEach(item => {
        const refunded = item.isRefunded ? ' [REFUNDED]' : '';
        console.log(`     · ${item.itemName} — ${item.quantity} x Rp ${fmt(item.unitPrice)} = Rp ${fmt(item.subtotal)}${refunded}`);
      });

      // Calculation
      console.log(`\n  💰 Kalkulasi:`);
      console.log(`     Subtotal        : Rp ${fmt(t.subtotal)}`);
      if (parseFloat(t.voucherDiscount) > 0)
        console.log(`     Voucher Disc    : -Rp ${fmt(t.voucherDiscount)}`);
      if (parseFloat(t.serviceCharge) > 0)
        console.log(`     Service Charge  : +Rp ${fmt(t.serviceCharge)}`);
      if (parseFloat(t.tax) > 0)
        console.log(`     Tax             : +Rp ${fmt(t.tax)}`);
      if (parseFloat(t.roundingAmount) != 0)
        console.log(`     Rounding        : Rp ${fmt(t.roundingAmount)}`);
      console.log(`     ─────────────────────────────`);
      console.log(`     Total Amount    : Rp ${fmt(t.totalAmount)}`);

      // Payments
      console.log(`\n  💳 Pembayaran:`);
      if (txPayments.length === 0) {
        console.log(`     (tidak ada pembayaran)`);
      } else {
        txPayments.forEach(p => {
          const statusIcon = p.status === 'completed' ? '✅' : p.status === 'failed' ? '❌' : '⏳';
          console.log(`     ${statusIcon} ${p.paymentMethod.toUpperCase().padEnd(12)} Rp ${fmt(p.amount).padStart(12)}  [${p.status}]`);
          if (p.notes) console.log(`        Notes: ${p.notes}`);

          if (p.status === 'completed') {
            if (p.paymentMethod === 'cash') {
              totalCash += parseFloat(p.amount);
            } else {
              totalNonCash += parseFloat(p.amount);
            }
          }
        });
      }

      if (parseFloat(t.changeAmount) > 0) {
        console.log(`     🔄 Kembalian    : Rp ${fmt(t.changeAmount)}`);
        if (t.status === 'completed' || t.status === 'split') {
          // Only count change for transactions with completed cash payments
          const hasCompletedCash = txPayments.some(p => p.paymentMethod === 'cash' && p.status === 'completed');
          if (hasCompletedCash) {
            totalChange += parseFloat(t.changeAmount);
          }
        }
      }

      if (['completed', 'paid'].includes(t.status)) {
        grandTotal += parseFloat(t.totalAmount);
      }

      console.log('');
    });

    // Summary
    console.log('══════════════════════════════════════════════════════════════════════════');
    console.log('  RINGKASAN');
    console.log('══════════════════════════════════════════════════════════════════════════');
    console.log(`  Total Cash Masuk (completed)   : Rp ${fmt(totalCash)}`);
    console.log(`  Total Kembalian Cash           : Rp ${fmt(totalChange)}`);
    console.log(`  Net Cash In                    : Rp ${fmt(totalCash - totalChange)}`);
    console.log(`  Total Non-Cash (QRIS, dll)     : Rp ${fmt(totalNonCash)}`);
    console.log(`  Grand Total (completed only)   : Rp ${fmt(grandTotal)}`);
    console.log(`  ──────────────────────────────────────────`);
    console.log(`  Modal Awal                     : Rp ${fmt(s.openingBalance)}`);
    console.log(`  + Net Cash In                  : Rp ${fmt(totalCash - totalChange)}`);
    console.log(`  = Expected Cash di Laci        : Rp ${fmt(parseFloat(s.openingBalance) + totalCash - totalChange)}`);
    console.log(`  Actual Cash di Laci            : Rp ${fmt(s.actualCash)}`);
    console.log(`  SELISIH                        : Rp ${fmt(parseFloat(s.actualCash) - (parseFloat(s.openingBalance) + totalCash - totalChange))}`);
    console.log('══════════════════════════════════════════════════════════════════════════');

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await db.sequelize.close();
  }
}

function fmt(val) {
  return Number(val).toLocaleString('id-ID');
}

listAll();
