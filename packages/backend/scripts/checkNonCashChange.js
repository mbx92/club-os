#!/usr/bin/env node
'use strict';

/**
 * Check & Fix Non-Cash Payment Change
 *
 * Kembalian (changeAmount) hanya relevan untuk pembayaran cash / tunai.
 * Jika payment method QRIS, transfer, debit_card, credit_card, e_wallet
 * memiliki changeAmount > 0 pada transaksi-nya → anomali data.
 *
 * Usage:
 *   node scripts/checkNonCashChange.js                      ← cek semua data (preview)
 *   node scripts/checkNonCashChange.js --date=2026-02-21    ← cek tanggal spesifik
 *   node scripts/checkNonCashChange.js --since=2026-01-01   ← cek sejak tanggal
 *   node scripts/checkNonCashChange.js --date=2026-02-21 --fix  ← KOSONGKAN kembalian
 *   node scripts/checkNonCashChange.js --fix --dry-run      ← lihat apa yg akan difix
 */

const path = require('path');

const envArg = process.argv.find(a => a.startsWith('--env='));
const ENV    = envArg ? envArg.split('=')[1] : (process.env.NODE_ENV || 'development');

require('dotenv').config({ path: path.join(__dirname, '..', `.env.${ENV}`) });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Transaction, TransactionPayment, sequelize } = require('../src/models');
const { Op } = require('sequelize');

const args    = process.argv.slice(2);
const DATE    = (args.find(a => a.startsWith('--date='))  || '').split('=')[1] || null;
const SINCE   = (args.find(a => a.startsWith('--since=')) || '').split('=')[1] || null;
const FIX     = args.includes('--fix');
const DRY_RUN = args.includes('--dry-run');

// ── Helpers ───────────────────────────────────────────────────────────────────
const SEP  = '═'.repeat(80);
const LINE = '─'.repeat(80);
const fmt  = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const pad  = (s, w) => String(s).padEnd(w);
const rpad = (s, w) => String(s).padStart(w);

