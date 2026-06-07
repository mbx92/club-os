# Hikvision DS-K1T8003MF Integration Plan

## Overview

Integrasi mesin fingerprint Hikvision DS-K1T8003MF ke backend gym untuk **Staff Attendance** (utama) dan **Member Check-In** (opsional per-device).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Hikvision DS-K1T8003MF                         │
│  - Push events via ISAPI HTTP (real-time)                   │
│  - Supports HTTP Digest Authentication                      │
└──────────────────────┬──────────────────────────────────────┘
                       │ POST /api/v1/integrations/hikvision/event
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js)                        │
│                                                             │
│  hikvisionController.js                                     │
│    └── hikvisionEventProcessor.js                           │
│          ├── Match deviceEmployeeNo → User (Staff)          │
│          └── Match deviceEmployeeNo → Member (if enabled)   │
│                                                             │
│  hikvisionService.js (HTTP Digest wrapper)                  │
│    └── Pull cron (every 5 min fallback)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴──────────────┐
         ▼                            ▼
  StaffAttendances             MemberCheckIns
  DeviceAttendanceLogs (raw)
```

---

## Strategy

| Mode | Trigger | Tujuan |
|------|---------|--------|
| **Push** | Mesin kirim event ke server (real-time) | Primary |
| **Pull** | Cron job setiap 5 menit tarik data dari mesin | Fallback |

---

## Database Schema

### 1. `HikvisionDevices`

```sql
CREATE TABLE "HikvisionDevices" (
  "id"                  SERIAL PRIMARY KEY,
  "tenantId"            INTEGER NOT NULL REFERENCES "Tenants"("id"),
  "locationId"          INTEGER REFERENCES "Locations"("id"),
  "name"                VARCHAR(100) NOT NULL,
  "ipAddress"           VARCHAR(45) NOT NULL,
  "port"                INTEGER DEFAULT 80,
  "username"            VARCHAR(100) NOT NULL,
  "password"            VARCHAR(255) NOT NULL,   -- encrypted
  "serialNumber"        VARCHAR(100),
  "useForMemberCheckIn" BOOLEAN DEFAULT FALSE,   -- optional member check-in
  "isActive"            BOOLEAN DEFAULT TRUE,
  "lastSyncAt"          TIMESTAMP,
  "createdAt"           TIMESTAMP NOT NULL,
  "updatedAt"           TIMESTAMP NOT NULL,
  "deletedAt"           TIMESTAMP
);
```

### 2. `DeviceAttendanceLogs` (raw push/pull log)

```sql
CREATE TABLE "DeviceAttendanceLogs" (
  "id"                  SERIAL PRIMARY KEY,
  "tenantId"            INTEGER NOT NULL REFERENCES "Tenants"("id"),
  "deviceId"            INTEGER NOT NULL REFERENCES "HikvisionDevices"("id"),
  "deviceEmployeeNo"    VARCHAR(50) NOT NULL,    -- ID on the device
  "eventTime"           TIMESTAMP NOT NULL,
  "cardNo"              VARCHAR(50),
  "verifyMode"          VARCHAR(50),             -- fingerprint / card / face / etc.
  "rawPayload"          JSONB,                   -- full event JSON from device
  "processedAt"         TIMESTAMP,               -- null = unprocessed
  "matchedUserId"       INTEGER REFERENCES "Users"("id"),
  "matchedMemberId"     INTEGER REFERENCES "Members"("id"),
  "source"              VARCHAR(10) DEFAULT 'push', -- 'push' | 'pull'
  "createdAt"           TIMESTAMP NOT NULL
);
```

### 3. `StaffAttendances`

```sql
CREATE TABLE "StaffAttendances" (
  "id"                  SERIAL PRIMARY KEY,
  "tenantId"            INTEGER NOT NULL REFERENCES "Tenants"("id"),
  "userId"              INTEGER NOT NULL REFERENCES "Users"("id"),
  "deviceId"            INTEGER REFERENCES "HikvisionDevices"("id"),
  "logId"               INTEGER REFERENCES "DeviceAttendanceLogs"("id"),
  "checkInTime"         TIMESTAMP,
  "checkOutTime"        TIMESTAMP,
  "date"                DATE NOT NULL,
  "status"              VARCHAR(20) DEFAULT 'present', -- present | late | absent | half_day
  "notes"               TEXT,
  "createdAt"           TIMESTAMP NOT NULL,
  "updatedAt"           TIMESTAMP NOT NULL
);
```

### 4. Kolom tambahan di `Users`

```sql
ALTER TABLE "Users"
  ADD COLUMN "deviceEmployeeNo" VARCHAR(50);  -- mapping ke ID di mesin
