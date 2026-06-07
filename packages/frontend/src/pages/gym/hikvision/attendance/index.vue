<route lang="yaml">
meta:
  title: Staff Attendance
  layout: default
</route>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Staff Attendance</h1>
        <p class="text-base-content/60 mt-1">Track and manage staff attendance records</p>
      </div>
      <div class="flex gap-2">
        <router-link to="/gym/hikvision/attendance/report" class="btn btn-outline">
          <IconChartBar class="w-5 h-5 mr-2" />
          Report
        </router-link>
        <!-- Manual Entry button hidden
        <button @click="openCreateModal" class="btn btn-primary">
          <IconPlus class="w-5 h-5 mr-2" />
          Manual Entry
        </button>
        -->
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body py-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div class="form-control">
            <label class="label"><span class="label-text">Start Date</span></label>
            <input type="date" v-model="filters.startDate" class="input input-bordered input-sm w-full" @change="loadAttendances" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">End Date</span></label>
            <input type="date" v-model="filters.endDate" class="input input-bordered input-sm w-full" @change="loadAttendances" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Status</span></label>
            <select v-model="filters.status" class="select select-bordered select-sm w-full" @change="loadAttendances">
              <option value="all">All Status</option>
              <option value="on_time">On Time</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="day_off">Day Off</option>
              <option value="present">Present</option>
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Items Per Page</span></label>
            <select v-model="filters.limit" class="select select-bordered select-sm w-full" @change="loadAttendances">
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
          <div class="form-control">
            <button class="btn btn-sm btn-outline w-full" @click="resetFilters">
              <IconFilterOff class="w-4 h-4 mr-1" />
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Empty State -->
    <div v-else-if="attendances.length === 0" class="text-center py-12">
      <IconCalendarOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
      <h3 class="text-xl font-semibold mb-2">No Attendance Records</h3>
      <p class="text-base-content/60">No attendance data found for the selected filters.</p>
    </div>

    <!-- Attendance Table -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Staff</th>
                <th>Schedule</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Status</th>
                <th>Device</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="att in attendances" :key="att.id">
                <td>
                  <span class="font-medium">{{ formatDateShort(att.date) }}</span>
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <div>
                      <template v-if="att.deviceEmployee">
                        <div class="font-medium">{{ att.deviceEmployee.name }}</div>
                        <div class="text-xs text-base-content/40">EmpNo: {{ att.deviceEmployee.employeeNo }}</div>
                      </template>
                      <template v-else-if="att.user">
                        <div class="font-medium">{{ att.user.firstName }} {{ att.user.lastName }}</div>
                        <div class="text-xs text-base-content/60">{{ att.user.email }}</div>
                        <div v-if="att.user.deviceEmployeeNo" class="text-xs text-base-content/40">EmpNo: {{ att.user.deviceEmployeeNo }}</div>
                      </template>
                      <span v-else class="text-base-content/40">—</span>
                    </div>
                  </div>
                </td>
                <td>
                  <template v-if="att.schedule">
                    <span v-if="att.schedule.isOff" class="badge badge-error badge-sm">OFF</span>
                    <span v-else class="font-mono text-sm">{{ formatShiftTime(att.schedule.shiftStart) }} — {{ formatShiftTime(att.schedule.shiftEnd) }}</span>
                  </template>
                  <span v-else class="text-base-content/40">—</span>
                </td>
                <td>
                  <span class="font-mono text-sm">{{ formatTime(att.checkInTime) }}</span>
                </td>
                <td>
                  <span class="font-mono text-sm">{{ formatTime(att.checkOutTime) }}</span>
                </td>
                <td>
                  <div class="flex flex-col items-start gap-1">
                    <!-- overallStatus is the primary holistic badge -->
                    <div
                      class="badge"
                      :class="overallStatusBadgeClass(att.overallStatus || (att.isOff ? 'off_day' : (att.computedStatus || att.status)))"
                    >
                      {{ overallStatusLabel(att.overallStatus || (att.isOff ? 'off_day' : (att.computedStatus || att.status))) }}
                    </div>
                    <span v-if="att.lateMinutes > 0" class="text-xs text-warning font-medium">
                      +{{ formatDuration(att.lateMinutes) }} late
                    </span>
                    <span v-if="att.earlyLeaveMinutes > 0" class="text-xs text-error font-medium">
                      -{{ formatDuration(att.earlyLeaveMinutes) }} early
                    </span>
                  </div>
                </td>
                <td>
                  <div v-if="att.device">
                    <span class="text-sm">{{ att.device.name }}</span>
                    <div class="text-xs text-base-content/40 font-mono">{{ att.device.ipAddress }}</div>
                  </div>
                  <span v-else class="text-base-content/40">—</span>
                </td>
                <td>
                  <span class="text-sm text-base-content/60">{{ att.notes || '—' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="flex items-center justify-between mt-4 pt-4 border-t border-base-300">
          <span class="text-sm text-base-content/60">
            Showing {{ (pagination.page - 1) * pagination.limit + 1 }} to
            {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of
            {{ pagination.total }} records
          </span>
          <div class="join">
            <button
              class="join-item btn btn-sm"
              :disabled="pagination.page <= 1"
              @click="goToPage(pagination.page - 1)"
            >«</button>
            <button
              v-for="p in visiblePages"
              :key="p"
              class="join-item btn btn-sm"
              :class="{ 'btn-active': p === pagination.page }"
              @click="goToPage(p)"
            >{{ p }}</button>
            <button
              class="join-item btn btn-sm"
              :disabled="pagination.page >= pagination.totalPages"
              @click="goToPage(pagination.page + 1)"
            >»</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Attendance Modal -->
    <dialog ref="attendanceModal" class="modal">
      <div class="modal-box w-11/12 max-w-lg">
        <h3 class="font-bold text-lg mb-4">{{ editingAttendance ? 'Edit Attendance' : 'Manual Attendance Entry' }}</h3>
        <form @submit.prevent="handleSaveAttendance">
          <div class="space-y-4">
            <div v-if="!editingAttendance" class="form-control">
              <label class="label"><span class="label-text">Staff <span class="text-error">*</span></span></label>
              <!-- hidden input to satisfy required validation -->
              <input type="text" :value="attForm.deviceEmployeeId" required class="sr-only" tabindex="-1" />
              <div class="relative" v-click-outside="closeStaffDropdown">
                <div
                  class="input input-bordered w-full flex items-center justify-between cursor-pointer gap-2"
                  :class="staffDropdownOpen ? 'outline outline-2 outline-primary' : ''"
                  @click="openStaffDropdown"
                >
                  <span v-if="selectedStaffLabel" class="truncate">{{ selectedStaffLabel }}</span>
                  <span v-else class="text-base-content/40">Cari atau pilih staff...</span>
                  <svg class="w-4 h-4 shrink-0 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
                <div v-if="staffDropdownOpen" class="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-box shadow-xl">
                  <div class="p-2 border-b border-base-200">
                    <input
                      ref="staffSearchInput"
                      type="text"
                      v-model="staffSearch"
                      class="input input-bordered input-sm w-full"
                      placeholder="Ketik untuk mencari..."
                      @keydown.escape="closeStaffDropdown"
                      @keydown.enter.prevent="selectFirstStaff"
                    />
                  </div>
                  <ul class="max-h-52 overflow-y-auto py-1">
                    <li v-if="filteredStaffList.length === 0" class="px-4 py-3 text-sm text-base-content/50 text-center">Tidak ditemukan</li>
                    <li
                      v-for="u in filteredStaffList"
                      :key="u.id"
                      class="px-4 py-2 cursor-pointer hover:bg-base-200 transition-colors"
                      :class="{ 'bg-primary/10 font-medium': attForm.deviceEmployeeId === u.id }"
                      @click="selectStaff(u)"
                    >
                      <div class="text-sm font-medium">{{ u.name }}</div>
                      <div class="text-xs text-base-content/50">EmpNo: {{ u.employeeNo }}</div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Date *</span></label>
              <input type="date" v-model="attForm.date" class="input input-bordered w-full" required :disabled="!!editingAttendance" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label"><span class="label-text">Check-in Time</span></label>
                <input type="datetime-local" v-model="attForm.checkInTime" class="input input-bordered w-full" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Check-out Time</span></label>
                <input type="datetime-local" v-model="attForm.checkOutTime" class="input input-bordered w-full" />
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Status *</span></label>
              <select v-model="attForm.status" class="select select-bordered w-full" required>
                <option value="on_time">On Time</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
                <option value="day_off">Day Off</option>
                <option value="present">Present</option>
              </select>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Notes</span></label>
              <textarea v-model="attForm.notes" class="textarea textarea-bordered w-full" placeholder="Optional notes..." rows="2"></textarea>
            </div>
          </div>
          <div class="modal-action">
            <button type="button" class="btn" @click="closeAttendanceModal">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              <span v-if="loading" class="loading loading-spinner loading-sm"></span>
              {{ editingAttendance ? 'Save Changes' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useStaffAttendance, useHikvisionEmployees } from '@/composables/gym/hikvision'
import {
  IconChartBar,
  IconPlus,
  IconCalendarOff,
  IconEdit,
  IconFilterOff,
  IconClock,
} from '@tabler/icons-vue'

const {
  attendances,
  loading,
  pagination,
  fetchAttendances,
  createAttendance,
  updateAttendance,
} = useStaffAttendance()

const { deviceEmployees: allStaff, fetchDeviceEmployees: loadStaff } = useHikvisionEmployees()
const staffSearch = ref('')
const staffDropdownOpen = ref(false)
const staffSearchInput = ref(null)

const filteredStaffList = computed(() => {
  const q = staffSearch.value.toLowerCase().trim()
  if (!q) return allStaff.value
  return allStaff.value.filter((u) =>
    `${u.name} ${u.employeeNo}`.toLowerCase().includes(q)
  )
})

const selectedStaffLabel = computed(() => {
  if (!attForm.value.deviceEmployeeId) return ''
  const u = allStaff.value.find((u) => u.id === attForm.value.deviceEmployeeId)
  return u ? `${u.name} — EmpNo: ${u.employeeNo}` : ''
})

const openStaffDropdown = () => {
  staffDropdownOpen.value = true
  nextTick(() => staffSearchInput.value?.focus())
}
const closeStaffDropdown = () => {
  staffDropdownOpen.value = false
  staffSearch.value = ''
}
const selectStaff = (u) => {
  attForm.value.deviceEmployeeId = u.id
  closeStaffDropdown()
}
const selectFirstStaff = () => {
  if (filteredStaffList.value.length) selectStaff(filteredStaffList.value[0])
}

// v-click-outside directive
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutsideHandler = (e) => { if (!el.contains(e.target)) binding.value(e) }
    document.addEventListener('click', el._clickOutsideHandler)
  },
  unmounted(el) { document.removeEventListener('click', el._clickOutsideHandler) },
}

// Refs
const attendanceModal = ref(null)
const editingAttendance = ref(null)

const filters = ref({
  page: 1,
  limit: 50,
  startDate: '',
  endDate: '',
  status: 'all',
})

const attForm = ref({
  deviceEmployeeId: '',
  date: '',
  checkInTime: '',
  checkOutTime: '',
  status: 'on_time',
  notes: '',
})

// Computed
const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 5
  let start = Math.max(1, pagination.value.page - Math.floor(maxVisible / 2))
  let end = Math.min(pagination.value.totalPages, start + maxVisible - 1)
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1)
  }
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

