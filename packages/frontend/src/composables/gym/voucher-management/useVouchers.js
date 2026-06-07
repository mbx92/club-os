import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export const useVouchers = () => {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const vouchers = ref([])
  const voucher = ref(null)
  const voucherStatistics = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  })

  /**
   * Fetch vouchers with filters
   * @param {Object} params - Filter parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.status - Status filter: all, active, inactive, expired, upcoming
   * @param {string} params.type - Type filter: percentage or fixed
   * @param {string} params.applicableTo - Applicable to filter: all, membership, product
   * @param {string} params.search - Search query
   * @param {string} params.sortBy - Sort field (default: createdAt)
   * @param {string} params.sortOrder - Sort order: ASC or DESC (default: DESC)
   */
  const fetchVouchers = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      
      // Set default values
      queryParams.append('page', params.page || 1)
      queryParams.append('limit', params.limit || 10)
      queryParams.append('status', params.status || 'all')
      queryParams.append('type', params.type || '')
      queryParams.append('applicableTo', params.applicableTo || '')
      queryParams.append('search', params.search || '')
      queryParams.append('sortBy', params.sortBy || 'createdAt')
      queryParams.append('sortOrder', params.sortOrder || 'DESC')

      const response = await api.get(`/vouchers?${queryParams.toString()}`)
      
      vouchers.value = response.data?.vouchers || []
      pagination.value = response.data?.pagination || {
        total: 0,
        page: params.page || 1,
        limit: params.limit || 10,
        totalPages: 0
      }
      
      return response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch vouchers')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get voucher by ID
   * @param {string} voucherId - Voucher ID
   */
  const getVoucherById = async (voucherId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/vouchers/${voucherId}`)
      voucher.value = response.data?.voucher || response.data || response
      return response.data?.voucher || response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch voucher details')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get voucher statistics and usage history
   * @param {string} voucherId - Voucher ID
   * @param {Object} params - Pagination parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   */
  const getVoucherStatistics = async (voucherId, params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('page', params.page || 1)
      queryParams.append('limit', params.limit || 10)

      const response = await api.get(`/vouchers/${voucherId}/statistics?${queryParams.toString()}`)
      voucherStatistics.value = response.data || response
      return response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch voucher statistics')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Validate voucher code
   * @param {string} voucherCode - Voucher code
   * @param {Object} validationData - Validation data
   * @param {number} validationData.amount - Purchase amount
   * @param {string} validationData.applicableTo - Applicable to: membership or product
   * @param {string} validationData.itemId - Item ID (membership or product)
   */
  const validateVoucher = async (voucherCode, validationData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(`/vouchers/validate/${voucherCode}`, validationData)
      
      if (response?.data?.validation?.isValid) {
        showSuccess('Voucher is valid')
      }
      
      return response
    } catch (err) {
      error.value = handleError(err, 'Failed to validate voucher')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create new voucher
   * @param {Object} voucherData - Voucher data
   * @param {string} voucherData.code - Voucher code (unique)
   * @param {string} voucherData.name - Voucher name
   * @param {string} voucherData.description - Voucher description
   * @param {string} voucherData.type - Voucher type: percentage or fixed
   * @param {number} voucherData.value - Discount value (percentage or fixed amount)
   * @param {number} voucherData.maxDiscountAmount - Max discount amount (for percentage type)
   * @param {number} voucherData.minPurchaseAmount - Minimum purchase amount
   * @param {string} voucherData.applicableTo - Applicable to: all, membership, product
   * @param {Array} voucherData.applicableItems - Applicable item IDs
   * @param {string} voucherData.startDate - Start date (ISO string)
   * @param {string} voucherData.endDate - End date (ISO string)
   * @param {number} voucherData.usageLimit - Total usage limit
   * @param {number} voucherData.userUsageLimit - Per-user usage limit
   * @param {boolean} voucherData.isActive - Is voucher active
   * @param {boolean} voucherData.isPublic - Is voucher public
   */
  const createVoucher = async (voucherData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/vouchers', voucherData)
      showSuccess(response.message || 'Voucher created successfully')
      return response.data?.voucher || response.voucher
    } catch (err) {
      error.value = handleError(err, 'Failed to create voucher')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update voucher
   * @param {string} voucherId - Voucher ID
   * @param {Object} voucherData - Updated voucher data
   */
  const updateVoucher = async (voucherId, voucherData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.put(`/vouchers/${voucherId}`, voucherData)
      showSuccess(response.message || 'Voucher updated successfully')
      
      // Update local state if viewing single voucher
      if (voucher.value && voucher.value.id === voucherId) {
        voucher.value = response.data?.voucher || response.voucher
      }
      
      return response.data?.voucher || response.voucher
    } catch (err) {
      error.value = handleError(err, 'Failed to update voucher')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Toggle voucher status (active/inactive)
   * @param {string} voucherId - Voucher ID
   * @param {boolean} isActive - New active status
   */
  const toggleVoucherStatus = async (voucherId, isActive) => {
    try {
      const response = await api.put(`/vouchers/${voucherId}`, { isActive })
      showSuccess(`Voucher ${isActive ? 'activated' : 'deactivated'} successfully`)
      
      // Update local state
      const voucherInList = vouchers.value.find(v => v.id === voucherId)
      if (voucherInList) {
        voucherInList.isActive = isActive
      }
      if (voucher.value && voucher.value.id === voucherId) {
        voucher.value.isActive = isActive
      }
      
      return response.data?.voucher || response.voucher
    } catch (err) {
      error.value = handleError(err, 'Failed to update voucher status')
      
      // Revert the change if it failed
      const voucherInList = vouchers.value.find(v => v.id === voucherId)
      if (voucherInList) {
        voucherInList.isActive = !isActive
      }
      if (voucher.value && voucher.value.id === voucherId) {
        voucher.value.isActive = !isActive
      }
      
      throw err
    }
  }

  /**
   * Delete voucher
   * @param {string} voucherId - Voucher ID
   */
  const deleteVoucher = async (voucherId) => {
    loading.value = true
    error.value = null
    try {
      await api.delete(`/vouchers/${voucherId}`)
      showSuccess('Voucher deleted successfully')
      
      // Remove from local state
      vouchers.value = vouchers.value.filter(v => v.id !== voucherId)
      if (voucher.value && voucher.value.id === voucherId) {
        voucher.value = null
      }
    } catch (err) {
      error.value = handleError(err, 'Failed to delete voucher')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    vouchers,
    voucher,
    voucherStatistics,
    loading,
    error,
    pagination,

    // Methods
    fetchVouchers,
    getVoucherById,
    getVoucherStatistics,
    validateVoucher,
    createVoucher,
    updateVoucher,
    toggleVoucherStatus,
    deleteVoucher
  }
}
