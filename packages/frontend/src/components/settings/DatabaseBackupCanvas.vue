<template>
  <!-- Canvas Overlay -->
  <Teleport to="body">
    <Transition name="canvas">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 overflow-hidden"
        @click.self="handleClose"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="handleClose"></div>
        
        <!-- Canvas Panel -->
        <div class="absolute inset-y-0 right-0 max-w-full flex">
          <div class="w-screen max-w-5xl">
            <div class="h-full flex flex-col bg-base-100 shadow-xl">
              
              <!-- Header -->
              <div class="px-6 py-4 bg-base-200 border-b border-base-300">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="p-2 bg-success/10 rounded-lg">
                      <IconDatabase class="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <h2 class="text-xl font-bold">Database Backup & Restore</h2>
                      <p class="text-sm text-base-content/70">
                        Manage database backups for data protection
                      </p>
                    </div>
                  </div>
                  
                  <button
                    class="btn btn-sm btn-ghost btn-circle"
                    @click="handleClose"
                  >
                    <IconX class="w-5 h-5" />
                  </button>
                </div>
                
                <!-- Tabs -->
                <div class="mt-4 flex flex-wrap items-center gap-3">
                  <div role="tablist" class="tabs tabs-boxed tabs-sm">
                    <button
                      role="tab"
                      class="tab gap-1.5"
                      :class="{ 'tab-active': activeTab === 'backup' }"
                      @click="activeTab = 'backup'"
                    >
                      <IconDatabase class="w-4 h-4" />
                      Backup
                    </button>
                    <button
                      role="tab"
                      class="tab gap-1.5"
                      :class="{ 'tab-active': activeTab === 'import' }"
                      @click="activeTab = 'import'"
                    >
                      <IconFileImport class="w-4 h-4" />
                      Import Production
                    </button>
                  </div>

                  <template v-if="activeTab === 'backup'">
                    <button
                      class="btn btn-success btn-sm gap-2"
                      :disabled="isCreatingBackup"
                      @click="handleCreateBackup"
                    >
                      <span v-if="isCreatingBackup" class="loading loading-spinner loading-sm"></span>
                      <IconPlus v-else class="w-4 h-4" />
                      Create Backup
                    </button>
                    <button
                      class="btn btn-ghost btn-sm gap-2"
                      :disabled="isLoading"
                      @click="handleRefresh"
                    >
                      <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
                      Refresh
                    </button>
                  </template>
                </div>
              </div>
              
              <!-- Content -->
              <div class="flex-1 overflow-y-auto p-6 space-y-6">
                <ProductionImportPanel v-if="activeTab === 'import'" />

                <template v-else>
                <!-- Google Drive Backup Settings -->
                <div class="card bg-base-200 shadow">
                  <div class="card-body">
                    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 class="card-title text-lg flex items-center gap-2">
                          <IconCloudUpload class="w-5 h-5" />
                          Google Drive Backup
                        </h3>
                        <p class="text-sm text-base-content/70 mt-1">
                          Simpan konfigurasi folder Google Drive untuk backup tenant ini.
                        </p>
                      </div>

                      <div class="flex flex-wrap gap-2">
                        <span class="badge" :class="googleDriveSettings.enabled ? 'badge-success' : 'badge-ghost'">
                          {{ googleDriveSettings.enabled ? 'Enabled' : 'Disabled' }}
                        </span>
                        <span
                          class="badge"
                          :class="googleDriveSettings.required && googleDriveSettings.enabled ? 'badge-warning' : 'badge-ghost'"
                        >
                          {{ googleDriveSettings.required && googleDriveSettings.enabled ? 'Required' : 'Optional' }}
                        </span>
                      </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <label class="flex items-start gap-3 p-4 bg-base-100 rounded-xl border border-base-300 cursor-pointer">
                        <input
                          v-model="googleDriveSettings.enabled"
                          type="checkbox"
                          class="checkbox checkbox-sm checkbox-primary mt-0.5"
                        >
                        <div>
                          <div class="font-medium">Aktifkan Google Drive Backup</div>
                          <div class="text-sm text-base-content/60">
                            Backup akan memakai konfigurasi Google Drive tenant.
                          </div>
                        </div>
                      </label>

                      <label
                        class="flex items-start gap-3 p-4 bg-base-100 rounded-xl border border-base-300"
                        :class="googleDriveSettings.enabled ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'"
                      >
                        <input
                          v-model="googleDriveSettings.required"
                          type="checkbox"
                          class="checkbox checkbox-sm checkbox-warning mt-0.5"
                          :disabled="!googleDriveSettings.enabled"
                        >
                        <div>
                          <div class="font-medium">Wajib Upload ke Google Drive</div>
                          <div class="text-sm text-base-content/60">
                            Tandai backup cloud sebagai kebutuhan wajib untuk tenant ini.
                          </div>
                        </div>
                      </label>
                    </div>

                    <div class="mt-4">
                      <label class="label">
                        <span class="label-text font-medium flex items-center gap-2">
                          <IconFolder class="w-4 h-4" />
                          Google Drive Folder ID
                        </span>
                      </label>
                      <input
                        v-model="googleDriveSettings.folderId"
                        type="text"
                        class="input input-bordered w-full"
                        placeholder="1ESvPnfhl6eG21uIyE42ywJY8FtM3xDuV"
                      >
                      <label class="label">
                        <span class="label-text-alt text-base-content/60">
                          Isi folder ID tujuan tempat file backup akan disimpan.
                        </span>
                      </label>
                    </div>

                    <div class="card-actions justify-end mt-2">
                      <button
                        class="btn btn-primary btn-sm gap-2"
                        :disabled="isSavingGoogleDriveSettings"
                        @click="handleSaveGoogleDriveSettings"
                      >
                        <span v-if="isSavingGoogleDriveSettings" class="loading loading-spinner loading-sm"></span>
                        <IconDeviceFloppy v-else class="w-4 h-4" />
                        Simpan Google Drive
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Database Info -->
                <div v-if="databaseInfo" class="card bg-base-200 shadow">
            <div class="card-body">
              <h3 class="card-title text-lg flex items-center gap-2">
                <IconInfoCircle class="w-5 h-5" />
                Database Information
              </h3>
              
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                <div>
                  <div class="text-xs text-base-content/60 mb-1">Database</div>
                  <div class="font-semibold">{{ databaseInfo.database }}</div>
                </div>
                <div>
                  <div class="text-xs text-base-content/60 mb-1">Type</div>
                  <div class="font-semibold uppercase">{{ databaseInfo.dialect }}</div>
                </div>
                <div>
                  <div class="text-xs text-base-content/60 mb-1">Size</div>
                  <div class="font-semibold">{{ databaseInfo.size }}</div>
                </div>
                <div>
                  <div class="text-xs text-base-content/60 mb-1">Tables</div>
                  <div class="font-semibold">{{ databaseInfo.tableCount }}</div>
                </div>
              </div>
              
              <div class="mt-3 p-3 bg-base-300 rounded-lg">
                <div class="text-xs text-base-content/60 mb-1">Environment</div>
                <div class="flex items-center gap-2">
                  <span class="badge" :class="databaseInfo.environment === 'production' ? 'badge-error' : 'badge-warning'">
                    {{ databaseInfo.environment }}
                  </span>
                  <span class="text-sm">{{ databaseInfo.host }}:{{ databaseInfo.port }}</span>
                </div>
                </div>
              </div>
            </div>

                <!-- Stats -->
                <div v-if="backups.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="stat bg-base-200 rounded-lg shadow">
                    <div class="stat-figure text-primary">
                      <IconFiles class="w-8 h-8" />
                    </div>
                    <div class="stat-title text-xs">Total Backups</div>
                    <div class="stat-value text-2xl">{{ backups.length }}</div>
                  </div>
                  
                  <div class="stat bg-base-200 rounded-lg shadow">
                    <div class="stat-figure text-secondary">
                      <IconFileZip class="w-8 h-8" />
                    </div>
                    <div class="stat-title text-xs">Total Size</div>
                    <div class="stat-value text-2xl">{{ totalSizeMB }} MB</div>
                  </div>
                  
                  <div class="stat bg-base-200 rounded-lg shadow">
                    <div class="stat-figure text-accent">
                      <IconClock class="w-8 h-8" />
                    </div>
                    <div class="stat-title text-xs">Latest Backup</div>
                    <div class="stat-value text-sm">{{ latestBackupTime }}</div>
                  </div>
                </div>

                <!-- Backups List -->
                <div class="card bg-base-200 shadow">
                  <div class="card-body">
                    <h3 class="card-title text-lg flex items-center gap-2">
                      <IconList class="w-5 h-5" />
                      Backup Files ({{ backups.length }})
                    </h3>

                    <!-- Loading State -->
                    <div v-if="isLoading && backups.length === 0" class="flex justify-center py-12">
                      <span class="loading loading-spinner loading-lg text-primary"></span>
                    </div>

                    <!-- Empty State -->
                    <div v-else-if="backups.length === 0" class="text-center py-12">
                      <IconFileOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
                      <p class="text-base-content/70">No backup files found</p>
                      <p class="text-sm text-base-content/50 mt-2">Create your first backup to get started</p>
                    </div>

                    <!-- Backups Table -->
                    <div v-else class="overflow-x-auto mt-4">
                      <table class="table table-zebra w-full">
                        <thead>
                          <tr>
                            <th>Filename</th>
                            <th>Size</th>
                            <th>Environment</th>
                            <th>Created</th>
                            <th class="text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="backup in sortedBackups" :key="backup.filename">
                            <td>
                              <div class="flex items-center gap-2">
                                <IconFile class="w-4 h-4 text-primary" />
                                <span class="font-mono text-xs">{{ backup.filename }}</span>
                              </div>
                            </td>
                            <td>
                              <span class="badge badge-ghost">{{ backup.sizeMB }} MB</span>
                            </td>
                            <td>
                              <span class="badge" :class="getEnvironmentBadge(backup.environment)">
                                {{ backup.environment }}
                              </span>
                            </td>
                            <td>
                              <div class="text-sm">
                                <div>{{ formatDate(backup.createdAt) }}</div>
                                <div class="text-xs text-base-content/50">{{ formatTime(backup.createdAt) }}</div>
                              </div>
                            </td>
                            <td>
                              <div class="flex justify-end gap-2">
                                <button
                                  class="btn btn-ghost btn-xs gap-1"
                                  @click="handleDownload(backup.filename)"
                                  title="Download backup"
                                >
                                  <IconDownload class="w-4 h-4" />
                                </button>
                                <button
                                  class="btn btn-ghost btn-xs text-error gap-1"
                                  @click="handleDeleteClick(backup)"
                                  title="Delete backup"
                                >
                                  <IconTrash class="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <!-- Warning Notice -->
                <div class="alert alert-warning">
                  <IconAlertTriangle class="w-5 h-5" />
                  <div class="text-sm">
                    <div class="font-semibold">Important Notes:</div>
                    <ul class="list-disc list-inside mt-2 space-y-1">
                      <li>Backups are stored locally on the server</li>
                      <li>Only the last 10 backups are kept automatically</li>
                      <li>Download important backups for off-site storage</li>
                      <li>Production database restore requires explicit confirmation</li>
                    </ul>
                  </div>
                </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Delete Confirmation Modal -->
  <dialog ref="deleteModal" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg flex items-center gap-2">
        <IconAlertTriangle class="w-6 h-6 text-error" />
        Delete Backup File
      </h3>
      <p class="py-4">
        Are you sure you want to delete this backup file?
        <span class="block mt-2 font-mono text-sm bg-base-200 p-2 rounded">
          {{ backupToDelete?.filename }}
        </span>
        This action cannot be undone.
      </p>
      <div class="modal-action">
        <button class="btn btn-ghost" @click="closeDeleteModal">Cancel</button>
        <button class="btn btn-error" @click="confirmDelete">
          <IconTrash class="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeDeleteModal">close</button>
    </form>
  </dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useDatabaseBackup } from '@/composables/admin/useDatabaseBackup'
