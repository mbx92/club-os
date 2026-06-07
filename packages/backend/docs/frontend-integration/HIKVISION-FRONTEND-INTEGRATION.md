# Frontend Integration — Hikvision DS-K1T8003MF

Base URL: `POST /api/v1/...`  
Auth: `Authorization: Bearer <token>` (kecuali push event dari device)

---

## Daftar Isi

1. [Overview & Flow](#overview--flow)
2. [Setup Awal Device](#setup-awal-device)
3. [Device Management](#device-management)
4. [Employee Management (di Device)](#employee-management-di-device)
5. [Staff Attendance](#staff-attendance)
6. [Raw Device Logs](#raw-device-logs)
7. [Data Types & Enums](#data-types--enums)

---

## Overview & Flow

```
Device (192.168.1.23) ──push──▶ POST /api/v1/integrations/hikvision/event
                                      │
                          ┌───────────▼────────────┐
                          │  Match employeeNo       │
                          │  → Users (staff)        │──▶ StaffAttendances
                          │  → Members (opsional)   │──▶ CheckIns
                          └────────────────────────┘

Cron (tiap 5 menit) ─────pull──▶ device ISAPI ──▶ proses sama seperti push
```

**Flow setup pertama kali:**
1. Daftarkan device via `POST /devices`
2. Konfigurasi push URL ke server via `POST /devices/:id/configure-push`
3. Sync waktu device via `POST /devices/:id/sync-time`
4. Tambahkan staff ke device via `POST /devices/:id/employees` (karena device tidak punya web UI)
5. Isi `deviceEmployeeNo` di User via endpoint tambah employee
6. Minta staff tempel jari di device setelah enrollment dimulai

---

## Setup Awal Device

### 1. Daftarkan Device

```
POST /api/v1/integrations/hikvision/devices
Authorization: Bearer <token>
```

**Request body:**
```json
{
  "name": "Fingerprint Utama",
  "ipAddress": "192.168.1.23",
  "port": 80,
  "username": "admin",
  "password": "NPass321!",
  "locationId": null,
  "useForMemberCheckIn": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-device",
    "name": "Fingerprint Utama",
    "ipAddress": "192.168.1.23",
    "port": 80,
    "username": "admin",
    "serialNumber": null,
    "useForMemberCheckIn": false,
    "isActive": true,
    "lastSyncAt": null,
    "createdAt": "2026-02-19T13:00:00.000Z",
    "updatedAt": "2026-02-19T13:00:00.000Z"
  }
}
```

> ⚠️ Password **tidak pernah** dikembalikan dalam response apapun.

---

### 2. Test Koneksi

```
GET /api/v1/integrations/hikvision/devices/:id/test
Authorization: Bearer <token>
```

**Response sukses:**
```json
{
  "success": true,
  "deviceInfo": {
    "DeviceInfo": {
      "deviceName": "DS-K1T8003MF",
      "serialNumber": "DS-K1T8003MF20220101XXXXX",
      "firmwareVersion": "V1.2.0"
    }
  }
}
```

**Response gagal:**
```json
{
  "success": false,
  "error": "ETIMEDOUT"
}
```

---

### 3. Konfigurasi Push URL ke Server

```
POST /api/v1/integrations/hikvision/devices/:id/configure-push
Authorization: Bearer <token>
```

**Request body:**
```json
{
  "serverUrl": "http://192.168.1.100:8000/api/v1/integrations/hikvision/event"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Push URL configured on device"
}
```

---

### 4. Sync Waktu Device

```
POST /api/v1/integrations/hikvision/devices/:id/sync-time
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Device time synchronized"
}
```

---

## Device Management

### List Semua Device

```
GET /api/v1/integrations/hikvision/devices
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-device",
      "name": "Fingerprint Utama",
      "ipAddress": "192.168.1.23",
      "port": 80,
      "username": "admin",
      "serialNumber": null,
      "useForMemberCheckIn": false,
      "isActive": true,
      "lastSyncAt": "2026-02-19T14:00:00.000Z",
      "location": null
    }
  ]
}
```

---

### Update Device

```
PUT /api/v1/integrations/hikvision/devices/:id
Authorization: Bearer <token>
```

**Request body** (semua field opsional):
```json
{
  "name": "Fingerprint Pintu Masuk",
  "useForMemberCheckIn": true,
  "isActive": true,
  "locationId": "uuid-location"
}
```

---

### Hapus Device

```
DELETE /api/v1/integrations/hikvision/devices/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Device deleted"
}
```

---

### Manual Pull Sync

Tarik data dari device secara manual (tanpa menunggu cron 5 menit).

```
POST /api/v1/integrations/hikvision/devices/:id/sync
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "syncedFrom": "2026-02-19T13:00:00.000Z",
  "syncedTo": "2026-02-19T14:00:00.000Z",
  "processed": 5,
  "duplicates": 2,
  "matched": 4,
  "unmatched": 1
}
```

---

## Employee Management (di Device)

> Device DS-K1T8003MF **tidak memiliki web UI**, sehingga semua manajemen karyawan pada device dilakukan lewat API ini.

### List Employee di Device

```
GET /api/v1/integrations/hikvision/devices/:id/employees
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "employeeNo": "1001",
      "name": "Budi Santoso",
      "userType": "normal"
    }
  ]
}
```

---

### Tambah Employee ke Device

Saat menambah employee, backend secara otomatis mengisi `deviceEmployeeNo` di tabel `Users` jika `userId` disertakan.

```
POST /api/v1/integrations/hikvision/devices/:id/employees
Authorization: Bearer <token>
```

**Request body:**
```json
{
  "employeeNo": "1001",
  "name": "Budi Santoso",
  "userId": "uuid-user"
}
```

> `employeeNo` harus unik di device. Disarankan pakai angka pendek (1001, 1002, dst.)  
> `userId` opsional — jika diisi, User tersebut otomatis ter-mapping ke `employeeNo` ini.

**Response:**
```json
{
  "success": true,
  "message": "Employee added to device"
}
```

---

### Hapus Employee dari Device

```
DELETE /api/v1/integrations/hikvision/devices/:id/employees/:employeeNo
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Employee removed from device"
}
```

---

### Mulai Enrollment Fingerprint

Setelah employee ditambahkan ke device, minta staff menempelkan jari di device. Panggil endpoint ini terlebih dahulu untuk mengaktifkan mode enrollment, lalu staff tempel jari dalam ~30 detik.

```
POST /api/v1/integrations/hikvision/devices/:id/employees/:employeeNo/enroll-fingerprint
Authorization: Bearer <token>
```

**Request body** (opsional):
```json
{
  "fingerNo": 1
}
```

> `fingerNo`: indeks jari (1–10). Default: 1 (jari telunjuk kanan).

**Response:**
```json
{
  "success": true,
  "message": "Fingerprint enrollment started. Please place finger on the device scanner."
}
```

**Alur UI yang disarankan:**
```
[Klik "Enroll Fingerprint"]
       │
       ▼
API call → tampilkan modal/toast:
"Silakan tempelkan jari di scanner device dalam 30 detik..."
       │
       ▼ (30 detik)
Tutup modal — enrollment selesai (atau gagal timeout)
```

---

## Staff Attendance

### List Kehadiran

```
GET /api/v1/gym/staff-attendance
Authorization: Bearer <token>
```

**Query params:**

| Param | Type | Keterangan |
|-------|------|------------|
| `page` | int | Default: 1 |
| `limit` | int | Default: 50 |
| `startDate` | `YYYY-MM-DD` | Filter dari tanggal |
| `endDate` | `YYYY-MM-DD` | Filter sampai tanggal |
| `userId` | uuid | Filter per staff |
| `status` | string | `present` \| `late` \| `absent` \| `half_day` |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-attendance",
      "date": "2026-02-19",
      "checkInTime": "2026-02-19T07:32:15.000Z",
      "checkOutTime": "2026-02-19T16:05:47.000Z",
      "status": "present",
      "notes": null,
      "user": {
        "id": "uuid-user",
        "firstName": "Budi",
        "lastName": "Santoso",
        "email": "budi@gym.com",
        "deviceEmployeeNo": "1001"
      },
      "device": {
        "id": "uuid-device",
        "name": "Fingerprint Utama",
        "ipAddress": "192.168.1.23"
      }
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

---

### Laporan Kehadiran (Summary)

```
GET /api/v1/gym/staff-attendance/report
Authorization: Bearer <token>
```

**Query params:**

| Param | Type | Keterangan |
|-------|------|------------|
| `startDate` | `YYYY-MM-DD` | **Wajib** |
| `endDate` | `YYYY-MM-DD` | **Wajib** |
| `userId` | uuid | Opsional — filter satu staff |

**Response:**
```json
{
  "success": true,
  "period": {
    "startDate": "2026-02-01",
    "endDate": "2026-02-19"
  },
  "data": [
    {
      "user": {
        "id": "uuid-user",
        "firstName": "Budi",
        "lastName": "Santoso",
        "email": "budi@gym.com"
      },
      "totalDays": 19,
      "present": 17,
      "late": 1,
      "absent": 1,
      "halfDay": 0,
      "records": [
        {
          "date": "2026-02-01",
          "checkInTime": "2026-02-01T07:30:00.000Z",
          "checkOutTime": "2026-02-01T16:00:00.000Z",
          "status": "present"
        }
      ]
    }
  ]
}
```

---

### Buat Kehadiran Manual

Untuk input kehadiran manual (tanpa device).

```
POST /api/v1/gym/staff-attendance
Authorization: Bearer <token>
```

**Request body:**
```json
{
  "userId": "uuid-user",
  "date": "2026-02-19",
  "checkInTime": "2026-02-19T08:00:00.000Z",
  "checkOutTime": "2026-02-19T17:00:00.000Z",
  "status": "present",
  "notes": "Manual entry - device offline"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-attendance",
    "userId": "uuid-user",
    "date": "2026-02-19",
    "checkInTime": "2026-02-19T08:00:00.000Z",
    "checkOutTime": "2026-02-19T17:00:00.000Z",
    "status": "present",
    "notes": "Manual entry - device offline"
  }
}
```

---

### Koreksi Kehadiran

```
PATCH /api/v1/gym/staff-attendance/:id
Authorization: Bearer <token>
```

**Request body** (semua field opsional):
```json
{
  "checkInTime": "2026-02-19T07:45:00.000Z",
  "checkOutTime": "2026-02-19T16:30:00.000Z",
  "status": "late",
  "notes": "Koreksi — jam masuk salah scan"
}
```

---

## Raw Device Logs

Log mentah dari device (berguna untuk debugging atau audit).

```
GET /api/v1/integrations/hikvision/devices/:id/logs
Authorization: Bearer <token>
```

**Query params:**

| Param | Type | Keterangan |
|-------|------|------------|
| `page` | int | Default: 1 |
| `limit` | int | Default: 50 |
| `startDate` | ISO datetime | Opsional |
| `endDate` | ISO datetime | Opsional |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-log",
      "deviceEmployeeNo": "1001",
      "eventTime": "2026-02-19T07:32:15.000Z",
      "verifyMode": "fingerprint",
      "cardNo": null,
      "source": "push",
      "processedAt": "2026-02-19T07:32:16.000Z",
      "matchedUser": {
        "id": "uuid-user",
        "firstName": "Budi",
        "lastName": "Santoso",
        "email": "budi@gym.com"
      },
      "matchedMember": null
    }
  ],
  "pagination": {
    "total": 120,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

---

## Data Types & Enums

### Device

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID | Primary key |
| `name` | string | Nama display device |
| `ipAddress` | string | IP device di jaringan lokal |
| `port` | int | Default: `80` |
| `username` | string | ISAPI auth user |
| `useForMemberCheckIn` | boolean | Jika `true`, device juga dipakai untuk check-in member |
| `isActive` | boolean | Jika `false`, cron job skip device ini |
| `lastSyncAt` | datetime \| null | Waktu pull terakhir berhasil |

### StaffAttendance — `status`

| Value | Keterangan |
|-------|------------|
| `present` | Hadir tepat waktu |
| `late` | Hadir terlambat (bisa di-set manual) |
| `absent` | Tidak hadir |
| `half_day` | Setengah hari |

> Status diset otomatis ke `present` oleh device. Koreksi ke `late` / `absent` / `half_day` dilakukan secara manual via `PATCH /gym/staff-attendance/:id`.

### DeviceAttendanceLog — `source`

| Value | Keterangan |
|-------|------------|
| `push` | Event dikirim langsung oleh device (realtime) |
| `pull` | Event ditarik oleh cron job setiap 5 menit (fallback) |

### DeviceAttendanceLog — `verifyMode`

| Value | Keterangan |
|-------|------------|
| `fingerprint` | Verifikasi sidik jari |
| `card` | Kartu RFID |
| `face` | Wajah (tergantung model device) |
| `password` | PIN |

---

## Catatan Penting

### Mapping Staff ke Device
- Setiap staff harus punya `deviceEmployeeNo` di tabel `Users`
- Nilai ini diisi otomatis saat memanggil `POST /devices/:id/employees` dengan `userId`
- Cek status mapping staff: `GET /api/v1/users` — lihat field `deviceEmployeeNo`

### IP Device di Jaringan
- Device IP: `192.168.1.23`
- Server dan device **harus** satu subnet atau ada routing yang benar
- Push URL yang dikonfigurasi harus bisa dijangkau dari IP device

### Timezone
- Semua `eventTime` dari device tersimpan dalam UTC di database
- Device dikonfigurasi ke WIB (UTC+7) saat `sync-time`
- Frontend tampilkan dalam timezone lokal user

### Duplicate Prevention
- Backend otomatis skip event duplikat berdasarkan `(deviceId, deviceEmployeeNo, eventTime)`
- Aman jika push dan pull terjadi bersamaan untuk event yang sama

### Cron Pull Fallback
- Berjalan otomatis setiap **5 menit** untuk semua device dengan `isActive: true`
- Menarik event sejak `lastSyncAt` (atau 10 menit terakhir jika belum pernah sync)
- Tidak perlu trigger manual kecuali untuk testing
