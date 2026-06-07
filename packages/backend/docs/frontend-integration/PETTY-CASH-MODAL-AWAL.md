# Petty Cash (Modal Awal) - Frontend Integration Guide

## Overview

Fitur **Petty Cash / Modal Awal** memungkinkan pengelolaan dana awal yang dapat:
- ✅ Dibuat sebagai dana kas kecil dengan jumlah tertentu
- ✅ Ditambah (top-up) kapan saja
- ✅ Digunakan untuk membayar expense secara langsung
- ✅ Dikembalikan dari hasil penjualan (sales return)
- ✅ Disesuaikan (adjustment) jika ada selisih
- ✅ Ditarik (withdrawal)
- ✅ Tracking riwayat transaksi lengkap dengan saldo sebelum & sesudah

---

## Base URL

```
/api/v1/finance/petty-cash
```

## Authentication

Semua endpoint memerlukan JWT token:
```
Authorization: Bearer <token>
```

## CASL Permission

| Action   | Subject     | Keterangan                     |
|----------|-------------|--------------------------------|
| `create` | `PettyCash` | Buat dana baru                 |
| `read`   | `PettyCash` | Lihat dana & riwayat transaksi |
| `update` | `PettyCash` | Edit, top-up, bayar, tarik     |
| `delete` | `PettyCash` | Hapus dana                     |

---

## Data Models

### PettyCash (Dana Modal Awal)

```typescript
interface PettyCash {
  id: string;              // UUID
  tenantId: string;
  locationId: string | null;
  name: string;            // Nama dana, e.g. "Modal Awal Harian"
  description: string | null;
  initialAmount: number;   // Jumlah awal saat dibuat
  balance: number;         // Saldo saat ini
  status: 'active' | 'inactive' | 'closed';
  createdBy: string;       // UUID user
  version: number;         // Optimistic locking
  createdAt: string;
  updatedAt: string;
  // Relations
  location?: Location;
  creator?: UserSummary;
  transactions?: PettyCashTransaction[];
}
```

### PettyCashTransaction (Riwayat Transaksi Modal)

```typescript
interface PettyCashTransaction {
  id: string;              // UUID
  tenantId: string;
  pettyCashId: string;
  transactionNumber: string; // Auto-generated: "PCT-2026-000001"
  type: 'initial' | 'top_up' | 'expense' | 'sales_return' | 'adjustment' | 'withdrawal';
  amount: number;          // Positif = masuk, Negatif = keluar
  balanceBefore: number;
  balanceAfter: number;
  referenceType: string | null;  // "Expense" | "Transaction" | null
  referenceId: string | null;    // UUID dokumen terkait
  description: string | null;
  transactionDate: string;       // YYYY-MM-DD
  performedBy: string;           // UUID user
  createdAt: string;
  updatedAt: string;
  // Relations
  performer?: UserSummary;
}
```

### Transaction Types

| Type           | Amount | Deskripsi                          |
|----------------|--------|------------------------------------|
| `initial`      | `+`    | Modal awal saat dana dibuat        |
| `top_up`       | `+`    | Penambahan dana                    |
| `expense`      | `-`    | Pembayaran expense                 |
| `sales_return` | `+`    | Pengembalian dari hasil penjualan  |
| `adjustment`   | `+/-`  | Penyesuaian saldo (koreksi)        |
| `withdrawal`   | `-`    | Penarikan dana                     |

---

## Endpoints

### 1. Buat Dana Modal Awal

**`POST /api/v1/finance/petty-cash`**

Membuat dana petty cash baru dengan saldo awal.

**Request Body:**
```json
{
  "name": "Modal Awal Kasir",
  "description": "Dana operasional harian kasir depan",
  "initialAmount": 500000,
  "locationId": "uuid-location"  // opsional
}
```

