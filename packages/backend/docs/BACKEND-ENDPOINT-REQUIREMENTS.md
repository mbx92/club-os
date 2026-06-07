# Backend Endpoint Requirements

Dokumen ini berisi daftar endpoint yang dibutuhkan frontend beserta status implementasi terkini.

---

## 1. Partial Refund per Item

**Status:** ✅ Implemented (`2026-02-18`)
**Priority:** High

```
POST /api/v1/transactions/:transactionId/refund-items
Authorization: Bearer <token>

Body:
{
  "itemIds": ["uuid-item-1", "uuid-item-2"],
  "notes": "Alasan refund"
}

Response:
{
  "success": true,
  "message": "Selected items refunded successfully",
  "data": {
    "transaction": { ...updatedTransaction },
    "cancelledServices": [
      {
        "id": "uuid",
        "servicePlanId": "uuid",
        "status": "cancelled",
        "startDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD"
      }
    ],
    "refundedItems": [
      {
        "id": "uuid",
        "itemName": "PT Package 12 Sessions",
        "total": 500000
      }
    ]
  }
}
```

**Behavior:**
- Hanya service terkait item yang dipilih yang di-cancel
- Status transaksi menjadi `partially_refunded` (jika tidak semua item) atau `refunded` (jika semua)
- Item yang sudah di-refund tidak bisa di-refund ulang (`isRefunded: true`)
- Error jika ada item dalam `itemIds` yang sudah di-refund

**Migration:** `20260218100001-add-isRefunded-to-transaction-items.js`
- Menambahkan kolom `isRefunded` (boolean, default false)
- Menambahkan kolom `refundedAt` (datetime, nullable)
- Menambahkan kolom `refundTransactionId` (uuid FK, nullable)

---

## 2. Commission Auto-Generation

**Status:** ✅ Resolved (`2026-02-18`)
**Priority:** High

**Kapan commission di-generate:**
- Saat **purchase** (`POST /service/active/purchase`) — jika trainer sudah di-assign dan `commissionValue > 0`
- Saat **assign trainer** (`POST /service/active/:id/assign-trainer` ATAU `POST /service/management/:id/assign-trainer`) — commission dibuat otomatis
  - Jika sebelumnya ada trainer lain, commission lama di-cancel
  - Jika commission untuk trainer ini sudah ada (status != cancelled), tidak duplikat

**Fix yang dilakukan:**
- `serviceManagementController.assignTrainerToService` sebelumnya tidak membuat commission → sudah diperbaiki
- Kedua endpoint assign trainer sekarang membuat commission secara konsisten

**Endpoint backfill untuk data lama:**
```
POST /api/v1/gym/trainers/commissions/backfill
POST /api/v1/gym/trainers/commissions/backfill?dryRun=true  ← preview tanpa tulis ke DB
```

---

## 3. PT Sessions (Personal Training Session Logging)

**Status:** ✅ Implemented (`2026-02-18`)
**Priority:** Medium

```
GET    /api/v1/gym/pt-sessions
GET    /api/v1/gym/pt-sessions/:sessionId
POST   /api/v1/gym/pt-sessions
PUT    /api/v1/gym/pt-sessions/:sessionId
DELETE /api/v1/gym/pt-sessions/:sessionId
```

### GET /gym/pt-sessions
```
Query params:
  - page, limit
  - trainerId
  - memberId
  - activeServiceId
  - status (scheduled | completed | cancelled | no_show)
  - startDate, endDate  (YYYY-MM-DD)
  - sortBy (sessionDate | status | createdAt | durationMinutes)
  - sortOrder (asc | desc)
```

### POST /gym/pt-sessions
```json
{
  "activeServiceId": "uuid",
  "trainerId": "uuid",
  "memberId": "uuid",
  "sessionDate": "2025-12-01T10:00:00Z",
  "durationMinutes": 60,
  "notes": "...",
  "exerciseLog": {}
}
```

