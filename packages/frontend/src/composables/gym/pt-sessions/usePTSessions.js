import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export const usePTSessions = () => {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const sessions = ref([])
  const session = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref({ total: 0, page: 1, limit: 10, totalPages: 0 })

  /**
   * Fetch PT sessions with optional filters
   * @param {Object} params - { page, limit, trainerId, memberId, status, startDate, endDate, sortBy, sortOrder }
   */
  const fetchSessions = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('page', params.page || 1)
      queryParams.append('limit', params.limit || 10)
      queryParams.append('sortBy', params.sortBy || 'sessionDate')
      queryParams.append('sortOrder', params.sortOrder || 'DESC')

      if (params.trainerId) queryParams.append('trainerId', params.trainerId)
      if (params.memberId) queryParams.append('memberId', params.memberId)
      if (params.status) queryParams.append('status', params.status)
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)

      const response = await api.get(`/gym/pt-sessions?${queryParams.toString()}`)

      // Flexible response parsing
      if (Array.isArray(response.data)) {
        sessions.value = response.data
      } else if (response.data?.sessions) {
        sessions.value = response.data.sessions
        if (response.data.pagination) pagination.value = response.data.pagination
      } else if (response.data?.data) {
        sessions.value = Array.isArray(response.data.data) ? response.data.data : []
        if (response.data.pagination) pagination.value = response.data.pagination
      } else {
        sessions.value = []
      }

      return response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch PT sessions')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get single PT session by ID
   * @param {String} sessionId
   */
  const getSessionById = async (sessionId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/gym/pt-sessions/${sessionId}`)
      session.value = response.data || response
      return session.value
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch session details')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new PT session log
   * @param {Object} data - { memberId, trainerId, activeServiceId, sessionDate, duration, status, notes }
   */
  const createSession = async (data) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/gym/pt-sessions', data)
      showSuccess('PT session logged successfully')
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to log PT session')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an existing PT session
   * @param {String} sessionId
   * @param {Object} data
   */
  const updateSession = async (sessionId, data) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.put(`/gym/pt-sessions/${sessionId}`, data)
      showSuccess('PT session updated successfully')
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to update PT session')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a PT session
   * @param {String} sessionId
   */
  const deleteSession = async (sessionId) => {
    loading.value = true
    error.value = null
    try {
      await api.delete(`/gym/pt-sessions/${sessionId}`)
      showSuccess('PT session deleted successfully')
    } catch (err) {
      error.value = handleError(err, 'Failed to delete PT session')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    sessions,
    session,
    loading,
    error,
    pagination,
    fetchSessions,
    getSessionById,
    createSession,
    updateSession,
    deleteSession
  }
}
