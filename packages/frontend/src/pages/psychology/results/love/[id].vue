<route lang="yaml">
name: psychology-results-love
meta:
  title: Hasil Love Language
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
    <div v-else-if="resultData && scoreData">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <button class="btn btn-ghost btn-circle" @click="goBack">
          <IconArrowLeft class="w-5 h-5" />
        </button>
        <div class="flex-1">
          <h1 class="text-3xl font-bold">Hasil: Love Language Test</h1>
          <p class="text-base-content/60 mt-1">
            {{ resultData.patient?.fullName || resultData.subject?.name || '-' }} - Tes Bahasa Cinta
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
          
          <!-- Download Report Button -->
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
                  <p class="font-semibold">Love Language</p>
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
                  <p class="font-semibold">{{ calculateDuration(resultData.session?.startedAt, resultData.session?.completedAt) }}</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Total Jawaban</p>
                  <p class="font-semibold">{{ scoreData.totalAnswered }}/{{ scoreData.totalQuestions }} soal</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Primary Love Language -->
          <div class="card shadow-xl" :style="{ backgroundColor: scoreData.primary?.color + '15' }">
            <div class="card-body">
              <div class="flex items-center gap-4 mb-4">
                <div class="w-16 h-16 rounded-full flex items-center justify-center" :style="{ backgroundColor: scoreData.primary?.color }">
                  <IconHeart class="w-8 h-8 text-white" />
                </div>
                <div>
                  <p class="text-sm text-base-content/60">Bahasa Cinta Utama Anda</p>
                  <h2 class="text-2xl font-bold" :style="{ color: scoreData.primary?.color }">
                    {{ scoreData.primary?.nameId }}
                  </h2>
                  <p class="text-sm text-base-content/70">{{ scoreData.primary?.name }}</p>
                </div>
                <div class="ml-auto text-right">
                  <p class="text-4xl font-bold" :style="{ color: scoreData.primary?.color }">
                    {{ scoreData.primary?.percentage }}%
                  </p>
                  <p class="text-sm text-base-content/60">{{ scoreData.primary?.count }} jawaban</p>
                </div>
              </div>
              <p class="text-base-content/80">{{ scoreData.primary?.descriptionId }}</p>
            </div>
          </div>

          <!-- Secondary Love Language -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <div class="flex items-center gap-4 mb-4">
                <div class="w-12 h-12 rounded-full flex items-center justify-center" :style="{ backgroundColor: scoreData.secondary?.color + '30' }">
                  <IconHeartPlus class="w-6 h-6" :style="{ color: scoreData.secondary?.color }" />
                </div>
                <div>
                  <p class="text-sm text-base-content/60">Bahasa Cinta Sekunder</p>
                  <h3 class="text-xl font-bold">{{ scoreData.secondary?.nameId }}</h3>
                  <p class="text-sm text-base-content/70">{{ scoreData.secondary?.name }}</p>
                </div>
                <div class="ml-auto text-right">
                  <p class="text-2xl font-bold">{{ scoreData.secondary?.percentage }}%</p>
                  <p class="text-sm text-base-content/60">{{ scoreData.secondary?.count }} jawaban</p>
                </div>
              </div>
              <p class="text-sm text-base-content/70">{{ scoreData.secondary?.descriptionId }}</p>
            </div>
          </div>

          <!-- All Love Languages Chart -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Distribusi Bahasa Cinta</h2>
              <div class="space-y-4">
                <div 
                  v-for="(lang, index) in scoreData.results" 
                  :key="lang.code"
                  class="space-y-2"
                >
                  <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                      <span class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" :style="{ backgroundColor: lang.color }">
                        {{ lang.code }}
                      </span>
                      <span class="font-medium">{{ lang.nameId }}</span>
                      <span v-if="index === 0" class="badge badge-primary badge-sm">Utama</span>
                      <span v-else-if="index === 1" class="badge badge-secondary badge-sm">Sekunder</span>
                    </div>
                    <span class="font-bold">{{ lang.percentage }}% ({{ lang.count }})</span>
                  </div>
                  <div class="w-full bg-base-200 rounded-full h-4">
                    <div 
                      class="h-4 rounded-full transition-all duration-500"
                      :style="{ 
                        width: lang.percentage + '%', 
                        backgroundColor: lang.color 
                      }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Interpretation -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">
                <IconBulb class="w-5 h-5 text-warning" />
                Interpretasi
              </h2>
              <div class="prose max-w-none">
                <p class="text-base-content/80">{{ interpretation?.interpretationId }}</p>
              </div>
              <div class="divider"></div>
              <div class="space-y-4">
                <div>
                  <h4 class="font-semibold mb-2">Karakteristik {{ scoreData.primary?.nameId }}:</h4>
                  <ul class="list-disc list-inside space-y-1 text-sm text-base-content/70">
                    <li v-for="(char, idx) in scoreData.primary?.characteristicsId" :key="idx">{{ char }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Detail per Language -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Detail Semua Bahasa Cinta</h2>
              <div class="overflow-x-auto">
                <table class="table table-zebra">
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Bahasa Cinta</th>
                      <th>Jumlah</th>
                      <th>Persentase</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(lang, idx) in scoreData.results" :key="lang.code">
                      <td>
                        <span 
                          class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                          :style="{ backgroundColor: lang.color }"
                        >
                          {{ lang.code }}
                        </span>
                      </td>
                      <td>
                        <div>
                          <p class="font-semibold">{{ lang.nameId }}</p>
                          <p class="text-xs text-base-content/60">{{ lang.name }}</p>
                        </div>
                      </td>
                      <td class="font-bold">{{ lang.count }}</td>
                      <td>
                        <div class="flex items-center gap-2">
                          <div class="w-24 bg-base-200 rounded-full h-2">
                            <div 
                              class="h-2 rounded-full"
                              :style="{ 
                                width: lang.percentage + '%', 
                                backgroundColor: lang.color 
                              }"
                            ></div>
                          </div>
                          <span class="font-mono">{{ lang.percentage }}%</span>
                        </div>
                      </td>
                      <td>
                        <span 
                          class="badge"
                          :class="{
                            'badge-primary': idx === 0,
                            'badge-secondary': idx === 1,
                            'badge-ghost': idx > 1
                          }"
                        >
                          {{ idx === 0 ? 'Utama' : idx === 1 ? 'Sekunder' : 'Lainnya' }}
                        </span>
                      </td>
                    </tr>
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
              <h2 class="card-title mb-4">Peserta</h2>
              <div class="flex items-center gap-4 mb-4">
                <div class="w-14 h-14 rounded-full bg-primary text-primary-content flex items-center justify-center shrink-0">
                  <span class="text-xl font-bold leading-none">
                    {{ (resultData?.patient?.fullName || resultData?.subject?.name || 'X').charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div>
                  <h3 class="font-bold uppercase">{{ resultData?.patient?.fullName || resultData?.subject?.name || '-' }}</h3>
                  <p class="text-sm text-base-content/60">{{ resultData?.patient?.email || resultData?.subject?.email || '-' }}</p>
                </div>
              </div>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-base-content/60">Telepon</span>
                  <span>{{ resultData?.patient?.phone || resultData?.subject?.phone || '-' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Tanggal Lahir</span>
                  <span>{{ resultData?.patient?.birthDate ? formatDate(resultData.patient.birthDate) : (resultData?.subject?.birthDate ? formatDate(resultData.subject.birthDate) : '-') }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Jenis Kelamin</span>
                  <span>{{ getSexLabel(resultData?.patient?.sex || resultData?.subject?.sex) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Primary Language Card -->
          <div class="card shadow-xl text-white" :style="{ backgroundColor: scoreData.primary?.color }">
            <div class="card-body text-center">
              <IconHeart class="w-12 h-12 mx-auto mb-2" />
              <h3 class="text-lg font-bold">Bahasa Cinta Utama</h3>
              <p class="text-2xl font-bold">{{ scoreData.primary?.nameId }}</p>
              <p class="text-4xl font-bold">{{ scoreData.primary?.percentage }}%</p>
            </div>
          </div>

          <!-- Verification Status -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Status Verifikasi</h2>
              <div 
                class="alert"
                :class="resultData?.session?.verifiedAt ? 'alert-success' : 'alert-warning'"
              >
                <IconShieldCheck v-if="resultData?.session?.verifiedAt" class="w-6 h-6" />
                <IconAlertTriangle v-else class="w-6 h-6" />
                <div>
                  <p class="font-medium">
                    {{ resultData?.session?.verifiedAt ? 'Terverifikasi' : 'Belum Diverifikasi' }}
                  </p>
                  <p v-if="resultData?.session?.verifiedAt" class="text-sm">
                    {{ formatDateTime(resultData.session.verifiedAt) }}
                  </p>
                </div>
              </div>
              <button 
                v-if="!resultData?.session?.verifiedAt"
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

          <!-- Quick Actions -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Aksi Cepat</h2>
              <div class="space-y-2">
                <router-link 
                  v-if="resultData?.patient?.id"
                  :to="`/psychology/patients/${resultData.patient.id}`"
                  class="btn btn-ghost btn-block justify-start"
                >
                  <IconUser class="w-4 h-4" />
                  Lihat Profil Pasien
                </router-link>
                <router-link 
                  :to="`/psychology/sessions`"
                  class="btn btn-ghost btn-block justify-start"
                >
                  <IconClipboard class="w-4 h-4" />
                  Kembali ke Daftar Sesi
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  calculateLoveLanguageScores, 
  getInterpretation,
  questionScaleMapping 
} from '@/data/love/loveConfig.js'
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
  IconHeart,
  IconHeartPlus,
  IconBulb,
  IconFileSpreadsheet,
  IconFileTypePdf
} from '@tabler/icons-vue'
import { usePsychologyReport } from '@/composables/psychology'

const api = inject('api')
const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref(null)
const resultData = ref(null)
const scoreData = ref(null)
const interpretation = ref(null)
const verifying = ref(false)

// PDF Report
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

// Export functionality
const exportingXlsx = ref(false)
const exportingPdf = ref(false)

const canExportReport = computed(() => {
  const session = resultData.value?.session || resultData.value
  if (!session) return false
  
  const status = session.status || session.sessionStatus
  return status === 'completed' || status === 'verified'
})

const loadResult = async () => {
  const sessionId = route.params.id
  if (!sessionId) {
    error.value = 'Session ID tidak ditemukan'
    loading.value = false
    return
  }
  
  loading.value = true
  error.value = null
  
  try {
    const response = await api(`/psychology/sessions/${sessionId}/result`)
    resultData.value = response?.data || response
    
    // Calculate scores from answers
    // Use questions from testType config if available (for proper scale mapping)
    const answers = resultData.value?.answers || {}
    const questions = resultData.value?.testType?.questions || null
    scoreData.value = calculateLoveLanguageScores(answers, questions)
    interpretation.value = getInterpretation(scoreData.value)
    
    // Check for existing report
    await checkReportStatus(sessionId)
  } catch (e) {
    console.error('Failed to load Love Language result:', e)
    error.value = e?.message || 'Gagal memuat hasil tes Love Language'
  } finally {
    loading.value = false
  }
}

const goBack = () => router.push('/psychology/sessions')

const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const calculateDuration = (startedAt, completedAt) => {
  if (!startedAt || !completedAt) return '-'
  const start = new Date(startedAt)
  const end = new Date(completedAt)
  const diffMs = end - start
  const diffMins = Math.floor(diffMs / 60000)
  return `${diffMins} menit`
}

const getSexLabel = (sex) => {
  if (sex === 'male' || sex === 'M') return 'Laki-laki'
  if (sex === 'female' || sex === 'F') return 'Perempuan'
  return '-'
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

// Export XLSX
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
    link.download = `love-language-report-${sessionId}-${Date.now()}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Failed to export XLSX:', e)
  } finally {
    exportingXlsx.value = false
  }
}

// Export PDF
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
    link.download = `love-language-report-${sessionId}-${Date.now()}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Failed to export PDF:', e)
  } finally {
    exportingPdf.value = false
  }
}

// Verify Result
const verifyResult = async () => {
  const sessionId = route.params.id
  verifying.value = true
  try {
    await api(`/psychology/sessions/${sessionId}/verify`, {
      method: 'POST'
    })
    await loadResult()
  } catch (e) {
    console.error('Failed to verify result:', e)
  } finally {
    verifying.value = false
  }
}

onMounted(() => {
  loadResult()
})
</script>
