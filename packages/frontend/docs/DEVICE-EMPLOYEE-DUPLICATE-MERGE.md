# Frontend Integration — Duplicate Device Employee Detection & Merge

## Overview

Terjadi kasus di mana satu karyawan memiliki **dua record `DeviceEmployee`** berbeda:
- Satu dipakai oleh device saat tap fingerprint (misalnya `empNo=6`)
- Satu dipakai oleh schedule (misalnya `empNo=1021`)

Akibatnya, attendance dan schedule tidak terhubung → karyawan tampil sebagai _absent_ padahal sudah tap.

Fitur ini menyediakan endpoint untuk:
1. **Deteksi** duplikat secara otomatis
2. **Merge** dua record menjadi satu (pindahkan semua data ke record yang dipertahankan)
3. **Aktifkan / nonaktifkan** employee di device

---

## Base URL

```
/api/v1/integrations/hikvision
```

---

## 1. Deteksi Duplikat

### `GET /device-employees/duplicates`

Mendeteksi record `DeviceEmployee` yang kemungkinan duplikat, dikelompokkan berdasarkan:
- **`same_name`** — nama sama (case-insensitive), `employeeNo` berbeda
- **`same_user`** — lebih dari satu record terhubung ke `userId` yang sama

**Auth:** Bearer token (admin)

**Query Params:** _(tidak ada)_

**Response:**
```json
{
  "success": true,
  "totalGroups": 1,
  "data": [
    {
      "reason": "same_name",
      "nameKey": "om benz",
      "count": 2,
      "records": [
        {
          "id": "0b2dfcb0-5617-426b-8028-330a54456f10",
          "employeeNo": "6",
          "name": "OM BENZ",
          "status": "active",
          "hasFingerprint": true,
          "fingerprintCount": 1,
          "lastSyncAt": "2026-02-20T10:00:00.000Z",
          "user": null,
          "device": {
            "id": "...",
            "name": "Main Entrance",
            "ipAddress": "192.168.1.100"
          }
        },
        {
          "id": "463a1608-ed15-478f-b1c8-d27f7de3c265",
          "employeeNo": "1021",
          "name": "Om Benz",
          "status": "active",
          "hasFingerprint": false,
          "fingerprintCount": 0,
          "lastSyncAt": null,
          "user": null,
          "device": { "..." }
        }
      ]
    }
  ]
}
```

**Logic tampilan di frontend:**
- Jika `totalGroups === 0` → tampilkan "Tidak ada duplikat ditemukan"
- Jika `totalGroups > 0` → tampilkan badge peringatan + daftar grup

---

## 2. Merge Dua Record

### `POST /device-employees/merge`

Menggabungkan dua record: semua data (attendance, schedule, device log) dipindahkan dari `removeId` ke `keepId`, kemudian `removeId` dihapus.

**Auth:** Bearer token (admin)

**Request Body:**
```json
{
  "keepId": "0b2dfcb0-5617-426b-8028-330a54456f10",
  "removeId": "463a1608-ed15-478f-b1c8-d27f7de3c265"
}
```

| Field | Tipe | Keterangan |
|---|---|---|
| `keepId` | `string (UUID)` | ID record yang **dipertahankan** (biasanya yang punya fingerprint / dipakai device) |
| `removeId` | `string (UUID)` | ID record yang **dihapus** setelah data-nya dipindahkan |

**Response (sukses):**
```json
{
  "success": true,
  "message": "Merged empNo=1021 (\"Om Benz\") into empNo=6 (\"OM BENZ\")",
  "stats": {
    "attendanceMoved": 0,
    "attendanceSkipped": 0,
    "scheduleMoved": 2,
    "scheduleSkipped": 0,
    "logsMoved": 0
  },
  "data": {
    "id": "0b2dfcb0-5617-426b-8028-330a54456f10",
    "employeeNo": "6",
    "name": "OM BENZ",
    "status": "active",
    "hasFingerprint": true,
    "user": { "..." },
    "device": { "..." }
  }
}
```

**Catatan:**
- Jika ada konflik tanggal (kedua record punya attendance/schedule di tanggal yang sama), record dari `removeId` di-**skip** (tidak dipindahkan). Data `keepId` tetap dipertahankan.
- Operasi berjalan dalam satu database transaction — jika gagal, semua perubahan di-rollback.

**Error:**
```json
{ "success": false, "code": "VALIDATION_ERROR", "message": "keepId and removeId are required" }
{ "success": false, "code": "NOT_FOUND", "message": "Device employee keepId=... not found" }
```

---

## 3. Toggle Active / Inactive Employee

### `PATCH /device-employees/:id/status`

Mengubah status employee di **database** dan **mengirimkan perubahan ke device** (untuk `active`/`inactive`).

