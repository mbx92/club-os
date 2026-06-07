<route lang="yaml">
meta:
  title: Detail Sesi
  layout: default
  requiresModule: psychology
</route>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Session Details -->
    <div v-else-if="session">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <button class="btn btn-ghost btn-circle" @click="goBack">
          <IconArrowLeft class="w-5 h-5" />
        </button>
        <div class="flex-1">
          <h1 class="text-3xl font-bold">{{ session.testType?.name }}</h1>
          <p class="text-base-content/60 mt-1">Sesi #{{ session.sessionToken }}</p>
        </div>
        <div class="badge badge-lg" :class="getStatusClass(session.status)">
          {{ getStatusLabel(session.status) }}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Test Info -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Informasi Tes</h2>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p class="text-base-content/60 text-sm mb-1">Jenis Tes</p>
                  <p class="font-semibold">{{ session.testType?.name }}</p>
                  <p class="text-sm text-base-content/60">{{ session.testType?.code }}</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm mb-1">Durasi</p>
                  <p class="font-semibold">{{ session.testType?.estimatedDuration }} menit</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm mb-1">Jumlah Soal</p>
                  <p class="font-semibold">{{ session.testType?.questionCount }} soal</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm mb-1">Kategori</p>
                  <p class="font-semibold">{{ session.testType?.category || '-' }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Progress -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <div class="flex items-center justify-between mb-4">
                <h2 class="card-title">Progress Pengerjaan</h2>
                
                <!-- Real-time Controls -->
                <div v-if="session.status === 'in_progress'" class="flex items-center gap-3">
                  <!-- Status Indicator -->
                  <div class="flex items-center gap-2">
                    <div v-if="monitorConnected" class="flex items-center gap-2 text-success">
                      <span class="relative flex h-3 w-3">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                      </span>
                      <span class="text-sm font-medium">Live</span>
                    </div>
                    <div v-else-if="monitorConnecting" class="flex items-center gap-2 text-warning">
                      <span class="loading loading-spinner loading-xs"></span>
                      <span class="text-sm">Connecting...</span>
                    </div>
                    <div v-else class="flex items-center gap-2 text-base-content/40">
                      <icon-tabler-wifi-off class="w-4 h-4" />
                      <span class="text-sm">Stopped</span>
                    </div>
                  </div>

                  <!-- Action Buttons -->
                  <div class="flex items-center gap-1">
                    <button 
                      v-if="monitorConnected"
                      class="btn btn-ghost btn-xs btn-square flex items-center justify-center tooltip tooltip-bottom"
                      data-tip="Stop live monitoring"
                      @click="disconnectMonitor"
                    >
                      <icon-tabler-player-stop class="w-4 h-4 shrink-0" />
                    </button>
                    <button 
                      v-else-if="!monitorConnecting"
                      class="btn btn-ghost btn-xs btn-square flex items-center justify-center tooltip tooltip-bottom"
                      data-tip="Start live monitoring"
                      @click="connectMonitor(route.params.id)"
                    >
                      <icon-tabler-player-play class="w-4 h-4 shrink-0" />
                    </button>
                    <button 
                      class="btn btn-ghost btn-xs btn-square flex items-center justify-center tooltip tooltip-bottom"
                      data-tip="Refresh data"
                      @click="loadSession"
                      :disabled="loading"
                    >
                      <span v-if="loading" class="loading loading-spinner loading-xs"></span>
                      <icon-tabler-refresh v-else class="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div class="flex items-center gap-4 mb-6">
                <div class="flex-1">
                  <div class="flex justify-between text-sm mb-2">
                    <span>Jawaban terisi</span>
                    <span class="font-medium">
                      {{ (liveProgress?.progress?.answeredCount ?? session.answeredCount) || 0 }}/{{ session.testType?.questionCount }}
                    </span>
                  </div>
                  <progress 
                    class="progress progress-primary w-full h-4" 
                    :value="(liveProgress?.progress?.answeredCount ?? session.answeredCount) || 0" 
                    :max="session.testType?.questionCount || 100"
                  ></progress>
                </div>
                <div class="text-3xl font-bold text-primary">
                  {{ liveProgress?.progress?.progressPercentage ?? Math.round(((session.answeredCount || 0) / (session.testType?.questionCount || 1)) * 100) }}%
                </div>
              </div>

              <!-- CFIT Subtest Timers (Real-time) -->
              <div v-if="liveProgress?.cfit?.subtestTimers && Object.keys(liveProgress.cfit.subtestTimers).length > 0" class="mb-6">
                <h3 class="font-semibold mb-3 flex items-center gap-2">
                  <icon-tabler-clock class="w-5 h-5" />
                  Subtest Timers
                </h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div 
                    v-for="(seconds, subtest) in liveProgress.cfit.subtestTimers" 
                    :key="subtest"
                    class="p-3 rounded-lg border-2 transition-all"
                    :class="subtest === liveProgress.cfit.currentSubtest 
                      ? 'border-primary bg-primary/10 scale-105' 
                      : 'border-base-300 bg-base-200'"
                  >
                    <div class="text-xs text-base-content/60 uppercase mb-1">{{ subtest }}</div>
                    <div class="text-xl font-bold font-mono" :class="seconds < 60 ? 'text-error' : ''">
                      {{ formatTime(seconds) }}
                    </div>
                    <div v-if="subtest === liveProgress.cfit.currentSubtest" class="text-xs text-primary font-medium mt-1">
                      ● Active
                    </div>
                  </div>
                </div>
              </div>

              <!-- Current Position (Real-time) -->
              <div v-if="liveProgress?.cfit?.currentSubtest" class="mb-6 p-4 bg-base-200 rounded-lg">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-base-content/60 mb-1">Current Position</p>
                    <p class="font-semibold text-lg">
                      {{ liveProgress.cfit.currentSubtest }} - Question #{{ (liveProgress.cfit.currentQuestionIndex || 0) + 1 }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm text-base-content/60 mb-1">Elapsed Time</p>
                    <p class="font-semibold text-lg font-mono">{{ formatTime(liveProgress.timing?.elapsedSeconds) }}</p>
                  </div>
                </div>
              </div>

              <!-- Last Activity (Real-time) -->
              <div v-if="liveProgress?.timing?.lastActivityAt" class="mb-6 flex items-center gap-3 text-sm">
                <icon-tabler-activity class="w-5 h-5 text-base-content/60" />
                <div class="flex-1">
                  <span class="text-base-content/60">Last activity:</span>
                  <span class="font-medium ml-2">{{ formatDateTime(liveProgress.timing.lastActivityAt) }}</span>
                </div>
                <div v-if="liveProgress.timing.lastSavedAt" class="flex items-center gap-2 text-success">
                  <icon-tabler-device-floppy class="w-4 h-4" />
                  <span>Auto-saved</span>
                </div>
              </div>

              <!-- Timeline -->
              <div class="space-y-4">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center" 
                       :class="session.startedAt ? 'bg-success text-success-content' : 'bg-base-200'">
                    <IconCheck v-if="session.startedAt" class="w-5 h-5" />
                    <IconClock v-else class="w-5 h-5" />
                  </div>
                  <div class="flex-1">
                    <p class="font-medium">Mulai Tes</p>
                    <p class="text-sm text-base-content/60">
                      {{ session.startedAt ? formatDateTime(session.startedAt) : 'Belum dimulai' }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center"
                       :class="session.completedAt ? 'bg-success text-success-content' : 'bg-base-200'">
                    <IconCheck v-if="session.completedAt" class="w-5 h-5" />
                    <IconClock v-else class="w-5 h-5" />
                  </div>
                  <div class="flex-1">
                    <p class="font-medium">Selesai Tes</p>
                    <p class="text-sm text-base-content/60">
                      {{ session.completedAt ? formatDateTime(session.completedAt) : 'Belum selesai' }}
                    </p>
                  </div>
                </div>

                <div v-if="session.completedAt" class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-primary-content">
                    <IconChartBar class="w-5 h-5" />
                  </div>
                  <div class="flex-1">
                    <p class="font-medium">Durasi Pengerjaan</p>
                    <p class="text-sm text-base-content/60">
                      {{ calculateDuration(session.startedAt, session.completedAt) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Results -->
          <div v-if="session.status === 'completed' && session.result" class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Hasil Tes</h2>
              
              <!-- Score Chart -->
              <ScoreChart v-if="session.result.scores" :scores="session.result.scores" />

              <!-- Summary -->
              <div v-if="session.result.summary" class="mt-6 p-4 bg-base-200 rounded-lg">
                <h3 class="font-semibold mb-2">Kesimpulan</h3>
                <p class="text-base-content/80 whitespace-pre-line">{{ session.result.summary }}</p>
              </div>

              <!-- Recommendations -->
              <div v-if="session.result.recommendations?.length > 0" class="mt-4">
                <h3 class="font-semibold mb-2">Rekomendasi</h3>
                <ul class="list-disc list-inside space-y-1">
                  <li v-for="(rec, index) in session.result.recommendations" :key="index" class="text-base-content/80">
                    {{ rec }}
                  </li>
                </ul>
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
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-full bg-primary text-primary-content flex items-center justify-center shrink-0">
                  <span class="text-2xl font-bold leading-none">{{ session.order?.patient?.fullName?.charAt(0).toUpperCase() }}</span>
                </div>
                <div>
                  <h3 class="font-bold uppercase">{{ session.order?.patient?.fullName }}</h3>
                  <p class="text-sm text-base-content/60">{{ session.order?.patient?.email }}</p>
                </div>
              </div>
              <div class="divider my-3"></div>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-base-content/60">Usia</span>
                  <span>{{ calculateAge(session.order?.patient?.birthDate) }} tahun</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Jenis Kelamin</span>
                  <span>{{ session.order?.patient?.sex === 'male' ? 'Laki-laki' : 'Perempuan' }}</span>
                </div>
              </div>
              <router-link 
                :to="`/psychology/patients/${session.order?.patient?.id}`" 
                class="btn btn-ghost btn-sm mt-4"
              >
                Lihat Profil Pasien
                <IconArrowRight class="w-4 h-4" />
              </router-link>
            </div>
          </div>

          <!-- Order Info -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Order</h2>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-base-content/60">No. Order</span>
                  <span class="font-mono">{{ session.order?.orderNumber }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Paket</span>
                  <span>{{ session.order?.package?.name }}</span>
                </div>
              </div>
              <router-link 
                :to="`/psychology/orders/${session.order?.id}`" 
                class="btn btn-ghost btn-sm mt-4"
              >
                Lihat Detail Order
                <IconArrowRight class="w-4 h-4" />
              </router-link>
            </div>
          </div>

          <!-- Access Link -->
          <div v-if="session.order?.accessToken && ['pending', 'in_progress'].includes(session.status)" class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Akses Tes</h2>
              
              <!-- Access Token -->
              <div class="mb-4">
                <p class="text-sm text-base-content/60 mb-2">Kode Akses:</p>
                <div class="flex items-center gap-2">
                  <code class="text-lg font-mono font-bold text-primary bg-primary/10 px-4 py-2 rounded-lg">
                    {{ session.order?.accessToken }}
                  </code>
                  <button 
                    class="btn btn-ghost btn-sm btn-square"
                    @click="copyAccessToken"
                    title="Salin kode akses"
                  >
                    <IconCopy class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- Access URL -->
              <div>
                <p class="text-sm text-base-content/60 mb-2">Link Akses Tes:</p>
                <div class="bg-base-200 rounded-lg p-3 break-all text-sm font-mono">
                  {{ accessUrl }}
                </div>
              </div>

              <button class="btn btn-primary btn-block mt-4" @click="copyAccessLink">
                <IconCopy class="w-4 h-4" />
                Salin Link Akses
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Aksi</h2>
              <div class="space-y-2">
                <button 
                  v-if="session.status === 'completed'"
                  class="btn btn-primary btn-block"
                  @click="exportResult"
                >
                  <IconDownload class="w-4 h-4" />
                  Export Hasil PDF
                </button>
                <button 
                  v-if="session.status === 'completed'"
                  class="btn btn-outline btn-block"
                  @click="verifyScores"
                  :disabled="verifying"
                >
                  <span v-if="verifying" class="loading loading-spinner loading-sm"></span>
                  <IconShieldCheck v-else class="w-4 h-4" />
                  Verifikasi Skor
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Not Found -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <IconClipboardOff class="w-16 h-16 mx-auto text-error mb-4" />
        <h3 class="text-xl font-semibold mb-2">Sesi Tidak Ditemukan</h3>
        <button class="btn btn-primary" @click="goBack">
          <IconArrowLeft class="w-4 h-4 mr-2" />
          Kembali
        </button>
      </div>
    </div>

    <!-- Verify Notes Modal -->
    <dialog ref="verifyModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Verifikasi Skor</h3>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconChartBar,
  IconDownload,
  IconShieldCheck,
  IconClipboardOff,
  IconCopy
} from '@tabler/icons-vue'
import { useSessions } from '@/composables/psychology'
import { useSessionProgressMonitor } from '@/composables/psychology/useSessionProgressMonitor'
import ScoreChart from '@/components/psychology/ScoreChart.vue'
import { useNotification } from '@/composables/core/useNotification'

const route = useRoute()
const router = useRouter()
const { showSuccess, showError } = useNotification()

const {
  session,
  loading,
  getSessionById,
  getSessionResult,
  verifyScore,
  getStatusClass,
  getStatusLabel,
  formatDateTime
} = useSessions()

// Real-time progress monitoring
const {
  connected: monitorConnected,
  connecting: monitorConnecting,
  progress: liveProgress,
  error: monitorError,
  connect: connectMonitor,
  disconnect: disconnectMonitor,
  formatTime,
  getStatusClass: getMonitorStatusClass
} = useSessionProgressMonitor()

const verifying = ref(false)

// Generate access URL dynamically based on current window location
const accessUrl = computed(() => {
  if (!session.value?.order?.accessToken) return ''
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/psychology/public/access/${session.value.order.accessToken}`
})

const copyAccessToken = async () => {
  if (session.value?.order?.accessToken) {
    try {
      await navigator.clipboard.writeText(session.value.order.accessToken)
      showSuccess('Kode akses berhasil disalin!')
    } catch (err) {
      showError('Gagal menyalin kode akses')
    }
  }
}

const copyAccessLink = async () => {
  if (accessUrl.value) {
    try {
      await navigator.clipboard.writeText(accessUrl.value)
      showSuccess('Link akses berhasil disalin!')
    } catch (err) {
      showError('Gagal menyalin link akses')
    }
  }
}

const loadSession = async () => {
  const sessionId = route.params.id
  try {
    await getSessionById(sessionId)
    if (session.value?.status === 'completed') {
      await getSessionResult(sessionId)
    }
    
    // Start real-time monitoring if session is in progress
    if (session.value?.status === 'in_progress') {
      connectMonitor(sessionId)
    }
  } catch (error) {
    console.error('Error loading session:', error)
  }
}

const goBack = () => {
  router.push('/psychology/sessions')
}

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return '-'
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

const calculateDuration = (startedAt, completedAt) => {
  if (!startedAt || !completedAt) return '-'
  
  const start = new Date(startedAt)
  const end = new Date(completedAt)
  const diffMs = end - start
  const diffMins = Math.floor(diffMs / 60000)
  const diffSecs = Math.floor((diffMs % 60000) / 1000)
  
  return `${diffMins} menit ${diffSecs} detik`
}

const exportResult = () => {
  // TODO: Implement PDF export
  showSuccess('Fitur export PDF akan segera tersedia')
}

// Verify modal
const verifyModal = ref(null)
const verifyNotes = ref('')

const verifyScores = () => {
  verifyNotes.value = ''
  verifyModal.value?.showModal()
}

const closeVerifyModal = () => {
  verifyModal.value?.close()
}

const confirmVerify = async () => {
  verifying.value = true
  try {
    await verifyScore(session.value.id, verifyNotes.value)
    closeVerifyModal()
    await loadSession()
  } catch (err) {
    // Error toast already shown by composable
  } finally {
    verifying.value = false
  }
}

onMounted(() => {
  loadSession()
})

onUnmounted(() => {
  disconnectMonitor()
})
</script>
