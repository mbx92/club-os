import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'
import { useAuthStore } from '@/stores/auth'
import { useCurrency } from './useCurrency'

export function usePayments() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const authStore = useAuthStore()
  
  const payments = ref([])
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
   * Fetch all payments with optional filters
   */
  const fetchPayments = async (filters = {}) => {
    loading.value = true
    try {
      const queryParams = new URLSearchParams()
      
      if (filters.tenantId) queryParams.append('tenantId', filters.tenantId)
      if (filters.paymentType) queryParams.append('paymentType', filters.paymentType)
      if (filters.status) queryParams.append('status', filters.status)
      
      const response = await api.get(`/billing/payments${queryParams.toString() ? '?' + queryParams.toString() : ''}`)
      
      if (isDev) {
        console.log('[usePayments] Fetched payments:', response)
      }
      
      payments.value = response || []
      return response
    } catch (error) {
      handleError(error, 'Failed to fetch payments')
      payments.value = []
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch payment by ID
   */
  const fetchPaymentById = async (paymentId) => {
    loading.value = true
    try {
      const response = await api.get(`/billing/payments/${paymentId}`)
      
      if (isDev) {
        console.log('[usePayments] Fetched payment:', response)
      }
      
      return response
    } catch (error) {
      handleError(error, 'Failed to fetch payment')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Process payment
   */
  const processPayment = async (paymentData) => {
    actionLoading.value = true
    try {
      const response = await api.post('/billing/payments', paymentData)
      
      if (isDev) {
        console.log('[usePayments] Processed payment:', response)
      }
      
      showSuccess('Payment recorded successfully')
      return response.payment
    } catch (error) {
      handleError(error, 'Failed to process payment')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  /**
   * Refund payment
   */
  const refundPayment = async (paymentId, notes = '') => {
    actionLoading.value = true
    try {
      const response = await api.post(`/billing/payments/${paymentId}/refund`, { notes })
      
      if (isDev) {
        console.log('[usePayments] Refunded payment:', response)
      }
      
      showSuccess('Payment refunded successfully')
      return response
    } catch (error) {
      handleError(error, 'Failed to refund payment')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  /**
   * Format payment status badge class
   */
  const getPaymentStatusBadgeClass = (status) => {
    const statusMap = {
      completed: 'badge-success',
      pending: 'badge-warning',
      failed: 'badge-error',
      refunded: 'badge-ghost'
    }
    return statusMap[status] || 'badge-ghost'
  }

  /**
   * Format payment method display
   */
  const formatPaymentMethod = (method) => {
    const methodMap = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      credit_card: 'Kartu Kredit',
      e_wallet: 'E-Wallet',
      qris: 'QRIS',
      compliment: 'Gratis (Compliment)'
    }
    return methodMap[method] || method
  }

  /**
   * Format currency using tenant settings
   */
  const { formatCurrency: formatCurrencyFn } = useCurrency()
  const formatCurrency = (amount) => {
    return formatCurrencyFn(amount)
  }

  /**
   * Format date
   */
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return {
    payments,
    loading,
    actionLoading,
    isSuperAdmin,
    fetchPayments,
    fetchPaymentById,
    processPayment,
    refundPayment,
    getPaymentStatusBadgeClass,
    formatPaymentMethod,
    formatCurrency,
    formatDate
  }
}
