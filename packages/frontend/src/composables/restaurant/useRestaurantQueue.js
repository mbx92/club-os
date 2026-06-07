import { ref, computed, onUnmounted } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useRestaurantQueue() {
  const api = useApi()
  const { showSuccess, handleError, showWarning } = useNotification()
  const isDev = import.meta.env.DEV
  // Default to backend API base. Prefer providing VITE_API_URL in .env
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

  // State
  const queueDisplay = ref({
    preparing: [],
    ready: [],
    lastCalled: [],
    currentServing: null
  })
  const queueOrders = ref([])
  const loading = ref(false)
  const error = ref(null)

  // SSE Stream State
  const eventSource = ref(null)
  const isConnected = ref(false)
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 5
  const reconnectDelay = 3000 // 3 seconds
  let reconnectTimeout = null

  /**
   * Get public queue display (No authentication required)
   * @param {string} tenantId - Tenant ID (required)
   * @param {string} locationId - Optional location ID
   */
  const getQueueDisplay = async (tenantId, locationId = null) => {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      if (tenantId) params.append('tenantId', tenantId)
      if (locationId) params.append('locationId', locationId)

      const queryString = params.toString()
      const url = `/restaurant/queue-display${queryString ? `?${queryString}` : ''}`

      if (isDev) {
        console.log('Fetching queue display from:', url)
      }

      // Public endpoint - may need different handling
      const response = await api.get(url)

      if (isDev) {
        console.log('Queue display response:', response)
      }

      queueDisplay.value = response.data || {
        preparing: [],
        ready: [],
        lastCalled: [],
        currentServing: null
      }

      return queueDisplay.value
    } catch (err) {
      if (isDev) {
        console.error('Get queue display error:', err)
      }
      error.value = err.message
      // Don't show notification for public display errors
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get queue orders list (Staff only) - Initial fetch before SSE
   * @param {Object} params - Query parameters
   * @param {string} params.status - Filter by status (paid, preparing, ready)
   * @param {string} params.locationId - Filter by location
   * @param {string} params.date - Filter by date
   */
  const getQueueOrders = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.status) queryParams.append('status', params.status)
      if (params.locationId) queryParams.append('locationId', params.locationId)
      if (params.date) queryParams.append('date', params.date)
      if (params.orderType) queryParams.append('orderType', params.orderType)

      const queryString = queryParams.toString()
      const url = `/restaurant/orders/queue${queryString ? `?${queryString}` : ''}`

      if (isDev) {
        console.log('Fetching queue orders from:', url)
      }

      const response = await api.get(url)

      if (isDev) {
        console.log('Queue orders response:', response)
      }

      queueOrders.value = response.data || []
      return queueOrders.value
    } catch (err) {
      if (isDev) {
        console.error('Get queue orders error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch queue orders')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Connect to SSE queue stream for real-time updates
   * @param {Object} options - Connection options
   * @param {string} options.locationId - Optional location ID to filter
   * @param {Function} options.onQueueUpdate - Callback when queue data updates
   * @param {Function} options.onError - Callback on error
   * @param {Function} options.onConnect - Callback when connected
   */
  const connectQueueStream = (options = {}) => {
    const { locationId, onQueueUpdate, onError, onConnect } = options

    // Disconnect existing connection first
    disconnectQueueStream()

    // Get auth token
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) {
      const errorMsg = 'No authentication token available'
      error.value = errorMsg
      if (onError) onError(new Error(errorMsg))
      return
    }

    // Build SSE URL
    const params = new URLSearchParams()
    if (locationId) params.append('locationId', locationId)
    params.append('token', token) // SSE doesn't support headers, pass token as query param

    const queryString = params.toString()
    const streamUrl = `${baseUrl}/restaurant/orders/queue/stream${queryString ? `?${queryString}` : ''}`

    if (isDev) {
      console.log('🔌 Connecting to queue stream:', streamUrl)
    }

    try {
      eventSource.value = new EventSource(streamUrl)

      // Connection opened
      eventSource.value.onopen = () => {
        if (isDev) {
          console.log('✅ Queue stream connected')
        }
        isConnected.value = true
        reconnectAttempts.value = 0
        error.value = null
        if (onConnect) onConnect()
      }

      // Listen for queue updates
      eventSource.value.addEventListener('queue', (event) => {
        try {
          const queueData = JSON.parse(event.data)
          if (isDev) {
            console.log('📦 Queue update received:', queueData)
          }

          // Update local state
          queueOrders.value = queueData.orders || queueData || []

          // Also update queueDisplay if provided
          if (queueData.display) {
            queueDisplay.value = queueData.display
          }

          // Call custom callback
          if (onQueueUpdate) onQueueUpdate(queueData)
        } catch (parseError) {
          console.error('Failed to parse queue data:', parseError)
        }
      })

      // Listen for heartbeat (keep-alive)
      eventSource.value.addEventListener('heartbeat', (event) => {
        if (isDev) {
          console.log('💓 Heartbeat received:', event.data)
        }
      })

      // Listen for order-created events
      eventSource.value.addEventListener('order-created', (event) => {
        try {
          const orderData = JSON.parse(event.data)
          if (isDev) {
            console.log('🆕 New order created:', orderData)
          }

          // Add to queue orders if not already present
          const existingIndex = queueOrders.value.findIndex(o => o.id === orderData.id)
          if (existingIndex === -1) {
            queueOrders.value.unshift(orderData)
          }

          if (onQueueUpdate) onQueueUpdate({ type: 'order-created', order: orderData })
        } catch (parseError) {
          console.error('Failed to parse order-created data:', parseError)
        }
      })

      // Listen for status-updated events
      eventSource.value.addEventListener('status-updated', (event) => {
        try {
          const updateData = JSON.parse(event.data)
          if (isDev) {
            console.log('🔄 Order status updated:', updateData)
          }

          // Update order in queue
          const orderIndex = queueOrders.value.findIndex(o => o.id === updateData.id)
          if (orderIndex !== -1) {
            queueOrders.value[orderIndex] = { ...queueOrders.value[orderIndex], ...updateData }
          }

          if (onQueueUpdate) onQueueUpdate({ type: 'status-updated', order: updateData })
        } catch (parseError) {
          console.error('Failed to parse status-updated data:', parseError)
        }
      })

      // Listen for queue-called events
      eventSource.value.addEventListener('queue-called', (event) => {
        try {
          const callData = JSON.parse(event.data)
          if (isDev) {
            console.log('📢 Queue number called:', callData)
          }

          // Update lastCalled in display
          if (callData.queueNumber) {
            queueDisplay.value.lastCalled = [
              callData.queueNumber,
              ...(queueDisplay.value.lastCalled || []).slice(0, 4)
            ]
            queueDisplay.value.currentServing = callData.queueNumber
          }

          if (onQueueUpdate) onQueueUpdate({ type: 'queue-called', data: callData })
        } catch (parseError) {
          console.error('Failed to parse queue-called data:', parseError)
        }
      })

      // Handle errors
      eventSource.value.onerror = (err) => {
        console.error('❌ Queue stream error:', err)
        isConnected.value = false
        error.value = 'Connection lost'

        // Close the broken connection
        if (eventSource.value) {
          eventSource.value.close()
          eventSource.value = null
        }

        // Attempt reconnect
        if (reconnectAttempts.value < maxReconnectAttempts) {
          reconnectAttempts.value++
          const delay = reconnectDelay * reconnectAttempts.value

          if (isDev) {
            console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.value}/${maxReconnectAttempts})`)
          }

          reconnectTimeout = setTimeout(() => {
            connectQueueStream(options)
          }, delay)
        } else {
          const errorMsg = 'Max reconnection attempts reached'
          error.value = errorMsg
          showWarning('Queue connection lost. Please refresh the page.')
          if (onError) onError(new Error(errorMsg))
        }
      }
    } catch (err) {
      console.error('Failed to create EventSource:', err)
      error.value = err.message
      if (onError) onError(err)
    }
  }

  /**
   * Disconnect from SSE queue stream
   */
  const disconnectQueueStream = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }

    if (eventSource.value) {
      if (isDev) {
        console.log('🔌 Disconnecting queue stream')
      }
      eventSource.value.close()
      eventSource.value = null
    }

    isConnected.value = false
    reconnectAttempts.value = 0
  }

  // Auto-cleanup on unmount
  onUnmounted(() => {
    disconnectQueueStream()
  })

  /**
   * Update queue order status
   * @param {string} orderId - Order ID
   * @param {string} status - New status (preparing, ready, completed, cancelled)
   */
  const updateQueueStatus = async (orderId, status) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Updating queue status:', orderId, status)
      }

      const response = await api.put(`/restaurant/orders/queue/${orderId}/status`, { status })

      if (isDev) {
        console.log('Queue status updated:', response)
      }

      showSuccess(response.message || `Order status updated to ${status}`)
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Update queue status error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to update queue status')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Call queue number (announce to customer)
   * @param {string} orderId - Order ID
   */
  const callQueueNumber = async (orderId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Calling queue number for order:', orderId)
      }

      const response = await api.post(`/restaurant/orders/queue/${orderId}/call`)

      if (isDev) {
        console.log('Queue number called:', response)
      }

      showSuccess(response.message || 'Queue number called')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Call queue number error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to call queue number')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get queue statistics
   * @param {string} locationId - Optional location ID
   */
  const getQueueStats = async (locationId = null) => {
    loading.value = true
    error.value = null
    try {
      const url = locationId
        ? `/restaurant/orders/queue/stats?locationId=${locationId}`
        : '/restaurant/orders/queue/stats'

      if (isDev) {
        console.log('Fetching queue stats from:', url)
      }

      const response = await api.get(url)

      if (isDev) {
        console.log('Queue stats:', response)
      }

      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Get queue stats error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to get queue statistics')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Computed helpers
  const preparingOrders = computed(() => queueDisplay.value.preparing || [])
  const readyOrders = computed(() => queueDisplay.value.ready || [])
  const lastCalledNumbers = computed(() => queueDisplay.value.lastCalled || [])

  const ordersByStatus = computed(() => {
    const orders = queueOrders.value
    return {
      paid: orders.filter(o => o.status === 'paid'),
      preparing: orders.filter(o => o.status === 'preparing'),
      ready: orders.filter(o => o.status === 'ready'),
      completed: orders.filter(o => o.status === 'completed')
    }
  })

  return {
    // State
    queueDisplay,
    queueOrders,
    loading,
    error,

    // SSE Stream State
    isConnected,
    reconnectAttempts,

    // Computed
    preparingOrders,
    readyOrders,
    lastCalledNumbers,
    ordersByStatus,

    // Methods
    getQueueDisplay,
    getQueueOrders,
    updateQueueStatus,
    callQueueNumber,
    getQueueStats,

    // SSE Stream Methods
    connectQueueStream,
    disconnectQueueStream
  }
}