**Validasi:**
- `name` — Wajib, tidak boleh kosong
- `initialAmount` — Wajib, harus >= 0

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "tenantId": "tenant-uuid",
    "locationId": "uuid-location",
    "name": "Modal Awal Kasir",
    "description": "Dana operasional harian kasir depan",
    "initialAmount": "500000.00",
    "balance": "500000.00",
    "status": "active",
    "createdBy": "user-uuid",
    "version": 0,
    "createdAt": "2026-03-05T10:00:00.000Z",
    "updatedAt": "2026-03-05T10:00:00.000Z",
    "location": {
      "id": "uuid-location",
      "name": "Cabang Utama"
    },
    "creator": {
      "id": "user-uuid",
      "firstName": "Admin",
      "lastName": "Gym",
      "email": "admin@gym.com"
    }
  }
}
```

---

### 2. Daftar Semua Dana

**`GET /api/v1/finance/petty-cash`**

**Query Parameters:**

| Param      | Type   | Default     | Deskripsi                            |
|------------|--------|-------------|--------------------------------------|
| `status`   | string | —           | Filter: `active`, `inactive`, `closed` |
| `locationId` | string | —         | Filter by lokasi                     |
| `search`   | string | —           | Cari berdasarkan nama/deskripsi      |
| `page`     | number | `1`         | Halaman                              |
| `limit`    | number | `20`        | Jumlah per halaman                   |
| `sortBy`   | string | `createdAt` | Sort: `name`, `balance`, `initialAmount`, `status`, `createdAt` |
| `sortOrder`| string | `DESC`      | `ASC` atau `DESC`                     |

**Contoh Request:**
```
GET /api/v1/finance/petty-cash?status=active&sortBy=balance&sortOrder=DESC&page=1&limit=10
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-...",
      "name": "Modal Awal Kasir",
      "initialAmount": "500000.00",
      "balance": "350000.00",
      "status": "active",
      "location": { "id": "...", "name": "Cabang Utama" },
      "creator": { "id": "...", "firstName": "Admin", "lastName": "Gym", "email": "admin@gym.com" }
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 3. Detail Dana + Transaksi Terakhir

**`GET /api/v1/finance/petty-cash/:id`**

Mengembalikan detail dana beserta **10 transaksi terakhir**.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "name": "Modal Awal Kasir",
    "initialAmount": "500000.00",
    "balance": "350000.00",
    "status": "active",
    "location": { "id": "...", "name": "Cabang Utama" },
    "creator": { "id": "...", "firstName": "Admin", "lastName": "Gym", "email": "admin@gym.com" },
    "transactions": [
      {
        "id": "tx-uuid",
        "transactionNumber": "PCT-2026-000003",
        "type": "expense",
        "amount": "-50000.00",
        "balanceBefore": "400000.00",
        "balanceAfter": "350000.00",
        "referenceType": "Expense",
        "referenceId": "expense-uuid",
        "description": "Pembayaran expense: Beli tisu toilet",
        "transactionDate": "2026-03-05",
        "performer": { "id": "...", "firstName": "Kasir", "lastName": "Satu", "email": "kasir@gym.com" }
      },
      {
        "id": "tx-uuid-2",
        "transactionNumber": "PCT-2026-000002",
        "type": "sales_return",
        "amount": "100000.00",
        "balanceBefore": "300000.00",
        "balanceAfter": "400000.00",
        "description": "Pengembalian dari hasil penjualan pagi",
        "transactionDate": "2026-03-05",
        "performer": { "id": "...", "firstName": "Admin", "lastName": "Gym", "email": "admin@gym.com" }
      }
    ]
  }
}
```

---

### 4. Update Info Dana

**`PUT /api/v1/finance/petty-cash/:id`**

Update nama, deskripsi, status, atau lokasi. **Tidak mengubah saldo.**

**Request Body (semua opsional):**
```json
{
  "name": "Modal Kasir Sore",
  "description": "Updated description",
  "status": "inactive",
  "locationId": "new-location-uuid"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": { /* PettyCash object */ }
}
```

**Error Cases:**
- `404 PETTY_CASH_NOT_FOUND` — Dana tidak ditemukan
- `400 FUND_CLOSED` — Dana sudah ditutup, tidak bisa dimodifikasi

---

### 5. Hapus Dana

**`DELETE /api/v1/finance/petty-cash/:id`**

Soft delete. **Hanya bisa dihapus jika saldo = 0.**

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Petty cash fund deleted successfully"
}
```

**Error Cases:**
- `404 PETTY_CASH_NOT_FOUND` — Dana tidak ditemukan
- `400 FUND_HAS_BALANCE` — Masih ada saldo, tarik dulu sebelum hapus

---

### 6. Top Up (Tambah Dana)

**`POST /api/v1/finance/petty-cash/:id/top-up`**

**Request Body:**
```json
{
  "amount": 200000,
  "description": "Tambahan modal sore",        // opsional
  "transactionDate": "2026-03-05"               // opsional, default: hari ini
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "pettyCashId": "a1b2c3d4-...",
    "transactionNumber": "PCT-2026-000004",
    "amount": 200000,
    "balanceBefore": 350000,
    "balanceAfter": 550000
  },
  "message": "Top up successful"
}
```

