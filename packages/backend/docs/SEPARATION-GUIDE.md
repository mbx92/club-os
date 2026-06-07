# Panduan Pemisahan Psychology System dan Gym System

## 📋 Executive Summary

Dokumen ini memberikan panduan lengkap untuk memisahkan Psychology System dari Gym System menjadi **2 repository terpisah** dengan **database terpisah**.

**Status Saat Ini:**
- 1 Repository: `gym-be`
- 1 Database: Multi-tenant dengan tabel untuk gym dan psychology
- Psychology sebagai module di dalam `src/modules/psychology/`

**Target Akhir:**
- **Repository 1**: `gym-be` (Gym Management SaaS)
- **Repository 2**: `psychology-be` (Psychology Testing SaaS)
- **Database 1**: `gym_db` (untuk gym system)
- **Database 2**: `psychology_db` (untuk psychology system)

---

## 🔍 Analisis Komponen Psychology System

### 1. **Models Psychology** (10 models)
Located in: `src/models/`

```
✓ psychologyTestType.js           - Tipe tes psikologi (CFIT, PAPI, EPPS, dll)
✓ psychologyPackage.js             - Paket layanan psikologi
✓ psychologyPackageItem.js         - Item dalam paket
✓ psychologyPriceRule.js           - Aturan harga dinamis
✓ psychologyOrder.js               - Order/transaksi psikologi
✓ psychologyInvitation.js          - Undangan tes psikologi
✓ psychologySession.js             - Sesi pengerjaan tes
✓ psychologyNorm.js                - Norma scoring tes
✓ psychologySettings.js            - Pengaturan sistem psikologi
✓ psychologyReportCache.js         - Cache laporan hasil tes
```

### 2. **Migrations Psychology** (15 migrations)
Located in: `src/migrations/`

```
✓ 20251128100001-create-psychology-test-types.js
✓ 20251128100003-create-psychology-packages.js
✓ 20251128100004-create-psychology-package-items.js
✓ 20251128100005-create-psychology-price-rules.js
✓ 20251128100006-create-psychology-orders.js
✓ 20251128100007-create-psychology-sessions.js
✓ 20251128100008-create-psychology-invitations.js
✓ 20251129100001-add-category-to-psychology-test-types.js
✓ 20251129100002-add-ip-useragent-to-psychology-sessions.js
✓ 20251130000001-fix-psychology-orders-accesstoken-nullable.js
✓ 20251130000002-add-invitationId-to-psychology-orders.js
✓ 20251202100001-create-psychology-report-cache.js
✓ 20251203110000-create-psychology-settings.js
✓ 20251203120000-alter-psychology-settings-text-fields.js
✓ 20251208164510-create-psychology-norms.js
```

### 3. **Module Psychology**
Located in: `src/modules/psychology/`

```
psychology/
├── controllers/      - Business logic untuk psychology
├── routes/          - API endpoints psychology
├── services/        - Service layer psychology
└── validators/      - Request validation psychology
```

### 4. **Supporting Files**

**Public Assets:**
```
public/psychology/           - File assets untuk tes psikologi
uploads/psychology/          - Upload file psikologi
uploads/psychology-reports/  - Generated reports
```

**Documentation:**
```
docs/soalPsikolog/          - Dokumentasi soal psikologi
docs/frontend-integration/  - Dokumentasi integrasi frontend psychology
  ├── CFIT-*.md
  ├── EPPS-*.md
  ├── PAPI-*.md
  └── ...
```

**Scripts:**
```
scripts/cfit/                      - Scripts untuk CFIT test
scripts/exportCfitWithInstructions.js
scripts/fixQuestionCount.js
scripts/previewInvitationRevenue.js
scripts/recalculateInvitationRevenue.js
scripts/recalculateTodaySessions.js
scripts/setupCfitImages.js
scripts/transformEppsQuestions.js
scripts/transformPapiQuestions.js
scripts/updateCfitWithInstructions.js
scripts/updateCFITRemoveExamples.js
```

### 5. **Shared Dependencies**

**Models yang Dipakai Bersama:**
- ✅ `Tenant` - Multi-tenancy (HARUS TETAP DI KEDUA SISTEM)
- ✅ `User` - User authentication (HARUS TETAP DI KEDUA SISTEM)
- ✅ `Patient` - Data pasien (REFERENSI DARI PSYCHOLOGY)

