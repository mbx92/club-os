# Supplier API Documentation

## Overview

API untuk manajemen master data Supplier/Vendor.

- **Base URL**: `/api/v1/finance/suppliers`
- **Authentication**: Bearer Token (JWT) — semua endpoint wajib
- **CASL Subject**: `Supplier`
- **Multi-tenant**: Data otomatis terisolasi per tenant

---

## Endpoints

### 1. List Suppliers

```
GET /api/v1/finance/suppliers
```

**Permission**: `read Supplier`

**Query Parameters:**

| Parameter   | Type    | Default | Keterangan                                      |
|-------------|---------|---------|------------------------------------------------|
| `page`      | number  | `1`     | Nomor halaman                                  |
| `limit`     | number  | `20`    | Jumlah data per halaman                        |
| `sortBy`    | string  | `name`  | Kolom untuk sorting                            |
| `sortOrder` | string  | `ASC`   | Arah sort: `ASC` atau `DESC`                   |
| `search`    | string  | -       | Cari berdasarkan name, code, contactPerson, email, phone |
| `isActive`  | boolean | -       | Filter status: `true` atau `false`             |
| `category`  | string  | -       | Filter kategori supplier                        |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "code": "SUP-001",
      "name": "PT Supplier ABC",
      "contactPerson": "Budi",
      "email": "budi@supplier.com",
      "phone": "08123456789",
      "address": "Jl. Merdeka No. 1",
      "city": "Jakarta",
      "province": "DKI Jakarta",
      "postalCode": "10110",
      "taxId": "01.234.567.8-901.000",
      "bankName": "BCA",
      "bankAccountNumber": "1234567890",
      "bankAccountHolder": "PT Supplier ABC",
      "category": "equipment",
      "notes": "Catatan tambahan",
      "isActive": true,
      "createdAt": "2026-03-07T00:00:00.000Z",
      "updatedAt": "2026-03-07T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### 2. Create Supplier

```
POST /api/v1/finance/suppliers
```

**Permission**: `create Supplier`

**Request Body (JSON):**

| Field                | Type    | Required | Keterangan                   |
|----------------------|---------|----------|------------------------------|
| `name`               | string  | **Ya**   | Nama supplier/vendor         |
| `code`               | string  | -        | Kode unik per tenant (e.g. `SUP-001`) |
| `contactPerson`      | string  | -        | Nama kontak person           |
| `email`              | string  | -        | Email (format valid)         |
| `phone`              | string  | -        | Nomor telepon                |
| `address`            | string  | -        | Alamat lengkap               |
| `city`               | string  | -        | Kota                         |
| `province`           | string  | -        | Provinsi                     |
| `postalCode`         | string  | -        | Kode pos                     |
| `taxId`              | string  | -        | NPWP                         |
| `bankName`           | string  | -        | Nama bank                    |
| `bankAccountNumber`  | string  | -        | Nomor rekening               |
| `bankAccountHolder`  | string  | -        | Nama pemilik rekening        |
| `category`           | string  | -        | Kategori (bebas teks, e.g. `food`, `equipment`, `cleaning`, `supplement`) |
| `notes`              | string  | -        | Catatan tambahan             |
| `isActive`           | boolean | -        | Default: `true`              |

**Contoh Request Body:**
```json
{
  "name": "PT Supplier ABC",
  "code": "SUP-001",
  "contactPerson": "Budi Santoso",
  "email": "budi@supplierabc.com",
  "phone": "08123456789",
  "address": "Jl. Merdeka No. 1",
  "city": "Jakarta",
  "province": "DKI Jakarta",
  "postalCode": "10110",
  "taxId": "01.234.567.8-901.000",
  "bankName": "BCA",
  "bankAccountNumber": "1234567890",
  "bankAccountHolder": "PT Supplier ABC",
  "category": "equipment",
  "notes": "Supplier peralatan gym",
  "isActive": true
}
```

**Response 201:**
```json
{
  "success": true,
  "data": { ...supplier }
}
```

**Error Responses:**

| HTTP | Code                   | Keterangan                         |
|------|------------------------|------------------------------------|
| 400  | `VALIDATION_ERROR`     | Field `name` kosong                |
| 400  | `SUPPLIER_NAME_EXISTS` | Nama supplier sudah ada di tenant  |
| 400  | `SUPPLIER_CODE_EXISTS` | Kode supplier sudah ada di tenant  |

---

