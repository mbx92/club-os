import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useShareholders() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const shareholders = ref([])
  const meta = ref({ total: 0, activeTotal: 0, isValid: false })
  const loading = ref(false)
  const reportData = ref(null)
  const reportLoading = ref(false)

  const fetchShareholders = async () => {
    loading.value = true
    try {
      const response = await api.get('/finance/shareholders')
      if (response.success) {
        shareholders.value = response.data
        meta.value = response.meta ?? { total: 0, activeTotal: 0, isValid: false }
      }
      return response
    } catch (error) {
      handleError(error, 'Gagal memuat data shareholder')
      throw error
    } finally {
      loading.value = false
    }
  }

  const createShareholder = async (payload) => {
    loading.value = true
    try {
      const response = await api.post('/finance/shareholders', payload)
      if (response.success) {
        showSuccess('Shareholder berhasil ditambahkan')
        await fetchShareholders()
      }
      return response
    } catch (error) {
      handleError(error, 'Gagal menambahkan shareholder')
      throw error
    } finally {
      loading.value = false
    }
  }

  const updateShareholder = async (id, payload) => {
    loading.value = true
    try {
      const response = await api.put(`/finance/shareholders/${id}`, payload)
      if (response.success) {
        showSuccess('Shareholder berhasil diperbarui')
        await fetchShareholders()
      }
      return response
    } catch (error) {
      handleError(error, 'Gagal memperbarui shareholder')
      throw error
    } finally {
      loading.value = false
    }
  }

  const deleteShareholder = async (id) => {
    loading.value = true
    try {
      const response = await api.delete(`/finance/shareholders/${id}`)
      if (response.success) {
        showSuccess('Shareholder berhasil dihapus')
        await fetchShareholders()
      }
      return response
    } catch (error) {
      handleError(error, 'Gagal menghapus shareholder')
      throw error
    } finally {
      loading.value = false
    }
  }

  const reorderShareholders = async (items) => {
    try {
      const response = await api.put('/finance/shareholders/reorder', items)
      if (response.success) {
        showSuccess('Urutan berhasil disimpan')
        await fetchShareholders()
      }
      return response
    } catch (error) {
      handleError(error, 'Gagal menyimpan urutan')
      throw error
    }
  }

  const fetchShareholderReport = async (params) => {
    reportLoading.value = true
    try {
      const response = await api.get('/reports/finance/shareholder', { params })
      if (response.success) {
        reportData.value = response.data
      }
      return response
    } catch (error) {
      handleError(error, 'Gagal memuat laporan distribusi')
      throw error
    } finally {
      reportLoading.value = false
    }
  }

  return {
    shareholders,
    meta,
    loading,
    reportData,
    reportLoading,
    fetchShareholders,
    createShareholder,
    updateShareholder,
    deleteShareholder,
    reorderShareholders,
    fetchShareholderReport,
  }
}
