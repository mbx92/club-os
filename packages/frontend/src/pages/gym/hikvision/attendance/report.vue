<route lang="yaml">
meta:
  title: Attendance Report
  layout: default
</route>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Breadcrumb -->
    <div class="text-sm breadcrumbs mb-4">
      <ul>
        <li><router-link to="/gym/hikvision/attendance">Staff Attendance</router-link></li>
        <li>Report</li>
      </ul>
    </div>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Attendance Report</h1>
        <p class="text-base-content/60 mt-1">Summary of staff attendance for a date range</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body py-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div class="form-control">
            <label class="label"><span class="label-text">Start Date <span class="text-error">*</span></span></label>
            <input type="date" v-model="filters.startDate" class="input input-bordered input-sm w-full" required />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">End Date <span class="text-error">*</span></span></label>
            <input type="date" v-model="filters.endDate" class="input input-bordered input-sm w-full" required />
          </div>
          <div class="form-control">
            <button class="btn btn-primary btn-sm w-full" @click="loadReport" :disabled="loading || !filters.startDate || !filters.endDate">
              <span v-if="loading" class="loading loading-spinner loading-sm"></span>
              Generate Report
            </button>
          </div>
          <div class="form-control">
            <button class="btn btn-success btn-sm w-full" @click="handleExport" :disabled="exporting || !filters.startDate || !filters.endDate">
              <span v-if="exporting" class="loading loading-spinner loading-sm"></span>
              <IconDownload v-else class="w-4 h-4 mr-1" />
              Export Excel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Report Data -->
    <template v-else-if="report">
      <!-- Period Info -->
      <div class="alert alert-info mb-6">
        <IconCalendar class="w-5 h-5" />
        <span>Period: {{ report.period?.startDate }} to {{ report.period?.endDate }}</span>
      </div>

      <!-- Empty Report -->
      <div v-if="report.data?.length === 0" class="text-center py-12">
        <p class="text-base-content/60">No attendance data for the selected period.</p>
      </div>

      <!-- Grouped Table -->
      <div v-else class="card bg-base-100 shadow-xl">
        <div class="card-body p-0">
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr class="bg-base-200">
                  <th>Date</th>
                  <th>Shift</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                  <th class="text-center">Late (min)</th>
                  <th class="text-right">Working Time</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="staff in groupedStaff" :key="staff.deviceEmployee?.id">
                  <!-- Group header -->
                  <tr class="bg-base-300">
                    <td colspan="7" class="py-2 px-4">
                      <div class="flex items-center gap-2">
                        <span class="badge badge-ghost font-mono text-xs">{{ staff.deviceEmployee?.employeeNo }}</span>
                        <span class="font-bold text-base">{{ staff.deviceEmployee?.name }}</span>
                        <span class="text-xs text-base-content/50 ml-auto">{{ staff.daysWithWorkingHours }} day(s) &bull; {{ staff.totalWorkingHoursFormatted }}</span>
                      </div>
                    </td>
                  </tr>
                  <!-- Records -->
                  <tr v-for="(row, i) in staff.records" :key="i" class="hover">
                    <td class="font-mono text-sm">{{ formatDateShort(row.date) }}</td>
                    <td class="text-xs text-base-content/60">
                      <span v-if="row.schedule">
                        {{ row.schedule.shiftStart?.slice(0,5) }} – {{ row.schedule.shiftEnd?.slice(0,5) }}
                      </span>
                      <span v-else class="text-base-content/30">—</span>
                    </td>
                    <td class="font-mono text-sm">{{ formatTime(row.checkInTime) }}</td>
                    <td class="font-mono text-sm">{{ formatTime(row.checkOutTime) }}</td>
                    <td>
                      <div class="badge badge-sm" :class="statusBadgeClass(row.isOff ? 'off_day' : row.computedStatus)">
                        {{ statusLabel(row.isOff ? 'off_day' : row.computedStatus) }}
                      </div>
                    </td>
                    <td class="text-center">
                      <span :class="row.lateMinutes > 0 ? 'text-warning font-bold' : 'text-base-content/30'">
                        {{ row.lateMinutes > 0 ? row.lateMinutes : '—' }}
                      </span>
                    </td>
                    <td class="text-right">
                      <span v-if="row.workingMinutes > 0" class="text-sm">
                        {{ row.workingHoursFormatted }}
                        <span class="text-xs text-base-content/40">({{ row.workingMinutes }} min)</span>
                      </span>
                      <span v-else class="text-base-content/30">—</span>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- No Report Yet -->
    <div v-else class="text-center py-12">
      <IconChartBar class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
      <h3 class="text-xl font-semibold mb-2">Select a Date Range</h3>
      <p class="text-base-content/60">Choose a start and end date, then click "Generate Report".</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStaffAttendance } from '@/composables/gym/hikvision'
import {
  IconCalendar,
  IconChartBar,
  IconDownload,
} from '@tabler/icons-vue'

const { report, loading, fetchReport, exportReport } = useStaffAttendance()

const exporting = ref(false)
const handleExport = async () => {
  exporting.value = true
  try {
    await exportReport(filters.value)
  } finally {
    exporting.value = false
  }
}

const filters = ref({
  startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
})

// Group staff sorted by name, records sorted by date
const groupedStaff = computed(() => {
  if (!report.value?.data) return []
  return [...report.value.data].sort((a, b) =>
    (a.deviceEmployee?.name || '').localeCompare(b.deviceEmployee?.name || '')
  ).map(staff => ({
    ...staff,
    records: [...(staff.records || [])].sort((a, b) => a.date.localeCompare(b.date)),
  }))
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

const statusBadgeClass = (status) => {
  const map = {
    present: 'badge-success',
    on_time: 'badge-success',
    late: 'badge-warning',
    absent: 'badge-error',
    half_day: 'badge-info',
    day_off: 'badge-neutral',
    off_day: 'badge-neutral',
  }
  return map[status] || 'badge-ghost'
}

const statusLabel = (status) => {
  const map = {
    present: 'Present',
    on_time: 'On Time',
    late: 'Late',
    absent: 'Absent',
    half_day: 'Half Day',
    day_off: 'Off Day',
    off_day: 'Off Day',
  }
  return map[status] || status
}

const loadReport = async () => {
  try {
    await fetchReport(filters.value)
  } catch (err) {
    // handled by composable
  }
}
</script>
