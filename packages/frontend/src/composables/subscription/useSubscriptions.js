import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'
import { useAuthStore } from '@/stores/auth'

export function useSubscriptions() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const authStore = useAuthStore()
  
  const subscriptions = ref([])
  const loading = ref(false)
  const actionLoading = ref(false)

  const isDev = import.meta.env.DEV

  /**
   * Check if current user is super admin
   */
  const isSuperAdmin = () => {
    return authStore.user?.isSuperAdmin === true
  }

  /**
   * Fetch subscription by tenant ID
   */
  const fetchTenantSubscription = async (tenantId) => {
    loading.value = true
    try {
      const response = await api.get(`/billing/subscriptions/tenant/${tenantId}`)
      
      if (isDev) {
        console.log('[useSubscriptions] Fetched tenant subscription:', response)
      }
      
      return response
    } catch (error) {
      if (error.message?.includes('not found')) {
        // No active subscription - this is OK
        return null
      }
      handleError(error, 'Failed to fetch subscription')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Create new subscription for tenant
   */
  const createSubscription = async (subscriptionData) => {
    actionLoading.value = true
    try {
      const response = await api.post('/billing/subscriptions', subscriptionData)
      
      if (isDev) {
        console.log('[useSubscriptions] Created subscription:', response)
      }
      
      showSuccess('Subscription created successfully')
      return response.subscription
    } catch (error) {
      handleError(error, 'Failed to create subscription')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  /**
   * Update subscription
   */
  const updateSubscription = async (subscriptionId, updateData) => {
    actionLoading.value = true
    try {
      const response = await api.put(`/billing/subscriptions/${subscriptionId}`, updateData)
      
      if (isDev) {
        console.log('[useSubscriptions] Updated subscription:', response)
      }
      
      showSuccess('Subscription updated successfully')
      return response
    } catch (error) {
      handleError(error, 'Failed to update subscription')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  /**
   * Activate subscription (change status from pending to active)
   */
  const activateSubscription = async (subscriptionId) => {
    actionLoading.value = true
    try {
      const response = await api.put(`/billing/subscriptions/${subscriptionId}`, {
        status: 'active'
      })
      
      if (isDev) {
        console.log('[useSubscriptions] Activated subscription:', response)
      }
      
      showSuccess('Subscription activated successfully')
      return response
    } catch (error) {
      handleError(error, 'Failed to activate subscription')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  /**
   * Cancel subscription
   */
  const cancelSubscription = async (subscriptionId) => {
    actionLoading.value = true
    try {
      const response = await api.delete(`/billing/subscriptions/${subscriptionId}`)
      
      if (isDev) {
        console.log('[useSubscriptions] Cancelled subscription:', response)
      }
      
      showSuccess('Subscription cancelled successfully')
      return response
    } catch (error) {
      handleError(error, 'Failed to cancel subscription')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  /**
   * Renew subscription
   */
  const renewSubscription = async (subscriptionId, paymentMethod) => {
    actionLoading.value = true
    try {
      const response = await api.post(`/billing/subscriptions/${subscriptionId}/renew`, {
        paymentMethod
      })
      
      if (isDev) {
        console.log('[useSubscriptions] Renewed subscription:', response)
      }
      
      showSuccess('Subscription renewed successfully')
      return response.subscription
    } catch (error) {
      handleError(error, 'Failed to renew subscription')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  /**
   * Format subscription status
   */
  const getStatusBadgeClass = (status) => {
    const statusMap = {
      active: 'badge-success',
      pending: 'badge-warning',
      expired: 'badge-error',
      cancelled: 'badge-ghost'
    }
    return statusMap[status] || 'badge-ghost'
  }

  /**
   * Calculate days until expiry
   */
  const getDaysUntilExpiry = (endDate) => {
    const end = new Date(endDate)
    const now = new Date()
    const diffTime = end - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  /**
   * Check if subscription is expired
   */
  const isExpired = (endDate) => {
    return getDaysUntilExpiry(endDate) < 0
  }

  /**
   * Check if subscription is expiring soon (within 7 days)
   */
  const isExpiringSoon = (endDate) => {
    const days = getDaysUntilExpiry(endDate)
    return days >= 0 && days <= 7
  }

  return {
    subscriptions,
    loading,
    actionLoading,
    isSuperAdmin,
    fetchTenantSubscription,
    createSubscription,
    updateSubscription,
    activateSubscription,
    cancelSubscription,
    renewSubscription,
    getStatusBadgeClass,
    getDaysUntilExpiry,
    isExpired,
    isExpiringSoon
  }
}
