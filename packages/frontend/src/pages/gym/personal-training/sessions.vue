<route lang="yaml">
meta:
  title: PT Sessions
  layout: default
</route>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { usePTSessions } from '@/composables/gym/pt-sessions/usePTSessions'
import { useTrainers } from '@/composables/gym/trainer-management/useTrainers'
import { useMembers } from '@/composables/gym/member-management/useMembers'
import dayjs from 'dayjs'
import {
  IconPlus,
  IconRefresh,
  IconFilter,
  IconEdit,
  IconTrash,
  IconEye,
  IconCalendar,
  IconUser,
  IconBarbell,
  IconClock,
  IconCheck,
  IconX,
  IconSearch
} from '@tabler/icons-vue'

const { sessions, loading, pagination, fetchSessions, createSession, updateSession, deleteSession } = usePTSessions()
const { trainers, fetchTrainers } = useTrainers()
const { members, fetchMembers } = useMembers()

// Filters
const filters = ref({
  trainerId: '',
  memberId: '',
  status: '',
  startDate: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
  endDate: dayjs().format('YYYY-MM-DD'),
  page: 1,
  limit: 15
})

// Modal state
const showLogModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const sessionToDelete = ref(null)
const editingSession = ref(null)

const formData = ref({
  memberId: '',
  trainerId: '',
  sessionDate: dayjs().format('YYYY-MM-DDTHH:mm'),
  duration: 60,
  status: 'completed',
  notes: ''
})

// Member search for form
const memberSearch = ref('')
const filteredMembersForForm = computed(() => {
  if (!memberSearch.value) return members.value.slice(0, 20)
  const q = memberSearch.value.toLowerCase()
  return members.value
    .filter(m => {
      const name = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase()
      const code = (m.memberCode || '').toLowerCase()
      return name.includes(q) || code.includes(q)
    })
    .slice(0, 20)
})

// Status config
const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' }
]

const getStatusBadge = (status) => {
  const map = {
    completed: 'badge-success',
    scheduled: 'badge-info',
    cancelled: 'badge-error',
    no_show: 'badge-warning'
  }
  return map[status] || 'badge-ghost'
}

const getStatusLabel = (status) => {
  const map = {
    completed: 'Completed',
    scheduled: 'Scheduled',
    cancelled: 'Cancelled',
    no_show: 'No Show'
  }
  return map[status] || status || '-'
}

const getMemberName = (session) => {
  if (session.member) {
    return `${session.member.firstName || ''} ${session.member.lastName || ''}`.trim() || '-'
  }
  return '-'
}

const getTrainerName = (session) => {
  if (session.trainer) {
    return `${session.trainer.firstName || ''} ${session.trainer.lastName || ''}`.trim() || '-'
  }
  return '-'
}

// Load data
const loadSessions = async () => {
  await fetchSessions({
    ...filters.value,
    trainerId: filters.value.trainerId || undefined,
    memberId: filters.value.memberId || undefined,
    status: filters.value.status || undefined
  })
}

const applyFilters = () => {
  filters.value.page = 1
  loadSessions()
}

const resetFilters = () => {
  filters.value = {
    trainerId: '',
    memberId: '',
    status: '',
    startDate: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    page: 1,
    limit: 15
  }
  loadSessions()
}

const changePage = (page) => {
  filters.value.page = page
  loadSessions()
}

// Modal handlers
const openLogModal = () => {
  formData.value = {
    memberId: '',
    trainerId: '',
    sessionDate: dayjs().format('YYYY-MM-DDTHH:mm'),
    duration: 60,
    status: 'completed',
    notes: ''
  }
  memberSearch.value = ''
  showLogModal.value = true
}

const openEditModal = (s) => {
  editingSession.value = s
  formData.value = {
    memberId: s.memberId || s.member?.id || '',
    trainerId: s.trainerId || s.trainer?.id || '',
    sessionDate: s.sessionDate ? dayjs(s.sessionDate).format('YYYY-MM-DDTHH:mm') : '',
    duration: s.duration || 60,
    status: s.status || 'completed',
    notes: s.notes || ''
  }
  memberSearch.value = ''
  showEditModal.value = true
}

const closeModals = () => {
  showLogModal.value = false
  showEditModal.value = false
  showDeleteModal.value = false
  editingSession.value = null
  sessionToDelete.value = null
}

