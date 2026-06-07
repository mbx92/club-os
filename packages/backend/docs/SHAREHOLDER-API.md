# Shareholder API Documentation

## Overview

Modul Shareholder menyimpan daftar pemilik/pemegang saham bisnis beserta persentase bagi hasilnya. Data ini digunakan oleh laporan keuangan (`/reports/finance/shareholder`) untuk menghitung distribusi keuntungan secara otomatis.

- **Base URL**: `/api/v1`
- **Feature Gate**: `finance` (subscription plan harus mengaktifkan modul finance)
- **Authentication**: Semua endpoint memerlukan header `Authorization: Bearer <token>`
- **Permission Subject**: `FinancialReport`

---

## Data Model

| Field | Type | Keterangan |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | Tenant pemilik data |
| `name` | STRING | Nama pemegang saham |
| `percentage` | DECIMAL(5,2) | Persentase bagi hasil (0.01 – 100) |
| `notes` | TEXT | Catatan opsional |
| `isActive` | BOOLEAN | Aktif/tidak aktif (default: `true`) |
| `sortOrder` | INTEGER | Urutan tampilan (default: `0`) |
| `createdBy` | UUID | User yang membuat data |
| `createdAt` | TIMESTAMP | Waktu dibuat |
| `updatedAt` | TIMESTAMP | Waktu diubah |
| `deletedAt` | TIMESTAMP | Soft-delete timestamp |

> **Catatan**: Tabel menggunakan **soft-delete** (`paranoid: true`). Data yang dihapus tidak benar-benar hilang dari database.

---

## Endpoints

### 1. List Shareholders

```
GET /api/v1/finance/shareholders
```

Mengembalikan semua pemegang saham milik tenant, diurutkan berdasarkan `sortOrder` lalu `createdAt`.

**Permission**: `read FinancialReport`

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-...",
      "name": "Owner A",
      "percentage": "60.00",
      "notes": null,
      "isActive": true,
      "sortOrder": 0,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "uuid-...",
      "name": "Owner B",
      "percentage": "40.00",
      "notes": "Investor",
      "isActive": true,
      "sortOrder": 1,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 2,
    "activeTotal": 100.0,
    "isValid": true
  }
}
```

`meta.isValid` bernilai `true` apabila total persentase shareholder **aktif** tepat 100%. Gunakan nilai ini di frontend untuk menampilkan peringatan apabila total belum seimbang.

---

### 2. Create Shareholder

```
POST /api/v1/finance/shareholders
```

**Permission**: `create FinancialReport`

**Request Body**
```json
{
  "name": "Owner A",
  "percentage": 60,
  "notes": "Pemilik utama",
  "sortOrder": 0
}
```

| Field | Wajib | Keterangan |
|---|---|---|
| `name` | ✅ | Nama pemegang saham |
| `percentage` | ✅ | Persentase (0.01 – 100) |
| `notes` | ❌ | Catatan opsional |
| `sortOrder` | ❌ | Urutan tampilan (default: `0`) |

**Response** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid-...",
    "name": "Owner A",
    "percentage": "60.00",
    "notes": "Pemilik utama",
    "isActive": true,
    "sortOrder": 0,
    ...
  }
}
```

**Error Responses**

| Code | Status | Keterangan |
|---|---|---|
| `MISSING_FIELDS` | 400 | `name` atau `percentage` tidak dikirim |
| `INVALID_PERCENTAGE` | 400 | Nilai `percentage` di luar rentang 0.01–100 |

---

### 3. Update Shareholder

```
PUT /api/v1/finance/shareholders/:id
```

**Permission**: `update FinancialReport`

**Request Body** (semua field opsional, hanya field yang dikirim yang diubah)
```json
{
  "name": "Owner A Updated",
  "percentage": 55,
  "notes": "Update catatan",
  "isActive": true,
  "sortOrder": 1
}
```

**Response** `200 OK`
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Responses**

| Code | Status | Keterangan |
|---|---|---|
| `NOT_FOUND` | 404 | Shareholder tidak ditemukan untuk tenant ini |
| `INVALID_PERCENTAGE` | 400 | `percentage` di luar rentang 0.01–100 |

---

### 4. Delete Shareholder

```
DELETE /api/v1/finance/shareholders/:id
```

Melakukan **soft-delete** (data tidak dihapus permanen dari database).

**Permission**: `delete FinancialReport`

