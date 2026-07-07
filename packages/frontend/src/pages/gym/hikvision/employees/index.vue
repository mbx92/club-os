<route lang="yaml">
meta:
  title: Employee
  layout: default
  action: read
  subject: HikvisionDevice
</route>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Breadcrumb -->
    <div class="text-sm breadcrumbs mb-4">
      <ul>
        <li><router-link to="/gym/hikvision/devices">Hikvision Devices</router-link></li>
        <li>Employee</li>
      </ul>
    </div>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Employee</h1>
        <p class="text-base-content/60 mt-1">
          Kelola semua karyawan yang terdaftar di device Hikvision (lintas device)
        </p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button class="btn btn-ghost btn-sm" @click="loadData">
          <IconRefresh class="w-4 h-4 mr-1" />
          Refresh
        </button>
        <button class="btn btn-primary btn-sm" @click="openAddModal">
          <IconUserPlus class="w-4 h-4 mr-1" />
          Tambah Employee
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-6">
      <select v-model="filterStatus" class="select select-bordered select-sm w-full sm:w-auto">
        <option value="">Semua Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="pending_sync">Pending Sync</option>
        <option value="sync_failed">Sync Failed</option>
      </select>
      <select v-model="filterFingerprint" class="select select-bordered select-sm w-full sm:w-auto">
        <option value="">Semua Fingerprint</option>
        <option value="true">Sudah Enroll</option>
        <option value="false">Belum Enroll</option>
      </select>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Cari nama / employee no..."
        class="input input-bordered input-sm w-full sm:w-64"
      />
    </div>

    <!-- Unregistered Staff Alert -->
    <div v-if="unregisteredStaff.length > 0" class="alert alert-warning shadow-sm mb-4 cursor-pointer" @click="unregisteredStaffModal?.showModal()">
      <IconAlertTriangle class="w-5 h-5 shrink-0" />
      <span>Ada <strong>{{ unregisteredStaff.length }}</strong> staff yang belum terdaftar pada mesin absen.</span>
      <button class="btn btn-warning btn-xs">Lihat</button>
    </div>

    <!-- Stats -->
    <div v-if="!loading && deviceEmployees.length > 0" class="stats stats-horizontal shadow mb-6 w-full">
      <div class="stat place-items-center">
        <div class="stat-title">Total</div>
        <div class="stat-value text-lg">{{ pagination.total || deviceEmployees.length }}</div>
      </div>
      <div class="stat place-items-center">
        <div class="stat-title">Active</div>
        <div class="stat-value text-lg text-success">{{ activeCount }}</div>
      </div>
      <div class="stat place-items-center cursor-pointer" @click="filterStatus = 'pending_sync'" :title="'Klik untuk filter'">
        <div class="stat-title">Pending Sync</div>
        <div :class="['stat-value text-lg', pendingSyncCount > 0 ? 'text-warning' : 'text-base-content/30']">{{ pendingSyncCount }}</div>
      </div>
      <div class="stat place-items-center cursor-pointer" @click="filterStatus = 'sync_failed'" :title="'Klik untuk filter'">
        <div class="stat-title">Sync Failed</div>
        <div :class="['stat-value text-lg', syncFailedCount > 0 ? 'text-error' : 'text-base-content/30']">{{ syncFailedCount }}</div>
      </div>
      <div class="stat place-items-center">
        <div class="stat-title">Fingerprint</div>
        <div class="stat-value text-lg text-info">{{ fingerprintCount }}</div>
      </div>
      <div class="stat place-items-center">
        <div class="stat-title">Linked User</div>
        <div class="stat-value text-lg text-primary">{{ linkedCount }}</div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Empty state -->
    <div v-else-if="deviceEmployees.length === 0" class="text-center py-12">
      <IconUsers class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
      <h3 class="text-xl font-semibold mb-2">Belum ada employee</h3>
      <p class="text-base-content/60 mb-4">Tambahkan employee ke device atau sync dari halaman detail device.</p>
      <button class="btn btn-primary btn-sm" @click="openAddModal">
        <IconUserPlus class="w-4 h-4 mr-1" /> Tambah Employee
      </button>
    </div>

    <!-- Table -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="flex items-center justify-between px-5 pt-4 pb-0">
        <h3 class="font-semibold text-base">Daftar Employee</h3>
        <div class="flex items-center gap-2">
          <select v-model="pageSize" class="select select-bordered select-sm">
            <option :value="10">10 / hal</option>
            <option :value="20">20 / hal</option>
            <option :value="50">50 / hal</option>
            <option :value="100">100 / hal</option>
          </select>
          <span class="badge badge-ghost whitespace-nowrap">{{ pagination.total }} employee</span>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table table-zebra table-sm">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Device</th>
                <th>Fingerprint</th>
                <th>Status</th>
                <th class="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="emp in filteredEmployees" :key="emp.id">
                <td>
                  <div class="flex items-center gap-3">
                    <div class="avatar placeholder">
                      <div class="bg-base-300 text-base-content rounded-full w-9 h-9" style="display:flex;align-items:center;justify-content:center">
                        <span class="text-xs font-bold">{{ empInitials(emp) }}</span>
                      </div>
                    </div>
                    <div>
                      <div class="font-medium">{{ emp.name || '—' }}</div>
                      <div class="text-xs text-base-content/50 font-mono">No. {{ emp.employeeNo }}</div>
                      <div v-if="emp.lastSyncAt" class="text-xs text-base-content/40">
                        Sync: {{ formatDate(emp.lastSyncAt) }}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div v-if="emp.device" class="text-sm">
                    <div class="font-medium">{{ emp.device.name }}</div>
                    <div class="text-xs text-base-content/50 font-mono">{{ emp.device.ipAddress }}</div>
                  </div>
                  <span v-else class="text-base-content/40">—</span>
                </td>
                <td>
                  <span
                    class="badge badge-sm"
                    :class="emp.hasFingerprint ? 'badge-success' : 'badge-warning'"
                  >
                    <IconFingerprint class="w-3 h-3 mr-1" />
                    {{ emp.hasFingerprint ? `${emp.fingerprintCount || 1} enrolled` : 'Belum' }}
                  </span>
                </td>
                <td>
                  <span :class="['badge badge-sm', statusBadgeClass(emp.status)]">
                    {{ statusLabel(emp.status) }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="flex justify-end gap-2 flex-wrap">
                    <!-- inactive → step 2: set to pending_sync -->
                    <button
                      v-if="emp.status === 'inactive'"
                      class="btn btn-xs btn-outline btn-warning"
                      :disabled="statusLoading"
                      @click="handleSetPendingSync(emp)"
                    >
                      Set Pending Sync
                    </button>
                    <!-- pending_sync / sync_failed → step 3: push to device -->
                    <button
                      v-else-if="emp.status === 'pending_sync' || emp.status === 'sync_failed'"
                      class="btn btn-xs btn-outline btn-primary"
                      :disabled="pushLoading"
                      @click="handlePushForDevice(emp.device?.id)"
                    >
                      <span v-if="pushLoading" class="loading loading-spinner loading-xs"></span>
                      <IconCloudUpload v-else class="w-3 h-3" />
                      Push ke Device
                    </button>
                    <!-- active → deactivate -->
                    <button
                      v-else-if="emp.status === 'active'"
                      class="btn btn-xs btn-ghost"
                      :disabled="statusLoading"
                      @click="openToggleStatusModal(emp)"
                    >
                      Nonaktifkan
                    </button>
                    <button
                      class="btn btn-sm btn-info btn-outline"
                      @click="openEnrollModal(emp)"
                      :disabled="enrollLoading"
                      title="Enroll Fingerprint"
                    >
                      <IconFingerprint class="w-4 h-4" />
                      Enroll FP
                    </button>
                    <button
                      class="btn btn-sm btn-ghost"
                      @click="openDetailModal(emp)"
                      title="Detail"
                    >
                      <IconEye class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-base-300">
        <span class="text-sm text-base-content/60">
          Halaman {{ pagination.page }} dari {{ pagination.totalPages }}
          <span class="text-base-content/40">({{ pagination.total }} data)</span>
        </span>
        <div class="join">
          <button class="join-item btn btn-sm" :disabled="!pagination.hasPrevPage || loading" @click="loadPage(1)">«</button>
          <button class="join-item btn btn-sm" :disabled="!pagination.hasPrevPage || loading" @click="loadPage(pagination.page - 1)">‹</button>
          <template v-for="p in paginationPages" :key="p">
            <button
              v-if="p !== '...'"
              class="join-item btn btn-sm"
              :class="p === pagination.page ? 'btn-primary' : ''"
              :disabled="loading"
              @click="loadPage(p)"
            >{{ p }}</button>
            <span v-else class="join-item btn btn-sm btn-disabled">…</span>
          </template>
          <button class="join-item btn btn-sm" :disabled="!pagination.hasNextPage || loading" @click="loadPage(pagination.page + 1)">›</button>
          <button class="join-item btn btn-sm" :disabled="!pagination.hasNextPage || loading" @click="loadPage(pagination.totalPages)">»</button>
        </div>
      </div>
    </div>

    <!-- Link User Modal -->
    <dialog ref="linkModal" class="modal">
      <div class="modal-box w-11/12 max-w-md">
        <h3 class="font-bold text-lg mb-4">
          Link Employee ke User
        </h3>
        <p class="mb-2 text-base-content/70">
          Employee: <strong>{{ linkTarget?.name || linkTarget?.employeeNo }}</strong>
          <span class="badge badge-outline badge-sm font-mono ml-1">No. {{ linkTarget?.employeeNo }}</span>
        </p>
        <p v-if="linkTarget?.device" class="mb-4 text-sm text-base-content/50">
          Device: {{ linkTarget.device.name }}
        </p>
        <form @submit.prevent="handleLink">
          <div class="form-control mb-4">
            <label class="label">
              <span class="label-text">Pilih User</span>
            </label>
            <select v-model="linkForm.userId" class="select select-bordered w-full" required>
              <option value="">-- Pilih User --</option>
              <option v-for="u in availableStaff" :key="u.id" :value="u.id">
                {{ u.firstName }} {{ u.lastName }} ({{ u.email }})
              </option>
            </select>
          </div>
          <div class="form-control mb-4">
            <label class="label">
              <span class="label-text">Nama (opsional)</span>
            </label>
            <input
              type="text"
              v-model="linkForm.name"
              class="input input-bordered w-full"
              placeholder="Override nama di device"
            />
          </div>
          <div class="modal-action">
            <button type="button" class="btn" @click="closeLinkModal">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              <span v-if="loading" class="loading loading-spinner loading-sm"></span>
              Simpan
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- Detail Modal -->
    <dialog ref="detailModal" class="modal">
      <div class="modal-box w-11/12 max-w-lg">
        <h3 class="font-bold text-lg mb-4">Detail Employee</h3>
        <div v-if="detailTarget" class="space-y-3 text-sm">
          <div class="flex justify-between"><span class="text-base-content/60">ID</span><span class="font-mono text-xs">{{ detailTarget.id }}</span></div>
          <div class="flex justify-between"><span class="text-base-content/60">Employee No</span><span class="font-mono font-bold">{{ detailTarget.employeeNo }}</span></div>
          <div class="flex justify-between"><span class="text-base-content/60">Nama</span><span>{{ detailTarget.name || '—' }}</span></div>
          <div class="flex justify-between"><span class="text-base-content/60">Status</span>
            <span class="badge text-xs" :class="detailTarget.status === 'active' ? 'badge-success' : 'badge-error'">{{ detailTarget.status }}</span>
          </div>
          <div class="divider my-1">Device</div>
          <template v-if="detailTarget.device">
            <div class="flex justify-between"><span class="text-base-content/60">Device</span><span>{{ detailTarget.device.name }}</span></div>
            <div class="flex justify-between"><span class="text-base-content/60">IP</span><span class="font-mono">{{ detailTarget.device.ipAddress }}</span></div>
          </template>
          <div class="divider my-1">User</div>
          <template v-if="detailTarget.user">
            <div class="flex justify-between"><span class="text-base-content/60">User</span><span>{{ detailTarget.user.firstName }} {{ detailTarget.user.lastName }}</span></div>
            <div class="flex justify-between"><span class="text-base-content/60">Email</span><span>{{ detailTarget.user.email }}</span></div>
          </template>
          <div v-else class="text-base-content/50 italic">Belum di-link ke user</div>
          <div class="divider my-1">Fingerprint</div>
          <div class="flex justify-between"><span class="text-base-content/60">Status</span>
            <span class="badge text-xs" :class="detailTarget.hasFingerprint ? 'badge-success' : 'badge-warning'">
              {{ detailTarget.hasFingerprint ? 'Enrolled' : 'Belum' }}
            </span>
          </div>
          <div class="flex justify-between"><span class="text-base-content/60">Jumlah</span><span>{{ detailTarget.fingerprintCount || 0 }}</span></div>
          <div v-if="detailTarget.lastSyncAt" class="flex justify-between"><span class="text-base-content/60">Last Sync</span><span>{{ formatDate(detailTarget.lastSyncAt) }}</span></div>
        </div>
        <div class="modal-action">
          <button class="btn" @click="closeDetailModal">Tutup</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- Unregistered Staff Modal -->
    <dialog ref="unregisteredStaffModal" class="modal">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-2">Staff Belum Terdaftar di Mesin Absen</h3>
        <p class="text-base-content/60 text-sm mb-4">Staff berikut belum terdaftar di device manapun. Klik "Tambah" untuk mendaftarkan.</p>
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th class="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="staff in unregisteredStaff" :key="staff.id" class="hover">
                <td class="font-medium">{{ staff.firstName || '' }} {{ staff.lastName || '' }}</td>
                <td class="text-base-content/60">{{ staff.email }}</td>
                <td><span class="badge badge-ghost badge-sm">{{ staff.role?.name || '—' }}</span></td>
                <td class="text-right">
                  <button class="btn btn-primary btn-xs" @click="openAddModalForStaff(staff)">
                    <IconUserPlus class="w-3 h-3 mr-1" /> Tambah
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-action">
          <button class="btn" @click="unregisteredStaffModal?.close()">Tutup</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- Add Employee Modal -->
    <dialog ref="addModal" class="modal">
      <div class="modal-box max-w-lg">
        <h3 class="font-bold text-lg mb-4">Tambah Employee ke Device</h3>
        <form @submit.prevent="handleAddEmployee">
          <div class="form-control mb-3">
            <label class="label"><span class="label-text">Device <span class="text-error">*</span></span></label>
            <select v-model="addForm.deviceId" class="select select-bordered w-full" required>
              <option value="" disabled>Pilih device</option>
              <option v-for="dev in devices" :key="dev.id" :value="dev.id">{{ dev.name }} ({{ dev.ipAddress }})</option>
            </select>
          </div>
          <div class="form-control mb-3">
            <label class="label"><span class="label-text">Employee No <span class="text-error">*</span></span></label>
            <input type="text" v-model="addForm.employeeNo" class="input input-bordered w-full font-mono" placeholder="e.g. 1001" required />
            <label class="label"><span class="label-text-alt text-base-content/60">Nomor unik di device (1001, 1002, ...)</span></label>
          </div>
          <div class="form-control mb-3">
            <label class="label"><span class="label-text">Nama <span class="text-error">*</span></span></label>
            <input type="text" v-model="addForm.name" class="input input-bordered w-full" placeholder="Nama lengkap karyawan" required />
          </div>
          <div class="form-control mb-3">
            <label class="label"><span class="label-text">Link ke Staff (opsional)</span></label>
            <select v-model="addForm.userId" class="select select-bordered w-full">
              <option value="">— Tidak di-link —</option>
              <option v-for="u in availableStaff" :key="u.id" :value="u.id">{{ u.firstName || '' }} {{ u.lastName || '' }} ({{ u.email }})</option>
            </select>
          </div>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="addModal?.close()">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="addLoading || !addForm.deviceId">
              <span v-if="addLoading" class="loading loading-spinner loading-xs mr-1"></span>
              Tambah
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- Toggle Status Confirm Modal -->
    <dialog ref="toggleStatusModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-2">
          {{ toggleTarget?.status === 'active' ? 'Nonaktifkan' : 'Aktifkan' }} Employee?
        </h3>
        <p class="text-sm mb-1">
          <strong>{{ toggleTarget?.name }}</strong>
          <span class="badge badge-ghost font-mono badge-sm ml-1">empNo: {{ toggleTarget?.employeeNo }}</span>
        </p>
        <p v-if="toggleTarget?.device" class="text-xs text-base-content/60 mb-3">Device: {{ toggleTarget.device.name }} ({{ toggleTarget.device.ipAddress }})</p>
        <p class="text-sm text-base-content/70">
          {{ toggleTarget?.status === 'active'
            ? 'Akses fingerprint akan dicabut di device. Fingerprint tetap tersimpan.'
            : 'Employee akan diaktifkan kembali di device.' }}
        </p>
        <div v-if="deviceSyncWarning" class="alert alert-warning mt-3 text-sm py-2">
          <IconAlertTriangle class="w-4 h-4 shrink-0" />
          <span>Status DB diperbarui, tapi gagal sync ke device. Pastikan device online dan coba lagi.</span>
        </div>
        <div class="modal-action">
          <button class="btn btn-sm" @click="toggleStatusModal?.close(); deviceSyncWarning = false">Batal</button>
          <button
            class="btn btn-sm"
            :class="toggleTarget?.status === 'active' ? 'btn-error' : 'btn-success'"
            :disabled="statusLoading"
            @click="handleToggleStatus"
          >
            <span v-if="statusLoading" class="loading loading-spinner loading-sm"></span>
            Ya, Lanjutkan
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
    <!-- ═══════════════════════════════════════════════ -->
    <dialog ref="enrollModal" class="modal">
      <div class="modal-box max-w-lg">
        <h3 class="font-bold text-lg mb-2">Enroll Fingerprint</h3>
        <p class="text-base-content/60 mb-4">
          Employee: <strong>{{ enrollEmployee?.name }}</strong>
          <span v-if="enrollEmployee?.device" class="ml-2 badge badge-ghost badge-sm">{{ enrollEmployee.device.name }}</span>
        </p>

        <!-- Step 1: Select finger options -->
        <div v-if="!enrollStarted" class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label"><span class="label-text">Slot Jari (1-10)</span></label>
              <select v-model="fingerNo" class="select select-bordered w-full">
                <option :value="1">1 — Telunjuk Kanan</option>
                <option :value="2">2 — Tengah Kanan</option>
                <option :value="3">3 — Manis Kanan</option>
                <option :value="4">4 — Kelingking Kanan</option>
                <option :value="5">5 — Jempol Kanan</option>
                <option :value="6">6 — Telunjuk Kiri</option>
                <option :value="7">7 — Tengah Kiri</option>
                <option :value="8">8 — Manis Kiri</option>
                <option :value="9">9 — Kelingking Kiri</option>
                <option :value="10">10 — Jempol Kiri</option>
              </select>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Tipe</span></label>
              <select v-model="fingerType" class="select select-bordered w-full">
                <option value="normalFP">Normal</option>
                <option value="patrolFP">Patrol</option>
                <option value="superFP">Super</option>
              </select>
            </div>
          </div>
          <div class="modal-action">
            <button class="btn btn-ghost" @click="enrollModal?.close()">Batal</button>
            <button class="btn btn-info" @click="handleEnroll" :disabled="enrollLoading">
              <span v-if="enrollLoading" class="loading loading-spinner loading-xs mr-1"></span>
              <IconFingerprint v-else class="w-4 h-4 mr-1" />
              Mulai Enrollment
            </button>
          </div>
        </div>

        <!-- Step 2: Enrollment active -->
        <div v-else class="space-y-4">
          <div class="alert alert-success">
            <IconFingerprint class="w-6 h-6 shrink-0 animate-pulse" />
            <div>
              <div class="font-semibold">Enrollment mode aktif</div>
              <div class="text-sm">{{ enrollMessage }}</div>
            </div>
          </div>
          <div v-if="enrollInstructions.length" class="bg-base-200 rounded-lg p-4 space-y-1">
            <p class="text-sm font-semibold mb-2">Ikuti langkah berikut:</p>
            <p v-for="(step, i) in enrollInstructions" :key="i" class="text-sm text-base-content/80">{{ step }}</p>
          </div>
          <div class="alert alert-warning">
            <span class="text-sm">Tempelkan jari yang sama <strong>3 kali</strong> pada scanner device.</span>
          </div>
          <div v-if="enrollCountdown > 0" class="flex items-center gap-2 text-sm text-base-content/60">
            <IconClock class="w-4 h-4" />
            <span>Lock auto-expire dalam <strong>{{ enrollCountdown }}</strong> detik</span>
          </div>
          <div class="modal-action">
            <button class="btn btn-ghost btn-sm" @click="handleReleaseLock" :disabled="loading">
              <IconLockOpen class="w-4 h-4 mr-1" /> Release Lock
            </button>
            <button class="btn btn-primary" @click="handleFinishEnroll">Selesai</button>
          </div>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useHikvisionEmployees } from '@/composables/gym/hikvision'