const handleSubmitLog = async () => {
  try {
    await createSession({
      ...formData.value,
      sessionDate: dayjs(formData.value.sessionDate).toISOString(),
      duration: Number(formData.value.duration)
    })
    closeModals()
    loadSessions()
  } catch (err) {
    // error handled by composable
  }
}

const handleSubmitEdit = async () => {
  if (!editingSession.value) return
  try {
    await updateSession(editingSession.value.id, {
      ...formData.value,
      sessionDate: dayjs(formData.value.sessionDate).toISOString(),
      duration: Number(formData.value.duration)
    })
    closeModals()
    loadSessions()
  } catch (err) {
    // error handled by composable
  }
}

const confirmDelete = (s) => {
  sessionToDelete.value = s
  showDeleteModal.value = true
}

const handleDelete = async () => {
  if (!sessionToDelete.value) return
  try {
    await deleteSession(sessionToDelete.value.id)
    closeModals()
    loadSessions()
  } catch (err) {
    // error handled by composable
  }
}

onMounted(async () => {
  await Promise.all([
    loadSessions(),
    fetchTrainers({ limit: 100 }),
    fetchMembers({ limit: 200 })
  ])
})
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">PT Sessions</h1>
        <p class="text-base-content/60 text-sm mt-1">Log dan pantau sesi personal training</p>
      </div>
      <button class="btn btn-primary gap-2" @click="openLogModal">
        <IconPlus class="w-4 h-4" />
        Log Session
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-sm border border-base-200">
      <div class="card-body py-4">
        <div class="flex items-center gap-2 mb-3">
          <IconFilter class="w-4 h-4 text-base-content/60" />
          <span class="font-medium text-sm">Filter</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- Trainer filter -->
          <div class="form-control">
            <label class="label py-1"><span class="label-text text-xs">Trainer</span></label>
            <select class="select select-bordered select-sm" v-model="filters.trainerId">
              <option value="">All Trainers</option>
              <option v-for="t in trainers" :key="t.id" :value="t.id">
                {{ t.firstName }} {{ t.lastName }}
              </option>
            </select>
          </div>

          <!-- Status filter -->
          <div class="form-control">
            <label class="label py-1"><span class="label-text text-xs">Status</span></label>
            <select class="select select-bordered select-sm" v-model="filters.status">
              <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </div>

          <!-- Start date -->
          <div class="form-control">
            <label class="label py-1"><span class="label-text text-xs">Dari Tanggal</span></label>
            <input type="date" class="input input-bordered input-sm" v-model="filters.startDate" />
          </div>

          <!-- End date -->
          <div class="form-control">
            <label class="label py-1"><span class="label-text text-xs">Sampai Tanggal</span></label>
            <input type="date" class="input input-bordered input-sm" v-model="filters.endDate" />
          </div>
        </div>

        <div class="flex gap-2 mt-3">
          <button class="btn btn-primary btn-sm gap-1" @click="applyFilters">
            <IconSearch class="w-3.5 h-3.5" />
            Cari
          </button>
          <button class="btn btn-ghost btn-sm gap-1" @click="resetFilters">
            <IconRefresh class="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card bg-base-100 shadow-sm border border-base-200">
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
              <tr class="bg-base-200/50">
                <th>Tanggal & Waktu</th>
                <th>Member</th>
                <th>Trainer</th>
                <th>Durasi</th>
                <th>Status</th>
                <th>Catatan</th>
                <th class="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="7" class="text-center py-10">
                  <span class="loading loading-spinner loading-md"></span>
                </td>
              </tr>
              <tr v-else-if="sessions.length === 0">
                <td colspan="7" class="text-center py-10 text-base-content/50">
                  <IconBarbell class="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Belum ada sesi PT tercatat</p>
                </td>
              </tr>
              <tr
                v-for="s in sessions"
                :key="s.id"
                class="hover"
              >
                <td>
                  <div class="flex items-center gap-2">
                    <IconCalendar class="w-4 h-4 text-base-content/40 shrink-0" />
                    <div>
                      <div class="font-medium text-sm">{{ dayjs(s.sessionDate).format('DD MMM YYYY') }}</div>
                      <div class="text-xs text-base-content/50">{{ dayjs(s.sessionDate).format('HH:mm') }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <IconUser class="w-4 h-4 text-base-content/40 shrink-0" />
                    <span class="text-sm">{{ getMemberName(s) }}</span>
                  </div>
                </td>
                <td>
                  <span class="text-sm">{{ getTrainerName(s) }}</span>
                </td>
                <td>
                  <div class="flex items-center gap-1">
                    <IconClock class="w-3.5 h-3.5 text-base-content/40" />
                    <span class="text-sm">{{ s.duration || '-' }} mnt</span>
                  </div>
                </td>
                <td>
                  <span :class="['badge badge-sm', getStatusBadge(s.status)]">
                    {{ getStatusLabel(s.status) }}
                  </span>
                </td>
                <td>
                  <span class="text-xs text-base-content/60 max-w-[160px] truncate block">{{ s.notes || '-' }}</span>
                </td>
                <td>
                  <div class="flex justify-end gap-1">
                    <button
                      class="btn btn-ghost btn-xs"
                      title="Edit"
                      @click="openEditModal(s)"
                    >
                      <IconEdit class="w-3.5 h-3.5" />
                    </button>
                    <button
                      class="btn btn-ghost btn-xs text-error"
                      title="Hapus"
                      @click="confirmDelete(s)"
                    >
                      <IconTrash class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.totalPages > 1" class="flex justify-between items-center px-4 py-3 border-t border-base-200">
          <span class="text-sm text-base-content/60">
            Total {{ pagination.total }} sesi
          </span>
          <div class="join">
            <button
              class="join-item btn btn-sm"
              :disabled="filters.page <= 1"
              @click="changePage(filters.page - 1)"
            >«</button>
            <button class="join-item btn btn-sm btn-disabled">
              {{ filters.page }} / {{ pagination.totalPages }}
            </button>
            <button
              class="join-item btn btn-sm"
              :disabled="filters.page >= pagination.totalPages"
              @click="changePage(filters.page + 1)"
            >»</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Log Session Modal -->
  <dialog :class="['modal', showLogModal && 'modal-open']">
    <div class="modal-box max-w-lg">
      <h3 class="font-bold text-lg mb-4">Log PT Session</h3>

      <div class="space-y-3">
        <!-- Member select with search -->
        <div class="form-control">
          <label class="label py-1"><span class="label-text">Member <span class="text-error">*</span></span></label>
          <input
            type="text"
            class="input input-bordered input-sm mb-1"
            placeholder="Cari member..."
            v-model="memberSearch"
          />
          <select class="select select-bordered select-sm" v-model="formData.memberId">
            <option value="">-- Pilih Member --</option>
            <option v-for="m in filteredMembersForForm" :key="m.id" :value="m.id">
              {{ m.firstName }} {{ m.lastName }} {{ m.memberCode ? `(${m.memberCode})` : '' }}
            </option>
          </select>
        </div>

        <!-- Trainer select -->
        <div class="form-control">
          <label class="label py-1"><span class="label-text">Trainer <span class="text-error">*</span></span></label>
          <select class="select select-bordered select-sm" v-model="formData.trainerId">
            <option value="">-- Pilih Trainer --</option>
            <option v-for="t in trainers" :key="t.id" :value="t.id">
              {{ t.firstName }} {{ t.lastName }}
            </option>
          </select>
        </div>

        <!-- Date & time -->
        <div class="form-control">
          <label class="label py-1"><span class="label-text">Tanggal & Waktu Sesi <span class="text-error">*</span></span></label>
          <input type="datetime-local" class="input input-bordered input-sm" v-model="formData.sessionDate" />
        </div>

        <!-- Duration -->
        <div class="form-control">
          <label class="label py-1"><span class="label-text">Durasi (menit)</span></label>
          <input type="number" class="input input-bordered input-sm" v-model="formData.duration" min="1" max="360" />
        </div>

        <!-- Status -->
        <div class="form-control">
          <label class="label py-1"><span class="label-text">Status</span></label>
          <select class="select select-bordered select-sm" v-model="formData.status">
            <option value="completed">Completed</option>
            <option value="scheduled">Scheduled</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>

        <!-- Notes -->
        <div class="form-control">
          <label class="label py-1"><span class="label-text">Catatan</span></label>
          <textarea class="textarea textarea-bordered textarea-sm" rows="3" v-model="formData.notes" placeholder="Catatan sesi..."></textarea>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn btn-ghost" @click="closeModals">Batal</button>
        <button
          class="btn btn-primary"
          :disabled="loading || !formData.memberId || !formData.trainerId || !formData.sessionDate"
          @click="handleSubmitLog"
        >
          <span v-if="loading" class="loading loading-spinner loading-xs"></span>
          Simpan
        </button>
      </div>
    </div>
    <div class="modal-backdrop" @click="closeModals"></div>
  </dialog>

  <!-- Edit Session Modal -->
  <dialog :class="['modal', showEditModal && 'modal-open']">
    <div class="modal-box max-w-lg">
      <h3 class="font-bold text-lg mb-4">Edit PT Session</h3>

      <div class="space-y-3">
        <!-- Member select -->
        <div class="form-control">
          <label class="label py-1"><span class="label-text">Member</span></label>
          <input
            type="text"
            class="input input-bordered input-sm mb-1"
            placeholder="Cari member..."
            v-model="memberSearch"
          />
          <select class="select select-bordered select-sm" v-model="formData.memberId">
            <option value="">-- Pilih Member --</option>
            <option v-for="m in filteredMembersForForm" :key="m.id" :value="m.id">
              {{ m.firstName }} {{ m.lastName }} {{ m.memberCode ? `(${m.memberCode})` : '' }}
            </option>
          </select>
        </div>

        <!-- Trainer select -->
        <div class="form-control">
          <label class="label py-1"><span class="label-text">Trainer</span></label>
          <select class="select select-bordered select-sm" v-model="formData.trainerId">
            <option value="">-- Pilih Trainer --</option>
            <option v-for="t in trainers" :key="t.id" :value="t.id">
              {{ t.firstName }} {{ t.lastName }}
            </option>
          </select>
        </div>

        <!-- Date & time -->
        <div class="form-control">
          <label class="label py-1"><span class="label-text">Tanggal & Waktu Sesi</span></label>
          <input type="datetime-local" class="input input-bordered input-sm" v-model="formData.sessionDate" />
        </div>

        <!-- Duration -->
        <div class="form-control">
          <label class="label py-1"><span class="label-text">Durasi (menit)</span></label>
          <input type="number" class="input input-bordered input-sm" v-model="formData.duration" min="1" max="360" />
        </div>

        <!-- Status -->
        <div class="form-control">
          <label class="label py-1"><span class="label-text">Status</span></label>
          <select class="select select-bordered select-sm" v-model="formData.status">
            <option value="completed">Completed</option>
            <option value="scheduled">Scheduled</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>

        <!-- Notes -->
        <div class="form-control">
          <label class="label py-1"><span class="label-text">Catatan</span></label>
          <textarea class="textarea textarea-bordered textarea-sm" rows="3" v-model="formData.notes" placeholder="Catatan sesi..."></textarea>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn btn-ghost" @click="closeModals">Batal</button>
        <button
          class="btn btn-primary"
          :disabled="loading"
          @click="handleSubmitEdit"
        >
          <span v-if="loading" class="loading loading-spinner loading-xs"></span>
          Update
        </button>
      </div>
    </div>
    <div class="modal-backdrop" @click="closeModals"></div>
  </dialog>

  <!-- Delete Confirmation Modal -->
  <dialog :class="['modal', showDeleteModal && 'modal-open']">
    <div class="modal-box max-w-sm">
      <h3 class="font-bold text-lg mb-2">Hapus Sesi?</h3>
      <p class="text-sm text-base-content/70 mb-4">
        Sesi PT pada
        <strong>{{ sessionToDelete ? dayjs(sessionToDelete.sessionDate).format('DD MMM YYYY HH:mm') : '' }}</strong>
        akan dihapus permanen.
      </p>
      <div class="modal-action">
        <button class="btn btn-ghost" @click="closeModals">Batal</button>
        <button class="btn btn-error" :disabled="loading" @click="handleDelete">
          <span v-if="loading" class="loading loading-spinner loading-xs"></span>
          Hapus
        </button>
      </div>
    </div>
    <div class="modal-backdrop" @click="closeModals"></div>
  </dialog>
</template>
