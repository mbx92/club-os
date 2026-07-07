import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export const useMembers = () => {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  
  const members = ref([])
  const member = ref(null)
  const loading = ref(false)
  const error = ref(null)

  /**
   * Fetch all members with pagination and filters
   * @param {Object} params - Query parameters { page, limit, sortBy, sortOrder, search, membershipStatus, isActive }
   */
  const fetchMembers = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      
      // Set default values
      queryParams.append('page', params.page || 1)
      queryParams.append('limit', params.limit || 10)
      queryParams.append('sortBy', params.sortBy || 'createdAt')
      queryParams.append('sortOrder', params.sortOrder || 'DESC')

      if (params.search) {
        queryParams.append('search', params.search)
      }

      if (params.membershipStatus && params.membershipStatus !== 'all') {
        queryParams.append('membershipStatus', params.membershipStatus)
      }

      // Backend expects `status` (active/inactive/all), not `isActive`.
      const status = params.status
        ?? (params.isActive === true || params.isActive === 'true'
          ? 'active'
          : params.isActive === false || params.isActive === 'false'
            ? 'inactive'
            : params.isActive === 'all' || params.isActive == null || params.isActive === ''
              ? 'all'
              : params.isActive)
      if (status && status !== 'all') {
        queryParams.append('status', status)
      }

      if (params.checkInEligible) {
        queryParams.append('checkInEligible', 'true')
      }

      const response = await api.get(`/gym/members?${queryParams.toString()}`)
      members.value = response.data || []
      return response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch members')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get member by ID
   * @param {String} memberId - The member ID
   */
  const getMemberById = async (memberId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/gym/members/${memberId}`)
      member.value = response.data || response
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch member details')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new member
   * @param {Object} memberData - Member data { firstName, lastName, email, phone, dateOfBirth, gender, address, photoUrl, emergencyContact, emergencyPhone, membershipStatus }
   */
  const createMember = async (memberData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/gym/members', memberData)
      showSuccess(response.message || 'Member created successfully')
      
      // Return the created member and credentials if available
      return {
        member: response.member,
        credentials: response.credentials
      }
    } catch (err) {
      error.value = handleError(err, 'Failed to create member')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an existing member
   * @param {String} memberId - The member ID
   * @param {Object} memberData - Updated member data
   */
  const updateMember = async (memberId, memberData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.put(`/gym/members/${memberId}`, memberData)
      showSuccess(response.message || 'Member updated successfully')
      
      // Update local state if viewing single member
      if (member.value && member.value.id === memberId) {
        member.value = response.member
      }
      
      return response.member
    } catch (err) {
      error.value = handleError(err, 'Failed to update member')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Toggle member active status
   * @param {String} memberId - The member ID
   * @param {Boolean} isActive - New active status
   */
  const toggleMemberStatus = async (memberId, isActive) => {
    try {
      const response = await api.put(`/gym/members/${memberId}`, { isActive })
      showSuccess(`Member ${isActive ? 'activated' : 'deactivated'} successfully`)
      
      // Update local state
      const memberInList = members.value.find(m => m.id === memberId)
      if (memberInList) {
        memberInList.isActive = isActive
      }
      if (member.value && member.value.id === memberId) {
        member.value.isActive = isActive
      }
      
      return response.member
    } catch (err) {
      error.value = handleError(err, 'Failed to update member status')
      
      // Revert the change if it failed
      const memberInList = members.value.find(m => m.id === memberId)
      if (memberInList) {
        memberInList.isActive = !isActive
      }
      if (member.value && member.value.id === memberId) {
        member.value.isActive = !isActive
      }
      
      throw err
    }
  }

  /**
   * Reset member password
   * @param {String} memberId - The member ID
   */
  const resetMemberPassword = async (memberId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(`/gym/members/${memberId}/reset-password`)
      showSuccess('Password reset successfully')
      return response
    } catch (err) {
      error.value = handleError(err, 'Failed to reset member password')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a member (soft delete)
   * @param {String} memberId - The member ID
   */
  const deleteMember = async (memberId) => {
    loading.value = true
    error.value = null
    try {
      await api.delete(`/gym/members/${memberId}`)
      showSuccess('Member deleted successfully')
      
      // Remove from local state
      members.value = members.value.filter(m => m.id !== memberId)
      if (member.value && member.value.id === memberId) {
        member.value = null
      }
    } catch (err) {
      error.value = handleError(err, 'Failed to delete member')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Format member full name
   * @param {Object} member - Member object
   */
  const formatMemberName = (member) => {
    if (!member) return '-'
    return `${member.firstName || ''} ${member.lastName || ''}`.trim() || '-'
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
   * Get membership status badge class
   * @param {String} status - Membership status
   */
  const getMembershipStatusClass = (status) => {
    const statusClasses = {
      active: 'badge-success',
      inactive: 'badge-ghost',
      suspended: 'badge-warning',
      expired: 'badge-error'
    }
    return statusClasses[status] || 'badge-ghost'
  }

  /**
   * Get membership status label
   * @param {String} status - Membership status
   */
  const getMembershipStatusLabel = (status) => {
    const statusLabels = {
      active: 'Active',
      inactive: 'Inactive',
      suspended: 'Suspended',
      expired: 'Expired'
    }
    return statusLabels[status] || status
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

  return {
    members,
    member,
    loading,
    error,
    fetchMembers,
    getMemberById,
    createMember,
    updateMember,
    toggleMemberStatus,
    resetMemberPassword,
    deleteMember,
    formatMemberName,
    formatDateOfBirth,
    getMembershipStatusClass,
    getMembershipStatusLabel,
    calculateAge
  }
}
