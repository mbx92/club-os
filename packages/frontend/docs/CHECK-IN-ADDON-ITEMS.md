# Check-in Member + Add-on Items (Sewa Handuk, dll)

## Overview

Ketika member melakukan check-in, kasir dapat menambahkan item berbayar seperti **sewa handuk**
di saat yang bersamaan. Item add-on ini menggunakan **ServicePlan** dengan `serviceType: 'custom'`
sehingga tetap terisolasi di modul gym dan tidak muncul di restoran/POS.

---

## Alur UI yang Direkomendasikan

```
[Scan member / cari anggota]
        ↓
[POST /api/v1/gym/check-ins]  ← check-in gratis, membership dipakai
        ↓
    Check-in berhasil
        ↓
┌─────────────────────────────────────────┐
│  Modal / Bottom Sheet                   │
│  "Tambah Item Berbayar?"                │
│  [ Sewa Handuk Rp 5.000  ] [ Lainnya ] │
│  [  Bayar  ]  [ Lewati   ]              │
└─────────────────────────────────────────┘
        ↓ (jika ada item)
[POST /api/v1/transactions]  ← transaksi gym terpisah
        ↓
    Struk item add-on
```

> **Catatan**: Add-on adalah transaksi **terpisah** dari check-in.
> Check-in tidak memerlukan pembayaran. Hanya item tambahan yang dibayar.

---

## Step 1 — Setup: Buat ServicePlan "Sewa Handuk"

Sebelum fitur ini bisa digunakan, admin harus membuat ServicePlan untuk sewa handuk.
Ini hanya dilakukan **sekali** dari manajemen service plan.

### `POST /api/v1/gym/service/plans`

```json
{
  "name": "Sewa Handuk",
  "serviceType": "custom",
  "durationType": "session_based",
  "price": 5000,
  "sessions": 1,
  "validityDays": 1,
  "allowWalkIn": true,
  "isActive": true,
  "description": "Sewa handuk per kunjungan"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "sp-uuid-handuk",
    "name": "Sewa Handuk",
    "serviceType": "custom",
    "durationType": "session_based",
    "price": 5000,
    "sessions": 1,
    "validityDays": 1,
    "allowWalkIn": true,
    "isActive": true
  }
}
```

> Simpan `id` ServicePlan ini untuk digunakan di frontend saat membuat transaksi.

---

## Step 2 — Ambil Daftar Add-on Plans

Frontend perlu mengambil daftar ServicePlan yang tersedia sebagai add-on untuk ditampilkan
di modal setelah check-in.

