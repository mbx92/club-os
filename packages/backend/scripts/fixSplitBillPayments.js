#!/usr/bin/env node
'use strict';

/**
 * Fix Split Bill Data — Void parent payment agar sesuai behavior post-fix
 *
 * KONTEKS:
 * Sebelum fix split bill, alur kasir:
 *   1. Customer bayar → payment dicatat di parent transaction
 *   2. Bill di-split → children dibuat DAN dibayar lagi per orang
 *   3. Akibatnya: parent payment + children payments = double count
 *
 * Setelah fix split bill (controller patched):
 *   1. Bill di-split → children dibuat dengan status 'pending' (belum bayar)
 *   2. Kasir terima bayar per child → payment hanya di children
 *   3. Parent hanya jadi marker 'split', tanpa payment aktif
 *
 * Script ini menyamakan data lama agar sesuai behavior baru:
 *   - Cari semua parent 'split' yang punya completed payment DAN punya children yang juga punya completed payment
 *   - Set parent payment status → 'failed'
 *   - Koreksi paidAmount & changeAmount di parent → 0
 *   - Recalculate closingBalance & difference di session terkait
 *
 * USAGE:
 *   node scripts/fixSplitBillPayments.js                              # preview
 *   node scripts/fixSplitBillPayments.js --fix                        # apply
 *   node scripts/fixSplitBillPayments.js --dates=2026-02-21           # tanggal spesifik
 *   node scripts/fixSplitBillPayments.js --dates=2026-02-21 --fix     # fix tanggal spesifik
 */

const path = require('path');

const envArg = process.argv.find(a => a.startsWith('--env='));
const ENV    = envArg ? envArg.split('=')[1] : (process.env.NODE_ENV || 'development');
process.env.NODE_ENV = ENV;

require('dotenv').config({ path: path.join(__dirname, '..', `.env.${ENV}`) });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Op }  = require('sequelize');
const {
  sequelize,
  Transaction,
  TransactionPayment,
  CashRegisterSession,
} = require('../src/models');

// ── CLI args ──────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const FIX     = args.includes('--fix');
const datesArg = args.find(a => a.startsWith('--dates='));
const DATES   = datesArg ? datesArg.split('=')[1].split(',') : ['2026-02-21'];

const SEP  = '═'.repeat(72);
const LINE = '─'.repeat(72);
const fmt  = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

