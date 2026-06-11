<route lang="yaml">
meta:
  title: Member Stats
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
  IconUsers,
  IconUserPlus,
  IconUserCheck,
  IconTrendingUp,
  IconTrendingDown,
  IconChartBar,
  IconGenderMale,
  IconGenderFemale,
  IconCalendarStats
} from '@tabler/icons-vue'

const router = useRouter()
const {
  getMembersActive,
  getMembersGrowth,
  getMembersRetention,
  membersActive,
  membersGrowth,
  membersRetention,
  loading,
  formatNumber,
  formatCurrency
} = useReports()

const dateRange = ref({
  start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0]
})
const groupBy = ref('monthly')

// ── Endpoint 1: /reports/members/active ──────────────────────────────────
const activeSummary = computed(() => membersActive.value?.summary || {})
const activeCount = computed(() => activeSummary.value.totalActive ?? 0)
const withActiveService = computed(() => activeSummary.value.withActiveService ?? 0)
const withoutActiveService = computed(() => activeSummary.value.withoutActiveService ?? 0)
const genderBreakdown = computed(() => {
  const gb = activeSummary.value.genderBreakdown || {}
  return Object.entries(gb).map(([gender, count]) => ({ gender, count: parseInt(count) }))
})
const statusBreakdown = computed(() => membersActive.value?.statusBreakdown || [])
const membersList = computed(() => membersActive.value?.members || [])

// ── Endpoint 2: /reports/members/growth ──────────────────────────────────
const growthSummary = computed(() => membersGrowth.value?.summary || {})
const growthData = computed(() => membersGrowth.value?.growthByPeriod || [])
const totalNew = computed(() => growthData.value.reduce((s, r) => s + parseInt(r.newMembers || 0), 0))
const retentionRate = computed(() => growthSummary.value.retentionRate ?? 0)
const growthForecastData = computed(() => membersGrowth.value?.forecast?.forecast || [])
const growthForecastMeta = computed(() => membersGrowth.value?.forecast || {})

// ── Endpoint 3: /reports/members/retention ───────────────────────────────
const cohorts = computed(() => (membersRetention.value?.cohorts || []).filter(c => c.joined > 0))
const checkInFreq = computed(() => membersRetention.value?.checkInFrequency || {})
const freqLast30 = computed(() => {
  const raw = checkInFreq.value.last30Days || {}
  return Object.entries(raw).map(([range, count]) => ({ range, count: parseInt(count) }))
})

const loadData = async () => {
  const params = {
    startDate: dateRange.value.start,
    endDate: dateRange.value.end,
    groupBy: groupBy.value
  }
  await Promise.allSettled([
    getMembersActive(params),
    getMembersGrowth(params),
    getMembersRetention(params)
  ])
}

const genderColor = (gender) => ({
  male: 'progress-info',
  female: 'progress-pink',
  other: 'progress-warning',
  unspecified: 'progress-ghost'
}[gender] || 'progress-ghost')

const genderLabel = (gender) => ({
  male: 'Laki-laki',
  female: 'Perempuan',
  other: 'Lainnya',
  unspecified: 'Tidak Diketahui'
}[gender] || gender)

