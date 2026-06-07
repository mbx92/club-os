import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'
import { useAuthStore } from '@/stores/auth'

export const useTrainers = () => {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const authStore = useAuthStore()
  
  const trainers = ref([])
  const trainer = ref(null)
  const loading = ref(false)
  const error = ref(null)

  /**
   * Fetch all trainers with pagination and filters
   * @param {Object} params - Query parameters { page, limit, sortBy, sortOrder, search, status, specialization }
   */
  const fetchTrainers = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      
      // Set default values
      queryParams.append('page', params.page || 1)
      queryParams.append('limit', params.limit || 10)
      queryParams.append('sortBy', params.sortBy || 'createdAt')
      queryParams.append('sortOrder', params.sortOrder || 'DESC')
      queryParams.append('search', params.search || '')
      queryParams.append('status', params.status || 'all')
      queryParams.append('specialization', params.specialization || '')

      const response = await api.get(`/gym/trainers?${queryParams.toString()}`)
      
      // Handle different response structures
      if (response.data) {
        // Check if data is directly an array or nested
        trainers.value = Array.isArray(response.data) 
          ? response.data 
          : (response.data.trainers || response.data.data || [])
      } else {
        trainers.value = []
      }
      
      return response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch trainers')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get trainer by ID
   * @param {String} trainerId - The trainer ID
   */
  const getTrainerById = async (trainerId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/gym/trainers/${trainerId}`)
      trainer.value = response.data || response
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch trainer details')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get trainer commissions
   * @param {String} trainerId - The trainer ID
   * @param {Object} params - Query parameters { page, limit, status, startDate, endDate }
   */
  const getTrainerCommissions = async (trainerId, params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      
      queryParams.append('page', params.page || 1)
      queryParams.append('limit', params.limit || 10)
      if (params.status) queryParams.append('status', params.status)
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)

      const response = await api.get(`/gym/trainers/${trainerId}/commissions?${queryParams.toString()}`)
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch trainer commissions')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new trainer
   * @param {Object} trainerData - Trainer data
   */
  const createTrainer = async (trainerData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/gym/trainers', trainerData)
      showSuccess(response.message || 'Trainer created successfully')
      
      // Return the created trainer and credentials if available
      return {
        trainer: response.data?.trainer || response.trainer,
        credentials: response.data?.credentials || response.credentials
      }
    } catch (err) {
      error.value = handleError(err, 'Failed to create trainer')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an existing trainer
   * @param {String} trainerId - The trainer ID
   * @param {Object} trainerData - Updated trainer data
   */
  const updateTrainer = async (trainerId, trainerData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.put(`/gym/trainers/${trainerId}`, trainerData)
      showSuccess(response.message || 'Trainer updated successfully')
      
      // Update local state if viewing single trainer
      if (trainer.value && trainer.value.id === trainerId) {
        trainer.value = response.data || response
      }
      
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to update trainer')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Toggle trainer active status
   * @param {String} trainerId - The trainer ID
   * @param {Boolean} isActive - New active status
   */
  const toggleTrainerStatus = async (trainerId, isActive) => {
    try {
      const response = await api.put(`/gym/trainers/${trainerId}`, { isActive })
      showSuccess(`Trainer ${isActive ? 'activated' : 'deactivated'} successfully`)
      
      // Update local state
      const trainerInList = trainers.value.find(t => t.id === trainerId)
      if (trainerInList) {
        trainerInList.isActive = isActive
      }
      if (trainer.value && trainer.value.id === trainerId) {
        trainer.value.isActive = isActive
      }
      
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to update trainer status')
      
      // Revert the change if it failed
      const trainerInList = trainers.value.find(t => t.id === trainerId)
      if (trainerInList) {
        trainerInList.isActive = !isActive
      }
      if (trainer.value && trainer.value.id === trainerId) {
        trainer.value.isActive = !isActive
      }
      
      throw err
    }
  }

  /**
   * Reset trainer password
   * @param {String} trainerId - The trainer ID
   */
  const resetTrainerPassword = async (trainerId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(`/gym/trainers/${trainerId}/reset-password`)
      showSuccess('Password reset successfully')
      return response
    } catch (err) {
      error.value = handleError(err, 'Failed to reset trainer password')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Pay commission
   * @param {String} trainerId - The trainer ID
   * @param {String} commissionId - The commission ID
   * @param {Object} paymentData - Payment data { paymentMethod, notes }
   */
  const payCommission = async (trainerId, commissionId, paymentData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(`/gym/trainers/${trainerId}/commissions/${commissionId}/pay`, paymentData)
      showSuccess('Commission paid successfully')
      return response
    } catch (err) {
      error.value = handleError(err, 'Failed to pay commission')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a trainer (soft delete)
   * @param {String} trainerId - The trainer ID
   */
  const deleteTrainer = async (trainerId) => {
    loading.value = true
    error.value = null
    try {
      await api.delete(`/gym/trainers/${trainerId}`)
      showSuccess('Trainer deleted successfully')
      
      // Remove from local state
      trainers.value = trainers.value.filter(t => t.id !== trainerId)
      if (trainer.value && trainer.value.id === trainerId) {
        trainer.value = null
      }
    } catch (err) {
      error.value = handleError(err, 'Failed to delete trainer')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Format trainer full name
   * @param {Object} trainer - Trainer object
   */
  const formatTrainerName = (trainer) => {
    if (!trainer) return '-'
    return `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim() || '-'
  }

  /**
   * Format date of birth
   * @param {String} dateOfBirth - Date string
   */
  const formatDateOfBirth = (dateOfBirth) => {
    if (!dateOfBirth) return '-'
    return new Date(dateOfBirth).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  /**
   * Calculate age from date of birth
   * @param {String} dateOfBirth - Date string
   */
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  /**
   * Format specializations array to string
   * @param {Array} specializations - Array of specialization strings
   */
  const formatSpecializations = (specializations) => {
    if (!specializations || !Array.isArray(specializations) || specializations.length === 0) {
      return '-'
    }
    return specializations.map(s => s.replace(/_/g, ' ')).join(', ')
  }

  /**
   * Get commission type label
   * @param {String} type - Commission type
   */
  const getCommissionTypeLabel = (type) => {
    const types = {
      percentage: 'Percentage',
      fixed: 'Fixed Amount',
      per_session: 'Per Session'
    }
    return types[type] || type
  }

  /**
   * Format commission value
   * @param {String|Number} value - Commission value
   * @param {String} type - Commission type
   */
  const formatCommissionValue = (value, type) => {
    if (!value && value !== 0) return '-'
    if (type === 'percentage') {
      return `${value}%`
    }
    const currencySettings = authStore.user?.tenant?.settings?.transaction?.currency
    const symbol = currencySettings?.currencySymbol || currencySettings?.defaultCurrency || 'Rp'
    const formatted = new Intl.NumberFormat('id-ID').format(parseFloat(value) || 0)
    return `${symbol} ${formatted}`
  }

  /**
   * Format availability schedule
   * @param {Object} availability - Availability object
   */
  const formatAvailability = (availability) => {
    if (!availability || typeof availability !== 'object') {
      return {}
    }
    return availability
  }

  /**
   * Get available days count
   * @param {Object} availability - Availability object
   */
  const getAvailableDaysCount = (availability) => {
    if (!availability || typeof availability !== 'object') {
      return 0
    }
    return Object.keys(availability).filter(day => {
      const slots = availability[day]
      return Array.isArray(slots) && slots.length > 0
    }).length
  }

  return {
    trainers,
    trainer,
    loading,
    error,
    fetchTrainers,
    getTrainerById,
    getTrainerCommissions,
    createTrainer,
    updateTrainer,
    toggleTrainerStatus,
    resetTrainerPassword,
    payCommission,
    deleteTrainer,
    formatTrainerName,
    formatDateOfBirth,
    calculateAge,
    formatSpecializations,
    getCommissionTypeLabel,
    formatCommissionValue,
    formatAvailability,
    getAvailableDaysCount
  }
}
