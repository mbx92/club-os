/**
 * Diagnose Cash Register Report — Q_totalCash Discrepancy
 *
 * Masalah: Transaksi dengan status 'split' atau 'merged' sudah bayar tunai
 * dan tercatat di getCashSummary (close shift), tapi TIDAK masuk ke report
 * karena buildCashierReport hanya menghitung status completed/paid/served.
 * Akibatnya Q_totalCash di report lebih kecil → selisih (difference) tampak minus.
 *
 * Script ini:
 *  1. Cek semua sesi pada tanggal yang diberikan
 *  2. Tunjukkan breakdown: old calc (tanpa split) vs new calc (dengan split/merged)
 *  3. Identifikasi transaksi split/merged yang menyebabkan selisih
 *  4. Dengan flag --fix: update kolom difference di DB sesuai kalkulasi baru
 *
 * Usage:
 *   node scripts/diagnoseCashRegisterReport.js                      ← dev, 21 & 22 Feb
 *   node scripts/diagnoseCashRegisterReport.js --env=production      ← production
 *   node scripts/diagnoseCashRegisterReport.js --dates=2026-02-21,2026-02-22
 *   node scripts/diagnoseCashRegisterReport.js --env=production --fix
 */

const path = require('path');

// ── Resolve environment ───────────────────────────────────────────────────────
// Priority: --env=xxx arg → NODE_ENV → 'development'
const envArg = process.argv.find(a => a.startsWith('--env='));
const ENV    = envArg ? envArg.split('=')[1] : (process.env.NODE_ENV || 'development');
const FIX    = process.argv.includes('--fix');

const datesArg = process.argv.find(a => a.startsWith('--dates='));
const DATES = datesArg
  ? datesArg.split('=')[1].split(',')
  : ['2026-02-21', '2026-02-22'];

require('dotenv').config({ path: path.join(__dirname, '..', `.env.${ENV}`) });

const { CashRegisterSession, Transaction, TransactionPayment, Expense, ExpenseCategory, sequelize } = require('../src/models');
const { Op } = require('sequelize');

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => `Rp ${parseFloat(n || 0).toLocaleString('id-ID')}`;

const INCLUDED_STATUSES_OLD = ['completed', 'paid', 'served'];
const INCLUDED_STATUSES_NEW = ['completed', 'paid', 'served', 'split', 'merged'];

function paymentBreakdown(trxs) {
  const breakdown = {};
  trxs.forEach(t => {
    (t.payments || []).forEach(p => {
      const m = p.paymentMethod;
      if (!breakdown[m]) breakdown[m] = { amount: 0, count: 0 };
      breakdown[m].amount += parseFloat(p.amount || 0);
      breakdown[m].count++;
    });
  });
  return breakdown;
}

