# Frontend Integration: Schedule Period (Penjadwalan Berbasis Periode)

> Dokumentasi endpoint **Schedule Period** — sistem penjadwalan karyawan berbasis periode.
> Setiap periode memiliki rentang tanggal (startDate – endDate), dan di setiap tanggal dalam periode bisa ada banyak staff yang in-charge.

---

## Daftar Isi

1. [Overview & Konsep](#overview--konsep)
2. [Schedule Period CRUD](#schedule-period-crud)
3. [Assign Staff ke Periode](#assign-staff-ke-periode)
4. [Generate dari Template](#generate-dari-template)
5. [Remove Assignment](#remove-assignment)
6. [Contoh Halaman Frontend](#contoh-halaman-frontend)
7. [Flow Lengkap](#flow-lengkap)
8. [Error Handling](#error-handling)

---

## Overview & Konsep

Sistem scheduling sekarang menggunakan **periode** sebagai container:

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────────────────────┐
│  Master Shift│     │ Schedule Template │     │       SCHEDULE PERIOD         │
│  (Pagi/Siang)│     │  (Mingguan)      │     │  name: "Maret 2026"          │
└──────┬───────┘     └────────┬─────────┘     │  startDate: 2026-03-01       │
       │                      │               │  endDate: 2026-03-31         │
       │                      │               │  status: active              │
       │                      ▼               │                               │
       │              ┌──── Generate ────────▶│  ASSIGNMENTS:                 │
       │              │  dari Template        │  ┌─────────────────────────┐  │
       │              │                       │  │ 01 Maret:               │  │
       └──────────────┼── Assign Manual ─────▶│  │  - Budi (Shift Pagi)   │  │
                      │                       │  │  - Ani  (Shift Siang)  │  │
                      │                       │  │  - Rudi (Shift Pagi)   │  │
                      │                       │  ├─────────────────────────┤  │
                      │                       │  │ 02 Maret:               │  │
                      │                       │  │  - Budi (Shift Siang)  │  │
                      │                       │  │  - Ani  (Shift Pagi)   │  │
                      │                       │  │  - Rudi (OFF)          │  │
                      │                       │  └─────────────────────────┘  │
                      │                       └───────────────────────────────┘
```

**Perbedaan dengan sistem lama:**
| Aspek | Sistem Lama | Sistem Periode |
|-------|-------------|----------------|
| Grouping | Tidak ada, schedule per tanggal lepas | Dikelompokkan dalam periode |
| Multi-staff/tanggal | 1 staff = 1 entry per tanggal | Banyak staff per tanggal ✅ |
| Status lifecycle | Tidak ada | draft → active → closed |
| Input | Per tanggal satu-satu | Input startDate + endDate sekali, assign banyak staff |

**Tetap dipakai:**
- Master Shift (Pagi, Siang, Middle, dll)
- Schedule Template (jadwal mingguan default per karyawan)

---

## Authentication

Semua endpoint memerlukan JWT token:

```
Authorization: Bearer <token>
```

Roles: **admin**, **owner** = full CRUD | **manager** = read + create + update (no delete)

---

## Schedule Period CRUD

**Base path**: `/api/v1/gym/schedule-periods`

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/` | List semua periode |
| GET | `/:id` | Detail periode + semua assignment |
| POST | `/` | Buat periode baru |
| PUT | `/:id` | Update info periode |
| DELETE | `/:id` | Hapus periode + semua assignment |
| PUT | `/:id/status` | Ubah status (draft/active/closed) |
| POST | `/:id/assign` | Assign staff ke tanggal-tanggal dalam periode |
| POST | `/:id/generate` | Generate assignment dari weekly template |
| DELETE | `/:id/assignments/:assignmentId` | Hapus satu assignment |
| DELETE | `/:id/assignments/user/:userId` | Hapus semua assignment satu staff |

---

### POST `/` — Buat Periode Baru

```http
POST /api/v1/gym/schedule-periods
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "name": "Maret 2026",
  "startDate": "2026-03-01",
  "endDate": "2026-03-31",
  "notes": "Jadwal reguler bulan Maret"
}
```

| Field | Type | Required | Keterangan |
|-------|------|----------|------------|
| `name` | string | ✅ | Nama periode (e.g. "Maret 2026", "Week 8") |
| `startDate` | string | ✅ | Format `YYYY-MM-DD` |
| `endDate` | string | ✅ | Format `YYYY-MM-DD` |
| `notes` | string | ❌ | Catatan opsional |

**Response:**

```json
{
  "success": true,
  "message": "Schedule period created",
  "data": {
    "id": "uuid-period-1",
    "tenantId": "uuid-tenant",
    "name": "Maret 2026",
    "startDate": "2026-03-01",
    "endDate": "2026-03-31",
    "status": "draft",
    "notes": "Jadwal reguler bulan Maret",
    "createdBy": "uuid-user-admin",
    "createdAt": "2026-02-21T08:00:00.000Z",
    "updatedAt": "2026-02-21T08:00:00.000Z"
  }
}
```

> ⚡ Periode baru selalu dimulai dengan status `draft`.

---

### GET `/` — List Semua Periode

```http
GET /api/v1/gym/schedule-periods?status=active&page=1&limit=10
Authorization: Bearer <token>
```

**Query Parameters:**

| Param | Type | Default | Keterangan |
|-------|------|---------|------------|
| `status` | string | — | Filter by status: `draft`, `active`, `closed` |
| `startDate` | string | — | Filter periode yang overlap dengan tanggal ini (≥) |
| `endDate` | string | — | Filter periode yang overlap dengan tanggal ini (≤) |
| `page` | number | 1 | Halaman |
| `limit` | number | 20 | Jumlah per halaman |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-period-1",
      "name": "Maret 2026",
      "startDate": "2026-03-01",
      "endDate": "2026-03-31",
      "status": "active",
      "notes": null,
      "createdBy": "uuid-admin",
      "creator": {
        "id": "uuid-admin",
        "firstName": "Admin",
        "lastName": "Manager"
      },
      "assignmentCount": 93,
      "staffCount": 5,
      "createdAt": "2026-02-21T08:00:00.000Z"
    },
    {
      "id": "uuid-period-2",
      "name": "Februari 2026",
      "startDate": "2026-02-01",
      "endDate": "2026-02-28",
      "status": "closed",
      "assignmentCount": 84,
      "staffCount": 4,
      "creator": { "..." : "..." }
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

> `assignmentCount` = total baris assignment | `staffCount` = jumlah staff unik

---

### GET `/:id` — Detail Periode + Assignments

```http
GET /api/v1/gym/schedule-periods/uuid-period-1
GET /api/v1/gym/schedule-periods/uuid-period-1?userId=uuid-user-1
Authorization: Bearer <token>
```

| Param | Type | Keterangan |
|-------|------|------------|
| `userId` | UUID | (opsional) Filter assignment untuk satu staff saja |

**Response:**

```json
{
  "success": true,
  "data": {
    "period": {
      "id": "uuid-period-1",
      "name": "Maret 2026",
      "startDate": "2026-03-01",
      "endDate": "2026-03-31",
      "status": "active",
      "notes": null,
      "creator": {
        "id": "uuid-admin",
        "firstName": "Admin",
        "lastName": "Manager"
      }
    },
    "assignments": [
      {
        "id": "uuid-assignment-1",
        "periodId": "uuid-period-1",
        "userId": "uuid-user-budi",
        "date": "2026-03-01",
        "shiftId": "uuid-shift-pagi",
        "shiftStart": "07:00:00",
        "shiftEnd": "15:00:00",
        "isOff": false,
        "notes": null,
        "user": {
          "id": "uuid-user-budi",
          "firstName": "Budi",
          "lastName": "Santoso",
          "email": "budi@gym.com",
          "deviceEmployeeNo": "1001"
        },
        "shift": {
          "id": "uuid-shift-pagi",
          "name": "Pagi",
          "code": "P",
          "shiftStart": "07:00:00",
          "shiftEnd": "15:00:00",
          "color": "#4CAF50"
        }
      },
      {
        "id": "uuid-assignment-2",
        "periodId": "uuid-period-1",
        "userId": "uuid-user-ani",
        "date": "2026-03-01",
        "shiftId": "uuid-shift-siang",
        "shiftStart": "14:00:00",
        "shiftEnd": "22:00:00",
        "isOff": false,
        "notes": null,
        "user": {
          "id": "uuid-user-ani",
          "firstName": "Ani",
          "lastName": "Lestari"
        },
        "shift": {
          "id": "uuid-shift-siang",
          "name": "Siang",
          "code": "S",
          "color": "#2196F3"
        }
      }
    ],
    "byDate": {
      "2026-03-01": [ "...assignment objects..." ],
      "2026-03-02": [ "...assignment objects..." ],
      "2026-03-03": [ "...assignment objects..." ]
    },
    "summary": {
      "totalAssignments": 93,
      "totalStaff": 5,
      "totalDates": 31
    }
  }
}
```

**Penjelasan response:**
- `assignments` — flat array semua assignment, sorted by date → userId
- `byDate` — assignment dikelompokkan per tanggal (convenience untuk render kalender)
- `summary` — ringkasan jumlah

---

### PUT `/:id` — Update Periode

```http
PUT /api/v1/gym/schedule-periods/uuid-period-1
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "name": "Maret 2026 (Revisi)",
  "notes": "Ditambah 1 staff baru"
}
```

Semua field opsional. Hanya field yang dikirim yang akan di-update.

---

### PUT `/:id/status` — Ubah Status Periode

```http
PUT /api/v1/gym/schedule-periods/uuid-period-1/status
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "status": "active"
}
```

| Status | Keterangan |
|--------|------------|
| `draft` | Sedang disiapkan, belum berlaku |
| `active` | Jadwal aktif/berlaku |
| `closed` | Arsip, periode sudah selesai |

**Response:**

```json
{
  "success": true,
  "message": "Period status changed to \"active\"",
  "data": { "..." : "...period object..." }
}
```

---

### DELETE `/:id` — Hapus Periode

```http
DELETE /api/v1/gym/schedule-periods/uuid-period-1
Authorization: Bearer <token>
```

> ⚠️ Menghapus periode akan menghapus **semua assignment** di dalamnya (cascade delete).

---

## Assign Staff ke Periode

### POST `/:id/assign` — Assign Staff

```http
POST /api/v1/gym/schedule-periods/uuid-period-1/assign
Content-Type: application/json
Authorization: Bearer <token>
```

Ada **2 mode** input:

#### Mode 1: Per-Date (Detail per Tanggal)

Setiap staff diberikan array `dates` dengan shift spesifik per tanggal:

```json
{
  "assignments": [
    {
      "userId": "uuid-user-budi",
      "dates": [
        { "date": "2026-03-01", "shiftId": "uuid-shift-pagi" },
        { "date": "2026-03-02", "shiftId": "uuid-shift-siang" },
        { "date": "2026-03-03", "isOff": true },
        { "date": "2026-03-04", "shiftId": "uuid-shift-pagi", "notes": "Ganti shift" }
      ]
    },
    {
      "userId": "uuid-user-ani",
      "dates": [
        { "date": "2026-03-01", "shiftId": "uuid-shift-siang" },
        { "date": "2026-03-02", "shiftId": "uuid-shift-pagi" },
        { "date": "2026-03-03", "shiftId": "uuid-shift-siang" }
      ]
    }
  ]
}
```

| Field | Type | Required | Keterangan |
|-------|------|----------|------------|
| `assignments[].userId` | UUID | ✅ | ID karyawan |
| `assignments[].dates[].date` | string | ✅ | Tanggal `YYYY-MM-DD` (harus dalam range periode) |
| `assignments[].dates[].shiftId` | UUID | Conditional | ID master shift (wajib jika bukan `isOff`) |
| `assignments[].dates[].isOff` | boolean | ❌ | `true` = hari libur |
| `assignments[].dates[].notes` | string | ❌ | Catatan untuk tanggal ini |

#### Mode 2: Uniform (Shift Seragam untuk Semua Tanggal)

Satu shift diterapkan ke semua tanggal dalam periode, dengan hari libur opsional:

```json
{
  "assignments": [
    {
      "userId": "uuid-user-budi",
      "shiftId": "uuid-shift-pagi",
      "offDays": [0, 6]
    },
    {
      "userId": "uuid-user-ani",
      "shiftId": "uuid-shift-siang",
      "offDays": [0]
    }
  ]
}
```

| Field | Type | Required | Keterangan |
|-------|------|----------|------------|
| `assignments[].userId` | UUID | ✅ | ID karyawan |
| `assignments[].shiftId` | UUID | ✅ | ID master shift untuk semua tanggal |
| `assignments[].offDays` | number[] | ❌ | Hari libur: `0`=Minggu, `1`=Senin, ..., `6`=Sabtu |

**Response (kedua mode):**

```json
{
  "success": true,
  "message": "25 schedule(s) assigned, 6 day(s) off",
  "stats": {
    "created": 25,
    "offCount": 6,
    "employees": 2,
    "periodDays": 31
  }
}
```

> ℹ️ Jika staff sudah punya assignment di tanggal yang sama dalam periode ini, data akan di-**upsert** (update, bukan duplikat).

#### Mode Campuran

Bisa mix Mode 1 dan Mode 2 dalam satu request:

```json
{
  "assignments": [
    {
      "userId": "uuid-user-budi",
      "shiftId": "uuid-shift-pagi",
      "offDays": [0, 6]
    },
    {
      "userId": "uuid-user-ani",
      "dates": [
        { "date": "2026-03-01", "shiftId": "uuid-shift-siang" },
        { "date": "2026-03-02", "shiftId": "uuid-shift-pagi" }
      ]
    }
  ]
}
```

---

## Generate dari Template

### POST `/:id/generate` — Generate dari Weekly Template

Otomatis expand template mingguan karyawan menjadi assignment per tanggal dalam periode ini.

```http
POST /api/v1/gym/schedule-periods/uuid-period-1/generate
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "userIds": ["uuid-user-budi", "uuid-user-ani"]
}
```

| Field | Type | Required | Keterangan |
|-------|------|----------|------------|
| `userIds` | UUID[] | ❌ | Filter staff. Kosongkan = generate untuk semua staff yang punya template |

**Prasyarat:** Staff harus sudah punya weekly template via `POST /gym/employee-schedule-templates`.

**Response:**

```json
{
  "success": true,
  "message": "62 schedule(s) generated from templates",
  "stats": {
    "generated": 62,
    "skipped": 14,
    "days": 31,
    "usersProcessed": 3
  }
}
```

| Field | Keterangan |
|-------|------------|
| `generated` | Jumlah assignment yang berhasil dibuat |
| `skipped` | Hari yang tidak ada template-nya (e.g. Minggu tidak ada template) |
| `usersProcessed` | Jumlah staff yang di-generate |

---

## Remove Assignment

### DELETE `/:id/assignments/:assignmentId` — Hapus Satu Assignment

```http
DELETE /api/v1/gym/schedule-periods/uuid-period-1/assignments/uuid-assignment-1
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "Assignment removed"
}
```

---

### DELETE `/:id/assignments/user/:userId` — Hapus Semua Assignment Satu Staff

```http
DELETE /api/v1/gym/schedule-periods/uuid-period-1/assignments/user/uuid-user-budi
DELETE /api/v1/gym/schedule-periods/uuid-period-1/assignments/user/uuid-user-budi?startDate=2026-03-15&endDate=2026-03-31
Authorization: Bearer <token>
```

| Param | Type | Keterangan |
|-------|------|------------|
| `startDate` | string | (opsional) Hanya hapus assignment mulai tanggal ini |
| `endDate` | string | (opsional) Hanya hapus assignment sampai tanggal ini |

**Response:**

```json
{
  "success": true,
  "message": "25 assignment(s) removed for user uuid-user-budi"
}
```

---

## Contoh Halaman Frontend

### Halaman: Daftar Periode

```
┌─────────────────────────────────────────────────────────────────────┐
│  📅 SCHEDULE PERIODS                            [+ Buat Periode]   │
├──────────┬──────────────────────┬──────────┬───────┬───────┬───────┤
│ Status   │ Nama                 │ Rentang  │ Staff │ Total │ Aksi  │
├──────────┼──────────────────────┼──────────┼───────┼───────┼───────┤
│ 🟢 Active│ Maret 2026           │ 01-31 Mar│   5   │  93   │ 👁 ✏ │
│ ⚪ Draft │ April 2026           │ 01-30 Apr│   0   │   0   │ 👁 ✏🗑│
│ 🔴 Closed│ Februari 2026        │ 01-28 Feb│   4   │  84   │ 👁   │
└──────────┴──────────────────────┴──────────┴───────┴───────┴───────┘
```

### Halaman: Detail Periode (Kalender View)

```
┌─────────────────────────────────────────────────────────────────────┐
│  📅 Maret 2026                     Status: 🟢 Active               │
│  01 Maret - 31 Maret 2026                                          │
│                                                                     │
│  [Assign Staff]  [Generate dari Template]  [Ubah Status ▾]         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐     │
│  │ 01 Sen  │ 02 Sel  │ 03 Rab  │ 04 Kam  │ 05 Jum  │ 06 Sab  │     │
│  ├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤     │
│  │🟢 Budi  │🔵 Budi  │🟢 Budi  │🔵 Budi  │🟢 Budi  │ OFF     │     │
│  │  Pagi   │  Siang  │  Pagi   │  Siang  │  Pagi   │         │     │
│  │         │         │         │         │         │         │     │
│  │🔵 Ani   │🟢 Ani   │🔵 Ani   │🟢 Ani   │🔵 Ani   │🟢 Ani   │     │
│  │  Siang  │  Pagi   │  Siang  │  Pagi   │  Siang  │  Pagi   │     │
│  │         │         │         │         │         │         │     │
│  │🟢 Rudi  │🟢 Rudi  │ OFF     │🟢 Rudi  │🟢 Rudi  │ OFF     │     │
│  │  Pagi   │  Pagi   │         │  Pagi   │  Pagi   │         │     │
│  └─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘     │
│                                                                     │
│  Legend: 🟢 Pagi (07:00-15:00)  🔵 Siang (14:00-22:00)             │
└─────────────────────────────────────────────────────────────────────┘
```

### Halaman: Assign Staff (Form)

```
┌─────────────────────────────────────────────────────────────────────┐
│  📋 Assign Staff — Maret 2026                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Mode: ○ Per-Tanggal (detail)    ● Uniform (shift seragam)         │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Karyawan      │ Shift           │ Hari Libur                 │  │
│  ├───────────────┼─────────────────┼────────────────────────────┤  │
│  │ ☑ Budi S.     │ [Pagi     ▾]   │ ☑ Min  ☐ Sen ... ☑ Sab    │  │
│  │ ☑ Ani L.      │ [Siang    ▾]   │ ☑ Min  ☐ Sen ... ☐ Sab    │  │
│  │ ☑ Rudi P.     │ [Pagi     ▾]   │ ☑ Min  ☐ Sen ... ☑ Sab    │  │
│  │ ☐ Dewi K.     │ [—        ▾]   │                            │  │
│  └───────────────┴─────────────────┴────────────────────────────┘  │
│                                                                     │
│                               [Batal]  [💾 Simpan Assignment]       │
└─────────────────────────────────────────────────────────────────────┘
```

---

### React Implementation (Pseudo-code)

```jsx
function SchedulePeriodList() {
  const { data } = useFetch('/api/v1/gym/schedule-periods?status=active');

  return (
    <div>
      <h2>Schedule Periods</h2>
      <button onClick={() => navigate('/schedule-periods/new')}>+ Buat Periode</button>

      <table>
        <thead>
          <tr>
            <th>Status</th><th>Nama</th><th>Rentang</th>
            <th>Staff</th><th>Assignments</th><th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data?.data.map(period => (
            <tr key={period.id}>
              <td><StatusBadge status={period.status} /></td>
              <td>{period.name}</td>
              <td>{formatDate(period.startDate)} — {formatDate(period.endDate)}</td>
              <td>{period.staffCount}</td>
              <td>{period.assignmentCount}</td>
              <td>
                <button onClick={() => navigate(`/schedule-periods/${period.id}`)}>Detail</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SchedulePeriodDetail({ periodId }) {
  const { data } = useFetch(`/api/v1/gym/schedule-periods/${periodId}`);

  if (!data) return <Loading />;

  const { period, byDate, summary } = data.data;

  return (
    <div>
      {/* Header */}
      <h2>{period.name}</h2>
      <p>{period.startDate} — {period.endDate}</p>
      <StatusBadge status={period.status} />

      {/* Actions */}
      <div>
        <button onClick={openAssignModal}>Assign Staff</button>
        <button onClick={generateFromTemplates}>Generate dari Template</button>
        <StatusDropdown 
          current={period.status} 
          onChangeStatus={(s) => updateStatus(periodId, s)} 
        />
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {Object.entries(byDate).map(([date, assignments]) => (
          <div key={date} className="day-cell">
            <div className="day-header">{formatDate(date)}</div>
            {assignments.map(a => (
              <div key={a.id} className="staff-chip" style={{ borderColor: a.shift?.color }}>
                <span>{a.user.firstName}</span>
                <span>{a.isOff ? 'OFF' : a.shift?.name}</span>
                <button onClick={() => removeAssignment(periodId, a.id)}>×</button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div>
        Total: {summary.totalAssignments} assignments, 
        {summary.totalStaff} staff, {summary.totalDates} hari
      </div>
    </div>
  );
}

function AssignStaffForm({ periodId, onSuccess }) {
  const [mode, setMode] = useState('uniform'); // 'uniform' | 'per-date'
  const [assignments, setAssignments] = useState([]);

  const handleSubmit = async () => {
    const body = { assignments };

    // Mode uniform: each entry has { userId, shiftId, offDays }
    // Mode per-date: each entry has { userId, dates: [{ date, shiftId }] }

    const res = await fetch(`/api/v1/gym/schedule-periods/${periodId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    const result = await res.json();
    if (result.success) {
      toast.success(result.message);
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <RadioGroup value={mode} onChange={setMode}>
        <Radio value="uniform">Shift Seragam</Radio>
        <Radio value="per-date">Per Tanggal</Radio>
      </RadioGroup>

      {mode === 'uniform' ? (
        <UniformAssignmentForm value={assignments} onChange={setAssignments} />
      ) : (
        <PerDateAssignmentForm periodId={periodId} value={assignments} onChange={setAssignments} />
      )}

      <button type="submit">Simpan Assignment</button>
    </form>
  );
}
```

---

## Flow Lengkap

```
1. SETUP (sekali)
   ├── Buat Master Shift: POST /gym/shifts
   │   { name: "Pagi", shiftStart: "07:00", shiftEnd: "15:00", color: "#4CAF50" }
   │   { name: "Siang", shiftStart: "14:00", shiftEnd: "22:00", color: "#2196F3" }
   │
   └── (opsional) Buat Template Mingguan: POST /gym/employee-schedule-templates
       { userId: "...", schedules: [
         { dayOfWeek: 1, shiftId: "shift-pagi" },
         { dayOfWeek: 2, shiftId: "shift-siang" },
         ...
         { dayOfWeek: 0, isOff: true }
       ]}
         │
         ▼
2. BUAT PERIODE
   POST /gym/schedule-periods
   { name: "Maret 2026", startDate: "2026-03-01", endDate: "2026-03-31" }
         │
         ▼
3. ISI JADWAL (pilih salah satu atau kombinasi)
   │
   ├── Cara A: Generate dari Template
   │   POST /gym/schedule-periods/:id/generate
   │   { userIds: ["budi", "ani"] }   // atau kosong = semua
   │
   ├── Cara B: Assign Uniform  
   │   POST /gym/schedule-periods/:id/assign
   │   { assignments: [
   │     { userId: "budi", shiftId: "shift-pagi", offDays: [0, 6] },
   │     { userId: "ani", shiftId: "shift-siang", offDays: [0] }
   │   ]}
   │
   └── Cara C: Assign Per-Date (detail)
       POST /gym/schedule-periods/:id/assign
       { assignments: [
         { userId: "budi", dates: [
           { date: "2026-03-01", shiftId: "shift-pagi" },
           { date: "2026-03-02", shiftId: "shift-siang" }
         ]}
       ]}
         │
         ▼
4. REVIEW & ADJUST
   GET /gym/schedule-periods/:id
   → Tampilkan kalender, edit jika perlu
   → Hapus assignment tertentu: DELETE /:id/assignments/:assignmentId
         │
         ▼
5. AKTIVASI
   PUT /gym/schedule-periods/:id/status
   { status: "active" }
         │
         ▼
6. AKHIR PERIODE
   PUT /gym/schedule-periods/:id/status
   { status: "closed" }
```

---

## Error Handling

| HTTP Status | Kondisi | Contoh Response |
|-------------|---------|-----------------|
| 400 | Validasi gagal | `{ "success": false, "message": "name, startDate, and endDate are required" }` |
| 400 | Tanggal di luar range periode | `{ "success": false, "message": "Date 2026-04-01 is outside period range (2026-03-01 to 2026-03-31)" }` |
| 400 | Status tidak valid | `{ "success": false, "message": "status must be one of: draft, active, closed" }` |
| 400 | Periode terlalu panjang | `{ "success": false, "message": "Period cannot exceed 366 days" }` |
| 404 | Periode tidak ditemukan | `{ "success": false, "message": "Schedule period not found" }` |
| 404 | Shift tidak ditemukan | `{ "success": false, "message": "Shift \"uuid\" not found" }` |
| 404 | Assignment tidak ditemukan | `{ "success": false, "message": "Assignment not found in this period" }` |

---

## Data Types

### SchedulePeriod

```typescript
interface SchedulePeriod {
  id: string;            // UUID
  tenantId: string;      // UUID
  name: string;          // max 100 chars
  startDate: string;     // YYYY-MM-DD
  endDate: string;       // YYYY-MM-DD
  status: 'draft' | 'active' | 'closed';
  notes: string | null;
  createdBy: string;     // UUID user
  createdAt: string;     // ISO datetime
  updatedAt: string;     // ISO datetime
}
```

### Assignment (EmployeeSchedule)

```typescript
interface Assignment {
  id: string;            // UUID
  periodId: string;      // UUID → SchedulePeriod
  userId: string;        // UUID → User
  date: string;          // YYYY-MM-DD
  shiftId: string | null;// UUID → Shift
  shiftStart: string | null;  // HH:mm:ss
  shiftEnd: string | null;    // HH:mm:ss
  isOff: boolean;
  notes: string | null;
  user: UserSummary;
  shift: ShiftSummary | null;
}
```

### Shift (Master)

```typescript
interface Shift {
  id: string;
  name: string;          // e.g. "Pagi", "Siang"
  code: string;          // e.g. "P", "S"
  shiftStart: string;    // HH:mm:ss
  shiftEnd: string;      // HH:mm:ss
  color: string;         // hex e.g. "#4CAF50"
  isActive: boolean;
}
```

---

## Notes

- **Backward compatible**: Endpoint lama di `/gym/employee-schedules` masih berfungsi. Untuk schedule baru, gunakan **Schedule Period**.
- **Upsert behavior**: Assign staff ke tanggal yang sudah ada dalam periode yang sama → data di-update, bukan duplikat.
- **Template tetap dipakai**: Template mingguan masih dikelola via `/gym/employee-schedule-templates`. Gunakan "Generate dari Template" untuk apply ke periode.
- **Multi-staff per tanggal**: Dalam satu periode, tanggal yang sama bisa punya banyak staff berbeda (Budi shift pagi, Ani shift siang, dst).
- **Unique constraint**: `(tenantId, periodId, userId, date)` — satu staff hanya bisa punya satu entry per tanggal per periode.