**Error Cases:**
- `400 VALIDATION_ERROR` — Amount harus > 0
- `404 PETTY_CASH_NOT_FOUND` — Dana tidak ditemukan atau tidak aktif

---

### 7. Bayar Expense dari Modal ⭐

**`POST /api/v1/finance/petty-cash/:id/expense`**

Endpoint utama untuk menggunakan modal membayar expense. Jika `expenseId` diberikan, expense otomatis ditandai **paid** dengan `paymentMethod: 'petty_cash'`.

**Request Body:**
```json
{
  "expenseId": "expense-uuid",          // opsional - jika ada, expense otomatis jadi paid
  "amount": 75000,
  "description": "Beli sabun dan tisu",  // opsional
  "transactionDate": "2026-03-05"        // opsional
}
```

**Tanpa `expenseId` (pengeluaran langsung):**
```json
{
  "amount": 25000,
  "description": "Bayar parkir tamu"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "pettyCashId": "a1b2c3d4-...",
    "transactionNumber": "PCT-2026-000005",
    "amount": 75000,
    "balanceBefore": 550000,
    "balanceAfter": 475000,
    "expenseId": "expense-uuid"
  },
  "message": "Expense payment from petty cash successful"
}
```

**Error Cases:**
- `400 VALIDATION_ERROR` — Amount harus > 0
- `400 INSUFFICIENT_BALANCE` — Saldo tidak cukup (response berisi `currentBalance`)
- `404 PETTY_CASH_NOT_FOUND` — Dana tidak ditemukan atau tidak aktif
- `404 EXPENSE_NOT_FOUND` — Expense tidak ditemukan
- `400 EXPENSE_ALREADY_PAID` — Expense sudah dibayar sebelumnya

---

### 8. Pengembalian dari Penjualan (Sales Return) ⭐

**`POST /api/v1/finance/petty-cash/:id/sales-return`**

Mengembalikan dana dari hasil penjualan ke modal. Opsional bisa di-link ke Transaction tertentu.

**Request Body:**
```json
{
  "amount": 150000,
  "description": "Pengembalian dari penjualan shift pagi",
  "transactionDate": "2026-03-05",
  "referenceId": "transaction-uuid"     // opsional - UUID transaksi penjualan
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "pettyCashId": "a1b2c3d4-...",
    "transactionNumber": "PCT-2026-000006",
    "amount": 150000,
    "balanceBefore": 475000,
    "balanceAfter": 625000
  },
  "message": "Sales return to petty cash successful"
}
```

---

### 9. Adjustment (Penyesuaian Saldo)

**`POST /api/v1/finance/petty-cash/:id/adjustment`**

Koreksi saldo. Amount bisa positif (tambah) atau negatif (kurang).

**Request Body:**
```json
{
  "amount": -5000,
  "description": "Koreksi selisih cash count",
  "transactionDate": "2026-03-05"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "pettyCashId": "a1b2c3d4-...",
    "transactionNumber": "PCT-2026-000007",
    "amount": -5000,
    "balanceBefore": 625000,
    "balanceAfter": 620000
  },
  "message": "Adjustment successful"
}
```

**Error Cases:**
- `400 VALIDATION_ERROR` — Amount tidak boleh 0
- `400 NEGATIVE_BALANCE` — Adjustment akan membuat saldo negatif
- `404 PETTY_CASH_NOT_FOUND` — Dana tidak ditemukan

---

### 10. Withdrawal (Penarikan)

**`POST /api/v1/finance/petty-cash/:id/withdrawal`**

**Request Body:**
```json
{
  "amount": 100000,
  "description": "Penarikan akhir shift",
  "transactionDate": "2026-03-05"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "pettyCashId": "a1b2c3d4-...",
    "transactionNumber": "PCT-2026-000008",
    "amount": 100000,
    "balanceBefore": 620000,
    "balanceAfter": 520000
  },
  "message": "Withdrawal successful"
}
```

**Error Cases:**
- `400 VALIDATION_ERROR` — Amount harus > 0
- `400 INSUFFICIENT_BALANCE` — Saldo tidak cukup

---

### 11. Riwayat Transaksi

**`GET /api/v1/finance/petty-cash/:id/transactions`**

**Query Parameters:**

