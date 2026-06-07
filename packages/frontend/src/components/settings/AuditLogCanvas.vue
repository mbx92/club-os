<template>
  <!-- Canvas Overlay -->
  <Teleport to="body">
    <Transition name="canvas">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 overflow-hidden"
        @click.self="closeCanvas"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeCanvas"></div>
        
        <!-- Canvas Panel -->
        <div class="absolute inset-y-0 right-0 max-w-full flex">
          <div class="w-screen max-w-6xl">
            <div class="h-full flex flex-col bg-base-100 shadow-xl">
              
              <!-- Header -->
              <div class="px-6 py-4 bg-base-200 border-b border-base-300">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <IconFileAnalytics class="w-8 h-8 text-primary" />
                    <div>
                      <h2 class="text-xl font-bold">Audit Logs</h2>
                      <p class="text-sm text-base-content/70">
                        System activities and audit trail
                      </p>
                    </div>
                  </div>
                  
                  <button
                    class="btn btn-sm btn-ghost btn-circle"
                    @click="closeCanvas"
                  >
                    <IconX class="w-5 h-5" />
                  </button>
                </div>
                
                <!-- Tabs -->
                <div class="mt-4">
                  <div role="tablist" class="tabs tabs-boxed">
                    <a
                      role="tab"
                      class="tab"
                      :class="{ 'tab-active': activeTab === 'logs' }"
                      @click="activeTab = 'logs'"
                    >
                      <IconList class="w-4 h-4 mr-2" />
                      Logs
                    </a>
                    <a
                      role="tab"
                      class="tab"
                      :class="{ 'tab-active': activeTab === 'stats' }"
                      @click="changeTab('stats')"
                    >
                      <IconChartBar class="w-4 h-4 mr-2" />
                      Statistics
                    </a>
                  </div>
                </div>
                
                <!-- Filters (Logs Tab) -->
                <div v-if="activeTab === 'logs'" class="mt-4 space-y-3">
                  <!-- Row 1: Level, Search -->
                  <div class="grid grid-cols-2 gap-3">
                    <select v-model="filters.level" class="select select-bordered select-sm w-full" @change="applyFilters">
                      <option value="all">All Levels</option>
                      <option value="info">Info</option>
                      <option value="warn">Warning</option>
                      <option value="error">Error</option>
                      <option value="security">Security</option>
                      <option value="audit">Audit</option>
                      <option value="debug">Debug</option>
                    </select>
                    
                    <div class="relative">
                      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 z-10 pointer-events-none">
                        <IconSearch class="w-4 h-4" />
                      </span>
                      <input
                        v-model="filters.search"
                        type="text"
                        placeholder="Search message or action..."
                        class="input input-bordered input-sm w-full pl-9"
                        @input="debounceSearch"
                      />
                    </div>
                  </div>
                  
                  <!-- Row 2: Date Range & Limit -->
                  <div class="grid grid-cols-3 gap-3">
                    <input
                      v-model="filters.startDate"
                      type="date"
                      class="input input-bordered input-sm w-full"
                      @change="applyFilters"
                    />
                    <input
                      v-model="filters.endDate"
                      type="date"
                      class="input input-bordered input-sm w-full"
                      @change="applyFilters"
                    />
                    <select v-model.number="filters.limit" class="select select-bordered select-sm w-full" @change="applyFilters">
                      <option :value="10">10 per page</option>
                      <option :value="25">25 per page</option>
                      <option :value="50">50 per page</option>
                      <option :value="100">100 per page</option>
                    </select>
                  </div>
                  
                  <!-- Actions -->
                  <div class="flex gap-2 flex-wrap">
                    <button
                      class="btn btn-sm btn-primary"
                      :disabled="logsLoading"
                      @click="loadLogs"
                    >
                      <IconRefresh class="w-4 h-4 mr-1" />
                      Refresh
                    </button>
                    <button
                      class="btn btn-sm btn-secondary"
                      @click="handleExport"
                    >
                      <IconDownload class="w-4 h-4 mr-1" />
                      Export
                    </button>
                    <button
                      v-if="selectedLogs.length > 0"
                      class="btn btn-sm btn-error"
                      @click="handleDeleteSelected"
                    >
                      <IconTrash class="w-4 h-4 mr-1" />
                      Delete ({{ selectedLogs.length }})
                    </button>
                    <button
                      class="btn btn-sm btn-warning"
                      @click="showCleanupModal = true"
                    >
                      <IconTrash class="w-4 h-4 mr-1" />
                      Cleanup
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Content -->
              <div class="flex-1 overflow-y-auto px-6 py-4">
                <!-- Logs Tab -->
                <div v-if="activeTab === 'logs'">
                  <!-- Loading -->
                  <div v-if="logsLoading" class="flex items-center justify-center py-12">
                    <span class="loading loading-spinner loading-lg"></span>
                  </div>
                  
                  <!-- Error -->
                  <div v-else-if="logsError" class="alert alert-error">
                    <IconAlertTriangle class="w-5 h-5" />
                    <span>{{ logsError }}</span>
                    <button class="btn btn-sm btn-ghost" @click="loadLogs">
                      Retry
                    </button>
                  </div>
                  
                  <!-- Empty State -->
                  <div v-else-if="logs.length === 0" class="text-center py-12">
                    <IconFileOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
                    <p class="text-base-content/70">No logs found</p>
                  </div>
                  
                  <!-- Logs Table -->
                  <div v-else class="overflow-x-auto">
                    <table class="table table-sm table-zebra">
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              class="checkbox checkbox-sm"
                              :checked="selectedLogs.length === logs.length && logs.length > 0"
                              @change="handleSelectAll"
                            />
                          </th>
                          <th>Time</th>
                          <th>Level</th>
                          <th>Action</th>
                          <th>Message</th>
                          <th>User</th>
                          <th>IP</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="log in logs" :key="log.id">
                          <td>
                            <input
                              type="checkbox"
                              class="checkbox checkbox-sm"
                              :checked="selectedLogs.includes(log.id)"
                              @change="toggleLogSelection(log.id)"
                            />
                          </td>
                          <td class="text-xs">{{ formatDate(log.createdAt) }}</td>
                          <td>
                            <div class="badge badge-sm" :class="getLevelColor(log.level)">
                              {{ log.level }}
                            </div>
                          </td>
                          <td>
                            <code class="text-xs">{{ log.action || '-' }}</code>
                          </td>
                          <td class="max-w-md truncate">{{ log.message }}</td>
                          <td class="text-xs">{{ log.user?.email || '-' }}</td>
                          <td class="text-xs">{{ log.ipAddress || '-' }}</td>
                          <td>
                            <button
                              class="btn btn-xs btn-ghost"
                              @click="viewLogDetail(log)"
                            >
                              <IconEye class="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    
                    <!-- Pagination -->
                    <div class="flex justify-between items-center mt-4">
                      <div class="text-sm text-base-content/70">
                        Showing {{ (pagination.currentPage - 1) * pagination.limit + 1 }} to
                        {{ Math.min(pagination.currentPage * pagination.limit, pagination.totalRecords) }} of
                        {{ pagination.totalRecords }} logs
                      </div>
                      <div class="join">
                        <button
                          class="join-item btn btn-sm"
                          :disabled="!pagination.hasPrevPage"
                          @click="changePage(filters.page - 1)"
                        >
                          «
                        </button>
                        <button class="join-item btn btn-sm">
                          Page {{ pagination.currentPage }} of {{ pagination.totalPages }}
                        </button>
                        <button
                          class="join-item btn btn-sm"
                          :disabled="!pagination.hasNextPage"
                          @click="changePage(filters.page + 1)"
                        >
                          »
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Stats Tab -->
                <div v-if="activeTab === 'stats'">
                  <!-- Loading -->
                  <div v-if="statsLoading" class="flex items-center justify-center py-12">
                    <span class="loading loading-spinner loading-lg"></span>
                  </div>
                  
                  <!-- Error -->
                  <div v-else-if="statsError" class="alert alert-error">
                    <IconAlertTriangle class="w-5 h-5" />
                    <span>{{ statsError }}</span>
                    <button class="btn btn-sm btn-ghost" @click="loadStats">
                      Retry
                    </button>
                  </div>
                  
                  <!-- Stats Content -->
                  <div v-else-if="stats" class="space-y-6">
                    <!-- Summary Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div class="stat bg-base-200 rounded-lg">
                        <div class="stat-title text-xs">Total Logs</div>
                        <div class="stat-value text-2xl">{{ stats.totalLogs }}</div>
                      </div>
                      <div class="stat bg-base-200 rounded-lg">
                        <div class="stat-title text-xs">Info</div>
                        <div class="stat-value text-2xl text-info">
                          {{ getLevelCount('info') }}
                        </div>
                      </div>
                      <div class="stat bg-base-200 rounded-lg">
                        <div class="stat-title text-xs">Warnings</div>
                        <div class="stat-value text-2xl text-warning">
                          {{ getLevelCount('warn') }}
                        </div>
                      </div>
                      <div class="stat bg-base-200 rounded-lg">
                        <div class="stat-title text-xs">Errors</div>
                        <div class="stat-value text-2xl text-error">
                          {{ getLevelCount('error') }}
                        </div>
                      </div>
                    </div>
                    
                    <!-- Logs by Level -->
                    <div class="card bg-base-200">
                      <div class="card-body">
                        <h3 class="card-title text-base">Logs by Level</h3>
                        <div class="space-y-2">
                          <div
                            v-for="item in stats.logsByLevel"
                            :key="item.level"
                            class="flex items-center justify-between p-2 bg-base-100 rounded"
                          >
                            <div class="flex items-center gap-2">
                              <div class="badge badge-sm" :class="getLevelColor(item.level)">
                                {{ item.level }}
                              </div>
                            </div>
                            <span class="font-bold">{{ item.count }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Top Actions -->
                    <div class="card bg-base-200">
                      <div class="card-body">
                        <h3 class="card-title text-base">Top Actions</h3>
                        <div class="space-y-2">
                          <div
                            v-for="item in stats.topActions"
                            :key="item.action"
                            class="flex items-center justify-between p-2 bg-base-100 rounded"
                          >
                            <code class="text-xs">{{ item.action }}</code>
                            <span class="font-bold">{{ item.count }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Top Users -->
                    <div v-if="stats.topUsers && stats.topUsers.length > 0" class="card bg-base-200">
                      <div class="card-body">
                        <h3 class="card-title text-base">Most Active Users</h3>
                        <div class="space-y-2">
                          <div
                            v-for="item in stats.topUsers"
                            :key="item.userId"
                            class="flex items-center justify-between p-2 bg-base-100 rounded"
                          >
                            <div>
                              <div class="font-medium text-sm">
                                {{ item.user?.firstName }} {{ item.user?.lastName }}
                              </div>
                              <div class="text-xs text-base-content/70">{{ item.user?.email }}</div>
                            </div>
                            <span class="font-bold">{{ item.count }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Footer -->
              <div class="px-6 py-4 bg-base-200 border-t border-base-300">
                <div class="flex items-center justify-between">
                  <div class="text-sm text-base-content/70">
                    <span v-if="activeTab === 'logs'">
                      Total: <strong>{{ pagination.totalRecords }}</strong> logs
                      <span v-if="selectedLogs.length > 0">
                        • <strong>{{ selectedLogs.length }}</strong> selected
                      </span>
                    </span>
                    <span v-else-if="activeTab === 'stats' && stats">
                      Total Logs: <strong>{{ stats.totalLogs }}</strong>
                    </span>
                  </div>
                  
                  <button class="btn btn-sm btn-ghost" @click="closeCanvas">
                    Close
                  </button>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
  
  <!-- Log Detail Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="selectedLog"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4"
        @click.self="selectedLog = null"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        <div class="relative bg-base-100 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
          <div class="sticky top-0 bg-base-200 px-6 py-4 border-b border-base-300 flex items-center justify-between">
            <h3 class="text-lg font-bold">Log Detail</h3>
            <button class="btn btn-sm btn-ghost btn-circle" @click="selectedLog = null">
              <IconX class="w-5 h-5" />
            </button>
          </div>
          
          <div class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium text-base-content/70">Level</label>
                <div class="mt-1">
                  <div class="badge" :class="getLevelColor(selectedLog.level)">
                    {{ selectedLog.level }}
                  </div>
                </div>
              </div>
              <div>
                <label class="text-sm font-medium text-base-content/70">Action</label>
                <div class="mt-1"><code>{{ selectedLog.action || '-' }}</code></div>
              </div>
              <div>
                <label class="text-sm font-medium text-base-content/70">Time</label>
                <div class="mt-1">{{ formatDate(selectedLog.createdAt) }}</div>
              </div>
              <div>
                <label class="text-sm font-medium text-base-content/70">IP Address</label>
                <div class="mt-1">{{ selectedLog.ipAddress || '-' }}</div>
              </div>
            </div>
            
            <div>
              <label class="text-sm font-medium text-base-content/70">Message</label>
              <div class="mt-1 p-3 bg-base-200 rounded">{{ selectedLog.message }}</div>
            </div>
            
            <div v-if="selectedLog.user">
              <label class="text-sm font-medium text-base-content/70">User</label>
              <div class="mt-1 p-3 bg-base-200 rounded">
                <div class="font-medium">{{ selectedLog.user.firstName }} {{ selectedLog.user.lastName }}</div>
                <div class="text-sm text-base-content/70">{{ selectedLog.user.email }}</div>
              </div>
            </div>
            
            <div v-if="selectedLog.method || selectedLog.path">
              <label class="text-sm font-medium text-base-content/70">Request</label>
              <div class="mt-1 p-3 bg-base-200 rounded">
                <div><strong>Method:</strong> {{ selectedLog.method || '-' }}</div>
                <div><strong>Path:</strong> {{ selectedLog.path || '-' }}</div>
                <div><strong>Status:</strong> {{ selectedLog.statusCode || '-' }}</div>
                <div><strong>Duration:</strong> {{ selectedLog.duration ? `${selectedLog.duration}ms` : '-' }}</div>
              </div>
            </div>
            
            <div v-if="selectedLog.metadata?.request">
              <label class="text-sm font-medium text-base-content/70">Request Details</label>
              <div class="mt-1 p-3 bg-base-200 rounded space-y-2">
                <div v-if="selectedLog.metadata.request.method">
                  <strong>Method:</strong> {{ selectedLog.metadata.request.method }}
                </div>
                <div v-if="selectedLog.metadata.request.path">
                  <strong>Path:</strong> {{ selectedLog.metadata.request.path }}
                </div>
                <div v-if="selectedLog.metadata.request.body">
                  <strong>Body:</strong>
                  <pre class="mt-1 p-2 bg-base-300 rounded text-xs overflow-x-auto">{{ JSON.stringify(selectedLog.metadata.request.body, null, 2) }}</pre>
                </div>
              </div>
            </div>
            
            <div v-if="selectedLog.metadata?.response">
              <label class="text-sm font-medium text-base-content/70">Response Details</label>
              <div class="mt-1 p-3 bg-base-200 rounded space-y-2">
                <div v-if="selectedLog.metadata.response.statusCode">
                  <strong>Status Code:</strong> 
                  <span class="badge badge-sm ml-2" :class="selectedLog.metadata.response.statusCode >= 400 ? 'badge-error' : 'badge-success'">
                    {{ selectedLog.metadata.response.statusCode }}
                  </span>
                </div>
                <div v-if="selectedLog.metadata.response.data">
                  <strong>Data:</strong>
                  <pre class="mt-1 p-2 bg-base-300 rounded text-xs overflow-x-auto">{{ typeof selectedLog.metadata.response.data === 'string' ? selectedLog.metadata.response.data : JSON.stringify(selectedLog.metadata.response.data, null, 2) }}</pre>
                </div>
              </div>
            </div>
            
            <div v-if="selectedLog.metadata?.executionTime">
              <label class="text-sm font-medium text-base-content/70">Execution Time</label>
              <div class="mt-1 p-3 bg-base-200 rounded">
                {{ selectedLog.metadata.executionTime }}ms
              </div>
            </div>
            
            <div v-if="selectedLog.errorStack">
              <label class="text-sm font-medium text-base-content/70">Error Stack</label>
              <pre class="mt-1 p-3 bg-base-300 rounded text-xs overflow-x-auto">{{ selectedLog.errorStack }}</pre>
            </div>
            
            <div v-if="selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0">
              <label class="text-sm font-medium text-base-content/70">Metadata</label>
              <pre class="mt-1 p-3 bg-base-300 rounded text-xs overflow-x-auto">{{ JSON.stringify(selectedLog.metadata, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
  
  <!-- Cleanup Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="showCleanupModal"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4"
        @click.self="showCleanupModal = false"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        <div class="relative bg-base-100 rounded-lg shadow-xl max-w-md w-full">
          <div class="bg-base-200 px-6 py-4 border-b border-base-300 flex items-center justify-between">
            <h3 class="text-lg font-bold">Cleanup Old Logs</h3>
            <button class="btn btn-sm btn-ghost btn-circle" @click="showCleanupModal = false">
              <IconX class="w-5 h-5" />
            </button>
          </div>
          
          <div class="p-6 space-y-4">
            <p class="text-sm text-base-content/70">
              Delete logs older than specified days. Auto-cleanup runs daily at 2:00 AM.
            </p>
            
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Days to Keep</span>
              </label>
              <input
                v-model.number="cleanupDays"
                type="number"
                min="1"
                max="365"
                class="input input-bordered"
              />
            </div>
            
            <div class="flex gap-2 justify-end">
              <button class="btn btn-ghost" @click="showCleanupModal = false">
                Cancel
              </button>
              <button
                class="btn btn-warning"
                @click="handleCleanup"
              >
                <IconTrash class="w-4 h-4 mr-2" />
                Delete Logs
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAuditLog } from '@/composables/admin/useAuditLog'
import {
  IconX,
  IconSearch,
  IconAlertTriangle,
  IconFileOff,
  IconFileAnalytics,
  IconList,
  IconChartBar,
  IconRefresh,
  IconDownload,
  IconTrash,
  IconEye
} from '@tabler/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

// Audit log composable
const {
  logs,
  logsLoading,
  logsError,
  pagination,
  stats,
  statsLoading,
  statsError,
  selectedLogs,
  fetchLogs,
  fetchStats,
  exportLogs,
  deleteLogs,
  cleanupLogs,
  getLevelColor,
  formatDate,
  toggleLogSelection,
  selectAllLogs
} = useAuditLog()

// Local state
const activeTab = ref('logs')
const filters = ref({
  page: 1,
  limit: 50,
  level: 'all',
  search: '',
  startDate: '',
  endDate: '',
  sortBy: 'createdAt',
  sortOrder: 'DESC'
})
const selectedLog = ref(null)
const showCleanupModal = ref(false)
const cleanupDays = ref(7)
let searchTimeout = null

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Watch for open state
watch(isOpen, async (newValue) => {
  if (newValue) {
    await loadLogs()
  }
})

// Load logs
const loadLogs = async () => {
  await fetchLogs(filters.value)
}

// Load stats
const loadStats = async () => {
  await fetchStats({
    startDate: filters.value.startDate,
    endDate: filters.value.endDate
  })
}

// Change tab
const changeTab = async (tab) => {
  activeTab.value = tab
  
  if (tab === 'stats' && !stats.value) {
    await loadStats()
  }
}

// Apply filters
const applyFilters = () => {
  filters.value.page = 1
  loadLogs()
}

// Debounce search
const debounceSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    applyFilters()
  }, 500)
}

// Change page
const changePage = (page) => {
  filters.value.page = page
  loadLogs()
}

// Close canvas
const closeCanvas = () => {
  isOpen.value = false
}

// Handle select all
const handleSelectAll = (event) => {
  selectAllLogs(event.target.checked)
}

// View log detail
const viewLogDetail = (log) => {
  selectedLog.value = log
}

// Handle export
const handleExport = async () => {
  await exportLogs(filters.value)
}

// Handle delete selected
const handleDeleteSelected = async () => {
  if (selectedLogs.value.length === 0) return
  
  if (!confirm(`Delete ${selectedLogs.value.length} selected log(s)?`)) return
  
  await deleteLogs(selectedLogs.value)
  await loadLogs()
}

// Handle cleanup
const handleCleanup = async () => {
  
  await cleanupLogs(cleanupDays.value)
  showCleanupModal.value = false
  await loadLogs()
  if (activeTab.value === 'stats') {
    await loadStats()
  }
}

// Get level count from stats
const getLevelCount = (level) => {
  if (!stats.value || !stats.value.logsByLevel) return 0
  const item = stats.value.logsByLevel.find(l => l.level === level)
  return item ? item.count : 0
}

// Keyboard shortcuts
const handleKeyDown = (event) => {
  if (event.key === 'Escape') {
    if (selectedLog.value) {
      selectedLog.value = null
    } else if (showCleanupModal.value) {
      showCleanupModal.value = false
    } else if (isOpen.value) {
      closeCanvas()
    }
  }
}

// Mount/unmount keyboard listener
watch(isOpen, (newValue) => {
  if (newValue) {
    window.addEventListener('keydown', handleKeyDown)
  } else {
    window.removeEventListener('keydown', handleKeyDown)
  }
})
</script>

<style scoped>
/* Canvas transitions */
.canvas-enter-active,
.canvas-leave-active {
  transition: opacity 0.3s ease;
}

.canvas-enter-from,
.canvas-leave-to {
  opacity: 0;
}

.canvas-enter-active > div > div,
.canvas-leave-active > div > div {
  transition: transform 0.3s ease;
}

.canvas-enter-from > div > div,
.canvas-leave-to > div > div {
  transform: translateX(100%);
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* Scrollbar styling */
.overflow-y-auto::-webkit-scrollbar,
.overflow-x-auto::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track,
.overflow-x-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb,
.overflow-x-auto::-webkit-scrollbar-thumb {
  background: hsl(var(--bc) / 0.2);
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover,
.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--bc) / 0.3);
}

.stat {
  padding: 1rem;
}

.stat-title {
  opacity: 0.7;
}

.stat-value {
  font-weight: bold;
}
</style>
