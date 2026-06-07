import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export const usePriceRules = () => {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const priceRules = ref([])
  const priceRule = ref(null)
  const loading = ref(false)
  const error = ref(null)

  /**
   * Fetch all price rules
   * @param {Object} params - Query parameters { isActive, ruleType }
   */
  const fetchPriceRules = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.isActive !== undefined) queryParams.append('isActive', params.isActive)
      if (params.ruleType) queryParams.append('ruleType', params.ruleType)

      const queryString = queryParams.toString()
      const response = await api.get(`/psychology/price-rules${queryString ? '?' + queryString : ''}`)
      priceRules.value = response.data || response || []
      return response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch price rules')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get price rule by ID
   * @param {String} ruleId - The price rule ID
   */
  const getPriceRuleById = async (ruleId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/psychology/price-rules/${ruleId}`)
      priceRule.value = response.data || response
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch price rule details')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Validate promo code
   * @param {String} code - Promo code to validate
   */
  const validatePromoCode = async (code) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/psychology/price-rules/validate', { code })
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Invalid promo code')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new price rule
   * @param {Object} ruleData - Price rule data
   */
  const createPriceRule = async (ruleData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/psychology/price-rules', ruleData)
      showSuccess(response.message || 'Price rule created successfully')
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to create price rule')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an existing price rule
   * @param {String} ruleId - The price rule ID
   * @param {Object} ruleData - Updated price rule data
   */
  const updatePriceRule = async (ruleId, ruleData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.put(`/psychology/price-rules/${ruleId}`, ruleData)
      showSuccess(response.message || 'Price rule updated successfully')
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to update price rule')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Toggle price rule active status
   * @param {String} ruleId - The price rule ID
   */
  const togglePriceRule = async (ruleId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.patch(`/psychology/price-rules/${ruleId}/toggle`)
      showSuccess(response.message || 'Price rule status updated')
      
      // Update local state
      const rule = priceRules.value.find(r => r.id === ruleId)
      if (rule) {
        rule.isActive = !rule.isActive
      }
      
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to toggle price rule')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a price rule
   * @param {String} ruleId - The price rule ID
   */
  const deletePriceRule = async (ruleId) => {
    loading.value = true
    error.value = null
    try {
      await api.delete(`/psychology/price-rules/${ruleId}`)
      showSuccess('Price rule deleted successfully')
      priceRules.value = priceRules.value.filter(r => r.id !== ruleId)
    } catch (err) {
      error.value = handleError(err, 'Failed to delete price rule')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get rule type badge class
   * @param {String} ruleType - Rule type
   */
  const getRuleTypeClass = (ruleType) => {
    const classes = {
      promo_code: 'badge-primary',
      bulk_discount: 'badge-secondary',
      member_discount: 'badge-accent',
      corporate: 'badge-info',
      promotional: 'badge-warning'
    }
    return classes[ruleType] || 'badge-ghost'
  }

  /**
   * Get rule type label
   * @param {String} ruleType - Rule type
   */
  const getRuleTypeLabel = (ruleType) => {
    const labels = {
      promo_code: 'Kode Promo',
      bulk_discount: 'Diskon Bulk',
      member_discount: 'Diskon Member',
      corporate: 'Corporate',
      promotional: 'Promosi'
    }
    return labels[ruleType] || ruleType
  }

  /**
   * Get discount type label
   * @param {String} discountType - Discount type
   */
  const getDiscountTypeLabel = (discountType) => {
    const labels = {
      percentage: 'Persentase',
      fixed: 'Nominal Tetap'
    }
    return labels[discountType] || discountType
  }

  /**
   * Format discount value
   * @param {Number} value - Discount value
   * @param {String} type - Discount type (percentage/fixed)
   */
  const formatDiscountValue = (value, type) => {
    if (type === 'percentage') {
      return `${value}%`
    }
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value)
  }

  /**
   * Check if rule is still valid (not expired)
   * @param {Object} rule - Price rule object
   */
  const isRuleValid = (rule) => {
    if (!rule.validUntil) return rule.isActive
    return rule.isActive && new Date(rule.validUntil) > new Date()
  }

  return {
    priceRules,
    priceRule,
    loading,
    error,
    fetchPriceRules,
    getPriceRuleById,
    validatePromoCode,
    createPriceRule,
    updatePriceRule,
    togglePriceRule,
    deletePriceRule,
    getRuleTypeClass,
    getRuleTypeLabel,
    getDiscountTypeLabel,
    formatDiscountValue,
    isRuleValid
  }
}