**Middleware yang Dipakai Bersama:**
- ✅ `authMiddleware.js` - Authentication JWT
- ✅ `caslMiddleware.js` - Authorization CASL
- ✅ `featureGateMiddleware.js` - Feature gating per subscription

**Utils yang Dipakai Bersama:**
- ✅ `logger.js` - Logging system
- ✅ `casl.js` - Permission system
- ✅ `concurrency.js` - Race condition prevention
- ✅ `featureRegistry.js` - Subscription features (PERLU SPLIT)

---

## 🎯 Strategi Pemisahan

### **Option 1: Hard Separation (Recommended)** ⭐

**Keuntungan:**
- ✅ Benar-benar independen
- ✅ Scalability lebih baik
- ✅ Deployment terpisah
- ✅ Tim development terpisah
- ✅ Database overhead minimal

**Kekurangan:**
- ⚠️ Data migration lebih kompleks
- ⚠️ Perlu API gateway atau inter-service communication
- ⚠️ Shared authentication perlu JWT/OAuth

### **Option 2: Soft Separation dengan Shared Database**

**Keuntungan:**
- ✅ Migration lebih mudah
- ✅ Tetap bisa join query cross-system
- ✅ Shared authentication langsung

**Kekurangan:**
- ❌ Tidak benar-benar terpisah
- ❌ Coupling masih tinggi
- ❌ Sulit untuk scale independently

---

## 📝 Step-by-Step Pemisahan (Hard Separation)

### **FASE 1: Persiapan & Analisis** (1-2 hari)

#### Step 1.1: Backup Database & Code
```bash
# Backup database development
npm run db:backup:dev

# Backup code
git clone gym-be psychology-be
cd psychology-be
git checkout -b feature/psychology-separation

# Create snapshot tag
git tag -a snapshot-before-separation -m "Before psychology separation"
```

#### Step 1.2: Analisis Dependencies
```bash
# Cari semua referensi psychology di codebase
grep -r "psychology\|Psychology" src/ --exclude-dir=modules

# Cari shared models
grep -r "Patient\|Tenant\|User" src/modules/psychology/ -l

# Cek foreign keys di database
npm run db:check-columns -- --search psychology
```

#### Step 1.3: Dokumentasi API Contracts
- Dokumentasikan semua API endpoints psychology (`/api/v1/psychology/*`)
- Dokumentasikan shared data models (Tenant, User, Patient)
- Dokumentasikan authentication flow

---

### **FASE 2: Setup Psychology Repository** (2-3 hari)

#### Step 2.1: Buat Repository Baru
```bash
# Clone dari existing repo
cd ..
git clone gym-be psychology-be
cd psychology-be

# Rename repository
npm pkg set name="psychology-testing-api"
npm pkg set description="Multi-tenant SaaS API for Psychological Testing"

# Update README
# (Create new README specific to psychology system)
```

#### Step 2.2: Clean Up Gym Files dari Psychology Repo
```bash
cd psychology-be

# Hapus controllers gym
rm -rf src/controllers/gym/
rm -rf src/controllers/finance/
rm -rf src/controllers/member/
rm -rf src/controllers/dashboard/
rm -rf src/controllers/voucher/

# Hapus models gym
rm src/models/member*.js
rm src/models/membership*.js
rm src/models/product*.js
rm src/models/transaction*.js
rm src/models/voucher*.js
rm src/models/service*.js
# (dan model gym lainnya - lihat list di bawah)

# Hapus modules gym
rm -rf src/modules/gym/
rm -rf src/modules/restaurant/
rm -rf src/modules/ticketing/

# Hapus migrations gym (HATI-HATI!)
# Jangan hapus migrations untuk Tenant, User, Patient
# Hapus hanya migrations yang terkait gym

# Hapus docs gym
rm -rf docs/gym-modul-docs/
rm docs/TRANSACTION-ARCHITECTURE.md
rm docs/BILLING-*.md
# (Keep only psychology related docs)
```

#### Step 2.3: Reorganize Structure Psychology
```bash
# Pindahkan module psychology ke root
mv src/modules/psychology/controllers/* src/controllers/psychology/
mv src/modules/psychology/routes/* src/routes/psychology/
mv src/modules/psychology/services/* src/services/psychology/
mv src/modules/psychology/validators/* src/validators/psychology/

# Hapus folder module lama
rm -rf src/modules/

# Update routes/index.js
# (Update untuk hanya load psychology routes)
```