import { useHikvisionDevices } from '@/composables/gym/hikvision'
import { useDeviceEmployeeDuplicate } from '@/composables/gym/hikvision'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'
import {
  IconRefresh,
  IconUsers,
  IconFingerprint,
  IconFingerprintOff,
  IconEye,
  IconUserPlus,
  IconAlertTriangle,
  IconClock,
  IconLockOpen,
  IconCloudUpload,
} from '@tabler/icons-vue'

const {
  deviceEmployees,
  availableStaff,
  loading,
  enrollLoading,
  pagination,
  fetchDeviceEmployees,
  updateDeviceEmployee,
  addEmployee,
  enrollFingerprint,
  releaseEnrollmentLock,
} = useHikvisionEmployees()

const { devices, fetchDevices } = useHikvisionDevices()
const { statusLoading, updateStatus } = useDeviceEmployeeDuplicate()
const api = useApi()
const { showSuccess, handleError } = useNotification()

// ─── Toggle Active / Inactive ───────────────────────────────────
const toggleStatusModal = ref(null)
const toggleTarget = ref(null)
const deviceSyncWarning = ref(false)

const openToggleStatusModal = (emp) => {
  toggleTarget.value = emp
  deviceSyncWarning.value = false
  toggleStatusModal.value?.showModal()
}

