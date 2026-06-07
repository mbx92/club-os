/**
 * Fix Payment Method Inconsistency (Production)
 * 
 * Masalah:
 *   Kolom paymentMethod di beberapa tabel menyimpan format camelCase 
 *   (creditCard, debitCard, bankTransfer, eWallet) padahal standar 
 *   yang digunakan adalah snake_case (credit_card, debit_card, bank_transfer, e_wallet).
 *   
 *   Ini terjadi karena kolom paymentMethod di TransactionPayments, MembershipPayments, 
 *   Payments, dan Subscriptions bertipe VARCHAR (bukan ENUM), sehingga menerima 
 *   value apa saja tanpa validasi.
 *
 * Yang diperbaiki:
 *   - creditCard   → credit_card
 *   - debitCard    → debit_card
 *   - bankTransfer → bank_transfer
 *   - eWallet      → e_wallet
 *
 * Tabel yang dicek:
 *   - TransactionPayments  (VARCHAR - most likely affected)
 *   - MembershipPayments   (VARCHAR)
 *   - Payments             (VARCHAR)
 *   - Subscriptions        (VARCHAR)
 *   - TrainerCommissions    (VARCHAR)
 *   - PsychologyOrders     (VARCHAR)
 *   - Expenses             (ENUM - would fail on invalid, but check anyway)
 *   - Incomes              (ENUM)
 *   - CashFlows            (ENUM)
 *
 * Usage:
 *   node scripts/fixPaymentMethod.js --dry-run     ← preview (default)
 *   node scripts/fixPaymentMethod.js               ← apply fix
 *
 * Environment:
 *   Uses NODE_ENV to determine which .env file to load.
 *   For production: NODE_ENV=production node scripts/fixPaymentMethod.js
 */

const path = require('path');
const env = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: path.join(__dirname, '..', `.env.${env}`) });

const { sequelize } = require('../src/models');

const DRY_RUN = !process.argv.includes('--apply');

// camelCase → snake_case mapping
const FIXES = [
  { from: 'creditCard',   to: 'credit_card' },
  { from: 'creditcard',   to: 'credit_card' },
  { from: 'CreditCard',   to: 'credit_card' },
  { from: 'debitCard',    to: 'debit_card' },
  { from: 'debitcard',    to: 'debit_card' },
  { from: 'DebitCard',    to: 'debit_card' },
  { from: 'bankTransfer', to: 'bank_transfer' },
  { from: 'banktransfer', to: 'bank_transfer' },
  { from: 'BankTransfer', to: 'bank_transfer' },
  { from: 'eWallet',      to: 'e_wallet' },
  { from: 'ewallet',      to: 'e_wallet' },
  { from: 'EWallet',      to: 'e_wallet' },
];

// Tables with paymentMethod column (VARCHAR type - safe to update)
const VARCHAR_TABLES = [
  'TransactionPayments',
  'MembershipPayments',
  'Payments',
  'Subscriptions',
  'TrainerCommissions',
  'PsychologyOrders',
];

