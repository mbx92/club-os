<route lang="yaml">
path: /restaurant/pos/floor-plan-pos
meta:
  title: Kasir POS
  layout: default
</route>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRestaurantProducts } from '@/composables/restaurant/useRestaurantProducts'
import { useRestaurantCategories } from '@/composables/restaurant/useRestaurantCategories'
import { useRestaurantTables } from '@/composables/restaurant/useRestaurantTables'
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'
import { useRestaurantOrders } from '@/composables/restaurant/useRestaurantOrders'
import { useRestaurantStock } from '@/composables/restaurant/useRestaurantStock'
import { useRestaurantBilling } from '@/composables/restaurant/useRestaurantBilling'
import { useNotification } from '@/composables/core/useNotification'
import { useProductExtras } from '@/composables/restaurant/useProductExtras'
import { useVouchers } from '@/composables/gym/voucher-management'
import FloorPlanCanvas from '@/components/restaurant/tables/FloorPlanCanvas.vue'
import POSProductGrid from '@/components/restaurant/pos/POSProductGrid.vue'
import POSCart from '@/components/restaurant/pos/POSCart.vue'
import POSPaymentModal from '@/components/restaurant/pos/POSPaymentModal.vue'
import POSReceiptModal from '@/components/restaurant/pos/POSReceiptModal.vue'
import ProductCustomizationModal from '@/components/restaurant/products/ProductCustomizationModal.vue'
import ProductExtrasModal from '@/components/restaurant/products/ProductExtrasModal.vue'
import CompleteOrderModal from '@/components/restaurant/orders/CompleteOrderModal.vue'
import MoveTableModal from '@/components/restaurant/orders/MoveTableModal.vue'
import MoveItemsModal from '@/components/restaurant/orders/MoveItemsModal.vue'
import TableOrderSelectModal from '@/components/restaurant/orders/TableOrderSelectModal.vue'
import TableActionModal from '@/components/restaurant/orders/TableActionModal.vue'
import SplitBillModal from '@/components/restaurant/orders/SplitBillModal.vue'
import AddItemsToOrderModal from '@/components/restaurant/pos/AddItemsToOrderModal.vue'
import RestaurantProcessingModal from '@/components/restaurant/shared/RestaurantProcessingModal.vue'
import { getDefaultProductVariant, getProductBasePrice, getVariantEffectivePrice } from '@/utils/restaurantPricing'
import {
  IconShoppingCart,
  IconX,
  IconReceipt,
  IconTicket,
  IconAlertTriangle,
  IconLogout,
  IconUser,
  IconMaximize,
  IconMinimize,
  IconPaperBag
} from '@tabler/icons-vue'

const router = useRouter()
const authStore = useAuthStore()
const { showSuccess, showError } = useNotification()
const isDev = import.meta.env.DEV

// ----- Data Sources -----
const { products, fetchProducts, loading: productsLoading } = useRestaurantProducts()
const { categories: apiCategories, fetchCategories, loading: categoriesLoading } = useRestaurantCategories()
const { tables, fetchTables, loading: tablesLoading } = useRestaurantTables()
const { locations, fetchLocations } = useRestaurantLocations()
const { 
  createOrder,
  fetchOrders: fetchOrdersRaw,
  getOrdersByTable,
  getSplitChildren,
  addItemToOrder,
  splitBillEqual,
  splitBill,
  completeOrder, 
  printOrderReceipt, 
  openCashDrawer,
  prePrintReceipt,
  moveOrderTable,
  transferOrderItems
} = useRestaurantOrders()
const { createStockMovement } = useRestaurantStock()
const { fetchExtras: fetchProductExtras, groupedExtras: productGroupedExtras } = useProductExtras()
const { isCombinedBillingEnabled } = useRestaurantBilling()
const { vouchers: availableVouchers, loading: vouchersLoading, fetchVouchers, validateVoucher } = useVouchers()

// ----- Floor Plan State -----
const floorPlanCanvas = ref(null)
const selectedLocation = ref('')
const selectedTable = ref(null)
const localTables = ref([])
// Set of tableIds that have pending split bills (shows orange on canvas)
const splitPendingTableIds = ref(new Set())

// ----- POS Drawer State -----
const drawerOpen = ref(false)
const fullscreenMode = ref(false)
const isTakeaway = ref(false)
const searchQuery = ref('')
const selectedCategory = ref('')
const cartItems = ref([])
const showPaymentModal = ref(false)
const showReceiptModal = ref(false)
const showProcessingModal = ref(false)
const processingError = ref(null)
const processingSteps = ref([])
const processingCurrentStep = ref(0)
const stepTimer = ref(null)

const startProcessingSteps = (steps) => {
  processingSteps.value = steps
  processingCurrentStep.value = 0
  stepTimer.value = setInterval(() => {
    if (processingCurrentStep.value < steps.length - 1) {
      processingCurrentStep.value++
    }
  }, 900)
}

const stopProcessingSteps = () => {
  if (stepTimer.value) {
    clearInterval(stepTimer.value)
    stepTimer.value = null
  }
}

const completedOrder = ref(null)
const appliedVoucher = ref(null)
const orderLoading = ref(false)
const lastOrder = ref(null)
const prePrintLoading = ref(false)

// Complete Order Modal state
const showCompleteOrderModal = ref(false)
const activeOrderToComplete = ref(null)
const completeOrderLoading = ref(false)

// Move Table Modal state
const showMoveTableModal = ref(false)
const moveTableLoading = ref(false)

// Move Items Modal state
const showMoveItemsModal = ref(false)
const moveItemsLoading = ref(false)

// Multi-order table picker
const showTableOrdersModal = ref(false)
const activeTableOrders = ref([])
const activeTableForPicker = ref(null)