const handleToggleStatus = async () => {
  if (!toggleTarget.value) return
  const newStatus = toggleTarget.value.status === 'active' ? 'inactive' : 'active'
  try {
    const result = await updateStatus(toggleTarget.value.id, newStatus, true)
    if (result?.deviceSync?.attempted && !result?.deviceSync?.success) {
      deviceSyncWarning.value = true
    } else {
      toggleStatusModal.value?.close()
    }
    await loadData()
  } catch {
    // handled by composable
  }
}

// ─── Filters ────────────────────────────────────────────────────
const filterStatus = ref('')
const filterFingerprint = ref('')
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(20)

const filteredEmployees = computed(() => {
  let list = deviceEmployees.value.filter(e => String(e.employeeNo) !== '1')
  const q = searchQuery.value.toLowerCase().trim()
  if (q) {
    list = list.filter(e =>
      (e.name || '').toLowerCase().includes(q) ||
      (e.employeeNo || '').toLowerCase().includes(q) ||
      (e.user?.firstName || '').toLowerCase().includes(q) ||
      (e.user?.lastName || '').toLowerCase().includes(q) ||
      (e.user?.email || '').toLowerCase().includes(q) ||
      (e.device?.name || '').toLowerCase().includes(q)
    )
  }
  return list
})

const paginationPages = computed(() => {
  const total = pagination.value.totalPages
  const cur = pagination.value.page
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  if (cur <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i)
    pages.push('...')
    pages.push(total)
  } else if (cur >= total - 3) {
    pages.push(1)
    pages.push('...')
    for (let i = total - 4; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    pages.push('...')
    for (let i = cur - 1; i <= cur + 1; i++) pages.push(i)
    pages.push('...')
    pages.push(total)
  }
  return pages
})

