# Phase 08: Psychology Module - Revised Architecture

> **Revisi berdasarkan prototype + Dynamic Test Support + Hybrid Scoring**
> - Soal: **JSONB di database** (admin bisa paste/upload soal baru dari frontend)
> - Jawaban: JSONB field (backend auto-format berdasarkan struktur soal)
> - Scoring: **HYBRID** - Frontend preview + Backend verify & store
> - PDF: **Frontend generate** (print-friendly page, zero server load)

## Filosofi Arsitektur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  HYBRID SCORING & PRINT-FRIENDLY PDF                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   SOAL (Questions)     JAWABAN (Answers)      SCORING (Hybrid)          │
│   ┌─────────────────┐  ┌─────────────────┐   ┌─────────────────────────┐│
│   │  Database       │  │   Database      │   │  Frontend: Preview      ││
│   │  (JSONB)        │  │   (JSONB)       │   │  Backend:  Verify+Store ││
│   │                 │  │                 │   │                         ││
│   │ TestType        │  │ TestSession     │   │  Same logic (ported     ││
│   │ .questions      │◄─│ .answers        │──►│  from Vue to Node.js)   ││
│   │ .answerSchema   │  │ .scores         │   │                         ││
│   │ .scoringConfig  │  │ .interpretation │   │  ✓ Audit trail          ││
│   └─────────────────┘  └─────────────────┘   │  ✓ Consistency          ││
│                                              │  ✓ Verified results     ││
│                                              └─────────────────────────┘│
│                                                                          │
│   PDF GENERATION (Zero Server Load)                                      │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                                                                  │   │
│   │  1. Backend provides complete data (scores, interpretation)     │   │
│   │  2. Frontend opens print-friendly page (/print/epps/:sessionId) │   │
│   │  3. User uses browser Print → Save as PDF                       │   │
│   │                                                                  │   │
│   │  ✓ Identical to Vue hasil page (same components)                │   │
│   │  ✓ No server load for PDF generation                            │   │
│   │  ✓ Unlimited concurrent users                                   │   │
│   │  ✓ User familiar with browser print                             │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Scoring Strategy: Hybrid Approach

### Mengapa Hybrid?

| Aspek | Frontend Only | Backend Only | **Hybrid** ✓ |
|-------|---------------|--------------|--------------|
| Preview instant | ✓ | ✗ | ✓ |
| Audit trail | ✗ | ✓ | ✓ |
| Tamper-proof | ✗ | ✓ | ✓ |
| Verified results | ✗ | ✓ | ✓ |
| Server load | Zero | High | Low |
| Offline capable | ✓ | ✗ | Partial |

### Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        HYBRID SCORING FLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   1. USER COMPLETES TEST                                                 │
│   ┌─────────────────┐                                                    │
│   │ Frontend        │  Submit answers                                    │
│   │ POST /complete  │─────────────────────────┐                         │
│   └─────────────────┘                         │                         │
│                                               ▼                         │
│   2. BACKEND RECEIVES & CALCULATES    ┌─────────────────┐               │
│                                       │ Backend         │               │
│   • Validate answers                  │ scoringService  │               │
│   • Calculate scores (same logic)     │                 │               │
│   • Generate interpretation           │ PAPI: scales    │               │
│   • Store to database                 │ EPPS: needs     │               │
│                                       └─────────────────┘               │
│                                               │                         │
│   3. FRONTEND DISPLAYS RESULT                 ▼                         │
│   ┌─────────────────┐                 ┌─────────────────┐               │
│   │ Frontend        │◄────────────────│ Response:       │               │
│   │ Vue hasil page  │                 │ scores,         │               │
│   │                 │                 │ interpretation  │               │
│   │ OR calculate    │                 └─────────────────┘               │
│   │ locally for     │                                                    │
│   │ instant preview │                                                    │
│   └─────────────────┘                                                    │
│          │                                                               │
│          │ User clicks "Download PDF"                                    │
│          ▼                                                               │
│   4. PRINT-FRIENDLY PAGE                                                 │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ /print/epps/:sessionId                                           │   │
│   │                                                                  │   │
│   │ • No navbar, no sidebar                                          │   │
│   │ • A4 optimized layout                                            │   │
│   │ • Same Vue components (reused)                                   │   │
│   │ • CSS @media print styles                                        │   │
│   │ • Auto window.print() or manual button                           │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│          │                                                               │
│          ▼                                                               │
│   5. BROWSER PRINT DIALOG                                                │
│   ┌─────────────────┐                                                    │
│   │ Save as PDF     │  ← User choice                                    │
│   │ Print to paper  │                                                    │
│   └─────────────────┘                                                    │
│                                                                          │
│   ✅ PDF identical to Vue hasil page                                    │
│   ✅ Zero server load                                                   │
│   ✅ Scalable for unlimited users                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Dynamic Test Type Support

### Fitur Utama

1. **Admin bisa paste JSON soal** langsung dari frontend
2. **Backend auto-detect format** (PAPI-style array, EPPS-style matrix, dll)
3. **Auto-generate answer schema** untuk validasi jawaban
4. **Tidak perlu edit code** untuk tambah test baru
5. **Hot-add test types** tanpa restart server

### Supported Question Formats

| Format | Example | Answer Schema |
|--------|---------|---------------|
| **Paired Choice (PAPI-style)** | `{id, pair: {A, B}, scaleA, scaleB}` | Array: `[{id, answer}]` |
| **Matrix Choice (EPPS-style)** | `{number, statement_a, statement_b, row_idx, col_idx}` | Object: `{"1": "A", "2": "B"}` |
| **Multiple Choice** | `{id, question, options: [{key, text}]}` | Array: `[{id, answer}]` |
| **Likert Scale** | `{id, question, scale: 1-5}` | Array: `[{id, score}]` |
| **True/False** | `{id, statement}` | Array: `[{id, answer: true/false}]` |

---