// Table Action Modal (top-level action picker for occupied tables)
const showTableActionModal = ref(false)
const tableActionTable = ref(null)

// Add Items to existing Order modal
const showAddItemsModal = ref(false)
const addItemsLoading = ref(false)

// Split Bill modal
const showSplitBillModal = ref(false)
const splitBillLoading = ref(false)

// Product Customization Modal
const showCustomizationModal = ref(false)
const selectedProductForCustomization = ref(null)

// Product Extras Modal
const showExtrasModal = ref(false)
const extrasModalProduct = ref(null)
const extrasModalData = ref({})
const extrasModalLoading = ref(false)

// Voucher modal state
const voucherModal = ref(null)
const voucherSearch = ref('')
const voucherError = ref(null)
const errorVoucherId = ref(null)

// ----- Computed -----
const categories = computed(() => {
  return (apiCategories.value || []).filter(c => c.isActive !== false)
})

const filteredProducts = computed(() => {
  let filtered = products.value.filter(p => p.isActive)
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query)
    )
  }
  
  if (selectedCategory.value) {
    filtered = filtered.filter(p => p.categoryId === selectedCategory.value)
  }
  
  return filtered
})

const availableTables = computed(() => {
  return tables.value.filter(t => t.status !== 'occupied')
})

const tableStats = computed(() => {
  const all = localTables.value
  return {
    total: all.length,
    available: all.filter(t => t.status === 'available').length,
    occupied: all.filter(t => t.status === 'occupied').length,
    reserved: all.filter(t => t.status === 'reserved').length,
    splitPending: splitPendingTableIds.value.size
  }
})

const userName = computed(() => {
  return authStore.user?.name || authStore.user?.email || 'Kasir'
})

// ----- Floor Plan Methods -----
const getTablesArray = () => {
  if (!tables.value) return []
  if (Array.isArray(tables.value)) return tables.value
  if (tables.value.data && Array.isArray(tables.value.data)) return tables.value.data
  return []
}

const loadTables = async () => {
  const filters = {}
  if (selectedLocation.value) {
    filters.locationId = selectedLocation.value
  }
  
  await fetchTables(filters)
  
  const tablesArray = getTablesArray()
  localTables.value = JSON.parse(JSON.stringify(tablesArray))
  
  // Refresh split-pending colors after tables load — must be awaited so
  // splitPendingTableIds is populated before redraw()
  await refreshSplitPendingTables()
  
  await nextTick()
  if (floorPlanCanvas.value) {
    floorPlanCanvas.value.redraw()
  }
}

/**
 * Scan active split-child orders (those with parentOrderId) to find tables
 * that still have unpaid split bills → orange highlight on canvas.
 * We query children directly (status: pending/preparing/confirmed + parentOrderId)
 * instead of relying on the parent's status field.
 */
const refreshSplitPendingTables = async () => {
  try {
    // Fetch active orders that are split children (have a parentOrderId)
    const result = await fetchOrdersRaw({ status: 'pending,preparing,confirmed,ready', limit: 200 })
    const allActive = result?.data || []
    // Children have splitFromId set; collect their tableIds
    const pending = new Set()
    for (const order of allActive) {
      if ((order.splitFromId || order.parentOrderId) && order.tableId) {
        pending.add(order.tableId)
      }
    }
    splitPendingTableIds.value = pending
    if (floorPlanCanvas.value) floorPlanCanvas.value.redraw()
  } catch (err) {
    console.error('refreshSplitPendingTables error:', err)
  }
}

watch(selectedLocation, () => {
  loadTables()
  // Reset selection when location changes
  selectedTable.value = null
  drawerOpen.value = false
  cartItems.value = []
})