**Response** `200 OK`
```json
{
  "success": true,
  "message": "Shareholder deleted"
}
```

**Error Responses**

| Code | Status | Keterangan |
|---|---|---|
| `NOT_FOUND` | 404 | Shareholder tidak ditemukan untuk tenant ini |

---

### 5. Reorder Shareholders

```
PUT /api/v1/finance/shareholders/reorder
```

Update `sortOrder` secara bulk dalam satu transaksi database.

**Permission**: `update FinancialReport`

**Request Body**
```json
[
  { "id": "uuid-owner-a", "sortOrder": 0 },
  { "id": "uuid-owner-b", "sortOrder": 1 }
]
```

**Response** `200 OK`
```json
{
  "success": true,
  "message": "Order updated"
}
```

**Error Responses**

| Code | Status | Keterangan |
|---|---|---|
| `INVALID_BODY` | 400 | Body bukan array atau array kosong |

---

## Laporan Distribusi Pemegang Saham

```
GET /api/v1/reports/finance/shareholder?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

Menghitung distribusi keuntungan berdasarkan data shareholder aktif di database. Mendukung override sementara via query param.

**Permission**: `read FinancialReport`

**Query Parameters**

| Parameter | Wajib | Keterangan |
|---|---|---|
| `startDate` | ✅ | Tanggal mulai (YYYY-MM-DD) |
| `endDate` | ✅ | Tanggal akhir (YYYY-MM-DD) |
| `shareholders` | ❌ | Override sementara: JSON array `[{"name":"A","percentage":60},{"name":"B","percentage":40}]` |

### Logika Perhitungan (Waterfall)

```
Gross Revenue (semua transaksi completed/paid)
  - Petty Cash Allocation  (kategori "Modal Petty Cash")
  - Staff Salaries         (kategori mengandung kata: gaji, salary, payroll, tunjangan, upah, dll)
  - Other Expenses         (pengeluaran lainnya)
  ─────────────────────────────────────────────
= Distributable Profit

Setiap shareholder mendapat:
  amount = distributableProfit × (percentage / 100)
```

**Response**
```json
{
  "success": true,
  "data": {
    "summary": {
      "grossRevenue": 50000000,
      "totalTax": 0,
      "totalDiscount": 500000,
      "compliment": {
        "total": 200000,
        "transactionCount": 3
      },
      "totalDeductions": 15000000,
      "distributableProfit": 35000000,
      "profitMargin": 70.0,
      "period": {
        "startDate": "2026-03-01",
        "endDate": "2026-03-15"
      }
    },
    "deductions": {
      "pettyCashAllocation": {
        "total": 5000000,
        "items": [
          { "categoryName": "Modal Petty Cash", "total": 5000000, "count": 10 }
        ]
      },
      "staffSalaries": {
        "total": 7000000,
        "items": [
          { "categoryName": "Gaji Karyawan", "total": 7000000, "count": 5 }
        ]
      },
      "otherExpenses": {
        "total": 3000000,
        "items": [
          { "categoryName": "Listrik & Air", "total": 1500000, "count": 2 },
          { "categoryName": "Peralatan", "total": 1500000, "count": 3 }
        ]
      }
    },
    "shareholderDistribution": [
      { "name": "Owner A", "percentage": 60, "amount": 21000000 },
      { "name": "Owner B", "percentage": 40, "amount": 14000000 }
    ]
  },
  "filters": {
    "startDate": "2026-03-01",
    "endDate": "2026-03-15",
    "shareholdersSource": "db"
  }
}
```

`shareholdersSource` bernilai `"db"` jika data diambil dari database, atau `"override"` jika menggunakan query param `shareholders`.

---

## Catatan Penting

1. **Total persentase harus 100%** — Laporan tidak akan memvalidasi otomatis bahwa total = 100. Gunakan `meta.isValid` dari endpoint list untuk mevalidasi sebelum membuat laporan.
2. **Soft-delete** — Shareholder yang dihapus tidak muncul kembali di list, tetapi data historis laporan tidak terpengaruh apabila menggunakan override via query param.
3. **isActive** — Hanya shareholder dengan `isActive: true` yang diambil saat membuat laporan otomatis dari DB.
4. **Multi-tenant** — Semua operasi otomatis difilter berdasarkan `tenantId` dari token JWT, tidak perlu mengirim `tenantId` secara manual.
