# Couple Plan / Group Plan — Dokumentasi

## Overview

Fitur **Couple Plan** memungkinkan 1 membership plan berlaku untuk 2 orang atau lebih dalam satu transaksi. Cocok untuk paket seperti:
- Couple Daily Pass (2 orang)
- Family Plan (3+ orang)
- Group Session (N orang)

Implementasi menggunakan field `pax` pada `ServicePlan` sebagai penentu jumlah orang dalam satu paket.

---

## Model

### `ServicePlan.pax`

```
pax: INTEGER  (default: 1)
```

| Nilai | Artinya |
|-------|---------|
| `1` | Paket individual (standar) |
| `2` | Couple plan (2 orang) |
| `N` | Group plan (N orang) |

---

## Endpoint

### `POST /api/v1/gym/services/purchase`

Membeli service plan untuk primary member + companion members.

#### Request Body

```json
{
  "memberId": "uuid-primary-member",
  "servicePlans": [
    {
      "servicePlanId": "uuid-couple-plan",
      "startDate": "2026-03-01",
      "assignedTrainerId": null,
      "autoRenew": false,
      "additionalMemberIds": ["uuid-companion-member"]
    }
  ],
  "paymentMethods": [
    { "method": "cash", "amount": 500000 }
  ],
  "notes": "Couple plan suami istri"
}
```

#### Field `additionalMemberIds`

| Kondisi | Aturan |
|---------|--------|
| `plan.pax = 1` | `additionalMemberIds` harus kosong / tidak diisi |
| `plan.pax = 2` | `additionalMemberIds` harus tepat 1 ID |
| `plan.pax = N` | `additionalMemberIds` harus tepat `N - 1` ID |
| Primary member ID di dalam list | ❌ Error: primary tidak boleh jadi companion |
| Companion ID duplikat | ❌ Error: tidak boleh ada ID yang sama |
| Companion member tidak ditemukan | ❌ Error: 404 |

> **Note**: Format legacy (field `servicePlanId` langsung di body, bukan array) juga mendukung `additionalMemberIds` di root body.

#### Response (Sukses `201`)

```json
{
  "message": "1 service(s) purchased successfully untuk 2 orang (termasuk 1 companion)",
  "data": {
    "activeServices": [
      {
        "id": "uuid-as-primary",
        "memberId": "uuid-primary-member",
        "servicePlanId": "uuid-couple-plan",
        "status": "active",
        "startDate": "2026-03-01T00:00:00.000Z",
        "endDate": "2026-03-31T00:00:00.000Z",
        "pricePaid": 500000,
        "servicePlan": { "id": "...", "name": "Couple Daily Pass", "pax": 2 }
      }
    ],
    "companionActiveServices": [
      {
        "id": "uuid-as-companion",
        "memberId": "uuid-companion-member",
        "servicePlanId": "uuid-couple-plan",
        "status": "active",
        "startDate": "2026-03-01T00:00:00.000Z",
        "endDate": "2026-03-31T00:00:00.000Z",
        "pricePaid": 0,
        "notes": "Companion plan (pax=2) — dibeli bersama primary member ID: uuid-primary-member. Transaksi: GYM-20260301-001.",
        "servicePlan": { "id": "...", "name": "Couple Daily Pass", "pax": 2 },
        "member": { "id": "...", "firstName": "...", "lastName": "..." }
      }
    ],
    "coupleInfo": {
      "totalPeople": 2,
      "primaryMemberId": "uuid-primary-member",
      "companionMemberIds": ["uuid-companion-member"]
    },
    "transaction": {
      "id": "uuid-transaction",
      "transactionNumber": "GYM-20260301-001",
      "subtotal": 500000,
      "voucherDiscount": 0,
      "taxAmount": 0,
      "totalAmount": 500000,
      "paidAmount": 500000,
      "changeAmount": 0
    }
  }
}
```

> **`companionActiveServices`** akan berupa array kosong `[]` jika tidak ada companion (plan individual).  
> **`coupleInfo`** hanya muncul di response jika ada companion (`undefined` untuk paket individual).

---

## Logika Bisnis

### Harga
- Harga paket dibayar **1x** oleh primary member (pricePaid = harga penuh)
- Companion `ActiveService` memiliki `pricePaid = 0` untuk menghindari double-counting pada laporan keuangan
- Jika ada voucher, diskon proporsional diterapkan pada primary — companion tetap 0

