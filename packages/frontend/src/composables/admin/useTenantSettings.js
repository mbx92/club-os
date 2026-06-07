import { ref, computed } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'
import { useAuthStore } from '@/stores/auth'

export const useTenantSettings = () => {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const authStore = useAuthStore()
  
  const tenantSettings = ref(null)
  const workingHours = ref(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref(null)

  // Get current tenant ID
  const currentTenantId = computed(() => authStore.user?.tenant?.id)

  const syncTenantToStorage = () => {
    if (!authStore.user) return

    const storage = localStorage.getItem('user') ? localStorage : sessionStorage
    storage.setItem('user', JSON.stringify(authStore.user))
  }

  const isPlainObject = (value) => {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
  }

  const mergeSettingsObject = (target = {}, source = {}) => {
    const result = { ...target }

    Object.entries(source).forEach(([key, value]) => {
      if (isPlainObject(value) && isPlainObject(result[key])) {
        result[key] = mergeSettingsObject(result[key], value)
        return
      }

      result[key] = value
    })

    return result
  }

  const mergeTenantSettingsToStore = (partialSettings = {}) => {
    if (!authStore.user?.tenant) return

    const currentSettings = authStore.user.tenant.settings || {}
    authStore.user.tenant.settings = mergeSettingsObject(currentSettings, partialSettings)

    if (tenantSettings.value) {
      tenantSettings.value = {
        ...tenantSettings.value,
        settings: mergeSettingsObject(tenantSettings.value.settings || {}, partialSettings)
      }
    }

    syncTenantToStorage()
  }

  /**
   * Fetch tenant settings (basic information)
   */
  const fetchTenantSettings = async () => {
    if (!currentTenantId.value) {
      error.value = 'No tenant ID available'
      return null
    }

    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/tenants/${currentTenantId.value}`)
      tenantSettings.value = response.data || response
      
      // Update auth store with latest tenant data
      if (authStore.user?.tenant) {
        authStore.user.tenant = { ...authStore.user.tenant, ...tenantSettings.value }
        syncTenantToStorage()
      }
      
      return tenantSettings.value
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch tenant settings')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update tenant basic settings
   * @param {Object} data - { name, domain, address, phone, email, logo, currency, timezone }
   */
  const updateTenantSettings = async (data) => {
    if (!currentTenantId.value) {
      const errorMsg = 'No tenant ID available'
      handleError(errorMsg)
      return { success: false, error: errorMsg }
    }

    saving.value = true
    error.value = null
    try {
      const response = await api.put(`/tenants/${currentTenantId.value}`, data)
      tenantSettings.value = response.data || response
      
      // Update auth store
      if (authStore.user?.tenant) {
        authStore.user.tenant = { ...authStore.user.tenant, ...tenantSettings.value }
        syncTenantToStorage()
      }
      
      showSuccess('Tenant settings updated successfully')
      return { success: true, data: tenantSettings.value }
    } catch (err) {
      error.value = handleError(err, 'Failed to update tenant settings')
      return { success: false, error: error.value }
    } finally {
      saving.value = false
    }
  }

  /**
   * Fetch working hours settings (from tenant data)
   */
  const fetchWorkingHours = async () => {
    if (!currentTenantId.value) {
      error.value = 'No tenant ID available'
      return null
    }

    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/tenants/${currentTenantId.value}`)
      const tenantData = response.data || response
      workingHours.value = tenantData.workingHours || tenantData
      return workingHours.value
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch working hours')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update working hours settings using tenant endpoint
   * @param {Object} hours - Working hours object with days as keys
   */
  const updateWorkingHours = async (hours) => {
    if (!currentTenantId.value) {
      const errorMsg = 'No tenant ID available'
      handleError(errorMsg)
      return { success: false, error: errorMsg }
    }

    saving.value = true
    error.value = null
    try {
      const response = await api.put(`/tenants/${currentTenantId.value}`, {
        workingHours: hours
      })
      const updatedData = response.data || response
      workingHours.value = updatedData.workingHours || updatedData
      
      // Update tenant settings if available
      if (tenantSettings.value) {
        tenantSettings.value.workingHours = workingHours.value
      }
      
      showSuccess('Working hours updated successfully')
      return { success: true, data: workingHours.value }
    } catch (err) {
      error.value = handleError(err, 'Failed to update working hours')
      return { success: false, error: error.value }
    } finally {
      saving.value = false
    }
  }

  /**
   * Get default working hours template
   */
  const getDefaultWorkingHours = () => {
    return {
      monday: ['08:00', '22:00'],
      tuesday: ['08:00', '22:00'],
      wednesday: ['08:00', '22:00'],
      thursday: ['08:00', '22:00'],
      friday: ['08:00', '22:00'],
      saturday: ['08:00', '20:00'],
      sunday: ['08:00', '20:00']
    }
  }

  /**
   * Patch tenant JSON settings
   * @param {Object} settingsData - Partial settings payload, e.g. { backup: { googleDrive: {...} } }
   * @param {String} successMessage - Success notification message
   */
  const patchTenantSettings = async (settingsData, successMessage = 'Tenant settings updated successfully') => {
    if (!currentTenantId.value) {
      const errorMsg = 'No tenant ID available'
      handleError(errorMsg)
      return { success: false, error: errorMsg }
    }

    saving.value = true
    error.value = null

    try {
      const response = await api.patch('/tenants/settings', {
        tenantId: currentTenantId.value,
        ...settingsData
      })

      mergeTenantSettingsToStore(settingsData)
      showSuccess(successMessage)

      return { success: true, data: response.data || response }
    } catch (err) {
      error.value = handleError(err, 'Failed to update tenant settings')
      return { success: false, error: error.value }
    } finally {
      saving.value = false
    }
  }

  return {
    tenantSettings,
    workingHours,
    loading,
    saving,
    error,
    currentTenantId,
    fetchTenantSettings,
    updateTenantSettings,
    patchTenantSettings,
    fetchWorkingHours,
    updateWorkingHours,
    getDefaultWorkingHours
  }
}
