# Psychology Data Migration Scripts

This directory contains scripts for migrating psychology system data from the gym database to a separate psychology database.

## Scripts

### 1. migratePsychologyData.js
Migrates all psychology-related data from source database to target database.

**Usage:**
```bash
# Dry run (preview without making changes)
SOURCE_DB_NAME=gym_dev \
TARGET_DB_NAME=psychology_dev \
node scripts/migration/migratePsychologyData.js --dry-run

# Actual migration
SOURCE_DB_NAME=gym_dev \
TARGET_DB_NAME=psychology_dev \
node scripts/migration/migratePsychologyData.js

# Migrate specific tables only
SOURCE_DB_NAME=gym_dev \
TARGET_DB_NAME=psychology_dev \
node scripts/migration/migratePsychologyData.js --tables=Tenants,Users,PsychologyOrders
```

**Environment Variables:**
- `SOURCE_DB_NAME` - Source database name (e.g., gym_dev)
- `SOURCE_DB_USER` - Source database user (default: root)
- `SOURCE_DB_PASSWORD` - Source database password
- `SOURCE_DB_HOST` - Source database host (default: localhost)
- `TARGET_DB_NAME` - Target database name (e.g., psychology_dev)
- `TARGET_DB_USER` - Target database user (default: root)
- `TARGET_DB_PASSWORD` - Target database password
- `TARGET_DB_HOST` - Target database host (default: localhost)

**What it does:**
1. Identifies tenants with psychology data
2. Migrates tenants, users, and patients for those tenants
3. Migrates all psychology tables in correct order (respecting foreign keys)
4. Uses INSERT ... ON DUPLICATE KEY UPDATE for idempotency
5. Provides detailed statistics and logging

**Output:**
- Console logs with progress
- Log file: `logs/psychology-migration.log`
- Statistics summary at end

### 2. verifyPsychologyData.js
Verifies data integrity after migration.

**Usage:**
```bash
# Basic verification
SOURCE_DB_NAME=gym_dev \
TARGET_DB_NAME=psychology_dev \
node scripts/migration/verifyPsychologyData.js

# Verbose output
SOURCE_DB_NAME=gym_dev \
TARGET_DB_NAME=psychology_dev \
node scripts/migration/verifyPsychologyData.js --verbose
```

**Environment Variables:**
Same as migratePsychologyData.js

**Verification Checks:**
1. **Record Counts** - Ensures all records were migrated
2. **Foreign Keys** - Checks for orphaned records
3. **Tenant Integrity** - Validates multi-tenancy isolation
4. **Data Consistency** - Checks business logic constraints
5. **Sample Data** - Compares sample records between databases

**Output:**
- Console logs with verification results
- Log file: `logs/psychology-verification.log`
- Exit code 0 if all checks pass, 1 if any fail

## Migration Process

### Prerequisites
1. Backup both databases
2. Target database must exist
3. Target database schema must be created (run migrations)
4. Sufficient disk space and database permissions

### Recommended Steps

**Step 1: Dry Run**
```bash
SOURCE_DB_NAME=gym_dev \
TARGET_DB_NAME=psychology_dev \
node scripts/migration/migratePsychologyData.js --dry-run
```
Review output to understand what will be migrated.

**Step 2: Actual Migration**
```bash
SOURCE_DB_NAME=gym_dev \
TARGET_DB_NAME=psychology_dev \
node scripts/migration/migratePsychologyData.js
```
Monitor logs for any errors.

**Step 3: Verification**
```bash
SOURCE_DB_NAME=gym_dev \
TARGET_DB_NAME=psychology_dev \
node scripts/migration/verifyPsychologyData.js --verbose
```
Ensure all checks pass before proceeding.

