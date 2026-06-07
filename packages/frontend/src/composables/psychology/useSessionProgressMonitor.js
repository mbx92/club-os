import { ref, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

/**
 * Session Progress Monitor using SSE (Server-Sent Events)
 * Real-time monitoring of test session progress
 */
export const useSessionProgressMonitor = () => {
  const authStore = useAuthStore()
  
  const connected = ref(false)
  const connecting = ref(false)
  const progress = ref(null)
  const error = ref(null)
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 5
  
  let reader = null
  let controller = null
  let reconnectTimeout = null

  /**
   * Connect to SSE stream
   */
  const connect = async (sessionId) => {
    if (connecting.value || connected.value) {
      console.warn('Already connected or connecting')
      return
    }

    connecting.value = true
    error.value = null
    reconnectAttempts.value = 0

    await connectWithFetch(sessionId)
  }

  /**
   * Connect using Fetch API with streaming
   */
  const connectWithFetch = async (sessionId) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || ''
      const token = authStore.token
      const url = `${baseUrl}/psychology/sessions/${sessionId}/progress/stream?token=${token}`

      controller = new AbortController()
      const response = await fetch(url, {
        headers: {
          'Accept': 'text/event-stream'
        },
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      connecting.value = false
      connected.value = true

      reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          handleDisconnect(sessionId)
          break
        }

        buffer += decoder.decode(value, { stream: true })

        // Process complete events (separated by double newline)
        const lines = buffer.split('\n\n')
        buffer = lines.pop() // Keep incomplete event in buffer

        for (const eventBlock of lines) {
          if (eventBlock.trim()) {
            processEvent(eventBlock)
          }
        }
      }
    } catch (err) {
      console.error('Stream error:', err)
      error.value = err.message || 'Connection failed'
      connecting.value = false
      connected.value = false

      if (err.name !== 'AbortError') {
        handleReconnect(sessionId)
      }
    }
  }

  /**
   * Process SSE event
   */
  const processEvent = (eventBlock) => {
    const lines = eventBlock.split('\n')
    let eventType = 'message'
    let data = ''

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        data += line.slice(5).trim()
      }
    }

    if (!data) return

    try {
      const parsed = JSON.parse(data)

      if (eventType === 'heartbeat') {
        // Connection alive, no action needed
        return
      }

      if (parsed.type === 'connected') {
        progress.value = parsed.data
        reconnectAttempts.value = 0
      } else if (parsed.type === 'progress') {
        progress.value = parsed.data
      }
    } catch (err) {
      console.error('Failed to parse event:', err)
    }
  }

  /**
   * Handle disconnect
   */
  const handleDisconnect = (sessionId) => {
    connected.value = false
    
    // Don't reconnect if session is completed
    if (progress.value?.status === 'completed') {
      return
    }

    handleReconnect(sessionId)
  }

  /**
   * Handle reconnect with exponential backoff
   */
  const handleReconnect = (sessionId) => {
    if (reconnectAttempts.value >= maxReconnectAttempts) {
      error.value = 'Connection lost. Please refresh the page.'
      return
    }

    reconnectAttempts.value++
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.value), 30000)
    
    reconnectTimeout = setTimeout(() => {
      connecting.value = false
      connected.value = false
      connectWithFetch(sessionId)
    }, delay)
  }

  /**
   * Disconnect from stream
   */
  const disconnect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }

    if (controller) {
      controller.abort()
      controller = null
    }

    if (reader) {
      reader.cancel()
      reader = null
    }

    connected.value = false
    connecting.value = false
    reconnectAttempts.value = 0
  }

  /**
   * Format time from seconds to MM:SS
   */
  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  /**
   * Get status badge class
   */
  const getStatusClass = (status) => {
    const classes = {
      'pending': 'badge-ghost',
      'in_progress': 'badge-primary',
      'completed': 'badge-success',
      'abandoned': 'badge-error'
    }
    return classes[status] || 'badge-ghost'
  }

  /**
   * Get status label
   */
  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'Menunggu',
      'in_progress': 'Sedang Berlangsung',
      'completed': 'Selesai',
      'abandoned': 'Dibatalkan'
    }
    return labels[status] || status
  }

  // Cleanup on component unmount
  onUnmounted(() => {
    disconnect()
  })

  return {
    // State
    connected,
    connecting,
    progress,
    error,
    reconnectAttempts,

    // Methods
    connect,
    disconnect,
    formatTime,
    getStatusClass,
    getStatusLabel
  }
}