import ProductionImportPanel from '@/components/settings/ProductionImportPanel.vue'
import { useTenantSettings } from '@/composables/admin/useTenantSettings'
import { useNotification } from '@/composables/core/useNotification'
import { useAuthStore } from '@/stores/auth'
import {
  IconDatabase,
  IconX,
  IconPlus,
  IconRefresh,
  IconInfoCircle,
  IconCloudUpload,
  IconFolder,
  IconDeviceFloppy,
  IconFiles,
  IconFileZip,
  IconClock,
  IconList,
  IconFileOff,
  IconFile,
  IconDownload,
  IconTrash,
  IconAlertTriangle,
  IconFileImport
} from '@tabler/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

// Composables
const authStore = useAuthStore()
const { showWarning } = useNotification()
const {
  backups,
  databaseInfo,
  isLoading,
  isCreatingBackup,
  fetchBackups,
  createBackup,
  downloadBackup,
  deleteBackup,
  fetchDatabaseInfo
} = useDatabaseBackup()
const {
  currentTenantId,
  fetchTenantSettings,
  patchTenantSettings,
  saving: isSavingGoogleDriveSettings
} = useTenantSettings()

// Refs
const activeTab = ref('backup')
const deleteModal = ref(null)
const backupToDelete = ref(null)
const createDefaultGoogleDriveSettings = () => ({
  enabled: false,
  required: false,
  folderId: ''
})
const googleDriveSettings = ref(createDefaultGoogleDriveSettings())

