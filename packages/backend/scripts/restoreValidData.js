/**
 * Restore Valid Data Script
 * =====================================================
 * Restores production database from:  db_bak/bak_valid_data.sql
 *
 * ⚠️  WARNING: This will DROP all current data and restore from backup!
 *               Run ONLY when you are sure the backup is the correct source.
 *
 * Usage:
 *   node scripts/restoreValidData.js [environment] [--no-drop] [--force]
 *
 * Arguments:
 *   environment   Target .env.<environment> file  (default: production)
 *   --no-drop     Skip DROP/CREATE — restore directly into existing DB
 *                 (useful when schema already matches, avoids connection kill)
 *   --force       Skip interactive confirmation prompt
 *
 * Examples:
 *   node scripts/restoreValidData.js production          # normal production restore
 *   node scripts/restoreValidData.js development         # restore into dev DB
 *   node scripts/restoreValidData.js production --force  # CI / non-interactive
 *   node scripts/restoreValidData.js production --no-drop --force
 *
 * npm shortcuts (see package.json):
 *   npm run db:restore:valid-data           # production, interactive
 *   npm run db:restore:valid-data:force     # production, non-interactive
 */

'use strict';

const { exec }   = require('child_process');
const fs         = require('fs');
const path       = require('path');
const dotenv     = require('dotenv');
const readline   = require('readline');

// ── CLI argument parsing ─────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const env    = args.find(a => !a.startsWith('--')) || process.env.NODE_ENV || 'production';
const noDrop = args.includes('--no-drop');
const force  = args.includes('--force');

// ── Environment / DB config ──────────────────────────────────────────────────
const envFilePath = path.resolve(process.cwd(), `.env.${env}`);
dotenv.config();
if (fs.existsSync(envFilePath)) {
  dotenv.config({ path: envFilePath, override: true });
} else {
  console.warn(`⚠️  .env.${env} not found — using process environment variables`);
}

const dbConfig = {
  user     : process.env.DB_USER,
  password : process.env.DB_PASSWORD,
  database : process.env.DB_NAME,
  host     : process.env.DB_HOST,
  port     : process.env.DB_PORT     || '5432',
  dialect  : process.env.DB_DIALECT  || 'postgres',
};

// ── Backup file location ─────────────────────────────────────────────────────
const BACKUP_FILE = path.join(process.cwd(), 'db_bak', 'bak_valid_data.sql');

// ── Helpers ──────────────────────────────────────────────────────────────────

function runCommand(command, env_vars = {}) {
  return new Promise((resolve, reject) => {
    const pgEnv = { ...process.env, PGPASSWORD: dbConfig.password, ...env_vars };
    exec(command, { env: pgEnv, maxBuffer: 100 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) return reject(Object.assign(error, { stderr }));
      resolve({ stdout, stderr });
    });
  });
}

