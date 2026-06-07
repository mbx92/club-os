<route lang="yaml">
meta:
  title: Device Sync
  layout: default
</route>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Breadcrumb -->
    <div class="text-sm breadcrumbs mb-4">
      <ul>
        <li><router-link to="/gym/hikvision/devices">Hikvision Devices</router-link></li>
        <li>Sync Status</li>
      </ul>
    </div>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Device Sync</h1>
        <p class="text-base-content/60 mt-1">Pantau dan kelola sinkronisasi employee & absensi antara DB dan device</p>
      </div>
      <button class="btn btn-outline btn-sm" @click="fetchSyncStatus" :disabled="loading">
        <span v-if="loading" class="loading loading-spinner loading-xs"></span>
        <IconRefresh v-else class="w-4 h-4" />
        Refresh
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading && !syncStatus" class="flex justify-center py-20">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Error state -->
    <div v-else-if="!syncStatus && error" class="alert alert-error">
      <IconAlertCircle class="w-5 h-5 shrink-0" />
      <span>{{ error }}</span>
      <button class="btn btn-ghost btn-sm" @click="fetchSyncStatus">Coba Lagi</button>
    </div>

    <template v-else-if="syncStatus">
      <!-- Device info card -->
      <div class="card bg-base-100 shadow mb-4">
        <div class="card-body p-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <IconServer class="w-8 h-8 text-primary shrink-0" />
              <div>
                <p class="font-semibold text-lg leading-tight">{{ syncStatus.device.name }}</p>
                <p class="text-base-content/50 text-sm">
                  {{ syncStatus.device.ipAddress }}:{{ syncStatus.device.port }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3 flex-wrap">
              <span :class="['badge badge-sm', syncStatus.device.isActive ? 'badge-success' : 'badge-error']">
                {{ syncStatus.device.isActive ? 'Aktif' : 'Tidak Aktif' }}
              </span>
              <span class="text-base-content/50 text-sm flex items-center gap-1">
                <IconClock class="w-4 h-4" />
                Sync terakhir: {{ lastSyncLabel }}
              </span>
              <span v-if="syncStatus.autoSync?.enabled" class="text-base-content/40 text-xs">
                Auto sync tiap {{ syncStatus.autoSync.intervalMinutes }} menit
                (berikutnya ~{{ syncStatus.autoSync.estimatedNextRunInMinutes }} mnt lagi)
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Warning banners -->
      <div
        v-for="w in warnings"
        :key="w.message"
        :class="['alert shadow-sm mb-3', w.level === 'error' ? 'alert-error' : 'alert-warning']"
      >
        <IconAlertTriangle class="w-5 h-5 shrink-0" />
        <div>
          <p class="font-medium">{{ w.message }}</p>
          <p class="text-xs mt-0.5 opacity-70">Tindakan: <code>{{ w.action }}</code></p>
        </div>
      </div>

      <!-- Stats grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div class="stat bg-base-100 shadow rounded-box py-4 px-5">
          <div class="stat-title text-xs">Aktif di Device</div>
          <div class="stat-value text-success text-2xl">{{ syncStatus.employeeSyncStats.active }}</div>
        </div>
        <div class="stat bg-base-100 shadow rounded-box py-4 px-5">
          <div class="stat-title text-xs">Pending Sync</div>
          <div
            :class="['stat-value text-2xl', syncStatus.employeeSyncStats.pending_sync > 0 ? 'text-warning' : 'text-base-content/30']"
          >
            {{ syncStatus.employeeSyncStats.pending_sync }}
          </div>
        </div>
        <div class="stat bg-base-100 shadow rounded-box py-4 px-5">
          <div class="stat-title text-xs">Gagal Sync</div>
          <div
            :class="['stat-value text-2xl', syncStatus.employeeSyncStats.sync_failed > 0 ? 'text-error' : 'text-base-content/30']"
          >
            {{ syncStatus.employeeSyncStats.sync_failed }}
          </div>
        </div>
        <div class="stat bg-base-100 shadow rounded-box py-4 px-5">
          <div class="stat-title text-xs">Nonaktif</div>
          <div class="stat-value text-base-content/30 text-2xl">{{ syncStatus.employeeSyncStats.inactive }}</div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex flex-wrap gap-2 mb-6">
        <button
          v-if="hasPendingEmployees"
          class="btn btn-primary btn-sm"
          :disabled="pushLoading || pullLoading || importLoading"
          @click="handlePushPending"
        >
          <span v-if="pushLoading" class="loading loading-spinner loading-xs"></span>
          <IconCloudUpload v-else class="w-4 h-4" />
          Push {{ pendingCount }} Pending ke Device
        </button>

        <button
          class="btn btn-secondary btn-sm"
          :disabled="pullLoading || pushLoading || importLoading"
          @click="pullLogsModal?.showModal()"
        >
          <span v-if="pullLoading" class="loading loading-spinner loading-xs"></span>
          <IconCloudDownload v-else class="w-4 h-4" />
          Pull Log Absensi
        </button>

        <button
          class="btn btn-outline btn-sm"
          :disabled="importLoading || pushLoading || pullLoading"
          @click="handleImportFromDevice"
        >
          <span v-if="importLoading" class="loading loading-spinner loading-xs"></span>
          <IconFileImport v-else class="w-4 h-4" />
          Import Employee dari Device
        </button>
      </div>

      <!-- 3-step manual sync guide — always visible -->
      <div class="card bg-base-100 shadow mb-4">
        <div class="card-body p-0">
          <div class="px-5 pb-4 pt-3 bg-info/5 rounded-box">
            <div class="flex items-start gap-2 mb-3">
              <IconInfoCircle class="w-4 h-4 text-info shrink-0 mt-0.5" />
              <p class="text-sm font-semibold text-info">Cara memperbaiki employee yang tidak tersync ke device</p>
            </div>
            <div class="flex flex-col sm:flex-row gap-4 text-xs pl-6">
              <div class="flex items-start gap-2 flex-1">
                <span class="badge badge-sm badge-primary shrink-0">1</span>
                <span>Cek bagian <strong>Employee yang Perlu Perhatian</strong> di bawah — employee yang bermasalah akan muncul dengan status <code class="bg-base-200 px-1 rounded">inactive</code> atau <code class="bg-base-200 px-1 rounded">pending_sync</code></span>
              </div>
              <div class="flex items-start gap-2 flex-1">
                <span class="badge badge-sm badge-primary shrink-0">2</span>
                <span>Jika statusnya <code class="bg-base-200 px-1 rounded">inactive</code>, klik tombol <strong>Set ke Pending Sync</strong> pada baris employee tersebut untuk mengubah statusnya</span>
              </div>
              <div class="flex items-start gap-2 flex-1">
                <span class="badge badge-sm badge-primary shrink-0">3</span>
                <span>Klik tombol <strong>Push Pending ke Device</strong> — employee langsung muncul di device dan bisa absensi. Jika hasilnya <code class="bg-base-200 px-1 rounded">sync_failed</code>, pastikan device online lalu push ulang.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Employees needing attention -->
      <div v-if="syncStatus.employeesNeedingAttention?.length > 0" class="card bg-base-100 shadow mb-6">
        <div class="card-body p-0">
          <div class="px-5 pt-4 pb-3 border-b border-base-300">
            <h3 class="font-semibold">Employee yang Perlu Perhatian</h3>
          </div>

          <div class="overflow-x-auto">
            <table class="table table-zebra text-sm">
              <thead>
                <tr>
                  <th>No. Employee</th>
                  <th>Nama</th>
                  <th>Status</th>
                  <th>Terakhir Update</th>
                  <th class="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="emp in syncStatus.employeesNeedingAttention" :key="emp.id" class="hover">
                  <td><span class="badge badge-ghost font-mono">{{ emp.employeeNo }}</span></td>
                  <td class="font-medium">{{ emp.name }}</td>
                  <td>
                    <span :class="['badge badge-sm', statusBadgeClass(emp.status)]">
                      {{ emp.status }}
                    </span>
                  </td>
                  <td class="text-base-content/50 text-xs">{{ formatDate(emp.updatedAt) }}</td>
                  <td class="text-center">
                    <!-- Step 2: inactive → set to pending_sync first -->
                    <button
                      v-if="emp.status === 'inactive'"
                      class="btn btn-xs btn-outline btn-warning"
                      :disabled="loading"
                      @click="handleSetPendingSync(emp.id)"
                    >
                      Set ke Pending Sync
                    </button>
                    <!-- pending_sync / sync_failed: use Push Pending button at top -->
                    <span
                      v-else-if="emp.status === 'pending_sync' || emp.status === 'sync_failed'"
                      class="text-xs text-base-content/50 italic"
                    >
                      → Klik Push di atas
                    </span>
                    <button
                      v-else-if="emp.status === 'active'"
                      class="btn btn-xs btn-outline btn-error"
                      :disabled="loading"
                      @click="handleSetStatus(emp.id, 'inactive')"
                    >
                      Nonaktifkan
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Latest attendance log -->
      <div v-if="syncStatus.latestAttendanceLog" class="alert alert-info alert-soft text-sm">
        <IconFingerprint class="w-5 h-5 shrink-0" />
        <span>
          Log absensi terakhir:
          <strong>Emp #{{ syncStatus.latestAttendanceLog.employeeNo }}</strong>
          via <em>{{ syncStatus.latestAttendanceLog.verifyMode }}</em>
          pada {{ formatDate(syncStatus.latestAttendanceLog.eventTime) }}
        </span>
      </div>

      <!-- Push Status Card -->
      <div class="card bg-base-100 shadow mt-6">
        <div class="card-body p-0">
          <div class="px-5 pt-4 pb-3 border-b border-base-300 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <IconActivity class="w-5 h-5 text-primary" />
              <h3 class="font-semibold">Push Status Device</h3>
            </div>
            <button
              class="btn btn-outline btn-xs"
              :disabled="pushStatusLoading"
              @click="handleFetchPushStatus"
            >
              <span v-if="pushStatusLoading" class="loading loading-spinner loading-xs"></span>
              <IconRefresh v-else class="w-3.5 h-3.5" />
              Cek Status
            </button>
          </div>

          <!-- Not yet fetched -->
          <div v-if="!pushStatus && !pushStatusLoading" class="px-5 py-6 text-center text-base-content/40 text-sm">
            Klik <strong>Cek Status</strong> untuk melihat status push dari device ke server.
          </div>

          <!-- Loading -->
          <div v-else-if="pushStatusLoading" class="flex justify-center py-6">
            <span class="loading loading-spinner loading-md"></span>
          </div>

          <!-- Push status result -->
          <div v-else-if="pushData" class="p-5 space-y-4">
            <!-- inSync banner -->
            <div :class="['alert alert-soft text-sm', pushData.inSync ? 'alert-success' : 'alert-error']">
              <component :is="pushData.inSync ? IconWifi : IconWifiOff" class="w-5 h-5 shrink-0" />
              <span v-if="pushData.inSync">Push URL di <strong>device</strong> dan <strong>database</strong> sudah sinkron.</span>
              <span v-else>Push URL di device dan database <strong>tidak sinkron</strong> — konfigurasi ulang push URL pada device.</span>
            </div>

            <!-- DB vs Device comparison table -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <!-- Database -->
              <div class="bg-base-200 rounded-xl p-4">
                <div class="flex items-center gap-2 mb-3 text-sm font-semibold">
                  <IconDatabase class="w-4 h-4 text-secondary" />
                  Database
                </div>
                <dl class="space-y-2 text-sm">
                  <div class="flex items-start justify-between gap-2">
                    <dt class="text-base-content/50">Push Enabled</dt>
                    <dd>
                      <span :class="['badge badge-sm', pushData.database?.pushEnabled ? 'badge-success' : 'badge-ghost']">
                        {{ pushData.database?.pushEnabled ? 'Aktif' : 'Nonaktif' }}
                      </span>
                    </dd>
                  </div>
                  <div class="flex items-start justify-between gap-2">
                    <dt class="text-base-content/50 shrink-0">Push URL</dt>
                    <dd class="font-mono text-xs text-right break-all">
                      <span v-if="pushData.database?.pushUrl">{{ pushData.database.pushUrl }}</span>
                      <span v-else class="text-base-content/30">—</span>
                    </dd>
                  </div>
                </dl>
              </div>

              <!-- Device -->
              <div class="bg-base-200 rounded-xl p-4">
                <div class="flex items-center gap-2 mb-3 text-sm font-semibold">
                  <IconServer class="w-4 h-4 text-primary" />
                  Device
                </div>
                <dl class="space-y-2 text-sm">
                  <div class="flex items-start justify-between gap-2">
                    <dt class="text-base-content/50">Push Enabled</dt>
                    <dd>
                      <span :class="['badge badge-sm', pushData.device?.pushEnabled ? 'badge-success' : 'badge-ghost']">
                        {{ pushData.device?.pushEnabled ? 'Aktif' : 'Nonaktif' }}
                      </span>
                    </dd>
                  </div>
                  <div class="flex items-start justify-between gap-2">
                    <dt class="text-base-content/50 shrink-0">Push URL</dt>
                    <dd class="font-mono text-xs text-right break-all">
                      <span v-if="pushData.device?.pushUrl">{{ pushData.device.pushUrl }}</span>
                      <span v-else class="text-base-content/30">—</span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Pull logs modal -->
    <dialog ref="pullLogsModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Pull Log Absensi</h3>
        <div class="form-control mb-3">
          <label class="label">
            <span class="label-text">Tarik dari tanggal (opsional)</span>
          </label>
          <input
            v-model="pullStartDate"
            type="datetime-local"
            class="input input-bordered"
          />
          <label class="label">
            <span class="label-text-alt text-base-content/50">
              Kosongkan untuk tarik dari lastSyncAt device (default).
            </span>
          </label>
        </div>
        <div class="form-control mb-4">
          <label class="label cursor-pointer justify-start gap-3">
            <input v-model="pullFullDay" type="checkbox" class="checkbox checkbox-sm" />
            <span class="label-text">Full day (00:00 hari ini sampai sekarang)</span>
          </label>
        </div>
        <div class="modal-action">
          <form method="dialog">
            <button class="btn btn-ghost btn-sm">Batal</button>
          </form>
          <button class="btn btn-secondary btn-sm" :disabled="pullLoading" @click="handlePullLogs">
            <span v-if="pullLoading" class="loading loading-spinner loading-xs"></span>
            Pull Log
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDeviceSync } from '@/composables/gym/hikvision'
import {
  IconRefresh,
  IconAlertCircle,
  IconAlertTriangle,
  IconServer,
  IconClock,
  IconCloudUpload,
  IconCloudDownload,
  IconFileImport,
  IconFingerprint,
  IconWifi,
  IconWifiOff,
  IconDatabase,
  IconActivity,
  IconInfoCircle,
} from '@tabler/icons-vue'
import dayjs from 'dayjs'