---

### **FASE 3: Database Separation** (3-4 hari)

#### Step 3.1: Buat Database Baru untuk Psychology
```javascript
// Update src/config/config.js
module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'psychology_dev', // ← Changed
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    // ... rest of config
  },
  // ... test & production configs
};
```

```bash
# Create new database
npm run db:dev:create

# Migrate shared tables (Tenant, User, Patient)
# Run migrations in order:
# 1. Tenant related migrations
# 2. User related migrations  
# 3. Patient related migrations
# 4. Psychology specific migrations

npm run db:dev:migrate
```

#### Step 3.2: Data Migration Script
```javascript
// scripts/migratePsychologyData.js
const sourceDb = require('../src/models'); // gym-be connection
const targetDb = require('../src/models'); // psychology-be connection

async function migratePsychologyData() {
  try {
    console.log('🔄 Starting psychology data migration...');
    
    // 1. Migrate Tenants yang punya data psychology
    const tenantsWithPsychology = await sourceDb.sequelize.query(`
      SELECT DISTINCT t.* FROM Tenants t
      INNER JOIN PsychologyOrders po ON t.id = po.tenantId
    `, { type: QueryTypes.SELECT });
    
    await targetDb.Tenant.bulkCreate(tenantsWithPsychology, {
      updateOnDuplicate: ['id', 'name', 'code', /* ... */]
    });
    
    // 2. Migrate Users yang terkait psychology
    const usersWithPsychology = await sourceDb.sequelize.query(`
      SELECT DISTINCT u.* FROM Users u
      WHERE u.tenantId IN (
        SELECT DISTINCT tenantId FROM PsychologyOrders
      )
    `, { type: QueryTypes.SELECT });
    
    await targetDb.User.bulkCreate(usersWithPsychology, {
      updateOnDuplicate: ['id', 'email', /* ... */]
    });
    
    // 3. Migrate Patients
    const patients = await sourceDb.Patient.findAll({
      include: [{ model: sourceDb.PsychologyOrder }]
    });
    
    await targetDb.Patient.bulkCreate(
      patients.map(p => p.toJSON()),
      { updateOnDuplicate: ['id', 'name', /* ... */] }
    );
    
    // 4. Migrate Psychology specific tables
    await migratePsychologyTestTypes();
    await migratePsychologyPackages();
    await migratePsychologyOrders();
    await migratePsychologySessions();
    // ... etc
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}
```

#### Step 3.3: Verify Data Integrity
```bash
# Run data verification script
node scripts/verifyPsychologyData.js

# Check counts match
# Check foreign keys integrity
# Check no orphaned records
```

---

### **FASE 4: Update Authentication & Authorization** (2-3 hari)

#### Step 4.1: Shared Authentication (JWT)

**Option A: Same JWT Secret (Simple)**
```javascript
// .env for both systems
JWT_SECRET=same-secret-key-for-both-systems-12345
JWT_EXPIRES_IN=7d

// Both systems can verify each other's tokens
```

**Option B: OAuth2 / SSO (Better for production)**
```javascript
// Implement OAuth2 provider (e.g., using passport)
// Or use external service like Auth0, Keycloak

// psychology-be verifies tokens from gym-be auth server
```

#### Step 4.2: Update CASL Permissions
```javascript
// psychology-be/src/utils/casl.js
// Keep only psychology-related permissions

function abilityBuilder(user) {
  const { can, cannot, build } = new AbilityBuilder(Ability);
  
  if (user.isSuperAdmin) {
    can('manage', 'all');
  } else {
    // Psychology-specific permissions only
    can('read', 'PsychologyPackage');
    can('read', 'PsychologyTestType');
    can('create', 'PsychologyOrder');
    can('read', 'PsychologySession');
    // ... etc
  }
  
  return build();
}
```

#### Step 4.3: Update Feature Registry
```javascript
// psychology-be/src/utils/featureRegistry.js
// Split feature registry - keep only psychology features

const FEATURE_REGISTRY = {
  modules: {
    psychology: true,
    // Remove: gym, pos, restaurant, classes
  },
  limits: {
    maxUsers: 10,
    maxPsychologyOrders: 100,
    maxPatients: 500,
    // Remove gym-specific limits
  },
  features: {
    advancedReports: true,
    bulkInvitations: true,
    customNorms: false,
    // Remove gym-specific features
  }
};
```

