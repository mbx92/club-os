<route lang="yaml">
meta:
  title: Hikvision Devices
  layout: default
</route>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Hikvision Devices</h1>
        <p class="text-base-content/60 mt-1">Manage fingerprint attendance devices</p>
      </div>
      <button @click="openAddModal" class="btn btn-primary">
        <IconPlus class="w-5 h-5 mr-2" />
        Add Device
      </button>
    </div>

    <!-- Devices Grid -->
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="devices.length === 0" class="text-center py-12">
      <IconDeviceDesktop class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
      <h3 class="text-xl font-semibold mb-2">No Devices Registered</h3>
      <p class="text-base-content/60 mb-4">Add your first Hikvision fingerprint device to get started.</p>
      <button @click="openAddModal" class="btn btn-primary">
        <IconPlus class="w-5 h-5 mr-2" />
        Add Device
      </button>
    </div>

    <div v-else class="grid grid-cols-1 gap-4">
      <div v-for="dev in devices" :key="dev.id" class="card bg-base-100 shadow-xl card-side">
        <div class="card-body">
          <div class="flex flex-col lg:flex-row lg:items-center gap-4">
            <!-- Device Info -->
            <div class="flex items-start gap-4 flex-1 min-w-0">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="card-title text-lg">{{ dev.name }}</h3>
                  <div class="badge badge-sm" :class="dev.isActive ? 'badge-success' : 'badge-error'">
                    {{ dev.isActive ? 'Active' : 'Inactive' }}
                  </div>
                  <div class="badge badge-sm" :class="dev.useForMemberCheckIn ? 'badge-info' : 'badge-ghost'">
                    {{ dev.useForMemberCheckIn ? 'Member Check-in' : 'No Check-in' }}
                  </div>
                </div>
                <div class="flex flex-wrap gap-x-6 gap-y-1 text-sm text-base-content/60">
                  <span class="font-mono">{{ dev.ipAddress }}:{{ dev.port }}</span>
                  <span>User: <strong class="text-base-content">{{ dev.username }}</strong></span>
                  <span>SN: <strong class="text-base-content">{{ dev.serialNumber || '—' }}</strong></span>
                  <span>Last Sync: <strong class="text-base-content">{{ dev.lastSyncAt ? formatDate(dev.lastSyncAt) : 'Never' }}</strong></span>
                  <span v-if="dev.location">Location: <strong class="text-base-content">{{ dev.location.name || dev.location }}</strong></span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2 flex-shrink-0 flex-wrap">
              <router-link :to="`/gym/hikvision/devices/${dev.id}/employees`" class="btn btn-sm btn-outline btn-primary">
                <IconUsers class="w-4 h-4" /> Employees
              </router-link>
              <router-link :to="`/gym/hikvision/devices/${dev.id}/sync`" class="btn btn-sm btn-outline btn-secondary">
                <IconRefreshDot class="w-4 h-4" /> Sync Status
              </router-link>
              <button class="btn btn-sm btn-outline btn-info" :class="{ loading: testLoading }" @click="handleTestConnection(dev.id)" :disabled="testLoading">
                <IconPlugConnected class="w-4 h-4" /> Test
              </button>
              <router-link :to="`/gym/hikvision/devices/${dev.id}/logs`" class="btn btn-sm btn-outline">
                <IconFileText class="w-4 h-4" /> Logs
              </router-link>
              <div class="dropdown dropdown-end">
                <label tabindex="0" class="btn btn-ghost btn-sm btn-square">
                  <IconDotsVertical class="w-4 h-4" />
                </label>
                <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52">
                  <li><a @click="openEditModal(dev)"><IconEdit class="w-4 h-4" /> Edit</a></li>
                  <li><a @click="openConfigurePushModal(dev)"><IconSend class="w-4 h-4" /> Configure Push</a></li>
                  <li><a @click="handleSyncTime(dev.id)"><IconClock class="w-4 h-4" /> Sync Time</a></li>
                  <li class="text-error"><a @click="confirmDelete(dev)"><IconTrash class="w-4 h-4" /> Delete</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sync Result Toast -->
    <div v-if="syncResult" class="toast toast-end toast-bottom z-50">
      <div class="alert alert-info">
        <div>
          <p class="font-bold">Sync Complete</p>
          <p class="text-sm">Processed: {{ syncResult.processed }} | Matched: {{ syncResult.matched }} | Duplicates: {{ syncResult.duplicates }}</p>
        </div>
        <button class="btn btn-sm btn-ghost" @click="syncResult = null">✕</button>
      </div>
    </div>

    <!-- Add/Edit Device Modal -->
    <dialog ref="deviceModal" class="modal">
      <div class="modal-box w-11/12 max-w-lg">
        <h3 class="font-bold text-lg mb-4">{{ editingDevice ? 'Edit Device' : 'Add New Device' }}</h3>
        <form @submit.prevent="handleSaveDevice">
          <div class="space-y-4">
            <div class="form-control">
              <label class="label"><span class="label-text">Device Name *</span></label>
              <input type="text" v-model="form.name" class="input input-bordered w-full" placeholder="e.g. Fingerprint Utama" required />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label"><span class="label-text">IP Address *</span></label>
                <input type="text" v-model="form.ipAddress" class="input input-bordered w-full" placeholder="192.168.1.23" required :disabled="!!editingDevice" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Port</span></label>
                <input type="number" v-model="form.port" class="input input-bordered w-full" placeholder="80" />
              </div>
            </div>
            <div v-if="!editingDevice" class="grid grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label"><span class="label-text">Username *</span></label>
                <input type="text" v-model="form.username" class="input input-bordered w-full" placeholder="admin" required />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Password *</span></label>
                <input type="password" v-model="form.password" class="input input-bordered w-full" placeholder="••••••" required />
              </div>
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text">Push URL <span class="text-base-content/50 text-xs">(optional during creation)</span></span>
              </label>
              <input type="url" v-model="form.pushUrl" class="input input-bordered w-full" placeholder="http://server.com/api/v1/integrations/hikvision/event" />
            </div>
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-3">
                <input type="checkbox" v-model="form.useForMemberCheckIn" class="checkbox checkbox-primary" />
                <span class="label-text">Use for member check-in</span>
              </label>
            </div>
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-3">
                <input type="checkbox" v-model="form.isActive" class="checkbox checkbox-primary" />
                <span class="label-text">Active (included in cron sync)</span>
              </label>
            </div>
          </div>
          <div class="modal-action">
            <button type="button" class="btn" @click="closeDeviceModal">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              <span v-if="loading" class="loading loading-spinner loading-sm"></span>
              {{ editingDevice ? 'Update' : 'Register' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- Configure Push Modal -->
    <dialog ref="pushModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Configure Push URL</h3>
        <p class="text-sm text-base-content/60 mb-4">
          Set the server URL where the device will push attendance events in real-time.
        </p>
        <div class="form-control">
          <label class="label"><span class="label-text">Server URL *</span></label>
          <input type="url" v-model="pushUrl" class="input input-bordered w-full" placeholder="http://192.168.1.100:8000/api/v1/integrations/hikvision/event" required />
        </div>
        <div class="modal-action">
          <button class="btn" @click="closePushModal">Cancel</button>
          <button class="btn btn-primary" @click="handleConfigurePush" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            Configure
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- Delete Confirmation Modal -->
    <dialog ref="deleteModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg text-error">Delete Device</h3>
        <p class="py-4">
          Are you sure you want to delete <strong>{{ deletingDevice?.name }}</strong>?
          This action cannot be undone.
        </p>
        <div class="modal-action">
          <button class="btn" @click="closeDeleteModal">Cancel</button>
          <button class="btn btn-error" @click="handleDelete" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useHikvisionDevices } from '@/composables/gym/hikvision'
import {
  IconPlus,
  IconDeviceDesktop,
  IconDotsVertical,
  IconEdit,
  IconPlugConnected,
  IconSend,
  IconClock,
  IconRefreshDot,
  IconFileText,
  IconTrash,
  IconUsers,
} from '@tabler/icons-vue'

const {
  devices,
  loading,
  testLoading,
  syncResult,
  fetchDevices,
  createDevice,
  updateDevice,
  deleteDevice,
  testConnection,
  configurePush,
  syncTime,
} = useHikvisionDevices()

// Refs
const deviceModal = ref(null)
const pushModal = ref(null)
const deleteModal = ref(null)
const editingDevice = ref(null)
const deletingDevice = ref(null)
const pushDeviceId = ref(null)
const pushUrl = ref('')

const form = ref({
  name: '',
  ipAddress: '',
  port: 80,
  username: 'admin',
  password: '',
  pushUrl: '',
  useForMemberCheckIn: false,
  isActive: true,
})

// Format date helper
const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}