## Database Schema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATABASE TABLES                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────┐                                                 │
│  │ PsychologyTestTypes │  (Master: jenis tes yang tersedia)             │
│  ├─────────────────────┤                                                 │
│  │ id                  │  UUID PK                                        │
│  │ tenantId            │  UUID FK -> Tenants                             │
│  │ code                │  STRING UNIQUE (e.g., 'PAPI', 'EPPS')           │
│  │ name                │  STRING                                         │
│  │ description         │  TEXT                                           │
│  │ questionCount       │  INTEGER (auto-calculated dari questions)       │
│  │ estimatedDuration   │  INTEGER (minutes)                              │
│  │ questions           │  JSONB ← SOAL DISIMPAN DISINI                  │
│  │ answerSchema        │  JSONB ← AUTO-GENERATED FORMAT JAWABAN          │
│  │ scoringConfig       │  JSONB ← CONFIG UNTUK SCORING (scales, dll)     │
│  │ config              │  JSONB (test-specific settings)                 │
│  │ isActive            │  BOOLEAN                                        │
│  │ version             │  INTEGER (optimistic locking)                   │
│  │ createdAt/updatedAt │                                                 │
│  └─────────────────────┘                                                 │
│            │                                                             │
│            │ testTypeId (many-to-many via PsychologyPackageItems)       │
│            ▼                                                             │
│  ┌─────────────────────┐                                                 │
│  │ PsychologyPackages  │  (Paket tes - bisa berisi 1 atau lebih tes)   │
│  ├─────────────────────┤                                                 │
│  │ id                  │  UUID PK                                        │
│  │ tenantId            │  UUID FK                                        │
│  │ code                │  STRING UNIQUE (e.g., 'PKG-PAPI', 'PKG-FULL')   │
│  │ name                │  STRING (e.g., 'Paket PAPI Kostick')            │
│  │ description         │  TEXT                                           │
│  │ packageType         │  ENUM (single, bundle)                          │
│  │ basePrice           │  DECIMAL(12,2) ← Harga dasar                   │
│  │ discountType        │  ENUM (none, percentage, fixed)                 │
│  │ discountValue       │  DECIMAL(12,2) ← Nilai diskon                  │
│  │ finalPrice          │  DECIMAL(12,2) ← Harga setelah diskon          │
│  │ estimatedDuration   │  INTEGER (total minutes)                        │
│  │ testCount           │  INTEGER (jumlah tes dalam paket)               │
│  │ validityDays        │  INTEGER (masa berlaku order, default 7)        │
│  │ metadata            │  JSONB                                          │
│  │ isActive            │  BOOLEAN                                        │
│  │ sortOrder           │  INTEGER (untuk display order)                  │
│  │ createdAt/updatedAt │                                                 │
│  └─────────────────────┘                                                 │
│            │                                                             │
│            │ packageId                                                   │
│            ▼                                                             │
│  ┌─────────────────────┐                                                 │
│  │PsychologyPackageItems│ (Item dalam paket - link ke test types)       │
│  ├─────────────────────┤                                                 │
│  │ id                  │  UUID PK                                        │
│  │ packageId           │  UUID FK -> PsychologyPackages                  │
│  │ testTypeId          │  UUID FK -> PsychologyTestTypes                 │
│  │ sortOrder           │  INTEGER (urutan tes dalam paket)               │
│  │ isRequired          │  BOOLEAN (wajib dikerjakan atau opsional)       │
│  │ createdAt/updatedAt │                                                 │
│  └─────────────────────┘                                                 │
│                                                                          │
│  ┌─────────────────────┐                                                 │
│  │ PsychologyPriceRules│ (Aturan harga khusus/promo)                    │
│  ├─────────────────────┤                                                 │
│  │ id                  │  UUID PK                                        │
│  │ tenantId            │  UUID FK                                        │
│  │ name                │  STRING (e.g., 'Promo Tahun Baru')              │
│  │ ruleType            │  ENUM (package_discount, bulk_discount,         │
│  │                     │        time_based, member_discount)             │
│  │ packageId           │  UUID FK -> PsychologyPackages (nullable)       │
│  │ discountType        │  ENUM (percentage, fixed)                       │
│  │ discountValue       │  DECIMAL(12,2)                                  │
│  │ minQuantity         │  INTEGER (untuk bulk discount)                  │
│  │ validFrom           │  TIMESTAMP                                      │
│  │ validUntil          │  TIMESTAMP                                      │
│  │ isActive            │  BOOLEAN                                        │
│  │ priority            │  INTEGER (urutan penerapan rule)                │
│  │ metadata            │  JSONB                                          │
│  │ createdAt/updatedAt │                                                 │
│  └─────────────────────┘                                                 │
│                                                                          │
│  ┌─────────────────────┐                                                 │
│  │  PsychologyOrders   │  (Order/Pembelian paket tes)                   │
│  ├─────────────────────┤                                                 │
│  │ id                  │  UUID PK                                        │
│  │ tenantId            │  UUID FK                                        │
│  │ orderNumber         │  STRING UNIQUE (PSY-20251128-0001)              │
│  │ packageId           │  UUID FK -> PsychologyPackages                  │
│  │ patientId           │  UUID FK -> Patients (nullable)                 │
│  │ accessToken         │  STRING UNIQUE (untuk akses via QR/link)        │
│  │ qrCodeData          │  TEXT (base64 QR image)                         │
│  │ accessUrl           │  STRING                                         │
│  │ status              │  ENUM (pending, paid, in_progress, completed,   │
│  │                     │        verified, cancelled, expired)            │
│  │ baseAmount          │  DECIMAL(12,2) ← Harga paket                   │
│  │ discountAmount      │  DECIMAL(12,2) ← Total diskon                  │
│  │ finalAmount         │  DECIMAL(12,2) ← Total bayar                   │
│  │ priceRuleId         │  UUID FK -> PsychologyPriceRules (nullable)     │
│  │ expiresAt           │  TIMESTAMP                                      │
│  │ paidAt              │  TIMESTAMP                                      │
│  │ paymentMethod       │  STRING                                         │
│  │ paymentRef          │  STRING (referensi pembayaran)                  │
│  │ notes               │  TEXT                                           │
│  │ metadata            │  JSONB                                          │
│  │ createdAt/updatedAt │                                                 │
│  └─────────────────────┘                                                 │
│            │                                                             │
│            │ orderId                                                     │
│            ▼                                                             │
│  ┌─────────────────────┐                                                 │
│  │ PsychologySessions  │  (Session pengerjaan per tes dalam order)      │
│  ├─────────────────────┤                                                 │
│  │ id                  │  UUID PK                                        │
│  │ tenantId            │  UUID FK                                        │
│  │ orderId             │  UUID FK -> PsychologyOrders                    │
│  │ testTypeId          │  UUID FK -> PsychologyTestTypes                 │
│  │ sessionToken        │  STRING UNIQUE                                  │
│  │ sessionNumber       │  INTEGER (urutan tes: 1, 2, 3...)               │
│  │ status              │  ENUM (pending, started, in_progress, paused,   │
│  │                     │        completed, verified, abandoned, timeout) │
│  │ answers             │  JSONB  ← JAWABAN DISIMPAN DISINI              │
│  │ scores              │  JSONB  ← HASIL SCORING (backend calculated)   │
│  │ interpretation      │  JSONB  ← NARASI/INTERPRETASI                  │
│  │ subject             │  JSONB  ← DATA PASIEN/SUBJECT                  │
│  │ startedAt           │  TIMESTAMP                                      │
│  │ completedAt         │  TIMESTAMP                                      │
│  │ verifiedAt          │  TIMESTAMP ← Kapan hasil diverifikasi          │
│  │ verifiedBy          │  UUID FK -> Users (nullable)                    │
│  │ lastActivityAt      │  TIMESTAMP                                      │
│  │ currentQuestion     │  INTEGER                                        │
│  │ metadata            │  JSONB                                          │
│  │ createdAt/updatedAt │                                                 │
│  └─────────────────────┘                                                 │
│                                                                          │
│  ┌─────────────────────┐                                                 │
│  │     Patients        │  (Data pasien)                                 │
│  ├─────────────────────┤                                                 │
│  │ id                  │  UUID PK                                        │
│  │ tenantId            │  UUID FK                                        │
│  │ code                │  STRING (auto-generate)                         │
│  │ fullName            │  STRING                                         │
│  │ email               │  STRING                                         │
│  │ phone               │  STRING                                         │
│  │ birthDate           │  DATE                                           │
│  │ sex                 │  ENUM (male, female)                            │
│  │ personalData        │  JSONB                                          │
│  │ isActive            │  BOOLEAN                                        │
│  │ createdAt/updatedAt │                                                 │
│  └─────────────────────┘                                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Entity Relationship

```
PsychologyTestTypes ←──────┐
        │                  │ (many-to-many)
        │                  │
        ▼                  │
PsychologyPackageItems ────┤
        │                  │
        │ packageId        │
        ▼                  │
PsychologyPackages ────────┘
        │
        │ packageId
        ▼
PsychologyOrders ──────► PsychologyPriceRules (optional discount)
        │
        │ orderId (one-to-many: 1 order = multiple sessions)
        ▼
PsychologySessions ────► PsychologyTestTypes
        │
        │ patientId
        ▼
    Patients
```

---

## JSONB Field Structures

### PsychologyTestTypes.questions

Soal disimpan dalam JSONB. Admin bisa paste JSON dari frontend.

**Format PAPI Kostick (90 soal):**
```json
[
  {
    "id": 1,
    "pair": { "A": "Saya seorang pekerja giat", "B": "Saya bukan seorang pemurung" },
    "scaleA": "G",
    "scaleB": "E"
  },
  {
    "id": 2,
    "pair": { "A": "Saya suka mengerjakan...", "B": "Saya ingin orang memperhatikan..." },
    "scaleA": "N",
    "scaleB": "A"
  }
]
```

**Format EPPS (225 soal):**
```json
[
  {
    "number": 1,
    "statement_a": "Saya ingin menolong teman-teman saya...",
    "statement_b": "Saya ingin berkarya dan bekerja sebaik mungkin.",
    "row_idx": 1,
    "col_idx": 1,
    "mtrx_group": "1"
  }
]
```

### PsychologyTestTypes.answerSchema (AUTO-GENERATED)

Backend auto-generate schema ini saat admin simpan soal:

**For PAPI-style (has `id` + `pair`):**
```json
{
  "type": "array",
  "format": "paired_choice",
  "itemSchema": {
    "id": "number",
    "answer": { "enum": ["A", "B"] }
  },
  "expectedCount": 90,
  "validAnswers": ["A", "B"],
  "identifierField": "id"
}
```

**For EPPS-style (has `number` + `statement_a/b`):**
```json
{
  "type": "object",
  "format": "matrix_choice",
  "keyFormat": "string_number",
  "valueSchema": { "enum": ["A", "B"] },
  "expectedCount": 225,
  "validAnswers": ["A", "B"],
  "identifierField": "number"
}
```

### PsychologyTestTypes.scoringConfig

Konfigurasi untuk frontend scoring (opsional):

```json
{
  "method": "scale_mapping",
  "scales": ["G", "E", "A", "N", "P", "X", "B", "O", "Z", "K", "F", "W", "C", "L", "I", "T", "V", "S", "R", "D"],
  "scaleDescriptions": {
    "G": "Hard Worker - Need to finish task",
    "E": "Role Player - Emotional stability"
  }
}
```

### PsychologySessions.answers

**Format PAPI Kostick (Array):**
```json
[
  { "id": 1, "answer": "B" },
  { "id": 2, "answer": "A" },
  { "id": 90, "answer": "A" }
]
```

**Format EPPS (Object):**
```json
{
  "1": "A",
  "2": "B",
  "225": "B"
}
```

### PsychologySessions.scores (Backend Calculated)

**Format PAPI Kostick:**
```json
{
  "testType": "PAPI",
  "calculatedAt": "2025-11-28T10:05:00Z",
  "scales": [
    { "code": "G", "score": 7, "max": 9, "percent": 0.78, "level": "high" },
    { "code": "E", "score": 5, "max": 9, "percent": 0.56, "level": "medium" },
    { "code": "A", "score": 8, "max": 9, "percent": 0.89, "level": "high" }
  ],
  "dominantScales": ["A", "G", "N"],
  "summary": {
    "totalAnswered": 90,
    "totalQuestions": 90,
    "completionRate": 1.0
  }
}
```

**Format EPPS:**
```json
{
  "testType": "EPPS",
  "calculatedAt": "2025-11-28T10:05:00Z",
  "sex": "male",
  "needs": [
    { "label": "ach", "bb": 8, "bj": 6, "bd": 5.2, "bh": 9.3, "s": 14.5, "category": "High" },
    { "label": "def", "bb": 5, "bj": 4, "bd": 3.1, "bh": 6.1, "s": 9.2, "category": "Average" },
    { "label": "ord", "bb": 7, "bj": 5, "bd": 4.5, "bh": 8.0, "s": 12.5, "category": "High" }
  ],
  "consistency": {
    "pair_1_7": { "matches": 4, "total": 5, "percent": 80 },
    "pair_2_5": { "matches": 5, "total": 5, "percent": 100 },
    "pair_3_9": { "matches": 3, "total": 5, "percent": 60 }
  },
  "topNeeds": ["ach", "ord", "exh"],
  "summary": {
    "totalAnswered": 225,
    "totalQuestions": 225,
    "completionRate": 1.0,
    "averageConsistency": 80
  }
}
```

### PsychologySessions.interpretation (Backend Generated)

**Format PAPI Kostick:**
```json
{
  "generatedAt": "2025-11-28T10:05:00Z",
  "narratives": {
    "G": {
      "code": "G",
      "title": "Hard Worker",
      "level": "high",
      "label": "Tinggi",
      "narrative": "Individu dengan skor G tinggi menunjukkan..."
    },
    "A": {
      "code": "A", 
      "title": "Need to Achieve",
      "level": "high",
      "label": "Tinggi",
      "narrative": "Individu dengan skor A tinggi memiliki kebutuhan..."
    }
  },
  "topScales": [
    { "code": "A", "title": "Need to Achieve", "narrative": "..." },
    { "code": "G", "title": "Hard Worker", "narrative": "..." }
  ],
  "generalConclusion": "Berdasarkan hasil tes PAPI Kostick, individu ini menunjukkan karakteristik..."
}
```