---

### **FASE 5: API Integration** (3-4 hari)

#### Step 5.1: Patient Data Sync

**Psychology System needs Patient data from Gym System**

**Option A: API Integration (Recommended)**
```javascript
// psychology-be/src/services/patientSyncService.js
const axios = require('axios');

class PatientSyncService {
  async syncPatientFromGym(patientId, tenantId) {
    try {
      // Call gym-be API
      const response = await axios.get(
        `${process.env.GYM_API_URL}/api/v1/patients/${patientId}`,
        {
          headers: {
            'Authorization': `Bearer ${serviceAccountToken}`,
            'X-Tenant-ID': tenantId
          }
        }
      );
      
      // Sync to local database
      const patient = await this.db.Patient.upsert({
        id: response.data.id,
        name: response.data.name,
        email: response.data.email,
        phone: response.data.phone,
        tenantId: response.data.tenantId,
        // ... other fields
      });
      
      return patient;
    } catch (error) {
      logger.error('Failed to sync patient from gym system', error);
      throw error;
    }
  }
}
```

**Option B: Shared Database View (Less Recommended)**
```sql
-- Create read-only view in psychology_db pointing to gym_db.Patients
CREATE VIEW Patients AS 
SELECT * FROM gym_db.Patients;
```

**Option C: Message Queue (For High Volume)**
```javascript
// Use RabbitMQ / Kafka
// gym-be publishes patient events
// psychology-be subscribes and syncs
```

#### Step 5.2: Update Psychology Order Flow
```javascript
// psychology-be/src/controllers/psychology/orderController.js

async function createOrder(req, res) {
  const { patientId, packageId } = req.body;
  
  // 1. Check if patient exists locally
  let patient = await db.Patient.findByPk(patientId);
  
  // 2. If not, sync from gym system
  if (!patient) {
    patient = await patientSyncService.syncPatientFromGym(
      patientId, 
      req.user.tenantId
    );
  }
  
  // 3. Create psychology order
  const order = await db.PsychologyOrder.create({
    patientId: patient.id,
    packageId,
    tenantId: req.user.tenantId,
    // ... other fields
  });
  
  res.json(order);
}
```

#### Step 5.3: Revenue Reporting Integration
```javascript
// gym-be/src/controllers/admin/revenueController.js
// Update to call psychology-be for psychology revenue

async function getConsolidatedRevenue(req, res) {
  const { tenantId } = req.user;
  
  // Get gym revenue (local)
  const gymRevenue = await calculateGymRevenue(tenantId);
  
  // Get psychology revenue (from psychology-be API)
  const psychologyRevenue = await axios.get(
    `${process.env.PSYCHOLOGY_API_URL}/api/v1/admin/revenue`,
    {
      headers: {
        'Authorization': req.headers.authorization,
        'X-Tenant-ID': tenantId
      }
    }
  );
  
  res.json({
    gym: gymRevenue,
    psychology: psychologyRevenue.data,
    total: gymRevenue.total + psychologyRevenue.data.total
  });
}
```

---

### **FASE 6: Clean Up Gym Repository** (1-2 hari)

#### Step 6.1: Remove Psychology dari Gym Repo
```bash
cd gym-be

# Remove psychology models
rm src/models/psychology*.js

# Remove psychology migrations
rm src/migrations/*psychology*.js

# Remove psychology module
rm -rf src/modules/psychology/

# Remove psychology scripts
rm scripts/*psychology*.js
rm scripts/cfit/
rm scripts/transform*Questions.js

# Remove psychology docs
rm -rf docs/soalPsikolog/
rm docs/frontend-integration/CFIT*.md
rm docs/frontend-integration/EPPS*.md
rm docs/frontend-integration/PAPI*.md

# Remove psychology public files
rm -rf public/psychology/
rm -rf uploads/psychology/
rm -rf uploads/psychology-reports/

# Update package.json - remove psychology scripts
npm pkg delete scripts.psychology:recalculate
npm pkg delete scripts.psychology:recalculate:preview
npm pkg delete scripts.psychology:fix-questions
npm pkg delete scripts.psychology:fix-questions:preview
```

