import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useRestaurantStock() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const isDev = import.meta.env.DEV
  
  const stockMovements = ref([])
  const stockReport = ref(null)
  const loading = ref(false)
  const error = ref(null)

  /**
   * Get stock movements with pagination
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.productId - Filter by product
   * @param {string} params.locationId - Filter by location
   * @param {string} params.type - Filter by type (in, out, adjustment, transfer)
   * @param {string} params.startDate - Filter by start date (ISO format)
   * @param {string} params.endDate - Filter by end date (ISO format)
   */
  const getStockMovements = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page)
      // support both `limit` and legacy `perPage` callers
      const limit = params.limit ?? params.perPage ?? params.per_page
      if (limit) queryParams.append('limit', limit)
      if (params.productId) queryParams.append('productId', params.productId)
      if (params.locationId) queryParams.append('locationId', params.locationId)
      // backend expects `movementType` (alias: accept `type` or `movementType`)
      const movementType = params.movementType ?? params.type
      if (movementType) queryParams.append('movementType', movementType)
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)

      const queryString = queryParams.toString()
      const url = `/restaurant/stock-movements${queryString ? `?${queryString}` : ''}`
      
      if (isDev) {
        console.log('Fetching stock movements from:', url)
      }
      
      const response = await api.get(url)
      
      if (isDev) {
        console.log('API Response:', response)
      }
      
      if (response.data && Array.isArray(response.data) && response.pagination) {
        if (isDev) {
          console.log('Response with pagination object, length:', response.data.length)
        }
        stockMovements.value = response.data
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
        stockMovements.value = response.data
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
        stockMovements.value = []
        return { data: [], total: 0, totalPages: 1, currentPage: 1 }
      }
    } catch (err) {
      if (isDev) {
        console.error('Error in getStockMovements:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch stock movements')
      stockMovements.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create stock movement
   * @param {Object} movementData - Movement data
   * @param {string} movementData.productId - Product ID
   * @param {string} movementData.locationId - Location ID
   * @param {string} movementData.type - Movement type (in, out, adjustment, transfer)
   * @param {number} movementData.quantity - Quantity
   * @param {string} movementData.reason - Reason for movement
   * @param {string} movementData.reference - Reference number (optional)
   * @param {string} movementData.toLocationId - Destination location for transfers (optional)
   */
  const createStockMovement = async (movementData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Creating stock movement with data:', movementData)
      }

      const response = await api.post('/restaurant/stock-movements', movementData)
      
      if (isDev) {
        console.log('Stock movement created:', response)
      }

      showSuccess(response.message || 'Stock movement recorded successfully')
      return response.data
    } catch (err) {
      if (isDev) {
        console.error('Error creating stock movement:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to record stock movement')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get stock report
   * @param {Object} params - Query parameters
   * @param {string} params.locationId - Filter by location
   * @param {string} params.categoryId - Filter by category
   * @param {boolean} params.lowStock - Show only low stock items
   */
  const getStockReport = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.locationId) queryParams.append('locationId', params.locationId)
      if (params.categoryId) queryParams.append('categoryId', params.categoryId)
      if (params.lowStock !== undefined) queryParams.append('lowStock', params.lowStock)
      if (params.reportType) queryParams.append('reportType', params.reportType)

      const queryString = queryParams.toString()
      const url = `/restaurant/stock-report${queryString ? `?${queryString}` : ''}`
      
      if (isDev) {
        console.log('Fetching stock report from:', url)
      }
      
      const response = await api.get(url)
      
      if (isDev) {
        console.log('Stock report:', response)
      }
      
      if (response.data) {
        stockReport.value = response.data
        return response.data
      } else {
        stockReport.value = response
        return response
      }
    } catch (err) {
      if (isDev) {
        console.error('Error fetching stock report:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch stock report')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get stock movement by ID
   * @param {string} movementId - Movement ID
   */
  const getMovementById = async (movementId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/restaurant/stock-movements/${movementId}`)
      return response.data || response
    } catch (err) {
      if (isDev) console.error('Get movement error:', err)
      error.value = err.message
      handleError(err, 'Failed to get stock movement')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get stock summary by date range
   * @param {string} startDate - Start date (ISO format)
   * @param {string} endDate - End date (ISO format)
   */
  const getStockSummary = async (startDate, endDate) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (startDate) queryParams.append('startDate', startDate)
      if (endDate) queryParams.append('endDate', endDate)

      const queryString = queryParams.toString()
      const url = `/restaurant/stock-movements/summary${queryString ? `?${queryString}` : ''}`

      const response = await api.get(url)
      return response.data || response
    } catch (err) {
      if (isDev) console.error('Get stock summary error:', err)
      error.value = err.message
      handleError(err, 'Failed to get stock summary')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get most moved products
   * @param {number} limit - Number of products to return
   */
  const getMostMovedProducts = async (limit = 10) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/restaurant/stock-movements/most-moved?limit=${limit}`)
      return response.data || response
    } catch (err) {
      if (isDev) console.error('Get most moved products error:', err)
      error.value = err.message
      handleError(err, 'Failed to get most moved products')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get product stock history
   * @param {string} productId - Product ID
   */
  const getProductHistory = async (productId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/restaurant/stock-movements/product/${productId}`)
      return response.data || response
    } catch (err) {
      if (isDev) console.error('Get product history error:', err)
      error.value = err.message
      handleError(err, 'Failed to get product history')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Record stock in (purchase/receive)
   * @param {Object} stockData - Stock in data
   * @param {string} stockData.productId - Product ID
   * @param {string} stockData.locationId - Location ID
   * @param {number} stockData.quantity - Quantity
   * @param {number} stockData.unitCost - Unit cost
   * @param {string} stockData.reference - Reference/PO number
   * @param {string} stockData.notes - Notes
   */
  const recordStockIn = async (stockData) => {
    loading.value = true
    error.value = null
    try {
      // debug: log incoming payload for tracing
      console.log('[useRestaurantStock] recordStockIn called with:', stockData)
      if (isDev) {
        console.log('Recording stock in:', stockData)
      }

      const response = await api.post('/restaurant/stock-movements/stock-in', stockData)
      showSuccess('Stock in recorded successfully')
      return response.data || response
    } catch (err) {
      if (isDev) console.error('Record stock in error:', err)
      error.value = err.message
      handleError(err, 'Failed to record stock in')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Record stock out (wastage/damage)
   * @param {Object} stockData - Stock out data
   * @param {string} stockData.productId - Product ID
   * @param {string} stockData.locationId - Location ID
   * @param {number} stockData.quantity - Quantity
   * @param {string} stockData.reason - Reason (damage, wastage, expired, theft, other)
   * @param {string} stockData.notes - Notes
   */
  const recordStockOut = async (stockData) => {
    loading.value = true
    error.value = null
    try {
      // debug: log incoming payload for tracing
      console.log('[useRestaurantStock] recordStockOut called with:', stockData)
      if (isDev) {
        console.log('Recording stock out:', stockData)
      }

      const response = await api.post('/restaurant/stock-movements/stock-out', stockData)
      showSuccess('Stock out recorded successfully')
      return response.data || response
    } catch (err) {
      if (isDev) console.error('Record stock out error:', err)
      error.value = err.message
      handleError(err, 'Failed to record stock out')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Record stock adjustment
   * @param {Object} adjustmentData - Adjustment data
   * @param {string} adjustmentData.productId - Product ID
   * @param {string} adjustmentData.locationId - Location ID
   * @param {number} adjustmentData.quantity - Adjusted quantity (positive or negative)
   * @param {string} adjustmentData.reason - Reason for adjustment
   * @param {string} adjustmentData.notes - Notes
   */
  const recordAdjustment = async (adjustmentData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Recording adjustment:', adjustmentData)
      }

      const response = await api.post('/restaurant/stock-movements/adjustment', adjustmentData)
      showSuccess('Stock adjustment recorded successfully')
      return response.data || response
    } catch (err) {
      if (isDev) console.error('Record adjustment error:', err)
      error.value = err.message
      handleError(err, 'Failed to record adjustment')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Transfer stock between locations
   * @param {Object} transferData - Transfer data
   * @param {string} transferData.productId - Product ID
   * @param {string} transferData.fromLocationId - Source location ID
   * @param {string} transferData.toLocationId - Destination location ID
   * @param {number} transferData.quantity - Quantity to transfer
   * @param {string} transferData.notes - Notes
   */
  const transferStock = async (transferData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Transferring stock:', transferData)
      }

      const response = await api.post('/restaurant/stock-movements/transfer', transferData)
      showSuccess('Stock transfer completed successfully')
      return response.data || response
    } catch (err) {
      if (isDev) console.error('Transfer stock error:', err)
      error.value = err.message
      handleError(err, 'Failed to transfer stock')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Bulk stock in for multiple products
   * @param {Object} bulkData - Bulk stock in data
   * @param {string} bulkData.locationId - Location ID
   * @param {string} bulkData.reference - Reference/PO number
   * @param {Array} bulkData.items - Array of items [{productId, quantity, unitCost}]
   * @param {string} bulkData.notes - Notes
   */
  const bulkStockIn = async (bulkData) => {
    loading.value = true
    error.value = null
    try {
      // debug: log incoming payload for tracing
      console.log('[useRestaurantStock] bulkStockIn called with:', bulkData)
      if (isDev) {
        console.log('Bulk stock in:', bulkData)
      }

      const response = await api.post('/restaurant/stock-movements/bulk-stock-in', bulkData)
      showSuccess(`Bulk stock in recorded for ${bulkData.items.length} products`)
      return response.data || response
    } catch (err) {
      if (isDev) console.error('Bulk stock in error:', err)
      error.value = err.message
      handleError(err, 'Failed to record bulk stock in')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get transfer history
   * @param {Object} params - Query parameters
   * @param {string} params.locationId - Filter by location (from or to)
   * @param {string} params.startDate - Start date
   * @param {string} params.endDate - End date
   */
  const getTransferHistory = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      // ensure API receives `movementType=transfer`
      queryParams.append('movementType', 'transfer')
      if (params.locationId) queryParams.append('locationId', params.locationId)
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)
      if (params.page) queryParams.append('page', params.page)
      if (params.limit) queryParams.append('limit', params.limit)

      const queryString = queryParams.toString()
      const url = `/restaurant/stock-movements?${queryString}`

      const response = await api.get(url)
      return response.data || response
    } catch (err) {
      if (isDev) console.error('Get transfer history error:', err)
      error.value = err.message
      handleError(err, 'Failed to get transfer history')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    stockMovements,
    stockReport,
    loading,
    error,
    getStockMovements,
    createStockMovement,
    getStockReport,
    // New methods
    getMovementById,
    getStockSummary,
    getMostMovedProducts,
    getProductHistory,
    recordStockIn,
    recordStockOut,
    recordAdjustment,
    transferStock,
    bulkStockIn,
    getTransferHistory
  }
}
