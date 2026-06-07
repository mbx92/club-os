# Frontend Integration — Hikvision Device Sync (DB ↔ Device)

**Base URL:** `GET|POST|PUT|PATCH|DELETE /api/v1/integrations/hikvision/...`  
**Auth:** `Authorization: Bearer <token>` (semua endpoint kecuali `/event`)  
**Required module:** `gym`  
**Required permission subject:** `HikvisionDevice`

---

## Daftar Isi

1. [Konsep Inti — Dua Arah Sync](#1-konsep-inti--dua-arah-sync)
2. [Status Employee & Artinya](#2-status-employee--artinya)
3. [Endpoint: Sync Status Overview](#3-endpoint-sync-status-overview)
4. [Endpoint: Tambah Employee ke Device](#4-endpoint-tambah-employee-ke-device)
5. [Endpoint: Push Pending Employees](#5-endpoint-push-pending-employees)
6. [Endpoint: Import Employee dari Device ke DB](#6-endpoint-import-employee-dari-device-ke-db)
7. [Endpoint: Pull Attendance Log Manual](#7-endpoint-pull-attendance-log-manual)
8. [Endpoint: Lihat Device Employees di DB](#8-endpoint-lihat-device-employees-di-db)
9. [Endpoint: Update Status Employee](#9-endpoint-update-status-employee)
10. [Skenario Lengkap & Kapan Pakai Apa](#10-skenario-lengkap--kapan-pakai-apa)
11. [Contoh Implementasi Vue 3](#11-contoh-implementasi-vue-3)
12. [Penanganan Error](#12-penanganan-error)

---

## 1. Konsep Inti — Dua Arah Sync

Ada **dua jenis data yang berbeda** dan masing-masing punya arah sync sendiri:

```
┌──────────────────────────────────────────────────────────────────────┐
│                        DUA ARAH SYNC                                  │
│                                                                       │
│  DATA EMPLOYEE (Siapa yang boleh absen)                               │
│  ─────────────────────────────────────                                │
│  DB → Device   : POST /devices/:id/employees  (daftarkan employee)   │
│                  POST /devices/:id/push-pending-employees (batch)     │
│  Device → DB   : POST /devices/:id/sync-employees  (import dari hw)  │
│                                                                       │
│  DATA ABSENSI (Log tap jari)                                          │
│  ──────────────────────────────────────                               │
│  Device → DB   : PUSH otomatis real-time  POST /event                │
│                  PULL manual             POST /devices/:id/sync       │
│                  AUTO cron 5 menit       (background, tidak perlu UI) │
│                                                                       │
│  TIDAK ADA sync absensi dari DB ke device.                            │
└──────────────────────────────────────────────────────────────────────┘
```

**Aturan paling penting:**
- Employee **harus ada di device** sebelum absensi bisa dicatat
- Absensi masuk ke DB **otomatis** melalui push dari device (real-time) atau cron 5 menit
- Manual sync (`POST /sync`) hanya diperlukan jika push tidak aktif atau ada log yang terlewat

---

## 2. Status Employee & Artinya

| Status | Artinya | Absensi Berjalan? | Tindakan |
|---|---|---|---|
| `active` | Ada di DB **dan** di device | ✅ Ya | Tidak perlu tindakan |
| `pending_sync` | Ada di DB, **belum** di device | ❌ Tidak | Jalankan `push-pending-employees` |
| `sync_failed` | Push ke device gagal | ❌ Tidak | Cek koneksi, ulangi push |
| `inactive` | Tidak ditemukan di device saat import | ⚠️ Tidak jelas | Cek device secara manual |

**UI Recommendation:** Tampilkan badge berwarna:
- `active` → hijau
- `pending_sync` → kuning/warning
- `sync_failed` → merah/error  
- `inactive` → abu-abu

---

## 3. Endpoint: Sync Status Overview

Endpoint utama untuk halaman monitoring. Panggil ini saat halaman pertama kali dibuka untuk menampilkan kondisi terkini device dan employee.

```
GET /api/v1/integrations/hikvision/devices/:deviceId/sync-status
```

**Response:**
```json
{
  "success": true,
  "device": {
    "id": "uuid-device",
    "name": "Fingerprint Utama",
    "ipAddress": "192.168.1.23",
    "port": 80,
    "isActive": true,
    "lastSyncAt": "2026-03-02T08:30:00.000Z",
    "minutesSinceLastSync": 3
  },
  "employeeSyncStats": {
    "total": 12,
    "active": 10,
    "pending_sync": 1,
    "sync_failed": 1,
    "inactive": 0
  },
  "employeesNeedingAttention": [
    {
      "id": "uuid-de-1",
      "employeeNo": "005",
      "name": "Budi Santoso",
      "status": "pending_sync",
      "lastSyncAt": null,
      "updatedAt": "2026-03-02T07:00:00.000Z"
    },
    {
      "id": "uuid-de-2",
      "employeeNo": "009",
      "name": "Sari Dewi",
      "status": "sync_failed",
      "lastSyncAt": null,
      "updatedAt": "2026-03-01T15:00:00.000Z"
    }
  ],
  "latestAttendanceLog": {
    "eventTime": "2026-03-02T08:28:00.000Z",
    "employeeNo": "001",
    "verifyMode": "fingerPrint",
    "isMatched": true
  },
  "autoSync": {
    "enabled": true,
    "intervalMinutes": 5,
    "description": "Cron job berjalan setiap 5 menit untuk menarik attendance log dari device",
    "estimatedNextRunInMinutes": 2
  },
  "warnings": [
    {
      "level": "warning",
      "message": "1 employee ada di DB tapi BELUM di device (pending_sync). Absensi tidak akan berjalan untuk mereka.",
      "action": "POST /integrations/hikvision/devices/uuid-device/push-pending-employees"
    },
    {
      "level": "error",
      "message": "1 employee gagal saat push ke device (sync_failed). Perlu push ulang.",
      "action": "POST /integrations/hikvision/devices/uuid-device/push-pending-employees"
    }
  ],
  "syncWorkflow": {
    "description": "Panduan alur sync Database ↔ Device Hikvision",
    "flow": [ /* ... lihat bagian 10 */ ],
    "statusGuide": {
      "active": "Employee ada di DB dan device — absensi berjalan normal ✓",
      "pending_sync": "Employee ada di DB tapi BELUM di device — absensi TIDAK berjalan, harus push dulu",
      "sync_failed": "Push ke device gagal — cek koneksi device, lalu jalankan push-pending-employees lagi",
      "inactive": "Employee tidak ditemukan saat import dari device, atau dinonaktifkan manual"
    },
    "quickLinks": {
      "checkEmployeesInDB": "GET /integrations/hikvision/device-employees?deviceId=uuid-device",
      "checkEmployeesOnDevice": "GET /integrations/hikvision/devices/uuid-device/employees",
      "pushPending": "POST /integrations/hikvision/devices/uuid-device/push-pending-employees",
      "pullLogs": "POST /integrations/hikvision/devices/uuid-device/sync",
      "importFromDevice": "POST /integrations/hikvision/devices/uuid-device/sync-employees",
      "viewAttendanceLogs": "GET /integrations/hikvision/devices/uuid-device/logs"
    }
  }
}
```

**UI yang disarankan:**
- Kartu ringkasan: total aktif / pending / gagal
- Alert/banner untuk setiap item di `warnings`
- Tombol "Push Pending" muncul jika `employeeSyncStats.pending_sync > 0` atau `sync_failed > 0`
- Tabel `employeesNeedingAttention` dengan tombol aksi per baris
- Informasi `lastSyncAt` dengan label relatif: "3 menit lalu"

---

## 4. Endpoint: Tambah Employee ke Device

Gunakan ini saat mendaftarkan karyawan baru ke sistem absensi.

```
POST /api/v1/integrations/hikvision/devices/:deviceId/employees
Content-Type: application/json
```

### Mode A — Langsung Push ke Device (default)

```json
{
  "employeeNo": "012",
  "name": "Andi Wijaya",
  "userId": "uuid-user-optional",
  "syncToDevice": true
}
```

**Response sukses:**
```json
{
  "success": true,
  "message": "Employee added to device",
  "data": {
    "id": "uuid-de",
    "employeeNo": "012",
    "name": "Andi Wijaya",
    "userId": "uuid-user",
    "status": "active",
    "lastSyncAt": "2026-03-02T09:00:00.000Z"
  },
  "syncedToDevice": true
}
```

> **Jika `success: true` dan `status: active`** → employee langsung bisa absen. Tidak perlu langkah lagi (kecuali daftarkan sidik jari).

**Response jika employee sudah ada di device (bukan error):**
```json
{
  "success": true,
  "message": "Employee already exists on device, database record updated",
  "warning": "Employee already registered on device (deviceUserAlreadyExist)"
}
```

### Mode B — Simpan ke DB Dulu, Push Nanti

Berguna saat device sedang offline atau ingin input batch terlebih dahulu.

```json
{
  "employeeNo": "013",
  "name": "Dewi Kusuma",
  "userId": "uuid-user",
  "syncToDevice": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Employee registered in system. Use POST /push-pending-employees to sync to device.",
  "data": {
    "status": "pending_sync",
    "lastSyncAt": null
  },
  "syncedToDevice": false
}
```

> **Jika `syncedToDevice: false`** → tampilkan banner: *"Employee tersimpan di sistem. Jalankan Push Pending untuk mendaftarkan ke device."*

**Field wajib:**

| Field | Tipe | Keterangan |
|---|---|---|
| `employeeNo` | string | ID unik di device (umumnya angka, max 32 char) |
| `name` | string | Nama karyawan |
| `userId` | UUID (opsional) | Link ke User untuk tracking absensi |
| `syncToDevice` | boolean | Default `true` |

---

## 5. Endpoint: Push Pending Employees

Push semua employee berstatus `pending_sync` atau `sync_failed` ke hardware device secara batch.

```
POST /api/v1/integrations/hikvision/devices/:deviceId/push-pending-employees
```

Tidak memerlukan request body.

**Response:**
```json
{
  "success": true,
  "message": "Pushed 2 of 2 pending employees to device.",
  "stats": {
    "total": 2,
    "synced": 2,
    "failed": 0
  },
  "results": [
    {
      "employeeNo": "005",
      "name": "Budi Santoso",
      "status": "synced",
      "alreadyExisted": false
    },
    {
      "employeeNo": "009",
      "name": "Sari Dewi",
      "status": "synced",
      "alreadyExisted": true
    }
  ],
  "nextStep": "Employee sudah terdaftar di device. Daftarkan sidik jari via POST /devices/:id/employees/:employeeNo/enroll-fingerprint"
}
```

**Response jika sebagian gagal:**
```json
{
  "success": false,
  "message": "Pushed 1 of 2 pending employees to device. 1 failed (status set to sync_failed).",
  "stats": { "total": 2, "synced": 1, "failed": 1 },
  "results": [
    { "employeeNo": "005", "name": "Budi", "status": "synced" },
    { "employeeNo": "009", "name": "Sari", "status": "failed", "error": "connection timeout" }
  ],
  "nextStep": "1 employee gagal di-push. Pastikan device online dan coba lagi endpoint ini."
}
```

**Response jika tidak ada yang pending:**
```json
{
  "success": true,
  "message": "No pending employees to sync.",
  "stats": { "total": 0, "synced": 0, "failed": 0 }
}
```

**UI yang disarankan:**
- Tombol "Push Pending ke Device" hanya muncul jika ada `pending_sync` atau `sync_failed`
- Tampilkan loading spinner dan disable tombol saat request berjalan
- Setelah selesai, refresh `sync-status` untuk menampilkan kondisi terbaru
- Jika ada yang gagal, tampilkan daftar nama + error dengan tombol "Coba Lagi"

---

## 6. Endpoint: Import Employee dari Device ke DB

Digunakan saat device sudah berisi data karyawan (misalnya device lama atau migrasi) dan database belum punya datanya.

```
POST /api/v1/integrations/hikvision/devices/:deviceId/sync-employees
```

Tidak memerlukan request body.

**Response:**
```json
{
  "success": true,
  "message": "Synced 8 employees from device",
  "stats": {
    "total": 8,
    "created": 3,
    "updated": 5,
    "fingerprintDataSynced": true
  },
  "nextStep": "Employee baru berhasil diimport ke DB. Link ke user via PUT /device-employees/:id jika diperlukan."
}
```

**Efek samping penting:**
- Employee yang **ADA di device** → status `active` di DB
- Employee yang **ada di DB tapi TIDAK di device** → status otomatis diubah ke `inactive`
- `fingerprintDataSynced: false` → data sidik jari tidak bisa diambil dari device (non-fatal, data lama dipertahankan)

**Kapan pakai ini vs `push-pending-employees`:**

| Situasi | Endpoint |
|---|---|
| Device baru/kosong, mau daftarkan karyawan dari DB | `POST /devices/:id/employees` atau `push-pending-employees` |
| Device sudah berisi data, mau import ke DB | `POST /devices/:id/sync-employees` ← **ini** |
| Cek apakah DB dan device sinkron | `GET /devices/:id/sync-status` |

---

## 7. Endpoint: Pull Attendance Log Manual

Menarik log absensi dari device ke database secara manual. Digunakan saat push tidak aktif atau ada log yang terlewat.

```
POST /api/v1/integrations/hikvision/devices/:deviceId/sync
```

**Query params opsional:**

| Param | Tipe | Keterangan |
|---|---|---|
| `startDate` | ISO8601 | Tarik log mulai dari tanggal ini. Contoh: `2026-03-01T00:00:00` |
| `fullDay` | `true`/`false` | Jika `true`, tarik dari pukul 00:00 hari ini sampai sekarang |

Jika tidak ada query param, default: dari `lastSyncAt` device (atau 24 jam terakhir jika belum pernah sync).

**Response sukses:**
```json
{
  "success": true,
  "syncedFrom": "2026-03-01T02:30:00.000Z",
  "syncedTo": "2026-03-02T09:15:00.000Z",
  "syncMode": "since_last_sync",
  "processed": 15,
  "duplicates": 3,
  "matched": 12,
  "unmatched": 3,
  "howItWorks": ["..."],
  "tips": []
}
```

**Response jika tidak ada data baru (`rawEvents = 0`):**
```json
{
  "success": true,
  "processed": 0,
  "duplicates": 0,
  "tips": [
    "Tidak ada event baru. Coba gunakan ?startDate=2026-01-01T00:00:00 untuk rentang waktu lebih luas.",
    "Jika device menggunakan push mode, log sudah masuk otomatis saat tap."
  ]
}
```

**Response error (device tidak bisa dijangkau):**
```json
{
  "success": false,
  "message": "Failed to pull events from device (192.168.1.23:80)",
  "error": "connect ETIMEDOUT 192.168.1.23:80",
  "hint": "Device not reachable. Check IP, port, and network connectivity. Try test connection first."
}
```
HTTP status: `502`

**Field response:**

| Field | Keterangan |
|---|---|
| `processed` | Jumlah event yang diproses dan disimpan |
| `duplicates` | Dilewati karena sudah ada di DB |
| `matched` | Event yang berhasil dicocokkan ke User/Member |
| `unmatched` | Event masuk DB tapi employeeNo tidak dikenali |
| `syncMode` | `since_last_sync` / `full_day` / `custom_date` |

**Kapan tampilkan tombol ini di UI:**
- Halaman "Device Settings" atau "Riwayat Absensi"
- Tambahkan opsi "Pilih Tanggal" untuk menggunakan `?startDate=`
- Jika `unmatched > 0`, tampilkan link ke halaman staff mapping

---

## 8. Endpoint: Lihat Device Employees di DB

```
GET /api/v1/integrations/hikvision/device-employees
```

**Query params:**

| Param | Keterangan |
|---|---|
| `deviceId` | Filter per device |
| `status` | `active`, `pending_sync`, `sync_failed`, `inactive` |
| `userId` | Filter per user yang di-link |
| `hasFingerprint` | `true` / `false` |
| `search` | Cari by nama atau employeeNo (partial) |
| `page` | Default 1 |
| `limit` | Default 100, max 200 |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-de",
      "employeeNo": "001",
      "name": "Rizky Admin",
      "status": "active",
      "hasFingerprint": true,
      "fingerprintCount": 2,
      "lastSyncAt": "2026-03-01T10:00:00.000Z",
      "user": {
        "id": "uuid-user",
        "firstName": "Rizky",
        "lastName": "Ramadhan",
        "email": "rizky@gym.com",
        "deviceEmployeeNo": "001"
      },
      "device": {
        "id": "uuid-device",
        "name": "Fingerprint Utama",
        "ipAddress": "192.168.1.23"
      }
    }
  ],
  "pagination": {
    "total": 12,
    "page": 1,
    "limit": 100,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

**Lihat employee langsung di hardware device** (data real-time dari device):
```
GET /api/v1/integrations/hikvision/devices/:deviceId/employees
```
Response sama tapi data diambil langsung dari device + diperkaya dengan data DB.

---

## 9. Endpoint: Update Status Employee

### Update data (nama, link user)
```
PUT /api/v1/integrations/hikvision/device-employees/:id
Content-Type: application/json
```
```json
{
  "userId": "uuid-user",
  "name": "Nama Baru"
}
```

### Set status (aktif/nonaktif)
```
PATCH /api/v1/integrations/hikvision/device-employees/:id/status
Content-Type: application/json
```
```json
{
  "status": "inactive",
  "syncToDevice": true
}
```

- `status: "active"` atau `"inactive"` dengan `syncToDevice: true` → perubahan **langsung dikirim ke device** (mengaktifkan/menonaktifkan akses tap)
- `status: "pending_sync"` atau `"sync_failed"` → hanya update DB, tidak ke device

**Response:**
```json
{
  "success": true,
  "message": "Status updated: active → inactive",
  "deviceSync": {
    "attempted": true,
    "success": true,
    "deviceId": "uuid-device",
    "deviceName": "Fingerprint Utama"
  },
  "data": { /* DeviceEmployee object */ }
}
```

---

## 10. Skenario Lengkap & Kapan Pakai Apa

### Skenario A: Setup Awal (Device baru, DB kosong)

```
1. GET  /devices/:id/sync-status          ← cek kondisi awal
2. POST /devices/:id/employees            ← daftarkan setiap karyawan (syncToDevice: true)
3. POST /devices/:id/employees/:no/enroll-fingerprint  ← minta karyawan tempelkan jari
4. DELETE /devices/:id/enrollment-lock   ← setelah pendaftaran jari selesai
5. GET  /devices/:id/sync-status          ← verifikasi semua active
```

### Skenario B: Input Batch Offline (Device lagi offline)

```
1. POST /devices/:id/employees  { syncToDevice: false }   ← input semua karyawan
   (ulangi untuk setiap karyawan)
2. [Tunggu device online]
3. GET  /devices/:id/sync-status          ← cek pending_sync count
4. POST /devices/:id/push-pending-employees  ← push semua sekaligus
5. POST /devices/:id/employees/:no/enroll-fingerprint  ← daftarkan jari
```

### Skenario C: Migrasi Device Lama (Device sudah berisi data)

```
1. POST /devices/:id/sync-employees       ← import semua dari device ke DB
2. GET  /device-employees?deviceId=:id    ← lihat hasilnya
3. PUT  /device-employees/:id  { userId: "..." }  ← link employee ke user sistem
   (ulangi untuk setiap employee yang perlu di-link)
4. POST /reprocess-logs                   ← cocokkan log lama yang belum ter-match
```

### Skenario D: Ada Log Absensi yang Terlewat

```
1. POST /devices/:id/sync?startDate=2026-03-01T00:00:00  ← tarik log dari tanggal tertentu
2. GET  /devices/:id/logs?startDate=2026-03-01           ← verifikasi log masuk
3. [Jika masih ada unmatched]
4. GET  /staff-mapping                    ← cek apakah semua karyawan sudah di-link
5. POST /reprocess-logs  { startDate, endDate }  ← proses ulang log yang unmatched
```

### Skenario E: Karyawan Resign (Nonaktifkan Akses)

```
1. GET  /device-employees?deviceId=:id&search=namaKaryawan   ← cari record-nya
2. PATCH /device-employees/:id/status  { status: "inactive", syncToDevice: true }
   ← langsung menonaktifkan akses di device (sidik jari tetap tersimpan di device)
```

---

## 11. Contoh Implementasi Vue 3

### Composable: `useDeviceSync.js`

```javascript
// composables/useDeviceSync.js
import { ref, computed } from 'vue'
import axios from '@/utils/axios' // axios instance dengan base URL dan interceptors

export function useDeviceSync(deviceId) {
  const syncStatus = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const hasPendingEmployees = computed(() =>
    (syncStatus.value?.employeeSyncStats?.pending_sync ?? 0) +
    (syncStatus.value?.employeeSyncStats?.sync_failed ?? 0) > 0
  )

  const warnings = computed(() => syncStatus.value?.warnings ?? [])

  async function fetchSyncStatus() {
    loading.value = true
    error.value = null
    try {
      const { data } = await axios.get(`/integrations/hikvision/devices/${deviceId}/sync-status`)
      syncStatus.value = data
    } catch (err) {
      error.value = err.response?.data?.message ?? 'Gagal memuat status sync'
    } finally {
      loading.value = false
    }
  }

  async function pushPending() {
    loading.value = true
    error.value = null
    try {
      const { data } = await axios.post(
        `/integrations/hikvision/devices/${deviceId}/push-pending-employees`
      )
      await fetchSyncStatus() // refresh setelah push
      return data
    } catch (err) {
      error.value = err.response?.data?.message ?? 'Gagal push employee ke device'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function pullLogs(startDate = null) {
    loading.value = true
    error.value = null
    try {
      const params = startDate ? { startDate } : {}
      const { data } = await axios.post(
        `/integrations/hikvision/devices/${deviceId}/sync`,
        {},
        { params }
      )
      await fetchSyncStatus()
      return data
    } catch (err) {
      error.value = err.response?.data?.message ?? 'Gagal pull attendance log'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function importFromDevice() {
    loading.value = true
    error.value = null
    try {
      const { data } = await axios.post(
        `/integrations/hikvision/devices/${deviceId}/sync-employees`
      )
      await fetchSyncStatus()
      return data
    } catch (err) {
      error.value = err.response?.data?.message ?? 'Gagal import employee dari device'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function addEmployee(payload) {
    // payload: { employeeNo, name, userId?, syncToDevice? }
    const { data } = await axios.post(
      `/integrations/hikvision/devices/${deviceId}/employees`,
      payload
    )
    await fetchSyncStatus()
    return data
  }

  async function setEmployeeStatus(deviceEmployeeId, status, syncToDevice = true) {
    const { data } = await axios.patch(
      `/integrations/hikvision/device-employees/${deviceEmployeeId}/status`,
      { status, syncToDevice }
    )
    await fetchSyncStatus()
    return data
  }

  return {
    syncStatus,
    loading,
    error,
    hasPendingEmployees,
    warnings,
    fetchSyncStatus,
    pushPending,
    pullLogs,
    importFromDevice,
    addEmployee,
    setEmployeeStatus,
  }
}
```

### Komponen: `DeviceSyncPanel.vue`

```vue
<template>
  <div class="device-sync-panel">
    <!-- Loading skeleton -->
    <div v-if="loading && !syncStatus" class="skeleton-loader">Memuat...</div>

    <template v-else-if="syncStatus">
      <!-- Header info device -->
      <div class="device-header">
        <h3>{{ syncStatus.device.name }}</h3>
        <span :class="['badge', syncStatus.device.isActive ? 'badge-green' : 'badge-red']">
          {{ syncStatus.device.isActive ? 'Aktif' : 'Tidak Aktif' }}
        </span>
        <span class="text-muted">
          Sync terakhir: {{ lastSyncLabel }}
        </span>
      </div>

      <!-- Warning banners -->
      <div
        v-for="w in warnings"
        :key="w.message"
        :class="['alert', w.level === 'error' ? 'alert-error' : 'alert-warning']"
      >
        <strong>{{ w.message }}</strong>
        <p class="text-sm">Tindakan: <code>{{ w.action }}</code></p>
      </div>

      <!-- Stats cards -->
      <div class="stats-grid">
        <div class="stat-card stat-green">
          <div class="stat-value">{{ syncStatus.employeeSyncStats.active }}</div>
          <div class="stat-label">Aktif di Device</div>
        </div>
        <div class="stat-card" :class="syncStatus.employeeSyncStats.pending_sync > 0 ? 'stat-yellow' : 'stat-gray'">
          <div class="stat-value">{{ syncStatus.employeeSyncStats.pending_sync }}</div>
          <div class="stat-label">Pending Sync</div>
        </div>
        <div class="stat-card" :class="syncStatus.employeeSyncStats.sync_failed > 0 ? 'stat-red' : 'stat-gray'">
          <div class="stat-value">{{ syncStatus.employeeSyncStats.sync_failed }}</div>
          <div class="stat-label">Gagal Sync</div>
        </div>
        <div class="stat-card stat-gray">
          <div class="stat-value">{{ syncStatus.employeeSyncStats.inactive }}</div>
          <div class="stat-label">Nonaktif</div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="action-buttons">
        <button
          v-if="hasPendingEmployees"
          @click="handlePushPending"
          :disabled="loading"
          class="btn btn-primary"
        >
          {{ loading ? 'Mendorong...' : `Push ${pendingCount} Pending ke Device` }}
        </button>

        <button @click="handlePullLogs" :disabled="loading" class="btn btn-secondary">
          {{ loading ? 'Menarik...' : 'Pull Log Absensi' }}
        </button>

        <button @click="handleImportFromDevice" :disabled="loading" class="btn btn-outline">
          Import Employee dari Device
        </button>

        <button @click="fetchSyncStatus" :disabled="loading" class="btn btn-ghost">
          🔄 Refresh
        </button>
      </div>

      <!-- Employees needing attention -->
      <div v-if="syncStatus.employeesNeedingAttention.length > 0" class="attention-table">
        <h4>Employee yang Perlu Perhatian</h4>
        <table>
          <thead>
            <tr>
              <th>No. Employee</th>
              <th>Nama</th>
              <th>Status</th>
              <th>Terakhir Update</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="emp in syncStatus.employeesNeedingAttention" :key="emp.id">
              <td>{{ emp.employeeNo }}</td>
              <td>{{ emp.name }}</td>
              <td>
                <span :class="['badge', statusBadgeClass(emp.status)]">
                  {{ emp.status }}
                </span>
              </td>
              <td>{{ formatDate(emp.updatedAt) }}</td>
              <td>
                <button
                  v-if="emp.status === 'pending_sync' || emp.status === 'sync_failed'"
                  @click="setEmployeeStatus(emp.id, 'active')"
                  class="btn btn-xs btn-primary"
                >
                  Aktifkan
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Latest attendance log -->
      <div v-if="syncStatus.latestAttendanceLog" class="latest-log">
        <span class="text-muted">Log absensi terakhir:</span>
        <strong>Emp #{{ syncStatus.latestAttendanceLog.employeeNo }}</strong>
        via {{ syncStatus.latestAttendanceLog.verifyMode }}
        pada {{ formatDate(syncStatus.latestAttendanceLog.eventTime) }}
      </div>
    </template>

    <!-- Error state -->
    <div v-else-if="error" class="alert alert-error">
      {{ error }}
      <button @click="fetchSyncStatus">Coba Lagi</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useDeviceSync } from '@/composables/useDeviceSync'
import { formatDistanceToNow, format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

const props = defineProps({
  deviceId: { type: String, required: true },
})

const {
  syncStatus, loading, error, hasPendingEmployees, warnings,
  fetchSyncStatus, pushPending, pullLogs, importFromDevice, setEmployeeStatus,
} = useDeviceSync(props.deviceId)

const lastSyncLabel = computed(() => {
  if (!syncStatus.value?.device?.lastSyncAt) return 'Belum pernah sync'
  return formatDistanceToNow(new Date(syncStatus.value.device.lastSyncAt), {
    addSuffix: true, locale: localeId,
  })
})

const pendingCount = computed(() =>
  (syncStatus.value?.employeeSyncStats?.pending_sync ?? 0) +
  (syncStatus.value?.employeeSyncStats?.sync_failed ?? 0)
)

function statusBadgeClass(status) {
  return {
    active: 'badge-green',
    pending_sync: 'badge-yellow',
    sync_failed: 'badge-red',
    inactive: 'badge-gray',
  }[status] ?? 'badge-gray'
}

function formatDate(dateStr) {
  return format(new Date(dateStr), 'dd MMM yyyy HH:mm', { locale: localeId })
}

async function handlePushPending() {
  try {
    const result = await pushPending()
    if (result.stats.failed > 0) {
      alert(`${result.stats.synced} berhasil, ${result.stats.failed} gagal. Cek koneksi device.`)
    } else {
      alert(`${result.stats.synced} employee berhasil didaftarkan ke device.`)
    }
  } catch {
    alert('Gagal push ke device. Cek koneksi device dan coba lagi.')
  }
}

async function handlePullLogs() {
  try {
    const result = await pullLogs()
    const msg = result.processed > 0
      ? `${result.processed} log absensi berhasil ditarik.`
      : 'Tidak ada log baru. Semua sudah ter-sync atau belum ada absensi.'
    alert(msg)
  } catch {
    alert('Gagal terhubung ke device. Pastikan device online.')
  }
}

async function handleImportFromDevice() {
  if (!confirm('Ini akan mengimpor semua employee dari device ke database dan menandai employee DB yang tidak ada di device sebagai inactive. Lanjutkan?')) return
  try {
    const result = await importFromDevice()
    alert(`Import selesai: ${result.stats.created} baru, ${result.stats.updated} diupdate.`)
  } catch {
    alert('Gagal import dari device.')
  }
}

onMounted(() => fetchSyncStatus())
</script>
```

---

## 12. Penanganan Error

### HTTP 404 — Device tidak ditemukan
```json
{ "success": false, "message": "Device not found" }
```
→ Redirect ke halaman daftar device.

### HTTP 502 — Device tidak bisa dijangkau (pull log)
```json
{
  "success": false,
  "message": "Failed to pull events from device (192.168.1.23:80)",
  "hint": "Device not reachable. Check IP, port, and network connectivity."
}
```
→ Tampilkan pesan: *"Device tidak dapat dijangkau. Pastikan device menyala dan terhubung ke jaringan."*

### HTTP 422 / VALIDATION_ERROR — Field tidak valid
```json
{ "success": false, "message": "employeeNo is required" }
```
→ Highlight field yang error di form.

### HTTP 409 — employeeNo sudah dipakai user lain
```json
{
  "success": false,
  "message": "deviceEmployeeNo \"005\" is already assigned to Budi Santoso"
}
```
→ Tampilkan nama user yang sudah memakai nomor tersebut.

### Push partial failure (`success: false` tapi HTTP 200)
Terjadi saat sebagian employee berhasil push, sebagian gagal. Cek `stats.failed > 0` dan tampilkan `results` yang berstatus `failed`.

---

## Ringkasan Endpoint

| Endpoint | Method | Fungsi |
|---|---|---|
| `/devices/:id/sync-status` | GET | Status sync overview + warnings + panduan |
| `/devices/:id/employees` | POST | Tambah employee ke device (atau DB saja) |
| `/devices/:id/push-pending-employees` | POST | Push semua pending ke device (batch) |
| `/devices/:id/sync-employees` | POST | Import employee dari device ke DB |
| `/devices/:id/sync` | POST | Pull attendance log dari device ke DB |
| `/devices/:id/logs` | GET | Lihat log absensi di DB |
| `/device-employees` | GET | Lihat semua employee di DB (filter by device/status) |
| `/device-employees/:id` | PUT | Update data employee (link user, ubah nama) |
| `/device-employees/:id/status` | PATCH | Aktifkan/nonaktifkan employee (push ke device) |
| `/devices/:id/employees` | GET | Lihat employee langsung dari hardware device |
| `/staff-mapping` | GET | Lihat mapping user ↔ employeeNo |
| `/staff-mapping/:userId` | PUT | Assign employeeNo ke user |
| `/reprocess-logs` | POST | Proses ulang log yang tidak ter-match |
