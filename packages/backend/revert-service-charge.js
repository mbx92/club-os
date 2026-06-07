'use strict';
/**
 * Revert perubahan totalAmount dari fix-service-charge.js.
 * Masalah: fix-service-charge mengubah totalAmount tapi customer sudah bayar
 * dengan totalAmount lama → totalAmount tidak cocok dengan payment received.
 *
 * Solusi:
 * - Kembalikan serviceCharge ke formula lama (subtotalAfterDiscount × rate)
 * - Kembalikan totalAmount ke sum(payments) karena itulah yang nyata dibayar
 * - Formula baru (SC dari subtotal) hanya berlaku untuk transaksi baru ke depan
 *
 * Usage:
 *   node revert-service-charge.js          → dry run
 *   node revert-service-charge.js --fix    → apply
 */
require('dotenv').config({ path: '.env.development' });
const { Op } = require('sequelize');
const { Transaction, TransactionPayment, sequelize } = require('./src/models');
const transactionSettingsService = require('./src/services/transactionSettingsService');

const DRY_RUN = process.argv[2] !== '--fix';
console.log(DRY_RUN ? '=== DRY RUN ===' : '=== APPLY REVERT ===');

async function main() {
  const [tenantRows] = await sequelize.query(
    `SELECT DISTINCT "tenantId" FROM "Transactions" WHERE "serviceCharge" > 0 AND "deletedAt" IS NULL`
  );

  let totalFixed = 0;

  for (const { tenantId } of tenantRows) {
    let scConfig;
    try {
      scConfig = await transactionSettingsService.getServiceChargeConfiguration(tenantId);
    } catch {
      continue;
    }
    if (!scConfig.serviceChargeEnable || !scConfig.serviceChargePercentage) continue;

    const scRate = parseFloat(scConfig.serviceChargePercentage);
    const scType = scConfig.serviceChargeType || 'percentage';
    console.log(`\nTenant ${tenantId} — SC ${scRate}% (${scType})`);

    // Ambil transaksi dengan SC > 0, beserta total payments yang diterima
    const trxList = await Transaction.findAll({
      where: { tenantId, serviceCharge: { [Op.gt]: 0 }, deletedAt: null },
      attributes: ['id', 'transactionNumber', 'subtotal', 'voucherDiscount',
                   'serviceCharge', 'tax', 'roundingAmount', 'totalAmount'],
      include: [{
        model: TransactionPayment,
        as: 'payments',
        where: { status: 'completed', deletedAt: null },
        required: false,
        attributes: ['paymentMethod', 'amount'],
      }],
    });

    let count = 0;
    for (const t of trxList) {
      const subtotal  = parseFloat(t.subtotal || 0);
      const discount  = parseFloat(t.voucherDiscount || 0);
      const tax       = parseFloat(t.tax || 0);
      const rounding  = parseFloat(t.roundingAmount || 0);
      const currentSC = parseFloat(t.serviceCharge || 0);
      const currentTotal = parseFloat(t.totalAmount || 0);

      // Hitung berapa SC yang benar (formula lama — dari subtotalAfterDiscount)
      const subtotalAfterDiscount = subtotal - discount;
      const correctOldSC = scType === 'percentage'
        ? Math.round(subtotalAfterDiscount * scRate / 100)
        : Math.round(scRate);

      // Cek apakah ini hasil fix (SC baru dari subtotal sebelum diskon)
      const newFormulasSC = scType === 'percentage'
        ? Math.round(subtotal * scRate / 100)
        : Math.round(scRate);

      // Sum actual payments (excluding compliment)
      const paymentTotal = (t.payments || [])
        .filter(p => !p.paymentMethod?.toLowerCase().includes('compli'))
        .reduce((s, p) => s + parseFloat(p.amount || 0), 0);

      // Skip transaksi tanpa actual payment (belum dibayar / cancelled sebelum bayar)
      if (paymentTotal === 0) continue;

      // Recalculate apa yang seharusnya totalAmount berdasarkan payment
      // totalAmount = subtotalAfterDiscount + correctOldSC + tax + rounding
      const correctOldTotal = Math.round(subtotalAfterDiscount + correctOldSC + tax + rounding);

      // Cek apakah perlu revert:
      // - SC diubah ke formula baru (newFormulasSC) oleh fix-service-charge.js
      // - totalAmount tidak cocok dengan payment received
      const scWasUpdated     = Math.round(currentSC) === newFormulasSC && newFormulasSC !== correctOldSC;
      const totalMismatch    = Math.abs(currentTotal - correctOldTotal) > 1;

      // Hanya revert kalau SC memang diubah oleh fix tadi
      if (!scWasUpdated && !totalMismatch) continue;

      console.log(`  ${t.transactionNumber}:`);
      console.log(`    subtotal=${subtotal}  disc=${discount}  tax=${tax}  rounding=${rounding}`);
      console.log(`    SC saat ini: ${Math.round(currentSC)}  SC lama (benar): ${correctOldSC}  SC formula baru: ${newFormulasSC}`);
      console.log(`    Total saat ini: ${Math.round(currentTotal)}  Bayar diterima: ${Math.round(paymentTotal)}  Total lama: ${correctOldTotal}`);

      if (scWasUpdated) {
        console.log(`    → Revert SC: ${Math.round(currentSC)} → ${correctOldSC}`);
      }
      if (totalMismatch) {
        console.log(`    → Revert totalAmount: ${Math.round(currentTotal)} → ${correctOldTotal}`);
        console.log(`      (payment diterima: ${Math.round(paymentTotal)})`);
      }

      if (!DRY_RUN) {
        const updateData = {};
        if (scWasUpdated)  updateData.serviceCharge = correctOldSC;
        if (totalMismatch) updateData.totalAmount   = correctOldTotal;
        await Transaction.update(updateData, { where: { id: t.id } });
        console.log(`    --> REVERTED`);
      }
      count++;
      totalFixed++;
    }
    console.log(`  Perlu revert: ${count}`);
  }

  console.log(`\n=== TOTAL: ${totalFixed} transaksi ===`);
  if (DRY_RUN) console.log('Jalankan dengan --fix untuk apply.');
}

main().catch(console.error).finally(() => process.exit());
