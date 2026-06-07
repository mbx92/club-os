import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'
import dayjs from 'dayjs'

export const useTrainerCommissions = () => {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  
  const commissions = ref([])
  const reportData = ref({
    summary: null,
    byTrainer: [],
    timeSeries: null,
    recentCommissions: []
  })
  const loading = ref(false)
  const error = ref(null)

  /**
   * Get commission report for all trainers
   * @param {Object} filters - Query parameters { startDate, endDate, status, trainerId, groupBy, sortBy, sortOrder }
   */
  const getCommissionReport = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      
      // Add filters to query params
      if (filters.startDate) {
        queryParams.append('startDate', dayjs(filters.startDate).format('YYYY-MM-DD'))
      }
      if (filters.endDate) {
        queryParams.append('endDate', dayjs(filters.endDate).format('YYYY-MM-DD'))
      }
      if (filters.status && filters.status !== 'all') {
        queryParams.append('status', filters.status)
      }
      if (filters.trainerId) {
        queryParams.append('trainerId', filters.trainerId)
      }
      if (filters.groupBy) {
        queryParams.append('groupBy', filters.groupBy)
      }
      if (filters.sortBy) {
        queryParams.append('sortBy', filters.sortBy)
      }
      if (filters.sortOrder) {
        queryParams.append('sortOrder', filters.sortOrder)
      }

      const response = await api.get(`/reports/commissions/summary?${queryParams.toString()}`)
      
      // Handle various response structures
      // Case 1: response.data contains the report fields directly
      // Case 2: response itself contains the report fields
      // Case 3: response.data is wrapped in another data key
      let data = null
      
      if (response?.data?.summary !== undefined || response?.data?.byTrainer !== undefined || response?.data?.recentCommissions !== undefined) {
        data = response.data
      } else if (response?.summary !== undefined || response?.byTrainer !== undefined || response?.recentCommissions !== undefined) {
        data = response
      } else if (response?.data?.data) {
        data = response.data.data
      }
      
      if (data) {
        reportData.value = {
          summary: data.summary || null,
          byTrainer: Array.isArray(data.byTrainer) ? data.byTrainer : [],
          timeSeries: data.timeSeries || null,
          recentCommissions: Array.isArray(data.recentCommissions) ? data.recentCommissions : []
        }
        return reportData.value
      }
      
      console.warn('[CommissionReport] Could not parse response structure')
      return null
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch commission report')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get commissions for specific trainer with pagination
   * @param {String} trainerId - The trainer ID
   * @param {Object} params - Query parameters { page, limit, status, startDate, endDate, sortBy, sortOrder }
   */
  const getTrainerCommissions = async (trainerId, params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      
      // Set pagination
      queryParams.append('page', params.page || 1)
      queryParams.append('limit', params.limit || 10)
      
      // Add filters
      if (params.status && params.status !== 'all') {
        queryParams.append('status', params.status)
      }
      if (params.startDate) {
        queryParams.append('startDate', dayjs(params.startDate).format('YYYY-MM-DD'))
      }
      if (params.endDate) {
        queryParams.append('endDate', dayjs(params.endDate).format('YYYY-MM-DD'))
      }
      if (params.sortBy) {
        queryParams.append('sortBy', params.sortBy)
      }
      if (params.sortOrder) {
        queryParams.append('sortOrder', params.sortOrder)
      }

      const response = await api.get(`/gym/trainers/${trainerId}/commissions?${queryParams.toString()}`)
      
      if (response.success) {
        commissions.value = response.data.commissions || []
        return response
      }
      
      return null
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch trainer commissions')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Mark commission as paid
   * @param {String} trainerId - The trainer ID
   * @param {String} commissionId - The commission ID
   * @param {Object} paymentData - Payment details { paymentMethod, paymentNote }
   */
  const payCommission = async (trainerId, commissionId, paymentData = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(
        `/gym/trainers/${trainerId}/commissions/${commissionId}/pay`,
        paymentData
      )
      
      if (response.success) {
        showSuccess('Commission marked as paid successfully')
        return response.data
      }
      
      return null
    } catch (err) {
      error.value = handleError(err, 'Failed to mark commission as paid')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Format currency to Indonesian Rupiah
   * @param {Number} amount - The amount to format
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  /**
   * Format date to readable format
   * @param {String} date - The date string
   * @param {String} format - Date format (default: 'DD MMM YYYY')
   */
  const formatDate = (date, format = 'DD MMM YYYY') => {
    return dayjs(date).format(format)
  }

  /**
   * Format date time to readable format
   * @param {String} date - The date string
   */
  const formatDateTime = (date) => {
    return dayjs(date).format('DD MMM YYYY HH:mm')
  }

  /**
   * Get status badge color
   * @param {String} status - Commission status
   */
  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      paid: 'success',
      cancelled: 'error'
    }
    return colors[status] || 'default'
  }

  /**
   * Get status label
   * @param {String} status - Commission status
   */
  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      paid: 'Paid',
      cancelled: 'Cancelled'
    }
    return labels[status] || status
  }

  /**
   * Get commission type label
   * @param {String} type - Commission type
   */
  const getCommissionTypeLabel = (type) => {
    const labels = {
      percentage: 'Percentage',
      fixed: 'Fixed Amount'
    }
    return labels[type] || type
  }

  return {
    // State
    commissions,
    reportData,
    loading,
    error,
    
    // Methods
    getCommissionReport,
    getTrainerCommissions,
    payCommission,
    
    // Utilities
    formatCurrency,
    formatDate,
    formatDateTime,
    getStatusColor,
    getStatusLabel,
    getCommissionTypeLabel
  }
}
