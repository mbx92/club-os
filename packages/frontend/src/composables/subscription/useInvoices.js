import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'
import { useAuthStore } from '@/stores/auth'
import { useCurrency } from './useCurrency'

export function useInvoices() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const authStore = useAuthStore()
  
  const invoices = ref([])
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
   * Fetch all invoices with optional filters
   */
  const fetchInvoices = async (filters = {}) => {
    loading.value = true
    try {
      const queryParams = new URLSearchParams()
      
      if (filters.tenantId) queryParams.append('tenantId', filters.tenantId)
      
      const response = await api.get(`/billing/invoices${queryParams.toString() ? '?' + queryParams.toString() : ''}`)
      
      if (isDev) {
        console.log('[useInvoices] Fetched invoices:', response)
      }
      
      invoices.value = response || []
      return response
    } catch (error) {
      handleError(error, 'Failed to fetch invoices')
      invoices.value = []
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch invoice by ID
   */
  const fetchInvoiceById = async (invoiceId) => {
    loading.value = true
    try {
      const response = await api.get(`/billing/invoices/${invoiceId}`)
      
      if (isDev) {
        console.log('[useInvoices] Fetched invoice:', response)
      }
      
      return response
    } catch (error) {
      handleError(error, 'Failed to fetch invoice')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Create new invoice
   */
  const createInvoice = async (invoiceData) => {
    actionLoading.value = true
    try {
      const response = await api.post('/billing/invoices', invoiceData)
      
      if (isDev) {
        console.log('[useInvoices] Created invoice:', response)
      }
      
      showSuccess('Invoice created successfully')
      return response.invoice
    } catch (error) {
      handleError(error, 'Failed to create invoice')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  /**
   * Update invoice status
   */
  const updateInvoiceStatus = async (invoiceId, status) => {
    actionLoading.value = true
    try {
      const response = await api.put(`/billing/invoices/${invoiceId}/status`, { status })
      
      if (isDev) {
        console.log('[useInvoices] Updated invoice status:', response)
      }
      
      showSuccess(`Invoice status updated to ${status}`)
      return response
    } catch (error) {
      handleError(error, 'Failed to update invoice status')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  /**
   * Format invoice status badge class
   */
  const getInvoiceStatusBadgeClass = (status) => {
    const statusMap = {
      draft: 'badge-ghost',
      issued: 'badge-info',
      paid: 'badge-success',
      overdue: 'badge-error',
      cancelled: 'badge-ghost'
    }
    return statusMap[status] || 'badge-ghost'
  }

  /**
   * Check if invoice is overdue
   */
  const isOverdue = (invoice) => {
    if (invoice.status === 'paid' || invoice.status === 'cancelled') return false
    const dueDate = new Date(invoice.dueDate)
    const now = new Date()
    return now > dueDate
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
      day: 'numeric'
    })
  }

  return {
    invoices,
    loading,
    actionLoading,
    isSuperAdmin,
    fetchInvoices,
    fetchInvoiceById,
    createInvoice,
    updateInvoiceStatus,
    getInvoiceStatusBadgeClass,
    isOverdue,
    formatCurrency,
    formatDate
  }
}
