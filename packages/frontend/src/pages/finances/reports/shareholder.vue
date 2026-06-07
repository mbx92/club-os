<route lang="yaml">
meta:
  title: Laporan Distribusi Saham
  layout: default
</route>

<script setup>
import { ref, computed } from 'vue'
import { useShareholders } from '@/composables/finances/useShareholders'
import {
  IconChartPie,
  IconAlertTriangle,
  IconCurrencyDollar,
  IconTrendingUp,
  IconTrendingDown,
  IconUsers,
  IconCalendar,
  IconRefresh,
} from '@tabler/icons-vue'

const { reportData, reportLoading, fetchShareholderReport } = useShareholders()

// ────────────────────────── filter state ──────────────────────────
const today = new Date()
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

const filters = ref({
  startDate: firstOfMonth.toISOString().slice(0, 10),
  endDate: today.toISOString().slice(0, 10),
})

const generateReport = async () => {
  const params = {
    startDate: filters.value.startDate,
    endDate: filters.value.endDate,
  }
  await fetchShareholderReport(params)
}

// ────────────────────────── helpers ──────────────────────────
const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0)

const formatPct = (val) => `${parseFloat(val || 0).toFixed(2)}%`

const formatDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ────────────────────────── computed from response ──────────────────────────
const summary = computed(() => reportData.value?.summary ?? null)
const deductions = computed(() => reportData.value?.deductions ?? null)
const distribution = computed(() => reportData.value?.shareholderDistribution ?? [])
const maxDistAmount = computed(() =>
  distribution.value.reduce((m, s) => Math.max(m, s.amount), 0)
)
const isOverride = computed(() => reportData.value?.filters?.shareholdersSource === 'override')
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold">Laporan Distribusi Saham</h1>
      <p class="text-base-content/60 mt-1">Hitung distribusi profit berdasarkan kepemilikan saham</p>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h2 class="card-title text-base mb-4">
          <IconCalendar class="w-5 h-5" /> Periode Laporan
        </h2>
        <div class="flex flex-wrap items-end gap-4">
          <div class="form-control">
            <label class="label"><span class="label-text">Tanggal Mulai</span></label>
            <input
              v-model="filters.startDate"
              type="date"
              class="input input-bordered"
            />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Tanggal Akhir</span></label>
            <input
              v-model="filters.endDate"
              type="date"
              class="input input-bordered"
            />
          </div>
          <button
            class="btn btn-primary"
            :disabled="reportLoading || !filters.startDate || !filters.endDate"
            @click="generateReport"
          >
            <span v-if="reportLoading" class="loading loading-spinner loading-sm"></span>
            <IconRefresh v-else class="w-4 h-4" />
            Generate Laporan
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="reportLoading" class="flex justify-center py-16">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Empty state before generate -->
    <div v-else-if="!reportData" class="text-center py-16 text-base-content/40">
      <IconChartPie class="w-16 h-16 mx-auto mb-3 opacity-40" />
      <p class="text-lg">Pilih periode dan klik Generate Laporan</p>
    </div>

    <!-- Report Content -->
    <div v-else class="space-y-6">
      <!-- Override warning -->
      <div v-if="isOverride" class="alert alert-warning">
        <IconAlertTriangle class="w-5 h-5 shrink-0" />
        <span>Laporan ini menggunakan persentase saham yang di-override (bukan dari database).</span>
      </div>

      <!-- Period info -->
      <div class="text-sm text-base-content/60">
        Periode: <strong>{{ formatDate(summary?.period?.startDate) }}</strong> —
        <strong>{{ formatDate(summary?.period?.endDate) }}</strong>
      </div>

      <!-- KPI Summary -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-success"><IconTrendingUp class="w-8 h-8" /></div>
            <div class="stat-title">Gross Revenue</div>
            <div class="stat-value text-success text-xl">{{ formatCurrency(summary?.grossRevenue) }}</div>
            <div class="stat-desc">Sebelum potongan</div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-error"><IconTrendingDown class="w-8 h-8" /></div>
            <div class="stat-title">Total Potongan</div>
            <div class="stat-value text-error text-xl">{{ formatCurrency(summary?.totalDeductions) }}</div>
            <div class="stat-desc">Petty cash + gaji + lainnya</div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-primary"><IconCurrencyDollar class="w-8 h-8" /></div>
            <div class="stat-title">Profit Bersih</div>
            <div class="stat-value text-primary text-xl">{{ formatCurrency(summary?.distributableProfit) }}</div>
            <div class="stat-desc">Siap didistribusikan</div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-info"><IconChartPie class="w-8 h-8" /></div>
            <div class="stat-title">Profit Margin</div>
            <div class="stat-value text-info text-xl">{{ formatPct(summary?.profitMargin) }}</div>
            <div class="stat-desc">Margin bersih</div>
          </div>
        </div>
      </div>

      <!-- Deductions Breakdown -->
      <div v-if="deductions" class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">
            <IconTrendingDown class="w-5 h-5 text-error" />
            Rincian Potongan
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Petty Cash -->
            <div class="border border-base-300 rounded-lg p-4">
              <div class="flex justify-between items-center mb-3">
                <span class="font-semibold text-sm">Petty Cash</span>
                <span class="badge badge-error badge-outline">{{ formatCurrency(deductions.pettyCashAllocation?.total) }}</span>
              </div>
              <div v-if="deductions.pettyCashAllocation?.items?.length" class="space-y-1">
                <div
                  v-for="item in deductions.pettyCashAllocation.items"
                  :key="item.categoryName"
                  class="flex justify-between text-xs text-base-content/70"
                >
                  <span>{{ item.categoryName }}</span>
                  <span>{{ formatCurrency(item.total) }}</span>
                </div>
              </div>
              <p v-else class="text-xs text-base-content/40">Tidak ada data</p>
            </div>

            <!-- Staff Salaries -->
            <div class="border border-base-300 rounded-lg p-4">
              <div class="flex justify-between items-center mb-3">
                <span class="font-semibold text-sm">Gaji Karyawan</span>
                <span class="badge badge-error badge-outline">{{ formatCurrency(deductions.staffSalaries?.total) }}</span>
              </div>
              <div v-if="deductions.staffSalaries?.items?.length" class="space-y-1">
                <div
                  v-for="item in deductions.staffSalaries.items"
                  :key="item.categoryName"
                  class="flex justify-between text-xs text-base-content/70"
                >
                  <span>{{ item.categoryName }}</span>
                  <span>{{ formatCurrency(item.total) }}</span>
                </div>
              </div>
              <p v-else class="text-xs text-base-content/40">Tidak ada data</p>
            </div>

            <!-- Other Expenses -->
            <div class="border border-base-300 rounded-lg p-4">
              <div class="flex justify-between items-center mb-3">
                <span class="font-semibold text-sm">Pengeluaran Lainnya</span>
                <span class="badge badge-error badge-outline">{{ formatCurrency(deductions.otherExpenses?.total) }}</span>
              </div>
              <div v-if="deductions.otherExpenses?.items?.length" class="space-y-1">
                <div
                  v-for="item in deductions.otherExpenses.items"
                  :key="item.categoryName"
                  class="flex justify-between text-xs text-base-content/70"
                >
                  <span>{{ item.categoryName }}</span>
                  <span>{{ formatCurrency(item.total) }}</span>
                </div>
              </div>
              <p v-else class="text-xs text-base-content/40">Tidak ada data</p>
            </div>
          </div>

          <!-- Compliment info if applicable -->
          <div v-if="summary?.compliment?.transactionCount > 0" class="mt-4 text-sm text-base-content/60">
            Termasuk <strong>{{ summary.compliment.transactionCount }}</strong> transaksi compliment senilai
            <strong>{{ formatCurrency(summary.compliment.total) }}</strong>.
          </div>

          <!-- Discount info -->
          <div v-if="summary?.totalDiscount > 0" class="text-sm text-base-content/60">
            Total diskon: <strong>{{ formatCurrency(summary.totalDiscount) }}</strong>.
          </div>
        </div>
      </div>

      <!-- Shareholder Distribution -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">
            <IconUsers class="w-5 h-5 text-primary" />
            Distribusi Profit Pemegang Saham
          </h2>

          <div v-if="!distribution.length" class="text-center py-8 text-base-content/40">
            <p>Tidak ada data distribusi</p>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="(sh, i) in distribution"
              :key="sh.name + i"
              class="flex flex-col gap-1"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="badge badge-neutral badge-sm">{{ formatPct(sh.percentage) }}</span>
                  <span class="font-semibold">{{ sh.name }}</span>
                </div>
                <span class="font-bold text-primary text-lg">{{ formatCurrency(sh.amount) }}</span>
              </div>
              <progress
                class="progress progress-primary w-full"
                :value="maxDistAmount > 0 ? (sh.amount / maxDistAmount) * 100 : 0"
                max="100"
              ></progress>
            </div>
          </div>

          <!-- Distribution Table (compact) -->
          <div v-if="distribution.length" class="overflow-x-auto mt-6">
            <table class="table table-zebra table-sm">
              <thead>
                <tr>
                  <th>Pemegang Saham</th>
                  <th class="text-right">Persentase</th>
                  <th class="text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(sh, i) in distribution" :key="sh.name + i + '-row'">
                  <td class="font-medium">{{ sh.name }}</td>
                  <td class="text-right">{{ formatPct(sh.percentage) }}</td>
                  <td class="text-right font-bold text-primary">{{ formatCurrency(sh.amount) }}</td>
                </tr>
                <!-- Total -->
                <tr class="border-t-2 font-bold">
                  <td>Total</td>
                  <td class="text-right">100%</td>
                  <td class="text-right text-primary">
                    {{ formatCurrency(summary?.distributableProfit) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
