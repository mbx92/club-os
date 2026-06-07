# Psychology System Separation - Quick Reference

## 🚀 Quick Start

### Prerequisites
- [ ] Full database backup completed
- [ ] Code repository tagged/branched
- [ ] Access to both servers/databases
- [ ] 2-4 weeks timeline available

### Step-by-Step Execution

#### 1️⃣ Initial Setup (Day 1)
```bash
# Backup current database
npm run db:backup:dev

# Create git snapshot
git tag -a pre-separation-$(date +%Y%m%d) -m "Before psychology separation"
git push --tags

# Clone for psychology repository
cd ..
git clone gym-be psychology-be
cd psychology-be
git checkout -b feature/psychology-separation
```

#### 2️⃣ Database Setup (Day 2-3)
```bash
# Update .env for psychology database
cp .env.example .env.psychology

# Edit .env.psychology:
# DB_NAME=psychology_dev
# DB_USER=psychology_user
# PORT=3001

# Create new database
npm run db:dev:create

# Run core migrations only (Tenant, User, Patient, Psychology tables)
npm run db:dev:migrate
```

#### 3️⃣ Data Migration (Day 4-5)
```bash
# Dry run first to check
SOURCE_DB_NAME=gym_dev \
TARGET_DB_NAME=psychology_dev \
node scripts/migration/migratePsychologyData.js --dry-run

# Run actual migration
SOURCE_DB_NAME=gym_dev \
TARGET_DB_NAME=psychology_dev \
node scripts/migration/migratePsychologyData.js

# Verify data integrity
SOURCE_DB_NAME=gym_dev \
TARGET_DB_NAME=psychology_dev \
node scripts/migration/verifyPsychologyData.js --verbose
```

#### 4️⃣ Code Cleanup Psychology Repo (Day 6-8)
```bash
cd psychology-be

# Remove gym-specific files
rm -rf src/controllers/gym/
rm -rf src/controllers/finance/
rm -rf src/controllers/member/
rm -rf src/modules/gym/
rm -rf src/modules/restaurant/
rm -rf src/modules/ticketing/

# Remove gym models (keep: Tenant, User, Patient, Psychology*)
# Remove gym migrations (keep: core + psychology)
# Remove gym docs
# Update package.json
# Update routes/index.js
```

#### 5️⃣ Code Cleanup Gym Repo (Day 9-10)
```bash
cd ../gym-be

# Remove psychology files
rm -rf src/models/psychology*.js
rm -rf src/migrations/*psychology*.js
rm -rf src/modules/psychology/
rm -rf scripts/cfit/
rm -rf public/psychology/
rm -rf docs/soalPsikolog/

# Update routes
# Update feature registry
# Regenerate metadata
npm run generate:routes
npm run sync:features
```

#### 6️⃣ Testing (Day 11-14)
```bash
# Test gym system
cd gym-be
npm run test
npm run dev  # Test manually

# Test psychology system
cd ../psychology-be
npm run test
npm run dev  # Test manually on port 3001

# Integration testing
# - Create patient in gym
# - Use patient in psychology order
# - Verify patient sync works
```

#### 7️⃣ Deployment (Day 15-17)
```bash
# Production database setup
# Server configuration
# PM2 setup
# Nginx reverse proxy
# SSL certificates
# Monitoring & alerts
```

---

## 📋 File Checklist

### Psychology Repo - Files to KEEP
```
✅ src/models/
   ✅ tenant.js
   ✅ user.js
   ✅ role.js
   ✅ patient.js
   ✅ psychology*.js (all 10 files)
   ✅ subscription*.js
   ❌ member*.js
   ❌ product*.js
   ❌ transaction*.js
   ❌ voucher*.js
   ❌ service*.js

✅ src/modules/psychology/
   ✅ controllers/
   ✅ routes/
   ✅ services/
   ✅ validators/

✅ public/psychology/
✅ uploads/psychology/
✅ docs/soalPsikolog/
✅ scripts/cfit/

❌ src/modules/gym/
❌ src/modules/restaurant/
❌ src/modules/ticketing/
❌ src/controllers/gym/
❌ docs/gym-modul-docs/
```

### Gym Repo - Files to REMOVE
```
❌ src/models/psychology*.js (all 10 files)
❌ src/migrations/*psychology*.js (15 files)
❌ src/modules/psychology/
❌ public/psychology/
❌ uploads/psychology/
❌ docs/soalPsikolog/
❌ docs/frontend-integration/CFIT*.md
❌ scripts/cfit/
❌ scripts/*psychology*.js
```

---

## 🔧 Configuration Files

