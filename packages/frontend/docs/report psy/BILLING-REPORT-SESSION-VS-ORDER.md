# Laporan Penggunaan Test Psikologi - Implementation Summary

## 📋 Ringkasan

Untuk keperluan **validasi data dan penagihan penggunaan alat test psikologi**, direkomendasikan menggunakan **Session-based report** (bukan Order-based).

## ✅ Implementasi yang Sudah Dibuat

### 1. Backend Endpoint
**URL:** `GET /api/v1/psychology/reports/test-usage-billing`

**File:** 
- Controller: `src/modules/psychology/controllers/reportController.js` (function: `getTestUsageBillingReport`)
- Route: `src/modules/psychology/routes/index.js` (line ~915)

**Query Parameters:**
```javascript
{
  startDate: '2026-01-01',    // Filter dari tanggal
  endDate: '2026-01-31',      // Filter sampai tanggal
  testTypeId: 'uuid',         // (Optional) Filter test tertentu
  verified: 'all',            // 'verified' | 'unverified' | 'all'
  page: 1,                    // Pagination
  limit: 100                  // Items per page
}
```

### 2. Response Structure
```javascript
{
  success: true,
  data: {
    sessions: [/* Detail setiap test yang dikerjakan */],
    summaryByTestType: [/* Ringkasan per jenis test */],
    overallSummary: {
      totalTests: 156,        // Total test dikerjakan
      verifiedTests: 145,     // Sudah diverifikasi
      unverifiedTests: 11,    // Belum diverifikasi
      uniqueTestTypes: 5      // Jumlah jenis test
    }
  },
  pagination: { /* ... */ },
  filters: { /* ... */ },
  metadata: {
    reportType: 'test-usage-billing',
    generatedAt: '2026-02-01T10:00:00.000Z',
    generatedBy: 'admin@tenant.com'
  }
}
```

## 📊 Mengapa Session (Bukan Order)?

| Kriteria | Order | Session ✓ |
|----------|-------|-----------|
| **Detail** | Paket (1 order) | Per test (multiple sessions) |
| **Akurasi** | 1 order = 1 count | 1 order = 3-5 tests counted |
| **Verifikasi** | ❌ Tidak ada | ✅ Ada (verified/unverified) |
| **Timestamp** | Creation date | Completion date (lebih akurat) |
| **Billing** | Lump sum | Per-test breakdown |

### Contoh Real:
```
Order #PSY-001: Paket Rekrutmen = Rp 500.000
├── Session #1: CFIT  ✓ completed, verified
├── Session #2: PAPI  ✓ completed, verified
└── Session #3: EPPS  ✓ completed, ⚠️ unverified

Dari Session: 3 tests completed
Untuk invoice: 3 x test usage fee
```

## 🎯 Use Cases

### 1. Generate Invoice Bulanan
```bash
GET /psychology/reports/test-usage-billing
  ?startDate=2026-01-01
  &endDate=2026-01-31
  &verified=all
```

**Output untuk Invoice:**
```
INVOICE #INV-2026-01
Periode: Januari 2026

- CFIT: 45 tests @ Rp 50,000 = Rp 2,250,000
- PAPI: 32 tests @ Rp 75,000 = Rp 2,400,000
- EPPS: 28 tests @ Rp 60,000 = Rp 1,680,000

Total: 156 tests = Rp 9,270,000
```

### 2. Validasi dengan Client
```bash
# Client mempertanyakan jumlah tagihan?
# Export data.sessions yang berisi:
# - Nama pasien
# - Tanggal completion
# - Jenis test
# - Status verifikasi
```

### 3. Quality Control
```bash
GET /psychology/reports/test-usage-billing
  ?verified=unverified

# Follow-up verifikasi sebelum kirim invoice
```

## 📁 File-file Terkait

1. **Backend:**
   - `src/modules/psychology/controllers/reportController.js` (line 1585+)
   - `src/modules/psychology/routes/index.js` (line 915+)

2. **Dokumentasi:**
   - `docs/frontend-integration/TEST-USAGE-BILLING-REPORT.md` (Full guide + examples)
   
3. **Testing:**
   - `docs/postman/Psychology-Test-Usage-Billing.postman_collection.json` (8 test scenarios)

## 🚀 Cara Testing

### 1. Import Postman Collection
```bash
# File: docs/postman/Psychology-Test-Usage-Billing.postman_collection.json
# 8 request scenarios tersedia
```

### 2. Atau via cURL:
```bash
curl -X GET "http://localhost:3000/api/v1/psychology/reports/test-usage-billing?startDate=2026-01-01&endDate=2026-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📈 Data Flow untuk Billing

```
┌─────────────────────┐
│  Completed Sessions │  ← Filter: status = 'completed'
│  (Jan 1-31, 2026)  │  ← Filter: completedAt between dates
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Group by TestType │  ← Aggregate: COUNT, AVG duration
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Generate Summary   │  ← Calculate: total, verified, unverified
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Return Report      │  ← sessions + summaryByTestType + overallSummary
└─────────────────────┘
```

## ⚙️ Konfigurasi

### Database Indexes (Sudah Ada):
```sql
-- Untuk performance query tanggal
CREATE INDEX idx_psychology_sessions_completed 
  ON "PsychologySessions" ("completedAt");

-- Untuk filter verifikasi
CREATE INDEX idx_psychology_sessions_verified 
  ON "PsychologySessions" ("verifiedAt");
```

### Permission Required:
- User harus punya permission: `read:PsychologySession`
- Middleware: `authorizeCasl('read', 'PsychologySession')`

## 💡 Best Practices

### 1. Verifikasi Sebelum Billing
```javascript
// Check unverified tests
const response = await fetch('/psychology/reports/test-usage-billing?verified=unverified');
if (response.data.overallSummary.totalTests > 0) {
  alert(`Warning: ${response.data.overallSummary.totalTests} tests pending verification`);
}
```

### 2. Export untuk Sharing
```javascript
// Frontend: Export to Excel
// Include detailed session list untuk validasi dengan client
exportToExcel(response.data.sessions);
```

### 3. Audit Trail
```javascript
// Save report sebagai record
const report = await generateBillingReport(startDate, endDate);
await saveReportSnapshot({
  type: 'billing',
  period: { startDate, endDate },
  data: report,
  generatedAt: new Date()
});
```

## 🎓 Kesimpulan

**Untuk penagihan penggunaan test psikologi:**
✅ **Gunakan Session** (bukan Order)  
✅ Endpoint: `/psychology/reports/test-usage-billing`  
✅ Filter by: date, test type, verification status  
✅ Data: Detail per test + summary per test type  
✅ Validasi: Include verified/unverified status  

**File dokumentasi lengkap:**  
[docs/frontend-integration/TEST-USAGE-BILLING-REPORT.md](./frontend-integration/TEST-USAGE-BILLING-REPORT.md)

---

**Generated:** January 1, 2026  
**Version:** 1.0.0