// Computed
const sortedBackups = computed(() => {
  return [...backups.value].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
})

const totalSizeMB = computed(() => {
  const total = backups.value.reduce((sum, backup) => {
    return sum + parseFloat(backup.sizeMB || 0)
  }, 0)
  return total.toFixed(2)
})

const latestBackupTime = computed(() => {
  if (backups.value.length === 0) return 'N/A'
  const latest = sortedBackups.value[0]
  return formatRelativeTime(latest.createdAt)
})

// Methods
const handleClose = () => {
  emit('update:modelValue', false)
  emit('close')
}

const normalizeGoogleDriveSettings = (googleDrive = {}) => ({
  enabled: Boolean(googleDrive.enabled),
  required: Boolean(googleDrive.required),
  folderId: googleDrive.folderId || ''
})

const applyGoogleDriveSettings = (settingsSource = null) => {
  googleDriveSettings.value = normalizeGoogleDriveSettings(
    settingsSource?.backup?.googleDrive || {}
  )
}

const loadGoogleDriveSettings = async () => {
  applyGoogleDriveSettings(authStore.user?.tenant?.settings)

  if (!currentTenantId.value) return

  try {
    const tenantData = await fetchTenantSettings()
    applyGoogleDriveSettings(tenantData?.settings)
  } catch (error) {
    console.error('Failed to load Google Drive backup settings:', error)
  }
}

