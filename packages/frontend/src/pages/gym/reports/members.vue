<route lang="yaml">
meta:
  title: Member Reports
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
  IconChartBar
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
  formatNumber
} = useReports()

const dateRange = ref({
  start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0]
})
const groupBy = ref('monthly')

// Computed
const activeCount = computed(() => membersActive.value?.activeMemberCount ?? 0)
const planBreakdown = computed(() => membersActive.value?.planBreakdown ?? [])
const locationBreakdown = computed(() => membersActive.value?.locationBreakdown ?? [])

const growthData = computed(() => membersGrowth.value?.growthByPeriod ?? [])
const totalNew = computed(() => membersGrowth.value?.totalNewMembers ?? 0)
const churnRate = computed(() => membersGrowth.value?.churnRate ?? 0)

const retentionRate = computed(() => membersRetention.value?.retentionRate ?? 0)
const cohorts = computed(() => membersRetention.value?.cohorts ?? [])

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

onMounted(loadData)
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button class="btn btn-ghost btn-sm" @click="router.push('/gym/reports')">
        <IconArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-3xl font-bold">Member Reports</h1>
        <p class="text-base-content/60 mt-1">Active members, growth, and retention analytics</p>
      </div>
      <button class="btn btn-ghost btn-sm" @click="loadData" :disabled="loading">
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
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-primary"><IconUsers class="w-8 h-8" /></div>
        <div class="stat-title">Active Members</div>
        <div class="stat-value text-primary text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatNumber(activeCount) }}</span>
        </div>
      </div>

      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-success"><IconUserPlus class="w-8 h-8" /></div>
        <div class="stat-title">New Members</div>
        <div class="stat-value text-success text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatNumber(totalNew) }}</span>
        </div>
      </div>

      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-error"><IconTrendingDown class="w-8 h-8" /></div>
        <div class="stat-title">Churn Rate</div>
        <div class="stat-value text-error text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ parseFloat(churnRate || 0).toFixed(1) }}%</span>
        </div>
      </div>

      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-info"><IconUserCheck class="w-8 h-8" /></div>
        <div class="stat-title">Retention Rate</div>
        <div class="stat-value text-info text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ parseFloat(retentionRate || 0).toFixed(1) }}%</span>
        </div>
      </div>
    </div>

    <!-- Plan Breakdown + Location Breakdown -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Plan Distribution -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">
            <IconChartBar class="w-5 h-5" />
            Member by Plan
          </h3>
          <div v-if="loading" class="flex justify-center py-10">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="!planBreakdown.length" class="text-center py-10 text-base-content/60">
            No plan data available
          </div>
          <div v-else class="space-y-3">
            <div v-for="plan in planBreakdown" :key="plan.planName || plan.plan" class="flex items-center gap-3">
              <div class="flex-1">
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium capitalize">{{ plan.planName || plan.plan }}</span>
                  <span>{{ parseInt(plan.count || 0) }} members</span>
                </div>
                <progress
                  class="progress progress-primary w-full"
                  :value="parseInt(plan.count || 0)"
                  :max="activeCount || 1"
                ></progress>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Location Distribution -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">
            <IconChartBar class="w-5 h-5" />
            Member by Location
          </h3>
          <div v-if="loading" class="flex justify-center py-10">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="!locationBreakdown.length" class="text-center py-10 text-base-content/60">
            No location data available
          </div>
          <div v-else class="space-y-3">
            <div v-for="loc in locationBreakdown" :key="loc.location || loc.locationId" class="flex items-center gap-3">
              <div class="flex-1">
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium">{{ loc.locationName || loc.location }}</span>
                  <span>{{ parseInt(loc.count || 0) }} members</span>
                </div>
                <progress
                  class="progress progress-secondary w-full"
                  :value="parseInt(loc.count || 0)"
                  :max="activeCount || 1"
                ></progress>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Growth Over Time -->
    <div class="card bg-base-100 shadow mb-6">
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
                <th class="text-right">Churned</th>
                <th class="text-right">Net Change</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in growthData" :key="row.period" class="hover">
                <td class="font-medium">{{ new Date(row.period).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) }}</td>
                <td class="text-right text-success">+{{ parseInt(row.newMembers || row.new || 0) }}</td>
                <td class="text-right text-error">-{{ parseInt(row.churned || row.churn || 0) }}</td>
                <td class="text-right font-bold"
                  :class="(parseInt(row.newMembers || row.new || 0) - parseInt(row.churned || row.churn || 0)) >= 0 ? 'text-success' : 'text-error'">
                  {{ (parseInt(row.newMembers || row.new || 0) - parseInt(row.churned || row.churn || 0)) >= 0 ? '+' : '' }}{{ parseInt(row.newMembers || row.new || 0) - parseInt(row.churned || row.churn || 0) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Retention Cohorts -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h3 class="card-title mb-4">
          <IconUserCheck class="w-5 h-5" />
          Retention Cohorts
        </h3>
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        <div v-else-if="!cohorts.length" class="text-center py-8 text-base-content/60">
          No cohort data available
        </div>
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Cohort</th>
                <th class="text-right">Initial</th>
                <th class="text-right">Retained</th>
                <th class="text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cohort in cohorts" :key="cohort.cohort || cohort.period" class="hover">
                <td class="font-medium">{{ cohort.cohort || new Date(cohort.period).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) }}</td>
                <td class="text-right">{{ parseInt(cohort.initial || cohort.total || 0) }}</td>
                <td class="text-right">{{ parseInt(cohort.retained || 0) }}</td>
                <td class="text-right">
                  <span class="badge" :class="parseFloat(cohort.rate || 0) >= 70 ? 'badge-success' : parseFloat(cohort.rate || 0) >= 50 ? 'badge-warning' : 'badge-error'">
                    {{ parseFloat(cohort.rate || 0).toFixed(1) }}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
