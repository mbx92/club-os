import { ref, onUnmounted } from 'vue'

/**
 * Composable for real-time printer connection monitoring via SSE
 * Using fetch with ReadableStream to support Authorization header
 * @param {String} printerId - Printer ID to monitor
 * @returns {Object} - Stream status and control functions
 */
export const usePrinterStream = (printerId) => {
  const status = ref({
    connected: false,
    online: false,
    latency: null,
    error: null,
    lastUpdate: null
  })

  let abortController = null
  let reconnectTimeout = null
  let reconnectAttempts = 0
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY = 3000

  /**
   * Check printer connection once (single ping, not persistent stream)
   * Returns a Promise with the connection status
   * @returns {Promise<Object>} Connection status { online, latency, timestamp }
   */
  const checkOnce = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token')
      }

      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
      const url = `${apiBase}/system/printers/${printerId}/stream/connection?once=true`
      
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
      console.log('[PrinterStream] One-time check result:', data)
      
      // Update status ref for convenience
      status.value = {
        connected: true,
        online: data.status === 'online',
        latency: data.latency || null,
        error: data.error || null,
        lastUpdate: new Date(data.timestamp || Date.now())
      }
      
      return data
    } catch (error) {
      console.error('[PrinterStream] One-time check error:', error)
      status.value = {
        connected: false,
        online: false,
        latency: null,
        error: error.message,
        lastUpdate: new Date()
      }
      throw error
    }
  }

  /**
   * Connect to printer stream using fetch with ReadableStream
   * This allows us to use Authorization header properly
   */
  const connect = async () => {
    if (abortController) {
      return // Already connected
    }

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) {
        console.error('[PrinterStream] No auth token found')
        status.value.error = 'No authentication token'
        return
      }

      // Use Vite environment variable for API base URL
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
      const url = `${apiBase}/system/printers/${printerId}/stream/connection`
      
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

      console.log(`[PrinterStream] Connected to printer ${printerId}`)
      reconnectAttempts = 0

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // Read stream
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          console.log('[PrinterStream] Stream ended')
          break
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true })
        
        // Process complete messages (SSE format: data: {...}\n\n)
        const messages = buffer.split('\n\n')
        buffer = messages.pop() || '' // Keep incomplete message in buffer
        
        for (const message of messages) {
          const lines = message.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6))
                
                if (data.type === 'connected') {
                  console.log(`[PrinterStream] Stream established for printer ${printerId}`)
                  status.value.connected = true
                  status.value.error = null
                }
                
                if (data.type === 'status') {
                  status.value = {
                    connected: true,
                    online: data.status === 'online',
                    latency: data.latency || null,
                    error: data.error || null,
                    lastUpdate: new Date(data.timestamp)
                  }
                  
                  console.log(`[PrinterStream] Status update:`, {
                    printer: data.printerName,
                    status: data.status,
                    latency: data.latency
                  })
                }
              } catch (err) {
                console.warn('[PrinterStream] Failed to parse SSE data:', err)
              }
            }
          }
        }
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[PrinterStream] Connection aborted')
        return
      }
      
      console.error('[PrinterStream] Connection error:', error)
      status.value.connected = false
      status.value.error = error.message

      // Auto-reconnect with exponential backoff
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts)
        console.log(`[PrinterStream] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1})`)
        
        reconnectTimeout = setTimeout(() => {
          reconnectAttempts++
          abortController = null
          connect()
        }, delay)
      } else {
        console.error('[PrinterStream] Max reconnection attempts reached')
        status.value.error = 'Connection failed after multiple attempts'
      }
    }
  }

  /**
   * Disconnect from printer stream
   */
  const disconnect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }

    if (abortController) {
      abortController.abort()
      abortController = null
      status.value.connected = false
      console.log(`[PrinterStream] Disconnected from printer ${printerId}`)
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
    status,
    connect,
    disconnect,
    resetReconnection,
    checkOnce,
    isConnected: () => abortController !== null
  }
}