#### Step 6.2: Update Routes
```javascript
// gym-be/src/routes/index.js
// Remove psychology routes

// DELETE THIS:
// const psychologyModuleRoutes = require('../modules/psychology/routes');
// router.use('/psychology', psychologyModuleRoutes);
```

#### Step 6.3: Update Feature Registry
```javascript
// gym-be/src/utils/featureRegistry.js
// Keep only gym features

const FEATURE_REGISTRY = {
  modules: {
    gym: true,
    pos: true,
    restaurant: true,
    classes: true,
    // Remove: psychology
  },
  // ... gym-specific features only
};
```

#### Step 6.4: Regenerate Metadata
```bash
# Regenerate routes metadata without psychology
npm run generate:routes

# Sync features without psychology module
npm run sync:features
```

---

### **FASE 7: Testing & Validation** (3-5 hari)

#### Step 7.1: Unit Testing

**Gym System:**
```bash
cd gym-be
npm run test

# Verify:
# ✓ All gym tests pass
# ✓ No psychology references remain
# ✓ Patient model still works
```

**Psychology System:**
```bash
cd psychology-be
npm run test

# Verify:
# ✓ All psychology tests pass
# ✓ Patient sync works
# ✓ Authentication works
```

#### Step 7.2: Integration Testing
```bash
# Test cross-system integration:
# 1. Create patient in gym system
# 2. Create psychology order using that patient
# 3. Verify patient data synced
# 4. Test revenue aggregation
```

#### Step 7.3: Performance Testing
```bash
# Load testing
# - Test patient sync latency
# - Test concurrent orders
# - Test database query performance
```

---

### **FASE 8: Deployment** (2-3 hari)

#### Step 8.1: Infrastructure Setup

**Option A: Same Server, Different Ports**
```
Server 1:
- gym-be: port 3000
- psychology-be: port 3001
- nginx reverse proxy
```

**Option B: Different Servers**
```
Server 1 (gym.yourdomain.com):
- gym-be: port 3000
- gym_db

Server 2 (psychology.yourdomain.com):
- psychology-be: port 3000
- psychology_db
```

#### Step 8.2: Nginx Configuration
```nginx
# /etc/nginx/sites-available/gym-be
server {
    listen 80;
    server_name gym-api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# /etc/nginx/sites-available/psychology-be
server {
    listen 80;
    server_name psychology-api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Step 8.3: PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'gym-be',
      script: 'src/server.js',
      cwd: '/var/www/gym-be',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DB_NAME: 'gym_production'
      }
    },
    {
      name: 'psychology-be',
      script: 'src/server.js',
      cwd: '/var/www/psychology-be',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DB_NAME: 'psychology_production',
        GYM_API_URL: 'https://gym-api.yourdomain.com'
      }
    }
  ]
};
```

#### Step 8.4: Environment Variables
```bash
# gym-be/.env.production
NODE_ENV=production
PORT=3000
DB_NAME=gym_production
DB_USER=gym_user
DB_PASSWORD=secure_password

PSYCHOLOGY_API_URL=https://psychology-api.yourdomain.com
PSYCHOLOGY_API_KEY=service-account-key-xyz

# psychology-be/.env.production
NODE_ENV=production
PORT=3001
DB_NAME=psychology_production
DB_USER=psychology_user
DB_PASSWORD=secure_password

GYM_API_URL=https://gym-api.yourdomain.com
GYM_API_KEY=service-account-key-abc
```

---

## 🔧 Checklist Pemisahan

### **Pre-Migration Checklist**
- [ ] Backup database lengkap
- [ ] Backup code repository (create tag/branch)
- [ ] Dokumentasi API contracts
- [ ] Dokumentasi database schema
- [ ] Identifikasi semua dependencies
- [ ] Setup testing environment

### **Psychology Repository Checklist**
- [ ] Clone repository baru
- [ ] Remove semua gym files
- [ ] Reorganize folder structure
- [ ] Update package.json
- [ ] Update README.md
- [ ] Create new database
- [ ] Migrate psychology data
- [ ] Setup shared authentication
- [ ] Update CASL permissions
- [ ] Update feature registry
- [ ] Implement patient sync service
- [ ] Test authentication flow
- [ ] Test API endpoints
- [ ] Test database integrity

