<route lang="yaml">
meta:
  title: Revenue Report
  layout: default
</route>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold">Revenue Report</h1>
      <p class="text-base-content/60 mt-1">Detailed revenue breakdown and analysis</p>
    </div>

    <!-- Report Filters -->
    <ReportFilters
      title="Revenue Report Filters"
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
      <!-- Summary Cards Row 1 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Total Revenue</div>
            <div class="stat-value text-success">{{ formatCurrency(reportData.summary.totalRevenue) }}</div>
            <div class="stat-desc">{{ reportData.summary.period?.startDate }} - {{ reportData.summary.period?.endDate }}</div>
          </div>
        </div>
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Net Revenue</div>
            <div class="stat-value text-primary">{{ formatCurrency(reportData.summary.netRevenue) }}</div>
            <div class="stat-desc">After discounts &amp; tax</div>
          </div>
        </div>
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Total Transactions</div>
            <div class="stat-value text-info">{{ reportData.summary.totalTransactions }}</div>
            <div class="stat-desc">Avg {{ formatCurrency(reportData.summary.avgTransaction) }} / trx</div>
          </div>
        </div>
      </div>

      <!-- Summary Cards Row 2 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Total Discounts</div>
            <div class="stat-value text-warning">{{ formatCurrency(reportData.summary.totalDiscounts) }}</div>
            <div class="stat-desc">Applied discounts</div>
          </div>
        </div>
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Total Tax</div>
            <div class="stat-value text-secondary">{{ formatCurrency(reportData.summary.totalTax) }}</div>
            <div class="stat-desc">Tax collected</div>
          </div>
        </div>
      </div>

      <!-- Revenue by Module -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">Revenue by Module</h2>
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Module</th>
                  <th class="text-right">Total Revenue</th>
                  <th class="text-center">Transactions</th>
                  <th class="text-right">Avg / Transaction</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="mod in reportData.revenueByModule" :key="mod.transactionType">
                  <td class="font-semibold capitalize">{{ mod.transactionType }}</td>
                  <td class="text-right font-semibold text-success">{{ formatCurrency(mod.revenue) }}</td>
                  <td class="text-center">{{ mod.transactionCount }}</td>
                  <td class="text-right">{{ formatCurrency(mod.avgTransaction) }}</td>
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
                <!-- Progress bar -->
                <div class="w-full bg-base-300 rounded-full h-2 mb-3">
                  <div class="bg-success h-2 rounded-full" :style="{ width: payment.percentage + '%' }"></div>
                </div>
                <!-- Bank details -->
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

      <!-- Revenue by Period -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">Revenue by Period</h2>
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Period</th>
                  <th class="text-right">Revenue</th>
                  <th class="text-right">Discounts</th>
                  <th class="text-right">Tax</th>
                  <th class="text-center">Transactions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(period, index) in reportData.revenueByPeriod" :key="index">
                  <td>{{ formatPeriod(period.period) }}</td>
                  <td class="text-right font-semibold text-success">{{ formatCurrency(period.revenue) }}</td>
                  <td class="text-right text-warning">{{ formatCurrency(period.discounts) }}</td>
                  <td class="text-right">{{ formatCurrency(period.tax) }}</td>
                  <td class="text-center">{{ period.transactionCount }}</td>
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
        <IconChartLine class="w-16 h-16 text-base-content/30 mb-4" />
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
import { IconChartLine } from '@tabler/icons-vue'

const { revenueReport, loading, fetchRevenue } = useFinancialReports()

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

const handleGenerate = async (filters) => {
  try {
    const data = await fetchRevenue(filters)
    reportData.value = data
  } catch (error) {
    console.error('Failed to generate revenue report:', error)
  }
}

onMounted(() => {
  // Load locations if needed
})
</script>
