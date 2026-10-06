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
 *   node scripts/diagnoseCashRegisterReport.js --dates=2026-10-05    ← 1 tanggal
 *   node scripts/diagnoseCashRegisterReport.js --sessionId=<uuid>    ← 1 shift saja
 *
 *   --fix WAJIB disertai disposisi uang bila ada cash void setelah shift tutup:
 *   node scripts/diagnoseCashRegisterReport.js --sessionId=<uuid> --fix --cash-returned
 *   node scripts/diagnoseCashRegisterReport.js --sessionId=<uuid> --fix --cash-in-drawer
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

// Target one shift by its CashRegisterSession id (overrides --dates when set).
const sessionArg = process.argv.find(a => a.startsWith('--sessionId='));
const SESSION_ID = sessionArg ? sessionArg.split('=')[1] : null;

// Where did the physical cash from cancelled/refunded transactions go?
//   --cash-returned  → sudah dikembalikan ke pelanggan (actualCash ikut turun)
//   --cash-in-drawer → masih di laci (surplus dianggap nyata)
// Wajib diisi saat ada cash void agar script tidak menciptakan surplus palsu.
const CASH_DISPOSITION = process.argv.includes('--cash-returned')
  ? 'returned'
  : process.argv.includes('--cash-in-drawer')
    ? 'in_drawer'
    : null;

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

  // When targeting a specific session, ignore the date list and run once.
  const dateTargets = SESSION_ID ? [null] : DATES;
  for (const dateStr of dateTargets) {
    console.log(`\n${'─'.repeat(66)}`);
    console.log(`  📅  ${SESSION_ID ? `session ${SESSION_ID}` : dateStr}`);
    console.log(`${'─'.repeat(66)}`);

    const sessionWhere = SESSION_ID
      ? { id: SESSION_ID }
      : { shiftDate: dateStr };
    const sessions = await CashRegisterSession.findAll({
      where: sessionWhere,
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

      // ── Cause 0: cash voided AFTER the drawer snapshot was frozen ─────────
      // A cancelled/refunded transaction's cash is already excluded from
      // getCashSummary (the correct "expected" figure), but the stored
      // actualCash/closingBalance were captured before the void. Changing only
      // closingBalance would fabricate a surplus — both sides must move together.
      const voidedCashTrxs = await Transaction.findAll({
        where: {
          tenantId: session.tenantId,
          createdAt: timeWhere,
          status: { [Op.in]: ['cancelled', 'refunded', 'partially_refunded'] },
          deletedAt: null,
        },
        include: [{
          model: TransactionPayment,
          as: 'payments',
          where: { status: 'completed' },
          required: true,
          attributes: ['id', 'paymentMethod', 'amount'],
        }],
        attributes: ['id', 'transactionNumber', 'status', 'transactionType', 'changeAmount', 'cancelledAt', 'updatedAt'],
      });
      const voidedCashTotal = voidedCashTrxs.reduce((s, t) =>
        s + (t.payments || [])
          .filter(p => (p.paymentMethod || '').toLowerCase() === 'cash')
          .reduce((ps, p) => ps + Math.max(0, parseFloat(p.amount || 0) - parseFloat(t.changeAmount || 0)), 0),
      0);

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
      // Close-shift formula is: closingBalance = expectedCash + tipping
      // (tipping physically sits in the drawer).
      const tipping      = parseFloat(session.tipping || 0);
      const correctedExpected = parseFloat((cashSummary.expectedCash + tipping).toFixed(2));

      const storedClosing = parseFloat(session.closingBalance || 0);
      const storedActual  = parseFloat(session.actualCash || 0);
      // `gap` = how much the frozen snapshot over-counts vs the correct figure.
      // Non-zero only when a cash transaction was voided AFTER the shift closed.
      const gap = parseFloat((storedClosing - correctedExpected).toFixed(2));

      console.log(`\n  💰 getCashSummary (kalkulasi ulang sekarang):`);
      console.log(`     cashIn        : ${fmt(cashSummary.cashIn)}`);
      console.log(`     cashExpenseOut: ${fmt(cashSummary.cashExpenseOut)}`);
      console.log(`     expectedCash  : ${fmt(cashSummary.expectedCash)}`);
      if (tipping) console.log(`     tipping       : ${fmt(tipping)}`);
      console.log(`     closingBalance tersimpan : ${fmt(storedClosing)}`);
      console.log(`     closingBalance benar     : ${fmt(correctedExpected)}`);
      console.log(`     gap (snapshot beku)      : ${fmt(gap)}`);
      console.log(`     actualCash tersimpan     : ${fmt(storedActual)}`);

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

      if (voidedCashTrxs.length > 0) {
        console.log(`\n  ⚠  Penyebab 3 — Cash VOID setelah shift tutup (snapshot jadi beku):`);
        console.log(`     Total cash void: ${fmt(voidedCashTotal)}`);
        voidedCashTrxs.forEach(t => {
          const cashPays = (t.payments || [])
            .filter(p => (p.paymentMethod || '').toLowerCase() === 'cash');
          const voidedAt = t.cancelledAt ? new Date(t.cancelledAt).toISOString() : '(refunded)';
          console.log(`     - ${t.transactionNumber} | ${t.status} | void at: ${voidedAt}`);
          if (cashPays.length) console.log(`       cash : ${cashPays.map(p => fmt(p.amount)).join(', ')}`);
        });
      }

      // ── FIX: koreksi DUA SISI ────────────────────────────────────────────
      // Mengubah closingBalance saja akan menciptakan surplus palsu:
      //   difference = actualCash - closingBalance
      // Jika cash void sudah keluar dari laci, actualCash HARUS ikut turun.
      if (FIX && session.status === 'closed') {
        const oldDiff = parseFloat(session.difference || 0);

        if (Math.abs(gap) < 0.01) {
          console.log('\n  ✅ closingBalance sudah benar, tidak perlu diupdate.');
        } else if (!CASH_DISPOSITION) {
          // Refuse to guess — an ambiguous correction is exactly how the
          // phantom +11.000 surplus was created before.
          console.log('\n  🛑 DIBATALKAN — ada gap tapi disposisi uang belum ditentukan.');
          console.log(`     gap: ${fmt(gap)} (${voidedCashTrxs.length} transaksi cash void)`);
          console.log('\n     Pilih salah satu:');
          console.log('       --cash-returned   → uang sudah dikembalikan ke pelanggan');
          console.log('                           (closingBalance DAN actualCash ikut turun)');
          console.log('       --cash-in-drawer  → uang masih di laci');
          console.log('                           (closingBalance turun, actualCash TETAP → surplus nyata)');
          console.log('\n     Tanpa flag ini script tidak mengubah apa pun supaya tidak');
          console.log('     menciptakan selisih palsu.');
        } else {
          // Both sides move together when the cash physically left the drawer.
          const newActual = CASH_DISPOSITION === 'returned'
            ? parseFloat((storedActual - gap).toFixed(2))
            : storedActual;
          const newDiff = parseFloat((newActual - correctedExpected).toFixed(2));

          console.log(`\n  ⚡ Disposisi: ${CASH_DISPOSITION === 'returned' ? 'uang dikembalikan' : 'uang masih di laci'}`);
          console.log(`     closingBalance: ${fmt(storedClosing)} → ${fmt(correctedExpected)}`);
          if (CASH_DISPOSITION === 'returned') {
            console.log(`     actualCash    : ${fmt(storedActual)} → ${fmt(newActual)}`);
          } else {
            console.log(`     actualCash    : ${fmt(storedActual)} (tetap)`);
          }
          console.log(`     difference    : ${fmt(oldDiff)} → ${fmt(newDiff)}`);

          await session.update({
            closingBalance: correctedExpected,
            actualCash: newActual,
            difference: newDiff,
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
    const target = SESSION_ID ? `--sessionId=${SESSION_ID}` : `--dates=${DATES.join(',')}`;
    console.log('  Jalankan dengan --fix untuk update DB.');
    console.log('  WAJIB tambahkan disposisi uang bila ada cash void:');
    console.log(`    node scripts/diagnoseCashRegisterReport.js --env=${ENV} ${target} --fix --cash-returned`);
    console.log(`    node scripts/diagnoseCashRegisterReport.js --env=${ENV} ${target} --fix --cash-in-drawer`);
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
