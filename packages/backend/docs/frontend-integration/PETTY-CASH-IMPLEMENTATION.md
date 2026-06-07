# Petty Cash & Shift Management — Frontend Implementation Guide

## Overview

Fitur petty cash memungkinkan kasir membuka shift dengan modal awal kas (opening balance), mencatat semua transaksi tunai selama shift, lalu menutup shift dengan menghitung selisih antara kas yang diharapkan vs kas aktual.

---

## Flow Diagram

```
Login Kasir
     │
     ▼
GET /gym/cash-register/current
     │
     ├── Ada sesi OPEN? ──YES──► Tampilkan halaman kasir + live summary
     │
     └── Tidak ada sesi? ──► Tampilkan modal "Buka Shift"
              │
              ▼
         POST /gym/cash-register/open
         (input: shiftName, openingBalance)
              │
              ▼
         Kasir bekerja... transaksi berjalan
              │
              ▼
         POST /gym/cash-register/:id/close
         (input: actualCash)
              │
              ▼
         Tampilkan laporan closing (surplus/deficit)
```

---

## Endpoints

Base URL: `/api/v1`

---

### 1. Cek Sesi Aktif (saat login / buka halaman kasir)

```
GET /gym/cash-register/current?locationId={uuid}
```

**Response — tidak ada sesi aktif:**
```json
{
  "success": true,
  "data": null,
  "message": "Tidak ada shift yang aktif"
}
```

