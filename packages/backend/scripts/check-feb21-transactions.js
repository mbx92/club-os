const db = require('../src/models');

async function check() {
  try {
    const [transactions] = await db.sequelize.query(`
      SELECT 
        t.id,
        t."transactionNumber",
        t."transactionDate",
        t."transactionType",
        t."subtotal",
        t."tax",
        t."serviceCharge",
        t."voucherDiscount",
        t."roundingAmount",
        t."totalAmount",
        t."paidAmount",
        t."changeAmount",
        t."status",
        t."notes",
        t."customerType",
        t."customerName"
      FROM "Transactions" t
      WHERE t."transactionDate" >= '2026-02-21 00:00:00+07'
        AND t."transactionDate" < '2026-02-22 00:00:00+07'
      ORDER BY t."transactionDate"
    `);
    
    console.log('=== ALL TRANSACTIONS ON FEB 21, 2026 ===');
    console.log('Total count:', transactions.length);
    
    transactions.forEach(t => {
      const isMinus = parseFloat(t.totalAmount) < 0;
      console.log(`\n${isMinus ? '❌ MINUS' : '✅ OK'} ${t.transactionNumber}`);
      console.log('  Type:', t.transactionType, '| Status:', t.status);
      console.log('  Subtotal:', t.subtotal, '| VoucherDiscount:', t.voucherDiscount);
      console.log('  Tax:', t.tax, '| ServiceCharge:', t.serviceCharge);
      console.log('  RoundingAmount:', t.roundingAmount);
      console.log('  TotalAmount:', t.totalAmount);
      console.log('  PaidAmount:', t.paidAmount, '| ChangeAmount:', t.changeAmount);
      console.log('  Customer:', t.customerType, t.customerName || '');
      console.log('  Notes:', t.notes || '-');
    });
    
    // Summary
    const minusTx = transactions.filter(t => parseFloat(t.totalAmount) < 0);
    console.log(`\n=== SUMMARY ===`);
    console.log(`Total transactions: ${transactions.length}`);
    console.log(`Minus transactions: ${minusTx.length}`);
    
    // Detail the minus transaction items
    if (minusTx.length > 0) {
      console.log('\n=== DETAIL MINUS TRANSACTIONS - ITEMS ===');
      for (const mt of minusTx) {
        const [items] = await db.sequelize.query(`
          SELECT 
            ti."id",
            ti."productName",
            ti."quantity",
            ti."unitPrice",
            ti."discount",
            ti."subtotal" as "itemSubtotal",
            ti."notes" as "itemNotes"
          FROM "TransactionItems" ti
          WHERE ti."transactionId" = '${mt.id}'
        `);
        console.log(`\nItems for ${mt.transactionNumber}:`);
        items.forEach(item => {
          console.log(`  - ${item.productName} | Qty: ${item.quantity} | Price: ${item.unitPrice} | Discount: ${item.discount} | Subtotal: ${item.itemSubtotal}`);
          if (item.itemNotes) console.log(`    Notes: ${item.itemNotes}`);
        });
        
        const [payments] = await db.sequelize.query(`
          SELECT 
            tp."paymentMethod",
            tp."amount",
            tp."referenceNumber",
            tp."notes" as "paymentNotes"
          FROM "TransactionPayments" tp
          WHERE tp."transactionId" = '${mt.id}'
        `);
        console.log(`\nPayments for ${mt.transactionNumber}:`);
        payments.forEach(p => {
          console.log(`  - Method: ${p.paymentMethod} | Amount: ${p.amount} | Ref: ${p.referenceNumber || '-'}`);
        });
      }
    }
    
  } catch(err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await db.sequelize.close();
  }
}
check();
