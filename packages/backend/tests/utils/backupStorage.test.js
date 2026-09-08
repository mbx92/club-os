const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  cleanExpiredBackups,
  normalizeBackupRetentionDays,
} = require('../../src/utils/backupStorage');

describe('backupStorage retention', () => {
  let backupDir;

  beforeEach(() => {
    backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'club-os-backup-retention-'));
  });

  afterEach(() => {
    fs.rmSync(backupDir, { recursive: true, force: true });
  });

  function createBackupFile(filename, modifiedAt) {
    const filePath = path.join(backupDir, filename);
    fs.writeFileSync(filePath, filename);
    const date = new Date(modifiedAt);
    fs.utimesSync(filePath, date, date);
    return filePath;
  }

  it('deletes only expired backup files for the requested environment', () => {
    createBackupFile('backup_test_demo_old.sql', '2026-07-01T00:00:00Z');
    createBackupFile('backup_test_demo_recent.json', '2026-09-01T00:00:00Z');
    createBackupFile('backup_production_demo_old.sql', '2026-07-01T00:00:00Z');
    createBackupFile('notes.txt', '2026-07-01T00:00:00Z');

    const result = cleanExpiredBackups({
      backupDir,
      environment: 'test',
      retentionDays: 30,
      now: new Date('2026-09-08T00:00:00Z'),
    });

    expect(result.deleted).toEqual([
      expect.objectContaining({ filename: 'backup_test_demo_old.sql' }),
    ]);
    expect(fs.readdirSync(backupDir).sort()).toEqual([
      'backup_production_demo_old.sql',
      'backup_test_demo_recent.json',
      'notes.txt',
    ]);
  });

  it('normalizes invalid retention values to the configured fallback', () => {
    expect(normalizeBackupRetentionDays('abc', 14)).toBe(14);
    expect(normalizeBackupRetentionDays(0, 14)).toBe(14);
    expect(normalizeBackupRetentionDays(99999, 14)).toBe(3650);
  });
});
