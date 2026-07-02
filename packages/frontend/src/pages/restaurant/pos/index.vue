<route lang="yaml">
meta:
  title: Point of Sale
  layout: default
</route>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRestaurantProducts } from '@/composables/restaurant/useRestaurantProducts'
import { useRestaurantCategories } from '@/composables/restaurant/useRestaurantCategories'
import { useRestaurantTables } from '@/composables/restaurant/useRestaurantTables'
import { useRestaurantOrders } from '@/composables/restaurant/useRestaurantOrders'
import { useRestaurantStock } from '@/composables/restaurant/useRestaurantStock'
import { useRestaurantBilling } from '@/composables/restaurant/useRestaurantBilling'
import { useNotification } from '@/composables/core/useNotification'
import { useProductExtras } from '@/composables/restaurant/useProductExtras'
import POSProductGrid from '@/components/restaurant/pos/POSProductGrid.vue'
import POSCart from '@/components/restaurant/pos/POSCart.vue'
import POSPaymentModal from '@/components/restaurant/pos/POSPaymentModal.vue'
import POSReceiptModal from '@/components/restaurant/pos/POSReceiptModal.vue'
import RestaurantProcessingModal from '@/components/restaurant/shared/RestaurantProcessingModal.vue'
import ProductCustomizationModal from '@/components/restaurant/products/ProductCustomizationModal.vue'
import ProductExtrasModal from '@/components/restaurant/products/ProductExtrasModal.vue'
import { IconReceipt, IconList, IconDashboard, IconShoppingCart, IconCrown, IconTicket, IconAlertTriangle } from '@tabler/icons-vue'
import { useVouchers } from '@/composables/gym/voucher-management'
import { getDefaultProductVariant, getProductBasePrice, getVariantEffectivePrice } from '@/utils/restaurantPricing'

const router = useRouter()
const { showSuccess, showError } = useNotification()
const isDev = import.meta.env.DEV

const { products, fetchProducts, loading: productsLoading } = useRestaurantProducts()
const { categories: apiCategories, fetchCategories, loading: categoriesLoading } = useRestaurantCategories()
const { tables, fetchTables, loading: tablesLoading } = useRestaurantTables()
const { createOrder, openCashDrawer, loading: orderLoading } = useRestaurantOrders()
const { createStockMovement } = useRestaurantStock()
const { fetchExtras: fetchProductExtras, groupedExtras: productGroupedExtras } = useProductExtras()
const { isCombinedBillingEnabled } = useRestaurantBilling()

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

// Product Customization Modal (for variants from productDetails JSONB)
const showCustomizationModal = ref(false)
const selectedProductForCustomization = ref(null)

// Product Extras Modal (for extras from ProductExtras DB table)
const showExtrasModal = ref(false)
const extrasModalProduct = ref(null)
const extrasModalData = ref({})
const extrasModalLoading = ref(false)

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

// Voucher modal state (page-level, like gym POS)
const voucherModal = ref(null)
const voucherSearch = ref('')
const voucherError = ref(null)
const errorVoucherId = ref(null)
const { vouchers: availableVouchers, loading: vouchersLoading, fetchVouchers, validateVoucher } = useVouchers()

// Categories from API (objects with id, name, color, icon)
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
  // Return tables that are not occupied (allow available, reserved, etc.)
  return tables.value.filter(t => t.status !== 'occupied')
})

