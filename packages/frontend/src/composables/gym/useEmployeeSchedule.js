import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

/**
 * Composable for Employee Schedule management.
 *
 * Backend API:
 *   Templates (weekly pattern per user):
 *     POST   /gym/employee-schedule-templates              → create (bulk via array or { schedules: [...] })
 *     GET    /gym/employee-schedule-templates?userId=...    → list templates
 *     PUT    /gym/employee-schedule-templates/:id           → update one
 *     DELETE /gym/employee-schedule-templates/:id           → delete one
 *     DELETE /gym/employee-schedule-templates/user/:userId  → delete all for a user
 *
 *   Schedules (concrete per-date entries / overrides):
 *     GET    /gym/employee-schedules              → list (filter: userId, startDate, endDate, isOff, page, limit)
 *     POST   /gym/employee-schedules              → create (single or bulk via schedules[])
 *     PUT    /gym/employee-schedules/:id           → update
 *     DELETE /gym/employee-schedules/:id           → delete one
 *     DELETE /gym/employee-schedules/user/:userId  → delete all for a user
 *
 * Frontend-only:
 *   Presets — named schedule templates stored in localStorage (UI-only grouping / naming).
 *   Can be applied to users via bulk POST to template endpoint.
 */
export function useEmployeeSchedule() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const schedules = ref([])
  const templates = ref([])
  const presets = ref([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref(null)
  const meta = ref(null)

  const BASE = '/gym/employee-schedules'
  const TEMPLATE_BASE = '/gym/employee-schedule-templates'
  const PRESET_STORAGE_KEY = 'gym_schedule_presets'

  // ─── Presets (localStorage — named UI groupings) ──────────────

  const loadPresets = () => {
    try {
      const raw = localStorage.getItem(PRESET_STORAGE_KEY)
      presets.value = raw ? JSON.parse(raw) : []
    } catch {
      presets.value = []
    }
  }

  const _savePresetsToStorage = () => {
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets.value))
    } catch { /* storage full or disabled */ }
  }

  /**
   * Create a named schedule preset (localStorage).
   * @param {{ name: string, description?: string, schedules: Array }} preset
   */
  const createPreset = (preset) => {
    const now = new Date().toISOString()
    const newPreset = {
      id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: preset.name,
      description: preset.description || '',
      schedules: preset.schedules,
      createdAt: now,
      updatedAt: now,
    }
    presets.value.push(newPreset)
    _savePresetsToStorage()
    showSuccess('Preset jadwal berhasil dibuat')
    return newPreset
  }

  /**
   * Update an existing preset (localStorage).
   * @param {string} id
   * @param {{ name?: string, description?: string, schedules?: Array }} data
   */
  const updatePreset = (id, data) => {
    const idx = presets.value.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Preset not found')
    presets.value[idx] = {
      ...presets.value[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    _savePresetsToStorage()
    showSuccess('Preset jadwal berhasil diupdate')
    return presets.value[idx]
  }

  /**
   * Delete a preset (localStorage).
   * @param {string} id
   */
  const deletePreset = (id) => {
    presets.value = presets.value.filter((p) => p.id !== id)
    _savePresetsToStorage()
    showSuccess('Preset jadwal berhasil dihapus')
  }

  /**
   * Apply a preset to one or more employees via bulk POST to template endpoint.
   * For each user, creates schedule template entries from the preset.
   * @param {string} presetId
   * @param {string[]} userIds
   */
  const applyPresetToUsers = async (presetId, userIds) => {
    const preset = presets.value.find((p) => p.id === presetId)
    if (!preset) throw new Error('Preset not found')

    saving.value = true
    error.value = null
    try {
      // Build bulk schedules array: one entry per user × per day
      const bulkSchedules = []
      for (const userId of userIds) {
        for (const s of preset.schedules) {
          bulkSchedules.push({
            userId,
            dayOfWeek: s.dayOfWeek,
            shiftStart: s.isOff ? null : s.shiftStart,
            shiftEnd: s.isOff ? null : s.shiftEnd,
            isOff: !!s.isOff,
            notes: s.notes || null,
          })
        }
      }
      const response = await api.post(TEMPLATE_BASE, { schedules: bulkSchedules })
      showSuccess(response.message || `Jadwal diterapkan ke ${userIds.length} karyawan`)
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Gagal menerapkan jadwal')
      throw err
    } finally {
      saving.value = false
    }
  }

  // ─── Template CRUD (backend) ──────────────────────────────────

  /**
   * Fetch schedule templates for a user.
   * @param {Object} params - { userId? }
   */
  const fetchTemplates = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const qp = new URLSearchParams()
      if (params.userId) qp.append('userId', params.userId)
      const qs = qp.toString()
      const response = await api.get(`${TEMPLATE_BASE}${qs ? `?${qs}` : ''}`)
      templates.value = response.data || []
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Gagal memuat template jadwal')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create schedule template(s).
   * Supports bulk via array or { schedules: [...] }.
   * @param {Object|Array} data
   */
  const createTemplate = async (data) => {
    saving.value = true
    error.value = null
    try {
      const response = await api.post(TEMPLATE_BASE, data)
      showSuccess(response.message || 'Template jadwal berhasil dibuat')
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Gagal membuat template jadwal')
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Update a single schedule template.
   * @param {string} id
   * @param {Object} data
   */
  const updateTemplate = async (id, data) => {
    saving.value = true
    error.value = null
    try {
      const response = await api.put(`${TEMPLATE_BASE}/${id}`, data)
      showSuccess(response.message || 'Template jadwal berhasil diupdate')
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Gagal mengupdate template jadwal')
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Delete a single schedule template.
   * @param {string} id
   */
  const deleteTemplate = async (id) => {
    saving.value = true
    error.value = null
    try {
      const response = await api.delete(`${TEMPLATE_BASE}/${id}`)
      showSuccess(response.message || 'Template jadwal berhasil dihapus')
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Gagal menghapus template jadwal')
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Delete ALL schedule templates for a user.
   * @param {string} userId
   */
  const deleteUserTemplates = async (userId) => {
    saving.value = true
    error.value = null
    try {
      const response = await api.delete(`${TEMPLATE_BASE}/user/${userId}`)
      showSuccess(response.message || 'Semua template jadwal karyawan dihapus')
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Gagal menghapus template jadwal karyawan')
      throw err
    } finally {
      saving.value = false
    }
  }

  // ─── CRUD Operations ─────────────────────────────────────────

  /**
   * Fetch schedules with optional filters.
   * @param {Object} params - { userId?, startDate?, endDate?, isOff?, page?, limit? }
   */
  const fetchSchedules = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const qp = new URLSearchParams()
      if (params.userId) qp.append('userId', params.userId)
      if (params.startDate) qp.append('startDate', params.startDate)
      if (params.endDate) qp.append('endDate', params.endDate)
      if (params.isOff !== undefined && params.isOff !== '') qp.append('isOff', params.isOff)
      if (params.page) qp.append('page', params.page)
      if (params.limit) qp.append('limit', params.limit)

      const qs = qp.toString()
      const response = await api.get(`${BASE}${qs ? `?${qs}` : ''}`)
      schedules.value = response.data || []
      meta.value = response.meta || null
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Gagal memuat jadwal')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Download schedules as Excel using native fetch.
   * @param {Object} params - { userId?, startDate?, endDate?, isOff? }
   */
  const downloadExcel = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const qp = new URLSearchParams()
      if (params.userId) qp.append('userId', params.userId)
      if (params.startDate) qp.append('startDate', params.startDate)
      if (params.endDate) qp.append('endDate', params.endDate)
      if (params.isOff !== undefined && params.isOff !== '') qp.append('isOff', params.isOff)

      const qs = qp.toString()
      const url = `${import.meta.env.VITE_API_URL || ''}/gym/employee-schedules/export${qs ? `?${qs}` : ''}`

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

      let filename = 'jadwal-karyawan.xlsx'
      const contentDisposition = response.headers.get('content-disposition')
      if (contentDisposition && contentDisposition.includes('filename=')) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match && match[1]) {
          filename = match[1]
        }
      }

      const objectUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()

      link.remove()
      window.URL.revokeObjectURL(objectUrl)

      showSuccess('File Excel berhasil didownload')
    } catch (err) {
      error.value = err.message
      handleError(err, 'Gagal mendownload file Excel')
    } finally {
      loading.value = false
    }
  }

  /**
   * Create schedule(s).
   * Send single object or { schedules: [...] } for bulk.
   * @param {Object} data
   */
  const createSchedule = async (data) => {
    saving.value = true
    error.value = null
    try {
      const response = await api.post(BASE, data)
      showSuccess(response.message || 'Jadwal berhasil dibuat')
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Gagal membuat jadwal')
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Update a single schedule entry.
   * @param {string} id
   * @param {Object} data - { shiftStart?, shiftEnd?, isOff?, notes?, ... }
   */
  const updateSchedule = async (id, data) => {
    saving.value = true
    error.value = null
    try {
      const response = await api.put(`${BASE}/${id}`, data)
      showSuccess(response.message || 'Jadwal berhasil diupdate')
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Gagal mengupdate jadwal')
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Delete a single schedule entry.
   * @param {string} id
   */
  const deleteSchedule = async (id) => {
    saving.value = true
    error.value = null
    try {
      const response = await api.delete(`${BASE}/${id}`)
      showSuccess(response.message || 'Jadwal berhasil dihapus')
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Gagal menghapus jadwal')
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Delete ALL schedules for a user.
   * @param {string} userId
   */
  const deleteUserSchedules = async (userId) => {
    saving.value = true
    error.value = null
    try {
      const response = await api.delete(`${BASE}/user/${userId}`)
      showSuccess(response.message || 'Semua jadwal karyawan dihapus')
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Gagal menghapus jadwal karyawan')
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Assign shifts to employees over a date range.
   * Uses POST /gym/employee-schedules/assign-shifts
   *
   * Mode 1 (uniform shift): each assignment has { userId, shiftId, offDays }
   * Mode 2 (per-date):      each assignment has { userId, dates: { 'YYYY-MM-DD': shiftId | 'OFF' } }
   *
   * @param {{ startDate: string, endDate: string, assignments: Array }} payload
   */
  const assignShifts = async (payload) => {
    saving.value = true
    error.value = null
    try {
      const response = await api.post(`${BASE}/assign-shifts`, payload)
      showSuccess(response.message || `Jadwal berhasil dibuat untuk ${payload.assignments.length} karyawan`)
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Gagal membuat jadwal')
      throw err
    } finally {
      saving.value = false
    }
  }

  return {
    // State
    schedules,
    templates,
    presets,
    loading,
    saving,
    error,
    meta,

    // Presets (localStorage — named UI groupings)
    loadPresets,
    createPreset,
    updatePreset,
    deletePreset,
    applyPresetToUsers,

    // Templates (backend API)
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    deleteUserTemplates,

    // Schedules (backend API — concrete per-date entries)
    fetchSchedules,
    downloadExcel,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    deleteUserSchedules,
    assignShifts,
  }
}