const handleSelectTable = async (table) => {
  if (!table) {
    // Clicked empty space — close drawer
    selectedTable.value = null
    drawerOpen.value = false
    return
  }

  // Always check for pending orders at this table — covers split-bill scenarios where
  // the parent order gets status 'split' (table may no longer be 'occupied') but child
  // split orders are still awaiting payment.
  try {
    orderLoading.value = true
    const response = await getOrdersByTable(table.id)
    const tableOrders = Array.isArray(response) ? response : (response.data || [])

    // "Active" = any order that still needs action (not completed / cancelled / split-parent)
    const DONE_STATUSES = ['completed', 'cancelled', 'voided', 'refunded']
    // 'split' is purposely excluded here — we handle it below by fetching children
    const directActive = tableOrders.filter(o => !DONE_STATUSES.includes(o.status) && o.status !== 'split')

    // For each split-parent order, fetch the child split bills
    const splitParents = tableOrders.filter(o => o.status === 'split')
    let splitChildOrders = []
    if (splitParents.length > 0) {
      const childArrays = await Promise.all(splitParents.map(p => getSplitChildren(p.id)))
      const allChildren = childArrays.flat()
      // Keep only children that still need payment
      splitChildOrders = allChildren.filter(o => !DONE_STATUSES.includes(o.status))
    }

    const activeOrders = [...directActive, ...splitChildOrders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    if (activeOrders.length > 1) {
      // Multiple pending orders (e.g. split bills) — show the picker
      activeTableOrders.value = activeOrders
      activeTableForPicker.value = table
      showTableOrdersModal.value = true
      return
    }

    if (activeOrders.length === 1) {
      // Single pending order — show Table Action Modal first
      activeOrderToComplete.value = activeOrders[0]
      tableActionTable.value = table
      showTableActionModal.value = true
      return
    }
  } catch (err) {
    console.error('Failed to fetch table orders:', err)
  } finally {
    orderLoading.value = false
  }

  // No pending orders — open POS drawer for a new order
  selectedTable.value = table
  drawerOpen.value = true

  if (floorPlanCanvas.value) {
    floorPlanCanvas.value.redraw()
  }
}

const closeDrawer = () => {
  drawerOpen.value = false
  selectedTable.value = null
  isTakeaway.value = false
  
  if (floorPlanCanvas.value) {
    floorPlanCanvas.value.redraw()
  }
}

const openTakeaway = () => {
  selectedTable.value = null
  isTakeaway.value = true
  drawerOpen.value = true
}

// No-op handlers for FloorPlanCanvas (read-only, no drag/resize)
const handlePositionUpdate = () => {}
const handleSizeUpdate = () => {}

// ----- POS Methods (reused from restaurant POS) -----
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const addToCart = async (product) => {
  // Step 1: Check Extras (Prioritas Utama)
  if (product.isCustomized) {
    try {
      extrasModalLoading.value = true
      extrasModalProduct.value = product
      showExtrasModal.value = true
      
      await fetchProductExtras(product.id, true)
      const groupedData = productGroupedExtras.value
      
      extrasModalData.value = groupedData || {}
      extrasModalLoading.value = false
      return
    } catch (err) {
      console.error('Failed to fetch extras:', err)
      extrasModalLoading.value = false
      extrasModalData.value = {}
      return
    }
  }

  // Step 2: Check Variants
  const hasVariants = product.productDetails?.hasVariants === true
  const variantCount = product.productDetails?.variants?.length || 0
  
  if (hasVariants && variantCount > 1) {
    extrasModalProduct.value = product
    extrasModalData.value = {}
    showExtrasModal.value = true
    return
  }

  // Step 3: Direct Add to Cart
  const defaultVariant = getDefaultProductVariant(product)
  addProductToCart({
    product,
    variant: defaultVariant,
    extras: [],
    notes: '',
    quantity: 1,
    unitPrice: defaultVariant
      ? getVariantEffectivePrice(product, defaultVariant)
      : getProductBasePrice(product),
    totalPrice: defaultVariant
      ? getVariantEffectivePrice(product, defaultVariant)
      : getProductBasePrice(product)
  })
}

const addProductToCart = (cartData) => {
  const { product, variant, extras, notes, quantity, unitPrice } = cartData
  
  if ((variant && variant.name !== 'Regular') || extras.length > 0) {
    cartItems.value.push({ product, variant, extras, notes, quantity, unitPrice })
  } else {
    const existingIndex = cartItems.value.findIndex(
      item => item.product.id === product.id &&
              !item.variant &&
              (!item.extras || item.extras.length === 0) &&
              !item.notes
    )
    
    if (existingIndex > -1) {
      cartItems.value[existingIndex].quantity += quantity
    } else {
      cartItems.value.push({ product, variant, extras, notes, quantity, unitPrice })
    }
  }
}

const handleCustomizationConfirm = (cartData) => {
  addProductToCart(cartData)
  showCustomizationModal.value = false
  selectedProductForCustomization.value = null
}

const handleCustomizationClose = () => {
  showCustomizationModal.value = false
  selectedProductForCustomization.value = null
}

const handleExtrasConfirm = (data) => {
  const product = extrasModalProduct.value
  const basePrice = data.variantPrice || getProductBasePrice(product)
  const extrasTotal = data.extrasTotal || 0
  
  addProductToCart({
    product,
    variant: data.selectedVariant || null,
    extras: data.selectedExtras || [],
    notes: '',
    quantity: 1,
    unitPrice: basePrice + extrasTotal,
    totalPrice: data.total || basePrice + extrasTotal
  })
  
  showExtrasModal.value = false
  extrasModalProduct.value = null
  extrasModalData.value = {}
}

const handleExtrasClose = () => {
  showExtrasModal.value = false
  extrasModalProduct.value = null
  extrasModalData.value = {}
}

const clearCart = () => {
  if (confirm('Hapus semua item dari cart?')) {
    cartItems.value = []
  }
}

const handleCheckout = () => {
  if (cartItems.value.length === 0) {
    showError('Cart masih kosong')
    return
  }
  showPaymentModal.value = true
}

const openVoucherModal = async () => {
  voucherSearch.value = ''
  voucherError.value = null
  errorVoucherId.value = null
  await fetchVouchers({ status: 'active', limit: 100 })
  voucherModal.value?.showModal()
}

const closeVoucherModal = () => {
  voucherModal.value?.close()
  voucherSearch.value = ''
  voucherError.value = null
  errorVoucherId.value = null
}

const selectVoucher = async (voucher) => {
  voucherError.value = null
  errorVoucherId.value = null
  try {
    const validationData = {
      amount: cartItems.value.reduce((s, i) => s + ((i.unitPrice || i.product.price) * i.quantity), 0),
      applicableTo: 'all',
      itemIds: cartItems.value.map(i => i.product.id)
    }
    const response = await validateVoucher(voucher.code, validationData)
    if (response?.data?.validation?.isValid) {
      appliedVoucher.value = voucher
      closeVoucherModal()
    } else {
      voucherError.value = response?.data?.validation?.reason || 'Voucher ini tidak bisa digunakan'
      errorVoucherId.value = voucher.id
    }
  } catch (err) {
    voucherError.value = err.message || 'Gagal validasi voucher'
    errorVoucherId.value = voucher.id
  }
}

const handleOpenDrawer = async () => {
  try {
    await openCashDrawer()
    showSuccess('Cash drawer opened')
  } catch (error) {
    showError(error.message || 'Gagal buka cash drawer')
  }
}

const handlePaymentSubmit = async (orderData) => {
  processingError.value = null
  showPaymentModal.value = false

  const steps = ['Sedang memverifikasi pesanan...', 'Sedang memproses pembayaran...']
  if (orderData.voucherCode) steps.push('Sedang menambahkan voucher diskon...')
  steps.push('Sedang menyimpan transaksi...')
  startProcessingSteps(steps)
  showProcessingModal.value = true

  try {
    orderLoading.value = true
    // Inject selected table if available
    if (selectedTable.value && !orderData.tableId) {
      orderData.tableId = selectedTable.value.id
    }
    
    const response = await createOrder(orderData)
    
    if (response.print?.kitchenTicket?.success) {
      showSuccess('Order dibuat & dikirim ke kitchen')
    } else if (response.print?.kitchenTicket?.skipped) {
      showSuccess('Order dibuat (kitchen printer belum dikonfigurasi)')
    }

    // Stock adjustment
    for (const item of cartItems.value) {
      if (item.product.trackInventory) {
        try {
          await createStockMovement({
            productId: item.product.id,
            locationId: item.product.locationId,
            movementType: 'out',
            quantity: -item.quantity,
            previousQuantity: item.product.stockQuantity,
            newQuantity: item.product.stockQuantity - item.quantity,
            referenceType: 'order',
            referenceId: response.data.id,
            notes: `POS sale - Order #${response.data.transactionNumber}`
          })
        } catch (stockErr) {
          console.error('Stock adjustment error:', stockErr)
        }
      }
    }

    completedOrder.value = response.data || response
    cartItems.value = []
    appliedVoucher.value = null
    showReceiptModal.value = true
    closeDrawer()
    
    // Refresh tables to show updated status
    await loadTables()
    
    stopProcessingSteps()
    showProcessingModal.value = false
  } catch (err) {
    console.error('Order creation error:', err)
    stopProcessingSteps()
    processingError.value = err?.response?.data?.message || err?.message || 'Terjadi kesalahan, silakan coba lagi.'
  } finally {
    orderLoading.value = false
  }
}

// Called when a cashier picks an order from the multi-order table modal
const handleTableOrderSelect = (order) => {
  showTableOrdersModal.value = false
  activeTableOrders.value = []
  activeOrderToComplete.value = order
  tableActionTable.value = activeTableForPicker.value
  activeTableForPicker.value = null
  // Go directly to Complete Order (payment) modal
  showCompleteOrderModal.value = true
}

// ---- Table Action Modal handlers ----

const closeTableActionModal = () => {
  showTableActionModal.value = false
}

const onTableAction_AddItem = () => {
  showTableActionModal.value = false
  showAddItemsModal.value = true
}

const onTableAction_ViewBill = () => {
  showTableActionModal.value = false
  showCompleteOrderModal.value = true
}

const onTableAction_SplitBill = () => {
  showTableActionModal.value = false
  showSplitBillModal.value = true
}

const onTableAction_PrePrint = async () => {
  if (!activeOrderToComplete.value?.id) return
  try {
    prePrintLoading.value = true
    await prePrintReceipt(activeOrderToComplete.value.id, {})
    showSuccess('Pre-receipt terkirim ke printer')
  } catch (err) {
    console.error('Pre-print error:', err)
  } finally {
    prePrintLoading.value = false
  }
}

const onTableAction_MoveTable = () => {
  showTableActionModal.value = false
  showMoveTableModal.value = true
}

const onTableAction_MoveItems = () => {
  showTableActionModal.value = false
  showMoveItemsModal.value = true
}

const submitMoveItems = async ({ items, targetTableId }) => {
  if (!activeOrderToComplete.value?.id) return
  try {
    moveItemsLoading.value = true
    await transferOrderItems(activeOrderToComplete.value.id, items, targetTableId)
    showMoveItemsModal.value = false
    // Refresh floor plan so source & target tables reflect new state
    await loadTables()
    activeOrderToComplete.value = null
    tableActionTable.value = null
  } catch (err) {
    console.error('Failed to move items:', err)
  } finally {
    moveItemsLoading.value = false
  }
}

// Add items to existing order
const handleAddItemsSubmit = async (cartItemsToAdd) => {
  if (!activeOrderToComplete.value?.id || cartItemsToAdd.length === 0) return
  try {
    addItemsLoading.value = true
    const items = cartItemsToAdd.map(item => {
      const basePrice = item.variant
        ? getVariantEffectivePrice(item.product, item.variant)
        : getProductBasePrice(item.product)
      const extras = item.extras?.filter(e => e.quantity > 0) || []
      return {
        productId: item.product.id,
        quantity: item.quantity,
        price: basePrice,
        notes: item.notes || '',
        ...(item.variant ? { variantName: item.variant.name } : {}),
        ...(extras.length ? { extras: extras.map(e => ({ id: e.id, quantity: e.quantity })) } : {})
      }
    })
    const response = await addItemToOrder(activeOrderToComplete.value.id, {
      items,
      printToKitchen: true   // backend: cetak hanya item baru ke kitchen/bar sesuai product type
    })

    // Show print result feedback (kitchen / bar)
    const print = response?.print
    if (print?.kitchenTicket?.success || print?.barTicket?.success) {
      const parts = []
      if (print.kitchenTicket?.success) parts.push('kitchen')
      if (print.barTicket?.success) parts.push('bar')
      showSuccess(`Item ditambahkan & dicetak ke ${parts.join(' + ')}`)
    } else if (print?.kitchenTicket?.skipped || print?.barTicket?.skipped) {
      showSuccess('Item ditambahkan (printer belum dikonfigurasi)')
    } else {
      showSuccess(response?.message || 'Item berhasil ditambahkan')
    }

    showAddItemsModal.value = false
    // Refresh order data
    const tableResp = await getOrdersByTable(tableActionTable.value?.id || activeOrderToComplete.value.tableId)
    const tableOrders = Array.isArray(tableResp) ? tableResp : (tableResp.data || [])
    const updated = tableOrders.find(o => o.id === activeOrderToComplete.value.id)
    if (updated) activeOrderToComplete.value = updated
  } catch (err) {
    console.error('Add items error:', err)
  } finally {
    addItemsLoading.value = false
  }
}

// Split bill
const handleSplitBillSubmit = async (splitData) => {
  if (!activeOrderToComplete.value?.id) return
  try {
    splitBillLoading.value = true
    if (splitData.type === 'equal') {
      await splitBillEqual(activeOrderToComplete.value.id, splitData.splits)
    } else {
      await splitBill(activeOrderToComplete.value.id, splitData.splits)
    }
    showSplitBillModal.value = false
    showTableActionModal.value = false
    activeOrderToComplete.value = null
    tableActionTable.value = null
    await loadTables()
  } catch (err) {
    console.error('Split bill error:', err)
  } finally {
    splitBillLoading.value = false
  }
}

const handleCompleteOrder = async (submitData) => {
  if (!activeOrderToComplete.value) return
  
  const steps = ['Sedang memproses pembayaran...']
  if (submitData.voucherCode) steps.push('Sedang menambahkan voucher diskon...')
  steps.push('Sedang menyelesaikan pesanan...')
  startProcessingSteps(steps)
  showCompleteOrderModal.value = false
  showProcessingModal.value = true

  try {
    completeOrderLoading.value = true
    
    // process payment – forward full submitData so bankName / paymentDetails are included
    const response = await completeOrder(activeOrderToComplete.value.id, submitData)
    
    // Refresh tables to update status
    await loadTables()
    
    // Close modal
    showCompleteOrderModal.value = false
    
    // Show receipt modal for the completed order
    const completedData = response?.data || response || { ...activeOrderToComplete.value, status: 'completed' }
    completedOrder.value = completedData
    lastOrder.value = completedData
    activeOrderToComplete.value = null
    tableActionTable.value = null
    appliedVoucher.value = null
    stopProcessingSteps()
    showProcessingModal.value = false
    showReceiptModal.value = true
    
  } catch (err) {
    console.error('Failed to complete order:', err)
    stopProcessingSteps()
    processingError.value = err?.response?.data?.message || err?.message || 'Terjadi kesalahan, silakan coba lagi.'
    showProcessingModal.value = true
  } finally {
    completeOrderLoading.value = false
  }
}

const handleRequireMoveTable = () => {
  showCompleteOrderModal.value = false
  showMoveTableModal.value = true
}

const submitMoveTable = async (newTableId) => {
  if (!activeOrderToComplete.value) return
  
  try {
    moveTableLoading.value = true
    await moveOrderTable(activeOrderToComplete.value.id, newTableId)
    await loadTables()
    showMoveTableModal.value = false
    activeOrderToComplete.value = null
    tableActionTable.value = null
  } catch (err) {
    console.error('Failed to move table:', err)
  } finally {
    moveTableLoading.value = false
  }
}

const handlePrint = () => {
  window.print()
}

// Pre-print receipt via API endpoint
const handlePrePrint = async (orderData) => {
  try {
    prePrintLoading.value = true
    
    // First create the order without payment to get a transaction ID
    const items = orderData.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      notes: item.notes || '',
      ...(item.variantName ? { variantName: item.variantName } : {}),
      ...(item.extras?.length ? { extraNames: item.extras.map(e => e.name) } : {})
    }))

    // Determine locationId
    const fallbackLocation = availableTables.value?.[0]?.locationId || null
    let tableId = orderData.tableId || null
    let locationId = fallbackLocation
    if (tableId) {
      const tbl = availableTables.value.find(t => t.id === tableId)
      if (tbl) locationId = tbl.locationId
    }

    const createData = {
      locationId,
      orderType: orderData.orderType,
      items,
      notes: orderData.notes || '',
      ...(tableId ? { tableId } : {}),
      ...(orderData.customerName ? { customerName: orderData.customerName } : {}),
      ...(orderData.voucherCode ? { voucherCode: orderData.voucherCode } : {})
    }

    const response = await createOrder(createData)
    const txId = response?.data?.id || response?.id

    if (txId) {
      const body = {
        ...(orderData.voucherCode ? { voucherCode: orderData.voucherCode } : {}),
        discountAmount: orderData.voucherDiscount || orderData.discountAmount || 0,
        payments: orderData.payments || []
      }
      await prePrintReceipt(txId, body)
      showSuccess('Pre-receipt sent to printer')
    } else {
      showError('Could not get transaction ID for pre-print')
    }
  } catch (err) {
    console.error('Pre-print error:', err)
  } finally {
    prePrintLoading.value = false
  }
}

