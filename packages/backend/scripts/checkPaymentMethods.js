#!/usr/bin/env node
'use strict';

/**
 * Check Payment Methods — Deteksi potensi salah input metode bayar
 *
 * Tujuan: Mencari transaksi yang kemungkinan salah input payment method
 *         (misal: seharusnya QRIS/transfer tapi diinput sebagai cash)
 *
 * Cara kerja:
 *   - Tampilkan semua transaksi pada tanggal target beserta payment method-nya
 *   - Highlight transaksi cash dengan nominal "ganjil" (tidak bulat atau besar)
 *   - Tampilkan ringkasan per payment method
 *   - Dengan --fix: update payment method pada transaksi tertentu
 *
 * Usage:
 *   node scripts/checkPaymentMethods.js                        ← 21 Feb, semua trx
 *   node scripts/checkPaymentMethods.js --date=2026-02-21      ← tanggal spesifik
 *   node scripts/checkPaymentMethods.js --date=2026-02-21 --type=restaurant
 *   node scripts/checkPaymentMethods.js --payment-id=<uuid> --to=qris --fix
 */

const path = require('path');

const envArg = process.argv.find(a => a.startsWith('--env='));
const ENV    = envArg ? envArg.split('=')[1] : (process.env.NODE_ENV || 'development');

require('dotenv').config({ path: path.join(__dirname, '..', `.env.${ENV}`) });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Transaction, TransactionPayment, CashRegisterSession, sequelize } = require('../src/models');
const { Op }  = require('sequelize');

// ── CLI args ──────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const FIX    = args.includes('--fix');
const DATE   = (args.find(a => a.startsWith('--date='))  || '--date=2026-02-21').split('=')[1];
const TYPE   = (args.find(a => a.startsWith('--type='))  || '').split('=')[1] || null; // restaurant|pos|gym|all
const PMID   = (args.find(a => a.startsWith('--payment-id=')) || '').split('=')[1] || null;
const TO_PM  = (args.find(a => a.startsWith('--to='))    || '').split('=')[1] || null;

// ── Helpers ───────────────────────────────────────────────────────────────────
const SEP  = '═'.repeat(72);
const LINE = '─'.repeat(72);
const fmt  = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const pad  = (s, w) => String(s).padEnd(w);
const rpad = (s, w) => String(s).padStart(w);

const PAYMENT_LABELS = {
  cash     : 'CASH    ',
  qris     : 'QRIS    ',
  transfer : 'TRANSFER',
  card     : 'CARD    ',
  debit    : 'DEBIT   ',
  credit   : 'CREDIT  ',
};

function pmLabel(m) {
  return PAYMENT_LABELS[m?.toLowerCase()] || (m || '-').toUpperCase().padEnd(8);
}

// Heuristic: cash dengan nominal yang tidak biasa untuk bayar tunai
// (bisa jadi QRIS/transfer yang salah input)
function suspiciousScore(amount, trxType) {
  const n = parseFloat(amount || 0);
  let score = 0;
  const reasons = [];

  // Nominal sangat besar untuk cash (> 500k) — lebih mungkin QRIS/transfer
  if (n > 500000) { score += 2; reasons.push(`nominal besar (${fmt(n)})`); }
  else if (n > 200000) { score += 1; reasons.push(`nominal sedang-besar (${fmt(n)})`); }

  // Nominal tidak bulat ribuan — QRIS cenderung exact, cash biasanya bulat
  if (n % 1000 !== 0) { score += 1; reasons.push('tidak bulat ribuan'); }

  // Grand total yang genap bulat tapi payment cash exact (tanpa kembalian)
  // → lebih mungkin QRIS/transfer
  if (n % 500 !== 0 && n > 50000) { score += 1; reasons.push('tidak bulat 500'); }

  return { score, reasons };
}

// ── Single payment fix mode ───────────────────────────────────────────────────
async function fixPaymentMethod(paymentId, toMethod) {
  const payment = await TransactionPayment.findOne({
    where: { id: paymentId },
    include: [{ model: Transaction, as: 'transaction', attributes: ['id', 'transactionNumber', 'status'] }],
  });

  if (!payment) {
    console.log(`  ❌ Payment ID ${paymentId} tidak ditemukan`);
    process.exit(1);
  }

  const fromMethod = payment.paymentMethod;
  console.log(SEP);
  console.log('  Fix Payment Method');
  console.log(SEP);
  console.log(`  Payment ID : ${payment.id}`);
  console.log(`  Order      : ${payment.transaction?.transactionNumber || '-'}`);
  console.log(`  Amount     : ${fmt(payment.amount)}`);
  console.log(`  Dari       : ${fromMethod}`);
  console.log(`  Ke         : ${toMethod}`);

  if (!FIX) {
    console.log('\n  ⚠️  DRY RUN — tambahkan --fix untuk apply perubahan\n');
    await sequelize.close();
    return;
  }

  await payment.update({ paymentMethod: toMethod });
  console.log('\n  ✅ Payment method berhasil diupdate\n');
  console.log('  ⚠️  Perlu recalculate shift report setelah ini karena Q_totalCash berubah.');
  console.log('     Jalankan: node scripts/diagnoseCashRegisterReport.js --fix\n');
  await sequelize.close();
}