async function main() {
  console.log(SEP);
  console.log('  Fix Split Bill Payments — Void Parent duplicate payments');
  console.log(`  Env   : ${ENV}`);
  console.log(`  Dates : ${DATES.join(', ')}`);
  console.log(`  Mode  : ${FIX ? '⚡ FIX (update DB)' : '🔍 DRY RUN (preview)'}`);
  console.log(SEP);

  let totalFixed = 0;
  const affectedSessionIds = new Set();

  for (const dateStr of DATES) {
    console.log(`\n${LINE}`);
    console.log(`  📅 ${dateStr}`);
    console.log(LINE);

    // Cari sesi shift pada tanggal
    const sessions = await CashRegisterSession.findAll({
      where: { shiftDate: dateStr },
      order: [['openedAt', 'ASC']],
    });

    if (sessions.length === 0) {
      console.log('  Tidak ada sesi pada tanggal ini.\n');
      continue;
    }

    for (const session of sessions) {
      const timeWhere = {
        [Op.gte]: session.openedAt,
        ...(session.closedAt ? { [Op.lte]: session.closedAt } : {}),
      };

      console.log(`\n  🔖 Sesi: ${session.shiftName} (${session.status})`);
      console.log(`     ID: ${session.id}`);

      // Cari parent 'split' yang punya completed payments
      const splitParents = await Transaction.findAll({
        where: {
          tenantId: session.tenantId,
          createdAt: timeWhere,
          status: 'split',
          deletedAt: null,
        },
        include: [{
          model: TransactionPayment,
          as: 'payments',
          where: { status: 'completed' },
          required: true,
          attributes: ['id', 'paymentMethod', 'amount', 'status', 'createdAt'],
        }],
        attributes: ['id', 'transactionNumber', 'transactionType', 'status',
                     'totalAmount', 'paidAmount', 'changeAmount', 'notes'],
        order: [['createdAt', 'ASC']],
      });

      if (splitParents.length === 0) {
        console.log('     ✅ Tidak ada parent split dengan payment aktif');
        continue;
      }

      for (const parent of splitParents) {
        // Cek apakah children juga punya completed payment
        // Cari via splitFromId (gaya baru) DAN via notes pattern (gaya lama)
        const childByFK = await Transaction.findAll({
          where: { splitFromId: parent.id },
          include: [{
            model: TransactionPayment,
            as: 'payments',
            where: { status: 'completed' },
            required: false,
            attributes: ['id', 'paymentMethod', 'amount', 'status'],
          }],
          attributes: ['id', 'transactionNumber', 'status', 'totalAmount', 'paidAmount'],
        });

        // Gaya lama: notes berisi "Split X/Y dari transaksi #ORD-..."
        const childByNotes = await Transaction.findAll({
          where: {
            tenantId: session.tenantId,
            notes: { [Op.like]: `%dari transaksi #${parent.transactionNumber}%` },
            id: { [Op.ne]: parent.id },
          },
          include: [{
            model: TransactionPayment,
            as: 'payments',
            where: { status: 'completed' },
            required: false,
            attributes: ['id', 'paymentMethod', 'amount', 'status'],
          }],
          attributes: ['id', 'transactionNumber', 'status', 'totalAmount', 'paidAmount', 'notes'],
        });

        // Merge dan deduplicate
        const childMap = {};
        [...childByFK, ...childByNotes].forEach(c => { childMap[c.id] = c; });
        const children = Object.values(childMap);

        const childrenWithPayments = children.filter(c => (c.payments || []).length > 0);
        const childrenTotal = childrenWithPayments.reduce((sum, c) =>
          (c.payments || []).reduce((ps, p) => ps + parseFloat(p.amount || 0), 0) + sum, 0
        );
        const parentPayments = parent.payments || [];
        const parentCashTotal = parentPayments
          .filter(p => p.paymentMethod === 'cash')
          .reduce((s, p) => s + parseFloat(p.amount || 0), 0);

        console.log(`\n     ⚠️  ${parent.transactionNumber} (status: ${parent.status})`);
        console.log(`        Total order   : ${fmt(parent.totalAmount)}`);
        console.log(`        Parent payments: ${parentPayments.length}x = ${fmt(parentPayments.reduce((s, p) => s + parseFloat(p.amount), 0))}`);
        parentPayments.forEach(p => {
          console.log(`          • ${p.paymentMethod.toUpperCase()} ${fmt(p.amount)} [${p.status}] id: ${p.id}`);
        });
        console.log(`        Children      : ${children.length} total, ${childrenWithPayments.length} sudah bayar`);
        children.forEach(c => {
          const cp = (c.payments || []);
          const cpTotal = cp.reduce((s, p) => s + parseFloat(p.amount), 0);
          console.log(`          • ${c.transactionNumber} (${c.status}) → ${cp.length > 0 ? fmt(cpTotal) : 'belum bayar'}`);
        });

        if (childrenWithPayments.length === 0) {
          console.log(`        → SKIP: Children belum ada yang bayar — parent payment masih diperlukan`);
          continue;
        }

        // Double payment detected
        const doubleAmount = parentPayments.reduce((s, p) => s + parseFloat(p.amount), 0);
        console.log(`\n        🔴 DOUBLE PAYMENT TERDETEKSI`);
        console.log(`           Parent paid   : ${fmt(doubleAmount)}`);
        console.log(`           Children paid  : ${fmt(childrenTotal)}`);
        console.log(`           Nominal dobel  : ${fmt(doubleAmount)} ← parent harus di-void`);

        if (FIX) {
          // 1. Set parent payments to 'failed'
          const paymentIds = parentPayments.map(p => p.id);
          await TransactionPayment.update(
            { status: 'failed' },
            { where: { id: { [Op.in]: paymentIds } } }
          );
          console.log(`           ✅ ${paymentIds.length} parent payment(s) → status 'failed'`);

          // 2. Reset paidAmount & changeAmount di parent
          await Transaction.update(
            { paidAmount: 0, changeAmount: 0 },
            { where: { id: parent.id } }
          );
          console.log(`           ✅ Parent paidAmount & changeAmount → 0`);

          totalFixed += paymentIds.length;
          affectedSessionIds.add(session.id);
        } else {
          console.log(`           → Tambahkan --fix untuk apply perubahan`);
          totalFixed += parentPayments.length;
          affectedSessionIds.add(session.id);
        }
      }
    }
  }

  // ── Recalculate sessions ──────────────────────────────────────────────────
  if (FIX && affectedSessionIds.size > 0) {
    console.log(`\n${LINE}`);
    console.log('  RECALCULATE SESSION BALANCES');
    console.log(LINE);

    for (const sid of affectedSessionIds) {
      const session = await CashRegisterSession.findByPk(sid);
      if (!session || session.status !== 'closed') {
        console.log(`  ⏭  Session ${sid} — skip (not closed)`);
        continue;
      }

      const summary = await session.getCashSummary();
      const oldDiff = parseFloat(session.difference || 0);
      const newDiff = parseFloat(session.actualCash || 0) - summary.expectedCash;

      await session.update({
        closingBalance: summary.expectedCash,
        difference: newDiff,
      });

      console.log(`\n  📊 ${session.shiftName} (${session.shiftDate})`);
      console.log(`     cashIn (new)     : ${fmt(summary.cashIn)}`);
      console.log(`     expectedCash     : ${fmt(summary.expectedCash)}`);
      console.log(`     actualCash       : ${fmt(session.actualCash)}`);
      console.log(`     difference (old) : ${fmt(oldDiff)}`);
      console.log(`     difference (new) : ${fmt(newDiff)}`);
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log(`\n${SEP}`);
  if (totalFixed > 0) {
    if (FIX) {
      console.log(`  ✅ ${totalFixed} parent payment(s) di-void (status → failed)`);
      console.log(`     ${affectedSessionIds.size} session(s) di-recalculate`);
      console.log('');
      console.log('  LANGKAH SELANJUTNYA:');
      console.log(`  Verifikasi: node scripts/diagnoseCashRegisterReport.js --dates=${DATES.join(',')}`);
    } else {
      console.log(`  ⚠️  ${totalFixed} parent payment(s) perlu di-void`);
      console.log(`     Jalankan: node scripts/fixSplitBillPayments.js --dates=${DATES.join(',')} --fix`);
    }
  } else {
    console.log('  ✅ Tidak ada parent split dengan double payment — data sudah bersih');
  }
  console.log(SEP + '\n');

  await sequelize.close();
}

main().catch(err => {
  console.error('Error:', err.message || err);
  sequelize.close().catch(() => {});
  process.exit(1);
});
