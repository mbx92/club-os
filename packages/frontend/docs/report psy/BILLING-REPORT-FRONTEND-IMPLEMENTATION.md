# Billing Report - Quick Reference

## 📍 Lokasi File

### Composable (API Logic)
```
src/composables/psychology/useBillingReport.js
```

### Page (UI)
```
src/pages/psychology/reports/billing.vue
```

### Route
```
/psychology/reports/billing
```

---

## 🚀 Cara Menggunakan

### 1. Akses Halaman
Buka browser dan navigasi ke:
```
http://localhost:3000/psychology/reports/billing
```

### 2. Filter Data
- **Dari Tanggal** & **Sampai Tanggal**: Pilih range tanggal
- **Status Verifikasi**: 
  - `Semua` - Tampilkan semua test
  - `Sudah Verified` - Hanya test yang sudah diverifikasi
  - `Belum Verified` - Hanya test pending verifikasi
- **Quick Select**: Shortcut untuk periode umum
  - Bulan Ini
  - Bulan Lalu
  - Tahun Ini

### 3. Tampilkan Report
Klik tombol **"Tampilkan"** untuk fetch data dari backend

### 4. Lihat Summary
Report akan menampilkan:

#### Overall Summary Cards
- **Total Test**: Jumlah test yang dikerjakan
- **Verified**: Test yang sudah diverifikasi
- **Belum Verified**: Test pending verifikasi (warning)
- **Jenis Test**: Jumlah unique test types

#### Summary per Test Type
Table yang menampilkan:
- Kode test (CFIT, PAPI, dll)
- Nama test lengkap
- Kategori
- Total tests
- Verified vs Pending
- Average duration
- Periode (first & last test)

#### Detail Session
List semua test sessions dengan info:
- Order number
- Patient name & ID
- Test type
- Package name
- Completion date & time
- Duration
- Progress (answered/total questions)
- Verification status & verifier

### 5. Hitung Billing (Optional)
Klik **"Hitung Billing"** untuk membuka kalkulator:

1. Input tarif per test type (default sudah ada)
2. Sistem akan auto-calculate:
   - Subtotal per test type
   - Grand total billing
   - Breakdown verified vs pending

**Default Rates:**
```javascript
CFIT: Rp 50,000
PAPI: Rp 75,000
EPPS: Rp 60,000
DISC: Rp 50,000
MBTI: Rp 65,000
```

### 6. Export Data
#### Export to CSV
- Klik **"Export CSV"**
- File akan terdownload dengan format:
  - Nama file: `Test_Usage_Billing_[startDate]_[endDate].csv`
  - Berisi detail semua sessions

#### Export to Excel
- Klik **"Export Excel"**
- File akan terdownload dengan 3 sheets:
  1. **Summary**: Ringkasan per test type
  2. **Overall**: Summary keseluruhan
  3. **Details**: Detail semua sessions

---

## 💡 Use Cases

### 1. Generate Invoice Bulanan
```
1. Set Quick Select: "Bulan Lalu"
2. Klik "Tampilkan"
3. Klik "Hitung Billing"
4. Input/verify tarif
5. Screenshot atau export untuk invoice
```

### 2. Validasi dengan Client
```
1. Set date range sesuai periode yang dipertanyakan
2. Klik "Tampilkan"
3. Export to Excel
4. Share file Excel untuk cross-check
```

### 3. Quality Control Sebelum Billing
```
1. Set Status Verifikasi: "Belum Verified"
2. Klik "Tampilkan"
3. Review list test yang belum verified
4. Follow-up verifikasi
5. Refresh report
```

### 4. Report Test Tertentu
```
1. Backend supports testTypeId filter
2. Bisa ditambahkan dropdown filter di UI jika diperlukan
3. Atau filter manual di Excel export
```

---

## 🔧 Composable API

### Import
```javascript
import { useBillingReport } from '@/composables/psychology'

const {
  loading,
  exporting,
  report,
  filters,
  sessions,
  summaryByTestType,
  overallSummary,
  pagination,
  hasUnverifiedTests,
  fetchReport,
  fetchMonthlyReport,
  exportToCSV,
  exportToExcel,
  calculateBilling,
  resetFilters,
  goToPage
} = useBillingReport()
```

### Methods

#### `fetchReport(params)`
Fetch report dengan custom parameters
```javascript
await fetchReport({
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  verified: 'all',
  page: 1,
  limit: 100
})
```

#### `fetchMonthlyReport(month, year)`
Fetch report untuk bulan tertentu
```javascript
await fetchMonthlyReport(1, 2026) // January 2026
```

#### `fetchUnverified(startDate, endDate)`
Fetch hanya test yang belum verified
```javascript
await fetchUnverified('2026-01-01', '2026-01-31')
```