// Pre-print for existing orders (CompleteOrderModal, already has order ID)
const handleCompleteOrderPrePrint = async ({ orderId, body = {} }) => {
  try {
    prePrintLoading.value = true
    await prePrintReceipt(orderId, body)
  } catch (err) {
    console.error('Pre-print error:', err)
  } finally {
    prePrintLoading.value = false
  }
}

const handleReceiptClose = () => {
  showReceiptModal.value = false
}

const handleLogout = async () => {
  // Cleanup fullscreen before logout
  document.body.classList.remove('kasir-fullscreen')
  await authStore.logout()
  router.push('/auth/login')
}

const toggleFullscreen = () => {
  fullscreenMode.value = !fullscreenMode.value
  if (fullscreenMode.value) {
    document.body.classList.add('kasir-fullscreen')
  } else {
    document.body.classList.remove('kasir-fullscreen')
  }
}

onUnmounted(() => {
  // Always cleanup when leaving the page
  document.body.classList.remove('kasir-fullscreen')
})

// ----- Init -----
onMounted(async () => {
  try {
    await Promise.all([
      fetchLocations(),
      fetchProducts({ isActive: true, limit: 200 }),
      fetchCategories()
    ])
    
    // Auto-select first location
    if (locations.value && locations.value.length > 0) {
      selectedLocation.value = locations.value[0].id
    }
  } catch (error) {
    console.error('Failed to load POS data:', error)
  }
})
</script>

