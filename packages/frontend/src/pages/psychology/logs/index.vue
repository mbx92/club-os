<route lang="yaml">
meta:
  title: Test Session Logs
  layout: default
  requiresModule: psychology
</route>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold flex items-center gap-2">
          Test Session Logs
          <button
            v-if="isStreaming" 
            class="badge badge-success badge-sm gap-1 cursor-pointer hover:opacity-80 transition-opacity"
            title="Klik untuk pause streaming"
            @click="toggleStreaming"
          >
            <IconActivity class="w-3 h-3" />
            Real-time
          </button>
          <button
            v-else-if="isStreamingPaused"
            class="badge badge-warning badge-sm gap-1 cursor-pointer hover:opacity-80 transition-opacity"
            title="Klik untuk resume streaming"
            @click="toggleStreaming"
          >
            <IconPlayerPause class="w-3 h-3" />
            Paused
          </button>
          <span 
            v-else-if="streamError" 
            class="badge badge-error badge-sm gap-1"
            title="Stream error - koneksi terputus"
          >
            <IconWifiOff class="w-3 h-3" />
            Offline
          </span>
        </h1>
        <p class="text-base-content/60 mt-1">Monitor dan debug masalah test session secara realtime</p>
      </div>
      <div class="flex items-center gap-2">
        <div v-if="pagination.total" class="text-sm text-base-content/60">
          {{ pagination.total }} log ditemukan
        </div>
        <button 
          class="btn btn-outline btn-sm" 
          :disabled="refreshing"
          @click="manualRefresh"
        >
          <IconRefresh class="w-5 h-5" :class="{ 'animate-spin': refreshing }" />
          {{ refreshing ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body py-4">
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text">Level</span>
            </label>
            <select v-model="filters.level" class="select select-bordered select-sm" @change="restartStreaming">
              <option value="">Semua Level</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label py-1">
              <span class="label-text">Test Type</span>
            </label>
            <select v-model="filters.testType" class="select select-bordered select-sm" @change="restartStreaming">
              <option value="">Semua Test</option>
              <option value="CFIT">CFIT</option>
              <option value="PAPI">PAPI</option>
              <option value="EPPS">EPPS</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label py-1">
              <span class="label-text">Order Number</span>
            </label>
            <input
              v-model="filters.orderNumber"
              type="text"
              placeholder="PSY-XXXX-..."
              class="input input-bordered input-sm"
              @keyup.enter="onFilterChange"
            />
          </div>

          <div class="form-control">
            <label class="label py-1">
              <span class="label-text">Session ID</span>
            </label>
            <input
              v-model="filters.sessionId"
              type="text"
              placeholder="Session ID..."
              class="input input-bordered input-sm"
              @keyup.enter="onFilterChange"
            />
          </div>

          <div class="form-control">
            <label class="label py-1">
              <span class="label-text">Tampil</span>
            </label>
            <select v-model="filters.limit" class="select select-bordered select-sm" @change="restartStreaming">
              <option :value="50">50</option>
              <option :value="100">100</option>
              <option :value="200">200</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats Summary -->
    <div v-if="logs.length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-info">
          <IconInfoCircle class="w-8 h-8" />
        </div>
        <div class="stat-title">Info</div>
        <div class="stat-value text-info text-2xl">{{ logStats.info }}</div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-warning">
          <IconAlertTriangle class="w-8 h-8" />
        </div>
        <div class="stat-title">Warning</div>
        <div class="stat-value text-warning text-2xl">{{ logStats.warn }}</div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-error">
          <IconAlertCircle class="w-8 h-8" />
        </div>
        <div class="stat-title">Error</div>
        <div class="stat-value text-error text-2xl">{{ logStats.error }}</div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-error">
          <IconBug class="w-8 h-8" />
        </div>
        <div class="stat-title">Critical</div>
        <div class="stat-value text-error text-2xl">{{ logStats.critical }}</div>
      </div>
    </div>

    <!-- Logs List -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body p-0">
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="logs.length > 0" class="divide-y divide-base-300">
          <div 
            v-for="log in logs" 
            :key="log.id"
            class="p-4 hover:bg-base-200/50 transition-colors cursor-pointer"
            @click="viewDetails(log)"
          >
            <div class="flex items-start gap-4">
              <!-- Level Icon -->
              <div class="flex-shrink-0 mt-1">
                <div 
                  class="w-10 h-10 rounded-full flex items-center justify-center"
                  :class="getLevelBgClass(log.level)"
                >
                  <component :is="getLevelIcon(log.level)" class="w-5 h-5" :class="getLevelTextClass(log.level)" />
                </div>
              </div>

              <!-- Main Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-1">
                  <!-- Level Badge -->
                  <span 
                    class="badge badge-sm font-semibold"
                    :class="getLevelBadgeClass(log.level)"
                  >
                    {{ log.level.toUpperCase() }}
                  </span>

                  <!-- Test Type Badge -->
                  <span v-if="log.session?.testType?.code" class="badge badge-primary badge-sm badge-outline">
                    {{ log.session.testType.code }}
                  </span>

                  <!-- Event Type Badge -->
                  <span class="badge badge-ghost badge-sm">
                    {{ log.eventType || 'custom' }}
                  </span>

                  <!-- Timestamp -->
                  <span class="text-xs text-base-content/50 ml-auto">
                    {{ formatTimeAgo(log.clientTimestamp || log.createdAt) }}
                  </span>
                </div>

                <!-- Message or Generated Description -->
                <p class="font-medium text-base-content mb-2">
                  {{ getLogMessage(log) }}
                </p>

                <!-- Data Details -->
                <div class="flex flex-wrap gap-2 text-xs">
                  <!-- Order Number -->
                  <div v-if="log.session?.orderNumber" class="flex items-center gap-1 bg-base-200 px-2 py-1 rounded">
                    <IconReceipt class="w-3 h-3" />
                    <span class="font-mono">{{ log.session.orderNumber }}</span>
                  </div>

                  <!-- Session Status -->
                  <div v-if="log.session?.status" class="flex items-center gap-1 bg-base-200 px-2 py-1 rounded">
                    <IconPlayerPlay v-if="log.session.status === 'in_progress'" class="w-3 h-3 text-success" />
                    <IconCheck v-else-if="log.session.status === 'completed'" class="w-3 h-3 text-info" />
                    <IconX v-else class="w-3 h-3 text-error" />
                    <span>{{ formatStatus(log.session.status) }}</span>
                  </div>

                  <!-- Subtest -->
                  <div v-if="log.data?.currentSubtest" class="flex items-center gap-1 bg-base-200 px-2 py-1 rounded">
                    <IconCategory class="w-3 h-3" />
                    <span>Subtest: {{ log.data.currentSubtest }}</span>
                  </div>

                  <!-- Remaining Time -->
                  <div v-if="log.data?.remainingTime !== undefined" class="flex items-center gap-1 bg-base-200 px-2 py-1 rounded">
                    <IconClock class="w-3 h-3" />
                    <span>Sisa: {{ formatSeconds(log.data.remainingTime) }}</span>
                  </div>

                  <!-- Question Index -->
                  <div v-if="log.data?.currentQuestionIndex !== undefined" class="flex items-center gap-1 bg-base-200 px-2 py-1 rounded">
                    <IconHash class="w-3 h-3" />
                    <span>Soal ke-{{ log.data.currentQuestionIndex + 1 }}</span>
                  </div>

                  <!-- Answered Count -->
                  <div v-if="log.data?.answeredInSubtest !== undefined" class="flex items-center gap-1 bg-base-200 px-2 py-1 rounded">
                    <IconChecks class="w-3 h-3" />
                    <span>Dijawab: {{ log.data.answeredInSubtest }}</span>
                  </div>

                  <!-- Total Questions -->
                  <div v-if="log.data?.totalQuestions" class="flex items-center gap-1 bg-base-200 px-2 py-1 rounded">
                    <IconListNumbers class="w-3 h-3" />
                    <span>Total: {{ log.data.totalQuestions }} soal</span>
                  </div>

                  <!-- Is Resume -->
                  <div v-if="log.data?.isResume !== undefined" class="flex items-center gap-1 px-2 py-1 rounded" :class="log.data.isResume ? 'bg-warning/20' : 'bg-success/20'">
                    <IconRefresh v-if="log.data.isResume" class="w-3 h-3 text-warning" />
                    <IconPlayerPlay v-else class="w-3 h-3 text-success" />
                    <span>{{ log.data.isResume ? 'Resume' : 'Start Baru' }}</span>
                  </div>
                </div>

                <!-- Session Info -->
                <div class="mt-2 flex items-center gap-2 text-xs text-base-content/50">
                  <span class="font-mono">Session: {{ log.sessionId?.substring(0, 8) }}...</span>
                  <span>•</span>
                  <span>{{ formatDate(log.clientTimestamp || log.createdAt) }}</span>
                </div>
              </div>

              <!-- Expand Icon -->
              <div class="flex-shrink-0">
                <IconChevronRight class="w-5 h-5 text-base-content/30" />
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-12">
          <IconClipboardOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <p class="text-base-content/60 text-lg">Tidak ada log ditemukan</p>
          <p class="text-base-content/40 text-sm mt-1">Log akan muncul ketika peserta mengerjakan tes</p>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.totalPages > 1" class="flex justify-center p-4 border-t border-base-300">
          <div class="join">
            <button 
              class="join-item btn btn-sm"
              :disabled="pagination.page <= 1"
              @click="goToPage(pagination.page - 1)"
            >
              «
            </button>
            <button class="join-item btn btn-sm">
              Halaman {{ pagination.page }} dari {{ pagination.totalPages }}
            </button>
            <button 
              class="join-item btn btn-sm"
              :disabled="pagination.page >= pagination.totalPages"
              @click="goToPage(pagination.page + 1)"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Details Modal -->
    <dialog ref="detailsModal" class="modal">
      <div class="modal-box max-w-4xl">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4" @click="closeDetails">✕</button>
        
        <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
          <component :is="getLevelIcon(selectedLog?.level)" class="w-5 h-5" :class="getLevelTextClass(selectedLog?.level)" />
          Log Details
        </h3>
        
        <div v-if="selectedLog" class="space-y-6">
          <!-- Header Info -->
          <div class="flex flex-wrap gap-2">
            <span 
              class="badge badge-lg"
              :class="getLevelBadgeClass(selectedLog.level)"
            >
              {{ selectedLog.level?.toUpperCase() }}
            </span>
            <span v-if="selectedLog.session?.testType?.code" class="badge badge-lg badge-primary badge-outline">
              {{ selectedLog.session.testType.code }}
            </span>
            <span class="badge badge-lg badge-ghost">
              {{ selectedLog.eventType || 'custom' }}
            </span>
          </div>

          <!-- Generated Message -->
          <div class="bg-base-200 p-4 rounded-lg">
            <p class="text-lg font-medium">{{ getLogMessage(selectedLog) }}</p>
          </div>

          <!-- Grid Info -->
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div class="bg-base-200 p-3 rounded-lg">
              <label class="text-xs font-semibold text-base-content/60 uppercase">Client Timestamp</label>
              <p class="font-mono text-sm mt-1">{{ formatDate(selectedLog.clientTimestamp) }}</p>
            </div>
            <div class="bg-base-200 p-3 rounded-lg">
              <label class="text-xs font-semibold text-base-content/60 uppercase">Server Created</label>
              <p class="font-mono text-sm mt-1">{{ formatDate(selectedLog.createdAt) }}</p>
            </div>
            <div class="bg-base-200 p-3 rounded-lg">
              <label class="text-xs font-semibold text-base-content/60 uppercase">IP Address</label>
              <p class="font-mono text-sm mt-1">{{ selectedLog.ipAddress || '-' }}</p>
            </div>
          </div>

          <!-- Session Info -->
          <div v-if="selectedLog.session" class="bg-primary/10 p-4 rounded-lg">
            <label class="text-xs font-semibold text-primary uppercase mb-3 block">Session Info</label>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <span class="text-xs text-base-content/60">Order</span>
                <p class="font-mono font-semibold">{{ selectedLog.session.orderNumber }}</p>
              </div>
              <div>
                <span class="text-xs text-base-content/60">Test Type</span>
                <p class="font-semibold">{{ selectedLog.session.testType?.name || '-' }}</p>
              </div>
              <div>
                <span class="text-xs text-base-content/60">Status</span>
                <p class="font-semibold">{{ formatStatus(selectedLog.session.status) }}</p>
              </div>
              <div>
                <span class="text-xs text-base-content/60">Session #</span>
                <p class="font-semibold">{{ selectedLog.session.sessionNumber || 1 }}</p>
              </div>
            </div>
          </div>

          <!-- Log Data -->
          <div v-if="selectedLog.data && Object.keys(selectedLog.data).length > 0">
            <label class="text-xs font-semibold text-base-content/60 uppercase mb-2 block">Log Data</label>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div v-for="(value, key) in selectedLog.data" :key="key" class="bg-base-200 p-3 rounded-lg">
                <span class="text-xs text-base-content/60">{{ formatDataKey(key) }}</span>
                <p class="font-mono font-semibold">{{ formatDataValue(key, value) }}</p>
              </div>
            </div>
          </div>

          <!-- Session ID -->
          <div>
            <label class="text-xs font-semibold text-base-content/60 uppercase">Full Session ID</label>
            <p class="font-mono text-xs mt-1 break-all bg-base-200 p-2 rounded">{{ selectedLog.sessionId }}</p>
          </div>

          <!-- User Agent -->
          <div v-if="selectedLog.userAgent">
            <label class="text-xs font-semibold text-base-content/60 uppercase">User Agent</label>
            <p class="text-xs mt-1 break-all bg-base-200 p-2 rounded">{{ selectedLog.userAgent }}</p>
          </div>

          <!-- Raw JSON -->
          <details class="collapse collapse-arrow bg-base-200">
            <summary class="collapse-title text-sm font-semibold">
              Raw JSON Data
            </summary>
            <div class="collapse-content">
              <pre class="text-xs overflow-x-auto whitespace-pre-wrap">{{ JSON.stringify(selectedLog, null, 2) }}</pre>
            </div>
          </details>
        </div>

        <div class="modal-action">
          <button class="btn" @click="closeDetails">Tutup</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { 
  IconRefresh, 
  IconClipboardOff,
  IconInfoCircle,
  IconAlertTriangle,
  IconAlertCircle,
  IconBug,
  IconCheck,
  IconX,
  IconChevronRight,
  IconReceipt,
  IconPlayerPlay,
  IconPlayerPause,
  IconCategory,
  IconClock,
  IconHash,
  IconChecks,
  IconListNumbers,
  IconActivity,
  IconWifiOff
} from '@tabler/icons-vue'

const api = inject('api')

const logs = ref([])
const loading = ref(false)
const detailsModal = ref(null)
const selectedLog = ref(null)
const pagination = ref({
  page: 1,
  limit: 50,
  total: 0,
  totalPages: 0
})

const filters = ref({
  level: '',
  testType: '',
  eventType: '',
  sessionId: '',
  orderNumber: '',
  limit: 50
})

// Realtime streaming
const eventSource = ref(null)
const isStreaming = ref(false)
const streamError = ref(null)
const pollingInterval = ref(null)
const isStreamingPaused = ref(false) // User manually paused streaming
const refreshing = ref(false) // Manual refresh loading state

// Calculate log stats
const logStats = computed(() => {
  const stats = { info: 0, warn: 0, error: 0, critical: 0 }
  logs.value.forEach(log => {
    const level = log.level?.toLowerCase()
    if (level === 'info') stats.info++
    else if (level === 'warn' || level === 'warning') stats.warn++
    else if (level === 'error') stats.error++
    else if (level === 'critical') stats.critical++
  })
  return stats
})

const loadLogs = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filters.value.level) params.append('level', filters.value.level)
    if (filters.value.testType) params.append('testType', filters.value.testType)
    if (filters.value.eventType) params.append('eventType', filters.value.eventType)
    if (filters.value.sessionId) params.append('sessionId', filters.value.sessionId)
    if (filters.value.orderNumber) params.append('orderNumber', filters.value.orderNumber)
    params.append('limit', filters.value.limit)
    params.append('page', pagination.value.page)

    const response = await api.get(`/psychology/session-logs?${params.toString()}`)
    
    if (response.success) {
      logs.value = response.data?.logs || []
      if (response.data?.pagination) {
        pagination.value = response.data.pagination
      }
    }
  } catch (error) {
    console.error('Error loading logs:', error)
  } finally {
    loading.value = false
  }
}

