# Auto Backup Database

## Overview

Sistem auto backup secara otomatis membuat salinan database pada interval yang ditentukan. Backup disimpan secara lokal dan/atau dikirim ke penyimpanan eksternal (opsional). Konfigurasi dikelola melalui pengaturan tenant.

---

## Arsitektur

```
Cron Job (node-cron)
    │
    ▼
backupService.js
    ├── pg_dump → file .sql.gz (lokal)
    ├── rotasi file lama (maxBackups)
    └── notifikasi (opsional: email/webhook)
```

---

## Konfigurasi Setting

Pengaturan disimpan di `tenant.settings.backup` (JSONB):

```json
{
  "backup": {
    "enabled": true,
    "schedule": "0 2 * * *",
    "maxBackups": 7,
    "storageType": "local",
    "localPath": "./backups",
    "notifyOnFailure": true,
    "notifyEmail": "admin@gym.com"
  }
}
```

| Field | Type | Default | Keterangan |
|---|---|---|---|
| `enabled` | boolean | `false` | Aktifkan/matikan auto backup |
| `schedule` | string (cron) | `"0 2 * * *"` | Jadwal backup (default: tiap hari pukul 02:00) |
| `maxBackups` | number | `7` | Jumlah file backup yang disimpan (rotasi otomatis) |
| `storageType` | `"local"` | `"local"` | Lokasi penyimpanan |
| `localPath` | string | `"./backups"` | Path folder backup lokal |
| `notifyOnFailure` | boolean | `false` | Kirim notifikasi jika backup gagal |
| `notifyEmail` | string | `null` | Email tujuan notifikasi |

---

## Jadwal Backup (Cron Expression)

| Schedule | Cron |
|---|---|
| Setiap hari pukul 02:00 | `0 2 * * *` |
| Setiap 12 jam | `0 */12 * * *` |
| Setiap hari Minggu pukul 03:00 | `0 3 * * 0` |
| Setiap hari pertama bulan | `0 2 1 * *` |

---

## Implementasi

### 1. Install Dependencies

```bash
npm install node-cron
```

> `pg_dump` sudah tersedia jika PostgreSQL terinstall di server.

### 2. Backup Service

**File:** `src/services/backupService.js`

```javascript
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const logger = require('../utils/logger');
const { Tenant } = require('../models');

/**
 * Jalankan backup untuk satu tenant
 */
async function runBackup(tenantId = null) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dbName = process.env.DB_NAME;
  const dbUser = process.env.DB_USER;
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || 5432;
  const backupDir = path.resolve('./backups');

  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const filename = `backup_${dbName}_${timestamp}.sql.gz`;
  const filepath = path.join(backupDir, filename);

  const cmd = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} ${dbName} | gzip > "${filepath}"`;

  return new Promise((resolve, reject) => {
    exec(cmd, { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD } }, (err) => {
      if (err) {
        logger.error(`[Backup] Gagal: ${err.message}`);
        return reject(err);
      }
      logger.info(`[Backup] Berhasil: ${filename}`);
      resolve(filepath);
    });
  });
}

/**
 * Hapus file backup lama melebihi maxBackups
 */
function rotateBackups(dir, maxBackups) {
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('backup_') && f.endsWith('.sql.gz'))
    .map(f => ({ name: f, time: fs.statSync(path.join(dir, f)).mtime.getTime() }))
    .sort((a, b) => a.time - b.time);

  while (files.length > maxBackups) {
    const oldest = files.shift();
    fs.unlinkSync(path.join(dir, oldest.name));
    logger.info(`[Backup] Rotasi: hapus ${oldest.name}`);
  }
}

// Map untuk menyimpan cron jobs aktif per tenant
const activeJobs = new Map();

/**
 * Daftarkan cron job backup untuk tenant
 */
