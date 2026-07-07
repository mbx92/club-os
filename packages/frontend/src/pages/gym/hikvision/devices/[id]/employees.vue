<route lang="yaml">
meta:
  title: Device Employees
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
        <li>Employees</li>
      </ul>
    </div>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Device Employees</h1>
        <p class="text-base-content/60 mt-1">Kelola karyawan yang terdaftar di device fingerprint</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button class="btn btn-outline btn-sm" @click="handleSync" :disabled="syncLoading">
          <span v-if="syncLoading" class="loading loading-spinner loading-xs"></span>
          <IconRefresh v-else class="w-4 h-4" />
          Sync dari Device
        </button>
        <button @click="openAddModal" class="btn btn-primary btn-sm">
          <IconUserPlus class="w-4 h-4 mr-1" />
          Tambah Employee
        </button>
      </div>
    </div>

    <!-- Unregistered Staff Alert -->
    <div v-if="unregisteredStaff.length > 0" class="alert alert-warning shadow-sm mb-4 cursor-pointer" @click="unregisteredStaffModal?.showModal()">
      <IconAlertTriangle class="w-5 h-5 shrink-0" />
      <span>Ada <strong>{{ unregisteredStaff.length }}</strong> staff yang belum terdaftar pada mesin absen.</span>
      <button class="btn btn-warning btn-xs">Lihat</button>
    </div>

    <!-- Sync Result -->
    <div v-if="syncResult" class="alert alert-success mb-4">
      <IconCheck class="w-5 h-5 shrink-0" />
      <span>Sync selesai — Total: {{ syncResult.total }}, Baru: {{ syncResult.created }}, Update: {{ syncResult.updated }}</span>
      <button class="btn btn-ghost btn-xs" @click="syncResult = null">✕</button>
    </div>

    <!-- Loading -->
    <div v-if="loading && !employees.length" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Empty State -->
    <div v-else-if="employees.length === 0" class="card bg-base-100 shadow-xl">
      <div class="card-body items-center text-center py-16">
        <IconUsers class="w-16 h-16 text-base-content/30 mb-4" />
        <h3 class="text-xl font-semibold mb-2">Belum ada employee di device</h3>
        <p class="text-base-content/60 mb-4">Tambah karyawan ke device atau sync dari device yang sudah punya data.</p>
        <div class="flex gap-2">
          <button class="btn btn-outline btn-sm" @click="handleSync" :disabled="syncLoading">
            <IconRefresh class="w-4 h-4 mr-1" /> Sync dari Device
          </button>
          <button @click="openAddModal" class="btn btn-primary btn-sm">
            <IconUserPlus class="w-4 h-4 mr-1" /> Tambah Employee
          </button>
        </div>
      </div>
    </div>

    <!-- Employee Table -->
    <div v-else class="card bg-base-100 shadow-xl">
      <!-- Toolbar -->
      <div class="px-5 pt-4 pb-3 border-b border-base-300">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-base">Daftar Employee</h3>
            <span class="badge badge-ghost badge-sm">{{ pagination.total }} total</span>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <label class="input input-bordered input-sm flex items-center gap-2 w-full sm:w-56">
              <svg class="w-3.5 h-3.5 text-base-content/40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input v-model="searchQuery" type="text" placeholder="Cari nama..." class="grow bg-transparent outline-none" />
            </label>
            <select v-model="pageSize" class="select select-bordered select-sm">
              <option :value="10">10 / hal</option>
              <option :value="20">20 / hal</option>
              <option :value="50">50 / hal</option>
              <option :value="100">100 / hal</option>
            </select>
          </div>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>No</th>
                <th>Employee No</th>
                <th>Nama (Device)</th>
                <th>Fingerprint</th>
                <th>Status DB</th>
                <th class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(emp, idx) in filteredEmployees" :key="emp.employeeNo" class="hover">
                <td class="text-base-content/50">{{ (pagination.page - 1) * pagination.limit + idx + 1 }}</td>
                <td>
                  <span class="badge badge-ghost font-mono">{{ emp.employeeNo }}</span>
                </td>
                <td>
                  <div class="font-medium">{{ emp.name || '—' }}</div>
                  <div class="text-xs text-base-content/50">{{ emp.userType || 'normal' }}</div>
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <template v-if="emp.numOfFP > 0 || emp.dbRecord?.hasFingerprint">
                      <span class="badge badge-success badge-sm gap-1">
                        <IconFingerprint class="w-3 h-3" />
                        {{ emp.numOfFP || emp.dbRecord?.fingerprintCount || 0 }}
                      </span>
                    </template>
                    <template v-else>
                      <span class="badge badge-error badge-outline badge-sm gap-1">
                        <IconFingerprintOff class="w-3 h-3" /> Belum
                      </span>
                    </template>
                  </div>
                </td>
                <td>
                  <span v-if="emp.dbRecord" class="badge badge-sm"
                    :class="emp.dbRecord.status === 'active' ? 'badge-success badge-outline' : 'badge-error badge-outline'"
                  >
                    {{ emp.dbRecord.status }}
                  </span>
                  <span v-else class="text-base-content/30 text-xs">—</span>
                </td>
                <td class="text-center">
                  <div class="flex justify-center gap-1 flex-wrap">
                    <button
                      class="btn btn-ghost btn-xs text-info"
                      @click="openEnrollModal(emp)"
                      :disabled="enrollLoading"
                      title="Enroll Fingerprint"
                    >
                      <IconFingerprint class="w-4 h-4" />
                    </button>
                    <button
                      v-if="emp.numOfFP > 0 || emp.dbRecord?.hasFingerprint"
                      class="btn btn-ghost btn-xs text-warning"
                      @click="confirmDeleteFp(emp)"
                      :disabled="loading"
                      title="Hapus Fingerprint"
                    >
                      <IconFingerprintOff class="w-4 h-4" />
                    </button>
                    <button
                      class="btn btn-ghost btn-xs text-error"
                      @click="confirmRemove(emp)"
                      :disabled="loading"
                      title="Hapus dari Device"
                    >
                      <IconTrash class="w-4 h-4" />
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
          <button
            class="join-item btn btn-sm"
            :disabled="!pagination.hasPrevPage || loading"
            @click="loadPage(1)"
          >«</button>
          <button
            class="join-item btn btn-sm"
            :disabled="!pagination.hasPrevPage || loading"
            @click="loadPage(pagination.page - 1)"
          >‹</button>

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

          <button
            class="join-item btn btn-sm"
            :disabled="!pagination.hasNextPage || loading"
            @click="loadPage(pagination.page + 1)"
          >›</button>
          <button
            class="join-item btn btn-sm"
            :disabled="!pagination.hasNextPage || loading"
            @click="loadPage(pagination.totalPages)"
          >»</button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- MODAL: Unregistered Staff                      -->
    <!-- ═══════════════════════════════════════════════ -->
    <dialog ref="unregisteredStaffModal" class="modal">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-2">Staff Belum Terdaftar di Mesin Absen</h3>
        <p class="text-base-content/60 text-sm mb-4">Staff berikut belum terdaftar di device ini. Klik "Tambah" untuk mendaftarkan ke mesin.</p>
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

    <!-- ═══════════════════════════════════════════════ -->
    <!-- MODAL: Add Employee                            -->
    <!-- ═══════════════════════════════════════════════ -->
    <dialog ref="addModal" class="modal">
      <div class="modal-box max-w-lg">
        <h3 class="font-bold text-lg mb-4">Tambah Employee ke Device</h3>
        <form @submit.prevent="handleAddEmployee">
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
              <option v-for="u in availableStaff" :key="u.id" :value="u.id">{{ u.firstName || u.name }} {{ u.lastName || '' }} ({{ u.email }})</option>
            </select>
            <label class="label"><span class="label-text-alt text-base-content/60">Jika dipilih, deviceEmployeeNo staff otomatis ter-set</span></label>
          </div>

          <div v-if="selectedStaffForAdd" class="alert alert-info mb-3">
            <IconInfoCircle class="w-4 h-4 shrink-0" />
            <span class="text-sm">Nama akan ditampilkan sebagai "{{ addForm.name }}" di device</span>
          </div>

          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="addModal?.close()">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              <span v-if="loading" class="loading loading-spinner loading-xs mr-1"></span>
              Tambah
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- MODAL: Link Employee to Staff                  -->
    <!-- ═══════════════════════════════════════════════ -->
    <dialog ref="linkModal" class="modal">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-4">Link ke Staff</h3>
        <p class="text-base-content/70 mb-3">
          Employee: <strong>{{ linkingEmployee?.name }}</strong> ({{ linkingEmployee?.employeeNo }})
        </p>
        <form @submit.prevent="handleLinkUser">
          <div class="form-control mb-4">
            <label class="label"><span class="label-text">Pilih Staff <span class="text-error">*</span></span></label>
            <select v-model="linkForm.userId" class="select select-bordered w-full" required>
              <option value="" disabled>Pilih staff</option>
              <option v-for="u in availableStaff" :key="u.id" :value="u.id">{{ u.firstName || u.name }} {{ u.lastName || '' }} ({{ u.email }})</option>
            </select>
          </div>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="linkModal?.close()">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="loading || !linkForm.userId">
              <span v-if="loading" class="loading loading-spinner loading-xs mr-1"></span>
              Link
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- MODAL: Enroll Fingerprint                      -->
    <!-- ═══════════════════════════════════════════════ -->
    <dialog ref="enrollModal" class="modal">
      <div class="modal-box max-w-lg">
        <h3 class="font-bold text-lg mb-2">Enroll Fingerprint</h3>
        <p class="text-base-content/60 mb-4">
          Employee: <strong>{{ enrollEmployee?.name }}</strong> ({{ enrollEmployee?.employeeNo }})
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
            <span class="text-sm">
              Tempelkan jari yang sama <strong>3 kali</strong> pada scanner device.
              Device akan berbunyi dan konfirmasi ketika selesai.
            </span>
          </div>

          <!-- Countdown -->
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

    <!-- ═══════════════════════════════════════════════ -->
    <!-- MODAL: Delete Fingerprint                      -->
    <!-- ═══════════════════════════════════════════════ -->
    <dialog ref="deleteFpModal" class="modal">
      <div class="modal-box max-w-sm">
        <h3 class="font-bold text-lg text-warning mb-2">Hapus Fingerprint</h3>
        <p class="text-base-content/70">
          Hapus semua data fingerprint <strong>{{ deletingFpEmployee?.name }}</strong> ({{ deletingFpEmployee?.employeeNo }}) dari device?
        </p>
        <p class="text-sm text-base-content/50 mt-2">Karyawan tetap terdaftar di device, hanya sidik jari yang dihapus.</p>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="deleteFpModal?.close()">Batal</button>
          <button class="btn btn-warning" @click="handleDeleteFp" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner loading-xs mr-1"></span>
            Hapus Fingerprint
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- MODAL: Remove Employee                         -->
    <!-- ═══════════════════════════════════════════════ -->
    <dialog ref="removeModal" class="modal">
      <div class="modal-box max-w-sm">
        <h3 class="font-bold text-lg text-error mb-2">Hapus Employee</h3>
        <p class="text-base-content/70">
          Hapus <strong>{{ removingEmployee?.name }}</strong> ({{ removingEmployee?.employeeNo }}) dari device?
        </p>
        <p class="text-sm text-error/70 mt-2">⚠️ Semua fingerprint karyawan ini juga akan terhapus dari device dan database.</p>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="removeModal?.close()">Batal</button>
          <button class="btn btn-error" @click="handleRemove" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner loading-xs mr-1"></span>
            Hapus
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useHikvisionEmployees } from '@/composables/gym/hikvision'
import {
  IconUserPlus,
  IconUsers,
  IconFingerprint,
  IconFingerprintOff,
  IconTrash,
  IconRefresh,
  IconCheck,
  IconLink,
  IconAlertTriangle,
  IconInfoCircle,
  IconClock,
  IconLockOpen,
} from '@tabler/icons-vue'