```

### 5. Kolom tambahan di `Members` (opsional — jika useForMemberCheckIn=true)

```sql
ALTER TABLE "Members"
  ADD COLUMN "deviceEmployeeNo" VARCHAR(50);
```

---

## ISAPI Endpoints (Hikvision → Backend)

### Push Event dari Mesin
```
POST /api/v1/integrations/hikvision/event
Content-Type: application/json
Authorization: Digest ...

Body (contoh dari mesin):
{
  "Events": [{
    "employeeNoString": "1001",
    "time": "2026-02-19T08:30:00+07:00",
    "cardNo": "",
    "verifyMode": "fingerprint",
    "type": "attendanceCheck"
  }]
}
```

### Pull Data dari Mesin (backend → mesin)
```
GET http://{ip}:{port}/ISAPI/AccessControl/AcsEvent?format=json
Authorization: Digest username, realm, ...

Query params: startTime, endTime, eventType=196613 (attendance)
```

---

## Backend Endpoints Plan

| Method | Path | Deskripsi |
|--------|------|-----------|
| `POST` | `/integrations/hikvision/event` | Terima push dari mesin |
| `GET` | `/integrations/hikvision/devices` | List semua device |
| `POST` | `/integrations/hikvision/devices` | Tambah device baru |
| `PUT` | `/integrations/hikvision/devices/:id` | Update device |
| `DELETE` | `/integrations/hikvision/devices/:id` | Hapus device |
| `POST` | `/integrations/hikvision/devices/:id/sync` | Manual pull sync |
| `GET` | `/integrations/hikvision/devices/:id/test` | Test koneksi ke mesin |
| `GET` | `/gym/staff-attendance` | List staff attendance |
| `GET` | `/gym/staff-attendance/report` | Laporan kehadiran |
| `PATCH` | `/gym/staff-attendance/:id` | Update manual (koreksi) |

---

## File Structure (saat implementasi)

```
src/
├── controllers/
│   └── integrations/
│       └── hikvision/
│           └── hikvisionController.js
├── routes/
│   └── integrations/
│       └── hikvision/
│           └── hikvision.routes.js
├── services/
│   ├── hikvisionService.js          # HTTP Digest wrapper (ISAPI calls)
│   └── hikvisionEventProcessor.js  # matching logic → StaffAttendance / CheckIn
├── models/
│   ├── hikvisionDevice.js
│   ├── deviceAttendanceLog.js
│   └── staffAttendance.js
├── migrations/
│   ├── 20260219140001-create-hikvision-devices.js
│   ├── 20260219140002-create-device-attendance-logs.js
│   ├── 20260219140003-create-staff-attendances.js
│   └── 20260219140004-add-deviceEmployeeNo-to-users.js
└── jobs/
    └── hikvisionSyncJob.js          # cron setiap 5 menit
```

---

## Dependencies

```bash
npm install digest-fetch              # HTTP Digest Auth untuk ISAPI
npm install node-cron                 # (sudah ada) untuk pull cron
```

---

## Konfigurasi Mesin

Di panel admin Hikvision (web browser ke IP mesin):

1. **Enable Event Push**
   - Network → Advanced Settings → HTTP Listening
   - URL: `http://{server-ip}/api/v1/integrations/hikvision/event`
   - Method: POST

