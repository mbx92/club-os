<route lang="yaml">
meta:
  title: Forecasting
  layout: default
</route>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useReports } from '@/composables/shared/useReports'
import {
  IconArrowLeft,
  IconRefresh,
  IconChartBar,
  IconTrendingUp,
  IconTrendingDown,
  IconCloudFog,
  IconUsers,
  IconCurrencyDollar,
  IconActivity,
  IconWallet,
  IconStars
} from '@tabler/icons-vue'

const router = useRouter()
const {
  getForecasting,
  forecasting,
  loading,
  formatCurrency,
  formatNumber
} = useReports()

const months = ref(3)
const periodsAhead = ref(3)

// Sections shown in comprehensive mode
const sections = [
  { key: 'revenue',    label: 'Revenue',    icon: IconCurrencyDollar, color: 'success',  isCurrency: true },
  { key: 'members',    label: 'Members',    icon: IconUsers,          color: 'info',     isCurrency: false },
  { key: 'attendance', label: 'Attendance', icon: IconActivity,       color: 'warning',  isCurrency: false },
  { key: 'expenses',   label: 'Expenses',   icon: IconWallet,         color: 'error',    isCurrency: true },
]

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Given the list of historical periods and a periodIndex (1-based),
 * compute the human-readable month label.
 * e.g. historical[0].period = Jan 2026, historicalLength=2, periodIndex=3 → Mar 2026
 */
const periodLabel = (historical, periodIndex) => {
  if (!historical?.length) return `Period ${periodIndex}`
  const firstDate = new Date(historical[0].period)
  const d = new Date(firstDate)
  d.setMonth(d.getMonth() + (periodIndex - 1))
  return d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
}

const fmtVal = (val, isCurrency) =>
  isCurrency ? formatCurrency(val) : formatNumber(val)

const trendClass = (trend) => {
  if (!trend) return ''
  const positive = ['growing', 'up', 'increasing']
  return positive.includes(trend) ? 'text-success' : 'text-error'
}

const trendIsPositive = (trend) => ['growing', 'up', 'increasing'].includes(trend)

// For comprehensive: data = { revenue:{}, members:{}, attendance:{}, expenses:{}, metadata:{} }
// For single type  : data = { historical:[], forecast:{ forecast:[], trend, avgGrowthRate } }
const isComprehensive = computed(() => !!forecasting.value?.revenue)
const metadata = computed(() => forecasting.value?.metadata ?? {})

// Helper to extract section data regardless of mode
const getSection = (key) => {
  if (!forecasting.value) return null
  if (isComprehensive.value) return forecasting.value[key] ?? null
  // single type — only matches if we happen to load by type
  return forecasting.value
}