| Param       | Type   | Default          | Deskripsi                                |
|-------------|--------|------------------|------------------------------------------|
| `type`      | string | —                | Filter: `initial`, `top_up`, `expense`, `sales_return`, `adjustment`, `withdrawal` |
| `startDate` | string | —                | Filter mulai tanggal (YYYY-MM-DD)        |
| `endDate`   | string | —                | Filter sampai tanggal (YYYY-MM-DD)       |
| `page`      | number | `1`              | Halaman                                  |
| `limit`     | number | `20`             | Jumlah per halaman                       |
| `sortBy`    | string | `transactionDate`| Sort: `transactionDate`, `amount`, `type`, `createdAt` |
| `sortOrder` | string | `DESC`           | `ASC` atau `DESC`                         |

**Contoh Request:**
```
GET /api/v1/finance/petty-cash/a1b2c3d4/transactions?type=expense&startDate=2026-03-01&endDate=2026-03-05&page=1&limit=10
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "tx-uuid",
      "transactionNumber": "PCT-2026-000005",
      "type": "expense",
      "amount": "-75000.00",
      "balanceBefore": "550000.00",
      "balanceAfter": "475000.00",
      "referenceType": "Expense",
      "referenceId": "expense-uuid",
      "description": "Pembayaran expense: Beli sabun dan tisu",
      "transactionDate": "2026-03-05",
      "performer": {
        "id": "user-uuid",
        "firstName": "Kasir",
        "lastName": "Satu",
        "email": "kasir@gym.com"
      }
    }
  ],
  "pagination": {
    "total": 8,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 12. Summary (Ringkasan)

**`GET /api/v1/finance/petty-cash/summary`**

**Query Parameters:**

| Param       | Type   | Deskripsi                         |
|-------------|--------|-----------------------------------|
| `startDate` | string | Filter transaksi dari tanggal     |
| `endDate`   | string | Filter transaksi sampai tanggal   |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalFunds": 3,
    "totalBalance": 1520000,
    "totalInitialAmount": 1500000,
    "funds": [
      {
        "id": "a1b2c3d4-...",
        "name": "Modal Awal Kasir",
        "balance": 520000,
        "initialAmount": 500000,
        "location": "Cabang Utama"
      },
      {
        "id": "e5f6g7h8-...",
        "name": "Modal Restoran",
        "balance": 1000000,
        "initialAmount": 1000000,
        "location": null
      }
    ],
    "transactionSummary": {
      "initial": { "count": 3, "totalAmount": 1500000 },
      "top_up": { "count": 2, "totalAmount": 400000 },
      "expense": { "count": 5, "totalAmount": -380000 },
      "sales_return": { "count": 1, "totalAmount": 150000 },
      "adjustment": { "count": 1, "totalAmount": -5000 },
      "withdrawal": { "count": 1, "totalAmount": -100000 }
    }
  }
}
```

---

## Error Response Format

Semua error mengikuti format standar:

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

### Error Codes

| Code                    | HTTP | Deskripsi                            |
|-------------------------|------|--------------------------------------|
| `VALIDATION_ERROR`      | 400  | Input tidak valid                    |
| `INSUFFICIENT_BALANCE`  | 400  | Saldo tidak cukup                    |
| `NEGATIVE_BALANCE`      | 400  | Operasi akan membuat saldo negatif   |
| `FUND_CLOSED`           | 400  | Dana sudah ditutup                   |
| `FUND_HAS_BALANCE`      | 400  | Tidak bisa hapus, masih ada saldo    |
| `EXPENSE_ALREADY_PAID`  | 400  | Expense sudah dibayar                |
| `PETTY_CASH_NOT_FOUND`  | 404  | Dana tidak ditemukan                 |
| `EXPENSE_NOT_FOUND`     | 404  | Expense tidak ditemukan              |

---

## Alur Kerja (Workflow)

### Alur Harian Kasir

