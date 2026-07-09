import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

/**
 * Composable for Finance Transactions
 * GET /api/v1/transactions
 *
 * Response shape:
 * {
 *   data: {
 *     transactions: [...],
 *     pagination: { page, limit, total, totalPages },
 *     filters: { transactionType, status, sortBy, sortOrder }
 *   }
 * }
 */
export function useTransactions() {
  const api = useApi()
  const { handleError, showSuccess } = useNotification()

  const transactions = ref([])
  const transaction  = ref(null)
  const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const loading = ref(false)
  const detailLoading = ref(false)

  /**
   * Fetch transactions
   * @param {Object} params
   * @param {Number} params.page
   * @param {Number} params.limit
   * @param {String} params.transactionType   - 'restaurant' | 'gym_services' | '' (all)
   * @param {String} params.status
   * @param {String} params.sortBy            - 'transactionDate' | 'totalAmount' | ...
   * @param {String} params.sortOrder         - 'ASC' | 'DESC'
   * @param {String} params.startDate
   * @param {String} params.endDate
   * @param {String} params.search
   * @param {String} params.locationId
   */
  const fetchTransactions = async (params = {}) => {
    loading.value = true
    try {
      const q = new URLSearchParams()
      if (params.page)            q.append('page', params.page)
      if (params.limit)           q.append('limit', params.limit)
      if (params.transactionType) q.append('transactionType', params.transactionType)
      if (params.status)          q.append('status', params.status)
      if (params.sortBy)          q.append('sortBy', params.sortBy)
      if (params.sortOrder)       q.append('sortOrder', params.sortOrder)
      if (params.startDate)       q.append('startDate', params.startDate)
      if (params.endDate)         q.append('endDate', params.endDate)
      if (params.search)          q.append('search', params.search)
      if (params.locationId)      q.append('locationId', params.locationId)

      const response = await api.get(`/transactions?${q.toString()}`)
      if (response.success) {
        transactions.value = response.data?.transactions || response.data || []
        pagination.value   = response.data?.pagination   || pagination.value
        return response
      }
    } catch (error) {
      handleError(error, 'Gagal mengambil data transaksi')
    } finally {
      loading.value = false
    }
  }

  const fetchTransactionById = async (id) => {
    detailLoading.value = true
    try {
      const response = await api.get(`/transactions/${id}`)
      if (response.success) {
        transaction.value = response.data?.transaction || response.data || null
        return transaction.value
      }
    } catch (error) {
      handleError(error, 'Gagal mengambil detail transaksi')
    } finally {
      detailLoading.value = false
    }
  }

  /**
   * Cancel transaction — POST /transactions/:id/cancel
   * @param {string} id
   * @param {string} notes
   */
  const cancelTransaction = async (id, notes = '') => {
    loading.value = true
    try {
      const response = await api.post(`/transactions/${id}/cancel`, {
        notes,
        reason: notes,
      })
      if (response.success !== false) {
        showSuccess(response.message || 'Transaksi berhasil dibatalkan')
        await fetchTransactionById(id)
        return response
      }
    } catch (err) {
      const isMissingEndpoint = err?.statusCode === 404
        || err?.status === 404
        || String(err?.message || '').includes('Cannot POST /api/v1/transactions/')

      if (isMissingEndpoint) {
        handleError({ message: 'Endpoint cancel transaksi belum tersedia di backend production' }, 'Gagal membatalkan transaksi')
      } else {
        handleError(err, 'Gagal membatalkan transaksi')
      }
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update payment method — PUT /transactions/:id/payment
   * @param {string} id - Transaction ID
   * @param {string} paymentMethod - New payment method
   * @param {string} bankName - Bank name (optional, for bank transfer/credit card/debit card)
   */
  const updatePaymentMethod = async (id, paymentMethod, bankName = '') => {
    loading.value = true
    try {
      const body = { paymentMethod }
      if (bankName) body.bankName = bankName
      const response = await api.put(`/transactions/${id}/payment`, body)
      if (response.success !== false) {
        showSuccess(response.message || 'Metode pembayaran berhasil diubah')
        return response
      }
    } catch (err) {
      handleError(err, 'Gagal mengubah metode pembayaran')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Full refund — POST /transactions/:id/refund
   * @param {string} id
   * @param {string} notes
   */
  const refundTransaction = async (id, notes = '') => {
    loading.value = true
    try {
      const response = await api.post(`/transactions/${id}/refund`, { notes })
      if (response.success !== false) {
        showSuccess(response.message || 'Refund berhasil')
        // refresh detail
        await fetchTransactionById(id)
        return response
      }
    } catch (err) {
      handleError(err, 'Gagal melakukan refund')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Partial refund per item — POST /transactions/:id/refund-items
   * @param {string} id
   * @param {string[]} itemIds
   * @param {string} notes
   */
  const refundTransactionItems = async (id, itemIds, notes = '') => {
    loading.value = true
    try {
      const response = await api.post(`/transactions/${id}/refund-items`, { itemIds, notes })
      if (response.success !== false) {
        showSuccess(response.message || 'Refund item berhasil')
        await fetchTransactionById(id)
        return response
      }
    } catch (err) {
      handleError(err, 'Gagal melakukan refund item')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    transactions,
    transaction,
    pagination,
    loading,
    detailLoading,
    fetchTransactions,
    fetchTransactionById,
    cancelTransaction,
    refundTransaction,
    refundTransactionItems,
    updatePaymentMethod,
  }
}
