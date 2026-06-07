import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useStaffMapping() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const staffList = ref([])
  const loading = ref(false)
  const error = ref(null)

  const BASE = '/integrations/hikvision/staff-mapping'

  /**
   * Fetch all staff with device mapping status
   */
  const fetchStaffMapping = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(BASE)
      staffList.value = response.data || []
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to fetch staff mapping')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Assign device employee number to a staff member
   * @param {string} userId - Staff user ID
   * @param {string} deviceEmployeeNo - Device employee number
   */
  const assignDeviceNo = async (userId, deviceEmployeeNo) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.put(`${BASE}/${userId}`, { deviceEmployeeNo })
      showSuccess(response.message || 'Device number assigned successfully')
      return response.data
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to assign device number')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Unassign device employee number from a staff member
   * @param {string} userId - Staff user ID
   */
  const unassignDeviceNo = async (userId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.delete(`${BASE}/${userId}`)
      showSuccess(response.message || 'Device number removed successfully')
      return response
    } catch (err) {
      error.value = err.message
      handleError(err, 'Failed to remove device number')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    staffList,
    loading,
    error,
    fetchStaffMapping,
    assignDeviceNo,
    unassignDeviceNo,
  }
}