// ── Main check ────────────────────────────────────────────────────────────────
async function main() {
  // Single fix mode
  if (PMID && TO_PM) {
    await fixPaymentMethod(PMID, TO_PM);
    return;
  }

  console.log(SEP);
  console.log('  Cek Payment Method — Deteksi Potensi Salah Input');
  console.log(`  Tanggal : ${DATE}`);
  console.log(`  Tipe    : ${TYPE || 'semua (restaurant + pos + gym)'}`);
  console.log(`  Mode    : ${FIX ? '⚡ FIX' : '🔍 PREVIEW'}`);
  console.log(SEP);

  // Cari sesi shift pada tanggal ini
  const sessions = await CashRegisterSession.findAll({
    where: { shiftDate: DATE },
    order: [['openedAt', 'ASC']],
  });

  let timeWhere;
  if (sessions.length > 0) {
    const firstOpen = sessions[0].openedAt;
    const lastSession = [...sessions].sort((a, b) => {
      if (!a.closedAt) return 1;
      if (!b.closedAt) return -1;
      return new Date(b.closedAt) - new Date(a.closedAt);
    })[0];
    timeWhere = {
      [Op.gte]: firstOpen,
      ...(lastSession.closedAt ? { [Op.lte]: lastSession.closedAt } : {}),
    };
    console.log(`\n  Sesi ditemukan: ${sessions.length}`);
    sessions.forEach(s => {
      console.log(`   • ${s.shiftName} (${s.status}) — ${s.openedAt.toISOString().slice(0, 16)} s/d ${s.closedAt?.toISOString().slice(0, 16) || 'open'}`);
    });
  } else {
    // Fallback: cari by tanggal kalender UTC
    const start = new Date(DATE + 'T00:00:00.000Z');
    const end   = new Date(DATE + 'T23:59:59.999Z');
    timeWhere = { [Op.gte]: start, [Op.lte]: end };
    console.log('\n  ⚠️  Tidak ada sesi shift — menggunakan rentang tanggal kalender\n');
  }

  // Tentukan filter tipe transaksi
  const typeFilter = TYPE
    ? [TYPE]
    : ['restaurant', 'pos', 'gym'];

  // Load transaksi
  const trxs = await Transaction.findAll({
    where: {
      createdAt: timeWhere,
      transactionType: { [Op.in]: typeFilter },
      status: { [Op.in]: ['completed', 'paid', 'served', 'split', 'merged'] },
      deletedAt: null,
    },
    include: [{
      model: TransactionPayment,
      as: 'payments',
      required: false,
      attributes: ['id', 'paymentMethod', 'amount', 'status', 'paymentDetails'],
    }],
    attributes: ['id', 'transactionNumber', 'transactionType', 'status', 'totalAmount', 'createdAt', 'splitFromId'],
    order: [['createdAt', 'ASC']],
  });

  if (trxs.length === 0) {
    console.log('\n  Tidak ada transaksi pada rentang waktu ini.\n');
    await sequelize.close();
    return;
  }

  // ── Summary by payment method ──────────────────────────────────────────────
  const summary = {};
  let grandTotal  = 0;
  const suspicious = [];

  trxs.forEach(t => {
    (t.payments || []).forEach(p => {
      if (p.status !== 'completed') return;
      const m  = (p.paymentMethod || 'unknown').toLowerCase();
      const am = parseFloat(p.amount || 0);
      if (!summary[m]) summary[m] = { count: 0, amount: 0 };
      summary[m].count++;
      summary[m].amount += am;
      grandTotal += am;

      // Cek suspicious hanya untuk cash
      if (m === 'cash') {
        const { score, reasons } = suspiciousScore(am, t.transactionType);
        if (score >= 2) {
          suspicious.push({ trx: t, payment: p, score, reasons });
        }
      }
    });
  });

  // ── Per-transaction detail ─────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(72)}`);
  console.log('  DETAIL TRANSAKSI');
  console.log(`${'─'.repeat(72)}`);
  console.log(`  ${pad('No. Order', 22)} ${pad('Tipe', 12)} ${pad('Status', 10)} ${pad('Metode', 10)} ${rpad('Nominal', 14)}`);
  console.log(`  ${'-'.repeat(70)}`);

  trxs.forEach(t => {
    const payments = (t.payments || []).filter(p => p.status === 'completed');
    if (payments.length === 0) {
      console.log(`  ${pad(t.transactionNumber, 22)} ${pad(t.transactionType, 12)} ${pad(t.status, 10)} ${pad('-', 10)} ${rpad('-', 14)}`);
      return;
    }
    payments.forEach((p, i) => {
      const m       = (p.paymentMethod || '-').toLowerCase();
      const isCash  = m === 'cash';
      const { score } = isCash ? suspiciousScore(parseFloat(p.amount), t.transactionType) : { score: 0 };
      const flag    = score >= 3 ? ' ⚠️⚠️' : score >= 2 ? ' ⚠️ ' : '    ';
      const prefix  = i === 0 ? t.transactionNumber : '  └─ split payment';
      console.log(`  ${pad(prefix, 22)} ${pad(i === 0 ? t.transactionType : '', 12)} ${pad(i === 0 ? t.status : '', 10)} ${pad(pmLabel(m), 10)} ${rpad(fmt(p.amount), 14)}${flag}  ${p.id}`);
    });
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${LINE}`);
  console.log('  RINGKASAN PER METODE PEMBAYARAN');
  console.log(LINE);
  console.log(`  ${pad('Metode', 12)} ${rpad('Jumlah Trx', 12)} ${rpad('Total', 16)}`);
  console.log(`  ${'-'.repeat(42)}`);

  Object.entries(summary)
    .sort((a, b) => b[1].amount - a[1].amount)
    .forEach(([m, v]) => {
      const pct = ((v.amount / grandTotal) * 100).toFixed(1);
      console.log(`  ${pad(pmLabel(m), 12)} ${rpad(v.count + ' trx', 12)} ${rpad(fmt(v.amount), 16)}  (${pct}%)`);
    });
  console.log(`  ${'-'.repeat(42)}`);
  console.log(`  ${pad('TOTAL', 12)} ${rpad(trxs.length + ' trx', 12)} ${rpad(fmt(grandTotal), 16)}`);

  // ── Suspicious cash payments ───────────────────────────────────────────────
  if (suspicious.length > 0) {
    console.log(`\n${SEP}`);
    console.log('  ⚠️  TRANSAKSI CASH YANG PERLU DICEK');
    console.log('  (Nominal besar atau tidak bulat — kemungkinan salah input)');
    console.log(SEP);

    suspicious
      .sort((a, b) => b.score - a.score)
      .forEach(({ trx, payment, score, reasons }) => {
        const time = new Date(trx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        console.log(`\n  🔴 Score: ${score}/5`);
        console.log(`     Order     : ${trx.transactionNumber}`);
        console.log(`     Waktu     : ${time}`);
        console.log(`     Tipe      : ${trx.transactionType}`);
        console.log(`     Total Trx : ${fmt(trx.totalAmount)}`);
        console.log(`     Payment   : ${fmt(payment.amount)} CASH`);
        console.log(`     Payment ID: ${payment.id}`);
        if (payment.paymentDetails) {
          try {
            const d = typeof payment.paymentDetails === 'string'
              ? JSON.parse(payment.paymentDetails)
              : payment.paymentDetails;
            if (d && Object.keys(d).length > 0)
              console.log(`     Detail    : ${JSON.stringify(d)}`);
          } catch (_) {}
        }
        console.log(`     Alasan    : ${reasons.join(', ')}`);
        console.log(`     Fix cmd   : node scripts/checkPaymentMethods.js --payment-id=${payment.id} --to=qris --fix`);
      });
  } else {
    console.log(`\n  ✅ Tidak ada transaksi cash yang mencurigakan`);
  }

  // ── Perbandingan jika semua suspicious diubah ke QRIS ─────────────────────
  if (suspicious.length > 0) {
    const suspiciousCashTotal = suspicious.reduce((s, { payment }) => s + parseFloat(payment.amount || 0), 0);
    const currentCash  = summary['cash']?.amount || 0;
    const currentQris  = summary['qris']?.amount || 0;

    console.log(`\n${LINE}`);
    console.log('  SIMULASI: Jika semua transaksi ⚠️  diubah cash → QRIS');
    console.log(LINE);
    console.log(`  Total yang akan dipindah  : ${fmt(suspiciousCashTotal)}`);
    console.log(`  Cash sekarang             : ${fmt(currentCash)}`);
    console.log(`  Cash setelah fix          : ${fmt(currentCash - suspiciousCashTotal)}`);
    console.log(`  QRIS sekarang             : ${fmt(currentQris)}`);
    console.log(`  QRIS setelah fix          : ${fmt(currentQris + suspiciousCashTotal)}`);
  }

  console.log(`\n${SEP}`);
  console.log('  Untuk memperbaiki satu payment:');
  console.log('    node scripts/checkPaymentMethods.js --payment-id=<uuid> --to=qris');
  console.log('  Tambahkan --fix untuk apply perubahan ke DB');
  console.log(SEP + '\n');

  await sequelize.close();
}

main().catch(err => {
  console.error('Error:', err.message);
  sequelize.close().catch(() => {});
  process.exit(1);
});
