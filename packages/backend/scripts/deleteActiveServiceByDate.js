/**
 * Delete ActiveService records by date
 * =====================================================
 * Deletes ActiveService rows where startDate = target date.
 *
 * Usage:
 *   node scripts/deleteActiveServiceByDate.js [date] [--force]
 *
 * Arguments:
 *   date     YYYY-MM-DD  (default: 2026-02-19)
 *   --force  Skip confirmation prompt
 *
 * Examples:
 *   node scripts/deleteActiveServiceByDate.js 2026-02-19
 *   node scripts/deleteActiveServiceByDate.js 2026-02-19 --force
 */

'use strict';

const path    = require('path');
const dotenv  = require('dotenv');
const readline = require('readline');

// ── Env ──────────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const force      = args.includes('--force');
const targetDate = args.find(a => /^\d{4}-\d{2}-\d{2}$/.test(a)) || '2026-02-19';

const envFile = path.resolve(process.cwd(), '.env.development');
dotenv.config();
if (require('fs').existsSync(envFile)) dotenv.config({ path: envFile, override: true });

// ── Models ───────────────────────────────────────────────────────────────────
const { ActiveService, Transaction, sequelize } = require('../src/models');
const { Op } = require('sequelize');

// ── Helpers ──────────────────────────────────────────────────────────────────
async function askQuestion(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(r => rl.question(q, a => { rl.close(); r(a.trim()); }));
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  try {
    // Preview records that will be deleted
    const records = await ActiveService.findAll({
      where: { startDate: targetDate },
      attributes: ['id', 'memberId', 'customerName', 'servicePlanId', 'startDate', 'endDate', 'status', 'purchaseTransactionId'],
      raw: true,
    });

    if (records.length === 0) {
      console.log(`\nℹ️  No ActiveService records found with startDate = ${targetDate}`);
      await sequelize.close();
      return;
    }

    console.log(`\n⚠️  Found ${records.length} ActiveService record(s) with startDate = ${targetDate}:\n`);
    records.forEach((r, i) => {
      console.log(`  [${i + 1}] id             : ${r.id}`);
      console.log(`      memberId       : ${r.memberId || '(walk-in)'}`);
      console.log(`      customerName   : ${r.customerName || '-'}`);
      console.log(`      startDate      : ${r.startDate}`);
      console.log(`      endDate        : ${r.endDate}`);
      console.log(`      status         : ${r.status}`);
      console.log(`      transactionId  : ${r.purchaseTransactionId || '-'}`);
      console.log('');
    });

    if (!force) {
      const ans = await askQuestion('  Delete all of the above? (yes/no): ');
      if (ans.toLowerCase() !== 'yes') {
        console.log('\n❌ Cancelled.');
        await sequelize.close();
        return;
      }
    }

    const deleted = await ActiveService.destroy({
      where: { startDate: targetDate },
    });

    console.log(`\n✅ Deleted ${deleted} ActiveService record(s) with startDate = ${targetDate}`);
  } catch (err) {
    console.error('\n💥 Error:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