```
┌─────────────────────────────────────────────────────────┐
│  PAGI: Buka Shift                                       │
│  ───────────────────                                    │
│  1. Buat/pilih dana modal aktif                         │
│     POST /petty-cash                                    │
│     atau GET /petty-cash?status=active                  │
│                                                         │
│  2. Top up jika perlu                                   │
│     POST /petty-cash/:id/top-up                         │
├─────────────────────────────────────────────────────────┤
│  SIANG: Operasional                                     │
│  ───────────────────                                    │
│  3. Bayar expense dari modal                            │
│     POST /petty-cash/:id/expense                        │
│     { expenseId, amount }                               │
│                                                         │
│  4. Terima pengembalian dari penjualan (opsional)       │
│     POST /petty-cash/:id/sales-return                   │
│     { amount, description }                             │
├─────────────────────────────────────────────────────────┤
│  MALAM: Tutup Shift                                    │
│  ───────────────────                                    │
│  5. Cash count & adjustment jika selisih                │
│     POST /petty-cash/:id/adjustment                     │
│     { amount: -5000, description: "Selisih cash" }      │
│                                                         │
│  6. Cek summary                                         │
│     GET /petty-cash/summary                             │
│                                                         │
│  7. Tarik sisa uang (opsional)                          │
│     POST /petty-cash/:id/withdrawal                     │
└─────────────────────────────────────────────────────────┘
```

### Alur Bayar Expense dari Modal

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ Buat Expense │────▶│ Pilih Dana Modal│────▶│ Bayar dari Modal │
│ POST expense │     │ GET petty-cash  │     │ POST /:id/expense│
│ status:draft │     │ ?status=active  │     │ {expenseId,amount}│
└──────────────┘     └─────────────────┘     └──────────────────┘
                                                      │
                                              ┌───────▼───────┐
                                              │ Otomatis:      │
                                              │ • Saldo berkurang│
                                              │ • Expense → paid│
                                              │ • Riwayat tercatat│
                                              └────────────────┘
```

---

## Contoh Implementasi Frontend

### React / Next.js (dengan axios)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1/finance/petty-cash',
  headers: { Authorization: `Bearer ${token}` }
});

// === CRUD ===

// Buat dana modal baru
const createFund = (data: {
  name: string;
  initialAmount: number;
  description?: string;
  locationId?: string;
}) => api.post('/', data);

// List semua dana aktif
const getActiveFunds = (page = 1) =>
  api.get('/', { params: { status: 'active', page, limit: 20 } });

// Detail dana
const getFundDetail = (id: string) => api.get(`/${id}`);

// Summary
const getSummary = (startDate?: string, endDate?: string) =>
  api.get('/summary', { params: { startDate, endDate } });

// === OPERASI DANA ===

// Top up
const topUp = (id: string, amount: number, description?: string) =>
  api.post(`/${id}/top-up`, { amount, description });

// Bayar expense
const payExpense = (
  fundId: string,
  amount: number,
  expenseId?: string,
  description?: string
) => api.post(`/${fundId}/expense`, { amount, expenseId, description });

// Sales return
const salesReturn = (id: string, amount: number, description?: string) =>
  api.post(`/${id}/sales-return`, { amount, description });

// Adjustment
const adjust = (id: string, amount: number, description: string) =>
  api.post(`/${id}/adjustment`, { amount, description });

// Withdrawal
const withdraw = (id: string, amount: number, description?: string) =>
  api.post(`/${id}/withdrawal`, { amount, description });

// Riwayat transaksi
const getTransactions = (id: string, params?: {
  type?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) => api.get(`/${id}/transactions`, { params });
```

### Flutter (dengan Dio)

