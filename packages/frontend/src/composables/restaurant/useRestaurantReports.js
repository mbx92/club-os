import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useRestaurantReports() {
  const api = useApi()
  const { handleError } = useNotification()
  const isDev = import.meta.env.DEV

  const unwrapResponse = (response) => response?.data ?? response

  // State
  const salesReport = ref(null)
  const productReport = ref(null)
  const tableReport = ref(null)
  const dailySummary = ref(null)
  const stockReport = ref(null)
  const hourlySales = ref(null)
  const comprehensiveDashboard = ref(null)
  const loading = ref(false)
  const error = ref(null)

  /**
   * Get sales report with flexible grouping
   * @param {Object} params - Query parameters
   * @param {string} params.startDate - Start date (YYYY-MM-DD)
   * @param {string} params.endDate - End date (YYYY-MM-DD)
   * @param {string} params.groupBy - Grouping type: 'day', 'week', 'month', 'hour'
   * @param {string} params.locationId - Filter by location
   * @param {string} params.orderType - Filter by order type
   */
  const getSalesReport = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)
      if (params.groupBy) queryParams.append('groupBy', params.groupBy)
      if (params.locationId) queryParams.append('locationId', params.locationId)
      if (params.orderType) queryParams.append('orderType', params.orderType)
      if (params.paymentMethod) queryParams.append('paymentMethod', params.paymentMethod)

      const response = await api.get(`/reports/restaurant/sales?${queryParams.toString()}`)
      const payload = unwrapResponse(response)
      salesReport.value = payload
      return payload
    } catch (err) {
      if (isDev) console.error('Get sales report error:', err)
      error.value = err.message
      handleError(err, 'Failed to get sales report')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get product performance report
   * @param {Object} params - Query parameters
   * @param {string} params.startDate - Start date (YYYY-MM-DD)
   * @param {string} params.endDate - End date (YYYY-MM-DD)
   * @param {number} params.limit - Limit results
   * @param {string} params.sortBy - Sort by: 'quantity', 'revenue'
   * @param {string} params.categoryId - Filter by category
   */
  const getProductReport = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.sortBy) queryParams.append('sortBy', params.sortBy)
      if (params.categoryId) queryParams.append('categoryId', params.categoryId)
      if (params.order) queryParams.append('order', params.order)

      const response = await api.get(`/reports/restaurant/top-items?${queryParams.toString()}`)
      const payload = unwrapResponse(response)
      productReport.value = payload
      return payload
    } catch (err) {
      if (isDev) console.error('Get product report error:', err)
      error.value = err.message
      handleError(err, 'Failed to get product report')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get table performance report
   * @param {Object} params - Query parameters
   * @param {string} params.startDate - Start date (YYYY-MM-DD)
   * @param {string} params.endDate - End date (YYYY-MM-DD)
   * @param {string} params.locationId - Filter by location
   */
  const getTableReport = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)
      if (params.locationId) queryParams.append('locationId', params.locationId)

      const response = await api.get(`/reports/restaurant/table-utilization?${queryParams.toString()}`)
      const payload = unwrapResponse(response)
      tableReport.value = payload
      return payload
    } catch (err) {
      if (isDev) console.error('Get table report error:', err)
      error.value = err.message
      handleError(err, 'Failed to get table report')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get daily summary
   * @param {string} date - Date (YYYY-MM-DD)
   * @param {string} locationId - Optional location filter
   */
  const getDailySummary = async (date, locationId = null) => {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams({ date })
      if (locationId) params.append('locationId', locationId)

      const response = await api.get(`/restaurant/reports/daily-summary?${params.toString()}`)
      const payload = unwrapResponse(response)
      dailySummary.value = payload
      return payload
    } catch (err) {
      if (isDev) console.error('Get daily summary error:', err)
      error.value = err.message
      handleError(err, 'Failed to get daily summary')
      throw err
    } finally {
      loading.value = false
    }
  }

  // `getHourlySales` removed: derive hourly distribution from daily summary instead

  /**
   * Get payment method breakdown (derived from sales report)
   * If there is no dedicated endpoint, use the sales report response's paymentBreakdown
   * @param {Object} params - Query parameters
   */
  const getPaymentMethodBreakdown = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)
      if (params.locationId) queryParams.append('locationId', params.locationId)

      // Use sales endpoint which contains paymentBreakdown inside its data
      const response = await api.get(`/reports/restaurant/sales?${queryParams.toString()}`)
      const payload = unwrapResponse(response)
      // server JSON shape: { success, data: { paymentBreakdown: [...] }, filters }
      return payload?.data?.paymentBreakdown || []
    } catch (err) {
      if (isDev) console.error('Get payment method breakdown (derived) error:', err)
      error.value = err.message
      handleError(err, 'Failed to get payment method breakdown')
      throw err
    } finally {
      loading.value = false
    }
  }


  // `getCategoryBreakdown` removed: endpoint not available on backend

  /**
   * Get order type breakdown
   * @param {Object} params - Query parameters
   */
  const getOrderTypeBreakdown = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)
      if (params.locationId) queryParams.append('locationId', params.locationId)

      const response = await api.get(`/restaurant/reports/order-types?${queryParams.toString()}`)
      return unwrapResponse(response)
    } catch (err) {
      if (isDev) console.error('Get order type breakdown error:', err)
      error.value = err.message
      handleError(err, 'Failed to get order type breakdown')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get comprehensive dashboard overview
   */
  const getComprehensiveDashboard = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get('/restaurant/dashboard/comprehensive')
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
   * Export data to Excel (XLSX)
   * @param {Array} data - Data to export
   * @param {string} filename - Filename without extension
   * @param {Array} columns - Column definitions [{key, label}]
   */
  const exportToExcel = async (data, filename, columns = null) => {
    try {
      // Dynamic import for xlsx library
      const XLSX = await import('xlsx')
      
      let exportData = data
      if (columns) {
        exportData = data.map(row => {
          const newRow = {}
          columns.forEach(col => {
            newRow[col.label || col.key] = row[col.key]
          })
          return newRow
        })
      }

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Report')
      
      XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (err) {
      if (isDev) console.error('Export Excel error:', err)
      // Fallback to CSV if XLSX not available
      exportToCSV(data, filename)
    }
  }

  /**
   * Convert array to CSV string
   * @param {Array} data - Array of objects
   * @returns {string} CSV string
   */
  const convertToCSV = (data) => {
    if (!Array.isArray(data) || data.length === 0) return ''
    
    const headers = Object.keys(data[0])
    const rows = data.map(row => 
      headers.map(header => {
        let value = row[header]
        if (value === null || value === undefined) value = ''
        if (typeof value === 'string') {
          // Escape quotes and wrap in quotes if contains comma or newline
          value = value.replace(/"/g, '""')
          if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            value = `"${value}"`
          }
        }
        return value
      }).join(',')
    )
    
    return [headers.join(','), ...rows].join('\n')
  }

  /**
   * Format currency
   * @param {number} value - Value to format
   * @param {string} currency - Currency code
   */
  const formatCurrency = (value, currency = 'IDR') => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency,
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

  return {
    // State
    salesReport,
    productReport,
    tableReport,
    dailySummary,
    stockReport,
    hourlySales,
    comprehensiveDashboard,
    loading,
    error,

    // Methods
    getSalesReport,
    getProductReport,
    getTableReport,
    getDailySummary,
    getPaymentMethodBreakdown,
    getOrderTypeBreakdown,
    getComprehensiveDashboard,
    exportToCSV,
    exportToExcel,
    formatCurrency,
    formatPercent,
    calculateGrowth
  }
}
