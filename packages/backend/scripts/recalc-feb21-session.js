#!/usr/bin/env node
/**
 * Recalculate and update closingBalance/difference for Feb 21 Shift Siang
 * after 3 orders were fixed (2 cancelled, 1 changed to QRIS)
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

(async () => {
  try {
    // Find Feb 21 Shift Siang (shift #2)
    const [sessions] = await sequelize.query(`
      SELECT id, "shiftName", "shiftNumber", "openingBalance", "closingBalance",
             "actualCash", difference, "openedAt", "closedAt", "tenantId"
      FROM "CashRegisterSessions"
      WHERE "shiftDate" = '2026-02-21'
      ORDER BY "openedAt"
      LIMIT 1
    `);

    if (sessions.length === 0) {
      console.log('Session not found');
      process.exit(1);
    }

    const session = sessions[0];
    console.log('=== BEFORE ===');
    console.log('Session: ' + session.shiftName + ' #' + session.shiftNumber);
    console.log('Opening:  ' + Number(session.openingBalance).toLocaleString());
    console.log('Closing:  ' + Number(session.closingBalance).toLocaleString());
    console.log('Actual:   ' + Number(session.actualCash).toLocaleString());
    console.log('Diff:     ' + Number(session.difference).toLocaleString());

    const openedAt = new Date(session.openedAt).toISOString();
    const closedAt = new Date(session.closedAt).toISOString();

    // Recalculate cashIn using same logic as getCashSummary()
    // Only completed payments on non-cancelled/refunded transactions
    const [cashPayments] = await sequelize.query(`
      SELECT tp.amount, t."changeAmount", t.status as tx_status,
             t."transactionNumber", tp."paymentMethod"
      FROM "TransactionPayments" tp
      JOIN "Transactions" t ON tp."transactionId" = t.id
      WHERE tp."paymentMethod" = 'cash'
        AND tp.status = 'completed'
        AND tp."createdAt" >= :openedAt
        AND tp."createdAt" <= :closedAt
        AND t."tenantId" = :tenantId
      ORDER BY tp."createdAt"
    `, { replacements: { openedAt, closedAt, tenantId: session.tenantId } });

    const EXCLUDED = ['cancelled', 'refunded', 'partially_refunded'];

    let cashIn = 0;
    let refundOut = 0;

    console.log('\n=== CASH PAYMENTS IN SESSION ===');
    cashPayments.forEach(p => {
      const tendered = parseFloat(p.amount || 0);
      const change = parseFloat(p.changeAmount || 0);
      const net = Math.max(0, tendered - change);
      const excluded = EXCLUDED.includes(p.tx_status);
      const isRefund = ['refunded', 'partially_refunded'].includes(p.tx_status);
      
      console.log('  ' + p.transactionNumber + ' | ' + p.tx_status + ' | tendered:' + tendered.toLocaleString() + ' change:' + change.toLocaleString() + ' net:' + net.toLocaleString() + (excluded ? ' [EXCLUDED]' : '') + (isRefund ? ' [REFUND]' : ''));
      
      if (!excluded) {
        cashIn += net;
      }
      if (isRefund) {
        refundOut += net;
      }
    });

    // Check expenses
    const [expenses] = await sequelize.query(`
      SELECT id, "totalAmount", description
      FROM "Expenses"
      WHERE "tenantId" = :tenantId
        AND "paymentMethod" = 'cash'
        AND status IN ('approved', 'paid')
        AND "createdAt" >= :openedAt
        AND "createdAt" <= :closedAt
    `, { replacements: { openedAt, closedAt, tenantId: session.tenantId } });

    let cashExpenseOut = 0;
    expenses.forEach(e => {
      cashExpenseOut += parseFloat(e.totalAmount);
      console.log('  [Expense] ' + Number(e.totalAmount).toLocaleString() + ' - ' + e.description);
    });

    // Check petty cash returns
    const [pcReturns] = await sequelize.query(`
      SELECT id, amount, description
      FROM "PettyCashTransactions"
      WHERE "tenantId" = :tenantId
        AND type = 'sales_return'
        AND "createdAt" >= :openedAt
        AND "createdAt" <= :closedAt
    `, { replacements: { openedAt, closedAt, tenantId: session.tenantId } });

    let pettyCashReturnOut = 0;
    pcReturns.forEach(p => {
      pettyCashReturnOut += parseFloat(p.amount);
      console.log('  [PettyCash Return] ' + Number(p.amount).toLocaleString() + ' - ' + p.description);
    });

    const opening = parseFloat(session.openingBalance);
    const cashOut = refundOut + cashExpenseOut + pettyCashReturnOut;
    const expectedCash = opening + cashIn - cashOut;
    const actualCash = parseFloat(session.actualCash);
    const newDifference = actualCash - expectedCash;

    console.log('\n=== RECALCULATION ===');
    console.log('Opening:         ' + opening.toLocaleString());
    console.log('Cash In (net):   ' + cashIn.toLocaleString());
    console.log('Refund Out:      ' + refundOut.toLocaleString());
    console.log('Expense Out:     ' + cashExpenseOut.toLocaleString());
    console.log('PettyCash Out:   ' + pettyCashReturnOut.toLocaleString());
    console.log('Total Cash Out:  ' + cashOut.toLocaleString());
    console.log('Expected Cash:   ' + expectedCash.toLocaleString());
    console.log('Actual Cash:     ' + actualCash.toLocaleString());
    console.log('New Difference:  ' + newDifference.toLocaleString());
    console.log('');
    console.log('Old Closing:     ' + Number(session.closingBalance).toLocaleString());
    console.log('Old Difference:  ' + Number(session.difference).toLocaleString());
    console.log('New Closing:     ' + expectedCash.toLocaleString());
    console.log('New Difference:  ' + newDifference.toLocaleString());

    if (DRY_RUN) {
      console.log('\n*** DRY RUN — no changes made ***');
    } else {
      // Update the session
      await sequelize.query(`
        UPDATE "CashRegisterSessions"
        SET "closingBalance" = :closing,
            difference = :diff,
            "updatedAt" = NOW()
        WHERE id = :id
      `, { replacements: { closing: expectedCash, diff: newDifference, id: session.id } });

      console.log('\n*** Session updated: closingBalance=' + expectedCash.toLocaleString() + ', difference=' + newDifference.toLocaleString() + ' ***');

      // Verify
      const [verify] = await sequelize.query(`
        SELECT "closingBalance", difference, "actualCash"
        FROM "CashRegisterSessions" WHERE id = :id
      `, { replacements: { id: session.id } });
      const v = verify[0];
      console.log('\nVERIFICATION:');
      console.log('  closingBalance: ' + Number(v.closingBalance).toLocaleString());
      console.log('  difference:     ' + Number(v.difference).toLocaleString());
      console.log('  actualCash:     ' + Number(v.actualCash).toLocaleString());
    }

    await sequelize.close();
  } catch (e) { console.error(e); process.exit(1); }
})();
