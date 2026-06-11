<route lang="yaml">
meta:
  title: Master Shift
  layout: default
</route>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Breadcrumb -->
    <div class="text-sm breadcrumbs mb-4">
      <ul>
        <li><router-link to="/gym/backoffice/employee-schedule">Employee Schedule</router-link></li>
        <li>Master Shift</li>
      </ul>
    </div>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Master Shift</h1>
        <p class="text-base-content/60 mt-1">Kelola definisi jam kerja standar karyawan</p>
      </div>
      <button class="btn btn-primary" @click="openAddModal">
        <IconPlus class="w-5 h-5 mr-2" />
        Tambah Shift
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Empty state -->
    <div v-else-if="shifts.length === 0" class="text-center py-12">
      <IconClock class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
      <h3 class="text-xl font-semibold mb-2">Belum ada shift</h3>
      <p class="text-base-content/60 mb-4">Buat shift pertama untuk mulai mengatur jadwal karyawan.</p>
      <button class="btn btn-primary" @click="openAddModal">
        <IconPlus class="w-5 h-5 mr-2" /> Tambah Shift
      </button>
    </div>

    <!-- Shift Table -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="flex items-center justify-between px-5 pt-4 pb-0">
        <h3 class="font-semibold text-base">Daftar Shift</h3>
        <span class="badge badge-ghost">{{ shifts.length }} shift</span>
      </div>
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Warna</th>
                <th>Nama</th>
                <th>Kode</th>
                <th>Jam Mulai</th>
                <th>Jam Selesai</th>
                <th>Durasi</th>
                <th>Status</th>
                <th class="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="shift in shifts" :key="shift.id">
                <td>
                  <div class="w-6 h-6 rounded-full border border-base-300" :style="{ backgroundColor: shift.color || '#888888' }"></div>
                </td>
                <td class="font-medium">{{ shift.name }}</td>
                <td>
                  <span class="badge badge-outline font-mono">{{ shift.code || '—' }}</span>
                </td>
                <td class="font-mono">{{ formatTime(shift.shiftStart) }}</td>
                <td class="font-mono">{{ formatTime(shift.shiftEnd) }}</td>
                <td class="text-base-content/70">{{ calcDuration(shift.shiftStart, shift.shiftEnd) }}</td>
                <td>
                  <span class="badge badge-sm" :class="shift.isActive ? 'badge-success' : 'badge-ghost'">
                    {{ shift.isActive ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="flex justify-end gap-2">
                    <button class="btn btn-xs btn-ghost btn-circle" @click="openEditModal(shift)" title="Edit">
                      <IconEdit class="w-4 h-4" />
                    </button>
                    <button class="btn btn-xs btn-ghost btn-circle text-error" @click="confirmDelete(shift)" title="Hapus">
                      <IconTrash class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <dialog ref="shiftModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">{{ editingShift ? 'Edit Shift' : 'Tambah Shift' }}</h3>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div class="form-control">
            <label class="label"><span class="label-text">Nama Shift <span class="text-error">*</span></span></label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Contoh: Pagi"
              class="input input-bordered w-full"
              required
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text">Kode</span></label>
              <input
                v-model="form.code"
                type="text"
                placeholder="Contoh: P"
                maxlength="20"
                class="input input-bordered w-full uppercase"
              />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Warna</span></label>
              <div class="flex items-center gap-2">
                <input
                  v-model="form.color"
                  type="color"
                  class="w-10 h-10 rounded cursor-pointer border border-base-300"
                />
                <input
                  v-model="form.color"
                  type="text"
                  placeholder="#4CAF50"
                  class="input input-bordered flex-1 font-mono"
                />
              </div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text">Jam Mulai <span class="text-error">*</span></span></label>
              <input
                v-model="form.shiftStart"
                type="time"
                class="input input-bordered w-full font-mono"
                required
              />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Jam Selesai <span class="text-error">*</span></span></label>
              <input
                v-model="form.shiftEnd"
                type="time"
                class="input input-bordered w-full font-mono"
                required
              />
            </div>
          </div>
          <div v-if="form.shiftStart && form.shiftEnd" class="alert alert-info py-2">
            <IconClock class="w-4 h-4" />
            <span class="text-sm">Durasi: {{ calcDurationFromInputs() }}</span>
          </div>
          <div v-if="editingShift" class="form-control">
            <label class="label cursor-pointer justify-start gap-3">
              <input type="checkbox" v-model="form.isActive" class="checkbox checkbox-primary" />
              <span class="label-text">Shift Aktif</span>
            </label>
          </div>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="closeModal">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              <span v-if="loading" class="loading loading-spinner loading-sm"></span>
              {{ editingShift ? 'Simpan Perubahan' : 'Tambah Shift' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- Delete Confirm Modal -->
    <dialog ref="deleteModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg">Hapus Shift</h3>
        <p class="py-4">
          Yakin ingin menghapus shift <strong>"{{ deletingShift?.name }}"</strong>?
          <br />
          <span class="text-warning text-sm">Perhatian: shift yang sudah digunakan di jadwal karyawan tidak bisa dihapus.</span>
        </p>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="deleteModal?.close()">Batal</button>
          <button class="btn btn-error" @click="handleDelete" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            Hapus
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconClock,
} from '@tabler/icons-vue'
import { useShifts } from '@/composables/gym/useShifts'

const { shifts, loading, fetchShifts, createShift, updateShift, deleteShift } = useShifts()

// Modals
const shiftModal = ref(null)
const deleteModal = ref(null)

// State
const editingShift = ref(null)
const deletingShift = ref(null)

const defaultForm = () => ({
  name: '',
  code: '',
  shiftStart: '08:00',
  shiftEnd: '16:00',
  color: '#4CAF50',
  isActive: true,
})

const form = ref(defaultForm())

// ── Helpers ──────────────────────────────────────────────
function formatTime(timeStr) {
  if (!timeStr) return '—'
  // Trim seconds if present (HH:mm:ss → HH:mm)
  return timeStr.substring(0, 5)
}

function calcDuration(start, end) {
  if (!start || !end) return '—'
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60 // overnight shift
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}j ${m}m` : `${h} jam`
}

function calcDurationFromInputs() {
  return calcDuration(form.value.shiftStart, form.value.shiftEnd)
}

// ── Modal Actions ─────────────────────────────────────────
function openAddModal() {
  editingShift.value = null
  form.value = defaultForm()
  shiftModal.value?.showModal()
}

function openEditModal(shift) {
  editingShift.value = shift
  form.value = {
    name: shift.name,
    code: shift.code || '',
    shiftStart: formatTime(shift.shiftStart),
    shiftEnd: formatTime(shift.shiftEnd),
    color: shift.color || '#888888',
    isActive: shift.isActive ?? true,
  }
  shiftModal.value?.showModal()
}

function closeModal() {
  shiftModal.value?.close()
}

function confirmDelete(shift) {
  deletingShift.value = shift
  deleteModal.value?.showModal()
}

// ── API Actions ────────────────────────────────────────────
async function handleSubmit() {
  const payload = {
    name: form.value.name,
    code: form.value.code || undefined,
    shiftStart: form.value.shiftStart.length === 5 ? `${form.value.shiftStart}:00` : form.value.shiftStart,
    shiftEnd: form.value.shiftEnd.length === 5 ? `${form.value.shiftEnd}:00` : form.value.shiftEnd,
    color: form.value.color || undefined,
  }
  if (editingShift.value) {
    payload.isActive = form.value.isActive
  }

  try {
    if (editingShift.value) {
      await updateShift(editingShift.value.id, payload)
    } else {
      await createShift(payload)
    }
    closeModal()
    await fetchShifts()
  } catch {
    // error handled in composable
  }
}

async function handleDelete() {
  if (!deletingShift.value) return
  try {
    await deleteShift(deletingShift.value.id)
    deleteModal.value?.close()
    await fetchShifts()
  } catch {
    // error handled in composable
  }
}

// ── Lifecycle ─────────────────────────────────────────────
onMounted(() => {
  fetchShifts()
})
</script>
