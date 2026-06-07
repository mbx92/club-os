import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

/**
 * Composable untuk mengelola feature metadata
 */
export function useFeatureMetadata() {
  const api = useApi()
  const { showError } = useNotification()
  const isDev = import.meta.env.DEV
  
  const metadata = ref([])
  const loading = ref(false)
  const error = ref(null)
  
  // Group metadata by category
  const groupedMetadata = ref({})
  
  // Health check data
  const healthData = ref(null)
  const healthLoading = ref(false)
  const healthError = ref(null)
  
  // Compare data
  const compareData = ref([])
  const compareLoading = ref(false)
  const compareError = ref(null)
  
  // Preview data
  const previewData = ref(null)
  const previewLoading = ref(false)
  const previewError = ref(null)
  
  // Sync data
  const syncData = ref(null)
  const syncLoading = ref(false)
  const syncError = ref(null)
  
  /**
   * Fetch feature metadata dari backend
   */
  const fetchMetadata = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.get('/admin/features/metadata')
      
      if (response.success) {
        metadata.value = response.data
        groupMetadata()
        
        if (isDev) {
          console.log('[useFeatureMetadata] Metadata fetched:', metadata.value)
        }
      }
    } catch (err) {
      error.value = err.message || 'Failed to fetch feature metadata'
      showError('Failed to load feature metadata')
      console.error('[useFeatureMetadata] Error:', err)
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Group metadata by category
   */
  const groupMetadata = () => {
    const grouped = {}
    
    metadata.value.forEach(feature => {
      const category = feature.category || 'other'
      
      if (!grouped[category]) {
        grouped[category] = []
      }
      
      grouped[category].push(feature)
    })
    
    groupedMetadata.value = grouped
    
    if (isDev) {
      console.log('[useFeatureMetadata] Grouped metadata:', groupedMetadata.value)
    }
  }
  
  /**
   * Get category label
   */
  const getCategoryLabel = (category) => {
    const labels = {
      modules: 'Modules',
      limits: 'Limits',
      gym: 'Gym Features',
      services: 'Service Features',
      transactions: 'Transaction Features',
      payments: 'Payment Methods',
      printing: 'Printing Features',
      restaurant: 'Restaurant Features',
      integrations: 'Integrations',
      support: 'Support Features',
      other: 'Other Features'
    }
    
    return labels[category] || category
  }
  
  /**
   * Get category icon (Tabler icon name)
   */
  const getCategoryIcon = (category) => {
    const icons = {
      modules: 'package',
      limits: 'ruler',
      gym: 'barbell',
      services: 'target',
      transactions: 'cash',
      payments: 'credit-card',
      printing: 'printer',
      restaurant: 'tools-kitchen',
      integrations: 'plug',
      support: 'lifebuoy',
      other: 'settings'
    }
    
    return icons[category] || 'settings'
  }
  
  /**
   * Get type badge color
   */
  const getTypeBadgeColor = (type) => {
    const colors = {
      boolean: 'badge-primary',
      number: 'badge-secondary',
      string: 'badge-accent',
      enum: 'badge-info'
    }
    
    return colors[type] || 'badge-neutral'
  }
  
  /**
   * Format plans/availableIn display
   */
  const formatAvailability = (feature) => {
    if (feature.availableIn) {
      return feature.availableIn.join(', ')
    }
    
    if (feature.plans) {
      return Object.entries(feature.plans)
        .map(([plan, value]) => `${plan}: ${value}${feature.unit ? ' ' + feature.unit : ''}`)
        .join(', ')
    }
    
    return 'N/A'
  }
  
  /**
   * Get categories list
   */
  const getCategories = () => {
    return Object.keys(groupedMetadata.value).sort()
  }
  
  /**
   * Get features by category
   */
  const getFeaturesByCategory = (category) => {
    return groupedMetadata.value[category] || []
  }
  
  /**
   * Search features by name or label
   */
  const searchFeatures = (query) => {
    if (!query || query.trim() === '') {
      return metadata.value
    }
    
    const lowerQuery = query.toLowerCase()
    
    return metadata.value.filter(feature => {
      return (
        feature.name.toLowerCase().includes(lowerQuery) ||
        feature.label.toLowerCase().includes(lowerQuery) ||
        (feature.description && feature.description.toLowerCase().includes(lowerQuery))
      )
    })
  }
  
  /**
   * Reset state
   */
  const reset = () => {
    metadata.value = []
    groupedMetadata.value = {}
    loading.value = false
    error.value = null
    healthData.value = null
    healthLoading.value = false
    healthError.value = null
    compareData.value = []
    compareLoading.value = false
    compareError.value = null
    previewData.value = null
    previewLoading.value = false
    previewError.value = null
    syncData.value = null
    syncLoading.value = false
    syncError.value = null
  }
  
  /**
   * Fetch feature health status
   */
  const fetchHealth = async () => {
    healthLoading.value = true
    healthError.value = null
    
    try {
      const response = await api.get('/admin/features/health')
      
      if (response.success) {
        healthData.value = response.data
        
        if (isDev) {
          console.log('[useFeatureMetadata] Health data fetched:', healthData.value)
        }
      }
    } catch (err) {
      healthError.value = err.message || 'Failed to fetch health status'
      showError('Failed to load feature health status')
      console.error('[useFeatureMetadata] Health Error:', err)
    } finally {
      healthLoading.value = false
    }
  }
  
  /**
   * Fetch feature comparison across plans
   */
  const fetchCompare = async () => {
    compareLoading.value = true
    compareError.value = null
    
    try {
      const response = await api.get('/admin/features/compare')
      
      if (response.success) {
        compareData.value = response.data
        
        if (isDev) {
          console.log('[useFeatureMetadata] Compare data fetched:', compareData.value)
        }
      }
    } catch (err) {
      compareError.value = err.message || 'Failed to fetch comparison data'
      showError('Failed to load feature comparison')
      console.error('[useFeatureMetadata] Compare Error:', err)
    } finally {
      compareLoading.value = false
    }
  }
  
  /**
   * Fetch feature preview for a specific plan
   */
  const fetchPreview = async (planName) => {
    if (!planName) {
      previewError.value = 'Plan name is required'
      return
    }
    
    previewLoading.value = true
    previewError.value = null
    
    try {
      const response = await api.get(`/admin/features/preview/${planName}`)
      
      if (response.success) {
        previewData.value = response.data
        
        if (isDev) {
          console.log('[useFeatureMetadata] Preview data fetched:', previewData.value)
        }
      }
    } catch (err) {
      previewError.value = err.message || 'Failed to fetch preview data'
      showError(`Failed to load preview for ${planName}`)
      console.error('[useFeatureMetadata] Preview Error:', err)
    } finally {
      previewLoading.value = false
    }
  }
  
  /**
   * Sync all plans with metadata
   */
  const syncAllPlans = async () => {
    syncLoading.value = true
    syncError.value = null
    
    try {
      const response = await api.post('/admin/features/sync')
      
      if (response.success) {
        syncData.value = response.data
        
        if (isDev) {
          console.log('[useFeatureMetadata] Sync all completed:', syncData.value)
        }
        
        // Refresh health and compare data after sync
        await Promise.all([fetchHealth(), fetchCompare()])
        
        return response
      }
    } catch (err) {
      syncError.value = err.message || 'Failed to sync plans'
      showError('Failed to sync plans')
      console.error('[useFeatureMetadata] Sync Error:', err)
      throw err
    } finally {
      syncLoading.value = false
    }
  }
  
  /**
   * Sync a specific plan with metadata
   */
  const syncPlan = async (planId) => {
    if (!planId) {
      syncError.value = 'Plan ID is required'
      return
    }
    
    syncLoading.value = true
    syncError.value = null
    
    try {
      const response = await api.post(`/admin/features/sync/${planId}`)
      
      if (response.success) {
        if (isDev) {
          console.log('[useFeatureMetadata] Plan synced:', response.data)
        }
        
        // Refresh health and compare data after sync
        await Promise.all([fetchHealth(), fetchCompare()])
        
        return response
      }
    } catch (err) {
      syncError.value = err.message || 'Failed to sync plan'
      showError(`Failed to sync plan`)
      console.error('[useFeatureMetadata] Sync Plan Error:', err)
      throw err
    } finally {
      syncLoading.value = false
    }
  }
  
  /**
   * Create missing plans
   */
  const createMissingPlans = async () => {
    syncLoading.value = true
    syncError.value = null
    
    try {
      const response = await api.post('/admin/features/create-missing')
      
      if (response.success) {
        if (isDev) {
          console.log('[useFeatureMetadata] Create missing plans:', response.data)
        }
        
        // Refresh health and compare data after creating
        await Promise.all([fetchHealth(), fetchCompare()])
        
        return response
      }
    } catch (err) {
      syncError.value = err.message || 'Failed to create missing plans'
      showError('Failed to create missing plans')
      console.error('[useFeatureMetadata] Create Missing Error:', err)
      throw err
    } finally {
      syncLoading.value = false
    }
  }
  
  return {
    // State
    metadata,
    groupedMetadata,
    loading,
    error,
    
    // Health state
    healthData,
    healthLoading,
    healthError,
    
    // Compare state
    compareData,
    compareLoading,
    compareError,
    
    // Preview state
    previewData,
    previewLoading,
    previewError,
    
    // Sync state
    syncData,
    syncLoading,
    syncError,
    
    // Methods
    fetchMetadata,
    fetchHealth,
    fetchCompare,
    fetchPreview,
    syncAllPlans,
    syncPlan,
    createMissingPlans,
    groupMetadata,
    getCategoryLabel,
    getCategoryIcon,
    getTypeBadgeColor,
    formatAvailability,
    getCategories,
    getFeaturesByCategory,
    searchFeatures,
    reset
  }
}
