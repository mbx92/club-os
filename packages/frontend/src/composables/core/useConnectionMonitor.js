import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Connection Monitor Composable
 * Monitors network connection quality with periodic ping checks
 */
export const useConnectionMonitor = () => {
  const isOnline = ref(navigator.onLine)
  const connectionQuality = ref('good') // 'good', 'warning', 'poor', 'offline'
  const pingLatency = ref(0) // in milliseconds
  const lastCheckTime = ref(null)
  const isChecking = ref(false)

  let pingInterval = null
  let onlineListener = null
  let offlineListener = null

  /**
   * Ping server to measure latency
   * Uses HEAD request to minimize data transfer
   */
  const pingServer = async () => {
    if (isChecking.value) return

    isChecking.value = true
    const startTime = performance.now()

    try {
      // Health endpoint is at root, not under /api/v1
      const baseUrl = import.meta.env.VITE_API_URL || ''
      const apiBase = baseUrl.replace('/api/v1', '') // Remove /api/v1 prefix
      const pingUrl = `${apiBase}/health` // Health check endpoint at root
      
      const response = await fetch(pingUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })

      const endTime = performance.now()
      pingLatency.value = Math.round(endTime - startTime)
      lastCheckTime.value = new Date()

      // Determine connection quality based on latency
      if (pingLatency.value < 200) {
        connectionQuality.value = 'good'
      } else if (pingLatency.value < 500) {
        connectionQuality.value = 'warning'
      } else {
        connectionQuality.value = 'poor'
      }

      return {
        success: true,
        latency: pingLatency.value,
        quality: connectionQuality.value
      }

    } catch (error) {
      console.warn('Connection check failed:', error.message)
      
      // If fetch fails, connection is likely very poor or offline
      if (navigator.onLine) {
        connectionQuality.value = 'poor'
        pingLatency.value = 9999 // Indicate timeout/failure
      } else {
        connectionQuality.value = 'offline'
        pingLatency.value = 0
      }

      return {
        success: false,
        error: error.message,
        quality: connectionQuality.value
      }
    } finally {
      isChecking.value = false
    }
  }

  /**
   * Start periodic connection monitoring
   * @param {Number} intervalMs - Check interval in milliseconds (default: 10000 = 10s)
   */
  const startMonitoring = (intervalMs = 10000) => {
    stopMonitoring() // Clear any existing interval

    // Initial check
    pingServer()

    // Periodic checks
    pingInterval = setInterval(() => {
      pingServer()
    }, intervalMs)

    // Listen for browser online/offline events
    onlineListener = () => {
      isOnline.value = true
      connectionQuality.value = 'good'
      // Recheck immediately when coming back online
      pingServer()
    }
    
    offlineListener = () => {
      isOnline.value = false
      connectionQuality.value = 'offline'
      pingLatency.value = 0
    }

    window.addEventListener('online', onlineListener)
    window.addEventListener('offline', offlineListener)
  }

  /**
   * Stop connection monitoring
   */
  const stopMonitoring = () => {
    if (pingInterval) {
      clearInterval(pingInterval)
      pingInterval = null
    }

    if (onlineListener) {
      window.removeEventListener('online', onlineListener)
      onlineListener = null
    }

    if (offlineListener) {
      window.removeEventListener('offline', offlineListener)
      offlineListener = null
    }
  }

  /**
   * Get connection quality info
   */
  const getConnectionInfo = () => {
    return {
      isOnline: isOnline.value,
      quality: connectionQuality.value,
      latency: pingLatency.value,
      lastCheck: lastCheckTime.value,
      label: getQualityLabel(),
      color: getQualityColor(),
      icon: getQualityIcon(),
      recommendation: getRecommendation()
    }
  }

  /**
   * Get human-readable quality label
   */
  const getQualityLabel = () => {
    switch (connectionQuality.value) {
      case 'good':
        return 'Koneksi Baik'
      case 'warning':
        return 'Koneksi Lambat'
      case 'poor':
        return 'Koneksi Buruk'
      case 'offline':
        return 'Tidak Ada Koneksi'
      default:
        return 'Memeriksa...'
    }
  }

  /**
   * Get color for quality indicator
   */
  const getQualityColor = () => {
    switch (connectionQuality.value) {
      case 'good':
        return 'success'
      case 'warning':
        return 'warning'
      case 'poor':
        return 'error'
      case 'offline':
        return 'error'
      default:
        return 'info'
    }
  }

  /**
   * Get icon for quality indicator (Tabler Icons)
   */
  const getQualityIcon = () => {
    switch (connectionQuality.value) {
      case 'good':
        return 'i-tabler-wifi' // Full WiFi signal
      case 'warning':
        return 'i-tabler-wifi-1' // Medium WiFi signal
      case 'poor':
        return 'i-tabler-wifi-0' // Weak WiFi signal
      case 'offline':
        return 'i-tabler-wifi-off' // No WiFi signal
      default:
        return 'i-tabler-refresh' // Checking
    }
  }

  /**
   * Get recommendation based on connection quality
   */
  const getRecommendation = () => {
    switch (connectionQuality.value) {
      case 'good':
        return null // No recommendation needed
      case 'warning':
        return 'Koneksi internet Anda lambat. Progress akan tetap tersimpan, namun mungkin memerlukan waktu lebih lama.'
      case 'poor':
        return 'Koneksi internet Anda sangat buruk. Disarankan untuk pindah ke lokasi dengan koneksi WiFi yang lebih baik atau tunggu hingga koneksi stabil.'
      case 'offline':
        return 'Tidak ada koneksi internet. Silakan periksa koneksi Anda. Jawaban Anda masih tersimpan di browser dan akan dikirim saat koneksi kembali.'
      default:
        return null
    }
  }

  /**
   * Check if connection is good enough for test
   */
  const isConnectionGoodEnough = () => {
    return connectionQuality.value === 'good' || connectionQuality.value === 'warning'
  }

  /**
   * Check if should show warning to user
   */
  const shouldShowWarning = () => {
    return connectionQuality.value === 'poor' || connectionQuality.value === 'offline'
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopMonitoring()
  })

  return {
    // State
    isOnline,
    connectionQuality,
    pingLatency,
    lastCheckTime,
    isChecking,

    // Methods
    pingServer,
    startMonitoring,
    stopMonitoring,
    getConnectionInfo,
    getQualityLabel,
    getQualityColor,
    getQualityIcon,
    getRecommendation,
    isConnectionGoodEnough,
    shouldShowWarning
  }
}