function scheduleBackup(tenantId, schedule, maxBackups = 7) {
  if (activeJobs.has(tenantId)) {
    activeJobs.get(tenantId).stop();
  }

  const job = cron.schedule(schedule, async () => {
    try {
      const filepath = await runBackup(tenantId);
      rotateBackups(path.dirname(filepath), maxBackups);
    } catch (err) {
      logger.error(`[Backup] Cron job tenant ${tenantId} error: ${err.message}`);
    }
  });

  activeJobs.set(tenantId, job);
  logger.info(`[Backup] Dijadwalkan untuk tenant ${tenantId}: ${schedule}`);
}

/**
 * Inisialisasi semua backup dari DB saat startup
 */
async function initBackupSchedules() {
  const tenants = await Tenant.findAll({ where: { isActive: true } });

  for (const tenant of tenants) {
    const config = tenant.settings?.backup;
    if (config?.enabled && config?.schedule) {
      scheduleBackup(tenant.id, config.schedule, config.maxBackups || 7);
    }
  }

  logger.info(`[Backup] ${tenants.length} tenant dicek, job aktif: ${activeJobs.size}`);
}

module.exports = { runBackup, rotateBackups, scheduleBackup, initBackupSchedules };
```

### 3. Inisialisasi di app.js

```javascript
// src/app.js
const { initBackupSchedules } = require('./services/backupService');

// Setelah DB connect, sebelum listen
initBackupSchedules().catch(err => logger.error('Backup init error:', err));
```

### 4. Migration: tambah default setting backup

```javascript
// migrations/YYYYMMDD-add-backup-settings-to-tenants.js
async up(queryInterface) {
  await queryInterface.sequelize.query(`
    UPDATE "Tenants"
    SET settings = jsonb_set(
      COALESCE(settings, '{}'),
      '{backup}',
      '{"enabled": false, "schedule": "0 2 * * *", "maxBackups": 7, "storageType": "local", "localPath": "./backups", "notifyOnFailure": false}'::jsonb,
      true
    )
    WHERE settings->>'backup' IS NULL
  `);
}
```

### 5. API Endpoints

```
GET    /api/v1/settings/backup              ← baca konfigurasi backup
PUT    /api/v1/settings/backup              ← update konfigurasi
POST   /api/v1/settings/backup/run-now      ← trigger manual backup
GET    /api/v1/settings/backup/list         ← daftar file backup
DELETE /api/v1/settings/backup/:filename    ← hapus file backup
```

---

## Default Setting

Tambahkan ke `DEFAULT_TRANSACTION_SETTINGS` atau buat `DEFAULT_BACKUP_SETTINGS` di `transactionSettingsService.js`:

```javascript
const DEFAULT_BACKUP_SETTINGS = {
  enabled: false,
  schedule: '0 2 * * *',
  maxBackups: 7,
  storageType: 'local',
  localPath: './backups',
  notifyOnFailure: false,
  notifyEmail: null,
};
```

---

## File Backup

File backup disimpan di folder `./backups/` dengan format:

```
backup_gym_db_2026-02-24T02-00-00-000Z.sql.gz
```

Rotasi otomatis: jika `maxBackups = 7`, file tertua dihapus saat file ke-8 dibuat.

---

## Manual Backup via Script

```bash
# Backup manual (existing script)
node scripts/backupDatabase.js

# Atau via API (super admin / tenant admin)
curl -X POST /api/v1/settings/backup/run-now \
  -H "Authorization: Bearer <token>"
```

---

## Keamanan

- File backup **tidak** boleh diakses via URL publik
- Tambahkan `backups/` ke `.gitignore`
- Password database dibaca dari env (`PGPASSWORD`), tidak di-hardcode
- Endpoint backup hanya bisa diakses oleh role `owner` atau super admin

---

## TODO Implementasi

- [ ] Buat `src/services/backupService.js`
- [ ] Tambahkan `initBackupSchedules()` di `src/app.js`
- [ ] Buat migration untuk default backup settings di Tenants
- [ ] Buat controller `src/controllers/gym/settings/backupController.js`
- [ ] Buat route `src/routes/gym/settings/backup.routes.js`
- [ ] Tambahkan ke route index
- [ ] Update `npm run generate:routes`
- [ ] Tambahkan `backups/*.sql.gz` ke `.gitignore`
- [ ] Test: trigger manual, verifikasi rotasi file
