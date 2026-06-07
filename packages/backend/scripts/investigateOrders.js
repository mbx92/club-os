#!/usr/bin/env node
'use strict';

/**
 * Investigasi mendalam order-order spesifik tgl 21 Feb
 * Cek: item list, waktu, pelanggan, split children, payment detail
 */

const path = require('path');
const ENV  = process.env.NODE_ENV || 'development';

require('dotenv').config({ path: path.join(__dirname, '..', `.env.${ENV}`) });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Transaction, TransactionPayment, TransactionItem, sequelize } = require('../src/models');
const { Op } = require('sequelize');

const SEP  = '═'.repeat(72);
const LINE = '─'.repeat(72);
const fmt  = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

const TARGET_NUMBERS = [
  'ORD-202602-0021',
  'ORD-202602-0022',
  'ORD-202602-0033',
  'RST-20260221-0001',
  'RST-20260221-0002',
];

async function showOrder(trx) {
  const payments = trx.payments || [];
  const items    = trx.items    || [];

  console.log(SEP);
  console.log(`  📋 ${trx.transactionNumber}`);
  console.log(LINE);
  console.log(`  ID          : ${trx.id}`);
  console.log(`  Tipe        : ${trx.transactionType}`);
  console.log(`  Status      : ${trx.status}`);
  console.log(`  Waktu       : ${new Date(trx.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })}`);
  console.log(`  Customer    : ${trx.customerName || '-'} (${trx.customerType})`);
  console.log(`  Order Type  : ${trx.orderType || '-'}`);
  if (trx.notes)      console.log(`  Notes       : ${trx.notes}`);
  console.log(`  Subtotal    : ${fmt(trx.subtotal)}`);
  if (parseFloat(trx.voucherDiscount) > 0)
    console.log(`  Diskon      : ${fmt(trx.voucherDiscount)}`);
  if (parseFloat(trx.serviceCharge) > 0)
    console.log(`  Serv Charge : ${fmt(trx.serviceCharge)}`);
  if (parseFloat(trx.tax) > 0)
    console.log(`  Tax         : ${fmt(trx.tax)}`);
  console.log(`  Total       : ${fmt(trx.totalAmount)}`);
  if (parseFloat(trx.paidAmount) > 0)
    console.log(`  Paid Amount : ${fmt(trx.paidAmount)}`);
  if (parseFloat(trx.changeAmount) > 0)
    console.log(`  Kembalian   : ${fmt(trx.changeAmount)}`);
  if (trx.splitFromId)
    console.log(`  Split From  : ${trx.splitFromId}`);

  // Items
  console.log(`\n  ITEM (${items.length}):`);
  if (items.length === 0) {
    console.log('    (tidak ada item)');
  } else {
    items.forEach(it => {
      console.log(`    • ${it.itemName.padEnd(30)} ${String(it.quantity).padStart(3)}x ${fmt(it.unitPrice).padStart(14)} = ${fmt(it.subtotal)}`);
    });
  }

  // Payments
  console.log(`\n  PAYMENT (${payments.length}):`);
  if (payments.length === 0) {
    console.log('    (tidak ada payment)');
  } else {
    payments.forEach(p => {
      const flag = p.status !== 'completed' ? ` [${p.status}]` : '';
      const details = p.paymentDetails && Object.keys(p.paymentDetails).length > 0
        ? `  » ${JSON.stringify(p.paymentDetails)}`
        : '';
      console.log(`    • ${p.paymentMethod.toUpperCase().padEnd(12)} ${fmt(p.amount).padStart(14)}  ${p.status}${flag}`);
      console.log(`      ID: ${p.id}${details}`);
    });
  }

  // Cek apakah ada split children
  const children = await Transaction.findAll({
    where: { splitFromId: trx.id },
    include: [
      { model: TransactionPayment, as: 'payments', required: false },
      { model: TransactionItem,    as: 'items',    required: false },
    ],
    order: [['createdAt', 'ASC']],
  });

  if (children.length > 0) {
    console.log(`\n  SPLIT CHILDREN (${children.length}):`);
    children.forEach(ch => {
      const chPay = ch.payments || [];
      const totalPaid = chPay.filter(p => p.status === 'completed').reduce((s, p) => s + parseFloat(p.amount), 0);
      console.log(`    ┌─ ${ch.transactionNumber}  status: ${ch.status}  total: ${fmt(ch.totalAmount)}`);
      if (chPay.length === 0) {
        console.log(`    │  (no payment)`);
      } else {
        chPay.forEach(p => {
          console.log(`    │  ${p.paymentMethod.toUpperCase().padEnd(10)} ${fmt(p.amount)}  [${p.status}]  id: ${p.id}`);
        });
      }
      const chItems = ch.items || [];
      chItems.forEach(it => {
        console.log(`    │  item: ${it.itemName} ${it.quantity}x`);
      });
      console.log(`    └─ total paid: ${fmt(totalPaid)}`);
    });
  }
}