const addToCart = async (product) => {
  // Step 1: Check Extras (Prioritas Utama)
  // If isCustomized, fetch DB extras and show ProductExtrasModal
  // ProductExtrasModal also handles variant selection if product has variants
  if (product.isCustomized) {
    try {
      extrasModalLoading.value = true
      extrasModalProduct.value = product
      showExtrasModal.value = true
      
      await fetchProductExtras(product.id, true)
      const groupedData = productGroupedExtras.value
      
      if (isDev) {
        console.log('Fetched DB extras for product:', product.name, groupedData)
      }
      
      extrasModalData.value = groupedData || {}
      extrasModalLoading.value = false
      return
    } catch (err) {
      console.error('Failed to fetch extras:', err)
      extrasModalLoading.value = false
      // Even if fetch fails, modal is open — show with empty extras
      extrasModalData.value = {}
      return
    }
  }

  // Step 2: Check Variants (Secondary)
  // If product has multiple variants, show ProductExtrasModal with variants only (no DB extras)
  const hasVariants = product.productDetails?.hasVariants === true
  const variantCount = product.productDetails?.variants?.length || 0
  
  if (hasVariants && variantCount > 1) {
    extrasModalProduct.value = product
    extrasModalData.value = {} // No DB extras, just variants from productDetails
    showExtrasModal.value = true
    return
  }

  // Step 3: Direct Add to Cart
  // No extras, no variant selection needed
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
  
  if (isDev) {
    console.log('addProductToCart called with:', cartData)
  }
  
  // Products with variants/extras → always add as new item (unique combination)
  if ((variant && variant.name !== 'Regular') || extras.length > 0) {
    cartItems.value.push({
      product,
      variant,
      extras,
      notes,
      quantity,
      unitPrice
    })
  } else {
    // Check if same product without customization already exists
    const existingIndex = cartItems.value.findIndex(
      item => item.product.id === product.id && 
              !item.variant && 
              (!item.extras || item.extras.length === 0) &&
              !item.notes
    )
    
    if (existingIndex > -1) {
      cartItems.value[existingIndex].quantity += quantity
    } else {
      cartItems.value.push({
        product,
        variant,
        extras,
        notes,
        quantity,
        unitPrice
      })
    }
  }
  
  if (isDev) {
    console.log('Cart items after add:', cartItems.value)
  }
}

const handleCustomizationConfirm = (cartData) => {
  if (isDev) {
    console.log('Adding customized product to cart:', cartData)
  }
  
  addProductToCart(cartData)
  showCustomizationModal.value = false
  selectedProductForCustomization.value = null
}

const handleCustomizationClose = () => {
  showCustomizationModal.value = false
  selectedProductForCustomization.value = null
}

// Handle extras modal confirmation — supports both extras AND variants
const handleExtrasConfirm = (data) => {
  if (isDev) {
    console.log('Extras confirmed:', data)
  }

  const product = extrasModalProduct.value
  // Total = Master product price + extras total
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
  if (confirm('Clear all items from cart?')) {
    cartItems.value = []
  }
}

const handleCheckout = () => {
  if (cartItems.value.length === 0) {
    showError('Cart is empty')
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
      voucherError.value = response?.data?.validation?.reason || 'This voucher cannot be applied'
      errorVoucherId.value = voucher.id
    }
  } catch (err) {
    voucherError.value = err.message || 'Failed to validate voucher'
    errorVoucherId.value = voucher.id
  }
}

const handleOpenDrawer = async () => {
  try {
    await openCashDrawer()
    showSuccess('Cash drawer opened')
  } catch (error) {
    showError(error.message || 'Failed to open cash drawer')
  }
}

const handlePaymentSubmit = async (orderData) => {
  processingError.value = null
  showPaymentModal.value = false

  // Build step labels based on what will be processed
  const steps = ['Sedang memverifikasi pesanan...', 'Sedang memproses pembayaran...']
  if (orderData.voucherCode) steps.push('Sedang menambahkan voucher diskon...')
  steps.push('Sedang menyimpan transaksi...')
  startProcessingSteps(steps)
  showProcessingModal.value = true

  try {
    const response = await createOrder(orderData)
    
    // Check kitchen printer status
    if (response.print?.kitchenTicket?.success) {
      showSuccess('Order created and sent to kitchen')
    } else if (response.print?.kitchenTicket?.skipped) {
      showSuccess('Order created (kitchen printer not configured)')
    }

    // Optional: Adjust stock for products with trackInventory = true
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
          // Don't fail the order if stock adjustment fails
        }
      }
    }

    // Clear cart and show receipt
    // `createOrder` may return either the full API response or the `.data` object.
    // Normalize to the data object for the receipt modal.
    completedOrder.value = response.data || response
    cartItems.value = []
    stopProcessingSteps()
    showProcessingModal.value = false
    showReceiptModal.value = true
    
  } catch (err) {
    console.error('Order creation error:', err)
    stopProcessingSteps()
    processingError.value = err?.response?.data?.message || err?.message || 'Terjadi kesalahan, silakan coba lagi.'
  }
}

const handlePrint = () => {
  window.print()
}