const onFilterChange = () => {
  pagination.value.page = 1
  loadLogs()
  restartStreaming()
}

const goToPage = (page) => {
  pagination.value.page = page
  loadLogs()
}

// Generate human-readable message from log data
const getLogMessage = (log) => {
  if (log.message) return log.message
  
  const data = log.data || {}
  const testType = log.session?.testType?.code || data.testType || 'Test'
  
  // Generate message based on available data
  if (data.isResume === true) {
    return `Peserta melanjutkan ${testType} dengan ${data.savedAnswers || 0} jawaban tersimpan`
  }
  if (data.isResume === false) {
    return `Peserta memulai ${testType} baru dengan ${data.totalQuestions || 0} soal`
  }
  if (data.currentSubtest && data.remainingTime !== undefined) {
    return `${testType} subtest ${data.currentSubtest}: Soal ${(data.currentQuestionIndex || 0) + 1}, sisa waktu ${formatSeconds(data.remainingTime)}`
  }
  if (data.answeredInSubtest !== undefined) {
    return `Timer subtest ${data.subtest || ''} habis, ${data.answeredInSubtest} soal dijawab`
  }
  if (data.subtest) {
    return `Aktivitas pada subtest ${data.subtest}`
  }
  
  return `Log aktivitas ${testType}`
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatTimeAgo = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  if (hours < 24) return `${hours} jam lalu`
  if (days < 7) return `${days} hari lalu`
  
  return formatDate(dateString)
}