const route = useRoute()
const deviceId = route.params.id

const {
  syncStatus,
  pushStatus,
  loading,
  pushLoading,
  pullLoading,
  importLoading,
  pushStatusLoading,
  error,
  hasPendingEmployees,
  pendingCount,
  warnings,
  fetchSyncStatus,
  pushPendingEmployees,
  pullAttendanceLogs,
  importFromDevice,
  setEmployeeStatus,
  setPendingSync,
  fetchPushStatus,
} = useDeviceSync(deviceId)

// ─── Computed ────────────────────────────────────────────────────

const lastSyncLabel = computed(() => {
  const ts = syncStatus.value?.device?.lastSyncAt
  if (!ts) return 'Belum pernah sync'
  const diffMs = Date.now() - new Date(ts).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'baru saja'
  if (diffMin < 60) return `${diffMin} menit lalu`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} jam lalu`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay} hari lalu`
})

// ─── Helpers ─────────────────────────────────────────────────────

function statusBadgeClass(status) {
  return (
    {
      active: 'badge-success badge-outline',
      pending_sync: 'badge-warning badge-outline',
      sync_failed: 'badge-error badge-outline',
      inactive: 'badge-ghost',
    }[status] ?? 'badge-ghost'
  )
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return dayjs(dateStr).format('DD MMM YYYY HH:mm')
}