const route = useRoute()
const deviceId = route.params.id

const {
  employees,
  availableStaff,
  loading,
  enrollLoading,
  syncLoading,
  syncResult,
  pagination,
  fetchEmployees,
  addEmployee,
  removeEmployee,
  syncEmployees,
  updateDeviceEmployee,
  enrollFingerprint,
  deleteFingerprint,
  releaseEnrollmentLock,
} = useHikvisionEmployees()

// ─── Pagination ─────────────────────────────────────────────────
const currentPage = ref(1)
const pageSize = ref(20)

const loadPage = (page = currentPage.value) => {
  currentPage.value = page
  fetchEmployees(deviceId, { page: page, limit: pageSize.value, search: searchQuery.value.trim() || undefined })
}

// ─── Search ────────────────────────────────────────────────────
const searchQuery = ref('')
let searchTimer = null

watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadPage(1)
  }, 400)
})

watch(pageSize, () => {
  loadPage(1)
})

const filteredEmployees = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const list = employees.value.filter(emp => String(emp.employeeNo) !== '1')
  if (!q) return list
  return list.filter(emp => {
    const deviceName = (emp.name || '').toLowerCase()
    const linkedName = emp.dbRecord?.user
      ? `${emp.dbRecord.user.firstName || ''} ${emp.dbRecord.user.lastName || ''}`.toLowerCase()
      : ''
    const empNo = (emp.employeeNo || '').toLowerCase()
    return deviceName.includes(q) || linkedName.includes(q) || empNo.includes(q)
  })
})