**Step 4: Manual Spot Checks**
```sql
-- Compare record counts
SELECT 'PsychologyOrders' as table_name, COUNT(*) as count FROM gym_dev.PsychologyOrders
UNION ALL
SELECT 'PsychologyOrders', COUNT(*) FROM psychology_dev.PsychologyOrders;

-- Check specific records
SELECT * FROM gym_dev.PsychologyOrders WHERE id = 123;
SELECT * FROM psychology_dev.PsychologyOrders WHERE id = 123;
```

## Tables Migrated

### Shared Tables (Only psychology-related records)
- `Tenants` - Only tenants with psychology data
- `Users` - Only users from psychology tenants
- `Patients` - Only patients from psychology tenants

### Psychology-Specific Tables (All records)
- `PsychologyTestTypes`
- `PsychologyPackages`
- `PsychologyPackageItems`
- `PsychologyPriceRules`
- `PsychologyInvitations`
- `PsychologyOrders`
- `PsychologySessions`
- `PsychologyNorms`
- `PsychologySettings`
- `PsychologyReportCache`

## Troubleshooting

### Issue: "Table doesn't exist"
**Cause:** Target database schema not created
**Solution:**
```bash
cd psychology-be
npm run db:dev:migrate
```

### Issue: "Duplicate entry"
**Cause:** Target database already has data
**Solution:**
```sql
-- Option 1: Truncate tables (careful!)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE PsychologyOrders;
TRUNCATE TABLE PsychologySessions;
-- ... etc
SET FOREIGN_KEY_CHECKS = 1;

-- Option 2: Drop and recreate database
DROP DATABASE psychology_dev;
CREATE DATABASE psychology_dev;
```

### Issue: "Foreign key constraint fails"
**Cause:** Migration order incorrect or missing parent records
**Solution:**
- Check migration order in script (should be: Tenants → Users → Patients → Psychology tables)
- Ensure --tables parameter includes all dependencies

### Issue: "Access denied"
**Cause:** Database user permissions
**Solution:**
```sql
GRANT ALL PRIVILEGES ON psychology_dev.* TO 'psychology_user'@'localhost';
FLUSH PRIVILEGES;
```

### Issue: Verification fails with orphaned records
**Cause:** Data inconsistency in source database
**Solution:**
```sql
-- Find and fix orphaned records in source before migration
SELECT * FROM PsychologyOrders po
LEFT JOIN Patients p ON po.patientId = p.id
WHERE p.id IS NULL;
```

## Performance Considerations

- **Small datasets (<10k records):** Migration should complete in seconds
- **Medium datasets (10k-100k records):** May take several minutes
- **Large datasets (>100k records):** Consider batching or parallel migration

**To improve performance:**
1. Disable indexes temporarily on target (recreate after)
2. Increase MySQL buffer sizes
3. Use transaction batching (modify script)
4. Run during off-peak hours

## Rollback

If migration fails or data is incorrect:

```bash
# 1. Restore target database from backup
mysql -u root -p psychology_dev < backup_psychology_dev_before_migration.sql

# 2. Or drop and recreate
mysql -u root -p -e "DROP DATABASE psychology_dev; CREATE DATABASE psychology_dev;"

# 3. Re-run migrations
cd psychology-be
npm run db:dev:migrate

# 4. Try migration again with fixes
```

## Security Notes

- Never commit database credentials to git
- Use environment variables for all sensitive data
- Ensure backup files are encrypted and stored securely
- Test migration in staging environment first
- Verify no sensitive data is exposed in logs

## Related Documentation

- [../../docs/SEPARATION-GUIDE.md](../../docs/SEPARATION-GUIDE.md) - Complete separation guide
- [../../docs/SEPARATION-QUICK-REFERENCE.md](../../docs/SEPARATION-QUICK-REFERENCE.md) - Quick reference
- [../../docs/DATABASE-COLUMN-CHECKER.md](../../docs/DATABASE-COLUMN-CHECKER.md) - Database structure checker

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review log files in `logs/` directory
3. Contact database administrator
4. Create issue with relevant log excerpts

---

**Last Updated:** January 28, 2026