// Helpers
const formatDateShort = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString()
}

const formatTime = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

// ── overallStatus (holistic) ──────────────────────────────────
const overallStatusBadgeClass = (status) => {
  const map = {
    complete:      'badge-success',
    complete_late: 'badge-warning',
    overtime:      'badge-info',
    early_leave:   'badge-warning',
    incomplete:    'badge-error',
    working:       'badge-primary',
    absent:        'badge-error',
    scheduled:     'badge-ghost',
    off_day:       'badge-neutral',
    off_day_work:  'badge-accent',
    // legacy fallbacks
    on_time:       'badge-success',
    late:          'badge-warning',
    present:       'badge-success',
    day_off:       'badge-neutral',
  }
  return map[status] || 'badge-ghost'
}

const overallStatusLabel = (status) => {
  const map = {
    complete:      'Complete',
    complete_late: 'Complete (Late)',
    overtime:      'Overtime',
    early_leave:   'Early Leave',
    incomplete:    'Incomplete',
    working:       'Working',
    absent:        'Absent',
    scheduled:     'Scheduled',
    off_day:       'Off Day',
    off_day_work:  'Off Day (Work)',
    // legacy fallbacks
    on_time:       'On Time',
    late:          'Late',
    present:       'Present',
    day_off:       'Off Day',
  }
  return map[status] || status
}