<template>
  <div class="kasir-pos-page flex flex-col overflow-hidden bg-base-200" :style="{ height: fullscreenMode ? '100vh' : 'calc(100vh - 64px)' }">
    <!-- Header Bar -->
    <header class="bg-base-100 shadow-md px-4 py-3 flex items-center justify-between z-30 shrink-0">
      <div class="flex items-center gap-3">
        <IconShoppingCart class="w-6 h-6 text-primary" />
        <h1 class="text-xl font-bold">Kasir POS</h1>
        <button class="btn btn-sm btn-outline btn-accent gap-1.5" @click="openTakeaway">
          <IconPaperBag class="w-4 h-4" />
          Takeaway
        </button>
      </div>
      
      <div class="flex items-center gap-3">
        <!-- Location Selector -->
        <select
          v-model="selectedLocation"
          class="select select-bordered select-sm w-48"
        >
          <option value="">Pilih Lokasi</option>
          <option v-for="location in locations" :key="location.id" :value="location.id">
            {{ location.name }}
          </option>
        </select>
        
        <!-- User info -->
        <div class="flex items-center gap-2 text-sm text-base-content/70">
          <IconUser class="w-4 h-4" />
          <span>{{ userName }}</span>
        </div>

        <button class="btn btn-ghost btn-sm btn-circle" @click="toggleFullscreen" :title="fullscreenMode ? 'Exit Fullscreen' : 'Fullscreen'">
          <IconMinimize v-if="fullscreenMode" class="w-4 h-4" />
          <IconMaximize v-else class="w-4 h-4" />
        </button>

        <button class="btn btn-ghost btn-sm" @click="handleLogout" title="Logout">
          <IconLogout class="w-4 h-4" />
        </button>
      </div>
    </header>

    <!-- Main Content Area -->
    <div class="flex-1 flex overflow-hidden relative">
      <!-- Floor Plan Area (always full width) -->
      <div class="floor-plan-area flex-1 flex flex-col">
        <!-- Floor Plan Stats Bar -->
        <div class="bg-base-100 border-b px-4 py-2 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-4 text-sm">
            <span class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-full bg-success inline-block"></span>
              Available: <strong>{{ tableStats.available }}</strong>
            </span>
            <span class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-full bg-error inline-block"></span>
              Occupied: <strong>{{ tableStats.occupied }}</strong>
            </span>
            <span v-if="tableStats.splitPending > 0" class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-full inline-block" style="background:#f97316"></span>
              Split Pending: <strong>{{ tableStats.splitPending }}</strong>
            </span>
            <span class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-full bg-warning inline-block"></span>
              Reserved: <strong>{{ tableStats.reserved }}</strong>
            </span>
            <span class="text-base-content/50">
              Total: {{ tableStats.total }}
            </span>
          </div>
          
          <div v-if="selectedTable" class="flex items-center gap-2">
            <span class="badge badge-primary badge-outline">
              {{ selectedTable.tableNumber }}
            </span>
            <span class="text-sm text-base-content/60">
              {{ selectedTable.capacity }} pax â€¢ 
              <span class="capitalize">{{ selectedTable.status }}</span>
            </span>
          </div>
        </div>
        
        <!-- Floor Plan Canvas -->
        <div class="flex-1 overflow-hidden p-2">
          <div v-if="!selectedLocation" class="flex items-center justify-center h-full text-base-content/50">
            <div class="text-center">
              <IconShoppingCart class="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p class="text-lg">Pilih lokasi untuk melihat floor plan</p>
            </div>
          </div>
          
          <div v-else-if="tablesLoading" class="flex items-center justify-center h-full">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          
          <div v-else-if="localTables.length === 0" class="flex items-center justify-center h-full text-base-content/50">
            <div class="text-center">
              <p class="text-lg">Tidak ada meja di lokasi ini</p>
              <p class="text-sm mt-2">Tambah meja melalui menu Floor Plan Editor</p>
            </div>
          </div>
          
          <div v-else class="h-full">
            <FloorPlanCanvas
              ref="floorPlanCanvas"
              :tables="localTables"
              :selected-table="selectedTable"
              :read-only="true"
              :split-pending-table-ids="splitPendingTableIds"
              @update:position="handlePositionUpdate"
              @update:size="handleSizeUpdate"
              @select="handleSelectTable"
            />
          </div>
        </div>
      </div>

      <!-- POS Drawer Overlay (slides from right, on top of floor plan) -->
      <Transition name="drawer">
        <div
          v-if="drawerOpen"
          class="pos-drawer absolute right-0 top-0 bottom-0 w-1/2 max-w-[90%] bg-base-100 shadow-2xl border-l flex flex-col z-20"
        >
          <!-- Drawer Header -->
          <div class="px-4 py-3 border-b flex items-center justify-between shrink-0" :class="isTakeaway ? 'bg-accent/10' : 'bg-primary/5'">
            <div class="flex items-center gap-3">
              <button class="btn btn-ghost btn-sm btn-circle" @click="closeDrawer">
                <IconX class="w-5 h-5" />
              </button>
              <div v-if="selectedTable">
                <h2 class="font-bold text-lg">{{ selectedTable?.tableNumber }}</h2>
                <p class="text-xs text-base-content/60">
                  {{ selectedTable?.capacity }} pax &middot; 
                  <span class="capitalize" :class="{
                    'text-success': selectedTable?.status === 'available',
                    'text-error': selectedTable?.status === 'occupied',
                    'text-warning': selectedTable?.status === 'reserved'
                  }">{{ selectedTable?.status }}</span>
                </p>
              </div>
              <div v-else>
                <h2 class="font-bold text-lg flex items-center gap-2">
                  <IconPaperBag class="w-5 h-5 text-accent" />
                  Takeaway Order
                </h2>
                <p class="text-xs text-base-content/60">Pesanan dibawa pulang</p>
              </div>
            </div>
            
            <div v-if="cartItems.length > 0" class="badge badge-primary">
              {{ cartItems.length }} item
            </div>
          </div>
          
          <!-- Content separated to left (cart) and right (menu) -->
          <div class="flex flex-1 min-h-0">
            <!-- Cart Section (left of drawer) -->
            <div class="w-2/5 border-r bg-base-50 flex flex-col min-h-0 shrink-0">
              <POSCart
                class="flex-1 overflow-y-auto"
                :items="cartItems"
                @update:items="cartItems = $event"
                @checkout="handleCheckout"
                @clear="clearCart"
              />
            </div>
            
            <!-- Products Section (right of drawer) -->
            <div class="flex-1 overflow-y-auto min-h-0">
              <POSProductGrid
                :products="filteredProducts"
                :loading="productsLoading"
                :search-query="searchQuery"
                :selected-category="selectedCategory"
                :categories="categories"
                @update:search-query="searchQuery = $event"
                @update:selected-category="selectedCategory = $event"
                @add-to-cart="addToCart"
              />
            </div>
          </div>
        </div>
      </Transition>

      <!-- Overlay backdrop when drawer is open -->
      <Transition name="fade">
        <div
          v-if="drawerOpen"
          class="absolute inset-0 bg-black/20 z-10"
          @click="closeDrawer"
        ></div>
      </Transition>
    </div>

    <!-- Payment Modal -->
    <POSPaymentModal
      :show="showPaymentModal"
      :cart-items="cartItems"
      :tables="availableTables"
      :loading="orderLoading || tablesLoading"
      :pre-print-loading="prePrintLoading"
      :initial-voucher="appliedVoucher"
      :initial-table="selectedTable?.id || ''"
      :initial-order-type="isTakeaway ? 'takeaway' : 'dine-in'"
      @close="showPaymentModal = false"
      @submit="handlePaymentSubmit"
      @pre-print="handlePrePrint"
      @open-drawer="handleOpenDrawer"
      @open-voucher-modal="openVoucherModal"
      @voucher-applied="(v) => { appliedVoucher = v }"
      @voucher-cleared="() => { appliedVoucher = null }"
    />

    <!-- Complete Order Modal (for occupied tables) -->
    <CompleteOrderModal
      :show="showCompleteOrderModal"
      :order="activeOrderToComplete"
      :loading="completeOrderLoading"
      :pre-print-loading="prePrintLoading"
      @close="showCompleteOrderModal = false"
      @submit="handleCompleteOrder"
      @pre-print="handleCompleteOrderPrePrint"
      @move-table="handleRequireMoveTable"
    />

    <!-- Move Table Modal -->
    <MoveTableModal
      :show="showMoveTableModal"
      :order="activeOrderToComplete"
      :tables="availableTables"
      :loading="moveTableLoading"
      @close="showMoveTableModal = false"
      @submit="submitMoveTable"
    />

    <!-- Table Order Picker (shown when >1 active order at the same table) -->
    <TableOrderSelectModal
      :show="showTableOrdersModal"
      :table="activeTableForPicker"
      :orders="activeTableOrders"
      :loading="orderLoading"
      @close="showTableOrdersModal = false"
      @select="handleTableOrderSelect"
    />

    <!-- Table Action Modal — action picker for occupied table -->
    <TableActionModal
      :show="showTableActionModal"
      :table="tableActionTable"
      :order="activeOrderToComplete"
      :pre-print-loading="prePrintLoading"
      @close="closeTableActionModal"
      @add-item="onTableAction_AddItem"
      @view-bill="onTableAction_ViewBill"
      @split-bill="onTableAction_SplitBill"
      @pre-print="onTableAction_PrePrint"
      @move-table="onTableAction_MoveTable"
      @move-items="onTableAction_MoveItems"
    />

    <!-- Add Items to Existing Order Modal -->
    <AddItemsToOrderModal
      :show="showAddItemsModal"
      :order="activeOrderToComplete"
      :products="products"
      :categories="categories"
      :loading="addItemsLoading"
      @close="showAddItemsModal = false"
      @submit="handleAddItemsSubmit"
    />

    <!-- Move Items Modal -->
    <MoveItemsModal
      :show="showMoveItemsModal"
      :order="activeOrderToComplete"
      :tables="localTables"
      :loading="moveItemsLoading"
      @close="showMoveItemsModal = false"
      @submit="submitMoveItems"
    />

    <!-- Split Bill Modal -->
    <SplitBillModal
      :show="showSplitBillModal"
      :order="activeOrderToComplete"
      :loading="splitBillLoading"
      @close="showSplitBillModal = false"
      @submit="handleSplitBillSubmit"
    />

    <!-- Processing Modal -->
    <RestaurantProcessingModal
      :show="showProcessingModal"
      :steps="processingSteps"
      :current-step="processingCurrentStep"
      :error="processingError"
      @close-error="stopProcessingSteps(); showProcessingModal = false; processingError = null; showPaymentModal = true"
    />

    <!-- Receipt Modal -->
    <POSReceiptModal
      :show="showReceiptModal"
      :order="completedOrder"
      @close="handleReceiptClose"
      @print="handlePrint"
    />

    <!-- Voucher Selection Modal -->
    <Teleport to="body">
    <dialog ref="voucherModal" class="modal">
      <div class="modal-box w-11/12 max-w-3xl">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold">Pilih Voucher</h3>
          <button type="button" @click="closeVoucherModal" class="btn btn-sm btn-circle btn-ghost">âœ•</button>
        </div>

        <div class="form-control mb-4">
          <input
            type="text"
            placeholder="Cari voucher..."
            class="input input-bordered w-full"
            v-model="voucherSearch"
            @input="fetchVouchers({ search: voucherSearch, status: 'active', limit: 20 })"
            autocomplete="off"
          />
        </div>

        <div class="overflow-y-auto max-h-96">
          <div v-if="vouchersLoading" class="flex justify-center items-center py-12">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="!availableVouchers || availableVouchers.length === 0" class="text-center py-12 text-base-content/60">
            Tidak ada voucher tersedia
          </div>
          <div v-else class="space-y-2">
            <div v-for="voucher in availableVouchers" :key="voucher.id">
              <div @click="selectVoucher(voucher)" class="card bg-base-100 border-2 cursor-pointer transition-all" :class="errorVoucherId === voucher.id ? 'border-error' : 'border-base-300 hover:border-primary hover:bg-base-200'">
                <div class="card-body p-4">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <div class="font-semibold">{{ voucher.code }}</div>
                        <div class="badge badge-sm" :class="voucher.isActive ? 'badge-success' : 'badge-error'">{{ voucher.isActive ? 'Active' : 'Inactive' }}</div>
                      </div>
                      <div class="text-sm text-base-content/60 mt-1">{{ voucher.name }}</div>
                      <div class="text-xs text-success font-semibold mt-2">
                        <span v-if="voucher.type === 'percentage' || voucher.discountType === 'percentage'">
                          {{ voucher.value || voucher.discountValue }}% OFF
                          <span v-if="voucher.maxDiscountAmount" class="text-base-content/60">(max {{ formatCurrency(voucher.maxDiscountAmount) }})</span>
                        </span>
                        <span v-else>
                          {{ formatCurrency(voucher.value || voucher.discountValue) }} OFF
                        </span>
                      </div>
                    </div>
                    <IconTicket class="w-6 h-6 text-primary" />
                  </div>
                </div>
              </div>

              <div v-if="errorVoucherId === voucher.id && voucherError" class="alert alert-error mt-2">
                <IconAlertTriangle class="w-5 h-5" />
                <span class="text-sm">{{ voucherError }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button type="button" @click="closeVoucherModal" class="btn">Cancel</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="button" @click="closeVoucherModal">close</button>
      </form>
    </dialog>
    </Teleport>

    <!-- Product Customization Modal -->
    <ProductCustomizationModal
      v-if="selectedProductForCustomization"
      :show="showCustomizationModal"
      :product="selectedProductForCustomization"
      @add-to-cart="handleCustomizationConfirm"
      @close="handleCustomizationClose"
    />

    <!-- Product Extras Modal -->
    <ProductExtrasModal
      v-if="extrasModalProduct"
      :show="showExtrasModal"
      :product="extrasModalProduct"
      :extras="extrasModalData"
      :loading="extrasModalLoading"
      @confirm="handleExtrasConfirm"
      @close="handleExtrasClose"
    />
  </div>
</template>

<style scoped>
/* Drawer slide animation */
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}

