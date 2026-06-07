import { ref, computed } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useKitchenStream() {
  const api = useApi()
  const { handleError } = useNotification()
  const isDev = import.meta.env.DEV
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

  // State
  const orders = ref([])
  const loading = ref(false)
  const error = ref(null)
  const eventSource = ref(null)
  const connectionStatus = ref('disconnected') // disconnected, connecting, connected, error
  const lastRefresh = ref(new Date())

  // Computed
  const isConnected = computed(() => connectionStatus.value === 'connected')
  const isConnecting = computed(() => connectionStatus.value === 'connecting')
  const hasError = computed(() => connectionStatus.value === 'error')

  const connectionStatusText = computed(() => {
    switch (connectionStatus.value) {
      case 'connected': return 'Live'
      case 'connecting': return 'Connecting...'
      case 'error': return 'Connection Error'
      case 'disconnected': return 'Disconnected'
      default: return 'Unknown'
    }
  })

  const connectionStatusClass = computed(() => {
    switch (connectionStatus.value) {
      case 'connected': return 'text-success'
      case 'connecting': return 'text-warning'
      case 'error': return 'text-error'
      case 'disconnected': return 'text-base-content/60'
      default: return 'text-base-content/60'
    }
  })

  const formattedLastRefresh = computed(() => {
    return lastRefresh.value.toLocaleTimeString()
  })

  // Kitchen order statistics
  const stats = computed(() => {
    const newOrders = orders.value.filter(o => ['pending', 'confirmed', 'paid'].includes(o.status))
    const preparing = orders.value.filter(o => o.status === 'preparing')
    const ready = orders.value.filter(o => o.status === 'ready')
    const served = orders.value.filter(o => o.status === 'served')
    const completed = orders.value.filter(o => o.status === 'completed')

    return {
      new: newOrders.length,
      preparing: preparing.length,
      ready: ready.length,
      served: served.length,
      completed: completed.length,
      total: newOrders.length + preparing.length + ready.length + served.length + completed.length
    }
  })

  /**
   * Connect to kitchen EventSource stream
   * @param {Object} params - Stream parameters
   * @param {string} params.locationId - Optional location filter
   * @param {boolean} params.includeCompleted - Include completed orders
   */
  const connectToStream = async (params = {}) => {
    if (eventSource.value) {
      eventSource.value.close()
    }

    connectionStatus.value = 'connecting'
    error.value = null

    try {
      // Get JWT token from localStorage or sessionStorage (check both locations)
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Build stream URL
      const urlParams = new URLSearchParams()
      urlParams.append('token', token)
      
      if (params.locationId) {
        urlParams.append('locationId', params.locationId)
      }

      if (params.includeCompleted) {
        urlParams.append('includeCompleted', 'true')
      }

      const streamUrl = `${baseUrl}/restaurant/orders/kitchen/stream?${urlParams.toString()}`
      
      if (isDev) {
        console.log('Connecting to kitchen stream:', streamUrl)
      }

      eventSource.value = new EventSource(streamUrl)

      // Listen for kitchen events
      eventSource.value.addEventListener('kitchen', (event) => {
        try {
          const response = JSON.parse(event.data)
          
          if (isDev) {
            console.log('Kitchen stream event received:', response)
          }

          // Handle both formats: {success: true, data: [...]} or direct array
          let kitchenOrders = []
          
          if (response.success && response.data) {
            kitchenOrders = response.data
          } else if (Array.isArray(response)) {
            kitchenOrders = response
          } else if (response.data && Array.isArray(response.data)) {
            kitchenOrders = response.data
          }
          
          orders.value = kitchenOrders
          lastRefresh.value = new Date()
          
          if (isDev) {
            console.log('Kitchen orders updated from stream:', orders.value.length, 'orders')
            console.log('Orders by status:', orders.value.reduce((acc, o) => {
              acc[o.status] = (acc[o.status] || 0) + 1
              return acc
            }, {}))
          }
        } catch (err) {
          console.error('Error parsing kitchen stream event:', err)
          error.value = err.message
        }
      })

      // Handle connection opened
      eventSource.value.onopen = () => {
        if (isDev) {
          console.log('Kitchen stream connected successfully')
        }
        connectionStatus.value = 'connected'
        loading.value = false
      }

      // Handle errors
      eventSource.value.onerror = (streamError) => {
        console.error('Kitchen stream error:', streamError)
        connectionStatus.value = 'error'
        loading.value = false
        error.value = 'Stream connection failed'
        // EventSource will auto-reconnect
      }

    } catch (err) {
      console.error('Failed to connect to kitchen stream:', err)
      connectionStatus.value = 'error'
      loading.value = false
      error.value = err.message
      handleError(err, 'Failed to connect to kitchen stream')
    }
  }

  /**
   * Disconnect from kitchen stream
   */
  const disconnectFromStream = () => {
    if (eventSource.value) {
      eventSource.value.close()
      eventSource.value = null
    }
    connectionStatus.value = 'disconnected'
    
    if (isDev) {
      console.log('Kitchen stream disconnected')
    }
  }

  /**
   * Fallback method to fetch kitchen orders via REST API
   * @param {Object} params - Query parameters
   */
  const fetchOrdersFallback = async (params = {}) => {
    loading.value = true
    error.value = null

    try {
      const queryParams = new URLSearchParams()
      queryParams.append('limit', params.limit || 50)
      
      // Add status filters
      const statuses = params.statuses || ['pending', 'preparing', 'ready', 'served']
      statuses.forEach(status => queryParams.append('status', status))

      if (params.locationId) {
        queryParams.append('locationId', params.locationId)
      }

      if (params.includeCompleted) {
        queryParams.append('status', 'completed')
      }

      const url = `/restaurant/orders/kitchen?${queryParams.toString()}`
      
      if (isDev) {
        console.log('Fetching kitchen orders (fallback):', url)
      }

      const response = await api.get(url)

      if (response.data) {
        orders.value = response.data
      } else if (Array.isArray(response)) {
        orders.value = response
      }

      lastRefresh.value = new Date()

      if (isDev) {
        console.log('Kitchen orders loaded via fallback:', orders.value.length, 'orders')
      }

      return orders.value
    } catch (err) {
      console.error('Failed to fetch kitchen orders:', err)
      error.value = err.message
      handleError(err, 'Failed to fetch kitchen orders')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {string} status - New status
   */
  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await api.put(`/restaurant/orders/${orderId}/status`, { status })
      
      // Update local state optimistically
      const order = orders.value.find(o => o.id === orderId)
      if (order) {
        order.status = status
      }

      if (isDev) {
        console.log('Order status updated:', orderId, status)
      }

      return response.data || response
    } catch (err) {
      console.error('Failed to update order status:', err)
      handleError(err, 'Failed to update order status')
      throw err
    }
  }

  /**
   * Update order item status
   * @param {string} orderId - Order ID
   * @param {string} itemId - Order item ID
   * @param {string} status - New status
   */
  const updateOrderItemStatus = async (orderId, itemId, status) => {
    try {
      const response = await api.put(`/restaurant/orders/${orderId}/items/${itemId}/status`, { status })

      // Update local state optimistically
      const order = orders.value.find(o => o.id === orderId)
      if (order) {
        const item = order.items?.find(i => i.id === itemId)
        if (item) {
          if (status === 'ready') {
            item.isReady = true
          }
          item.status = status
        }
      }

      if (isDev) {
        console.log('Order item status updated:', orderId, itemId, status)
      }

      return response.data || response
    } catch (err) {
      console.error('Failed to update item status:', err)
      handleError(err, 'Failed to update item status')
      throw err
    }
  }

  /**
   * Clear all data and reset state
   */
  const clearData = () => {
    orders.value = []
    error.value = null
    lastRefresh.value = new Date()
  }

  /**
   * Remove order from display (local state only)
   * @param {string} orderId - Order ID
   */
  const removeOrder = (orderId) => {
    const index = orders.value.findIndex(o => o.id === orderId)
    if (index !== -1) {
      orders.value.splice(index, 1)
      
      if (isDev) {
        console.log('Order removed from display:', orderId)
      }
    }
  }

  return {
    // State
    orders,
    loading,
    error,
    connectionStatus,
    lastRefresh,
    
    // Computed
    isConnected,
    isConnecting,
    hasError,
    connectionStatusText,
    connectionStatusClass,
    formattedLastRefresh,
    stats,

    // Methods
    connectToStream,
    disconnectFromStream,
    fetchOrdersFallback,
    updateOrderStatus,
    updateOrderItemStatus,
    clearData,
    removeOrder
  }
}