// ─── Stats ──────────────────────────────────────────────────────
const activeCount = computed(() => deviceEmployees.value.filter(e => e.status === 'active').length)
const pendingSyncCount = computed(() => deviceEmployees.value.filter(e => e.status === 'pending_sync').length)
const syncFailedCount = computed(() => deviceEmployees.value.filter(e => e.status === 'sync_failed').length)
const fingerprintCount = computed(() => deviceEmployees.value.filter(e => e.hasFingerprint).length)
const linkedCount = computed(() => deviceEmployees.value.filter(e => e.userId).length)

// ─── Data loading ───────────────────────────────────────────────
const buildParams = (page = currentPage.value) => {
  const params = { page, limit: pageSize.value }
  if (filterStatus.value) params.status = filterStatus.value
  if (filterFingerprint.value) params.hasFingerprint = filterFingerprint.value
  if (searchQuery.value.trim()) params.search = searchQuery.value.trim()
  return params
}

const loadPage = (page = currentPage.value) => {
  currentPage.value = page
  fetchDeviceEmployees(buildParams(page))
}

const loadData = () => loadPage(1)

let searchTimer = null
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadPage(1), 400)
})
watch(pageSize, () => loadPage(1))
watch([filterStatus, filterFingerprint], () => loadPage(1))