const formatSeconds = (seconds) => {
  if (seconds === undefined || seconds === null) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) {
    return `${mins}m ${secs}s`
  }
  return `${secs}s`
}

const formatStatus = (status) => {
  const statusMap = {
    'in_progress': 'Sedang Berlangsung',
    'completed': 'Selesai',
    'pending': 'Pending',
    'cancelled': 'Dibatalkan'
  }
  return statusMap[status] || status
}

const formatDataKey = (key) => {
  const keyMap = {
    'testType': 'Tipe Test',
    'remainingTime': 'Sisa Waktu',
    'currentSubtest': 'Subtest Saat Ini',
    'currentQuestionIndex': 'Index Soal',
    'isResume': 'Mode Resume',
    'savedAnswers': 'Jawaban Tersimpan',
    'totalQuestions': 'Total Soal',
    'answeredInSubtest': 'Dijawab di Subtest',
    'subtest': 'Subtest'
  }
  return keyMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
}

const formatDataValue = (key, value) => {
  if (key === 'remainingTime') return formatSeconds(value)
  if (key === 'isResume') return value ? 'Ya' : 'Tidak'
  if (key === 'currentQuestionIndex') return value + 1
  return value
}

const getLevelIcon = (level) => {
  const icons = {
    'info': IconInfoCircle,
    'warn': IconAlertTriangle,
    'warning': IconAlertTriangle,
    'error': IconAlertCircle,
    'critical': IconBug
  }
  return icons[level?.toLowerCase()] || IconInfoCircle
}

