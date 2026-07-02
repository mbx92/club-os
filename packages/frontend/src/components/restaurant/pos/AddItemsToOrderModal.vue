<script setup>
import { ref, computed, watch } from 'vue'
import { IconX, IconShoppingCart, IconCheck } from '@tabler/icons-vue'
import POSProductGrid from './POSProductGrid.vue'
import POSCart from './POSCart.vue'
import ProductExtrasModal from '@/components/restaurant/products/ProductExtrasModal.vue'
import { useProductExtras } from '@/composables/restaurant/useProductExtras'
import { getDefaultProductVariant, getProductBasePrice, getVariantEffectivePrice } from '@/utils/restaurantPricing'

const props = defineProps({
  show: { type: Boolean, default: false },
  order: { type: Object, default: null },
  products: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'submit'])

const { fetchExtras: fetchProductExtras, groupedExtras: productGroupedExtras } = useProductExtras()

// Cart & search state
const cartItems = ref([])
const searchQuery = ref('')
const selectedCategory = ref('')

// Product Extras Modal state
const showExtrasModal = ref(false)
const extrasModalProduct = ref(null)
const extrasModalData = ref({})
const extrasModalLoading = ref(false)

const filteredProducts = computed(() => {
  let filtered = props.products.filter(p => p.isActive !== false)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    )
  }
  if (selectedCategory.value) {
    filtered = filtered.filter(p => p.categoryId === selectedCategory.value)
  }
  return filtered
})

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0)

// ---- Cart logic (mirrors floor-plan-pos.vue) ----
const addToCart = async (product) => {
  if (product.isCustomized) {
    try {
      extrasModalLoading.value = true
      extrasModalProduct.value = product
      showExtrasModal.value = true
      await fetchProductExtras(product.id, true)
      extrasModalData.value = productGroupedExtras.value || {}
      extrasModalLoading.value = false
      return
    } catch {
      extrasModalLoading.value = false
      extrasModalData.value = {}
      return
    }
  }
  const hasVariants = product.productDetails?.hasVariants === true
  const variantCount = product.productDetails?.variants?.length || 0
  if (hasVariants && variantCount > 1) {
    extrasModalProduct.value = product
    extrasModalData.value = {}
    showExtrasModal.value = true
    return
  }
  const defaultVariant = getDefaultProductVariant(product)
  addProductToCart({
    product,
    variant: defaultVariant,
    extras: [],
    notes: '',
    quantity: 1,
    unitPrice: defaultVariant
      ? getVariantEffectivePrice(product, defaultVariant)
      : getProductBasePrice(product)
  })
}

const addProductToCart = ({ product, variant, extras, notes, quantity, unitPrice }) => {
  if ((variant && variant.name !== 'Regular') || extras.length > 0) {
    cartItems.value.push({ product, variant, extras, notes, quantity, unitPrice })
  } else {
    const existing = cartItems.value.findIndex(
      i => i.product.id === product.id && !i.variant && (!i.extras || i.extras.length === 0) && !i.notes
    )
    if (existing > -1) {
      cartItems.value[existing].quantity += quantity
    } else {
      cartItems.value.push({ product, variant, extras, notes, quantity, unitPrice })
    }
  }
}

const handleExtrasConfirm = (data) => {
  const product = extrasModalProduct.value
  const basePrice = data.variantPrice || getProductBasePrice(product)
  const extrasTotal  = data.extrasTotal || 0
  addProductToCart({
    product,
    variant: data.selectedVariant || null,
    extras: data.selectedExtras || [],
    notes: '',
    quantity: 1,
    unitPrice: basePrice + extrasTotal
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

// ---- Submit / Close ----
const handleSubmit = () => {
  if (cartItems.value.length === 0) return
  emit('submit', [...cartItems.value])
}

const handleClose = () => {
  cartItems.value = []
  searchQuery.value = ''
  selectedCategory.value = ''
  emit('close')
}

// Reset when modal opens
watch(() => props.show, (val) => {
  if (val) {
    cartItems.value = []
    searchQuery.value = ''
    selectedCategory.value = ''
  }
})
</script>

<template>
  <Teleport to="body">
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box max-w-4xl w-11/12 h-[90vh] flex flex-col p-0 overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b bg-success/10 shrink-0">
        <div class="flex items-center gap-3">
          <IconShoppingCart class="w-5 h-5 text-success" />
          <div>
            <h3 class="font-bold text-base">Tambah Item</h3>
            <p class="text-xs text-base-content/60">
              {{ order?.transactionNumber || `Order #${order?.id?.slice(-6)}` }}
              · Meja {{ order?.table?.tableNumber || '?' }}
            </p>
          </div>
        </div>
        <button class="btn btn-sm btn-circle btn-ghost" @click="handleClose">
          <IconX class="w-4 h-4" />
        </button>
      </div>

      <!-- Body: cart left + products right -->
      <div class="flex flex-1 min-h-0">
        <!-- Left: Cart -->
        <div class="w-2/5 border-r bg-base-50 flex flex-col min-h-0 shrink-0">
          <!-- Cart items -->
          <POSCart
            class="flex-1 overflow-y-auto"
            :items="cartItems"
            :show-checkout="false"
            @update:items="cartItems = $event"
          />

          <!-- Confirm bar -->
          <div class="p-3 border-t bg-base-100 shrink-0">
            <div v-if="cartItems.length > 0" class="mb-2 text-sm font-semibold text-center">
              {{ cartItems.reduce((s, i) => s + i.quantity, 0) }} item baru ·
              {{ formatCurrency(cartItems.reduce((s, i) => s + (i.unitPrice * i.quantity), 0)) }}
            </div>
            <button
              class="btn btn-success btn-block gap-2"
              :disabled="cartItems.length === 0 || loading"
              @click="handleSubmit"
            >
              <span v-if="loading" class="loading loading-spinner loading-sm"></span>
              <IconCheck v-else class="w-4 h-4" />
              Tambah ke Order
            </button>
          </div>
        </div>

        <!-- Right: Products -->
        <div class="flex-1 overflow-y-auto min-h-0">
          <POSProductGrid
            :products="filteredProducts"
            :loading="false"
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

    <form method="dialog" class="modal-backdrop" @click="handleClose">
      <button>close</button>
    </form>
  </dialog>
  </Teleport>

  <!-- Product Extras Modal (inside teleport to avoid z-index issues) -->
  <ProductExtrasModal
    v-if="extrasModalProduct"
    :show="showExtrasModal"
    :product="extrasModalProduct"
    :extras="extrasModalData"
    :loading="extrasModalLoading"
    @confirm="handleExtrasConfirm"
    @close="handleExtrasClose"
  />
</template>
