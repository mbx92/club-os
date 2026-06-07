import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export const useTestTypes = () => {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const testTypes = ref([])
  const testType = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  })

  /**
   * Fetch all test types with pagination
   * @param {Object} params - Query parameters { page, limit, search, category, status }
   */
  const getTestTypes = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page)
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.search) queryParams.append('search', params.search)
      if (params.category) queryParams.append('category', params.category)
      if (params.status) {
        queryParams.append('isActive', params.status === 'active')
      }

      const queryString = queryParams.toString()
      const response = await api.get(`/psychology/test-types${queryString ? '?' + queryString : ''}`)
      
      // Handle paginated response
      if (response.data && Array.isArray(response.data)) {
        testTypes.value = response.data
        pagination.value = {
          page: response.page || params.page || 1,
          limit: response.limit || params.limit || 12,
          total: response.total || response.data.length,
          totalPages: response.totalPages || Math.ceil((response.total || response.data.length) / (params.limit || 12))
        }
      } else if (Array.isArray(response)) {
        testTypes.value = response
        pagination.value.total = response.length
        pagination.value.totalPages = Math.ceil(response.length / (params.limit || 12))
      } else {
        testTypes.value = response.data || []
      }
      
      return response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch test types')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get test type by ID
   * @param {String} testTypeId - The test type ID
   */
  const getTestTypeById = async (testTypeId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/psychology/test-types/${testTypeId}`)
      testType.value = response.data || response
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch test type details')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new test type
   * @param {Object} testTypeData - Test type data
   */
  const createTestType = async (testTypeData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/psychology/test-types', testTypeData)
      showSuccess(response.message || 'Test type created successfully')
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to create test type')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an existing test type
   * @param {String} testTypeId - The test type ID
   * @param {Object} testTypeData - Updated test type data
   */
  const updateTestType = async (testTypeId, testTypeData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.put(`/psychology/test-types/${testTypeId}`, testTypeData)
      showSuccess(response.message || 'Test type updated successfully')
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to update test type')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a test type
   * @param {String} testTypeId - The test type ID
   */
  const deleteTestType = async (testTypeId) => {
    loading.value = true
    error.value = null
    try {
      await api.delete(`/psychology/test-types/${testTypeId}`)
      showSuccess('Test type deleted successfully')
      testTypes.value = testTypes.value.filter(t => t.id !== testTypeId)
    } catch (err) {
      error.value = handleError(err, 'Failed to delete test type')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Validate test questions
   * @param {Object} data - { testTypeCode, questions }
   */
  const validateQuestions = async (data) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/psychology/test-types/validate', data)
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to validate questions')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get category badge class
   * @param {String} category - Test category
   */
  const getCategoryClass = (category) => {
    const classes = {
      personality: 'badge-primary',
      aptitude: 'badge-secondary',
      intelligence: 'badge-accent',
      interest: 'badge-info'
    }
    return classes[category] || 'badge-ghost'
  }

  /**
   * Format duration in minutes
   * @param {Number} minutes - Duration in minutes
   */
  const formatDuration = (minutes) => {
    if (!minutes) return '-'
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  /**
   * Format price to currency
   * @param {Number} price - Price value
   */
  const formatPrice = (price) => {
    if (!price && price !== 0) return '-'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price)
  }

  /**
   * Validate test type form
   * @param {Object} form - Form data
   */
  const validateTestType = (form) => {
    const errors = {}
    if (!form.name?.trim()) errors.name = 'Nama tes wajib diisi'
    if (!form.code?.trim()) errors.code = 'Kode wajib diisi'
    if (!form.estimatedDuration || form.estimatedDuration < 1) errors.estimatedDuration = 'Durasi minimal 1 menit'
    if (!form.questionCount || form.questionCount < 1) errors.questionCount = 'Jumlah soal minimal 1'
    
    return {
      valid: Object.keys(errors).length === 0,
      errors
    }
  }

  return {
    testTypes,
    testType,
    loading,
    error,
    pagination,
    getTestTypes,
    fetchTestTypes: getTestTypes, // alias for backward compatibility
    getTestTypeById,
    createTestType,
    updateTestType,
    deleteTestType,
    validateQuestions,
    validateTestType,
    getCategoryClass,
    formatDuration
  }
}
