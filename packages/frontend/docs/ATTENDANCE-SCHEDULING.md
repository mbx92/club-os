# Frontend Integration: Attendance & Scheduling System

> Dokumentasi lengkap untuk integrasi frontend dengan sistem **Attendance**, **Scheduling**, **Shift**, dan **Hikvision Device**.

---

## Daftar Isi

1. [Overview & Flow](#overview--flow)
2. [Authentication](#authentication)
3. [Master Shift](#1-master-shift)
4. [Employee Schedule (Per-Tanggal)](#2-employee-schedule-per-tanggal)
5. [Employee Schedule Template (Mingguan)](#3-employee-schedule-template-mingguan)
6. [Staff Attendance](#4-staff-attendance)
7. [Hikvision Device Management](#5-hikvision-device-management)
8. [Staff ↔ Device Mapping](#6-staff--device-mapping)
9. [Fingerprint Management](#7-fingerprint-management)
10. [Data Flow & Diagram](#data-flow--diagram)
11. [Contoh Halaman Frontend](#contoh-halaman-frontend)
12. [Error Handling](#error-handling)

---

## Overview & Flow

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Master Shift│────▶│ Schedule Template │────▶│ Employee Schedule│────▶│ Staff Attendance │
│  (Pagi/Siang)│     │  (Mingguan)      │     │  (Per-tanggal)   │     │  (Actual data)   │
└──────────────┘     └──────────────────┘     └─────────────────┘     └──────────────────┘
                                                      ▲                        ▲
                                                      │                        │
                                              assign-shifts              Hikvision FP Tap
                                              (Cara cepat)              (Push/Pull Events)
```

**Alur Kerja:**
1. **Setup awal**: Buat Master Shift (Pagi, Siang, Middle, dll)
2. **Jadwal karyawan**: Gunakan salah satu cara:
   - **Cara 1**: Assign Shifts → langsung buat jadwal per tanggal
   - **Cara 2**: Buat Template mingguan → Generate ke per-tanggal
   - **Cara 3**: Input manual per tanggal
3. **Karyawan tap fingerprint** di mesin Hikvision → data masuk otomatis
4. **Attendance** otomatis dibandingkan dengan jadwal → status `on_time` / `late` / `absent`

---

## Authentication

Semua endpoint memerlukan JWT token di header:

```
Authorization: Bearer <jwt_token>
```

Base URL: `/api/v1`

---

## 1. Master Shift

> Definisi jam kerja standar yang bisa diassign ke banyak karyawan.

**Base path**: `/api/v1/gym/shifts`

### 1.1 List Shifts

```http
GET /api/v1/gym/shifts
```

**Query Parameters:**

| Param    | Type    | Required | Description                    |
|----------|---------|----------|--------------------------------|
| isActive | boolean | No       | Filter `true` / `false`        |
| page     | number  | No       | Halaman (default: 1)           |
| limit    | number  | No       | Per halaman (default: 50)      |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-shift-1",
      "tenantId": "uuid-tenant",
      "name": "Pagi",
      "code": "P",
      "shiftStart": "07:00:00",
      "shiftEnd": "15:00:00",
      "color": "#4CAF50",
      "isActive": true,
      "createdAt": "2026-02-20T10:00:00.000Z",
      "updatedAt": "2026-02-20T10:00:00.000Z"
    },
    {
      "id": "uuid-shift-2",
      "name": "Siang",
      "code": "S",
      "shiftStart": "14:00:00",
      "shiftEnd": "22:00:00",
      "color": "#2196F3",
      "isActive": true
    },
    {
      "id": "uuid-shift-3",
      "name": "Middle",
      "code": "M",
      "shiftStart": "10:00:00",
      "shiftEnd": "18:00:00",
      "color": "#FF9800",
      "isActive": true
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

### 1.2 Get Shift Detail

```http
GET /api/v1/gym/shifts/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid-shift-1",
    "name": "Pagi",
    "code": "P",
    "shiftStart": "07:00:00",
    "shiftEnd": "15:00:00",
    "color": "#4CAF50",
    "isActive": true
  }
}
```

### 1.3 Create Shift

```http
POST /api/v1/gym/shifts
```

**Body:**

```json
{
  "name": "Pagi",
  "code": "P",
  "shiftStart": "07:00:00",
  "shiftEnd": "15:00:00",
  "color": "#4CAF50"
}
```

| Field      | Type   | Required | Description                             |
|------------|--------|----------|-----------------------------------------|
| name       | string | ✅       | Nama shift (unik per tenant)            |
| code       | string | No       | Kode singkat (max 20 char)              |
| shiftStart | TIME   | ✅       | Jam mulai (format `HH:mm:ss`)           |
| shiftEnd   | TIME   | ✅       | Jam selesai (format `HH:mm:ss`)         |
| color      | string | No       | Warna hex untuk UI (e.g. `#4CAF50`)     |

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid-generated",
    "name": "Pagi",
    "code": "P",
    "shiftStart": "07:00:00",
    "shiftEnd": "15:00:00",
    "color": "#4CAF50",
    "isActive": true
  }
}
```

### 1.4 Update Shift

```http
PUT /api/v1/gym/shifts/:id
```

**Body:** (semua field optional)

```json
{
  "name": "Pagi Revisi",
  "shiftStart": "06:30:00",
  "shiftEnd": "14:30:00",
  "color": "#66BB6A",
  "isActive": false
}
```

### 1.5 Delete Shift

```http
DELETE /api/v1/gym/shifts/:id
```

**Response:**

```json
{
  "success": true,
  "message": "Shift \"Pagi\" deleted"
}
```

---

## 2. Employee Schedule (Per-Tanggal)

> Jadwal kerja konkret per tanggal per karyawan. Ini yang dibandingkan dengan data attendance.

**Base path**: `/api/v1/gym/employee-schedules`

### 2.1 List Schedules

```http
GET /api/v1/gym/employee-schedules
```

**Query Parameters:**

| Param     | Type     | Required | Description                  |
|-----------|----------|----------|------------------------------|
| userId    | UUID     | No       | Filter karyawan tertentu     |
| startDate | DATEONLY | No       | Dari tanggal (YYYY-MM-DD)    |
| endDate   | DATEONLY | No       | Sampai tanggal (YYYY-MM-DD)  |
| isOff     | boolean  | No       | Filter hari libur            |
| page      | number   | No       | Halaman (default: 1)         |
| limit     | number   | No       | Per halaman (default: 50)    |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-schedule-1",
      "tenantId": "uuid-tenant",
      "userId": "uuid-user-1",
      "shiftId": "uuid-shift-1",
      "date": "2026-03-01",
      "shiftStart": "07:00:00",
      "shiftEnd": "15:00:00",
      "isOff": false,
      "notes": null,
      "user": {
        "id": "uuid-user-1",
        "firstName": "Budi",
        "lastName": "Santoso",
        "email": "budi@gym.com",
        "deviceEmployeeNo": "1"
      },
      "shift": {
        "id": "uuid-shift-1",
        "name": "Pagi",
        "code": "P",
        "shiftStart": "07:00:00",
        "shiftEnd": "15:00:00",
        "color": "#4CAF50"
      }
    },
    {
      "id": "uuid-schedule-2",
      "userId": "uuid-user-1",
      "shiftId": null,
      "date": "2026-03-02",
      "shiftStart": null,
      "shiftEnd": null,
      "isOff": true,
      "notes": "Libur Minggu",
      "user": { ... },
      "shift": null
    }
  ],
  "pagination": { "total": 30, "page": 1, "limit": 50, "totalPages": 1 }
}
```

### 2.2 Create Schedule (Single)

```http
POST /api/v1/gym/employee-schedules
```

**Body (dengan shiftId — RECOMMENDED):**

```json
{
  "userId": "uuid-user-1",
  "date": "2026-03-01",
  "shiftId": "uuid-shift-pagi"
}
```

> Jika `shiftId` diberikan, `shiftStart` dan `shiftEnd` otomatis diambil dari master Shift.

**Body (manual tanpa shiftId):**

```json
{
  "userId": "uuid-user-1",
  "date": "2026-03-01",
  "shiftStart": "08:00:00",
  "shiftEnd": "16:00:00",
  "isOff": false,
  "notes": "Custom schedule"
}
```

**Body (hari libur):**

```json
{
  "userId": "uuid-user-1",
  "date": "2026-03-02",
  "isOff": true,
  "notes": "Libur Minggu"
}
```

| Field      | Type    | Required | Description                              |
|------------|---------|----------|------------------------------------------|
| userId     | UUID    | ✅       | ID karyawan                              |
| date       | string  | ✅       | Tanggal (YYYY-MM-DD)                     |
| shiftId    | UUID    | No       | Referensi ke master Shift                |
| shiftStart | TIME    | No       | Jam mulai (otomatis jika pakai shiftId)  |
| shiftEnd   | TIME    | No       | Jam selesai (otomatis jika pakai shiftId)|
| isOff      | boolean | No       | `true` = hari libur (default: false)     |
| notes      | string  | No       | Catatan                                  |

### 2.3 Create Schedule (Bulk)

```http
POST /api/v1/gym/employee-schedules
```

```json
{
  "schedules": [
    { "userId": "uuid-user-1", "date": "2026-03-01", "shiftId": "uuid-shift-pagi" },
    { "userId": "uuid-user-1", "date": "2026-03-02", "isOff": true },
    { "userId": "uuid-user-2", "date": "2026-03-01", "shiftId": "uuid-shift-siang" }
  ]
}
```

> Menggunakan **upsert** — jika schedule untuk user+date sudah ada, akan di-update.

### 2.4 Assign Shifts (⭐ Cara Tercepat)

```http
POST /api/v1/gym/employee-schedules/assign-shifts
```

**Mode 1: Uniform Shift + Off Days**

Satu shift untuk semua hari kerja, tentukan hari libur dengan `offDays`.

```json
{
  "startDate": "2026-03-01",
  "endDate": "2026-03-31",
  "assignments": [
    {
      "userId": "uuid-user-1",
      "shiftId": "uuid-shift-pagi",
      "offDays": [0, 6]
    },
    {
      "userId": "uuid-user-2",
      "shiftId": "uuid-shift-siang",
      "offDays": [0]
    }
  ]
}
```

| Field                   | Type     | Required | Description                                |
|-------------------------|----------|----------|--------------------------------------------|
| startDate               | string   | ✅       | Tanggal mulai (YYYY-MM-DD)                 |
| endDate                 | string   | ✅       | Tanggal akhir (YYYY-MM-DD, max 90 hari)    |
| assignments[].userId    | UUID     | ✅       | ID karyawan                                |
| assignments[].shiftId   | UUID     | ✅       | ID shift yang diassign                     |
| assignments[].offDays   | number[] | No       | Hari libur: 0=Minggu, 1=Senin, ..., 6=Sabtu|

**Mode 2: Per-Date Mapping**

Kontrol penuh — tentukan shift berbeda per tanggal.

```json
{
  "startDate": "2026-03-01",
  "endDate": "2026-03-07",
  "assignments": [
    {
      "userId": "uuid-user-1",
      "dates": {
        "2026-03-01": "uuid-shift-pagi",
        "2026-03-02": "uuid-shift-siang",
        "2026-03-03": "uuid-shift-pagi",
        "2026-03-04": "OFF",
        "2026-03-05": "uuid-shift-pagi",
        "2026-03-06": "uuid-shift-siang",
        "2026-03-07": "OFF"
      }
    }
  ]
}
```

> Gunakan `"OFF"` atau `null` di value untuk menandai hari libur.

**Response:**

```json
{
  "success": true,
  "message": "Shift assignment completed",
  "data": {
    "totalCreated": 25,
    "totalOffDays": 6,
    "range": { "startDate": "2026-03-01", "endDate": "2026-03-31" }
  }
}
```

### 2.5 Generate from Templates

```http
POST /api/v1/gym/employee-schedules/generate-from-templates
```

Buat jadwal per-tanggal otomatis dari template mingguan.

```json
{
  "startDate": "2026-03-01",
  "endDate": "2026-03-31",
  "userId": "uuid-user-1"
}
```

| Field     | Type   | Required | Description                         |
|-----------|--------|----------|-------------------------------------|
| startDate | string | ✅       | Tanggal mulai (YYYY-MM-DD)          |
| endDate   | string | ✅       | Tanggal akhir (max 90 hari)         |
| userId    | UUID   | No       | Hanya untuk user tertentu (optional)|

**Response:**

```json
{
  "success": true,
  "message": "Generated 22 schedule(s) from templates",
  "data": { "created": 22 }
}
```

### 2.6 Update Schedule

```http
PUT /api/v1/gym/employee-schedules/:id
```

```json
{
  "shiftStart": "08:00:00",
  "shiftEnd": "16:00:00",
  "isOff": false,
  "notes": "Updated"
}
```

### 2.7 Delete Schedule

```http
DELETE /api/v1/gym/employee-schedules/:id
```

### 2.8 Delete User Schedules (Range)

```http
DELETE /api/v1/gym/employee-schedules/user/:userId?startDate=2026-03-01&endDate=2026-03-31
```

> Hapus semua jadwal user dalam rentang tanggal.

---

## 3. Employee Schedule Template (Mingguan)

> Pola jadwal mingguan yang bisa di-generate menjadi jadwal per-tanggal.

**Base path**: `/api/v1/gym/employee-schedule-templates`

### 3.1 List Templates

```http
GET /api/v1/gym/employee-schedule-templates
```

**Query Parameters:**

| Param     | Type   | Required | Description              |
|-----------|--------|----------|--------------------------|
| userId    | UUID   | No       | Filter user tertentu     |
| dayOfWeek | number | No       | Filter hari (0-6)        |
| page      | number | No       | Halaman (default: 1)     |
| limit     | number | No       | Per halaman (default: 50)|

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-template-1",
      "userId": "uuid-user-1",
      "dayOfWeek": 1,
      "shiftStart": "07:00:00",
      "shiftEnd": "15:00:00",
      "isOff": false,
      "notes": null,
      "user": {
        "id": "uuid-user-1",
        "firstName": "Budi",
        "lastName": "Santoso"
      }
    },
    {
      "id": "uuid-template-2",
      "userId": "uuid-user-1",
      "dayOfWeek": 0,
      "shiftStart": null,
      "shiftEnd": null,
      "isOff": true,
      "notes": "Libur Minggu"
    }
  ],
  "pagination": { ... }
}
```

**Day of Week mapping:**

| Value | Hari     |
|-------|----------|
| 0     | Minggu   |
| 1     | Senin    |
| 2     | Selasa   |
| 3     | Rabu     |
| 4     | Kamis    |
| 5     | Jumat    |
| 6     | Sabtu    |

### 3.2 Create Template (Single / Bulk)

```http
POST /api/v1/gym/employee-schedule-templates
```

**Single:**

```json
{
  "userId": "uuid-user-1",
  "dayOfWeek": 1,
  "shiftStart": "07:00:00",
  "shiftEnd": "15:00:00"
}
```

**Bulk (rekomendasi — set sekaligus 7 hari):**

```json
{
  "schedules": [
    { "userId": "uuid-user-1", "dayOfWeek": 0, "isOff": true },
    { "userId": "uuid-user-1", "dayOfWeek": 1, "shiftStart": "07:00:00", "shiftEnd": "15:00:00" },
    { "userId": "uuid-user-1", "dayOfWeek": 2, "shiftStart": "07:00:00", "shiftEnd": "15:00:00" },
    { "userId": "uuid-user-1", "dayOfWeek": 3, "shiftStart": "07:00:00", "shiftEnd": "15:00:00" },
    { "userId": "uuid-user-1", "dayOfWeek": 4, "shiftStart": "07:00:00", "shiftEnd": "15:00:00" },
    { "userId": "uuid-user-1", "dayOfWeek": 5, "shiftStart": "07:00:00", "shiftEnd": "15:00:00" },
    { "userId": "uuid-user-1", "dayOfWeek": 6, "isOff": true }
  ]
}
```

> Menggunakan **upsert** — jika template untuk user+dayOfWeek sudah ada, akan di-update.

### 3.3 Update Template

```http
PUT /api/v1/gym/employee-schedule-templates/:id
```

### 3.4 Delete Template

```http
DELETE /api/v1/gym/employee-schedule-templates/:id
```

### 3.5 Delete All User Templates

```http
DELETE /api/v1/gym/employee-schedule-templates/user/:userId
```

---

## 4. Staff Attendance

> Data kehadiran karyawan yang sudah diproses dari fingerprint/face recognition device.

**Base path**: `/api/v1/gym/staff-attendance`

### 4.1 List Attendance

```http
GET /api/v1/gym/staff-attendance
```

**Query Parameters:**

| Param     | Type     | Required | Description                             |
|-----------|----------|----------|-----------------------------------------|
| startDate | DATEONLY | No       | Dari tanggal                            |
| endDate   | DATEONLY | No       | Sampai tanggal                          |
| userId    | UUID     | No       | Filter karyawan tertentu                |
| status    | string   | No       | Filter status (`present`, `on_time`, `late`) |
| page      | number   | No       | Halaman (default: 1)                    |
| limit     | number   | No       | Per halaman (default: 50)               |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-attendance-1",
      "userId": "uuid-user-1",
      "deviceId": "uuid-device-1",
      "logId": "uuid-log-1",
      "checkInTime": "2026-03-01T06:55:00.000Z",
      "checkOutTime": "2026-03-01T15:02:00.000Z",
      "date": "2026-03-01",
      "status": "on_time",
      "notes": null,
      "user": {
        "id": "uuid-user-1",
        "firstName": "Budi",
        "lastName": "Santoso",
        "email": "budi@gym.com"
      },
      "device": {
        "id": "uuid-device-1",
        "name": "Mesin Pintu Depan"
      },
      "schedule": {
        "shiftStart": "07:00:00",
        "shiftEnd": "15:00:00",
        "isOff": false,
        "shiftName": "Pagi"
      },
      "computedStatus": "on_time",
      "lateMinutes": 0
    },
    {
      "id": "uuid-attendance-2",
      "userId": "uuid-user-2",
      "checkInTime": "2026-03-01T07:25:00.000Z",
      "checkOutTime": "2026-03-01T15:10:00.000Z",
      "date": "2026-03-01",
      "status": "late",
      "schedule": {
        "shiftStart": "07:00:00",
        "shiftEnd": "15:00:00",
        "isOff": false
      },
      "computedStatus": "late",
      "lateMinutes": 25
    }
  ],
  "pagination": { ... }
}
```

**Computed Status Values:**

| Status     | Keterangan                                                |
|------------|-----------------------------------------------------------|
| `on_time`  | Check-in ≤ jadwal shiftStart                              |
| `late`     | Check-in > jadwal shiftStart (lihat `lateMinutes`)        |
| `absent`   | Ada jadwal tapi tidak ada check-in                        |
| `day_off`  | Jadwal menunjukkan hari libur (`isOff: true`)             |
| `present`  | Hadir tapi tidak ada jadwal untuk dibandingkan            |

### 4.2 Attendance Report

```http
GET /api/v1/gym/staff-attendance/report
```

**Query Parameters:**

| Param     | Type     | Required | Description              |
|-----------|----------|----------|--------------------------|
| startDate | DATEONLY | ✅       | Dari tanggal             |
| endDate   | DATEONLY | ✅       | Sampai tanggal           |
| userId    | UUID     | No       | Filter user tertentu     |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "userId": "uuid-user-1",
      "userName": "Budi Santoso",
      "summary": {
        "totalDays": 22,
        "present": 20,
        "onTime": 18,
        "late": 2,
        "absent": 2,
        "dayOff": 8,
        "totalLateMinutes": 45
      },
      "records": [
        {
          "date": "2026-03-01",
          "checkInTime": "2026-03-01T06:55:00.000Z",
          "checkOutTime": "2026-03-01T15:02:00.000Z",
          "status": "on_time",
          "computedStatus": "on_time",
          "lateMinutes": 0,
          "schedule": {
            "shiftStart": "07:00:00",
            "shiftEnd": "15:00:00",
            "isOff": false
          }
        },
        {
          "date": "2026-03-05",
          "checkInTime": "2026-03-05T07:15:00.000Z",
          "checkOutTime": "2026-03-05T15:05:00.000Z",
          "status": "late",
          "computedStatus": "late",
          "lateMinutes": 15,
          "schedule": {
            "shiftStart": "07:00:00",
            "shiftEnd": "15:00:00",
            "isOff": false
          }
        }
      ]
    }
  ]
}
```

### 4.3 Create Manual Attendance

```http
POST /api/v1/gym/staff-attendance
```

> Untuk input kehadiran manual (tanpa fingerprint device).

```json
{
  "userId": "uuid-user-1",
  "date": "2026-03-01",
  "checkInTime": "2026-03-01T07:00:00.000Z",
  "checkOutTime": "2026-03-01T15:00:00.000Z",
  "status": "present",
  "notes": "Input manual - device rusak"
}
```

### 4.4 Update Attendance

```http
PATCH /api/v1/gym/staff-attendance/:id
```

```json
{
  "checkInTime": "2026-03-01T06:55:00.000Z",
  "checkOutTime": "2026-03-01T15:05:00.000Z",
  "status": "on_time",
  "notes": "Koreksi waktu"
}
```

### 4.5 Reprocess Unmatched Logs

```http
POST /api/v1/gym/staff-attendance/reprocess
```

**Query:**

| Param     | Type     | Required | Description                       |
|-----------|----------|----------|-----------------------------------|
| startDate | DATEONLY | No       | Filter logs dari tanggal          |
| endDate   | DATEONLY | No       | Filter logs sampai tanggal        |

> Memproses ulang log device yang belum cocok ke user. Berguna setelah menambahkan staff mapping baru.

---

## 5. Hikvision Device Management

**Base path**: `/api/v1/integrations/hikvision`

### 5.1 List Devices

```http
GET /api/v1/integrations/hikvision/devices
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-device-1",
      "tenantId": "uuid-tenant",
      "name": "Mesin Pintu Depan",
      "ipAddress": "192.168.1.100",
      "port": 80,
      "username": "admin",
      "serialNumber": "DS-K1T8003MF...",
      "isActive": true,
      "pushUrl": null,
      "pushEnabled": false,
      "lastSyncAt": "2026-03-01T10:00:00.000Z"
    }
  ]
}
```

> `password` tidak dikembalikan di response.

### 5.2 Create Device

```http
POST /api/v1/integrations/hikvision/devices
```

```json
{
  "name": "Mesin Pintu Depan",
  "ipAddress": "192.168.1.100",
  "username": "admin",
  "password": "admin123"
}
```

| Field     | Type   | Required | Description                |
|-----------|--------|----------|----------------------------|
| name      | string | ✅       | Nama device                |
| ipAddress | string | ✅       | IP address di jaringan     |
| port      | number | No       | Port (default: 80)         |
| username  | string | ✅       | Username Hikvision         |
| password  | string | ✅       | Password Hikvision         |

### 5.3 Update Device

```http
PUT /api/v1/integrations/hikvision/devices/:id
```

### 5.4 Delete Device

```http
DELETE /api/v1/integrations/hikvision/devices/:id
```

### 5.5 Test Connection

```http
GET /api/v1/integrations/hikvision/devices/:id/test
```

**Response:**

```json
{
  "success": true,
  "message": "Device connection successful",
  "data": {
    "deviceName": "DS-K1T8003MF",
    "serialNumber": "DS-K1T8003...",
    "firmwareVersion": "V1.2.0"
  }
}
```

### 5.6 Manual Sync (Pull Events)

```http
POST /api/v1/integrations/hikvision/devices/:id/sync
```

**Query:**

| Param     | Type    | Required | Description                           |
|-----------|---------|----------|---------------------------------------|
| startDate | string  | No       | ISO date (default: 24 jam terakhir)   |
| fullDay   | boolean | No       | `true` = dari awal hari till now      |

> Menarik event (tap FP/face) dari device dan memproses ke attendance.

### 5.7 Configure Push

```http
POST /api/v1/integrations/hikvision/devices/:id/configure-push
```

```json
{
  "serverUrl": "http://192.168.1.50:8000/api/v1/integrations/hikvision/event"
}
```

| Field     | Type   | Required | Description                                |
|-----------|--------|----------|--------------------------------------------|
| serverUrl | string | ✅       | Push URL yang bisa diakses dari device      |

> Mengkonfigurasi device agar otomatis kirim event ke server saat ada tap FP. URL ini **disimpan di database** (`pushUrl`, `pushEnabled`) dan juga dikirim ke hardware device.

**Response:**

```json
{
  "success": true,
  "message": "Push URL configured on device",
  "data": {
    "pushUrl": "http://192.168.1.50:8000/api/v1/integrations/hikvision/event",
    "pushEnabled": true
  }
}
```

### 5.8 Get Push Status

```http
GET /api/v1/integrations/hikvision/devices/:id/push-status
```

> Mengecek konfigurasi push dari **database** dan **hardware device** sekaligus, serta auto-sync jika ada perbedaan.

**Response:**

```json
{
  "success": true,
  "data": {
    "database": {
      "pushUrl": "http://192.168.1.50:8000/api/v1/integrations/hikvision/event",
      "pushEnabled": true
    },
    "device": {
      "pushUrl": "http://192.168.1.50:8000/api/v1/integrations/hikvision/event",
      "pushEnabled": true,
      "protocolType": "HTTP"
    },
    "inSync": true
  }
}
```

| Field              | Description                                        |
|--------------------|----------------------------------------------------|
| `database`         | Status yang tersimpan di database                  |
| `device`           | Status yang dibaca langsung dari hardware device   |
| `inSync`           | `true` jika database & device sama                 |

### 5.9 Disable Push

```http
DELETE /api/v1/integrations/hikvision/devices/:id/push
```

> Menonaktifkan push events di device dan menghapus pushUrl dari database.

**Response:**

```json
{
  "success": true,
  "message": "Push events disabled on device",
  "data": {
    "pushUrl": null,
    "pushEnabled": false
  }
}
```

### 5.10 Get Device Logs

```http
GET /api/v1/integrations/hikvision/devices/:id/logs
```

**Query:**

| Param     | Type     | Required | Description                 |
|-----------|----------|----------|-----------------------------|
| startDate | DATEONLY | No       | Filter dari tanggal         |
| endDate   | DATEONLY | No       | Filter sampai tanggal       |
| page      | number   | No       | Default: 1                  |
| limit     | number   | No       | Default: 50                 |

### 5.11 Sync Device Time

```http
POST /api/v1/integrations/hikvision/devices/:id/sync-time
```

> Sinkronisasi jam device dengan jam server agar timestamp akurat.

---

## 6. Staff ↔ Device Mapping

> Menghubungkan User di database dengan Employee Number di device Hikvision.

**Base path**: `/api/v1/integrations/hikvision`

### 6.1 List Staff Mapping

```http
GET /api/v1/integrations/hikvision/staff-mapping
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-user-1",
      "firstName": "Budi",
      "lastName": "Santoso",
      "email": "budi@gym.com",
      "deviceEmployeeNo": "1",
      "isMapped": true
    },
    {
      "id": "uuid-user-2",
      "firstName": "Siti",
      "lastName": "Aminah",
      "email": "siti@gym.com",
      "deviceEmployeeNo": null,
      "isMapped": false
    }
  ]
}
```

### 6.2 Assign Staff Device Number

```http
PUT /api/v1/integrations/hikvision/staff-mapping/:userId
```

```json
{
  "deviceEmployeeNo": "1"
}
```

> ⚠️ `deviceEmployeeNo` harus sama dengan Employee No yang terdaftar di device Hikvision.

### 6.3 Unassign Staff Device Number

```http
DELETE /api/v1/integrations/hikvision/staff-mapping/:userId
```

---

## 7. Fingerprint Management

**Base path**: `/api/v1/integrations/hikvision/devices/:deviceId/employees`

### 7.1 List Device Employees

```http
GET /api/v1/integrations/hikvision/devices/:deviceId/employees
```

**Response:**

```json
{
  "success": true,
  "data": {
    "deviceEmployees": [
      {
        "employeeNo": "1",
        "name": "Budi Santoso",
        "hasFingerprint": true,
        "fingerprintCount": 2,
        "dbRecord": {
          "id": "uuid",
          "userId": "uuid-user-1",
          "status": "active"
        }
      }
    ],
    "availableStaff": [
      {
        "id": "uuid-user-3",
        "firstName": "Andi",
        "lastName": "Prasetyo",
        "deviceEmployeeNo": null
      }
    ]
  }
}
```

### 7.2 Add Employee to Device

```http
POST /api/v1/integrations/hikvision/devices/:deviceId/employees
```

```json
{
  "userId": "uuid-user-1",
  "employeeNo": "1",
  "name": "Budi Santoso"
}
```

### 7.3 Enroll Fingerprint

```http
POST /api/v1/integrations/hikvision/devices/:deviceId/employees/:employeeNo/enroll-fingerprint
```

```json
{
  "fingerPrintID": 1
}
```

> **⚠️ PENTING**: Setelah call ini, karyawan harus segera tap jari di device (timeout 2 menit). Device di-lock selama enrolling.

**Response:**

```json
{
  "success": true,
  "message": "Fingerprint enrollment started. User has 2 minutes to place finger on device.",
  "data": {
    "enrollTimeout": 120,
    "fingerPrintID": 1
  }
}
```

### 7.4 Delete Fingerprint

```http
DELETE /api/v1/integrations/hikvision/devices/:deviceId/employees/:employeeNo/fingerprint
```

**Body (optional):**

```json
{
  "fingerPrintIDs": [1, 2]
}
```

> Jika `fingerPrintIDs` tidak diberikan, hapus semua fingerprint employee tersebut.

### 7.5 Remove Employee from Device

```http
DELETE /api/v1/integrations/hikvision/devices/:deviceId/employees/:employeeNo
```

### 7.6 Unlock Enrollment

```http
DELETE /api/v1/integrations/hikvision/devices/:deviceId/enrollment-lock
```

> Lepaskan lock enrollment jika proses terhenti.

### 7.7 Sync Device Employees to DB

```http
POST /api/v1/integrations/hikvision/devices/:deviceId/sync-employees
```

> Import daftar employee dari hardware device ke tabel `DeviceEmployees` di database. Termasuk jumlah fingerprint yang asli dari device.

### 7.8 List All Device Employees (DB)

```http
GET /api/v1/integrations/hikvision/device-employees
```

**Query:**

| Param          | Type    | Required | Description                      |
|----------------|---------|----------|----------------------------------|
| deviceId       | UUID    | No       | Filter by device                 |
| userId         | UUID    | No       | Filter by linked user            |
| status         | string  | No       | `active`, `inactive`             |
| hasFingerprint | boolean | No       | `true` = punya FP terdaftar      |

---

## Data Flow & Diagram

### Alur Fingerprint → Attendance

```
┌────────────┐     tap FP     ┌───────────────┐
│  Karyawan  │───────────────▶│ Hikvision     │
│            │                │ Device        │
└────────────┘                └───────┬───────┘
                                      │
                              ┌───────▼───────┐
                    Push ────▶│ POST /event   │◀──── Pull (cron 5 min)
                    (realtime)│ (receiveEvent)│     (POST /sync)
                              └───────┬───────┘
                                      │
                              ┌───────▼───────────────┐
                              │ DeviceAttendanceLog    │
                              │ (raw log per event)    │
                              └───────┬───────────────┘
                                      │ match by
                                      │ deviceEmployeeNo
                              ┌───────▼───────────────┐
                              │ StaffAttendance        │
                              │ (1 record per user     │
                              │  per day)              │
                              │                        │
                              │ checkInTime = first tap│
                              │ checkOutTime = last tap│
                              └───────┬───────────────┘
                                      │ compare with
                              ┌───────▼───────────────┐
                              │ EmployeeSchedule       │
                              │ (shiftStart/shiftEnd)  │
                              └───────────────────────┘
                                      │
                              ┌───────▼───────────────┐
                              │ computedStatus:        │
                              │ on_time / late / absent│
                              └───────────────────────┘