// Lifecycle
onMounted(() => {
  fetchDevices()
})

// Modal operations
const openAddModal = () => {
  editingDevice.value = null
  form.value = {
    name: '',
    ipAddress: '',
    port: 80,
    username: 'admin',
    password: '',
    pushUrl: '',
    useForMemberCheckIn: false,
    isActive: true,
  }
  deviceModal.value?.showModal()
}

const openEditModal = (dev) => {
  editingDevice.value = dev
  form.value = {
    name: dev.name,
    ipAddress: dev.ipAddress,
    port: dev.port,
    username: dev.username,
    password: '',
    pushUrl: dev.pushUrl || '',
    useForMemberCheckIn: dev.useForMemberCheckIn,
    isActive: dev.isActive,
  }
  deviceModal.value?.showModal()
}

const closeDeviceModal = () => {
  deviceModal.value?.close()
}

const openConfigurePushModal = (dev) => {
  pushDeviceId.value = dev.id
  const saved = localStorage.getItem(`hikvision_push_url_${dev.id}`)
  pushUrl.value = saved || dev.pushUrl || dev.serverUrl || dev.eventServerUrl || ''
  pushModal.value?.showModal()
}

const closePushModal = () => {
  pushModal.value?.close()
}

const confirmDelete = (dev) => {
  deletingDevice.value = dev
  deleteModal.value?.showModal()
}

const closeDeleteModal = () => {
  deleteModal.value?.close()
}

// Handlers
const handleSaveDevice = async () => {
  try {
    if (editingDevice.value) {
      await updateDevice(editingDevice.value.id, {
        name: form.value.name,
        pushUrl: form.value.pushUrl,
        useForMemberCheckIn: form.value.useForMemberCheckIn,
        isActive: form.value.isActive,
      })
    } else {
      await createDevice(form.value)
    }
    closeDeviceModal()
    await fetchDevices()
  } catch (err) {
    // handled by composable
  }
}

const handleTestConnection = async (id) => {
  try {
    await testConnection(id)
  } catch (err) {
    // handled by composable
  }
}

const handleSyncTime = async (id) => {
  try {
    await syncTime(id)
  } catch (err) {
    // handled by composable
  }
}

const handleConfigurePush = async () => {
  try {
    await configurePush(pushDeviceId.value, pushUrl.value)
    localStorage.setItem(`hikvision_push_url_${pushDeviceId.value}`, pushUrl.value)
    closePushModal()
  } catch (err) {
    // handled by composable
  }
}

const handleDelete = async () => {
  try {
    await deleteDevice(deletingDevice.value.id)
    closeDeleteModal()
    await fetchDevices()
  } catch (err) {
    // handled by composable
  }
}
</script>