**Format EPPS:**
```json
{
  "generatedAt": "2025-11-28T10:05:00Z",
  "narratives": {
    "ach": {
      "label": "Achievement",
      "title": "Need for Achievement",
      "level": "high",
      "s": 14.5,
      "narrative": "Individu dengan kebutuhan achievement tinggi..."
    },
    "ord": {
      "label": "Order",
      "title": "Need for Order", 
      "level": "high",
      "s": 12.5,
      "narrative": "Individu dengan kebutuhan order tinggi..."
    }
  },
  "topNeeds": [
    { "label": "ach", "title": "Achievement", "narrative": "..." },
    { "label": "ord", "title": "Order", "narrative": "..." }
  ],
  "consistencyNote": "Tingkat konsistensi jawaban: 80% (baik)",
  "generalConclusion": "Berdasarkan hasil tes EPPS, individu ini menunjukkan..."
}
```

### PsychologySessions.subject
```json
{
  "id": "80-65-34-81",
  "name": "Wira Andika",
  "sex": "male",
  "age": 25,
  "registration": {
    "id": "9c82c93d-30b8-4b61-b469-b4f6354920d7",
    "code": "REG/20251128/00011"
  }
}
```

### PsychologyPackages (Package Examples)

**Single Test Package:**
```json
{
  "id": "pkg-001",
  "code": "PKG-PAPI",
  "name": "Tes PAPI Kostick",
  "packageType": "single",
  "basePrice": 150000,
  "discountType": "none",
  "discountValue": 0,
  "finalPrice": 150000,
  "testCount": 1,
  "estimatedDuration": 30,
  "validityDays": 7
}
```

**Bundle Package (Multiple Tests):**
```json
{
  "id": "pkg-002",
  "code": "PKG-FULL",
  "name": "Paket Lengkap Psikotes",
  "description": "PAPI Kostick + EPPS + IST",
  "packageType": "bundle",
  "basePrice": 500000,
  "discountType": "percentage",
  "discountValue": 20,
  "finalPrice": 400000,
  "testCount": 3,
  "estimatedDuration": 180,
  "validityDays": 14
}
```

### PsychologyPackageItems (Link Package to Tests)
```json
[
  { "packageId": "pkg-002", "testTypeId": "papi-id", "sortOrder": 1, "isRequired": true },
  { "packageId": "pkg-002", "testTypeId": "epps-id", "sortOrder": 2, "isRequired": true },
  { "packageId": "pkg-002", "testTypeId": "ist-id", "sortOrder": 3, "isRequired": false }
]
```

### PsychologyPriceRules (Discount Rules)

**Time-based Promo:**
```json
{
  "id": "rule-001",
  "name": "Promo Tahun Baru 2025",
  "ruleType": "time_based",
  "packageId": null,
  "discountType": "percentage",
  "discountValue": 15,
  "validFrom": "2025-01-01T00:00:00Z",
  "validUntil": "2025-01-31T23:59:59Z",
  "isActive": true,
  "priority": 1
}
```

**Bulk Discount:**
```json
{
  "id": "rule-002",
  "name": "Diskon Rekrutmen Massal",
  "ruleType": "bulk_discount",
  "packageId": "pkg-001",
  "discountType": "percentage",
  "discountValue": 25,
  "minQuantity": 10,
  "isActive": true,
  "priority": 2
}
```

**Package-specific Discount:**
```json
{
  "id": "rule-003",
  "name": "Diskon Paket Lengkap",
  "ruleType": "package_discount",
  "packageId": "pkg-002",
  "discountType": "fixed",
  "discountValue": 50000,
  "isActive": true,
  "priority": 3
}
```

---

## Question Parser Service (NEW!)

Backend auto-detect format soal dan generate answer schema:

**File: `src/modules/psychology/services/questionParserService.js`**
```javascript
/**
 * QuestionParserService
 * Auto-detect question format dan generate answer schema
 */
class QuestionParserService {
  
  /**
   * Parse questions JSON dari frontend
   * @param {string|Array|Object} input - Raw JSON string atau parsed array/object
   * @returns {Object} { questions, answerSchema, questionCount, detectedFormat }
   */
  parseQuestions(input) {
    // Parse if string
    let questions = typeof input === 'string' ? JSON.parse(input) : input;
    
    // Handle wrapper object (e.g., { data: [...] })
    if (questions.data && Array.isArray(questions.data)) {
      questions = questions.data;
    }
    
    // Must be array
    if (!Array.isArray(questions)) {
      throw new Error('Questions must be an array');
    }
    
    if (questions.length === 0) {
      throw new Error('Questions array cannot be empty');
    }
    
    // Detect format from first question
    const sample = questions[0];
    const format = this.detectFormat(sample);
    const answerSchema = this.generateAnswerSchema(questions, format);
    
    return {
      questions,
      answerSchema,
      questionCount: questions.length,
      detectedFormat: format
    };
  }
  
  /**
   * Detect question format from sample question
   */
  detectFormat(sample) {
    // PAPI-style: has id + pair object
    if (sample.id !== undefined && sample.pair && typeof sample.pair === 'object') {
      return 'paired_choice';
    }
    
    // EPPS-style: has number + statement_a + statement_b
    if (sample.number !== undefined && sample.statement_a && sample.statement_b) {
      return 'matrix_choice';
    }
    
    // Multiple choice: has options array
    if (sample.options && Array.isArray(sample.options)) {
      return 'multiple_choice';
    }
    
    // Likert scale: has scale property
    if (sample.scale !== undefined) {
      return 'likert_scale';
    }
    
    // True/False: has statement only
    if (sample.statement && !sample.pair && !sample.options) {
      return 'true_false';
    }
    
    // Default to generic
    return 'generic';
  }
  
  /**
   * Generate answer schema based on detected format
   */
  generateAnswerSchema(questions, format) {
    const sample = questions[0];
    
    switch (format) {
      case 'paired_choice':
        return {
          type: 'array',
          format: 'paired_choice',
          itemSchema: {
            id: typeof sample.id === 'number' ? 'number' : 'string',
            answer: { enum: ['A', 'B'] }
          },
          expectedCount: questions.length,
          validAnswers: ['A', 'B'],
          identifierField: 'id'
        };
        
      case 'matrix_choice':
        return {
          type: 'object',
          format: 'matrix_choice',
          keyFormat: 'string_number',
          valueSchema: { enum: ['A', 'B'] },
          expectedCount: questions.length,
          validAnswers: ['A', 'B'],
          identifierField: 'number'
        };
        
      case 'multiple_choice':
        const optionKeys = sample.options.map(o => o.key || o.value || o.id);
        return {
          type: 'array',
          format: 'multiple_choice',
          itemSchema: {
            id: typeof sample.id === 'number' ? 'number' : 'string',
            answer: { enum: optionKeys }
          },
          expectedCount: questions.length,
          validAnswers: optionKeys,
          identifierField: 'id'
        };
        
      case 'likert_scale':
        const maxScale = sample.scale || 5;
        const scaleValues = Array.from({ length: maxScale }, (_, i) => i + 1);
        return {
          type: 'array',
          format: 'likert_scale',
          itemSchema: {
            id: typeof sample.id === 'number' ? 'number' : 'string',
            score: { min: 1, max: maxScale }
          },
          expectedCount: questions.length,
          validAnswers: scaleValues,
          identifierField: 'id'
        };
        
      case 'true_false':
        return {
          type: 'array',
          format: 'true_false',
          itemSchema: {
            id: typeof sample.id === 'number' ? 'number' : 'string',
            answer: { enum: [true, false, 'true', 'false', 'T', 'F'] }
          },
          expectedCount: questions.length,
          validAnswers: [true, false],
          identifierField: 'id'
        };
        
      default:
        return {
          type: 'array',
          format: 'generic',
          itemSchema: {
            id: 'any',
            answer: 'any'
          },
          expectedCount: questions.length,
          validAnswers: null,
          identifierField: sample.id !== undefined ? 'id' : 'number'
        };
    }
  }
  
  /**
   * Validate answers against answer schema
   */
  validateAnswers(answers, answerSchema) {
    const errors = [];
    
    if (answerSchema.type === 'array') {
      if (!Array.isArray(answers)) {
        errors.push('Answers must be an array');
        return { valid: false, errors };
      }
      
      if (answers.length !== answerSchema.expectedCount) {
        errors.push(`Expected ${answerSchema.expectedCount} answers, got ${answers.length}`);
      }
      
      answers.forEach((item, idx) => {
        if (answerSchema.validAnswers && !answerSchema.validAnswers.includes(item.answer)) {
          errors.push(`Invalid answer at index ${idx}: ${item.answer}`);
        }
      });
    }
    
    if (answerSchema.type === 'object') {
      if (typeof answers !== 'object' || Array.isArray(answers)) {
        errors.push('Answers must be an object');
        return { valid: false, errors };
      }
      
      const answerCount = Object.keys(answers).length;
      if (answerCount !== answerSchema.expectedCount) {
        errors.push(`Expected ${answerSchema.expectedCount} answers, got ${answerCount}`);
      }
      
      Object.entries(answers).forEach(([key, value]) => {
        if (answerSchema.validAnswers && !answerSchema.validAnswers.includes(value)) {
          errors.push(`Invalid answer for question ${key}: ${value}`);
        }
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Initialize empty answers based on schema
   */
  initializeAnswers(answerSchema) {
    if (answerSchema.type === 'array') {
      return [];
    }
    return {};
  }
  
  /**
   * Extract scoring metadata from questions (scales, etc.)
   */
  extractScoringConfig(questions, format) {
    if (format === 'paired_choice') {
      // Extract unique scales from PAPI-style questions
      const scales = new Set();
      questions.forEach(q => {
        if (q.scaleA) scales.add(q.scaleA);
        if (q.scaleB) scales.add(q.scaleB);
      });
      return {
        method: 'scale_mapping',
        scales: Array.from(scales).sort()
      };
    }
    
    if (format === 'matrix_choice') {
      // EPPS uses matrix groups
      const groups = new Set();
      questions.forEach(q => {
        if (q.mtrx_group) groups.add(q.mtrx_group);
      });
      return {
        method: 'matrix_scoring',
        matrixGroups: Array.from(groups).sort()
      };
    }
    
    return { method: 'sum_scores' };
  }
}

module.exports = new QuestionParserService();
```