#### `calculateBilling(rates)`
Hitung total billing dengan tarif custom
```javascript
const billing = calculateBilling({
  'CFIT': 50000,
  'PAPI': 75000
})
// Returns: { breakdown: [...], grandTotal: number }
```

#### `exportToCSV(filename)`
Export ke CSV
```javascript
await exportToCSV('Invoice_Jan_2026.csv')
```

#### `exportToExcel(filename)`
Export ke Excel
```javascript
await exportToExcel('Report_Jan_2026.xlsx')
```

---

## 📊 Response Data Structure

```javascript
{
  sessions: [
    {
      sessionId: 'uuid',
      orderNumber: 'PSY-2601-ABC123',
      patientName: 'John Doe',
      patientEmail: 'john@example.com',
      patientId: '3174012345678901',
      testType: {
        code: 'CFIT',
        name: 'Culture Fair Intelligence Test',
        category: 'intelligence'
      },
      packageName: 'Paket Rekrutmen Dasar',
      completedAt: '2026-01-15T14:30:00.000Z',
      duration: 45,
      questionsAnswered: 46,
      totalQuestions: 46,
      verified: {
        isVerified: true,
        verifiedAt: '2026-01-15T15:00:00.000Z',
        verifiedBy: 'Dr. Jane Smith'
      },
      scores: {
        raw: 38,
        iq: 115,
        category: 'Above Average'
      },
      hasInterpretation: true
    }
  ],
  summaryByTestType: [
    {
      testType: {
        id: 'uuid',
        code: 'CFIT',
        name: 'Culture Fair Intelligence Test',
        category: 'intelligence'
      },
      totalTests: 45,
      verifiedTests: 42,
      unverifiedTests: 3,
      avgDurationMinutes: 43,
      period: {
        firstTest: '2026-01-01T10:00:00.000Z',
        lastTest: '2026-01-31T16:30:00.000Z'
      }
    }
  ],
  overallSummary: {
    totalTests: 156,
    verifiedTests: 145,
    unverifiedTests: 11,
    uniqueTestTypes: 5
  }
}
```

---

## ⚠️ Important Notes

### 1. Verification Status
- Warning akan muncul jika ada test belum verified
- Recommended: Verify semua test sebelum generate invoice

### 2. Date Range
- Backend filter berdasarkan `completedAt` (bukan `createdAt`)
- Lebih akurat untuk billing karena menunjukkan kapan test selesai

### 3. Pagination
- Default: 100 items per page
- Untuk export: set `limit: 1000` atau lebih
- Backend max limit bisa di-adjust

### 4. Performance
- Large datasets (>1000 sessions) bisa lambat
- Gunakan date range yang reasonable
- Export Excel lebih efisien untuk large data

### 5. Excel Export Dependency
- Requires `xlsx` package
- Install jika belum ada: `npm install xlsx`

---

## 🎨 UI Features

### Responsive Design
- Mobile-friendly dengan grid adaptif
- Table horizontal scroll untuk layar kecil

### Color Coding
- **Primary (blue)**: Total counts
- **Success (green)**: Verified tests
- **Warning (yellow)**: Unverified tests
- **Info (cyan)**: Test type categories

### Interactive Elements
- Quick date presets untuk convenience
- Toggle billing calculator
- Pagination untuk large datasets
- Export buttons dengan loading states

---

## 🔐 Permissions

Halaman ini requires:
- Module: `psychology`
- Permission: `read:PsychologySession`

Handled by route meta dan CASL authorization.

---

## 📝 Customization

### Ubah Default Rates
Edit di `billing.vue`:
```javascript
const testRates = ref({
  'CFIT': 60000,  // Update rate
  'PAPI': 80000,
  // ... dst
})
```

### Tambah Filter Test Type
Tambahkan dropdown di filters section:
```vue
<select v-model="filters.testTypeId">
  <option value="">Semua Test</option>
  <option v-for="type in testTypes" :value="type.id">
    {{ type.name }}
  </option>
</select>
```

### Custom Export Format
Modify `exportToExcel()` method untuk customize sheets/columns

---

## 🐛 Troubleshooting

### "Tidak ada data"
- Check date range valid
- Pastikan ada completed sessions di periode tsb
- Verify backend endpoint accessible

### Export tidak berfungsi
- Check browser console untuk errors
- Verify `xlsx` package installed
- Check file permissions

### Billing calculator salah
- Verify test rates input
- Check `calculateBilling()` logic
- Ensure summaryByTestType data valid

---

## 📚 Related Docs

- [Backend API Spec](./TEST-USAGE-BILLING-REPORT.md)
- [Session vs Order Comparison](./BILLING-REPORT-SESSION-VS-ORDER.md)
- [Usage Examples](./BILLING-REPORT-EXAMPLES.js)

---

**Generated:** January 1, 2026  
**Version:** 1.0.0