### **Gym Repository Checklist**
- [ ] Remove psychology models
- [ ] Remove psychology migrations
- [ ] Remove psychology controllers
- [ ] Remove psychology routes
- [ ] Remove psychology modules
- [ ] Remove psychology scripts
- [ ] Remove psychology docs
- [ ] Remove psychology public files
- [ ] Update routes/index.js
- [ ] Update feature registry
- [ ] Regenerate routes metadata
- [ ] Implement psychology API integration
- [ ] Test gym functionality
- [ ] Test patient management

### **Integration Checklist**
- [ ] Patient data sync working
- [ ] Cross-authentication working
- [ ] Revenue consolidation working
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Monitoring setup

### **Deployment Checklist**
- [ ] Infrastructure provisioned
- [ ] Nginx configured
- [ ] SSL certificates installed
- [ ] PM2 configured
- [ ] Environment variables set
- [ ] Database connections tested
- [ ] Health checks working
- [ ] Monitoring alerts configured
- [ ] Backup strategy implemented
- [ ] Rollback plan documented

---

## ⚠️ Risks & Mitigation

### **Risk 1: Data Loss During Migration**
**Mitigation:**
- Multiple backups (before, during, after)
- Dry-run migration in staging
- Data verification scripts
- Rollback scripts ready

### **Risk 2: Authentication Issues**
**Mitigation:**
- Keep same JWT secret initially
- Implement service accounts
- Test thoroughly in staging
- Have fallback authentication

### **Risk 3: Breaking Changes to Frontend**
**Mitigation:**
- API versioning (/api/v1/, /api/v2/)
- Maintain backward compatibility
- Document all API changes
- Gradual migration with feature flags

### **Risk 4: Performance Degradation**
**Mitigation:**
- Cache patient data locally
- Implement connection pooling
- Use async/queue for non-critical syncs
- Monitor API latency

### **Risk 5: Increased Operational Complexity**
**Mitigation:**
- Comprehensive documentation
- Monitoring & alerting
- Automated health checks
- Clear escalation procedures

---

## 📊 Timeline Estimasi

| Fase | Durasi | Effort |
|------|--------|--------|
| Fase 1: Persiapan & Analisis | 1-2 hari | 16h |
| Fase 2: Setup Psychology Repo | 2-3 hari | 24h |
| Fase 3: Database Separation | 3-4 hari | 32h |
| Fase 4: Auth & Authorization | 2-3 hari | 24h |
| Fase 5: API Integration | 3-4 hari | 32h |
| Fase 6: Clean Up Gym Repo | 1-2 hari | 16h |
| Fase 7: Testing & Validation | 3-5 hari | 40h |
| Fase 8: Deployment | 2-3 hari | 24h |
| **TOTAL** | **17-26 hari** | **~208h** |

*Estimasi untuk 1 developer full-time*

---

## 🚀 Quick Start Commands

### Gym System (After Separation)
```bash
cd gym-be
npm install
npm run db:dev:create
npm run db:dev:migrate
npm run db:dev:seed
npm run dev  # Port 3000
```

### Psychology System (After Separation)
```bash
cd psychology-be
npm install
npm run db:dev:create
npm run db:dev:migrate
npm run migrate:psychology-data  # Migrate data from gym DB
npm run dev  # Port 3001
```

---

## 📞 Support & References

**Documentation:**
- `docs/TRANSACTION-ARCHITECTURE.md` - Transaction system (gym only)
- `docs/SAAS-APPLICATION-FLOW.md` - Multi-tenant flow
- `docs/MODULAR-STRUCTURE.md` - Module architecture

**Scripts untuk Migration:**
- `scripts/migratePsychologyData.js` - Data migration script
- `scripts/verifyPsychologyData.js` - Verification script
- `scripts/setupPsychologyDatabase.js` - Database setup

**Contacts:**
- Architecture questions: [Your Architect]
- DevOps support: [Your DevOps]
- Database admin: [Your DBA]

---

## 🎓 Best Practices

1. **Always backup before migration**
2. **Test in staging first**
3. **Use feature flags for gradual rollout**
4. **Monitor everything post-deployment**
5. **Document all API changes**
6. **Keep rollback plan ready**
7. **Communicate with all stakeholders**

---

**Last Updated:** January 28, 2026
**Status:** Draft - Ready for Review
**Next Review:** Before starting Fase 1
