<route lang="yaml">
name: psychology-results-cfit
meta:
  title: Hasil CFIT
  layout: default
  public: false
  requiresModule: psychology
  action: read
  subject: Result
</route>

<template>
  <div class="space-y-6">
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <IconChartBarOff class="w-16 h-16 mx-auto text-error mb-4" />
        <h3 class="text-xl font-semibold mb-2">Gagal Memuat Hasil</h3>
        <p class="text-base-content/60 mb-4">{{ error }}</p>
        <button class="btn btn-primary" @click="goBack">
          <IconArrowLeft class="w-4 h-4 mr-2" />
          Kembali
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <template v-else-if="resultData">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <button class="btn btn-ghost btn-circle" @click="goBack">
          <IconArrowLeft class="w-5 h-5" />
        </button>
        <div class="flex-1">
          <h1 class="text-3xl font-bold">Hasil: CFIT</h1>
          <p class="text-base-content/60 mt-1">
            {{ resultData.order?.patient?.fullName || '-' }} - Culture Fair Intelligence Test
          </p>
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
            :disabled="generatingReport"
          >
            <span v-if="generatingReport" class="loading loading-spinner loading-sm"></span>
            <IconFileReport v-else class="w-4 h-4" />
            <span class="hidden sm:inline">{{ generatingReport ? 'Generating...' : 'Generate Report' }}</span>
          </button>
          
          <!-- Download Report Button -->
          <button 
            v-if="reportInfo?.cacheId && !isReportExpired()"
            class="btn btn-outline btn-success btn-sm" 
            @click="handleDownloadReport"
            :disabled="downloadingReport"
          >
            <span v-if="downloadingReport" class="loading loading-spinner loading-sm"></span>
            <IconDownload v-else class="w-4 h-4" />
            <span class="hidden sm:inline">{{ downloadingReport ? 'Downloading...' : 'Download PDF' }}</span>
          </button>
          
          <!-- Report Info -->
          <div v-if="reportInfo?.expiresAt && !isReportExpired()" class="tooltip tooltip-left" :data-tip="`Berlaku: ${formatReportExpiry(reportInfo.expiresAt)}`">
            <span class="badge badge-ghost text-xs">
              <IconClock class="w-3 h-3 mr-1" />
              <span class="hidden sm:inline">{{ formatReportExpiry(reportInfo.expiresAt) }}</span>
            </span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content (Left 2 columns) -->
        <div class="lg:col-span-2 space-y-6">
          <!-- IQ Score Card (Hero Section) -->
          <div class="card bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-xl">
            <div class="card-body items-center text-center py-8">
              <div class="flex flex-col items-center gap-4">
                <!-- IQ Circle -->
                <div class="relative">
                  <svg class="w-48 h-48 transform -rotate-90">
                    <!-- Background circle -->
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="rgba(255,255,255,0.2)"
                      stroke-width="8"
                      fill="none"
                    />
                    <!-- Progress circle -->
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      :stroke="getClassificationColor(resultData.scores?.classification)"
                      stroke-width="8"
                      fill="none"
                      stroke-linecap="round"
                      :stroke-dasharray="circumference"
                      :stroke-dashoffset="circumference - (resultData.scores?.totalPercentile / 100) * circumference"
                      class="transition-all duration-1000"
                    />
                  </svg>
                  <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <div class="text-6xl font-bold">{{ resultData.scores?.iqScore || '-' }}</div>
                    <div class="text-sm opacity-90">IQ Score</div>
                  </div>
                </div>

                <!-- Classification -->
                <div class="space-y-2">
                  <h3 class="text-2xl font-bold">{{ resultData.scores?.classification || '-' }}</h3>
                  <p class="text-white/90 text-lg">
                    {{ resultData.interpretation?.overall?.classificationDescription || '-' }}
                  </p>
                </div>

                <!-- Percentile -->
                <div class="badge badge-lg bg-white/20 border-0 text-white">
                  <IconTrendingUp class="w-4 h-4 mr-1" />
                  Percentile: {{ resultData.scores?.totalPercentile || 0 }}%
                </div>
              </div>
            </div>
          </div>

          <!-- Raw Score Summary -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">
                <IconChartBar class="w-5 h-5" />
                Raw Score
              </h2>
              <div class="flex items-center gap-4">
                <div class="flex-1">
                  <div class="flex justify-between text-sm mb-2">
                    <span>Total Correct Answers</span>
                    <span class="font-semibold">
                      {{ resultData.scores?.rawScore || 0 }} / {{ resultData.scores?.maxRawScore || 46 }}
                    </span>
                  </div>
                  <progress 
                    class="progress progress-primary w-full h-3" 
                    :value="resultData.scores?.rawScore || 0" 
                    :max="resultData.scores?.maxRawScore || 46"
                  ></progress>
                </div>
                <div class="text-center min-w-24">
                  <div class="text-3xl font-bold text-primary">
                    {{ Math.round(((resultData.scores?.rawScore || 0) / (resultData.scores?.maxRawScore || 46)) * 100) }}%
                  </div>
                  <div class="text-xs text-base-content/60">Accuracy</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Test Info -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">
                <IconFileText class="w-5 h-5" />
                Informasi Tes
              </h2>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p class="text-base-content/60 text-sm">Jenis Tes</p>
                  <p class="font-semibold">CFIT</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Kategori</p>
                  <p class="font-semibold capitalize">Intelligence</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Waktu Mulai</p>
                  <p class="font-semibold">{{ formatDateTime(resultData.startedAt) }}</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Waktu Selesai</p>
                  <p class="font-semibold">{{ formatDateTime(resultData.completedAt) }}</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Durasi</p>
                  <p class="font-semibold">{{ calculateDuration() }} menit</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Total Soal</p>
                  <p class="font-semibold">{{ resultData.scores?.maxRawScore || 46 }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Subtest Breakdown -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">
                <IconBrain class="w-5 h-5" />
                Subtest Analysis
              </h2>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Series -->
                <div 
                  class="card border-2"
                  :class="getSubtestBorderClass('series')"
                >
                  <div class="card-body p-4">
                    <div class="flex items-center justify-between mb-3">
                      <h3 class="font-semibold text-lg">Series</h3>
                      <div 
                        class="badge"
                        :class="getSubtestBadgeClass('series')"
                      >
                        {{ getSubtestLevel(resultData.interpretation?.subtests?.series?.percentage) }}
                      </div>
                    </div>
                    
                    <!-- Circular Progress -->
                    <div class="flex items-center gap-4">
                      <div class="relative w-20 h-20">
                        <svg class="w-20 h-20 transform -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            stroke-width="6"
                            fill="none"
                            class="text-base-200"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            :stroke="getSubtestColor('series')"
                            stroke-width="6"
                            fill="none"
                            stroke-linecap="round"
                            :stroke-dasharray="226"
                            :stroke-dashoffset="226 - ((resultData.interpretation?.subtests?.series?.percentage || 0) / 100) * 226"
                          />
                        </svg>
                        <div class="absolute inset-0 flex items-center justify-center text-sm font-bold">
                          {{ resultData.interpretation?.subtests?.series?.percentage || 0 }}%
                        </div>
                      </div>
                      
                      <div class="flex-1">
                        <div class="text-2xl font-bold">
                          {{ resultData.scores?.subtestScores?.series || 0 }} / 
                          {{ resultData.interpretation?.subtests?.series?.maxScore || 12 }}
                        </div>
                        <p class="text-xs text-base-content/60 mt-1">
                          {{ resultData.interpretation?.subtests?.series?.description || 'Mengenali pola dan melanjutkan urutan' }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Classification -->
                <div 
                  class="card border-2"
                  :class="getSubtestBorderClass('classification')"
                >
                  <div class="card-body p-4">
                    <div class="flex items-center justify-between mb-3">
                      <h3 class="font-semibold text-lg">Classification</h3>
                      <div 
                        class="badge"
                        :class="getSubtestBadgeClass('classification')"
                      >
                        {{ getSubtestLevel(resultData.interpretation?.subtests?.classification?.percentage) }}
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-4">
                      <div class="relative w-20 h-20">
                        <svg class="w-20 h-20 transform -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            stroke-width="6"
                            fill="none"
                            class="text-base-200"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            :stroke="getSubtestColor('classification')"
                            stroke-width="6"
                            fill="none"
                            stroke-linecap="round"
                            :stroke-dasharray="226"
                            :stroke-dashoffset="226 - ((resultData.interpretation?.subtests?.classification?.percentage || 0) / 100) * 226"
                          />
                        </svg>
                        <div class="absolute inset-0 flex items-center justify-center text-sm font-bold">
                          {{ resultData.interpretation?.subtests?.classification?.percentage || 0 }}%
                        </div>
                      </div>
                      
                      <div class="flex-1">
                        <div class="text-2xl font-bold">
                          {{ resultData.scores?.subtestScores?.classification || 0 }} / 
                          {{ resultData.interpretation?.subtests?.classification?.maxScore || 14 }}
                        </div>
                        <p class="text-xs text-base-content/60 mt-1">
                          {{ resultData.interpretation?.subtests?.classification?.description || 'Mengklasifikasi dan membedakan objek' }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Matrices -->
                <div 
                  class="card border-2"
                  :class="getSubtestBorderClass('matrices')"
                >
                  <div class="card-body p-4">
                    <div class="flex items-center justify-between mb-3">
                      <h3 class="font-semibold text-lg">Matrices</h3>
                      <div 
                        class="badge"
                        :class="getSubtestBadgeClass('matrices')"
                      >
                        {{ getSubtestLevel(resultData.interpretation?.subtests?.matrices?.percentage) }}
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-4">
                      <div class="relative w-20 h-20">
                        <svg class="w-20 h-20 transform -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            stroke-width="6"
                            fill="none"
                            class="text-base-200"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            :stroke="getSubtestColor('matrices')"
                            stroke-width="6"
                            fill="none"
                            stroke-linecap="round"
                            :stroke-dasharray="226"
                            :stroke-dashoffset="226 - ((resultData.interpretation?.subtests?.matrices?.percentage || 0) / 100) * 226"
                          />
                        </svg>
                        <div class="absolute inset-0 flex items-center justify-center text-sm font-bold">
                          {{ resultData.interpretation?.subtests?.matrices?.percentage || 0 }}%
                        </div>
                      </div>
                      
                      <div class="flex-1">
                        <div class="text-2xl font-bold">
                          {{ resultData.scores?.subtestScores?.matrices || 0 }} / 
                          {{ resultData.interpretation?.subtests?.matrices?.maxScore || 12 }}
                        </div>
                        <p class="text-xs text-base-content/60 mt-1">
                          {{ resultData.interpretation?.subtests?.matrices?.description || 'Berpikir analogis dan melengkapi pola' }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Topology -->
                <div 
                  class="card border-2"
                  :class="getSubtestBorderClass('topology')"
                >
                  <div class="card-body p-4">
                    <div class="flex items-center justify-between mb-3">
                      <h3 class="font-semibold text-lg">Topology</h3>
                      <div 
                        class="badge"
                        :class="getSubtestBadgeClass('topology')"
                      >
                        {{ getSubtestLevel(resultData.interpretation?.subtests?.topology?.percentage) }}
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-4">
                      <div class="relative w-20 h-20">
                        <svg class="w-20 h-20 transform -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            stroke-width="6"
                            fill="none"
                            class="text-base-200"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            :stroke="getSubtestColor('topology')"
                            stroke-width="6"
                            fill="none"
                            stroke-linecap="round"
                            :stroke-dasharray="226"
                            :stroke-dashoffset="226 - ((resultData.interpretation?.subtests?.topology?.percentage || 0) / 100) * 226"
                          />
                        </svg>
                        <div class="absolute inset-0 flex items-center justify-center text-sm font-bold">
                          {{ resultData.interpretation?.subtests?.topology?.percentage || 0 }}%
                        </div>
                      </div>
                      
                      <div class="flex-1">
                        <div class="text-2xl font-bold">
                          {{ resultData.scores?.subtestScores?.topology || 0 }} / 
                          {{ resultData.interpretation?.subtests?.topology?.maxScore || 8 }}
                        </div>
                        <p class="text-xs text-base-content/60 mt-1">
                          {{ resultData.interpretation?.subtests?.topology?.description || 'Memahami hubungan spasial' }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Age-Based Information -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">
                <IconCalendar class="w-5 h-5" />
                Age-Based Scoring
              </h2>
              <div class="alert alert-info">
                <IconInfoCircle class="w-5 h-5" />
                <div>
                  <p class="font-medium">
                    Patient Age: {{ formatAge(resultData.interpretation?.ageInfo?.ageInMonths) }}
                  </p>
                  <p class="text-sm mt-1">
                    Norm Group: {{ formatAgeGroup(resultData.interpretation?.ageInfo?.ageGroup) }}
                  </p>
                  <p class="text-xs mt-2 opacity-80">
                    <i>IQ score is calculated based on age-specific norms to ensure fair assessment</i>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar (Right column) -->
        <div class="space-y-6">
          <!-- Patient Info -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title text-lg mb-4">
                <IconUser class="w-5 h-5" />
                Informasi Pasien
              </h2>
              <div class="space-y-3">
                <div>
                  <p class="text-base-content/60 text-sm">Nama Lengkap</p>
                  <p class="font-semibold uppercase">{{ resultData.order?.patient?.fullName || '-' }}</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Tanggal Lahir</p>
                  <p class="font-semibold">{{ formatDate(resultData.order?.patient?.birthDate) }}</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Usia</p>
                  <p class="font-semibold">{{ resultData.order?.patient?.age || '-' }} tahun</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Jenis Kelamin</p>
                  <p class="font-semibold capitalize">{{ resultData.order?.patient?.sex === 'male' ? 'Laki-laki' : 'Perempuan' }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Session Info -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title text-lg mb-4">
                <IconClipboardList class="w-5 h-5" />
                Session Info
              </h2>
              <div class="space-y-3">
                <div>
                  <p class="text-base-content/60 text-sm">Session Number</p>
                  <p class="font-semibold">{{ resultData.sessionNumber || '-' }}</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Status</p>
                  <div class="badge badge-success">{{ resultData.status || '-' }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Verification Status -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title text-lg mb-4">
                <IconShieldCheck class="w-5 h-5" />
                Status Verifikasi
              </h2>
              <div 
                class="alert"
                :class="resultData.verifiedAt ? 'alert-success' : 'alert-warning'"
              >
                <IconShieldCheck v-if="resultData.verifiedAt" class="w-6 h-6" />
                <IconAlertTriangle v-else class="w-6 h-6" />
                <div>
                  <p class="font-medium">
                    {{ resultData.verifiedAt ? 'Terverifikasi' : 'Belum Diverifikasi' }}
                  </p>
                  <p v-if="resultData.verifiedAt" class="text-sm">
                    {{ formatDateTime(resultData.verifiedAt) }}
                  </p>
                  <p v-if="resultData.verifiedBy" class="text-xs text-base-content/60 mt-1">
                    Oleh: {{ resultData.verifiedBy?.fullName || resultData.verifiedBy?.name || '-' }}
                  </p>
                </div>
              </div>
              <button 
                v-if="!resultData.verifiedAt"
                class="btn btn-primary btn-block mt-4"
                @click="openVerifyModal"
                :disabled="verifying"
              >
                <span v-if="verifying" class="loading loading-spinner loading-sm"></span>
                <IconShieldCheck v-else class="w-4 h-4" />
                Verifikasi Hasil
              </button>
            </div>
          </div>

          <!-- IQ Classification Reference -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title text-lg mb-4">
                <IconList class="w-5 h-5" />
                IQ Classification
              </h2>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between items-center">
                  <span>Genius</span>
                  <span class="badge badge-sm" style="background-color: #9c27b0; color: white;">170+</span>
                </div>
                <div class="flex justify-between items-center">
                  <span>Very Superior</span>
                  <span class="badge badge-sm" style="background-color: #673ab7; color: white;">140-169</span>
                </div>
                <div class="flex justify-between items-center">
                  <span>Superior</span>
                  <span class="badge badge-sm" style="background-color: #3f51b5; color: white;">120-139</span>
                </div>
                <div class="flex justify-between items-center">
                  <span>High Average</span>
                  <span class="badge badge-sm" style="background-color: #2196f3; color: white;">110-119</span>
                </div>
                <div class="flex justify-between items-center">
                  <span>Average</span>
                  <span class="badge badge-sm badge-success">90-109</span>
                </div>
                <div class="flex justify-between items-center">
                  <span>Low Average</span>
                  <span class="badge badge-sm badge-warning">80-89</span>
                </div>
                <div class="flex justify-between items-center">
                  <span>Borderline</span>
                  <span class="badge badge-sm" style="background-color: #ff5722; color: white;">70-79</span>
                </div>
                <div class="flex justify-between items-center">
                  <span>Mild Deficit</span>
                  <span class="badge badge-sm badge-error">55-69</span>
                </div>
                <div class="flex justify-between items-center">
                  <span>Moderate Deficit</span>
                  <span class="badge badge-sm" style="background-color: #e91e63; color: white;">40-54</span>
                </div>
                <div class="flex justify-between items-center">
                  <span>Severe Deficit</span>
                  <span class="badge badge-sm" style="background-color: #d32f2f; color: white;">&lt;39</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>

  <!-- Verify Modal -->
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
          @click="verifyResult"
          :disabled="verifying"
        >
          <span v-if="verifying" class="loading loading-spinner loading-sm"></span>
          Verifikasi
        </button>
      </div>
    </div>
  </dialog>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconArrowLeft,
  IconChartBarOff,
  IconFileReport,
  IconDownload,
  IconClock,
  IconChartBar,
  IconFileText,
  IconBrain,
  IconCalendar,
  IconInfoCircle,
  IconUser,
  IconClipboardList,
  IconList,
  IconTrendingUp,
  IconShieldCheck,
  IconAlertTriangle,
  IconFileSpreadsheet,
  IconFileTypePdf
} from '@tabler/icons-vue'

const route = useRoute()
const router = useRouter()
const api = inject('api')

const resultData = ref(null)
const loading = ref(true)
const error = ref(null)
const generatingReport = ref(false)
const downloadingReport = ref(false)
const reportInfo = ref(null)
const verifying = ref(false)
const verifyNotes = ref('')
const verifyModal = ref(null)

const circumference = computed(() => 2 * Math.PI * 88)

// Load result data
const loadResult = async () => {
  loading.value = true
  error.value = null
  
  try {
    const sessionId = route.params.id
    const response = await api.get(`/psychology/sessions/${sessionId}`)
    
    if (response.success) {
      resultData.value = response.data
    } else {
      error.value = response.message || 'Gagal memuat data hasil tes'
    }
  } catch (err) {
    console.error('Error loading CFIT result:', err)
    error.value = err.message || 'Terjadi kesalahan saat memuat data'
  } finally {
    loading.value = false
  }
}

// Helper functions
const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatAge = (ageInMonths) => {
  if (!ageInMonths) return '-'
  const years = Math.floor(ageInMonths / 12)
  const months = ageInMonths % 12
  return `${years} tahun ${months} bulan`
}

const formatAgeGroup = (ageGroup) => {
  if (!ageGroup) return '-'
  const [start, end] = ageGroup.split('_')
  const [startYear, startMonth] = start.split('-')
  const [endYear, endMonth] = end.split('-')
  return `${startYear} Tahun ${startMonth}-${endMonth} Bulan`
}

const calculateDuration = () => {
  if (!resultData.value?.startedAt || !resultData.value?.completedAt) return '-'
  const start = new Date(resultData.value.startedAt)
  const end = new Date(resultData.value.completedAt)
  const diffMs = end - start
  const diffMins = Math.round(diffMs / 60000)
  return diffMins
}

const getClassificationColor = (classification) => {
  const colors = {
    'GENIUS': '#9c27b0',
    'VERY SUPERIOR': '#673ab7',
    'SUPERIOR': '#3f51b5',
    'HIGH AVERAGE': '#2196f3',
    'AVERAGE': '#4caf50',
    'LOW AVERAGE': '#ff9800',
    'BORDERLINE': '#ff5722',
    'MILD DEFICIT': '#f44336',
    'MODERATE DEFICIT': '#e91e63',
    'SEVERE DEFICIT': '#d32f2f'
  }
  return colors[classification] || '#4caf50'
}

const getSubtestLevel = (percentage) => {
  if (!percentage) return 'LOW'
  if (percentage >= 80) return 'HIGH'
  if (percentage >= 50) return 'MEDIUM'
  return 'LOW'
}

const getSubtestColor = (subtestName) => {
  const percentage = resultData.value?.interpretation?.subtests?.[subtestName]?.percentage || 0
  if (percentage >= 80) return '#4caf50' // Green
  if (percentage >= 50) return '#ff9800' // Orange
  return '#f44336' // Red
}

const getSubtestBorderClass = (subtestName) => {
  const level = getSubtestLevel(resultData.value?.interpretation?.subtests?.[subtestName]?.percentage)
  if (level === 'HIGH') return 'border-success bg-success/5'
  if (level === 'MEDIUM') return 'border-warning bg-warning/5'
  return 'border-error bg-error/5'
}

const getSubtestBadgeClass = (subtestName) => {
  const level = getSubtestLevel(resultData.value?.interpretation?.subtests?.[subtestName]?.percentage)
  if (level === 'HIGH') return 'badge-success'
  if (level === 'MEDIUM') return 'badge-warning'
  return 'badge-error'
}

const formatReportExpiry = (expiresAt) => {
  if (!expiresAt) return '-'
  const expiry = new Date(expiresAt)
  const now = new Date()
  const diffMs = expiry - now
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 60) return `${diffMins} menit lagi`
  const diffHours = Math.floor(diffMins / 60)
  return `${diffHours} jam lagi`
}

const isReportExpired = () => {
  if (!reportInfo.value?.expiresAt) return true
  return new Date(reportInfo.value.expiresAt) < new Date()
}

const handleGenerateReport = async () => {
  generatingReport.value = true
  try {
    const response = await api.post(`/psychology/sessions/${route.params.id}/generate-report`)
    if (response.success) {
      reportInfo.value = response.data
      // Auto download after generation
      await handleDownloadReport()
    }
  } catch (err) {
    console.error('Error generating report:', err)
    error.value = 'Gagal generate report'
  } finally {
    generatingReport.value = false
  }
}

const handleDownloadReport = async () => {
  downloadingReport.value = true
  try {
    const response = await api.get(`/psychology/sessions/${route.params.id}/download-report`, {
      responseType: 'blob'
    })
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `CFIT-Result-${resultData.value?.sessionNumber || route.params.id}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (err) {
    console.error('Error downloading report:', err)
    error.value = 'Gagal download report'
  } finally {
    downloadingReport.value = false
  }
}

const openVerifyModal = () => {
  verifyModal.value?.showModal()
}

const closeVerifyModal = () => {
  verifyModal.value?.close()
  verifyNotes.value = ''
}

const verifyResult = async () => {
  verifying.value = true
  try {
    const response = await api.post(`/psychology/sessions/${route.params.id}/verify`, {
      notes: verifyNotes.value || null
    })
    
    if (response.success) {
      // Reload result to get updated verification status
      await loadResult()
      closeVerifyModal()
    }
  } catch (err) {
    console.error('Error verifying result:', err)
    error.value = 'Gagal memverifikasi hasil'
  } finally {
    verifying.value = false
  }
}

// Export functionality
const exportingXlsx = ref(false)
const exportingPdf = ref(false)

const canExportReport = computed(() => {
  const session = resultData.value
  if (!session) return false
  
  const status = session.status || session.sessionStatus
  return status === 'completed' || status === 'verified'
})

const handleExportXlsx = async () => {
  const sessionId = route.params.id
  exportingXlsx.value = true
  try {
    const response = await api.get(`/psychology/reports/session/${sessionId}/export/xlsx`, {
      responseType: 'blob'
    })

    const blob = new Blob([response], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cfit-report-${sessionId}-${Date.now()}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Export XLSX error:', err)
    error.value = 'Gagal mengexport laporan XLSX'
  } finally {
    exportingXlsx.value = false
  }
}

const handleExportPdf = async () => {
  const sessionId = route.params.id
  exportingPdf.value = true
  try {
    const response = await api.get(`/psychology/reports/session/${sessionId}/export/pdf`, {
      responseType: 'blob'
    })

    const blob = new Blob([response], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cfit-report-${sessionId}-${Date.now()}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Export PDF error:', err)
    error.value = 'Gagal mengexport laporan PDF'
  } finally {
    exportingPdf.value = false
  }
}

const goBack = () => {
  router.push('/psychology/sessions')
}

onMounted(() => {
  loadResult()
})
</script>
