# Diagram Arsitektur Pemisahan System

## 📊 Arsitektur Saat Ini (Before Separation)

```
┌─────────────────────────────────────────────────────────────────┐
│                         gym-be Repository                        │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                       Controllers                           │ │
│  │  ┌───────────┬──────────────┬────────────┬───────────────┐ │ │
│  │  │    Gym    │  Restaurant  │  Ticketing │  Psychology   │ │ │
│  │  └───────────┴──────────────┴────────────┴───────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                          Models                             │ │
│  │  ┌─────────┬─────────┬─────────┬────────────────────────┐ │ │
│  │  │ Member  │ Product │ Voucher │ Psychology (10 models) │ │ │
│  │  │ Service │ Trans.. │ Patient │ PsychologyOrder        │ │ │
│  │  └─────────┴─────────┴─────────┴────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                             ↓                                     │
│                    ┌─────────────────┐                           │
│                    │    Database     │                           │
│                    │    gym_dev      │                           │
│                    │                 │                           │
│                    │  - 50+ Tables   │                           │
│                    │  - Gym + Psych  │                           │
│                    └─────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘

              Port: 3000
              Database: gym_dev (All tables mixed)
```

---

## 🎯 Arsitektur Setelah Pemisahan (After Separation)

```
┌───────────────────────────────┐   ┌─────────────────────────────────┐
│    gym-be Repository          │   │   psychology-be Repository      │
│                               │   │                                 │
│  ┌─────────────────────────┐ │   │ ┌─────────────────────────────┐ │
│  │    Controllers          │ │   │ │     Controllers             │ │
│  │  ┌─────────────────┐   │ │   │ │  ┌────────────────────────┐ │ │
│  │  │ Gym             │   │ │   │ │  │ Psychology             │ │ │
│  │  │ Restaurant      │   │ │   │ │  │ - Order                │ │ │
│  │  │ Ticketing       │   │ │   │ │  │ - Session              │ │ │
│  │  │ Finance         │   │ │   │ │  │ - Package              │ │ │
│  │  └─────────────────┘   │ │   │ │  │ - Invitation           │ │ │
│  └─────────────────────────┘ │   │ │  └────────────────────────┘ │ │
│                               │   │ └─────────────────────────────┘ │
│  ┌─────────────────────────┐ │   │                                 │
│  │    Models               │ │   │ ┌─────────────────────────────┐ │
│  │  ┌─────────────────┐   │ │   │ │     Models                  │ │
│  │  │ Member          │   │ │   │ │  ┌────────────────────────┐ │ │
│  │  │ Product         │   │ │   │ │  │ PsychologyPackage      │ │ │
│  │  │ Voucher         │   │ │   │ │  │ PsychologyOrder        │ │ │
│  │  │ Service         │   │ │   │ │  │ PsychologySession      │ │ │
│  │  │ Transaction     │   │ │   │ │  │ PsychologyTestType     │ │ │
│  │  │                 │   │ │   │ │  │ PsychologyInvitation   │ │ │
│  │  │ + Shared:       │   │ │   │ │  │                        │ │ │
│  │  │   - Tenant      │   │ │   │ │  │ + Shared:              │ │ │
│  │  │   - User        │   │ │   │ │  │   - Tenant             │ │ │
│  │  │   - Patient     │   │ │   │ │  │   - User               │ │ │
│  │  └─────────────────┘   │ │   │ │  │   - Patient (synced)   │ │ │
│  └─────────────────────────┘ │   │ │  └────────────────────────┘ │ │
│            ↓                  │   │ └─────────────────────────────┘ │
│   ┌──────────────────┐       │   │            ↓                     │
│   │   Database       │       │   │   ┌──────────────────┐          │
│   │   gym_db         │       │   │   │   Database       │          │
│   │                  │       │   │   │   psychology_db  │          │
│   │  - Tenants       │       │   │   │                  │          │
│   │  - Users         │       │   │   │  - Tenants       │          │
│   │  - Patients      │◄──────┼───┼───┤  - Users         │          │
│   │  - Members       │  Sync │   │   │  - Patients      │          │
│   │  - Products      │       │   │   │  - Psychology*   │          │
│   │  - Transactions  │       │   │   │    (10 tables)   │          │
│   │  - Gym Tables    │       │   │   │                  │          │
│   └──────────────────┘       │   │   └──────────────────┘          │
│                               │   │                                 │
│  Port: 3000                   │   │  Port: 3001                     │
│  URL: gym-api.domain.com      │   │  URL: psychology-api.domain.com │
└───────────────────────────────┘   └─────────────────────────────────┘
           ↕                                     ↕
     ┌─────────────────────────────────────────────────┐
     │         Shared JWT Authentication               │
     │         (Same secret key)                       │
     └─────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow: Patient Sync

```
┌──────────────────────────────────────────────────────────────────┐
│                  Frontend Application                             │
│                  (Web / Mobile)                                   │
└────────────┬───────────────────────────────┬─────────────────────┘
             │                               │
             │ 1. Create Patient             │ 3. Create Order
             ↓                               ↓
