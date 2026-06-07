import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export const useOrders = () => {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const orders = ref([])
  const order = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  /**
   * Fetch all orders with pagination and filters
   * @param {Object} params - Query parameters { page, limit, status, patientId, startDate, endDate }
   */
  const fetchOrders = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('page', params.page || 1)
      queryParams.append('limit', params.limit || 20)
      if (params.status) queryParams.append('status', params.status)
      if (params.patientId) queryParams.append('patientId', params.patientId)
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)

      const response = await api.get(`/psychology/orders?${queryParams.toString()}`)
      orders.value = response.data || []
      
      if (response.pagination) {
        pagination.value = response.pagination
      }
      
      return response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch orders')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get order by ID
   * @param {String} orderId - The order ID
   */
  const getOrderById = async (orderId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/psychology/orders/${orderId}`)
      order.value = response.data || response
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch order details')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new order
   * @param {Object} orderData - Order data { patientId, packageId, promoCode, notes, expiresAt }
   */
  const createOrder = async (orderData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/psychology/orders', orderData)
      showSuccess(response.message || 'Order created successfully')
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to create order')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Process payment for an order
   * @param {String} orderId - The order ID
   * @param {Object} paymentData - Payment data { status, paymentMethod }
   */
  const processPayment = async (orderId, paymentData = {}) => {
    loading.value = true
    error.value = null
    try {
      const payload = {
        status: 'paid',
        ...paymentData
      }
      const response = await api.patch(`/psychology/orders/${orderId}/payment`, payload)
      showSuccess(response.message || 'Pembayaran berhasil diproses')
      
      // Update local state
      if (order.value && order.value.id === orderId) {
        order.value = { ...order.value, ...response.data }
      }
      
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Gagal memproses pembayaran')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update payment status
   * @param {String} orderId - The order ID
   * @param {Object} data - { paymentStatus, paymentMethod, paymentReference }
   */
  const updatePaymentStatus = async (orderId, data) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.patch(`/psychology/orders/${orderId}/payment`, data)
      showSuccess(response.message || 'Payment status updated')
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to update payment status')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get order QR code
   * @param {String} orderId - The order ID
   */
  const getOrderQR = async (orderId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/psychology/orders/${orderId}/qr`)
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to get QR code')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Regenerate access token for an order
   * @param {String} orderId - The order ID
   */
  const regenerateToken = async (orderId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(`/psychology/orders/${orderId}/regenerate-token`)
      showSuccess(response.message || 'Access token regenerated')
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to regenerate access token')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Cancel an order
   * @param {String} orderId - The order ID
   */
  const cancelOrder = async (orderId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(`/psychology/orders/${orderId}/cancel`)
      showSuccess(response.message || 'Order cancelled successfully')
      
      // Update local state
      const orderInList = orders.value.find(o => o.id === orderId)
      if (orderInList) {
        orderInList.paymentStatus = 'cancelled'
      }
      if (order.value && order.value.id === orderId) {
        order.value.paymentStatus = 'cancelled'
      }
      
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to cancel order')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get order status badge class
   * Status: pending, paid, in_progress, completed, verified, cancelled, expired
   * @param {String} status - Order status
   */
  const getPaymentStatusClass = (status) => {
    const classes = {
      pending: 'badge-warning',
      paid: 'badge-success',
      in_progress: 'badge-info',
      completed: 'badge-primary',
      verified: 'badge-accent',
      cancelled: 'badge-error',
      expired: 'badge-ghost'
    }
    return classes[status] || 'badge-ghost'
  }

  /**
   * Get order status label
   * Status: pending, paid, in_progress, completed, verified, cancelled, expired
   * @param {String} status - Order status
   */
  const getPaymentStatusLabel = (status) => {
    const labels = {
      pending: 'Menunggu Pembayaran',
      paid: 'Lunas',
      in_progress: 'Sedang Berlangsung',
      completed: 'Selesai',
      verified: 'Terverifikasi',
      cancelled: 'Dibatalkan',
      expired: 'Kadaluarsa'
    }
    return labels[status] || status
  }

  /**
   * Get session status badge class
   * @param {String} status - Session status
   */
  const getSessionStatusClass = (status) => {
    const classes = {
      pending: 'badge-ghost',
      in_progress: 'badge-warning',
      completed: 'badge-success',
      verified: 'badge-accent',
      expired: 'badge-error'
    }
    return classes[status] || 'badge-ghost'
  }

  /**
   * Get session status label
   * @param {String} status - Session status
   */
  const getSessionStatusLabel = (status) => {
    const labels = {
      pending: 'Belum Mulai',
      in_progress: 'Sedang Berlangsung',
      completed: 'Selesai',
      verified: 'Terverifikasi',
      expired: 'Kadaluarsa'
    }
    return labels[status] || status
  }

  /**
   * Format price in IDR
   * @param {Number} price - Price amount
   */
  const formatPrice = (price) => {
    if (!price && price !== 0) return '-'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price)
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

  /**
   * Check if order is expired
   * @param {String} expiresAt - Expiry date string
   */
  const isOrderExpired = (expiresAt) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  return {
    orders,
    order,
    loading,
    error,
    pagination,
    fetchOrders,
    getOrderById,
    createOrder,
    processPayment,
    updatePaymentStatus,
    getOrderQR,
    regenerateToken,
    cancelOrder,
    getPaymentStatusClass,
    getPaymentStatusLabel,
    getSessionStatusClass,
    getSessionStatusLabel,
    formatPrice,
    formatDate,
    formatDateTime,
    isOrderExpired
  }
}
