import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useRestaurantOrders() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const isDev = import.meta.env.DEV

  const orders = ref([])
  const order = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const currentPage = ref(1)
  const totalPages = ref(1)
  const totalItems = ref(0)

  /**
   * Get all orders with pagination and filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.status - Filter by status (pending, preparing, ready, completed, cancelled)
   * @param {string} params.tableId - Filter by table ID
   * @param {string} params.date - Filter by date (today, yesterday, week, month, custom)
   * @param {string} params.startDate - Custom start date (ISO format)
   * @param {string} params.endDate - Custom end date (ISO format)
   */
  const fetchOrders = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page)
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.status) queryParams.append('status', params.status)
      if (params.tableId) queryParams.append('tableId', params.tableId)
      if (params.parentOrderId) queryParams.append('parentOrderId', params.parentOrderId)
      if (params.date) queryParams.append('date', params.date)
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)

      const queryString = queryParams.toString()
      const url = `/restaurant/orders${queryString ? `?${queryString}` : ''}`

      if (isDev) {
        console.log('Fetching orders from:', url)
      }

      const response = await api.get(url)

      if (isDev) {
        console.log('API Response:', response)
      }

      if (response.data) {
        orders.value = response.data
        if (response.pagination) {
          // Do NOT override currentPage from response — it's managed by the caller
          // currentPage is set before fetchOrders is called via handlePageChange
          totalPages.value = response.pagination.totalPages || 1
          totalItems.value = response.pagination.totalItems || response.pagination.total || 0
        }
        return {
          data: response.data,
          pagination: response.pagination
        }
      } else {
        orders.value = response
        return { data: response }
      }
    } catch (err) {
      if (isDev) {
        console.error('Error fetching orders:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch orders')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get order by ID
   * @param {string} orderId - Order ID
   */
  const getOrderById = async (orderId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Fetching order:', orderId)
      }

      const response = await api.get(`/restaurant/orders/${orderId}`)

      if (isDev) {
        console.log('Order details:', response)
      }

      if (response.data) {
        order.value = response.data
        return response.data
      } else {
        order.value = response
        return response
      }
    } catch (err) {
      if (isDev) {
        console.error('Error fetching order:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch order details')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create new order
   * @param {Object} orderData - Order data
   * @param {string} orderData.tableId - Table ID
   * @param {string} orderData.orderType - Order type (dine-in, takeaway, delivery)
   * @param {Array} orderData.items - Order items [{productId, quantity, price, variants, notes}]
   * @param {Object} orderData.customerInfo - Customer info {name, phone}
   * @param {string} orderData.notes - Order notes
   * @param {string} orderData.paymentMethod - Payment method (cash, card, ewallet)
   */
  const createOrder = async (orderData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Creating order:', orderData)
      }

      const response = await api.post('/restaurant/orders', orderData)

      if (isDev) {
        console.log('Order created:', response)
      }

      showSuccess(response.message || 'Order created successfully')

      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Error creating order:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to create order')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {Object} statusData - Status data
   * @param {string} statusData.status - New status (preparing, ready, completed, cancelled)
   * @param {string} statusData.notes - Optional notes
   */
  const updateOrderStatus = async (orderId, statusData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Updating order status:', orderId, statusData)
      }

      const response = await api.put(`/restaurant/orders/${orderId}/status`, statusData)

      if (isDev) {
        console.log('Order status updated:', response)
      }

      showSuccess(response.message || 'Order status updated successfully')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Error updating order status:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to update order status')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Add item to order
   * @param {string} orderId - Order ID
   * @param {Object} itemData - Item data
   * @param {string} itemData.productId - Product ID
   * @param {number} itemData.quantity - Quantity
   * @param {number} itemData.price - Price
   * @param {string} itemData.notes - Optional notes
   */
  const addItemToOrder = async (orderId, itemData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Adding item to order:', orderId, itemData)
      }

      const response = await api.post(`/restaurant/orders/${orderId}/items`, itemData)

      if (isDev) {
        console.log('Item added to order:', response)
      }

      // Return full response so caller can access response.print (kitchen/bar tickets)
      return response
    } catch (err) {
      if (isDev) {
        console.error('Error adding item to order:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to add item to order')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Complete order with payment
   * @param {string} orderId - Order ID
   * @param {Object} paymentData - Payment data
   * @param {string} paymentData.paymentMethod - Payment method (cash, card, ewallet)
   * @param {number} paymentData.paymentAmount - Amount paid
   * @param {string} paymentData.notes - Optional notes
   */
  const completeOrder = async (orderId, paymentData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Completing order:', orderId, paymentData)
      }

      const response = await api.post(`/restaurant/orders/${orderId}/complete`, paymentData)

      if (isDev) {
        console.log('Order completed:', response)
      }

      showSuccess(response.message || 'Order completed successfully')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Error completing order:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to complete order')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Validate voucher for order
   * @param {Object} voucherData - Voucher validation data
   * @param {string} voucherData.code - Voucher code
   * @param {number} voucherData.amount - Order subtotal amount
   * @param {string} voucherData.customerId - Optional customer ID
   */
  const validateVoucher = async (voucherData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Validating voucher:', voucherData)
      }

      const response = await api.post('/restaurant/orders/validate-voucher', voucherData)

      if (isDev) {
        console.log('Voucher validation result:', response)
      }

      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Voucher validation error:', err)
      }
      error.value = err.message
      // Don't show notification for validation errors, let component handle it
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create direct order (without going through POS flow)
   * @param {Object} orderData - Order data with items, payment, etc.
   */
  const createDirectOrder = async (orderData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Creating direct order:', orderData)
      }

      const response = await api.post('/restaurant/orders/direct', orderData)

      if (isDev) {
        console.log('Direct order created:', response)
      }

      showSuccess(response.message || 'Order created successfully')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Error creating direct order:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to create order')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get orders by table ID
   * @param {string} tableId - Table ID
   */
  const getOrdersByTable = async (tableId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Fetching orders for table:', tableId)
      }

      const response = await api.get(`/restaurant/orders/table/${tableId}`)

      if (isDev) {
        console.log('Table orders:', response)
      }

      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Error fetching table orders:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch table orders')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get split children for a given parent order.
   * Tries GET /restaurant/orders/:id/splits first; falls back to
   * GET /restaurant/orders?parentOrderId=:id so either backend shape works.
   * @param {string} parentOrderId - Parent (split) order ID
   */
  const getSplitChildren = async (parentOrderId) => {
    try {
      const response = await api.get(`/restaurant/orders/${parentOrderId}/splits`)
      const data = response.data || response
      return Array.isArray(data) ? data : []
    } catch {
      // fallback: query by parentOrderId param
      try {
        const response = await api.get(`/restaurant/orders?parentOrderId=${parentOrderId}`)
        const data = response.data || response
        return Array.isArray(data) ? data : []
      } catch (err) {
        if (isDev) console.error('getSplitChildren fallback error:', err)
        return []
      }
    }
  }

  /**
   * Print order receipt
   * @param {string} orderId - Order ID
   */
  const printOrder = async (orderId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Printing order:', orderId)
      }

      const response = await api.post(`/restaurant/orders/${orderId}/print`)

      if (isDev) {
        console.log('Print response:', response)
      }

      showSuccess(response.message || 'Print job sent')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Error printing order:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to print order')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Open cash drawer
   */
  const openCashDrawer = async () => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Opening cash drawer')
      }

      const response = await api.post('/restaurant/orders/drawer/open')

      if (isDev) {
        console.log('Cash drawer response:', response)
      }

      showSuccess(response.message || 'Cash drawer opened')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Error opening cash drawer:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to open cash drawer')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get kitchen orders (confirmed/preparing status)
   * For kitchen display system
   * @param {Object} params - Query parameters
   * @param {string} params.locationId - Filter by location
   */
  const getKitchenOrders = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.locationId) queryParams.append('locationId', params.locationId)
      if (params.limit) queryParams.append('limit', params.limit)
      // support single status or array of statuses
      if (params.status) {
        if (Array.isArray(params.status)) {
          params.status.forEach(s => queryParams.append('status', s))
        } else {
          queryParams.append('status', params.status)
        }
      }

      const queryString = queryParams.toString()
      const url = `/restaurant/orders/kitchen${queryString ? `?${queryString}` : ''}`

      if (isDev) {
        console.log('Fetching kitchen orders from:', url)
      }

      const response = await api.get(url)

      if (isDev) {
        console.log('Kitchen orders:', response)
      }

      return response.data || []
    } catch (err) {
      if (isDev) {
        console.error('Get kitchen orders error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to get kitchen orders')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update order item status (for kitchen)
   * @param {string} orderId - Order ID
   * @param {string} itemId - Order item ID
   * @param {string} status - New status (preparing, ready)
   */
  const updateOrderItemStatus = async (orderId, itemId, status) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Updating order item status:', orderId, itemId, status)
      }

      const response = await api.put(`/restaurant/orders/${orderId}/items/${itemId}/status`, { status })

      if (isDev) {
        console.log('Order item status updated:', response)
      }

      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Update order item status error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to update item status')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Mark all items in order as ready
   * @param {string} orderId - Order ID
   */
  const markOrderReady = async (orderId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Marking order as ready:', orderId)
      }

      const response = await api.put(`/restaurant/orders/${orderId}/status`, { status: 'ready' })

      if (isDev) {
        console.log('Order marked ready:', response)
      }

      showSuccess(response.message || 'Order marked as ready')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Mark order ready error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to mark order as ready')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Split bill by item assignment (new endpoint)
   * @param {string} orderId - Order/Transaction ID
   * @param {Array} splits - [{ itemIds, customerName, notes }]
   */
  const splitBill = async (orderId, splits) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Splitting bill by items (new):', orderId, splits)
      }

      const response = await api.post(`/transactions/${orderId}/split-bill`, { splits })

      if (isDev) {
        console.log('Split bill result:', response)
      }

      showSuccess('Bill split successfully')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Split bill error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to split bill')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Split bill equally
   * @param {string} orderId - Order ID
   * @param {number} splits - Number of splits
   */
  const splitBillEqual = async (orderId, splits) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Splitting bill equally:', orderId, splits)
      }

      const response = await api.post(`/restaurant/orders/${orderId}/split`, {
        splitType: 'equal',
        splits
      })

      if (isDev) {
        console.log('Bill split result:', response)
      }

      showSuccess(`Bill split into ${splits} parts`)
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Split bill error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to split bill')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Split bill by items
   * @param {string} orderId - Order ID
   * @param {Array} splits - Array of splits with item assignments [{customerName, itemIds}]
   */
  const splitBillByItems = async (orderId, splits) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Splitting bill by items:', orderId, splits)
      }

      const response = await api.post(`/restaurant/orders/${orderId}/split`, {
        splitType: 'by_items',
        splits
      })

      if (isDev) {
        console.log('Bill split result:', response)
      }

      showSuccess('Bill split by items successfully')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Split bill error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to split bill')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Merge multiple orders into one
   * @param {Array} orderIds - Array of order IDs to merge
   */
  const mergeBills = async (orderIds) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Merging bills:', orderIds)
      }

      const response = await api.post('/restaurant/orders/merge', { orderIds })

      if (isDev) {
        console.log('Merge bills result:', response)
      }

      showSuccess(`${orderIds.length} orders merged successfully`)
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Merge bills error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to merge bills')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Print order receipt or kitchen ticket
   * @param {string} orderId - Order ID
   * @param {string} type - Print type: 'receipt' or 'kitchen'
   */
  const printOrderReceipt = async (orderId, type = 'receipt') => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Printing order:', orderId, type)
      }

      const response = await api.post(`/restaurant/orders/${orderId}/print?type=${type}`)

      if (isDev) {
        console.log('Print response:', response)
      }

      if (response.data?.success) {
        showSuccess(`${type === 'receipt' ? 'Receipt' : 'Kitchen ticket'} sent to printer`)
      } else if (response.data?.skipped) {
        showSuccess('Printer not configured, showing preview')
      }

      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Print order error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to print')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Pre-print receipt for a transaction (before payment)
   * @param {string} transactionId - Transaction/Order ID
   * @param {Object} body - Optional body: { voucherCode, discountAmount, payments }
   */
  const prePrintReceipt = async (transactionId, body = {}) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Pre-printing receipt for transaction:', transactionId, body)
      }

      const response = await api.post(`/transactions/${transactionId}/pre-print`, body)

      if (isDev) {
        console.log('Pre-print response:', response)
      }

      if (response.data?.success || response.success) {
        showSuccess('Pre-receipt sent to printer')
      } else if (response.data?.skipped || response.skipped) {
        showSuccess('Printer not configured')
      }

      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Pre-print receipt error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to print pre-receipt')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Transfer specific items from one order to another table's order
   * POST /restaurant/orders/:id/transfer-items
   * @param {string} orderId - Source order ID
   * @param {Array}  items   - [{ orderItemId, quantity }]
   * @param {string} targetTableId - Destination table ID
   */
  const transferOrderItems = async (orderId, items, targetTableId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Transferring items:', orderId, items, targetTableId)
      }

      const response = await api.post(`/restaurant/orders/${orderId}/transfer-items`, {
        items,
        targetTableId
      })

      if (isDev) {
        console.log('Transfer result:', response)
      }

      showSuccess(response.message || 'Item berhasil dipindah ke meja tujuan')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Error transferring items:', err)
      }
      error.value = err.message
      handleError(err, 'Gagal memindah item')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Move order to a different table
   * @param {string} orderId - Order ID
   * @param {string} newTableId - Destination Table ID
   */
  const moveOrderTable = async (orderId, newTableId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Moving order to new table:', orderId, newTableId)
      }

      const response = await api.put(`/restaurant/orders/${orderId}/move-table`, { newTableId })

      if (isDev) {
        console.log('Order moved:', response)
      }

      showSuccess(response.message || 'Order moved to new table successfully')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Error moving order:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to move order')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    orders,
    order,
    currentOrder: order,
    loading,
    error,
    currentPage,
    totalPages,
    totalItems,
    fetchOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    addItemToOrder,
    completeOrder,
    // Voucher & Direct Order
    validateVoucher,
    createDirectOrder,
    getOrdersByTable,
    getSplitChildren,
    printOrder,
    openCashDrawer,
    // Kitchen
    getKitchenOrders,
    updateOrderItemStatus,
    markOrderReady,
    // Split & Merge
    splitBillEqual,
    splitBillByItems,
    mergeBills,
    printOrderReceipt,
    prePrintReceipt,
    splitBill,
    moveOrderTable,
    transferOrderItems
  }
}