```

### Alur Setup Scheduling

```
Cara 1 (Paling Mudah):
  Create Shifts → POST /assign-shifts → Done ✅

Cara 2 (Template):
  Create Shifts → Create Templates (7 hari) → POST /generate-from-templates → Done ✅

Cara 3 (Manual):
  POST /employee-schedules (single/bulk) → Done ✅
```

---

## Contoh Halaman Frontend

### Halaman 1: Master Shift

**UI**: Tabel sederhana dengan tombol Add/Edit/Delete

| Nama    | Kode | Jam Mulai | Jam Selesai | Warna   | Aktif | Aksi          |
|---------|------|-----------|-------------|---------|-------|---------------|
| Pagi    | P    | 07:00     | 15:00       | 🟢      | ✅    | ✏️ 🗑️         |
| Siang   | S    | 14:00     | 22:00       | 🔵      | ✅    | ✏️ 🗑️         |
| Middle  | M    | 10:00     | 18:00       | 🟠      | ✅    | ✏️ 🗑️         |

**API calls:**
- Load: `GET /gym/shifts`
- Add: `POST /gym/shifts`
- Edit: `PUT /gym/shifts/:id`
- Delete: `DELETE /gym/shifts/:id`

---

### Halaman 2: Kalender Jadwal Karyawan

**UI**: Calendar view (bulanan) dengan dropdown shift per cell

```
         Maret 2026