const getLevelBgClass = (level) => {
  const classes = {
    'info': 'bg-info/20',
    'warn': 'bg-warning/20',
    'warning': 'bg-warning/20',
    'error': 'bg-error/20',
    'critical': 'bg-error/30'
  }
  return classes[level?.toLowerCase()] || 'bg-base-200'
}

const getLevelTextClass = (level) => {
  const classes = {
    'info': 'text-info',
    'warn': 'text-warning',
    'warning': 'text-warning',
    'error': 'text-error',
    'critical': 'text-error'
  }
  return classes[level?.toLowerCase()] || 'text-base-content'
}

const getLevelBadgeClass = (level) => {
  const classes = {
    'info': 'badge-info',
    'warn': 'badge-warning',
    'warning': 'badge-warning',
    'error': 'badge-error',
    'critical': 'badge-error'
  }
  return classes[level?.toLowerCase()] || 'badge-ghost'
}

const viewDetails = (log) => {
  selectedLog.value = log
  detailsModal.value?.showModal()
}

const closeDetails = () => {
  detailsModal.value?.close()
  selectedLog.value = null
}

// Start realtime streaming (SSE for specific session, polling for all)
const startStreaming = () => {
  // If specific sessionId, use EventSource (SSE) with token in query
  if (filters.value.sessionId) {
    startSSEStream()
  } else {
    // For all logs, use polling with Authorization header
    startPolling()
  }
}

