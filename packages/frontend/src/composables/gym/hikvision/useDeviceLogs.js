import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useDeviceLogs() {
  const api = useApi()
  const { handleError } = useNotification()

  const logs = ref([])
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref({ total: 0, page: 1, limit: 50, totalPages: 1 })

  const BASE = '/integrations/hikvision/devices'

  /**
   * Fetch raw device logs
   * @param {string} deviceId
   * @param {Object} params - { page, limit, startDate, endDate }
   */
  const fetchLogs = async (deviceId, params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page)
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)

      const queryString = queryParams.toString()
      const url = `${BASE}/${deviceId}/logs${queryString ? `?${queryString}` : ''}`

      const response = await api.get(url)
      logs.value = response.data || []
      pagination.value = response.pagination || { total: 0, page: 1, limit: 50, totalPages: 1 }
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to fetch device logs')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    logs,
    loading,
    error,
    pagination,
    fetchLogs,
  }
}