onMounted(loadData)
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button class="btn btn-ghost btn-sm btn-circle" @click="router.back()">
        <IconArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-3xl font-bold">Member Stats</h1>
        <p class="text-base-content/60 mt-1">Active members, growth, and retention analytics</p>
      </div>
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
        <div class="stat-title">Active Members</div>
        <div class="stat-value text-primary text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatNumber(activeCount) }}</span>
        </div>
        <div class="stat-desc">{{ withActiveService }} with active service</div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-success"><IconUserPlus class="w-8 h-8" /></div>
        <div class="stat-title">New Members</div>
        <div class="stat-value text-success text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatNumber(totalNew) }}</span>
        </div>
        <div class="stat-desc">in selected period</div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-info"><IconUserCheck class="w-8 h-8" /></div>
        <div class="stat-title">Retention Rate</div>
        <div class="stat-value text-info text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ parseFloat(retentionRate || 0).toFixed(1) }}%</span>
        </div>
        <div class="stat-desc">{{ growthSummary.totalActive }} active / {{ growthSummary.totalMembers }} total</div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-warning"><IconCalendarStats class="w-8 h-8" /></div>
        <div class="stat-title">Avg Check-ins</div>
        <div class="stat-value text-warning text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ checkInFreq.avgCheckInsPerMember ?? '-' }}</span>
        </div>
        <div class="stat-desc">per member / 30 days</div>
      </div>
    </div>

    <!-- Gender Breakdown + Status Breakdown -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">
            <IconChartBar class="w-5 h-5" />
            Gender Breakdown
          </h3>
          <div v-if="loading" class="flex justify-center py-10">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="!genderBreakdown.length" class="text-center py-10 text-base-content/60">
            No gender data
          </div>
          <div v-else class="space-y-3">
            <div v-for="g in genderBreakdown" :key="g.gender" class="flex items-center gap-3">
              <div class="flex-1">
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium">{{ genderLabel(g.gender) }}</span>
                  <span>{{ g.count }} members</span>
                </div>
                <progress class="progress w-full" :class="genderColor(g.gender)" :value="g.count" :max="activeCount || 1"></progress>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">
            <IconChartBar class="w-5 h-5" />
            Check-in Frequency (30 Days)
          </h3>
          <div v-if="loading" class="flex justify-center py-10">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="!freqLast30.length" class="text-center py-10 text-base-content/60">
            No frequency data
          </div>
          <div v-else class="space-y-3">
            <div v-for="f in freqLast30" :key="f.range" class="flex items-center gap-3">
              <div class="flex-1">
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium">{{ f.range }} kali</span>
                  <span>{{ f.count }} members</span>
                </div>
                <progress class="progress progress-accent w-full" :value="f.count" :max="checkInFreq.totalActiveCheckingIn || 1"></progress>
              </div>
            </div>
            <div class="text-xs text-base-content/60 pt-1">
              {{ checkInFreq.totalActiveCheckingIn }} members aktif check-in
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Member Growth Table + Forecast -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">
            <IconTrendingUp class="w-5 h-5" />
            Member Growth
          </h3>
          <div v-if="loading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="!growthData.length" class="text-center py-8 text-base-content/60">
            No growth data available
          </div>
          <div v-else class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Period</th>
                  <th class="text-right">New Members</th>
                  <th class="text-right">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in growthData" :key="row.period" class="hover">
                  <td class="font-medium">{{ new Date(row.period).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) }}</td>
                  <td class="text-right text-success font-semibold">+{{ parseInt(row.newMembers || 0) }}</td>
                  <td class="text-right">{{ parseInt(row.cumulativeMembers || 0) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h3 class="card-title">Growth Forecast</h3>
            <div class="flex gap-2">
              <span v-if="growthForecastMeta.trend" class="badge" :class="growthForecastMeta.trend === 'growing' ? 'badge-success' : 'badge-error'">
                {{ growthForecastMeta.trend }}
              </span>
              <span v-if="growthForecastMeta.confidence" class="badge badge-ghost">{{ growthForecastMeta.confidence }} confidence</span>
            </div>
          </div>
          <div v-if="loading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="!growthForecastData.length" class="text-center py-8 text-base-content/60">
            No forecast data
          </div>
          <div v-else class="space-y-3">
            <div v-for="(f, idx) in growthForecastData" :key="f.periodIndex" class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
              <div class="text-sm font-medium text-base-content/70">Prediksi {{ idx + 1 }}</div>
              <div class="font-bold text-success">{{ Math.round(f.predictedValue) }} members</div>
            </div>
            <div v-if="growthForecastMeta.avgGrowthRate" class="text-xs text-base-content/60 pt-1">
              Avg growth rate: {{ growthForecastMeta.avgGrowthRate }}%
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Retention Cohorts -->
    <div class="card bg-base-100 shadow mb-6">
      <div class="card-body">
        <h3 class="card-title mb-4">
          <IconUserCheck class="w-5 h-5" />
          Retention Cohorts
        </h3>
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        <div v-else-if="!cohorts.length" class="text-center py-8 text-base-content/60">
          No retention data available
        </div>
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Period</th>
                <th class="text-right">Bergabung</th>
                <th class="text-right">Masih Aktif</th>
                <th class="text-right">Churn</th>
                <th class="text-right">Retention %</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cohort in cohorts" :key="cohort.period" class="hover">
                <td class="font-medium">{{ cohort.period }}</td>
                <td class="text-right">{{ cohort.joined }}</td>
                <td class="text-right text-success">{{ cohort.stillActive }}</td>
                <td class="text-right text-error">{{ cohort.churned }}</td>
                <td class="text-right">
                  <span class="badge" :class="parseFloat(cohort.retentionRate || 0) >= 80 ? 'badge-success' : parseFloat(cohort.retentionRate || 0) >= 50 ? 'badge-warning' : 'badge-error'">
                    {{ parseFloat(cohort.retentionRate || 0).toFixed(0) }}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Active Members List -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h3 class="card-title mb-4">
          <IconUsers class="w-5 h-5" />
          Active Members List
          <span class="badge badge-primary">{{ membersList.length }}</span>
        </h3>
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        <div v-else-if="!membersList.length" class="text-center py-8 text-base-content/60">
          No members data
        </div>
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra table-sm">
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Join Date</th>
                <th>Service</th>
                <th>End Date</th>
                <th class="text-right">Price Paid</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in membersList" :key="m.id" class="hover">
                <td>
                  <div class="font-medium">{{ m.firstName }} {{ m.lastName }}</div>
                  <div v-if="m.phone" class="text-xs text-base-content/60">{{ m.phone }}</div>
                </td>
                <td class="text-sm">{{ m.email }}</td>
                <td class="text-sm">{{ new Date(m.joinDate).toLocaleDateString('id-ID') }}</td>
                <td>
                  <div v-if="m.activeServices && m.activeServices.length">
                    <span class="badge badge-outline badge-sm capitalize">{{ m.activeServices[0].servicePlan?.name || m.activeServices[0].serviceType }}</span>
                  </div>
                  <span v-else class="text-base-content/40">-</span>
                </td>
                <td class="text-sm">
                  <span v-if="m.activeServices && m.activeServices.length">
                    {{ new Date(m.activeServices[0].endDate).toLocaleDateString('id-ID') }}
                  </span>
                  <span v-else>-</span>
                </td>
                <td class="text-right font-semibold">
                  <span v-if="m.activeServices && m.activeServices.length">
                    {{ formatCurrency(parseFloat(m.activeServices[0].pricePaid || 0)) }}
                  </span>
                  <span v-else>-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