// SSE streaming for specific session
const startSSEStream = () => {
  if (eventSource.value) {
    eventSource.value.close()
  }

  try {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    const params = new URLSearchParams()
    if (filters.value.level) params.append('level', filters.value.level)
    if (filters.value.testType) params.append('testType', filters.value.testType)
    
    // Get token from localStorage
    const token = localStorage.getItem('token')
    if (token) {
      params.append('token', token)
    }

    const streamUrl = `${baseUrl}/psychology/sessions/${filters.value.sessionId}/logs/stream?${params.toString()}`

    console.log('📡 Connecting to SSE stream:', streamUrl)

    eventSource.value = new EventSource(streamUrl)
    
    eventSource.value.onopen = () => {
      isStreaming.value = true
      streamError.value = null
      console.log('✅ SSE Stream connected')
    }

    eventSource.value.onmessage = (event) => {
      try {
        const newLog = JSON.parse(event.data)
        console.log('📥 New log received:', newLog)
        
        // Add new log to the top of the list
        logs.value.unshift(newLog)
        
        // Limit to prevent memory issues (keep max 200 logs in memory)
        if (logs.value.length > 200) {
          logs.value = logs.value.slice(0, 200)
        }
        
        // Update pagination total
        pagination.value.total++
      } catch (error) {
        console.error('Error parsing log data:', error)
      }
    }

    eventSource.value.onerror = (error) => {
      console.error('❌ SSE Stream error:', error)
      streamError.value = 'Stream connection error'
      isStreaming.value = false
      
      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        if (!eventSource.value || eventSource.value.readyState === EventSource.CLOSED) {
          console.log('🔄 Attempting to reconnect SSE...')
          startSSEStream()
        }
      }, 5000)
    }
  } catch (error) {
    console.error('Failed to start SSE streaming:', error)
    streamError.value = error.message
    isStreaming.value = false
  }
}

