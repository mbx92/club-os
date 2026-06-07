import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useGymReports() {
  const api = useApi()
  const { handleError } = useNotification()
  const isDev = import.meta.env.DEV

  const unwrapResponse = (response) => response?.data ?? response

  // State
  const dashboardOverview = ref(null)
  const dashboardStats = ref(null)
  const revenueReport = ref(null)
  const profitLossReport = ref(null)
  const attendanceReport = ref(null)
  const serviceStatusReport = ref(null)
  const membershipStats = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const buildQuery = (params) => {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q.append(k, v) })
    return q.toString()
  }

  /**
   * GET /reports/gym/overview — real-time gym statistics
   * Returns: { members, checkIns, activeServices }
   */
  const getDashboardOverview = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/reports/gym/overview?${buildQuery(params)}`)
      if (isDev) console.log('🏋️ Gym Overview Response:', response)
      const payload = unwrapResponse(response)
      dashboardOverview.value = payload
      return payload
    } catch (err) {
      if (isDev) console.error('Get gym overview error:', err)
      error.value = err.message
      handleError(err, 'Failed to get gym overview')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * GET /reports/gym/checkin-trends — check-in trends with 3-period forecast
   * Params: startDate, endDate, groupBy (daily|weekly|monthly)
   * Returns: { trends: [{period, count, uniqueMembers}], forecast: [{period, value, type}] }
   */
  const getAttendanceReport = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/reports/gym/checkin-trends?${buildQuery(params)}`)
      if (isDev) console.log('📅 Check-in Trends Response:', response)
      const payload = unwrapResponse(response)
      attendanceReport.value = payload
      return payload
    } catch (err) {
      if (isDev) console.error('Get checkin trends error:', err)
      error.value = err.message
      handleError(err, 'Failed to get check-in trends')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * GET /reports/gym/membership-stats — active service plan distribution
   * Returns: { byPlan, statusDistribution, newSubscriptionsThisMonth }
   */
  const getMembershipStats = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get('/reports/gym/membership-stats')
      if (isDev) console.log('📊 Membership Stats Response:', response)
      const payload = unwrapResponse(response)
      membershipStats.value = payload
      return payload
    } catch (err) {
      if (isDev) console.error('Get membership stats error:', err)
      error.value = err.message
      handleError(err, 'Failed to get membership stats')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * GET /reports/finance/revenue — comprehensive revenue report
   * Params: startDate, endDate, groupBy (daily|weekly|monthly|yearly)
   * Returns: { summary, revenueByPeriod, revenueByType, forecast }
   */
  const getRevenueReport = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/reports/finance/revenue?${buildQuery(params)}`)
      if (isDev) console.log('💰 Revenue Report Response:', response)
      const payload = unwrapResponse(response)
      revenueReport.value = payload
      return payload
    } catch (err) {
      if (isDev) console.error('Get revenue report error:', err)
      error.value = err.message
      handleError(err, 'Failed to get revenue report')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * GET /reports/finance/profit-loss — P&L report
   * Params: startDate, endDate, groupBy
   * Returns: { byPeriod: [{period, totalRevenue, totalExpenses, netProfit, profitMargin}], summary }
   */
  const getProfitLossReport = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/reports/finance/profit-loss?${buildQuery(params)}`)
      if (isDev) console.log('📊 Profit & Loss Response:', response)
      const payload = unwrapResponse(response)
      profitLossReport.value = payload
      return payload
    } catch (err) {
      if (isDev) console.error('Get profit & loss error:', err)
      error.value = err.message
      handleError(err, 'Failed to get profit & loss report')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * GET /reports/services/active — active services summary & expiring soon
   * Returns: { statusDistribution, byServiceType, expiringSoon: {within7Days, within30DaysCount}, autoRenewEnabled }
   */
  const getServiceStatusReport = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/reports/services/active?${buildQuery(params)}`)
      if (isDev) console.log('🎫 Service Active Response:', response)
      const payload = unwrapResponse(response)
      serviceStatusReport.value = payload
      return payload
    } catch (err) {
      if (isDev) console.error('Get service active error:', err)
      error.value = err.message
      handleError(err, 'Failed to get service status report')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Kept for backward compat — delegates to getDashboardOverview
  const getDashboardStats = async () => getDashboardOverview()

  /**
   * Format currency
   */
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value || 0)
  }

  /**
   * Export data to CSV
   * @param {Array} data - Data to export
   * @param {string} filename - Filename without extension
   */
  const exportToCSV = (data, filename) => {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No data to export')
      }

      const csv = convertToCSV(data)
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      if (isDev) console.error('Export CSV error:', err)
      handleError(err, 'Failed to export CSV')
    }
  }

  /**
   * Convert array of objects to CSV string
   */
  const convertToCSV = (data) => {
    const headers = Object.keys(data[0])
    const csvRows = []
    
    // Add headers
    csvRows.push(headers.join(','))
    
    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header]
        const escaped = ('' + value).replace(/"/g, '""')
        return `"${escaped}"`
      })
      csvRows.push(values.join(','))
    }
    
    return csvRows.join('\n')
  }

  return {
    // State
    dashboardOverview,
    dashboardStats,
    revenueReport,
    profitLossReport,
    attendanceReport,
    serviceStatusReport,
    membershipStats,
    loading,
    error,
    
    // Methods
    getDashboardOverview,
    getDashboardStats,
    getRevenueReport,
    getProfitLossReport,
    getAttendanceReport,
    getServiceStatusReport,
    getMembershipStats,
    formatCurrency,
    exportToCSV
  }
}
