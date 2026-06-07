const db = require('../src/models');

async function trace() {
  try {
    const sessionId = '1c944e71-f19a-4b59-a310-ca30695f62f2';

    // 1. Session info
    const [session] = await db.sequelize.query(`
      SELECT "openingBalance", "closingBalance", "actualCash", "difference", 
             "openedAt", "closedAt"
      FROM "CashRegisterSessions"
      WHERE id = '${sessionId}'
    `);
    const s = session[0];
    console.log('═══════════════════════════════════════════════════');
    console.log('  TRACE SESI SIANG 21 FEB 2026');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Opening (modal awal) : Rp ${Number(s.openingBalance).toLocaleString('id-ID')}`);
    console.log(`  Closing (expected)   : Rp ${Number(s.closingBalance).toLocaleString('id-ID')}`);
    console.log(`  Actual Cash (di laci): Rp ${Number(s.actualCash).toLocaleString('id-ID')}`);
    console.log(`  Difference           : Rp ${Number(s.difference).toLocaleString('id-ID')}`);
    console.log(`  Opened: ${s.openedAt}  Closed: ${s.closedAt}`);

    // 2. All CASH payments in this session (completed payments only)
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  SEMUA PEMBAYARAN CASH DI SESI INI');
    console.log('═══════════════════════════════════════════════════');
    
    const [cashPayments] = await db.sequelize.query(`
      SELECT 
        t."transactionNumber",
        t."status" as "txStatus",
        t."totalAmount",
        t."paidAmount",
        t."changeAmount",
        t."transactionType",
        t."voucherDiscount",
        t."serviceCharge",
        tp."paymentMethod",
        tp."amount" as "paymentAmount",
        tp."status" as "paymentStatus"
      FROM "TransactionPayments" tp
      JOIN "Transactions" t ON tp."transactionId" = t.id
      WHERE tp."paymentDate" >= (SELECT "openedAt" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
        AND tp."paymentDate" < (SELECT "closedAt" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
        AND t."tenantId" = (SELECT "tenantId" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
      ORDER BY t."transactionDate", tp."paymentMethod"
    `);

    let totalCashIn = 0;
    let totalCashChange = 0;
    let totalNonCash = 0;

    console.log('\n  No | Transaction       | Tx Status  | Method   | Pay Status | Bayar       | Change      | Net Cash');
    console.log('  ---|-------------------|------------|----------|------------|-------------|-------------|----------');
    
    cashPayments.forEach((p, i) => {
      const payAmt = parseFloat(p.paymentAmount);
      const changeAmt = parseFloat(p.changeAmount || 0);
      const isCash = p.paymentMethod === 'cash';
      const netCash = isCash ? (payAmt - changeAmt) : 0;
      
      if (isCash && p.paymentStatus === 'completed') {
        totalCashIn += payAmt;
        totalCashChange += changeAmt;
      } else if (!isCash && p.paymentStatus === 'completed') {
        totalNonCash += payAmt;
      }

      console.log(`  ${String(i+1).padStart(2)} | ${p.transactionNumber.padEnd(17)} | ${p.txStatus.padEnd(10)} | ${p.paymentMethod.padEnd(8)} | ${p.paymentStatus.padEnd(10)} | ${String('Rp ' + payAmt.toLocaleString('id-ID')).padStart(11)} | ${String('Rp ' + changeAmt.toLocaleString('id-ID')).padStart(11)} | ${isCash ? 'Rp ' + netCash.toLocaleString('id-ID') : '-'}`);
    });

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  KALKULASI CLOSING BALANCE');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Total Cash Masuk (paid)     : Rp ${totalCashIn.toLocaleString('id-ID')}`);
    console.log(`  Total Change (kembalian)    : Rp ${totalCashChange.toLocaleString('id-ID')}`);
    console.log(`  Net Cash In (masuk - change): Rp ${(totalCashIn - totalCashChange).toLocaleString('id-ID')}`);
    console.log(`  Total Non-Cash              : Rp ${totalNonCash.toLocaleString('id-ID')}`);
    
    const netCashIn = totalCashIn - totalCashChange;
    const expectedFromCash = parseFloat(s.openingBalance) + netCashIn;
    console.log(`\n  Opening Balance             : Rp ${Number(s.openingBalance).toLocaleString('id-ID')}`);
    console.log(`  + Net Cash In               : Rp ${netCashIn.toLocaleString('id-ID')}`);
    console.log(`  ─────────────────────────────────────`);
    console.log(`  = Expected Cash (hitungan)  : Rp ${expectedFromCash.toLocaleString('id-ID')}`);
    console.log(`  = Closing Balance (DB)      : Rp ${Number(s.closingBalance).toLocaleString('id-ID')}`);
    console.log(`\n  Actual Cash (di laci)       : Rp ${Number(s.actualCash).toLocaleString('id-ID')}`);
    console.log(`  Difference (actual - expected): Rp ${(Number(s.actualCash) - expectedFromCash).toLocaleString('id-ID')}`);
    console.log(`  Difference (DB)             : Rp ${Number(s.difference).toLocaleString('id-ID')}`);

    // 3. Break down by transaction
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  DETAIL PER TRANSAKSI (CASH ONLY)');
    console.log('═══════════════════════════════════════════════════');
    
    const [cashDetails] = await db.sequelize.query(`
      SELECT 
        t."transactionNumber",
        t."status",
        t."totalAmount",
        t."paidAmount",
        t."changeAmount",
        t."voucherDiscount",
        t."serviceCharge",
        t."subtotal",
        t."transactionType",
        t."splitFromId",
        t."notes",
        COALESCE(
          (SELECT SUM(tp2."amount"::numeric) 
           FROM "TransactionPayments" tp2 
           WHERE tp2."transactionId" = t.id 
             AND tp2."paymentMethod" = 'cash'
             AND tp2."status" = 'completed'), 0
        ) as "cashPaid",
        COALESCE(
          (SELECT SUM(tp2."amount"::numeric) 
           FROM "TransactionPayments" tp2 
           WHERE tp2."transactionId" = t.id 
             AND tp2."paymentMethod" != 'cash'
             AND tp2."status" = 'completed'), 0
        ) as "nonCashPaid"
      FROM "Transactions" t
      WHERE EXISTS (
        SELECT 1 FROM "TransactionPayments" tp 
        WHERE tp."transactionId" = t.id 
          AND tp."paymentDate" >= (SELECT "openedAt" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
          AND tp."paymentDate" < (SELECT "closedAt" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
      )
      AND t."tenantId" = (SELECT "tenantId" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
      ORDER BY t."transactionDate"
    `);

    let runningCash = parseFloat(s.openingBalance);
    console.log(`\n  Modal Awal: Rp ${runningCash.toLocaleString('id-ID')}\n`);
    
    cashDetails.forEach((t, i) => {
      const cashPaid = parseFloat(t.cashPaid);
      const nonCashPaid = parseFloat(t.nonCashPaid);
      const changeAmt = parseFloat(t.changeAmount || 0);
      const netCash = cashPaid - changeAmt;
      
      if (cashPaid > 0) {
        runningCash += netCash;
      }
      
      console.log(`  ${i+1}. ${t.transactionNumber} [${t.status}] ${t.transactionType}`);
      console.log(`     Subtotal: ${Number(t.subtotal).toLocaleString('id-ID')} | Voucher: -${Number(t.voucherDiscount).toLocaleString('id-ID')} | SC: +${Number(t.serviceCharge).toLocaleString('id-ID')} | Total: ${Number(t.totalAmount).toLocaleString('id-ID')}`);
      if (cashPaid > 0) {
        console.log(`     Cash: ${cashPaid.toLocaleString('id-ID')} - Change: ${changeAmt.toLocaleString('id-ID')} = Net Cash: ${netCash.toLocaleString('id-ID')}`);
      }
      if (nonCashPaid > 0) {
        console.log(`     Non-Cash: ${nonCashPaid.toLocaleString('id-ID')}`);
      }
      if (t.notes) console.log(`     Notes: ${t.notes}`);
      if (cashPaid > 0) {
        console.log(`     → Running Cash: Rp ${runningCash.toLocaleString('id-ID')}`);
      }
    });

    console.log(`\n  ─────────────────────────────────────`);
    console.log(`  Running Cash (akhir)    : Rp ${runningCash.toLocaleString('id-ID')}`);
    console.log(`  Actual Cash (di laci)   : Rp ${Number(s.actualCash).toLocaleString('id-ID')}`);
    console.log(`  Selisih                 : Rp ${(Number(s.actualCash) - runningCash).toLocaleString('id-ID')}`);

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await db.sequelize.close();
  }
}
trace();