function calcQ(cashierTrx, cashExpenses = 0) {
  const penjualan   = cashierTrx.reduce((s, t) => s + parseFloat(t.subtotal       || 0), 0);
  const discount    = cashierTrx.reduce((s, t) => s + parseFloat(t.voucherDiscount || 0), 0);
  const netSales    = penjualan - discount;
  const service     = cashierTrx.reduce((s, t) => s + parseFloat(t.serviceCharge  || 0), 0);
  const tax         = cashierTrx.reduce((s, t) => s + parseFloat(t.tax            || 0), 0);
  const rounding    = cashierTrx.reduce((s, t) => s + parseFloat(t.roundingAmount || 0), 0);
  const grandTotal  = netSales + service + tax + rounding;

  const bd          = paymentBreakdown(cashierTrx);
  const nonCash     = Object.entries(bd).filter(([m]) => m !== 'cash').reduce((s, [, v]) => s + v.amount, 0);
  const Q           = grandTotal - cashExpenses - nonCash;

  return { penjualan, discount, netSales, service, tax, rounding, grandTotal, nonCash, Q, bd };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('  Diagnose Cash Register Report — Q_totalCash Discrepancy');
  console.log(`  Env  : ${ENV}`);
  console.log(`  Dates: ${DATES.join(', ')}`);
  console.log(`  Mode : ${FIX ? '⚡ FIX (update difference di DB)' : '🔍 DIAGNOSE ONLY'}`);
  console.log('══════════════════════════════════════════════════════════════════\n');

  for (const dateStr of DATES) {
    console.log(`\n${'─'.repeat(66)}`);
    console.log(`  📅  ${dateStr}`);
    console.log(`${'─'.repeat(66)}`);

    const sessions = await CashRegisterSession.findAll({
      where: { shiftDate: dateStr },
      order: [['openedAt', 'ASC']],
    });

    if (sessions.length === 0) {
      console.log('  Tidak ada sesi pada tanggal ini.\n');
      continue;
    }

    for (const session of sessions) {
      console.log(`\n  🔖 Sesi: ${session.shiftName} (${session.status})`);
      console.log(`     ID       : ${session.id}`);
      console.log(`     Opened   : ${session.openedAt.toISOString()}`);
      console.log(`     Closed   : ${session.closedAt?.toISOString() || '-'}`);
      console.log(`     Opening  : ${fmt(session.openingBalance)}`);
      console.log(`     ActualCash (DB): ${fmt(session.actualCash)}`);
      console.log(`     Difference (DB): ${fmt(session.difference)}  ← nilai yang tersimpan saat close`);

      const timeWhere = {
        [Op.gte]: session.openedAt,
        ...(session.closedAt ? { [Op.lte]: session.closedAt } : {}),
      };

      // Load all transactions (new set — incl. split/merged)
      const allTrxs = await Transaction.findAll({
        where: {
          tenantId: session.tenantId,
          createdAt: timeWhere,
          status: { [Op.in]: INCLUDED_STATUSES_NEW },
          deletedAt: null,
        },
        include: [{
          model: TransactionPayment, as: 'payments',
          where: { status: 'completed' }, required: false,
          attributes: ['id', 'paymentMethod', 'amount'],
        }],
        attributes: ['id', 'transactionNumber', 'transactionType', 'status', 'subtotal',
          'voucherDiscount', 'serviceCharge', 'tax', 'roundingAmount', 'totalAmount'],
        order: [['createdAt', 'ASC']],
      });

      // Expenses
      const expenses = await Expense.findAll({
        where: {
          tenantId: session.tenantId,
          status: { [Op.in]: ['approved', 'paid'] },
          createdAt: timeWhere,
        },
      });
      const cashExpenses = expenses.filter(e => e.paymentMethod === 'cash')
        .reduce((s, e) => s + parseFloat(e.totalAmount || 0), 0);

      const cashierOld = allTrxs.filter(t =>
        ['restaurant', 'pos'].includes(t.transactionType) &&
        INCLUDED_STATUSES_OLD.includes(t.status)
      );
      const cashierNew = allTrxs.filter(t =>
        ['restaurant', 'pos'].includes(t.transactionType)
      );

      const oldCalc = calcQ(cashierOld, cashExpenses);
      const newCalc = calcQ(cashierNew, cashExpenses);

      // Cause 1: split/merged transactions
      const splitMergedTrxs = cashierNew.filter(t =>
        ['split', 'merged'].includes(t.status)
      );

      // Cause 2: gym transactions with cash payments
      const gymCashTrxs = allTrxs.filter(t =>
        t.transactionType === 'gym' &&
        (t.payments || []).some(p => p.paymentMethod === 'cash')
      );
      const gymCashTotal = gymCashTrxs.reduce((s, t) =>
        s + (t.payments || []).filter(p => p.paymentMethod === 'cash')
              .reduce((ps, p) => ps + parseFloat(p.amount || 0), 0), 0);

      console.log('\n  ┌────────────────────────────────────────────────────────────┐');
      console.log(`  │  Perbandingan Kalkulasi Q_totalCash                        │`);
      console.log(`  ├──────────────────────────────┬───────────────┬─────────────┤`);
      console.log(`  │ Metrik                        │  OLD (buggy)  │  NEW (fixed)│`);
      console.log(`  ├──────────────────────────────┼───────────────┼─────────────┤`);

      const row = (label, oldVal, newVal) => {
        const different = oldVal !== newVal;
        const marker = different ? ' ◄' : '  ';
        console.log(`  │ ${label.padEnd(30)}│ ${String(fmt(oldVal)).padStart(13)} │${String(fmt(newVal)).padStart(12)} ${marker}│`);
      };

      row('Penjualan (A)',       oldCalc.penjualan,  newCalc.penjualan);
      row('Discount (C)',        oldCalc.discount,   newCalc.discount);
      row('Net Sales (E)',       oldCalc.netSales,   newCalc.netSales);
      row('Service Charge (F)',  oldCalc.service,    newCalc.service);
      row('Tax (G)',             oldCalc.tax,        newCalc.tax);
      row('Rounding (H)',        oldCalc.rounding,   newCalc.rounding);
      row('Grand Total (J)',     oldCalc.grandTotal, newCalc.grandTotal);
      row('Non-Cash Total',      oldCalc.nonCash,    newCalc.nonCash);
      row('Cash Expenses (K)',   cashExpenses,       cashExpenses);
      row('Q_totalCash',         oldCalc.Q,          newCalc.Q);
      console.log(`  └──────────────────────────────┴───────────────┴─────────────┘`);

      // getCashSummary (expectedCash stored at close)
      const cashSummary  = await session.getCashSummary();
      const correctedDiff = parseFloat(session.actualCash || 0) - cashSummary.expectedCash;
      console.log(`\n  💰 getCashSummary (saat close shift):`);
      console.log(`     cashIn        : ${fmt(cashSummary.cashIn)}`);
      console.log(`     cashExpenseOut: ${fmt(cashSummary.cashExpenseOut)}`);
      console.log(`     expectedCash  : ${fmt(cashSummary.expectedCash)}`);
      console.log(`     actualCash    : ${fmt(session.actualCash)}`);
      console.log(`     difference baru (actualCash - expectedCash): ${fmt(correctedDiff)}`);

      if (splitMergedTrxs.length > 0) {
        console.log(`\n  ⚠  Penyebab 1 — Transaksi split/merged (tidak masuk di OLD calc):`);
        splitMergedTrxs.forEach(t => {
          const cashPays   = (t.payments || []).filter(p => p.paymentMethod === 'cash');
          const nonCashPays = (t.payments || []).filter(p => p.paymentMethod !== 'cash');
          console.log(`     - ${t.transactionNumber} | status: ${t.status} | total: ${fmt(t.totalAmount)}`);
          if (cashPays.length)    console.log(`       cash     : ${cashPays.map(p => fmt(p.amount)).join(', ')}`);
          if (nonCashPays.length) console.log(`       non-cash : ${nonCashPays.map(p => `${p.paymentMethod} ${fmt(p.amount)}`).join(', ')}`);
        });
      }

      if (gymCashTrxs.length > 0) {
        console.log(`\n  ⚠  Penyebab 2 — Transaksi gym bayar cash (masuk kas, tidak masuk Q_totalCash):`);
        console.log(`     Total gym cash: ${fmt(gymCashTotal)}`);
        gymCashTrxs.forEach(t => {
          const cashPays = (t.payments || []).filter(p => p.paymentMethod === 'cash');
          console.log(`     - ${t.transactionNumber} | status: ${t.status} | total: ${fmt(t.totalAmount)}`);
          if (cashPays.length) console.log(`       cash : ${cashPays.map(p => fmt(p.amount)).join(', ')}`);
        });
      }

      // ── FIX: update stored difference ────────────────────────────────────
      if (FIX && session.status === 'closed') {
        const oldDiff   = parseFloat(session.difference || 0);
        const newDiff   = parseFloat(correctedDiff.toFixed(2));
        const newExpected = parseFloat(cashSummary.expectedCash.toFixed(2));

        if (Math.abs(oldDiff - newDiff) < 0.01) {
          console.log('\n  ✅ difference sudah benar, tidak perlu diupdate.');
        } else {
          console.log(`\n  ⚡ Updating difference: ${fmt(oldDiff)} → ${fmt(newDiff)}`);
          console.log(`     closingBalance: ${fmt(session.closingBalance)} → ${fmt(newExpected)}`);
          await session.update({
            difference: newDiff,
            closingBalance: newExpected,
          });
          console.log('  ✅ Updated.');
        }
      } else if (FIX && session.status !== 'closed') {
        console.log('\n  ℹ  Sesi masih open/pending, skip update.');
      }
    }
  }

  console.log('\n══════════════════════════════════════════════════════════════════');
  if (!FIX) {
    console.log('  Jalankan dengan --fix untuk update difference di DB:');
    console.log(`  node scripts/diagnoseCashRegisterReport.js --env=${ENV} --dates=${DATES.join(',')} --fix`);
  } else {
    console.log('  Selesai.');
  }
  console.log('══════════════════════════════════════════════════════════════════\n');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  });
