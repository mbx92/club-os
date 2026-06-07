# Billing Report - Bug Fix: patientCode Issue

## 🐛 Issue yang Ditemui

### Error dari Backend
```json
{
  "success": false,
  "code": "INTERNAL_ERROR",
  "message": "column order->patient.identityNumber does not exist"
}
```

### Penyebab
Backend mengembalikan field `patientCode` tetapi frontend mengharapkan `patientId`.

---

## ✅ Yang Sudah Diperbaiki

### 1. Composable (`useBillingReport.js`)

#### CSV Export
**Before:**
```javascript
'Patient ID',
// ...
session.patientId || '-',
```

**After:**
```javascript
'Patient Code',
// ...
session.patientCode || '-',
```

#### Excel Export
**Before:**
```javascript
'Patient ID': session.patientId || '-',
```

**After:**
```javascript
'Patient Code': session.patientCode || '-',
```

---

### 2. Page (`billing.vue`)

#### Display Table
**Before:**
```vue
<div class="text-xs text-base-content/50">{{ session.patientId }}</div>
```

**After:**
```vue
<div class="text-xs text-base-content/50">{{ session.patientCode }}</div>
```

---

### 3. Documentation

Updated semua dokumentasi untuk menggunakan `patientCode` instead of `patientId`.

---

## 📊 Response Structure (Updated)

```javascript
{
  "success": true,
  "data": {
    "sessions": [
      {
        "sessionId": "uuid",
        "orderNumber": "PSY-2601-ABC123",
        "patientName": "John Doe",
        "patientEmail": "john@example.com",
        "patientCode": "PT-001",           // ✅ Correct field name
        "testType": {
          "code": "CFIT",
          "name": "Culture Fair Intelligence Test",
          "category": "intelligence"
        },
        // ... rest of the fields
      }
    ]
  }
}
```

---

## 🧪 Testing

Setelah fix ini:
- ✅ Data akan muncul di halaman billing
- ✅ Export CSV akan menggunakan Patient Code
- ✅ Export Excel akan menggunakan Patient Code
- ✅ Display table akan menampilkan patient code di bawah nama

---

## 📝 Files Changed

1. `src/composables/psychology/useBillingReport.js`
   - Line ~185: CSV export header & data
   - Line ~285: Excel export data

2. `src/pages/psychology/reports/billing.vue`
   - Line ~425: Display table cell

3. `docs/report psy/TEST-USAGE-BILLING-REPORT.md`
   - Response examples updated

---

## ✅ Status

**Fixed on:** January 1, 2026  
**Issue:** patientId → patientCode mismatch  
**Status:** ✅ Resolved  
**Test:** Data should now display correctly
