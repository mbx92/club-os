<route lang="yaml">
meta:
  title: Staff Reports
  layout: default
</route>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useReports } from '@/composables/shared/useReports'
import DateRangeFilter from '@/components/restaurant/shared/DateRangeFilter.vue'
import {
  IconArrowLeft,
  IconRefresh,
  IconDownload,
  IconUsers,
  IconCalendar,
  IconClock,
  IconChartBar,
  IconUserCheck,
  IconBriefcase
} from '@tabler/icons-vue'

const router = useRouter()
const {
  getStaffAttendance,
  getStaffDailyComposition,
  getStaffShiftSummary,
  staffAttendance,
  staffDailyComposition,
  staffShiftSummary,
  loading,
  formatNumber,
  formatPeriod,
  exportToCSV
} = useReports()

const dateRange = ref({
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0]
})
const groupBy = ref('daily')

// Attendance computed
const attendanceSummary = computed(() => staffAttendance.value?.summary ?? {})
const attendanceByPeriod = computed(() => staffAttendance.value?.attendanceByPeriod ?? [])
const perStaff = computed(() => staffAttendance.value?.perStaff ?? [])
const totalLateCount = computed(() =>
  attendanceByPeriod.value.reduce((s, r) => s + parseInt(r.lateCount || 0), 0)
)

// Daily composition computed
const composition = computed(() => staffDailyComposition.value?.composition ?? [])
const compositionSummary = computed(() => staffDailyComposition.value?.summary ?? {})

// Shift summary computed
const shiftDistribution = computed(() => staffShiftSummary.value?.shiftDistribution ?? [])
const totalShiftAssignments = computed(() =>
  shiftDistribution.value.reduce((s, r) => s + parseInt(r.totalAssignments || 0), 0)
)

// Per-employee summary built from composition data (has names)
const staffFromComposition = computed(() => {
  const map = {}
  composition.value.forEach(day => {
    day.staff?.forEach(s => {
      const key = s.deviceEmployeeId || s.userId || 'unknown'
      if (!map[key]) {
        map[key] = {
          deviceEmployeeId: s.deviceEmployeeId,
          userId: s.userId,
          name: s.name,
          totalDays: 0,
          shifts: {}
        }
      }
      map[key].totalDays++
      map[key].shifts[s.shift] = (map[key].shifts[s.shift] || 0) + 1
    })
  })
  return Object.values(map).sort((a, b) => b.totalDays - a.totalDays)
})

const loadData = async () => {
  const params = {
    startDate: dateRange.value.start,
    endDate: dateRange.value.end,
    groupBy: groupBy.value
  }
  await Promise.allSettled([
    getStaffAttendance(params),
    getStaffDailyComposition({ startDate: params.startDate, endDate: params.endDate }),
    getStaffShiftSummary({ startDate: params.startDate, endDate: params.endDate })
  ])
}