onMounted(loadData)

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

// ─── Unregistered Staff ─────────────────────────────────────────
const unregisteredStaffModal = ref(null)

const unregisteredStaff = computed(() => {
  // availableStaff = staff with deviceEmployeeNo === null (from API)
  // additionally filter out any that already exist in deviceEmployees list
  const registeredUserIds = new Set(
    deviceEmployees.value
      .filter(e => e.userId)
      .map(e => e.userId)
  )
  return availableStaff.value.filter(s => !registeredUserIds.has(s.id))
})

// ─── Add Employee Modal ─────────────────────────────────────────
const addModal = ref(null)
const addLoading = ref(false)
const addForm = ref({ deviceId: '', employeeNo: '', name: '', userId: '' })

const openAddModal = () => {
  addForm.value = { deviceId: '', employeeNo: '', name: '', userId: '' }
  if (!devices.value.length) fetchDevices()
  addModal.value?.showModal()
}

const openAddModalForStaff = (staff) => {
  addForm.value = {
    deviceId: '',
    employeeNo: '',
    name: `${staff.firstName || ''} ${staff.lastName || ''}`.trim(),
    userId: staff.id,
  }
  if (!devices.value.length) fetchDevices()
  addModal.value?.showModal()
}

watch(() => addForm.value.userId, (uid) => {
  if (!uid) return
  const staff = availableStaff.value.find((u) => u.id === uid)
  if (staff && !addForm.value.name) {
    addForm.value.name = `${staff.firstName || ''} ${staff.lastName || ''}`.trim()
  }
})

