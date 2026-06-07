import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useShifts() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const shifts = ref([])
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref({ total: 0, page: 1, limit: 50, totalPages: 1 })

  const BASE = '/gym/shifts'

  /**
   * Fetch all shifts
   * @param {Object} params - { page, limit, isActive }
   */
  const fetchShifts = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page)
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.isActive !== undefined && params.isActive !== '') queryParams.append('isActive', params.isActive)

      const queryString = queryParams.toString()
      const url = `${BASE}${queryString ? `?${queryString}` : ''}`

      const response = await api.get(url)
      shifts.value = response.data || []
      pagination.value = response.pagination || { total: 0, page: 1, limit: 50, totalPages: 1 }
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to fetch shifts')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new shift
   * @param {Object} shiftData - { name, code, shiftStart, shiftEnd, color }
   */
  const createShift = async (shiftData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(BASE, shiftData)
      showSuccess(response.message || 'Shift created successfully')
      return response.data
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to create shift')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an existing shift
   * @param {string} id - Shift ID
   * @param {Object} shiftData - { name, code, shiftStart, shiftEnd, color, isActive }
   */
  const updateShift = async (id, shiftData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.put(`${BASE}/${id}`, shiftData)
      showSuccess(response.message || 'Shift updated successfully')
      return response.data
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to update shift')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a shift
   * @param {string} id - Shift ID
   */
  const deleteShift = async (id) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.delete(`${BASE}/${id}`)
      showSuccess(response.message || 'Shift deleted successfully')
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to delete shift')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    shifts,
    loading,
    error,
    pagination,
    fetchShifts,
    createShift,
    updateShift,
    deleteShift,
  }
}
