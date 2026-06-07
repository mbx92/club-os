<route lang="yaml">
meta:
  title: Billing Report
  layout: default
  requiresModule: psychology
</route>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Laporan Billing Test Psikologi</h1>
        <p class="text-base-content/60 mt-1">Laporan penggunaan test untuk keperluan penagihan</p>
      </div>
      <div class="flex gap-2">
        <button 
          v-if="pagination.total > sessions.length"
          class="btn btn-warning btn-sm"
          :disabled="loading"
          @click="handleLoadAll"
        >
          <i class="i-mdi-download mr-1" />
          Load Semua ({{ pagination.total }})
        </button>
        <button 
          class="btn btn-outline btn-sm"
          :disabled="exporting || !sessions.length"
          @click="handleExportCSV"
        >
          <i class="i-mdi-file-delimited mr-1" />
          Export CSV
        </button>
        <button 
          class="btn btn-outline btn-sm"
          :disabled="exporting || !sessions.length"
          @click="handleExportExcel"
        >
          <i class="i-mdi-file-excel mr-1" />
          Export Excel
        </button>
      </div>
    </div>

    <!-- Filters Card -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h3 class="card-title text-lg mb-4">Filter Laporan</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          <!-- Date Range -->
          <div class="form-control lg:col-span-3">
            <label class="label">
              <span class="label-text font-medium">Dari Tanggal</span>
            </label>
            <input
              v-model="filters.startDate"
              type="date"
              class="input input-bordered w-full"
            />
          </div>

          <div class="form-control lg:col-span-3">
            <label class="label">
              <span class="label-text font-medium">Sampai Tanggal</span>
            </label>
            <input
              v-model="filters.endDate"
              type="date"
              class="input input-bordered w-full"
            />
          </div>

          <!-- Verification Status -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Status Verifikasi</span>
            </label>
            <select v-model="filters.verified" class="select select-bordered w-full">
              <option value="all">Semua</option>
              <option value="verified">Sudah Verified</option>
              <option value="unverified">Belum Verified</option>
            </select>
          </div>

          <!-- Quick Date Presets -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Quick Select</span>
            </label>
            <select v-model="quickDate" class="select select-bordered w-full" @change="handleQuickDate">
              <option value="">Pilih Periode</option>
              <option value="this-month">Bulan Ini</option>
              <option value="last-month">Bulan Lalu</option>
              <option value="this-year">Tahun Ini</option>
            </select>
          </div>

          <!-- Limit Selection -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Limit Data</span>
            </label>
            <select v-model.number="filters.limit" class="select select-bordered w-full">
              <option :value="100">100 data</option>
              <option :value="500">500 data</option>
              <option :value="1000">1000 data</option>
              <option :value="10000">Semua data</option>
            </select>
          </div>

          <!-- Action Buttons -->
          <div class="lg:col-span-2 flex items-end gap-2">
            <button 
              class="btn btn-primary flex-1"
              :class="{ 'loading': loading }"
              :disabled="loading"
              @click="handleFetchReport"
            >
              <i v-if="!loading" class="i-mdi-magnify mr-1" />
              Tampilkan
            </button>
            <button 
              class="btn btn-ghost"
              @click="handleResetFilters"
            >
              Reset
            </button>
          </div>
        </div>

        <!-- Warning for unverified tests -->
        <div v-if="hasUnverifiedTests && overallSummary.totalTests" class="alert alert-warning mt-4">
          <i class="i-mdi-alert text-xl" />
          <span>
            <strong>{{ overallSummary.unverifiedTests }}</strong> test belum diverifikasi dari total 
            <strong>{{ overallSummary.totalTests }}</strong> test
          </span>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-20">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Debug Info (temporary) -->
    <div v-if="isDev && !loading" class="alert alert-info mb-4">
      <div>
        <p><strong>Debug Info:</strong></p>
        <p>Report exists: {{ !!report }}</p>
        <p>Sessions count: {{ sessions?.length || 0 }}</p>
        <p>Summary count: {{ summaryByTestType?.length || 0 }}</p>
        <p>Total tests: {{ overallSummary?.totalTests || 0 }}</p>
      </div>
    </div>

    <!-- No Data State -->
    <div v-if="!loading && (!report || !overallSummary.totalTests)" class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-20">
        <i class="i-mdi-chart-box-outline text-6xl text-base-content/30 mx-auto mb-4" />
        <h3 class="text-xl font-semibold mb-2">Belum ada data</h3>
        <p class="text-base-content/60">Pilih periode dan klik "Tampilkan" untuk melihat laporan</p>
      </div>
    </div>

    <!-- Report Content -->
    <div v-if="!loading && report && overallSummary.totalTests">
      <!-- Overall Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-primary">
              <i class="i-mdi-clipboard-list-outline text-3xl" />
            </div>
            <div class="stat-title">Total Test</div>
            <div class="stat-value text-primary">{{ overallSummary.totalTests || 0 }}</div>
            <div class="stat-desc">{{ filters.startDate }} - {{ filters.endDate }}</div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-success">
              <i class="i-mdi-check-circle-outline text-3xl" />
            </div>
            <div class="stat-title">Verified</div>
            <div class="stat-value text-success">{{ overallSummary.verifiedTests || 0 }}</div>
            <div class="stat-desc">
              {{ overallSummary.totalTests ? Math.round((overallSummary.verifiedTests / overallSummary.totalTests) * 100) : 0 }}%
            </div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-warning">
              <i class="i-mdi-clock-alert-outline text-3xl" />
            </div>
            <div class="stat-title">Belum Verified</div>
            <div class="stat-value text-warning">{{ overallSummary.unverifiedTests || 0 }}</div>
            <div class="stat-desc">Perlu review</div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-info">
              <i class="i-mdi-test-tube text-3xl" />
            </div>
            <div class="stat-title">Jenis Test</div>
            <div class="stat-value text-info">{{ overallSummary.uniqueTestTypes || 0 }}</div>
            <div class="stat-desc">Test types</div>
          </div>
        </div>
      </div>

      <!-- Summary by Test Type -->
      <div class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body">
          <div class="flex justify-between items-center mb-4">
            <h2 class="card-title">Ringkasan per Jenis Test</h2>
            <button 
              class="btn btn-sm btn-ghost"
              @click="showBillingCalculator = !showBillingCalculator"
            >
              <i class="i-mdi-calculator mr-1" />
              {{ showBillingCalculator ? 'Sembunyikan' : 'Hitung' }} Billing
            </button>
          </div>

          <!-- Billing Calculator -->
          <div v-if="showBillingCalculator" class="bg-base-200 rounded-lg p-4 mb-4">
            <h3 class="font-semibold mb-3">Kalkulator Billing</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              <div 
                v-for="item in summaryByTestType" 
                :key="item.testType.id"
                class="form-control"
              >
                <label class="label">
                  <span class="label-text">{{ item.testType.code }} ({{ item.totalTests }} tests)</span>
                </label>
                <CurrencyInput
                  v-model="testRates[item.testType.code]"
                  placeholder="Tarif per test"
                  input-class="input input-sm input-bordered"
                />
              </div>
            </div>

            <div class="divider"></div>

            <!-- Billing Breakdown -->
            <div class="space-y-2">
              <div 
                v-for="item in billingBreakdown.breakdown" 
                :key="item.testTypeCode"
                class="flex justify-between items-center p-2 bg-base-100 rounded"
              >
                <div>
                  <span class="font-medium">{{ item.testTypeName }}</span>
                  <span class="text-sm text-base-content/60 ml-2">
                    {{ item.totalTests }} tests @ Rp {{ item.rate.toLocaleString('id-ID') }}
                  </span>
                  <div class="text-xs text-base-content/50">
                    ({{ item.verifiedTests }} verified, {{ item.unverifiedTests }} pending)
                  </div>
                </div>
                <span class="font-semibold">Rp {{ item.subtotal.toLocaleString('id-ID') }}</span>
              </div>

              <div class="divider my-2"></div>

              <div class="flex justify-between items-center text-lg font-bold p-3 bg-primary/10 rounded">
                <span>GRAND TOTAL</span>
                <span class="text-primary">Rp {{ billingBreakdown.grandTotal.toLocaleString('id-ID') }}</span>
              </div>
            </div>
          </div>

          <!-- Test Type Table -->
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama Test</th>
                  <th>Kategori</th>
                  <th class="text-center">Total</th>
                  <th class="text-center">Verified</th>
                  <th class="text-center">Pending</th>
                  <th class="text-center">Avg Duration</th>
                  <th>Periode</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in summaryByTestType" :key="item.testType.id">
                  <td>
                    <span class="badge badge-primary">{{ item.testType.code }}</span>
                  </td>
                  <td class="font-medium">{{ item.testType.name }}</td>
                  <td>
                    <span class="badge badge-ghost">{{ item.testType.category }}</span>
                  </td>
                  <td class="text-center font-semibold">{{ item.totalTests }}</td>
                  <td class="text-center">
                    <span class="text-success">{{ item.verifiedTests }}</span>
                  </td>
                  <td class="text-center">
                    <span class="text-warning">{{ item.unverifiedTests }}</span>
                  </td>
                  <td class="text-center">
                    {{ item.avgDurationMinutes || '-' }} min
                  </td>
                  <td class="text-sm">
                    <div v-if="item.period">
                      <div>{{ formatDate(item.period.firstTest) }}</div>
                      <div class="text-base-content/50">s/d {{ formatDate(item.period.lastTest) }}</div>
                    </div>
                    <span v-else>-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Detailed Sessions -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex justify-between items-center mb-4">
            <h2 class="card-title">Detail Session</h2>
            <div class="text-sm">
              <span class="font-semibold">Total: {{ pagination.total || 0 }}</span>
              <span class="text-base-content/60 ml-2">
                (Menampilkan {{ sessions.length }} dari {{ pagination.total || 0 }} data)
              </span>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th class="w-16">#</th>
                  <th>Order No</th>
                  <th>Pasien</th>
                  <th>Test</th>
                  <th>Package</th>
                  <th>Tanggal Selesai</th>
                  <th class="text-center">Duration</th>
                  <th class="text-center">Progress</th>
                  <th class="text-center">Status</th>
                  <th>Verifikasi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(session, index) in sessions" :key="session.sessionId">
                  <td class="text-center text-xs text-base-content/60">
                    {{ ((pagination?.page || 1) - 1) * (pagination?.limit || 100) + index + 1 }}
                  </td>
                  <td>
                    <span class="font-mono text-xs">{{ session.orderNumber }}</span>
                  </td>
                  <td>
                    <div class="font-medium">{{ session.patientName }}</div>
                    <div class="text-xs text-base-content/50">{{ session.patientCode }}</div>
                  </td>
                  <td>
                    <div class="flex items-center gap-2">
                      <span class="badge badge-sm badge-primary">{{ session.testType.code }}</span>
                      <span class="text-sm">{{ session.testType.name }}</span>
                    </div>
                  </td>
                  <td class="text-sm">{{ session.packageName || '-' }}</td>
                  <td class="text-sm">{{ formatDateTime(session.completedAt) }}</td>
                  <td class="text-center">
                    <span v-if="session.duration" class="badge badge-ghost badge-sm">
                      {{ session.duration }} min
                    </span>
                    <span v-else>-</span>
                  </td>
                  <td class="text-center">
                    <span v-if="session.totalQuestions" class="text-xs">
                      {{ session.questionsAnswered }}/{{ session.totalQuestions }}
                      ({{ Math.round((session.questionsAnswered / session.totalQuestions) * 100) }}%)
                    </span>
                    <span v-else>-</span>
                  </td>
                  <td class="text-center">
                    <span 
                      v-if="session.scores"
                      class="badge badge-sm"
                      :class="{
                        'badge-success': session.scores.category?.includes('High') || session.scores.category?.includes('Above'),
                        'badge-info': session.scores.category?.includes('Average'),
                        'badge-warning': session.scores.category?.includes('Below')
                      }"
                    >
                      {{ session.scores.category || '-' }}
                    </span>
                    <span v-else>-</span>
                  </td>
                  <td>
                    <div v-if="session.verified?.isVerified" class="flex flex-col">
                      <span class="badge badge-success badge-sm mb-1">
                        <i class="i-mdi-check mr-1" />
                        Verified
                      </span>
                      <span class="text-xs text-base-content/50">{{ session.verified.verifiedBy }}</span>
                    </div>
                    <span v-else class="badge badge-warning badge-sm">
                      <i class="i-mdi-clock-outline mr-1" />
                      Pending
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Info -->
          <div v-if="pagination.total > sessions.length" class="alert alert-warning mt-4">
            <i class="i-mdi-information-outline" />
            <span>
              Menampilkan {{ sessions.length }} dari {{ pagination.total }} data. 
              <strong>{{ pagination.total - sessions.length }}</strong> data lainnya tidak ditampilkan.
              Gunakan pagination atau tingkatkan limit untuk melihat semua data.
            </span>
          </div>

          <!-- Pagination -->
          <div v-if="pagination.totalPages > 1" class="flex flex-col items-center gap-4 mt-6">
            <div class="text-sm text-base-content/60">
              Halaman {{ pagination.page }} dari {{ pagination.totalPages }}
            </div>
            <div class="join">
              <button 
                class="join-item btn btn-sm"
                :disabled="pagination.page <= 1"
                @click="handlePageChange(pagination.page - 1)"
              >
                «
              </button>
              <button 
                v-for="page in paginationPages" 
                :key="page"
                class="join-item btn btn-sm"
                :class="{ 'btn-active': page === pagination.page }"
                @click="handlePageChange(page)"
              >
                {{ page }}
              </button>
              <button 
                class="join-item btn btn-sm"
                :disabled="pagination.page >= pagination.totalPages"
                @click="handlePageChange(pagination.page + 1)"
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useBillingReport } from '@/composables/psychology'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'