const handleAddEmployee = async () => {
  addLoading.value = true
  try {
    const data = { employeeNo: addForm.value.employeeNo, name: addForm.value.name }
    if (addForm.value.userId) data.userId = addForm.value.userId
    await addEmployee(addForm.value.deviceId, data)
    addModal.value?.close()
    await loadData()
  } catch {
    // handled by composable
  } finally {
    addLoading.value = false
  }
}

// ─── Link User Modal ────────────────────────────────────────────
const linkModal = ref(null)
const linkTarget = ref(null)
const linkForm = ref({ userId: '', name: '' })

const openLinkModal = (emp) => {
  linkTarget.value = emp
  linkForm.value.userId = emp.userId || ''
  linkForm.value.name = emp.name || ''
  linkModal.value?.showModal()
}
const closeLinkModal = () => linkModal.value?.close()

const handleLink = async () => {
  try {
    const data = {}
    if (linkForm.value.userId) data.userId = linkForm.value.userId
    if (linkForm.value.name) data.name = linkForm.value.name
    await updateDeviceEmployee(linkTarget.value.id, data)
    closeLinkModal()
    await loadData()
  } catch {
    // handled by composable
  }
}

// ─── Detail Modal ───────────────────────────────────────────────
const detailModal = ref(null)
const detailTarget = ref(null)

