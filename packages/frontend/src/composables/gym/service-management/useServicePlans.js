import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'
import { useCurrency } from '@/composables/core/useCurrency'

export function useServicePlans() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const { formatCurrency: formatCurrencyUtil } = useCurrency()
  const isDev = import.meta.env.DEV
  
  const plans = ref([])
  const loading = ref(false)
  const error = ref(null)
  const stats = ref(null)
  const statsLoading = ref(false)

  /**
   * Get all service plans with filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search query
   * @param {string} params.serviceType - Filter by service type (membership, class_package, pt_package, spa_package, custom, all)
   * @param {string} params.isActive - Filter by active status (true, false, all)
   * @param {string} params.sortBy - Field to sort by (name, price, displayOrder, createdAt, serviceType)
   * @param {string} params.sortOrder - Sort order (ASC/DESC)
   */
  const fetchPlans = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      // Build query string
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page)
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.search) queryParams.append('search', params.search)
      if (params.serviceType && params.serviceType !== 'all') queryParams.append('serviceType', params.serviceType)
      if (params.isActive && params.isActive !== 'all') queryParams.append('isActive', params.isActive)
      if (params.sortBy) queryParams.append('sortBy', params.sortBy)
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)

      const queryString = queryParams.toString()
      const url = `/service/plans${queryString ? `?${queryString}` : ''}`
      
      if (isDev) {
        console.log('Fetching service plans from:', url)
      }
      
      const response = await api.get(url)
      
      if (isDev) {
        console.log('API Response:', response)
      }
      
      // Handle response with pagination object
      if (response.data && response.pagination) {
        if (isDev) {
          console.log('Response with pagination object, length:', response.data.length)
        }
        plans.value = Array.isArray(response.data) ? response.data : []
        return {
          data: response.data,
          total: response.pagination.totalRecords || 0,
          totalPages: response.pagination.totalPages || 1,
          currentPage: response.pagination.currentPage || params.page || 1,
          filters: response.filters || {}
        }
      }
      // Handle array response
      else if (Array.isArray(response.data)) {
        if (isDev) {
          console.log('Direct array response, length:', response.data.length)
        }
        plans.value = response.data
        return {
          data: response.data,
          total: response.data.length,
          totalPages: 1,
          currentPage: 1,
          filters: {}
        }
      }
      // Empty response
      else {
        if (isDev) {
          console.log('Empty or unexpected response structure')
        }
        plans.value = []
        return { data: [], total: 0, totalPages: 1, currentPage: 1, filters: {} }
      }
    } catch (err) {
      if (isDev) {
        console.error('Error in fetchPlans:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch service plans')
      plans.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get service plan by ID
   * @param {string} planId - Service plan ID
   */
  const fetchPlanById = async (planId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/service/plans/${planId}`)
      return response.data
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to fetch service plan')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get service type statistics
   */
  const fetchStats = async () => {
    statsLoading.value = true
    try {
      const response = await api.get('/service/plans/stats')
      stats.value = response.data || []
      return response.data
    } catch (err) {
      if (isDev) {
        console.error('Error fetching stats:', err)
      }
      handleError(err, 'Failed to fetch service statistics')
      return []
    } finally {
      statsLoading.value = false
    }
  }

  /**
   * Create new service plan
   * @param {Object} planData - Service plan data
   */
  const createPlan = async (planData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/service/plans', planData)
      if (response.data) {
        plans.value.push(response.data)
        showSuccess(response.message || 'Service plan created successfully')
      }
      return response.data
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to create service plan')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update service plan
   * @param {string} planId - Service plan ID
   * @param {Object} planData - Updated service plan data
   */
  const updatePlan = async (planId, planData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.put(`/service/plans/${planId}`, planData)
      
      // Update local plans array
      const index = plans.value.findIndex(p => p.id === planId)
      if (index !== -1 && response.data) {
        plans.value[index] = response.data
      }
      
      showSuccess(response.message || 'Service plan updated successfully')
      return response.data
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to update service plan')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete service plan
   * @param {string} planId - Service plan ID
   */
  const deletePlan = async (planId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.delete(`/service/plans/${planId}`)
      
      // Remove from local plans array
      const index = plans.value.findIndex(p => p.id === planId)
      if (index !== -1) {
        plans.value.splice(index, 1)
      }
      
      showSuccess(response.message || 'Service plan deleted successfully')
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to delete service plan')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Toggle plan active status
   * @param {string} planId - Service plan ID
   * @param {boolean} isActive - New active status
   */
  const togglePlanActive = async (planId, isActive) => {
    return updatePlan(planId, { isActive })
  }

  /**
   * Format currency for display using tenant settings
   * @param {string|number} amount - Amount to format
   * @param {Object} currencyConfig - Optional currency configuration
   */
  const formatCurrency = (amount, currencyConfig = null) => {
    return formatCurrencyUtil(amount, currencyConfig)
  }

  /**
   * Get service type label
   * @param {string} serviceType - Service type key
   */
  const getServiceTypeLabel = (serviceType) => {
    const labels = {
      membership: 'Membership',
      class_package: 'Class Package',
      pt_package: 'PT Package',
      spa_package: 'Spa Package',
      custom: 'Custom Service'
    }
    return labels[serviceType] || serviceType
  }

  /**
   * Get service type badge class
   * @param {string} serviceType - Service type key
   */
  const getServiceTypeBadge = (serviceType) => {
    const badges = {
      membership: 'badge-primary',
      class_package: 'badge-secondary',
      pt_package: 'badge-accent',
      spa_package: 'badge-info',
      custom: 'badge-neutral'
    }
    return badges[serviceType] || 'badge-ghost'
  }

  /**
   * Get duration type label
   * @param {string} durationType - Duration type (time_based, session_based)
   */
  const getDurationTypeLabel = (durationType) => {
    const labels = {
      time_based: 'Time Based',
      session_based: 'Session Based'
    }
    return labels[durationType] || durationType
  }

  /**
   * Format duration display
   * @param {Object} plan - Service plan object
   */
  const formatDuration = (plan) => {
    if (plan.durationType === 'time_based' && plan.duration) {
      return `${plan.duration} days`
    }
    if (plan.durationType === 'session_based' && plan.sessions) {
      return `${plan.sessions} sessions`
    }
    return '-'
  }

  /**
   * Format validity display for session-based plans
   * @param {Object} plan - Service plan object
   */
  const formatValidity = (plan) => {
    if (plan.durationType === 'session_based' && plan.validityDays) {
      return `Valid for ${plan.validityDays} days`
    }
    return null
  }

  /**
   * Get price per session (for session-based plans)
   * @param {Object} plan - Service plan object
   */
  const getPricePerSession = (plan) => {
    if (plan.pricePerSession) {
      return plan.pricePerSession
    }
    if (plan.durationType === 'session_based' && plan.sessions && plan.price) {
      return (parseFloat(plan.price) / plan.sessions).toFixed(2)
    }
    return null
  }

  /**
   * Check if plan requires trainer
   * @param {Object} plan - Service plan object
   */
  const requiresTrainer = (plan) => {
    if (plan.requiresTrainer !== undefined) {
      return plan.requiresTrainer
    }
    if (plan.accessControl?.requiresTrainerAssignment !== undefined) {
      return plan.accessControl.requiresTrainerAssignment
    }
    return false
  }

  /**
   * Get facilities list for membership plans
   * @param {Object} plan - Service plan object
   */
  const getFacilities = (plan) => {
    if (plan.accessControl?.facilities && Array.isArray(plan.accessControl.facilities)) {
      return plan.accessControl.facilities
    }
    return []
  }

  /**
   * Get applicable class types for class packages
   * @param {Object} plan - Service plan object
   */
  const getApplicableClassTypes = (plan) => {
    if (plan.accessControl?.applicableClassTypes && Array.isArray(plan.accessControl.applicableClassTypes)) {
      return plan.accessControl.applicableClassTypes
    }
    return []
  }

  /**
   * Format access hours for display
   * @param {Object} accessHours - Access hours object with days as keys
   */
  const formatAccessHours = (accessHours) => {
    if (!accessHours || typeof accessHours !== 'object') return null
    
    const formatted = []
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    
    days.forEach(day => {
      if (accessHours[day] && Array.isArray(accessHours[day]) && accessHours[day].length === 2) {
        formatted.push({
          day: day.charAt(0).toUpperCase() + day.slice(1),
          hours: `${accessHours[day][0]} - ${accessHours[day][1]}`
        })
      }
    })
    
    return formatted.length > 0 ? formatted : null
  }

  /**
   * Get max check-ins for membership plans
   * @param {Object} plan - Service plan object
   */
  const getMaxCheckIns = (plan) => {
    return plan.accessControl?.maxCheckIns || null
  }

  /**
   * Validate plan data before submission
   * @param {Object} planData - Plan data to validate
   */
  const validatePlanData = (planData) => {
    const errors = {}

    if (!planData.serviceType) {
      errors.serviceType = 'Service type is required'
    }

    if (!planData.name || planData.name.trim() === '') {
      errors.name = 'Plan name is required'
    }

    if (!planData.price || planData.price <= 0) {
      errors.price = 'Price must be greater than 0'
    }

    if (!planData.durationType) {
      errors.durationType = 'Duration type is required'
    }

    if (planData.durationType === 'time_based') {
      if (!planData.duration || planData.duration <= 0) {
        errors.duration = 'Duration must be greater than 0 for time-based plans'
      }
    }

    if (planData.durationType === 'session_based') {
      if (!planData.sessions || planData.sessions <= 0) {
        errors.sessions = 'Sessions must be greater than 0 for session-based plans'
      }
      if (!planData.validityDays || planData.validityDays <= 0) {
        errors.validityDays = 'Validity days must be greater than 0 for session-based plans'
      }
    }

    if (planData.displayOrder !== undefined && planData.displayOrder < 0) {
      errors.displayOrder = 'Display order cannot be negative'
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  /**
   * Get default plan structure based on service type
   * @param {string} serviceType - Service type
   */
  const getDefaultPlanData = (serviceType = 'membership') => {
    const base = {
      serviceType: serviceType,
      name: '',
      description: '',
      price: 0,
      currency: 'IDR',
      durationType: 'time_based',
      duration: null,
      sessions: null,
      validityDays: null,
      accessControl: {},
      isActive: true,
      isPopular: false,
      allowWalkIn: false,
      pax: null,
      displayOrder: 1,
      isBundle: false,
      bundledServices: null
    }

    // Service type specific defaults
    if (serviceType === 'membership') {
      base.durationType = 'time_based'
      base.duration = 30
      base.accessControl = {
        facilities: [],
        accessHours: {
          monday: ['06:00', '22:00'],
          tuesday: ['06:00', '22:00'],
          wednesday: ['06:00', '22:00'],
          thursday: ['06:00', '22:00'],
          friday: ['06:00', '22:00'],
          saturday: ['08:00', '20:00'],
          sunday: ['08:00', '20:00']
        },
        maxCheckIns: null
      }
    } else if (serviceType === 'class_package') {
      base.durationType = 'session_based'
      base.sessions = 10
      base.validityDays = 30
      base.accessControl = {
        applicableClassTypes: [],
        requiresTrainerAssignment: false
      }
    } else if (serviceType === 'pt_package') {
      base.durationType = 'session_based'
      base.sessions = 8
      base.validityDays = 60
      base.accessControl = {
        requiresTrainerAssignment: true
      }
    } else if (serviceType === 'spa_package') {
      base.durationType = 'session_based'
      base.sessions = 5
      base.validityDays = 90
      base.accessControl = {
        requiresTrainerAssignment: false
      }
    }

    return base
  }

  return {
    // State
    plans,
    loading,
    error,
    stats,
    statsLoading,
    
    // Methods
    fetchPlans,
    fetchPlanById,
    fetchStats,
    createPlan,
    updatePlan,
    deletePlan,
    togglePlanActive,
    
    // Utilities
    formatCurrency,
    getServiceTypeLabel,
    getServiceTypeBadge,
    getDurationTypeLabel,
    formatDuration,
    formatValidity,
    getPricePerSession,
    requiresTrainer,
    getFacilities,
    getApplicableClassTypes,
    formatAccessHours,
    getMaxCheckIns,
    validatePlanData,
    getDefaultPlanData
  }
}
