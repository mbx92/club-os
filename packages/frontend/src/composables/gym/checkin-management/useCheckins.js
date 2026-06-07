import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useCheckins() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const isDev = import.meta.env.DEV
  
  const checkins = ref([])
  const checkin = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const statistics = ref(null)
  const statsLoading = ref(false)

  /**
   * Create new check-in
   * @param {Object} checkinData - Check-in data
   * @param {string} checkinData.memberId - Member ID
   * @param {string} checkinData.serviceType - Service type (optional: pt_package, class_package)
   * @param {string} checkinData.notes - Optional check-in notes
   */
  const createCheckin = async (checkinData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Creating check-in with data:', checkinData)
      }

      const response = await api.post('/gym/check-ins', checkinData)
      
      if (isDev) {
        console.log('Check-in created:', response)
      }

      showSuccess(response.message || 'Check-in successful')
      return response.data
    } catch (err) {
      if (isDev) {
        console.error('Error creating check-in:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to create check-in')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get all check-ins with filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.memberId - Filter by member ID
   * @param {string} params.serviceType - Filter by service type (pt_package, class_package)
   * @param {string} params.startDate - Filter by start date (ISO format)
   * @param {string} params.endDate - Filter by end date (ISO format)
   * @param {string} params.sortBy - Field to sort by (checkInTime)
   * @param {string} params.sortOrder - Sort order (ASC/DESC)
   */
  const fetchCheckins = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      // Build query string
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page)
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.memberId) queryParams.append('memberId', params.memberId)
      if (params.serviceType && params.serviceType !== 'all') queryParams.append('serviceType', params.serviceType)
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)
      if (params.sortBy) queryParams.append('sortBy', params.sortBy)
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)

      const queryString = queryParams.toString()
      const url = `/gym/check-ins${queryString ? `?${queryString}` : ''}`
      
      if (isDev) {
        console.log('Fetching check-ins from:', url)
      }
      
      const response = await api.get(url)
      
      if (isDev) {
        console.log('API Response:', response)
      }
      
      // Handle response with pagination object
      if (response.data && response.pagination) {
        if (isDev) {
          console.log('Response with pagination object, length:', response.data.length)
        }
        checkins.value = Array.isArray(response.data) ? response.data : []
        return {
          data: response.data,
          total: response.pagination.totalRecords || 0,
          totalPages: response.pagination.totalPages || 1,
          currentPage: response.pagination.currentPage || params.page || 1,
          filters: response.filters || {}
        }
      }
      // Handle direct data array
      else if (Array.isArray(response.data)) {
        if (isDev) {
          console.log('Direct array response, length:', response.data.length)
        }
        checkins.value = response.data
        return {
          data: response.data,
          total: response.data.length,
          totalPages: 1,
          currentPage: 1,
          filters: {}
        }
      }
      // Empty response
      else {
        if (isDev) {
          console.log('Empty or unexpected response structure')
        }
        checkins.value = []
        return { data: [], total: 0, totalPages: 1, currentPage: 1, filters: {} }
      }
    } catch (err) {
      if (isDev) {
        console.error('Error in fetchCheckins:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch check-ins')
      checkins.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get check-in by ID
   * @param {string} checkinId - Check-in ID
   */
  const getCheckinById = async (checkinId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Fetching check-in by ID:', checkinId)
      }

      const response = await api.get(`/gym/check-ins/${checkinId}`)
      
      if (isDev) {
        console.log('Check-in details:', response)
      }

      // Handle different response structures
      if (response.data) {
        checkin.value = response.data
        return response.data
      } else {
        checkin.value = response
        return response
      }
    } catch (err) {
      if (isDev) {
        console.error('Error fetching check-in by ID:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch check-in details')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update check-in (add checkout time or update notes)
   * @param {string} checkinId - Check-in ID
   * @param {Object} updateData - Update data
   * @param {string} updateData.checkOutTime - Checkout time (ISO format)
   * @param {string} updateData.notes - Updated notes
   */
  const updateCheckin = async (checkinId, updateData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Updating check-in:', checkinId, updateData)
      }

      const response = await api.put(`/gym/check-ins/${checkinId}`, updateData)
      
      if (isDev) {
        console.log('Check-in updated:', response)
      }

      showSuccess(response.message || 'Check-in updated successfully')
      return response.data
    } catch (err) {
      if (isDev) {
        console.error('Error updating check-in:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to update check-in')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete check-in
   * @param {string} checkinId - Check-in ID
   */
  const deleteCheckin = async (checkinId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Deleting check-in:', checkinId)
      }

      const response = await api.delete(`/gym/check-ins/${checkinId}`)
      
      if (isDev) {
        console.log('Check-in deleted:', response)
      }

      showSuccess(response.message || 'Check-in deleted successfully')
      return response.data
    } catch (err) {
      if (isDev) {
        console.error('Error deleting check-in:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to delete check-in')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get check-in statistics
   * @param {Object} params - Query parameters
   * @param {string} params.memberId - Filter by member ID
   * @param {string} params.startDate - Filter by start date (YYYY-MM-DD)
   * @param {string} params.endDate - Filter by end date (YYYY-MM-DD)
   */
  const getCheckinStatistics = async (params = {}) => {
    statsLoading.value = true
    try {
      // Build query string
      const queryParams = new URLSearchParams()
      if (params.memberId) queryParams.append('memberId', params.memberId)
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)

      const queryString = queryParams.toString()
      const url = `/gym/check-ins/stats${queryString ? `?${queryString}` : ''}`
      
      if (isDev) {
        console.log('Fetching check-in statistics from:', url)
      }

      const response = await api.get(url)
      
      if (isDev) {
        console.log('Statistics response:', response)
      }

      statistics.value = response.data || response
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Error fetching statistics:', err)
      }
      handleError(err, 'Failed to fetch check-in statistics')
      return null
    } finally {
      statsLoading.value = false
    }
  }

  /**
   * Get check-ins by member ID
   * @param {string} memberId - Member ID
   * @param {Object} params - Additional query parameters
   */
  const getCheckinsByMember = async (memberId, params = {}) => {
    return await fetchCheckins({
      ...params,
      memberId
    })
  }

  /**
   * Get check-ins by date range
   * @param {string} startDate - Start date (ISO format)
   * @param {string} endDate - End date (ISO format)
   * @param {Object} params - Additional query parameters
   */
  const getCheckinsByDateRange = async (startDate, endDate, params = {}) => {
    return await fetchCheckins({
      ...params,
      startDate,
      endDate
    })
  }

  /**
   * Get check-ins by service type
   * @param {string} serviceType - Service type (pt_package, class_package)
   * @param {Object} params - Additional query parameters
   */
  const getCheckinsByServiceType = async (serviceType, params = {}) => {
    return await fetchCheckins({
      ...params,
      serviceType
    })
  }

  return {
    // State
    checkins,
    checkin,
    loading,
    error,
    statistics,
    statsLoading,

    // Methods
    createCheckin,
    fetchCheckins,
    getCheckinById,
    updateCheckin,
    deleteCheckin,
    getCheckinStatistics,
    getCheckinsByMember,
    getCheckinsByDateRange,
    getCheckinsByServiceType
  }
}
