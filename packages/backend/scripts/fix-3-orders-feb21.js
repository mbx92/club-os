#!/usr/bin/env node
/**
 * Fix 3 Transactions on Feb 21 Shift Siang:
 * 
 * 1. ORD-202602-0020 → Cancel (status: cancelled, payment voided)
 * 2. ORD-202602-0023 → Change payment method from cash to QRIS
 * 3. ORD-202602-0028 → Cancel (status: cancelled, payment voided)
 *
 * Usage:
 *   DRY_RUN=1 node scripts/fix-3-orders-feb21.js   # Preview only
 *   node scripts/fix-3-orders-feb21.js              # Execute
 */
const { Sequelize } = require('sequelize');
const env = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: '.env.' + env });
const config = require('../src/config/config.js');
const dbConfig = config[env];
const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host, port: dbConfig.port, dialect: dbConfig.dialect, logging: false
});

const DRY_RUN = process.env.DRY_RUN === '1';

async function cancelTransaction(txNumber, t) {
  console.log('\n--- Cancelling ' + txNumber + ' ---');

  const [rows] = await sequelize.query(
    'SELECT id, status, "totalAmount", "paidAmount" FROM "Transactions" WHERE "transactionNumber" = :txNum',
    { replacements: { txNum: txNumber }, transaction: t }
  );

  if (rows.length === 0) throw new Error(txNumber + ' not found');
  const tx = rows[0];

  if (tx.status === 'cancelled') {
    console.log('  Already cancelled, skipping.');
    return;
  }

  console.log('  Current status: ' + tx.status + ', Total: ' + Number(tx.totalAmount).toLocaleString());

  // Update transaction status to cancelled
  await sequelize.query(
    `UPDATE "Transactions" 
     SET status = 'cancelled', 
         "cancelledAt" = NOW(), 
         "paidAmount" = 0,
         "changeAmount" = 0,
         "updatedAt" = NOW()
     WHERE id = :id`,
    { replacements: { id: tx.id }, transaction: t }
  );
  console.log('  Transaction status -> cancelled');

    // Void all payments (set to 'failed' — valid enum: pending/completed/failed/refunded)
    const [updated] = await sequelize.query(
    `UPDATE "TransactionPayments" 
     SET status = 'failed', "updatedAt" = NOW()
     WHERE "transactionId" = :id AND status = 'completed'
     RETURNING id, "paymentMethod", amount`,
    { replacements: { id: tx.id }, transaction: t }
  );
  updated.forEach(p => {
    console.log('  Payment ' + p.id.substring(0, 8) + '... (' + p.paymentMethod + ' ' + Number(p.amount).toLocaleString() + ') -> voided');
  });

  console.log('  DONE: ' + txNumber + ' cancelled');
}

async function changePaymentToQris(txNumber, t) {
  console.log('\n--- Changing ' + txNumber + ' payment to QRIS ---');

  const [rows] = await sequelize.query(
    'SELECT id, status, "totalAmount", "paidAmount", "changeAmount" FROM "Transactions" WHERE "transactionNumber" = :txNum',
    { replacements: { txNum: txNumber }, transaction: t }
  );

  if (rows.length === 0) throw new Error(txNumber + ' not found');
  const tx = rows[0];

  console.log('  Current status: ' + tx.status + ', Total: ' + Number(tx.totalAmount).toLocaleString());
  console.log('  Current paid: ' + Number(tx.paidAmount).toLocaleString() + ', change: ' + Number(tx.changeAmount).toLocaleString());

  const totalAmount = Number(tx.totalAmount);

  // Update transaction: paidAmount = totalAmount, changeAmount = 0 (QRIS exact)
  await sequelize.query(
    `UPDATE "Transactions" 
     SET "paidAmount" = :total, 
         "changeAmount" = 0,
         "updatedAt" = NOW()
     WHERE id = :id`,
    { replacements: { id: tx.id, total: totalAmount }, transaction: t }
  );
  console.log('  Transaction paidAmount -> ' + totalAmount.toLocaleString() + ', changeAmount -> 0');

  // Update existing cash payment to QRIS with correct amount
  const [updated] = await sequelize.query(
    `UPDATE "TransactionPayments" 
     SET "paymentMethod" = 'qris', 
         amount = :total,
         "updatedAt" = NOW()
     WHERE "transactionId" = :id AND status = 'completed'
     RETURNING id, "paymentMethod", amount`,
    { replacements: { id: tx.id, total: totalAmount }, transaction: t }
  );
  updated.forEach(p => {
    console.log('  Payment ' + p.id.substring(0, 8) + '... -> qris ' + Number(p.amount).toLocaleString());
  });

  console.log('  DONE: ' + txNumber + ' payment changed to QRIS');
}

(async () => {
  const t = await sequelize.transaction();

  try {
    console.log('========================================');
    console.log('Fix 3 Orders - Feb 21 Shift Siang');
    console.log('Mode: ' + (DRY_RUN ? 'DRY RUN (no changes saved)' : 'EXECUTE'));
    console.log('========================================');

    // 1. Cancel ORD-202602-0020
    await cancelTransaction('ORD-202602-0020', t);

    // 2. Change ORD-202602-0023 to QRIS
    await changePaymentToQris('ORD-202602-0023', t);

    // 3. Cancel ORD-202602-0028
    await cancelTransaction('ORD-202602-0028', t);

    if (DRY_RUN) {
      await t.rollback();
      console.log('\n*** DRY RUN — all changes rolled back ***');
    } else {
      await t.commit();
      console.log('\n*** All changes committed ***');
    }

    // Verify final state
    console.log('\n========================================');
    console.log('VERIFICATION');
    console.log('========================================');

    const txNumbers = ['ORD-202602-0020', 'ORD-202602-0023', 'ORD-202602-0028'];
    for (const txNum of txNumbers) {
      const [rows] = await sequelize.query(
        `SELECT t.id, t."transactionNumber", t.status, t."totalAmount", t."paidAmount", t."changeAmount"
         FROM "Transactions" t WHERE t."transactionNumber" = :txNum`,
        { replacements: { txNum } }
      );
      const tx = rows[0];
      const [payments] = await sequelize.query(
        'SELECT "paymentMethod", amount, status FROM "TransactionPayments" WHERE "transactionId" = :id',
        { replacements: { id: tx.id } }
      );
      const payStr = payments.map(p => p.paymentMethod + ':' + Number(p.amount).toLocaleString() + '[' + p.status + ']').join(', ');
      console.log(txNum + ' | ' + tx.status + ' | Total:' + Number(tx.totalAmount).toLocaleString() + 
        ' | Paid:' + Number(tx.paidAmount || 0).toLocaleString() + ' | Change:' + Number(tx.changeAmount || 0).toLocaleString() +
        ' | Payments: ' + payStr);
    }

    await sequelize.close();
  } catch (e) {
    await t.rollback();
    console.error('\n*** ERROR — all changes rolled back ***');
    console.error(e);
    process.exit(1);
  }
})();