┌─────────────────────────┐      ┌─────────────────────────────────┐
│   Gym System API        │      │   Psychology System API         │
│   (Port 3000)           │      │   (Port 3001)                   │
│                         │      │                                 │
│  POST /api/v1/patients  │      │  POST /api/v1/psychology/orders │
│  {                      │      │  {                              │
│    name: "John Doe",    │      │    patientId: 123,  ◄───────────┼─┐
│    email: "john@..."    │      │    packageId: 5                 │ │
│  }                      │      │  }                              │ │
│                         │      │         │                       │ │
│         ↓               │      │         ↓                       │ │
│  ┌─────────────┐        │      │  2. Check if patient exists    │ │
│  │  Patient    │        │      │     locally                     │ │
│  │  (created)  │        │      │         │                       │ │
│  │  id: 123    │        │      │         ↓                       │ │
│  └─────────────┘        │      │  Patient NOT found locally      │ │
│                         │      │         │                       │ │
│  Returns:               │      │         ↓                       │ │
│  { id: 123, ... }       │      │  3. Call Gym API to sync        │ │
│                         │      │     GET /api/v1/patients/123 ───┼─┘
└─────────┬───────────────┘      └───────────┬─────────────────────┘
          │                                  │
          │ 2. Frontend gets patient ID      │
          └──────────────────────────────────┘
                         │
                         ↓
          Patient ID used in psychology order


┌──────────────────────────────────────────────────────────────────┐
│              Patient Sync Service (Psychology-BE)                 │
│                                                                   │
│  async syncPatientFromGym(patientId) {                           │
│    // 1. Call gym API                                            │
│    const response = await axios.get(                             │
│      `${GYM_API_URL}/api/v1/patients/${patientId}`,             │
│      { headers: { Authorization: serviceToken } }                │
│    );                                                             │
│                                                                   │
│    // 2. Upsert to local database                                │
│    await Patient.upsert({                                        │
│      id: response.data.id,                                       │
│      name: response.data.name,                                   │
│      tenantId: response.data.tenantId,                           │
│      // ... other fields                                         │
│    });                                                            │
│  }                                                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Login                                  │
└────────────┬────────────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────────┐
│         POST /api/v1/auth/login                                  │
│         (Can be to either system)                                │
│                                                                   │
│         { email: "user@example.com", password: "***" }          │
└────────────┬────────────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────────┐
│         JWT Token Generated                                      │
│         (Using shared secret: "shared-secret-12345")            │
│                                                                   │
│         Payload:                                                 │
│         {                                                        │
│           userId: 1,                                             │
│           tenantId: 5,                                           │
│           role: "admin",                                         │
│           exp: <7 days from now>                                 │
│         }                                                        │
└────────────┬────────────────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────┬─────────────────────────────────────┐
│  Token returned to user  │  Token stored in localStorage/      │
│                          │  cookie                             │
└──────────────────────────┴─────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────────┐
│         User makes requests to BOTH systems                      │
│         with same token                                          │
└────────────┬────────────────────────────────┬───────────────────┘
             │                                │
             ↓                                ↓