const openDetailModal = (emp) => {
  detailTarget.value = emp
  detailModal.value?.showModal()
}
const closeDetailModal = () => detailModal.value?.close()

// ─── Enroll Fingerprint ─────────────────────────────────────────
const enrollModal = ref(null)
const enrollEmployee = ref(null)
const enrollStarted = ref(false)
const enrollMessage = ref('')
const enrollInstructions = ref([])
const fingerNo = ref(1)
const fingerType = ref('normalFP')
const enrollCountdown = ref(0)
let countdownTimer = null

const openEnrollModal = (emp) => {
  enrollEmployee.value = emp
  enrollStarted.value = false
  enrollMessage.value = ''
  enrollInstructions.value = []
  fingerNo.value = 1
  fingerType.value = 'normalFP'
  enrollCountdown.value = 0
  enrollModal.value?.showModal()
}

const handleEnroll = async () => {
  const deviceId = enrollEmployee.value?.device?.id || enrollEmployee.value?.deviceId
  if (!deviceId) return
  try {
    const response = await enrollFingerprint(
      deviceId,
      enrollEmployee.value.employeeNo,
      { fingerNo: fingerNo.value, fingerType: fingerType.value }
    )
    enrollMessage.value = response.message || 'Enrollment mode aktif. Tempelkan jari di scanner.'
    enrollInstructions.value = response.instructions || []
    enrollStarted.value = true
    const seconds = response.enrollmentLock?.expiresInSeconds || 120
    enrollCountdown.value = seconds
    countdownTimer = setInterval(() => {
      enrollCountdown.value--
      if (enrollCountdown.value <= 0) { clearInterval(countdownTimer); countdownTimer = null }
    }, 1000)
  } catch { /* handled */ }
}

