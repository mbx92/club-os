import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export const useInvitations = () => {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const invitations = ref([])
  const invitation = ref(null)
  const stats = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  /**
   * Fetch all invitations with pagination
   * @param {Object} params - Query parameters { page, limit, isActive }
   */
  const fetchInvitations = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('page', params.page || 1)
      queryParams.append('limit', params.limit || 20)
      if (params.isActive !== undefined) queryParams.append('isActive', params.isActive)

      const response = await api.get(`/psychology/invitations?${queryParams.toString()}`)
      invitations.value = response.data || []
      
      if (response.pagination) {
        pagination.value = response.pagination
      }
      
      return response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch invitations')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get invitation by ID
   * @param {String} invitationId - The invitation ID
   */
  const getInvitationById = async (invitationId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/psychology/invitations/${invitationId}`)
      invitation.value = response.data || response
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch invitation details')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get invitation stats
   * @param {String} invitationId - The invitation ID
   */
  const getInvitationStats = async (invitationId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/psychology/invitations/${invitationId}/stats`)
      stats.value = response.data || response
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch invitation stats')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new invitation
   * @param {Object} invitationData - Invitation data { packageId, maxUses, expiresAt, testExpiryHours, notes }
   */
  const createInvitation = async (invitationData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/psychology/invitations', invitationData)
      showSuccess(response.message || 'Invitation created successfully')
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to create invitation')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an existing invitation
   * @param {String} invitationId - The invitation ID
   * @param {Object} invitationData - Updated invitation data
   */
  const updateInvitation = async (invitationId, invitationData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.put(`/psychology/invitations/${invitationId}`, invitationData)
      showSuccess(response.message || 'Invitation updated successfully')
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to update invitation')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Toggle invitation active status
   * @param {String} invitationId - The invitation ID
   */
  const toggleInvitation = async (invitationId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.patch(`/psychology/invitations/${invitationId}/toggle`)
      showSuccess(response.message || 'Invitation status updated')
      
      // Update local state
      const inv = invitations.value.find(i => i.id === invitationId)
      if (inv) {
        inv.isActive = !inv.isActive
      }
      
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to toggle invitation')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete an invitation
   * @param {String} invitationId - The invitation ID
   */
  const deleteInvitation = async (invitationId) => {
    loading.value = true
    error.value = null
    try {
      await api.delete(`/psychology/invitations/${invitationId}`)
      showSuccess('Invitation deleted successfully')
      invitations.value = invitations.value.filter(i => i.id !== invitationId)
    } catch (err) {
      error.value = handleError(err, 'Failed to delete invitation')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Generate invitation link
   * @param {String} code - Invitation code
   */
  const getInvitationLink = (code) => {
    const baseUrl = window.location.origin
    return `${baseUrl}/psychology/public/invite/${code}`
  }

  /**
   * Copy invitation link to clipboard
   * @param {String} code - Invitation code
   */
  const copyInvitationLink = async (code) => {
    const link = getInvitationLink(code)
    try {
      await navigator.clipboard.writeText(link)
      showSuccess('Link copied to clipboard')
      return true
    } catch (err) {
      handleError(err, 'Failed to copy link')
      return false
    }
  }

  /**
   * Check if invitation is expired
   * @param {String} expiresAt - Expiry date string
   */
  const isExpired = (expiresAt) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  /**
   * Check if invitation has remaining uses
   * @param {Number} usedCount - Number of times used
   * @param {Number} maxUses - Maximum allowed uses
   */
  const hasRemainingUses = (usedCount, maxUses) => {
    if (!maxUses) return true // No limit
    return usedCount < maxUses
  }

  /**
   * Get invitation status
   * @param {Object} invitation - Invitation object
   */
  const getInvitationStatus = (invitation) => {
    if (!invitation.isActive) return 'inactive'
    if (isExpired(invitation.expiresAt)) return 'expired'
    if (!hasRemainingUses(invitation.usedCount, invitation.maxUses)) return 'exhausted'
    return 'active'
  }

  /**
   * Get status badge class
   * @param {String} status - Invitation status
   */
  const getStatusClass = (status) => {
    const classes = {
      active: 'badge-success',
      inactive: 'badge-ghost',
      expired: 'badge-error',
      exhausted: 'badge-warning'
    }
    return classes[status] || 'badge-ghost'
  }

  /**
   * Get status label
   * @param {String} status - Invitation status
   */
  const getStatusLabel = (status) => {
    const labels = {
      active: 'Aktif',
      inactive: 'Nonaktif',
      expired: 'Kadaluarsa',
      exhausted: 'Habis'
    }
    return labels[status] || status
  }

  /**
   * Format date
   * @param {String} date - Date string
   */
  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  /**
   * Format date time
   * @param {String} date - Date string
   */
  const formatDateTime = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return {
    invitations,
    invitation,
    stats,
    loading,
    error,
    pagination,
    fetchInvitations,
    getInvitationById,
    getInvitationStats,
    createInvitation,
    updateInvitation,
    toggleInvitation,
    deleteInvitation,
    getInvitationLink,
    copyInvitationLink,
    isExpired,
    hasRemainingUses,
    getInvitationStatus,
    getStatusClass,
    getStatusLabel,
    formatDate,
    formatDateTime
  }
}