/* Fade animation for backdrop */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Kasir mode floor plan specific overrides */
.kasir-pos-page :deep(.floor-plan-area) {
  /* add any specific kasir floor plan styles here if needed */
}

/* ===== Compact overrides for POS components inside drawer ===== */

/* Product grid: smaller padding, always 2 columns, hide images */
.pos-drawer :deep(.p-4) {
  padding: 0.5rem !important;
}

.pos-drawer :deep(.space-y-3) {
  gap: 0.5rem;
}



/* Smaller card body */
.pos-drawer :deep(.card-body) {
  padding: 0.5rem !important;
}

/* Compact product name */
.pos-drawer :deep(.card-body h3) {
  min-height: unset !important;
  font-size: 0.75rem !important;
  line-height: 1.1rem !important;
}

/* Compact price */
.pos-drawer :deep(.card-body .text-primary) {
  font-size: 0.75rem !important;
}

/* Compact category buttons */
.pos-drawer :deep(.btn-sm) {
  font-size: 0.7rem !important;
  padding-left: 0.5rem !important;
  padding-right: 0.5rem !important;
  height: 1.75rem !important;
  min-height: 1.75rem !important;
}

/* Compact search input */
.pos-drawer :deep(.input) {
  height: 2.25rem !important;
  min-height: 2.25rem !important;
  font-size: 0.8rem !important;
}