const getInitials = (user) => {
  if (!user) return '?'
  const f = user.firstName || user.name || ''
  const l = user.lastName || ''
  return (f[0] || '') + (l[0] || '') || '?'
}

// ─── Pagination pages helper ────────────────────────────────────
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

// ─── Unregistered Staff ─────────────────────────────────────────

const unregisteredStaffModal = ref(null)

const unregisteredStaff = computed(() => {
  // availableStaff from API = staff with deviceEmployeeNo === null
  // additionally filter out any that are already in the current device employees list
  const registeredUserIds = new Set(
    employees.value
      .filter(e => e.dbRecord?.userId)
      .map(e => e.dbRecord.userId)
  )
  return availableStaff.value.filter(s => !registeredUserIds.has(s.id))
})

// ─── Add Employee ───────────────────────────────────────────────

const addModal = ref(null)
const addForm = ref({ employeeNo: '', name: '', userId: '' })

const selectedStaffForAdd = computed(() => {
  if (!addForm.value.userId) return null
  return availableStaff.value.find((u) => u.id === addForm.value.userId)
})

watch(() => addForm.value.userId, (uid) => {
  if (!uid) return
  const staff = availableStaff.value.find((u) => u.id === uid)
  if (staff && !addForm.value.name) {
    addForm.value.name = `${staff.firstName || ''} ${staff.lastName || ''}`.trim()
  }
})