---

## Scoring Service (Hybrid - Backend Calculate & Store)

Logic di-port dari Vue yang sudah approved psikolog ke Node.js service.

**File: `src/modules/psychology/services/scoringService.js`**
```javascript
/**
 * ScoringService
 * Port dari Vue scoring logic ke backend untuk verify & store
 * Logic HARUS identik dengan frontend untuk konsistensi
 */

// Import narratives data (same as Vue)
const papiNarratives = require('../data/papiKostick_narratives.json');
const papiNorms = require('../data/papiKostick_norms.json');
const eppsNarratives = require('../data/eppsNarratives.json');
const { getTraitCategory } = require('../data/eppsScoring');
const { computeBD, computeBH } = require('../data/eppsSumif');

class ScoringService {
  
  /**
   * Calculate scores based on test type
   * @param {string} testTypeCode - PAPI, EPPS, etc.
   * @param {Object} answers - Raw answers from session
   * @param {Array} questions - Questions from test type
   * @param {Object} options - { sex: 'male'|'female' } for EPPS
   * @returns {Object} { scores, interpretation }
   */
  calculate(testTypeCode, answers, questions, options = {}) {
    const code = testTypeCode.toUpperCase();
    
    switch (code) {
      case 'PAPI':
        return this.calculatePapi(answers, questions);
      case 'EPPS':
        return this.calculateEpps(answers, questions, options.sex || 'male');
      default:
        return this.calculateGeneric(answers, questions);
    }
  }
  
  /**
   * PAPI Kostick Scoring
   * Ported from papikostick/index.vue
   */
  calculatePapi(answers, questions) {
    // Build answer map: id -> answer
    const answerMap = {};
    if (Array.isArray(answers)) {
      answers.forEach(a => {
        if (a && a.id != null) answerMap[a.id] = a.answer;
      });
    }
    
    // Calculate counts per scale
    const counts = {};
    const maxes = {};
    
    questions.forEach(q => {
      const ans = answerMap[q.id];
      if (ans === 'A' && q.scaleA) {
        counts[q.scaleA] = (counts[q.scaleA] || 0) + 1;
      } else if (ans === 'B' && q.scaleB) {
        counts[q.scaleB] = (counts[q.scaleB] || 0) + 1;
      }
      
      // Track max per scale
      if (q.scaleA) maxes[q.scaleA] = (maxes[q.scaleA] || 0) + 1;
      if (q.scaleB) maxes[q.scaleB] = (maxes[q.scaleB] || 0) + 1;
    });
    
    // Build scales array with interpretation
    const scales = [];
    const allScales = new Set([...Object.keys(counts), ...Object.keys(maxes)]);
    
    allScales.forEach(code => {
      const score = counts[code] || 0;
      const max = maxes[code] || 0;
      const percent = max > 0 ? score / max : 0;
      const level = this.getPapiLevel(percent);
      const narrative = this.getPapiNarrative(code, level);
      
      scales.push({
        code,
        score,
        max,
        percent,
        level,
        label: this.getLevelLabel(level),
        title: narrative.title || code,
        narrative: narrative.text || ''
      });
    });
    
    // Sort by score descending
    scales.sort((a, b) => b.score - a.score);
    
    const dominantScales = scales.slice(0, 5).map(s => s.code);
    
    const scores = {
      testType: 'PAPI',
      calculatedAt: new Date().toISOString(),
      scales,
      dominantScales,
      summary: {
        totalAnswered: Object.keys(answerMap).length,
        totalQuestions: questions.length,
        completionRate: Object.keys(answerMap).length / questions.length
      }
    };
    
    const interpretation = {
      generatedAt: new Date().toISOString(),
      narratives: {},
      topScales: scales.slice(0, 5).map(s => ({
        code: s.code,
        title: s.title,
        level: s.level,
        narrative: s.narrative
      })),
      generalConclusion: this.generatePapiConclusion(scales.slice(0, 5))
    };
    
    // Add all narratives
    scales.forEach(s => {
      interpretation.narratives[s.code] = {
        code: s.code,
        title: s.title,
        level: s.level,
        label: s.label,
        narrative: s.narrative
      };
    });
    
    return { scores, interpretation };
  }
  
  /**
   * EPPS Scoring
   * Ported from epps/index.vue
   */
  calculateEpps(answers, questions, sex = 'male') {
    // Convert answers to map format
    const answersMap = {};
    if (typeof answers === 'object' && !Array.isArray(answers)) {
      Object.entries(answers).forEach(([k, v]) => {
        answersMap[parseInt(k)] = v;
      });
    }
    
    // EPPS needs config (15 needs)
    const allNeeds = ['ach', 'def', 'ord', 'exh', 'aut', 'aff', 'int', 'suc', 'dom', 'aba', 'nur', 'chg', 'end', 'het', 'agg'];
    
    // Matrix block configuration
    const EXCLUDED_DIAGONAL_BLOCKS = [1, 5, 9];
    const excludedDiagonals = this.getExcludedDiagonals(EXCLUDED_DIAGONAL_BLOCKS);
    
    // Calculate needs scores
    const needs = allNeeds.map((label, idx) => {
      const bb = this.getEppsBB(label, idx, answersMap, questions, excludedDiagonals);
      const bj = this.getEppsBJ(label, idx, answersMap, questions, excludedDiagonals);
      const bd = computeBD(bj);
      const bh = computeBH(bb, bd);
      const s = (typeof bd === 'number' ? bd : 0) + (typeof bh === 'number' ? bh : 0);
      const category = getTraitCategory(sex, label, s) || '-';
      
      return { label, bb, bj, bd, bh, s, category };
    });
    
    // Sort by S descending for top needs
    const sortedNeeds = [...needs].sort((a, b) => b.s - a.s);
    const topNeeds = sortedNeeds.slice(0, 5).map(n => n.label);
    
    // Consistency check (diagonal pairs 1:7, 2:5, 3:9)
    const consistency = {
      pair_1_7: this.calculateConsistency(1, 7, answersMap),
      pair_2_5: this.calculateConsistency(2, 5, answersMap),
      pair_3_9: this.calculateConsistency(3, 9, answersMap)
    };
    
    const avgConsistency = Math.round(
      (consistency.pair_1_7.percent + consistency.pair_2_5.percent + consistency.pair_3_9.percent) / 3
    );
    
    const scores = {
      testType: 'EPPS',
      calculatedAt: new Date().toISOString(),
      sex,
      needs,
      consistency,
      topNeeds,
      summary: {
        totalAnswered: Object.keys(answersMap).length,
        totalQuestions: 225,
        completionRate: Object.keys(answersMap).length / 225,
        averageConsistency: avgConsistency
      }
    };
    
    // Generate interpretation
    const interpretation = {
      generatedAt: new Date().toISOString(),
      narratives: {},
      topNeeds: sortedNeeds.slice(0, 5).map(n => ({
        label: n.label,
        title: this.getEppsTitle(n.label),
        level: this.getEppsLevel(n.s, Math.max(...needs.map(x => x.s))),
        s: n.s,
        narrative: this.getEppsNarrative(n.label, n.category)
      })),
      consistencyNote: `Tingkat konsistensi jawaban: ${avgConsistency}% (${avgConsistency >= 70 ? 'baik' : 'perlu perhatian'})`,
      generalConclusion: this.generateEppsConclusion(sortedNeeds.slice(0, 5), sex)
    };
    
    // Add all narratives
    needs.forEach(n => {
      interpretation.narratives[n.label] = {
        label: n.label,
        title: this.getEppsTitle(n.label),
        level: n.category,
        s: n.s,
        narrative: this.getEppsNarrative(n.label, n.category)
      };
    });
    
    return { scores, interpretation };
  }
  
  /**
   * Generic scoring for other test types
   */
  calculateGeneric(answers, questions) {
    const totalAnswered = Array.isArray(answers) 
      ? answers.length 
      : Object.keys(answers).length;
    
    return {
      scores: {
        testType: 'GENERIC',
        calculatedAt: new Date().toISOString(),
        rawAnswers: answers,
        summary: {
          totalAnswered,
          totalQuestions: questions.length,
          completionRate: totalAnswered / questions.length
        }
      },
      interpretation: {
        generatedAt: new Date().toISOString(),
        note: 'Generic test type - no specific interpretation available'
      }
    };
  }
  
  // Helper methods
  
  getPapiLevel(percent) {
    if (percent >= 0.7) return 'high';
    if (percent >= 0.4) return 'medium';
    return 'low';
  }
  
  getLevelLabel(level) {
    const labels = { high: 'Tinggi', medium: 'Sedang', low: 'Rendah' };
    return labels[level] || level;
  }
  
  getPapiNarrative(code, level) {
    const data = papiNarratives[code] || {};
    return {
      title: data.title || code,
      text: data.levels?.[level] || data.description || ''
    };
  }
  
  getEppsTitle(label) {
    const titles = {
      ach: 'Achievement', def: 'Deference', ord: 'Order', exh: 'Exhibition',
      aut: 'Autonomy', aff: 'Affiliation', int: 'Intraception', suc: 'Succorance',
      dom: 'Dominance', aba: 'Abasement', nur: 'Nurturance', chg: 'Change',
      end: 'Endurance', het: 'Heterosexuality', agg: 'Aggression'
    };
    return titles[label] || label;
  }
  
  getEppsLevel(s, maxS) {
    const pct = maxS > 0 ? s / maxS : 0;
    if (pct > 0.66) return 'high';
    if (pct > 0.33) return 'medium';
    return 'low';
  }
  
  getEppsNarrative(label, category) {
    const data = eppsNarratives[label] || {};
    return data.levels?.[category.toLowerCase()] || data.description || '';
  }
  
  getExcludedDiagonals(blocks) {
    const excluded = new Set();
    blocks.forEach(b => {
      const diag = this.getBlockDiagonals(b);
      diag.forEach(q => excluded.add(q));
    });
    return excluded;
  }
  
  getBlockDiagonals(blockNumber) {
    // Get 5 diagonal questions from a 5x5 block
    const base = (blockNumber - 1) * 25;
    const diag = [];
    for (let i = 0; i < 5; i++) {
      diag.push(base + i * 5 + i + 1);
    }
    return diag;
  }
  
  getEppsBB(label, idx, answersMap, questions, excluded) {
    // Count 'A' answers in row (excluding diagonals)
    // Simplified - actual implementation follows Vue logic
    let count = 0;
    const groupIdx = Math.floor(idx / 5);
    const rowIdx = idx % 5;
    
    for (let col = 0; col < 15; col++) {
      const qNum = groupIdx * 75 + col * 5 + rowIdx + 1;
      if (!excluded.has(qNum) && answersMap[qNum] === 'A') {
        count++;
      }
    }
    return count;
  }
  
  getEppsBJ(label, idx, answersMap, questions, excluded) {
    // Count 'B' answers in column (excluding diagonals)
    let count = 0;
    const colGroupIdx = idx % 3;
    const colIdx = Math.floor(idx / 3);
    
    for (let row = 0; row < 15; row++) {
      const blockIdx = colGroupIdx + Math.floor(row / 5) * 3;
      const qNum = blockIdx * 25 + (row % 5) * 5 + colIdx + 1;
      if (!excluded.has(qNum) && answersMap[qNum] === 'B') {
        count++;
      }
    }
    return count;
  }
  
  calculateConsistency(block1, block2, answersMap) {
    const diag1 = this.getBlockDiagonals(block1);
    const diag2 = this.getBlockDiagonals(block2);
    
    let matches = 0;
    let total = 0;
    
    for (let i = 0; i < 5; i++) {
      const v1 = answersMap[diag1[i]];
      const v2 = answersMap[diag2[i]];
      if (v1 && v2) {
        total++;
        if (v1 === v2) matches++;
      }
    }
    
    return {
      matches,
      total,
      percent: total > 0 ? Math.round((matches / total) * 100) : 0
    };
  }
  
  generatePapiConclusion(topScales) {
    const scaleNames = topScales.map(s => s.title).join(', ');
    return `Berdasarkan hasil tes PAPI Kostick, individu ini menunjukkan karakteristik dominan pada aspek ${scaleNames}. Interpretasi lebih lanjut sebaiknya dilakukan oleh psikolog profesional.`;
  }
  
  generateEppsConclusion(topNeeds, sex) {
    const needNames = topNeeds.map(n => this.getEppsTitle(n.label)).join(', ');
    const genderText = sex === 'male' ? 'Pria' : 'Wanita';
    return `Berdasarkan hasil tes EPPS untuk ${genderText}, individu ini menunjukkan kebutuhan dominan pada aspek ${needNames}. Interpretasi lebih lanjut sebaiknya dilakukan oleh psikolog profesional.`;
  }
}

module.exports = new ScoringService();
```

