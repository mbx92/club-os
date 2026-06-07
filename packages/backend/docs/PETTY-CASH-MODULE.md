# Petty Cash Module Documentation

**Versi:** 1.2.0 (March 7, 2026)  
**Base URL:** `/api/v1/finance/petty-cash`

---

## Daftar Isi

1. [Overview](#1-overview)
2. [Data Model](#2-data-model)
   - [PettyCash](#21-pettycash)
   - [PettyCashTransaction](#22-pettycashtransaction)
3. [Fund Source System](#3-fund-source-system)
4. [API Endpoints](#4-api-endpoints)
   - [CRUD](#41-crud)
   - [Operasi Dana](#42-operasi-dana)
   - [Riwayat Transaksi](#43-riwayat-transaksi)
5. [Alur Cashflow](#5-alur-cashflow)
6. [Auto Expense untuk Revenue](#6-auto-expense-untuk-revenue)
7. [Contoh Request & Response](#7-contoh-request--response)
8. [Error Codes](#8-error-codes)
9. [Keamanan & Permission](#9-keamanan--permission)

---

## 1. Overview

Modul Petty Cash mengelola **modal awal (kas kecil)** yang digunakan untuk biaya operasional harian. Setiap fund memiliki saldo sendiri dan dapat diisi ulang dari berbagai sumber dana.

### Model: Petty Cash sebagai Kantong / Wallet

Petty cash dirancang sebagai **kantong/wallet tersendiri** yang terpisah dari sistem Expense utama:

- **Masuk (inflow)**: `initial`, `top_up`, `sales_return`, `adjustment` positif — menambah saldo fund
- **Keluar (outflow)**: `expense`, `withdrawal`, `adjustment` negatif — mengurangi saldo fund
- Setiap pergerakan dana dicatat di `PettyCashTransaction` sebagai riwayat tracking internal

### Prinsip Anti-Double-Counting

Ketika petty cash diisi dari `revenue`, sistem otomatis membuat satu **Expense** (alokasi modal) agar tercatat di cashflow outflow. Pembayaran operasional yang **menggunakan** saldo petty cash — baik dari sumber manapun — **tidak** menciptakan Expense baru. Hal ini mencegah uang yang sama dihitung dua kali di laporan keuangan:

```
petty cash funded from 'revenue'
──────────────────────────────────────────────────────
Auto-Expense dibuat → cashflow outflow berkurang 1x

petty cash digunakan untuk beli sabun senilai Rp 50.000
──────────────────────────────────────────────────────
Hanya saldo petty cash berkurang — TIDAK ada Expense baru
Tracking tersedia di PettyCashTransaction (type: expense)
```

### Tipe Transaksi dalam Petty Cash

```
PettyCash (Fund)
│
├── initial     → Modal awal saat fund dibuat
├── top_up      → Penambahan dana (dari luar atau revenue)
├── expense     → Pengeluaran dari saldo fund (tracking saja, bukan Expense di sistem utama)
├── sales_return→ Pengembalian dari hasil penjualan shift
├── adjustment  → Koreksi saldo (positif/negatif)
└── withdrawal  → Penarikan dana dari fund
```

### Integrasi dengan Cashflow

| fundSource   | Auto Expense (funding) | Masuk Cashflow Outflow |
|--------------|:----------------------:|:----------------------:|
| `owner_cash`  | ✗ | ✗ |
| `bank_transfer` | ✗ | ✗ |
| `revenue`    | ✓ | ✓ |
| `other`      | ✗ | ✗ |

> Dana dari `revenue` dipotong dari cashflow karena merupakan pergerakan dana internal bisnis. Dana dari `owner_cash` / `bank_transfer` dianggap injeksi modal dari luar, sehingga tidak mengurangi cashflow operasional.
>
> **Penting**: Pengeluaran dari saldo petty cash (type `expense`) **tidak** dicatat sebagai Expense di sistem utama dan **tidak** mempengaruhi cashflow. Tracking dilakukan secara internal di `PettyCashTransaction`.

---

## 2. Data Model

### 2.1 PettyCash

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID | Primary key |
| `tenantId` | UUID | Tenant owner |
| `locationId` | UUID (nullable) | Lokasi terkait |
| `name` | STRING | Nama fund (contoh: "Kas Harian Depan") |
| `description` | TEXT | Deskripsi opsional |
| `initialAmount` | DECIMAL(15,2) | Modal awal saat fund dibuat — **tidak pernah berubah**, digunakan sebagai baseline perbandingan |
| `balance` | DECIMAL(15,2) | Saldo berjalan aktual — **berubah setiap transaksi** |
| `status` | ENUM | `active` \| `inactive` \| `closed` |
| `createdBy` | UUID | User yang membuat |
| `version` | INTEGER | Optimistic locking |

#### Perbandingan Saldo untuk UI Frontend

```
initialAmount   → Saldo Awal (tetap, baseline)
balance         → Saldo Sekarang (naik/turun sesuai transaksi)

Terpakai     = initialAmount - balance   (jika negatif = fund sudah ditambah melebihi modal awal)
Selisih (%)  = ((balance - initialAmount) / initialAmount) * 100
```

Contoh tampilan card petty cash:
```
┌──────────────────────────────────┐
│  Kas Harian Depan        [active] │
│                                  │
│  Modal Awal   : Rp   500.000     │  ← initialAmount (tetap)
│  Saldo Kini   : Rp   320.000     │  ← balance (berjalan)
│  Terpakai     : Rp   180.000     │  ← selisih
│                                  │
│  [Lihat Riwayat] [Top Up]        │
└──────────────────────────────────┘
```

> `initialAmount` **tidak pernah diupdate** oleh sistem. Jika ingin mereset baseline, buat fund baru dengan `initialAmount` yang diinginkan.

### 2.2 PettyCashTransaction

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID | Primary key |
| `tenantId` | UUID | Tenant owner |
| `pettyCashId` | UUID | Fund terkait |
| `transactionNumber` | STRING | Nomor otomatis (contoh: `PCT-2026-000001`) |
| `type` | ENUM | Lihat tabel di bawah |
| `fundSource` | ENUM (nullable) | Asal dana — lihat [Fund Source System](#3-fund-source-system) |
| `amount` | DECIMAL(15,2) | Positif = masuk, negatif = keluar |
| `balanceBefore` | DECIMAL(15,2) | Saldo sebelum transaksi |
| `balanceAfter` | DECIMAL(15,2) | Saldo sesudah transaksi |
| `referenceType` | STRING (nullable) | `Expense` \| `Transaction` |
| `referenceId` | UUID (nullable) | ID referensi |
| `description` | TEXT | Catatan |
| `transactionDate` | DATEONLY | Tanggal transaksi |
| `performedBy` | UUID | User yang melakukan |

#### Tipe Transaksi

| type | Arah | Keterangan |
|------|------|------------|
| `initial` | + | Modal awal saat fund pertama kali dibuat |
| `top_up` | + | Penambahan dana ke fund yang sudah ada |
| `expense` | − | Pengeluaran dari saldo fund — **tracking internal saja**, tidak membuat Expense di sistem utama |
| `sales_return` | + | Pengembalian dari hasil penjualan shift |
| `adjustment` | +/− | Koreksi manual saldo |
| `withdrawal` | − | Penarikan dana dari fund |

---

## 3. Fund Source System

`fundSource` hanya berlaku untuk transaksi **inflow** (`initial`, `top_up`, `adjustment` positif). Untuk outflow (`expense`, `withdrawal`) nilainya selalu `null`.

| Nilai | Keterangan | Buat Auto Expense |
|-------|------------|:-----------------:|
| `owner_cash` | Modal tunai langsung dari owner / kas fisik | ✗ |
| `bank_transfer` | Transfer dari rekening bank | ✗ |
| `revenue` | Diambil dari pendapatan bisnis (akan mengurangi cashflow) | ✓ |
| `other` | Sumber lain | ✗ |

### Default per Endpoint

| Endpoint | Default `fundSource` |
|----------|---------------------|
| `POST /petty-cash` (create) | `owner_cash` |
| `POST /petty-cash/:id/top-up` | `owner_cash` |
| `POST /petty-cash/:id/sales-return` | `revenue` (hardcoded, tidak dapat diubah) |
| `POST /petty-cash/:id/adjustment` (positif) | `other` |
| `POST /petty-cash/:id/adjustment` (negatif) | `null` |

---

## 4. API Endpoints

### 4.1 CRUD

#### `POST /api/v1/finance/petty-cash`
Buat fund petty cash baru beserta transaksi `initial`.

**Permission:** `create PettyCash`

**Request Body:**
```json
{
  "name": "Kas Harian Depan",
  "description": "Modal operasional kasir pagi",
  "initialAmount": 500000,
  "locationId": "uuid-opsional",
  "fundSource": "owner_cash"
}
```

| Field | Wajib | Keterangan |
|-------|:-----:|------------|
| `name` | ✓ | Nama fund |
| `initialAmount` | ✓ | Minimal 0 (boleh kosong/nol) |
| `description` | ✗ | Deskripsi opsional |
| `locationId` | ✗ | Filter lokasi |
| `fundSource` | ✗ | Default: `owner_cash` |

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Kas Harian Depan",
    "initialAmount": 500000,
    "balance": 500000,
    "status": "active",
    "location": null,
    "creator": { "id": "uuid", "firstName": "Admin" }
  }
}
```

> Jika `fundSource = 'revenue'` dan `initialAmount > 0`, sistem otomatis membuat **Expense** bertipe `Modal Petty Cash` dengan status `paid`. Lihat [Auto Expense](#6-auto-expense-untuk-revenue).

---

#### `GET /api/v1/finance/petty-cash`
Ambil semua fund petty cash tenant.

**Query Params:**
| Param | Keterangan |
|-------|------------|
| `status` | Filter: `active`, `inactive`, `closed` |
| `locationId` | Filter lokasi |
| `page` | Default: 1 |
| `limit` | Default: 20 |

---

#### `GET /api/v1/finance/petty-cash/:id`
Detail fund beserta 10 transaksi terakhir.

---

#### `PUT /api/v1/finance/petty-cash/:id`
Update info fund (name, description, status, locationId). Tidak bisa mengubah saldo langsung.

---

#### `DELETE /api/v1/finance/petty-cash/:id`
Soft-delete fund. Fund yang berstatus `closed` tidak bisa dioperasikan.

---

#### `GET /api/v1/finance/petty-cash/summary`
Ringkasan semua fund beserta total saldo dan statistik per tipe transaksi.

---

### 4.2 Operasi Dana

#### `POST /api/v1/finance/petty-cash/:id/top-up`
Tambah dana ke fund yang sudah ada.

**Permission:** `update PettyCash`

**Request Body:**
```json
{
  "amount": 200000,
  "description": "Penambahan modal siang",
  "transactionDate": "2026-03-07",
  "fundSource": "bank_transfer"
}
```

| Field | Wajib | Keterangan |
|-------|:-----:|------------|
| `amount` | ✓ | Harus > 0 |
| `fundSource` | ✗ | Default: `owner_cash` |
| `description` | ✗ | |
| `transactionDate` | ✗ | Default: hari ini |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "pettyCashId": "uuid",
    "transactionNumber": "PCT-2026-000002",
    "amount": 200000,
    "balanceBefore": 500000,
    "balanceAfter": 700000,
    "autoExpense": {
      "id": "uuid",
      "expenseNumber": "EXP-2026-000015"
    }
  },
  "message": "Top up successful"
}
```

> `autoExpense` hanya muncul di response jika `fundSource = 'revenue'`.

---

#### `POST /api/v1/finance/petty-cash/:id/expense`
Catat pengeluaran dari saldo petty cash. Operasi ini **hanya** mengurangi saldo fund dan membuat `PettyCashTransaction` untuk tracking — Expense di sistem utama **tidak** diubah statusnya.

Jika `expenseId` disertakan, ID tersebut disimpan sebagai `referenceId` di `PettyCashTransaction` untuk keperluan display/link konteks, bukan untuk men-update status Expense.

**Request Body:**
```json
{
  "amount": 50000,
  "description": "Beli sabun & tisu",
  "expenseId": "uuid-opsional (hanya sebagai referensi link)",
  "transactionDate": "2026-03-07"
}
```

---

#### `POST /api/v1/finance/petty-cash/:id/sales-return`
Kembalikan dana ke petty cash dari hasil penjualan shift. `fundSource` otomatis `revenue`.

**Request Body:**
```json
{
  "amount": 300000,
  "description": "Pengembalian dari shift pagi",
  "referenceId": "uuid-transaction-opsional",
  "transactionDate": "2026-03-07"
}
```

> Endpoint ini juga dapat diakses via `POST /:id/income` (backward compat).

---

#### `POST /api/v1/finance/petty-cash/:id/adjustment`
Koreksi saldo (positif = tambah, negatif = kurangi). Berguna untuk selisih fisik.

**Request Body:**
```json
{
  "amount": -5000,
  "description": "Selisih hitung fisik",
  "fundSource": "other",
  "transactionDate": "2026-03-07"
}
```

> `fundSource` hanya relevan jika `amount` positif. Jika negatif, `fundSource` diabaikan (`null`).

---

#### `POST /api/v1/finance/petty-cash/:id/withdrawal`
Tarik dana dari fund (tidak membuat Expense).

**Request Body:**
```json
{
  "amount": 100000,
  "description": "Setoran ke kasir utama",
  "transactionDate": "2026-03-07"
}
```

---

### 4.3 Riwayat Transaksi

#### `GET /api/v1/finance/petty-cash/:id/transactions`
Riwayat transaksi dengan filter dan pagination.

**Query Params:**
| Param | Keterangan |
|-------|------------|
| `type` | Filter tipe: `initial`, `top_up`, `expense`, dll |
| `fundSource` | Filter asal dana: `owner_cash`, `revenue`, dll |
| `startDate` | Tanggal mulai (YYYY-MM-DD) |
| `endDate` | Tanggal selesai |
| `page` | Default: 1 |
| `limit` | Default: 20 |

---

## 5. Alur Cashflow

```
┌─────────────────────────────────────────────────────────────────────┐
│  PENGISIAN PETTY CASH (Funding / Top-Up)                            │
├─────────────────────────────────────────────────────────────────────┤
│  fundSource = 'owner_cash' / 'bank_transfer' / 'other'              │
│  ─────────────────────────────────────────────                      │
│  Uang fisik MASUK ke petty cash fund                                │
│  Cashflow total → TIDAK BERUBAH                                     │
│  (Dana berasal dari luar operasional bisnis)                        │
│                                                                     │
│  fundSource = 'revenue'                                             │
│  ─────────────────────────────────────────────                      │
│  Auto-Expense dibuat → Cashflow Outflow BERKURANG (1 kali)         │
│  Saldo petty cash BERTAMBAH                                         │
│  Artinya: dana berpindah dari revenue operasional → petty cash      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  PENGGUNAAN PETTY CASH (Expense / Outflow dari fund)                │
├─────────────────────────────────────────────────────────────────────┤
│  Saldo petty cash BERKURANG                                         │
│  PettyCashTransaction dibuat (type: expense) → tracking internal    │
│  Expense di sistem utama → TIDAK BERUBAH                            │
│  Cashflow → TIDAK BERUBAH (sudah dipotong saat funding revenue)      │
└─────────────────────────────────────────────────────────────────────┘
```

### Dampak ke Laporan Keuangan

| Laporan | Funding `owner_cash` | Funding `revenue` | Penggunaan (expense dari fund) |
|---------|:--------------------:|:-----------------:|:------------------------------:|
| Cashflow Outflow | ✗ | ✓ (1x saat funding) | ✗ |
| Profit & Loss (expense) | ✗ | ✓ | ✗ |
| Expense Report (sistem utama) | ✗ | ✓ | ✗ |
| Saldo Petty Cash | ✓ (bertambah) | ✓ (bertambah) | ✓ (berkurang) |
| PettyCashTransaction (tracking) | ✓ | ✓ | ✓ |

---

## 6. Auto Expense untuk Revenue (Funding Only)

Auto Expense **hanya** dibuat untuk operasi **pengisian** petty cash (`POST /petty-cash` dan `POST /:id/top-up`) ketika `fundSource = 'revenue'`. Penggunaan saldo petty cash (endpoint `/:id/expense`) tidak membuat Expense apapun.

Ketika `fundSource = 'revenue'` pada `POST /petty-cash` atau `POST /:id/top-up`:

### Proses Otomatis

1. Sistem mencari **ExpenseCategory** bernama `'Modal Petty Cash'` untuk tenant tersebut
2. Jika belum ada, **dibuat otomatis** (sekali, tidak akan duplikat)
3. Dibuat **Expense** baru dengan:
   - `title`: `"Modal Petty Cash: {nama fund}"` atau `"Top Up Petty Cash: {nama fund}"`
   - `status`: `paid` (langsung dicatat sebagai sudah dibayar)
   - `paymentMethod`: `cash`
   - `amount`: sesuai nilai yang diinputkan
   - `paidDate`: sesuai `transactionDate` atau tanggal sekarang
4. `PettyCashTransaction` di-link ke Expense via `referenceType: 'Expense'` + `referenceId`

### Kategori Auto-Create

```json
{
  "name": "Modal Petty Cash",
  "description": "Alokasi dana dari revenue ke petty cash (auto-generated)",
  "type": "operational",
  "color": "#6366f1",
  "isActive": true
}
```

> Kategori ini dapat dilihat dan dikelola di `GET /api/v1/finance/expense-categories`. Jangan menghapus kategori ini jika masih ada expense aktif yang terhubung.

### Diagram Relasi

```
PettyCashTransaction
  ├── type: 'initial' / 'top_up'
  ├── fundSource: 'revenue'
  ├── referenceType: 'Expense'
  └── referenceId ──────────────► Expense
                                    ├── category: 'Modal Petty Cash'
                                    ├── status: 'paid'
                                    └── amount: (sama dengan PCT amount)
```

---

## 7. Contoh Request & Response

### Skenario 1: Modal Awal dari Uang Tunai Owner

```http
POST /api/v1/finance/petty-cash
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Kas Harian",
  "initialAmount": 1000000,
  "fundSource": "owner_cash"
}
```

**Efek:** Saldo fund = 1.000.000. Cashflow tidak berubah.

---

### Skenario 2: Modal Awal dari Revenue

```http
POST /api/v1/finance/petty-cash
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Kas Operasional",
  "initialAmount": 500000,
  "description": "Dana dari pendapatan kemarin",
  "fundSource": "revenue"
}
```

**Efek:**
- Fund dibuat dengan saldo 500.000
- Expense `EXP-2026-XXXXXX` dibuat otomatis (status: paid, amount: 500.000)
- Cashflow outflow bertambah 500.000

---

### Skenario 3: Top Up dari Transfer Bank

```http
POST /api/v1/finance/petty-cash/{id}/top-up
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 300000,
  "description": "Transfer dari rekening BCA",
  "fundSource": "bank_transfer",
  "transactionDate": "2026-03-07"
}
```

**Efek:** Saldo fund naik 300.000. Cashflow tidak berubah.

---

### Skenario 4: Fund Dibuat dengan Saldo Nol

```http
POST /api/v1/finance/petty-cash
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Kas Baru",
  "initialAmount": 0
}
```

**Efek:** Fund dibuat dengan saldo 0. `fundSource` di transaksi `initial` = `null`.

---

### Skenario 5: Koreksi Saldo (Fisik Lebih dari Sistem)

```http
POST /api/v1/finance/petty-cash/{id}/adjustment
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 5000,
  "description": "Koreksi: uang receh tidak terhitung",
  "fundSource": "other"
}
```

---

## 8. Error Codes

| Code | HTTP | Keterangan |
|------|------|------------|
| `VALIDATION_ERROR` | 400 | Field wajib kosong atau nilai tidak valid |
| `PETTY_CASH_NOT_FOUND` | 404 | Fund tidak ditemukan atau tidak aktif |
| `FUND_CLOSED` | 400 | Fund sudah ditutup (status: `closed`) |
| `INSUFFICIENT_BALANCE` | 400 | Saldo tidak cukup untuk expense/withdrawal |
| `NEGATIVE_BALANCE` | 400 | Adjustment akan mengakibatkan saldo negatif |
| `EXPENSE_NOT_FOUND` | 404 | `expenseId` (referensi) tidak ditemukan di tenant |

---

## 9. Keamanan & Permission

| Operasi | Permission CASL |
|---------|-----------------|
| Lihat semua fund & summary | `read PettyCash` |
| Buat fund baru | `create PettyCash` |
| Update info fund | `update PettyCash` |
| Hapus fund | `delete PettyCash` |
| Top up, expense, adjustment, withdrawal, sales-return | `update PettyCash` |
| Lihat riwayat transaksi | `read PettyCash` |

### Multi-Tenancy

Semua operasi otomatis difilter by `tenantId` dari JWT token. Tidak ada data lintas tenant yang dapat diakses.

### Optimistic Locking

`PettyCash.version` diincrement setiap update saldo untuk mencegah race condition di operasi konkuren (menggunakan `withRetry` + `REPEATABLE_READ` isolation level).

---

## Catatan Perubahan

| Versi | Tanggal | Perubahan |
|-------|---------|-----------|
| 1.2.0 | 2026-03-07 | Ubah model menjadi **wallet/kantong**: penggunaan saldo petty cash (endpoint `/:id/expense`) tidak lagi mengubah status Expense di sistem utama. `expenseId` hanya sebagai reference link. Hapus error `EXPENSE_ALREADY_PAID`. Mencegah double-counting di laporan keuangan. |
| 1.1.0 | 2026-03-07 | Tambah `fundSource` di `PettyCashTransaction`; auto-create Expense saat `fundSource=revenue`; fix validasi `initialAmount=0` |
| 1.0.0 | 2026-03-05 | Rilis pertama modul petty cash |
