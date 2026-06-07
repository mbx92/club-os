import { ref } from 'vue'

const BASE_URL = import.meta.env.VITE_API_URL || ''

/**
 * Test Logger - Automatically log critical events during test sessions
 * These logs are sent to backend for admin review
 * 
 * Follows SESSION-LOGGING-API.md specification
 */
export const useTestLogger = () => {
  const isSending = ref(false)
  const logQueue = ref([])
  const flushTimer = ref(null)
  const BATCH_SIZE = 10 // Larger batch to reduce request frequency
  const FLUSH_INTERVAL = 5000 // 5 seconds - balanced between real-time and server load

  /**
   * Send logs to backend (batch)
   */
  const sendLogs = async (token, sessionId, logs) => {
    if (isSending.value || logs.length === 0) return

    isSending.value = true
    try {
      const url = `${BASE_URL}/psychology/public/access/${token}/session/${sessionId}/log`
      
      // Format logs according to API spec
      const formattedLogs = logs.map(log => ({
        level: log.level || 'info',
        eventType: log.eventType,
        message: log.message || null,
        data: log.data || {},
        clientTimestamp: log.clientTimestamp || new Date().toISOString()
      }))

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          logs: formattedLogs
        })
      })

      if (!response.ok) {
        console.error('Failed to send logs to backend:', response.statusText)
        // Re-queue failed logs
        logQueue.value.unshift(...logs)
      } else {
        console.log(`✅ Sent ${formattedLogs.length} logs to backend`)
      }
    } catch (error) {
      console.error('Error sending logs:', error)
      // Re-queue failed logs
      logQueue.value.unshift(...logs)
    } finally {
      isSending.value = false
    }
  }

  /**
   * Add log to queue
   */
  const queueLog = (token, sessionId, logData) => {
    logQueue.value.push({
      ...logData,
      clientTimestamp: logData.clientTimestamp || new Date().toISOString()
    })

    // Auto-flush if batch size reached or if critical/error
    // Only immediate flush for critical errors to reduce server requests
    if (logQueue.value.length >= BATCH_SIZE || logData.level === 'error' || logData.level === 'critical') {
      flushLogs(token, sessionId)
    }
  }

  /**
   * Flush logs immediately
   */
  const flushLogs = async (token, sessionId) => {
    if (logQueue.value.length === 0) return

    const logsToSend = [...logQueue.value]
    logQueue.value = []

    await sendLogs(token, sessionId, logsToSend)
  }

  /**
   * Start auto-flush interval
   */
  const startAutoFlush = (token, sessionId) => {
    if (flushTimer.value) return

    flushTimer.value = setInterval(() => {
      flushLogs(token, sessionId)
    }, FLUSH_INTERVAL)
  }

  /**
   * Stop auto-flush interval
   */
  const stopAutoFlush = () => {
    if (flushTimer.value) {
      clearInterval(flushTimer.value)
      flushTimer.value = null
    }
  }

  /**
   * Log error event
   */
  const logError = (token, sessionId, eventType, data = {}, message = null) => {
    const logData = {
      level: 'error',
      eventType,
      message,
      data: {
        ...data,
        url: window.location.href,
        userAgent: navigator.userAgent,
        screen: {
          width: window.screen.width,
          height: window.screen.height
        }
      }
    }

    console.error('❌ Error Event:', logData)
    queueLog(token, sessionId, logData)
  }

  /**
   * Log warning event
   */
  const logWarning = (token, sessionId, eventType, data = {}, message = null) => {
    const logData = {
      level: 'warn',
      eventType,
      message,
      data
    }

    console.warn('⚠️ Warning:', logData)
    queueLog(token, sessionId, logData)
  }

  /**
   * Log info event (for debugging)
   */
  const logInfo = (token, sessionId, eventType, data = {}, message = null) => {
    const logData = {
      level: 'info',
      eventType,
      message,
      data
    }

    console.log('ℹ️ Info:', logData)
    queueLog(token, sessionId, logData)
  }

  /**
   * Log timer state
   */
  const logTimerState = (token, sessionId, state, data = {}) => {
    logInfo(token, sessionId, `timer_${state}`, data)
  }

  /**
   * Log test completion
   */
  const logTestCompletion = (token, sessionId, completionType, stats) => {
    const level = completionType === 'force' ? 'error' : 'info'
    const eventType = completionType === 'force' ? 'test_timeout' : 'test_completed'
    
    const logData = {
      level,
      eventType,
      message: completionType === 'force' ? 'Test auto-submitted due to timeout' : 'Test completed normally',
      data: stats
    }

    console.log('✅ Test Completion:', logData)
    queueLog(token, sessionId, logData)
  }

  /**
   * Legacy method for critical events (maps to error)
   */
  const logCriticalEvent = (token, sessionId, eventType, data = {}) => {
    logError(token, sessionId, eventType, data, 'Critical event detected')
  }

  return {
    isSending,
    logQueue,
    logError,
    logWarning,
    logInfo,
    logTimerState,
    logTestCompletion,
    logCriticalEvent, // Legacy compatibility
    flushLogs,
    startAutoFlush,
    stopAutoFlush
  }
}