┌──────────────────────────┐    ┌──────────────────────────────┐
│  Gym API Request         │    │  Psychology API Request      │
│                          │    │                              │
│  GET /api/v1/members     │    │  GET /api/v1/psychology/     │
│                          │    │      orders                  │
│  Headers:                │    │                              │
│    Authorization:        │    │  Headers:                    │
│      Bearer <JWT>        │    │    Authorization:            │
│                          │    │      Bearer <JWT>            │
│         ↓                │    │         ↓                    │
│  ┌──────────────────┐   │    │  ┌──────────────────┐       │
│  │ authMiddleware   │   │    │  │ authMiddleware   │       │
│  │                  │   │    │  │                  │       │
│  │ Verify JWT       │   │    │  │ Verify JWT       │       │
│  │ (shared secret)  │   │    │  │ (shared secret)  │       │
│  │                  │   │    │  │                  │       │
│  │ ✓ Valid token    │   │    │  │ ✓ Valid token    │       │
│  └──────────────────┘   │    │  └──────────────────┘       │
│         ↓                │    │         ↓                    │
│  Request processed       │    │  Request processed           │
└──────────────────────────┘    └──────────────────────────────┘
```

---

## 📦 Database Migration Process

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Preparation                                             │
│                                                                   │
│  ┌────────────────┐                                              │
│  │ Backup gym_dev │  ────►  backup_gym_dev_2026-01-28.sql       │
│  └────────────────┘                                              │
│                                                                   │
│  ┌─────────────────────────────────────┐                        │
│  │ Create psychology_dev database      │                        │
│  │ Run migrations (create schema)      │                        │
│  └─────────────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Identify Data to Migrate                               │
│                                                                   │
│  SELECT DISTINCT t.*                                             │
│  FROM Tenants t                                                  │
│  WHERE EXISTS (                                                  │
│    SELECT 1 FROM PsychologyOrders WHERE tenantId = t.id         │
│  )                                                               │
│                                                                   │
│  Result: Tenants [5, 12, 23, 45] have psychology data           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Migration in Order (respecting foreign keys)           │
│                                                                   │
│  1. Tenants (4 records)           gym_dev ──►  psychology_dev   │
│     ✓ Migrated                                                   │
│                                                                   │
│  2. Users (25 records)            gym_dev ──►  psychology_dev   │
│     ✓ Migrated                                                   │
│                                                                   │
│  3. Patients (150 records)        gym_dev ──►  psychology_dev   │
│     ✓ Migrated                                                   │
│                                                                   │
│  4. PsychologyTestTypes           gym_dev ──►  psychology_dev   │
│     ✓ Migrated (12 records)                                      │
│                                                                   │
│  5. PsychologyPackages            gym_dev ──►  psychology_dev   │
│     ✓ Migrated (8 records)                                       │
│                                                                   │
│  6. PsychologyPackageItems        gym_dev ──►  psychology_dev   │
│     ✓ Migrated (45 records)                                      │
│                                                                   │
│  7. PsychologyPriceRules          gym_dev ──►  psychology_dev   │
│     ✓ Migrated (15 records)                                      │
│                                                                   │
│  8. PsychologyInvitations         gym_dev ──►  psychology_dev   │
│     ✓ Migrated (320 records)                                     │
│                                                                   │
│  9. PsychologyOrders              gym_dev ──►  psychology_dev   │
│     ✓ Migrated (285 records)                                     │
│                                                                   │
│  10. PsychologySessions           gym_dev ──►  psychology_dev   │
│      ✓ Migrated (1,240 records)                                  │
│                                                                   │
│  11. PsychologyNorms              gym_dev ──►  psychology_dev   │
│      ✓ Migrated (85 records)                                     │
│                                                                   │
│  12. PsychologySettings           gym_dev ──►  psychology_dev   │
│      ✓ Migrated (12 records)                                     │
│                                                                   │
│  13. PsychologyReportCache        gym_dev ──►  psychology_dev   │
│      ✓ Migrated (180 records)                                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: Verification                                            │
│                                                                   │
│  ✓ Record counts match                                           │
│  ✓ No orphaned foreign keys                                      │
│  ✓ Tenant isolation maintained                                   │
│  ✓ Sample data verified                                          │
│  ✓ Data integrity checks passed                                  │
│                                                                   │
│  ✅ Migration successful!                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment Architecture

### Development Environment
```
┌──────────────────────────────────────────────────────────────┐
│                   Local Development                           │
│                                                               │
│  ┌──────────────────┐          ┌──────────────────┐         │
│  │  gym-be          │          │  psychology-be   │         │
│  │  localhost:3000  │          │  localhost:3001  │         │
│  └────────┬─────────┘          └────────┬─────────┘         │
│           │                             │                    │
│           ↓                             ↓                    │
│  ┌──────────────────┐          ┌──────────────────┐         │
│  │  gym_dev DB      │          │  psychology_dev  │         │
│  └──────────────────┘          └──────────────────┘         │
└──────────────────────────────────────────────────────────────┘
```

### Production Environment - Option 1: Same Server
```
┌──────────────────────────────────────────────────────────────┐
│                   Production Server                           │
│                   (gym.yourdomain.com)                        │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 Nginx Reverse Proxy                   │   │
│  │                                                        │   │
│  │  gym-api.yourdomain.com ──►  localhost:3000          │   │
│  │  psychology-api.yourdomain.com ──►  localhost:3001   │   │
│  └─────────────────┬──────────────────┬─────────────────┘   │
│                    │                  │                      │
│                    ↓                  ↓                      │
│  ┌──────────────────────┐   ┌──────────────────────┐       │
│  │  PM2: gym-be         │   │  PM2: psychology-be  │       │
│  │  Port: 3000          │   │  Port: 3001          │       │
│  └──────────┬───────────┘   └──────────┬───────────┘       │
│             │                          │                    │
│             ↓                          ↓                    │
│  ┌──────────────────┐        ┌──────────────────┐         │
│  │  gym_production  │        │  psychology_prod │         │
│  │  MySQL Database  │        │  MySQL Database  │         │
│  └──────────────────┘        └──────────────────┘         │
└──────────────────────────────────────────────────────────────┘
```

### Production Environment - Option 2: Separate Servers
```
┌────────────────────────────┐    ┌────────────────────────────┐
│  Server 1 - Gym System     │    │  Server 2 - Psychology     │
│  gym-api.yourdomain.com    │    │  psychology-api.domain.com │
│                            │    │                            │
│  ┌──────────────────┐     │    │  ┌──────────────────┐     │
│  │ Nginx            │     │    │  │ Nginx            │     │
│  └────────┬─────────┘     │    │  └────────┬─────────┘     │
│           ↓                │    │           ↓                │
│  ┌──────────────────┐     │    │  ┌──────────────────┐     │
│  │ PM2: gym-be      │     │    │  │ PM2: psych-be    │     │
│  │ Port: 3000       │     │◄───┼──┤ Port: 3000       │     │
│  └────────┬─────────┘     │API │  └────────┬─────────┘     │
│           ↓                │    │           ↓                │
│  ┌──────────────────┐     │    │  ┌──────────────────┐     │
│  │ gym_production   │     │    │  │ psychology_prod  │     │
│  │ MySQL            │     │    │  │ MySQL            │     │
│  └──────────────────┘     │    │  └──────────────────┘     │
│                            │    │                            │
│  Resources:                │    │  Resources:                │
│  - 4 CPU cores             │    │  - 2 CPU cores             │
│  - 8 GB RAM                │    │  - 4 GB RAM                │
│  - 100 GB SSD              │    │  - 50 GB SSD               │
└────────────────────────────┘    └────────────────────────────┘
```

---

## 📈 Scaling Strategy

```
                    BEFORE (Monolith)
┌────────────────────────────────────────────────────┐
│              Single Application                     │
│                                                     │
│  If psychology load ↑  ──►  Must scale entire app │
│  If gym load ↑  ──────►  Must scale entire app    │
│                                                     │
│  Cost: Scale everything together                   │
│  Complexity: One large instance                    │
└────────────────────────────────────────────────────┘


                    AFTER (Microservices)
┌─────────────────────────┐    ┌──────────────────────┐
│   Gym System            │    │  Psychology System   │
│                         │    │                      │
│  Normal load:           │    │  High load during    │
│  - 1 instance           │    │  exam season:        │
│  - 2 CPU, 4GB RAM       │    │  - 3 instances       │
│                         │    │  - 4 CPU, 8GB RAM    │
│  Cost: $50/month        │    │  Cost: $150/month    │
│                         │    │  (only when needed)  │
└─────────────────────────┘    └──────────────────────┘

Total cost when both normal: $100/month
Total cost when psych high: $200/month

Monolith cost for same load: $300/month (must over-provision)
Savings: 33% cost reduction with independent scaling
```

---

**Dibuat:** 28 Januari 2026  
**Versi:** 1.0
