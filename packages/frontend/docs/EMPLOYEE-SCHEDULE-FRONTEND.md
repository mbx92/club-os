# Frontend Integration — Employee Schedules

Base URL: `/api/v1/gym/employee-schedules`  
Auth: `Authorization: Bearer <token>`  
Roles: admin, owner = full CRUD | manager = read + create + update (no delete)

---

## Daftar Isi

1. [Konsep & Arsitektur](#konsep--arsitektur)
2. [Effective Schedule (Merged View)](#effective-schedule-merged-view)
3. [Templates — Jadwal Mingguan Berulang](#templates--jadwal-mingguan-berulang)
4. [Overrides — Perubahan Tanggal Spesifik](#overrides--perubahan-tanggal-spesifik)
5. [Data Types & Enums](#data-types--enums)
6. [Contoh Alur Frontend](#contoh-alur-frontend)
7. [Error Handling](#error-handling)

---

## Konsep & Arsitektur

Sistem jadwal karyawan menggunakan **dua layer**:

```
┌─────────────────────────────────────────────────────┐
│                  EFFECTIVE SCHEDULE                  │
│            (GET / — merged view per hari)            │
│                                                     │
│   ┌──────────────────┐    ┌──────────────────────┐  │
│   │    TEMPLATES      │    │     OVERRIDES        │  │
│   │  (recurring week) │    │  (date-specific)     │  │
│   │                   │    │                      │  │
│   │ Sen: 08:00-17:00  │    │ 2026-02-25: LIBUR   │  │
│   │ Sel: 08:00-17:00  │    │ 2026-03-01: 10-19   │  │
│   │ Sab: OFF          │    │                      │  │
│   │ Min: OFF          │    │                      │  │
│   └──────────────────┘    └──────────────────────┘  │
│                                                     │
│   Override menang atas Template untuk tanggal yang   │
│   sama. Jika tidak ada override → pakai template.   │
└─────────────────────────────────────────────────────┘
```

**Kapan pakai apa:**
- **Template**: Jadwal default mingguan karyawan (sekali set, berlaku terus)
- **Override**: Libur mendadak, ganti shift untuk tanggal tertentu, lembur khusus

---

## Effective Schedule (Merged View)

Endpoint utama untuk menampilkan jadwal di kalender/tabel. Menggabungkan templates + overrides otomatis.

### GET `/`

Ambil jadwal efektif untuk rentang tanggal.

```
GET /api/v1/gym/employee-schedules?startDate=2026-02-16&endDate=2026-02-22
Authorization: Bearer <token>
```

**Query parameters:**

| Param       | Type   | Required | Keterangan                          |
|-------------|--------|----------|-------------------------------------|
| `startDate` | string | ✅       | Format `YYYY-MM-DD`                 |
| `endDate`   | string | ✅       | Format `YYYY-MM-DD`                 |
| `userId`    | UUID   | ❌       | Filter jadwal untuk karyawan tertentu |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "date": "2026-02-16",
      "dayOfWeek": 1,
      "dayName": "Monday",
      "userId": "uuid-user-1",
      "user": {
        "id": "uuid-user-1",
        "firstName": "Ahmad",
        "lastName": "Trainer",
        "email": "ahmad@gym.com",
        "deviceEmployeeNo": "1001"
      },
      "shiftStart": "08:00:00",
      "shiftEnd": "17:00:00",
      "isOff": false,
      "notes": null,
      "source": "template",
      "templateId": "uuid-template-1"
    },
    {
      "date": "2026-02-17",
      "dayOfWeek": 2,
      "dayName": "Tuesday",
      "userId": "uuid-user-1",
      "user": { "..." : "..." },
      "shiftStart": null,
      "shiftEnd": null,
      "isOff": true,
      "notes": "Izin sakit",
      "source": "override",
      "overrideId": "uuid-override-1"
    }
  ],
  "meta": {
    "startDate": "2026-02-16",
    "endDate": "2026-02-22",
    "templateCount": 5,
    "overrideCount": 1
  }
}
```

**Catatan tentang `source`:**
- `"template"` → jadwal berasal dari template mingguan (default)
- `"override"` → jadwal ditimpa oleh override untuk tanggal itu

---

## Templates — Jadwal Mingguan Berulang

### GET `/templates`

List semua template jadwal mingguan.

```
GET /api/v1/gym/employee-schedules/templates
GET /api/v1/gym/employee-schedules/templates?userId=uuid-user-1
Authorization: Bearer <token>
```

**Query parameters:**

| Param    | Type | Required | Keterangan              |
|----------|------|----------|-------------------------|
| `userId` | UUID | ❌       | Filter by karyawan      |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-template-1",
      "tenantId": "uuid-tenant",
      "userId": "uuid-user-1",
      "dayOfWeek": 1,
      "shiftStart": "08:00:00",
      "shiftEnd": "17:00:00",
      "isOff": false,
      "notes": null,
      "createdAt": "2026-02-20T10:00:00.000Z",
      "updatedAt": "2026-02-20T10:00:00.000Z",
      "user": {
        "id": "uuid-user-1",
        "firstName": "Ahmad",
        "lastName": "Trainer",
        "email": "ahmad@gym.com",
        "deviceEmployeeNo": "1001"
      }
    },
    {
      "id": "uuid-template-2",
      "tenantId": "uuid-tenant",
      "userId": "uuid-user-1",
      "dayOfWeek": 6,
      "shiftStart": null,
      "shiftEnd": null,
      "isOff": true,
      "notes": "Weekend off",
      "user": { "..." : "..." }
    }
  ]
}
```

---

### POST `/templates`

Buat atau update (upsert) jadwal mingguan untuk satu karyawan. Kirim semua hari sekaligus — jika sudah ada, akan di-update.

```
POST /api/v1/gym/employee-schedules/templates
Authorization: Bearer <token>
Content-Type: application/json
```

**Request body:**

```json
{
  "userId": "uuid-user-1",
  "schedules": [
    {
      "dayOfWeek": 1,
      "shiftStart": "08:00",
      "shiftEnd": "17:00",
      "isOff": false,
      "notes": null
    },
    {
      "dayOfWeek": 2,
      "shiftStart": "08:00",
      "shiftEnd": "17:00",
      "isOff": false,
      "notes": null
    },
    {
      "dayOfWeek": 3,
      "shiftStart": "08:00",
      "shiftEnd": "17:00",
      "isOff": false,
      "notes": null
    },
    {
      "dayOfWeek": 4,
      "shiftStart": "08:00",
      "shiftEnd": "17:00",
      "isOff": false,
      "notes": null
    },
    {
      "dayOfWeek": 5,
      "shiftStart": "08:00",
      "shiftEnd": "17:00",
      "isOff": false,
      "notes": null
    },
    {
      "dayOfWeek": 6,
      "shiftStart": null,
      "shiftEnd": null,
      "isOff": true,
      "notes": "Weekend off"
    },
    {
      "dayOfWeek": 0,
      "shiftStart": null,
      "shiftEnd": null,
      "isOff": true,
      "notes": "Weekend off"
    }
  ]
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "7 schedule template(s) saved",
  "data": [
    {
      "id": "uuid-template-1",
      "tenantId": "uuid-tenant",
      "userId": "uuid-user-1",
      "dayOfWeek": 1,
      "shiftStart": "08:00:00",
      "shiftEnd": "17:00:00",
      "isOff": false,
      "notes": null
    }
  ]
}
```

**Validasi:**
- `userId` wajib (UUID)
- `schedules` wajib (array, min 1 item)
- `dayOfWeek` wajib (0-6: 0=Minggu, 1=Senin, ..., 6=Sabtu)
- Jika `isOff: false` → `shiftStart` dan `shiftEnd` wajib
- Jika `isOff: true` → `shiftStart`/`shiftEnd` diabaikan (disimpan null)

---

### PUT `/templates/:id`

Update satu entry template jadwal.

```
PUT /api/v1/gym/employee-schedules/templates/uuid-template-1
Authorization: Bearer <token>
Content-Type: application/json
```

**Request body (partial update):**

```json
{
  "shiftStart": "09:00",
  "shiftEnd": "18:00",
  "notes": "Shift sore"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid-template-1",
    "dayOfWeek": 1,
    "shiftStart": "09:00:00",
    "shiftEnd": "18:00:00",
    "isOff": false,
    "notes": "Shift sore"
  }
}
```

---

### DELETE `/templates/:id`

Hapus satu entry template.

```
DELETE /api/v1/gym/employee-schedules/templates/uuid-template-1
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "Schedule template deleted"
}
```

---

### DELETE `/templates/user/:userId`

Hapus **semua** template jadwal untuk satu karyawan. Berguna saat karyawan resign atau reset jadwal total.

```
DELETE /api/v1/gym/employee-schedules/templates/user/uuid-user-1
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "7 schedule template(s) deleted for user uuid-user-1"
}
```

---

## Overrides — Perubahan Tanggal Spesifik

### GET `/overrides`

List override jadwal per tanggal.

```
GET /api/v1/gym/employee-schedules/overrides?startDate=2026-02-01&endDate=2026-02-28
GET /api/v1/gym/employee-schedules/overrides?userId=uuid-user-1
Authorization: Bearer <token>
```

**Query parameters:**

| Param       | Type   | Required | Keterangan              |
|-------------|--------|----------|-------------------------|
| `userId`    | UUID   | ❌       | Filter by karyawan      |
| `startDate` | string | ❌       | Format `YYYY-MM-DD`     |
| `endDate`   | string | ❌       | Format `YYYY-MM-DD`     |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-override-1",
      "tenantId": "uuid-tenant",
      "userId": "uuid-user-1",
      "date": "2026-02-25",
      "shiftStart": null,
      "shiftEnd": null,
      "isOff": true,
      "notes": "Cuti tahunan",
      "createdAt": "2026-02-20T10:00:00.000Z",
      "updatedAt": "2026-02-20T10:00:00.000Z",
      "user": {
        "id": "uuid-user-1",
        "firstName": "Ahmad",
        "lastName": "Trainer",
        "email": "ahmad@gym.com",
        "deviceEmployeeNo": "1001"
      }
    }
  ]
}
```

---

### POST `/overrides`

Buat override untuk tanggal tertentu (libur, ganti shift, dll).

```
POST /api/v1/gym/employee-schedules/overrides
Authorization: Bearer <token>
Content-Type: application/json
```

**Request body — Tandai libur:**

```json
{
  "userId": "uuid-user-1",
  "date": "2026-02-25",
  "isOff": true,
  "notes": "Cuti tahunan"
}
```

**Request body — Ganti shift:**

```json
{
  "userId": "uuid-user-1",
  "date": "2026-03-01",
  "shiftStart": "10:00",
  "shiftEnd": "19:00",
  "isOff": false,
  "notes": "Shift sore (tukar jadwal)"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid-override-new",
    "tenantId": "uuid-tenant",
    "userId": "uuid-user-1",
    "date": "2026-02-25",
    "shiftStart": null,
    "shiftEnd": null,
    "isOff": true,
    "notes": "Cuti tahunan"
  }
}
```

**Validasi:**
- `userId` dan `date` wajib
- Jika `isOff: false` → `shiftStart` dan `shiftEnd` wajib
- Tidak boleh duplikat (1 override per karyawan per tanggal)

**Error jika duplikat:**
```json
{
  "success": false,
  "error": "An override already exists for this employee on 2026-02-25"
}
```

---

### PUT `/overrides/:id`

Update override yang sudah ada.

```
PUT /api/v1/gym/employee-schedules/overrides/uuid-override-1
Authorization: Bearer <token>
Content-Type: application/json
```

**Request body (partial update):**

```json
{
  "isOff": false,
  "shiftStart": "10:00",
  "shiftEnd": "19:00",
  "notes": "Ternyata masuk, shift sore"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid-override-1",
    "date": "2026-02-25",
    "shiftStart": "10:00:00",
    "shiftEnd": "19:00:00",
    "isOff": false,
    "notes": "Ternyata masuk, shift sore"
  }
}
```

---

### DELETE `/overrides/:id`

Hapus override → tanggal tersebut kembali mengikuti template.

```
DELETE /api/v1/gym/employee-schedules/overrides/uuid-override-1
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "Schedule override deleted"
}
```

---

## Data Types & Enums

### dayOfWeek

| Value | Hari     |
|-------|----------|
| 0     | Sunday   |
| 1     | Monday   |
| 2     | Tuesday  |
| 3     | Wednesday|
| 4     | Thursday |
| 5     | Friday   |
| 6     | Saturday |

### Time Format

- Backend menerima: `"08:00"`, `"08:00:00"`, `"17:30"` (format `HH:mm` atau `HH:mm:ss`)
- Backend mengembalikan: `"08:00:00"` (selalu `HH:mm:ss`)

### source (di effective schedule)

| Value      | Arti                                                   |
|------------|--------------------------------------------------------|
| `template` | Jadwal dari template mingguan default                  |
| `override` | Jadwal ditimpa oleh override spesifik tanggal tersebut |

---

## Contoh Alur Frontend

### 1. Setup Jadwal Karyawan Baru

```
Halaman: Employee Schedule → Pilih karyawan → Set jadwal mingguan
```

```javascript
// Kirim 7 hari sekaligus
const response = await api.post('/gym/employee-schedules/templates', {
  userId: selectedEmployee.id,
  schedules: [
    { dayOfWeek: 1, shiftStart: '08:00', shiftEnd: '17:00', isOff: false },
    { dayOfWeek: 2, shiftStart: '08:00', shiftEnd: '17:00', isOff: false },
    { dayOfWeek: 3, shiftStart: '08:00', shiftEnd: '17:00', isOff: false },
    { dayOfWeek: 4, shiftStart: '08:00', shiftEnd: '17:00', isOff: false },
    { dayOfWeek: 5, shiftStart: '08:00', shiftEnd: '17:00', isOff: false },
    { dayOfWeek: 6, shiftStart: null, shiftEnd: null, isOff: true, notes: 'Weekend' },
    { dayOfWeek: 0, shiftStart: null, shiftEnd: null, isOff: true, notes: 'Weekend' },
  ]
});
```

### 2. Tampilkan Kalender Mingguan

```javascript
// Ambil jadwal efektif untuk minggu ini
const startOfWeek = '2026-02-16'; // Senin
const endOfWeek = '2026-02-22';   // Minggu

