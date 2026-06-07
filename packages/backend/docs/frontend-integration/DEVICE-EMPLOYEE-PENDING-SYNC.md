# Frontend Integration — Device Employee: Input Dulu, Sync ke Device Kemudian

**Base URL:** `/api/v1/integrations/hikvision`  
**Auth:** `Authorization: Bearer <token>`  
**Roles:** admin, owner

---

## Konsep

Sebelumnya, menambahkan employee harus langsung terhubung (online) ke device Hikvision.  
Sekarang tersedia **mode offline / pending sync**: input data ke sistem terlebih dahulu, lalu sync ke device kapan saja.

### Status Baru pada `DeviceEmployee`

| Status         | Keterangan |
|----------------|------------|
| `active`       | Terdaftar di sistem & sudah ada di device |
| `pending_sync` | Terdaftar di sistem, **belum** di-push ke device |
| `sync_failed`  | Gagal di-push ke device (cek koneksi/log) |
| `inactive`     | Tidak aktif (dihapus dari device atau ditandai manual) |

---

## Alur Lengkap

```
1. INPUT KE SISTEM (offline)
   POST /devices/:id/employees
   { "syncToDevice": false }
         │
         ▼
2. REVIEW & KELOLA DATA (opsional)
   GET /device-employees?status=pending_sync
         │
         ▼
3. PUSH KE DEVICE (batch)
   POST /devices/:id/push-pending-employees
         │
         ▼
4. ENROLL FINGERPRINT (online ke device)
   POST /devices/:id/employees/:employeeNo/enroll-fingerprint
```

---

## Endpoint Detail

### 1. Tambah Employee ke Sistem (Pending Sync)

```http
POST /api/v1/integrations/hikvision/devices/:id/employees
Authorization: Bearer <token>
Content-Type: application/json
```

**Request body:**

```json
{
  "employeeNo": "101",
  "name":       "Budi Santoso",
  "userId":     "uuid-user-optional",
  "syncToDevice": false
}
```

| Field          | Type    | Default | Keterangan |
|----------------|---------|---------|-----------|
| `employeeNo`   | string  | —       | Nomor karyawan (unik per device). Wajib. |
| `name`         | string  | —       | Nama karyawan. |
| `userId`       | UUID    | null    | Link ke user sistem (opsional). |
| `syncToDevice` | boolean | `true`  | `false` = simpan DB saja, status `pending_sync`. `true` (default) = push ke device langsung. |

**Response (`syncToDevice: false`):**

```json
{
  "success": true,
  "message": "Employee registered in system. Use POST /push-pending-employees to sync to device.",
  "data": {
    "id":          "uuid",
    "employeeNo":  "101",
    "name":        "Budi Santoso",
    "status":      "pending_sync",
    "lastSyncAt":  null
  },
  "syncedToDevice": false
}
```

**Response (`syncToDevice: true` — default, behavior lama):**

```json
{
  "success": true,
  "message": "Employee added to device",
  "data": { "status": "active", "lastSyncAt": "2026-02-23T..." },
  "syncedToDevice": true
}
```

---

### 2. Lihat Employee yang Belum di-Sync

```http
GET /api/v1/integrations/hikvision/device-employees?status=pending_sync&deviceId=:deviceId
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id":          "uuid",
      "employeeNo":  "101",
      "name":        "Budi Santoso",
      "status":      "pending_sync",
      "lastSyncAt":  null,
      "device":      { "id": "uuid", "name": "Main Entrance", "ipAddress": "192.168.1.23" },
      "user":        { "id": "uuid", "firstName": "Budi", "lastName": "Santoso", "email": "..." }
    }
  ],
  "pagination": { "total": 1, "page": 1 }
}
```

---

### 3. Push Semua Pending ke Device (Batch)

```http
POST /api/v1/integrations/hikvision/devices/:id/push-pending-employees
Authorization: Bearer <token>
```

> Tidak perlu request body.

**Response sukses:**