---

## Result API Response (Complete Data for Frontend)

### GET /api/v1/psychology/sessions/:id/result

Response lengkap untuk frontend render hasil dan print:

```javascript
// GET /api/v1/psychology/sessions/:sessionId/result
{
  "success": true,
  "data": {
    "session": {
      "id": "uuid-session",
      "sessionNumber": 1,
      "status": "completed",
      "completedAt": "2025-11-28T10:00:00Z",
      "verifiedAt": "2025-11-28T10:05:00Z",
      "verifiedBy": { "id": "uuid-user", "name": "Dr. Psikolog" }
    },
    "order": {
      "id": "uuid-order",
      "orderNumber": "PSY-20251128-0001",
      "package": { "code": "PKG-PAPI", "name": "Tes PAPI Kostick" }
    },
    "patient": {
      "id": "uuid-patient",
      "fullName": "John Doe",
      "code": "PAT-001",
      "age": 25,
      "sex": "male",
      "birthDate": "2000-01-15"
    },
    "testType": {
      "id": "uuid-test-type",
      "code": "PAPI",
      "name": "PAPI Kostick",
      "description": "Tes kepribadian untuk menilai perilaku kerja",
      "questionCount": 90
    },
    "tenant": {
      "id": "uuid-tenant",
      "name": "Klinik Psikologi ABC",
      "logo": "https://...",
      "address": "Jl. Contoh No. 123"
    },
    
    // Raw data
    "answers": [
      { "id": 1, "answer": "B" },
      { "id": 2, "answer": "A" }
    ],
    
    // Backend calculated (verified)
    "scores": {
      "testType": "PAPI",
      "calculatedAt": "2025-11-28T10:05:00Z",
      "scales": [
        { "code": "G", "score": 7, "max": 9, "percent": 0.78, "level": "high", "title": "Hard Worker" },
        { "code": "A", "score": 8, "max": 9, "percent": 0.89, "level": "high", "title": "Need to Achieve" }
      ],
      "dominantScales": ["A", "G", "N"],
      "summary": { "totalAnswered": 90, "totalQuestions": 90, "completionRate": 1.0 }
    },
    
    // Backend generated interpretation
    "interpretation": {
      "generatedAt": "2025-11-28T10:05:00Z",
      "narratives": {
        "G": { "code": "G", "title": "Hard Worker", "level": "high", "narrative": "..." },
        "A": { "code": "A", "title": "Need to Achieve", "level": "high", "narrative": "..." }
      },
      "topScales": [
        { "code": "A", "title": "Need to Achieve", "narrative": "..." }
      ],
      "generalConclusion": "Berdasarkan hasil tes PAPI Kostick, individu ini..."
    },
    
    // For printing
    "printMetadata": {
      "generatedAt": "2025-11-28T10:10:00Z",
      "printUrl": "/print/papikostick/uuid-session",
      "watermark": "Klinik Psikologi ABC - Confidential"
    }
  }
}
```

---

## Print-Friendly Page (Frontend)

### Frontend Routes untuk Print

```javascript
// Vue Router
{
  path: '/print/papikostick/:sessionId',
  name: 'print-papikostick',
  component: () => import('@/views/print/PapikostickPrint.vue'),
  meta: { layout: 'PrintLayout', public: false }
},
{
  path: '/print/epps/:sessionId',
  name: 'print-epps', 
  component: () => import('@/views/print/EppsPrint.vue'),
  meta: { layout: 'PrintLayout', public: false }
}
```

### Print Layout Component

```vue
<!-- layouts/PrintLayout.vue -->
<template>
  <div class="print-layout">
    <!-- No navbar, no sidebar -->
    <router-view />
  </div>
</template>

<style>
.print-layout {
  background: white;
  min-height: 100vh;
}

@media print {
  .print-layout {
    margin: 0;
    padding: 0;
  }
}
</style>
```

### Print Page Component

```vue
<!-- views/print/PapikostickPrint.vue -->
<template>
  <div class="print-container">
    <!-- Header -->
    <header class="print-header">
      <div class="flex justify-between items-center">
        <img :src="result.tenant.logo" class="h-16" />
        <div class="text-right">
          <h1 class="text-xl font-bold">Hasil Tes {{ result.testType.name }}</h1>
          <p class="text-sm">{{ formatDate(result.session.completedAt) }}</p>
        </div>
      </div>
    </header>

    <!-- Patient Info -->
    <section class="patient-section">
      <h2>Data Peserta</h2>
      <table class="info-table">
        <tr><td>Nama</td><td>{{ result.patient.fullName }}</td></tr>
        <tr><td>Usia</td><td>{{ result.patient.age }} tahun</td></tr>
        <tr><td>Jenis Kelamin</td><td>{{ result.patient.sex === 'male' ? 'Laki-laki' : 'Perempuan' }}</td></tr>
        <tr><td>Kode Registrasi</td><td>{{ result.order.orderNumber }}</td></tr>
      </table>
    </section>

    <!-- Scores Table (reuse existing component) -->
    <section class="scores-section">
      <h2>Ringkasan Skor</h2>
      <ScoreTable :scales="result.scores.scales" />
    </section>

    <!-- Chart -->
    <section class="chart-section">
      <h2>Profil Skala</h2>
      <ScaleChart :scales="result.scores.scales" :print-mode="true" />
    </section>

    <!-- Interpretation -->
    <section class="interpretation-section page-break-before">
      <h2>Interpretasi</h2>
      <div v-for="scale in result.interpretation.topScales" :key="scale.code" class="interpretation-card">
        <h3>{{ scale.title }} ({{ scale.code }})</h3>
        <p>{{ scale.narrative }}</p>
      </div>
      
      <div class="conclusion">
        <h3>Kesimpulan</h3>
        <p>{{ result.interpretation.generalConclusion }}</p>
      </div>
    </section>

    <!-- Footer -->
    <footer class="print-footer">
      <p>{{ result.tenant.name }} - {{ result.tenant.address }}</p>
      <p class="text-xs">Dokumen ini bersifat rahasia dan hanya untuk keperluan internal.</p>
      <p class="text-xs">Generated: {{ result.printMetadata.generatedAt }}</p>
    </footer>

    <!-- Print Button (hidden when printing) -->
    <div class="no-print fixed bottom-4 right-4">
      <button @click="printPage" class="btn btn-primary">
        🖨️ Print / Save PDF
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const result = ref(null);

onMounted(async () => {
  const sessionId = route.params.sessionId;
  const response = await fetch(`/api/v1/psychology/sessions/${sessionId}/result`);
  result.value = await response.json().then(r => r.data);
});

const printPage = () => {
  window.print();
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};
</script>

<style>
.print-container {
  max-width: 210mm; /* A4 width */
  margin: 0 auto;
  padding: 20mm;
  font-family: 'Times New Roman', serif;
}

.print-header {
  border-bottom: 2px solid #333;
  padding-bottom: 10mm;
  margin-bottom: 10mm;
}

.patient-section,
.scores-section,
.chart-section,
.interpretation-section {
  margin-bottom: 10mm;
}

.page-break-before {
  page-break-before: always;
}

.info-table td {
  padding: 2mm 5mm;
  border: 1px solid #ddd;
}

.interpretation-card {
  margin-bottom: 5mm;
  padding: 5mm;
  border-left: 3px solid #3b82f6;
  background: #f8fafc;
}

.print-footer {
  margin-top: 20mm;
  padding-top: 10mm;
  border-top: 1px solid #ddd;
  text-align: center;
}

/* Print styles */
@media print {
  .no-print {
    display: none !important;
  }
  
  .print-container {
    padding: 15mm;
    max-width: 100%;
  }
  
  .page-break-before {
    page-break-before: always;
  }
  
  .interpretation-card {
    break-inside: avoid;
  }
}

/* Optional: force color printing for charts */
@media print {
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
</style>
```