- **`active`** → `Valid.enable: true` di device — karyawan bisa tap fingerprint
- **`inactive`** → `Valid.enable: false` di device — akses dicabut, **fingerprint tetap tersimpan**
- `pending_sync` / `sync_failed` → hanya update DB, tidak dikirim ke device

**Auth:** Bearer token (admin)

**URL Params:**

| Param | Keterangan |
|---|---|
| `:id` | UUID dari `DeviceEmployee` |

**Request Body:**
```json
{
  "status": "inactive",
  "syncToDevice": true
}
```

| Field | Tipe | Default | Keterangan |
|---|---|---|---|
| `status` | `string` | — | `active` \| `inactive` \| `pending_sync` \| `sync_failed` |
| `syncToDevice` | `boolean` | `true` | Set `false` untuk hanya update DB tanpa kirim ke device |

**Response (sukses, device sync berhasil):**
```json
{
  "success": true,
  "message": "Status updated: active → inactive",
  "deviceSync": {
    "attempted": true,
    "success": true,
    "httpStatus": 200,
    "deviceId": "...",
    "deviceName": "Main Entrance"
  },
  "data": {
    "id": "...",
    "employeeNo": "6",
    "name": "OM BENZ",
    "status": "inactive",
    "lastSyncAt": "2026-02-24T08:30:00.000Z",
    "user": { "..." },
    "device": { "..." }
  }
}
```

**Response (device tidak bisa dihubungi — DB tetap terupdate):**
```json
{
  "success": true,
  "message": "Status updated: active → inactive",
  "deviceSync": {
    "attempted": true,
    "success": false,
    "error": "connect ETIMEDOUT 192.168.1.100:80",
    "deviceId": "...",
    "deviceName": "Main Entrance"
  },
  "data": { "..." }
}
```

> `success: true` meskipun sync device gagal — DB selalu diupdate. Frontend bisa tampilkan warning jika `deviceSync.success === false`.

---

## Alur UI yang Direkomendasikan

### Halaman Device Employee List

```
┌─────────────────────────────────────────────────────────┐
│  Device Employees                    [🔍 Cek Duplikat]  │
├─────────────────────────────────────────────────────────┤
│  empNo  Name          Status   FP   Actions             │
│  6      OM BENZ       active   ✓    [Edit] [Nonaktifkan]│
│  1021   Om Benz       active   ✗    [Edit] [Nonaktifkan]│
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

### Flow Cek Duplikat → Merge

```
1. Klik [Cek Duplikat]
   → GET /device-employees/duplicates

2. Tampilkan modal per grup:
   ┌─────────────────────────────────────────────────────┐
   │  ⚠ Duplikat ditemukan: "om benz"                   │
   │                                                     │
   │  Pilih record yang DIPERTAHANKAN:                   │
   │  ○ empNo=6  "OM BENZ"  [✓ Ada FP] [Device: aktif]  │
   │  ○ empNo=1021  "Om Benz"  [✗ No FP]                │
   │                                                     │
   │  Record lain akan dihapus setelah data dipindahkan. │
   │                          [Batal]  [Merge Sekarang]  │
   └─────────────────────────────────────────────────────┘

3. Klik [Merge Sekarang]
   → POST /device-employees/merge
     { keepId: "0b2dfcb0...", removeId: "463a1608..." }

4. Tampilkan hasil:
   ✅ Berhasil! 2 schedule dipindahkan ke empNo=6.
```

### Toggle Active / Inactive

```
1. Klik [Nonaktifkan] pada row employee
   → Konfirmasi: "Akses fingerprint empNo=6 akan dicabut di device. Lanjutkan?"

2. Klik [Ya]
   → PATCH /device-employees/6/status
     { "status": "inactive" }

3. Jika deviceSync.success === false:
   → Tampilkan warning: "Status DB diperbarui, tapi gagal sync ke device.
      Pastikan device online dan coba sync ulang."
```

---

## Status Values

| Status | Keterangan | Sync ke device? |
|---|---|---|
| `active` | Employee aktif, bisa tap | ✓ `Valid.enable: true` |
| `inactive` | Akses dicabut, FP tetap tersimpan | ✓ `Valid.enable: false` |
| `pending_sync` | Terdaftar di sistem, belum dikirim ke device | ✗ |
| `sync_failed` | Gagal sinkronisasi ke device | ✗ |

---

## Tip Menentukan `keepId` vs `removeId`

Pilih `keepId` berdasarkan prioritas berikut:

1. **Ada fingerprint** (`hasFingerprint: true`) → ini yang dipakai device saat tap
2. **`lastSyncAt` lebih baru** → sudah pernah disync ke device
3. **`employeeNo` lebih kecil** → biasanya record yang lebih lama/asli