/* Reduce empty cart padding */
.pos-drawer :deep(.py-12) {
  padding-top: 1.5rem !important;
  padding-bottom: 1.5rem !important;
}

.pos-drawer :deep(.py-12 .text-lg) {
  font-size: 0.875rem !important;
}

/* Compact cart header */
.pos-drawer :deep(.p-2 h2) {
  font-size: 0.875rem !important;
}

/* Limit cart item list height */
.pos-drawer :deep(.max-h-\[50vh\]) {
  max-height: 30vh !important;
}
</style>

<!-- Global styles: remove layout padding for this page + fullscreen mode -->
<style>
/* Remove container padding & max-width when kasir POS page is inside */
.container:has(.kasir-pos-page) {
  padding: 0 !important;
  max-width: 100% !important;
  width: 100% !important;
}

/* Also remove the main flex-1 padding if any */
main:has(.kasir-pos-page) {
  padding: 0 !important;
}

/* ===== Fullscreen mode ===== */
/* Hide sidebar completely */
body.kasir-fullscreen .drawer-side {
  display: none !important;
  visibility: hidden !important;
}

/* Raise drawer-content above everything so fixed child can escape stacking context */
body.kasir-fullscreen .drawer-content {
  z-index: 9998 !important;
}

/* Position the page fixed over the entire viewport */
body.kasir-fullscreen .kasir-pos-page {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 9999 !important;
  margin: 0 !important;
}
</style>