const formatShiftTime = (t) => {
  if (!t) return '—'
  // Handle HH:mm:ss or HH:mm format
  return t.slice(0, 5)
}

const formatLateMinutes = (minutes) => {
  if (!minutes || minutes <= 0) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// alias used in template
const formatDuration = formatLateMinutes

const toLocalDatetime = (isoStr) => {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const toISO = (localDatetime) => {
  if (!localDatetime) return undefined
  return new Date(localDatetime).toISOString()
}

// Lifecycle
onMounted(() => {
  loadAttendances()
  loadStaff()
})

// Methods
const loadAttendances = async () => {
  try {
    await fetchAttendances({ ...filters.value })
  } catch (err) {
    // handled by composable
  }
}

const resetFilters = () => {
  filters.value = { page: 1, limit: 50, startDate: '', endDate: '', status: 'all' }
  loadAttendances()
}

const goToPage = (page) => {
  filters.value.page = page
  loadAttendances()
}

// Modal operations
const openCreateModal = () => {
  editingAttendance.value = null
  staffSearch.value = ''
  staffDropdownOpen.value = false
  attForm.value = {
    deviceEmployeeId: '',
    date: new Date().toISOString().split('T')[0],
    checkInTime: '',
    checkOutTime: '',
    status: 'on_time',
    notes: '',
  }
  attendanceModal.value?.showModal()
}

const openEditModal = (att) => {
  editingAttendance.value = att
  attForm.value = {
    deviceEmployeeId: att.deviceEmployeeId || '',
    date: att.date,
    checkInTime: toLocalDatetime(att.checkInTime),
    checkOutTime: toLocalDatetime(att.checkOutTime),
    status: att.status,
    notes: att.notes || '',
  }
  attendanceModal.value?.showModal()
}

const closeAttendanceModal = () => {
  attendanceModal.value?.close()
}

const handleSaveAttendance = async () => {
  try {
    if (editingAttendance.value) {
      const data = {
        status: attForm.value.status,
        notes: attForm.value.notes || undefined,
      }
      if (attForm.value.checkInTime) data.checkInTime = toISO(attForm.value.checkInTime)
      if (attForm.value.checkOutTime) data.checkOutTime = toISO(attForm.value.checkOutTime)
      await updateAttendance(editingAttendance.value.id, data)
    } else {
      const data = {
        deviceEmployeeId: attForm.value.deviceEmployeeId,
        date: attForm.value.date,
        status: attForm.value.status,
        notes: attForm.value.notes || undefined,
      }
      if (attForm.value.checkInTime) data.checkInTime = toISO(attForm.value.checkInTime)
      if (attForm.value.checkOutTime) data.checkOutTime = toISO(attForm.value.checkOutTime)
      await createAttendance(data)
    }
    closeAttendanceModal()
    await loadAttendances()
  } catch (err) {
    // handled by composable
  }
}
</script>