### ActiveService yang Dibuat
Untuk 1 couple plan (`pax=2`, `quantity=1`):
- **2 ActiveService records** dibuat:
  - 1 untuk primary member (`pricePaid = harga plan`)
  - 1 untuk companion member (`pricePaid = 0`)
- Keduanya terhubung ke 1 `TransactionId` yang sama

Untuk `quantity=2`, `pax=2` (beli 2 couple plan sekaligus):
- **4 ActiveService records** dibuat:
  - 2 untuk primary member
  - 2 untuk companion member

### Tanggal Aktif
Primary dan companion mendapat `startDate` dan `endDate` yang sama, berdasarkan:
- `sp.startDate` jika disediakan di request
- `new Date()` (sekarang) jika tidak ada

### Status Member
Setelah transaksi berhasil:
- Primary member: `membershipStatus` → `'active'`
- Semua companion member: `membershipStatus` → `'active'`

### Extension (perpanjangan)
- Extension check (`existingActiveService`) **hanya berlaku pada primary member**
- Companion **selalu mendapat ActiveService baru** (tidak ada extension check untuk companion)

### Session-based Plans
Untuk paket sesi (session-based), companion juga mendapat `totalSessions` dan `remainingSessions` yang sama dengan primary. Setiap member memiliki sesi independen.

---

## Cara Setup ServicePlan sebagai Couple Plan

### Via API

```http
POST /api/v1/gym/service-plans
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Couple Daily Pass",
  "serviceType": "daily_pass",
  "durationType": "time_based",
  "duration": 1,
  "price": 150000,
  "pax": 2,
  "isActive": true,
  "allowWalkIn": false
}
```

### Atau update existing plan

```http
PUT /api/v1/gym/service-plans/:id

{
  "pax": 2
}
```

---

## Error Responses

| HTTP | Code | Kondisi |
|------|------|---------|
| `400` | `VALIDATION_ERROR` | `additionalMemberIds.length !== plan.pax - 1` |
| `400` | `VALIDATION_ERROR` | `plan.pax = 1` tapi `additionalMemberIds` tidak kosong |
| `400` | `VALIDATION_ERROR` | Primary member ID ada di `additionalMemberIds` |
| `400` | `VALIDATION_ERROR` | Duplicate ID di `additionalMemberIds` |
| `404` | `MEMBER_NOT_FOUND` | Companion member tidak ditemukan di tenant |

---

## Contoh Skenario

### Couple Plan (pax=2)

```json
{
  "memberId": "member-A",
  "servicePlans": [{
    "servicePlanId": "plan-couple",
    "additionalMemberIds": ["member-B"]
  }],
  "paymentMethods": [{ "method": "cash", "amount": 150000 }]
}
```
→ Dibuat: 2 ActiveService (A sebagai primary, B sebagai companion)

### Individual Plan (pax=1) — Tidak Ada Companion

```json
{
  "memberId": "member-A",
  "servicePlans": [{
    "servicePlanId": "plan-individual"
  }],
  "paymentMethods": [{ "method": "cash", "amount": 100000 }]
}
```
→ Dibuat: 1 ActiveService, `companionActiveServices: []`

### Beli 2 Service Berbeda, Salah Satu Couple

```json
{
  "memberId": "member-A",
  "servicePlans": [
    {
      "servicePlanId": "plan-individual",
      "additionalMemberIds": []
    },
    {
      "servicePlanId": "plan-couple",
      "additionalMemberIds": ["member-B"]
    }
  ],
  "paymentMethods": [{ "method": "cash", "amount": 250000 }]
}
```
→ Dibuat: 3 ActiveService (1 untuk A dari individual plan, 1 untuk A dari couple plan, 1 untuk B dari couple plan)

---

## Laporan & Shift Report

`ServicePlan.pax` sudah digunakan di **shift report** untuk menghitung headcount secara akurat:

```javascript
// buildGymReport — menghitung total orang yang menggunakan fasilitas
totalPeople += transactionItem.quantity * (plan.pax || 1);
```

Dengan adanya ActiveService per-companion, admin juga bisa melihat histori aktivitas per-member pada laporan member.
