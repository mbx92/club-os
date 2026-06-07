import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useSuppliers() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const suppliers = ref([])
  const supplier = ref(null)
  const loading = ref(false)
  const actionLoading = ref(false)
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  const isDev = import.meta.env.DEV

  /**
   * Fetch all suppliers with filters & pagination
   */
  const fetchSuppliers = async (filters = {}) => {
    loading.value = true
    try {
      const params = new URLSearchParams()
      if (filters.page)      params.append('page', filters.page)
      if (filters.limit)     params.append('limit', filters.limit)
      if (filters.sortBy)    params.append('sortBy', filters.sortBy)
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)
      if (filters.search)    params.append('search', filters.search)
      if (filters.category)  params.append('category', filters.category)
      if (filters.isActive !== undefined && filters.isActive !== '')
        params.append('isActive', filters.isActive)

      const response = await api.get(`/finance/suppliers?${params.toString()}`)

      if (isDev) console.log('[useSuppliers] fetchSuppliers:', response)

      suppliers.value  = response.data || []
      pagination.value = response.pagination || pagination.value
      return response
    } catch (error) {
      handleError(error, 'Gagal memuat data supplier')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch single supplier by ID
   */
  const fetchSupplier = async (id) => {
    loading.value = true
    try {
      const response = await api.get(`/finance/suppliers/${id}`)
      if (isDev) console.log('[useSuppliers] fetchSupplier:', response)
      supplier.value = response.data
      return response.data
    } catch (error) {
      handleError(error, 'Gagal memuat detail supplier')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Create new supplier
   */
  const createSupplier = async (data) => {
    actionLoading.value = true
    try {
      const response = await api.post('/finance/suppliers', data)
      if (isDev) console.log('[useSuppliers] createSupplier:', response)
      showSuccess('Supplier berhasil ditambahkan')
      return response.data
    } catch (error) {
      handleError(error, 'Gagal menambahkan supplier')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  /**
   * Update supplier
   */
  const updateSupplier = async (id, data) => {
    actionLoading.value = true
    try {
      const response = await api.put(`/finance/suppliers/${id}`, data)
      if (isDev) console.log('[useSuppliers] updateSupplier:', response)
      showSuccess('Supplier berhasil diperbarui')
      return response.data
    } catch (error) {
      handleError(error, 'Gagal memperbarui supplier')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  /**
   * Toggle active status
   */
  const toggleSupplierStatus = async (id) => {
    actionLoading.value = true
    try {
      const response = await api.patch(`/finance/suppliers/${id}/toggle-status`)
      if (isDev) console.log('[useSuppliers] toggleStatus:', response)
      showSuccess(response.message || 'Status supplier diperbarui')
      return response.data
    } catch (error) {
      handleError(error, 'Gagal mengubah status supplier')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  /**
   * Delete supplier (soft delete)
   * If supplier is still referenced, backend returns SUPPLIER_IN_USE.
   */
  const deleteSupplier = async (id) => {
    actionLoading.value = true
    try {
      const response = await api.delete(`/finance/suppliers/${id}`)
      if (isDev) console.log('[useSuppliers] deleteSupplier:', response)
      showSuccess('Supplier berhasil dihapus')
      return response
    } catch (error) {
      const errorCode = error?.response?.data?.error || error?.response?.data?.code || ''
      if (errorCode === 'SUPPLIER_IN_USE') {
        handleError(error, 'Supplier masih digunakan dalam pengeluaran. Nonaktifkan supplier saja.')
      } else {
        handleError(error, 'Gagal menghapus supplier')
      }
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  return {
    suppliers,
    supplier,
    loading,
    actionLoading,
    pagination,
    fetchSuppliers,
    fetchSupplier,
    createSupplier,
    updateSupplier,
    toggleSupplierStatus,
    deleteSupplier,
  }
}
