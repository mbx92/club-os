'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { sequelize } = require('../models');
const {
  analyzeBackupSql,
  buildDropLegacySql,
  isLegacyTable,
} = require('../utils/productionBackupAnalysis');

const BACKEND_ROOT = process.cwd();
const PACKAGES_ROOT = path.resolve(BACKEND_ROOT, '..');

const SOURCE_LOCATIONS = [
  { id: 'backups', dir: path.join(BACKEND_ROOT, 'backups') },
  { id: 'db_bak', dir: path.join(BACKEND_ROOT, 'db_bak') },
  { id: 'packages', dir: PACKAGES_ROOT },
];

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function resolveSourcePath(sourceId) {
  if (!sourceId || typeof sourceId !== 'string') {
    throw new Error('Source ID is required');
  }

  const slash = sourceId.indexOf('/');
  if (slash === -1) throw new Error('Invalid source ID format');

  const locationId = sourceId.slice(0, slash);
  const filename = sourceId.slice(slash + 1);

  if (!filename.endsWith('.sql') || filename.includes('..') || filename.includes('/')) {
    throw new Error('Invalid backup filename');
  }

  const location = SOURCE_LOCATIONS.find(l => l.id === locationId);
  if (!location) throw new Error('Unknown source location');

  const fullPath = path.resolve(location.dir, filename);
  if (!fullPath.startsWith(location.dir)) {
    throw new Error('Invalid source path');
  }

  if (!fs.existsSync(fullPath)) {
    throw new Error('Backup file not found');
  }

  return { fullPath, locationId, filename };
}

function listImportSources() {
  const sources = [];

  for (const { id: locationId, dir } of SOURCE_LOCATIONS) {
    if (!fs.existsSync(dir)) continue;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.sql')) continue;

      const fullPath = path.join(dir, entry.name);
      const stats = fs.statSync(fullPath);

      sources.push({
        id: `${locationId}/${entry.name}`,
        filename: entry.name,
        location: locationId,
        size: stats.size,
        sizeLabel: formatBytes(stats.size),
        modifiedAt: stats.mtime.toISOString(),
      });
    }
  }

  return sources.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
}

function analyzeImportSource(sourceId) {
  const { fullPath, filename, locationId } = resolveSourcePath(sourceId);
  const sql = fs.readFileSync(fullPath, 'utf8');
  const analysis = analyzeBackupSql(sql);
  const stats = fs.statSync(fullPath);

  return {
    sourceId,
    filename,
    location: locationId,
    sizeLabel: formatBytes(stats.size),
    modifiedAt: stats.mtime.toISOString(),
    ...analysis,
    dropSql: buildDropLegacySql(analysis.groups.drop),
  };
}

async function getCurrentDatabaseStatus() {
  const dialect = sequelize.getDialect();
  if (dialect !== 'postgres') {
    return {
      dialect,
      supported: false,
      message: 'Production import tools currently support PostgreSQL only',
    };
  }

  const [tables] = await sequelize.query(`
    SELECT table_name AS "tableName"
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const tableNames = tables.map(r => r.tableName);
  const legacyTables = tableNames.filter(isLegacyTable);

  let pendingMigrations = null;
  let appliedMigrations = null;

  try {
    const [applied] = await sequelize.query(
      'SELECT name FROM "SequelizeMeta" ORDER BY name',
    );
    appliedMigrations = applied.map(r => r.name);

    const migrationsDir = path.join(BACKEND_ROOT, 'src/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.js'))
      .map(f => f.replace(/\.js$/, ''))
      .sort();

    const appliedSet = new Set(appliedMigrations);
    pendingMigrations = files.filter(f => !appliedSet.has(f));
  } catch {
    pendingMigrations = null;
    appliedMigrations = null;
  }

  return {
    dialect,
    supported: true,
    database: process.env.DB_NAME,
    environment: process.env.NODE_ENV,
    host: process.env.DB_HOST,
    tableCount: tableNames.length,
    legacyTables,
    legacyTableCount: legacyTables.length,
    pendingMigrations,
    pendingMigrationCount: pendingMigrations?.length ?? null,
    appliedMigrationCount: appliedMigrations?.length ?? null,
  };
}

async function dropLegacyTablesOnDatabase() {
  const status = await getCurrentDatabaseStatus();
  if (!status.supported) {
    throw new Error(status.message);
  }

  if (status.legacyTableCount === 0) {
    return { dropped: [], message: 'No legacy tables found in current database' };
  }

  const dropped = [];
  for (const table of status.legacyTables) {
    await sequelize.query(`DROP TABLE IF EXISTS public."${table}" CASCADE`);
    dropped.push(table);
  }

  return { dropped, message: `Dropped ${dropped.length} legacy table(s)` };
}

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, {
      cwd: BACKEND_ROOT,
      env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD },
      maxBuffer: 50 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (error) return reject(Object.assign(error, { stderr, stdout }));
      resolve({ stdout, stderr });
    });
  });
}

async function runPendingMigrations() {
  const env = process.env.NODE_ENV || 'development';
  const cmd = `npx sequelize-cli db:migrate --env ${env}`;
  const { stdout, stderr } = await runCommand(cmd);
  return {
    message: 'Migrations executed',
    stdout: stdout?.slice(-2000) || '',
    stderr: stderr?.slice(-1000) || '',
  };
}

async function restoreFromSource(sourceId, { dropDatabase = true } = {}) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Restore from UI is blocked on production environment');
  }

  const { fullPath, filename } = resolveSourcePath(sourceId);
  const dbName = process.env.DB_NAME;
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || '5432';
  const user = process.env.DB_USER;

  if (!dbName || !user || !process.env.DB_PASSWORD) {
    throw new Error('Database configuration is incomplete');
  }

  if (dropDatabase) {
    const terminateSql = `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbName}' AND pid <> pg_backend_pid();`;
    await runCommand(`psql -h ${host} -p ${port} -U ${user} -d postgres -c "${terminateSql}"`);
    await runCommand(`psql -h ${host} -p ${port} -U ${user} -d postgres -c "DROP DATABASE IF EXISTS \\"${dbName}\\""`);
    await runCommand(`psql -h ${host} -p ${port} -U ${user} -d postgres -c "CREATE DATABASE \\"${dbName}\\""`);
  }

  await runCommand(`psql -h ${host} -p ${port} -U ${user} -d ${dbName} -v ON_ERROR_STOP=0 -f "${fullPath}"`);

  return {
    message: 'Backup restored successfully',
    filename,
    database: dbName,
    dropDatabase,
  };
}

module.exports = {
  listImportSources,
  analyzeImportSource,
  getCurrentDatabaseStatus,
  dropLegacyTablesOnDatabase,
  runPendingMigrations,
  restoreFromSource,
};