### PUT /gym/pt-sessions/:id
```json
{
  "status": "completed",
  "deductSession": true,
  "sessionDate": "...",
  "durationMinutes": 60,
  "notes": "...",
  "exerciseLog": {},
  "cancelReason": "..."
}
```

**Behavior otomatis:**
- `status: completed` → `remainingSessions -= 1` (jika `deductSession: true` dan belum pernah digunakan)
- `status: cancelled` → session dikembalikan jika sebelumnya sudah terpakai
- DELETE → session dikembalikan jika `sessionUsed: true`

**Migration:** `20260218100002-create-pt-sessions.js`

---

## 4. Assign Trainer ke Active Service — Commission Generation

**Status:** ✅ Resolved (`2026-02-18`)
**Priority:** Medium

Kedua endpoint sudah auto-generate commission saat assign trainer:

```
POST /api/v1/service/management/:serviceId/assign-trainer
POST /api/v1/service/active/:id/assign-trainer

Body: { "trainerId": "uuid" }
```

Response sekarang menyertakan `commissionCreated: boolean`.

---

## 5. Transaction Item — Field `isRefunded`

**Status:** ✅ Implemented (`2026-02-18`)
**Priority:** Low

Field `isRefunded` (boolean) sekarang tersedia di setiap `transactionItem`:

```json
{
  "id": "uuid",
  "itemType": "service_plan",
  "itemName": "PT Package 12 Sessions",
  "total": 500000,
  "isRefunded": false,
  "refundedAt": null,
  "refundTransactionId": null,
  "status": "pending"
}
```

Gunakan `item.isRefunded === false && item.status !== 'cancelled'` untuk menentukan item yang masih bisa di-refund.

---

## Summary

| No | Endpoint | Status | Notes |
|----|----------|--------|-------|
| 1 | `POST /transactions/:id/refund-items` | ✅ Done | Partial refund per item |
| 2 | Commission auto-generation | ✅ Done | Generate saat assign trainer |
| 3 | `GET/POST/PUT/DELETE /gym/pt-sessions` | ✅ Done | Full CRUD + session tracking |
| 4 | Assign trainer → commission generation | ✅ Done | Kedua endpoint sudah konsisten |
| 5 | `transactionItem.isRefunded` field | ✅ Done | + `refundedAt`, `refundTransactionId` |

---

## 1. Partial Refund per Item

**Status:** ❌ Belum ada  
**Priority:** High

Saat ini hanya tersedia full refund (`POST /transactions/:id/refund`). Dibutuhkan endpoint untuk refund sebagian item dalam satu transaksi tanpa membatalkan seluruh transaksi.

```
POST /api/v1/transactions/:transactionId/refund-items
Authorization: Bearer <token>

Body:
{
  "itemIds": ["uuid-item-1", "uuid-item-2"],
  "notes": "Alasan refund"
}

Expected Response:
{
  "success": true,
  "message": "Selected items refunded successfully",
  "data": {
    "transaction": { ...updatedTransaction },
    "cancelledServices": [
      {
        "id": "uuid",
        "servicePlanId": "uuid",
        "status": "cancelled",
        "startDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD"
      }
    ],
    "refundedItems": [
      {
        "id": "uuid",
        "itemName": "PT Package 12 Sessions",
        "total": 500000
      }
    ]
  }
}
```

**Behavior yang diharapkan:**
- Hanya service yang terkait item dipilih yang di-cancel
- Status transaksi menjadi `partially_refunded` (jika tidak semua item di-refund) atau `refunded` (jika semua)
- Item yang sudah di-refund tidak bisa di-refund ulang (tandai `isRefunded: true` di `transactionItem`)

---

## 2. Commission Auto-Generation

**Status:** ⚠️ Perlu konfirmasi  
**Priority:** High

Endpoint `GET /api/v1/gym/reports/trainer-commissions` sudah ada dan merespons dengan benar, namun `byTrainer` dan `recentCommissions` selalu kosong meskipun trainer sudah di-assign ke active service.

