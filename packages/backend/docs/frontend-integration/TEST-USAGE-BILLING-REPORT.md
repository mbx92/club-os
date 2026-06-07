# Test Usage Billing Report API

## 🔧 Updates

**v1.0.1 - January 1, 2026:**
- Fixed field mapping: Changed `patientId` (identityNumber) to `patientCode` (code)
- Patient model uses `code` field for patient identification, not `identityNumber`

---

## Overview
Endpoint laporan khusus untuk **validasi data dan penagihan penggunaan alat test psikologi**. Laporan ini berbasis pada **Session** yang sudah completed, memberikan detail lengkap untuk keperluan invoice/billing ke pihak yang menggunakan test.

## Mengapa Menggunakan Session (Bukan Order)?

### Session Lebih Akurat untuk Penagihan:
1. **Granularitas per Test** - Satu order bisa contain multiple tests, session menghitung setiap test yang dikerjakan
2. **Verifikasi Status** - Session memiliki verified/unverified status untuk quality control
3. **Timestamp Akurat** - `completedAt` menunjukkan kapan test benar-benar selesai dikerjakan
4. **Detail Pengerjaan** - Duration, jumlah soal dijawab, scores tersedia per session
5. **Audit Trail** - IP address, user agent, verifier information

### Contoh Kasus:
```
Order #PSY-001 (Paket Rekrutmen - Rp 500.000)
├── Session #1: CFIT (completed ✓, verified ✓)
├── Session #2: PAPI (completed ✓, verified ✓)
└── Session #3: EPPS (completed ✓, unverified ⚠️)

Invoice:
- 3 test completed = 3 x usage fee
- 2 verified, 1 pending verification
```

---

## API Endpoint

```
GET /api/v1/psychology/reports/test-usage-billing
```

**Authentication:** Required (Admin/Super Admin)

**Permission:** `read:PsychologySession`

---

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `startDate` | string | - | Filter dari tanggal (YYYY-MM-DD) |
| `endDate` | string | - | Filter sampai tanggal (YYYY-MM-DD) |
| `testTypeId` | UUID | - | Filter by specific test type |
| `verified` | string | `all` | Filter by verification status: `verified`, `unverified`, `all` |
| `page` | number | 1 | Pagination page number |
| `limit` | number | 100 | Items per page (max 1000) |
| `tenantId` | UUID | - | Filter by tenant (super admin only) |

---

## Response Structure

```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "sessionId": "uuid",
        "orderNumber": "PSY-2601-ABC123",
        "patientName": "John Doe",
        "patientEmail": "john@example.com",
        "patientCode": "PT-001",
        "testType": {
          "code": "CFIT",
          "name": "Culture Fair Intelligence Test",
          "category": "intelligence"
        },
        "packageName": "Paket Rekrutmen Dasar",
        "completedAt": "2026-01-15T14:30:00.000Z",
        "duration": 45,
        "questionsAnswered": 46,
        "totalQuestions": 46,
        "verified": {
          "isVerified": true,
          "verifiedAt": "2026-01-15T15:00:00.000Z",
          "verifiedBy": "Dr. Jane Smith"
        },
        "scores": {
          "raw": 38,
          "iq": 115,
          "category": "Above Average"
        },
        "hasInterpretation": true
      }
    ],
    "summaryByTestType": [
      {
        "testType": {
          "id": "uuid",
          "code": "CFIT",
          "name": "Culture Fair Intelligence Test",
          "category": "intelligence"
        },
        "totalTests": 45,
        "verifiedTests": 42,
        "unverifiedTests": 3,
        "avgDurationMinutes": 43,
        "period": {
          "firstTest": "2026-01-01T10:00:00.000Z",
          "lastTest": "2026-01-31T16:30:00.000Z"
        }
      }
    ],
    "overallSummary": {
      "totalTests": 156,
      "verifiedTests": 145,
      "unverifiedTests": 11,
      "uniqueTestTypes": 5,
      "periodCovered": {
        "startDate": "2026-01-01",
        "endDate": "2026-01-31"
      }
    }
  },
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 156,
    "totalPages": 2
  },
  "filters": {
    "startDate": "2026-01-01",
    "endDate": "2026-01-31",
    "verified": "all"
  },
  "metadata": {
    "reportType": "test-usage-billing",
    "generatedAt": "2026-02-01T10:00:00.000Z",
    "generatedBy": "admin@tenant.com",
    "tenantId": "uuid"
  }
}
```

---

## Use Cases

### 1. Laporan Bulanan untuk Invoice

**Skenario:** Setiap akhir bulan, generate laporan untuk tagihan ke institusi

```javascript
// Get all completed tests in January 2026
GET /api/v1/psychology/reports/test-usage-billing?startDate=2026-01-01&endDate=2026-01-31&verified=all

// Dari response:
// - overallSummary.totalTests = jumlah test yang dikerjakan
// - summaryByTestType = breakdown per jenis test
// - sessions = detail setiap test untuk validasi
```