// Tables with ENUM paymentMethod - need special handling
const ENUM_TABLES = [
  'Expenses',
  'Incomes',
  'CashFlows',
];

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Fix Payment Method Inconsistency');
  console.log(`   Environment: ${env}`);
  console.log(`   Database: ${sequelize.config.database}@${sequelize.config.host}`);
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '⚡ APPLY FIXES'}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!DRY_RUN) {
    console.log('⚠️  APPLY MODE - Changes will be written to database!');
    console.log('    Press Ctrl+C within 3 seconds to cancel...\n');
    await new Promise(r => setTimeout(r, 3000));
  }

  const totalStats = { scanned: 0, found: 0, fixed: 0 };

  // ── Step 1: Scan all VARCHAR tables ──────────────────────────
  console.log('── VARCHAR Tables (TransactionPayments, etc.) ──────────\n');

  for (const table of VARCHAR_TABLES) {
    try {
      // Check if table exists
      const [tableCheck] = await sequelize.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${table}' AND table_schema = 'public') as exists`
      );
      if (!tableCheck[0]?.exists) {
        console.log(`  ⏭  ${table}: table not found, skipping`);
        continue;
      }

      // Check if paymentMethod column exists
      const [colCheck] = await sequelize.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${table}' AND column_name = 'paymentMethod' AND table_schema = 'public') as exists`
      );
      if (!colCheck[0]?.exists) {
        console.log(`  ⏭  ${table}: no paymentMethod column, skipping`);
        continue;
      }

      // Get distinct values
      const [distinct] = await sequelize.query(
        `SELECT DISTINCT "paymentMethod" FROM "${table}" ORDER BY "paymentMethod"`
      );
      const values = distinct.map(r => r.paymentMethod).filter(Boolean);
      totalStats.scanned++;

      console.log(`  📋 ${table}`);
      console.log(`     Values: [${values.join(', ')}]`);

      // Apply each fix
      for (const fix of FIXES) {
        if (!values.includes(fix.from)) continue;

        // Count affected rows
        const [countResult] = await sequelize.query(
          `SELECT COUNT(*) as cnt FROM "${table}" WHERE "paymentMethod" = '${fix.from}'`
        );
        const count = parseInt(countResult[0].cnt);

        if (count === 0) continue;

        totalStats.found += count;
        console.log(`     ⚠  "${fix.from}" → "${fix.to}": ${count} record(s)`);

        if (!DRY_RUN) {
          // Show affected records before update
          const [affected] = await sequelize.query(
            `SELECT id, "paymentMethod", "createdAt" FROM "${table}" WHERE "paymentMethod" = '${fix.from}' ORDER BY "createdAt" DESC LIMIT 10`
          );
          for (const row of affected) {
            console.log(`        - id: ${row.id} | created: ${row.createdAt}`);
          }

          // Apply fix
          const [, meta] = await sequelize.query(
            `UPDATE "${table}" SET "paymentMethod" = '${fix.to}' WHERE "paymentMethod" = '${fix.from}'`
          );
          totalStats.fixed += (meta.rowCount || count);
          console.log(`     ✅ Fixed ${meta.rowCount || count} record(s)`);
        }
      }

      // Check for any other non-standard values
      const standardValues = ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'qris', 'e_wallet', 'compliment', 'transfer', 'check', 'other', 'pending', 'invitation'];
      const nonStandard = values.filter(v => !standardValues.includes(v));
      if (nonStandard.length > 0) {
        console.log(`     ℹ️  Other values (not fixed): [${nonStandard.join(', ')}]`);
      }

      console.log('');
    } catch (err) {
      console.log(`  ❌ ${table}: ERROR - ${err.message}`);
    }
  }

  // ── Step 2: Scan ENUM tables (read-only check) ──────────────
  console.log('── ENUM Tables (Expenses, Incomes, CashFlows) ─────────\n');

  for (const table of ENUM_TABLES) {
    try {
      const [tableCheck] = await sequelize.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${table}' AND table_schema = 'public') as exists`
      );
      if (!tableCheck[0]?.exists) {
        console.log(`  ⏭  ${table}: table not found, skipping`);
        continue;
      }

      const [distinct] = await sequelize.query(
        `SELECT DISTINCT "paymentMethod" FROM "${table}" ORDER BY "paymentMethod"`
      );
      const values = distinct.map(r => r.paymentMethod).filter(Boolean);
      totalStats.scanned++;

      const hasCamelCase = values.some(v => FIXES.some(f => f.from === v));
      const icon = hasCamelCase ? '⚠ ' : '✅';
      console.log(`  ${icon} ${table}: [${values.join(', ')}]`);

      if (hasCamelCase) {
        console.log(`     ⚠  ENUM table has camelCase values! These cannot be auto-fixed.`);
        console.log(`     ⚠  Need migration to alter ENUM type first.`);
      }
    } catch (err) {
      console.log(`  ❌ ${table}: ERROR - ${err.message}`);
    }
  }

  // ── Step 3: Also check refund method columns ────────────────
  console.log('\n── Other Method Columns ───────────────────────────────\n');

  const otherColumns = [
    { table: 'MembershipPaymentRefunds', column: 'refundMethod' },
  ];

  for (const { table, column } of otherColumns) {
    try {
      const [tableCheck] = await sequelize.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${table}' AND table_schema = 'public') as exists`
      );
      if (!tableCheck[0]?.exists) {
        console.log(`  ⏭  ${table}.${column}: table not found, skipping`);
        continue;
      }

      const [colCheck] = await sequelize.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${column}' AND table_schema = 'public') as exists`
      );
      if (!colCheck[0]?.exists) {
        console.log(`  ⏭  ${table}.${column}: column not found, skipping`);
        continue;
      }

      const [distinct] = await sequelize.query(
        `SELECT DISTINCT "${column}" FROM "${table}" ORDER BY "${column}"`
      );
      const values = distinct.map(r => r[column]).filter(Boolean);
      totalStats.scanned++;

      console.log(`  📋 ${table}.${column}: [${values.join(', ')}]`);

      for (const fix of FIXES) {
        if (!values.includes(fix.from)) continue;

        const [countResult] = await sequelize.query(
          `SELECT COUNT(*) as cnt FROM "${table}" WHERE "${column}" = '${fix.from}'`
        );
        const count = parseInt(countResult[0].cnt);
        if (count === 0) continue;

        totalStats.found += count;
        console.log(`     ⚠  "${fix.from}" → "${fix.to}": ${count} record(s)`);

        if (!DRY_RUN) {
          const [, meta] = await sequelize.query(
            `UPDATE "${table}" SET "${column}" = '${fix.to}' WHERE "${column}" = '${fix.from}'`
          );
          totalStats.fixed += (meta.rowCount || count);
          console.log(`     ✅ Fixed ${meta.rowCount || count} record(s)`);
        }
      }
    } catch (err) {
      console.log(`  ❌ ${table}.${column}: ERROR - ${err.message}`);
    }
  }

  // ── Summary ─────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   Tables scanned:    ${totalStats.scanned}`);
  console.log(`   Records to fix:    ${totalStats.found}`);

  if (DRY_RUN) {
    console.log(`\n   🔍 DRY RUN - No changes made.`);
    if (totalStats.found > 0) {
      console.log(`   Run with --apply to fix: node scripts/fixPaymentMethod.js --apply`);
    } else {
      console.log(`   ✅ No inconsistencies found!`);
    }
  } else {
    console.log(`   Records fixed:     ${totalStats.fixed}`);
    console.log(`\n   ✅ Done!`);
  }

  console.log('═══════════════════════════════════════════════════════════\n');

  await sequelize.close();
}

main().catch(async (err) => {
  console.error('\n❌ Fatal error:', err);
  await sequelize.close();
  process.exit(1);
});
