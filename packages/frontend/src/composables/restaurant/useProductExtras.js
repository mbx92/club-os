import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useProductExtras() {
  const api = useApi()
  const { showError, showSuccess, handleError } = useNotification()
  const isDev = import.meta.env.DEV

  const extras = ref([])
  const groupedExtras = ref({})
  const loading = ref(false)

  /**
   * Fetch product extras
   * @param {string} productId - Product UUID
   * @param {boolean} grouped - Return grouped by groupName
   */
  const fetchExtras = async (productId, grouped = false, silent = false) => {
    loading.value = true
    try {
      const queryParams = grouped ? '?grouped=true' : ''
      const response = await api.get(`/restaurant/products/${productId}/extras${queryParams}`)

      if (isDev) {
        console.log('Fetched extras:', response)
      }

      if (grouped) {
        groupedExtras.value = response.data?.extras || response.extras || {}
      } else {
        extras.value = response.data?.extras || response.extras || []
      }

      return response
    } catch (error) {
      if (isDev) {
        console.error('Error fetching extras:', error)
      }
      if (!silent) {
        handleError(error, 'Failed to fetch product extras')
      }
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a single product extra
   * @param {string} productId - Product UUID
   * @param {object} extraData - Extra data
   */
  const createExtra = async (productId, extraData) => {
    loading.value = true
    try {
      if (isDev) {
        console.log('Creating extra:', extraData)
      }

      const response = await api.post(`/restaurant/products/${productId}/extras`, extraData)

      if (isDev) {
        console.log('Extra created:', response)
      }

      showSuccess(response.message || 'Product extra created successfully')
      return response
    } catch (error) {
      if (isDev) {
        console.error('Error creating extra:', error)
      }
      handleError(error, 'Failed to create product extra')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Bulk create product extras
   * @param {string} productId - Product UUID
   * @param {array} extrasArray - Array of extras
   */
  const bulkCreateExtras = async (productId, extrasArray) => {
    loading.value = true
    try {
      if (isDev) {
        console.log('Bulk creating extras:', extrasArray)
      }

      const response = await api.post(`/restaurant/products/${productId}/extras/bulk`, {
        extras: extrasArray
      })

      if (isDev) {
        console.log('Extras created:', response)
      }

      showSuccess(response.message || `${extrasArray.length} extras created successfully`)
      return response
    } catch (error) {
      if (isDev) {
        console.error('Error bulk creating extras:', error)
      }
      handleError(error, 'Failed to create extras')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Update product extra
   * @param {string} productId - Product UUID
   * @param {string} extraId - Extra UUID
   * @param {object} extraData - Updated extra data
   */
  const updateExtra = async (productId, extraId, extraData) => {
    loading.value = true
    try {
      if (isDev) {
        console.log('Updating extra:', extraId, extraData)
      }

      const response = await api.put(`/restaurant/products/${productId}/extras/${extraId}`, extraData)

      if (isDev) {
        console.log('Extra updated:', response)
      }

      showSuccess(response.message || 'Product extra updated successfully')
      return response
    } catch (error) {
      if (isDev) {
        console.error('Error updating extra:', error)
      }
      handleError(error, 'Failed to update product extra')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete product extra
   * @param {string} productId - Product UUID
   * @param {string} extraId - Extra UUID
   */
  const deleteExtra = async (productId, extraId) => {
    loading.value = true
    try {
      if (isDev) {
        console.log('Deleting extra:', extraId)
      }

      const response = await api.delete(`/restaurant/products/${productId}/extras/${extraId}`)

      if (isDev) {
        console.log('Extra deleted:', response)
      }

      showSuccess(response.message || 'Product extra deleted successfully')
      return response
    } catch (error) {
      if (isDev) {
        console.error('Error deleting extra:', error)
      }
      handleError(error, 'Failed to delete product extra')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Calculate total price with selected extras
   * @param {number} basePrice - Base product price
   * @param {array} selectedExtras - Array of selected extras with quantities
   * @param {array} allExtras - All available extras for lookup
   * @returns {object} - { basePrice, extrasTotal, total }
   */
  const calculateTotalPrice = (basePrice, selectedExtras, allExtras) => {
    const extrasTotal = selectedExtras.reduce((sum, selected) => {
      const extra = allExtras.find(e => e.id === selected.id)
      if (extra) {
        return sum + (extra.price * (selected.quantity || 1))
      }
      return sum
    }, 0)

    return {
      basePrice,
      extrasTotal,
      total: basePrice + extrasTotal
    }
  }

  /**
   * Validate required extras selection
   * @param {object} groupedExtras - Extras grouped by groupName
   * @param {array} selectedExtras - Array of selected extra IDs
   * @returns {object} - { valid, missingGroups }
   */
  const validateRequiredExtras = (groupedExtras, selectedExtras) => {
    const missingGroups = []
    
    Object.entries(groupedExtras).forEach(([groupName, extras]) => {
      const hasRequired = extras.some(e => e.isRequired)
      
      if (hasRequired) {
        const hasSelection = extras.some(e => 
          selectedExtras.some(s => s.id === e.id)
        )
        
        if (!hasSelection) {
          missingGroups.push(groupName)
        }
      }
    })

    return {
      valid: missingGroups.length === 0,
      missingGroups
    }
  }

  /**
   * Format extras for order submission
   * @param {array} selectedExtras - Selected extras with quantities
   * @returns {array} - Formatted extras array
   */
  const formatExtrasForOrder = (selectedExtras) => {
    return selectedExtras.map(extra => ({
      id: extra.id,
      quantity: extra.quantity || 1
    }))
  }

  return {
    extras,
    groupedExtras,
    loading,
    fetchExtras,
    createExtra,
    bulkCreateExtras,
    updateExtra,
    deleteExtra,
    calculateTotalPrice,
    validateRequiredExtras,
    formatExtrasForOrder
  }
}
