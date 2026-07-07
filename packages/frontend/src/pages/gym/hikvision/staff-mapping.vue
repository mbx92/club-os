<route lang="yaml">
meta:
  title: Staff Mapping
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
        <li>Staff Mapping</li>
      </ul>
    </div>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Staff Mapping</h1>
        <p class="text-base-content/60 mt-1">Hubungkan akun staff dengan Employee Number di mesin Hikvision</p>
      </div>
      <button class="btn btn-ghost btn-sm" @click="loadData">
        <IconRefresh class="w-4 h-4 mr-1" />
        Refresh
      </button>
    </div>

    <!-- Info Alert -->
    <div class="alert alert-info mb-6">
      <IconInfoCircle class="w-5 h-5 shrink-0" />
      <div class="text-sm">
        <strong>Employee Number</strong> harus sesuai dengan nomor yang terdaftar di mesin Hikvision.
        Mapping ini digunakan untuk mencocokkan log fingerprint dengan data staff.
      </div>
    </div>

    <!-- Stats -->
    <div v-if="!loading && staffList.length > 0" class="stats stats-horizontal shadow mb-6 w-full">
      <div class="stat place-items-center">
        <div class="stat-title">Total Staff</div>
        <div class="stat-value text-lg">{{ staffList.length }}</div>
      </div>
      <div class="stat place-items-center">
        <div class="stat-title">Mapped</div>
        <div class="stat-value text-lg text-success">{{ mappedCount }}</div>
      </div>
      <div class="stat place-items-center">
        <div class="stat-title">Unmapped</div>
        <div class="stat-value text-lg text-warning">{{ unmappedCount }}</div>
      </div>
    </div>

    <!-- Filter -->
    <div class="flex flex-wrap gap-3 mb-4">
      <select v-model="filterStatus" class="select select-bordered select-sm w-full sm:w-auto">
        <option value="">Semua Status</option>
        <option value="mapped">Sudah Mapped</option>
        <option value="unmapped">Belum Mapped</option>
      </select>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Cari nama / email..."
        class="input input-bordered input-sm w-full sm:w-64"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Empty state -->
    <div v-else-if="staffList.length === 0" class="text-center py-12">
      <IconUsers class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
      <h3 class="text-xl font-semibold mb-2">Tidak ada data staff</h3>
      <p class="text-base-content/60">Pastikan sudah ada user staff yang terdaftar di sistem.</p>
    </div>

    <!-- Table -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="flex items-center justify-between px-5 pt-4 pb-0">
        <h3 class="font-semibold text-base">Daftar Staff</h3>
        <span class="badge badge-ghost">{{ filteredStaff.length }} staff</span>
      </div>
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Nama Staff</th>
                <th>Email</th>
                <th>Device Employee No</th>
                <th>Status</th>
                <th class="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="staff in filteredStaff" :key="staff.id">
                <td>
                  <div class="font-medium">{{ staff.firstName }} {{ staff.lastName }}</div>
                </td>
                <td class="text-base-content/70 text-sm">{{ staff.email }}</td>
                <td>
                  <span v-if="staff.deviceEmployeeNo" class="badge badge-outline font-mono">
                    {{ staff.deviceEmployeeNo }}
                  </span>
                  <span v-else class="text-base-content/40 text-sm">—</span>
                </td>
                <td>
                  <span class="badge badge-sm" :class="staff.isMapped ? 'badge-success' : 'badge-warning'">
                    {{ staff.isMapped ? 'Mapped' : 'Unmapped' }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="flex justify-end gap-2">
                    <button
                      class="btn btn-xs btn-primary btn-outline"
                      @click="openAssignModal(staff)"
                      title="Assign / Edit Device No"
                    >
                      <IconEdit class="w-3 h-3" /> Assign
                    </button>
                    <button
                      v-if="staff.isMapped"
                      class="btn btn-xs btn-error btn-outline"
                      @click="confirmUnassign(staff)"
                      title="Hapus mapping"
                    >
                      <IconX class="w-3 h-3" /> Hapus
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Assign Modal -->
    <dialog ref="assignModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-1">Assign Device Number</h3>
        <p class="text-sm text-base-content/60 mb-4">
          Staff: <strong>{{ selectedStaff?.firstName }} {{ selectedStaff?.lastName }}</strong>
        </p>
        <form @submit.prevent="handleAssign" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Device Employee No <span class="text-error">*</span></span>
              <span class="label-text-alt text-base-content/50">Harus sesuai dengan nomor di mesin</span>
            </label>
            <input
              v-model="assignForm.deviceEmployeeNo"
              type="text"
              placeholder="Contoh: 1"
              class="input input-bordered w-full font-mono"
              required
              autofocus
            />
          </div>
          <div class="alert alert-warning py-2">
            <IconAlertTriangle class="w-4 h-4 shrink-0" />
            <span class="text-xs">Pastikan nomor ini sama persis dengan Employee No di mesin Hikvision.</span>
          </div>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="assignModal?.close()">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              <span v-if="loading" class="loading loading-spinner loading-sm"></span>
              Simpan
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- Unassign Confirm Modal -->
    <dialog ref="unassignModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg">Hapus Device Mapping</h3>
        <p class="py-4">
          Yakin ingin menghapus mapping device untuk
          <strong>{{ unassignTarget?.firstName }} {{ unassignTarget?.lastName }}</strong>?
          <br />
          <span class="text-sm text-base-content/60">
            Device No: <span class="font-mono">{{ unassignTarget?.deviceEmployeeNo }}</span>
          </span>
        </p>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="unassignModal?.close()">Batal</button>
          <button class="btn btn-error" @click="handleUnassign" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            Hapus Mapping
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  IconRefresh,
  IconEdit,
  IconX,
  IconUsers,
  IconInfoCircle,
  IconAlertTriangle,
} from '@tabler/icons-vue'
import { useStaffMapping } from '@/composables/gym/hikvision/useStaffMapping'

