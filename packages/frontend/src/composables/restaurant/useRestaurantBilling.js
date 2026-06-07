import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'
import { useSubscriptionStore } from '@/stores/subscription'

export function useRestaurantBilling() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const subscriptionStore = useSubscriptionStore()
  const isDev = import.meta.env.DEV

  // State
  const transaction = ref(null)
  const receipt = ref(null)
  const voucherValidation = ref(null)
  const loading = ref(false)
  const error = ref(null)

  /**
   * Check if combined billing feature is enabled
   * @returns {boolean}
   */
  const isCombinedBillingEnabled = () => {
    // Feature lives under `features.transactions.combinedBilling`
    return subscriptionStore.hasFeature('transactions', 'combinedBilling')
  }

  /**
   * Create a combined transaction (membership + products)
   * @param {Object} transactionData - Transaction data
   * @param {string} transactionData.customerId - Customer/Member ID
   * @param {string} transactionData.customerType - 'member' or 'walk-in'
   * @param {string} transactionData.customerName - Customer name
   * @param {string} transactionData.customerPhone - Customer phone
   * @param {string} transactionData.locationId - Location ID
   * @param {string} transactionData.tableId - Table ID (optional)
   * @param {string} transactionData.orderType - Order type
   * @param {Array} transactionData.items - Items array (membership + products)
   * @param {Array} transactionData.payments - Payment methods
   * @param {string} transactionData.voucherCode - Voucher code (optional)
   * @param {string} transactionData.notes - Transaction notes
   */
  const createCombinedTransaction = async (transactionData) => {
    loading.value = true
    error.value = null

    try {
      // Check feature flag
      if (!isCombinedBillingEnabled()) {
        throw new Error('Combined billing feature not available in your subscription plan')
      }

      const response = await api.post('/restaurant/billing/combined', transactionData)
      transaction.value = response.data
      showSuccess('Transaction completed successfully')
      return response.data
    } catch (err) {
      if (isDev) console.error('Create combined transaction error:', err)
      error.value = err.message
      handleError(err, 'Failed to create combined transaction')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get transaction receipt
   * @param {string} transactionId - Transaction ID
   */
  const getTransactionReceipt = async (transactionId) => {
    loading.value = true
    error.value = null

    try {
      const response = await api.get(`/restaurant/billing/receipt/${transactionId}`)
      receipt.value = response.data
      return response.data
    } catch (err) {
      if (isDev) console.error('Get transaction receipt error:', err)
      error.value = err.message
      handleError(err, 'Failed to get transaction receipt')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Validate voucher for combined billing
   * @param {Object} voucherData - Voucher validation data
   * @param {string} voucherData.code - Voucher code
   * @param {number} voucherData.subtotal - Transaction subtotal
   * @param {string} voucherData.customerId - Customer ID (optional)
   * @param {Array} voucherData.itemTypes - Item types in cart ['membership', 'product']
   */
  const validateVoucherForBilling = async (voucherData) => {
    loading.value = true
    error.value = null

    try {
      const response = await api.post('/restaurant/billing/validate-voucher', voucherData)
      voucherValidation.value = response.data
      return response.data
    } catch (err) {
      if (isDev) console.error('Validate voucher error:', err)
      error.value = err.message
      voucherValidation.value = null
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get transaction history
   * @param {Object} params - Query parameters
   */
  const getTransactionHistory = async (params = {}) => {
    loading.value = true
    error.value = null

    try {
      const queryParams = new URLSearchParams()
      if (params.customerId) queryParams.append('customerId', params.customerId)
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)
      if (params.page) queryParams.append('page', params.page)
      if (params.perPage) queryParams.append('perPage', params.perPage)

      const response = await api.get(`/restaurant/billing/transactions?${queryParams.toString()}`)
      return response.data
    } catch (err) {
      if (isDev) console.error('Get transaction history error:', err)
      error.value = err.message
      handleError(err, 'Failed to get transaction history')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Cancel transaction
   * @param {string} transactionId - Transaction ID
   * @param {string} reason - Cancellation reason
   */
  const cancelTransaction = async (transactionId, reason) => {
    loading.value = true
    error.value = null

    try {
      const response = await api.post(`/restaurant/billing/transactions/${transactionId}/cancel`, { reason })
      showSuccess('Transaction cancelled successfully')
      return response.data
    } catch (err) {
      if (isDev) console.error('Cancel transaction error:', err)
      error.value = err.message
      handleError(err, 'Failed to cancel transaction')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Format currency
   * @param {number} amount - Amount to format
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  /**
   * Calculate transaction totals
   * @param {Array} membershipItems - Membership items
   * @param {Array} productItems - Product items
   * @param {Object} voucher - Applied voucher
   */
  const calculateTotals = (membershipItems = [], productItems = [], voucher = null) => {
    // Coerce values to numbers to avoid NaN from string prices
    const membershipSubtotal = membershipItems.reduce((sum, item) => {
      const price = Number(item?.price || 0)
      return sum + (isNaN(price) ? 0 : price)
    }, 0)
    const productSubtotal = productItems.reduce((sum, item) => {
      const price = Number(item?.price || 0)
      const qty = Number(item?.quantity || 1)
      return sum + ((isNaN(price) ? 0 : price) * (isNaN(qty) ? 1 : qty))
    }, 0)
    const subtotal = (membershipSubtotal || 0) + (productSubtotal || 0)

    let discount = 0
    if (voucher) {
      const dType = voucher.discountType || voucher.type
      const dValue = Number(voucher.discountValue ?? voucher.value ?? 0)
      if (dType === 'percentage') {
        discount = subtotal * (dValue / 100)
        const maxDisc = Number(voucher.maxDiscount ?? voucher.maxDiscountAmount ?? 0)
        if (maxDisc > 0) {
          discount = Math.min(discount, maxDisc)
        }
      } else {
        discount = isNaN(dValue) ? 0 : dValue
      }
    }

    // Tax calculation (use tenant settings if available)
    let tax = 0
    let serviceCharge = 0

    try {
      const authStore = useAuthStore()
      const txSettings = authStore.user?.tenant?.settings?.transaction || {}

      const taxEnabled = !!txSettings.taxEnable
      const taxPercentage = parseFloat(txSettings.taxPercentage || 0)
      const taxType = txSettings.taxType || 'percentage'

      const scEnabled = !!txSettings.serviceChargeEnable
      const scPercentage = parseFloat(txSettings.serviceChargePercentage || 0)
      const scType = txSettings.serviceChargeType || 'percentage'

      // Apply Service charge ONLY to the product subtotal (not membership)
      if (scEnabled) {
        // Apportion discount for product subtotal vs total
        const productDiscountRatio = subtotal > 0 ? (productSubtotal / subtotal) : 0
        const productDiscount = discount * productDiscountRatio
        const productAfterDiscount = Math.max(0, productSubtotal - productDiscount)

        if (scType === 'percentage') {
          serviceCharge = (productAfterDiscount * scPercentage) / 100
        } else if (scType === 'fixed') {
          // If fixed, we arbitrarily decide whether to fully charge the fixed amount. Assuming yes, but proportionally.
          serviceCharge = scPercentage * productDiscountRatio
        }
      }

      if (taxEnabled) {
        const afterDiscount = Math.max(0, subtotal - discount)
        if (taxType === 'percentage') {
          // Note: Tax does not typically include the service charge base in this region per generic requirements, but if it does, add serviceCharge here.
          tax = (afterDiscount * taxPercentage) / 100
        } else if (taxType === 'fixed') {
          tax = parseFloat(txSettings.taxAmount || 0) || 0
        }
      }
    } catch (e) {
      // If anything fails, leave tax/SC as 0
      tax = 0
      serviceCharge = 0
    }

    // Ensure numbers and round to nearest integer (IDR)
    const finalMembership = Math.round(membershipSubtotal || 0)
    const finalProduct = Math.round(productSubtotal || 0)
    const finalSubtotal = Math.round(subtotal || 0)
    const finalDiscount = Math.round(discount || 0)
    const finalTax = Math.round(tax || 0)
    const finalServiceCharge = Math.round(serviceCharge || 0)
    const total = Math.max(0, finalSubtotal - finalDiscount + finalTax + finalServiceCharge)

    return {
      membershipSubtotal: finalMembership,
      productSubtotal: finalProduct,
      subtotal: finalSubtotal,
      discount: finalDiscount,
      tax: finalTax,
      serviceCharge: finalServiceCharge,
      total
    }
  }

  return {
    // State
    transaction,
    receipt,
    voucherValidation,
    loading,
    error,

    // Feature check
    isCombinedBillingEnabled,

    // Methods
    createCombinedTransaction,
    getTransactionReceipt,
    validateVoucherForBilling,
    getTransactionHistory,
    cancelTransaction,

    // Utilities
    formatCurrency,
    calculateTotals
  }
}