**Pertanyaan:**
- Kapan commission record di-generate? Apakah:
  - Saat trainer di-assign ke active service? 
  - Saat member melakukan check-in/session?
  - Harus di-trigger manual oleh admin?
- Apakah ada endpoint untuk generate/recalculate commission secara manual?

**Endpoint yang mungkin dibutuhkan jika commission di-trigger manual:**
```
POST /api/v1/gym/trainers/:trainerId/commissions/generate
Body:
{
  "transactionId": "uuid",        // opsional, jika generate dari transaksi tertentu
  "startDate": "YYYY-MM-DD",      // opsional, range periode
  "endDate": "YYYY-MM-DD"
}
```

---

## 3. PT Sessions (Personal Training Session Logging)

**Status:** ❌ Belum ada  
**Priority:** Medium

Halaman `/gym/personal-training/sessions` sudah ada di navigasi namun page dan API belum tersedia.

```
GET /api/v1/gym/pt-sessions
Query params:
  - page, limit
  - trainerId
  - memberId
  - activeServiceId
  - status (scheduled | completed | cancelled | no_show)
  - startDate, endDate
  - sortBy, sortOrder

Response:
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "uuid",
        "activeServiceId": "uuid",
        "trainerId": "uuid",
        "memberId": "uuid",
        "sessionDate": "2025-12-01T10:00:00Z",
        "durationMinutes": 60,
        "status": "completed",
        "notes": "...",
        "trainer": { "id", "firstName", "lastName" },
        "member": { "id", "firstName", "lastName" },
        "activeService": { "id", "servicePlan": { "name" } }
      }
    ],
    "pagination": { "totalItems", "totalPages", "currentPage", "limit" }
  }
}
```

```
GET /api/v1/gym/pt-sessions/:sessionId

POST /api/v1/gym/pt-sessions
Body:
{
  "activeServiceId": "uuid",
  "trainerId": "uuid",
  "memberId": "uuid",
  "sessionDate": "2025-12-01T10:00:00Z",
  "durationMinutes": 60,
  "notes": "..."
}

PUT /api/v1/gym/pt-sessions/:sessionId
Body: { ...fieldsToUpdate }

DELETE /api/v1/gym/pt-sessions/:sessionId
```

---

## 4. Assign Trainer ke Active Service — Konfirmasi Response

**Status:** ⚠️ Perlu konfirmasi  
**Priority:** Medium

Endpoint sudah ada namun perlu konfirmasi apakah assign trainer otomatis men-generate commission record.

```
POST /api/v1/service/management/:serviceId/assign-trainer
Body: { "trainerId": "uuid" }
```

**Pertanyaan:**
- Apakah assign trainer langsung men-generate commission? Atau commission di-generate saat transaksi/session?
- Jika trainer sudah punya `commissionType` dan `commissionValue`, apakah nilai itu yang dipakai untuk kalkulasi commission?

---

## 5. Transaction Item — Field `isRefunded`

**Status:** ⚠️ Perlu konfirmasi  
**Priority:** Low

Frontend menggunakan `item.isRefunded` untuk menentukan item mana yang masih bisa di-refund di modal partial refund.

**Pertanyaan:**
- Apakah field `isRefunded` (boolean) tersedia di object `transactionItem`?
- Atau apakah menggunakan field lain (misal `status: 'refunded'` di `serviceStatus`)?

---

## Summary

| No | Endpoint | Status | Priority |
|----|----------|--------|----------|
| 1 | `POST /transactions/:id/refund-items` | ❌ Belum ada | High |
| 2 | Commission auto-generation logic | ⚠️ Konfirmasi | High |
| 3 | `GET/POST/PUT/DELETE /gym/pt-sessions` | ❌ Belum ada | Medium |
| 4 | Assign trainer → commission generation | ⚠️ Konfirmasi | Medium |
| 5 | `transactionItem.isRefunded` field | ⚠️ Konfirmasi | Low |
