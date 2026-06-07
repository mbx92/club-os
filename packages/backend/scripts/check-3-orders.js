#!/usr/bin/env node
/**
 * Check current state of 3 transactions before update
 */
const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '.env.development' });
const config = require('../src/config/config.js');
const dbConfig = config.development;
const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host, port: dbConfig.port, dialect: dbConfig.dialect, logging: false
});

(async () => {
  try {
    const txNumbers = ['ORD-202602-0020', 'ORD-202602-0023', 'ORD-202602-0028'];

    for (const txNum of txNumbers) {
      const [rows] = await sequelize.query(`
        SELECT t.id, t."transactionNumber", t."totalAmount", t.status,
               t."transactionType", t."paidAmount", t."changeAmount", t."createdAt",
               t."transactionDate", t."cancelledAt", t."cancelledBy"
        FROM "Transactions" t
        WHERE t."transactionNumber" = '${txNum}'
      `);

      if (rows.length === 0) {
        console.log(txNum + ': NOT FOUND\n');
        continue;
      }

      const t = rows[0];
      console.log('=== ' + txNum + ' ===');
      console.log('  ID: ' + t.id);
      console.log('  Status: ' + t.status);
      console.log('  Type: ' + t.transactionType);
      console.log('  Total: ' + Number(t.totalAmount).toLocaleString());
      console.log('  Paid: ' + Number(t.paidAmount || 0).toLocaleString());
      console.log('  Change: ' + Number(t.changeAmount || 0).toLocaleString());
      console.log('  Created: ' + t.createdAt);
      console.log('  Cancelled: ' + (t.cancelledAt || 'no'));

      // Get payments
      const [payments] = await sequelize.query(`
        SELECT tp.id, tp."paymentMethod", tp.amount, tp.status, tp."createdAt"
        FROM "TransactionPayments" tp
        WHERE tp."transactionId" = '${t.id}'
        ORDER BY tp."createdAt"
      `);
      console.log('  Payments:');
      payments.forEach(p => {
        console.log('    ' + p.id.substring(0, 8) + '... | ' + p.paymentMethod + ' | ' + Number(p.amount).toLocaleString() + ' | ' + p.status);
      });

      // Get items
      const [items] = await sequelize.query(`
        SELECT ti.id, ti."itemName", ti.quantity, ti."unitPrice", ti.subtotal, ti.total
        FROM "TransactionItems" ti
        WHERE ti."transactionId" = '${t.id}'
      `);
      console.log('  Items:');
      items.forEach(i => {
        console.log('    ' + i.itemName + ' x' + i.quantity + ' @ ' + Number(i.unitPrice).toLocaleString() + ' = ' + Number(i.total).toLocaleString());
      });
      console.log('');
    }

    await sequelize.close();
  } catch (e) { console.error(e); process.exit(1); }
})();