### `GET /api/v1/gym/service/plans?serviceType=custom&isActive=true`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "sp-uuid-handuk",
      "name": "Sewa Handuk",
      "serviceType": "custom",
      "durationType": "session_based",
      "price": 5000,
      "sessions": 1,
      "allowWalkIn": true
    }
    // ... add-on lainnya
  ]
}
```

> Filter `serviceType=custom` agar hanya item add-on yang muncul (bukan membership / PT package).

---

## Step 3 — Check-in Member

Check-in dilakukan terlebih dahulu. Ini gratis dan hanya memvalidasi keanggotaan aktif.

### `POST /api/v1/gym/check-ins`

**Request:**
```json
{
  "memberId": "member-uuid",
  "notes": "optional"
}
```

> `serviceType` tidak perlu dikirim untuk check-in membership umum.

**Response `201`:**
```json
{
  "message": "Check-in successful",
  "data": {
    "checkIn": {
      "id": "checkin-uuid",
      "memberId": "member-uuid",
      "checkInTime": "2026-03-17T08:30:00.000Z",
      "member": {
        "id": "member-uuid",
        "firstName": "Budi",
        "lastName": "Santoso",
        "email": "budi@email.com",
        "phone": "08123456789"
      }
    },
    "activeService": {
      "id": "activeservice-uuid",
      "serviceType": "membership",
      "servicePlanName": "1 Month Member",
      "endDate": "2026-04-17T00:00:00.000Z",
      "status": "active"
    },
    "sessionUsed": false
  }
}
```

---

## Step 4 — Transaksi Add-on (jika ada item berbayar)

Setelah check-in berhasil, jika member menyewa handuk atau item berbayar lainnya,
buat transaksi gym terpisah.

### `POST /api/v1/transactions`

> ⚠️ Memerlukan **shift kasir yang sedang buka** (`requireActiveShift`).
> Pastikan shift sudah dibuka sebelum membuat transaksi.

**Request:**
```json
{
  "customerType": "member",
  "customerId": "member-uuid",
  "items": [
    {
      "itemType": "service_plan",
      "itemId": "sp-uuid-handuk",
      "itemName": "Sewa Handuk",
      "quantity": 1
    }
  ],
  "payments": [
    {
      "paymentMethod": "cash",
      "amount": 5000
    }
  ],
  "notes": "Add-on check-in"
}
```

**Untuk walk-in** (tanpa member record):
```json
{
  "customerType": "non-member",
  "customerName": "Tamu",
  "items": [
    {
      "itemType": "service_plan",
      "itemId": "sp-uuid-handuk",
      "itemName": "Sewa Handuk",
      "quantity": 1
    }
  ],
  "payments": [
    {
      "paymentMethod": "qris",
      "amount": 5000
    }
  ]
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "trx-uuid",
      "transactionNumber": "TRX-202603-0080",
      "transactionType": "gym",
      "customerType": "member",
      "subtotal": 5000,
      "totalAmount": 5000,
      "status": "completed"
    },
    "items": [
      {
        "itemType": "service_plan",
        "itemName": "Sewa Handuk",
        "quantity": 1,
        "unitPrice": 5000,
        "subtotal": 5000
      }
    ],
    "payments": [
      {
        "paymentMethod": "cash",
        "amount": 5000,
        "status": "completed"
      }
    ]
  }
}
```

---

## Payment Methods yang Didukung

| `paymentMethod` | Keterangan |
|----------------|------------|
| `cash` | Tunai |
| `qris` | QRIS |
| `bca` | Transfer / EDC BCA |
| `bni` | Transfer / EDC BNI |
| `mandiri` | Transfer / EDC Mandiri |
| `gojek` | GoPay / Gojek |
| `card` | Kartu kredit/debit |
| `bank_transfer` | Transfer bank umum |

---

## Beberapa Item Sekaligus

Bisa menambahkan lebih dari satu item dalam satu transaksi:

```json
{
  "customerType": "member",
  "customerId": "member-uuid",
  "items": [
    {
      "itemType": "service_plan",
      "itemId": "sp-uuid-handuk",
      "itemName": "Sewa Handuk",
      "quantity": 1
    },
    {
      "itemType": "service_plan",
      "itemId": "sp-uuid-loker",
      "itemName": "Sewa Loker",
      "quantity": 1
    }
  ],
  "payments": [
    {
      "paymentMethod": "cash",
      "amount": 15000
    }
  ]
}
```

---

## Error Cases yang Perlu Ditangani

### Check-in Errors

| HTTP | `error.code` | Penyebab | Aksi UI |
|------|-------------|----------|---------|
| 404 | `MEMBER_NOT_FOUND` | ID member tidak ada | Tampilkan "Member tidak ditemukan" |
| 400 | `MEMBER_INACTIVE` | Member dinonaktifkan | Tampilkan "Member tidak aktif" |
| 400 | `NO_ACTIVE_MEMBERSHIP` | Tidak ada membership aktif | Tampilkan "Tidak ada membership aktif, silakan perpanjang" |
| 400 | `MAX_CHECKINS_REACHED` | Limit check-in harian/periode habis | Tampilkan pesan limit |

### Transaksi Errors

| HTTP | Keterangan | Aksi UI |
|------|-----------|---------|
| 400 | `No active shift` | Shift belum dibuka | Arahkan kasir untuk buka shift |
| 400 | `Insufficient payment amount` | Nominal bayar kurang dari total | Tampilkan kekurangan bayar |
| 404 | `Service plan not found` | ServicePlan ID tidak valid | Refresh daftar add-on |

---

## Posisi di Laporan Harian Gym

Transaksi sewa handuk akan muncul di laporan harian gym (`GET /api/v1/gym/cash-register/daily-report`)
pada bagian:

```json
"reportGym": {
  "otherItems": {
    "Sewa Handuk": {
      "count": 5,
      "amount": 25000
    }
  },
  ...
}
```

Item dengan `serviceType: 'custom'` akan masuk ke `sessionPackages.custom`:

```json
"reportGym": {
  "sessionPackages": {
    "custom": {
      "label": "Custom Package",
      "count": 5,
      "amount": 25000,
      "plans": [
        {
          "id": "sp-uuid-handuk",
          "name": "Sewa Handuk",
          "count": 5,
          "amount": 25000
        }
      ]
    }
  }
}
```

---

## Diagram Sequence Lengkap

```
Kasir                  Frontend             Backend
  │                       │                    │
  │ scan/cari member       │                    │
  │──────────────────────>│                    │
  │                       │ GET /service/plans │
  │                       │ ?serviceType=custom│
  │                       │──────────────────>│
  │                       │<── daftar add-on ──│
  │                       │                    │
  │                       │ POST /check-ins    │
  │                       │──────────────────>│
  │                       │<── check-in OK ───│
  │                       │                    │
  │ tampil modal add-on   │                    │
  │<──────────────────────│                    │
  │                       │                    │
  │ pilih Sewa Handuk     │                    │
  │──────────────────────>│                    │
  │ pilih Cash, konfirmasi│                    │
  │──────────────────────>│                    │
  │                       │ POST /transactions │
  │                       │──────────────────>│
  │                       │<── trx OK, struk ─│
  │                       │                    │
  │ tampil struk           │                    │
  │<──────────────────────│                    │
```
