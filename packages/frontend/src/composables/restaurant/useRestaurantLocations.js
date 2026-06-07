import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useRestaurantLocations() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const isDev = import.meta.env.DEV
  
  const locations = ref([])
  const location = ref(null)
  const loading = ref(false)
  const error = ref(null)

  /**
   * Get all locations with pagination
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search query (name, code, address)
   * @param {boolean} params.isActive - Filter by active status
   */
  const fetchLocations = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page)
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.search) queryParams.append('search', params.search)
      if (params.isActive !== undefined) queryParams.append('isActive', params.isActive)

      const queryString = queryParams.toString()
      const url = `/restaurant/locations${queryString ? `?${queryString}` : ''}`
      
      if (isDev) {
        console.log('Fetching locations from:', url)
      }
      
      const response = await api.get(url)
      
      if (isDev) {
        console.log('API Response:', response)
      }
      
      if (response.data && Array.isArray(response.data) && response.pagination) {
        if (isDev) {
          console.log('Response with pagination object, length:', response.data.length)
        }
        locations.value = response.data
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
        locations.value = response.data
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
        locations.value = []
        return { data: [], total: 0, totalPages: 1, currentPage: 1 }
      }
    } catch (err) {
      if (isDev) {
        console.error('Error in fetchLocations:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch locations')
      locations.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  const getLocationById = async (locationId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Fetching location by ID:', locationId)
      }

      const response = await api.get(`/restaurant/locations/${locationId}`)
      
      if (isDev) {
        console.log('Location details:', response)
      }

      if (response.data) {
        location.value = response.data
        return response.data
      } else {
        location.value = response
        return response
      }
    } catch (err) {
      if (isDev) {
        console.error('Error fetching location by ID:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch location details')
      throw err
    } finally {
      loading.value = false
    }
  }

  const createLocation = async (locationData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Creating location with data:', locationData)
      }

      const response = await api.post('/restaurant/locations', locationData)
      
      if (isDev) {
        console.log('Location created:', response)
      }

      showSuccess(response.message || 'Location created successfully')
      return response.data
    } catch (err) {
      if (isDev) {
        console.error('Error creating location:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to create location')
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateLocation = async (locationId, locationData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Updating location:', locationId, locationData)
      }

      const response = await api.put(`/restaurant/locations/${locationId}`, locationData)
      
      if (isDev) {
        console.log('Location updated:', response)
      }

      showSuccess(response.message || 'Location updated successfully')
      return response.data
    } catch (err) {
      if (isDev) {
        console.error('Error updating location:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to update location')
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteLocation = async (locationId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Deleting location:', locationId)
      }

      const response = await api.delete(`/restaurant/locations/${locationId}`)
      
      if (isDev) {
        console.log('Location deleted:', response)
      }

      showSuccess(response.message || 'Location deleted successfully')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Error deleting location:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to delete location')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get all locations with stock counts
   * Returns locations with total stock quantity per location
   */
  const getLocationsWithStock = async () => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Fetching locations with stock')
      }

      const response = await api.get('/restaurant/locations/with-stock')

      if (isDev) {
        console.log('Locations with stock:', response)
      }

      if (response.data) {
        locations.value = response.data
        return response.data
      } else {
        locations.value = response
        return response
      }
    } catch (err) {
      if (isDev) {
        console.error('Get locations with stock error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to get locations with stock')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get stock summary for a specific location
   * @param {string} locationId - Location ID
   */
  const getLocationStockSummary = async (locationId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Fetching stock summary for location:', locationId)
      }

      const response = await api.get(`/restaurant/locations/${locationId}/stock-summary`)

      if (isDev) {
        console.log('Location stock summary:', response)
      }

      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Get location stock summary error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to get location stock summary')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Calculate distance between two locations
   * @param {string} fromId - Origin location ID
   * @param {string} toId - Destination location ID
   */
  const calculateDistance = async (fromId, toId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Calculating distance from', fromId, 'to', toId)
      }

      const response = await api.get(`/restaurant/locations/distance/${fromId}/${toId}`)

      if (isDev) {
        console.log('Distance result:', response)
      }

      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Calculate distance error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to calculate distance')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Toggle location active status
   * @param {string} locationId - Location ID
   */
  const toggleLocationActive = async (locationId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Toggling location active status:', locationId)
      }

      const response = await api.patch(`/restaurant/locations/${locationId}/toggle`)

      if (isDev) {
        console.log('Location toggled:', response)
      }

      showSuccess(response.message || 'Location status updated')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Toggle location error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to toggle location status')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    locations,
    location,
    loading,
    error,
    fetchLocations,
    getLocationById,
    createLocation,
    updateLocation,
    deleteLocation,
    // New methods
    getLocationsWithStock,
    getLocationStockSummary,
    calculateDistance,
    toggleLocationActive
  }
}
