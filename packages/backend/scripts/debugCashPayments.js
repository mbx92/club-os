#!/usr/bin/env node
'use strict';

/**
 * Cek: gym diskon + transaksi void/cancel.
 *
 * Usage:
 *   node scripts/debugCashPayments.js --start=2026-05-01 --end=2026-05-31
 */

const path = require('path');
const envArg = process.argv.find(a => a.startsWith('--env='));
const ENV = envArg ? envArg.split('=')[1] : (process.env.NODE_ENV || 'development');
require('dotenv').config({ path: path.join(__dirname, '..', `.env.${ENV}`) });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { sequelize } = require('../src/models');

const args  = process.argv.slice(2);
const START = (args.find(a => a.startsWith('--start=')) || '').split('=')[1];
const END   = (args.find(a => a.startsWith('--end='))   || '').split('=')[1];

if (!START || !END) {
  console.log('Usage: node scripts/debugCashPayments.js --start=YYYY-MM-DD --end=YYYY-MM-DD');
  process.exit(1);
}

const SEP  = '═'.repeat(100);
const LINE = '─'.repeat(100);
const fmt  = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

async function main() {
  console.log(SEP);
  console.log(`  DIAGNOSA GYM + VOID/CANCEL: ${START} s/d ${END}`);
  console.log(SEP);

  // ══════════════════════════════════════════════════════════════════
  // 1. STATUS BREAKDOWN: semua transaksi di range
  // ══════════════════════════════════════════════════════════════════
  const [statusRows] = await sequelize.query(`
    SELECT
      t."status",
      t."transactionType",
      COUNT(*)::int as cnt,
      SUM(COALESCE(t."totalAmount", 0))::numeric as total,
      SUM(COALESCE(t."subtotal", 0))::numeric as subtotal,
      SUM(COALESCE(t."voucherDiscount", 0))::numeric as discount,
      SUM(COALESCE(t."serviceCharge", 0))::numeric as service,
      SUM(COALESCE(t."tax", 0))::numeric as tax,
      SUM(COALESCE(t."changeAmount", 0))::numeric as change
    FROM "Transactions" t
    WHERE t."createdAt" BETWEEN :start AND :end
      AND t."deletedAt" IS NULL
    GROUP BY t."status", t."transactionType"
    ORDER BY t."status", total DESC
  `, { replacements: { start: `${START}T00:00:00.000Z`, end: `${END}T23:59:59.999Z` } });

  console.log(`\n${LINE}`);
  console.log('  1. SEMUA TRANSAKSI — PER STATUS & TIPE');
  console.log(LINE);
  console.log(`  ${'Status'.padEnd(16)} ${'Tipe'.padEnd(14)} ${'Count'.padStart(6)} ${'Total'.padStart(16)} ${'Subtotal'.padStart(16)} ${'Discount'.padStart(16)} ${'Service'.padStart(14)} ${'Tax'.padStart(12)}`);
  console.log(`  ${'-'.repeat(98)}`);

  const excludedStatuses = ['void', 'voided', 'cancelled', 'canceled', 'refunded', 'partially_refunded', 'draft', 'pending', 'failed'];
  let excludedCount = 0, excludedTotal = 0;
  const reportStatuses = ['completed', 'paid', 'served', 'split', 'merged'];

  let reportSubtotal = 0, reportDiscount = 0, reportTotal = 0;

  statusRows.forEach(r => {
    const total = parseFloat(r.total || 0);
    const status = r.status || '?';
    const type = r.transactionType || '?';
    const flag = excludedStatuses.includes(status) ? ' ◀ TIDAK MASUK REPORT' :
                 reportStatuses.includes(status) ? ' ✓' : ' ⚠ UNKNOWN';

    console.log(`  ${status.padEnd(16)} ${type.padEnd(14)} ${String(r.cnt).padStart(6)} ${fmt(total).padStart(16)} ${fmt(r.subtotal).padStart(16)} ${fmt(r.discount).padStart(16)} ${fmt(r.service).padStart(14)} ${fmt(r.tax).padStart(12)}${flag}`);

    if (excludedStatuses.includes(status)) {
      excludedCount += parseInt(r.cnt || 0);
      excludedTotal += total;
    }
    if (reportStatuses.includes(status)) {
      reportSubtotal += parseFloat(r.subtotal || 0);
      reportDiscount += parseFloat(r.discount || 0);
      reportTotal += total;
    }
  });

  if (excludedCount > 0) {
    console.log(`\n  ⚠️  ${excludedCount} transaksi dengan status void/cancel/refund TIDAK masuk report`);
    console.log(`      Total excluded: ${fmt(excludedTotal)}`);
  } else {
    console.log('\n  ✅ Tidak ada transaksi void/cancel/refund di periode ini');
  }

  // ══════════════════════════════════════════════════════════════════
  // 2. GYM: dengan diskon vs tanpa diskon
  // ══════════════════════════════════════════════════════════════════
  const [gymRows] = await sequelize.query(`
    SELECT
      CASE WHEN COALESCE(t."voucherDiscount", 0) > 0 THEN 'DENGAN DISKON' ELSE 'TANPA DISKON' END as kategori,
      COUNT(*)::int as cnt,
      SUM(COALESCE(t."totalAmount", 0))::numeric as total,
      SUM(COALESCE(t."subtotal", 0))::numeric as subtotal,
      SUM(COALESCE(t."voucherDiscount", 0))::numeric as discount,
      AVG(COALESCE(t."totalAmount", 0))::numeric as avg_total,
      AVG(COALESCE(t."voucherDiscount", 0))::numeric as avg_discount
    FROM "Transactions" t
    WHERE t."transactionType" = 'gym'
      AND t."createdAt" BETWEEN :start AND :end
      AND t."deletedAt" IS NULL
      AND t."status" IN ('completed','paid','served','split','merged')
    GROUP BY CASE WHEN COALESCE(t."voucherDiscount", 0) > 0 THEN 'DENGAN DISKON' ELSE 'TANPA DISKON' END
    ORDER BY kategori
  `, { replacements: { start: `${START}T00:00:00.000Z`, end: `${END}T23:59:59.999Z` } });

  console.log(`\n${LINE}`);
  console.log('  2. GYM — DISKON VS TANPA DISKON');
  console.log(LINE);
  console.log(`  ${'Kategori'.padEnd(18)} ${'Count'.padStart(6)} ${'Total'.padStart(16)} ${'Subtotal'.padStart(16)} ${'Discount'.padStart(16)} ${'Avg Total'.padStart(14)} ${'Avg Disc'.padStart(14)}`);
  console.log(`  ${'-'.repeat(88)}`);

  let gymDiscountTotal = 0, gymNoDiscountTotal = 0, gymNoDiscCount = 0;
  gymRows.forEach(r => {
    console.log(`  ${(r.kategori || '?').padEnd(18)} ${String(r.cnt).padStart(6)} ${fmt(r.total).padStart(16)} ${fmt(r.subtotal).padStart(16)} ${fmt(r.discount).padStart(16)} ${fmt(Math.round(r.avg_total)).padStart(14)} ${fmt(Math.round(r.avg_discount)).padStart(14)}`);
    if (r.kategori === 'DENGAN DISKON') gymDiscountTotal += parseFloat(r.total || 0);
    else { gymNoDiscountTotal += parseFloat(r.total || 0); gymNoDiscCount += parseInt(r.cnt || 0); }
  });
  console.log(`\n  Total gym revenue (dgn diskon)  : ${fmt(gymDiscountTotal)}`);
  console.log(`  Total gym revenue (tanpa diskon): ${fmt(gymNoDiscountTotal)} (${gymNoDiscCount} trx)`);

  // ══════════════════════════════════════════════════════════════════
  // 3. GYM: detail transaksi tanpa diskon (kalau curiga)
  // ══════════════════════════════════════════════════════════════════
  if (gymNoDiscCount > 0) {
    const [gymNoDisc] = await sequelize.query(`
      SELECT
        t."transactionNumber",
        t."status",
        t."totalAmount",
        t."subtotal",
        t."voucherDiscount",
        t."paidAmount",
        t."changeAmount",
        t."createdAt",
        t."customerName",
        (SELECT STRING_AGG(ti."itemName", ', ') FROM "TransactionItems" ti WHERE ti."transactionId" = t."id" AND ti."deletedAt" IS NULL) as items
      FROM "Transactions" t
      WHERE t."transactionType" = 'gym'
        AND t."createdAt" BETWEEN :start AND :end
        AND t."deletedAt" IS NULL
        AND t."status" IN ('completed','paid','served','split','merged')
        AND COALESCE(t."voucherDiscount", 0) = 0
      ORDER BY t."totalAmount" DESC
      LIMIT 30
    `, { replacements: { start: `${START}T00:00:00.000Z`, end: `${END}T23:59:59.999Z` } });

    console.log(`\n${LINE}`);
    console.log(`  GYM TANPA DISKON (${Math.min(gymNoDisc.length, 30)}/${gymNoDiscCount} terbesar)`);
    console.log(LINE);
    console.log(`  ${'No. Order'.padEnd(22)} ${'Status'.padEnd(12)} ${'Total'.padStart(14)} ${'Items'.padEnd(40)}`);
    console.log(`  ${'-'.repeat(90)}`);
    gymNoDisc.forEach(r => {
      console.log(`  ${(r.transactionNumber || '-').padEnd(22)} ${(r.status || '-').padEnd(12)} ${fmt(r.totalAmount).padStart(14)} ${(r.items || '-').slice(0, 40).padEnd(40)}`);
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // 4. KESIMPULAN
  // ══════════════════════════════════════════════════════════════════
  console.log(`\n${SEP}`);
  console.log('  KESIMPULAN');
  console.log(SEP);

  if (excludedCount > 0) {
    console.log(`  ❌ ${excludedCount} transaksi void/cancel/refund TERSISA di DB (tapi TIDAK masuk report)`);
  } else {
    console.log('  ✅ Transaksi void/cancel/refund: TIDAK ADA atau TIDAK masuk report');
  }

  console.log(`\n  Report gym revenue : ${fmt(reportTotal)} (dari totalAmount, sudah net diskon)`);
  console.log(`  Subtotal gym gross : ${fmt(reportSubtotal)} (sebelum diskon)`);
  console.log(`  Total diskon gym   : ${fmt(reportDiscount)}`);
  console.log(`\n  ⚠️  Report pakai totalAmount = subtotal - diskon + service + tax.`);
  console.log(`     Jadi angka ${fmt(reportTotal)} SUDAH dipotong diskon ${fmt(reportDiscount)}.`);
  console.log(SEP + '\n');

  await sequelize.close();
}

main().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  sequelize.close().catch(() => {});
  process.exit(1);
});