const loadData = async () => {
  await getForecasting('comprehensive', {
    months: months.value,
    periodsAhead: periodsAhead.value
  })
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
        <h1 class="text-3xl font-bold">Forecasting</h1>
        <p class="text-base-content/60 mt-1">
          Prediksi revenue, member, kehadiran, dan pengeluaran
          <span v-if="metadata.basedOnMonths" class="ml-2 badge badge-ghost badge-sm">
            based on {{ metadata.basedOnMonths }} month(s)
          </span>
        </p>
      </div>
      <button class="btn btn-ghost btn-sm" @click="loadData" :disabled="loading">
        <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow mb-6">
      <div class="card-body p-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label"><span class="label-text">Lihat data historis (bulan ke belakang)</span></label>
            <input
              type="number"
              v-model.number="months"
              class="input input-bordered w-full mt-2"
              min="1" max="36"
              @change="loadData"
            />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Periode prediksi ke depan (bulan)</span></label>
            <input
              type="number"
              v-model.number="periodsAhead"
              class="input input-bordered w-full mt-2"
              min="1" max="12"
              @change="loadData"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- No data -->
    <div v-else-if="!forecasting" class="text-center py-20 text-base-content/60">
      Tidak ada data forecasting
    </div>

    <!-- Comprehensive sections -->
    <template v-else>
      <div v-for="section in sections" :key="section.key" class="mb-8">
        <!-- Section header -->
        <div class="flex items-center gap-3 mb-4">
          <component :is="section.icon" class="w-6 h-6" :class="`text-${section.color}`" />
          <h2 class="text-xl font-bold">{{ section.label }}</h2>
          <!-- Trend badge -->
          <template v-if="getSection(section.key)?.forecast?.trend">
            <span class="badge gap-1"
              :class="trendIsPositive(getSection(section.key).forecast.trend) ? 'badge-success' : 'badge-error'">
              <IconTrendingUp v-if="trendIsPositive(getSection(section.key).forecast.trend)" class="w-3 h-3" />
              <IconTrendingDown v-else class="w-3 h-3" />
              {{ getSection(section.key).forecast.trend }}
            </span>
          </template>
          <!-- Growth rate badge -->
          <template v-if="getSection(section.key)?.forecast?.avgGrowthRate != null">
            <span class="badge badge-outline"
              :class="parseFloat(getSection(section.key).forecast.avgGrowthRate) >= 0 ? 'badge-success' : 'badge-error'">
              {{ parseFloat(getSection(section.key).forecast.avgGrowthRate) >= 0 ? '+' : '' }}{{ parseFloat(getSection(section.key).forecast.avgGrowthRate).toFixed(2) }}% avg
            </span>
          </template>
          <!-- Confidence -->
          <template v-if="getSection(section.key)?.forecast?.confidence">
            <span class="badge badge-ghost badge-sm capitalize">
              <IconStars class="w-3 h-3 mr-1" />
              {{ getSection(section.key).forecast.confidence }} confidence
            </span>
          </template>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Historical -->
          <div class="card bg-base-100 shadow">
            <div class="card-body">
              <h3 class="card-title text-base mb-3">
                <IconChartBar class="w-4 h-4" />
                Historis
              </h3>
              <div v-if="!getSection(section.key)?.historical?.length" class="text-center py-6 text-base-content/60 text-sm">
                Tidak ada data historis
              </div>
              <div v-else class="overflow-x-auto">
                <table class="table table-sm table-zebra">
                  <thead>
                    <tr>
                      <th>Bulan</th>
                      <th class="text-right">Aktual</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in getSection(section.key).historical" :key="row.period" class="hover">
                      <td>{{ new Date(row.period).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) }}</td>
                      <td class="text-right font-medium">
                        {{ fmtVal(parseFloat(row.value ?? 0), section.isCurrency) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Forecast -->
          <div class="card shadow" :class="`bg-${section.color}/5 border border-${section.color}/20`">
            <div class="card-body">
              <h3 class="card-title text-base mb-3">
                <IconCloudFog class="w-4 h-4 text-info" />
                Prediksi ke depan
              </h3>
              <div v-if="!getSection(section.key)?.forecast?.forecast?.length" class="text-center py-6 text-base-content/60 text-sm">
                Tidak ada data prediksi
              </div>
              <div v-else class="overflow-x-auto">
                <table class="table table-sm table-zebra">
                  <thead>
                    <tr>
                      <th>Bulan</th>
                      <th class="text-right">Prediksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in getSection(section.key).forecast.forecast"
                      :key="row.periodIndex"
                      class="hover"
                    >
                      <td>
                        <span class="badge badge-info badge-xs mr-1">est.</span>
                        {{ periodLabel(getSection(section.key).historical, row.periodIndex) }}
                      </td>
                      <td class="text-right font-bold" :class="`text-${section.color}`">
                        {{ fmtVal(row.predictedValue ?? 0, section.isCurrency) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Model info -->
              <div v-if="getSection(section.key)?.forecast?.model" class="mt-3 pt-3 border-t border-base-200 text-xs text-base-content/50 space-y-1">
                <div>Slope: {{ getSection(section.key).forecast.model.slope?.toLocaleString('id-ID') }}</div>
                <div>R²: {{ getSection(section.key).forecast.model.r2?.toFixed(2) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
