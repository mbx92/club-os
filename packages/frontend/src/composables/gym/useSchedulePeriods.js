import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

/**
 * Composable for Schedule Period management.
 *
 * API base: /gym/schedule-periods
 *
 * Endpoints:
 *   GET    /                                        → list periods
 *   POST   /                                        → create period
 *   GET    /:id                                     → detail period + assignments
 *   PUT    /:id                                     → update period info
 *   DELETE /:id                                     → delete period (cascade)
 *   PUT    /:id/status                              → change status
 *   POST   /:id/assign                              → assign staff
 *   POST   /:id/generate                            → generate from weekly template
 *   DELETE /:id/assignments/:assignmentId           → remove one assignment
 *   DELETE /:id/assignments/user/:userId            → remove all assignments for user
 */
export function useSchedulePeriods() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const periods = ref([])
  const periodDetail = ref(null) // { period, assignments, byDate, summary }
  const loading = ref(false)
  const saving = ref(false)
  const pagination = ref(null)

  const BASE = '/gym/schedule-periods'

  // ─── List Periods ─────────────────────────────────────────────

  /**
   * @param {Object} params - { status?, startDate?, endDate?, page?, limit? }
   */
  const fetchPeriods = async (params = {}) => {
    loading.value = true
    try {
      const qp = new URLSearchParams()
      if (params.status) qp.append('status', params.status)
      if (params.startDate) qp.append('startDate', params.startDate)
      if (params.endDate) qp.append('endDate', params.endDate)
      if (params.page) qp.append('page', params.page)
      if (params.limit) qp.append('limit', params.limit)
      const qs = qp.toString()
      const res = await api.get(`${BASE}${qs ? `?${qs}` : ''}`)
      periods.value = res.data || []
      pagination.value = res.pagination || null
      return res
    } catch (err) {
      handleError(err, 'Gagal memuat daftar periode jadwal')
      throw err
    } finally {
      loading.value = false
    }
  }

  // ─── Period Detail ─────────────────────────────────────────────

  /**
   * @param {string} id - UUID period
   * @param {Object} params - { userId? }
   */
  const fetchPeriodDetail = async (id, params = {}) => {
    loading.value = true
    try {
      const qp = new URLSearchParams()
      if (params.userId) qp.append('userId', params.userId)
      const qs = qp.toString()
      const res = await api.get(`${BASE}/${id}${qs ? `?${qs}` : ''}`)
      periodDetail.value = res.data || null
      return res
    } catch (err) {
      handleError(err, 'Gagal memuat detail periode')
      throw err
    } finally {
      loading.value = false
    }
  }

  // ─── Create Period ────────────────────────────────────────────

  /**
   * @param {{ name: string, startDate: string, endDate: string, notes?: string }} data
   */
  const createPeriod = async (data) => {
    saving.value = true
    try {
      const res = await api.post(BASE, data)
      showSuccess(res.message || 'Periode jadwal berhasil dibuat')
      return res
    } catch (err) {
      handleError(err, 'Gagal membuat periode jadwal')
      throw err
    } finally {
      saving.value = false
    }
  }

  // ─── Update Period ────────────────────────────────────────────

  /**
   * @param {string} id
   * @param {{ name?: string, startDate?: string, endDate?: string, notes?: string }} data
   */
  const updatePeriod = async (id, data) => {
    saving.value = true
    try {
      const res = await api.put(`${BASE}/${id}`, data)
      showSuccess(res.message || 'Periode jadwal berhasil diupdate')
      return res
    } catch (err) {
      handleError(err, 'Gagal mengupdate periode jadwal')
      throw err
    } finally {
      saving.value = false
    }
  }

  // ─── Delete Period ────────────────────────────────────────────

  /**
   * @param {string} id
   */
  const deletePeriod = async (id) => {
    saving.value = true
    try {
      const res = await api.delete(`${BASE}/${id}`)
      showSuccess(res.message || 'Periode jadwal berhasil dihapus')
      return res
    } catch (err) {
      handleError(err, 'Gagal menghapus periode jadwal')
      throw err
    } finally {
      saving.value = false
    }
  }

  // ─── Update Status ────────────────────────────────────────────

  /**
   * @param {string} id
   * @param {'draft' | 'active' | 'closed'} status
   */
  const updatePeriodStatus = async (id, status) => {
    saving.value = true
    try {
      const res = await api.put(`${BASE}/${id}/status`, { status })
      showSuccess(res.message || `Status periode diubah ke "${status}"`)
      return res
    } catch (err) {
      handleError(err, 'Gagal mengubah status periode')
      throw err
    } finally {
      saving.value = false
    }
  }

  // ─── Assign Staff ─────────────────────────────────────────────

  /**
   * Assign staff to period.
   * Mode 1 (per-date): assignments[].dates[]
   * Mode 2 (uniform): assignments[].shiftId + offDays[]
   *
   * @param {string} periodId
   * @param {{ assignments: Array }} data
   */
  const assignStaff = async (periodId, data) => {
    saving.value = true
    try {
      const res = await api.post(`${BASE}/${periodId}/assign`, data)
      showSuccess(res.message || 'Staff berhasil di-assign')
      return res
    } catch (err) {
      handleError(err, 'Gagal assign staff ke periode')
      throw err
    } finally {
      saving.value = false
    }
  }

  // ─── Generate from Template ───────────────────────────────────

  /**
   * @param {string} periodId
   * @param {{ userIds?: string[] }} data
   */
  const generateFromTemplate = async (periodId, data = {}) => {
    saving.value = true
    try {
      const res = await api.post(`${BASE}/${periodId}/generate`, data)
      showSuccess(res.message || 'Jadwal berhasil di-generate dari template')
      return res
    } catch (err) {
      handleError(err, 'Gagal generate jadwal dari template')
      throw err
    } finally {
      saving.value = false
    }
  }

  // ─── Remove Assignment ────────────────────────────────────────

  /**
   * @param {string} periodId
   * @param {string} assignmentId
   */
  const removeAssignment = async (periodId, assignmentId) => {
    saving.value = true
    try {
      const res = await api.delete(`${BASE}/${periodId}/assignments/${assignmentId}`)
      showSuccess(res.message || 'Assignment berhasil dihapus')
      return res
    } catch (err) {
      handleError(err, 'Gagal menghapus assignment')
      throw err
    } finally {
      saving.value = false
    }
  }

  // ─── Remove User Assignments ──────────────────────────────────

  /**
   * @param {string} periodId
   * @param {string} userId
   * @param {{ startDate?: string, endDate?: string }} params
   */
  const removeUserAssignments = async (periodId, userId, params = {}) => {
    saving.value = true
    try {
      const qp = new URLSearchParams()
      if (params.startDate) qp.append('startDate', params.startDate)
      if (params.endDate) qp.append('endDate', params.endDate)
      const qs = qp.toString()
      const res = await api.delete(`${BASE}/${periodId}/assignments/user/${userId}${qs ? `?${qs}` : ''}`)
      showSuccess(res.message || 'Assignment staff berhasil dihapus')
      return res
    } catch (err) {
      handleError(err, 'Gagal menghapus assignment staff')
      throw err
    } finally {
      saving.value = false
    }
  }

  return {
    periods,
    periodDetail,
    loading,
    saving,
    pagination,
    fetchPeriods,
    fetchPeriodDetail,
    createPeriod,
    updatePeriod,
    deletePeriod,
    updatePeriodStatus,
    assignStaff,
    generateFromTemplate,
    removeAssignment,
    removeUserAssignments,
  }
}