**Response — ada sesi aktif:**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "uuid",
      "shiftName": "pagi",
      "shiftDate": "2026-02-19",
      "shiftNumber": 1,
      "openingBalance": "500000.00",
      "openedAt": "2026-02-19T07:00:00.000Z",
      "status": "open",
      "openedBy": { "id": "uuid", "name": "Budi", "email": "budi@gym.com" },
      "location": { "id": "uuid", "name": "Lantai 1" }
    },
    "liveSummary": {
      "openingBalance": 500000,
      "cashIn": 350000,
      "cashOut": 0,
      "expectedCash": 850000
    }
  }
}
```

---

### 2. Buka Shift Baru

```
POST /gym/cash-register/open
```

**Request Body:**
```json
{
  "shiftName": "pagi",
  "openingBalance": 500000,
  "locationId": "uuid",
  "openingNotes": "Modal dari brankas"
}
```

| Field | Tipe | Required | Keterangan |
|---|---|---|---|
| `shiftName` | string | ✅ | Nama shift bebas: "pagi", "siang", "malam", dll |
| `openingBalance` | number | ✅ | Modal awal kas (petty cash), min 0 |
| `locationId` | uuid | ❌ | ID lokasi/outlet (jika multi-lokasi) |
| `openingNotes` | string | ❌ | Catatan pembukaan |

**Response (201):**
```json
{
  "success": true,
  "message": "Shift pagi berhasil dibuka",
  "data": {
    "id": "uuid",
    "shiftName": "pagi",
    "shiftDate": "2026-02-19",
    "shiftNumber": 1,
    "openingBalance": "500000.00",
    "openedAt": "2026-02-19T07:00:00.000Z",
    "status": "open",
    "openedBy": { "id": "uuid", "name": "Budi", "email": "budi@gym.com" }
  }
}
```

**Error — ada sesi yang belum ditutup (409):**
```json
{
  "success": false,
  "message": "Masih ada sesi shift yang belum ditutup",
  "data": {
    "sessionId": "uuid",
    "shiftName": "pagi",
    "openedAt": "2026-02-19T07:00:00.000Z"
  }
}
```

> **UI Hint:** Jika 409, redirect ke halaman sesi yang masih open. Jangan biarkan kasir membuka shift baru sebelum menutup yang lama.

---

### 3. Tutup Shift

```
POST /gym/cash-register/:id/close
```

**Request Body:**
```json
{
  "actualCash": 840000,
  "closingNotes": "Kurang 10rb, kemungkinan kembalian keliru"
}
```

| Field | Tipe | Required | Keterangan |
|---|---|---|---|
| `actualCash` | number | ✅ | Jumlah kas aktual saat dihitung di laci |
| `closingNotes` | string | ❌ | Catatan penutupan |

**Response:**
```json
{
  "success": true,
  "message": "Shift berhasil ditutup",
  "data": {
    "session": { "...session fields..." },
    "summary": {
      "openingBalance": 500000,
      "cashIn": 350000,
      "cashOut": 0,
      "expectedCash": 850000,
      "actualCash": 840000,
      "difference": -10000,
      "status": "deficit"
    }
  }
}
```

**`summary.status` values:**
| Value | Arti |
|---|---|
| `balance` | Kas pas, tidak ada selisih |
| `surplus` | Kas aktual **lebih** dari yang diharapkan |
| `deficit` | Kas aktual **kurang** dari yang diharapkan |

> **UI Hint:** Tampilkan popup konfirmasi sebelum close. Jika `deficit`, tunjukkan warning merah. Jika `surplus`, tunjukkan info biru.

---

### 4. Detail Sesi (dengan summary)

```
GET /gym/cash-register/:id
```

**Response (status: open):**
```json
{
  "success": true,
  "data": {
    "session": { "...session fields..." },
    "summary": {
      "openingBalance": 500000,
      "cashIn": 200000,
      "cashOut": 0,
      "expectedCash": 700000,
      "actualCash": null,
      "difference": null
    }
  }
}
```

**Response (status: closed):**
```json
{
  "success": true,
  "data": {
    "session": { "...session fields..." },
    "summary": {
      "openingBalance": 500000,
      "closingBalance": 850000,
      "actualCash": 840000,
      "difference": -10000,
      "status": "deficit"
    }
  }
}
```

---

### 5. List Semua Sesi (History / Admin)

```
GET /gym/cash-register?page=1&limit=20&status=closed&dateFrom=2026-02-01&dateTo=2026-02-19
```

**Query Params:**
| Param | Keterangan |
|---|---|
| `page` | Nomor halaman (default: 1) |
| `limit` | Jumlah per halaman (default: 20) |
| `status` | `open` \| `closed` |
| `locationId` | Filter per lokasi |
| `dateFrom` | YYYY-MM-DD |
| `dateTo` | YYYY-MM-DD |
| `openedById` | Filter per kasir |

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### 6. Dashboard Petty Cash

```
GET /gym/dashboard/petty-cash?locationId={uuid}&date=2026-02-19
```

**Query Params:**
| Param | Keterangan |
|---|---|
| `locationId` | Opsional, filter per lokasi |
| `date` | YYYY-MM-DD, default: hari ini |

**Response:**
```json
{
  "success": true,
  "data": {
    "targetDate": "2026-02-19",
    "currentSession": {
      "id": "uuid",
      "shiftName": "pagi",
      "shiftDate": "2026-02-19",
      "shiftNumber": 1,
      "openingBalance": "500000.00",
      "status": "open",
      "openedAt": "2026-02-19T07:00:00.000Z",
      "openedBy": { "id": "uuid", "name": "Budi" },
      "liveSummary": {
        "openingBalance": 500000,
        "cashIn": 350000,
        "cashOut": 0,
        "expectedCash": 850000,
        "transactionCount": 7
      }
    },
    "todaySessions": [
      {
        "id": "uuid1",
        "shiftName": "pagi",
        "shiftNumber": 1,
        "status": "closed",
        "openingBalance": "500000.00",
        "actualCash": "840000.00",
        "difference": "-10000.00",
        "openedAt": "...",
        "closedAt": "...",
        "openedBy": { "name": "Budi" },
        "closedBy": { "name": "Budi" }
      }
    ],
    "todayAggregate": {
      "totalShifts": 2,
      "openShifts": 1,
      "closedShifts": 1,
      "totalOpeningBalance": 1000000,
      "totalActualCash": 840000,
      "totalDifference": -10000
    },
    "recentHistory": [
      {
        "shiftDate": "2026-02-13",
        "shiftCount": "2",
        "totalOpeningBalance": "1000000",
        "totalActualCash": "2350000",
        "totalDifference": "0"
      },
      ...7 hari terakhir
    ]
  }
}
```

---

## Suggested UI Components

### A. Kasir — Flow Banner (di atas halaman POS/transaksi)

Tampilkan selalu di header kasir:

```
┌─────────────────────────────────────────────────────┐
│ 🟢 Shift Pagi  |  Dibuka: 07:00  |  Modal: Rp 500K  │
│ Kas masuk: Rp 350.000  |  Estimasi kas: Rp 850.000  │
│                               [Tutup Shift]          │
└─────────────────────────────────────────────────────┘
```

Jika tidak ada sesi aktif:
```
┌─────────────────────────────────────────────────────┐
│ ⚠️  Belum ada shift aktif hari ini                  │
│                               [Buka Shift]           │
└─────────────────────────────────────────────────────┘
```

---

### B. Modal Buka Shift

```
┌── Buka Shift Baru ──────────────────────┐
│                                          │
│  Nama Shift *                            │
│  [pagi        ▼] (atau ketik bebas)      │
│  Opsi: pagi | siang | malam | custom     │
│                                          │
│  Modal Awal Kas (Petty Cash) *           │
│  [Rp _______________]                    │
│                                          │
│  Lokasi                                  │
│  [Pilih lokasi...]                       │
│                                          │
│  Catatan                                 │
│  [________________________________]      │
│                                          │
│         [Batal]   [✅ Buka Shift]        │
└──────────────────────────────────────────┘
```

---

### C. Modal Tutup Shift

```
┌── Tutup Shift: Pagi ────────────────────┐
│                                          │
│  Ringkasan Shift                         │
│  Modal awal       Rp  500.000            │
│  Kas masuk        Rp  350.000            │
│  Kas keluar       Rp        0            │
│  ─────────────────────────────           │
│  Kas diharapkan   Rp  850.000            │
│                                          │
│  Kas Aktual (hitung fisik) *             │
│  [Rp _______________]                    │
│                                          │
│  Selisih: [dihitung otomatis]            │
│                                          │
│  Catatan                                 │
│  [________________________________]      │
│                                          │
│         [Batal]   [🔒 Tutup Shift]       │
└──────────────────────────────────────────┘
```

Setelah close, tampilkan popup hasil:
```
┌── Shift Ditutup ────────────────────────┐
│                                          │
│  ✅ Shift Pagi berhasil ditutup          │
│                                          │
│  Kas diharapkan : Rp 850.000            │
│  Kas aktual     : Rp 840.000            │
│  Selisih        : -Rp 10.000  ⚠️ DEFICIT│
│                                          │
│                          [OK]            │
└──────────────────────────────────────────┘
```

---

### D. Dashboard Petty Cash (halaman manager/admin)

Gunakan `GET /gym/dashboard/petty-cash`

Layout yang disarankan:

```
┌─────────────── Petty Cash Hari Ini ─────────────────┐
│                                                       │
│  Shift aktif: Pagi  |  Dibuka 07:00 oleh Budi        │
│                                                       │
│  Modal awal    Kas masuk    Estimasi kas              │
│  Rp 500K       Rp 350K      Rp 850K                   │
│                                                       │
└───────────────────────────────────────────────────────┘

