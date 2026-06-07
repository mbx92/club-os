import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useTransactions() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const isDev = import.meta.env.DEV
  
  const transactions = ref([])
  const transaction = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const statistics = ref(null)
  const statsLoading = ref(false)

  /**
   * Create new transaction (Purchase service plans)
   * @param {Object} transactionData - Transaction data
   * @param {string} transactionData.memberId - Member ID
   * @param {Array} transactionData.servicePlans - Array of service plans with servicePlanId and startDate
   * @param {Array} transactionData.paymentMethods - Array of payment methods with method and amount
   * @param {string} transactionData.voucherCode - Optional voucher code
   * @param {string} transactionData.notes - Optional transaction notes
   */
  const createTransaction = async (transactionData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Creating transaction with data:', transactionData)
        console.log('Payload JSON:', JSON.stringify(transactionData, null, 2))
      }

      const response = await api.post('/services/purchase', transactionData)
      
      if (isDev) {
        console.log('Transaction created:', response)
      }

      showSuccess(response.message || 'Transaction created successfully')
      return response.data
    } catch (err) {
      if (isDev) {
        console.error('Error creating transaction:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to create transaction')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get all transactions with filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search query (transactionNumber, customer name)
   * @param {string} params.status - Filter by status (completed, refunded, all)
   * @param {string} params.customerType - Filter by customer type (member, guest, all)
   * @param {string} params.startDate - Filter by start date (YYYY-MM-DD)
   * @param {string} params.endDate - Filter by end date (YYYY-MM-DD)
   * @param {string} params.sortBy - Field to sort by (transactionDate, totalAmount, transactionNumber)
   * @param {string} params.sortOrder - Sort order (ASC/DESC)
   */
  const fetchTransactions = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      // Build query string
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page)
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.search) queryParams.append('search', params.search)
      if (params.status && params.status !== 'all') queryParams.append('status', params.status)
      if (params.customerType && params.customerType !== 'all') queryParams.append('customerType', params.customerType)
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)
      if (params.sortBy) queryParams.append('sortBy', params.sortBy)
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)

      const queryString = queryParams.toString()
      const url = `/transactions${queryString ? `?${queryString}` : ''}`
      
      if (isDev) {
        console.log('Fetching transactions from:', url)
      }
      
      const response = await api.get(url)
      
      if (isDev) {
        console.log('API Response:', response)
      }
      
      // Handle response with pagination object
      if (response.data && response.data.transactions && response.data.pagination) {
        if (isDev) {
          console.log('Response with pagination object, length:', response.data.transactions.length)
        }
        transactions.value = Array.isArray(response.data.transactions) ? response.data.transactions : []
        return {
          data: response.data.transactions,
          total: response.data.pagination.totalRecords || 0,
          totalPages: response.data.pagination.totalPages || 1,
          currentPage: response.data.pagination.currentPage || params.page || 1,
          filters: response.data.filters || {}
        }
      }
      // Handle direct data.transactions array
      else if (response.data && Array.isArray(response.data.transactions)) {
        if (isDev) {
          console.log('Direct transactions array response, length:', response.data.transactions.length)
        }
        transactions.value = response.data.transactions
        return {
          data: response.data.transactions,
          total: response.data.transactions.length,
          totalPages: 1,
          currentPage: 1,
          filters: {}
        }
      }
      // Handle array response
      else if (Array.isArray(response.data)) {
        if (isDev) {
          console.log('Direct array response, length:', response.data.length)
        }
        transactions.value = response.data
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
        transactions.value = []
        return { data: [], total: 0, totalPages: 1, currentPage: 1, filters: {} }
      }
    } catch (err) {
      if (isDev) {
        console.error('Error in fetchTransactions:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch transactions')
      transactions.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get transaction by ID
   * @param {string} transactionId - Transaction ID
   */
  const getTransactionById = async (transactionId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Fetching transaction by ID:', transactionId)
      }

      const response = await api.get(`/transactions/${transactionId}`)
      
      if (isDev) {
        console.log('Transaction details:', response)
      }

      // Handle different response structures
      if (response.data) {
        transaction.value = response.data
        return response.data
      } else {
        transaction.value = response
        return response
      }
    } catch (err) {
      if (isDev) {
        console.error('Error fetching transaction by ID:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch transaction details')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get transaction statistics
   * @param {Object} params - Query parameters
   * @param {string} params.startDate - Filter by start date (YYYY-MM-DD)
   * @param {string} params.endDate - Filter by end date (YYYY-MM-DD)
   * @param {string} params.period - Period type (today, week, month, year, custom)
   */
  const getTransactionStatistics = async (params = {}) => {
    statsLoading.value = true
    try {
      // Build query string
      const queryParams = new URLSearchParams()
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)
      if (params.period) queryParams.append('period', params.period)

      const queryString = queryParams.toString()
      const url = `/transactions/statistics${queryString ? `?${queryString}` : ''}`
      
      if (isDev) {
        console.log('Fetching transaction statistics from:', url)
      }

      const response = await api.get(url)
      
      if (isDev) {
        console.log('Statistics response:', response)
      }

      statistics.value = response.data || response
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Error fetching statistics:', err)
      }
      handleError(err, 'Failed to fetch transaction statistics')
      return null
    } finally {
      statsLoading.value = false
    }
  }

  /**
   * Refund specific transaction items (partial refund)
   * @param {string} transactionId - Transaction ID
   * @param {Object} refundData - Refund data
   * @param {Array} refundData.itemIds - Array of transaction item IDs to refund
   * @param {string} refundData.notes - Refund notes/reason
   */
  const refundTransactionItems = async (transactionId, refundData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Partial refund transaction:', transactionId, refundData)
      }

      const response = await api.post(`/transactions/${transactionId}/refund-items`, {
        itemIds: refundData.itemIds,
        notes: refundData.notes
      })

      if (isDev) {
        console.log('Partial refund response:', response)
      }

      showSuccess(response.message || 'Selected items refunded successfully')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Error partially refunding transaction:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to refund selected items')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Refund transaction
   * @param {string} transactionId - Transaction ID
   * @param {Object} refundData - Refund data
   * @param {string} refundData.notes - Refund notes/reason
   */
  const refundTransaction = async (transactionId, refundData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Refunding transaction:', transactionId, refundData)
      }

      const response = await api.post(`/transactions/${transactionId}/refund`, refundData)
      
      if (isDev) {
        console.log('Refund response:', response)
      }

      showSuccess(response.message || 'Transaction refunded successfully')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Error refunding transaction:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to refund transaction')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create an add-on transaction (e.g. sewa handuk) after check-in
   * Uses POST /transactions with item-based payload
   * @param {Object} data
   * @param {string} data.customerType - 'member' | 'non-member'
   * @param {string} [data.customerId] - Member ID (when customerType='member')
   * @param {string} [data.customerName] - Walk-in name (when customerType='non-member')
   * @param {Array}  data.items - [{ itemType, itemId, itemName, quantity }]
   * @param {Array}  data.payments - [{ paymentMethod, amount }]
   * @param {string} [data.notes]
   */
  const createAddonTransaction = async (data) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Creating addon transaction:', data)
      }

      const response = await api.post('/transactions', data)

      if (isDev) {
        console.log('Addon transaction created:', response)
      }

      showSuccess(response.message || 'Transaksi add-on berhasil')
      return response.data
    } catch (err) {
      if (isDev) {
        console.error('Error creating addon transaction:', err)
      }
      error.value = err.message
      handleError(err, 'Gagal membuat transaksi add-on')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    transactions,
    transaction,
    loading,
    error,
    statistics,
    statsLoading,

    // Methods
    createTransaction,
    createAddonTransaction,
    fetchTransactions,
    getTransactionById,
    getTransactionStatistics,
    refundTransaction,
    refundTransactionItems
  }
}
