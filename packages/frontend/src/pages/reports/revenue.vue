<route lang="yaml">
meta:
  title: Revenue Report
  layout: default
</route>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useReports } from '@/composables/shared/useReports'
import DateRangeFilter from '@/components/restaurant/shared/DateRangeFilter.vue'
import {
  IconArrowLeft,
  IconFilter,
  IconRefresh,
  IconDownload,
  IconCash,
  IconReceipt,
  IconChartBar,
  IconTrendingUp,
  IconTrendingDown,
  IconCreditCard,
  IconBuildingBank
} from '@tabler/icons-vue'

const router = useRouter()
const {
  getFinanceRevenue,
  financeRevenue,
  formatCurrency,
  exportToCSV,
  loading
} = useReports()

const dateRange = ref({
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0]
})
const groupBy = ref('daily')

const summary = computed(() => financeRevenue.value?.summary || {})
const revenueByPeriod = computed(() => financeRevenue.value?.revenueByPeriod || [])
const revenueByModule = computed(() => financeRevenue.value?.revenueByModule || [])
const paymentDistribution = computed(() => financeRevenue.value?.paymentDistribution || [])
const paymentMethodsWithBank = computed(() =>
  paymentDistribution.value.filter(p =>
    p.bankDetails && p.bankDetails.some(b => b.bankName?.toUpperCase() !== 'OTHERS')
  )
)
const forecastData = computed(() => financeRevenue.value?.forecast?.forecast || [])
const forecastMeta = computed(() => financeRevenue.value?.forecast || {})

const formatPaymentLabel = (method) => {
  const map = {
    cash: 'Tunai',
    credit_card: 'Kartu Kredit',
    debit_card: 'Kartu Debit',
    bank_transfer: 'Transfer Bank',
    qris: 'QRIS',
    e_wallet: 'E-Wallet',
    compliment: 'Gratis/Komplemen'
  }
  return map[method] || (method || '').replace(/_/g, ' ')
}

const loadData = async () => {
  try {
    await getFinanceRevenue({
      startDate: dateRange.value.start,
      endDate: dateRange.value.end,
      groupBy: groupBy.value
    })
  } catch (err) {
    console.error('Failed to load revenue report:', err)
  }
}

const handleExport = () => {
  if (!revenueByPeriod.value.length) return
  const exportData = revenueByPeriod.value.map(p => ({
    Period: new Date(p.period).toLocaleDateString('id-ID'),
    Transactions: parseInt(p.transactionCount || 0),
    Revenue: parseFloat(p.revenue || 0),
    Discounts: parseFloat(p.discounts || 0)
  }))
  exportToCSV(exportData, `reports-revenue-${groupBy.value}`)
}

