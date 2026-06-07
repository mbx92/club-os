<route lang="yaml">
meta:
  title: Profit & Loss Report
  layout: default
</route>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold">Profit & Loss Report</h1>
      <p class="text-base-content/60 mt-1">View comprehensive profit and loss analysis</p>
    </div>

    <!-- Report Filters -->
    <ReportFilters
      title="P&L Report Filters"
      :show-location-filter="true"
      :locations="locations"
      :loading="loading"
      @generate="handleGenerate"
      class="mb-6"
    />

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Report Content -->
    <div v-else-if="reportData" class="space-y-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Total Revenue</div>
            <div class="stat-value text-success">{{ formatCurrency(reportData.summary.totalRevenue) }}</div>
            <div class="stat-desc">{{ reportFilters?.startDate }} - {{ reportFilters?.endDate }}</div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Total Expenses</div>
            <div class="stat-value text-error">{{ formatCurrency(reportData.summary.totalExpense) }}</div>
            <div class="stat-desc">Operating costs</div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Net Profit</div>
            <div class="stat-value" :class="reportData.summary.netProfit >= 0 ? 'text-success' : 'text-error'">
              {{ formatCurrency(reportData.summary.netProfit) }}
            </div>
            <div class="stat-desc">Revenue - Expenses</div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Profit Margin</div>
            <div class="stat-value" :class="reportData.summary.profitMargin >= 0 ? 'text-success' : 'text-error'">
              {{ reportData.summary.profitMargin?.toFixed(2) }}%
            </div>
            <div class="stat-desc">Net profit percentage</div>
          </div>
        </div>
      </div>

      <!-- Period Data Table -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">Period Analysis</h2>
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Period</th>
                  <th class="text-right">Revenue</th>
                  <th class="text-right">Expenses</th>
                  <th class="text-right">Net Profit</th>
                  <th class="text-right">Margin %</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(period, index) in reportData.timeline ?? []" :key="index">
                  <td>{{ formatPeriod(period.period) }}</td>
                  <td class="text-right text-success font-semibold">{{ formatCurrency(period.revenue) }}</td>
                  <td class="text-right text-error font-semibold">{{ formatCurrency(period.expense) }}</td>
                  <td class="text-right font-bold" :class="period.netProfit >= 0 ? 'text-success' : 'text-error'">
                    {{ formatCurrency(period.netProfit) }}
                  </td>
                  <td class="text-right" :class="period.profitMargin >= 0 ? 'text-success' : 'text-error'">
                    {{ period.profitMargin?.toFixed(2) }}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Revenue by Module -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">Revenue by Module</h2>
          <div v-if="reportData.revenueByModule?.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              v-for="item in reportData.revenueByModule"
              :key="item.transactionType"
              class="stats shadow"
            >
              <div class="stat">
                <div class="stat-title capitalize">{{ item.transactionType }}</div>
                <div class="stat-value text-lg">{{ formatCurrency(item.revenue) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Expenses by Category -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">Expenses by Category</h2>
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Type</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="category in reportData.expenseByCategory" :key="category.categoryId">
                  <td>{{ category.category?.name }}</td>
                  <td>
                    <div class="badge badge-sm capitalize">{{ category.category?.type }}</div>
                  </td>
                  <td class="text-right font-semibold">{{ formatCurrency(category.total) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body items-center text-center py-12">
        <IconChartBar class="w-16 h-16 text-base-content/30 mb-4" />
        <h3 class="text-xl font-semibold mb-2">No Report Generated</h3>
        <p class="text-base-content/60">Select a date range and click "Generate Report"</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useFinancialReports } from '@/composables/finances'
import ReportFilters from '@/components/finances/ReportFilters.vue'
import { IconChartBar } from '@tabler/icons-vue'

const { profitLossReport, loading, fetchProfitLoss } = useFinancialReports()

const reportData = ref(null)
const reportFilters = ref(null)
const locations = ref([]) // Should be fetched from API

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount || 0)
}

const formatPeriod = (date) => {
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long'
  })
}

const handleGenerate = async (filters) => {
  try {
    const data = await fetchProfitLoss(filters)
    reportData.value = data
    reportFilters.value = filters
  } catch (error) {
    console.error('Failed to generate P&L report:', error)
  }
}

onMounted(() => {
  // Load locations if needed
})
</script>