function formatBytes(bytes) {
  if (bytes < 1024)             return `${bytes} B`;
  if (bytes < 1024 * 1024)      return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function askQuestion(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

// ── Validation ───────────────────────────────────────────────────────────────

function validateConfig() {
  const missing = ['user', 'password', 'database', 'host'].filter(k => !dbConfig[k]);
  if (missing.length) {
    console.error(`❌ Missing DB config from .env.${env}:`, missing.join(', '));
    process.exit(1);
  }
  if (dbConfig.dialect !== 'postgres') {
    console.error(`❌ This script only supports PostgreSQL. Current dialect: ${dbConfig.dialect}`);
    process.exit(1);
  }
  if (!fs.existsSync(BACKUP_FILE)) {
    console.error(`❌ Backup file not found: ${BACKUP_FILE}`);
    process.exit(1);
  }
}

// ── Confirmation prompt ──────────────────────────────────────────────────────

async function confirmRestore() {
  if (force) {
    console.log('ℹ️  --force flag set — skipping confirmation prompt.\n');
    return;
  }

  const stats    = fs.statSync(BACKUP_FILE);
  const fileSize = formatBytes(stats.size);
  const fileMtime = stats.mtime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║            ⚠️   DATABASE RESTORE — VALID DATA                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Source file  : ${BACKUP_FILE}`);
  console.log(`  File size    : ${fileSize}`);
  console.log(`  File date    : ${fileMtime}`);
  console.log('');
  console.log(`  Target ENV   : ${env.toUpperCase()}`);
  console.log(`  Target DB    : ${dbConfig.database}`);
  console.log(`  Host         : ${dbConfig.host}:${dbConfig.port}`);
  console.log(`  User         : ${dbConfig.user}`);
  console.log(`  Mode         : ${noDrop ? 'RESTORE ONLY (no drop)' : 'DROP + RECREATE + RESTORE'}`);
  console.log('');

  if (env === 'production') {
    console.log('  ══════════════════════════════════════════════════════════');
    console.log('  🚨  PRODUCTION ENVIRONMENT DETECTED                       ');
    console.log('      All existing data will be PERMANENTLY REPLACED.        ');
    console.log('  ══════════════════════════════════════════════════════════');
    console.log('');

    const first = await askQuestion('  Type "RESTORE" to confirm: ');
    if (first !== 'RESTORE') {
      console.log('\n  ❌ Restore cancelled — input did not match "RESTORE".');
      process.exit(0);
    }

    const second = await askQuestion(`  Confirm target database name [${dbConfig.database}]: `);
    if (second !== dbConfig.database) {
      console.log(`\n  ❌ Restore cancelled — database name mismatch (got "${second}").`);
      process.exit(0);
    }
  } else {
    const ans = await askQuestion('  Continue? (yes/no): ');
    if (ans.toLowerCase() !== 'yes') {
      console.log('\n  ❌ Restore cancelled.');
      process.exit(0);
    }
  }

  console.log('');
}

// ── Terminate active connections ─────────────────────────────────────────────

async function terminateConnections() {
  console.log(`🔌 Terminating active connections to "${dbConfig.database}"...`);
  const sql = `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbConfig.database}' AND pid <> pg_backend_pid();`;
  const cmd = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d postgres -c "${sql}"`;
  try {
    const { stdout } = await runCommand(cmd);
    const terminated = (stdout.match(/t/g) || []).length;
    if (terminated > 0) console.log(`   Terminated ${terminated} connection(s).`);
    else console.log('   No active connections found.');
  } catch (err) {
    console.warn('   ⚠️  Could not terminate connections (proceeding anyway):', err.message);
  }
}

// ── Drop and recreate DB ─────────────────────────────────────────────────────

async function dropAndRecreateDatabase() {
  console.log(`🗑️  Dropping database "${dbConfig.database}"...`);
  const dropCmd   = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d postgres -c "DROP DATABASE IF EXISTS \\"${dbConfig.database}\\";"`;
  const createCmd = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d postgres -c "CREATE DATABASE \\"${dbConfig.database}\\" WITH OWNER \\"${dbConfig.user}\\";"`;

  await runCommand(dropCmd);
  console.log('   ✅ Dropped.');

  await runCommand(createCmd);
  console.log('   ✅ Recreated.');
}

// ── psql restore ─────────────────────────────────────────────────────────────

async function runRestore() {
  const restoreCmd = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -v ON_ERROR_STOP=0 -f "${BACKUP_FILE}"`;

  console.log('📥 Restoring from backup file...');
  console.log(`   Command: psql ... -d ${dbConfig.database} -f db_bak/bak_valid_data.sql`);
  console.log('   (This may take a while for large files)');
  console.log('');

  const { stdout, stderr } = await runCommand(restoreCmd);

  // Filter out expected informational messages
  const warnings = (stderr || '').split('\n')
    .filter(line => line.trim())
    .filter(line => !line.startsWith('SET')  && !line.startsWith('--'));

  if (warnings.length > 0) {
    console.log('⚠️  psql messages (may include normal notices):');
    warnings.slice(0, 20).forEach(w => console.log(`   ${w}`));
    if (warnings.length > 20) console.log(`   ... and ${warnings.length - 20} more lines`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();

  validateConfig();
  await confirmRestore();

  console.log(`\n⏱️  Starting restore at ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
  console.log('─'.repeat(66));

  if (!noDrop) {
    await terminateConnections();
    await dropAndRecreateDatabase();
  } else {
    console.log('ℹ️  --no-drop: skipping DROP/CREATE, restoring into existing database.');
  }

  await runRestore();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('─'.repeat(66));
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  ✅  RESTORE COMPLETED                                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Database    : ${dbConfig.database}`);
  console.log(`  Host        : ${dbConfig.host}:${dbConfig.port}`);
  console.log(`  Source      : db_bak/bak_valid_data.sql`);
  console.log(`  Duration    : ${elapsed}s`);
  console.log(`  Finished at : ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
  console.log('');
  console.log('  Next steps:');
  console.log('  1. Run migrations if needed:  npx sequelize-cli db:migrate');
  console.log('  2. Restart the application server');
  console.log('');
}

main().catch(err => {
  console.error('\n💥 Restore FAILED:', err.message);
  if (err.stderr) console.error('   psql stderr:', err.stderr.substring(0, 500));
  process.exit(1);
});