Staff     | Sen 2  | Sel 3  | Rab 4  | Kam 5  | ...
─────────┼────────┼────────┼────────┼────────┼─────
Budi     | Pagi 🟢| Pagi 🟢| Siang🔵| Pagi 🟢| ...
Siti     | Siang🔵| Siang🔵| OFF    | Siang🔵| ...
Andi     | Mid  🟠| Pagi 🟢| Pagi 🟢| OFF    | ...
```

**API calls:**
- Load bulan ini: `GET /gym/employee-schedules?startDate=2026-03-01&endDate=2026-03-31`
- Load shifts: `GET /gym/shifts?isActive=true`
- Assign sebulan: `POST /gym/employee-schedules/assign-shifts` (Mode 1 atau Mode 2)
- Edit cell: `PUT /gym/employee-schedules/:id`
- Hapus jadwal user: `DELETE /gym/employee-schedules/user/:userId?startDate=...&endDate=...`

**Implementasi Frontend (React pseudo-code):**

```jsx
// Load data
const { data: shifts } = useFetch('/api/v1/gym/shifts?isActive=true');
const { data: schedules } = useFetch(`/api/v1/gym/employee-schedules?startDate=${monthStart}&endDate=${monthEnd}`);

// Group schedules by userId → date → schedule
const scheduleMap = {};
schedules.forEach(s => {
  if (!scheduleMap[s.userId]) scheduleMap[s.userId] = {};
  scheduleMap[s.userId][s.date] = s;
});

