import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useAccounts() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const accounts = ref([])
  const account = ref(null)
  const entries = ref([])
  const balance = ref(null)
  const loading = ref(false)
  const actionLoading = ref(false)
  const pagination = ref({ page: 1, limit: 50, total: 0, pages: 0 })

  // ─── Accounts ─────────────────────────────────────────────────────────────

  const fetchAccounts = async (filters = {}) => {
    loading.value = true
    try {
      const params = new URLSearchParams()
      if (filters.type) params.append('type', filters.type)
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive)
      if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod)

      const response = await api.get(`/finance/accounts?${params.toString()}`)
      accounts.value = response.data || []
      return response
    } catch (error) {
      handleError(error, 'Gagal memuat data akun')
      throw error
    } finally {
      loading.value = false
    }
  }

  const fetchAccount = async (id) => {
    loading.value = true
    try {
      const response = await api.get(`/finance/accounts/${id}`)
      account.value = response.data
      return response
    } catch (error) {
      handleError(error, 'Gagal memuat detail akun')
      throw error
    } finally {
      loading.value = false
    }
  }

  const createAccount = async (data) => {
    actionLoading.value = true
    try {
      const response = await api.post('/finance/accounts', data)
      showSuccess('Akun berhasil dibuat')
      accounts.value = [response.data, ...accounts.value]
      return response
    } catch (error) {
      handleError(error, 'Gagal membuat akun')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const updateAccount = async (id, data) => {
    actionLoading.value = true
    try {
      const response = await api.put(`/finance/accounts/${id}`, data)
      showSuccess('Akun berhasil diperbarui')
      account.value = response.data
      const idx = accounts.value.findIndex(a => a.id === id)
      if (idx !== -1) accounts.value[idx] = response.data
      return response
    } catch (error) {
      handleError(error, 'Gagal memperbarui akun')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const deleteAccount = async (id) => {
    actionLoading.value = true
    try {
      await api.delete(`/finance/accounts/${id}`)
      showSuccess('Akun berhasil dihapus')
      accounts.value = accounts.value.filter(a => a.id !== id)
    } catch (error) {
      handleError(error, 'Gagal menghapus akun')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  // ─── Entries / Ledger ─────────────────────────────────────────────────────

  const fetchEntries = async (id, filters = {}) => {
    loading.value = true
    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate)   params.append('endDate', filters.endDate)
      if (filters.type)      params.append('type', filters.type)
      if (filters.status)    params.append('status', filters.status)
      if (filters.page)      params.append('page', filters.page)
      if (filters.limit)     params.append('limit', filters.limit)

      const response = await api.get(`/finance/accounts/${id}/entries?${params.toString()}`)
      entries.value = response.data || []
      pagination.value = response.meta || pagination.value
      return response
    } catch (error) {
      handleError(error, 'Gagal memuat mutasi akun')
      throw error
    } finally {
      loading.value = false
    }
  }

  const fetchBalance = async (id) => {
    try {
      const response = await api.get(`/finance/accounts/${id}/balance`)
      balance.value = response.data
      return response
    } catch (error) {
      handleError(error, 'Gagal memuat saldo akun')
      throw error
    }
  }

  const createAdjustment = async (id, data) => {
    actionLoading.value = true
    try {
      const response = await api.post(`/finance/accounts/${id}/adjustment`, data)
      showSuccess('Penyesuaian berhasil dicatat')
      return response
    } catch (error) {
      handleError(error, 'Gagal membuat penyesuaian')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const processSettlements = async () => {
    actionLoading.value = true
    try {
      const response = await api.post('/finance/accounts/process-settlements')
      showSuccess(`${response.settled || 0} entri settlement diproses`)
      return response
    } catch (error) {
      handleError(error, 'Gagal memproses settlement')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  return {
    accounts, account, entries, balance,
    loading, actionLoading, pagination,
    fetchAccounts, fetchAccount,
    createAccount, updateAccount, deleteAccount,
    fetchEntries, fetchBalance,
    createAdjustment, processSettlements,
  }
}