```dart
class PettyCashService {
  final Dio _dio;
  final String _baseUrl = '/api/v1/finance/petty-cash';

  PettyCashService(this._dio);

  // Buat dana modal baru
  Future<Response> createFund({
    required String name,
    required double initialAmount,
    String? description,
    String? locationId,
  }) => _dio.post(_baseUrl, data: {
    'name': name,
    'initialAmount': initialAmount,
    if (description != null) 'description': description,
    if (locationId != null) 'locationId': locationId,
  });

  // List dana
  Future<Response> getFunds({
    String? status,
    int page = 1,
    int limit = 20,
  }) => _dio.get(_baseUrl, queryParameters: {
    if (status != null) 'status': status,
    'page': page,
    'limit': limit,
  });

  // Detail + transaksi terakhir
  Future<Response> getFundDetail(String id) => _dio.get('$_baseUrl/$id');

  // Summary
  Future<Response> getSummary({String? startDate, String? endDate}) =>
    _dio.get('$_baseUrl/summary', queryParameters: {
      if (startDate != null) 'startDate': startDate,
      if (endDate != null) 'endDate': endDate,
    });

  // Top up
  Future<Response> topUp(String id, double amount, {String? description}) =>
    _dio.post('$_baseUrl/$id/top-up', data: {
      'amount': amount,
      if (description != null) 'description': description,
    });

  // Bayar expense dari modal
  Future<Response> payExpense(String id, double amount, {
    String? expenseId,
    String? description,
  }) => _dio.post('$_baseUrl/$id/expense', data: {
    'amount': amount,
    if (expenseId != null) 'expenseId': expenseId,
    if (description != null) 'description': description,
  });

  // Sales return
  Future<Response> salesReturn(String id, double amount, {
    String? description,
    String? referenceId,
  }) => _dio.post('$_baseUrl/$id/sales-return', data: {
    'amount': amount,
    if (description != null) 'description': description,
    if (referenceId != null) 'referenceId': referenceId,
  });

  // Adjustment
  Future<Response> adjust(String id, double amount, String description) =>
    _dio.post('$_baseUrl/$id/adjustment', data: {
      'amount': amount,
      'description': description,
    });

  // Withdrawal
  Future<Response> withdraw(String id, double amount, {String? description}) =>
    _dio.post('$_baseUrl/$id/withdrawal', data: {
      'amount': amount,
      if (description != null) 'description': description,
    });

  // Riwayat transaksi
  Future<Response> getTransactions(String id, {
    String? type,
    String? startDate,
    String? endDate,
    int page = 1,
    int limit = 20,
  }) => _dio.get('$_baseUrl/$id/transactions', queryParameters: {
    if (type != null) 'type': type,
    if (startDate != null) 'startDate': startDate,
    if (endDate != null) 'endDate': endDate,
    'page': page,
    'limit': limit,
  });
}
```

---

## UI Suggestions

### Halaman Utama Petty Cash

```
┌─────────────────────────────────────────────────────┐
│  💰 Petty Cash / Modal Awal                        │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ Total Saldo: Rp 1.520.000    Dana Aktif: 3   │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  [+ Buat Dana Baru]                                 │
│                                                     │
│  ┌─────────────────────────────────────────┐        │
│  │ 📋 Modal Awal Kasir                     │        │
│  │ Saldo: Rp 520.000 / Rp 500.000 (awal)  │        │
│  │ Lokasi: Cabang Utama                    │        │
│  │ [Top Up] [Bayar Expense] [Tarik] [···]  │        │
│  └─────────────────────────────────────────┘        │
│                                                     │
│  ┌─────────────────────────────────────────┐        │
│  │ 📋 Modal Restoran                       │        │
│  │ Saldo: Rp 1.000.000 / Rp 1.000.000     │        │
│  │ [Top Up] [Bayar Expense] [Tarik] [···]  │        │
│  └─────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

### Detail & Riwayat Transaksi

```
┌─────────────────────────────────────────────────────┐
│  📋 Modal Awal Kasir                                │
│  Saldo: Rp 520.000                                  │
│                                                     │
│  [Top Up] [Bayar Expense] [Sales Return] [Adjust]   │
│                                                     │
│  Filter: [Semua ▾] Dari: [____] Sampai: [____]     │
│                                                     │
│  ┌────┬──────────┬──────────┬───────────┬────────┐  │
│  │ #  │ Tanggal  │ Tipe     │ Jumlah    │ Saldo  │  │
│  ├────┼──────────┼──────────┼───────────┼────────┤  │
│  │ 1  │ 05/03/26 │ 🔴 Expense│ -75.000  │ 475.000│  │
│  │ 2  │ 05/03/26 │ 🟢 Return │ +150.000 │ 550.000│  │
│  │ 3  │ 05/03/26 │ 🟢 Top Up │ +200.000 │ 400.000│  │
│  │ 4  │ 05/03/26 │ 🔴 Expense│ -100.000 │ 200.000│  │
│  │ 5  │ 04/03/26 │ 🟢 Initial│ +500.000 │ 500.000│  │
│  └────┴──────────┴──────────┴───────────┴────────┘  │
└─────────────────────────────────────────────────────┘
```

### Transaction Type Badge Colors

| Type           | Warna  | Label             | Icon |
|----------------|--------|-------------------|------|
| `initial`      | 🔵 Blue   | Modal Awal        | 💰   |
| `top_up`       | 🟢 Green  | Top Up            | ➕   |
| `expense`      | 🔴 Red    | Pengeluaran       | 💸   |
| `sales_return` | 🟢 Green  | Hasil Penjualan   | 🔄   |
| `adjustment`   | 🟡 Yellow | Penyesuaian       | ⚖️   |
| `withdrawal`   | 🔴 Red    | Penarikan         | 📤   |