// Assign shift for whole month
async function assignMonthShift(userId, shiftId, offDays) {
  await api.post('/api/v1/gym/employee-schedules/assign-shifts', {
    startDate: monthStart,
    endDate: monthEnd,
    assignments: [{ userId, shiftId, offDays }]
  });
  refetch();
}
```

---

### Halaman 3: Rekap Kehadiran

**UI**: Tabel dengan filter tanggal dan user

| Tanggal    | Karyawan      | Check In | Check Out | Jadwal       | Status  | Telat    |
|------------|---------------|----------|-----------|--------------|---------|----------|
| 2026-03-01 | Budi Santoso  | 06:55    | 15:02     | 07:00-15:00  | ✅ Tepat | 0 menit  |
| 2026-03-01 | Siti Aminah   | 07:25    | 15:10     | 07:00-15:00  | ⚠️ Telat | 25 menit |
| 2026-03-02 | Andi Prasetyo | -        | -         | 07:00-15:00  | ❌ Absen | -        |

**API calls:**
- Load: `GET /gym/staff-attendance?startDate=2026-03-01&endDate=2026-03-31`
- Report: `GET /gym/staff-attendance/report?startDate=2026-03-01&endDate=2026-03-31`

---

### Halaman 4: Device Management

**UI**: Card per device + section employee management

**Komponen:**
1. **Device List** — `GET /integrations/hikvision/devices`
2. **Test Connection** button — `GET /integrations/hikvision/devices/:id/test`
3. **Sync Now** button — `POST /integrations/hikvision/devices/:id/sync`
4. **Employee List** (per device) — `GET /integrations/hikvision/devices/:id/employees`
5. **Enroll FP** button — `POST .../employees/:no/enroll-fingerprint`
6. **Delete FP** button — `DELETE .../employees/:no/fingerprint`

---

### Halaman 5: Staff Mapping

**UI**: Tabel user dengan kolom Device Employee No

| Karyawan      | Email          | Device No | Status     | Aksi              |
|---------------|----------------|-----------|------------|--------------------|
| Budi Santoso  | budi@gym.com   | 1         | ✅ Mapped  | ✏️ Ubah | ❌ Hapus |
| Siti Aminah   | siti@gym.com   | -         | ⚠️ Unmapped| ➕ Assign          |

**API calls:**
- Load: `GET /integrations/hikvision/staff-mapping`
- Assign: `PUT /integrations/hikvision/staff-mapping/:userId` → `{ "deviceEmployeeNo": "2" }`
- Remove: `DELETE /integrations/hikvision/staff-mapping/:userId`

---

## Error Handling

Semua endpoint mengembalikan format error yang konsisten:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "name, shiftStart, and shiftEnd are required"
  }
}
```

