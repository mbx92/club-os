<route lang="yaml">
meta:
  title: Service Reports
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
  IconTicket,
  IconChartBar,
  IconAlertTriangle,
  IconCircleCheck,
  IconRepeat,
  IconList
} from '@tabler/icons-vue'

const router = useRouter()
const {
  getServicesPerformance,
  getServicesActive,
  servicesPerformance,
  servicesActive,
  loading,
  formatCurrency,
  formatNumber,
  exportToCSV
} = useReports()

const dateRange = ref({
  start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0]
})
const groupBy = ref('monthly')
const serviceTypeFilter = ref('')

// Performance computed
const salesByPeriod = computed(() => servicesPerformance.value?.salesByPeriod ?? [])
const perfByServiceType = computed(() => servicesPerformance.value?.byServiceType ?? [])
const topPlans = computed(() => servicesPerformance.value?.topPlans ?? [])
const totalRevenue = computed(() =>
  salesByPeriod.value.reduce((s, r) => s + parseFloat(r.totalRevenue || 0), 0)
)
const totalSales = computed(() =>
  salesByPeriod.value.reduce((s, r) => s + parseInt(r.transactionCount || 0), 0)
)
const forecastData = computed(() => servicesPerformance.value?.forecast?.forecast || [])
const forecastMeta = computed(() => servicesPerformance.value?.forecast || {})

// Active computed
const statusDistribution = computed(() => servicesActive.value?.statusDistribution ?? [])
const activeByType = computed(() => servicesActive.value?.byServiceType ?? [])
const expiringSoon7 = computed(() => servicesActive.value?.expiringSoon?.within7Days ?? [])
const within30DaysCount = computed(() => servicesActive.value?.expiringSoon?.within30DaysCount ?? 0)
const autoRenewCount = computed(() => servicesActive.value?.autoRenewEnabled ?? 0)
const totalStatusCount = computed(() => statusDistribution.value.reduce((s, r) => s + parseInt(r.count || 0), 0))

const loadData = async () => {
  const params = {
    startDate: dateRange.value.start,
    endDate: dateRange.value.end,
    groupBy: groupBy.value,
    serviceType: serviceTypeFilter.value || undefined
  }
  await Promise.allSettled([
    getServicesPerformance(params),
    getServicesActive()
  ])
}

