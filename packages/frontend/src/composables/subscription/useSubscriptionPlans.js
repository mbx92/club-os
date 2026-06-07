import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'
import { useAuthStore } from '@/stores/auth'

export function useSubscriptionPlans() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const authStore = useAuthStore()
  const isDev = import.meta.env.DEV
  
  const plans = ref([])
  const loading = ref(false)
  const error = ref(null)
  const featureMetadata = ref(null)
  const metadataLoading = ref(false)

  // Check if current user is Super Admin
  const isSuperAdmin = () => {
    return authStore.user?.isSuperAdmin === true
  }

  /**
   * Get all subscription plans (public endpoint)
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.sortBy - Field to sort by
   * @param {string} params.sortOrder - Sort order (ASC/DESC)
   * @param {string} params.search - Search query
   * @param {string} params.isActive - Filter by active status
   */
  const fetchPlans = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      // Build query string
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page)
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.sortBy) queryParams.append('sortBy', params.sortBy)
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)
      if (params.search) queryParams.append('search', params.search)
      // Only add isActive if it has a valid value (not empty string)
      if (params.isActive !== '' && params.isActive !== null && params.isActive !== undefined) {
        queryParams.append('isActive', params.isActive)
      }

      const queryString = queryParams.toString()
      const url = `/billing/plans${queryString ? `?${queryString}` : ''}`
      
      if (isDev) {
        console.log('Fetching plans from:', url)
      }
      const response = await api.get(url)
      if (isDev) {
        console.log('API Response:', response)
      }
      
      // Handle response with pagination object (newer API structure)
      if (response.data && response.pagination) {
        if (isDev) {
          console.log('Response with pagination object, length:', response.data.length)
        }
        plans.value = Array.isArray(response.data) ? response.data : []
        return {
          data: response.data,
          total: response.pagination.totalRecords || 0,
          totalPages: response.pagination.totalPages || 1,
          currentPage: response.pagination.currentPage || params.page || 1
        }
      }
      // Handle both paginated and non-paginated responses (legacy)
      else if (response.data && Array.isArray(response.data)) {
        // Direct array response
        if (isDev) {
          console.log('Direct array response, length:', response.data.length)
        }
        plans.value = response.data
        return {
          data: response.data,
          total: response.total || response.data.length,
          totalPages: response.totalPages || 1,
          currentPage: response.currentPage || params.page || 1
        }
      } else if (response.data && response.data.data) {
        // Paginated response (data nested in data property)
        if (isDev) {
          console.log('Paginated response, length:', response.data.data.length)
        }
        plans.value = response.data.data
        return {
          data: response.data.data,
          total: response.data.total || response.data.data.length,
          totalPages: response.data.totalPages || 1,
          currentPage: response.data.currentPage || params.page || 1
        }
      } else if (response && response.data === null) {
        // Empty response
        if (isDev) {
          console.log('Empty response (null)')
        }
        plans.value = []
        return { data: [], total: 0, totalPages: 1, currentPage: 1 }
      } else {
        // Unexpected response structure
        if (isDev) {
          console.warn('Unexpected response structure:', response)
        }
        plans.value = []
        return { data: [], total: 0, totalPages: 1, currentPage: 1 }
      }
    } catch (err) {
      if (isDev) {
        console.error('Error in fetchPlans:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch subscription plans')
      plans.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get subscription plan by ID (public endpoint)
   */
  const fetchPlanById = async (planId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/billing/plans/${planId}`)
      return response.data
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to fetch subscription plan')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create new subscription plan (Super Admin only)
   */
  const createPlan = async (planData) => {
    if (!isSuperAdmin()) {
      const err = new Error('Only Super Admin can create subscription plans')
      handleError(err)
      throw err
    }

    loading.value = true
    error.value = null
    try {
      const response = await api.post('/billing/plans', planData)
      plans.value.push(response.data)
      showSuccess('Subscription plan created successfully')
      return response.data
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to create subscription plan')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update subscription plan (Super Admin only)
   */
  const updatePlan = async (planId, planData) => {
    if (!isSuperAdmin()) {
      const err = new Error('Only Super Admin can update subscription plans')
      handleError(err)
      throw err
    }

    loading.value = true
    error.value = null
    try {
      const response = await api.put(`/billing/plans/${planId}`, planData)
      
      // Update local plans array
      const index = plans.value.findIndex(p => p.id === planId)
      if (index !== -1) {
        plans.value[index] = response.data
      }
      
      showSuccess('Subscription plan updated successfully')
      return response.data
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to update subscription plan')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete/deactivate subscription plan (Super Admin only)
   */
  const deletePlan = async (planId) => {
    if (!isSuperAdmin()) {
      const err = new Error('Only Super Admin can delete subscription plans')
      handleError(err)
      throw err
    }

    loading.value = true
    error.value = null
    try {
      await api.delete(`/billing/plans/${planId}`)
      
      // Remove from local plans array or update isActive
      const index = plans.value.findIndex(p => p.id === planId)
      if (index !== -1) {
        plans.value[index].isActive = false
      }
      
      showSuccess('Subscription plan deactivated successfully')
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to delete subscription plan')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Toggle plan active status (Super Admin only)
   */
  const togglePlanActive = async (planId, isActive) => {
    if (!isSuperAdmin()) {
      const err = new Error('Only Super Admin can modify subscription plans')
      handleError(err)
      throw err
    }

    return updatePlan(planId, { isActive })
  }

  /**
   * Format currency for display
   * @deprecated Use useCurrency composable instead for tenant-specific formatting
   */
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  /**
   * Format features object to array for display
   * Supports both old flat structure and new 8-category structure
   */
  const formatFeatures = (features) => {
    if (!features || typeof features !== 'object') return []
    
    // Check if using new 8-category structure
    const hasCategories = features.modules || features.limits || features.transactions || 
                          features.payments || features.printing || features.restaurant || 
                          features.integrations || features.support
    
    if (hasCategories) {
      // New structure: flatten categories
      const enabledFeatures = []
      
      Object.entries(features).forEach(([category, categoryFeatures]) => {
        if (categoryFeatures && typeof categoryFeatures === 'object') {
          Object.entries(categoryFeatures).forEach(([key, value]) => {
            if (value === true || (typeof value === 'number' && value > 0)) {
              const displayValue = typeof value === 'number' ? ` (${value})` : ''
              enabledFeatures.push({
                category,
                key,
                value,
                display: formatFeatureKey(key) + displayValue
              })
            }
          })
        }
      })
      
      return enabledFeatures
    }
    
    // Old structure: flat boolean object
    return Object.entries(features)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => ({
        category: 'general',
        key,
        value: true,
        display: formatFeatureKey(key)
      }))
  }

  /**
   * Format feature key to readable label
   */
  const formatFeatureKey = (key) => {
    return key.replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
  }

  /**
   * Get features grouped by category
   */
  const formatFeaturesByCategory = (features) => {
    if (!features || typeof features !== 'object') return {}
    
    const categories = {
      modules: [],
      limits: [],
      transactions: [],
      payments: [],
      printing: [],
      restaurant: [],
      integrations: [],
      support: []
    }
    
    Object.entries(features).forEach(([category, categoryFeatures]) => {
      if (categories[category] && categoryFeatures && typeof categoryFeatures === 'object') {
        Object.entries(categoryFeatures).forEach(([key, value]) => {
          if (value === true || (typeof value === 'number' && value > 0)) {
            categories[category].push({
              key,
              value,
              display: formatFeatureKey(key) + (typeof value === 'number' ? ` (${value === 0 ? 'Unlimited' : value})` : '')
            })
          }
        })
      }
    })
    
    // Remove empty categories
    Object.keys(categories).forEach(key => {
      if (categories[key].length === 0) {
        delete categories[key]
      }
    })
    
    return categories
  }

  /**
   * Get count of enabled features
   */
  const getEnabledFeaturesCount = (features) => {
    const formatted = formatFeatures(features)
    return formatted.length
  }

  /**
   * Get count of features by category
   */
  const getFeatureCounts = (features) => {
    const byCategory = formatFeaturesByCategory(features)
    const counts = {}
    
    Object.entries(byCategory).forEach(([category, items]) => {
      counts[category] = items.length
    })
    
    return counts
  }

  /**
   * Check if a specific feature is enabled
   */
  const isFeatureEnabled = (features, category, featureKey) => {
    if (!features) return false
    
    // Check new structure
    if (features[category] && features[category][featureKey]) {
      const value = features[category][featureKey]
      return value === true || (typeof value === 'number' && value > 0)
    }
    
    // Check old flat structure
    if (features[featureKey]) {
      return features[featureKey] === true
    }
    
    return false
  }

  /**
   * Fetch feature metadata from backend (Super Admin only)
   * Backend returns flat array, we transform to grouped categories
   */
  const fetchFeatureMetadata = async () => {
    if (!isSuperAdmin()) {
      if (isDev) {
        console.warn('Feature metadata endpoint requires Super Admin access')
      }
      return null
    }

    metadataLoading.value = true
    try {
      const response = await api.get('/admin/features/metadata')
      
      // Get raw data - backend returns flat array
      const rawData = response.data || response || []
      
      if (isDev) {
        console.log('[fetchFeatureMetadata] Raw response:', rawData)
      }
      
      // If already in grouped format (legacy/future), use directly
      if (rawData.categories) {
        featureMetadata.value = rawData.categories
        return featureMetadata.value
      }
      
      // Transform flat array to grouped categories
      // Backend format: [{ category: "modules", name: "gym", type: "boolean", ... }]
      // Frontend needs: [{ name: "modules", label: "Modules", icon: "package", features: [{ key: "gym", ... }] }]
      if (Array.isArray(rawData) && rawData.length > 0) {
        const categoryMap = {}
        const categoryMeta = {
          modules: { label: 'Modules', icon: 'package' },
          limits: { label: 'Resource Limits', icon: 'ruler' },
          transactions: { label: 'Transaction Features', icon: 'cash' },
          payments: { label: 'Payment Methods', icon: 'credit-card' },
          printing: { label: 'Printing Features', icon: 'printer' },
          restaurant: { label: 'Restaurant Features', icon: 'tools-kitchen' },
          integrations: { label: 'Integrations', icon: 'plug' },
          support: { label: 'Support Levels', icon: 'lifebuoy' },
          gym: { label: 'Gym Features', icon: 'barbell' },
          services: { label: 'Service Features', icon: 'calendar' },
          settings: { label: 'Settings', icon: 'settings' }
        }
        
        rawData.forEach(item => {
          const catName = item.category
          if (!categoryMap[catName]) {
            const meta = categoryMeta[catName] || { label: formatFeatureKey(catName), icon: 'list' }
            categoryMap[catName] = {
              name: catName,
              label: meta.label,
              icon: meta.icon,
              features: []
            }
          }
          
          categoryMap[catName].features.push({
            key: item.name,
            type: item.type || 'boolean',
            label: item.label || formatFeatureKey(item.name),
            description: item.description || '',
            default: item.default,
            availableIn: item.availableIn || [],
            plans: item.plans || {}
          })
        })
        
        // Convert to array and sort by common order
        const categoryOrder = ['modules', 'limits', 'transactions', 'payments', 'gym', 'services', 'printing', 'restaurant', 'integrations', 'support', 'settings']
        featureMetadata.value = Object.values(categoryMap).sort((a, b) => {
          const aIdx = categoryOrder.indexOf(a.name)
          const bIdx = categoryOrder.indexOf(b.name)
          return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
        })
        
        if (isDev) {
          console.log('[fetchFeatureMetadata] Transformed categories:', featureMetadata.value)
        }
        
        return featureMetadata.value
      }
      
      // Empty or invalid response
      featureMetadata.value = []
      return featureMetadata.value
    } catch (err) {
      if (isDev) {
        console.error('Error fetching feature metadata:', err)
      }
      handleError(err, 'Failed to fetch feature metadata')
      return null
    } finally {
      metadataLoading.value = false
    }
  }

  /**
   * Get default features structure (all disabled)
   * Uses metadata if available, otherwise uses hardcoded defaults
   */
  const getDefaultFeatures = () => {
    // If metadata is loaded, build from metadata
    if (featureMetadata.value && featureMetadata.value.length > 0) {
      const features = {}
      featureMetadata.value.forEach(category => {
        features[category.name] = {}
        category.features.forEach(feature => {
          // Set default based on type: boolean = false, number = 0
          features[category.name][feature.key] = feature.type === 'number' ? 0 : false
        })
      })
      return features
    }

    // Fallback to hardcoded structure if metadata not available
    return {
      modules: {
        dashboard: false,
        gym: false,
        serviceManagement: false,
        pos: false,
        restaurant: false,
        classes: false,
        reports: false,
        advancedReports: false,
        
      },
      limits: {
        maxUsers: 0,
        maxMembers: 0,
        maxServicePlans: 0,
        maxActiveServicesPerMember: 0,
        maxProducts: 0,
        maxLocations: 0,
        maxPrinters: 0,
        maxTables: 0,
        maxIntegrations: 0
      },
      transactions: {
        combinedBilling: false,
        installments: false,
        vouchers: false,
        loyaltyPoints: false,
        refunds: false
      },
      payments: {
        cash: false,
        creditCard: false,
        bankTransfer: false,
        eWallet: false,
        qris: false,
        paymentGateway: false
      },
      printing: {
        thermalPrinter: false,
        customTemplates: false,
        autoPrint: false,
        logo: false
      },
      restaurant: {
        tableManagement: false,
        kitchenDisplay: false,
        customTableLayout: false,
        touchscreenMode: false
      },
      integrations: {
        sms: false,
        whatsapp: false,
        email: false,
        paymentGateway: false,
        accounting: false
      },
      support: {
        prioritySupport: false,
        dedicatedAccount: false,
        customization: false
      }
    }
  }

  /**
   * Get category metadata (icon, label, description)
   */
  const getCategoryMetadata = (categoryName) => {
    const metadata = {
      modules: { icon: 'package', label: 'Modules', total: 9 },
      limits: { icon: 'ruler', label: 'Resource Limits', total: 9 },
      transactions: { icon: 'cash', label: 'Transaction Features', total: 5 },
      payments: { icon: 'credit-card', label: 'Payment Methods', total: 6 },
      printing: { icon: 'printer', label: 'Printing Features', total: 4 },
      restaurant: { icon: 'tools-kitchen', label: 'Restaurant Features', total: 4 },
      integrations: { icon: 'plug', label: 'Integrations', total: 5 },
      support: { icon: 'lifebuoy', label: 'Support Levels', total: 3 }
    }
    return metadata[categoryName] || { icon: 'settings', label: categoryName, total: 0 }
  }

  /**
   * Get feature metadata for a specific category
   * Returns structure suitable for dynamic form building
   */
  const getCategoryFeatures = (categoryName) => {
    // If metadata is loaded, use it
    if (featureMetadata.value && featureMetadata.value.length > 0) {
      const category = featureMetadata.value.find(cat => cat.name === categoryName)
      if (category) return category.features
    }

    // Fallback to hardcoded features
    const hardcodedFeatures = {
      modules: [
        { key: 'gym', label: 'Gym Management', type: 'boolean' },
        { key: 'pos', label: 'Point of Sale (POS)', type: 'boolean' },
        { key: 'restaurant', label: 'Restaurant Management', type: 'boolean' },
        { key: 'classes', label: 'Class Scheduling', type: 'boolean' },
        { key: 'reports', label: 'Basic Reports', type: 'boolean' },
        { key: 'advancedReports', label: 'Advanced Analytics', type: 'boolean' }
      ],
      limits: [
        { key: 'maxUsers', label: 'Max Users', type: 'number' },
        { key: 'maxMembers', label: 'Max Members', type: 'number' },
        { key: 'maxProducts', label: 'Max Products', type: 'number' },
        { key: 'maxLocations', label: 'Max Locations', type: 'number' },
        { key: 'maxPrinters', label: 'Max Printers', type: 'number' },
        { key: 'maxTables', label: 'Max Tables', type: 'number' },
        { key: 'maxIntegrations', label: 'Max Integrations', type: 'number' }
      ],
      transactions: [
        { key: 'combinedBilling', label: 'Combined Billing', type: 'boolean' },
        { key: 'installments', label: 'Installment Payments', type: 'boolean' },
        { key: 'vouchers', label: 'Voucher System', type: 'boolean' },
        { key: 'loyaltyPoints', label: 'Loyalty Points', type: 'boolean' },
        { key: 'refunds', label: 'Refund Processing', type: 'boolean' }
      ],
      payments: [
        { key: 'cash', label: 'Cash', type: 'boolean' },
        { key: 'creditCard', label: 'Card', type: 'boolean' },
        { key: 'bankTransfer', label: 'Bank Transfer', type: 'boolean' },
        { key: 'eWallet', label: 'E-Wallet', type: 'boolean' },
        { key: 'qris', label: 'QRIS', type: 'boolean' },
        { key: 'paymentGateway', label: 'Payment Gateway', type: 'boolean' }
      ],
      printing: [
        { key: 'thermalPrinter', label: 'Thermal Printer', type: 'boolean' },
        { key: 'customTemplates', label: 'Custom Templates', type: 'boolean' },
        { key: 'autoPrint', label: 'Auto Print', type: 'boolean' },
        { key: 'logo', label: 'Custom Logo', type: 'boolean' }
      ],
      restaurant: [
        { key: 'tableManagement', label: 'Table Management', type: 'boolean' },
        { key: 'kitchenDisplay', label: 'Kitchen Display', type: 'boolean' },
        { key: 'customTableLayout', label: 'Custom Layout', type: 'boolean' },
        { key: 'touchscreenMode', label: 'Touchscreen Mode', type: 'boolean' }
      ],
      integrations: [
        { key: 'sms', label: 'SMS Notifications', type: 'boolean' },
        { key: 'whatsapp', label: 'WhatsApp', type: 'boolean' },
        { key: 'email', label: 'Email', type: 'boolean' },
        { key: 'paymentGateway', label: 'Payment Gateway', type: 'boolean' },
        { key: 'accounting', label: 'Accounting Software', type: 'boolean' }
      ],
      support: [
        { key: 'prioritySupport', label: 'Priority Support', type: 'boolean' },
        { key: 'dedicatedAccount', label: 'Dedicated Account', type: 'boolean' },
        { key: 'customization', label: 'Customization', type: 'boolean' }
      ]
    }

    return hardcodedFeatures[categoryName] || []
  }

  /**
   * Get all categories list
   */
  const getAllCategories = () => {
    if (featureMetadata.value && featureMetadata.value.length > 0) {
      return featureMetadata.value.map(cat => cat.name)
    }
    return ['modules', 'limits', 'transactions', 'payments', 'printing', 'restaurant', 'integrations', 'support']
  }

  /**
   * Validate plan data before submission
   * Updated to support new 8-category features structure
   */
  const validatePlanData = (planData) => {
    const errors = {}

    if (!planData.name || planData.name.trim() === '') {
      errors.name = 'Plan name is required'
    }

    if (!planData.price || planData.price <= 0) {
      errors.price = 'Price must be greater than 0'
    }

    if (planData.duration && planData.duration <= 0) {
      errors.duration = 'Duration must be greater than 0'
    }

    // Validate features structure if present
    if (planData.features) {
      const validCategories = ['modules', 'limits', 'transactions', 'payments', 'printing', 'restaurant', 'integrations', 'support']
      
      Object.keys(planData.features).forEach(category => {
        if (!validCategories.includes(category)) {
          errors[`features.${category}`] = `Invalid feature category: ${category}`
        }
      })
      
      // Validate limits are numbers
      if (planData.features.limits) {
        Object.entries(planData.features.limits).forEach(([key, value]) => {
          if (typeof value !== 'number' || value < 0) {
            errors[`features.limits.${key}`] = `${key} must be a positive number or 0 for unlimited`
          }
        })
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  return {
    // State
    plans,
    loading,
    error,
    featureMetadata,
    metadataLoading,
    
    // Methods
    fetchPlans,
    fetchPlanById,
    createPlan,
    updatePlan,
    deletePlan,
    togglePlanActive,
    isSuperAdmin,
    fetchFeatureMetadata,
    
    // Utilities
    formatCurrency,
    formatFeatures,
    formatFeaturesByCategory,
    formatFeatureKey,
    getEnabledFeaturesCount,
    getFeatureCounts,
    isFeatureEnabled,
    getDefaultFeatures,
    getCategoryMetadata,
    getCategoryFeatures,
    getAllCategories,
    validatePlanData
  }
}