---

## API Endpoints

### Admin/Staff Endpoints (Protected)

```
# Test Types (dengan fitur paste questions)
GET    /api/v1/psychology/test-types              # List semua jenis tes
POST   /api/v1/psychology/test-types              # Tambah jenis tes baru + paste questions
GET    /api/v1/psychology/test-types/:id          # Detail jenis tes (include questions)
PUT    /api/v1/psychology/test-types/:id          # Update jenis tes + questions
DELETE /api/v1/psychology/test-types/:id          # Delete (soft)
POST   /api/v1/psychology/test-types/validate     # Validate questions JSON (dry-run)

# Packages (Paket Tes)
GET    /api/v1/psychology/packages                # List semua paket
POST   /api/v1/psychology/packages                # Buat paket baru
GET    /api/v1/psychology/packages/:id            # Detail paket (include items)
PUT    /api/v1/psychology/packages/:id            # Update paket
DELETE /api/v1/psychology/packages/:id            # Delete (soft)
POST   /api/v1/psychology/packages/:id/items      # Add test to package
DELETE /api/v1/psychology/packages/:id/items/:itemId  # Remove test from package
PUT    /api/v1/psychology/packages/:id/items/reorder  # Reorder tests in package

# Price Rules (Aturan Harga/Promo)
GET    /api/v1/psychology/price-rules             # List semua price rules
POST   /api/v1/psychology/price-rules             # Buat price rule baru
GET    /api/v1/psychology/price-rules/:id         # Detail price rule
PUT    /api/v1/psychology/price-rules/:id         # Update price rule
DELETE /api/v1/psychology/price-rules/:id         # Delete price rule
POST   /api/v1/psychology/price-rules/calculate   # Calculate price with rules

# Orders
GET    /api/v1/psychology/orders                  # List orders
POST   /api/v1/psychology/orders                  # Buat order baru -> generate QR
GET    /api/v1/psychology/orders/:id              # Detail order (include sessions)
PUT    /api/v1/psychology/orders/:id/status       # Update status
POST   /api/v1/psychology/orders/:id/pay          # Mark as paid
POST   /api/v1/psychology/orders/:id/regenerate-qr  # Regenerate QR

# Sessions (Admin view)
GET    /api/v1/psychology/sessions                # List sessions
GET    /api/v1/psychology/sessions/:id            # Detail session + answers

# Results
GET    /api/v1/psychology/results                 # List completed sessions
GET    /api/v1/psychology/results/:sessionId      # Get session result

# Patients
GET    /api/v1/psychology/patients                # List patients
POST   /api/v1/psychology/patients                # Add patient
GET    /api/v1/psychology/patients/:id            # Detail patient
PUT    /api/v1/psychology/patients/:id            # Update patient
```

### Package Management Examples

```javascript
// POST /api/v1/psychology/packages - Create Package
{
  "code": "PKG-PAPI",
  "name": "Tes PAPI Kostick",
  "description": "Tes kepribadian untuk menilai perilaku kerja",
  "packageType": "single",
  "basePrice": 150000,
  "discountType": "none",
  "discountValue": 0,
  "validityDays": 7,
  "testTypeIds": ["uuid-papi-kostick"]  // Single test
}

// Response
{
  "success": true,
  "data": {
    "id": "uuid...",
    "code": "PKG-PAPI",
    "name": "Tes PAPI Kostick",
    "packageType": "single",
    "basePrice": 150000,
    "finalPrice": 150000,
    "testCount": 1,
    "estimatedDuration": 30,
    "items": [
      { "testType": { "id": "...", "code": "PAPI", "name": "PAPI Kostick" }, "sortOrder": 1 }
    ]
  }
}
```

```javascript
// POST /api/v1/psychology/packages - Create Bundle
{
  "code": "PKG-REKRUTMEN",
  "name": "Paket Rekrutmen Lengkap",
  "description": "PAPI + EPPS + IST untuk screening karyawan",
  "packageType": "bundle",
  "basePrice": 500000,
  "discountType": "percentage",
  "discountValue": 20,
  "validityDays": 14,
  "testTypeIds": ["uuid-papi", "uuid-epps", "uuid-ist"]
}

// Response
{
  "success": true,
  "data": {
    "id": "uuid...",
    "code": "PKG-REKRUTMEN",
    "packageType": "bundle",
    "basePrice": 500000,
    "discountValue": 20,
    "finalPrice": 400000,  // Auto-calculated: 500000 - 20%
    "testCount": 3,
    "estimatedDuration": 180,
    "items": [
      { "testType": { "code": "PAPI", "name": "PAPI Kostick" }, "sortOrder": 1 },
      { "testType": { "code": "EPPS", "name": "EPPS" }, "sortOrder": 2 },
      { "testType": { "code": "IST", "name": "IST" }, "sortOrder": 3 }
    ]
  }
}
```

### Price Calculation

```javascript
// POST /api/v1/psychology/price-rules/calculate
{
  "packageId": "uuid-pkg-rekrutmen",
  "quantity": 15,  // Untuk bulk order
  "promoCode": "NEWYEAR2025"  // Optional promo code
}

// Response
{
  "success": true,
  "data": {
    "package": { "id": "...", "name": "Paket Rekrutmen Lengkap" },
    "quantity": 15,
    "pricing": {
      "basePrice": 400000,
      "subtotal": 6000000,  // 400000 x 15
      "appliedRules": [
        {
          "rule": "Diskon Rekrutmen Massal",
          "type": "bulk_discount",
          "discount": 1500000  // 25% of subtotal
        },
        {
          "rule": "Promo Tahun Baru 2025",
          "type": "time_based",
          "discount": 675000  // 15% of remaining
        }
      ],
      "totalDiscount": 2175000,
      "finalTotal": 3825000,
      "pricePerUnit": 255000
    }
  }
}
```

### Create Order with Package

```javascript
// POST /api/v1/psychology/orders
{
  "packageId": "uuid-pkg-rekrutmen",
  "quantity": 1,
  "patientId": null,  // Will be filled when patient registers
  "notes": "Order untuk kandidat posisi Manager",
  "priceRuleId": "uuid-promo-newyear"  // Optional
}

// Response
{
  "success": true,
  "data": {
    "id": "uuid...",
    "orderNumber": "PSY-20251128-0001",
    "package": {
      "code": "PKG-REKRUTMEN",
      "name": "Paket Rekrutmen Lengkap",
      "testCount": 3
    },
    "baseAmount": 400000,
    "discountAmount": 60000,
    "finalAmount": 340000,
    "status": "pending",
    "accessToken": "abc123...",
    "accessUrl": "https://app.example.com/t/klinik-abc/psychology/test/abc123",
    "qrCodeData": "data:image/png;base64,...",
    "expiresAt": "2025-12-05T00:00:00Z",
    "sessions": [
      { "testType": { "code": "PAPI" }, "sessionNumber": 1, "status": "pending" },
      { "testType": { "code": "EPPS" }, "sessionNumber": 2, "status": "pending" },
      { "testType": { "code": "IST" }, "sessionNumber": 3, "status": "pending" }
    ]
  }
}
```

### Create Test Type Request Body

```javascript
// POST /api/v1/psychology/test-types
{
  "code": "PAPI",
  "name": "PAPI Kostick",
  "description": "Tes kepribadian untuk menilai perilaku kerja",
  "estimatedDuration": 30,
  "questions": [
    // Admin bisa paste JSON dari prototype disini
    { "id": 1, "pair": { "A": "...", "B": "..." }, "scaleA": "G", "scaleB": "E" },
    { "id": 2, "pair": { "A": "...", "B": "..." }, "scaleA": "N", "scaleB": "A" }
    // ... dst
  ],
  "scoringConfig": {
    // Opsional - bisa di-extract otomatis dari questions
    "scales": ["G", "E", "A", "N", "P", "X", "B", "O", "Z", "K", "F", "W", "C", "L", "I", "T", "V", "S", "R", "D"]
  },
  "config": {
    "allowBack": true,
    "showProgress": true,
    "randomizeQuestions": false
  }
}

// Response
{
  "success": true,
  "data": {
    "id": "uuid...",
    "code": "PAPI",
    "name": "PAPI Kostick",
    "questionCount": 90,
    "answerSchema": {
      "type": "array",
      "format": "paired_choice",
      "expectedCount": 90,
      "validAnswers": ["A", "B"],
      "identifierField": "id"
    },
    "detectedFormat": "paired_choice",
    "message": "Test type created with 90 questions. Answer format: array of {id, answer}"
  }
}
```

### Validate Questions (Preview/Dry-run)

```javascript
// POST /api/v1/psychology/test-types/:id/validate
// atau
// POST /api/v1/psychology/test-types/validate (tanpa save)
{
  "questions": [
    // Admin paste JSON untuk preview dulu
  ]
}

// Response
{
  "success": true,
  "data": {
    "valid": true,
    "questionCount": 90,
    "detectedFormat": "paired_choice",
    "answerSchema": { ... },
    "scoringConfig": { ... },
    "preview": {
      "firstQuestion": { ... },
      "lastQuestion": { ... }
    },
    "warnings": []  // misal: "Question #45 missing scaleA"
  }
}
```

### Public Endpoints (No Auth, Token-based)

```
# Akses tes via token
GET    /api/v1/psychology/public/access/:token
       Response: { order, testType, questions: [...] }

# Submit data pasien
POST   /api/v1/psychology/public/access/:token/register
       Body: { fullName, email, phone, birthDate, sex }

# Start session
POST   /api/v1/psychology/public/access/:token/start
       Response: { sessionToken, questions: [...], answerSchema }

# Submit answer
POST   /api/v1/psychology/public/session/:sessionToken/answer
       Body: { answers: [...] } atau { questionId, answer }

# Auto-save progress
PUT    /api/v1/psychology/public/session/:sessionToken/progress
       Body: { currentQuestion, answers }

# Complete test
POST   /api/v1/psychology/public/session/:sessionToken/complete
       Response: { sessionId, status: 'completed' }
```

