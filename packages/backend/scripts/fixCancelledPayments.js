#!/usr/bin/env node
'use strict';

/**
 * Fix Cancelled Order Payments & Recalculate Shift Balances
 *
 * Problem: Some cancelled orders still have TransactionPayment with status 'completed'.
 *          This inflates getCashSummary → wrong closingBalance & difference.
 *
 * What it does:
 *   1. Find cancelled transactions with completed payments inside given shift sessions
 *   2. Change those payment statuses from 'completed' → 'cancelled'
 *   3. Recalculate closingBalance & difference for each session via getCashSummary()
 *
 * Usage:
 *   node scripts/fixCancelledPayments.js                          # dry-run (preview)
 *   node scripts/fixCancelledPayments.js --fix                    # apply fix
 *   node scripts/fixCancelledPayments.js --sessions=id1,id2       # specific sessions
 *
 * Environment: uses NODE_ENV or defaults to 'development'
 */

const env = process.env.NODE_ENV || 'development';
process.env.NODE_ENV = env;

require('dotenv').config({ path: `.env.${env}` });
require('dotenv').config({ path: '.env' });

const { Op } = require('sequelize');
const {
  sequelize,
  CashRegisterSession,
  Transaction,
  TransactionPayment,
  User,
} = require('../src/models');

// ── Parse CLI args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const doFix = args.includes('--fix');

const sessionsArg = args.find(a => a.startsWith('--sessions='));
const sessionIds = sessionsArg
  ? sessionsArg.replace('--sessions=', '').split(',').map(s => s.trim())
  : [
      '1c944e71-f19a-4b59-a310-ca30695f62f2', // Siang 21 Feb
      'e3a29f73-936e-4699-bd39-6615441f50a5', // Morning 22 Feb
      'a2c9c7b3-fcce-4f8c-9221-de6e21ec7dc0', // Evening 22 Feb
    ];

const SEP = '═'.repeat(70);
const LINE = '─'.repeat(70);

