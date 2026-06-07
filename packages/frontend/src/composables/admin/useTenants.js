import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export const useTenants = () => {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  
  const tenants = ref([])
  const loading = ref(false)
  const error = ref(null)

  /**
   * Fetch all tenants
   */
  const fetchTenants = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get('/tenants')
      tenants.value = response.data || response
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch tenants')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new tenant
   * @param {Object} tenantData - Tenant data { name, domain, address, phone, email, logo, settings, isActive, isOnTrial }
   */
  const createTenant = async (tenantData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/tenants', tenantData)
      showSuccess('Tenant created successfully')
      await fetchTenants() // Refresh the list
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to create tenant')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an existing tenant
   * @param {String} tenantId - The tenant ID
   * @param {Object} tenantData - Updated tenant data
   */
  const updateTenant = async (tenantId, tenantData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.put(`/tenants/${tenantId}`, tenantData)
      showSuccess('Tenant updated successfully')
      await fetchTenants() // Refresh the list
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to update tenant')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Toggle tenant active status
   * @param {String} tenantId - The tenant ID
   * @param {Boolean} isActive - New active status
   */
  const toggleTenantStatus = async (tenantId, isActive) => {
    try {
      const response = await api.put(`/tenants/${tenantId}`, { isActive })
      showSuccess(`Tenant ${isActive ? 'activated' : 'deactivated'} successfully`)
      // Update local state
      const tenant = tenants.value.find(t => t.id === tenantId)
      if (tenant) {
        tenant.isActive = isActive
      }
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to update tenant status')
      // Revert the change if it failed
      const tenant = tenants.value.find(t => t.id === tenantId)
      if (tenant) {
        tenant.isActive = !isActive
      }
      throw err
    }
  }

  /**
   * Delete a tenant
   * @param {String} tenantId - The tenant ID
   */
  const deleteTenant = async (tenantId) => {
    loading.value = true
    error.value = null
    try {
      await api.delete(`/tenants/${tenantId}`)
      showSuccess('Tenant deleted successfully')
      await fetchTenants() // Refresh the list
    } catch (err) {
      error.value = handleError(err, 'Failed to delete tenant')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    tenants,
    loading,
    error,
    fetchTenants,
    createTenant,
    updateTenant,
    toggleTenantStatus,
    deleteTenant
  }
}
