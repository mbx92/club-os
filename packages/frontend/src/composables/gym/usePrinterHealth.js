import { ref, onUnmounted } from 'vue'

/**
 * Composable for real-time printer health monitoring via SSE
 * Monitors printer health, stuck jobs, and statistics
 * @param {String} printerId - Printer ID to monitor
 * @returns {Object} - Health status and control functions
 */
export const usePrinterHealth = (printerId) => {
  const health = ref({
    connected: false,
    status: 'unknown', // healthy, degraded, unhealthy, unknown
    message: '',
    isConnected: false,
    stuckJobsCount: 0,
    oldestStuckJobAge: 0,
    consecutiveFailures: 0,
    lastSuccessfulPrint: null,
    stuckJobs: [],
    statistics: null,
    error: null,
    lastUpdate: null
  })

  let abortController = null
  let reconnectTimeout = null
  let reconnectAttempts = 0
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY = 3000

  /**
   * Check printer health once (single check, not persistent stream)
   * Returns a Promise with the health status
   * @returns {Promise<Object>} Health status
   */
  const checkOnce = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token')
      }

      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
      const url = `${apiBase}/system/printers/${printerId}/stream/health?once=true`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('[PrinterHealth] One-time check result:', data)
      
      // Update health ref for convenience
      health.value = {
        connected: true,
        status: data.healthStatus,
        message: data.healthMessage,
        isConnected: data.isConnected,
        stuckJobsCount: data.stuckJobsCount,
        oldestStuckJobAge: data.oldestStuckJobAge,
        consecutiveFailures: data.consecutiveFailures,
        lastSuccessfulPrint: data.lastSuccessfulPrint ? new Date(data.lastSuccessfulPrint) : null,
        stuckJobs: data.stuckJobs || [],
        statistics: data.statistics,
        error: null,
        lastUpdate: new Date(data.timestamp || Date.now())
      }
      
      return data
    } catch (error) {
      console.error('[PrinterHealth] One-time check error:', error)
      health.value = {
        connected: false,
        status: 'unknown',
        message: error.message,
        isConnected: false,
        stuckJobsCount: 0,
        oldestStuckJobAge: 0,
        consecutiveFailures: 0,
        lastSuccessfulPrint: null,
        stuckJobs: [],
        statistics: null,
        error: error.message,
        lastUpdate: new Date()
      }
      throw error
    }
  }

  /**
   * Connect to printer health stream using fetch with ReadableStream
   */
  const connect = async () => {
    if (abortController) {
      return // Already connected
    }

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) {
        console.error('[PrinterHealth] No auth token found')
        health.value.error = 'No authentication token'
        return
      }

      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
      const url = `${apiBase}/system/printers/${printerId}/stream/health`
      
      abortController = new AbortController()
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream'
        },
        signal: abortController.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      console.log(`[PrinterHealth] Connected to printer ${printerId}`)
      reconnectAttempts = 0

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // Read stream
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          console.log('[PrinterHealth] Stream ended')
          break
        }

        buffer += decoder.decode(value, { stream: true })
        
        const messages = buffer.split('\n\n')
        buffer = messages.pop() || ''
        
        for (const message of messages) {
          const lines = message.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6))
                
                if (data.type === 'connected') {
                  console.log(`[PrinterHealth] Health monitoring started for printer ${printerId}`)
                  health.value.connected = true
                  health.value.error = null
                }
                
                if (data.type === 'health') {
                  health.value = {
                    connected: true,
                    status: data.healthStatus,
                    message: data.healthMessage,
                    isConnected: data.isConnected,
                    stuckJobsCount: data.stuckJobsCount,
                    oldestStuckJobAge: data.oldestStuckJobAge,
                    consecutiveFailures: data.consecutiveFailures,
                    lastSuccessfulPrint: data.lastSuccessfulPrint ? new Date(data.lastSuccessfulPrint) : null,
                    stuckJobs: data.stuckJobs || [],
                    statistics: data.statistics,
                    error: null,
                    lastUpdate: new Date(data.timestamp)
                  }
                  
                  console.log(`[PrinterHealth] Health update:`, {
                    printer: data.printerName,
                    status: data.healthStatus,
                    stuckJobs: data.stuckJobsCount,
                    consecutiveFailures: data.consecutiveFailures
                  })
                }
              } catch (err) {
                console.warn('[PrinterHealth] Failed to parse SSE data:', err)
              }
            }
          }
        }
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[PrinterHealth] Connection aborted')
        return
      }
      
      console.error('[PrinterHealth] Connection error:', error)
      health.value.connected = false
      health.value.error = error.message

      // Auto-reconnect with exponential backoff
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts)
        console.log(`[PrinterHealth] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1})`)
        
        reconnectTimeout = setTimeout(() => {
          reconnectAttempts++
          abortController = null
          connect()
        }, delay)
      } else {
        console.error('[PrinterHealth] Max reconnection attempts reached')
        health.value.error = 'Connection failed after multiple attempts'
      }
    }
  }

  /**
   * Disconnect from printer health stream
   */
  const disconnect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }

    if (abortController) {
      abortController.abort()
      abortController = null
      health.value.connected = false
      console.log(`[PrinterHealth] Disconnected from printer ${printerId}`)
    }
  }

  /**
   * Reset reconnection attempts
   */
  const resetReconnection = () => {
    reconnectAttempts = 0
  }

  // Auto cleanup on component unmount
  onUnmounted(() => {
    disconnect()
  })

  return {
    health,
    connect,
    disconnect,
    resetReconnection,
    checkOnce,
    isConnected: () => abortController !== null
  }
}