const isDev = import.meta.env.DEV

const {
  loading,
  exporting,
  report,
  filters,
  sessions,
  summaryByTestType,
  overallSummary,
  pagination,
  hasUnverifiedTests,
  fetchReport,
  fetchMonthlyReport,
  exportToCSV,
  exportToExcel,
  calculateBilling,
  resetFilters,
  goToPage
} = useBillingReport()

// Local state
const quickDate = ref('')
const showBillingCalculator = ref(false)

// Default test rates (Rp)
const testRates = ref({
  'CFIT': 50000,
  'PAPI': 75000,
  'EPPS': 60000,
  'DISC': 50000,
  'MBTI': 65000,
  'KRAEPELIN': 40000,
  'WARTEGG': 55000,
  'DAP': 45000,
  'HTP': 50000
})

// Computed
const billingBreakdown = computed(() => {
  return calculateBilling(testRates.value)
})

const paginationPages = computed(() => {
  const pages = []
  const total = pagination.value.totalPages || 1
  const current = pagination.value.page || 1
  
  // Show max 7 pages
  let start = Math.max(1, current - 3)
  let end = Math.min(total, start + 6)
  
  if (end - start < 6) {
    start = Math.max(1, end - 6)
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

// Methods
const handleFetchReport = async () => {
  await fetchReport()
}

const handleResetFilters = () => {
  resetFilters()
  quickDate.value = ''
  showBillingCalculator.value = false
}

const handleQuickDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  switch (quickDate.value) {
    case 'this-month': {
      const startDate = new Date(year, month, 1)
      const endDate = new Date(year, month + 1, 0)
      filters.startDate = formatDateInput(startDate)
      filters.endDate = formatDateInput(endDate)
      break
    }
    case 'last-month': {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0)
      filters.startDate = formatDateInput(startDate)
      filters.endDate = formatDateInput(endDate)
      break
    }
    case 'this-year': {
      const startDate = new Date(year, 0, 1)
      const endDate = new Date(year, 11, 31)
      filters.startDate = formatDateInput(startDate)
      filters.endDate = formatDateInput(endDate)
      break
    }
  }
}

const handlePageChange = (page) => {
  goToPage(page)
}

const handleExportCSV = () => {
  exportToCSV()
}

const handleExportExcel = () => {
  exportToExcel()
}

const handleLoadAll = async () => {
  filters.limit = pagination.value.total || 10000
  await fetchReport()
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateInput = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Auto-load current month on mount
onMounted(() => {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  
  filters.startDate = formatDateInput(startDate)
  filters.endDate = formatDateInput(endDate)
  
  if (isDev) {
    console.log('🎯 Mounted with filters:', filters)
  }
})

// Watch for data changes
watch(
  () => [report.value, sessions.value, summaryByTestType.value, overallSummary.value],
  ([reportVal, sessionsVal, summaryVal, overallVal]) => {
    if (isDev) {
      console.log('📊 [Vue Watch] Data changed:', {
        reportExists: !!reportVal,
        reportValue: reportVal,
        sessionsCount: sessionsVal?.length,
        sessionsSample: sessionsVal?.[0],
        summaryCount: summaryVal?.length,
        summarySample: summaryVal?.[0],
        overallSummary: overallVal,
        totalTests: overallVal?.totalTests
      })
    }
  },
  { immediate: true, deep: true }
)
</script>
