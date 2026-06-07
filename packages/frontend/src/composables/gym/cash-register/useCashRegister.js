import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useCashRegister() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const isDev = import.meta.env.DEV

  const unwrapResponse = (response) => response?.data ?? response

  // State
  const currentSession = ref(null)
  const liveSummary = ref(null)
  const session = ref(null)
  const sessionSummary = ref(null)
  const sessions = ref([])
  const pagination = ref({ total: 0, page: 1, limit: 20, totalPages: 0 })
  const dashboard = ref(null)
  const selectedSession = ref(null)
  const shiftReport = ref(null)
  const dailyReport = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const inheritedOrders = ref([])  // orders inherited from previous shift when opening

  /**
   * Get current active cash register session
   * @param {Object} params - { locationId }
   */
  const getCurrentSession = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.locationId) queryParams.append('locationId', params.locationId)

      const qs = queryParams.toString()
      const url = qs ? `/gym/cash-register/current?${qs}` : '/gym/cash-register/current'
      const response = await api.get(url)
      const payload = unwrapResponse(response)

      if (payload) {
        currentSession.value = payload.session || null
        liveSummary.value = payload.liveSummary || null
      } else {
        currentSession.value = null
        liveSummary.value = null
      }

      return payload
    } catch (err) {
      // 404 means no active session — that's normal
      if (err?.response?.status === 404) {
        currentSession.value = null
        liveSummary.value = null
        return null
      }
      if (isDev) console.error('Get current session error:', err)
      error.value = handleError(err, 'Failed to check active session')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Open a new shift
   * @param {Object} data - { shiftName, openingBalance, locationId?, openingNotes? }
   */
  const openShift = async (data) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/gym/cash-register/open', data)
      const payload = unwrapResponse(response)

      currentSession.value = payload
      liveSummary.value = {
        openingBalance: parseFloat(payload.openingBalance) || 0,
        cashIn: 0,
        cashOut: 0,
        expectedCash: parseFloat(payload.openingBalance) || 0
      }

      // Capture inherited orders from previous shift (if any)
      inheritedOrders.value = response.inheritedOrders || []

      showSuccess(response.message || `Shift ${data.shiftName} berhasil dibuka`)
      return payload
    } catch (err) {
      if (isDev) console.error('Open shift error:', err)
      error.value = handleError(err, 'Failed to open shift')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Close an active shift
   * @param {string} sessionId
   * @param {Object} data - { actualCash, closingNotes? }
   */
  const closeShift = async (sessionId, data) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(`/gym/cash-register/${sessionId}/close`, data)
      const payload = unwrapResponse(response)

      // Clear current session
      currentSession.value = null
      liveSummary.value = null

      showSuccess(response.message || 'Shift berhasil ditutup')
      return payload
    } catch (err) {
      if (isDev) console.error('Close shift error:', err)
      error.value = handleError(err, 'Failed to close shift')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get session detail by ID
   * @param {string} sessionId
   */
  const getSessionById = async (sessionId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/gym/cash-register/${sessionId}`)
      const payload = unwrapResponse(response)

      session.value = payload?.session || payload
      sessionSummary.value = payload?.summary || null
      return payload
    } catch (err) {
      if (isDev) console.error('Get session detail error:', err)
      error.value = handleError(err, 'Failed to fetch session details')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * List all cash register sessions (history)
   * @param {Object} params - { page, limit, status, locationId, dateFrom, dateTo, openedById }
   */
  const fetchSessions = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('page', params.page || 1)
      queryParams.append('limit', params.limit || 20)

      if (params.status) queryParams.append('status', params.status)
      if (params.locationId) queryParams.append('locationId', params.locationId)
      if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom)
      if (params.dateTo) queryParams.append('dateTo', params.dateTo)
      if (params.openedById) queryParams.append('openedById', params.openedById)

      const response = await api.get(`/gym/cash-register?${queryParams.toString()}`)
      const payload = unwrapResponse(response)

      if (Array.isArray(payload)) {
        sessions.value = payload
      } else if (payload?.data) {
        sessions.value = Array.isArray(payload.data) ? payload.data : []
        if (payload.pagination) pagination.value = payload.pagination
      } else {
        sessions.value = Array.isArray(payload) ? payload : []
      }

      // Also check top-level pagination from raw response
      if (response?.pagination) pagination.value = response.pagination

      return response
    } catch (err) {
      if (isDev) console.error('Fetch sessions error:', err)
      error.value = handleError(err, 'Failed to fetch sessions')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get petty cash / cashier dashboard
   * @param {Object} params - { locationId?, date?, sessionId? }
   */
  const getDashboard = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.locationId) queryParams.append('locationId', params.locationId)
      if (params.date) queryParams.append('date', params.date)
      if (params.sessionId) queryParams.append('sessionId', params.sessionId)

      const qs = queryParams.toString()
      const url = qs ? `/gym/dashboard/petty-cash?${qs}` : '/gym/dashboard/petty-cash'
      const response = await api.get(url)
      const payload = unwrapResponse(response)

      dashboard.value = payload
      selectedSession.value = payload?.selectedSession || null
      return payload
    } catch (err) {
      if (isDev) console.error('Get petty cash dashboard error:', err)
      error.value = handleError(err, 'Failed to fetch petty cash dashboard')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get full shift report (Report Cashier + Report Gym)
   * @param {string} sessionId
   * @param {string} type - 'all' | 'cashier' | 'gym'
   */
  const getShiftReport = async (sessionId, type = 'all') => {
    loading.value = true
    error.value = null
    try {
      const url = `/gym/cash-register/${sessionId}/report${type !== 'all' ? `?type=${type}` : ''}`
      const response = await api.get(url)
      const payload = unwrapResponse(response)
      shiftReport.value = payload
      if (isDev) console.log('[useCashRegister] Shift report:', payload)
      return payload
    } catch (err) {
      if (isDev) console.error('Get shift report error:', err)
      error.value = handleError(err, 'Gagal memuat laporan shift')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get daily aggregated report
   * @param {Object} params - { date, type, locationId }
   */
  const getDailyReport = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.date) queryParams.append('date', params.date)
      if (params.type && params.type !== 'all') queryParams.append('type', params.type)
      if (params.locationId) queryParams.append('locationId', params.locationId)
      const qs = queryParams.toString()
      const url = qs ? `/gym/cash-register/daily-report?${qs}` : '/gym/cash-register/daily-report'
      const response = await api.get(url)
      const payload = unwrapResponse(response)
      dailyReport.value = payload
      if (isDev) console.log('[useCashRegister] Daily report:', payload)
      return payload
    } catch (err) {
      if (isDev) console.error('Get daily report error:', err)
      error.value = handleError(err, 'Gagal memuat laporan harian')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Print daily report to thermal printer
   * @param {Object} params - { date, type, locationId }
   */
  const printDailyReport = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/gym/cash-register/print-daily-report', {
        date: params.date,
        type: params.type || 'all',
        ...(params.locationId ? { locationId: params.locationId } : {})
      })
      showSuccess(response.message || 'Laporan harian berhasil dicetak')
      return unwrapResponse(response)
    } catch (err) {
      if (isDev) console.error('Print daily report error:', err)
      error.value = handleError(err, 'Gagal mencetak laporan harian')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Print shift report to thermal printer
   * @param {string} sessionId
   */
  const printShiftReport = async (sessionId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/gym/dashboard/petty-cash/print-shift-report', { sessionId })
      showSuccess(response.message || 'Laporan shift berhasil dicetak')
      return unwrapResponse(response)
    } catch (err) {
      if (isDev) console.error('Print shift report error:', err)
      error.value = handleError(err, 'Failed to print shift report')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    currentSession,
    liveSummary,
    session,
    sessionSummary,
    sessions,
    pagination,
    dashboard,
    selectedSession,
    shiftReport,
    dailyReport,
    loading,
    error,
    inheritedOrders,

    // Methods
    getCurrentSession,
    openShift,
    closeShift,
    getSessionById,
    fetchSessions,
    getDashboard,
    getShiftReport,
    printShiftReport,
    getDailyReport,
    printDailyReport
  }
}
