'use strict';

const fs = require('fs');
const path = require('path');
const { analyzeBackupSql } = require('../src/utils/productionBackupAnalysis');

const DEFAULT_BACKUP = path.resolve(
  __dirname,
  '../../backup_production_gym_db_fix_2026-06-10T06-30-00.sql',
);

function parseArgs() {
  const args = process.argv.slice(2);
  const dropSql = args.includes('--drop-sql');
  const fileArg = args.find(a => !a.startsWith('--'));
  const backupPath = fileArg ? path.resolve(fileArg) : DEFAULT_BACKUP;
  return { backupPath, dropSql };
}

function main() {
  const { backupPath, dropSql } = parseArgs();

  if (!fs.existsSync(backupPath)) {
    console.error(`Backup not found: ${backupPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(backupPath, 'utf8');
  const analysis = analyzeBackupSql(sql);

  if (dropSql) {
    process.stdout.write(analysis.dropSql);
    return;
  }

  const mb = (fs.statSync(backupPath).size / 1024 / 1024).toFixed(2);
  console.log('\nProduction backup analysis');
  console.log('─'.repeat(60));
  console.log(`File   : ${backupPath}`);
  console.log(`Size   : ${mb} MB`);
  console.log(`Tables : ${analysis.tableCount}`);
  console.log('');

  const print = (label, list, note) => {
    console.log(`${label} (${list.length})${note ? ` — ${note}` : ''}`);
    list.forEach(t => console.log(`  • ${t}`));
    console.log('');
  };

  print('KEEP — data bisnis inti (sesuai model sekarang)', analysis.groups.keep);
  print('DROP — modul lama / tidak dipakai codebase', analysis.groups.drop);
  print('SKIP — jangan restore dari prod', analysis.groups.skip, 'gunakan hasil db:migrate');
  print('REVIEW — perlu keputusan manual', analysis.groups.review);
}

main();