const openAddModal = () => {
  addForm.value = { employeeNo: '', name: '', userId: '' }
  addModal.value?.showModal()
}

const openAddModalForStaff = (staff) => {
  addForm.value = {
    employeeNo: '',
    name: `${staff.firstName || ''} ${staff.lastName || ''}`.trim(),
    userId: staff.id,
  }
  addModal.value?.showModal()
}

const handleAddEmployee = async () => {
  try {
    const data = { employeeNo: addForm.value.employeeNo, name: addForm.value.name }
    if (addForm.value.userId) data.userId = addForm.value.userId
    await addEmployee(deviceId, data)
    addModal.value?.close()
    loadPage(1)
  } catch { /* handled */ }
}

// ─── Link Employee to User ──────────────────────────────────────

const linkModal = ref(null)
const linkingEmployee = ref(null)
const linkForm = ref({ userId: '' })

const openLinkModal = (emp) => {
  linkingEmployee.value = emp
  linkForm.value = { userId: '' }
  linkModal.value?.showModal()
}

const handleLinkUser = async () => {
  try {
    if (!linkingEmployee.value?.dbRecord?.id) return
    await updateDeviceEmployee(linkingEmployee.value.dbRecord.id, { userId: linkForm.value.userId })
    linkModal.value?.close()
    loadPage(currentPage.value)
  } catch { /* handled */ }
}

// ─── Sync from Device ───────────────────────────────────────────

const handleSync = async () => {
  try {
    await syncEmployees(deviceId)
    loadPage(1)
  } catch { /* handled */ }
}

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
  try {
    const response = await enrollFingerprint(
      deviceId,
      enrollEmployee.value.employeeNo,
      { fingerNo: fingerNo.value, fingerType: fingerType.value }
    )
    enrollMessage.value = response.message || 'Enrollment mode aktif. Tempelkan jari di scanner.'
    enrollInstructions.value = response.instructions || []
    enrollStarted.value = true

    // Start countdown
    const seconds = response.enrollmentLock?.expiresInSeconds || 120
    enrollCountdown.value = seconds
    countdownTimer = setInterval(() => {
      enrollCountdown.value--
      if (enrollCountdown.value <= 0) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }, 1000)
  } catch { /* handled */ }
}

const handleReleaseLock = async () => {
  try {
    await releaseEnrollmentLock(deviceId)
    clearInterval(countdownTimer)
    countdownTimer = null
    enrollCountdown.value = 0
  } catch { /* handled */ }
}

const handleFinishEnroll = async () => {
  clearInterval(countdownTimer)
  countdownTimer = null
  enrollStarted.value = false
  enrollModal.value?.close()
  loadPage(currentPage.value)
}

// ─── Delete Fingerprint ─────────────────────────────────────────

const deleteFpModal = ref(null)
const deletingFpEmployee = ref(null)

const confirmDeleteFp = (emp) => {
  deletingFpEmployee.value = emp
  deleteFpModal.value?.showModal()
}

const handleDeleteFp = async () => {
  try {
    await deleteFingerprint(deviceId, deletingFpEmployee.value.employeeNo)
    deleteFpModal.value?.close()
    loadPage(currentPage.value)
  } catch { /* handled */ }
}

// ─── Remove Employee ────────────────────────────────────────────

const removeModal = ref(null)
const removingEmployee = ref(null)

const confirmRemove = (emp) => {
  removingEmployee.value = emp
  removeModal.value?.showModal()
}

const handleRemove = async () => {
  try {
    await removeEmployee(deviceId, removingEmployee.value.employeeNo)
    removeModal.value?.close()
    loadPage(currentPage.value)
  } catch { /* handled */ }
}

// ─── Lifecycle ──────────────────────────────────────────────────

onMounted(() => {
  loadPage(1)
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>
