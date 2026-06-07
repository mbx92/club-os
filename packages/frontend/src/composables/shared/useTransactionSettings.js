import { ref, computed } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useAuthStore } from '@/stores/auth'

/**
 * Composable for managing transaction settings (tax and service charge)
 * Provides easy access to tax and service charge configuration from tenant settings
 */
export const useTransactionSettings = () => {
  const api = useApi()
  const authStore = useAuthStore()
  
  const settings = ref(null)
  const loading = ref(false)
  const error = ref(null)

  /**
   * Get transaction settings from auth store (cached)
   */
  const transactionSettings = computed(() => {
    return authStore.user?.tenant?.settings?.transaction || null
  })

  /**
   * Tax configuration
   */
  const taxConfig = computed(() => {
    const txSettings = transactionSettings.value
    if (!txSettings) return null
    
    return {
      taxEnable: txSettings.taxEnable || false,
      taxPercentage: parseFloat(txSettings.taxPercentage || 0),
      taxType: txSettings.taxType || 'percentage'
    }
  })

  /**
   * Rounding configuration
   */
  const roundingConfig = computed(() => {
    const txSettings = transactionSettings.value
    if (!txSettings?.rounding) return { roundingEnable: false, roundingMethod: 'up', roundingValue: 100 }
    return {
      roundingEnable: txSettings.rounding.roundingEnable || false,
      roundingMethod: txSettings.rounding.roundingMethod || 'up',
      roundingValue: Math.max(1, parseInt(txSettings.rounding.roundingValue) || 100)
    }
  })

  /**
   * Check if rounding is enabled
   */
  const isRoundingEnabled = computed(() => roundingConfig.value?.roundingEnable || false)

  /**
   * Service charge configuration
   */
  const serviceChargeConfig = computed(() => {
    const txSettings = transactionSettings.value
    if (!txSettings) {
      console.warn('[useTransactionSettings] No transaction settings found in tenant data')
      return null
    }
    
    // Debug logging
    if (import.meta.env.DEV) {
      console.log('[useTransactionSettings] Service Charge Config:', {
        serviceChargeEnable: txSettings.serviceChargeEnable,
        serviceChargePercentage: txSettings.serviceChargePercentage,
        serviceChargeType: txSettings.serviceChargeType
      })
    }
    
    return {
      serviceChargeEnable: txSettings.serviceChargeEnable || false,
      serviceChargePercentage: parseFloat(txSettings.serviceChargePercentage || 0),
      serviceChargeType: txSettings.serviceChargeType || 'percentage'
    }
  })

  /**
   * Check if tax is enabled
   */
  const isTaxEnabled = computed(() => {
    return taxConfig.value?.taxEnable || false
  })

  /**
   * Check if service charge is enabled
   */
  const isServiceChargeEnabled = computed(() => {
    return serviceChargeConfig.value?.serviceChargeEnable || false
  })

  /**
   * Fetch tax configuration from API
   */
  const fetchTaxConfig = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.get('/transaction-settings/tax')
      const data = response.data
      
      return {
        taxEnable: data.taxEnable,
        taxPercentage: parseFloat(data.taxPercentage || 0),
        taxType: data.taxType
      }
    } catch (err) {
      error.value = err.message || 'Failed to fetch tax configuration'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch service charge configuration from API
   */
  const fetchServiceChargeConfig = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.get('/transaction-settings/service-charge')
      const data = response.data
      
      return {
        serviceChargeEnable: data.serviceChargeEnable,
        serviceChargePercentage: parseFloat(data.serviceChargePercentage || 0),
        serviceChargeType: data.serviceChargeType
      }
    } catch (err) {
      error.value = err.message || 'Failed to fetch service charge configuration'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch both tax and service charge configuration
   */
  const fetchTransactionSettings = async () => {
    loading.value = true
    error.value = null
    
    try {
      const [taxData, serviceChargeData] = await Promise.all([
        fetchTaxConfig(),
        fetchServiceChargeConfig()
      ])
      
      settings.value = {
        tax: taxData,
        serviceCharge: serviceChargeData
      }
      
      return settings.value
    } catch (err) {
      error.value = err.message || 'Failed to fetch transaction settings'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Apply rounding to an amount based on rounding configuration
   * @param {number} amount - Amount before rounding
   * @returns {{ roundingAmount: number, roundedTotal: number }}
   */
  const calculateRounding = (amount) => {
    const cfg = roundingConfig.value
    if (!cfg.roundingEnable || cfg.roundingValue <= 1) {
      return { roundingAmount: 0, roundedTotal: Math.round(amount) }
    }
    const step = cfg.roundingValue
    let rounded
    if (cfg.roundingMethod === 'up') {
      rounded = Math.ceil(amount / step) * step
    } else if (cfg.roundingMethod === 'down') {
      rounded = Math.floor(amount / step) * step
    } else {
      // nearest
      rounded = Math.round(amount / step) * step
    }
    return { roundingAmount: rounded - amount, roundedTotal: rounded }
  }

  /**
   * Calculate tax amount based on configuration
   * @param {number} amount - Base amount to calculate tax from
   * @param {object} config - Tax configuration (optional, uses cached if not provided)
   * @returns {number} Tax amount
   */
  const calculateTax = (amount, config = null) => {
    const taxCfg = config || taxConfig.value
    
    if (!taxCfg || !taxCfg.taxEnable) {
      return 0
    }
    
    if (taxCfg.taxType === 'percentage') {
      return Math.round((amount * taxCfg.taxPercentage) / 100)
    } else {
      return Math.round(taxCfg.taxPercentage)
    }
  }

  /**
   * Calculate service charge amount based on configuration
   * @param {number} amount - Base amount to calculate service charge from
   * @param {object} config - Service charge configuration (optional, uses cached if not provided)
   * @returns {number} Service charge amount
   */
  const calculateServiceCharge = (amount, config = null) => {
    const scCfg = config || serviceChargeConfig.value
    
    if (!scCfg || !scCfg.serviceChargeEnable) {
      return 0
    }
    
    if (scCfg.serviceChargeType === 'percentage') {
      return Math.round((amount * scCfg.serviceChargePercentage) / 100)
    } else {
      return Math.round(scCfg.serviceChargePercentage)
    }
  }

  /**
   * Calculate order total with tax and service charge
   * Used for restaurant orders
   * @param {number} subtotal - Subtotal amount
   * @param {number} voucherDiscount - Voucher discount amount
   * @param {boolean} includeServiceCharge - Whether to include service charge (default: true for restaurant)
   * @returns {object} { subtotal, voucherDiscount, subtotalAfterDiscount, serviceCharge, tax, totalAmount }
   */
  const calculateOrderTotal = (subtotal, voucherDiscount = 0, includeServiceCharge = true) => {
    const subtotalAfterDiscount = subtotal - voucherDiscount
    
    // Calculate service charge (only for restaurant orders)
    let serviceCharge = 0
    if (includeServiceCharge && isServiceChargeEnabled.value) {
      serviceCharge = calculateServiceCharge(subtotalAfterDiscount)
    }
    
    // Calculate tax from subtotal only (NOT including service charge)
    let tax = 0
    if (isTaxEnabled.value) {
      tax = calculateTax(subtotalAfterDiscount)
    }
    
    // Calculate total
    const totalAmount = Math.round(subtotalAfterDiscount + serviceCharge + tax)
    
    return {
      subtotal,
      voucherDiscount,
      subtotalAfterDiscount,
      serviceCharge,
      tax,
      totalAmount
    }
  }

  /**
   * Calculate combined billing total (restaurant + gym items)
   * Service charge only applies to restaurant items
   * @param {number} restaurantSubtotal - Restaurant items subtotal
   * @param {number} gymSubtotal - Gym items subtotal
   * @param {number} voucherDiscount - Total voucher discount
   * @returns {object} Calculation breakdown
   */
  const calculateCombinedTotal = (restaurantSubtotal, gymSubtotal, voucherDiscount = 0) => {
    const subtotal = restaurantSubtotal + gymSubtotal
    
    // Apply voucher discount proportionally
    const voucherRatio = subtotal > 0 ? voucherDiscount / subtotal : 0
    const restaurantDiscount = restaurantSubtotal * voucherRatio
    const restaurantAfterDiscount = restaurantSubtotal - restaurantDiscount
    
    // Service charge ONLY for restaurant items
    let serviceCharge = 0
    if (isServiceChargeEnabled.value && restaurantAfterDiscount > 0) {
      serviceCharge = calculateServiceCharge(restaurantAfterDiscount)
    }
    
    const subtotalAfterDiscount = subtotal - voucherDiscount
    
    // Tax for all items from subtotal only (NOT including service charge)
    let tax = 0
    if (isTaxEnabled.value) {
      tax = calculateTax(subtotalAfterDiscount)
    }
    
    // Total
    const totalAmount = Math.round(subtotalAfterDiscount + serviceCharge + tax)
    
    return {
      subtotal,
      restaurantSubtotal,
      gymSubtotal,
      voucherDiscount,
      subtotalAfterDiscount,
      serviceCharge,
      tax,
      totalAmount
    }
  }

  return {
    // State
    settings,
    loading,
    error,
    
    // Computed
    transactionSettings,
    taxConfig,
    serviceChargeConfig,
    roundingConfig,
    isTaxEnabled,
    isServiceChargeEnabled,
    isRoundingEnabled,
    
    // Methods
    fetchTaxConfig,
    fetchServiceChargeConfig,
    fetchTransactionSettings,
    calculateTax,
    calculateServiceCharge,
    calculateRounding,
    calculateOrderTotal,
    calculateCombinedTotal
  }
}