const handleReleaseLock = async () => {
  const deviceId = enrollEmployee.value?.device?.id || enrollEmployee.value?.deviceId
  if (!deviceId) return
  try {
    await releaseEnrollmentLock(deviceId)
    clearInterval(countdownTimer); countdownTimer = null
    enrollCountdown.value = 0
  } catch { /* handled */ }
}

const handleFinishEnroll = async () => {
  clearInterval(countdownTimer); countdownTimer = null
  enrollStarted.value = false
  enrollModal.value?.close()
  await loadData()
}

// ─── Set Pending Sync ───────────────────────────────────────────
const handleSetPendingSync = async (emp) => {
  try {
    await updateStatus(emp.id, 'pending_sync', false)
    await loadData()
  } catch { /* handled */ }
}

// ─── Push pending employees to device ───────────────────────────
const pushLoading = ref(false)

const handlePushForDevice = async (deviceId) => {
  if (!deviceId) return
  pushLoading.value = true
  try {
    const response = await api.post(`/integrations/hikvision/devices/${deviceId}/push-pending-employees`)
    const synced = response.stats?.synced ?? 0
    if (synced > 0) {
      showSuccess(`${synced} employee berhasil di-push ke device`)
    } else if (response.stats?.sync_failed > 0) {
      handleError(new Error('Push gagal — pastikan device online lalu coba lagi'), 'Sync Failed')
    } else {
      showSuccess(response.message ?? 'Push selesai')
    }
    await loadData()
  } catch (err) {
    handleError(err, 'Gagal push employee ke device')
  } finally {
    pushLoading.value = false
  }
}

// ─── Helpers ────────────────────────────────────────────────────
const statusBadgeClass = (status) => ({
  active: 'badge-success badge-outline',
  pending_sync: 'badge-warning badge-outline',
  sync_failed: 'badge-error badge-outline',
  inactive: 'badge-ghost',
}[status] ?? 'badge-ghost')

const statusLabel = (status) => ({
  active: 'Active',
  pending_sync: 'Pending Sync',
  sync_failed: 'Sync Failed',
  inactive: 'Inactive',
}[status] ?? status)

const empInitials = (emp) => {
  if (emp.user) {
    return `${emp.user.firstName?.[0] ?? ''}${emp.user.lastName?.[0] ?? ''}`.toUpperCase() || '?'
  }
  if (emp.name) return emp.name.substring(0, 2).toUpperCase()
  return emp.employeeNo?.substring(0, 2) || '?'
}

const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>