**Output untuk Invoice:**
```
INVOICE #INV-2026-01
Periode: Januari 2026

Test Usage Summary:
- CFIT: 45 tests @ Rp 50,000 = Rp 2,250,000
- PAPI: 32 tests @ Rp 75,000 = Rp 2,400,000
- EPPS: 28 tests @ Rp 60,000 = Rp 1,680,000
- DISC: 25 tests @ Rp 50,000 = Rp 1,250,000
- MBTI: 26 tests @ Rp 65,000 = Rp 1,690,000

Total Tests: 156
Total Amount: Rp 9,270,000

Note: 145 verified, 11 pending verification
```

---

### 2. Validasi dengan Pihak Pengguna Test

**Skenario:** Institusi mempertanyakan jumlah tagihan

```javascript
// Show only verified tests
GET /api/v1/psychology/reports/test-usage-billing?startDate=2026-01-01&endDate=2026-01-31&verified=verified

// Export detailed session list for validation
// Bisa share data.sessions untuk cross-check:
// - Nama pasien
// - Tanggal & waktu test
// - Jenis test
// - Status verifikasi
```

---

### 3. Filter per Jenis Test

**Skenario:** Cek penggunaan test tertentu

```javascript
// Get CFIT usage only
GET /api/v1/psychology/reports/test-usage-billing?testTypeId=<cfit-uuid>&startDate=2026-01-01&endDate=2026-01-31

// Response fokus pada CFIT saja
```

---

### 4. Monitoring Test yang Belum Diverifikasi

**Skenario:** Quality control sebelum invoice dikirim

```javascript
// Show only unverified tests
GET /api/v1/psychology/reports/test-usage-billing?verified=unverified

// Follow up verifikasi sebelum billing
```

---

## Frontend Implementation Examples

### React/Next.js Component

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

interface BillingReportProps {
  startDate: string;
  endDate: string;
}

