import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useActiveServices() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const isDev = import.meta.env.DEV
  
  const services = ref([])
  const service = ref(null)
  const memberServices = ref(null)
  const calendarEvents = ref([])
  const alerts = ref(null)
  const alertsSummary = ref(null)
  const statistics = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const statsLoading = ref(false)

  /**
   * Get all active services with filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search query (member name)
   * @param {string} params.status - Filter by status (active, expired, depleted, suspended, all)
   * @param {string} params.serviceType - Filter by service type (membership, class_package, pt_package, spa_package)
   * @param {string} params.trainerId - Filter by trainer ID
   * @param {number} params.expiringInDays - Filter services expiring within N days
   * @param {number} params.lowSessionsThreshold - Filter services with sessions below threshold
   * @param {string} params.sortBy - Field to sort by (endDate, startDate)
   * @param {string} params.sortOrder - Sort order (ASC/DESC)
   */
  const fetchActiveServices = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      // Build query string
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page)
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.search) queryParams.append('search', params.search)
      if (params.status && params.status !== 'all') queryParams.append('status', params.status)
      if (params.serviceType && params.serviceType !== 'all') queryParams.append('serviceType', params.serviceType)
      if (params.trainerId) queryParams.append('trainerId', params.trainerId)
      if (params.expiringInDays) queryParams.append('expiringInDays', params.expiringInDays)
      if (params.lowSessionsThreshold) queryParams.append('lowSessionsThreshold', params.lowSessionsThreshold)
      if (params.sortBy) queryParams.append('sortBy', params.sortBy)
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)

      const queryString = queryParams.toString()
      const url = `/service/management/list${queryString ? `?${queryString}` : ''}`
      
      if (isDev) {
        console.log('Fetching active services from:', url)
      }
      
      const response = await api.get(url)
      
      if (isDev) {
        console.log('API Response:', response)
      }
      
      // Handle response with pagination object
      if (response.data && response.pagination) {
        if (isDev) {
          console.log('Response with pagination, items:', response.data.length)
        }
        services.value = Array.isArray(response.data) ? response.data : []
        return {
          data: response.data,
          total: response.pagination.totalItems || 0,
          totalPages: response.pagination.totalPages || 1,
          currentPage: response.pagination.currentPage || params.page || 1
        }
      }
      // Handle direct array response
      else if (Array.isArray(response.data)) {
        if (isDev) {
          console.log('Direct array response, length:', response.data.length)
        }
        services.value = response.data
        return {
          data: response.data,
          total: response.data.length,
          totalPages: 1,
          currentPage: 1
        }
      }
      // Empty response
      else {
        if (isDev) {
          console.log('Empty or unexpected response structure')
        }
        services.value = []
        return { data: [], total: 0, totalPages: 1, currentPage: 1 }
      }
    } catch (err) {
      if (isDev) {
        console.error('Error in fetchActiveServices:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch active services')
      services.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get all walk-in active services (memberId IS NULL)
   * @param {Object} params - Query parameters
   * @param {string} params.status - Filter by status
   * @param {string} params.serviceType - Filter by service type
   * @param {string} params.date - Filter by date (YYYY-MM-DD)
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   */
  const fetchWalkInServices = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.status && params.status !== 'all') queryParams.append('status', params.status)
      if (params.serviceType && params.serviceType !== 'all') queryParams.append('serviceType', params.serviceType)
      if (params.date) queryParams.append('date', params.date)
      if (params.page) queryParams.append('page', params.page)
      if (params.limit) queryParams.append('limit', params.limit)

      const queryString = queryParams.toString()
      const url = `/service/active/walkin${queryString ? `?${queryString}` : ''}`

      const response = await api.get(url)

      if (response.data && response.pagination) {
        services.value = Array.isArray(response.data) ? response.data : []
        return {
          data: response.data,
          total: response.pagination.total || 0,
          totalPages: response.pagination.totalPages || 1,
          currentPage: response.pagination.page || params.page || 1
        }
      } else if (Array.isArray(response.data)) {
        services.value = response.data
        return { data: response.data, total: response.data.length, totalPages: 1, currentPage: 1 }
      } else {
        services.value = []
        return { data: [], total: 0, totalPages: 1, currentPage: 1 }
      }
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to fetch walk-in services')
      services.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get active services by member ID
   * @param {string} memberId - Member ID
   */
  const getServicesByMember = async (memberId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Fetching services for member:', memberId)
      }

      const response = await api.get(`/service/management/member/${memberId}`)
      
      if (isDev) {
        console.log('Member services:', response)
      }

      memberServices.value = response.data
      return response.data
    } catch (err) {
      if (isDev) {
        console.error('Error fetching member services:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch member services')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get services calendar for a specific month
   * @param {Object} params - Query parameters
   * @param {number} params.year - Year (YYYY)
   * @param {number} params.month - Month (1-12)
   * @param {string} params.serviceType - Filter by service type (optional)
   * @param {string} params.memberId - Filter by member ID (optional)
   */
  const getServicesCalendar = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      // Build query string
      const queryParams = new URLSearchParams()
      if (params.year) queryParams.append('year', params.year)
      if (params.month) queryParams.append('month', params.month)
      if (params.serviceType && params.serviceType !== 'all') queryParams.append('serviceType', params.serviceType)
      if (params.memberId) queryParams.append('memberId', params.memberId)

      const queryString = queryParams.toString()
      const url = `/service/management/calendar${queryString ? `?${queryString}` : ''}`
      
      if (isDev) {
        console.log('Fetching calendar from:', url)
      }

      const response = await api.get(url)
      
      if (isDev) {
        console.log('Calendar response:', response)
      }

      calendarEvents.value = response.data
      return response.data
    } catch (err) {
      if (isDev) {
        console.error('Error fetching calendar:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch services calendar')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get service alerts (expiring and low sessions)
   * @param {Object} params - Query parameters
   * @param {number} params.daysThreshold - Days until expiry threshold (default: 7)
   * @param {number} params.lowSessionsThreshold - Low sessions threshold (default: 3)
   */
  const getServiceAlerts = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      // Build query string
      const queryParams = new URLSearchParams()
      if (params.daysThreshold) queryParams.append('daysThreshold', params.daysThreshold)
      if (params.lowSessionsThreshold) queryParams.append('lowSessionsThreshold', params.lowSessionsThreshold)

      const queryString = queryParams.toString()
      const url = `/service/management/alerts${queryString ? `?${queryString}` : ''}`
      
      if (isDev) {
        console.log('Fetching alerts from:', url)
      }

      const response = await api.get(url)
      
      if (isDev) {
        console.log('Alerts response:', response)
        console.log('Alerts response.data:', response.data)
      }

      // Handle different response structures
      // API: { data: { expiring, lowSessions }, summary }
      if (response.data) {
        alerts.value = response.data
        alertsSummary.value = response.summary ?? null
        return response
      } else {
        alerts.value = response
        alertsSummary.value = null
        return response
      }
    } catch (err) {
      if (isDev) {
        console.error('Error fetching alerts:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch service alerts')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get service statistics
   */
  const getServiceStatistics = async () => {
    statsLoading.value = true
    try {
      if (isDev) {
        console.log('Fetching service statistics')
      }

      const response = await api.get('/service/management/stats')
      
      if (isDev) {
        console.log('Statistics response:', response)
      }

      // Normalize API response to a consistent shape used by components
      const data = response.data || {}

      // Helper to find count by status (API may return counts as strings)
      const findStatusCount = (status) => {
        if (!Array.isArray(data.byStatus)) return 0
        const item = data.byStatus.find(s => s.status === status)
        return item ? parseInt(item.count, 10) || 0 : 0
      }

      const normalized = {
        // Total active services
        totalActive: findStatusCount('active'),
        // Expiring soon count comes from alerts.expiring (fallback to 0)
        expiringSoon: (data.alerts && (data.alerts.expiring ?? data.alerts.expiringServices)) || 0,
        // Expired/frozen from byStatus
        expired: findStatusCount('expired'),
        frozen: findStatusCount('frozen'),
        // Keep raw arrays for flexibility
        byStatus: data.byStatus || [],
        byServiceType: data.byServiceType || [],
        alerts: data.alerts || {}
      }

      statistics.value = normalized
      return normalized
    } catch (err) {
      if (isDev) {
        console.error('Error fetching statistics:', err)
      }
      handleError(err, 'Failed to fetch service statistics')
      return null
    } finally {
      statsLoading.value = false
    }
  }

  /**
   * Assign trainer to service
   * @param {string} serviceId - Service ID
   * @param {string} trainerId - Trainer ID
   */
  const assignTrainer = async (serviceId, trainerId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Assigning trainer:', trainerId, 'to service:', serviceId)
      }

      const response = await api.post(`/service/management/${serviceId}/assign-trainer`, {
        trainerId
      })
      
      if (isDev) {
        console.log('Assign trainer response:', response)
      }

      // Show success message based on service type if available
      const successMessage = response.message || 'Trainer assigned successfully to service'
      showSuccess(successMessage)
      return response.data
    } catch (err) {
      if (isDev) {
        console.error('Error assigning trainer:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to assign trainer to service')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Helper functions
  const fetchServices = fetchActiveServices // Alias untuk konsistensi
  const fetchStats = getServiceStatistics // Alias untuk konsistensi

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRemainingDays = (service) => {
    const expiryDate = service.expiresAt || service.endDate
    if (!expiryDate) return 'N/A'
    const now = new Date()
    const expiry = new Date(expiryDate)
    const diffTime = expiry - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Expired'
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1 day'
    return `${diffDays} days`
  }

  const getStatusLabel = (status) => {
    const labels = {
      active: 'Active',
      expired: 'Expired',
      frozen: 'Frozen',
      expiring_soon: 'Expiring Soon',
      depleted: 'Depleted',
      suspended: 'Suspended',
      all: 'All Status'
    }
    return labels[status] || status
  }

  const getStatusBadgeClass = (status) => {
    const classes = {
      active: 'badge-success',
      expired: 'badge-error',
      frozen: 'badge-info',
      expiring_soon: 'badge-warning',
      depleted: 'badge-warning',
      suspended: 'badge-error'
    }
    return classes[status] || 'badge-ghost'
  }

  const getRemainingBadgeClass = (service) => {
    const expiryDate = service.expiresAt || service.endDate
    if (!expiryDate) return 'badge-ghost'
    const now = new Date()
    const expiry = new Date(expiryDate)
    const diffTime = expiry - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'badge-error'
    if (diffDays <= 7) return 'badge-warning'
    if (diffDays <= 30) return 'badge-info'
    return 'badge-success'
  }

  const getRowClass = (service) => {
    if (service.status === 'expired') return 'opacity-50'
    if (service.status === 'expiring_soon') return 'bg-warning/10'
    return ''
  }

  const canFreeze = (service) => {
    return service.status === 'active'
  }

  const canExtend = (service) => {
    return ['active', 'expiring_soon', 'expired'].includes(service.status)
  }

  const hasUsageInfo = (service) => {
    return service.remainingSessions !== undefined || service.totalSessions !== undefined
  }

  const canAssignTrainer = (service) => {
    // Can assign trainer if service type supports trainer assignment
    // (allow re-assignment / change trainer even if already assigned)
    if (service.serviceType === 'pt_package') {
      return true
    }
    
    if (service.serviceType === 'class_package') {
      // The list endpoint returns a simplified servicePlan without accessControl.
      // When accessControl is absent, default to allowing trainer assignment.
      const accessControl = service.servicePlan?.accessControl
      if (!accessControl) return true
      return accessControl.requiresTrainerAssignment === true
    }

    if (service.serviceType === 'spa_package') {
      // The list endpoint returns a simplified servicePlan without accessControl.
      // When accessControl is absent, default to allowing trainer assignment.
      const accessControl = service.servicePlan?.accessControl
      if (!accessControl) return true
      return accessControl.requiresTrainerAssignment === true
    }
    
    return false
  }

  const freezeService = async (serviceId) => {
    loading.value = true
    try {
      const response = await api.post(`/service/management/${serviceId}/freeze`)
      showSuccess(response.message || 'Service frozen successfully')
      return response.data
    } catch (err) {
      handleError(err, 'Failed to freeze service')
      throw err
    } finally {
      loading.value = false
    }
  }

  const extendService = async (serviceId, extensionData) => {
    loading.value = true
    try {
      const response = await api.post(`/service/management/${serviceId}/extend`, extensionData)
      showSuccess(response.message || 'Service extended successfully')
      return response.data
    } catch (err) {
      handleError(err, 'Failed to extend service')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    services,
    service,
    memberServices,
    calendarEvents,
    alerts,
    alertsSummary,
    statistics,
    loading,
    error,
    statsLoading,

    // Methods
    fetchActiveServices,
    fetchServices,
    fetchWalkInServices,
    fetchStats,
    getServicesByMember,
    getServicesCalendar,
    getServiceAlerts,
    getServiceStatistics,
    assignTrainer,
    freezeService,
    extendService,

    // Helper functions
    formatCurrency,
    formatDate,
    getInitials,
    getRemainingDays,
    getStatusLabel,
    getStatusBadgeClass,
    getRemainingBadgeClass,
    getRowClass,
    canFreeze,
    canExtend,
    hasUsageInfo,
    canAssignTrainer
  }
}