### 3. Get Supplier by ID

```
GET /api/v1/finance/suppliers/:id
```

**Permission**: `read Supplier`

**Response 200:**
```json
{
  "success": true,
  "data": { ...supplier }
}
```

**Error Response:**

| HTTP | Code                  | Keterangan            |
|------|-----------------------|-----------------------|
| 404  | `SUPPLIER_NOT_FOUND`  | Supplier tidak ditemukan |

---

### 4. Update Supplier

```
PUT /api/v1/finance/suppliers/:id
```

**Permission**: `update Supplier`

**Request Body (JSON):** Sama seperti Create, semua field opsional. Hanya kirim field yang ingin diubah.

**Response 200:**
```json
{
  "success": true,
  "data": { ...supplier }
}
```

**Error Responses:**

| HTTP | Code                   | Keterangan                         |
|------|------------------------|------------------------------------|
| 404  | `SUPPLIER_NOT_FOUND`   | Supplier tidak ditemukan           |
| 400  | `SUPPLIER_NAME_EXISTS` | Nama sudah dipakai supplier lain   |
| 400  | `SUPPLIER_CODE_EXISTS` | Kode sudah dipakai supplier lain   |

---

### 5. Toggle Status Supplier

```
PATCH /api/v1/finance/suppliers/:id/toggle-status
```

**Permission**: `update Supplier`

**Request Body:** Tidak diperlukan

**Response 200:**
```json
{
  "success": true,
  "data": { ...supplier },
  "message": "Supplier activated successfully"
}
```

> `message` akan berisi `activated` atau `deactivated` sesuai status akhir.

---

### 6. Delete Supplier

```
DELETE /api/v1/finance/suppliers/:id
```

**Permission**: `delete Supplier`

Melakukan **soft delete** — data tidak benar-benar dihapus dari database.

**Response 200:**
```json
{
  "success": true,
  "message": "Supplier deleted successfully"
}
```

**Error Responses:**

| HTTP | Code                  | Keterangan                                                   |
|------|-----------------------|--------------------------------------------------------------|
| 404  | `SUPPLIER_NOT_FOUND`  | Supplier tidak ditemukan                                     |
| 400  | `SUPPLIER_IN_USE`     | Supplier masih terhubung ke expense, gunakan toggle-status   |

---

## Data Model Supplier

| Field                | Type         | Required | Keterangan                     |
|----------------------|--------------|----------|--------------------------------|
| `id`                 | UUID         | auto     | Primary key                    |
| `tenantId`           | UUID         | auto     | Dari JWT user                  |
| `code`               | string(50)   | -        | Kode unik per tenant           |
| `name`               | string       | **Ya**   | Nama supplier                  |
| `contactPerson`      | string       | -        | Kontak person                  |
| `email`              | string       | -        | Email valid                    |
| `phone`              | string(30)   | -        | Nomor telepon                  |
| `address`            | text         | -        | Alamat lengkap                 |
| `city`               | string       | -        | Kota                           |
| `province`           | string       | -        | Provinsi                       |
| `postalCode`         | string(10)   | -        | Kode pos                       |
| `taxId`              | string(50)   | -        | NPWP                           |
| `bankName`           | string       | -        | Nama bank                      |
| `bankAccountNumber`  | string(50)   | -        | Nomor rekening                 |
| `bankAccountHolder`  | string       | -        | Nama pemilik rekening          |
| `category`           | string       | -        | Kategori supplier              |
| `notes`              | text         | -        | Catatan                        |
| `isActive`           | boolean      | -        | Default `true`                 |
| `createdAt`          | datetime     | auto     | Timestamp dibuat               |
| `updatedAt`          | datetime     | auto     | Timestamp diupdate             |
| `deletedAt`          | datetime     | auto     | Soft delete timestamp          |

---

## Catatan Frontend

- **Soft delete**: Setelah `DELETE`, record masih ada di DB tapi tidak muncul di list. Tidak perlu logic khusus di frontend.
- **Toggle status**: Gunakan endpoint ini daripada `PUT` untuk mengubah `isActive`. Lebih aman karena tidak override field lain.
- **Supplier in use**: Jika DELETE ditolak dengan `SUPPLIER_IN_USE`, tampilkan pesan agar user menonaktifkan supplier saja (toggle-status).
- **Search**: Bersifat case-insensitive, mencari di field `name`, `code`, `contactPerson`, `email`, `phone` sekaligus.
