<route lang="yaml">
meta:
  title: Expense Report
  layout: default
</route>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold">Expense Report</h1>
      <p class="text-base-content/60 mt-1">Detailed expense breakdown and analysis</p>
    </div>

    <!-- Report Filters -->
    <ReportFilters
      title="Expense Report Filters"
      :show-location-filter="true"
      :show-category-filter="true"
      :locations="locations"
      :categories="categories"
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
      <!-- Summary Cards Row 1 -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Total Inflow</div>
            <div class="stat-value text-success">{{ formatCurrency(reportData.summary.totalInflow) }}</div>
            <div class="stat-desc">{{ reportData.summary.period?.startDate }} - {{ reportData.summary.period?.endDate }}</div>
          </div>
        </div>
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Total Outflow</div>
            <div class="stat-value text-error">{{ formatCurrency(reportData.summary.totalOutflow) }}</div>
            <div class="stat-desc">Expenses &amp; costs</div>
          </div>
        </div>
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Net Cash Flow</div>
            <div class="stat-value" :class="reportData.summary.netCashFlow >= 0 ? 'text-success' : 'text-error'">
              {{ formatCurrency(reportData.summary.netCashFlow) }}
            </div>
            <div class="stat-desc">Inflow - Outflow</div>
          </div>
        </div>
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Ending Balance</div>
            <div class="stat-value text-primary">{{ formatCurrency(reportData.summary.endingBalance) }}</div>
            <div class="stat-desc">Closing balance</div>
          </div>
        </div>
      </div>

      <!-- Summary Cards Row 2 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Transaction Inflow</div>
            <div class="stat-value text-success text-2xl">{{ formatCurrency(reportData.summary.totalTransactionInflow) }}</div>
            <div class="stat-desc">From transactions</div>
          </div>
        </div>
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Manual Inflow</div>
            <div class="stat-value text-info text-2xl">{{ formatCurrency(reportData.summary.totalManualInflow) }}</div>
            <div class="stat-desc">Manual income entries</div>
          </div>
        </div>
      </div>

      <!-- Outflow by Category -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">Outflow by Category</h2>
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Type</th>
                  <th class="text-right">Total Amount</th>
                  <th class="text-center">Count</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="category in reportData.outflowByCategory" :key="category.categoryId">
                  <td>
                    <div class="flex items-center gap-2">
                      <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: category.color }"></div>
                      <span class="font-semibold">{{ category.categoryName }}</span>
                    </div>
                  </td>
                  <td>
                    <div :class="getTypeBadgeClass(category.categoryType)">
                      {{ formatType(category.categoryType) }}
                    </div>
                  </td>
                  <td class="text-right font-semibold text-error">{{ formatCurrency(category.total) }}</td>
                  <td class="text-center">{{ category.count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Inflow by Module -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">Inflow by Module</h2>
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Module</th>
                  <th class="text-right">Total</th>
                  <th class="text-center">Transactions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="mod in reportData.inflowByModule" :key="mod.module">
                  <td class="font-semibold capitalize">{{ mod.module }}</td>
                  <td class="text-right font-semibold text-success">{{ formatCurrency(mod.total) }}</td>
                  <td class="text-center">{{ mod.transactionCount }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Payment Distribution -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">Payment Distribution</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="payment in reportData.paymentDistribution"
              :key="payment.paymentMethod"
              class="card bg-base-200"
            >
              <div class="card-body p-4">
                <div class="flex justify-between items-start mb-2">
                  <span class="font-bold capitalize text-lg">{{ paymentLabel(payment.paymentMethod) }}</span>
                  <span class="badge badge-outline">{{ payment.percentage }}%</span>
                </div>
                <div class="text-2xl font-bold text-success mb-1">{{ formatCurrency(payment.total) }}</div>
                <div class="text-sm text-base-content/60 mb-3">{{ payment.transactionCount }} transactions</div>
                <div class="w-full bg-base-300 rounded-full h-2 mb-3">
                  <div class="bg-success h-2 rounded-full" :style="{ width: payment.percentage + '%' }"></div>
                </div>
                <div v-if="payment.bankDetails?.length > 0" class="mt-2">
                  <div class="text-xs font-semibold text-base-content/50 uppercase mb-1">Bank Details</div>
                  <div class="space-y-1">
                    <div
                      v-for="bank in payment.bankDetails"
                      :key="bank.bankName"
                      class="flex justify-between text-sm"
                    >
                      <span class="capitalize">{{ bank.bankName }}</span>
                      <span class="font-semibold">{{ formatCurrency(bank.total) }} <span class="text-base-content/50">({{ bank.transactionCount }})</span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Timeline -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">Cash Flow Timeline</h2>
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Period</th>
                  <th class="text-right">Inflow</th>
                  <th class="text-right">Outflow</th>
                  <th class="text-right">Net Flow</th>
                  <th class="text-right">Balance</th>
                  <th class="text-center">Trx</th>
                  <th class="text-center">Expenses</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in reportData.timeline ?? []" :key="index">
                  <td>{{ formatPeriod(row.period) }}</td>
                  <td class="text-right text-success font-semibold">{{ formatCurrency(row.inflow) }}</td>
                  <td class="text-right text-error font-semibold">{{ formatCurrency(row.outflow) }}</td>
                  <td class="text-right font-bold" :class="row.netFlow >= 0 ? 'text-success' : 'text-error'">
                    {{ formatCurrency(row.netFlow) }}
                  </td>
                  <td class="text-right">{{ formatCurrency(row.balance) }}</td>
                  <td class="text-center">{{ row.txCount }}</td>
                  <td class="text-center">{{ row.expCount }}</td>
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
        <IconReportMoney class="w-16 h-16 text-base-content/30 mb-4" />
        <h3 class="text-xl font-semibold mb-2">No Report Generated</h3>
        <p class="text-base-content/60">Select a date range and click "Generate Report"</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useFinancialReports, useExpenseCategories } from '@/composables/finances'
import ReportFilters from '@/components/finances/ReportFilters.vue'
import { IconReportMoney } from '@tabler/icons-vue'

const { expenseReport, loading, fetchExpenses } = useFinancialReports()
const { categories, fetchCategories } = useExpenseCategories()

const reportData = ref(null)
const locations = ref([])

const paymentLabel = (method) => {
  const map = {
    cash: 'Tunai',
    credit_card: 'Kartu',
    debit_card: 'Kartu Debit',
    bank_transfer: 'Transfer Bank',
    qris: 'QRIS',
    e_wallet: 'E-Wallet',
    compliment: 'Gratis/Komplemen'
  }
  return map[method] || (method || '').replace(/_/g, ' ')
}

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

const formatType = (type) => {
  const typeMap = {
    operational: 'Operational',
    fixed: 'Fixed',
    variable: 'Variable',
    one_time: 'One Time'
  }
  return typeMap[type] || type
}

const getTypeBadgeClass = (type) => {
  const classes = {
    operational: 'badge badge-primary badge-sm',
    fixed: 'badge badge-info badge-sm',
    variable: 'badge badge-warning badge-sm',
    one_time: 'badge badge-accent badge-sm'
  }
  return classes[type] || 'badge badge-sm'
}

const handleGenerate = async (filters) => {
  try {
    const data = await fetchExpenses(filters)
    reportData.value = data
  } catch (error) {
    console.error('Failed to generate expense report:', error)
  }
}

onMounted(async () => {
  await fetchCategories({ isActive: true })
})
</script>