// Polling for all logs
const startPolling = () => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
  }

  isStreaming.value = true
  streamError.value = null
  console.log('📡 Starting polling for all logs')

  // Poll every 3 seconds
  pollingInterval.value = setInterval(async () => {
    try {
      const params = new URLSearchParams()
      if (filters.value.level) params.append('level', filters.value.level)
      if (filters.value.testType) params.append('testType', filters.value.testType)
      if (filters.value.orderNumber) params.append('orderNumber', filters.value.orderNumber)
      params.append('limit', 10) // Only fetch latest 10 logs
      params.append('page', 1)

      const response = await api.get(`/psychology/session-logs?${params.toString()}`)
      
      if (response.success && response.data?.logs?.length > 0) {
        const newLogs = response.data.logs
        
        // Add new logs that don't exist yet
        newLogs.forEach(newLog => {
          if (!logs.value.find(log => log.id === newLog.id)) {
            logs.value.unshift(newLog)
            console.log('📥 New log from polling:', newLog)
          }
        })
        
        // Limit to prevent memory issues
        if (logs.value.length > 200) {
          logs.value = logs.value.slice(0, 200)
        }
        
        // Update pagination
        if (response.data?.pagination) {
          pagination.value.total = response.data.pagination.total
        }
      }
    } catch (error) {
      console.error('❌ Polling error:', error)
      streamError.value = 'Polling error'
    }
  }, 3000)
}

// Stop streaming
const stopStreaming = () => {
  if (eventSource.value) {
    console.log('🛑 Closing SSE connection')
    eventSource.value.close()
    eventSource.value = null
  }
  if (pollingInterval.value) {
    console.log('🛑 Stopping polling')
    clearInterval(pollingInterval.value)
    pollingInterval.value = null
  }
  isStreaming.value = false
  streamError.value = null // Clear error when manually stopped
}

// Restart streaming (for filter changes)
const restartStreaming = () => {
  if (isStreamingPaused.value) return // Don't restart if user manually paused
  
  stopStreaming()
  loadLogs() // Load initial data
  startStreaming() // Start realtime updates
}

// Toggle streaming on/off
const toggleStreaming = () => {
  if (isStreaming.value) {
    // Pause streaming
    stopStreaming()
    isStreamingPaused.value = true
    console.log('⏸️ Streaming paused by user')
  } else if (isStreamingPaused.value) {
    // Resume streaming
    isStreamingPaused.value = false
    startStreaming()
    console.log('▶️ Streaming resumed by user')
  }
}

// Manual refresh without affecting streaming state
const manualRefresh = async () => {
  refreshing.value = true
  console.log('🔄 Manual refresh triggered')
  try {
    await loadLogs()
    console.log('✅ Manual refresh complete')
  } catch (error) {
    console.error('❌ Manual refresh failed:', error)
  } finally {
    refreshing.value = false
  }
}

onMounted(() => {
  loadLogs()
  startStreaming()
})

onUnmounted(() => {
  stopStreaming()
})
</script>