2. **Employee No sebagai identifier**
   - Pastikan setiap fingerprint/kartu di-enroll dengan Employee No
   - Employee No ini disimpan di kolom `deviceEmployeeNo` di tabel `Users`

3. **Waktu (NTP)**
   - Sinkronisasi waktu mesin ke NTP server agar timestamp akurat

---

## Matching Logic

```
Event masuk → deviceEmployeeNo
  └── Cari di Users.deviceEmployeeNo
        ├── Ketemu → catat di StaffAttendances
        │     ├── Jika hari ini belum ada record → set checkInTime
        │     └── Jika sudah ada checkIn → set checkOutTime
        └── Tidak ketemu:
              └── Jika device.useForMemberCheckIn = true
                    └── Cari di Members.deviceEmployeeNo
                          ├── Ketemu → catat di MemberCheckIns
                          └── Tidak ketemu → log sebagai unmatched
```

---

## CASL Permissions (tambahan)

```javascript
// Manager/Admin
can(['read', 'create', 'update', 'delete'], 'HikvisionDevice');
can(['read'], 'StaffAttendance');
can(['update'], 'StaffAttendance');   // koreksi manual

// Super Admin
can('manage', 'HikvisionDevice');
can('manage', 'StaffAttendance');
```

---

## Implementation Checklist

### Phase 1: Setup & Devices
- [ ] `npm install digest-fetch`
- [ ] Migration: `HikvisionDevices`
- [ ] Migration: `DeviceAttendanceLogs`
- [ ] Migration: `StaffAttendances`
- [ ] Migration: add `deviceEmployeeNo` to `Users`
- [ ] Migration: add `deviceEmployeeNo` to `Members` (optional)
- [ ] Model: `HikvisionDevice`
- [ ] Model: `DeviceAttendanceLog`
- [ ] Model: `StaffAttendance`
- [ ] Update `src/models/index.js` associations

### Phase 2: Service Layer
- [ ] `hikvisionService.js` — HTTP Digest client untuk pull ISAPI
- [ ] `hikvisionEventProcessor.js` — matching + write StaffAttendance / CheckIn

### Phase 3: Controller & Routes
- [ ] `hikvisionController.js` — push receiver + device CRUD + manual sync
- [ ] `staffAttendanceController.js` — list, report, manual edit
- [ ] Routes: `/integrations/hikvision` + `/gym/staff-attendance`
- [ ] Update `src/routes/index.js`

### Phase 4: Background Job
- [ ] `hikvisionSyncJob.js` — cron setiap 5 menit, pull dari semua active devices
- [ ] Register job di `src/jobs/index.js`

### Phase 5: Security & Polish
- [ ] Enkripsi password device di database (bcrypt atau AES)
- [ ] CASL permissions for new models
- [ ] Run `npm run generate:routes`
- [ ] Run `npm run sync:features` jika ada feature flag baru

### Phase 6: Konfigurasi Mesin
- [ ] Set Employee No untuk setiap staff di mesin
- [ ] Isi `deviceEmployeeNo` di tabel `Users` untuk setiap staff
- [ ] Set push URL di mesin ke server
- [ ] Test push event manual
- [ ] Verifikasi data masuk di `DeviceAttendanceLogs`

---

## Notes

- **Deferred**: Implementasi ditunda sampai mesin fisik aktif dan dapat diakses via jaringan
- **IP Mesin**: Pastikan mesin dan server berada di jaringan yang sama, atau ada port forwarding
- **Timezone**: Mesin Hikvision menggunakan ISO 8601 dengan offset, pastikan parsing dengan `new Date()` yang benar
- **Duplicate Prevention**: Cek duplikat di `DeviceAttendanceLogs` berdasarkan `(deviceId, deviceEmployeeNo, eventTime)` sebelum insert