const { data } = await api.get('/gym/employee-schedules', {
  params: { startDate: startOfWeek, endDate: endOfWeek }
});

// data.data = array per hari per karyawan
// Group by user untuk tampilkan per baris di tabel
const byUser = {};
for (const entry of data.data) {
  if (!byUser[entry.userId]) byUser[entry.userId] = { user: entry.user, days: [] };
  byUser[entry.userId].days.push(entry);
}
```

### 3. Tandai Karyawan Libur Tanggal Tertentu

```javascript
// Klik tanggal di kalender → modal "Tandai Libur"
await api.post('/gym/employee-schedules/overrides', {
  userId: selectedEmployee.id,
  date: '2026-02-25',
  isOff: true,
  notes: 'Cuti tahunan'
});
```

### 4. Ganti Shift Untuk Hari Tertentu

```javascript
// Override shift tanpa mengganti template (hanya tanggal itu)
await api.post('/gym/employee-schedules/overrides', {
  userId: selectedEmployee.id,
  date: '2026-03-01',
  shiftStart: '10:00',
  shiftEnd: '19:00',
  isOff: false,
  notes: 'Tukar shift dengan Budi'
});
```

### 5. Batalkan Override (Kembali ke Template)

```javascript
// Hapus override → tanggal tersebut kembali ikut jadwal template
await api.delete(`/gym/employee-schedules/overrides/${overrideId}`);
```

### 6. Identifikasi Override di UI

```javascript
// Di kalender, beri warna berbeda untuk override vs template
for (const entry of effectiveSchedule) {
  if (entry.source === 'override') {
    // Warna kuning/oranye — jadwal di-override
    cell.className = 'schedule-override';
  } else {
    // Warna default — dari template
    cell.className = 'schedule-template';
  }

  if (entry.isOff) {
    cell.className += ' day-off';
    cell.textContent = 'OFF';
  } else {
    cell.textContent = `${entry.shiftStart.slice(0,5)} - ${entry.shiftEnd.slice(0,5)}`;
  }
}
```

---

## Error Handling

| HTTP | Kode                 | Kapan                                              |
|------|----------------------|-----------------------------------------------------|
| 400  | `VALIDATION_ERROR`   | Field wajib kosong, dayOfWeek invalid, duplikat override |
| 401  | `UNAUTHORIZED`       | Token expired atau tidak ada                        |
| 403  | `FORBIDDEN`          | Role tidak punya akses (misal: user biasa)          |
| 404  | `NOT_FOUND`          | Template/override ID tidak ditemukan                |

**Format error standard:**

```json
{
  "success": false,
  "error": "startDate and endDate are required"
}
```

---

## Ringkasan Endpoint

| Method   | Path                          | Fungsi                                  |
|----------|-------------------------------|-----------------------------------------|
| `GET`    | `/`                           | Jadwal efektif (merged) per rentang tanggal |
| `GET`    | `/templates`                  | List template jadwal mingguan           |
| `POST`   | `/templates`                  | Buat/update template (bulk upsert)      |
| `PUT`    | `/templates/:id`              | Update satu template                    |
| `DELETE` | `/templates/:id`              | Hapus satu template                     |
| `DELETE` | `/templates/user/:userId`     | Hapus semua template karyawan           |
| `GET`    | `/overrides`                  | List override per tanggal               |
| `POST`   | `/overrides`                  | Buat override tanggal spesifik          |
| `PUT`    | `/overrides/:id`              | Update override                         |
| `DELETE` | `/overrides/:id`              | Hapus override (kembali ke template)    |

> Semua endpoint menggunakan prefix `/api/v1/gym/employee-schedules`  
> Semua membutuhkan `Authorization: Bearer <token>` header  
> Feature gate: module `gym` harus aktif di subscription plan
