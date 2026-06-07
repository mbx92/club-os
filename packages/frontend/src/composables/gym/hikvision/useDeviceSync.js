import { ref, computed } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useDeviceSync(deviceId) {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const syncStatus = ref(null)
  const pushStatus = ref(null)
  const loading = ref(false)
  const pushLoading = ref(false)
  const pullLoading = ref(false)
  const importLoading = ref(false)
  const pushStatusLoading = ref(false)
  const error = ref(null)

  const BASE = '/integrations/hikvision/devices'
  const EMP_BASE = '/integrations/hikvision/device-employees'

  // ─── Computed ─────────────────────────────────────────────────

  const hasPendingEmployees = computed(() => {
    const stats = syncStatus.value?.employeeSyncStats
    return (stats?.pending_sync ?? 0) + (stats?.sync_failed ?? 0) > 0
  })

  const pendingCount = computed(() => {
    const stats = syncStatus.value?.employeeSyncStats
    return (stats?.pending_sync ?? 0) + (stats?.sync_failed ?? 0)
  })

  const warnings = computed(() => syncStatus.value?.warnings ?? [])

  // ─── Fetch sync status overview ───────────────────────────────

  const fetchSyncStatus = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`${BASE}/${deviceId}/sync-status`)
      syncStatus.value = response
      return response
    } catch (err) {
      error.value = err.message ?? 'Gagal memuat status sync'
      handleError(err, 'Gagal memuat status sync')
      throw err
    } finally {
      loading.value = false
    }
  }

  // ─── Push pending employees to device ─────────────────────────

  const pushPendingEmployees = async () => {
    pushLoading.value = true
    error.value = null
    try {
      const response = await api.post(`${BASE}/${deviceId}/push-pending-employees`)
      if (response.stats?.synced > 0) {
        showSuccess(`${response.stats.synced} employee berhasil di-push ke device`)
      }
      await fetchSyncStatus()
      return response
    } catch (err) {
      error.value = err.message ?? 'Gagal push employee ke device'
      handleError(err, 'Gagal push employee ke device')
      throw err
    } finally {
      pushLoading.value = false
    }
  }

  // ─── Pull attendance logs from device ─────────────────────────

  const pullAttendanceLogs = async (startDate = null, fullDay = false) => {
    pullLoading.value = true
    error.value = null
    try {
      const params = {}
      if (startDate) params.startDate = startDate
      if (fullDay) params.fullDay = true
      const response = await api.post(`${BASE}/${deviceId}/sync`, {}, { params })
      if (response.processed > 0) {
        showSuccess(`${response.processed} log absensi berhasil ditarik`)
      }
      await fetchSyncStatus()
      return response
    } catch (err) {
      error.value = err.response?.data?.message ?? err.message ?? 'Gagal pull attendance log'
      handleError(err, 'Gagal pull attendance log dari device')
      throw err
    } finally {
      pullLoading.value = false
    }
  }

  // ─── Import employees from device to DB ───────────────────────

  const importFromDevice = async () => {
    importLoading.value = true
    error.value = null
    try {
      const response = await api.post(`${BASE}/${deviceId}/sync-employees`)
      showSuccess(
        response.message ??
          `Import selesai: ${response.stats?.created ?? 0} baru, ${response.stats?.updated ?? 0} diupdate`,
      )
      await fetchSyncStatus()
      return response
    } catch (err) {
      error.value = err.message ?? 'Gagal import employee dari device'
      handleError(err, 'Gagal import employee dari device')
      throw err
    } finally {
      importLoading.value = false
    }
  }

  // ─── Add employee (to device or DB only) ──────────────────────

  const addEmployee = async (payload) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(`${BASE}/${deviceId}/employees`, payload)
      showSuccess(response.message ?? 'Employee berhasil ditambahkan')
      await fetchSyncStatus()
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Gagal menambah employee')
      throw err
    } finally {
      loading.value = false
    }
  }

  // ─── Update device employee status ────────────────────────────

  const setEmployeeStatus = async (deviceEmployeeId, status, syncToDevice = true) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.patch(`${EMP_BASE}/${deviceEmployeeId}/status`, {
        status,
        syncToDevice,
      })
      showSuccess(response.message ?? `Status diupdate ke ${status}`)
      await fetchSyncStatus()
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Gagal update status employee')
      throw err
    } finally {
      loading.value = false
    }
  }

  // ─── Set employee to pending_sync (step 2 of manual sync) ───

  const setPendingSync = async (employeeId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.put(`${BASE}/${deviceId}/employees/${employeeId}`, {
        status: 'pending_sync',
      })
      showSuccess(response.message ?? 'Status diset ke pending_sync — silakan push ke device')
      await fetchSyncStatus()
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Gagal set status ke pending_sync')
      throw err
    } finally {
      loading.value = false
    }
  }

  // ─── Fetch push status ────────────────────────────────────────

  const fetchPushStatus = async () => {
    pushStatusLoading.value = true
    error.value = null
    try {
      const response = await api.get(`${BASE}/${deviceId}/push-status`)
      pushStatus.value = response
      return response
    } catch (err) {
      error.value = err.message ?? 'Gagal memuat push status'
      handleError(err, 'Gagal memuat push status')
      throw err
    } finally {
      pushStatusLoading.value = false
    }
  }

  return {
    // state
    syncStatus,
    pushStatus,
    loading,
    pushLoading,
    pullLoading,
    importLoading,
    pushStatusLoading,
    error,
    // computed
    hasPendingEmployees,
    pendingCount,
    warnings,
    // actions
    fetchSyncStatus,
    pushPendingEmployees,
    pullAttendanceLogs,
    importFromDevice,
    addEmployee,
    setEmployeeStatus,
    setPendingSync,
    fetchPushStatus,
  }
}
