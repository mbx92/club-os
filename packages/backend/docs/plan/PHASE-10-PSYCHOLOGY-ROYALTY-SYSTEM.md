# 💰 Psychology Royalty System - Rancangan Implementasi

**Document Version**: 1.0  
**Created**: November 30, 2025  
**Status**: Planning  
**Priority**: Medium  
**Scope**: Super Admin Only (Platform Owner Tools)

---

## 📋 Table of Contents

1. [Overview](#-overview)
2. [Business Model](#-business-model)
3. [Database Schema](#-database-schema)
4. [Channel Detection Logic](#-channel-detection-logic)
5. [API Endpoints](#-api-endpoints)
6. [Calculation Flow](#-calculation-flow)
7. [Report Generation](#-report-generation)
8. [Implementation Phases](#-implementation-phases)
9. [Checklist Implementasi](#-checklist-implementasi)

---

## 📋 Overview

### Tujuan

Membangun sistem royalty calculator untuk **Platform Owner (A)** agar dapat:
- Menghitung royalty dari penggunaan alat test psikologi
- Melacak transaksi berdasarkan channel (clinic/independent)
- Generate laporan bulanan untuk settlement dengan **Psikolog Pengembang (B)**

### Scope

| Aspek | Detail |
|-------|--------|
| **User** | Super Admin only (Platform Owner) |
| **Provider** | Psikolog Pengembang (pemilik lisensi alat test) |
| **Integration** | Menggunakan data existing dari `PsychologyPackage`, `PsychologyOrder`, `PsychologySession` |
| **Settlement** | Akumulasi bulanan |

### Key Features

- ✅ Royalty config per provider dengan rate berbeda per channel
- ✅ Auto-detect channel berdasarkan package name/metadata
- ✅ Manual override channel jika diperlukan
- ✅ Monthly calculation & settlement
- ✅ PDF report export untuk provider

---

## 💼 Business Model

### Pihak yang Terlibat

| Kode | Pihak | Peran |
|------|-------|-------|
| **A** | Platform Owner | Pengembang platform, berhak atas royalty |
| **B** | Psikolog Pengembang | Pemilik lisensi alat test |
| **Klinik** | Tempat Praktik | Mengambil 50% dari harga (di luar sistem) |

### Kontrak Royalty A ↔ B

| Channel | Base Amount | Royalty A | Sisa B | Catatan |
|---------|-------------|-----------|--------|---------|
| **clinic** | 50% dari harga | **7%** | 93% | Klinik ambil 50% (di luar sistem) |
| **independent** | 100% harga | **35%** | 65% | Tanpa perantara |

### Contoh Perhitungan

```
┌─────────────────────────────────────────────────────────────┐
│                    CLINIC CHANNEL                            │
│                  Package Price: Rp 150.000                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Pasien bayar: Rp 150.000                                    │
│       │                                                       │
│       ├── Klinik (50%): Rp 75.000  ← di luar sistem         │
│       │                                                       │
│       └── B share (50%): Rp 75.000  ← base amount           │
│              │                                                │
│              ├── A (7%): Rp 5.250                            │
│              └── B net (93%): Rp 69.750                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 INDEPENDENT CHANNEL                          │
│                  Package Price: Rp 150.000                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Pasien bayar: Rp 150.000  ← base amount (100%)             │
│       │                                                       │
│       ├── A (35%): Rp 52.500                                 │
│       └── B (65%): Rp 97.500                                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Summary per Channel

| Channel | Harga | Base Amount | A Gets | B Gets |
|---------|-------|-------------|--------|--------|
| clinic | 150.000 | 75.000 (50%) | 5.250 (7%) | 69.750 (93%) |
| independent | 150.000 | 150.000 (100%) | 52.500 (35%) | 97.500 (65%) |

---

## 🗂️ Database Schema

### 1. RoyaltyConfig Model

Menyimpan kontrak/konfigurasi royalty dengan provider.

```javascript
// src/models/royaltyConfig.js
{
  id: UUID (PK),
  
  // Provider Info
  providerName: STRING(100),           // "Dr. B (Psikolog)"
  providerEmail: STRING(255),
  providerPhone: STRING(20),
  providerBankName: STRING(100),
  providerBankAccount: STRING(50),
  providerBankAccountName: STRING(100),
  
  // Rates
  clinicRoyaltyRate: DECIMAL(5,2),     // 7.00 (% untuk A dari net)
  independentRoyaltyRate: DECIMAL(5,2),// 35.00 (% untuk A dari gross)
  clinicDeductionRate: DECIMAL(5,2),   // 50.00 (% potong klinik - info only)
  
  // Metadata
  notes: TEXT,
  contractDate: DATE,
  
  isActive: BOOLEAN,
  createdAt: DATETIME,
  updatedAt: DATETIME
}
```

### 2. RoyaltyCalculation Model

Menyimpan hasil perhitungan per transaksi/session.

```javascript
// src/models/royaltyCalculation.js
{
  id: UUID (PK),
  configId: UUID (FK → RoyaltyConfigs),
  
  // Reference to Psychology data
  sessionId: UUID (FK → PsychologySessions),
  orderId: UUID (FK → PsychologyOrders),
  packageId: UUID (FK → PsychologyPackages),
  
  // Transaction Info
  packageName: STRING(100),            // Snapshot nama package
  transactionDate: DATE,               // Tanggal session completed
  
  // Channel
  channel: ENUM ['clinic', 'independent'],
  channelDetectedBy: ENUM ['metadata', 'pattern', 'default', 'manual'],
  
  // Amounts
  grossAmount: DECIMAL(12,2),          // Harga package
  clinicDeduction: DECIMAL(12,2),      // Potongan klinik (jika clinic)
  baseAmount: DECIMAL(12,2),           // Basis perhitungan royalty
  
  royaltyRate: DECIMAL(5,2),           // Rate yang dipakai (7 atau 35)
  platformAmount: DECIMAL(12,2),       // Jumlah untuk A
  providerAmount: DECIMAL(12,2),       // Jumlah untuk B
  
  // Period
  periodMonth: STRING(7),              // "2025-11"
  
  // Status
  status: ENUM ['draft', 'confirmed', 'settled'],
  settledAt: DATETIME,
  
  createdAt: DATETIME,
  updatedAt: DATETIME
}
```

### 3. RoyaltySettlement Model

Menyimpan summary settlement per periode.

```javascript
// src/models/royaltySettlement.js
{
  id: UUID (PK),
  configId: UUID (FK → RoyaltyConfigs),
  
  // Period
  periodMonth: STRING(7),              // "2025-11"
  
  // Summary - Clinic
  clinicTransactionCount: INTEGER,
  clinicGrossAmount: DECIMAL(12,2),
  clinicBaseAmount: DECIMAL(12,2),
  clinicPlatformAmount: DECIMAL(12,2),
  clinicProviderAmount: DECIMAL(12,2),
  
  // Summary - Independent
  independentTransactionCount: INTEGER,
  independentGrossAmount: DECIMAL(12,2),
  independentBaseAmount: DECIMAL(12,2),
  independentPlatformAmount: DECIMAL(12,2),
  independentProviderAmount: DECIMAL(12,2),
  
  // Totals
  totalTransactionCount: INTEGER,
  totalGrossAmount: DECIMAL(12,2),
  totalPlatformAmount: DECIMAL(12,2),
  totalProviderAmount: DECIMAL(12,2),
  
  // Status
  status: ENUM ['draft', 'confirmed', 'paid'],
  confirmedAt: DATETIME,
  confirmedBy: UUID (FK → Users),
  paidAt: DATETIME,
  paymentReference: STRING(100),
  
  notes: TEXT,
  
  createdAt: DATETIME,
  updatedAt: DATETIME
}
```

### Entity Relationship Diagram

```
┌─────────────────────┐
│   RoyaltyConfig     │  ← Kontrak dengan Provider B
├─────────────────────┤
│ providerName        │
│ clinicRate: 7%      │
│ independentRate: 35%│
└──────────┬──────────┘
           │
           │ 1:N
           ▼
┌─────────────────────┐       ┌─────────────────────┐
│ RoyaltyCalculation  │──────▶│  PsychologySession  │
├─────────────────────┤       └─────────────────────┘
│ channel             │              │
│ grossAmount         │              ▼
│ baseAmount          │       ┌─────────────────────┐
│ platformAmount      │       │  PsychologyPackage  │
│ providerAmount      │       ├─────────────────────┤
│ periodMonth         │       │ name                │
│ status              │       │ basePrice           │
└──────────┬──────────┘       │ metadata.royaltyChannel │
           │                  └─────────────────────┘
           │ N:1
           ▼
┌─────────────────────┐
│  RoyaltySettlement  │  ← Summary bulanan
├─────────────────────┤
│ periodMonth         │
│ totalPlatformAmount │
│ totalProviderAmount │
│ status              │
└─────────────────────┘
```

### Database Indexes

```sql
-- RoyaltyConfigs
CREATE INDEX idx_royalty_configs_active ON RoyaltyConfigs(isActive);

-- RoyaltyCalculations
CREATE INDEX idx_royalty_calc_config ON RoyaltyCalculations(configId);
CREATE INDEX idx_royalty_calc_period ON RoyaltyCalculations(periodMonth);
CREATE INDEX idx_royalty_calc_session ON RoyaltyCalculations(sessionId);
CREATE UNIQUE INDEX idx_royalty_calc_session_unique ON RoyaltyCalculations(sessionId);
CREATE INDEX idx_royalty_calc_status ON RoyaltyCalculations(status);

-- RoyaltySettlements
CREATE INDEX idx_royalty_settle_config ON RoyaltySettlements(configId);
CREATE UNIQUE INDEX idx_royalty_settle_period ON RoyaltySettlements(configId, periodMonth);
CREATE INDEX idx_royalty_settle_status ON RoyaltySettlements(status);
```

---

## 🔍 Channel Detection Logic

### Detection Priority

```
┌─────────────────────────────────────────────────────────────┐
│                 CHANNEL DETECTION FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Input: PsychologyPackage                                    │
│         │                                                     │
│         ▼                                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Step 1: Check metadata.royaltyChannel                   │ │
│  │                                                          │ │
│  │ if (package.metadata?.royaltyChannel) {                 │ │
│  │   return {                                               │ │
│  │     channel: metadata.royaltyChannel,                   │ │
│  │     detectedBy: 'metadata'                              │ │
│  │   };                                                     │ │
│  │ }                                                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│         │                                                     │
│         ▼                                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Step 2: Check name patterns                             │ │
│  │                                                          │ │
│  │ patterns = ['klinik', 'clinic', 'rs ', 'rs.',           │ │
│  │             'rumah sakit', 'hospital', 'puskesmas']     │ │
│  │                                                          │ │
│  │ if (name.toLowerCase() matches any pattern) {           │ │
│  │   return { channel: 'clinic', detectedBy: 'pattern' };  │ │
│  │ }                                                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│         │                                                     │
│         ▼                                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Step 3: Default                                          │ │
│  │                                                          │ │
│  │ return { channel: 'independent', detectedBy: 'default' }│ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```javascript
// src/services/royaltyService.js

const CLINIC_PATTERNS = [
  'klinik',
  'clinic', 
  'rs ',
  'rs.',
  'rumah sakit',
  'hospital',
  'puskesmas',
  'praktek bersama'
];

/**
 * Detect royalty channel from package
 * @param {Object} package - PsychologyPackage instance
 * @returns {{ channel: string, detectedBy: string }}
 */
function detectChannel(package) {
  // Priority 1: Explicit metadata
  if (package.metadata?.royaltyChannel) {
    const channel = package.metadata.royaltyChannel;
    if (['clinic', 'independent'].includes(channel)) {
      return { channel, detectedBy: 'metadata' };
    }
  }
  
  // Priority 2: Name pattern matching
  const nameLower = (package.name || '').toLowerCase();
  
  for (const pattern of CLINIC_PATTERNS) {
    if (nameLower.includes(pattern)) {
      return { channel: 'clinic', detectedBy: 'pattern' };
    }
  }
  
  // Priority 3: Default
  return { channel: 'independent', detectedBy: 'default' };
}
```

### Package Configuration Examples

```javascript
// Clinic package - explicit metadata
{
  name: "PAPI Kostick - Klinik Sehat Jaya",
  basePrice: 150000,
  metadata: {
    royaltyChannel: "clinic"  // Explicit
  }
}

// Clinic package - detected by name
{
  name: "EPPS Assessment - RS Harapan Bunda",
  basePrice: 200000,
  metadata: {}  // Will detect "RS " pattern
}

// Independent package - default
{
  name: "PAPI Kostick - Private Session",
  basePrice: 150000,
  metadata: {}  // No pattern match → independent
}

// Independent package - explicit
{
  name: "EPPS Full Assessment",
  basePrice: 200000,
  metadata: {
    royaltyChannel: "independent"  // Explicit
  }
}
```

---

## 🛣️ API Endpoints

### Royalty Config Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/royalty/configs` | List all royalty configs |
| `GET` | `/api/v1/admin/royalty/configs/:id` | Get config detail |
| `POST` | `/api/v1/admin/royalty/configs` | Create new config |
| `PATCH` | `/api/v1/admin/royalty/configs/:id` | Update config |
| `DELETE` | `/api/v1/admin/royalty/configs/:id` | Soft delete config |

### Royalty Calculation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/admin/royalty/calculate` | Run calculation for period |
| `GET` | `/api/v1/admin/royalty/calculations` | List calculations with filters |
| `PATCH` | `/api/v1/admin/royalty/calculations/:id` | Update channel (manual override) |
| `POST` | `/api/v1/admin/royalty/calculations/bulk-update` | Bulk update channels |

### Royalty Settlement Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/royalty/settlements` | List settlements |
| `GET` | `/api/v1/admin/royalty/settlements/:id` | Get settlement detail |
| `POST` | `/api/v1/admin/royalty/settlements/generate` | Generate settlement for period |
| `POST` | `/api/v1/admin/royalty/settlements/:id/confirm` | Confirm settlement |
| `POST` | `/api/v1/admin/royalty/settlements/:id/mark-paid` | Mark as paid |
| `GET` | `/api/v1/admin/royalty/settlements/:id/export` | Export PDF report |

### Request/Response Examples

#### Create Royalty Config

```json
// POST /api/v1/admin/royalty/configs
// Request
{
  "providerName": "Dr. B (Psikolog)",
  "providerEmail": "dr.b@email.com",
  "providerPhone": "08123456789",
  "providerBankName": "BCA",
  "providerBankAccount": "1234567890",
  "providerBankAccountName": "Dr. B",
  "clinicRoyaltyRate": 7,
  "independentRoyaltyRate": 35,
  "clinicDeductionRate": 50,
  "notes": "Kontrak kerjasama pengembangan platform",
  "contractDate": "2025-01-01"
}

// Response 201 Created
{
  "success": true,
  "data": {
    "id": "uuid",
    "providerName": "Dr. B (Psikolog)",
    "clinicRoyaltyRate": 7,
    "independentRoyaltyRate": 35,
    "clinicDeductionRate": 50,
    "isActive": true,
    "createdAt": "2025-11-30T10:00:00Z"
  }
}
```

#### Run Calculation

```json
// POST /api/v1/admin/royalty/calculate
// Request
{
  "configId": "config-uuid",
  "periodMonth": "2025-11",
  "recalculate": false  // true = recalculate existing
}

// Response 200 OK
{
  "success": true,
  "data": {
    "periodMonth": "2025-11",
    "newCalculations": 45,
    "skippedExisting": 10,
    "summary": {
      "clinic": {
        "count": 15,
        "grossAmount": 2250000,
        "baseAmount": 1125000,
        "platformAmount": 78750,
        "providerAmount": 1046250
      },
      "independent": {
        "count": 30,
        "grossAmount": 4500000,
        "baseAmount": 4500000,
        "platformAmount": 1575000,
        "providerAmount": 2925000
      },
      "total": {
        "count": 45,
        "platformAmount": 1653750,
        "providerAmount": 3971250
      }
    }
  }
}
```

#### List Calculations

```json
// GET /api/v1/admin/royalty/calculations?periodMonth=2025-11&channel=clinic

// Response 200 OK
{
  "success": true,
  "data": [
    {
      "id": "calc-uuid",
      "sessionId": "session-uuid",
      "packageName": "PAPI - Klinik ABC",
      "transactionDate": "2025-11-15",
      "channel": "clinic",
      "channelDetectedBy": "pattern",
      "grossAmount": 150000,
      "baseAmount": 75000,
      "royaltyRate": 7,
      "platformAmount": 5250,
      "providerAmount": 69750,
      "status": "draft"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

#### Update Channel (Manual Override)

```json
// PATCH /api/v1/admin/royalty/calculations/:id
// Request
{
  "channel": "clinic",
  "notes": "Corrected: this was from Klinik XYZ"
}

// Response 200 OK
{
  "success": true,
  "data": {
    "id": "calc-uuid",
    "channel": "clinic",
    "channelDetectedBy": "manual",
    "previousChannel": "independent",
    "grossAmount": 150000,
    "baseAmount": 75000,  // Recalculated
    "platformAmount": 5250,  // Recalculated
    "providerAmount": 69750  // Recalculated
  }
}
```

#### Generate Settlement

```json
// POST /api/v1/admin/royalty/settlements/generate
// Request
{
  "configId": "config-uuid",
  "periodMonth": "2025-11"
}

// Response 201 Created
{
  "success": true,
  "data": {
    "id": "settlement-uuid",
    "periodMonth": "2025-11",
    "providerName": "Dr. B (Psikolog)",
    
    "clinicTransactionCount": 15,
    "clinicGrossAmount": 2250000,
    "clinicPlatformAmount": 78750,
    "clinicProviderAmount": 1046250,
    
    "independentTransactionCount": 30,
    "independentGrossAmount": 4500000,
    "independentPlatformAmount": 1575000,
    "independentProviderAmount": 2925000,
    
    "totalTransactionCount": 45,
    "totalPlatformAmount": 1653750,
    "totalProviderAmount": 3971250,
    
    "status": "draft"
  }
}
```

#### Export PDF Report

```json
// GET /api/v1/admin/royalty/settlements/:id/export

// Response: PDF file download
// Content-Type: application/pdf
// Content-Disposition: attachment; filename="royalty-report-2025-11.pdf"
```

---

## 🔄 Calculation Flow

### Monthly Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    MONTHLY ROYALTY FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  DURING THE MONTH                                            │
│  ════════════════                                            │
│                                                               │
│  1. B creates packages (with optional royaltyChannel)        │
│  2. B sends invitations to patients                          │
│  3. Patients complete tests & pay                            │
│  4. PsychologySession records created (status: completed)    │
│                                                               │
│  ─────────────────────────────────────────────────────────   │
│                                                               │
│  END OF MONTH (A as Super Admin)                             │
│  ═══════════════════════════════                             │
│                                                               │
│  Step 1: Run Calculation                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ POST /admin/royalty/calculate                           │ │
│  │ { configId: "...", periodMonth: "2025-11" }             │ │
│  │                                                          │ │
│  │ System:                                                  │ │
│  │ • Find all completed sessions in period                 │ │
│  │ • For each session:                                     │ │
│  │   - Get package info                                    │ │
│  │   - Detect channel (metadata → pattern → default)       │ │
│  │   - Calculate amounts based on channel                  │ │
│  │   - Create RoyaltyCalculation record                    │ │
│  └─────────────────────────────────────────────────────────┘ │
│         │                                                     │
│         ▼                                                     │
│  Step 2: Review & Adjust                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ GET /admin/royalty/calculations?period=2025-11          │ │
│  │                                                          │ │
│  │ A reviews list, checks channel detection                │ │
│  │ A manually corrects wrong channels if needed            │ │
│  │                                                          │ │
│  │ PATCH /admin/royalty/calculations/:id                   │ │
│  │ { channel: "clinic" }                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
│         │                                                     │
│         ▼                                                     │
│  Step 3: Generate Settlement                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ POST /admin/royalty/settlements/generate                │ │
│  │ { configId: "...", periodMonth: "2025-11" }             │ │
│  │                                                          │ │
│  │ System aggregates all calculations into summary         │ │
│  └─────────────────────────────────────────────────────────┘ │
│         │                                                     │
│         ▼                                                     │
│  Step 4: Confirm & Export                                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ POST /admin/royalty/settlements/:id/confirm             │ │
│  │ • Locks all calculations (prevents changes)             │ │
│  │ • Status: draft → confirmed                             │ │
│  │                                                          │ │
│  │ GET /admin/royalty/settlements/:id/export               │ │
│  │ • Generate PDF report                                   │ │
│  │ • Send to B (via email or manual)                       │ │
│  └─────────────────────────────────────────────────────────┘ │
│         │                                                     │
│         ▼                                                     │
│  Step 5: Mark as Paid                                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ POST /admin/royalty/settlements/:id/mark-paid           │ │
│  │ { paymentReference: "TRF-20251205-001" }                │ │
│  │                                                          │ │
│  │ Status: confirmed → paid                                │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Algorithm

```javascript
// src/services/royaltyService.js

async function calculateRoyalty(session, package, config) {
  const grossAmount = parseFloat(package.finalPrice);
  const { channel, detectedBy } = detectChannel(package);
  
  let baseAmount, royaltyRate, platformAmount, providerAmount;
  
  if (channel === 'clinic') {
    // Clinic: base = 50% of gross (after clinic deduction)
    const clinicDeductionRate = parseFloat(config.clinicDeductionRate) / 100;
    baseAmount = grossAmount * (1 - clinicDeductionRate);  // 50%
    
    // Platform gets X% of base
    royaltyRate = parseFloat(config.clinicRoyaltyRate);
    platformAmount = baseAmount * (royaltyRate / 100);
    providerAmount = baseAmount - platformAmount;
  } else {
    // Independent: base = 100% of gross
    baseAmount = grossAmount;
    
    // Platform gets X% of gross
    royaltyRate = parseFloat(config.independentRoyaltyRate);
    platformAmount = grossAmount * (royaltyRate / 100);
    providerAmount = grossAmount - platformAmount;
  }
  
  return {
    sessionId: session.id,
    orderId: session.orderId,
    packageId: package.id,
    packageName: package.name,
    transactionDate: session.completedAt,
    channel,
    channelDetectedBy: detectedBy,
    grossAmount,
    clinicDeduction: channel === 'clinic' ? grossAmount * 0.5 : 0,
    baseAmount,
    royaltyRate,
    platformAmount: Math.round(platformAmount),  // Round to avoid float issues
    providerAmount: Math.round(providerAmount),
    periodMonth: formatPeriod(session.completedAt),  // "2025-11"
    status: 'draft'
  };
}
```

---

## 📊 Report Generation

### PDF Report Structure

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│                    [LOGO PLATFORM]                           │
│                                                               │
│              LAPORAN ROYALTY BULANAN                         │
│              ════════════════════════                         │
│                                                               │
│  Periode      : November 2025                                │
│  Provider     : Dr. B (Psikolog)                             │
│  Tanggal Cetak: 05 Desember 2025                             │
│                                                               │
│  ─────────────────────────────────────────────────────────   │
│                                                               │
│  RINGKASAN                                                    │
│  ─────────────────────────────────────────────────────────   │
│                                                               │
│  Channel Klinik (Rate: 7% dari net setelah potong 50%)       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Jumlah Transaksi  : 15                                │   │
│  │ Total Gross       : Rp 2.250.000                      │   │
│  │ Potongan Klinik   : Rp 1.125.000 (50%)               │   │
│  │ Base Amount       : Rp 1.125.000                      │   │
│  │ Royalty Platform  : Rp 78.750 (7%)                    │   │
│  │ Untuk Provider    : Rp 1.046.250 (93%)                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Channel Independent (Rate: 35% dari gross)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Jumlah Transaksi  : 30                                │   │
│  │ Total Gross       : Rp 4.500.000                      │   │
│  │ Royalty Platform  : Rp 1.575.000 (35%)                │   │
│  │ Untuk Provider    : Rp 2.925.000 (65%)                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ─────────────────────────────────────────────────────────   │
│                                                               │
│  TOTAL                                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Total Transaksi      : 45                             │   │
│  │ Total Gross          : Rp 6.750.000                   │   │
│  │ Total Royalty (A)    : Rp 1.653.750                   │   │
│  │ Total Untuk (B)      : Rp 3.971.250                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ─────────────────────────────────────────────────────────   │
│                                                               │
│  DETAIL TRANSAKSI                                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ No │ Tanggal │ Package        │ Channel │ Gross │ Net│   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  1 │ 01/11  │ PAPI-Klinik A  │ clinic  │150.000│...│   │
│  │  2 │ 02/11  │ PAPI-Private   │ indep   │150.000│...│   │
│  │ ...│  ...   │ ...            │ ...     │ ...   │...│   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ─────────────────────────────────────────────────────────   │
│                                                               │
│  Informasi Pembayaran:                                       │
│  Bank    : BCA                                               │
│  No. Rek : 1234567890                                        │
│  A/N     : Dr. B                                             │
│                                                               │
│  ─────────────────────────────────────────────────────────   │
│                                                               │
│  Dokumen ini digenerate secara otomatis oleh sistem.         │
│  Settlement ID: abc-123-def-456                              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

```
src/
├── controllers/
│   └── admin/
│       └── royalty/
│           ├── index.js
│           ├── configController.js
│           ├── calculationController.js
│           └── settlementController.js
│
├── routes/
│   └── admin/
│       └── royalty/
│           ├── index.js
│           ├── config.routes.js
│           ├── calculation.routes.js
│           └── settlement.routes.js
│
├── models/
│   ├── royaltyConfig.js
│   ├── royaltyCalculation.js
│   └── royaltySettlement.js
│
├── services/
│   └── royaltyService.js
│
├── migrations/
│   ├── YYYYMMDDHHMMSS-create-royalty-configs.js
│   ├── YYYYMMDDHHMMSS-create-royalty-calculations.js
│   └── YYYYMMDDHHMMSS-create-royalty-settlements.js
│
└── utils/
    └── pdfGenerator.js  (or use existing)
```

---

## 🚀 Implementation Phases

### Phase 1: Core Models & Config (2 days)

| Task | Estimated Time |
|------|---------------|
| Create `RoyaltyConfig` model | 1 hour |
| Create `RoyaltyCalculation` model | 1 hour |
| Create `RoyaltySettlement` model | 1 hour |
| Create migrations | 2 hours |
| Create config controller & routes | 3 hours |
| Test CRUD operations | 2 hours |

### Phase 2: Calculation Engine (2-3 days)

| Task | Estimated Time |
|------|---------------|
| Create `royaltyService.js` | 3 hours |
| Implement channel detection logic | 2 hours |
| Implement calculation algorithm | 3 hours |
| Create calculation controller & routes | 3 hours |
| Manual channel override | 2 hours |
| Testing | 3 hours |

### Phase 3: Settlement & Reports (2 days)

| Task | Estimated Time |
|------|---------------|
| Create settlement controller | 3 hours |
| Implement settlement generation | 2 hours |
| Implement confirm/mark-paid flow | 2 hours |
| PDF report generation | 4 hours |
| Testing | 2 hours |

---

## ✅ Checklist Implementasi

### Pre-Development

- [ ] Review dan approve rancangan ini
- [ ] Confirm royalty rates dengan B
- [ ] Setup PDF generator (jika belum ada)

### Database

- [ ] Create migration: `RoyaltyConfigs`
- [ ] Create migration: `RoyaltyCalculations`
- [ ] Create migration: `RoyaltySettlements`
- [ ] Run migrations
- [ ] Create initial config for B

### Models

- [ ] Create `src/models/royaltyConfig.js`
- [ ] Create `src/models/royaltyCalculation.js`
- [ ] Create `src/models/royaltySettlement.js`
- [ ] Update `src/models/index.js`

### Services

- [ ] Create `src/services/royaltyService.js`
- [ ] Implement `detectChannel()`
- [ ] Implement `calculateRoyalty()`
- [ ] Implement `generateSettlement()`
- [ ] Implement `exportPDF()`

### Controllers & Routes

- [ ] Create config controller & routes
- [ ] Create calculation controller & routes
- [ ] Create settlement controller & routes
- [ ] Mount in admin routes

### Testing

- [ ] Test channel detection with various package names
- [ ] Test calculation accuracy
- [ ] Test settlement generation
- [ ] Test PDF export
- [ ] End-to-end flow test

---

## 📝 Notes

### Keputusan Arsitektur

1. **Super Admin Only**: Fitur ini tidak terexpose ke tenant biasa
2. **No Change to Existing Tables**: Menggunakan data existing dari PsychologyPackage/Session
3. **Flexible Channel Detection**: metadata > pattern > default, dengan manual override
4. **Monthly Settlement**: Akumulasi bulanan untuk kemudahan administrasi

### Metadata di PsychologyPackage

Untuk memudahkan deteksi channel, B bisa set metadata saat create package:

```javascript
// Existing metadata field di PsychologyPackage
metadata: {
  royaltyChannel: "clinic"  // atau "independent"
  // ... other metadata
}
```

Tidak perlu migration karena `metadata` sudah JSONB.

### Future Enhancements

1. **Email Report**: Auto-send PDF ke provider setiap bulan
2. **Dashboard Widget**: Summary royalty di super admin dashboard
3. **Multiple Providers**: Support lebih dari 1 provider dengan rates berbeda
4. **Rate History**: Track jika rates berubah

---

*Document prepared for development phase.*  
*Last reviewed: November 30, 2025*  
*Author: Development Team*
