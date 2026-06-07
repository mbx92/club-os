import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useGymDashboard() {
  const api = useApi()
  const { handleError, showSuccess } = useNotification()
  const isDev = import.meta.env.DEV

  const unwrapResponse = (response) => response?.data ?? response

  // State
  const comprehensiveDashboard = ref(null)
  const pettyCashDailyReport = ref(null)
  const loading = ref(false)
  const error = ref(null)

  /**
   * Get comprehensive gym dashboard
   * @param {Object} params - Query parameters
   * @param {string} params.locationId - Filter by location
   */
  const getComprehensiveDashboard = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      
      if (params.locationId) queryParams.append('locationId', params.locationId)

      const queryString = queryParams.toString()
      const endpoint = queryString 
        ? `/gym/dashboard/comprehensive?${queryString}`
        : '/gym/dashboard/comprehensive'

      const response = await api.get(endpoint)
      const payload = unwrapResponse(response)
      comprehensiveDashboard.value = payload
      return payload
    } catch (err) {
      if (isDev) console.error('Get comprehensive dashboard error:', err)
      error.value = err.message
      handleError(err, 'Failed to get dashboard data')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Format currency to IDR
   * @param {number} value - Value to format
   */
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0)
  }

  /**
   * Format percentage
   * @param {number} value - Value to format
   * @param {number} decimals - Decimal places
   */
  const formatPercent = (value, decimals = 1) => {
    return `${(value || 0).toFixed(decimals)}%`
  }

  /**
   * Calculate growth rate
   * @param {number} current - Current value
   * @param {number} previous - Previous value
   */
  const calculateGrowth = (current, previous) => {
    if (!previous || previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  /**
   * Get petty-cash daily report
   * @param {Object} params - { date, type, locationId }
   */
  const getPettyCashDailyReport = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.date) queryParams.append('date', params.date)
      if (params.type && params.type !== 'all') queryParams.append('type', params.type)
      if (params.locationId) queryParams.append('locationId', params.locationId)
      const qs = queryParams.toString()
      const url = qs
        ? `/gym/dashboard/petty-cash/daily-report?${qs}`
        : '/gym/dashboard/petty-cash/daily-report'
      const response = await api.get(url)
      const payload = unwrapResponse(response)
      pettyCashDailyReport.value = payload
      if (isDev) console.log('[useGymDashboard] Petty cash daily report:', payload)
      return payload
    } catch (err) {
      if (isDev) console.error('Get petty cash daily report error:', err)
      error.value = err.message
      handleError(err, 'Gagal memuat laporan harian')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Print petty-cash daily report to thermal printer
   * @param {Object} params - { date, type, locationId }
   */
  const printPettyCashDailyReport = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/gym/dashboard/petty-cash/print-daily-report', {
        date: params.date,
        type: params.type || 'all',
        ...(params.locationId ? { locationId: params.locationId } : {})
      })
      showSuccess(response.message || 'Laporan harian berhasil dicetak')
      return unwrapResponse(response)
    } catch (err) {
      if (isDev) console.error('Print petty cash daily report error:', err)
      error.value = err.message
      handleError(err, 'Gagal mencetak laporan harian')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    comprehensiveDashboard,
    pettyCashDailyReport,
    loading,
    error,

    // Methods
    getComprehensiveDashboard,
    getPettyCashDailyReport,
    printPettyCashDailyReport,
    formatCurrency,
    formatPercent,
    calculateGrowth
  }
}
