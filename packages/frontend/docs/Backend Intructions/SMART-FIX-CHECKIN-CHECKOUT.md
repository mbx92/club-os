# Frontend Integration — Smart Fix CheckIn/CheckOut

## Masalah

Karyawan hanya tap **satu kali** dalam sehari (misal hanya tap saat pulang), dan sistem menyimpannya sebagai `checkIn` — padahal tap-nya dekat dengan `shiftEnd`, jadi seharusnya `checkOut`.

**Contoh:**
- Satria, shift 14:00-22:00
- Tap 22:16 WITA → tersimpan sebagai `checkIn` (lateMinutes: 496)
- Seharusnya: `checkOut` jam 22:16, `checkIn` = null

## Endpoint

### `POST /api/v1/gym/staff-attendance/fix-checkin`

Mendeteksi dan memperbaiki attendance yang salah penempatan checkIn/checkOut berdasarkan **kedekatan waktu tap ke jadwal shift**.

**Auth:** Bearer token (admin)

### Query Parameters

| Param | Default | Keterangan |
|---|---|---|
| `dryRun` | `true` | `true` = preview saja, `false` = apply perubahan |
| `startDate` | — | Filter tanggal mulai (YYYY-MM-DD) |
| `endDate` | — | Filter tanggal akhir (YYYY-MM-DD) |
| `employeeId` | — | Filter DeviceEmployee ID (UUID) |

---

## Alur Deteksi

### Case A: checkIn → checkOut

Attendance punya `checkIn` tapi **tidak punya** `checkOut`:

```
tap time = 22:16 WITA
shiftStart = 14:00    →  distToStart = 496 min
shiftEnd   = 22:00    →  distToEnd   = 16 min
                          ^^^^^^^^^^^^
                          lebih dekat!

shift duration = 8h = 480 min
minsAfterStart = 496 min  >  halfShift (240 min)  ✓

Keputusan: pindahkan checkInTime → checkOutTime
```

### Case B: checkOut → checkIn

Attendance punya `checkOut` tapi **tidak punya** `checkIn`:

```
tap time = 06:15 WITA
shiftStart = 06:00    →  distToStart = 15 min  ← lebih dekat!
shiftEnd   = 14:00    →  distToEnd   = 465 min

minsAfterStart = 15 min  <  halfShift (240 min)  ✓

Keputusan: pindahkan checkOutTime → checkInTime
```

---

## Contoh Request & Response

### 1. Preview (Dry Run)

```http
POST /api/v1/gym/staff-attendance/fix-checkin?dryRun=true
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "mode": "dry_run",
  "total": 3,
  "summary": {
    "checkInToCheckOut": 3,
    "checkOutToCheckIn": 0,
    "scannedRecords": 21
  },
  "fixes": [
    {
      "id": "abc123...",
      "employee": "1007 - Oka Gutama",
      "date": "2026-02-21",
      "action": "checkIn_to_checkOut",
      "tapTime": "21:15:45",
      "shiftStart": "14:00:00",
      "shiftEnd": "22:00:00",
      "distToStart": 435,
      "distToEnd": 45
    },
    {
      "id": "def456...",
      "employee": "1009 - Satria",
      "date": "2026-02-21",
      "action": "checkIn_to_checkOut",
      "tapTime": "22:16:06",
      "shiftStart": "14:00:00",
      "shiftEnd": "22:00:00",
      "distToStart": 496,
      "distToEnd": 16
    }
  ]
}
```

### 2. Apply Fix

```http
POST /api/v1/gym/staff-attendance/fix-checkin?dryRun=false
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "mode": "applied",
  "total": 3,
  "summary": {
    "checkInToCheckOut": 3,
    "checkOutToCheckIn": 0,
    "scannedRecords": 21
  },
  "fixes": [
    {
      "id": "abc123...",
      "employee": "1007 - Oka Gutama",
      "date": "2026-02-21",
      "action": "checkIn_to_checkOut",
      "tapTime": "21:15:45",
      "shiftStart": "14:00:00",
      "shiftEnd": "22:00:00",
      "distToStart": 435,
      "distToEnd": 45,
      "applied": true
    }
  ]
}
```

### 3. Filter per tanggal / employee

```http
POST /api/v1/gym/staff-attendance/fix-checkin?dryRun=true&startDate=2026-02-21&endDate=2026-02-21
POST /api/v1/gym/staff-attendance/fix-checkin?dryRun=true&employeeId=da762ac1-e58a-4556-bd2c-4a55971e0a2d
```

---

## Alur UI yang Direkomendasikan

### Di Halaman Staff Attendance

```
┌──────────────────────────────────────────────────────────────────┐
│  Staff Attendance                                 [🔧 Fix Data]  │
├──────────────────────────────────────────────────────────────────┤
│  ...tabel attendance...                                          │
└──────────────────────────────────────────────────────────────────┘
```

### Flow Klik [Fix Data]

```
1. Klik [🔧 Fix Data]
   → POST /fix-checkin?dryRun=true
   
2. Tampilkan modal preview:
   ┌─────────────────────────────────────────────────────┐
   │  🔍 Preview Fix CheckIn/CheckOut                   │
   │                                                     │
   │  Ditemukan 3 data yang perlu diperbaiki:            │
   │                                                     │
   │  ┌───────────────────────────────────────────────┐  │
   │  │ Oka Gutama (1007) — 21 Feb 2026              │  │
   │  │ Tap: 21:15 | Shift: 14:00-22:00              │  │
   │  │ ⚠ checkIn → checkOut (45 min dari shiftEnd) │  │
   │  └───────────────────────────────────────────────┘  │
   │  ┌───────────────────────────────────────────────┐  │
   │  │ Satria (1009) — 21 Feb 2026                   │  │
   │  │ Tap: 22:16 | Shift: 14:00-22:00              │  │
   │  │ ⚠ checkIn → checkOut (16 min dari shiftEnd) │  │
   │  └───────────────────────────────────────────────┘  │
   │                                                     │
   │                    [Batal]  [Apply Fix]              │
   └─────────────────────────────────────────────────────┘

3. Klik [Apply Fix]
   → POST /fix-checkin?dryRun=false

4. Tampilkan hasil:
   ✅ 3 data berhasil diperbaiki
```

---

## Penjelasan Logic

| Kondisi | Keputusan |
|---|---|
| `checkIn` ada, `checkOut` null, tap dekat `shiftEnd`, lewat setengah shift | `checkIn` → `checkOut` |
| `checkIn` null, `checkOut` ada, tap dekat `shiftStart`, sebelum setengah shift | `checkOut` → `checkIn` |
| Tap di tengah shift | Tidak diubah (ambiguous) |
| Tidak ada schedule | Tidak diubah (tidak ada referensi) |
| Schedule `isOff: true` | Tidak diubah |
| Sudah punya kedua checkIn + checkOut | Tidak di-scan |

### Formula Jarak

```
distToStart = |tapMinutes - shiftStartMinutes|
distToEnd   = |tapMinutes - shiftEndMinutes|
halfShift   = shiftDuration / 2

Fix jika:
  Case A: distToEnd < distToStart  AND  minsAfterStart > halfShift
  Case B: distToStart < distToEnd  AND  minsAfterStart < halfShift
```

---

## Catatan

- **Selalu preview dulu** (`dryRun=true`) sebelum apply
- Endpoint ini **idempotent** — menjalankannya berulang kali tidak akan merusak data yang sudah benar
- Hanya memproses record yang punya **satu waktu saja** (checkIn tanpa checkOut, atau sebaliknya)
- Record yang sudah lengkap (punya checkIn + checkOut) **tidak terpengaruh**
