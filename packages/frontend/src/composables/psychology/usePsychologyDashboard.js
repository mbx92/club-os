import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export const usePsychologyDashboard = () => {
  const api = useApi()
  const { handleError } = useNotification()

  const overview = ref(null)
  const popularPackages = ref([])
  const recentOrders = ref([])
  const testCompletionStats = ref(null)
  const loading = ref(false)
  const error = ref(null)

  /**
   * Fetch dashboard overview statistics
   * @param {Object} params - { startDate, endDate }
   */
  const fetchOverview = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)
      
      const queryString = queryParams.toString()
      const response = await api.get(`/psychology/dashboard/overview${queryString ? '?' + queryString : ''}`)
      overview.value = response.data || response
      return overview.value
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch dashboard overview')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch popular packages
   * @param {Object} params - { limit, startDate, endDate }
   */
  const fetchPopularPackages = async (params = {}) => {
    try {
      const queryParams = new URLSearchParams()
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)
      
      const queryString = queryParams.toString()
      const response = await api.get(`/psychology/dashboard/popular-packages${queryString ? '?' + queryString : ''}`)
      popularPackages.value = response.data || response || []
      return popularPackages.value
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch popular packages')
      throw err
    }
  }

  /**
   * Fetch recent orders
   * @param {Object} params - { limit }
   */
  const fetchRecentOrders = async (params = {}) => {
    try {
      const queryParams = new URLSearchParams()
      if (params.limit) queryParams.append('limit', params.limit)
      
      const queryString = queryParams.toString()
      const response = await api.get(`/psychology/dashboard/recent-orders${queryString ? '?' + queryString : ''}`)
      recentOrders.value = response.data || response || []
      return recentOrders.value
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch recent orders')
      throw err
    }
  }

  /**
   * Fetch test completion stats
   * @param {Object} params - { startDate, endDate }
   */
  const fetchTestCompletionStats = async (params = {}) => {
    try {
      const queryParams = new URLSearchParams()
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)
      
      const queryString = queryParams.toString()
      const response = await api.get(`/psychology/dashboard/test-completion-stats${queryString ? '?' + queryString : ''}`)
      testCompletionStats.value = response.data || response
      return testCompletionStats.value
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch test completion stats')
      throw err
    }
  }

  /**
   * Fetch all dashboard data
   * @param {Object} params - { startDate, endDate }
   */
  const fetchDashboardData = async (params = {}) => {
    loading.value = true
    try {
      await Promise.all([
        fetchOverview(params),
        fetchPopularPackages({ limit: 5, ...params }),
        fetchRecentOrders({ limit: 10 }),
        fetchTestCompletionStats(params)
      ])
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Format number with locale
   * @param {Number} num - Number to format
   */
  const formatNumber = (num) => {
    if (!num && num !== 0) return '0'
    return new Intl.NumberFormat('id-ID').format(num)
  }

  /**
   * Format currency
   * @param {Number} amount - Amount to format
   */
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'Rp 0'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  /**
   * Format date
   * @param {String} date - Date string
   */
  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  /**
   * Get order status class
   * @param {String} status - Order status
   */
  const getOrderStatusClass = (status) => {
    const classes = {
      pending: 'badge-warning',
      paid: 'badge-info',
      in_progress: 'badge-primary',
      completed: 'badge-success',
      cancelled: 'badge-error',
      expired: 'badge-ghost'
    }
    return classes[status] || 'badge-ghost'
  }

  /**
   * Get order status label
   * @param {String} status - Order status
   */
  const getOrderStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      paid: 'Dibayar',
      in_progress: 'Berlangsung',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
      expired: 'Kadaluarsa'
    }
    return labels[status] || status
  }

  return {
    overview,
    popularPackages,
    recentOrders,
    testCompletionStats,
    loading,
    error,
    fetchOverview,
    fetchPopularPackages,
    fetchRecentOrders,
    fetchTestCompletionStats,
    fetchDashboardData,
    formatNumber,
    formatCurrency,
    formatDate,
    getOrderStatusClass,
    getOrderStatusLabel
  }
}
