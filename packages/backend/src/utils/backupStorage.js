const fs = require('fs');
const path = require('path');

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

module.exports = {
  resolveBackupStorageDir,
  ensureBackupStorageDir,
};
