<route lang="yaml">
meta:
  title: Service Commission Income
  layout: default
</route>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center gap-3 mb-1">
        <router-link to="/finances/reports" class="btn btn-ghost btn-sm">
          <IconArrowLeft class="w-4 h-4" />
        </router-link>
        <h1 class="text-3xl font-bold">Service Commission Income</h1>
      </div>
      <p class="text-base-content/60 mt-1 ml-12">Laporan pendapatan dan komisi trainer dari layanan personal training</p>
    </div>

    <!-- Filters Card -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h3 class="card-title text-lg">Filter Laporan</h3>

        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <!-- Start Date -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Tanggal Mulai</span>
            </label>
            <input v-model="filters.startDate" type="date" class="input input-bordered w-full" />
          </div>

          <!-- End Date -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Tanggal Akhir</span>
            </label>
            <input v-model="filters.endDate" type="date" class="input input-bordered w-full" />
          </div>

          <!-- Trainer Filter -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Trainer</span>
            </label>
            <select v-model="filters.trainerId" class="select select-bordered w-full">
              <option value="">Semua Trainer</option>
              <option v-for="trainer in trainers" :key="trainer.id" :value="trainer.id">
                {{ trainer.name || trainer.user?.name || trainer.employeeName || trainer.id }}
              </option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Status</span>
            </label>
            <select v-model="filters.status" class="select select-bordered w-full">
              <option value="">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <!-- Group By -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Kelompokkan</span>
            </label>
            <select v-model="filters.groupBy" class="select select-bordered w-full">
              <option value="">Tanpa Pengelompokan</option>
              <option value="daily">Harian</option>
              <option value="weekly">Mingguan</option>
              <option value="monthly">Bulanan</option>
              <option value="yearly">Tahunan</option>
            </select>
          </div>

          <!-- Sort By -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Urutan</span>
            </label>
            <select v-model="filters.sortBy" class="select select-bordered w-full">
              <option value="date">Tanggal</option>
              <option value="amount">Jumlah</option>
              <option value="trainer">Trainer</option>
            </select>
          </div>

          <!-- Sort Order -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Arah Urutan</span>
            </label>
            <select v-model="filters.sortOrder" class="select select-bordered w-full">
              <option value="desc">Terbaru</option>
              <option value="asc">Terlama</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end mt-4">
          <button class="btn btn-primary" :disabled="loading" @click="handleGenerate">
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            <IconSearch v-else class="w-4 h-4" />
            Generate Laporan
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-16">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <!-- Report Content -->
    <div v-else-if="reportData" class="space-y-6">

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-primary">
              <IconCash class="w-8 h-8" />
            </div>
            <div class="stat-title">Total Pendapatan Layanan</div>
            <div class="stat-value text-primary text-xl">{{ formatCurrency(reportData.summary.totalBaseAmount) }}</div>
            <div class="stat-desc">Gross revenue dari layanan</div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-warning">
              <IconUserStar class="w-8 h-8" />
            </div>
            <div class="stat-title">Total Komisi Trainer</div>
            <div class="stat-value text-warning text-xl">{{ formatCurrency(reportData.summary.totalCommissionAmount) }}</div>
            <div class="stat-desc">Rata-rata {{ reportData.summary.averageCommissionPercent }}% dari pendapatan</div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-success">
              <IconBuildingStore class="w-8 h-8" />
            </div>
            <div class="stat-title">Pendapatan Usaha</div>
            <div class="stat-value text-success text-xl">{{ formatCurrency(reportData.summary.totalBusinessRevenue) }}</div>
            <div class="stat-desc">Rata-rata {{ reportData.summary.averageBusinessPercent }}% dari pendapatan</div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-info">
              <IconChartPie class="w-8 h-8" />
            </div>
            <div class="stat-title">Komisi Terbayar</div>
            <div class="stat-value text-info text-xl">{{ formatCurrency(reportData.summary.paidCommissionAmount) }}</div>
            <div class="stat-desc">Pending: {{ formatCurrency(reportData.summary.pendingCommissionAmount) }}</div>
          </div>
        </div>
      </div>

      <!-- Revenue Split Overview -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Paid vs Pending -->
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title text-base">Status Pembayaran</h2>
            <div class="space-y-3 mt-2">
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium text-success">Paid</span>
                  <span>{{ formatCurrency(reportData.summary.paidBusinessRevenue) }}</span>
                </div>
                <div class="w-full bg-base-300 rounded-full h-2.5">
                  <div
                    class="bg-success h-2.5 rounded-full"
                    :style="{ width: paidPercent + '%' }"
                  ></div>
                </div>
                <p class="text-xs text-base-content/50 mt-1">Pendapatan usaha terbayar</p>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium text-warning">Pending</span>
                  <span>{{ formatCurrency(reportData.summary.pendingBusinessRevenue) }}</span>
                </div>
                <div class="w-full bg-base-300 rounded-full h-2.5">
                  <div
                    class="bg-warning h-2.5 rounded-full"
                    :style="{ width: pendingPercent + '%' }"
                  ></div>
                </div>
                <p class="text-xs text-base-content/50 mt-1">Pendapatan usaha pending</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Commission Split -->
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title text-base">Pembagian Revenue</h2>
            <div class="space-y-3 mt-2">
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium text-warning">Komisi Trainer ({{ reportData.summary.averageCommissionPercent }}%)</span>
                  <span>{{ formatCurrency(reportData.summary.totalCommissionAmount) }}</span>
                </div>
                <div class="w-full bg-base-300 rounded-full h-3">
                  <div
                    class="bg-warning h-3 rounded-full"
                    :style="{ width: reportData.summary.averageCommissionPercent + '%' }"
                  ></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium text-primary">Pendapatan Usaha ({{ reportData.summary.averageBusinessPercent }}%)</span>
                  <span>{{ formatCurrency(reportData.summary.totalBusinessRevenue) }}</span>
                </div>
                <div class="w-full bg-base-300 rounded-full h-3">
                  <div
                    class="bg-primary h-3 rounded-full"
                    :style="{ width: reportData.summary.averageBusinessPercent + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- By Trainer Table -->
      <div v-if="reportData.byTrainer && reportData.byTrainer.length" class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Rincian Per Trainer</h2>
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Trainer</th>
                  <th class="text-right">Total Pendapatan</th>
                  <th class="text-right">Komisi</th>
                  <th class="text-right">% Komisi</th>
                  <th class="text-right">Pendapatan Usaha</th>
                  <th class="text-right">% Usaha</th>
                  <th class="text-center">Sesi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in reportData.byTrainer" :key="row.trainer?.id || row.trainerId">
                  <td>
                    <div class="font-semibold">{{ row.trainer?.name || row.trainerName || '-' }}</div>
                    <div v-if="row.trainer?.email || row.trainer?.phone" class="text-xs text-base-content/50">
                      {{ row.trainer?.phone || row.trainer?.email }}
                    </div>
                  </td>
                  <td class="text-right font-semibold">{{ formatCurrency(row.totalBaseAmount) }}</td>
                  <td class="text-right text-warning font-semibold">{{ formatCurrency(row.totalCommissionAmount) }}</td>
                  <td class="text-right">
                    <span class="badge badge-warning badge-outline">{{ row.averageCommissionPercent }}%</span>
                  </td>
                  <td class="text-right text-success font-semibold">{{ formatCurrency(row.totalBusinessRevenue) }}</td>
                  <td class="text-right">
                    <span class="badge badge-success badge-outline">{{ row.averageBusinessPercent }}%</span>
                  </td>
                  <td class="text-center">
                    <div>{{ row.commissionCount ?? '-' }}</div>
                    <div class="text-xs text-base-content/50">
                      <span class="text-success">{{ row.paidCount }} paid</span> ·
                      <span class="text-warning">{{ row.pendingCount }} pending</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Time Series Table -->
      <div v-if="reportData.timeSeries && reportData.timeSeries.length" class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Data Per Periode</h2>
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Periode</th>
                  <th class="text-right">Total Pendapatan</th>
                  <th class="text-right">Komisi Trainer</th>
                  <th class="text-right">Pendapatan Usaha</th>
                  <th class="text-center">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in reportData.timeSeries" :key="idx">
                  <td class="font-medium">{{ formatPeriod(row.period ?? row.date) }}</td>
                  <td class="text-right">{{ formatCurrency(row.totalBaseAmount ?? row.total) }}</td>
                  <td class="text-right text-warning">{{ formatCurrency(row.totalCommissionAmount ?? row.commission) }}</td>
                  <td class="text-right text-success">{{ formatCurrency(row.totalBusinessRevenue ?? row.businessRevenue) }}</td>
                  <td class="text-center">{{ row.count ?? '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Recent Commissions Table -->
      <div v-if="reportData.recentCommissions && reportData.recentCommissions.length" class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h2 class="card-title">Data Komisi Terbaru</h2>
            <span class="badge badge-neutral">{{ reportData.recentCommissions.length }} data</span>
          </div>
          <div class="overflow-x-auto">
            <table class="table table-zebra table-sm">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Trainer</th>
                  <th>Member / Layanan</th>
                  <th class="text-right">Pendapatan</th>
                  <th class="text-right">Komisi</th>
                  <th class="text-right">% Komisi</th>
                  <th class="text-right">Pendapatan Usaha</th>
                  <th class="text-right">% Usaha</th>
                  <th class="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in reportData.recentCommissions" :key="idx">
                  <td class="whitespace-nowrap">{{ formatDate(item.date ?? item.createdAt) }}</td>
                  <td>{{ item.trainerName ?? item.trainer?.name ?? '-' }}</td>
                  <td>
                    <div class="flex items-center gap-2 flex-wrap">
                      <span>{{ item.member?.name ?? item.memberName ?? '-' }}</span>
                      <span v-if="item.member?.customerType" class="badge badge-ghost badge-sm">{{ item.member.customerType }}</span>
                    </div>
                    <div v-if="item.servicePackage?.planName" class="text-xs text-info mt-0.5">{{ item.servicePackage.planName }}</div>
                    <div v-if="item.servicePackage?.serviceType" class="text-xs text-base-content/40">{{ item.servicePackage.serviceType.replace('_', ' ') }}</div>
                  </td>
                  <td class="text-right">{{ formatCurrency(item.baseAmount) }}</td>
                  <td class="text-right text-warning font-semibold">{{ formatCurrency(item.commissionAmount) }}</td>
                  <td class="text-right">
                    <span class="badge badge-warning badge-sm badge-outline">{{ item.commissionPercent }}%</span>
                  </td>
                  <td class="text-right text-success font-semibold">{{ formatCurrency(item.businessRevenue) }}</td>
                  <td class="text-right">
                    <span class="badge badge-success badge-sm badge-outline">{{ item.businessPercent }}%</span>
                  </td>
                  <td class="text-center">
                    <span
                      class="badge badge-sm"
                      :class="{
                        'badge-success': item.status === 'paid',
                        'badge-warning': item.status === 'pending',
                        'badge-error': item.status === 'cancelled'
                      }"
                    >{{ item.status }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading" class="card bg-base-100 shadow-xl">
      <div class="card-body items-center text-center py-16">
        <IconChartBar class="w-16 h-16 text-base-content/30 mb-4" />
        <h3 class="text-xl font-semibold mb-2">Belum Ada Data</h3>
        <p class="text-base-content/60">Atur filter dan klik "Generate Laporan" untuk melihat laporan komisi</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" role="alert" class="alert alert-error mt-4">
      <IconAlertTriangle class="w-5 h-5" />
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFinancialReports } from '@/composables/finances'
import { useTrainers } from '@/composables/gym/trainer-management/useTrainers'
import {
  IconArrowLeft,
  IconSearch,
  IconCash,
  IconUserStar,
  IconBuildingStore,
  IconChartPie,
  IconChartBar,
  IconAlertTriangle
} from '@tabler/icons-vue'

const { loading, fetchServiceCommissionIncome } = useFinancialReports()
const { trainers, fetchTrainers } = useTrainers()

const reportData = ref(null)
const error = ref(null)

const filters = ref({
  startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  trainerId: '',
  status: '',
  groupBy: '',
  sortBy: 'date',
  sortOrder: 'desc'
})

// ---- Computed ----

const paidPercent = computed(() => {
  const summary = reportData.value?.summary
  if (!summary?.totalBusinessRevenue) return 0
  return Math.round((summary.paidBusinessRevenue / summary.totalBusinessRevenue) * 100)
})

const pendingPercent = computed(() => {
  const summary = reportData.value?.summary
  if (!summary?.totalBusinessRevenue) return 0
  return Math.round((summary.pendingBusinessRevenue / summary.totalBusinessRevenue) * 100)
})

// ---- Formatters ----

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount || 0)

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatPeriod = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// ---- Actions ----

const handleGenerate = async () => {
  error.value = null
  try {
    const data = await fetchServiceCommissionIncome(filters.value)
    reportData.value = data
  } catch (err) {
    error.value = err?.message || 'Gagal memuat laporan. Silakan coba lagi.'
    reportData.value = null
  }
}

onMounted(async () => {
  try {
    await fetchTrainers({ limit: 200, status: 'active' })
  } catch {
    // trainers are optional for filter; ignore error
  }
})
</script>
