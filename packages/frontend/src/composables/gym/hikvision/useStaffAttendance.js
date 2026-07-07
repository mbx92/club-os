import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useStaffAttendance() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const attendances = ref([])
  const report = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref({ total: 0, page: 1, limit: 50, totalPages: 1 })

  const BASE = '/gym/staff-attendance'

  /**
   * Fetch staff attendance list
   * @param {Object} params - { page, limit, startDate, endDate, userId, status }
   */
  const fetchAttendances = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page)
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)
      if (params.userId) queryParams.append('userId', params.userId)
      if (params.employeeId) queryParams.append('employeeId', params.employeeId)
      if (params.employeeQuery) queryParams.append('employeeQuery', params.employeeQuery)
      if (params.deviceEmployeeId) queryParams.append('deviceEmployeeId', params.deviceEmployeeId)
      if (params.status && params.status !== 'all') queryParams.append('status', params.status)

      const queryString = queryParams.toString()
      const url = `${BASE}${queryString ? `?${queryString}` : ''}`

      const response = await api.get(url)
      attendances.value = response.data || []
      pagination.value = response.pagination || { total: 0, page: 1, limit: 50, totalPages: 1 }
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to fetch staff attendance')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch attendance report summary
   * @param {Object} params - { startDate, endDate, userId? }
   */
  const fetchReport = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)
      if (params.userId) queryParams.append('userId', params.userId)

      const queryString = queryParams.toString()
      const url = `${BASE}/report${queryString ? `?${queryString}` : ''}`

      const response = await api.get(url)
      report.value = response
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to fetch attendance report')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create manual attendance entry
   */
  const createAttendance = async (attendanceData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(BASE, attendanceData)
      showSuccess(response.message || 'Attendance recorded successfully')
      return response.data
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to create attendance')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Export attendance report as Excel/CSV file
   * @param {Object} params - { startDate, endDate }
   */
  const exportReport = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const qp = new URLSearchParams()
      if (params.startDate) qp.append('startDate', params.startDate)
      if (params.endDate) qp.append('endDate', params.endDate)
      const qs = qp.toString()
      const url = `${import.meta.env.VITE_API_URL || ''}${BASE}/report/export${qs ? `?${qs}` : ''}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }

      const blob = await response.blob()

      let filename = `attendance-report-${params.startDate || 'export'}.xlsx`
      const contentDisposition = response.headers.get('content-disposition')
      if (contentDisposition && contentDisposition.includes('filename=')) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match && match[1]) filename = match[1]
      }

      const objectUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(objectUrl)

      showSuccess('File export berhasil didownload')
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to export attendance report')
    } finally {
      loading.value = false
    }
  }

  /**
   * Correct/update attendance entry
   */
  const updateAttendance = async (id, data) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.patch(`${BASE}/${id}`, data)
      showSuccess(response.message || 'Attendance corrected successfully')
      return response.data
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to correct attendance')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    attendances,
    report,
    loading,
    error,
    pagination,
    fetchAttendances,
    fetchReport,
    exportReport,
    createAttendance,
    updateAttendance,
  }
}
