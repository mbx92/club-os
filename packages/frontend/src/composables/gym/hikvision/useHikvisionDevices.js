import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useHikvisionDevices() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const devices = ref([])
  const device = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const testResult = ref(null)
  const testLoading = ref(false)
  const syncResult = ref(null)
  const syncLoading = ref(false)

  const BASE = '/integrations/hikvision/devices'

  /**
   * Fetch all Hikvision devices
   */
  const fetchDevices = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(BASE)
      devices.value = response.data || []
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to fetch devices')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new Hikvision device
   */
  const createDevice = async (deviceData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(BASE, deviceData)
      showSuccess(response.message || 'Device registered successfully')
      return response.data
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to register device')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update a Hikvision device
   */
  const updateDevice = async (id, deviceData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.put(`${BASE}/${id}`, deviceData)
      showSuccess(response.message || 'Device updated successfully')
      return response.data
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to update device')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a Hikvision device
   */
  const deleteDevice = async (id) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.delete(`${BASE}/${id}`)
      showSuccess(response.message || 'Device deleted successfully')
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to delete device')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Test device connection
   */
  const testConnection = async (id) => {
    testLoading.value = true
    testResult.value = null
    try {
      const response = await api.get(`${BASE}/${id}/test`)
      testResult.value = response
      if (response.success) {
        showSuccess('Device connection successful')
      }
      return response
    } catch (err) {
      testResult.value = { success: false, error: err.message }
      handleError(err, 'Device connection failed')
      throw err
    } finally {
      testLoading.value = false
    }
  }

  /**
   * Configure push URL on device
   */
  const configurePush = async (id, serverUrl) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(`${BASE}/${id}/configure-push`, { serverUrl })
      showSuccess(response.message || 'Push URL configured successfully')
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to configure push URL')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Sync device time
   */
  const syncTime = async (id) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(`${BASE}/${id}/sync-time`)
      showSuccess(response.message || 'Device time synchronized')
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to sync device time')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Manual pull sync from device
   */
  const manualSync = async (id) => {
    syncLoading.value = true
    syncResult.value = null
    try {
      const response = await api.post(`${BASE}/${id}/sync`)
      syncResult.value = response
      return response
    } catch (err) {
      syncResult.value = null
      handleError(err, 'Failed to sync device')
      throw err
    } finally {
      syncLoading.value = false
    }
  }

  return {
    devices,
    device,
    loading,
    error,
    testResult,
    testLoading,
    syncResult,
    syncLoading,
    fetchDevices,
    createDevice,
    updateDevice,
    deleteDevice,
    testConnection,
    configurePush,
    syncTime,
    manualSync,
  }
}
