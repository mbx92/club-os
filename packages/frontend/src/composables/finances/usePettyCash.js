import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function usePettyCash() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const funds = ref([])
  const fund = ref(null)
  const transactions = ref([])
  const summary = ref(null)
  const loading = ref(false)
  const actionLoading = ref(false)
  const pagination = ref({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const txPagination = ref({ page: 1, limit: 20, total: 0, totalPages: 0 })

  const isDev = import.meta.env.DEV

  // ─── LIST ────────────────────────────────────────────────────────────────────

  const fetchFunds = async (filters = {}) => {
    loading.value = true
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.locationId) params.append('locationId', filters.locationId)
      if (filters.search) params.append('search', filters.search)
      if (filters.page) params.append('page', filters.page)
      if (filters.limit) params.append('limit', filters.limit)
      if (filters.sortBy) params.append('sortBy', filters.sortBy)
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)

      const response = await api.get(`/finance/petty-cash?${params.toString()}`)
      if (isDev) console.log('[usePettyCash] fetchFunds:', response)

      funds.value = response.data || []
      pagination.value = response.pagination || pagination.value
      return response
    } catch (error) {
      handleError(error, 'Gagal memuat data dana modal')
      throw error
    } finally {
      loading.value = false
    }
  }

  // ─── DETAIL ───────────────────────────────────────────────────────────────────

  const fetchFund = async (id) => {
    loading.value = true
    try {
      const response = await api.get(`/finance/petty-cash/${id}`)
      if (isDev) console.log('[usePettyCash] fetchFund:', response)
      fund.value = response.data
      return response.data
    } catch (error) {
      handleError(error, 'Gagal memuat detail dana modal')
      throw error
    } finally {
      loading.value = false
    }
  }

  // ─── SUMMARY ──────────────────────────────────────────────────────────────────

  const fetchSummary = async (filters = {}) => {
    loading.value = true
    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const response = await api.get(`/finance/petty-cash/summary?${params.toString()}`)
      if (isDev) console.log('[usePettyCash] fetchSummary:', response)
      summary.value = response.data
      return response.data
    } catch (error) {
      handleError(error, 'Gagal memuat ringkasan')
      throw error
    } finally {
      loading.value = false
    }
  }

  // ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

  const fetchTransactions = async (id, filters = {}) => {
    loading.value = true
    try {
      const params = new URLSearchParams()
      if (filters.type) params.append('type', filters.type)
      if (filters.fundSource) params.append('fundSource', filters.fundSource)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.page) params.append('page', filters.page)
      if (filters.limit) params.append('limit', filters.limit)
      if (filters.sortBy) params.append('sortBy', filters.sortBy)
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)

      const response = await api.get(`/finance/petty-cash/${id}/transactions?${params.toString()}`)
      if (isDev) console.log('[usePettyCash] fetchTransactions:', response)
      transactions.value = response.data || []
      txPagination.value = response.pagination || txPagination.value
      return response
    } catch (error) {
      handleError(error, 'Gagal memuat riwayat transaksi')
      throw error
    } finally {
      loading.value = false
    }
  }

  // ─── CREATE ───────────────────────────────────────────────────────────────────

  const createFund = async (data) => {
    actionLoading.value = true
    try {
      const response = await api.post('/finance/petty-cash', data)
      if (isDev) console.log('[usePettyCash] createFund:', response)
      showSuccess('Dana modal berhasil dibuat')
      return response.data
    } catch (error) {
      handleError(error, 'Gagal membuat dana modal')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────────

  const updateFund = async (id, data) => {
    actionLoading.value = true
    try {
      const response = await api.put(`/finance/petty-cash/${id}`, data)
      if (isDev) console.log('[usePettyCash] updateFund:', response)
      showSuccess('Dana modal berhasil diperbarui')
      return response.data
    } catch (error) {
      handleError(error, 'Gagal memperbarui dana modal')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  // ─── DELETE ───────────────────────────────────────────────────────────────────

  const deleteFund = async (id) => {
    actionLoading.value = true
    try {
      const response = await api.delete(`/finance/petty-cash/${id}`)
      if (isDev) console.log('[usePettyCash] deleteFund:', response)
      showSuccess('Dana modal berhasil dihapus')
      return response
    } catch (error) {
      handleError(error, 'Gagal menghapus dana modal')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  // ─── OPERATIONS ───────────────────────────────────────────────────────────────

  const topUp = async (id, data) => {
    actionLoading.value = true
    try {
      const response = await api.post(`/finance/petty-cash/${id}/top-up`, data)
      if (isDev) console.log('[usePettyCash] topUp:', response)
      showSuccess('Top up berhasil')
      return response.data
    } catch (error) {
      handleError(error, 'Gagal melakukan top up')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const payExpense = async (id, data) => {
    actionLoading.value = true
    try {
      const response = await api.post(`/finance/petty-cash/${id}/expense`, data)
      if (isDev) console.log('[usePettyCash] payExpense:', response)
      showSuccess('Pengeluaran dari petty cash berhasil dicatat')
      return response.data
    } catch (error) {
      handleError(error, 'Gagal mencatat pengeluaran')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const salesReturn = async (id, data) => {
    actionLoading.value = true
    try {
      const response = await api.post(`/finance/petty-cash/${id}/sales-return`, data)
      if (isDev) console.log('[usePettyCash] salesReturn:', response)
      showSuccess('Pengembalian penjualan berhasil')
      return response.data
    } catch (error) {
      handleError(error, 'Gagal mencatat pengembalian penjualan')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const adjustment = async (id, data) => {
    actionLoading.value = true
    try {
      const response = await api.post(`/finance/petty-cash/${id}/adjustment`, data)
      if (isDev) console.log('[usePettyCash] adjustment:', response)
      showSuccess('Penyesuaian saldo berhasil')
      return response.data
    } catch (error) {
      handleError(error, 'Gagal melakukan penyesuaian saldo')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const withdrawal = async (id, data) => {
    actionLoading.value = true
    try {
      const response = await api.post(`/finance/petty-cash/${id}/withdrawal`, data)
      if (isDev) console.log('[usePettyCash] withdrawal:', response)
      showSuccess('Penarikan dana berhasil')
      return response.data
    } catch (error) {
      handleError(error, 'Gagal melakukan penarikan')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  return {
    funds,
    fund,
    transactions,
    summary,
    loading,
    actionLoading,
    pagination,
    txPagination,
    fetchFunds,
    fetchFund,
    fetchSummary,
    fetchTransactions,
    createFund,
    updateFund,
    deleteFund,
    topUp,
    payExpense,
    salesReturn,
    adjustment,
    withdrawal,
  }
}
