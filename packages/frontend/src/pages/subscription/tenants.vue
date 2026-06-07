<route lang="yaml">
meta:
  title: Tenants
  layout: default
</route>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">Tenants</h1>
      <button @click="openAddModal" class="btn btn-primary p-2">
        <IconPlus class="w-5 h-5" />
        Add Tenant
      </button>
    </div>
    
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Tenant Name</th>
                <th>Domain</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Users Count</th>
                <th>Active</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="tenants.length === 0">
                <td colspan="8" class="text-center py-8 text-base-content/60">
                  No tenants found. Click "Add Tenant" to create one.
                </td>
              </tr>
              <tr v-for="tenant in tenants" :key="tenant.id">
                <td>
                  <div class="flex items-center gap-3">
                    <div v-if="tenant.logo" class="avatar">
                      <div class="mask mask-squircle w-12 h-12">
                        <img :src="tenant.logo" :alt="tenant.name" />
                      </div>
                    </div>
                    <div>
                      <div class="font-bold">{{ tenant.name }}</div>
                      <div class="text-sm opacity-50">{{ tenant.address }}</div>
                    </div>
                  </div>
                </td>
                <td>{{ tenant.domain }}</td>
                <td>{{ tenant.email }}</td>
                <td>{{ tenant.phone }}</td>
                <td>
                  <span class="badge badge-ghost">{{ tenant.users?.length || 0 }}</span>
                </td>
                <td>
                  <input 
                    type="checkbox" 
                    class="toggle toggle-success" 
                    :checked="tenant.isActive"
                    @change="toggleStatus(tenant)"
                  />
                </td>
                <td>{{ formatDate(tenant.createdAt) }}</td>
                <td>
                  <div class="flex gap-2">
                    <button 
                      @click="openSettingsModal(tenant)"
                      class="btn btn-ghost btn-sm"
                      title="Settings"
                    >
                      <IconSettings class="w-4 h-4" />
                    </button>
                    <button 
                      @click="deleteTenantConfirm(tenant)"
                      class="btn btn-ghost btn-sm text-error"
                      title="Delete"
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

    <!-- Add/Edit Tenant Modal -->
    <dialog ref="tenantModal" class="modal">
      <div class="modal-box w-11/12 max-w-3xl">
        <h3 class="font-bold text-lg mb-4">{{ isEditMode ? 'Edit Tenant' : 'Add New Tenant' }}</h3>
        <form @submit.prevent="submitForm">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Name -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Tenant Name <span class="text-error">*</span></span>
              </label>
              <input 
                v-model="formData.name"
                type="text" 
                placeholder="Enter tenant name"
                class="input input-bordered"
                required
              />
            </div>

            <!-- Domain -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Domain <span class="text-error">*</span></span>
              </label>
              <input 
                v-model="formData.domain"
                type="text" 
                placeholder="e.g., gym-fitness"
                class="input input-bordered"
                required
              />
            </div>

            <!-- Email -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Email</span>
              </label>
              <input 
                v-model="formData.email"
                type="email" 
                placeholder="info@example.com"
                class="input input-bordered"
              />
            </div>

            <!-- Phone -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Phone</span>
              </label>
              <input 
                v-model="formData.phone"
                type="tel" 
                placeholder="+62123456789"
                class="input input-bordered"
              />
            </div>

            <!-- Address -->
            <div class="form-control md:col-span-2">
              <label class="label">
                <span class="label-text">Address</span>
              </label>
              <textarea 
                v-model="formData.address"
                placeholder="Enter address"
                class="textarea textarea-bordered w-full resize-none"
                rows="2"
              ></textarea>
            </div>

            <!-- Logo URL -->
            <div class="form-control md:col-span-2">
              <label class="label">
                <span class="label-text">Logo URL</span>
              </label>
              <input 
                v-model="formData.logo"
                type="url" 
                placeholder="https://example.com/logo.png"
                class="input input-bordered w-full"
              />
            </div>

            <!-- Status Toggles -->
            <div class="form-control">
              <label class="label cursor-pointer">
                <span class="label-text">Active</span>
                <input 
                  v-model="formData.isActive"
                  type="checkbox" 
                  class="toggle toggle-success"
                />
              </label>
            </div>

            <div class="form-control">
              <label class="label cursor-pointer">
                <span class="label-text">On Trial</span>
                <input 
                  v-model="formData.isOnTrial"
                  type="checkbox" 
                  class="toggle toggle-warning"
                />
              </label>
            </div>

            <!-- Trial End Date (only show if On Trial is checked) -->
            <div v-if="formData.isOnTrial" class="form-control md:col-span-2">
              <label class="label">
                <span class="label-text">Trial End Date <span class="text-error">*</span></span>
              </label>
              <input 
                v-model="formData.trialEndDate"
                type="date" 
                class="input input-bordered w-full"
                :min="today"
                required
              />
              <label class="label">
                <span class="label-text-alt text-info">Set the date when the trial period ends</span>
              </label>
            </div>
          </div>

          <div class="modal-action">
            <button type="button" class="btn" @click="closeModal">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              <span v-if="loading" class="loading loading-spinner loading-sm"></span>
              {{ isEditMode ? 'Update' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeModal">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { IconPlus, IconSettings, IconTrash } from '@tabler/icons-vue'
import { useTenants } from '@/composables/admin/useTenants'
import { useDialog } from '@/composables/core/useApi'

const { tenants, loading, fetchTenants, createTenant, updateTenant, toggleTenantStatus, deleteTenant } = useTenants()
const dialog = useDialog()

const isDev = import.meta.env.DEV

const tenantModal = ref(null)
const isEditMode = ref(false)
const currentTenant = ref(null)

// Get today's date for min date in date picker
const today = computed(() => {
  const date = new Date()
  return date.toISOString().split('T')[0]
})

const formData = ref({
  name: '',
  domain: '',
  address: '',
  phone: '',
  email: '',
  logo: '',
  settings: {
    workingHours: '08:00-22:00',
    maxMembers: 100
  },
  isActive: true,
  isOnTrial: false,
  trialEndDate: ''
})

// Fetch tenants on mount
onMounted(async () => {
  await fetchTenants()
})

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

// Open add modal
const openAddModal = () => {
  isEditMode.value = false
  currentTenant.value = null
  resetForm()
  tenantModal.value?.showModal()
}

// Open settings modal (edit mode)
const openSettingsModal = (tenant) => {
  isEditMode.value = true
  currentTenant.value = tenant
  
  // Format trialEndDate to YYYY-MM-DD for date input
  let trialDate = ''
  if (tenant.trialEndDate) {
    const date = new Date(tenant.trialEndDate)
    trialDate = date.toISOString().split('T')[0]
  }
  
  formData.value = {
    name: tenant.name,
    domain: tenant.domain,
    address: tenant.address || '',
    phone: tenant.phone || '',
    email: tenant.email || '',
    logo: tenant.logo || '',
    isActive: tenant.isActive,
    isOnTrial: tenant.isOnTrial || false,
    trialEndDate: trialDate
  }
  tenantModal.value?.showModal()
}

// Close modal
const closeModal = () => {
  tenantModal.value?.close()
  resetForm()
}

// Reset form
const resetForm = () => {
  formData.value = {
    name: '',
    domain: '',
    address: '',
    phone: '',
    email: '',
    logo: '',
    isActive: true,
    isOnTrial: false,
    trialEndDate: ''
  }
}

// Submit form
const submitForm = async () => {
  try {
    if (isEditMode.value && currentTenant.value) {
      await updateTenant(currentTenant.value.id, formData.value)
    } else {
      await createTenant(formData.value)
    }
    closeModal()
  } catch (error) {
    if (isDev) {
      console.error('Error submitting form:', error)
    }
  }
}

// Toggle tenant status
const toggleStatus = async (tenant) => {
  try {
    await toggleTenantStatus(tenant.id, !tenant.isActive)
  } catch (error) {
    if (isDev) {
      console.error('Error toggling status:', error)
    }
  }
}

// Delete tenant confirmation
const deleteTenantConfirm = async (tenant) => {
  const confirmed = await dialog.confirm(
    `Are you sure you want to delete "${tenant.name}"?`,
    'This action cannot be undone.'
  )
  
  if (confirmed) {
    try {
      await deleteTenant(tenant.id)
    } catch (error) {
      if (isDev) {
        console.error('Error deleting tenant:', error)
      }
    }
  }
}
</script>