const handleExport = () => {
  exportToCSV(
    salesByPeriod.value.map(r => ({
      Period: new Date(r.period).toLocaleDateString('id-ID'),
      Quantity: r.totalQuantity ?? 0,
      Transactions: r.transactionCount ?? 0,
      Revenue: r.totalRevenue ?? 0
    })),
    'service_reports'
  )
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
        <h1 class="text-3xl font-bold">Service Reports</h1>
        <p class="text-base-content/60 mt-1">Performance and status of membership services & plans</p>
      </div>
      <button class="btn btn-ghost btn-sm" @click="handleExport">
        <IconDownload class="w-4 h-4" />
      </button>
      <button class="btn btn-ghost btn-sm" @click="loadData" :disabled="loading">
        <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow mb-6">
      <div class="card-body p-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DateRangeFilter v-model="dateRange" @update:modelValue="loadData" />
          <div class="form-control">
            <label class="label"><span class="label-text">Group By</span></label>
            <select v-model="groupBy" class="select select-bordered w-full mt-2" @change="loadData">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Service Type</span></label>
            <select v-model="serviceTypeFilter" class="select select-bordered w-full mt-2" @change="loadData">
              <option value="">All Types</option>
              <option value="membership">Membership</option>
              <option value="personal_training">Personal Training</option>
              <option value="group_class">Group Class</option>
              <option value="locker">Locker</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-primary"><IconTicket class="w-8 h-8" /></div>
        <div class="stat-title">Total Transactions</div>
        <div class="stat-value text-primary text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatNumber(totalSales) }}</span>
        </div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-success"><IconChartBar class="w-8 h-8" /></div>
        <div class="stat-title">Total Revenue</div>
        <div class="stat-value text-success text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatCurrency(totalRevenue) }}</span>
        </div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-warning"><IconAlertTriangle class="w-8 h-8" /></div>
        <div class="stat-title">Expiring &lt;7 Days</div>
        <div class="stat-value text-warning text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ expiringSoon7.length }}</span>
        </div>
        <div class="stat-desc">{{ within30DaysCount }} within 30 days</div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-info"><IconRepeat class="w-8 h-8" /></div>
        <div class="stat-title">Auto-Renew Active</div>
        <div class="stat-value text-info text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatNumber(autoRenewCount) }}</span>
        </div>
      </div>
    </div>

    <!-- Service Type Distribution + Status Distribution -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- By Service Type (Active) -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">
            <IconList class="w-5 h-5" />
            Active by Service Type
          </h3>
          <div v-if="loading" class="flex justify-center py-10">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="!activeByType.length" class="text-center py-10 text-base-content/60">No data available</div>
          <div v-else class="space-y-3">
            <div v-for="t in activeByType" :key="t.serviceType" class="flex-1">
              <div class="flex justify-between text-sm mb-1">
                <span class="font-medium capitalize">{{ t.serviceType }}</span>
                <span>{{ parseInt(t.count || 0) }} services &middot; {{ formatCurrency(parseFloat(t.totalRevenue || 0)) }}</span>
              </div>
              <progress
                class="progress progress-primary w-full"
                :value="parseInt(t.count || 0)"
                :max="activeByType.reduce((a, b) => a + parseInt(b.count || 0), 0) || 1"
              ></progress>
            </div>
          </div>
        </div>
      </div>

      <!-- Status Distribution -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">
            <IconCircleCheck class="w-5 h-5" />
            Status Distribution
          </h3>
          <div v-if="loading" class="flex justify-center py-10">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="!statusDistribution.length" class="text-center py-10 text-base-content/60">No data available</div>
          <div v-else class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Status</th>
                  <th class="text-right">Count</th>
                  <th class="text-right">%</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in statusDistribution" :key="s.status" class="hover">
                  <td>
                    <span class="badge capitalize"
                      :class="{
                        'badge-success': s.status === 'active',
                        'badge-warning': s.status === 'expiring_soon' || s.status === 'pending',
                        'badge-error': s.status === 'expired' || s.status === 'cancelled',
                        'badge-info': s.status === 'suspended'
                      }">
                      {{ s.status?.replace(/_/g, ' ') }}
                    </span>
                  </td>
                  <td class="text-right">{{ parseInt(s.count || 0) }}</td>
                  <td class="text-right">{{ totalStatusCount ? ((parseInt(s.count || 0) / totalStatusCount) * 100).toFixed(1) : 0 }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Plans -->
    <div class="card bg-base-100 shadow mb-6">
      <div class="card-body">
        <h3 class="card-title mb-4">
          <IconChartBar class="w-5 h-5" />
          Top Plans by Revenue
        </h3>
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        <div v-else-if="!topPlans.length" class="text-center py-8 text-base-content/60">No plan data available</div>
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>#</th>
                <th>Plan Name</th>
                <th class="text-right">Terjual</th>
                <th class="text-right">Total Revenue</th>
                <th class="text-right">Avg Price</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(plan, i) in topPlans" :key="plan.itemId || i" class="hover">
                <td class="font-bold text-base-content/50">{{ i + 1 }}</td>
                <td class="font-medium">{{ plan.itemName }}</td>
                <td class="text-right">{{ parseInt(plan.totalSold || 0) }}</td>
                <td class="text-right font-semibold">{{ formatCurrency(parseFloat(plan.totalRevenue || 0)) }}</td>
                <td class="text-right text-base-content/60">
                  {{ plan.totalSold && parseInt(plan.totalSold) > 0
                    ? formatCurrency(parseFloat(plan.totalRevenue || 0) / parseInt(plan.totalSold))
                    : '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Sales Trend + Forecast -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">
            <IconChartBar class="w-5 h-5" />
            Sales Over Time
          </h3>
          <div v-if="loading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="!salesByPeriod.length" class="text-center py-8 text-base-content/60">No period data available</div>
          <div v-else class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Period</th>
                  <th class="text-right">Qty</th>
                  <th class="text-right">Transaksi</th>
                  <th class="text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in salesByPeriod" :key="row.period" class="hover">
                  <td class="font-medium">{{ new Date(row.period).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) }}</td>
                  <td class="text-right">{{ parseInt(row.totalQuantity || 0) }}</td>
                  <td class="text-right">{{ parseInt(row.transactionCount || 0) }}</td>
                  <td class="text-right font-semibold">{{ formatCurrency(parseFloat(row.totalRevenue || 0)) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h3 class="card-title">Revenue Forecast</h3>
            <div class="flex gap-2">
              <span v-if="forecastMeta.trend" class="badge" :class="forecastMeta.trend === 'growing' ? 'badge-success' : 'badge-error'">
                {{ forecastMeta.trend }}
              </span>
              <span v-if="forecastMeta.confidence" class="badge badge-ghost">{{ forecastMeta.confidence }} confidence</span>
            </div>
          </div>
          <div v-if="loading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="!forecastData.length" class="text-center py-8 text-base-content/60">No forecast data</div>
          <div v-else class="space-y-3">
            <div v-for="(f, idx) in forecastData" :key="f.periodIndex" class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
              <div class="text-sm font-medium text-base-content/70">Prediksi {{ idx + 1 }}</div>
              <div class="font-bold text-success">{{ formatCurrency(f.predictedValue) }}</div>
            </div>
            <div v-if="forecastMeta.avgGrowthRate" class="text-xs text-base-content/60 pt-1">
              Avg growth rate: {{ forecastMeta.avgGrowthRate }}%
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Expiring Soon -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h3 class="card-title mb-4">
          <IconAlertTriangle class="w-5 h-5 text-warning" />
          Expiring &lt;7 Days
          <span class="badge badge-warning">{{ expiringSoon7.length }}</span>
        </h3>
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        <div v-else-if="!expiringSoon7.length" class="text-center py-8 text-base-content/60">No services expiring within 7 days</div>
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan</th>
                <th>Service Type</th>
                <th>Start</th>
                <th>End</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in expiringSoon7" :key="item.id" class="hover">
                <td class="font-medium">{{ item.customerName || '-' }}</td>
                <td>{{ item.servicePlan?.name || '-' }}</td>
                <td><span class="badge badge-outline badge-sm capitalize">{{ item.serviceType }}</span></td>
                <td class="text-sm">{{ new Date(item.startDate).toLocaleDateString('id-ID') }}</td>
                <td>
                  <span class="font-semibold"
                    :class="new Date(item.endDate) <= new Date() ? 'text-error' : 'text-warning'">
                    {{ new Date(item.endDate).toLocaleDateString('id-ID') }}
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