### Psychology .env
```env
NODE_ENV=development
PORT=3001

# Database
DB_NAME=psychology_dev
DB_USER=psychology_user
DB_PASSWORD=your_password
DB_HOST=localhost

# JWT (can be same as gym for shared auth)
JWT_SECRET=shared-secret-12345
JWT_EXPIRES_IN=7d

# Integration with gym system
GYM_API_URL=http://localhost:3000
GYM_API_KEY=service-account-key-xyz

# Other configs...
```

### Gym .env (Updated)
```env
NODE_ENV=development
PORT=3000

# Database
DB_NAME=gym_dev
DB_USER=gym_user
DB_PASSWORD=your_password
DB_HOST=localhost

# JWT (shared secret for cross-system auth)
JWT_SECRET=shared-secret-12345
JWT_EXPIRES_IN=7d

# Integration with psychology system
PSYCHOLOGY_API_URL=http://localhost:3001
PSYCHOLOGY_API_KEY=service-account-key-abc

# Other configs...
```

---

## 🔍 Verification Commands

### Count Check
```sql
-- In gym_dev database
SELECT COUNT(*) FROM PsychologyOrders;
SELECT COUNT(*) FROM PsychologyPackages;
SELECT COUNT(*) FROM PsychologySessions;

-- In psychology_dev database (should match)
SELECT COUNT(*) FROM PsychologyOrders;
SELECT COUNT(*) FROM PsychologyPackages;
SELECT COUNT(*) FROM PsychologySessions;
```

### Foreign Key Check
```sql
-- Check for orphaned psychology orders
SELECT COUNT(*) 
FROM PsychologyOrders po
LEFT JOIN Patients p ON po.patientId = p.id
WHERE p.id IS NULL;
-- Should return 0

SELECT COUNT(*) 
FROM PsychologyOrders po
LEFT JOIN PsychologyPackages pp ON po.packageId = pp.id
WHERE pp.id IS NULL;
-- Should return 0
```

### Tenant Isolation Check
```sql
-- Check cross-tenant violations
SELECT COUNT(*)
FROM PsychologyOrders po
JOIN Patients p ON po.patientId = p.id
WHERE po.tenantId != p.tenantId;
-- Should return 0
```

---

## 🐛 Troubleshooting

### Issue: Migration fails with foreign key error
**Solution:**
```bash
# Check migration order in migratePsychologyData.js
# Ensure Tenants → Users → Patients → Psychology tables order
# Disable foreign key checks temporarily if needed
```

### Issue: Duplicate key errors during migration
**Solution:**
```sql
-- Check for existing data in target database
TRUNCATE TABLE PsychologyOrders;
TRUNCATE TABLE PsychologySessions;
-- etc... then re-run migration
```

### Issue: Authentication not working across systems
**Solution:**
```bash
# Ensure both systems use same JWT_SECRET
# Check JWT token expiry settings
# Verify CORS headers allow cross-origin
```

### Issue: Patient data not syncing
**Solution:**
```javascript
// Check GYM_API_URL is correct
// Check GYM_API_KEY is valid
// Check network connectivity between systems
// Check logs in both systems
```

---

## 📊 Success Metrics

After separation is complete, verify:

- [ ] Both systems run independently
- [ ] All psychology tests pass (npm test)
- [ ] All gym tests pass (npm test)
- [ ] Patient sync works correctly
- [ ] Authentication works across systems
- [ ] No cross-database queries
- [ ] Performance is acceptable (<200ms API response)
- [ ] Monitoring & logs working
- [ ] Backup strategy in place

---

## 🆘 Rollback Plan

If migration fails:

```bash
# 1. Stop both applications
pm2 stop gym-be
pm2 stop psychology-be

# 2. Restore database from backup
mysql -u root -p gym_dev < backup_gym_dev_YYYY-MM-DD.sql

# 3. Revert code changes
git checkout main
git reset --hard pre-separation-YYYYMMDD

# 4. Restart original system
pm2 start gym-be
```

---

## 📞 Support Contacts

- **Database Issues:** [DBA Name/Team]
- **Infrastructure:** [DevOps Team]
- **Architecture:** [Tech Lead]
- **Emergency:** [On-call rotation]

---

## 📚 Related Documentation

- [docs/SEPARATION-GUIDE.md](./SEPARATION-GUIDE.md) - Complete guide
- [docs/TRANSACTION-ARCHITECTURE.md](./TRANSACTION-ARCHITECTURE.md) - Gym transactions
- [docs/SAAS-APPLICATION-FLOW.md](./SAAS-APPLICATION-FLOW.md) - Multi-tenant flow
- [scripts/migration/README.md](../scripts/migration/README.md) - Migration scripts

---

**Last Updated:** January 28, 2026
**Status:** Ready for execution