// ── Cek similaritas ORD-0021 vs ORD-0022 ─────────────────────────────────────
function checkSimilarity(a, b) {
  console.log(`\n${SEP}`);
  console.log('  🔍 ANALISIS SIMILARITAS: ORD-0021 vs ORD-0022');
  console.log(SEP);

  // Waktu
  const timeDiff = Math.abs(new Date(a.createdAt) - new Date(b.createdAt)) / 1000;
  console.log(`  Selisih waktu  : ${timeDiff.toFixed(0)} detik (${(timeDiff/60).toFixed(1)} menit)`);

  // Total
  const amtDiff = Math.abs(parseFloat(a.totalAmount) - parseFloat(b.totalAmount));
  console.log(`  Selisih total  : ${fmt(amtDiff)}`);
  console.log(`  Total A        : ${fmt(a.totalAmount)} | Total B: ${fmt(b.totalAmount)}`);

  // Customer
  console.log(`  Customer A     : ${a.customerName || '-'} | Customer B: ${b.customerName || '-'}`);

  // Item comparison
  const aItems = (a.items || []).map(i => `${i.itemName}:${i.quantity}`).sort();
  const bItems = (b.items || []).map(i => `${i.itemName}:${i.quantity}`).sort();
  const aSet   = new Set(aItems);
  const bSet   = new Set(bItems);
  const same   = aItems.filter(i => bSet.has(i));
  const onlyA  = aItems.filter(i => !bSet.has(i));
  const onlyB  = bItems.filter(i => !aSet.has(i));

  console.log(`\n  Item sama      : ${same.length > 0 ? same.join(', ') : '(tidak ada)'}`);
  console.log(`  Hanya di A     : ${onlyA.length > 0 ? onlyA.join(', ') : '-'}`);
  console.log(`  Hanya di B     : ${onlyB.length > 0 ? onlyB.join(', ') : '-'}`);

  const overlapRatio = same.length / Math.max(aItems.length, bItems.length, 1);
  const verdict = overlapRatio >= 0.8 && timeDiff < 300 && amtDiff < 5000
    ? '⚠️  KEMUNGKINAN DUPLIKAT atau order yang sama dibayar 2x'
    : overlapRatio >= 0.5
    ? '⚠️  Item sebagian sama — bisa order berbeda atau di-retype'
    : '✅  Order tampak berbeda';

  console.log(`\n  Overlap item   : ${(overlapRatio * 100).toFixed(0)}%`);
  console.log(`  → VERDICT: ${verdict}`);
}

async function main() {
  console.log(SEP);
  console.log('  Investigasi Order Tgl 21 Feb 2026');
  console.log(SEP);

  const results = await Transaction.findAll({
    where: { transactionNumber: { [Op.in]: TARGET_NUMBERS } },
    include: [
      { model: TransactionPayment, as: 'payments', required: false,
        attributes: ['id', 'paymentMethod', 'amount', 'status', 'paymentDate', 'notes', 'paymentDetails'] },
      { model: TransactionItem,    as: 'items',    required: false,
        attributes: ['id', 'itemName', 'quantity', 'unitPrice', 'subtotal', 'notes', 'status'] },
    ],
    order: [['createdAt', 'ASC']],
  });

  const map = {};
  results.forEach(t => { map[t.transactionNumber] = t; });

  // Show each order
  for (const num of TARGET_NUMBERS) {
    const t = map[num];
    if (!t) { console.log(`\n  ❌ ${num} tidak ditemukan`); continue; }
    await showOrder(t);
  }

  // Similarity check for the two suspicious orders
  if (map['ORD-202602-0021'] && map['ORD-202602-0022']) {
    checkSimilarity(map['ORD-202602-0021'], map['ORD-202602-0022']);
  }

  // Analisis ORD-0033 split
  const ord33 = map['ORD-202602-0033'];
  if (ord33) {
    console.log(`\n${SEP}`);
    console.log('  🔍 ANALISIS ORD-202602-0033 (Split Parent)');
    console.log(SEP);
    const directPayments = (ord33.payments || []).filter(p => p.status === 'completed');
    if (directPayments.length > 0) {
      console.log(`  Status: split DENGAN payment langsung di parent (gaya LAMA)`);
      console.log(`  → Payment di parent MASIH valid dan PERLU dihitung sbg kas masuk`);
      console.log(`  → Ini BUKAN bug data, sudah ditangani oleh patch kode getShiftReport`);
      console.log(`  Total cash di parent: ${fmt(directPayments.filter(p=>p.paymentMethod==='cash').reduce((s,p)=>s+parseFloat(p.amount),0))}`);
    } else {
      console.log(`  Status: split TANPA payment di parent (gaya BARU)`);
      console.log(`  → Payment ada di child transactions, bukan di parent`);
    }
  }

  console.log(`\n${SEP}\n`);
  await sequelize.close();
}

main().catch(err => {
  console.error('Error:', err.message);
  sequelize.close().catch(() => {});
  process.exit(1);
});
