/**
 * Merge Attendance Data into bak_valid_data.sql
 * =====================================================
 * Copies COPY blocks for:
 *   - CheckIns
 *   - DeviceAttendanceLogs
 *   - StaffAttendances
 * from the old production backup into bak_valid_data.sql,
 * replacing the empty COPY blocks that are already there.
 *
 * Usage:
 *   node scripts/mergeAttendanceToValidBackup.js
 *   node scripts/mergeAttendanceToValidBackup.js --dry-run   (preview only)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const SOURCE_FILE = path.join(__dirname, '../db_bak/backup_production_gym_db_2026-02-22T14-48-22.sql');
const TARGET_FILE = path.join(__dirname, '../db_bak/bak_valid_data.sql');
const OUTPUT_FILE = path.join(__dirname, '../db_bak/bak_valid_data.sql'); // overwrite in place
const BACKUP_FILE = path.join(__dirname, '../db_bak/bak_valid_data_before_merge.sql'); // safety backup

const DRY_RUN = process.argv.includes('--dry-run');

const TABLES = [
  'CheckIns',
  'DeviceAttendanceLogs',
  'StaffAttendances',
];

/**
 * Extract the full COPY block for a table from SQL content.
 * Returns the COPY...FROM stdin;\n<rows>\n\. block including header.
 */
function extractCopyBlock(sql, tableName) {
  // Match: COPY public."TableName" (...) FROM stdin;\n<data>\n\.
  const escaped = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    `(COPY public\\.\\s*"${escaped}"[^\\n]+FROM stdin;[\\s\\S]*?\\n\\\\\\.)`,
    'm'
  );
  const match = regex.exec(sql);
  if (!match) return null;
  return match[1];
}

/**
 * Count data rows in a COPY block (lines between FROM stdin; and \.)
 */
function countRows(copyBlock) {
  const lines = copyBlock.split('\n');
  const startIdx = lines.findIndex(l => l.includes('FROM stdin;'));
  if (startIdx === -1) return 0;
  const dataLines = lines.slice(startIdx + 1).filter(l => l.trim() !== '' && l.trim() !== '\\.');
  return dataLines.length;
}

function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   Merge Attendance Data → bak_valid_data.sql          ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Source  : ${path.basename(SOURCE_FILE)}`);
  console.log(`  Target  : ${path.basename(TARGET_FILE)}`);
  console.log(`  Mode    : ${DRY_RUN ? 'DRY RUN (no changes written)' : 'LIVE'}`);
  console.log('');

  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`❌ Source file not found: ${SOURCE_FILE}`);
    process.exit(1);
  }
  if (!fs.existsSync(TARGET_FILE)) {
    console.error(`❌ Target file not found: ${TARGET_FILE}`);
    process.exit(1);
  }

  console.log('📖 Reading files...');
  const sourceSql = fs.readFileSync(SOURCE_FILE, 'utf8');
  let targetSql   = fs.readFileSync(TARGET_FILE, 'utf8');
  console.log(`   Source size: ${(sourceSql.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Target size: ${(targetSql.length / 1024 / 1024).toFixed(2)} MB`);
  console.log('');

  let totalRowsMerged = 0;
  const results = [];

  for (const table of TABLES) {
    process.stdout.write(`  Processing "${table}"... `);

    // 1. Extract populated COPY block from source
    const sourceBlock = extractCopyBlock(sourceSql, table);
    if (!sourceBlock) {
      console.log(`⚠️  Not found in source backup — skipped`);
      results.push({ table, status: 'skipped', reason: 'not in source' });
      continue;
    }

    const sourceRows = countRows(sourceBlock);
    if (sourceRows === 0) {
      console.log(`ℹ️  0 rows in source — skipped`);
      results.push({ table, status: 'skipped', reason: 'empty in source' });
      continue;
    }

    // 2. Find the empty COPY block in target
    const targetBlock = extractCopyBlock(targetSql, table);
    if (!targetBlock) {
      console.log(`⚠️  Not found in target — skipped`);
      results.push({ table, status: 'skipped', reason: 'not in target' });
      continue;
    }

    const targetRows = countRows(targetBlock);

    // 3. Replace empty target block with populated source block
    if (!DRY_RUN) {
      targetSql = targetSql.replace(targetBlock, sourceBlock);
    }

    totalRowsMerged += sourceRows;
    console.log(`✅ ${sourceRows} rows merged (target had ${targetRows})`);
    results.push({ table, status: 'merged', sourceRows, targetRows });
  }

  console.log('');
  console.log('─'.repeat(54));

  if (DRY_RUN) {
    console.log('ℹ️  DRY RUN — no files written.');
  } else if (totalRowsMerged > 0) {
    // Safety backup first
    console.log(`💾 Saving safety backup → ${path.basename(BACKUP_FILE)}`);
    fs.copyFileSync(TARGET_FILE, BACKUP_FILE);

    // Write merged file
    console.log(`💾 Writing merged file  → ${path.basename(OUTPUT_FILE)}`);
    fs.writeFileSync(OUTPUT_FILE, targetSql, 'utf8');

    const newSize = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2);
    console.log(`   New file size: ${newSize} MB`);
  } else {
    console.log('ℹ️  Nothing to merge — target file unchanged.');
  }

  console.log('');
  console.log('📋 Summary:');
  results.forEach(r => {
    if (r.status === 'merged') {
      console.log(`   ✅ ${r.table}: ${r.sourceRows} rows merged`);
    } else {
      console.log(`   ⏭️  ${r.table}: ${r.status} (${r.reason})`);
    }
  });
  console.log(`   Total rows merged: ${totalRowsMerged}`);
  console.log('');

  if (!DRY_RUN && totalRowsMerged > 0) {
    console.log('  Next step: use bak_valid_data.sql for production restore');
    console.log('  Safety backup saved as: bak_valid_data_before_merge.sql');
  }
  console.log('');
}

main();
