import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export const useSessions = () => {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const sessions = ref([])
  const session = ref(null)
  const result = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  /**
   * Fetch all sessions with pagination and filters
   * @param {Object} params - Query parameters { page, limit, status, testTypeId }
   */
  const fetchSessions = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('page', params.page || 1)
      queryParams.append('limit', params.limit || 20)
      if (params.status) queryParams.append('status', params.status)
      if (params.testTypeId) queryParams.append('testTypeId', params.testTypeId)
      if (params.search) queryParams.append('search', params.search)
      if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom)
      if (params.dateTo) queryParams.append('dateTo', params.dateTo)

      const response = await api.get(`/psychology/sessions?${queryParams.toString()}`)
      
      console.log('Sessions API Response:', response)
      console.log('Pagination from API:', response.data.pagination)
      
      sessions.value = response.data.sessions || []
      
      if (response.data.pagination) {
        pagination.value = response.data.pagination
        console.log('Pagination updated:', pagination.value)
      }
      
      return response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch sessions')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get session by ID
   * @param {String} sessionId - The session ID
   */
  const getSessionById = async (sessionId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/psychology/sessions/${sessionId}`)
      session.value = response.data || response
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch session details')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get session result (admin view)
   * @param {String} sessionId - The session ID
   */
  const getSessionResult = async (sessionId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/psychology/sessions/${sessionId}/result`)
      result.value = response.data || response
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch session result')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get print data for session result
   * @param {String} sessionId - The session ID
   */
  const getPrintData = async (sessionId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/psychology/results/${sessionId}/print`)
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch print data')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Verify and calculate scores
   * @param {String} sessionId - The session ID
   * @param {String} notes - Optional verification notes
   */
  const verifyAndCalculate = async (sessionId, notes = '') => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(`/psychology/sessions/${sessionId}/verify`, { notes })
      showSuccess(response.message || 'Scores verified and calculated successfully')
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to verify and calculate scores')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Recalculate scores
   * @param {String} sessionId - The session ID
   */
  const recalculateScores = async (sessionId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(`/psychology/sessions/${sessionId}/recalculate`)
      showSuccess(response.message || 'Scores recalculated successfully')
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to recalculate scores')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get session status badge class
   * @param {String} status - Session status
   */
  const getStatusClass = (status) => {
    const classes = {
      pending: 'badge-ghost',
      in_progress: 'badge-warning',
      completed: 'badge-success',
      verified: 'badge-info',
      expired: 'badge-error'
    }
    return classes[status] || 'badge-ghost'
  }

  /**
   * Get session status label
   * @param {String} status - Session status
   */
  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Belum Mulai',
      in_progress: 'Sedang Berlangsung',
      completed: 'Selesai',
      verified: 'Terverifikasi',
      expired: 'Kadaluarsa'
    }
    return labels[status] || status
  }

  /**
   * Format duration
   * @param {String} startedAt - Start time
   * @param {String} completedAt - Completion time
   */
  const formatDuration = (startedAt, completedAt) => {
    if (!startedAt || !completedAt) return '-'
    const start = new Date(startedAt)
    const end = new Date(completedAt)
    const diffMs = end - start
    const diffMins = Math.floor(diffMs / 60000)
    const diffSecs = Math.floor((diffMs % 60000) / 1000)
    return `${diffMins}m ${diffSecs}s`
  }

  /**
   * Format date time
   * @param {String} date - Date string
   */
  const formatDateTime = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  /**
   * Get score level class
   * @param {String} level - Score level (low/medium/high)
   */
  const getScoreLevelClass = (level) => {
    const classes = {
      low: 'text-error',
      medium: 'text-warning',
      high: 'text-success'
    }
    return classes[level] || 'text-base-content'
  }

  /**
   * Get score level label
   * @param {String} level - Score level
   */
  const getScoreLevelLabel = (level) => {
    const labels = {
      low: 'Rendah',
      medium: 'Sedang',
      high: 'Tinggi'
    }
    return labels[level] || level
  }

  /**
   * Calculate progress percentage
   * @param {Number} answered - Number of answered questions
   * @param {Number} total - Total questions
   */
  const calculateProgress = (answered, total) => {
    if (!total) return 0
    return Math.round((answered / total) * 100)
  }

  return {
    sessions,
    session,
    result,
    loading,
    error,
    pagination,
    fetchSessions,
    getSessionById,
    getSessionResult,
    getPrintData,
    verifyAndCalculate,
    verifyScore: verifyAndCalculate, // alias for backward compatibility
    recalculateScores,
    getStatusClass,
    getStatusLabel,
    formatDuration,
    formatDateTime,
    getScoreLevelClass,
    getScoreLevelLabel,
    calculateProgress
  }
}
