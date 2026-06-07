# Frontend Integration — Device Employee Management

Base URL: `/api/v1/integrations/hikvision`  
Auth: `Authorization: Bearer <token>`  
Roles: admin, owner = full access

---

## Daftar Isi

1. [Konsep & Arsitektur](#konsep--arsitektur)
2. [Tambah Employee ke Device](#tambah-employee-ke-device)
3. [List Employee di Device](#list-employee-di-device)
4. [Hapus Employee dari Device](#hapus-employee-dari-device)
5. [Sync Employee dari Device ke Database](#sync-employee-dari-device-ke-database)
6. [Device Employee (Database Records)](#device-employee-database-records)
7. [Staff Mapping](#staff-mapping)
8. [Fingerprint Enrollment](#fingerprint-enrollment)
9. [Hapus Fingerprint](#hapus-fingerprint)
10. [Data Types](#data-types)
11. [Contoh Alur Frontend](#contoh-alur-frontend)
12. [Error Handling](#error-handling)

---

## Konsep & Arsitektur

```
┌────────────────────────────────────────────────────────────────┐
│                      EMPLOYEE LIFECYCLE                        │
│                                                                │
│  ┌─────────────┐     ┌──────────────┐     ┌───────────────┐   │
│  │  1. Tambah   │ ──▶ │ 2. Mapping   │ ──▶ │ 3. Enroll     │   │
│  │  ke Device   │     │  ke Staff    │     │  Fingerprint  │   │
│  └─────────────┘     └──────────────┘     └───────────────┘   │
│                                                                │
│  POST /devices/:id     PUT /staff-mapping    POST /devices/:id │
│  /employees             /:userId             /employees/:no   │
│                                              /enroll-finger..  │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐    │
│  │               DATABASE (DeviceEmployees)               │    │
│  │  ┌───────────┬──────────┬──────┬──────────────────┐    │    │
│  │  │ deviceId  │ empNo    │ name │ hasFingerprint    │    │    │
│  │  ├───────────┼──────────┼──────┼──────────────────┤    │    │
│  │  │ uuid-dev1 │ 1001     │ Budi │ true             │    │    │
│  │  │ uuid-dev1 │ 1002     │ Ani  │ false (belum)    │    │    │
│  │  └───────────┴──────────┴──────┴──────────────────┘    │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

**Dua sumber data:**
- **Device** — employee terdaftar secara fisik di hardware Hikvision
- **Database** (`DeviceEmployees` table) — mirror dari data device + mapping ke User

Saat `POST /devices/:id/employees` dipanggil:
1. Employee ditambahkan ke device fisik via ISAPI
2. Record otomatis disimpan ke tabel `DeviceEmployees` di database
3. Jika `userId` disertakan, field `deviceEmployeeNo` di `Users` juga ter-update

---

## Tambah Employee ke Device

Menambahkan employee ke device fisik **dan** menyimpan ke database.

```
POST /api/v1/integrations/hikvision/devices/:id/employees
Authorization: Bearer <token>
Content-Type: application/json
```

**Request body:**

```json
{
  "employeeNo": "1001",
  "name": "Budi Santoso",
  "userId": "uuid-user-budi"
}
```

| Field        | Type   | Required | Keterangan                                    |
|-------------|--------|----------|-----------------------------------------------|
| `employeeNo` | string | ✅       | Nomor unik di device (disarankan: 1001, 1002) |
| `name`       | string | ❌       | Nama yang ditampilkan di device               |
| `userId`     | UUID   | ❌       | Link ke User — auto-set `deviceEmployeeNo`    |

**Response (200):**

```json
{
  "success": true,
  "message": "Employee added to device",
  "data": {
    "id": "uuid-device-employee",
    "tenantId": "uuid-tenant",
    "deviceId": "uuid-device",
    "userId": "uuid-user-budi",
    "employeeNo": "1001",
    "name": "Budi Santoso",
    "hasFingerprint": false,
    "fingerprintCount": 0,
    "status": "active",
    "lastSyncAt": "2026-02-20T10:00:00.000Z"
  },
  "deviceResult": {
    "success": true,
    "status": 200
  }
}
```

---

## List Employee di Device

Mengambil daftar employee langsung dari device hardware, diperkaya dengan data dari database.

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
      "userType": "normal",
      "numOfFP": 1,
      "dbRecord": {
        "id": "uuid-device-employee",
        "userId": "uuid-user-budi",
        "user": {
          "id": "uuid-user-budi",
          "firstName": "Budi",
          "lastName": "Santoso",
          "email": "budi@gym.com"
        },
        "hasFingerprint": true,
        "fingerprintCount": 1,
        "status": "active"
      }
    },
    {
      "employeeNo": "1002",
      "name": "Ani Trainer",
      "userType": "normal",
      "numOfFP": 0,
      "dbRecord": null
    }
  ]
}
```

**Catatan tentang `dbRecord`:**
- `null` → employee ada di device tapi belum di-sync ke DB (panggil `POST /sync-employees`)
- Object → ada record di DB, bisa lihat `user`, `hasFingerprint`, dll

---

## Hapus Employee dari Device

Menghapus employee dari device hardware **dan** dari database.

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

> ⚠️ Ini juga menghapus **semua fingerprint** karyawan tersebut dari device.

---

## Sync Employee dari Device ke Database

Untuk device yang sudah punya employee terdaftar sebelum integrasi ini, gunakan sync untuk mengimpor semua employee ke database.

```
POST /api/v1/integrations/hikvision/devices/:id/sync-employees
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "Synced 5 employees from device",
  "stats": {
    "total": 5,
    "created": 3,
    "updated": 2
  }
}
```

**Apa yang dilakukan:**
1. Membaca semua employee dari device via ISAPI
2. Upsert ke tabel `DeviceEmployees` (buat baru atau update jika sudah ada)
3. Auto-match ke User berdasarkan `deviceEmployeeNo` yang sama
4. Auto-detect jumlah fingerprint (`numOfFP`) dari device
5. Employee yang sudah tidak ada di device ditandai `status: "inactive"`

---

## Device Employee (Database Records)

### List Semua Device Employee (Dari Database)

Ambil semua record device employee dari database (lintas device).

```
GET /api/v1/integrations/hikvision/device-employees
Authorization: Bearer <token>
```

**Query parameters:**

| Param           | Type    | Required | Keterangan                    |
|-----------------|---------|----------|-------------------------------|
| `deviceId`      | UUID    | ❌       | Filter per device            |
| `userId`        | UUID    | ❌       | Filter per user              |
| `status`        | string  | ❌       | `active` \| `inactive`       |
| `hasFingerprint`| boolean | ❌       | `true` \| `false`            |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-de-1",
      "tenantId": "uuid-tenant",
      "deviceId": "uuid-device",
      "userId": "uuid-user-budi",
      "employeeNo": "1001",
      "name": "Budi Santoso",
      "hasFingerprint": true,
      "fingerprintCount": 1,
      "status": "active",
      "lastSyncAt": "2026-02-20T10:00:00.000Z",
      "user": {
        "id": "uuid-user-budi",
        "firstName": "Budi",
        "lastName": "Santoso",
        "email": "budi@gym.com",
        "deviceEmployeeNo": "1001"
      },
      "device": {
        "id": "uuid-device",
        "name": "Fingerprint Utama",
        "ipAddress": "192.168.1.188"
      }
    }
  ]
}
```

---

### Update Device Employee Record

Update mapping user, nama, atau status.

```
PUT /api/v1/integrations/hikvision/device-employees/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request body (partial):**

```json
{
  "userId": "uuid-user-budi",
  "name": "Budi S.",
  "status": "active"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid-de-1",
    "employeeNo": "1001",
    "name": "Budi S.",
    "userId": "uuid-user-budi",
    "hasFingerprint": true,
    "fingerprintCount": 1,
    "status": "active",
    "user": {
      "id": "uuid-user-budi",
      "firstName": "Budi",
      "lastName": "Santoso",
      "email": "budi@gym.com"
    },
    "device": {
      "id": "uuid-device",
      "name": "Fingerprint Utama",
      "ipAddress": "192.168.1.188"
    }
  }
}
```

> Jika `userId` diisi, `Users.deviceEmployeeNo` juga otomatis ter-update.

---

## Staff Mapping

Mapping antara User (staff) dan `deviceEmployeeNo` — tanpa harus menyentuh device. Berguna untuk mapping di level database saja.

### List Staff Mapping

```
GET /api/v1/integrations/hikvision/staff-mapping
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-user-budi",
      "firstName": "Budi",
      "lastName": "Santoso",
      "email": "budi@gym.com",
      "deviceEmployeeNo": "1001",
      "role": { "id": "uuid-role", "name": "admin" }
    },
    {
      "id": "uuid-user-ani",
      "firstName": "Ani",
      "lastName": "Wijaya",
      "email": "ani@gym.com",
      "deviceEmployeeNo": null,
      "role": { "id": "uuid-role", "name": "staff" }
    }
  ],
  "summary": {
    "total": 5,
    "mapped": 3,
    "unmapped": 2
  }
}
```

---

### Assign Employee No ke Staff

```
PUT /api/v1/integrations/hikvision/staff-mapping/:userId
Authorization: Bearer <token>
Content-Type: application/json
```

**Request body:**

```json
{
  "deviceEmployeeNo": "1001"
}
```

**Response:**

```json
{
  "success": true,
  "message": "deviceEmployeeNo \"1001\" assigned to Budi Santoso",
  "data": {
    "id": "uuid-user-budi",
    "firstName": "Budi",
    "lastName": "Santoso",
    "email": "budi@gym.com",
    "deviceEmployeeNo": "1001"
  }
}
```

**Error duplikat:**
```json
{
  "success": false,
  "error": "deviceEmployeeNo \"1001\" is already assigned to Ani Wijaya"
}
```

> ⚠️ **userId harus valid UUID.** Jika frontend mengirim `undefined` sebagai userId, akan mendapat error validasi.

---

### Hapus Mapping Staff

```
DELETE /api/v1/integrations/hikvision/staff-mapping/:userId
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "deviceEmployeeNo removed from Budi Santoso"
}
```

---

## Fingerprint Enrollment

### Mulai Enrollment

Mengaktifkan mode enrollment di device — staff harus tempel jari 3x di scanner.

```
POST /api/v1/integrations/hikvision/devices/:id/employees/:employeeNo/enroll-fingerprint
Authorization: Bearer <token>
Content-Type: application/json
```

**Request body (opsional):**

```json
{
  "fingerNo": 1,
  "fingerType": "normalFP"
}
```

| Field       | Type   | Default      | Keterangan                    |
|-------------|--------|--------------|-------------------------------|
| `fingerNo`  | int    | `1`          | Slot jari 1-10               |
| `fingerType`| string | `"normalFP"` | Tipe fingerprint              |

**Response sukses:**

```json
{
  "success": true,
  "message": "Fingerprint enrollment started. Please place finger on the device scanner (3 times).",
  "enrollmentLock": {
    "locked": true,
    "expiresInSeconds": 120,
    "note": "Device sync is paused during enrollment. Lock auto-expires after 2 minutes."
  },
  "instructions": [
    "1. Device screen will show fingerprint enrollment prompt",
    "2. Employee must place the same finger on the scanner 3 times",
    "3. Device will beep/confirm when enrollment is complete",
    "4. Finger slot 1 of 10 will be used (each employee can have up to 10 fingerprints)",
    "5. After enrollment, call DELETE /enrollment-lock to resume sync (or wait 2 min auto-expire)"
  ]
}
```

**Response gagal (employee belum terdaftar di device):**

```json
{
  "success": false,
  "message": "Employee 1001 is not registered on the device. Add the employee first via POST /devices/uuid-device/employees.",
  "step": "setup",
  "hint": "Employee 1001 is not registered on the device..."
}
```

**Alur UI yang disarankan:**

```
[Klik "Enroll Fingerprint"]
       │
       ▼
POST /devices/:id/employees/:no/enroll-fingerprint
       │
       ▼ response sukses
Tampilkan modal:
┌─────────────────────────────────────────────┐
│  🖐️  Enrollment Fingerprint                │
│                                             │
│  Silakan tempelkan jari di scanner          │
│  pada device 3 kali.                        │
│                                             │
│  ⏱️  Timeout: 120 detik                     │
│                                             │
│  [Tutup]                 [Cancel Lock]      │
└─────────────────────────────────────────────┘
       │
       ▼ (setelah ~30 detik atau user tutup)
Optional: DELETE /devices/:id/enrollment-lock
```

---

### Release Enrollment Lock

Jika enrollment sudah selesai atau dibatalkan, lepaskan lock agar sync berjalan kembali.

```
DELETE /api/v1/integrations/hikvision/devices/:id/enrollment-lock
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "Enrollment lock released. Device sync will resume on next cycle."
}
```

---

## Hapus Fingerprint

Menghapus fingerprint dari device tanpa menghapus employee.

```
DELETE /api/v1/integrations/hikvision/devices/:id/employees/:employeeNo/fingerprint
Authorization: Bearer <token>
Content-Type: application/json
```

**Request body (opsional — hapus spesifik):**

```json
{
  "fingerPrintIDs": [1, 2]
}
```

> Tanpa body → hapus **semua** fingerprint karyawan tersebut.

**Response:**

```json
{
  "success": true,
  "message": "All fingerprints deleted for employee 1001"
}
```

---

## Data Types

### DeviceEmployee

| Field            | Type    | Keterangan                              |
|------------------|---------|-----------------------------------------|
| `id`             | UUID    | Primary key (database)                  |
| `deviceId`       | UUID    | FK ke HikvisionDevices                  |
| `userId`         | UUID?   | FK ke Users (null jika belum di-mapping) |
| `employeeNo`     | string  | Nomor employee di device                |
| `name`           | string  | Nama di device                          |
| `hasFingerprint` | boolean | Ada fingerprint terdaftar?              |
| `fingerprintCount`| int    | Jumlah fingerprint (max 10)             |
| `status`         | string  | `active` \| `inactive`                  |
| `lastSyncAt`     | datetime| Terakhir sync dari device               |

### Employee No Convention

```
Staff   → 1001, 1002, 1003, ...
Member  → 2001, 2002, 2003, ... (jika device untuk member check-in)
```

---

## Contoh Alur Frontend

### 1. Setup Employee Baru (Full Flow)

```javascript
// Step 1: Tambah employee ke device + DB
const { data: deviceEmp } = await api.post(
  `/integrations/hikvision/devices/${deviceId}/employees`,
  {
    employeeNo: '1003',
    name: 'Sari Receptionist',
    userId: selectedUser.id  // auto-mapping
  }
);

// Step 2: Enroll fingerprint
const { data: enrollResult } = await api.post(
  `/integrations/hikvision/devices/${deviceId}/employees/1003/enroll-fingerprint`,
  { fingerNo: 1 }
);

// Step 3: Tampilkan modal "Tempelkan jari di scanner..."
showEnrollmentModal(enrollResult);

// Step 4: Setelah selesai, release lock
await api.delete(`/integrations/hikvision/devices/${deviceId}/enrollment-lock`);
```

### 2. Import Employee dari Device Existing

```javascript
// Device sudah punya 5 employee, import ke DB
const { data } = await api.post(
  `/integrations/hikvision/devices/${deviceId}/sync-employees`
);
// data.stats = { total: 5, created: 5, updated: 0 }

// Lalu mapping manual ke user
const employees = await api.get('/integrations/hikvision/device-employees', {
  params: { deviceId }
});

// Untuk tiap employee yang belum ada userId:
for (const emp of employees.data.data) {
  if (!emp.userId) {
    // Tampilkan dropdown pilih User
    // Lalu update:
    await api.put(`/integrations/hikvision/device-employees/${emp.id}`, {
      userId: selectedUserId
    });
  }
}
```

### 3. Tampilkan Tabel Employee

```javascript
// Ambil dari DB (lebih reliable dari device)
const { data } = await api.get('/integrations/hikvision/device-employees', {
  params: { deviceId, status: 'active' }
});

// data.data = array of DeviceEmployee with user & device info
// Render tabel:
// | No | Employee No | Nama         | Staff       | Fingerprint | Action           |
// |----|------------|--------------|-------------|-------------|------------------|
// | 1  | 1001       | Budi Santoso | Budi S.     | ✅ (1)      | [Enroll] [Delete]|
// | 2  | 1002       | Ani Trainer  | Ani W.      | ❌ (0)      | [Enroll] [Delete]|
// | 3  | 1003       | -            | (not linked)| ❌ (0)      | [Link]  [Delete] |
```

### 4. Hapus Employee

```javascript
// Hapus dari device + DB
await api.delete(
  `/integrations/hikvision/devices/${deviceId}/employees/${employeeNo}`
);
// Employee dan semua fingerprint-nya terhapus dari device dan database
```

---

## Error Handling

| HTTP | Kode               | Kapan                                            |
|------|---------------------|--------------------------------------------------|
| 400  | `VALIDATION_ERROR` | Field wajib kosong, UUID invalid, duplikat        |
| 401  | `UNAUTHORIZED`     | Token expired/tidak ada                          |
| 403  | `FORBIDDEN`        | Role tidak punya akses                           |
| 404  | `NOT_FOUND`        | Device/employee/user tidak ditemukan             |
| 502  | -                  | Device tidak bisa dijangkau (timeout/network)    |

**Error format:**

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid userId: \"undefined\". Must be a valid UUID."
}
```

---

## Ringkasan Endpoint

| Method   | Path                                             | Fungsi                                |
|----------|--------------------------------------------------|---------------------------------------|
| `POST`   | `/devices/:id/employees`                         | Tambah employee ke device + DB        |
| `GET`    | `/devices/:id/employees`                         | List employee dari device (+ DB info) |
| `DELETE` | `/devices/:id/employees/:employeeNo`             | Hapus employee dari device + DB       |
| `POST`   | `/devices/:id/sync-employees`                    | Sync employee device → DB             |
| `GET`    | `/device-employees`                              | List semua device employee dari DB    |
| `PUT`    | `/device-employees/:id`                          | Update record (link user, dll)        |
| `GET`    | `/staff-mapping`                                 | List staff + mapping status           |
| `PUT`    | `/staff-mapping/:userId`                         | Assign deviceEmployeeNo ke user       |
| `DELETE` | `/staff-mapping/:userId`                         | Hapus mapping deviceEmployeeNo        |
| `POST`   | `/devices/:id/employees/:no/enroll-fingerprint`  | Mulai enrollment fingerprint          |
| `DELETE` | `/devices/:id/employees/:no/fingerprint`         | Hapus fingerprint                     |
| `DELETE` | `/devices/:id/enrollment-lock`                   | Release enrollment lock               |

> Semua endpoint menggunakan prefix `/api/v1/integrations/hikvision`  
> Semua membutuhkan `Authorization: Bearer <token>` header  
> Feature gate: module `gym` harus aktif di subscription plan