// ─── Pull logs modal ─────────────────────────────────────────────

const pullLogsModal = ref(null)
const pullStartDate = ref('')
const pullFullDay = ref(false)

async function handlePullLogs() {
  try {
    const result = await pullAttendanceLogs(
      pullStartDate.value || null,
      pullFullDay.value,
    )
    pullLogsModal.value?.close()
    pullStartDate.value = ''
    pullFullDay.value = false
    if (!result.processed) {
      // no-op: notification handled in composable
    }
  } catch {
    // error handled in composable
  }
}

// ─── Push pending ────────────────────────────────────────────────

async function handlePushPending() {
  try {
    await pushPendingEmployees()
  } catch {
    // error handled in composable
  }
}

// ─── Import from device ───────────────────────────────────────────

async function handleImportFromDevice() {
  if (
    !confirm(
      'Ini akan mengimpor semua employee dari device ke database dan menandai employee DB yang tidak ada di device sebagai inactive. Lanjutkan?',
    )
  )
    return
  try {
    await importFromDevice()
  } catch {
    // error handled in composable
  }
}

// ─── Set employee status ─────────────────────────────────────────

async function handleSetStatus(deviceEmployeeId, status) {
  try {
    await setEmployeeStatus(deviceEmployeeId, status, true)
  } catch {
    // error handled in composable
  }
}
// ─── Set employee to pending_sync (step 2 of manual sync) ────

async function handleSetPendingSync(deviceEmployeeId) {
  try {
    await setPendingSync(deviceEmployeeId)
  } catch {
    // error handled in composable
  }
}
// ─── Push status ─────────────────────────────────────────────────

// response: { success, data: { database, device, inSync } }
const pushData = computed(() => pushStatus.value?.data ?? null)

async function handleFetchPushStatus() {
  try {
    await fetchPushStatus()
  } catch {
    // error handled in composable
  }
}

// ─── Lifecycle ───────────────────────────────────────────────────

onMounted(() => fetchSyncStatus())
</script>
