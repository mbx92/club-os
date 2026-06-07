#!/usr/bin/env node
const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '.env.development' });
const config = require('../src/config/config.js');
const dbConfig = config.development;
const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host, port: dbConfig.port, dialect: dbConfig.dialect, logging: false
});

(async () => {
  try {
    // 1. Cash register sessions on Feb 28
    const [sessions] = await sequelize.query(`
      SELECT crs.id, crs."shiftName", crs.status, crs."openingBalance", crs."closingBalance",
             crs."actualCash", crs.difference, crs."openedAt", crs."closedAt",
             crs."shiftDate", crs."shiftNumber", crs.tipping, crs."tenantId",
             CONCAT(u."firstName", ' ', u."lastName") as "openedByName"
      FROM "CashRegisterSessions" crs
      LEFT JOIN "Users" u ON crs."openedById" = u.id
      WHERE crs."shiftDate" = '2026-02-28'
      ORDER BY crs."openedAt"
    `);
    console.log('=== CASH REGISTER SESSIONS FEB 28 ===');
    sessions.forEach(s => {
      console.log('Session ' + s.id + ' [' + s.shiftName + '] - Status: ' + s.status);
      console.log('  Shift: ' + s.shiftDate + ' #' + s.shiftNumber);
      console.log('  Opened: ' + s.openedAt + ' by ' + s.openedByName);
      console.log('  Closed: ' + s.closedAt);
      console.log('  Opening: ' + Number(s.openingBalance).toLocaleString() + ', Closing: ' + Number(s.closingBalance).toLocaleString());
      console.log('  Actual Cash: ' + Number(s.actualCash).toLocaleString() + ', Difference: ' + Number(s.difference).toLocaleString());
      console.log('  Tipping: ' + Number(s.tipping || 0).toLocaleString());
      console.log('');
    });

    // 2. Petty cash transactions on Feb 28
    const [pettyCash] = await sequelize.query(`
      SELECT pct.id, pct.type, pct.amount, pct.description, pct."createdAt",
             pct."transactionDate", pct."pettyCashId", pct."balanceBefore", pct."balanceAfter"
      FROM "PettyCashTransactions" pct
      WHERE pct."transactionDate"::date = '2026-02-28'
      ORDER BY pct."createdAt"
    `);
    console.log('=== PETTY CASH TRANSACTIONS FEB 28 ===');
    if (pettyCash.length === 0) console.log('  (none)');
    pettyCash.forEach(p => {
      console.log('  ID:' + p.id + ' Type:' + p.type + ' Amount:' + Number(p.amount).toLocaleString() + ' Desc:' + p.description);
      console.log('    Balance: ' + Number(p.balanceBefore).toLocaleString() + ' -> ' + Number(p.balanceAfter).toLocaleString());
    });
    console.log('');

    // 3. All transactions on Feb 28 with payment details
    const [transactions] = await sequelize.query(`
      SELECT t.id, t."transactionNumber", t."totalAmount", t.status,
             t."transactionType", t."createdAt", t."transactionDate",
             t."paidAmount", t."changeAmount", t."serviceCharge", t."roundingAmount",
             t."splitFromId", t."orderType",
             COALESCE(
               json_agg(
                 json_build_object('method', tp."paymentMethod", 'amount', tp.amount, 'status', tp.status)
               ) FILTER (WHERE tp.id IS NOT NULL), '[]'
             ) as payments
      FROM "Transactions" t
      LEFT JOIN "TransactionPayments" tp ON t.id = tp."transactionId"
      WHERE t."transactionDate"::date = '2026-02-28'
      GROUP BY t.id
      ORDER BY t."createdAt"
    `);
    console.log('=== ALL TRANSACTIONS FEB 28 ===');
    console.log('Total: ' + transactions.length + ' transactions\n');

    // Now replicate getCashSummary() for each session
    console.log('=== DETAILED SESSION ANALYSIS ===\n');

    for (const session of sessions) {
      console.log('========================================');
      console.log('Session: ' + session.shiftName + ' (' + session.id.substring(0,8) + '...)');
      console.log('========================================');

      const openedAt = new Date(session.openedAt).toISOString();
      const closedAt = session.closedAt ? new Date(session.closedAt).toISOString() : new Date().toISOString();

      // Get transactions for this session by time range
      const [sessionTxns] = await sequelize.query(`
        SELECT t.id, t."transactionNumber", t."totalAmount", t.status,
               t."transactionType", t."paidAmount", t."changeAmount",
               t."serviceCharge", t."roundingAmount", t."splitFromId",
               t."createdAt",
               COALESCE(
                 json_agg(
                   json_build_object('method', tp."paymentMethod", 'amount', tp.amount, 'status', tp.status)
                 ) FILTER (WHERE tp.id IS NOT NULL), '[]'
               ) as payments
        FROM "Transactions" t
        LEFT JOIN "TransactionPayments" tp ON t.id = tp."transactionId"
        WHERE t."createdAt" >= '${openedAt}'
          AND t."createdAt" <= '${closedAt}'
        GROUP BY t.id
        ORDER BY t."createdAt"
      `);

      let cashIn = 0, qrisIn = 0, debitIn = 0, transferIn = 0, otherIn = 0;
      let refundCashOut = 0;

      sessionTxns.forEach(t => {
        const payments = typeof t.payments === 'string' ? JSON.parse(t.payments) : t.payments;
        const payStr = payments.map(p => p.method + ':' + Number(p.amount).toLocaleString() + '[' + p.status + ']').join(', ');
        const splitTag = t.splitFromId ? ' [SPLIT]' : '';
        const change = Number(t.changeAmount || 0);
        console.log('  ' + t.transactionNumber + ' | ' + t.transactionType + ' | Total:' + Number(t.totalAmount).toLocaleString() + ' | ' + t.status + splitTag);
        console.log('    Paid:' + Number(t.paidAmount || 0).toLocaleString() + ' Change:' + change.toLocaleString());
        console.log('    Payments: ' + payStr);

        const isRefund = ['cancelled', 'refunded', 'partially_refunded'].includes(t.status);

        payments.forEach(p => {
          if (p.status === 'completed' || p.status === 'success') {
            const amt = Number(p.amount);
            if (isRefund) {
              if (p.method === 'cash') refundCashOut += Math.max(0, amt - change);
            } else {
              switch(p.method) {
                case 'cash': cashIn += Math.max(0, amt - change); break;
                case 'qris': qrisIn += amt; break;
                case 'debit_card': debitIn += amt; break;
                case 'bank_transfer': transferIn += amt; break;
                default: otherIn += amt; console.log('    ** Unknown method: ' + p.method);
              }
            }
          }
        });
      });

      // Get expenses (Expense model) for this session time range
      const [sessionExpenses] = await sequelize.query(
        "SELECT e.id, e.\"totalAmount\", e.\"paymentMethod\", e.status, e.description " +
        "FROM \"Expenses\" e " +
        "WHERE e.\"tenantId\" = '" + session.tenantId + "' " +
        "AND e.\"paymentMethod\" = 'cash' " +
        "AND e.status IN ('approved', 'paid') " +
        "AND e.\"createdAt\" >= '" + openedAt + "' " +
        "AND e.\"createdAt\" <= '" + closedAt + "'"
      );

      let cashExpenseOut = 0;
      sessionExpenses.forEach(e => {
        console.log('  [Expense] ' + Number(e.totalAmount).toLocaleString() + ' - ' + e.description + ' (' + e.status + ')');
        cashExpenseOut += Number(e.totalAmount);
      });

      // Get petty cash for this session time range
      const [sessionPetty] = await sequelize.query(`
        SELECT pct.id, pct.type, pct.amount, pct.description
        FROM "PettyCashTransactions" pct
        WHERE pct."transactionDate" >= '${openedAt}'
          AND pct."transactionDate" <= '${closedAt}'
        ORDER BY pct."createdAt"
      `);

      let pExpense = 0, pReturn = 0, pTopUp = 0;
      sessionPetty.forEach(p => {
        console.log('  [PettyCash] ' + p.type + ': ' + Number(p.amount).toLocaleString() + ' - ' + p.description);
        if (p.type === 'expense') pExpense += Number(p.amount);
        if (p.type === 'sales_return') pReturn += Number(p.amount);
        if (p.type === 'top_up') pTopUp += Number(p.amount);
      });

      const opening = Number(session.openingBalance);
      const tipping = Number(session.tipping || 0);
      const totalCashOut = refundCashOut + cashExpenseOut + pExpense + pReturn;
      const expectedCash = opening + cashIn - totalCashOut;
      const actual = Number(session.actualCash);
      const closing = Number(session.closingBalance);
      const dbDiff = Number(session.difference);

      console.log('\n  === CASH FLOW SUMMARY ===');
      console.log('  Transactions in session: ' + sessionTxns.length);
      console.log('  Cash In (net):    ' + cashIn.toLocaleString());
      console.log('  QRIS In:          ' + qrisIn.toLocaleString());
      console.log('  Debit In:         ' + debitIn.toLocaleString());
      console.log('  Transfer In:      ' + transferIn.toLocaleString());
      if (otherIn) console.log('  Other In:         ' + otherIn.toLocaleString());
      console.log('  Refund Out (cash):' + refundCashOut.toLocaleString());
      console.log('  Cash Expenses:    ' + cashExpenseOut.toLocaleString());
      console.log('  Petty Expense:    ' + pExpense.toLocaleString());
      console.log('  Petty Return:     ' + pReturn.toLocaleString());
      console.log('  Petty Top Up:     ' + pTopUp.toLocaleString());
      console.log('  Tipping:          ' + tipping.toLocaleString());
      console.log('  ---');
      console.log('  Opening:          ' + opening.toLocaleString());
      console.log('  + Cash In:        ' + cashIn.toLocaleString());
      console.log('  - Cash Out:       ' + totalCashOut.toLocaleString());
      console.log('  = Expected Cash:  ' + expectedCash.toLocaleString());
      console.log('  Actual Cash:      ' + actual.toLocaleString());
      console.log('  Closing (DB):     ' + closing.toLocaleString());
      console.log('  Difference (DB):  ' + dbDiff.toLocaleString());
      console.log('  Calc Diff:        ' + (actual - expectedCash).toLocaleString());

      if (closing !== expectedCash) {
        console.log('  *** MISMATCH: DB closing (' + closing.toLocaleString() + ') != my expected (' + expectedCash.toLocaleString() + ') ***');
        console.log('  *** Gap: ' + (closing - expectedCash).toLocaleString() + ' ***');
      }
      console.log('');
    }

    // Daily summary
    console.log('\n=== DAILY SUMMARY ===');
    let dayTotalSales = 0, dayTotalCash = 0, dayTotalNonCash = 0;
    transactions.forEach(t => {
      if (t.status !== 'refunded' && t.status !== 'cancelled') {
        dayTotalSales += Number(t.totalAmount);
      }
      const payments = typeof t.payments === 'string' ? JSON.parse(t.payments) : t.payments;
      payments.forEach(p => {
        if ((p.status === 'completed' || p.status === 'success') && t.status !== 'refunded' && t.status !== 'cancelled') {
          if (p.method === 'cash') dayTotalCash += Number(p.amount);
          else dayTotalNonCash += Number(p.amount);
        }
      });
    });
    console.log('Total Sales: ' + dayTotalSales.toLocaleString());
    console.log('Total Cash: ' + dayTotalCash.toLocaleString());
    console.log('Total Non-Cash: ' + dayTotalNonCash.toLocaleString());

    // Inter-shift gap analysis
    console.log('\n=== INTER-SHIFT GAP ANALYSIS ===');
    for (let i = 1; i < sessions.length; i++) {
      const prev = sessions[i-1];
      const curr = sessions[i];
      const prevClose = Number(prev.actualCash || prev.closingBalance);
      const currOpen = Number(curr.openingBalance);
      const gap = currOpen - prevClose;
      console.log(prev.shiftName + ' actual/close: ' + prevClose.toLocaleString() + ' -> ' + curr.shiftName + ' open: ' + currOpen.toLocaleString() + ' = Gap: ' + gap.toLocaleString());
      if (gap !== 0) {
        console.log('  *** ' + Math.abs(gap).toLocaleString() + ' was ' + (gap < 0 ? 'removed from' : 'added to') + ' cash between shifts ***');
      }
    }

    await sequelize.close();
  } catch(e) { console.error(e); process.exit(1); }
})();