// ── Date range ────────────────────────────────────────────────────────────────
function buildDateWhere() {
  if (DATE) {
    return { [Op.between]: [new Date(`${DATE}T00:00:00.000Z`), new Date(`${DATE}T23:59:59.999Z`)] };
  }
  if (SINCE) {
    return { [Op.gte]: new Date(`${SINCE}T00:00:00.000Z`) };
  }
  return { [Op.gte]: new Date('2020-01-01') };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const modeLabel = FIX && !DRY_RUN ? '⚡ FIX (mengosongkan kembalian)' : '🔍 PREVIEW';
  console.log(SEP);
  console.log('  Cek & Fix — Non-Cash Payment dengan Kembalian');
  console.log(`  Mode    : ${modeLabel}`);
  if (DATE)  console.log(`  Tanggal : ${DATE}`);
  if (SINCE) console.log(`  Sejak   : ${SINCE}`);
  if (!DATE && !SINCE) console.log('  Periode : semua data');
  console.log(SEP);

  const createdAtFilter = buildDateWhere();

  const where = {
    createdAt: createdAtFilter,
    deletedAt: null,
    status: { [Op.in]: ['completed', 'paid', 'served', 'split', 'merged'] },
    changeAmount: { [Op.gt]: 0 },
  };

  const transactions = await Transaction.findAll({
    where,
    include: [{
      model: TransactionPayment,
      as: 'payments',
      required: true,
      attributes: ['id', 'paymentMethod', 'amount', 'status'],
      where: {
        status: 'completed',
        paymentMethod: { [Op.notIn]: ['cash'], [Op.ne]: null },
      },
    }],
    attributes: [
      'id', 'transactionNumber', 'transactionType',
      'status', 'totalAmount', 'paidAmount', 'changeAmount',
      'createdAt', 'customerName',
    ],
    order: [['createdAt', 'DESC']],
  });

  if (transactions.length === 0) {
    console.log('\n  ✅ Tidak ditemukan transaksi non-cash dengan kembalian.\n');
    await sequelize.close();
    return;
  }

  let totalChange  = 0;
  const countByType = {};
  const countByPm   = {};

  transactions.forEach(t => {
    const change = parseFloat(t.changeAmount || 0);
    totalChange += change;
    countByType[t.transactionType || 'unknown'] = (countByType[t.transactionType || 'unknown'] || 0) + 1;
    (t.payments || []).forEach(p => {
      countByPm[(p.paymentMethod || 'unknown').toLowerCase()] =
        (countByPm[(p.paymentMethod || 'unknown').toLowerCase()] || 0) + 1;
    });
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${LINE}`);
  console.log('  RINGKASAN');
  console.log(LINE);
  console.log(`  Transaksi anomali       : ${transactions.length}`);
  console.log(`  Total kembalian yg salah: ${fmt(totalChange)}`);
  console.log('');

  console.log('  Per Tipe:');
  Object.entries(countByType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([t, c]) => console.log(`    ${pad(t, 16)} ${c} trx`));

  console.log('\n  Per Metode Bayar:');
  Object.entries(countByPm)
    .sort((a, b) => b[1] - a[1])
    .forEach(([m, c]) => console.log(`    ${pad(m, 16)} ${c} payment`));

  // ── Detail ─────────────────────────────────────────────────────────────────
  console.log(`\n${SEP}`);
  console.log('  DETAIL TRANSAKSI');
  console.log(SEP);
  console.log(`  ${pad('#', 4)} ${pad('No. Order', 22)} ${pad('Metode (non-cash)', 24)} ${rpad('Total', 12)} ${rpad('Dibayar', 12)} ${rpad('Kembalian', 12)} ${pad('Status', 8)}`);
  console.log(`  ${'-'.repeat(78)}`);

  transactions.forEach((t, i) => {
    const pms = (t.payments || []).map(
      p => `${(p.paymentMethod || '?').toLowerCase()} ${fmt(p.amount)}`
    ).join(' | ');

    const change = parseFloat(t.changeAmount || 0);
    const marker = change > 50000 ? '⛔' : '⚠️';

    console.log(`  ${rpad(String(i + 1), 4)} ${pad(t.transactionNumber || '-', 22)} ${pad(pms.slice(0, 38), 24)} ${rpad(fmt(t.totalAmount), 12)} ${rpad(fmt(t.paidAmount), 12)} ${rpad(fmt(change) + ' ' + marker, 12)} ${pad(t.status || '-', 8)}`);

    const time = t.createdAt
      ? new Date(t.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Jakarta' })
      : '-';
    console.log(`       ${time}  Cust: ${t.customerName || '-'}  ID: ${t.id}`);
  });

  // ── Fix action ─────────────────────────────────────────────────────────────
  if (FIX && !DRY_RUN) {
    console.log(`\n${SEP}`);
    console.log('  ⚡ MENGOSONGKAN KEMBALIAN...');
    console.log(SEP);

    const ids = transactions.map(t => t.id);
    const [updated] = await Transaction.update(
      { changeAmount: 0, paidAmount: sequelize.col('totalAmount') },
      { where: { id: { [Op.in]: ids } } }
    );

    console.log(`\n  ✅ ${updated} transaksi berhasil diupdate:`);
    console.log('     - changeAmount diset ke 0');
    console.log('     - paidAmount diset = totalAmount (agar konsisten)');
    console.log(`\n  ⚠️  Shift yang terdampak perlu DI-RECALCULATE:`);
    console.log('     node scripts/recalculateCashRegisterSessions.js --fix');
    console.log(`     atau buka-tutup ulang sesi kasir terkait.\n`);
  } else if (FIX && DRY_RUN) {
    console.log(`\n${SEP}`);
    console.log('  🔍 DRY RUN — berikut yang AKAN difix jika --fix dijalankan:');
    console.log(SEP);
    const ids = transactions.map(t => t.id);
    console.log(`\n  UPDATE "Transactions"`);
    console.log(`  SET "changeAmount" = 0, "paidAmount" = "totalAmount"`);
    console.log(`  WHERE "id" IN (${ids.map(id => `'${id}'`).join(', ')})`);
    console.log(`  -- ${ids.length} rows\n`);
  } else {
    console.log(`\n${SEP}`);
    console.log('  CARA MENGOSONGKAN KEMBALIAN:');
    console.log(SEP);
    console.log('');
    console.log('  A. Via script ini (rekomendasi):');
    console.log('     node scripts/checkNonCashChange.js --date=<tgl> --fix');
    console.log('');
    console.log('  B. Lihat dulu apa yg akan diubah:');
    console.log('     node scripts/checkNonCashChange.js --date=<tgl> --fix --dry-run');
    console.log('');
    console.log('  C. Via SQL langsung (jika ingin lebih selektif):');
    console.log('     UPDATE "Transactions"');
    console.log('     SET "changeAmount" = 0, "paidAmount" = "totalAmount"');
    console.log('     WHERE "changeAmount" > 0');
    console.log('       AND "id" IN (');
    console.log('         SELECT DISTINCT t."id"');
    console.log('         FROM "Transactions" t');
    console.log('         JOIN "TransactionPayments" tp ON tp."transactionId" = t."id"');
    console.log('         WHERE tp."paymentMethod" != \'cash\'');
    console.log('           AND tp."status" = \'completed\'');
    console.log('       );');
    console.log('');
    console.log('  ⚠️  Setelah fix, WAJIB recalculate sesi kasir:');
    console.log('     node scripts/recalculateCashRegisterSessions.js --fix\n');
  }

  await sequelize.close();
}

main().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  sequelize.close().catch(() => {});
  process.exit(1);
});