function rp(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

async function run() {
  console.log(SEP);
  console.log('  Fix Cancelled Order Payments & Recalculate Shift Balances');
  console.log(`  Env  : ${env}`);
  console.log(`  Mode : ${doFix ? '⚡ FIX (update DB)' : '🔍 DRY RUN (preview only)'}`);
  console.log(`  Sessions: ${sessionIds.length}`);
  console.log(SEP);
  console.log('');

  for (const sid of sessionIds) {
    const session = await CashRegisterSession.findOne({
      where: { id: sid },
      include: [
        { model: User, as: 'openedBy', attributes: ['firstName', 'lastName'], required: false },
      ],
    });

    if (!session) {
      console.log(`  ❌ Session ${sid} NOT FOUND — skipping\n`);
      continue;
    }

    const timeWhere = {
      [Op.gte]: session.openedAt,
      ...(session.closedAt ? { [Op.lte]: session.closedAt } : {}),
    };

    console.log(LINE);
    console.log(`  📅 ${session.shiftDate} — ${session.shiftName} (${session.status})`);
    console.log(`     ID: ${sid}`);
    console.log(`     Opened: ${session.openedAt} | Closed: ${session.closedAt}`);
    console.log(`     Opening: ${rp(session.openingBalance)}`);
    console.log(`     ActualCash: ${rp(session.actualCash || 0)}`);
    console.log(`     ClosingBalance (DB): ${rp(session.closingBalance || 0)}`);
    console.log(`     Difference (DB): ${rp(session.difference || 0)}`);
    console.log('');

    // ── Step 1: Find cancelled transactions with completed payments ────────
    const cancelledWithPayments = await Transaction.findAll({
      where: {
        createdAt: timeWhere,
        status: 'cancelled',
        deletedAt: null,
      },
      include: [{
        model: TransactionPayment,
        as: 'payments',
        where: { status: 'completed' },
        required: true,
        attributes: ['id', 'paymentMethod', 'amount', 'status'],
      }],
      attributes: ['id', 'transactionNumber', 'status', 'transactionType', 'totalAmount', 'splitFromId'],
      order: [['createdAt', 'ASC']],
    });

    if (cancelledWithPayments.length === 0) {
      console.log('     ✅ Tidak ada cancelled order dengan completed payment');
      console.log('');
    } else {
      console.log(`     ⚠️  ${cancelledWithPayments.length} cancelled order masih punya completed payment:`);
      console.log('');

      let totalWrongCash = 0;
      let totalWrongNonCash = 0;
      const paymentIdsToCancel = [];

      for (const t of cancelledWithPayments) {
        const isChild = t.splitFromId ? ' [child]' : '';
        console.log(`     ${t.transactionNumber}${isChild} | ${t.transactionType} | cancelled | total: ${rp(t.totalAmount)}`);

        for (const p of t.payments) {
          const amt = parseFloat(p.amount);
          const isCash = p.paymentMethod.toLowerCase() === 'cash';
          if (isCash) totalWrongCash += amt;
          else totalWrongNonCash += amt;

          console.log(`       └─ Payment ${p.id.slice(0, 8)}... | ${p.paymentMethod}: ${rp(amt)} | status: ${p.status} → failed`);
          paymentIdsToCancel.push(p.id);
        }
      }

      console.log('');
      console.log(`     Total wrong cash payments  : ${rp(totalWrongCash)}`);
      if (totalWrongNonCash > 0) {
        console.log(`     Total wrong non-cash payments: ${rp(totalWrongNonCash)}`);
      }
      console.log(`     Payments to cancel: ${paymentIdsToCancel.length}`);
      console.log('');

      // ── Step 2: Cancel wrong payments ──────────────────────────────────
      if (doFix && paymentIdsToCancel.length > 0) {
        const [affectedRows] = await TransactionPayment.update(
          { status: 'failed' },
          { where: { id: { [Op.in]: paymentIdsToCancel } } }
        );
        console.log(`     ⚡ ${affectedRows} payment(s) updated to status 'failed'`);
      }
    }

    // ── Step 3: Recalculate session balance ──────────────────────────────
    if (session.status === 'closed') {
      // Re-fetch session to get fresh getCashSummary after payment updates
      const freshSession = await CashRegisterSession.findByPk(sid);
      const summary = await freshSession.getCashSummary();

      const actualCash = parseFloat(freshSession.actualCash || 0);
      const tipping = parseFloat(freshSession.tipping || 0);
      const newClosingBalance = parseFloat((summary.expectedCash + tipping).toFixed(2));
      const newDifference = parseFloat((actualCash - newClosingBalance).toFixed(2));

      const oldClosingBalance = parseFloat(freshSession.closingBalance || 0);
      const oldDifference = parseFloat(freshSession.difference || 0);

      const balanceChanged = Math.abs(oldClosingBalance - newClosingBalance) >= 0.01;
      const diffChanged = Math.abs(oldDifference - newDifference) >= 0.01;

      if (balanceChanged || diffChanged) {
        console.log('     📊 Recalculate shift balance:');
        console.log(`        getCashSummary: cashIn=${rp(summary.cashIn)} | expenses=${rp(summary.cashExpenseOut)} | expected=${rp(summary.expectedCash)}`);
        console.log(`        ClosingBalance: ${rp(oldClosingBalance)} → ${rp(newClosingBalance)}${balanceChanged ? ' ◄' : ''}`);
        console.log(`        Difference    : ${rp(oldDifference)} → ${rp(newDifference)}${diffChanged ? ' ◄' : ''}`);

        if (doFix) {
          await freshSession.update({
            closingBalance: newClosingBalance,
            difference: newDifference,
          });
          console.log('        ✅ Session updated');
        }
      } else {
        console.log('     ✅ Balance sudah benar, tidak perlu update');
      }
    }

    console.log('');
  }

  console.log(SEP);
  if (!doFix) {
    console.log('  Jalankan dengan --fix untuk apply perubahan:');
    console.log(`  node scripts/fixCancelledPayments.js --fix`);
  } else {
    console.log('  ✅ Selesai — semua fix telah diterapkan.');
  }
  console.log(SEP);
}

run()
  .catch(err => {
    console.error('Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  })
  .finally(() => {
    sequelize.close();
  });
