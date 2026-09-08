const fs = require('fs');
const path = require('path');

const DEFAULT_BACKUP_RETENTION_DAYS = 30;
const MAX_BACKUP_RETENTION_DAYS = 3650;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function normalizeBackupRetentionDays(value, fallback = DEFAULT_BACKUP_RETENTION_DAYS) {
  const fallbackNumber = Number.parseInt(fallback, 10);
  const normalizedFallback = Number.isFinite(fallbackNumber) && fallbackNumber > 0
    ? Math.min(fallbackNumber, MAX_BACKUP_RETENTION_DAYS)
    : DEFAULT_BACKUP_RETENTION_DAYS;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return normalizedFallback;
  }

  return Math.min(parsed, MAX_BACKUP_RETENTION_DAYS);
}

function getDefaultBackupRetentionDays() {
  return normalizeBackupRetentionDays(process.env.BACKUP_RETENTION_DAYS, DEFAULT_BACKUP_RETENTION_DAYS);
}

function resolveBackupStorageDir() {
  const configuredDir = String(process.env.BACKUP_STORAGE_DIR || '').trim();

  if (!configuredDir) {
    return path.resolve(process.cwd(), 'backups');
  }

  return path.isAbsolute(configuredDir)
    ? configuredDir
    : path.resolve(process.cwd(), configuredDir);
}

function ensureBackupStorageDir() {
  const backupDir = resolveBackupStorageDir();

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  return backupDir;
}

function cleanExpiredBackups({
  backupDir = ensureBackupStorageDir(),
  environment = process.env.NODE_ENV || 'development',
  extensions = ['.sql', '.json'],
  retentionDays = getDefaultBackupRetentionDays(),
  now = new Date(),
} = {}) {
  const normalizedRetentionDays = normalizeBackupRetentionDays(retentionDays);
  const nowDate = now instanceof Date ? now : new Date(now);
  const cutoffTime = nowDate.getTime() - (normalizedRetentionDays * DAY_IN_MS);

  const deleted = [];

  const files = fs.readdirSync(backupDir)
    .filter(file => file.startsWith(`backup_${environment}_`))
    .filter(file => extensions.some(extension => file.endsWith(extension)));

  files.forEach(file => {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);

    if (stats.mtime.getTime() >= cutoffTime) {
      return;
    }

    fs.unlinkSync(filePath);
    deleted.push({
      filename: file,
      deletedAt: nowDate.toISOString(),
      lastModifiedAt: stats.mtime.toISOString(),
    });
  });

  return {
    retentionDays: normalizedRetentionDays,
    cutoffAt: new Date(cutoffTime).toISOString(),
    deleted,
    deletedCount: deleted.length,
  };
}

module.exports = {
  DEFAULT_BACKUP_RETENTION_DAYS,
  resolveBackupStorageDir,
  ensureBackupStorageDir,
  getDefaultBackupRetentionDays,
  normalizeBackupRetentionDays,
  cleanExpiredBackups,
};
