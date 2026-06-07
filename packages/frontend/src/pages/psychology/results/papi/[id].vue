<route lang="yaml">
name: psychology-results-papi
meta:
  title: Hasil PAPI Kostick
  layout: default
  requiresModule: psychology
</route>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert alert-error mx-4">
      <IconAlertCircle class="w-5 h-5" />
      <span>{{ error }}</span>
      <button class="btn btn-ghost btn-sm" @click="loadResult">Coba Lagi</button>
    </div>

    <!-- Result Details -->
    <div v-else-if="resultData && scaleDetails.length">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <button class="btn btn-ghost btn-circle" @click="goBack">
          <IconArrowLeft class="w-5 h-5" />
        </button>
        <div class="flex-1">
          <h1 class="text-3xl font-bold">Hasil: PAPI Kostick</h1>
          <p class="text-base-content/60 mt-1">
            {{ resultData.patient?.fullName || resultData.patient?.name }} - Personality and Preference Inventory
          </p>
        </div>
        <div class="flex gap-2 flex-wrap">
          <!-- Export XLSX Button -->
          <button
            v-if="canExportReport"
            class="btn btn-success btn-sm"
            @click="handleExportXlsx"
            :disabled="exportingXlsx"
          >
            <span v-if="exportingXlsx" class="loading loading-spinner loading-sm"></span>
            <IconFileSpreadsheet v-else class="w-4 h-4" />
            <span class="hidden sm:inline">{{ exportingXlsx ? 'Exporting...' : 'Export XLSX' }}</span>
          </button>

          <!-- Export PDF Button -->
          <button
            v-if="canExportReport"
            class="btn btn-error btn-sm"
            @click="handleExportPdf"
            :disabled="exportingPdf"
          >
            <span v-if="exportingPdf" class="loading loading-spinner loading-sm"></span>
            <IconFileTypePdf v-else class="w-4 h-4" />
            <span class="hidden sm:inline">{{ exportingPdf ? 'Exporting...' : 'Export PDF' }}</span>
          </button>

          <!-- Generate Report Button -->
          <button 
            v-if="!reportInfo?.cacheId || isReportExpired()"
            class="btn btn-primary btn-sm" 
            @click="handleGenerateReport"
            :disabled="generating"
          >
            <span v-if="generating" class="loading loading-spinner loading-sm"></span>
            <IconFileReport v-else class="w-4 h-4" />
            <span class="hidden sm:inline">{{ generating ? 'Generating...' : 'Generate Report' }}</span>
          </button>
          
          <!-- Download Report Button (shown after generate success) -->
          <button 
            v-if="reportInfo?.cacheId && !isReportExpired()"
            class="btn btn-outline btn-success btn-sm" 
            @click="handleDownloadReport"
            :disabled="downloading"
          >
            <span v-if="downloading" class="loading loading-spinner loading-sm"></span>
            <IconDownload v-else class="w-4 h-4" />
            <span class="hidden sm:inline">{{ downloading ? 'Downloading...' : 'Download PDF' }}</span>
          </button>
          
          <!-- Report Info -->
          <div v-if="reportInfo?.expiresAt && !isReportExpired()" class="tooltip tooltip-left" :data-tip="`Berlaku: ${formatExpiry(reportInfo.expiresAt)}`">
            <span class="badge badge-ghost text-xs">
              <IconClock class="w-3 h-3 mr-1" />
              <span class="hidden sm:inline">{{ formatExpiry(reportInfo.expiresAt) }}</span>
            </span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Test Info -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Informasi Tes</h2>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p class="text-base-content/60 text-sm">Jenis Tes</p>
                  <p class="font-semibold">PAPI Kostick</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Kategori</p>
                  <p class="font-semibold capitalize">Personality</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Waktu Mulai</p>
                  <p class="font-semibold">{{ formatDateTime(resultData.session?.startedAt) }}</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Waktu Selesai</p>
                  <p class="font-semibold">{{ formatDateTime(resultData.session?.completedAt) }}</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Durasi</p>
                  <p class="font-semibold">{{ resultData.session?.duration || '-' }} menit</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Total Soal</p>
                  <p class="font-semibold">90 soal</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Top & Low Scales -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Top Scales -->
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title text-success mb-4">
                  <IconTrendingUp class="w-5 h-5" />
                  Skor Tertinggi
                </h2>
                <div class="space-y-3">
                  <div 
                    v-for="scale in topScales" 
                    :key="scale.code"
                    class="flex items-center justify-between p-3 bg-success/10 rounded-lg"
                  >
                    <div>
                      <span class="font-bold text-success">{{ scale.code }}</span>
                      <span class="text-sm ml-2">{{ scale.title }}</span>
                    </div>
                    <div class="text-right">
                      <span class="font-bold text-lg">{{ scale.score }}</span>
                      <span class="text-xs text-base-content/60 ml-1">({{ (scale.percent * 100).toFixed(0) }}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Low Scales -->
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title text-warning mb-4">
                  <IconTrendingDown class="w-5 h-5" />
                  Skor Terendah
                </h2>
                <div class="space-y-3">
                  <div 
                    v-for="scale in lowScales" 
                    :key="scale.code"
                    class="flex items-center justify-between p-3 bg-warning/10 rounded-lg"
                  >
                    <div>
                      <span class="font-bold text-warning">{{ scale.code }}</span>
                      <span class="text-sm ml-2">{{ scale.title }}</span>
                    </div>
                    <div class="text-right">
                      <span class="font-bold text-lg">{{ scale.score }}</span>
                      <span class="text-xs text-base-content/60 ml-1">({{ (scale.percent * 100).toFixed(0) }}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- All Scales Detail -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Detail Semua Skala</h2>
              <div class="overflow-x-auto">
                <table class="table table-zebra">
                  <thead>
                    <tr>
                      <th>Skala</th>
                      <th>Aspek</th>
                      <th>Skor</th>
                      <th>Persentil</th>
                      <th>Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="scale in scaleDetails" :key="scale.code">
                      <td class="font-bold">{{ scale.code }}</td>
                      <td>{{ scale.title }}</td>
                      <td>
                        <div class="flex items-center gap-2">
                          <progress 
                            class="progress w-16" 
                            :class="getProgressClass(scale.level)"
                            :value="scale.score" 
                            :max="scale.max"
                          ></progress>
                          <span class="font-bold">{{ scale.score }}</span>
                        </div>
                      </td>
                      <td>{{ (scale.percent * 100).toFixed(0) }}%</td>
                      <td>
                        <div class="badge" :class="getLevelBadgeClass(scale.level)">
                          {{ scale.label }}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Interpretasi Skala Dominan -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Interpretasi Skala Dominan</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  v-for="scale in topScales" 
                  :key="`interp-${scale.code}`"
                  class="p-4 bg-base-200 rounded-lg"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <span class="badge badge-primary">{{ scale.code }}</span>
                    <span class="font-bold">{{ scale.title }}</span>
                  </div>
                  <div class="text-xs text-base-content/60 mb-2">
                    Skor: {{ scale.score }}/{{ scale.max }} • {{ (scale.percent * 100).toFixed(0) }}% • {{ scale.label }}
                  </div>
                  <p class="text-sm text-base-content/80">{{ scale.narrative }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Analisis per Aspek -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Analisis per Aspek</h2>
              <p class="text-sm text-base-content/60 mb-4">
                Pengelompokan skala berdasarkan aspek psikologis yang diukur.
              </p>
              <div class="overflow-x-auto">
                <table class="table table-sm">
                  <thead>
                    <tr class="bg-base-200">
                      <th>Aspek</th>
                      <th>Kode</th>
                      <th>Keterangan</th>
                      <th>Skor</th>
                      <th>Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="group in normsByAspect" :key="group.aspect">
                      <tr 
                        v-for="(c, idx) in group.codes" 
                        :key="`${group.aspect}-${c.code}`"
                        class="hover:bg-base-200/50"
                      >
                        <td 
                          v-if="idx === 0" 
                          :rowspan="group.codes.length"
                          class="font-semibold bg-base-100 align-top border-r border-base-200"
                        >
                          {{ group.aspect }}
                        </td>
                        <td class="font-bold text-primary">{{ c.code }}</td>
                        <td>{{ c.description }}</td>
                        <td>
                          <div class="flex items-center gap-2">
                            <span class="font-mono font-bold">{{ c.score ?? 0 }}</span>
                            <span class="text-xs text-base-content/60">
                              ({{ ((c.percent || 0) * 100).toFixed(0) }}%)
                            </span>
                          </div>
                        </td>
                        <td>
                          <span class="badge badge-sm" :class="getLevelBadgeClass(c.level)">
                            {{ c.label ?? '-' }}
                          </span>
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Patient Info -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Pasien</h2>
              <div class="flex items-center gap-4 mb-4">
                <div class="w-14 h-14 rounded-full bg-primary text-primary-content flex items-center justify-center shrink-0">
                  <span class="text-xl font-bold leading-none">{{ (resultData.patient?.fullName || resultData.patient?.name)?.charAt(0).toUpperCase() }}</span>
                </div>
                <div>
                  <h3 class="font-bold uppercase">{{ resultData.patient?.fullName || resultData.patient?.name }}</h3>
                  <p class="text-sm text-base-content/60">{{ resultData.patient?.email }}</p>
                </div>
              </div>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-base-content/60">Telepon</span>
                  <span>{{ resultData.patient?.phone || '-' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Tanggal Lahir</span>
                  <span>{{ resultData.patient?.birthDate ? formatDate(resultData.patient.birthDate) : '-' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Jenis Kelamin</span>
                  <span>{{ getSexLabel(resultData.patient?.sex) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Verification Status -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Status Verifikasi</h2>
              <div 
                class="alert"
                :class="resultData.session?.verifiedAt ? 'alert-success' : 'alert-warning'"
              >
                <IconShieldCheck v-if="resultData.session?.verifiedAt" class="w-6 h-6" />
                <IconAlertTriangle v-else class="w-6 h-6" />
                <div>
                  <p class="font-medium">
                    {{ resultData.session?.verifiedAt ? 'Terverifikasi' : 'Belum Diverifikasi' }}
                  </p>
                  <p v-if="resultData.session?.verifiedAt" class="text-sm">
                    {{ formatDateTime(resultData.session.verifiedAt) }}
                  </p>
                </div>
              </div>
              <button 
                v-if="!resultData.session?.verifiedAt"
                class="btn btn-primary btn-block mt-4"
                @click="verifyResult"
                :disabled="verifying"
              >
                <span v-if="verifying" class="loading loading-spinner loading-sm"></span>
                <IconShieldCheck v-else class="w-4 h-4" />
                Verifikasi Hasil
              </button>
            </div>
          </div>

          <!-- Raw Scores -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Skor Mentah</h2>
              <div class="grid grid-cols-4 gap-2 text-center">
                <div 
                  v-for="scale in scaleDetails" 
                  :key="`raw-${scale.code}`"
                  class="p-2 bg-base-200 rounded-lg"
                >
                  <div class="font-bold text-primary text-xs">{{ scale.code }}</div>
                  <div class="text-lg font-bold">{{ scale.score }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Aksi Cepat</h2>
              <div class="space-y-2">
                <router-link 
                  v-if="resultData.patient?.id"
                  :to="`/psychology/patients/${resultData.patient?.id}`"
                  class="btn btn-ghost btn-block justify-start"
                >
                  <IconUser class="w-4 h-4" />
                  Lihat Profil Pasien
                </router-link>
                <router-link 
                  v-if="resultData.session?.id"
                  :to="`/psychology/sessions/${resultData.session?.id}`"
                  class="btn btn-ghost btn-block justify-start"
                >
                  <IconClipboard class="w-4 h-4" />
                  Lihat Detail Sesi
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div class="text-xs text-base-content/50 text-center mt-6">
        <p>* Hasil tes ini merupakan gambaran kepribadian pada saat pengerjaan tes.</p>
        <p>* Interpretasi sebaiknya dilakukan oleh psikolog profesional.</p>
      </div>
    </div>

    <!-- Not Found -->
    <div v-else class="card bg-base-100 shadow-xl mx-4">
      <div class="card-body text-center py-12">
        <IconChartBarOff class="w-16 h-16 mx-auto text-error mb-4" />
        <h3 class="text-xl font-semibold mb-2">Hasil Tidak Ditemukan</h3>
        <p class="text-base-content/60 mb-4">Sesi ini belum memiliki hasil atau belum selesai</p>
        <button class="btn btn-primary" @click="goBack">
          <IconArrowLeft class="w-4 h-4 mr-2" />
          Kembali
        </button>
      </div>
    </div>

    <!-- Verify Notes Modal -->
    <dialog ref="verifyModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Verifikasi Hasil</h3>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Catatan Verifikasi (Opsional)</span>
          </label>
          <textarea 
            v-model="verifyNotes" 
            class="textarea textarea-bordered h-24 w-full resize-none" 
            placeholder="Tambahkan catatan verifikasi..."
          ></textarea>
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="closeVerifyModal">Batal</button>
          <button 
            class="btn btn-primary" 
            @click="confirmVerify"
            :disabled="verifying"
          >
            <span v-if="verifying" class="loading loading-spinner loading-sm"></span>
            <IconShieldCheck v-else class="w-4 h-4" />
            Verifikasi
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconArrowLeft,
  IconDownload,
  IconFileReport,
  IconClock,
  IconShieldCheck,
  IconAlertTriangle,
  IconAlertCircle,
  IconUser,
  IconClipboard,
  IconChartBarOff,
  IconTrendingUp,
  IconTrendingDown,
  IconFileSpreadsheet,
  IconFileTypePdf
} from '@tabler/icons-vue'
import { useSessions, usePsychologyReport } from '@/composables/psychology'
import { useNotification } from '@/composables/core/useNotification'

// Import PAPI data and functions
import {
  papiQuestions,
  papiNorms,
  calculatePapiScores,
  groupByAspect,
} from '@/data/papikostick'

const route = useRoute()
const router = useRouter()
const api = inject('api')
const { showSuccess, showError } = useNotification()
const { getSessionResult, verifyAndCalculate, formatDateTime } = useSessions()
const { 
  generating, 
  downloading, 
  reportInfo, 
  generateReport, 
  downloadReport, 
  checkReportStatus,
  isReportExpired,
  formatExpiry 
} = usePsychologyReport()

// State
const loading = ref(true)
const error = ref(null)
const resultData = ref(null)
const verifying = ref(false)

// Compute scale details from result data
const scaleDetails = computed(() => {
  // If result already has interpretation from backend
  if (resultData.value?.interpretation?.scales) {
    return resultData.value.interpretation.scales.map(s => ({
      code: s.scale,
      score: s.score,
      max: 9,
      percent: s.percentile / 100,
      level: s.level,
      label: s.level === 'low' ? 'Rendah' : s.level === 'high' ? 'Tinggi' : 'Sedang',
      title: s.label,
      narrative: s.narrative || '',
    })).sort((a, b) => b.score - a.score)
  }
  
  // Calculate from answers
  const answers = resultData.value?.answers || []
  if (!answers || (Array.isArray(answers) && !answers.length) || (typeof answers === 'object' && !Object.keys(answers).length)) {
    return []
  }
  
  // Transform answers to expected format
  let finalAnswers = []
  
  if (Array.isArray(answers)) {
    finalAnswers = answers.map(a => ({ 
      id: a.id || a.questionId, 
      answer: a.answer || a.pair || a.selected
    }))
  } else if (typeof answers === 'object') {
    finalAnswers = Object.entries(answers).map(([id, answer]) => {
      // Support new format: { answer: "A", duration: 8, timestamp: "..." }
      let finalAnswer = answer
      if (typeof answer === 'object' && answer?.answer) {
        finalAnswer = answer.answer
      } else if (typeof answer !== 'string') {
        finalAnswer = answer?.pair
      }
      
      return {
        id: parseInt(id),
        answer: finalAnswer
      }
    })
  }
  
  return calculatePapiScores(finalAnswers, papiQuestions)
})

// Top 5 scales (highest scores)
const topScales = computed(() => {
  return scaleDetails.value.slice(0, 5)
})

// Bottom 5 scales (lowest scores)
const lowScales = computed(() => {
  return [...scaleDetails.value].sort((a, b) => a.score - b.score).slice(0, 5)
})

// Group by aspect using norms
const normsByAspect = computed(() => {
  return groupByAspect(scaleDetails.value, papiNorms)
})

// Load result from API
const loadResult = async () => {
  loading.value = true
  error.value = null
  
  try {
    const sessionId = route.params.id
    const response = await getSessionResult(sessionId)
    resultData.value = response
  } catch (err) {
    console.error('Error loading result:', err)
    error.value = err.message || 'Gagal memuat hasil tes'
  } finally {
    loading.value = false
  }
}

// Navigation
const goBack = () => {
  router.push('/psychology/sessions')
}

// Format date
const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// Get sex label
const getSexLabel = (sex) => {
  if (sex === 'male' || sex === 'M') return 'Laki-laki'
  if (sex === 'female' || sex === 'F') return 'Perempuan'
  return '-'
}

// Get level badge class
const getLevelBadgeClass = (level) => {
  const classes = {
    low: 'badge-warning',
    medium: 'badge-info',
    high: 'badge-success'
  }
  return classes[level] || 'badge-ghost'
}

// Get progress class
const getProgressClass = (level) => {
  const classes = {
    low: 'progress-warning',
    medium: 'progress-info',
    high: 'progress-success'
  }
  return classes[level] || 'progress-primary'
}

// Verify modal
const verifyModal = ref(null)
const verifyNotes = ref('')

const verifyResult = () => {
  verifyNotes.value = ''
  verifyModal.value?.showModal()
}

const closeVerifyModal = () => {
  verifyModal.value?.close()
}

const confirmVerify = async () => {
  verifying.value = true
  try {
    await verifyAndCalculate(resultData.value.session.id, verifyNotes.value)
    closeVerifyModal()
    await loadResult()
  } catch (err) {
    // Error toast already shown by composable
  } finally {
    verifying.value = false
  }
}

// Generate Report
const handleGenerateReport = async () => {
  const sessionId = route.params.id
  await generateReport(sessionId)
}

// Download Report
const handleDownloadReport = async () => {
  await downloadReport()
}

// Check report status on load
const checkExistingReport = async () => {
  const sessionId = route.params.id
  await checkReportStatus(sessionId)
}

// Export functionality
const exportingXlsx = ref(false)
const exportingPdf = ref(false)

const canExportReport = computed(() => {
  const session = resultData.value?.session
  if (!session) return false
  
  const status = session.status || session.sessionStatus
  return status === 'completed' || status === 'verified'
})

const handleExportXlsx = async () => {
  const sessionId = route.params.id
  exportingXlsx.value = true
  try {
    const response = await api(`/psychology/reports/session/${sessionId}/export/xlsx`, {
      responseType: 'blob'
    })

    const blob = new Blob([response], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `papi-report-${sessionId}-${Date.now()}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    showSuccess('Laporan XLSX berhasil diunduh')
  } catch (err) {
    console.error('Export XLSX error:', err)
    showError('Gagal mengexport laporan XLSX')
  } finally {
    exportingXlsx.value = false
  }
}

const handleExportPdf = async () => {
  const sessionId = route.params.id
  exportingPdf.value = true
  try {
    const response = await api(`/psychology/reports/session/${sessionId}/export/pdf`, {
      responseType: 'blob'
    })

    const blob = new Blob([response], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `papi-report-${sessionId}-${Date.now()}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    showSuccess('Laporan PDF berhasil diunduh')
  } catch (err) {
    console.error('Export PDF error:', err)
    showError('Gagal mengexport laporan PDF')
  } finally {
    exportingPdf.value = false
  }
}

// Load on mount
onMounted(() => {
  loadResult()
  checkExistingReport()
})
</script>
