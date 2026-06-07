'use strict';

/**
 * Fix: Backdate CashRegisterSession.openedAt untuk mencakup transaksi
 *       yang dibuat sebelum shift kasir dibuka (production data fix).
 *
 * Usage:
 *   node scripts/fixShiftOpenedAt.js             # dry-run (preview saja)
 *   node scripts/fixShiftOpenedAt.js --apply     # apply perubahan ke database
 *   node scripts/fixShiftOpenedAt.js --tenantId=<uuid>          # filter 1 tenant
 *   node scripts/fixShiftOpenedAt.js --sessionId=<uuid>         # fix 1 session saja
 *   node scripts/fixShiftOpenedAt.js --apply --tenantId=<uuid>  # apply 1 tenant
 */

const { Op } = require('sequelize');
const { sequelize, CashRegisterSession, Transaction, Tenant } = require('../src/models');

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const DRY_RUN = !args.includes('--apply');
const TARGET_TENANT  = (args.find(a => a.startsWith('--tenantId=')) || '').split('=')[1] || null;
const TARGET_SESSION = (args.find(a => a.startsWith('--sessionId=')) || '').split('=')[1] || null;

// ── Status constants ──────────────────────────────────────────────────────────
const TRX_STATUSES = ['completed', 'paid', 'served', 'split', 'merged'];

async function main() {
  console.log('='.repeat(70));
  console.log('FIX: Backdate CashRegisterSession.openedAt');
  console.log(`Mode    : ${DRY_RUN ? '🔍 DRY-RUN (tidak ada perubahan)' : '✍️  APPLY (menulis ke database)'}`);
  if (TARGET_TENANT)  console.log(`Filter  : tenantId = ${TARGET_TENANT}`);
  if (TARGET_SESSION) console.log(`Filter  : sessionId = ${TARGET_SESSION}`);
  console.log('='.repeat(70));

  // ── Load sessions ────────────────────────────────────────────────────────
  const sessionWhere = { deletedAt: null };
  if (TARGET_TENANT)  sessionWhere.tenantId  = TARGET_TENANT;
  if (TARGET_SESSION) sessionWhere.id        = TARGET_SESSION;

  const sessions = await CashRegisterSession.findAll({
    where: sessionWhere,
    attributes: ['id', 'tenantId', 'locationId', 'shiftName', 'shiftDate', 'shiftNumber', 'openedAt', 'closedAt', 'status'],
    order: [['tenantId', 'ASC'], ['openedAt', 'ASC']],
  });

  console.log(`\nTotal sesi ditemukan : ${sessions.length}`);

  // Group sessions per (tenantId, shiftDate) untuk deteksi overlap
  const grouped = {};
  sessions.forEach(s => {
    const key = `${s.tenantId}::${s.shiftDate}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });

  let totalFixed    = 0;
  let totalSkipped  = 0;
  let totalNoChange = 0;

  for (const [groupKey, daySessions] of Object.entries(grouped)) {
    const [tenantId, shiftDate] = groupKey.split('::');

    // Ambil semua transaksi pada hari itu untuk tenant ini
    const dayStart = new Date(`${shiftDate}T00:00:00+07:00`);
    const dayEnd   = new Date(`${shiftDate}T23:59:59.999+07:00`);

    const dayTrx = await Transaction.findAll({
      where: {
        tenantId,
        createdAt: { [Op.gte]: dayStart, [Op.lte]: dayEnd },
        status:    { [Op.in]: TRX_STATUSES },
        deletedAt: null,
      },
      attributes: ['id', 'transactionNumber', 'transactionType', 'createdAt', 'locationId'],
      order: [['createdAt', 'ASC']],
    });

    if (dayTrx.length === 0) continue;

    // Untuk setiap session, cari transaksi yang belum ter-cover
    for (const session of daySessions) {
      const sessionOpen  = new Date(session.openedAt).getTime();
      const sessionClose = session.closedAt ? new Date(session.closedAt).getTime() : Infinity;

      // Transaksi sudah ter-cover oleh session ini → createdAt dalam window [openedAt, closedAt]
      // Transaksi ter-cover oleh session LAIN → masuk ke salah satu window session lain di hari yang sama
      const otherSessions = daySessions.filter(s => s.id !== session.id);

      // Cari transaksi yang:
      // 1. Terjadi SEBELUM openedAt session ini
      // 2. Belum ter-cover oleh session lain manapun
      // 3. Jika session punya locationId → hanya trx di lokasi yang sama atau null
      const uncovered = dayTrx.filter(tx => {
        const txTime = new Date(tx.createdAt).getTime();

        // Harus sebelum openedAt session ini
        if (txTime >= sessionOpen) return false;

        // Jika session punya locationId, filter lokasi
        if (session.locationId && tx.locationId && tx.locationId !== session.locationId) return false;

        // Sudah ter-cover oleh session lain?
        const coveredByOther = otherSessions.some(s => {
          const oOpen  = new Date(s.openedAt).getTime();
          const oClose = s.closedAt ? new Date(s.closedAt).getTime() : Infinity;
          return txTime >= oOpen && txTime <= oClose;
        });
        return !coveredByOther;
      });

      if (uncovered.length === 0) {
        totalNoChange++;
        continue;
      }

      const earliest       = uncovered[0]; // sudah urut ASC
      const newOpenedAt    = new Date(earliest.createdAt);
      const oldOpenedAt    = new Date(session.openedAt);
      const diffMs         = sessionOpen - newOpenedAt.getTime();
      const diffMins       = Math.round(diffMs / 60000);

      console.log(`\n  ─ Session : ${session.shiftName} #${session.shiftNumber} (${session.id})`);
      console.log(`    Tenant  : ${tenantId}`);
      console.log(`    openedAt lama  : ${oldOpenedAt.toISOString()}`);
      console.log(`    openedAt baru  : ${newOpenedAt.toISOString()}  (mundur ${diffMins} menit)`);
      console.log(`    Transaksi orphan (${uncovered.length}):`);
      uncovered.forEach(tx => {
        console.log(`      · [${tx.transactionType.padEnd(10)}] ${tx.transactionNumber}  @  ${new Date(tx.createdAt).toISOString()}`);
      });

      if (!DRY_RUN) {
        await CashRegisterSession.update(
          { openedAt: newOpenedAt },
          { where: { id: session.id } }
        );
        console.log(`    ✅ openedAt diperbarui`);
        totalFixed++;
      } else {
        console.log(`    ℹ️  (dry-run) Belum diperbarui — jalankan dengan --apply untuk menerapkan`);
        totalFixed++;
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('RINGKASAN');
  console.log(`  Sesi yang perlu diperbarui : ${totalFixed}`);
  console.log(`  Sesi tanpa perubahan       : ${totalNoChange}`);
  if (DRY_RUN && totalFixed > 0) {
    console.log('\n  Jalankan dengan flag --apply untuk menerapkan perubahan:');
    console.log('  node scripts/fixShiftOpenedAt.js --apply');
  }
  console.log('='.repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
