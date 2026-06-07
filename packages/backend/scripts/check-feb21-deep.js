const db = require('../src/models');

async function check() {
  try {
    // Check for negative values in ANY field
    console.log('=== 1. CHECK NEGATIVE VALUES IN ANY COLUMN ===');
    const [negItems] = await db.sequelize.query(`
      SELECT 
        t."transactionNumber",
        ti."itemName",
        ti."quantity",
        ti."unitPrice",
        ti."subtotal" as "itemSubtotal",
        ti."total" as "itemTotal"
      FROM "TransactionItems" ti
      JOIN "Transactions" t ON ti."transactionId" = t.id
      WHERE t."transactionDate" >= '2026-02-21 00:00:00+07'
        AND t."transactionDate" < '2026-02-22 00:00:00+07'
        AND (ti."quantity" < 0 OR ti."unitPrice" < 0 OR ti."subtotal" < 0 OR ti."total" < 0)
    `);
    console.log('Items with negative values:', negItems.length);
    negItems.forEach(i => {
      console.log(`  ${i.transactionNumber} - ${i.itemName}: qty=${i.quantity}, price=${i.unitPrice}, subtotal=${i.itemSubtotal}, total=${i.itemTotal}`);
    });

    // Check all items detail to see calculation
    console.log('\n=== 2. ALL ITEMS ON FEB 21 ===');
    const [allItems] = await db.sequelize.query(`
      SELECT 
        t."transactionNumber",
        t."totalAmount",
        t."subtotal" as "txSubtotal",
        t."voucherDiscount",
        t."serviceCharge",
        t."status",
        ti."itemName",
        ti."quantity",
        ti."unitPrice",
        ti."subtotal" as "itemSubtotal",
        ti."total" as "itemTotal"
      FROM "TransactionItems" ti
      JOIN "Transactions" t ON ti."transactionId" = t.id
      WHERE t."transactionDate" >= '2026-02-21 00:00:00+07'
        AND t."transactionDate" < '2026-02-22 00:00:00+07'
      ORDER BY t."transactionNumber", ti."itemName"
    `);
    
    let currentTx = '';
    allItems.forEach(i => {
      if (currentTx !== i.transactionNumber) {
        currentTx = i.transactionNumber;
        console.log(`\n📋 ${i.transactionNumber} (Status: ${i.status}) | Total: ${i.totalAmount} | Subtotal: ${i.txSubtotal} | Voucher: ${i.voucherDiscount} | SC: ${i.serviceCharge}`);
      }
      console.log(`  - ${i.itemName} | Qty: ${i.quantity} x ${i.unitPrice} = subtotal ${i.itemSubtotal}, total ${i.itemTotal}`);
    });

    // Check payments for any negative amounts
    console.log('\n\n=== 3. CHECK NEGATIVE PAYMENTS ===');
    const [negPayments] = await db.sequelize.query(`
      SELECT 
        t."transactionNumber",
        tp."paymentMethod",
        tp."amount",
        tp."referenceNumber"
      FROM "TransactionPayments" tp
      JOIN "Transactions" t ON tp."transactionId" = t.id
      WHERE t."transactionDate" >= '2026-02-21 00:00:00+07'
        AND t."transactionDate" < '2026-02-22 00:00:00+07'
        AND tp."amount" < 0
    `);
    console.log('Payments with negative amounts:', negPayments.length);
    negPayments.forEach(p => {
      console.log(`  ${p.transactionNumber} - ${p.paymentMethod}: ${p.amount}`);
    });

    // Check where voucherDiscount > subtotal (would cause effective negative)
    console.log('\n=== 4. CHECK VOUCHER EXCEEDS SUBTOTAL ===');
    const [voucherExceeds] = await db.sequelize.query(`
      SELECT 
        "transactionNumber",
        "subtotal",
        "voucherDiscount",
        "serviceCharge",
        "totalAmount",
        ("subtotal"::numeric - "voucherDiscount"::numeric) as "afterDiscount",
        "status"
      FROM "Transactions"
      WHERE "transactionDate" >= '2026-02-21 00:00:00+07'
        AND "transactionDate" < '2026-02-22 00:00:00+07'
        AND "voucherDiscount"::numeric > "subtotal"::numeric
    `);
    console.log('Transactions where voucher > subtotal:', voucherExceeds.length);
    voucherExceeds.forEach(v => {
      console.log(`  ${v.transactionNumber}: subtotal=${v.subtotal}, voucher=${v.voucherDiscount}, afterDiscount=${v.afterDiscount}`);
    });

    // Check refunded transactions impact
    console.log('\n=== 5. REFUNDED TRANSACTIONS ===');
    const [refunded] = await db.sequelize.query(`
      SELECT 
        "transactionNumber",
        "subtotal",
        "totalAmount",
        "paidAmount",
        "status",
        "notes"
      FROM "Transactions"
      WHERE "transactionDate" >= '2026-02-21 00:00:00+07'
        AND "transactionDate" < '2026-02-22 00:00:00+07'
        AND "status" IN ('refunded', 'partially_refunded', 'cancelled')
    `);
    console.log('Refunded/Cancelled transactions:', refunded.length);
    refunded.forEach(r => {
      console.log(`  ${r.transactionNumber}: total=${r.totalAmount}, paid=${r.paidAmount}, status=${r.status}`);
      console.log(`    Notes: ${r.notes || '-'}`);
    });

    // Net calculation for the day
    console.log('\n=== 6. NET REVENUE CALCULATION ===');
    const [summary] = await db.sequelize.query(`
      SELECT 
        "status",
        COUNT(*) as "count",
        SUM("totalAmount"::numeric) as "sumTotal",
        SUM("paidAmount"::numeric) as "sumPaid",
        SUM("subtotal"::numeric) as "sumSubtotal",
        SUM("voucherDiscount"::numeric) as "sumVoucher",
        SUM("serviceCharge"::numeric) as "sumSC"
      FROM "Transactions"
      WHERE "transactionDate" >= '2026-02-21 00:00:00+07'
        AND "transactionDate" < '2026-02-22 00:00:00+07'
      GROUP BY "status"
      ORDER BY "status"
    `);
    console.log('\nBy status:');
    summary.forEach(s => {
      console.log(`  ${s.status}: ${s.count} tx | Total: ${s.sumTotal} | Paid: ${s.sumPaid} | Subtotal: ${s.sumSubtotal} | Voucher: ${s.sumVoucher} | SC: ${s.sumSC}`);
    });

    // Grand total
    const [grand] = await db.sequelize.query(`
      SELECT 
        SUM(CASE WHEN "status" IN ('completed', 'paid') THEN "totalAmount"::numeric ELSE 0 END) as "completedTotal",
        SUM(CASE WHEN "status" IN ('completed', 'paid') THEN "paidAmount"::numeric ELSE 0 END) as "completedPaid",
        SUM(CASE WHEN "status" = 'refunded' THEN "totalAmount"::numeric ELSE 0 END) as "refundedTotal",
        SUM(CASE WHEN "status" = 'cancelled' THEN "totalAmount"::numeric ELSE 0 END) as "cancelledTotal",
        SUM(CASE WHEN "status" IN ('completed', 'paid') THEN "totalAmount"::numeric ELSE 0 END) 
          - SUM(CASE WHEN "status" = 'refunded' THEN "totalAmount"::numeric ELSE 0 END) as "netRevenue"
      FROM "Transactions"
      WHERE "transactionDate" >= '2026-02-21 00:00:00+07'
        AND "transactionDate" < '2026-02-22 00:00:00+07'
    `);
    console.log('\nGrand totals:');
    console.log('  Completed total:', grand[0].completedTotal);
    console.log('  Completed paid:', grand[0].completedPaid);
    console.log('  Refunded total:', grand[0].refundedTotal);
    console.log('  Cancelled total:', grand[0].cancelledTotal);
    console.log('  Net revenue (completed - refunded):', grand[0].netRevenue);

  } catch(err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await db.sequelize.close();
  }
}
check();
