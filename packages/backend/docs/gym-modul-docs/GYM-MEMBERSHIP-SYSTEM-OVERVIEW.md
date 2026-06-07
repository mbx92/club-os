# 🏋️ Gym Membership System - Overview

## 📋 Daftar Isi
- [Pendahuluan](#pendahuluan)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Modul-Modul Utama](#modul-modul-utama)
- [Alur Bisnis Utama](#alur-bisnis-utama)
- [Tech Stack](#tech-stack)
- [Dokumentasi Modul](#dokumentasi-modul)

---

## 🎯 Pendahuluan

Sistem Gym Membership Management adalah aplikasi **Multi-Tenant SaaS** yang dirancang untuk mengelola operasional gym secara komprehensif, mencakup:

- ✅ **Member Management** - Pengelolaan data member gym
- ✅ **Membership Plans** - Paket membership (bulanan, tahunan, class packages)
- ✅ **Class Management** - Jadwal kelas dan booking
- ✅ **Trainer/Instructor** - Manajemen trainer dengan sistem komisi
- ✅ **Transaction System** - Unified transaction untuk semua penjualan
- ✅ **POS Integration** - Penjualan membership & class packages via POS
- ✅ **Voucher System** - Diskon menggunakan voucher global
- ✅ **Multi-Tenant** - Isolasi data per tenant
- ✅ **Race-Condition Safe** - Auto-numbering dengan database locking

---

## 🏗️ Arsitektur Sistem

### Multi-Tenancy
```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  Tenant A (Gym 1)  │  Tenant B (Gym 2)  │  Tenant C (Gym 3) │
│  - Members         │  - Members         │  - Members        │
│  - Classes         │  - Classes         │  - Classes        │
│  - Transactions    │  - Transactions    │  - Transactions   │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  DATA ISOLATION   │
                    │  (tenantId filter)│
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │ PostgreSQL Database│
                    └───────────────────┘
```

### Transaction Architecture
```
┌──────────────────────────────────────────────────────────────┐
│                    TRANSACTION HIERARCHY                      │
└──────────────────────────────────────────────────────────────┘

Transaction (Header)
├── transactionNumber: TRX-20251123-0001 (auto-generated)
├── tax: calculated from tenant settings
├── discount: from voucher (if applied)
├── totalAmount: final amount
│
├─── TransactionItem (Details) ───┐
│    ├── itemType: 'membership'    │
│    ├── itemId: membershipPlanId  │  Multiple Items
│    ├── quantity: 1               │  in One Transaction
│    └── price: from plan          │
│                                  │
│    ├── itemType: 'class_package' │
│    ├── itemId: classPackageId    │
│    ├── quantity: 1               │
│    └── price: from package       │
│                                  │
└─── TransactionPayment (Payments)─┘
     ├── paymentMethod: 'cash'
     ├── amount: paid amount
     └── status: 'completed'
```

---

## 📦 Modul-Modul Utama

### 1. **Member Module** 📝
Pengelolaan data member dengan auto-create user account.

**Fitur:**
- Auto-create user dengan email (password default: "password123")
- Login via email ATAU phone number
- Relasi ke User untuk autentikasi
- Support untuk password auto-generate (future: SMTP)

**File:**
- Model: `src/models/member.js`
- Migration: `src/migrations/YYYYMMDDHHMMSS-create-member.js`
- Controller: `src/controllers/gym/memberController.js`
- Routes: `src/routes/gym/member.routes.js`

**Dokumentasi:** [GYM-MEMBER-MODULE.md](./GYM-MEMBER-MODULE.md)

---

### 2. **Membership Plan Module** 💳
Paket membership reguler (bulanan, tahunan, dll).

**Fitur:**
- Membership plan tanpa fitur khusus
- Harga, durasi, benefit
- Bisa dibeli via POS
- Tersimpan dalam Transaction

**File:**
- Model: `src/models/membershipPlan.js`
- Migration: `src/migrations/YYYYMMDDHHMMSS-create-membership-plan.js`
- Controller: `src/controllers/gym/membershipPlanController.js`
- Routes: `src/routes/gym/membershipPlan.routes.js`

**Dokumentasi:** [GYM-MEMBERSHIP-PLAN-MODULE.md](./GYM-MEMBERSHIP-PLAN-MODULE.md)

---

### 3. **Membership (Active) Module** 📋
Data membership aktif member (relasi member ke membership plan).

**Fitur:**
- Link member dengan membership plan
- Status tracking (active, expired, suspended)
- Start date & end date
- Renewal tracking

**File:**
- Model: `src/models/membership.js` (existing, akan di-update)
- Migration: Update existing migration
- Controller: `src/controllers/gym/membershipController.js` (update)

**Dokumentasi:** [GYM-MEMBERSHIP-ACTIVE-MODULE.md](./GYM-MEMBERSHIP-ACTIVE-MODULE.md)

---

### 4. **Class Module** 🏃
Jadwal kelas gym (yoga, spinning, boxing, dll).

**Fitur:**
- Jadwal kelas (recurring/one-time)
- Kapasitas peserta
- Assignment trainer
- Booking system untuk member

**File:**
- Model: `src/models/class.js`
- Migration: `src/migrations/YYYYMMDDHHMMSS-create-class.js`
- Controller: `src/controllers/gym/classController.js`
- Routes: `src/routes/gym/class.routes.js`

**Dokumentasi:** [GYM-CLASS-MODULE.md](./GYM-CLASS-MODULE.md)

---

### 5. **Class Package Plan Module** 📦
Paket kelas yang bisa dibeli member (misal: 10x class, 20x class).

**Fitur:**
- Package plan untuk class
- Jumlah sessions
- Validity period
- Harga package
- Bisa dibeli via POS

**File:**
- Model: `src/models/classPackagePlan.js`
- Migration: `src/migrations/YYYYMMDDHHMMSS-create-class-package-plan.js`
- Controller: `src/controllers/gym/classPackagePlanController.js`
- Routes: `src/routes/gym/classPackagePlan.routes.js`

**Dokumentasi:** [GYM-CLASS-PACKAGE-MODULE.md](./GYM-CLASS-PACKAGE-MODULE.md)

---

### 6. **Class Package (Active) Module** 🎫
Data package class aktif yang dimiliki member.

**Fitur:**
- Link member dengan class package plan
- Remaining sessions counter
- Usage tracking
- Expiry date

**File:**
- Model: `src/models/classPackage.js`
- Migration: `src/migrations/YYYYMMDDHHMMSS-create-class-package.js`
- Controller: `src/controllers/gym/classPackageController.js`

**Dokumentasi:** [GYM-CLASS-PACKAGE-MODULE.md](./GYM-CLASS-PACKAGE-MODULE.md)

---

### 7. **Trainer/Instructor Module** 👨‍🏫
Manajemen trainer dengan sistem komisi.

**Fitur:**
- Profile trainer
- Specialization
- Commission rate (percentage atau nominal)
- Commission calculation per transaction
- Class assignment tracking

**File:**
- Model: `src/models/trainer.js`
- Migration: `src/migrations/YYYYMMDDHHMMSS-create-trainer.js`
- Controller: `src/controllers/gym/trainerController.js`
- Routes: `src/routes/gym/trainer.routes.js`

**Dokumentasi:** [GYM-TRAINER-MODULE.md](./GYM-TRAINER-MODULE.md)

---

### 8. **Transaction Module** 💰
Unified transaction system untuk semua penjualan.

**Fitur:**
- Transaction header dengan auto-numbering
- Support multiple items dalam satu transaksi
- Tax calculation dari tenant settings
- Voucher discount application
- Race-condition safe dengan optimistic locking
- Payment tracking

**File:**
- Model: `src/models/transaction.js` (existing)
- Model: `src/models/transactionItem.js` (existing)
- Model: `src/models/transactionPayment.js` (existing)
- Controller: `src/controllers/transaction/transactionController.js`
- Routes: `src/routes/transaction/transaction.routes.js`

**Dokumentasi:** [GYM-TRANSACTION-MODULE.md](./GYM-TRANSACTION-MODULE.md)

---

### 9. **Voucher Module (Existing)** 🎟️
Sistem voucher global untuk discount.

**Fitur:**
- Voucher code generation
- Percentage atau fixed discount
- Applicable to: membership, class_package, atau all
- Usage limit & tracking
- Date validity

**File:**
- Model: `src/models/voucher.js` (existing)
- Model: `src/models/voucherUsage.js` (existing)
- Controller: `src/controllers/voucher/voucherController.js`

**Dokumentasi:** [VOUCHER-INTEGRATION.md](./VOUCHER-INTEGRATION.md)

---

## 🔄 Alur Bisnis Utama

### Alur 1: Member Registration
```
1. Staff input data member (firstName, lastName, email, phone)
   └─> POST /api/v1/gym/members
   
2. System auto-create User account
   ├─> email: member's email
   ├─> phone: member's phone (for alternative login)
   ├─> password: "password123" (default)
   └─> role: "member"
   
3. Member dapat login menggunakan:
   ├─> Email + Password
   └─> Phone + Password
   
4. Member aktif, siap beli membership/class package
```

### Alur 2: Beli Membership via POS
```
1. Kasir pilih member
2. Kasir pilih membership plan
3. Kasir apply voucher (optional)
   └─> System calculate discount
4. System calculate tax (dari tenant settings)
5. Create Transaction
   ├─> transactionNumber: auto-generate (TRX-20251123-0001)
   ├─> TransactionItem (itemType: 'membership')
   ├─> tax: calculated
   ├─> voucherDiscount: applied
   └─> totalAmount: final
6. Process Payment
   └─> TransactionPayment created
7. Create/Update Membership
   └─> Link member ke membership plan
   └─> Status: active
8. Print receipt/invoice
```

### Alur 3: Beli Class Package via POS
```
1. Kasir pilih member
2. Kasir pilih class package plan
3. Kasir apply voucher (optional)
4. Create Transaction
   ├─> transactionNumber: auto-generate
   ├─> TransactionItem (itemType: 'class_package')
   ├─> tax & discount
   └─> totalAmount
5. Process Payment
6. Create ClassPackage
   └─> remainingSessions: plan's total sessions
   └─> validUntil: calculated from validity period
```

### Alur 4: Combined Purchase (Membership + Class Package)
```
1. Kasir pilih member
2. Kasir add items:
   ├─> Membership Plan (Gold - 12 months)
   └─> Class Package (20x classes)
3. Apply voucher
4. Create Transaction with multiple items
   ├─> TransactionItem #1: membership
   ├─> TransactionItem #2: class_package
   ├─> Calculate total with tax & discount
   └─> Create both Membership & ClassPackage records
5. One payment for all items
```

### Alur 5: Book Class & Use Package
```
1. Member view available classes
   └─> GET /api/v1/gym/classes?date=2025-11-23
2. Member book class
   └─> POST /api/v1/gym/classes/:id/book
   └─> Check: member has active class package
   └─> Decrement remainingSessions
3. Trainer check attendance
   └─> Mark as attended
   └─> Calculate trainer commission (if applicable)
```

---

## 🛠️ Tech Stack

### Backend
- **Framework:** Node.js + Express.js
- **Database:** PostgreSQL
- **ORM:** Sequelize
- **Authentication:** JWT + CASL (role-based permissions)
- **Race-Condition Prevention:** Optimistic Locking + Database Sequences

### Key Features
- **Multi-Tenancy:** Complete data isolation per tenant
- **Feature Gating:** Subscription-based feature access
- **Auto-Numbering:** Race-condition safe transaction numbers
- **Tax Calculation:** Per-tenant tax settings
- **Voucher System:** Global voucher with usage tracking

---

## 📚 Dokumentasi Modul

Setiap modul memiliki dokumentasi detail terpisah:

| Modul | File Dokumentasi |
|-------|------------------|
| Member | [GYM-MEMBER-MODULE.md](./GYM-MEMBER-MODULE.md) |
| Membership Plan | [GYM-MEMBERSHIP-PLAN-MODULE.md](./GYM-MEMBERSHIP-PLAN-MODULE.md) |
| Membership (Active) | [GYM-MEMBERSHIP-ACTIVE-MODULE.md](./GYM-MEMBERSHIP-ACTIVE-MODULE.md) |
| Class | [GYM-CLASS-MODULE.md](./GYM-CLASS-MODULE.md) |
| Class Package Plan | [GYM-CLASS-PACKAGE-MODULE.md](./GYM-CLASS-PACKAGE-MODULE.md) |
| Trainer/Instructor | [GYM-TRAINER-MODULE.md](./GYM-TRAINER-MODULE.md) |
| Transaction | [GYM-TRANSACTION-MODULE.md](./GYM-TRANSACTION-MODULE.md) |
| Voucher Integration | [VOUCHER-INTEGRATION.md](./VOUCHER-INTEGRATION.md) |

---

## 🚀 Quick Start

### 1. Setup Database
```bash
# Reset database dengan model baru
npm run db:dev:reset
```

### 2. Run Migrations
```bash
# Migration akan membuat semua tabel yang dibutuhkan
npx sequelize-cli db:migrate
```

### 3. Seed Data (Optional)
```bash
# Seed sample data untuk testing
npx sequelize-cli db:seed:all
```

### 4. Start Server
```bash
npm run dev
```

---

## 🔐 Authentication Flow

### Login via Email
```bash
POST /api/v1/auth/login
{
  "emailOrPhone": "member@example.com",
  "password": "password123"
}
```

### Login via Phone
```bash
POST /api/v1/auth/login
{
  "emailOrPhone": "08123456789",
  "password": "password123"
}
```

---

## 📊 Database Schema Overview

```
┌─────────────┐
│   Tenant    │ (Gym/Business)
└──────┬──────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       │              │              │              │
   ┌───▼────┐    ┌───▼────┐    ┌───▼────┐    ┌───▼────┐
   │  User  │    │ Member │    │Trainer │    │Classes │
   └────────┘    └───┬────┘    └───┬────┘    └───┬────┘
                     │              │              │
              ┌──────┴──────┐       │              │
              │             │       │              │
         ┌────▼─────┐  ┌───▼──────────────┐  ┌────▼──────┐
         │Membership│  │  ClassPackage    │  │ClassBooking│
         └────┬─────┘  └───┬──────────────┘  └───────────┘
              │            │
         ┌────▼──────┐┌───▼───────────┐
         │Membership ││ClassPackage   │
         │   Plan    ││     Plan      │
         └───────────┘└───────────────┘
                     │
              ┌──────▼──────────┐
              │   Transaction   │ (Unified)
              ├─────────────────┤
              │TransactionItem  │
              │TransactionPayment│
              └─────────────────┘
```

---

## 🔄 Environment Variables

Tambahkan ke `.env.development`:

```env
# Password Settings
DEFAULT_MEMBER_PASSWORD=password123
AUTO_GENERATE_PASSWORD=false  # Set true jika sudah ada SMTP

# SMTP Settings (untuk auto-generate password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
SMTP_FROM=noreply@yourgym.com

# Tax Settings (per tenant via tenant.settings)
# DEFAULT_TAX_RATE=10  # 10%
# TAX_ENABLED=true
```

---

## 📝 Next Steps

1. ✅ Review dokumentasi setiap modul
2. ✅ Jalankan migrations untuk membuat tabel
3. ✅ Test API endpoints dengan Postman
4. ✅ Integrate dengan frontend/POS system
5. ✅ Setup SMTP untuk auto-generate password (future)

---

**Version:** 1.0  
**Last Updated:** November 23, 2025  
**Status:** Ready for Implementation 🚀