watch([dateRange, groupBy], () => { loadData() }, { deep: true })
onMounted(() => { loadData() })
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button class="btn btn-ghost btn-sm btn-circle" @click="router.back()">
        <IconArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-3xl font-bold">Revenue Report</h1>
        <p class="text-base-content/60 mt-1">Revenue trends and payment analysis</p>
      </div>
      <button class="btn btn-ghost btn-sm btn-circle" @click="loadData" :disabled="loading">
        <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
      </button>
      <button class="btn btn-primary btn-sm" @click="handleExport" :disabled="!revenueByPeriod.length">
        <IconDownload class="w-4 h-4 mr-1" />
        Export
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow mb-6">
      <div class="card-body p-4">
        <div class="flex items-center gap-2 mb-4">
          <IconFilter class="w-5 h-5" />
          <h3 class="font-semibold">Filters</h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-control">
            <DateRangeFilter v-model="dateRange" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Group By</span></label>
            <select v-model="groupBy" class="select select-bordered w-full mt-2">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-primary"><IconCash class="w-8 h-8" /></div>
        <div class="stat-title">Total Revenue</div>
        <div class="stat-value text-primary text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatCurrency(summary.totalRevenue) }}</span>
        </div>
        <div v-if="(summary.totalRounding ?? 0) !== 0" class="stat-desc" :class="summary.totalRounding > 0 ? 'text-success' : 'text-error'">
          Rounding {{ summary.totalRounding >= 0 ? '+' : '' }}{{ formatCurrency(summary.totalRounding) }}
        </div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-success"><IconTrendingUp class="w-8 h-8" /></div>
        <div class="stat-title">Net Revenue</div>
        <div class="stat-value text-success text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatCurrency(summary.netRevenue) }}</span>
        </div>
        <div class="stat-desc">After discounts</div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-warning"><IconTrendingDown class="w-8 h-8" /></div>
        <div class="stat-title">Total Discounts</div>
        <div class="stat-value text-warning text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatCurrency(summary.totalDiscounts) }}</span>
        </div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-info"><IconReceipt class="w-8 h-8" /></div>
        <div class="stat-title">Transactions</div>
        <div class="stat-value text-info text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ summary.totalTransactions || 0 }}</span>
        </div>
        <div class="stat-desc">Avg {{ formatCurrency(summary.avgTransaction) }}</div>
      </div>
    </div>

    <!-- Revenue by Module + Forecast -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">Revenue by Module</h3>
          <div v-if="loading" class="flex justify-center py-12">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="!revenueByModule.length" class="text-center py-12 text-base-content/60">
            No module data available
          </div>
          <div v-else class="space-y-4">
            <div v-for="item in revenueByModule" :key="item.transactionType" class="flex items-center gap-3">
              <div class="flex-1">
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium capitalize">{{ (item.transactionType || '').replace(/_/g, ' ') }}</span>
                  <span class="font-bold">{{ formatCurrency(parseFloat(item.revenue || 0)) }}</span>
                </div>
                <progress
                  class="progress progress-primary w-full"
                  :value="parseFloat(item.revenue || 0)"
                  :max="summary.totalRevenue || 1"
                ></progress>
                <div class="text-xs text-base-content/60 mt-1">
                  {{ parseInt(item.transactionCount || 0) }} transaksi · Avg {{ formatCurrency(parseFloat(item.avgTransaction || 0)) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h3 class="card-title">Forecast</h3>
            <div v-if="forecastMeta.trend" class="flex gap-2">
              <span class="badge" :class="forecastMeta.trend === 'declining' ? 'badge-error' : 'badge-success'">
                {{ forecastMeta.trend }}
              </span>
              <span class="badge badge-ghost">{{ forecastMeta.confidence }} confidence</span>
            </div>
          </div>
          <div v-if="loading" class="flex justify-center py-12">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="!forecastData.length" class="text-center py-12 text-base-content/60">
            No forecast data available
          </div>
          <div v-else class="space-y-3">
            <div v-for="(f, idx) in forecastData" :key="f.periodIndex" class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
              <div class="text-sm font-medium text-base-content/70">Prediksi {{ idx + 1 }}</div>
              <div class="font-bold">{{ formatCurrency(f.predictedValue) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Distribution -->
    <div class="card bg-base-100 shadow mb-6">
      <div class="card-body">
        <h3 class="card-title mb-4">
          <IconCreditCard class="w-5 h-5" />
          Payment Distribution
        </h3>
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        <div v-else-if="!paymentDistribution.length" class="text-center py-8 text-base-content/60">
          No payment data available
        </div>
        <div v-else class="space-y-3">
          <div v-for="pay in paymentDistribution" :key="pay.paymentMethod" class="flex items-center gap-3">
            <div class="flex-1">
              <div class="flex justify-between text-sm mb-1">
                <span class="font-medium capitalize">{{ formatPaymentLabel(pay.paymentMethod) }}</span>
                <span>
                  <span class="font-bold">{{ formatCurrency(pay.total) }}</span>
                  <span class="text-base-content/60 ml-2">({{ pay.percentage }}%)</span>
                </span>
              </div>
              <progress class="progress progress-secondary w-full" :value="pay.percentage" max="100"></progress>
              <div class="text-xs text-base-content/60 mt-1">{{ pay.transactionCount }} transaksi</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bank Details -->
    <div v-if="paymentMethodsWithBank.length" class="card bg-base-100 shadow mb-6">
      <div class="card-body">
        <h3 class="card-title mb-4">
          <IconBuildingBank class="w-5 h-5" />
          Bank Details
        </h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            v-for="pay in paymentMethodsWithBank"
            :key="pay.paymentMethod"
            class="border border-base-300 rounded-xl p-4"
          >
            <div class="flex items-center justify-between mb-3">
              <div>
                <span class="font-semibold capitalize text-base">
                  {{ formatPaymentLabel(pay.paymentMethod) }}
                </span>
                <span class="badge badge-outline badge-sm ml-2">{{ pay.transactionCount }} transaksi</span>
              </div>
              <span class="font-bold text-primary">{{ formatCurrency(pay.total) }}</span>
            </div>
            <div class="overflow-x-auto">
              <table class="table table-xs">
                <thead>
                  <tr>
                    <th>Bank</th>
                    <th class="text-right">Transaksi</th>
                    <th class="text-right">Total</th>
                    <th class="text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="bank in pay.bankDetails" :key="bank.bankName" class="hover">
                    <td class="font-medium uppercase">{{ bank.bankName }}</td>
                    <td class="text-right">{{ bank.transactionCount }}</td>
                    <td class="text-right font-semibold">{{ formatCurrency(bank.total) }}</td>
                    <td class="text-right text-base-content/60">
                      {{ pay.total ? ((bank.total / pay.total) * 100).toFixed(1) : 0 }}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Revenue by Period Table -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h3 class="card-title mb-4">Revenue Breakdown</h3>
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        <div v-else-if="!revenueByPeriod.length" class="text-center py-8 text-base-content/60">
          No revenue data available
        </div>
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Period</th>
                <th class="text-right">Transactions</th>
                <th class="text-right">Discounts</th>
                <th class="text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="period in revenueByPeriod" :key="period.period" class="hover">
                <td class="font-medium">{{ new Date(period.period).toLocaleDateString('id-ID') }}</td>
                <td class="text-right">{{ parseInt(period.transactionCount || 0) }}</td>
                <td class="text-right text-error">-{{ formatCurrency(parseFloat(period.discounts || 0)) }}</td>
                <td class="text-right font-semibold">{{ formatCurrency(parseFloat(period.revenue || 0)) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