const { staffList, loading, fetchStaffMapping, assignDeviceNo, unassignDeviceNo } = useStaffMapping()

// Modals
const assignModal = ref(null)
const unassignModal = ref(null)

// Filters
const filterStatus = ref('')
const searchQuery = ref('')

// State
const selectedStaff = ref(null)
const unassignTarget = ref(null)
const assignForm = ref({ deviceEmployeeNo: '' })

// ── Computed ──────────────────────────────────────────────
const mappedCount = computed(() => staffList.value.filter(s => s.isMapped).length)
const unmappedCount = computed(() => staffList.value.filter(s => !s.isMapped).length)

const filteredStaff = computed(() => {
  let list = staffList.value

  if (filterStatus.value === 'mapped') list = list.filter(s => s.isMapped)
  else if (filterStatus.value === 'unmapped') list = list.filter(s => !s.isMapped)

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(s =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.deviceEmployeeNo || '').includes(q)
    )
  }

  return list
})

// ── Modal Actions ─────────────────────────────────────────
function openAssignModal(staff) {
  selectedStaff.value = staff
  assignForm.value = { deviceEmployeeNo: staff.deviceEmployeeNo || '' }
  assignModal.value?.showModal()
}

function confirmUnassign(staff) {
  unassignTarget.value = staff
  unassignModal.value?.showModal()
}

// ── API Actions ────────────────────────────────────────────
async function handleAssign() {
  if (!selectedStaff.value) return
  try {
    await assignDeviceNo(selectedStaff.value.id, assignForm.value.deviceEmployeeNo)
    assignModal.value?.close()
    await loadData()
  } catch {
    // error handled in composable
  }
}

async function handleUnassign() {
  if (!unassignTarget.value) return
  try {
    await unassignDeviceNo(unassignTarget.value.id)
    unassignModal.value?.close()
    await loadData()
  } catch {
    // error handled in composable
  }
}

async function loadData() {
  await fetchStaffMapping()
}

// ── Lifecycle ─────────────────────────────────────────────
onMounted(() => {
  loadData()
})
</script>
