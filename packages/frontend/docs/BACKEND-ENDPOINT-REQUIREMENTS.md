# Backend Endpoint Requirements

Dokumen ini berisi daftar endpoint yang dibutuhkan frontend namun belum tersedia atau perlu dikonfirmasi dari backend.

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

## 6. Add Item to Order — Print to Kitchen/Bar

**Status:** ❌ Belum ada  
**Priority:** High

Endpoint `POST /restaurant/orders/:id/items` sudah ada namun **tidak men-trigger cetak ke kitchen/bar printer**. Frontend kasir (floor-plan POS) butuh item yang baru ditambahkan langsung dicetak ke printer yang sesuai (kitchen untuk food, bar untuk beverage), persis seperti saat order pertama kali dibuat.

Frontend saat ini sudah mengirim flag `printToKitchen: true` di request body. Backend perlu handle flag ini:

```json
POST /api/v1/restaurant/orders/:id/items
Authorization: Bearer <token>

Body:
{
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "price": 25000,
      "notes": "tanpa bawang",
      "variantName": "Large",
      "extras": [{"id": "uuid", "quantity": 1}]
    }
  ],
  "printToKitchen": true
}
```

**Behavior yang diharapkan:**
- Jika `printToKitchen: true`, cetak **hanya item yang baru ditambahkan** (bukan seluruh order) ke printer yang sesuai berdasarkan `productCategory`
- Item kategori `food` → kitchen printer
- Item kategori `beverage` → bar printer
- Item kategori lain → kitchen printer (fallback)
- Response harus menyertakan hasil print:

```json
{
  "success": true,
  "message": "Items added",
  "data": { ...updatedOrder },
  "print": {
    "kitchenTicket": { "success": true, "printer": "Kitchen Printer" },
    "barTicket": { "success": false, "skipped": true, "reason": "No bar items" }
  }
}
```

---

## Summary

| No | Endpoint | Status | Priority |
|----|----------|--------|----------|
| 1 | `POST /transactions/:id/refund-items` | ❌ Belum ada | High |
| 2 | Commission auto-generation logic | ⚠️ Konfirmasi | High |
| 3 | `GET/POST/PUT/DELETE /gym/pt-sessions` | ❌ Belum ada | Medium |
| 4 | Assign trainer → commission generation | ⚠️ Konfirmasi | Medium |
| 5 | `transactionItem.isRefunded` field | ⚠️ Konfirmasi | Low |
| 6 | `POST /restaurant/orders/:id/items` — support `printToKitchen: true` | ❌ Belum ada | High |
