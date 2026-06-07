<template>
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title mb-4">
        <IconBuilding class="w-6 h-6" />
        Tenant Settings
      </h2>

      <div v-if="loading" class="flex justify-center py-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Tenant Name -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Tenant Name</span>
            <span class="label-text-alt text-error">*</span>
          </label>
          <input
            v-model="formData.name"
            type="text"
            placeholder="Enter tenant name"
            class="input input-bordered w-full"
            required
          />
        </div>

        <!-- Domain -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Domain</span>
            <span class="label-text-alt text-error">*</span>
          </label>
          <input
            v-model="formData.domain"
            type="text"
            placeholder="tenant-domain.com"
            class="input input-bordered w-full"
            required
          />
          <label class="label">
            <span class="label-text-alt">Your tenant's unique domain identifier</span>
          </label>
        </div>

        <!-- Email -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Email</span>
            <span class="label-text-alt text-error">*</span>
          </label>
          <input
            v-model="formData.email"
            type="email"
            placeholder="info@example.com"
            class="input input-bordered w-full"
            required
          />
        </div>

        <!-- Phone -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Phone</span>
          </label>
          <input
            v-model="formData.phone"
            type="tel"
            placeholder="+1234567890"
            class="input input-bordered w-full"
          />
        </div>

        <!-- Address -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Address</span>
          </label>
          <textarea
            v-model="formData.address"
            class="textarea textarea-bordered w-full h-24 resize-none"
            placeholder="123 Main St, City, Country"
          ></textarea>
        </div>

        <!-- Timezone -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Timezone</span>
            <span class="label-text-alt text-error">*</span>
          </label>
          <select v-model="formData.timezone" class="select select-bordered w-full" required>
            <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
            <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
            <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
            <option value="Asia/Singapore">Asia/Singapore</option>
            <option value="Asia/Kuala_Lumpur">Asia/Kuala Lumpur</option>
            <option value="Asia/Bangkok">Asia/Bangkok</option>
            <option value="Asia/Tokyo">Asia/Tokyo</option>
            <option value="America/New_York">America/New York (EST)</option>
            <option value="America/Los_Angeles">America/Los Angeles (PST)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
            <option value="Europe/Paris">Europe/Paris (CET)</option>
            <option value="Australia/Sydney">Australia/Sydney</option>
          </select>
        </div>

        <!-- Logo URL -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Logo URL</span>
          </label>
          <input
            v-model="formData.logo"
            type="url"
            placeholder="https://example.com/logo.png"
            class="input input-bordered w-full"
          />
          <label class="label">
            <span class="label-text-alt">Enter the full URL to your logo image</span>
          </label>
        </div>

        <!-- Logo Preview -->
        <div v-if="formData.logo" class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Logo Preview</span>
          </label>
          <div class="flex items-center gap-4 p-4 border-2 border-base-300 rounded-lg">
            <img
              :src="formData.logo"
              alt="Tenant Logo"
              class="w-24 h-24 object-contain"
              @error="handleImageError"
            />
            <div class="text-sm opacity-70">
              Logo will appear throughout the application
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="card-actions justify-end pt-4">
          <button
            type="button"
            class="btn btn-ghost"
            :disabled="saving"
            @click="resetForm"
          >
            Reset
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :class="{ 'loading': saving }"
            :disabled="saving || !hasChanges"
          >
            <IconDeviceFloppy v-if="!saving" class="w-5 h-5" />
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useTenantSettings } from '@/composables/admin/useTenantSettings'
import { useAuthStore } from '@/stores/auth'
import {
  IconBuilding,
  IconDeviceFloppy
} from '@tabler/icons-vue'

const authStore = useAuthStore()
const {
  tenantSettings,
  loading,
  saving,
  fetchTenantSettings,
  updateTenantSettings
} = useTenantSettings()

const isDev = import.meta.env.DEV

// Form data
const formData = ref({
  name: '',
  domain: '',
  email: '',
  phone: '',
  address: '',
  timezone: 'Asia/Jakarta',
  logo: ''
})

// Store original data for comparison
const originalData = ref({})

// Check if form has changes
const hasChanges = computed(() => {
  return JSON.stringify(formData.value) !== JSON.stringify(originalData.value)
})

// Load tenant settings on mount
onMounted(async () => {
  await loadSettings()
})

// Watch for tenant settings changes
watch(() => tenantSettings.value, (newSettings) => {
  if (newSettings) {
    populateForm(newSettings)
  }
}, { deep: true })

// Load settings from store or API
const loadSettings = async () => {
  // First try from auth store
  if (authStore.user?.tenant) {
    populateForm(authStore.user.tenant)
  }
  
  // Then fetch fresh data from API
  try {
    await fetchTenantSettings()
  } catch (err) {
    // Error already handled by handleError in composable
    if (isDev) {
      console.error('[TenantSettingsTab] Failed to fetch tenant settings:', err)
    }
  }
}

// Populate form with tenant data
const populateForm = (data) => {
  formData.value = {
    name: data.name || '',
    domain: data.domain || '',
    email: data.email || '',
    phone: data.phone || '',
    address: data.address || '',
    timezone: data.settings?.timezone || data.timezone || 'Asia/Jakarta',
    logo: data.logo || ''
  }
  
  // Store original data
  originalData.value = { ...formData.value }
}

// Handle form submission
const handleSubmit = async () => {
  const result = await updateTenantSettings(formData.value)
  
  if (result.success) {
    // Update original data after successful save
    originalData.value = { ...formData.value }
  }
}

// Reset form to original values
const resetForm = () => {
  formData.value = { ...originalData.value }
}

// Handle image load error
const handleImageError = (event) => {
  event.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E'
}
</script>