export function TestUsageBillingReport({ startDate, endDate }: BillingReportProps) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/v1/psychology/reports/test-usage-billing', {
        params: { startDate, endDate, verified: 'all' }
      });
      setReport(response.data.data);
    } catch (error) {
      console.error('Failed to fetch billing report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!report) return null;

  return (
    <div className="billing-report">
      {/* Overall Summary */}
      <div className="summary-card">
        <h2>Ringkasan Penggunaan Test</h2>
        <div className="stats">
          <div className="stat">
            <label>Total Test Dikerjakan:</label>
            <strong>{report.overallSummary.totalTests}</strong>
          </div>
          <div className="stat">
            <label>Verified:</label>
            <strong>{report.overallSummary.verifiedTests}</strong>
          </div>
          <div className="stat">
            <label>Belum Verified:</label>
            <strong className="warning">{report.overallSummary.unverifiedTests}</strong>
          </div>
        </div>
      </div>

      {/* Summary by Test Type */}
      <div className="test-type-breakdown">
        <h3>Breakdown per Jenis Test</h3>
        <table>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama Test</th>
              <th>Total</th>
              <th>Verified</th>
              <th>Pending</th>
              <th>Avg. Duration</th>
            </tr>
          </thead>
          <tbody>
            {report.summaryByTestType.map((item) => (
              <tr key={item.testType.id}>
                <td>{item.testType.code}</td>
                <td>{item.testType.name}</td>
                <td>{item.totalTests}</td>
                <td>{item.verifiedTests}</td>
                <td>{item.unverifiedTests}</td>
                <td>{item.avgDurationMinutes} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detailed Sessions */}
      <div className="session-details">
        <h3>Detail Session (untuk validasi)</h3>
        <table>
          <thead>
            <tr>
              <th>Order No</th>
              <th>Pasien</th>
              <th>Test</th>
              <th>Tanggal</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {report.sessions.map((session) => (
              <tr key={session.sessionId}>
                <td>{session.orderNumber}</td>
                <td>{session.patientName}</td>
                <td>{session.testType.code}</td>
                <td>{new Date(session.completedAt).toLocaleDateString('id-ID')}</td>
                <td>
                  {session.verified.isVerified ? (
                    <span className="badge success">✓ Verified</span>
                  ) : (
                    <span className="badge warning">⚠ Pending</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

### Export to Excel for Sharing

```javascript
// Tambahan fungsi untuk export ke Excel
async function exportBillingReportToExcel(startDate, endDate) {
  try {
    const response = await axios.get('/api/v1/psychology/reports/test-usage-billing', {
      params: { startDate, endDate, limit: 10000 }, // Get all data
      responseType: 'blob' // If backend supports export
    });
    
    // If backend doesn't support export, do it client-side
    const XLSX = require('xlsx');
    const workbook = XLSX.utils.book_new();
    
    // Sheet 1: Summary
    const summaryData = response.data.data.summaryByTestType.map(item => ({
      'Kode Test': item.testType.code,
      'Nama Test': item.testType.name,
      'Total Tests': item.totalTests,
      'Verified': item.verifiedTests,
      'Pending': item.unverifiedTests,
      'Avg Duration (min)': item.avgDurationMinutes
    }));
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    
    // Sheet 2: Details
    const detailsData = response.data.data.sessions.map(session => ({
      'Order Number': session.orderNumber,
      'Patient Name': session.patientName,
      'Patient ID': session.patientId,
      'Test Code': session.testType.code,
      'Test Name': session.testType.name,
      'Package': session.packageName,
      'Completed Date': session.completedAt,
      'Duration (min)': session.duration,
      'Verified': session.verified.isVerified ? 'Yes' : 'No',
      'Verified By': session.verified.verifiedBy || '-',
      'Verified At': session.verified.verifiedAt || '-'
    }));
    const detailsSheet = XLSX.utils.json_to_sheet(detailsData);
    XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Details');
    
    // Download
    XLSX.writeFile(workbook, `Test_Usage_Billing_${startDate}_${endDate}.xlsx`);
  } catch (error) {
    console.error('Export failed:', error);
  }
}
```

---

## Backend Notes

### Database Query Optimization

Endpoint ini menggunakan:
1. **Eager loading** untuk minimize N+1 queries
2. **Index pada `completedAt`** untuk filter tanggal
3. **Aggregation query** untuk summary (lebih efisien)
4. **Pagination** untuk handle large datasets

### Performance Considerations

```sql
-- Recommended indexes (sudah ada di migration):
CREATE INDEX idx_psychology_sessions_completed 
  ON "PsychologySessions" ("completedAt");

CREATE INDEX idx_psychology_sessions_verified 
  ON "PsychologySessions" ("verifiedAt");

CREATE INDEX idx_psychology_sessions_test_type 
  ON "PsychologySessions" ("testTypeId");
```

---

## Comparison: Session vs Order for Billing

| Aspek | Order-based | Session-based ✓ |
|-------|-------------|----------------|
| Granularity | Package level | Individual test level |
| Count accuracy | 1 order = 1 count | 1 order = multiple tests counted |
| Verification | No verification status | Verified/unverified per test |
| Duration tracking | No | Yes, per test |
| Quality control | Limited | Full audit trail |
| Invoicing detail | Summary only | Per-test breakdown |
| Dispute resolution | Difficult | Easy with detailed logs |

---

## Integration Workflow

```
┌─────────────────┐
│  Monthly Cron   │
│   (End of Month)│
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Generate Billing Report          │
│ GET /reports/test-usage-billing  │
│ startDate: 2026-01-01            │
│ endDate: 2026-01-31              │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Process Summary                   │
│ - Total tests by type            │
│ - Calculate billing amount       │
│ - Check unverified tests         │
└────────┬─────────────────────────┘
         │
         ├───────────────────────────┐
         │                           │
         ▼                           ▼
┌─────────────────┐      ┌──────────────────┐
│ Generate Invoice│      │ Export to Excel  │
│ - PDF/HTML      │      │ - For validation │
└─────────────────┘      └──────────────────┘
         │                           │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Send to Client        │
         │ - Invoice PDF         │
         │ - Detail Excel        │
         │ - Summary report      │
         └───────────────────────┘
```

---

## Error Handling

```javascript
try {
  const response = await fetchBillingReport();
  
  if (response.data.overallSummary.unverifiedTests > 0) {
    console.warn(`Warning: ${response.data.overallSummary.unverifiedTests} tests pending verification`);
    // Show warning to user
  }
  
} catch (error) {
  if (error.response?.status === 403) {
    // Permission denied
    alert('You do not have permission to view billing reports');
  } else if (error.response?.status === 400) {
    // Invalid date range
    alert('Invalid date range specified');
  } else {
    // Server error
    alert('Failed to generate report. Please try again.');
  }
}
```

---

## Best Practices

### 1. Regular Verification
- Verify sessions sebelum generate invoice
- Filter `verified=unverified` untuk follow-up

### 2. Date Range Validation
- Gunakan tanggal completion, bukan creation
- Align dengan periode billing (monthly/quarterly)

### 3. Data Retention
- Export dan archive billing reports
- Simpan sebagai audit trail

### 4. Cross-check
- Compare dengan Order revenue report
- Validate total tests vs total revenue

### 5. Communication
- Share detailed Excel dengan client
- Transparent tentang pending verifications

---

## FAQ

**Q: Kenapa menggunakan `completedAt` bukan `createdAt`?**
A: `completedAt` menunjukkan kapan test benar-benar selesai dikerjakan, lebih akurat untuk billing.

**Q: Bagaimana handle test yang tidak selesai (abandoned)?**
A: Filter `status='completed'` memastikan hanya test yang selesai yang dihitung.

**Q: Apakah verified dan unverified dibedakan di billing?**
A: Tergantung policy. Bisa billing semua completed tests, atau hanya yang verified.

**Q: Bagaimana jika ada dispute dari client?**
A: Gunakan `data.sessions` untuk show detail per test dengan timestamp, patient name, dll.

**Q: Performance untuk 10,000+ sessions?**
A: Gunakan pagination, atau export secara async untuk large datasets.

---

## Related Documentation

- [Session Model](../system-docs/PSYCHOLOGY-SESSION-MODEL.md)
- [Report Controller](../system-docs/REPORT-CONTROLLER.md)
- [Psychology Module Overview](../plan/PHASE-08-PSYCHOLOGY-MODULE.md)