```json
{
  "success": true,
  "message": "Pushed 3 of 3 pending employees to device.",
  "stats": {
    "total":  3,
    "synced": 3,
    "failed": 0
  },
  "results": [
    { "employeeNo": "101", "name": "Budi Santoso",  "status": "synced", "alreadyExisted": false },
    { "employeeNo": "102", "name": "Siti Rahayu",   "status": "synced", "alreadyExisted": false },
    { "employeeNo": "103", "name": "Ahmad Fauzi",   "status": "synced", "alreadyExisted": true  }
  ],
  "nextStep": "Employees are now on device. You can enroll fingerprints via POST /devices/:id/employees/:employeeNo/enroll-fingerprint"
}
```

**Response dengan sebagian gagal:**

```json
{
  "success": false,
  "message": "Pushed 2 of 3 pending employees to device. 1 failed (status set to sync_failed).",
  "stats": { "total": 3, "synced": 2, "failed": 1 },
  "results": [
    { "employeeNo": "101", "status": "synced" },
    { "employeeNo": "102", "status": "synced" },
    { "employeeNo": "103", "status": "failed", "error": "Connection timeout" }
  ]
}
```

Setelah gagal, cek status dengan `GET /device-employees?status=sync_failed` lalu coba push ulang (ubah status ke `pending_sync` dulu via `PUT /device-employees/:id` lalu push lagi).

---

### 4. Enroll Fingerprint (setelah sync berhasil)

```http
POST /api/v1/integrations/hikvision/devices/:id/employees/:employeeNo/enroll-fingerprint
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "fingerNo":   1,
  "fingerType": "normalFP"
}
```

Lihat dokumentasi lengkap di [DEVICE-EMPLOYEE-MANAGEMENT.md](./DEVICE-EMPLOYEE-MANAGEMENT.md#fingerprint-enrollment).

---

## Contoh Alur Frontend

### Form Registrasi Banyak Karyawan (Batch Input)

```javascript
// 1. Input semua karyawan ke sistem terlebih dahulu
const employees = [
  { employeeNo: '101', name: 'Budi Santoso',  userId: 'uuid-1' },
  { employeeNo: '102', name: 'Siti Rahayu',   userId: 'uuid-2' },
  { employeeNo: '103', name: 'Ahmad Fauzi',   userId: 'uuid-3' },
];

for (const emp of employees) {
  await api.post(`/integrations/hikvision/devices/${deviceId}/employees`, {
    ...emp,
    syncToDevice: false, // simpan ke DB dulu
  });
}

// 2. Verifikasi pending list
const pending = await api.get(`/integrations/hikvision/device-employees?status=pending_sync&deviceId=${deviceId}`);
console.log(`${pending.data.pagination.total} karyawan menunggu sync`);

// 3. Saat device sudah siap / koneksi tersedia, push semua sekaligus
const result = await api.post(`/integrations/hikvision/devices/${deviceId}/push-pending-employees`);
console.log(result.data.message);
// "Pushed 3 of 3 pending employees to device."

// 4. Arahkan ke halaman enroll fingerprint per karyawan
```

---

## Retry Jika sync_failed

```javascript
// Tandai ulang sebagai pending_sync untuk retry
await api.put(`/integrations/hikvision/device-employees/${recordId}`, {
  status: 'pending_sync',
});

// Lalu push ulang
await api.post(`/integrations/hikvision/devices/${deviceId}/push-pending-employees`);
```

---

## Ringkasan Endpoint Baru

| Method | Endpoint | Keterangan |
|--------|----------|-----------|
| `POST` | `/devices/:id/employees` | Tambah employee. Kirim `syncToDevice: false` untuk mode pending. |
| `POST` | `/devices/:id/push-pending-employees` | Push semua `pending_sync` ke device (batch). |
| `GET`  | `/device-employees?status=pending_sync` | Lihat daftar yang belum di-sync. |
| `GET`  | `/device-employees?status=sync_failed` | Lihat yang gagal di-sync. |
| `PUT`  | `/device-employees/:id` | Update status (misal: kembalikan ke `pending_sync` untuk retry). |