**HTTP Status Codes:**

| Code | Keterangan                                |
|------|-------------------------------------------|
| 200  | Success                                   |
| 201  | Created (POST berhasil)                   |
| 400  | Validation Error (missing/invalid field)  |
| 401  | Unauthorized (JWT invalid/expired)        |
| 403  | Forbidden (CASL / Feature Gate)           |
| 404  | Not Found                                 |
| 409  | Conflict (duplicate data)                 |
| 500  | Internal Server Error                     |

**Error Codes yang Sering Muncul:**

| Error Code         | Cause                                       |
|--------------------|---------------------------------------------|
| `VALIDATION_ERROR` | Field required missing atau format salah     |
| `NOT_FOUND`        | Resource tidak ditemukan                     |
| `DUPLICATE`        | Data duplikat (shift name, schedule, dll)    |
| `UNAUTHORIZED`     | Token expired/invalid                        |
| `FORBIDDEN`        | User tidak punya permission                  |
| `MODULE_DISABLED`  | Module `gym` tidak aktif di subscription     |

---

## Quick Reference Table

| Fitur                      | Endpoint                                              | Method |
|----------------------------|-------------------------------------------------------|--------|
| **Shifts**                 |                                                       |        |
| List shifts                | `/gym/shifts`                                         | GET    |
| Create shift               | `/gym/shifts`                                         | POST   |
| Update shift               | `/gym/shifts/:id`                                     | PUT    |
| Delete shift               | `/gym/shifts/:id`                                     | DELETE |
| **Schedules**              |                                                       |        |
| List schedules             | `/gym/employee-schedules`                             | GET    |
| Create schedule            | `/gym/employee-schedules`                             | POST   |
| Assign shifts (bulk)       | `/gym/employee-schedules/assign-shifts`               | POST   |
| Generate from templates    | `/gym/employee-schedules/generate-from-templates`     | POST   |
| Update schedule            | `/gym/employee-schedules/:id`                         | PUT    |
| Delete schedule            | `/gym/employee-schedules/:id`                         | DELETE |
| Delete user schedules      | `/gym/employee-schedules/user/:userId`                | DELETE |
| **Templates**              |                                                       |        |
| List templates             | `/gym/employee-schedule-templates`                    | GET    |
| Create template            | `/gym/employee-schedule-templates`                    | POST   |
| Update template            | `/gym/employee-schedule-templates/:id`                | PUT    |
| Delete template            | `/gym/employee-schedule-templates/:id`                | DELETE |
| Delete user templates      | `/gym/employee-schedule-templates/user/:userId`       | DELETE |
| **Attendance**             |                                                       |        |
| List attendance            | `/gym/staff-attendance`                               | GET    |
| Attendance report          | `/gym/staff-attendance/report`                        | GET    |
| Create manual              | `/gym/staff-attendance`                               | POST   |
| Update attendance          | `/gym/staff-attendance/:id`                           | PATCH  |
| Reprocess logs             | `/gym/staff-attendance/reprocess`                     | POST   |
| **Hikvision**              |                                                       |        |
| List devices               | `/integrations/hikvision/devices`                     | GET    |
| Create device              | `/integrations/hikvision/devices`                     | POST   |
| Test connection            | `/integrations/hikvision/devices/:id/test`            | GET    |
| Manual sync                | `/integrations/hikvision/devices/:id/sync`            | POST   |
| Configure push             | `/integrations/hikvision/devices/:id/configure-push`  | POST   |
| Get push status            | `/integrations/hikvision/devices/:id/push-status`     | GET    |
| Disable push               | `/integrations/hikvision/devices/:id/push`             | DELETE |
| Sync time                  | `/integrations/hikvision/devices/:id/sync-time`       | POST   |
| List device employees      | `/integrations/hikvision/devices/:id/employees`       | GET    |
| Add employee to device     | `/integrations/hikvision/devices/:id/employees`       | POST   |
| Enroll fingerprint         | `/integrations/hikvision/devices/:id/employees/:no/enroll-fingerprint` | POST |
| Delete fingerprint         | `/integrations/hikvision/devices/:id/employees/:no/fingerprint` | DELETE |
| Remove employee            | `/integrations/hikvision/devices/:id/employees/:no`   | DELETE |
| Staff mapping list         | `/integrations/hikvision/staff-mapping`               | GET    |
| Assign device no           | `/integrations/hikvision/staff-mapping/:userId`       | PUT    |
| Unassign device no         | `/integrations/hikvision/staff-mapping/:userId`       | DELETE |
| Reprocess unmatched        | `/integrations/hikvision/reprocess-logs`              | POST   |
| Sync device employees      | `/integrations/hikvision/devices/:id/sync-employees`  | POST   |

> Semua endpoint menggunakan prefix `/api/v1`
