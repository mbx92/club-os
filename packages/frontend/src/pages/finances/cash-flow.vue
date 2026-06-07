<route lang="yaml">
meta:
  title: Arus Kas
  layout: default
</route>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCashFlow } from '@/composables/finances/useCashFlow'
import { useExpenseCategories } from '@/composables/finances/useExpenseCategories'
import {
  IconTrendingUp,
  IconTrendingDown,
  IconCash,
  IconWallet,
  IconRefresh,
  IconCalendar,
  IconChartBar,
} from '@tabler/icons-vue'

const {
  summaryData, categoryData, projectionData,
  summaryLoading, categoryLoading, projectionLoading,
  fetchSummary, fetchCategoryBreakdown, fetchProjection,
} = useCashFlow()

const { categories: expCats, loading: expCatsLoading, fetchCategories } = useExpenseCategories()

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatLocalDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
function firstOfMonth() {
  const d = new Date(); return formatLocalDate(new Date(d.getFullYear(), d.getMonth(), 1))
}
function lastOfMonth() {
  const d = new Date(); return formatLocalDate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}
const formatCurrency = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0)
const formatNumber  = (v) => new Intl.NumberFormat('id-ID').format(v || 0)
const formatPeriod  = (iso) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
const formatMonth = (str) => {
  if (!str) return '-'
  const [y, m] = str.split('-')
  return new Date(+y, +m - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

// ── Filter state ─────────────────────────────────────────────────────────────
const selectedPeriod = ref('month')
const filters = ref({
  startDate: firstOfMonth(),
  endDate: lastOfMonth(),
  groupBy: 'day',
})
const projectionMonths = ref(3)

const setPeriod = (p) => {
  selectedPeriod.value = p
  const now = new Date()
  if (p === 'today') {
    const t = formatLocalDate(now)
    filters.value.startDate = t; filters.value.endDate = t; filters.value.groupBy = 'day'
  } else if (p === 'week') {
    const s = new Date(now)
    const day = now.getDay()
    s.setDate(now.getDate() + (day === 0 ? -6 : 1 - day))
    filters.value.startDate = formatLocalDate(s); filters.value.endDate = formatLocalDate(now); filters.value.groupBy = 'day'
  } else if (p === 'month') {
    filters.value.startDate = firstOfMonth(); filters.value.endDate = lastOfMonth(); filters.value.groupBy = 'day'
  } else if (p === 'quarter') {
    const qs = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    filters.value.startDate = formatLocalDate(qs); filters.value.endDate = formatLocalDate(now); filters.value.groupBy = 'week'
  } else if (p === 'year') {
    filters.value.startDate = `${now.getFullYear()}-01-01`; filters.value.endDate = `${now.getFullYear()}-12-31`; filters.value.groupBy = 'month'
  }
  loadSummaryAndCategory()
}

// ── Loads ────────────────────────────────────────────────────────────────────
const loadSummaryAndCategory = () => {
  fetchSummary({ startDate: filters.value.startDate, endDate: filters.value.endDate, groupBy: filters.value.groupBy })
  fetchCategoryBreakdown({ startDate: filters.value.startDate, endDate: filters.value.endDate })
}

onMounted(() => {
  loadSummaryAndCategory()
  fetchProjection({ months: projectionMonths.value })
  fetchCategories({ includeStats: true })
})

// ── Computed from API data ────────────────────────────────────────────────────
const summaryStats = computed(() => summaryData.value?.summary || {})
const cashFlowRows  = computed(() => summaryData.value?.cashFlow || [])
const inflows       = computed(() => categoryData.value?.inflows || [])
// Outflows: dari expense-categories dengan stats
const outflows      = computed(() => expCats.value.filter(c => c.isActive !== false))
const totalOutflowCat = computed(() => outflows.value.reduce((s, c) => s + (c.stats?.totalAmount || 0), 0))
const historical    = computed(() => projectionData.value?.historical || {})
const projections   = computed(() => projectionData.value?.projections || [])

const totalInflow  = computed(() => summaryStats.value.totalInflow  || 0)
const totalOutflow = computed(() => summaryStats.value.totalOutflow || 0)
const netCashFlow  = computed(() => summaryStats.value.netCashFlow  || 0)
const endingBalance= computed(() => summaryStats.value.endingBalance|| 0)

// Max value in cashFlow rows for bar scaling
const maxFlowValue = computed(() =>
  Math.max(...cashFlowRows.value.flatMap(r => [r.inflow || 0, r.outflow || 0]), 1)
)

// Category percentage helpers
const totalInflowCat  = computed(() => inflows.value.reduce((s, r) => s + (r.total || 0), 0))

const groupByLabels = { day: 'Harian', week: 'Mingguan', month: 'Bulanan', year: 'Tahunan' }
</script>

<template>
  <div class="container mx-auto px-4 py-8">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Arus Kas</h1>
        <p class="text-base-content/60 mt-1">Pantau pemasukan dan pengeluaran kas secara real-time</p>
      </div>
      <button class="btn btn-ghost btn-sm" :disabled="summaryLoading" @click="loadSummaryAndCategory(); fetchCategories({ includeStats: true })">
        <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': summaryLoading || categoryLoading || expCatsLoading }" />
        Perbarui
      </button>
    </div>

    <!-- Period Filter -->
    <div class="card bg-base-100 shadow mb-6">
      <div class="card-body py-3 px-4 space-y-2">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm font-medium text-base-content/60 shrink-0">Periode:</span>
          <div class="join">
            <button v-for="[k,v] in [['today','Hari Ini'],['week','Minggu Ini'],['month','Bulan Ini'],['quarter','Kuartal'],['year','Tahun Ini']]"
              :key="k" class="join-item btn btn-sm"
              :class="selectedPeriod === k ? 'btn-primary' : 'btn-ghost'"
              @click="setPeriod(k)">{{ v }}</button>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-2">
            <IconCalendar class="w-4 h-4 text-base-content/40" />
            <input type="date" class="input input-sm input-bordered" v-model="filters.startDate" @change="selectedPeriod='custom'; loadSummaryAndCategory()" />
            <span class="text-base-content/40">—</span>
            <input type="date" class="input input-sm input-bordered" v-model="filters.endDate"   @change="selectedPeriod='custom'; loadSummaryAndCategory()" />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-base-content/50">Kelompokkan:</span>
            <div class="join">
              <button v-for="[k,v] in [['day','Hari'],['week','Minggu'],['month','Bulan'],['year','Tahun']]"
                :key="k" class="join-item btn btn-xs"
                :class="filters.groupBy === k ? 'btn-neutral' : 'btn-ghost'"
                @click="filters.groupBy = k; fetchSummary({ startDate: filters.startDate, endDate: filters.endDate, groupBy: k })">{{ v }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <template v-if="summaryLoading">
        <div v-for="i in 4" :key="i" class="card bg-base-100 shadow"><div class="card-body"><div class="skeleton h-4 w-20 mb-2"></div><div class="skeleton h-7 w-28"></div></div></div>
      </template>
      <template v-else>
        <!-- Pemasukan -->
        <div class="card bg-base-100 shadow">
          <div class="card-body py-4 px-5">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-base-content/50 font-medium">Total Pemasukan</span>
              <IconTrendingUp class="w-4 h-4 text-success" />
            </div>
            <p class="text-xl font-bold text-success">{{ formatCurrency(totalInflow) }}</p>
            <p class="text-xs text-base-content/40 mt-1">Transaksi selesai</p>
          </div>
        </div>
        <!-- Pengeluaran -->
        <div class="card bg-base-100 shadow">
          <div class="card-body py-4 px-5">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-base-content/50 font-medium">Total Pengeluaran</span>
              <IconTrendingDown class="w-4 h-4 text-error" />
            </div>
            <p class="text-xl font-bold text-error">{{ formatCurrency(totalOutflow) }}</p>
            <p class="text-xs text-base-content/40 mt-1">Beban disetujui/dibayar</p>
          </div>
        </div>
        <!-- Arus Kas Bersih -->
        <div class="card bg-base-100 shadow">
          <div class="card-body py-4 px-5">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-base-content/50 font-medium">Arus Kas Bersih</span>
              <IconCash class="w-4 h-4" :class="netCashFlow >= 0 ? 'text-success' : 'text-error'" />
            </div>
            <p class="text-xl font-bold" :class="netCashFlow >= 0 ? 'text-success' : 'text-error'">{{ formatCurrency(netCashFlow) }}</p>
            <p class="text-xs text-base-content/40 mt-1">Pemasukan − Pengeluaran</p>
          </div>
        </div>
        <!-- Saldo Akhir -->
        <div class="card bg-base-100 shadow">
          <div class="card-body py-4 px-5">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-base-content/50 font-medium">Saldo Akhir</span>
              <IconWallet class="w-4 h-4 text-info" />
            </div>
            <p class="text-xl font-bold text-info">{{ formatCurrency(endingBalance) }}</p>
            <p class="text-xs text-base-content/40 mt-1">Akumulasi saldo</p>
          </div>
        </div>
      </template>
    </div>

    <!-- Cash Flow Table + Category Breakdown -->
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">

      <!-- Tren Arus Kas (3/5) -->
      <div class="card bg-base-100 shadow-xl lg:col-span-3">
        <div class="card-body">
          <h3 class="card-title text-base mb-3">
            <IconChartBar class="w-5 h-5 text-primary" />
            Tren Arus Kas
            <span class="badge badge-ghost badge-sm ml-1">{{ groupByLabels[filters.groupBy] }}</span>
          </h3>

          <div v-if="summaryLoading" class="space-y-2">
            <div v-for="i in 8" :key="i" class="skeleton h-8 w-full"></div>
          </div>

          <div v-else-if="cashFlowRows.length > 0" class="overflow-x-auto">
            <table class="table table-xs">
              <thead>
                <tr class="text-base-content/50">
                  <th>Periode</th>
                  <th class="text-right text-success">Masuk</th>
                  <th class="text-right text-error">Keluar</th>
                  <th class="text-right">Bersih</th>
                  <th class="text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in cashFlowRows" :key="i" class="hover">
                  <td class="text-xs">{{ formatPeriod(row.period) }}</td>
                  <td class="text-right text-success font-medium text-xs">{{ formatCurrency(row.inflow) }}</td>
                  <td class="text-right text-error font-medium text-xs">{{ formatCurrency(row.outflow) }}</td>
                  <td class="text-right text-xs font-semibold" :class="(row.netFlow || 0) >= 0 ? 'text-success' : 'text-error'">
                    {{ formatCurrency(row.netFlow) }}
                  </td>
                  <td class="text-right text-xs text-base-content/60">{{ formatCurrency(row.balance) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="font-bold border-t-2 border-base-300">
                  <td class="text-xs">Total</td>
                  <td class="text-right text-success text-xs">{{ formatCurrency(totalInflow) }}</td>
                  <td class="text-right text-error text-xs">{{ formatCurrency(totalOutflow) }}</td>
                  <td class="text-right text-xs" :class="netCashFlow >= 0 ? 'text-success' : 'text-error'">{{ formatCurrency(netCashFlow) }}</td>
                  <td class="text-right text-xs text-info">{{ formatCurrency(endingBalance) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div v-else class="text-center py-10 text-base-content/40">
            Tidak ada data arus kas untuk periode ini
          </div>
        </div>
      </div>

      <!-- Perincian Kategori (2/5) -->
      <div class="card bg-base-100 shadow-xl lg:col-span-2">
        <div class="card-body">
          <h3 class="card-title text-base mb-3">Perincian Kategori</h3>

          <div v-if="categoryLoading && expCatsLoading" class="space-y-2">
            <div v-for="i in 6" :key="i" class="skeleton h-7 w-full"></div>
          </div>

          <div v-else class="space-y-4">
            <!-- Pemasukan -->
            <div v-if="inflows.length">
              <p class="text-xs font-semibold text-success mb-2 uppercase tracking-wide">Pemasukan</p>
              <div class="space-y-1">
                <div v-for="row in inflows" :key="row.category"
                  class="flex items-center justify-between text-sm py-1 border-b border-base-200 last:border-0">
                  <span class="capitalize text-xs">{{ row.category }}</span>
                  <div class="text-right">
                    <span class="font-semibold text-success text-xs">{{ formatCurrency(row.total) }}</span>
                    <span class="text-base-content/40 text-xs ml-1">({{ formatNumber(row.count) }}x)</span>
                  </div>
                </div>
              </div>
              <div class="flex justify-between text-xs font-bold mt-1 pt-1 border-t border-base-300">
                <span>Sub-total</span>
                <span class="text-success">{{ formatCurrency(totalInflowCat) }}</span>
              </div>
            </div>

            <!-- Pengeluaran: dari expense-categories dengan stats -->
            <div v-if="outflows.length">
              <p class="text-xs font-semibold text-error mb-2 uppercase tracking-wide">Pengeluaran per Kategori</p>
              <div v-if="expCatsLoading" class="space-y-1">
                <div v-for="i in 4" :key="i" class="skeleton h-7 w-full"></div>
              </div>
              <div v-else class="space-y-1">
                <div v-for="cat in outflows" :key="cat.id"
                  class="flex items-center justify-between py-1 border-b border-base-200 last:border-0">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: cat.color || '#94a3b8' }"></span>
                    <span class="text-xs truncate">{{ cat.name }}</span>
                    <span class="badge badge-xs badge-ghost capitalize">{{ cat.type }}</span>
                  </div>
                  <div class="text-right shrink-0 ml-2">
                    <span class="font-semibold text-error text-xs">{{ formatCurrency(cat.stats?.totalAmount) }}</span>
                    <span class="text-base-content/40 text-xs ml-1">({{ formatNumber(cat.stats?.expenseCount) }}x)</span>
                  </div>
                </div>
              </div>
              <div class="flex justify-between text-xs font-bold mt-1 pt-1 border-t border-base-300">
                <span>Sub-total</span>
                <span class="text-error">{{ formatCurrency(totalOutflowCat) }}</span>
              </div>
            </div>

            <div v-if="!inflows.length && !outflows.length" class="text-center py-8 text-base-content/40 text-sm">
              Tidak ada data kategori
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Proyeksi Arus Kas -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 class="card-title text-base">Proyeksi Arus Kas</h3>
            <p class="text-xs text-base-content/50 mt-0.5">
              Berdasarkan rata-rata
              <span v-if="historical.periodsAnalyzed">{{ historical.periodsAnalyzed }} bulan terakhir</span>
              <span v-else>historis</span>
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-base-content/50">Proyeksi:</span>
            <div class="join">
              <button v-for="m in [3, 6, 12]" :key="m"
                class="join-item btn btn-xs"
                :class="projectionMonths === m ? 'btn-primary' : 'btn-ghost'"
                @click="projectionMonths = m; fetchProjection({ months: m })">{{ m }} bln</button>
            </div>
          </div>
        </div>

        <!-- Historical averages -->
        <div v-if="historical.avgMonthlyInflow" class="grid grid-cols-3 gap-3 mb-4">
          <div class="bg-success/10 rounded-lg p-3 text-center">
            <p class="text-xs text-base-content/50 mb-1">Rata-rata Masuk/bln</p>
            <p class="font-bold text-success text-sm">{{ formatCurrency(historical.avgMonthlyInflow) }}</p>
          </div>
          <div class="bg-error/10 rounded-lg p-3 text-center">
            <p class="text-xs text-base-content/50 mb-1">Rata-rata Keluar/bln</p>
            <p class="font-bold text-error text-sm">{{ formatCurrency(historical.avgMonthlyOutflow) }}</p>
          </div>
          <div class="rounded-lg p-3 text-center" :class="(historical.avgNetFlow || 0) >= 0 ? 'bg-primary/10' : 'bg-warning/10'">
            <p class="text-xs text-base-content/50 mb-1">Rata-rata Bersih/bln</p>
            <p class="font-bold text-sm" :class="(historical.avgNetFlow || 0) >= 0 ? 'text-primary' : 'text-warning'">{{ formatCurrency(historical.avgNetFlow) }}</p>
          </div>
        </div>

        <div v-if="projectionLoading" class="space-y-2">
          <div v-for="i in projectionMonths" :key="i" class="skeleton h-10 w-full"></div>
        </div>

        <div v-else-if="projections.length > 0" class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
              <tr class="text-base-content/50">
                <th>Bulan</th>
                <th class="text-right text-success">Proyeksi Masuk</th>
                <th class="text-right text-error">Proyeksi Keluar</th>
                <th class="text-right">Arus Bersih</th>
                <th class="text-right">Saldo Proyeksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="proj in projections" :key="proj.month" class="hover">
                <td class="font-medium text-sm">{{ formatMonth(proj.month) }}</td>
                <td class="text-right text-success font-medium">{{ formatCurrency(proj.projectedInflow) }}</td>
                <td class="text-right text-error font-medium">{{ formatCurrency(proj.projectedOutflow) }}</td>
                <td class="text-right font-semibold" :class="(proj.projectedNetFlow || 0) >= 0 ? 'text-success' : 'text-error'">
                  {{ formatCurrency(proj.projectedNetFlow) }}
                </td>
                <td class="text-right font-semibold text-info">{{ formatCurrency(proj.projectedBalance) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="text-center py-10 text-base-content/40">
          <IconChartBar class="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p class="text-sm">Data proyeksi belum tersedia</p>
          <p class="text-xs mt-1">Proyeksi memerlukan minimal 3 bulan data historis</p>
        </div>
      </div>
    </div>

  </div>
</template>