const handleRefresh = async () => {
  await Promise.all([
    fetchBackups(),
    fetchDatabaseInfo(),
    loadGoogleDriveSettings()
  ])
}

const handleSaveGoogleDriveSettings = async () => {
  const folderId = googleDriveSettings.value.folderId.trim()

  if (googleDriveSettings.value.enabled && !folderId) {
    showWarning('Folder ID wajib diisi saat Google Drive backup aktif')
    return
  }

  const payload = {
    backup: {
      googleDrive: {
        enabled: googleDriveSettings.value.enabled,
        required: googleDriveSettings.value.enabled ? googleDriveSettings.value.required : false,
        folderId
      }
    }
  }

  const result = await patchTenantSettings(
    payload,
    'Google Drive backup settings updated successfully'
  )

  if (result.success) {
    applyGoogleDriveSettings(payload)
  }
}

const handleCreateBackup = async () => {
  try {
    await createBackup()
  } catch (error) {
    console.error('Failed to create backup:', error)
  }
}

const handleDownload = async (filename) => {
  await downloadBackup(filename)
}

const handleDeleteClick = (backup) => {
  backupToDelete.value = backup
  deleteModal.value?.showModal()
}

const closeDeleteModal = () => {
  deleteModal.value?.close()
  backupToDelete.value = null
}

const confirmDelete = async () => {
  if (backupToDelete.value) {
    const success = await deleteBackup(backupToDelete.value.filename)
    if (success) {
      closeDeleteModal()
    }
  }
}

const getEnvironmentBadge = (environment) => {
  const badges = {
    production: 'badge-error',
    staging: 'badge-warning',
    development: 'badge-info',
    test: 'badge-ghost'
  }
  return badges[environment] || 'badge-neutral'
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatRelativeTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return formatDate(dateString)
}

// Watch for canvas open
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    await handleRefresh()
  }
})

// Initial load when mounted
onMounted(() => {
  if (props.modelValue) {
    handleRefresh()
  }
})
</script>

<style scoped>
/* Canvas transition */
.canvas-enter-active,
.canvas-leave-active {
  transition: opacity 0.3s ease;
}

.canvas-enter-from,
.canvas-leave-to {
  opacity: 0;
}

.canvas-enter-active .absolute.inset-y-0,
.canvas-leave-active .absolute.inset-y-0 {
  transition: transform 0.3s ease;
}

.canvas-enter-from .absolute.inset-y-0,
.canvas-leave-to .absolute.inset-y-0 {
  transform: translateX(100%);
}

.stat {
  padding: 1rem;
}

.stat-title {
  opacity: 0.7;
  font-size: 0.75rem;
}

.stat-value {
  font-weight: bold;
}

.table th {
  background-color: hsl(var(--b3));
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