const handleExport = () => {
  exportToCSV(
    perStaff.value.map(s => ({
      Name: s.name || s.user ? `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim() : '-',
      Email: s.user?.email || '-',
      TotalDays: parseInt(s.totalDays || 0),
      PresentDays: parseInt(s.presentDays || 0),
      AttendanceRate: s.totalDays && parseInt(s.totalDays) > 0
        ? `${((parseInt(s.presentDays || 0) / parseInt(s.totalDays)) * 100).toFixed(1)}%`
        : '-'
    })),
    'staff_reports'
  )
}

onMounted(loadData)
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button class="btn btn-ghost btn-sm btn-circle" @click="router.push('/gym/reports')">
        <IconArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-3xl font-bold">Staff Reports</h1>
        <p class="text-base-content/60 mt-1">Staff attendance, daily composition, and shift analysis</p>
      </div>
      <button class="btn btn-ghost btn-sm btn-circle" @click="handleExport">
        <IconDownload class="w-4 h-4" />
      </button>
      <button class="btn btn-ghost btn-sm btn-circle" @click="loadData" :disabled="loading">
        <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow mb-6">
      <div class="card-body p-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateRangeFilter v-model="dateRange" @update:modelValue="loadData" />
          <div class="form-control">
            <label class="label"><span class="label-text">Group By</span></label>
            <select v-model="groupBy" class="select select-bordered w-full mt-2" @change="loadData">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-primary"><IconUsers class="w-8 h-8" /></div>
        <div class="stat-title">Total Records</div>
        <div class="stat-value text-primary text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatNumber(attendanceSummary.totalRecords ?? 0) }}</span>
        </div>
        <div class="stat-desc">{{ attendanceSummary.uniqueStaff ?? 0 }} unique staff</div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-success"><IconUserCheck class="w-8 h-8" /></div>
        <div class="stat-title">Total Check-ins</div>
        <div class="stat-value text-success text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatNumber(attendanceSummary.totalCheckIns ?? 0) }}</span>
        </div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-info"><IconCalendar class="w-8 h-8" /></div>
        <div class="stat-title">Total Check-outs</div>
        <div class="stat-value text-info text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatNumber(attendanceSummary.totalCheckOuts ?? 0) }}</span>
        </div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-warning"><IconClock class="w-8 h-8" /></div>
        <div class="stat-title">Total Late</div>
        <div class="stat-value text-warning text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatNumber(totalLateCount) }}</span>
        </div>
      </div>
    </div>

    <!-- Shift Distribution + Daily Composition Summary -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Shift Distribution -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">
            <IconBriefcase class="w-5 h-5" />
            Shift Distribution
          </h3>
          <div v-if="loading" class="flex justify-center py-10">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="!shiftDistribution.length" class="text-center py-10 text-base-content/60">No shift data available</div>
          <div v-else class="space-y-4">
            <div v-for="s in shiftDistribution" :key="s.shiftId" class="flex-1">
              <div class="flex items-center justify-between text-sm mb-1">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full inline-block" :style="{ backgroundColor: s.shift?.color || '#888' }"></span>
                  <span class="font-medium">{{ s.shift?.name }}</span>
                  <span class="text-xs text-base-content/50">{{ s.shift?.shiftStart?.slice(0,5) }}–{{ s.shift?.shiftEnd?.slice(0,5) }}</span>
                </div>
                <span>{{ parseInt(s.totalAssignments || 0) }} assign &middot; {{ s.daysUsed }}d</span>
              </div>
              <progress
                class="progress w-full"
                :style="{ '--p-color': s.shift?.color }"
                :class="'progress-primary'"
                :value="parseInt(s.totalAssignments || 0)"
                :max="totalShiftAssignments || 1"
              ></progress>
            </div>
          </div>
        </div>
      </div>

      <!-- Daily Composition Summary -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">
            <IconChartBar class="w-5 h-5" />
            Schedule Summary
          </h3>
          <div v-if="loading" class="flex justify-center py-4">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-base-200 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-primary">{{ compositionSummary.totalDays ?? 0 }}</div>
              <div class="text-xs text-base-content/60">Total Days</div>
            </div>
            <div class="bg-base-200 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-success">{{ compositionSummary.avgStaffPerDay ?? 0 }}</div>
              <div class="text-xs text-base-content/60">Avg Staff/Day</div>
            </div>
            <div class="bg-base-200 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-info">{{ compositionSummary.totalScheduleEntries ?? 0 }}</div>
              <div class="text-xs text-base-content/60">Schedule Entries</div>
            </div>
            <div class="bg-base-200 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-warning">{{ compositionSummary.offDayEntries ?? 0 }}</div>
              <div class="text-xs text-base-content/60">Off Day Entries</div>
            </div>
          </div>
          <div v-if="!loading && composition.length" class="overflow-x-auto">
            <table class="table table-sm table-zebra">
              <thead>
                <tr>
                  <th>Date</th>
                  <th class="text-right">Staff</th>
                  <th>Shifts</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="day in composition.slice(-7).reverse()" :key="day.date" class="hover">
                  <td class="font-medium text-sm">{{ new Date(day.date).toLocaleDateString('id-ID', { weekday: 'short', month: 'short', day: 'numeric' }) }}</td>
                  <td class="text-right font-semibold">{{ day.totalStaff }}</td>
                  <td>
                    <div class="flex gap-1 flex-wrap">
                      <span v-for="sh in day.shifts" :key="sh.shiftCode"
                        class="badge badge-sm font-medium"
                        :style="{ backgroundColor: sh.color + '33', color: sh.color, borderColor: sh.color + '66' }">
                        {{ sh.shiftCode }}:{{ sh.count }}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Per Staff Attendance -->
    <div class="card bg-base-100 shadow mb-6">
      <div class="card-body">
        <h3 class="card-title mb-4">
          <IconUserCheck class="w-5 h-5" />
          Per Staff Schedule Days
          <span class="badge badge-ghost">{{ staffFromComposition.length }} staff</span>
        </h3>
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        <div v-else-if="!staffFromComposition.length" class="text-center py-8 text-base-content/60">No staff data available</div>
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>#</th>
                <th>Nama</th>
                <th class="text-right">Total Hari</th>
                <th>Shift Breakdown</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(staff, i) in staffFromComposition" :key="staff.deviceEmployeeId || i" class="hover">
                <td class="text-base-content/40 font-bold">{{ i + 1 }}</td>
                <td class="font-medium">{{ staff.name || '-' }}</td>
                <td class="text-right font-semibold">{{ staff.totalDays }}</td>
                <td>
                  <div class="flex gap-1 flex-wrap">
                    <span v-for="(count, shift) in staff.shifts" :key="shift" class="badge badge-sm badge-outline">
                      {{ shift }}: {{ count }}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Attendance Over Time -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h3 class="card-title mb-4">
          <IconCalendar class="w-5 h-5" />
          Attendance Over Time
        </h3>
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        <div v-else-if="!attendanceByPeriod.length" class="text-center py-8 text-base-content/60">No period data available</div>
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Period</th>
                <th class="text-right">Records</th>
                <th class="text-right">Staff</th>
                <th class="text-right">Present</th>
                <th class="text-right">Late</th>
                <th class="text-right">Absent</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in attendanceByPeriod" :key="row.period" class="hover">
                <td class="font-medium">{{ new Date(row.period).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }) }}</td>
                <td class="text-right">{{ parseInt(row.totalRecords || 0) }}</td>
                <td class="text-right">{{ parseInt(row.uniqueStaff || 0) }}</td>
                <td class="text-right text-success">{{ parseInt(row.presentCount || 0) }}</td>
                <td class="text-right text-warning">{{ parseInt(row.lateCount || 0) }}</td>
                <td class="text-right text-error">{{ parseInt(row.absentCount || 0) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
