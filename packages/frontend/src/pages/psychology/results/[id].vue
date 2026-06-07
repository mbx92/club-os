<route lang="yaml">
meta:
  title: Hasil Tes
  layout: default
  requiresModule: psychology
</route>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Redirecting to specific test result page -->
    <div v-else-if="redirecting" class="flex flex-col justify-center items-center py-12 gap-4">
      <span class="loading loading-spinner loading-lg"></span>
      <p class="text-base-content/60">Mengalihkan ke halaman hasil {{ testTypeName }}...</p>
    </div>

    <!-- Result Details (fallback for tests without specific page) -->
    <div v-else-if="resultData">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <button class="btn btn-ghost btn-circle" @click="goBack">
          <IconArrowLeft class="w-5 h-5" />
        </button>
        <div class="flex-1">
          <h1 class="text-3xl font-bold">Hasil: {{ resultData.testType?.name }}</h1>
          <p class="text-base-content/60 mt-1">{{ resultData.patient?.fullName }} - {{ resultData.testType?.code }}</p>
        </div>
        <div class="flex gap-2 items-center flex-wrap">
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
                  <p class="font-semibold">{{ resultData.testType?.name }}</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Kategori</p>
                  <p class="font-semibold capitalize">{{ resultData.testType?.category }}</p>
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
                  <p class="font-semibold">{{ resultData.session?.duration }} menit</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Total Jawaban</p>
                  <p class="font-semibold">{{ Object.keys(resultData.answers || {}).length }} soal</p>
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
                    v-for="scale in resultData.interpretation?.topScales" 
                    :key="scale.scale"
                    class="flex items-center justify-between p-3 bg-success/10 rounded-lg"
                  >
                    <div>
                      <span class="font-bold text-success">{{ scale.scale }}</span>
                      <span class="text-sm ml-2">{{ scale.label }}</span>
                    </div>
                    <div class="text-right">
                      <span class="font-bold text-lg">{{ scale.score }}</span>
                      <span class="text-xs text-base-content/60 ml-1">({{ scale.percentile }}%)</span>
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
                    v-for="scale in resultData.interpretation?.lowScales" 
                    :key="scale.scale"
                    class="flex items-center justify-between p-3 bg-warning/10 rounded-lg"
                  >
                    <div>
                      <span class="font-bold text-warning">{{ scale.scale }}</span>
                      <span class="text-sm ml-2">{{ scale.label }}</span>
                    </div>
                    <div class="text-right">
                      <span class="font-bold text-lg">{{ scale.score }}</span>
                      <span class="text-xs text-base-content/60 ml-1">({{ scale.percentile }}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Score Visualization -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Visualisasi Skor</h2>
              <ScoreChart 
                v-if="resultData.interpretation?.scales" 
                :scores="resultData.interpretation.scales"
                title=""
                :sort-by="'scale'"
                :sort-order="'asc'"
              />
              <p v-else class="text-base-content/60 text-center py-8">Tidak ada data skor</p>
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
                    <tr v-for="scale in resultData.interpretation?.scales" :key="scale.scale">
                      <td class="font-bold">{{ scale.scale }}</td>
                      <td>{{ scale.label }}</td>
                      <td>
                        <div class="flex items-center gap-2">
                          <progress 
                            class="progress w-16" 
                            :class="getProgressClass(scale.level)"
                            :value="scale.score" 
                            max="9"
                          ></progress>
                          <span class="font-bold">{{ scale.score }}</span>
                        </div>
                      </td>
                      <td>{{ scale.percentile }}%</td>
                      <td>
                        <div class="badge" :class="getLevelBadgeClass(scale.level)">
                          {{ getLevelLabel(scale.level) }}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Profile Summary -->
          <div v-if="resultData.interpretation?.profile" class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Profil Psikologis</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Work Style -->
                <div class="p-4 bg-base-200 rounded-lg">
                  <h3 class="font-bold mb-3 flex items-center gap-2">
                    <IconBriefcase class="w-4 h-4" />
                    Gaya Kerja
                  </h3>
                  <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                      <span>Pace (Kecepatan)</span>
                      <span class="font-bold">{{ resultData.interpretation.profile.workStyle?.pace }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Vigor (Semangat)</span>
                      <span class="font-bold">{{ resultData.interpretation.profile.workStyle?.vigor }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Detail</span>
                      <span class="font-bold">{{ resultData.interpretation.profile.workStyle?.detail }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Hard Working</span>
                      <span class="font-bold">{{ resultData.interpretation.profile.workStyle?.hardWorking }}</span>
                    </div>
                  </div>
                </div>

                <!-- Leadership -->
                <div class="p-4 bg-base-200 rounded-lg">
                  <h3 class="font-bold mb-3 flex items-center gap-2">
                    <IconCrown class="w-4 h-4" />
                    Kepemimpinan
                  </h3>
                  <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                      <span>Leadership</span>
                      <span class="font-bold">{{ resultData.interpretation.profile.leadership?.leadership }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Control</span>
                      <span class="font-bold">{{ resultData.interpretation.profile.leadership?.control }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Decision Making</span>
                      <span class="font-bold">{{ resultData.interpretation.profile.leadership?.decisionMaking }}</span>
                    </div>
                  </div>
                </div>

                <!-- Social -->
                <div class="p-4 bg-base-200 rounded-lg">
                  <h3 class="font-bold mb-3 flex items-center gap-2">
                    <IconUsers class="w-4 h-4" />
                    Sosial
                  </h3>
                  <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                      <span>Social Extension</span>
                      <span class="font-bold">{{ resultData.interpretation.profile.social?.socialExtension }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Attention</span>
                      <span class="font-bold">{{ resultData.interpretation.profile.social?.attention }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Closeness</span>
                      <span class="font-bold">{{ resultData.interpretation.profile.social?.closeness }}</span>
                    </div>
                  </div>
                </div>

                <!-- Motivation -->
                <div class="p-4 bg-base-200 rounded-lg">
                  <h3 class="font-bold mb-3 flex items-center gap-2">
                    <IconTarget class="w-4 h-4" />
                    Motivasi
                  </h3>
                  <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                      <span>Achievement</span>
                      <span class="font-bold">{{ resultData.interpretation.profile.motivation?.achievement }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Change</span>
                      <span class="font-bold">{{ resultData.interpretation.profile.motivation?.change }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Independence</span>
                      <span class="font-bold">{{ resultData.interpretation.profile.motivation?.independence }}</span>
                    </div>
                  </div>
                </div>
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
                  <span class="text-xl font-bold leading-none">{{ resultData.patient?.fullName?.charAt(0).toUpperCase() }}</span>
                </div>
                <div>
                  <h3 class="font-bold uppercase">{{ resultData.patient?.fullName }}</h3>
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
                  v-for="(value, key) in resultData.scores" 
                  :key="key"
                  class="p-2 bg-base-200 rounded-lg"
                >
                  <div class="font-bold text-primary">{{ key }}</div>
                  <div class="text-lg font-bold">{{ value }}</div>
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
                  :to="`/psychology/patients/${resultData.patient?.id}`"
                  class="btn btn-ghost btn-block justify-start"
                >
                  <IconUser class="w-4 h-4" />
                  Lihat Profil Pasien
                </router-link>
                <router-link 
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
    </div>

    <!-- Not Found -->
    <div v-else class="card bg-base-100 shadow-xl">
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
  IconUser,
  IconClipboard,
  IconChartBarOff,
  IconTrendingUp,
  IconTrendingDown,
  IconBriefcase,
  IconCrown,
  IconUsers,
  IconTarget,
  IconFileSpreadsheet,
  IconFileTypePdf
} from '@tabler/icons-vue'
import { useSessions, usePsychologyReport } from '@/composables/psychology'
import ScoreChart from '@/components/psychology/ScoreChart.vue'
import { useNotification } from '@/composables/core/useNotification'
import { TEST_TYPE_ROUTES, detectTestType, getTestTypeName } from '@/utils/psychology/testTypeRouting'

const route = useRoute()
const router = useRouter()
const { showSuccess, showError } = useNotification()

const {
  loading,
  getSessionResult,
  verifyAndCalculate,
  formatDateTime
} = useSessions()

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

const resultData = ref(null)
const verifying = ref(false)
const redirecting = ref(false)

// Get display name for test type
const testTypeName = computed(() => getTestTypeName(resultData.value))

const loadResult = async () => {
  const sessionId = route.params.id
  try {
    const response = await getSessionResult(sessionId)
    resultData.value = response
    
    // Check if we should redirect to specific test result page
    const testType = detectTestType(response)
    if (testType && TEST_TYPE_ROUTES[testType]) {
      redirecting.value = true
      // Small delay for UX
      setTimeout(() => {
        router.replace(`${TEST_TYPE_ROUTES[testType]}/${sessionId}`)
      }, 500)
    }
  } catch (error) {
    console.error('Error loading result:', error)
  }
}

const goBack = () => {
  router.push('/psychology/sessions')
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const getSexLabel = (sex) => {
  if (sex === 'male' || sex === 'M') return 'Laki-laki'
  if (sex === 'female' || sex === 'F') return 'Perempuan'
  return '-'
}

const getLevelLabel = (level) => {
  const labels = {
    low: 'Rendah',
    medium: 'Sedang',
    high: 'Tinggi'
  }
  return labels[level] || level
}

const getLevelBadgeClass = (level) => {
  const classes = {
    low: 'badge-warning',
    medium: 'badge-info',
    high: 'badge-success'
  }
  return classes[level] || 'badge-ghost'
}

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
const api = inject('api')
const exportingXlsx = ref(false)
const exportingPdf = ref(false)

// Check if user can export (session completed/verified and has read permission)
const canExportReport = computed(() => {
  const session = resultData.value?.session
  if (!session) return false
  
  const status = session.status || session.sessionStatus
  return status === 'completed' || status === 'verified'
})

// Export XLSX handler
const handleExportXlsx = async () => {
  const sessionId = route.params.id
  if (!sessionId) {
    showError('Session ID tidak tersedia')
    return
  }

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
    link.download = `psychology-report-${sessionId}-${Date.now()}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    showSuccess('Laporan XLSX berhasil diunduh')
  } catch (error) {
    console.error('Export XLSX error:', error)
    const message = error?.data?.message || error?.message || 'Gagal mengexport laporan XLSX'
    showError(message)
  } finally {
    exportingXlsx.value = false
  }
}

// Export PDF handler
const handleExportPdf = async () => {
  const sessionId = route.params.id
  if (!sessionId) {
    showError('Session ID tidak tersedia')
    return
  }

  exportingPdf.value = true
  try {
    const response = await api(`/psychology/reports/session/${sessionId}/export/pdf`, {
      responseType: 'blob'
    })

    const blob = new Blob([response], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `psychology-report-${sessionId}-${Date.now()}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    showSuccess('Laporan PDF berhasil diunduh')
  } catch (error) {
    console.error('Export PDF error:', error)
    const message = error?.data?.message || error?.message || 'Gagal mengexport laporan PDF'
    showError(message)
  } finally {
    exportingPdf.value = false
  }
}

onMounted(() => {
  loadResult()
  checkExistingReport()
})
</script>