┌── Shift Hari Ini ─────────────────────────────────────┐
│  #  Shift   Dibuka   Ditutup  Modal    Aktual  Selisih │
│  1  Pagi    07:00    13:00    500K     840K    -10K ⚠️  │
│  2  Siang   13:00    (open)   500K     —       —       │
└───────────────────────────────────────────────────────┘

┌── Riwayat 7 Hari ────────────────────────────────────┐
│  [Chart: Bar chart — actualCash per hari]             │
│                                                       │
│  Tgl        Shift  Modal        Aktual    Selisih     │
│  13 Feb     2      Rp 1.000K   Rp 2.35M  Rp 0        │
│  14 Feb     2      Rp 1.000K   Rp 1.90M  +Rp 5K      │
│  ...                                                  │
└───────────────────────────────────────────────────────┘
```

---

## State Management (Rekomendasi)

```javascript
// Store / Context
{
  cashRegister: {
    currentSession: null | SessionObject,
    liveSummary: null | LiveSummaryObject,
    isLoading: false,
    lastFetched: null,
  }
}

// Polling (opsional — refresh summary setiap 60 detik saat shift open)
useEffect(() => {
  if (!currentSession) return;
  const interval = setInterval(() => {
    dispatch(fetchCurrentSession());
  }, 60_000);
  return () => clearInterval(interval);
}, [currentSession?.id]);
```

---

## Error Handling

| HTTP Code | Kondisi | UI Action |
|---|---|---|
| `409` | Shift belum ditutup saat buka baru | Redirect ke sesi yang open |
| `404` | Session ID tidak ditemukan | Tampilkan "Sesi tidak ditemukan", refresh list |
| `400` | `shiftName` kosong / `actualCash` kosong | Tampilkan validasi inline |
| `403` | User tidak punya akses `CashRegisterSession` | Tampilkan pesan "Tidak ada akses" |

---

## Permission yang Dibutuhkan

Pastikan user role memiliki CASL permission:

| Action | Resource | Keterangan |
|---|---|---|
| `read` | `CashRegisterSession` | Lihat sesi, dashboard, current |
| `create` | `CashRegisterSession` | Buka shift |
| `update` | `CashRegisterSession` | Tutup shift |