---

## Module Structure

```
src/modules/psychology/
├── index.js                        # Module entry point
├── psychology.routes.js            # Main routes aggregator
│
├── controllers/
│   ├── index.js
│   ├── testTypeController.js       # CRUD test types + paste questions
│   ├── packageController.js        # CRUD packages + items management
│   ├── priceRuleController.js      # CRUD price rules + calculation
│   ├── orderController.js          # Order management + QR generation
│   ├── sessionController.js        # Session management + verify result
│   ├── resultController.js         # Results listing + complete data for print
│   ├── patientController.js        # Patient CRUD
│   └── publicController.js         # Public endpoints
│
├── routes/
│   ├── index.js
│   ├── testType.routes.js
│   ├── package.routes.js           # Package routes
│   ├── priceRule.routes.js         # Price rule routes
│   ├── order.routes.js
│   ├── session.routes.js
│   ├── result.routes.js
│   ├── patient.routes.js
│   └── public.routes.js
│
├── models/
│   ├── index.js
│   ├── psychologyTestType.js
│   ├── psychologyPackage.js        # Package model
│   ├── psychologyPackageItem.js    # Package items (junction table)
│   ├── psychologyPriceRule.js      # Price rules model
│   ├── psychologyOrder.js
│   ├── psychologySession.js        # Includes scores & interpretation JSONB
│   └── patient.js
│
├── services/
│   ├── index.js
│   ├── questionParserService.js    # Parse & validate questions
│   ├── scoringService.js           # Calculate scores (ported from Vue) ← NEW
│   ├── packageService.js           # Package logic (bundle, items)
│   ├── pricingService.js           # Price calculation with rules
│   ├── accessTokenService.js       # Generate token & QR
│   └── answerValidatorService.js   # Validate answers against schema
│
├── data/                           # Scoring data files (same as Vue) ← NEW
│   ├── papiKostick_narratives.json # PAPI narratives
│   ├── papiKostick_norms.json      # PAPI norms
│   ├── eppsNarratives.json         # EPPS narratives
│   ├── eppsScoring.js              # EPPS getTraitCategory function
│   └── eppsSumif.js                # EPPS computeBD, computeBH functions
│
└── validators/
    ├── testTypeValidator.js
    ├── packageValidator.js
    ├── priceRuleValidator.js
    ├── orderValidator.js
    └── answerValidator.js
```

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           COMPLETE FLOW                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. SETUP TEST TYPE (Admin paste questions dari frontend)               │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ POST /psychology/test-types                                       │   │
│  │ {                                                                 │   │
│  │   code: 'PAPI',                                                   │   │
│  │   name: 'PAPI Kostick',                                           │   │
│  │   questions: [ <-- Admin paste JSON disini                        │   │
│  │     { id: 1, pair: { A: "...", B: "..." }, scaleA: "G", scaleB: "E" },│
│  │     ...                                                           │   │
│  │   ]                                                               │   │
│  │ }                                                                 │   │
│  │                                                                   │   │
│  │ Backend auto-detect format & generate answerSchema                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  2. CREATE ORDER (Admin/Staff)                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ POST /psychology/orders                                           │   │
│  │ { testTypeId: '...', expiresAt: '...', totalAmount: 150000 }     │   │
│  │                                                                   │   │
│  │ Response: { orderId, accessToken, qrCodeData, accessUrl }        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  3. SHARE QR/LINK (Staff -> Pasien)                                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ WhatsApp/Email/Print QR Code                                      │   │
│  │ https://app.example.com/t/klinik-abc/psychology/test/abc123...   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  4. ACCESS TEST (Pasien - Public, No Auth)                              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ GET /psychology/public/access/:token                              │   │
│  │ Response: { order, testType, status: 'ready' }                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  5. REGISTER PATIENT (Pasien isi data diri)                             │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ POST /psychology/public/access/:token/register                    │   │
│  │ { fullName, email, phone, birthDate, sex }                       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  6. START SESSION (Mulai tes)                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ POST /psychology/public/access/:token/start                       │   │
│  │ Response: {                                                       │   │
│  │   sessionToken,                                                   │   │
│  │   questions: [...],        <- Soal dari testType.questions       │   │
│  │   answerSchema: {...}      <- Format jawaban yang expected       │   │
│  │ }                                                                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  7. ANSWER QUESTIONS (Jawab soal)                                       │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ POST /psychology/public/session/:sessionToken/answer              │   │
│  │ { questionId: 1, answer: 'A' }                                   │   │
│  │                                                                   │   │
│  │ Backend validate answer against answerSchema                      │   │
│  │ Backend auto-format answer (array/object) based on schema         │   │
│  │                                                                   │   │
│  │ PUT /psychology/public/session/:sessionToken/progress (auto-save)│   │
│  │ { currentQuestion: 45, answers: [...] }                          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  8. COMPLETE TEST                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ POST /psychology/public/session/:sessionToken/complete            │   │
│  │ Response: { sessionId, status: 'completed' }                     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  9. VIEW RESULTS (Admin/Psikolog - via Frontend)                        │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ GET /psychology/results/:sessionId                                │   │
│  │ Response: {                                                       │   │
│  │   testType: { code, name, questions, scoringConfig },             │   │
│  │   subject: {...},                                                 │   │
│  │   answers: {...},                                                 │   │
│  │   completedAt                                                     │   │
│  │ }                                                                 │   │
│  │                                                                   │   │
│  │ Frontend calculates scores using existing Vue logic              │   │
│  │ Frontend renders charts, narratives, interpretations             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Migration Files

### 1. Create Psychology Test Types (with questions JSONB)
```javascript
// 20251128000001-create-psychology-test-types.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PsychologyTestTypes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'CASCADE'
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: Sequelize.TEXT,
      questionCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      estimatedDuration: {
        type: Sequelize.INTEGER,
        defaultValue: 30
      },
      questions: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      },
      answerSchema: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      scoringConfig: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      config: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });

    await queryInterface.addIndex('PsychologyTestTypes', ['tenantId', 'code'], {
      unique: true,
      name: 'psychology_test_types_tenant_code'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('PsychologyTestTypes');
  }
};
```

### 2. Create Patients
```javascript
// 20251128000002-create-patients.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Patients', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'CASCADE'
      },
      code: Sequelize.STRING(50),
      fullName: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      email: Sequelize.STRING(100),
      phone: Sequelize.STRING(20),
      birthDate: Sequelize.DATEONLY,
      sex: {
        type: Sequelize.ENUM('male', 'female'),
        allowNull: true
      },
      personalData: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });

    await queryInterface.addIndex('Patients', ['tenantId']);
    await queryInterface.addIndex('Patients', ['email']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Patients');
  }
};
```

### 3. Create Psychology Packages
```javascript
// 20251128000003-create-psychology-packages.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PsychologyPackages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'CASCADE'
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: Sequelize.TEXT,
      packageType: {
        type: Sequelize.ENUM('single', 'bundle'),
        defaultValue: 'single'
      },
      basePrice: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      discountType: {
        type: Sequelize.ENUM('none', 'percentage', 'fixed'),
        defaultValue: 'none'
      },
      discountValue: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0
      },
      finalPrice: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      estimatedDuration: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      testCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      validityDays: {
        type: Sequelize.INTEGER,
        defaultValue: 7
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });

    await queryInterface.addIndex('PsychologyPackages', ['tenantId', 'code'], {
      unique: true,
      name: 'psychology_packages_tenant_code'
    });
    await queryInterface.addIndex('PsychologyPackages', ['tenantId', 'isActive']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('PsychologyPackages');
  }
};
```

### 4. Create Psychology Package Items (Junction Table)
```javascript
// 20251128000004-create-psychology-package-items.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PsychologyPackageItems', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      packageId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'PsychologyPackages', key: 'id' },
        onDelete: 'CASCADE'
      },
      testTypeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'PsychologyTestTypes', key: 'id' },
        onDelete: 'CASCADE'
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      isRequired: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });

    await queryInterface.addIndex('PsychologyPackageItems', ['packageId', 'testTypeId'], {
      unique: true,
      name: 'psychology_package_items_unique'
    });
    await queryInterface.addIndex('PsychologyPackageItems', ['packageId', 'sortOrder']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('PsychologyPackageItems');
  }
};
```

### 5. Create Psychology Price Rules
```javascript
// 20251128000005-create-psychology-price-rules.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PsychologyPriceRules', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      ruleType: {
        type: Sequelize.ENUM('package_discount', 'bulk_discount', 'time_based', 'member_discount', 'promo_code'),
        allowNull: false
      },
      packageId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'PsychologyPackages', key: 'id' },
        onDelete: 'SET NULL'
      },
      discountType: {
        type: Sequelize.ENUM('percentage', 'fixed'),
        allowNull: false
      },
      discountValue: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      minQuantity: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      maxUsage: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      usageCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      validFrom: {
        type: Sequelize.DATE,
        allowNull: true
      },
      validUntil: {
        type: Sequelize.DATE,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });

    await queryInterface.addIndex('PsychologyPriceRules', ['tenantId', 'isActive']);
    await queryInterface.addIndex('PsychologyPriceRules', ['tenantId', 'code'], {
      unique: true,
      where: { code: { [Sequelize.Op.ne]: null } },
      name: 'psychology_price_rules_tenant_code'
    });
    await queryInterface.addIndex('PsychologyPriceRules', ['validFrom', 'validUntil']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('PsychologyPriceRules');
  }
};
```

