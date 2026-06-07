import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useRestaurantTables() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const isDev = import.meta.env.DEV
  
  const tables = ref([])
  const table = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const tableStats = ref(null)

  /**
   * Get all tables with pagination
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search query (number, section)
   * @param {string} params.locationId - Filter by location
   * @param {string} params.status - Filter by status (available, occupied, reserved, cleaning)
   * @param {number} params.minCapacity - Minimum capacity
   * @param {number} params.maxCapacity - Maximum capacity
   */
  const fetchTables = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page)
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.search) queryParams.append('search', params.search)
      if (params.locationId) queryParams.append('locationId', params.locationId)
      if (params.status) queryParams.append('status', params.status)
      if (params.minCapacity) queryParams.append('minCapacity', params.minCapacity)
      if (params.maxCapacity) queryParams.append('maxCapacity', params.maxCapacity)

      const queryString = queryParams.toString()
      const url = `/restaurant/tables${queryString ? `?${queryString}` : ''}`
      
      if (isDev) {
        console.log('Fetching tables from:', url)
      }
      
      const response = await api.get(url)
      
      if (isDev) {
        console.log('API Response:', response)
      }
      
      if (response.data && Array.isArray(response.data) && response.pagination) {
        if (isDev) {
          console.log('Response with pagination object, length:', response.data.length)
        }
        tables.value = response.data
        return {
          data: response.data,
          total: response.pagination.total || 0,
          totalPages: response.pagination.totalPages || 1,
          currentPage: response.pagination.page || params.page || 1
        }
      }
      else if (Array.isArray(response.data)) {
        if (isDev) {
          console.log('Direct array response, length:', response.data.length)
        }
        tables.value = response.data
        return {
          data: response.data,
          total: response.data.length,
          totalPages: 1,
          currentPage: 1
        }
      }
      else {
        if (isDev) {
          console.log('Empty or unexpected response structure')
        }
        tables.value = []
        return { data: [], total: 0, totalPages: 1, currentPage: 1 }
      }
    } catch (err) {
      if (isDev) {
        console.error('Error in fetchTables:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch tables')
      tables.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  const getTableById = async (tableId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Fetching table by ID:', tableId)
      }

      const response = await api.get(`/restaurant/tables/${tableId}`)
      
      if (isDev) {
        console.log('Table details:', response)
      }

      if (response.data) {
        table.value = response.data
        return response.data
      } else {
        table.value = response
        return response
      }
    } catch (err) {
      if (isDev) {
        console.error('Error fetching table by ID:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch table details')
      throw err
    } finally {
      loading.value = false
    }
  }

  const createTable = async (tableData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Creating table with data:', tableData)
      }

      const response = await api.post('/restaurant/tables', tableData)
      
      if (isDev) {
        console.log('Table created:', response)
      }

      showSuccess(response.message || 'Table created successfully')
      return response.data
    } catch (err) {
      if (isDev) {
        console.error('Error creating table:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to create table')
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateTable = async (tableId, tableData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Updating table:', tableId, tableData)
      }

      const response = await api.put(`/restaurant/tables/${tableId}`, tableData)
      
      if (isDev) {
        console.log('Table updated:', response)
      }

      showSuccess(response.message || 'Table updated successfully')
      return response.data
    } catch (err) {
      if (isDev) {
        console.error('Error updating table:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to update table')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Reserve table
   * @param {string} tableId - Table ID
   * @param {Object} reserveData - Reserve data
   * @param {string} reserveData.status - Should be 'reserved'
   * @param {string} reserveData.occupiedBy - Reserved for whom
   */
  const reserveTable = async (tableId, reserveData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Reserving table:', tableId, reserveData)
      }

      const response = await api.post(`/restaurant/tables/${tableId}/reserve`, reserveData)
      
      if (isDev) {
        console.log('Table reserved:', response)
      }

      showSuccess(response.message || 'Table reserved successfully')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Error reserving table:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to reserve table')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Release table (mark as available)
   * @param {string} tableId - Table ID
   * @param {Object} releaseData - Release data
   * @param {string} releaseData.status - Should be 'available'
   */
  const releaseTable = async (tableId, releaseData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Releasing table:', tableId, releaseData)
      }

      const response = await api.post(`/restaurant/tables/${tableId}/release`, releaseData)
      
      if (isDev) {
        console.log('Table released:', response)
      }

      showSuccess(response.message || 'Table released successfully')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Error releasing table:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to release table')
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteTable = async (tableId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Deleting table:', tableId)
      }

      const response = await api.delete(`/restaurant/tables/${tableId}`)
      
      if (isDev) {
        console.log('Table deleted:', response)
      }

      showSuccess(response.message || 'Table deleted successfully')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Error deleting table:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to delete table')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get table statistics
   * @param {string} locationId - Optional location ID to filter stats
   */
  const getTableStats = async (locationId = null) => {
    loading.value = true
    error.value = null
    try {
      const url = locationId 
        ? `/restaurant/tables/statistics?locationId=${locationId}`
        : '/restaurant/tables/statistics'
      
      if (isDev) {
        console.log('Fetching table stats from:', url)
      }

      const response = await api.get(url)
      
      if (isDev) {
        console.log('Table stats:', response)
      }

      if (response.data) {
        tableStats.value = response.data
        return response.data
      } else {
        tableStats.value = response
        return response
      }
    } catch (err) {
      if (isDev) {
        console.error('Error fetching table stats:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch table statistics')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get detailed table statistics
   * @param {Object} params - Query parameters
   * @param {string} params.locationId - Filter by location ID
   * @param {string} params.startDate - Start date for statistics period
   * @param {string} params.endDate - End date for statistics period
   */
  const getTableStatistics = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.locationId) queryParams.append('locationId', params.locationId)
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)

      const queryString = queryParams.toString()
      const url = `/restaurant/tables/statistics${queryString ? `?${queryString}` : ''}`

      if (isDev) {
        console.log('Fetching table statistics from:', url)
      }

      const response = await api.get(url)

      if (isDev) {
        console.log('Table statistics:', response)
      }

      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Get table statistics error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to get table statistics')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get table layout for a specific location
   * @param {string} locationId - Location ID
   */
  const getTableLayout = async (locationId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Fetching table layout for location:', locationId)
      }

      const response = await api.get(`/restaurant/tables/layout/${locationId}`)

      if (isDev) {
        console.log('Table layout:', response)
      }

      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Get table layout error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to get table layout')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Set table for cleaning
   * @param {string} tableId - Table ID
   */
  const setTableCleaning = async (tableId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Setting table for cleaning:', tableId)
      }

      const response = await api.post(`/restaurant/tables/${tableId}/cleaning`)

      if (isDev) {
        console.log('Table set for cleaning:', response)
      }

      showSuccess(response.message || 'Table set for cleaning')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Set table cleaning error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to set table for cleaning')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    tables,
    table,
    loading,
    error,
    tableStats,
    fetchTables,
    getTableById,
    createTable,
    updateTable,
    reserveTable,
    releaseTable,
    deleteTable,
    getTableStats,
    // New methods
    getTableStatistics,
    getTableLayout,
    setTableCleaning
  }
}