const handleReceiptClose = () => {
  showReceiptModal.value = false
  // Optional: redirect to order detail
}

onMounted(async () => {
  try {
    await Promise.all([
      fetchProducts({ isActive: true, limit: 200 }),
      fetchCategories(),
      // Fetch tables without restricting to 'available' so we can filter out occupied ones client-side
      fetchTables({ limit: 100 })
    ])
  } catch (error) {
    console.error('Failed to load POS data:', error)
  }
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="bg-base-100 border-b p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <IconShoppingCart class="w-6 h-6 text-info" />
          <h1 class="text-2xl font-bold">Point of Sale</h1>
        </div>
        <div class="flex gap-2">
          <router-link 
            v-if="isCombinedBillingEnabled()" 
            to="/billing/combined" 
            class="btn btn-primary btn-sm"
          >
            <IconCrown class="w-4 h-4 mr-2" />
            Combined Billing
          </router-link>
          <router-link to="/restaurant/orders" class="btn btn-ghost btn-sm">
            <IconList class="w-4 h-4 mr-2" />
            View Orders
          </router-link>
          <router-link to="/restaurant" class="btn btn-ghost btn-sm">
            <IconDashboard class="w-4 h-4 mr-2" />
            Dashboard
          </router-link>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex flex-col lg:flex-row gap-4">
      <!-- Left: Products (60%) -->
      <div class="w-full lg:w-3/5 border-r h-full min-h-0">
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

      <!-- Right: Cart (40%) -->
      <div class="hidden lg:block lg:w-2/5 h-full min-h-0">
        <POSCart
          :items="cartItems"
          @update:items="cartItems = $event"
          @checkout="handleCheckout"
          @clear="clearCart"
        />
      </div>
    </div>

    <!-- Mobile Cart Button -->
    <div class="lg:hidden fixed bottom-4 right-4 z-10">
      <button 
        class="btn btn-primary btn-circle btn-lg shadow-lg"
        @click="handleCheckout"
      >
        <div class="relative">
          <IconShoppingCart class="h-6 w-6" />
          <span 
            v-if="cartItems.length > 0"
            class="absolute -top-2 -right-2 badge badge-error badge-sm"
          >
            {{ cartItems.length }}
          </span>
        </div>
      </button>
    </div>

    <!-- Payment Modal -->
    <POSPaymentModal
      :show="showPaymentModal"
      :cart-items="cartItems"
      :tables="availableTables"
      :loading="orderLoading || tablesLoading"
      :initial-voucher="appliedVoucher"
      @close="showPaymentModal = false"
      @submit="handlePaymentSubmit"
      @open-drawer="handleOpenDrawer"
      @open-voucher-modal="openVoucherModal"
      @voucher-applied="(v) => { appliedVoucher = v }"
      @voucher-cleared="() => { appliedVoucher = null }"
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

    <!-- Voucher Selection Modal (page-level) -->
    <Teleport to="body">
    <dialog ref="voucherModal" class="modal">
      <div class="modal-box w-11/12 max-w-3xl">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold">Select Voucher</h3>
          <button type="button" @click="closeVoucherModal" class="btn btn-sm btn-circle btn-ghost">✕</button>
        </div>

        <div class="form-control mb-4">
          <input
            type="text"
            placeholder="Search voucher by code or name..."
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
            No vouchers found
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
                      <div class="text-xs text-base-content/50 mt-1">
                        <span v-if="voucher.minPurchaseAmount && parseFloat(voucher.minPurchaseAmount) > 0">Min. purchase: {{ formatCurrency(parseFloat(voucher.minPurchaseAmount)) }} • </span>
                        <span v-if="voucher.applicableTo">{{ voucher.applicableTo === 'all' ? 'All items' : voucher.applicableTo === 'membership' ? 'Membership only' : 'Products only' }}</span>
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

    <!-- Product Customization Modal (inline JSONB variants/extras) -->
    <ProductCustomizationModal
      v-if="selectedProductForCustomization"
      :show="showCustomizationModal"
      :product="selectedProductForCustomization"
      @add-to-cart="handleCustomizationConfirm"
      @close="handleCustomizationClose"
    />

    <!-- Product Extras Modal (DB table extras via API) -->
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