### 6. Create Psychology Orders
```javascript
// 20251128000006-create-psychology-orders.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PsychologyOrders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'CASCADE'
      },
      orderNumber: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      packageId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'PsychologyPackages', key: 'id' }
      },
      patientId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Patients', key: 'id' }
      },
      priceRuleId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'PsychologyPriceRules', key: 'id' },
        onDelete: 'SET NULL'
      },
      accessToken: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      qrCodeData: Sequelize.TEXT,
      accessUrl: Sequelize.STRING(500),
      status: {
        type: Sequelize.ENUM('pending', 'paid', 'in_progress', 'completed', 'verified', 'cancelled', 'expired'),
        defaultValue: 'pending'
      },
      baseAmount: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0
      },
      discountAmount: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0
      },
      finalAmount: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0
      },
      paidAt: Sequelize.DATE,
      paymentMethod: Sequelize.STRING(50),
      paymentRef: Sequelize.STRING(100),
      expiresAt: Sequelize.DATE,
      notes: Sequelize.TEXT,
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });

    await queryInterface.addIndex('PsychologyOrders', ['tenantId', 'orderNumber'], {
      unique: true,
      name: 'psychology_orders_tenant_number'
    });
    await queryInterface.addIndex('PsychologyOrders', ['accessToken'], {
      unique: true,
      name: 'psychology_orders_access_token'
    });
    await queryInterface.addIndex('PsychologyOrders', ['status']);
    await queryInterface.addIndex('PsychologyOrders', ['patientId']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('PsychologyOrders');
  }
};
```

### 7. Create Psychology Sessions
```javascript
// 20251128000007-create-psychology-sessions.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PsychologySessions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'CASCADE'
      },
      orderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'PsychologyOrders', key: 'id' },
        onDelete: 'CASCADE'
      },
      testTypeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'PsychologyTestTypes', key: 'id' }
      },
      sessionToken: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      sessionNumber: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      status: {
        type: Sequelize.ENUM('pending', 'started', 'in_progress', 'paused', 'completed', 'verified', 'abandoned', 'timeout'),
        defaultValue: 'pending'
      },
      answers: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      scores: {
        type: Sequelize.JSONB,
        defaultValue: null,
        comment: 'Backend calculated scores (scales, needs, etc.)'
      },
      interpretation: {
        type: Sequelize.JSONB,
        defaultValue: null,
        comment: 'Backend generated interpretation/narratives'
      },
      subject: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      startedAt: Sequelize.DATE,
      completedAt: Sequelize.DATE,
      verifiedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When result was verified by psychologist'
      },
      verifiedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onDelete: 'SET NULL',
        comment: 'User who verified the result'
      },
      lastActivityAt: Sequelize.DATE,
      currentQuestion: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });

    await queryInterface.addIndex('PsychologySessions', ['sessionToken'], {
      unique: true,
      name: 'psychology_sessions_token'
    });
    await queryInterface.addIndex('PsychologySessions', ['orderId', 'sessionNumber']);
    await queryInterface.addIndex('PsychologySessions', ['status']);
    await queryInterface.addIndex('PsychologySessions', ['tenantId', 'status']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('PsychologySessions');
  }
};
```

---

## Frontend Usage Examples

### 1. Admin Create Test Type (Paste Questions)

```vue
<template>
  <div>
    <h3>Add New Psychology Test</h3>
    
    <input v-model="testType.code" placeholder="Code (e.g., PAPI)" />
    <input v-model="testType.name" placeholder="Name" />
    <textarea v-model="testType.description" placeholder="Description" />
    
    <!-- Paste Questions JSON Here -->
    <h4>Paste Questions JSON:</h4>
    <textarea 
      v-model="questionsJson" 
      rows="20" 
      placeholder='Paste your questions JSON here...
Example:
[
  { "id": 1, "pair": { "A": "...", "B": "..." }, "scaleA": "G", "scaleB": "E" },
  ...
]'
    />
    
    <button @click="validateQuestions">Validate</button>
    <button @click="saveTestType" :disabled="!isValidated">Save</button>
    
    <!-- Preview -->
    <div v-if="validationResult">
      <h4>Validation Result:</h4>
      <p>Question Count: {{ validationResult.questionCount }}</p>
      <p>Detected Format: {{ validationResult.detectedFormat }}</p>
      <p>Answer Format: {{ validationResult.answerSchema.type }}</p>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      testType: { code: '', name: '', description: '' },
      questionsJson: '',
      validationResult: null,
      isValidated: false
    };
  },
  methods: {
    async validateQuestions() {
      const res = await this.$api.post('/psychology/test-types/validate', {
        questions: JSON.parse(this.questionsJson)
      });
      this.validationResult = res.data;
      this.isValidated = res.data.valid;
    },
    async saveTestType() {
      const res = await this.$api.post('/psychology/test-types', {
        ...this.testType,
        questions: JSON.parse(this.questionsJson)
      });
      this.$router.push(`/psychology/test-types/${res.data.id}`);
    }
  }
};
</script>
```

### 2. Frontend Gets Answer Schema for Dynamic Form

```javascript
// When patient starts test
const startResponse = await api.post(`/psychology/public/access/${token}/start`);

const { sessionToken, questions, answerSchema } = startResponse.data;

// answerSchema tells frontend how to format answers:
// - If answerSchema.type === 'array' -> answers = [{ id, answer }]
// - If answerSchema.type === 'object' -> answers = { "1": "A", "2": "B" }

// Frontend knows valid answers:
console.log(answerSchema.validAnswers); // ["A", "B"]
```

---

## Feature Registry Update

```javascript
// In src/utils/featureRegistry.js

modules: {
  // ... existing
  psychology: {
    name: 'Psychology Testing',
    description: 'Modul tes psikologi (PAPI, EPPS, dll)',
    plans: {
      Basic: false,
      Professional: true,
      Enterprise: true
    }
  }
},

limits: {
  // ... existing
  maxPsychologyOrders: {
    name: 'Max Psychology Orders/Month',
    description: 'Jumlah order tes psikologi per bulan',
    plans: {
      Basic: 0,
      Professional: 50,
      Enterprise: -1  // unlimited
    }
  },
  maxPsychologyTestTypes: {
    name: 'Max Test Types',
    description: 'Jumlah jenis tes psikologi yang bisa dibuat',
    plans: {
      Basic: 0,
      Professional: 10,
      Enterprise: -1  // unlimited
    }
  }
}
```

---

## Implementation Priority

### Phase 1: Core Database & Services (Week 1)
1. ✅ Create migrations (7 tables)
2. ✅ Create models with associations
3. ✅ QuestionParserService (auto-detect format)
4. ✅ ScoringService (ported from Vue)
5. ✅ AccessTokenService (token & QR generation)
6. ✅ Update feature registry

### Phase 2: Admin API (Week 2)
1. TestType controller (CRUD + paste questions + validate)
2. Order controller (create, list, detail, regenerate QR)
3. Session controller (list, detail, verify result)
4. Result controller (list, detail with complete data for print)
5. Patient controller (CRUD)

### Phase 3: Public API (Week 2-3)
1. Public access endpoint (validate token)
2. Register patient endpoint
3. Start session endpoint
4. Answer submission with validation
5. Progress auto-save
6. Complete test endpoint → triggers scoring

### Phase 4: Frontend Print Pages (Week 3)
1. Print layout component (no navbar)
2. PAPI print page (/print/papikostick/:sessionId)
3. EPPS print page (/print/epps/:sessionId)
4. Print CSS styles (@media print)
5. Reuse existing Vue result components

### Phase 5: Integration & Testing (Week 4)
1. Test with existing Vue frontend
2. Verify scoring matches Vue logic
3. Transaction integration (if needed)
4. Documentation
5. Unit & integration tests

---

## Summary

### Database Tables (7 tables)

| Table | Description |
|-------|-------------|
| `PsychologyTestTypes` | Master jenis tes (PAPI, EPPS, dll) + questions JSONB |
| `Patients` | Data pasien |
| `PsychologyPackages` | Paket tes (single/bundle) dengan harga |
| `PsychologyPackageItems` | Junction: link package ke test types |
| `PsychologyPriceRules` | Aturan harga/diskon/promo |
| `PsychologyOrders` | Order pembelian paket tes |
| `PsychologySessions` | Session + scores + interpretation JSONB |

### Key Features

| Feature | Description |
|---------|-------------|
| **Dynamic Test Types** | Admin paste JSON soal, backend auto-detect format |
| **Hybrid Scoring** | Frontend preview + Backend verify & store |
| **Print-Friendly PDF** | Frontend generate, zero server load |
| **Package Management** | Single test atau bundle multiple tests |
| **Flexible Pricing** | Base price + discount per package |
| **Price Rules** | Time-based promo, bulk discount, promo codes |
| **Multi-Session Orders** | 1 order = multiple test sessions (untuk bundle) |
| **QR Access** | Generate QR/link untuk pasien akses tes |
| **Result Verification** | Psikolog verify hasil sebelum download |

### Scoring & PDF Strategy

| Aspek | Implementasi |
|-------|--------------|
| **Scoring Logic** | Ported dari Vue ke Node.js (identical) |
| **Scores Storage** | JSONB di PsychologySessions |
| **Interpretation** | Backend generate, JSONB di PsychologySessions |
| **PDF Generation** | Frontend print page (browser Print → Save PDF) |
| **Server Load** | Zero untuk PDF (semua di browser) |
| **Scalability** | Unlimited concurrent downloads |

### Perubahan dari Versi Sebelumnya

| Aspek | v4.0 | v5.0 |
|-------|------|------|
| Scoring | Frontend only | **Hybrid (Frontend+Backend)** |
| Scores storage | Tidak ada | **JSONB di session** |
| Interpretation | Frontend only | **Backend generate + store** |
| PDF generation | Tidak ada | **Frontend print page** |
| Result verification | Tidak ada | **verifiedAt, verifiedBy fields** |
| Server load PDF | N/A | **Zero (browser print)** |

### Benefits

- ✅ Admin bisa tambah test baru tanpa programmer
- ✅ Scoring di-verify backend (audit trail)
- ✅ PDF identical dengan Vue hasil page
- ✅ Zero server load untuk PDF generation
- ✅ Scalable untuk unlimited users
- ✅ Hasil bisa diverifikasi psikolog
- ✅ Flexible package (single/bundle)
- ✅ Dynamic pricing dengan promo/diskon
- ✅ 1 QR code = akses semua tes dalam paket

---

**Document Version:** 5.0 (Hybrid Scoring + Print-Friendly PDF)  
**Created:** November 28, 2025  
**Based on:** Existing prototype + Dynamic requirements + Package/Price features
