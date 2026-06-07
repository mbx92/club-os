<route lang="yaml">
meta:
  title: Finance Dashboard
  layout: default
</route>

<script setup>
import { ref, onMounted, computed, markRaw } from 'vue'
import { useFinanceDashboard } from '@/composables/finances/useFinanceDashboard'
import FinanceStatCard from '@/components/finances/FinanceStatCard.vue'
import {
  IconFileInvoice,
  IconTag,
  IconChartBar,
  IconCurrencyDollar,
  IconTrendingUp,
  IconTrendingDown,
  IconCash,
  IconReportMoney,
  IconRefresh,
  IconShoppingCart,
  IconReceipt,
  IconWallet,
  IconCreditCard,
  IconArrowUpRight,
  IconArrowDownRight,
  IconBuildingBank,
  IconPercentage,
} from '@tabler/icons-vue'

const { overview, summaryCards, loading, overviewLoading, summaryLoading, fetchOverview, fetchSummaryCards } = useFinanceDashboard()

// Period filter
const selectedPeriod = ref('month')
const filters = ref({
  startDate: getFirstDayOfMonth(),
  endDate: getLastDayOfMonth()
})

function formatLocalDate (date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getFirstDayOfMonth () {
  const d = new Date()
  return formatLocalDate(new Date(d.getFullYear(), d.getMonth(), 1))
}
function getLastDayOfMonth () {
  const d = new Date()
  return formatLocalDate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

const setPeriod = (period) => {
  selectedPeriod.value = period
  const today = new Date()
  if (period === 'today') {
    const t = formatLocalDate(today)
    filters.value = { startDate: t, endDate: t }
  } else if (period === 'week') {
    const start = new Date(today)
    const day = today.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    start.setDate(today.getDate() + diffToMonday)
    filters.value = { startDate: formatLocalDate(start), endDate: formatLocalDate(today) }
  } else if (period === 'month') {
    filters.value = { startDate: getFirstDayOfMonth(), endDate: getLastDayOfMonth() }
  } else if (period === 'year') {
    filters.value = { startDate: `${today.getFullYear()}-01-01`, endDate: `${today.getFullYear()}-12-31` }
  }
  loadOverview()
}

const loadOverview = async () => {
  await fetchOverview(filters.value)
}

// summary shorthand
const summary     = computed(() => overview.value?.summary     || {})
const comparison  = computed(() => overview.value?.comparison  || {})
const serviceCharge = computed(() => overview.value?.serviceCharge || {})
// pettyCash: { fundCount, totalBalance, totalInitialAmount, periodInflow, periodOutflow }
const pettyCash = computed(() => overview.value?.pettyCash || {})
// Tax — reads from summary.totalTax or top-level tax object (whichever backend returns)
// TODO: add v-if="taxEnabled" check once tax settings endpoint is ready
const tax = computed(() => overview.value?.tax || {})
const taxTotal = computed(() => overview.value?.summary?.totalTax ?? overview.value?.tax?.total ?? 0)

// Revenue trend — API returns revenueTrend[] with { date, total, count }
const dailyTrend = computed(() => overview.value?.revenueTrend || [])
const maxTrendValue = computed(() => {
  const vals = dailyTrend.value.map(d => d.total || 0)
  return Math.max(...vals, 1)
})

// Revenue by module
const revenueByModule = computed(() => {
  const arr = overview.value?.revenueByModule
  if (!Array.isArray(arr)) return []
  return arr.map(item => ({
    label: (item.module || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    amount: item.total || 0,
    count: item.count || 0,
    percentage: item.percentage || 0
  }))
})

// Payment methods from overview
const paymentMethods = computed(() => {
  const arr = overview.value?.paymentMethods
  if (!Array.isArray(arr)) return []
  return arr
})

const paymentMethodLabel = (method) => {
  const map = {
    cash: 'Tunai',
    credit_card: 'Kartu',
    debit_card: 'Kartu Debit',
    bank_transfer: 'Transfer Bank',
    qris: 'QRIS',
    e_wallet: 'E-Wallet',
    compliment: 'Gratis (Compliment)',
    card: 'Kartu',
    ewallet: 'E-Wallet',
    transfer: 'Transfer Bank',
    bni: 'BNI',
    bca: 'BCA',
    mandiri: 'Mandiri',
    gojek: 'Gojek',
  }
  return map[method] || method.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const paymentMethodColor = (method) => {
  const map = {
    cash: 'bg-success',
    credit_card: 'bg-primary',
    debit_card: 'bg-info',
    bank_transfer: 'bg-warning',
    qris: 'bg-secondary',
    e_wallet: 'bg-accent',
    compliment: 'bg-base-content/30',
    gojek: 'bg-success',
    bni: 'bg-warning',
    bca: 'bg-info',
    mandiri: 'bg-primary',
  }
  return map[method] || 'bg-base-content/30'
}

// Unified payment method rows across today / thisWeek / thisMonth so all cards show identical rows
const unifiedPaymentMethods = computed(() => {
  if (!summaryCards.value) return []
  const all = ['today', 'thisWeek', 'thisMonth']
    .flatMap(k => (summaryCards.value[k]?.paymentMethods || []).map(p => p.method))
  return [...new Set(all)]
})

// For a given period's paymentMethods array, build a full row list using unifiedPaymentMethods
const normalizedPayments = (methods) => {
  const map = Object.fromEntries((methods || []).map(p => [p.method, p]))
  return unifiedPaymentMethods.value.map(m => map[m] || { method: m, total: 0, transactionCount: 0, percentage: 0 })
}

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatNumber = (n) => {
  if (!n && n !== 0) return '0'
  return new Intl.NumberFormat('id-ID').format(n)
}

const growthClass = (val) => {
  const n = parseFloat(val) || 0
  if (n > 0) return 'text-success'
  if (n < 0) return 'text-error'
  return 'text-base-content/50'
}

const getStatusClass = (status) => {
  const classes = {
    draft: 'badge-ghost',
    pending: 'badge-warning',
    approved: 'badge-info',
    paid: 'badge-success',
    received: 'badge-success',
    completed: 'badge-success',
    cancelled: 'badge-error',
    refunded: 'badge-secondary',
    partially_refunded: 'badge-info'
  }
  return classes[status] || 'badge-ghost'
}

const formatDate = (iso) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(async () => {
  await Promise.all([
    loadOverview(),
    fetchSummaryCards()
  ])
})
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Finance Dashboard</h1>
        <p class="text-base-content/60 mt-1">Ringkasan keuangan bisnis Anda</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button class="btn btn-ghost btn-sm" :disabled="overviewLoading || summaryLoading" @click="loadOverview(); fetchSummaryCards()">
          <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': overviewLoading || summaryLoading }" />
        </button>
        <router-link to="/finances/expenses" class="btn btn-primary btn-sm">
          <IconFileInvoice class="w-4 h-4 mr-1" />
          Add Expense
        </router-link>
        <router-link to="/finances/reports" class="btn btn-secondary btn-sm">
          <IconChartBar class="w-4 h-4 mr-1" />
          Reports
        </router-link>
      </div>
    </div>

    <!-- ── Summary Cards: Today / This Week / This Month ── -->
    <div v-if="summaryLoading" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div v-for="i in 3" :key="i" class="card bg-base-100 shadow-sm border border-base-200">
        <div class="card-body gap-2">
          <div class="skeleton h-4 w-24"></div>
          <div class="skeleton h-8 w-36"></div>
          <div class="skeleton h-3 w-28"></div>
        </div>
      </div>
    </div>
    <div v-else-if="summaryCards" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <!-- Today -->
      <div class="card bg-base-100 shadow-sm border border-base-200">
        <div class="card-body py-4 px-5">
          <p class="text-xs font-semibold uppercase text-base-content/50 tracking-widest mb-2">Today</p>
          <div class="flex items-end justify-between">
            <div>
              <p class="text-2xl font-bold text-success">{{ formatCurrency(summaryCards.today?.revenueExcludingServiceCharge) }}</p>
              <p class="text-xs text-base-content/50 mt-0.5">excl. SC · {{ summaryCards.today?.transactions ?? 0 }} trx</p>
              <p v-if="summaryCards.today?.serviceCharge?.total > 0" class="text-xs text-base-content/40">
                incl. SC: {{ formatCurrency(summaryCards.today?.revenue) }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-base font-semibold" :class="(summaryCards.today?.netProfit ?? 0) >= 0 ? 'text-success' : 'text-error'">
                {{ formatCurrency(summaryCards.today?.netProfit) }}
              </p>
              <p class="text-xs text-base-content/50">Net Profit</p>
            </div>
          </div>
          <div class="divider my-1.5"></div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-error font-medium">{{ formatCurrency(summaryCards.today?.expenses) }}</span>
            <span class="text-base-content/50 text-xs">Expenses</span>
          </div>
          <div v-if="summaryCards.today?.serviceCharge?.total > 0" class="flex items-center justify-between text-xs text-base-content/50 mt-1">
            <span>Service charge {{ summaryCards.today?.serviceCharge?.transactionCount }}x</span>
            <span>{{ formatCurrency(summaryCards.today?.serviceCharge?.total) }}</span>
          </div>
          <div v-if="summaryCards.today?.pettyCash?.totalBalance > 0" class="flex items-center justify-between text-xs text-base-content/50 mt-1">
            <span>Petty cash · {{ summaryCards.today?.pettyCash?.fundCount }} dana</span>
            <span>{{ formatCurrency(summaryCards.today?.pettyCash?.totalBalance) }}</span>
          </div>
          <!-- Payment breakdown mini bars (unified rows) -->
          <div v-if="unifiedPaymentMethods.length" class="mt-2 space-y-1">
            <template v-for="pm in normalizedPayments(summaryCards.today?.paymentMethods)" :key="pm.method">
              <div class="flex items-center gap-2" :class="pm.percentage === 0 ? 'opacity-30' : ''">
                <span class="text-xs text-base-content/50 w-20 truncate">{{ paymentMethodLabel(pm.method) }}</span>
                <div class="flex-1 h-1.5 bg-base-200 rounded-full overflow-hidden">
                  <div :class="paymentMethodColor(pm.method)" class="h-full rounded-full" :style="{ width: `${pm.percentage}%` }"></div>
                </div>
                <span class="text-xs text-base-content/60 w-8 text-right">{{ pm.percentage }}%</span>
              </div>
              <!-- card detail: bank breakdown -->
              <div v-for="d in (pm.detail || [])" :key="d.bankName" class="flex items-center gap-2 pl-2 opacity-60">
                <span class="text-xs text-base-content/40 w-20 truncate">&rsaquo; {{ d.bankName }}</span>
                <span class="flex-1 text-xs text-base-content/50 text-right">{{ d.transactionCount }}x &nbsp; {{ formatCurrency(d.total) }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- This Week -->
      <div class="card bg-base-100 shadow-sm border border-base-200">
        <div class="card-body py-4 px-5">
          <p class="text-xs font-semibold uppercase text-base-content/50 tracking-widest mb-2">This Week</p>
          <div class="flex items-end justify-between">
            <div>
              <p class="text-2xl font-bold text-success">{{ formatCurrency(summaryCards.thisWeek?.revenueExcludingServiceCharge) }}</p>
              <p class="text-xs text-base-content/50 mt-0.5">excl. SC · {{ summaryCards.thisWeek?.transactions ?? 0 }} trx</p>
              <p v-if="summaryCards.thisWeek?.serviceCharge?.total > 0" class="text-xs text-base-content/40">
                incl. SC: {{ formatCurrency(summaryCards.thisWeek?.revenue) }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-base font-semibold" :class="(summaryCards.thisWeek?.netProfit ?? 0) >= 0 ? 'text-success' : 'text-error'">
                {{ formatCurrency(summaryCards.thisWeek?.netProfit) }}
              </p>
              <p class="text-xs text-base-content/50">Net Profit</p>
            </div>
          </div>
          <div class="divider my-1.5"></div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-error font-medium">{{ formatCurrency(summaryCards.thisWeek?.expenses) }}</span>
            <span class="text-base-content/50 text-xs">Expenses</span>
          </div>
          <div v-if="summaryCards.thisWeek?.serviceCharge?.total > 0" class="flex items-center justify-between text-xs text-base-content/50 mt-1">
            <span>Service charge {{ summaryCards.thisWeek?.serviceCharge?.transactionCount }}x</span>
            <span>{{ formatCurrency(summaryCards.thisWeek?.serviceCharge?.total) }}</span>
          </div>
          <div v-if="summaryCards.thisWeek?.pettyCash?.totalBalance > 0" class="flex items-center justify-between text-xs text-base-content/50 mt-1">
            <span>Petty cash · {{ summaryCards.thisWeek?.pettyCash?.fundCount }} dana</span>
            <span>{{ formatCurrency(summaryCards.thisWeek?.pettyCash?.totalBalance) }}</span>
          </div>
          <!-- Payment breakdown mini bars (unified rows) -->
          <div v-if="unifiedPaymentMethods.length" class="mt-2 space-y-1">
            <template v-for="pm in normalizedPayments(summaryCards.thisWeek?.paymentMethods)" :key="pm.method">
              <div class="flex items-center gap-2" :class="pm.percentage === 0 ? 'opacity-30' : ''">
                <span class="text-xs text-base-content/50 w-20 truncate">{{ paymentMethodLabel(pm.method) }}</span>
                <div class="flex-1 h-1.5 bg-base-200 rounded-full overflow-hidden">
                  <div :class="paymentMethodColor(pm.method)" class="h-full rounded-full" :style="{ width: `${pm.percentage}%` }"></div>
                </div>
                <span class="text-xs text-base-content/60 w-8 text-right">{{ pm.percentage }}%</span>
              </div>
              <div v-for="d in (pm.detail || [])" :key="d.bankName" class="flex items-center gap-2 pl-2 opacity-60">
                <span class="text-xs text-base-content/40 w-20 truncate">&rsaquo; {{ d.bankName }}</span>
                <span class="flex-1 text-xs text-base-content/50 text-right">{{ d.transactionCount }}x &nbsp; {{ formatCurrency(d.total) }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- This Month -->
      <div class="card bg-primary/5 shadow-sm border border-primary/20">
        <div class="card-body py-4 px-5">
          <p class="text-xs font-semibold uppercase text-primary/70 tracking-widest mb-2">This Month</p>
          <div class="flex items-end justify-between">
            <div>
              <p class="text-2xl font-bold text-success">{{ formatCurrency(summaryCards.thisMonth?.revenueExcludingServiceCharge) }}</p>
              <p class="text-xs text-base-content/50 mt-0.5">excl. SC · {{ summaryCards.thisMonth?.transactions ?? 0 }} trx</p>
              <p v-if="summaryCards.thisMonth?.serviceCharge?.total > 0" class="text-xs text-base-content/40">
                incl. SC: {{ formatCurrency(summaryCards.thisMonth?.revenue) }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-base font-semibold" :class="(summaryCards.thisMonth?.netProfit ?? 0) >= 0 ? 'text-success' : 'text-error'">
                {{ formatCurrency(summaryCards.thisMonth?.netProfit) }}
              </p>
              <p class="text-xs text-base-content/50">Net Profit</p>
            </div>
          </div>
          <div class="divider my-1.5"></div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-error font-medium">{{ formatCurrency(summaryCards.thisMonth?.expenses) }}</span>
            <span class="text-base-content/50 text-xs">Expenses</span>
          </div>
          <div v-if="summaryCards.thisMonth?.serviceCharge?.total > 0" class="flex items-center justify-between text-xs text-base-content/50 mt-1">
            <span>Service charge {{ summaryCards.thisMonth?.serviceCharge?.transactionCount }}x</span>
            <span>{{ formatCurrency(summaryCards.thisMonth?.serviceCharge?.total) }}</span>
          </div>
          <div v-if="summaryCards.thisMonth?.pettyCash?.totalBalance > 0" class="flex items-center justify-between text-xs text-base-content/50 mt-1">
            <span>Petty cash · {{ summaryCards.thisMonth?.pettyCash?.fundCount }} dana</span>
            <span>{{ formatCurrency(summaryCards.thisMonth?.pettyCash?.totalBalance) }}</span>
          </div>
          <!-- Payment breakdown mini bars (unified rows) -->
          <div v-if="unifiedPaymentMethods.length" class="mt-2 space-y-1">
            <template v-for="pm in normalizedPayments(summaryCards.thisMonth?.paymentMethods)" :key="pm.method">
              <div class="flex items-center gap-2" :class="pm.percentage === 0 ? 'opacity-30' : ''">
                <span class="text-xs text-base-content/50 w-20 truncate">{{ paymentMethodLabel(pm.method) }}</span>
                <div class="flex-1 h-1.5 bg-primary/20 rounded-full overflow-hidden">
                  <div :class="paymentMethodColor(pm.method)" class="h-full rounded-full" :style="{ width: `${pm.percentage}%` }"></div>
                </div>
                <span class="text-xs text-base-content/60 w-8 text-right">{{ pm.percentage }}%</span>
              </div>
              <div v-for="d in (pm.detail || [])" :key="d.bankName" class="flex items-center gap-2 pl-2 opacity-60">
                <span class="text-xs text-base-content/40 w-20 truncate">&rsaquo; {{ d.bankName }}</span>
                <span class="flex-1 text-xs text-base-content/50 text-right">{{ d.transactionCount }}x &nbsp; {{ formatCurrency(d.total) }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Period Filter ── -->
    <div class="flex items-center gap-2 mb-4 flex-wrap">
      <span class="text-sm font-medium text-base-content/60">Period:</span>
      <div class="join">
        <button v-for="p in ['today','week','month','year']" :key="p"
          class="join-item btn btn-sm capitalize"
          :class="selectedPeriod === p ? 'btn-primary' : 'btn-ghost'"
          @click="setPeriod(p)">{{ p }}</button>
      </div>
    </div>

    <!-- ── Overview KPI Cards ── -->
    <div v-if="overviewLoading" class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      <div v-for="i in 5" :key="i" class="card bg-base-100 shadow-sm border border-base-200">
        <div class="card-body gap-2 p-4">
          <div class="skeleton h-3 w-20"></div>
          <div class="skeleton h-7 w-28"></div>
          <div class="skeleton h-3 w-24"></div>
        </div>
      </div>
    </div>
    <div v-else-if="overview" class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      <!-- Total Revenue -->
      <div class="card bg-base-100 border border-base-200 shadow-sm">
        <div class="card-body p-4">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-base-content/50 font-medium uppercase tracking-wide">Revenue</span>
            <span class="flex items-center gap-0.5 text-xs font-semibold" :class="growthClass(comparison.revenueGrowth)">
              <IconArrowUpRight v-if="(comparison.revenueGrowth || 0) >= 0" class="w-3.5 h-3.5" />
              <IconArrowDownRight v-else class="w-3.5 h-3.5" />
              {{ (comparison.revenueGrowth || 0) >= 0 ? '+' : '' }}{{ (comparison.revenueGrowth || 0).toFixed(1) }}%
            </span>
          </div>
          <p class="text-xl font-bold text-success">{{ formatCurrency(summary.revenueExcludingServiceCharge ?? summary.totalRevenue) }}</p>
          <p class="text-xs text-base-content/50 mt-0.5">{{ formatNumber(summary.totalTransactions || 0) }} transaksi</p>
          <p v-if="summary.revenueExcludingServiceCharge && summary.revenueExcludingServiceCharge !== summary.totalRevenue" class="text-xs text-base-content/40 mt-0.5">
            incl. SC: {{ formatCurrency(summary.totalRevenue) }}
          </p>
        </div>
      </div>
      <!-- Total Expenses -->
      <div class="card bg-base-100 border border-base-200 shadow-sm">
        <div class="card-body p-4">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-base-content/50 font-medium uppercase tracking-wide">Expenses</span>
            <span class="flex items-center gap-0.5 text-xs font-semibold" :class="growthClass(comparison.expenseGrowth)">
              <IconArrowUpRight v-if="(comparison.expenseGrowth || 0) >= 0" class="w-3.5 h-3.5" />
              <IconArrowDownRight v-else class="w-3.5 h-3.5" />
              {{ (comparison.expenseGrowth || 0) >= 0 ? '+' : '' }}{{ (comparison.expenseGrowth || 0).toFixed(1) }}%
            </span>
          </div>
          <p class="text-xl font-bold text-error">{{ formatCurrency(summary.totalExpenses) }}</p>
          <p class="text-xs text-base-content/50 mt-0.5">Margin {{ (summary.profitMargin || 0).toFixed(1) }}%</p>
        </div>
      </div>
      <!-- Net Profit -->
      <div class="card bg-base-100 border border-base-200 shadow-sm">
        <div class="card-body p-4">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-base-content/50 font-medium uppercase tracking-wide">Net Profit</span>
            <span class="flex items-center gap-0.5 text-xs font-semibold" :class="growthClass(comparison.profitGrowth)">
              <IconArrowUpRight v-if="(comparison.profitGrowth || 0) >= 0" class="w-3.5 h-3.5" />
              <IconArrowDownRight v-else class="w-3.5 h-3.5" />
              {{ (comparison.profitGrowth || 0) >= 0 ? '+' : '' }}{{ (comparison.profitGrowth || 0).toFixed(1) }}%
            </span>
          </div>
          <p class="text-xl font-bold" :class="(summary.netProfit || 0) >= 0 ? 'text-success' : 'text-error'">
            {{ formatCurrency(summary.netProfit) }}
          </p>
          <p class="text-xs mt-0.5" :class="(summary.netProfit || 0) >= 0 ? 'text-success/60' : 'text-error/60'">
            {{ (summary.netProfit || 0) >= 0 ? 'Surplus' : 'Deficit' }}
          </p>
        </div>
      </div>
      <!-- Service Charge + Petty Cash -->
      <div class="card bg-base-100 border border-base-200 shadow-sm">
        <div class="card-body p-4">
          <span class="text-xs text-base-content/50 font-medium uppercase tracking-wide mb-1 block">Service Charge</span>
          <p class="text-xl font-bold text-info">{{ formatCurrency(serviceCharge.total) }}</p>
          <p class="text-xs text-base-content/50 mt-0.5">
            {{ serviceCharge.transactionCount ?? 0 }} trx
            <template v-if="serviceCharge.percentageOfRevenue != null">
              · {{ (serviceCharge.percentageOfRevenue || 0).toFixed(2) }}% dari revenue
            </template>
          </p>
          <div v-if="pettyCash.totalBalance > 0 || pettyCash.fundCount > 0" class="mt-2 pt-2 border-t border-base-200 space-y-0.5">
            <div class="flex items-center justify-between text-xs text-base-content/50">
              <span>Petty Cash · {{ pettyCash.fundCount ?? 0 }} dana</span>
              <span class="font-medium text-base-content/70">{{ formatCurrency(pettyCash.totalBalance) }}</span>
            </div>
            <div v-if="pettyCash.periodInflow > 0 || pettyCash.periodOutflow > 0" class="flex items-center justify-between text-xs text-base-content/40">
              <span>In {{ formatCurrency(pettyCash.periodInflow) }} / Out {{ formatCurrency(pettyCash.periodOutflow) }}</span>
            </div>
          </div>
        </div>
      </div>
      <!-- TODO: Tax card — always shown in dev; add v-if="taxEnabled" once tax settings endpoint is ready -->
      <div class="card bg-base-100 border border-base-200 shadow-sm opacity-70">
        <div class="card-body p-4">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-base-content/50 font-medium uppercase tracking-wide">Tax</span>
            <span class="badge badge-xs badge-ghost">dev</span>
          </div>
          <p class="text-xl font-bold text-warning">{{ formatCurrency(taxTotal) }}</p>
          <p class="text-xs text-base-content/50 mt-0.5">
            {{ tax.transactionCount != null ? `${tax.transactionCount} trx` : '—' }}
            <template v-if="tax.percentageOfRevenue != null">
              · {{ (tax.percentageOfRevenue || 0).toFixed(2) }}% dari revenue
            </template>
          </p>
          <p v-if="tax.taxPercentage != null" class="text-xs text-base-content/40 mt-0.5">Rate {{ tax.taxPercentage }}%</p>
        </div>
      </div>
    </div>

    <!-- ── Main Content Grid ── -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

      <!-- Revenue Trend -->
      <div class="card bg-base-100 shadow-sm border border-base-200 lg:col-span-2">
        <div class="card-body p-5">
          <h3 class="font-bold text-base mb-3 flex items-center gap-2">
            <IconTrendingUp class="w-4 h-4 text-success" />
            Revenue Trend
          </h3>
          <div v-if="overviewLoading" class="space-y-2">
            <div v-for="i in 7" :key="i" class="skeleton h-6 w-full"></div>
          </div>
          <div v-else-if="dailyTrend.length > 0" class="space-y-1.5">
            <div v-for="(day, i) in dailyTrend" :key="i">
              <div class="flex justify-between text-xs text-base-content/60 mb-0.5">
                <span>{{ formatDate(day.date) }}</span>
                <span class="font-medium text-success">{{ formatCurrency(day.total || 0) }}
                  <span class="text-base-content/40 font-normal">&nbsp;·&nbsp;{{ day.count || 0 }}x</span>
                </span>
              </div>
              <div class="w-full bg-base-200 rounded-full h-2.5 overflow-hidden">
                <div class="bg-success h-full rounded-full transition-all"
                  :style="{ width: `${Math.max(2, ((day.total || 0) / maxTrendValue) * 100)}%` }"></div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-base-content/40 text-sm">No trend data available</div>
        </div>
      </div>

      <!-- Payment Methods -->
      <div class="card bg-base-100 shadow-sm border border-base-200">
        <div class="card-body p-5">
          <h3 class="font-bold text-base mb-3 flex items-center gap-2">
            <IconCreditCard class="w-4 h-4 text-primary" />
            Payment Methods
          </h3>
          <div v-if="overviewLoading" class="space-y-2">
            <div v-for="i in 4" :key="i" class="skeleton h-8 w-full"></div>
          </div>
          <div v-else-if="paymentMethods.length > 0" class="space-y-3">
            <template v-for="pm in paymentMethods" :key="pm.method">
              <div>
                <div class="flex items-center justify-between text-sm mb-1">
                  <span class="font-medium">{{ paymentMethodLabel(pm.method) }}</span>
                  <span class="text-base-content/50 text-xs">{{ pm.transactionCount }}x</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-2 bg-base-200 rounded-full overflow-hidden">
                    <div :class="paymentMethodColor(pm.method)" class="h-full rounded-full transition-all" :style="{ width: `${pm.percentage}%` }"></div>
                  </div>
                  <span class="text-xs font-semibold w-10 text-right">{{ pm.percentage }}%</span>
                </div>
                <p class="text-xs text-success font-medium mt-0.5 text-right">{{ formatCurrency(pm.total) }}</p>
                <!-- bank detail sub-rows -->
                <div v-for="d in (pm.detail || [])" :key="d.bankName" class="flex items-center justify-between text-xs text-base-content/40 mt-0.5 pl-2">
                  <span>&rsaquo; {{ d.bankName }}</span>
                  <span>{{ d.transactionCount }}x &nbsp; {{ formatCurrency(d.total) }}</span>
                </div>
              </div>
            </template>
          </div>
          <div v-else class="text-center py-8 text-base-content/40 text-sm">No payment data</div>
        </div>
      </div>
    </div>

    <!-- ── Revenue by Module + Recent Transactions ── -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

      <!-- Revenue by Module -->
      <div class="card bg-base-100 shadow-sm border border-base-200">
        <div class="card-body p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold text-base flex items-center gap-2">
              <IconBuildingBank class="w-4 h-4 text-secondary" />
              Revenue by Module
            </h3>
            <router-link to="/finances/analytics" class="btn btn-ghost btn-xs">Top Selling →</router-link>
          </div>
          <div v-if="overviewLoading" class="space-y-3">
            <div v-for="i in 5" :key="i" class="skeleton h-8 w-full"></div>
          </div>
          <div v-else-if="revenueByModule.length > 0" class="space-y-3">
            <div v-for="item in revenueByModule" :key="item.label">
              <div class="flex items-center justify-between text-sm mb-1">
                <span class="font-medium capitalize">{{ item.label }}</span>
                <span class="text-xs text-base-content/50">{{ item.count }}x</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex-1 h-2 bg-base-200 rounded-full overflow-hidden">
                  <div class="bg-secondary h-full rounded-full transition-all" :style="{ width: `${item.percentage}%` }"></div>
                </div>
                <span class="text-xs font-semibold w-10 text-right">{{ item.percentage.toFixed(0) }}%</span>
              </div>
              <p class="text-xs text-success font-medium mt-0.5 text-right">{{ formatCurrency(item.amount) }}</p>
            </div>
            <div class="pt-2 border-t border-base-200 flex items-center justify-between text-sm">
              <span class="font-bold">Total</span>
              <span class="font-bold text-success">{{ formatCurrency(summary.totalRevenue) }}</span>
            </div>
          </div>
          <div v-else class="text-center py-8 text-base-content/40 text-sm">No module revenue data</div>
        </div>
      </div>

      <!-- Recent Transactions -->
      <div class="card bg-base-100 shadow-sm border border-base-200 lg:col-span-2">
        <div class="card-body p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold text-base flex items-center gap-2">
              <IconReceipt class="w-4 h-4 text-primary" />
              Recent Transactions
            </h3>
            <router-link to="/finances/transactions" class="btn btn-ghost btn-xs">View All →</router-link>
          </div>
          <div v-if="overviewLoading" class="space-y-3">
            <div v-for="i in 5" :key="i" class="skeleton h-10 w-full"></div>
          </div>
          <div v-else-if="overview?.recentTransactions?.length" class="overflow-x-auto">
            <table class="table table-sm text-sm">
              <thead>
                <tr class="text-xs text-base-content/50">
                  <th>Transaksi</th>
                  <th>Tipe</th>
                  <th class="text-right">Jumlah</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="tx in overview.recentTransactions" :key="tx.id" class="hover">
                  <td>
                    <div class="font-semibold font-mono text-xs">{{ tx.transactionNumber || tx.id?.slice(0, 8) }}</div>
                    <div class="text-xs text-base-content/50">{{ tx.title || tx.description || '' }}</div>
                  </td>
                  <td><span class="badge badge-xs badge-ghost capitalize">{{ tx.type || '-' }}</span></td>
                  <td class="text-right font-semibold text-xs" :class="tx.type === 'expense' ? 'text-error' : 'text-success'">
                    {{ formatCurrency(tx.totalAmount ?? tx.amount) }}
                  </td>
                  <td>
                    <span class="badge badge-xs" :class="getStatusClass(tx.status)">{{ tx.status || '-' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="text-center py-8 text-base-content/40 text-sm">No recent transactions</div>
        </div>
      </div>
    </div>

    <!-- ── Quick Actions ── -->
    <div class="card bg-base-100 shadow-sm border border-base-200">
      <div class="card-body p-5">
        <h3 class="font-bold text-base mb-3">Quick Actions</h3>
        <div class="flex flex-wrap gap-2">
          <router-link to="/finances/expenses" class="btn btn-outline btn-sm">
            <IconFileInvoice class="w-4 h-4" />Expenses
          </router-link>
          <router-link to="/finances/incomes" class="btn btn-outline btn-sm">
            <IconTrendingUp class="w-4 h-4" />Income
          </router-link>
          <router-link to="/finances/cash-flow" class="btn btn-outline btn-sm">
            <IconCash class="w-4 h-4" />Cash Flow
          </router-link>
          <router-link to="/finances/analytics" class="btn btn-outline btn-sm">
            <IconShoppingCart class="w-4 h-4" />Analytics
          </router-link>
          <router-link to="/finances/categories" class="btn btn-outline btn-sm">
            <IconTag class="w-4 h-4" />Categories
          </router-link>
          <div class="divider divider-horizontal mx-0"></div>
          <router-link to="/finances/reports/profit-loss" class="btn btn-outline btn-sm">
            <IconChartBar class="w-4 h-4" />P&L
          </router-link>
          <router-link to="/finances/reports/revenue" class="btn btn-outline btn-sm">
            <IconReportMoney class="w-4 h-4" />Revenue
          </router-link>
          <router-link to="/finances/reports/expenses" class="btn btn-outline btn-sm">
            <IconCurrencyDollar class="w-4 h-4" />Expense Report
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>
