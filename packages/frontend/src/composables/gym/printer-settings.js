import { ref } from 'vue'
import { api } from '@/plugins/api'

const printers = ref([])
const statistics = ref(null)
const loading = ref(false)

export const usePrinterSettings = () => {
  /**
   * Get all printers with filters
   */
  const getPrinters = async (filters = {}) => {
    loading.value = true
    try {
      const params = new URLSearchParams()
      if (filters.printerType) params.append('printerType', filters.printerType)
      if (filters.printerCategory) params.append('printerCategory', filters.printerCategory)
      if (filters.connectionType) params.append('connectionType', filters.connectionType)
      if (filters.isActive) params.append('isActive', filters.isActive)
      if (filters.search) params.append('search', filters.search)

      const response = await api.get(`/system/printers?${params.toString()}`)
      
      console.log('[Printer Settings] Get printers response:', response)
      
      if (response.success) {
        printers.value = response.data || []
        console.log('[Printer Settings] Printers loaded:', printers.value)
        console.log('[Printer Settings] First printer ID:', printers.value[0]?.id)
        return printers.value
      }
      
      throw new Error(response.message || 'Failed to fetch printers')
    } catch (error) {
      console.error('Get printers error:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Get single printer by ID
   */
  const getPrinter = async (id) => {
    try {
      const response = await api.get(`/system/printers/${id}`)
      
      if (response.success) {
        return response.data
      }
      
      throw new Error(response.message || 'Failed to fetch printer')
    } catch (error) {
      console.error('Get printer error:', error)
      throw error
    }
  }

  /**
   * Create new printer
   */
  const createPrinter = async (printerData) => {
    try {
      const response = await api.post('/system/printers', printerData)
      
      if (response.success) {
        return response.data
      }
      
      throw new Error(response.message || 'Failed to create printer')
    } catch (error) {
      console.error('Create printer error:', error)
      throw error
    }
  }

  /**
   * Update printer
   */
  const updatePrinter = async (id, printerData) => {
    console.log('[Printer Settings] Update printer called with:', { id, printerData })
    try {
      const response = await api.put(`/system/printers/${id}`, printerData)
      
      console.log('[Printer Settings] Update printer response:', response)
      
      if (response.success) {
        return response.data
      }
      
      throw new Error(response.message || 'Failed to update printer')
    } catch (error) {
      console.error('Update printer error:', error)
      throw error
    }
  }

  /**
   * Delete printer
   */
  const deletePrinter = async (id) => {
    try {
      const response = await api.delete(`/system/printers/${id}`)
      
      if (response.success) {
        return true
      }
      
      throw new Error(response.message || 'Failed to delete printer')
    } catch (error) {
      console.error('Delete printer error:', error)
      throw error
    }
  }

  /**
   * Test printer connection
   */
  const testPrinterConnection = async (id) => {
    try {
      const response = await api.post(`/system/printers/${id}/test`)
      console.log('[Printer Settings] Test connection response:', response)
      
      if (response.success) {
        // Backend returns updated printer object with healthStatus
        return response.data
      }
      
      throw new Error(response.message || 'Failed to test printer')
    } catch (error) {
      console.error('Test printer error:', error)
      throw error
    }
  }

  /**
   * Get printer statistics
   */
  const getStatistics = async (printerType = '') => {
    try {
      const params = printerType ? `?printerType=${printerType}` : ''
      const response = await api.get(`/system/printers/statistics${params}`)
      
      if (response.success) {
        statistics.value = response.data
        return statistics.value
      }
      
      throw new Error(response.message || 'Failed to fetch statistics')
    } catch (error) {
      console.error('Get statistics error:', error)
      throw error
    }
  }

  /**
   * Scan network for printers
   */
  const scanNetwork = async (options = {}) => {
    try {
      const params = new URLSearchParams()
      if (options.ipRange) params.append('ipRange', options.ipRange)
      if (options.strictMode !== undefined) params.append('strictMode', options.strictMode)

      const response = await api.get(`/system/printers/scan?${params.toString()}`)
      
      if (response.success) {
        return response.data || []
      }
      
      throw new Error(response.message || 'Failed to scan network')
    } catch (error) {
      console.error('Scan network error:', error)
      throw error
    }
  }

  /**
   * Quick scan for printers
   */
  const quickScan = async () => {
    try {
      const response = await api.get('/system/printers/scan/quick')
      
      if (response.success) {
        return response.data || []
      }
      
      throw new Error(response.message || 'Failed to quick scan')
    } catch (error) {
      console.error('Quick scan error:', error)
      throw error
    }
  }

  /**
   * Stream printer connection status (SSE)
   * @param {String} id - Printer ID
   * @returns {EventSource} - EventSource instance
   */
  const streamConnection = (id) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) {
      throw new Error('No authentication token found')
    }

    // Note: EventSource doesn't support custom headers
    // Backend should accept token as query param for SSE endpoints
    const url = `/api/v1/system/printers/${id}/stream/connection?token=${token}`
    return new EventSource(url)
  }

  /**
   * Check printer connection once (non-streaming, returns immediately)
   * Use this for form validations and one-time checks to avoid hanging connections
   * @param {String} id - Printer ID
   * @returns {Promise<Object>} - Connection status { online, latency, timestamp }
   */
  const checkConnectionOnce = async (id) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const apiBase = import.meta.env.VITE_API_URL || '/api/v1'
      const url = `${apiBase}/system/printers/${id}/stream/connection?once=true`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('[Printer Settings] Connection check result:', data)
      return data
    } catch (error) {
      console.error('[Printer Settings] Connection check error:', error)
      throw error
    }
  }

  /**
   * Check printer health once (non-streaming, returns immediately)
   * Use this for form validations and one-time checks to avoid hanging connections
   * @param {String} id - Printer ID
   * @returns {Promise<Object>} - Health status
   */
  const checkHealthOnce = async (id) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const apiBase = import.meta.env.VITE_API_URL || '/api/v1'
      const url = `${apiBase}/system/printers/${id}/stream/health?once=true`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('[Printer Settings] Health check result:', data)
      return data
    } catch (error) {
      console.error('[Printer Settings] Health check error:', error)
      throw error
    }
  }

  /**
   * Get printer jobs with optional filters
   * @param {String} id - Printer ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Jobs list with metadata
   */
  const getPrinterJobs = async (id, options = {}) => {
    try {
      const params = new URLSearchParams()
      if (options.status) params.append('status', options.status)
      if (options.limit) params.append('limit', options.limit)
      if (options.offset) params.append('offset', options.offset)
      if (options.includeStuck) params.append('includeStuck', options.includeStuck)

      const response = await api.get(`/system/printers/${id}/jobs?${params.toString()}`)
      
      if (response.success) {
        return response.data
      }
      
      throw new Error(response.message || 'Failed to fetch printer jobs')
    } catch (error) {
      console.error('Get printer jobs error:', error)
      throw error
    }
  }

  /**
   * Open cash drawer via system printer endpoint
   * POST /system/printers/cash-drawer/open
   */
  const openCashDrawer = async () => {
    try {
      const response = await api.post('/system/printers/cash-drawer/open')
      if (response.success) return response.data
      throw new Error(response.message || 'Failed to open cash drawer')
    } catch (error) {
      console.error('Open cash drawer error:', error)
      throw error
    }
  }

  return {
    printers,
    statistics,
    loading,
    getPrinters,
    getPrinter,
    createPrinter,
    updatePrinter,
    deletePrinter,
    testPrinterConnection,
    getStatistics,
    scanNetwork,
    quickScan,
    streamConnection,
    checkConnectionOnce,
    checkHealthOnce,
    getPrinterJobs,
    openCashDrawer
  }
}
