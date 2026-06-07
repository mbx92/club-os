# Scripts Directory

Direktori ini berisi berbagai utility scripts untuk maintenance, testing, dan development.

## Struktur Folder

### 📁 database/
Scripts untuk database operations dan migrations:
- `add-version-column.js` - Menambah kolom version untuk optimistic locking
- `check-columns.js` - Memeriksa struktur kolom database
- `check-enum.js` - Validasi enum values
- `cleanup-discount-tax.js` - Cleanup data discount dan tax
- `verify-data-preserved.js` - Verifikasi data preservation setelah migration
- `schema-before-migration.json` - Backup schema sebelum migration

**Command examples:**
```bash
npm run db:check-columns
node scripts/database/check-columns.js
```

### 📁 logger/
Scripts untuk logger management dan debugging:
- `formatLogChecker.js` - Check format log files
- `formatLogFixer.js` - Fix log format issues
- `test-logger.js` - Test logger functionality
- `logger-check-results.json` - Hasil pemeriksaan logger
- `LOGGER-TOOLS-README.md` - Dokumentasi lengkap logger tools

**Command examples:**
```bash
node scripts/logger/formatLogChecker.js
node scripts/logger/formatLogFixer.js
```

### 📁 cfit/
Scripts untuk CFIT (Culture Fair Intelligence Test):
- `check-cfit-raw.js` - Check raw CFIT data
- `test-cfit-flow.js` - Test CFIT flow
- `test-cfit-scoring.js` - Test scoring system
- `validate-cfit-data.js` - Validasi data CFIT
- `verify-cfit-db.js` - Verifikasi CFIT di database
- `verify-cfit-per-tenant.js` - Verifikasi CFIT per tenant
- `verify-cfit-instructions.js` - Verifikasi instruksi CFIT
- `copy-cfit-to-tenant-a.js` - Copy CFIT data ke tenant

**Related files:**
- `setupCfitImages.js` - Setup CFIT images
- `updateCFITRemoveExamples.js` - Update CFIT remove examples
- `updateCfitWithInstructions.js` - Update dengan instruksi
- `exportCfitWithInstructions.js` - Export dengan instruksi

### 📁 hd-sales/
Scripts untuk HD Sales integration:
- `test-hdsales-integration.js` - Test HD Sales integration
- `test-hdsales-models.js` - Test HD Sales models
- `verify-hdcategories.js` - Verifikasi HD categories
- `verify-hdcategories-full.js` - Verifikasi lengkap HD categories
- `drop-old-hd-tables.js` - Drop tabel HD Sales lama
- `cleanup-hd-tables.sql` - SQL cleanup untuk HD tables

### 📁 testing/
Scripts untuk testing berbagai fitur:
- `test-combined-billing-service-plans.js` - Test combined billing
- `test-health-stream.js` - Test health stream
- `test-invitation-type.js` - Test invitation types
- `test-love-calculation.js` - Test LOVE calculation
- `test-love-scale-mapping.js` - Test LOVE scale mapping
- `test-pdf-generator.js` - Test PDF generation
- `test-print-api.js` - Test print API
- `test-print.js` - Test printing
- `test-printer-stream.js` - Test printer stream
- `test-receipt-template.js` - Test receipt template
- `test-service-plan-trainer.js` - Test service plan trainer
- `test-verify-printer.js` - Test verify printer

**Related files:**
- `testRestaurantModels.js` - Test restaurant models
- `testRestaurantAPI.js` - Test restaurant API

### 📁 utilities/
Scripts utilities lainnya:
- `check-settings-type.js` - Check settings types
- `health-check-output.txt` - Output health check
- `health-check-final.txt` - Final health check results
- `fix-active-service-rollbacks.ps1` - PowerShell script untuk rollback
- `fix-active-service-rollbacks-v2.ps1` - Version 2 rollback script

## Core Scripts (Root Level)

### Route Management
- `generateRoutesMetadata.js` - Generate routes metadata
- `generateRoutesMetadata-v2.js` - V2 route metadata generator
```bash
npm run generate:routes
```

### Feature Management
- `syncFeatures.js` - Sync features dengan subscription plans
```bash
npm run sync:features
npm run sync:features:compare
```

### Database Tools
- `checkDatabaseColumns.js` - Check database columns structure
- `checkSeeders.js` - Check seeders
- `checkLoadedModels.js` - Check loaded models
- `checkModelHealth.js` - Check model health
- `checkControllersHealth.js` - Check controllers health
```bash
npm run db:check-columns
node scripts/checkDatabaseColumns.js
```

### Migration Tools
- `cleanupPartialMigration.js` - Cleanup partial migrations
- `checkMigrationConflicts.js` - Check migration conflicts
- `checkMigrationSync.js` - Check migration sync status
- `fixOrphanMigrations.js` - Fix orphan migrations

### Logger Enhancement
- `enhanceLoggerCalls.ps1` - PowerShell untuk enhance logger calls
- `enhanceLogging.js` - Enhance logging functionality
- `updateIpDetection.js` - Update IP detection
- `addIpToLogs.ps1` - Add IP to logs

### Psychology Test Tools
- `transformEppsQuestions.js` - Transform EPPS questions
- `transformPapiQuestions.js` - Transform PAPI questions

### Revenue & Calculations
- `recalculateInvitationRevenue.js` - Recalculate invitation revenue
- `previewInvitationRevenue.js` - Preview invitation revenue
- `recalculateTodaySessions.js` - Recalculate today's sessions

### Question Management
- `fixQuestionCount.js` - Fix question count issues

### Database Backup & Restore
- `backupDatabase.js` - Create database backup to .sql file
- `restoreDatabase.js` - Restore database from .sql backup

**Command examples:**
```bash
npm run db:backup:dev           # Backup development database
npm run db:backup:production    # Backup production database
npm run google:drive:oauth      # Generate Google OAuth refresh token for My Drive uploads
npm run db:restore:dev          # Restore latest dev backup
npm run db:restore:dev -- backup_dev_gymdb_2024-12-22T10-30-00.sql  # Restore specific backup
```

**⚠️ Important:**
- Always backup before restore
- Production restore requires confirmation
- Backups stored in `backups/` directory
- Auto-cleanup keeps last 10 backups per environment
- If `GOOGLE_DRIVE_BACKUP_ENABLED=true`, backup files are also uploaded to Google Drive
- Frontend can override non-secret Google Drive settings through `tenant.settings.backup.googleDrive`
- Google service-account credentials still stay in environment variables
- For normal My Drive uploads, prefer OAuth refresh token credentials over service accounts

See [DATABASE-BACKUP-RESTORE.md](../docs/DATABASE-BACKUP-RESTORE.md) for full documentation.

## Usage Guidelines

1. **Development Database**: Gunakan `NODE_ENV=development` atau `npm run db:dev:reset`
2. **Test Database**: Gunakan `NODE_ENV=test` atau `npm run db:test:reset`
3. **Production**: Jalankan dengan sangat hati-hati, always backup first!

## Common Workflows

### Reset Database
```bash
npm run db:dev:reset      # Development
npm run db:test:reset      # Test
```

### Generate Metadata
```bash
npm run generate:routes    # Generate routes metadata
npm run sync:features      # Sync features
```

### Check Database
```bash
npm run db:check-columns
npm run db:check-columns -- --table Users
npm run db:check-columns -- --search tenantId
```

## Notes

- Kebanyakan scripts bisa dijalankan langsung dengan `node scripts/path/to/script.js`
- Beberapa scripts memerlukan environment variables yang sudah di-set
- Selalu check script code sebelum menjalankan di production
- Backup database sebelum menjalankan scripts yang mengubah data
