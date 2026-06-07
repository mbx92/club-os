import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useDeviceEmployeeDuplicate() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const BASE = '/integrations/hikvision/device-employees'

  const duplicates = ref([])
  const duplicatesLoading = ref(false)
  const mergeLoading = ref(false)
  const statusLoading = ref(false)
  const lastMergeResult = ref(null)
  const lastStatusResult = ref(null)

  /**
   * GET /device-employees/duplicates
   */
  const fetchDuplicates = async () => {
    duplicatesLoading.value = true
    try {
      const response = await api.get(`${BASE}/duplicates`)
      duplicates.value = response.data || []
      return response
    } catch (err) {
      handleError(err, 'Gagal memuat data duplikat employee')
      throw err
    } finally {
      duplicatesLoading.value = false
    }
  }

  /**
   * POST /device-employees/merge
   * @param {string} keepId
   * @param {string} removeId
   */
  const mergeEmployees = async (keepId, removeId) => {
    mergeLoading.value = true
    lastMergeResult.value = null
    try {
      const response = await api.post(`${BASE}/merge`, { keepId, removeId })
      lastMergeResult.value = response
      showSuccess(response.message || 'Merge berhasil')
      return response
    } catch (err) {
      handleError(err, 'Gagal merge employee')
      throw err
    } finally {
      mergeLoading.value = false
    }
  }

  /**
   * PATCH /device-employees/:id/status
   * @param {string} id
   * @param {string} status  - active | inactive | pending_sync | sync_failed
   * @param {boolean} syncToDevice
   */
  const updateStatus = async (id, status, syncToDevice = true) => {
    statusLoading.value = true
    lastStatusResult.value = null
    try {
      const response = await api.patch(`${BASE}/${id}/status`, { status, syncToDevice })
      lastStatusResult.value = response
      showSuccess(response.message || 'Status diperbarui')
      return response
    } catch (err) {
      handleError(err, 'Gagal update status employee')
      throw err
    } finally {
      statusLoading.value = false
    }
  }

  return {
    duplicates,
    duplicatesLoading,
    mergeLoading,
    statusLoading,
    lastMergeResult,
    lastStatusResult,
    fetchDuplicates,
    mergeEmployees,
    updateStatus,
  }
}
