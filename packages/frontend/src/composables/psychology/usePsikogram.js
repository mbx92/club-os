import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

/**
 * Composable untuk mengelola Psikogram
 */
export const usePsikogram = () => {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const psikograms = ref([])
  const psikogram = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  /**
   * Fetch all psikograms with pagination and filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.status - Filter by status: 'draft', 'final'
   * @param {string} params.patientId - Filter by patient
   * @param {string} params.search - Search by participant name
   * @param {string} params.startDate - Filter examDate >= startDate
   * @param {string} params.endDate - Filter examDate <= endDate
   */
  const fetchPsikograms = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      
      if (params.page) queryParams.append('page', params.page)
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.status) queryParams.append('status', params.status)
      if (params.patientId) queryParams.append('patientId', params.patientId)
      if (params.search) queryParams.append('search', params.search)
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)
      if (params.sortBy) queryParams.append('sortBy', params.sortBy)
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)

      const queryString = queryParams.toString()
      const url = `/psychology/psikograms${queryString ? `?${queryString}` : ''}`
      
      const response = await api.get(url)
      
      psikograms.value = response.data || response.psikograms || []
      
      if (response.pagination) {
        pagination.value = response.pagination
      }
      
      return response
    } catch (err) {
      error.value = handleError(err, 'Gagal memuat daftar psikogram')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get psikogram by ID
   * @param {string} id - Psikogram ID
   */
  const getPsikogramById = async (id) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/psychology/psikograms/${id}`)
      psikogram.value = response.data || response
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Gagal memuat detail psikogram')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create new psikogram
   * @param {Object} data - Psikogram data
   */
  const createPsikogram = async (data) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/psychology/psikograms', data)
      showSuccess(response.message || 'Psikogram berhasil dibuat')
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Gagal membuat psikogram')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update existing psikogram
   * @param {string} id - Psikogram ID
   * @param {Object} data - Updated data
   */
  const updatePsikogram = async (id, data) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.put(`/psychology/psikograms/${id}`, data)
      showSuccess(response.message || 'Psikogram berhasil diupdate')
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Gagal mengupdate psikogram')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete psikogram
   * @param {string} id - Psikogram ID
   */
  const deletePsikogram = async (id) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.delete(`/psychology/psikograms/${id}`)
      showSuccess(response.message || 'Psikogram berhasil dihapus')
      return response
    } catch (err) {
      error.value = handleError(err, 'Gagal menghapus psikogram')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get psikogram print data
   * @param {string} id - Psikogram ID
   */
  const getPrintData = async (id) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/psychology/psikograms/${id}/print`)
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Gagal memuat data cetak')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get status badge class
   * @param {string} status - Psikogram status
   */
  const getStatusClass = (status) => {
    const classes = {
      draft: 'badge-warning',
      final: 'badge-success'
    }
    return classes[status] || 'badge-ghost'
  }

  /**
   * Get status label
   * @param {string} status - Psikogram status
   */
  const getStatusLabel = (status) => {
    const labels = {
      draft: 'Draft',
      final: 'Final'
    }
    return labels[status] || status
  }

  /**
   * Get recommendation badge class
   * @param {string} recommendation - Recommendation value
   */
  const getRecommendationClass = (recommendation) => {
    const classes = {
      recommended: 'badge-success',
      not_recommended: 'badge-error'
    }
    return classes[recommendation] || 'badge-ghost'
  }

  /**
   * Get recommendation label
   * @param {string} recommendation - Recommendation value
   */
  const getRecommendationLabel = (recommendation) => {
    const labels = {
      recommended: 'Disarankan',
      not_recommended: 'Tidak Disarankan'
    }
    return labels[recommendation] || '-'
  }

  return {
    psikograms,
    psikogram,
    loading,
    error,
    pagination,
    fetchPsikograms,
    getPsikogramById,
    createPsikogram,
    updatePsikogram,
    deletePsikogram,
    getPrintData,
    getStatusClass,
    getStatusLabel,
    getRecommendationClass,
    getRecommendationLabel
  }
}
