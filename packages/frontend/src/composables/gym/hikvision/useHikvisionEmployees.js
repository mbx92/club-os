import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useHikvisionEmployees() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const employees = ref([])
  const deviceEmployees = ref([])
  const availableStaff = ref([])
  const loading = ref(false)
  const error = ref(null)
  const enrollLoading = ref(false)
  const syncLoading = ref(false)
  const syncResult = ref(null)
  const pagination = ref({ total: 0, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPrevPage: false })

  const BASE = '/integrations/hikvision/devices'
  const DB_BASE = '/integrations/hikvision/device-employees'

  // ─── Device Operations ────────────────────────────────────────

  /**
   * List employees on a device (from hardware, enriched with DB info)
   */
  const fetchEmployees = async (deviceId, params = {}) => {
    loading.value = true
    error.value = null
    try {
      const qp = new URLSearchParams()
      if (params.page) qp.append('page', params.page)
      if (params.limit) qp.append('limit', params.limit)
      if (params.search) qp.append('search', params.search)
      const qs = qp.toString()
      const response = await api.get(`${BASE}/${deviceId}/employees${qs ? `?${qs}` : ''}`)
      employees.value = response.data || []
      if (response.pagination) pagination.value = response.pagination
      if (response.availableStaff) availableStaff.value = response.availableStaff
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to fetch employees from device')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Add employee to device + DB
   * @param {string} deviceId
   * @param {Object} employeeData - { employeeNo, name, userId? }
   */
  const addEmployee = async (deviceId, employeeData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(`${BASE}/${deviceId}/employees`, employeeData)
      showSuccess(response.message || 'Employee added to device')
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to add employee to device')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Remove employee from device + DB (also removes all fingerprints)
   */
  const removeEmployee = async (deviceId, employeeNo) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.delete(`${BASE}/${deviceId}/employees/${employeeNo}`)
      showSuccess(response.message || 'Employee removed from device')
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to remove employee from device')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Sync employees from device hardware → database
   */
  const syncEmployees = async (deviceId) => {
    syncLoading.value = true
    syncResult.value = null
    error.value = null
    try {
      const response = await api.post(`${BASE}/${deviceId}/sync-employees`)
      syncResult.value = response.stats || null
      showSuccess(response.message || 'Employees synced from device')
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to sync employees from device')
      throw err
    } finally {
      syncLoading.value = false
    }
  }

  // ─── Database Operations (DeviceEmployees) ────────────────────

  /**
   * List all device employees from database (cross-device)
   * @param {Object} params - { deviceId?, userId?, status?, hasFingerprint?, page?, limit?, search? }
   */
  const fetchDeviceEmployees = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const qp = new URLSearchParams()
      if (params.deviceId) qp.append('deviceId', params.deviceId)
      if (params.userId) qp.append('userId', params.userId)
      if (params.status) qp.append('status', params.status)
      if (params.hasFingerprint !== undefined) qp.append('hasFingerprint', params.hasFingerprint)
      if (params.page) qp.append('page', params.page)
      if (params.limit) qp.append('limit', params.limit)
      if (params.search) qp.append('search', params.search)

      const qs = qp.toString()
      const response = await api.get(`${DB_BASE}${qs ? `?${qs}` : ''}`)
      deviceEmployees.value = response.data || []
      if (response.pagination) pagination.value = response.pagination
      if (response.availableStaff) availableStaff.value = response.availableStaff
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to fetch device employees')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update a device employee record (link user, change name/status)
   * @param {string} id - DeviceEmployee UUID
   * @param {Object} data - { userId?, name?, status? }
   */
  const updateDeviceEmployee = async (id, data) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.put(`${DB_BASE}/${id}`, data)
      showSuccess(response.message || 'Device employee updated')
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to update device employee')
      throw err
    } finally {
      loading.value = false
    }
  }

  // ─── Fingerprint Operations ───────────────────────────────────

  /**
   * Start fingerprint enrollment for an employee
   * @param {string} deviceId
   * @param {string} employeeNo
   * @param {Object} options - { fingerNo?: 1-10, fingerType?: 'normalFP' }
   */
  const enrollFingerprint = async (deviceId, employeeNo, options = {}) => {
    enrollLoading.value = true
    error.value = null
    try {
      const body = {
        fingerNo: options.fingerNo ?? 1,
        fingerType: options.fingerType ?? 'normalFP',
      }
      const response = await api.post(
        `${BASE}/${deviceId}/employees/${employeeNo}/enroll-fingerprint`,
        body
      )
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to start fingerprint enrollment')
      throw err
    } finally {
      enrollLoading.value = false
    }
  }

  /**
   * Delete fingerprint(s) from device for an employee
   * @param {string} deviceId
   * @param {string} employeeNo
   * @param {number[]|null} fingerPrintIDs - specific IDs, or null to delete all
   */
  const deleteFingerprint = async (deviceId, employeeNo, fingerPrintIDs = null) => {
    loading.value = true
    error.value = null
    try {
      const body = fingerPrintIDs ? { fingerPrintIDs } : null
      const response = await api.delete(
        `${BASE}/${deviceId}/employees/${employeeNo}/fingerprint`,
        body
      )
      showSuccess(response.message || 'Fingerprint deleted from device')
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to delete fingerprint')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Release enrollment lock (resume sync)
   * @param {string} deviceId
   */
  const releaseEnrollmentLock = async (deviceId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.delete(`${BASE}/${deviceId}/enrollment-lock`)
      showSuccess(response.message || 'Enrollment lock released')
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to release enrollment lock')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    employees,
    deviceEmployees,
    availableStaff,
    loading,
    error,
    enrollLoading,
    syncLoading,
    syncResult,
    pagination,

    // Device operations
    fetchEmployees,
    addEmployee,
    removeEmployee,
    syncEmployees,

    // DB operations
    fetchDeviceEmployees,
    updateDeviceEmployee,

    // Fingerprint
    enrollFingerprint,
    deleteFingerprint,
    releaseEnrollmentLock,
  }
}
