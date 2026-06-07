import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export const usePatients = () => {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const patients = ref([])
  const patient = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  /**
   * Fetch all patients with pagination and filters
   * @param {Object} params - Query parameters { page, limit, search }
   */
  const fetchPatients = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('page', params.page || 1)
      queryParams.append('limit', params.limit || 20)
      if (params.search) queryParams.append('search', params.search)

      const response = await api.get(`/psychology/patients?${queryParams.toString()}`)
      patients.value = response.data || []
      
      if (response.pagination) {
        pagination.value = response.pagination
      }
      
      return response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch patients')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Search patients for autocomplete
   * @param {String} query - Search query
   */
  const searchPatients = async (query) => {
    try {
      const response = await api.get(`/psychology/patients/search?q=${encodeURIComponent(query)}`)
      return response.data || []
    } catch (err) {
      handleError(err, 'Failed to search patients')
      return []
    }
  }

  /**
   * Get patient by ID
   * @param {String} patientId - The patient ID
   */
  const getPatientById = async (patientId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/psychology/patients/${patientId}`)
      patient.value = response.data || response
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch patient details')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get patient history
   * @param {String} patientId - The patient ID
   */
  const getPatientHistory = async (patientId) => {
    // Note: Don't set loading.value here to avoid conflicts when called after getPatientById
    try {
      const response = await api.get(`/psychology/patients/${patientId}/history`)
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch patient history')
      throw err
    }
  }

  /**
   * Create a new patient
   * @param {Object} patientData - Patient data { name, email, phone, birthDate, sex, address, notes }
   */
  const createPatient = async (patientData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/psychology/patients', patientData)
      showSuccess(response.message || 'Patient created successfully')
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to create patient')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an existing patient
   * @param {String} patientId - The patient ID
   * @param {Object} patientData - Updated patient data
   */
  const updatePatient = async (patientId, patientData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.put(`/psychology/patients/${patientId}`, patientData)
      showSuccess(response.message || 'Patient updated successfully')
      
      if (patient.value && patient.value.id === patientId) {
        patient.value = response.data || response
      }
      
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to update patient')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a patient
   * @param {String} patientId - The patient ID
   */
  const deletePatient = async (patientId) => {
    loading.value = true
    error.value = null
    try {
      await api.delete(`/psychology/patients/${patientId}`)
      showSuccess('Patient deleted successfully')
      patients.value = patients.value.filter(p => p.id !== patientId)
    } catch (err) {
      error.value = handleError(err, 'Failed to delete patient')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Format patient name
   * @param {Object} patient - Patient object
   */
  const formatPatientName = (patient) => {
    if (!patient) return '-'
    return patient.name || '-'
  }

  /**
   * Format date of birth
   * @param {String} dateOfBirth - Date string
   */
  const formatBirthDate = (dateOfBirth) => {
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
   * Get sex label
   * @param {String} sex - Sex value (male/female)
   */
  const getSexLabel = (sex) => {
    const labels = {
      male: 'Laki-laki',
      female: 'Perempuan'
    }
    return labels[sex] || sex || '-'
  }

  /**
   * Get gender label (alias for getSexLabel - deprecated, use getSexLabel)
   * @param {String} sex - Sex value
   */
  const getGenderLabel = (sex) => {
    return getSexLabel(sex)
  }

  return {
    patients,
    patient,
    loading,
    error,
    pagination,
    fetchPatients,
    searchPatients,
    getPatientById,
    getPatientHistory,
    createPatient,
    updatePatient,
    deletePatient,
    formatPatientName,
    formatBirthDate,
    calculateAge,
    getGenderLabel,
    getSexLabel
  }
}
