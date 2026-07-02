<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'
import { useApi } from '@/composables/core/useApi'
import { useRestaurantProducts } from '@/composables/restaurant/useRestaurantProducts'
import { useRestaurantCategories } from '@/composables/restaurant/useRestaurantCategories'
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'
import { useRestaurantTables } from '@/composables/restaurant/useRestaurantTables'
import { useRestaurantBilling } from '@/composables/restaurant/useRestaurantBilling'
import { useProductExtras } from '@/composables/restaurant/useProductExtras'
import { useServicePlans } from '@/composables/gym/service-management'
import MembershipSelector from './MembershipSelector.vue'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'
import { useMembers } from '@/composables/gym/member-management'
import ProductExtrasModal from '@/components/restaurant/products/ProductExtrasModal.vue'
import VoucherApplier from './VoucherApplier.vue'
import { getDefaultProductVariant, getProductBasePrice, getVariantEffectivePrice } from '@/utils/restaurantPricing'
import { 
  IconSearch, 
  IconUser, 
  IconShoppingCart, 
  IconCreditCard,
  IconCash,
  IconPlus,
  IconMinus,
  IconTrash,
  IconReceipt,
  IconMapPin,
  IconArmchair,
  IconCheck
} from '@tabler/icons-vue'

const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit'])

const api = useApi()
const { fetchProducts, products } = useRestaurantProducts()
const { fetchCategories, categories } = useRestaurantCategories()
const { fetchLocations, locations } = useRestaurantLocations()
const { fetchTables, tables } = useRestaurantTables()
const { formatCurrency, calculateTotals } = useRestaurantBilling()
const { fetchExtras: fetchProductExtras, groupedExtras: productGroupedExtras } = useProductExtras()
// dev flag to show debug breakdown when needed
const isDev = import.meta.env.DEV
const { plans, loading: plansLoading, fetchPlans } = useServicePlans()
const { members, loading: membersLoading, fetchMembers } = useMembers()

// Member modal ref
const memberModal = ref(null)
const memberSearchInput = ref(null)

// Service plans UI state
const activeTab = ref('all')
const planSearchQuery = ref('')
const planPage = ref(1)
const planPageSize = ref(6)

const serviceTypes = computed(() => {
  if (!plans.value || plans.value.length === 0) return []
  const types = [...new Set(plans.value.map(p => p.serviceType))]
  const typeLabels = {
    'membership': 'Membership',
    'class_package': 'Class Package',
    'pt_package': 'PT Package',
    'spa_package': 'Spa Package',
    'custom': 'Custom Service'
  }

  let filteredBySearch = plans.value.filter(p => p.isActive)
  if (planSearchQuery.value.trim()) {
    const search = planSearchQuery.value.toLowerCase().trim()
    filteredBySearch = filteredBySearch.filter(p => p.name.toLowerCase().includes(search) || (p.description && p.description.toLowerCase().includes(search)))
  }

  const result = [{ value: 'all', label: 'All Services', count: filteredBySearch.length }]
  types.forEach(type => {
    const count = filteredBySearch.filter(p => p.serviceType === type).length
    result.push({ value: type, label: typeLabels[type] || type, count })
  })
  return result
})

const filteredPlans = computed(() => {
  if (!plans.value) return []
  let filtered = activeTab.value === 'all' ? plans.value.filter(p => p.isActive) : plans.value.filter(p => p.serviceType === activeTab.value && p.isActive)
  if (planSearchQuery.value.trim()) {
    const search = planSearchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(p => p.name.toLowerCase().includes(search) || (p.description && p.description.toLowerCase().includes(search)))
  }
  const start = (planPage.value - 1) * planPageSize.value
  const end = start + planPageSize.value
  return filtered.slice(start, end)
})

const isMember = computed(() => customerType.value === 'member')

const isInServicePlan = (planId) => {
  return servicePlanItems.value.some(item => item.id === planId)
}

const toggleServicePlan = (plan) => {
  if (!isMember.value) return
  const exists = servicePlanItems.value.find(p => p.id === plan.id)
  if (exists) {
    // remove by creating a new array (immutable update)
    servicePlanItems.value = servicePlanItems.value.filter(p => p.id !== plan.id)
    return
  }
  // add by replacing array reference to ensure reactivity
  servicePlanItems.value = [
    ...servicePlanItems.value,
    { id: plan.id, name: plan.name, price: plan.price, startDate: new Date().toISOString().split('T')[0], serviceType: plan.serviceType }
  ]
}

const openMemberModal = async () => {
  if (!members.value || members.value.length === 0) {
    await fetchMembers({ page: 1, limit: 100, isActive: 'all' })
  }
  memberModal.value?.showModal()
  // autofocus the member search input once modal is shown
  await Promise.resolve()
  memberSearchInput.value?.focus()
}

const closeMemberModal = () => {
  memberModal.value?.close()
}

// Form state
const customerType = ref('member') // 'member' or 'non-member'
const selectedMember = ref(null)
const memberSearchQuery = ref('')
const memberSearchResults = ref([])
const isSearchingMember = ref(false)

const customerName = ref('')
const customerPhone = ref('')

const locationId = ref('')
const tableId = ref(null)
const orderType = ref('dine-in')

// Cart items
const servicePlanItems = ref([])
const productItems = ref([])

// Payment
const voucher = ref(null)
const paymentMethod = ref('cash')
const paymentAmount = ref(0)
const notes = ref('')

// Product Extras Modal state
const showExtrasModal = ref(false)
const extrasModalProduct = ref(null)
const extrasModalData = ref({})
const extrasModalLoading = ref(false)

const createCartItemId = () => `cart-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const getCartItemIdentity = (item) => item.cartItemId || item.id
// Subscription-driven payment options
const subscriptionStore = useSubscriptionStore()
const PAYMENT_FEATURE_KEY_MAP = {
  cash: 'cash',
  bankTransfer: 'bank_transfer',
  bank_transfer: 'bank_transfer',
  creditCard: 'credit_card',
  credit_card: 'credit_card',
  debitCard: 'debit_card',
  debit_card: 'debit_card',
  eWallet: 'ewallet',
  ewallet: 'ewallet',
  paymentGateway: 'payment_gateway',
  qris: 'qris',
  compliment: 'compliment',
  card: 'credit_card',
}

const paymentLabels = {
  cash: 'Cash',
  credit_card: 'Kartu',
  debit_card: 'Kartu Debit',
  bank_transfer: 'Transfer Bank',
  ewallet: 'E-Wallet',
  payment_gateway: 'Payment Gateway',
  qris: 'QRIS',
  compliment: 'Compliment'
}

const paymentOptions = computed(() => {
  const features = subscriptionStore.features
  if (features && features.payments && typeof features.payments === 'object') {
    const opts = Object.entries(features.payments)
      .filter(([, enabled]) => !!enabled)
      .map(([key]) => PAYMENT_FEATURE_KEY_MAP[key] || key)

    const seen = new Set(); const uniq = []
    for (const v of opts) {
      if (!seen.has(v)) { seen.add(v); uniq.push(v) }
    }
    // Always add compliment as an option
    if (!uniq.includes('compliment')) {
      uniq.push('compliment')
    }
    if (uniq.length) return uniq.map(v => ({ value: v, label: paymentLabels[v] || v }))
  }
  // default fallback
  return [ { value: 'cash', label: 'Tunai' }, { value: 'credit_card', label: 'Kartu' }, { value: 'compliment', label: 'Gratis (Compliment)' } ]
})

// Product search
const productSearchQuery = ref('')
const selectedCategory = ref('')

// Computed
const filteredProducts = computed(() => {
  let filtered = products.value || []
  
  if (selectedCategory.value) {
    filtered = filtered.filter(p => p.categoryId === selectedCategory.value)
  }
  
  if (productSearchQuery.value) {
    const query = productSearchQuery.value.toLowerCase()
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query)
    )
  }
  
  return filtered
})

const availableTables = computed(() => {
  if (!locationId.value) return []
  return (tables.value || []).filter(t => 
    t.locationId === locationId.value && 
    (t.status !== 'occupied')
  )
})

const totals = computed(() => {
  return calculateTotals(servicePlanItems.value, productItems.value, voucher.value)
})

const isCashPayment = computed(() => paymentMethod.value === 'cash')

const changeAmount = computed(() => {
  if (!isCashPayment.value) return 0
  return Math.max(0, paymentAmount.value - totals.value.total)
})

const syncPaymentAmountToTotal = () => {
  if (!paymentMethod.value || totals.value.total <= 0) {
    paymentAmount.value = 0
    return
  }

  paymentAmount.value = totals.value.total
}

const isValid = computed(() => {
  // Customer validation:
  // - member: require selectedMember
  // - non-member: require customerName (phone is optional)
  let hasCustomer = false
  if (customerType.value === 'member') {
    hasCustomer = !!selectedMember.value
  } else {
    hasCustomer = !!customerName.value
  }

  const hasLocation = !!locationId.value
  const hasTable = orderType.value !== 'dine-in' || !!tableId.value
  const hasItems = servicePlanItems.value.length > 0 || productItems.value.length > 0
  const hasSufficientPayment = isCashPayment.value
    ? paymentAmount.value >= totals.value.total
    : Math.abs(paymentAmount.value - totals.value.total) < 1

  return hasCustomer && hasLocation && hasTable && hasItems && hasSufficientPayment
})

// Member search
let searchTimeout = null
const searchMembers = async () => {
  if (!memberSearchQuery.value || memberSearchQuery.value.length < 2) {
    memberSearchResults.value = []
    return
  }
  
  isSearchingMember.value = true
  try {
    const response = await api.get(`/members?search=${encodeURIComponent(memberSearchQuery.value)}&limit=10`)
    memberSearchResults.value = response.data?.data || response.data || []
  } catch (err) {
    console.error('Failed to search members:', err)
  } finally {
    isSearchingMember.value = false
  }
}

watch(memberSearchQuery, (val) => {
  clearTimeout(searchTimeout)
  if (val) {
    searchTimeout = setTimeout(searchMembers, 300)
  } else {
    memberSearchResults.value = []
  }
})

const selectMember = (member) => {
  selectedMember.value = member
  memberSearchQuery.value = ''
  memberSearchResults.value = []
}

const clearMember = () => {
  selectedMember.value = null
}

// Format duration for service plans (used in template)
const formatDuration = (plan) => {
  if (!plan) return '-'
  if (plan.durationType === 'time_based' || plan.duration) {
    return `${plan.duration} days`
  }
  if (plan.durationType === 'session_based' || plan.sessions) {
    return `${plan.sessions} sessions`
  }
  return '-'
}

// Product cart functions
const addToCart = async (product) => {
  // Step 1: Check Extras (Prioritas Utama)
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
      extrasModalData.value = {}
      return
    }
  }

  // Step 2: Check Variants (Secondary)
  const hasVariants = product.productDetails?.hasVariants === true
  const variantCount = product.productDetails?.variants?.length || 0
  
  if (hasVariants && variantCount > 1) {
    extrasModalProduct.value = product
    extrasModalData.value = {}
    showExtrasModal.value = true
    return
  }

  // Step 3: Direct Add to Cart
  addProductDirectly(product, [], getDefaultProductVariant(product))
}

const addProductDirectly = (product, selectedExtras = [], selectedVariant = null) => {
  const extrasTotal = selectedExtras.reduce((sum, e) => sum + (parseFloat(e.price) || 0) * (e.quantity || 1), 0)
  const basePrice = selectedVariant
    ? getVariantEffectivePrice(product, selectedVariant)
    : getProductBasePrice(product)
  
  // If product has extras or variant selection, always add as new item
  if (selectedExtras.length > 0 || selectedVariant) {
    productItems.value = [
      ...productItems.value,
      {
        cartItemId: createCartItemId(),
        id: product.id,
        name: product.name,
        price: basePrice + extrasTotal,
        basePrice,
        quantity: 1,
        variant: selectedVariant,
        extras: selectedExtras,
        extrasTotal,
        unitPrice: basePrice + extrasTotal,
        notes: ''
      }
    ]
    return
  }

  // No extras/variants - check for existing item
  const existing = productItems.value.find(p => p.id === product.id && (!p.extras || p.extras.length === 0) && !p.variant)
  if (existing) {
    productItems.value = productItems.value.map(p => 
      p.id === product.id && (!p.extras || p.extras.length === 0) && !p.variant
        ? { ...p, quantity: (p.quantity || 0) + 1 } 
        : p
    )
  } else {
    productItems.value = [
      ...productItems.value,
      {
        cartItemId: createCartItemId(),
        id: product.id,
        name: product.name,
        price: basePrice,
        quantity: 1,
        extras: [],
        extrasTotal: 0,
        unitPrice: basePrice,
        notes: ''
      }
    ]
  }
}

// Handle extras modal confirmation — supports both extras AND variants
const handleExtrasConfirm = (data) => {
  if (isDev) {
    console.log('Extras confirmed:', data)
  }
  const product = extrasModalProduct.value
  addProductDirectly(product, data.selectedExtras || [], data.selectedVariant || null)
  showExtrasModal.value = false
  extrasModalProduct.value = null
  extrasModalData.value = {}
}

const handleExtrasClose = () => {
  showExtrasModal.value = false
  extrasModalProduct.value = null
  extrasModalData.value = {}
}

const updateQuantity = (item, delta) => {
  const itemIdentity = getCartItemIdentity(item)

  // update by mapping to a new array to ensure reactivity
  productItems.value = productItems.value.map(p => {
    if (getCartItemIdentity(p) !== itemIdentity) return p
    const newQty = (p.quantity || 0) + delta
    return { ...p, quantity: newQty }
  }).filter(p => p.quantity > 0)
}

const removeFromCart = (item) => {
  const itemIdentity = getCartItemIdentity(item)
  productItems.value = productItems.value.filter(p => getCartItemIdentity(p) !== itemIdentity)
}

const clearCart = () => {
  servicePlanItems.value = []
  productItems.value = []
}

const getCartQuantity = (productId) => {
  const item = productItems.value.find(p => p.id === productId)
  return item?.quantity || 0
}

// Payment
const setFullPayment = () => {
  paymentAmount.value = totals.value.total
}

// Voucher handlers
const handleVoucherApplied = (v) => {
  voucher.value = v
}

const handleVoucherCleared = () => {
  voucher.value = null
}

watch(
  () => totals.value.total,
  () => {
    syncPaymentAmountToTotal()
  }
)

watch(
  () => paymentMethod.value,
  () => {
    syncPaymentAmountToTotal()
  }
)

// Submit
const handleSubmit = () => {
  const data = {
    customerId: selectedMember.value?.id,
    customerType: customerType.value,
    customerName: customerName.value || selectedMember.value?.name,
    customerPhone: customerPhone.value || selectedMember.value?.phone,
    tableId: tableId.value,
    locationId: locationId.value,
    orderType: orderType.value,
      items: [
      ...servicePlanItems.value.map(m => ({
        // backend expects item.type to match serviceType (membership/class_package/pt_package/...)
        type: 'service_plan',
        servicePlanId: m.id,
        name: m.name,
        price: m.price,
        startDate: m.startDate
      })),
      ...productItems.value.map(p => ({
        type: 'product',
        productId: p.id,
        name: p.name,
        price: p.basePrice ?? p.price, // BASE price only; backend computes final from base + extras
        quantity: p.quantity,
        notes: p.notes,
        ...(p.variant?.name && p.variant.name !== 'Regular' ? { variantName: p.variant.name } : {}),
        extras: (p.extras || []).map(e => ({
          id: e.id,
          quantity: e.quantity || 1
        }))
      }))
    ],
    subtotal: totals.value.subtotal,
    discount: totals.value.discount,
    serviceCharge: totals.value.serviceCharge || 0,
    total: totals.value.total,
    payments: [{
      method: paymentMethod.value,
      amount: paymentAmount.value
    }],
    change: changeAmount.value,
    voucherCode: voucher.value?.code,
    notes: notes.value
  }

  emit('submit', data)
}

onMounted(async () => {
  await Promise.all([
    fetchProducts(),
    fetchCategories(),
    fetchLocations(),
    fetchTables(),
    // load service plans for membership selector
    fetchPlans({ isActive: 'true', limit: 100 })
  ])
  
  // Set default location if only one
  if (locations.value?.length === 1) {
    locationId.value = locations.value[0].id
  }
})
</script>

<template>
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
    <!-- Left: Customer & Items Selection -->
    <div class="space-y-6 lg:col-span-2">
      <!-- Location & Order Type -->
      <div class="shadow-xl card bg-base-100">
        <div class="card-body">
          <h2 class="card-title">
            <IconMapPin class="w-5 h-5" />
            Location & Order Type
          </h2>
          
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <!-- Location -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Location *</span>
              </label>
              <select v-model="locationId" class="select select-bordered">
                <option value="">Select location</option>
                <option v-for="loc in locations" :key="loc.id" :value="loc.id">
                  {{ loc.name }}
                </option>
              </select>
            </div>
            
            <!-- Order Type -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Order Type</span>
              </label>
              <select v-model="orderType" class="select select-bordered">
                <option value="dine-in">Dine In</option>
                <option value="takeaway">Takeaway</option>
              </select>
            </div>
            
            <!-- Table -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Table</span>
              </label>
              <select v-model="tableId" class="select select-bordered" :disabled="orderType !== 'dine-in'">
                <!-- When not dine-in allow explicit 'No table' choice -->
                <option v-if="orderType !== 'dine-in'" :value="null">No table</option>
                <!-- When dine-in require selection: show a disabled placeholder (use null so v-model=null selects it) -->
                <option v-else :value="null" disabled>Select table</option>
                <option v-for="table in availableTables" :key="table.id" :value="table.id">
                  {{ table.tableNumber }} - {{ table.tableName }} ({{ table.capacity }} seats) - {{ table.status }} 
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Customer Selection -->
      <div class="shadow-xl card bg-base-100">
        <div class="card-body">
          <h2 class="card-title">
            <IconUser class="w-5 h-5" />
            Customer Information
          </h2>
          
          <!-- Customer Type Tabs -->
          <div class="tabs tabs-boxed w-fit">
            <button
              :class="['tab', { 'tab-active': customerType === 'member' }]"
              @click="customerType = 'member'"
            >
              Member
            </button>
            <button
              :class="['tab', { 'tab-active': customerType === 'non-member' }]"
              @click="customerType = 'non-member'"
            >
              Non-Member
            </button>
          </div>

          <!-- Member Search -->
          <div v-if="customerType === 'member'" class="space-y-3">
            <div v-if="selectedMember" class="alert bg-primary/10">
              <div class="flex-1">
                <div class="font-semibold">{{ selectedMember.name }}</div>
                <div class="text-sm text-base-content/60">
                  {{ selectedMember.phone }} • {{ selectedMember.email }}
                </div>
              </div>
              <button class="btn btn-ghost btn-sm" @click="clearMember">
                <IconTrash class="w-4 h-4" />
              </button>
            </div>
            
            <div v-else class="relative form-control">
              <label class="label">
                <span class="label-text">Search Member</span>
              </label>
              <div class="input-group">
                <button class="btn btn-outline btn-block" @click="openMemberModal">
                  <IconUser class="w-4 h-4 mr-2" />
                  Select Member
                </button>
              </div>
              
              <!-- Search Results -->
              <div 
                v-if="memberSearchResults.length > 0" 
                class="absolute left-0 right-0 z-10 mt-1 overflow-y-auto border rounded-lg shadow-xl top-full bg-base-100 border-base-200 max-h-60"
              >
                <div 
                  v-for="member in memberSearchResults" 
                  :key="member.id"
                  class="p-3 cursor-pointer hover:bg-base-200"
                  @click="selectMember(member)"
                >
                  <div class="font-semibold">{{ member.name }}</div>
                  <div class="text-sm text-base-content/60">{{ member.phone }}</div>
                </div>
              </div>
              
              <div v-if="isSearchingMember" class="absolute left-0 right-0 z-10 p-4 mt-1 text-center rounded-lg shadow-xl top-full bg-base-100">
                <span class="loading loading-spinner loading-sm"></span>
              </div>
            </div>
          </div>

          <!-- Non-Member Info -->
          <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Name *</span>
              </label>
              <input
                v-model="customerName"
                type="text"
                class="w-full input input-bordered"
                placeholder="Customer name"
              />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text">Phone *</span>
              </label>
              <input
                v-model="customerPhone"
                type="tel"
                class="w-full input input-bordered"
                placeholder="Phone number"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Membership / Service Plans Selection (mirrors POS page) -->
      <div class="shadow-xl card bg-base-100">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h2 class="card-title">
              <IconReceipt class="w-5 h-5" />
              Service Plans
            </h2>
            <div class="form-control">
              <input
                type="text"
                placeholder="Search service plans..."
                class="w-64 input input-bordered input-sm"
                v-model="planSearchQuery"
              />
            </div>
          </div>

          <div v-if="plansLoading" class="flex items-center justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>

          <div v-else-if="serviceTypes.length > 0" class="w-full">
            <div v-if="!isMember" class="mb-4 text-sm text-center text-base-content/60">
              Switch to <strong>Member</strong> to add service plans to the cart.
            </div>
            <div role="tablist" class="mb-4 tabs tabs-boxed">
              <a
                v-for="type in serviceTypes"
                :key="type.value"
                role="tab"
                class="tab"
                :class="{ 'tab-active': activeTab === type.value }"
                @click="activeTab = type.value"
              >
                {{ type.label }}
                <span v-if="type.count > 0" class="ml-2 badge badge-sm">{{ type.count }}</span>
              </a>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div
                v-for="plan in filteredPlans"
                :key="plan.id"
                class="transition-all card bg-base-200"
                :class="{
                  'ring-2 ring-primary': isInServicePlan(plan.id),
                  'hover:bg-base-300 cursor-pointer': isMember,
                  'opacity-60 cursor-not-allowed': !isMember
                }"
                @click="isMember && toggleServicePlan(plan)"
              >
                <div class="p-4 card-body">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <h3 class="font-semibold">{{ plan.name }}</h3>
                        <div v-if="plan.isPopular" class="badge badge-warning badge-sm">⭐ Popular</div>
                      </div>
                      <p class="mt-1 text-sm text-base-content/60 line-clamp-2">{{ plan.description }}</p>
                    </div>
                    <div v-if="isInServicePlan(plan.id)" class="badge badge-primary"><IconCheck class="w-4 h-4" /></div>
                  </div>
                  <div class="flex items-center justify-between mt-3">
                    <div class="text-lg font-bold text-primary">{{ formatCurrency(plan.price) }}</div>
                    <div class="badge badge-sm">{{ formatDuration(plan) }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="filteredPlans.length === 0" class="py-8 text-center text-base-content/60">No service plans available for this category</div>
          </div>

          <div v-else class="py-8 text-center text-base-content/60">No service plans available</div>
        </div>
      </div>

      <!-- Product Selection -->
      <div class="shadow-xl card bg-base-100">
        <div class="card-body">
          <h2 class="card-title">
            <IconShoppingCart class="w-5 h-5" />
            Restaurant Products
          </h2>
          
          <!-- Search -->
          <div class="mb-3">
            <label class="input input-bordered flex items-center gap-2">
              <IconSearch class="w-5 h-5 opacity-70" />
              <input
                v-model="productSearchQuery"
                type="text"
                class="grow"
                placeholder="Search products..."
              />
            </label>
          </div>

          <!-- Category Tabs (POS Style) -->
          <div class="mb-4 overflow-x-auto">
            <div class="flex gap-2 pb-2 flex-nowrap">
              <button 
                class="btn btn-sm whitespace-nowrap"
                :class="{ 'btn-primary': !selectedCategory }"
                @click="selectedCategory = ''"
              >
                All
              </button>
              <button 
                v-for="cat in categories" 
                :key="cat.id"
                class="btn btn-sm whitespace-nowrap"
                :class="{ 'btn-primary': selectedCategory === cat.id }"
                @click="selectedCategory = cat.id"
              >
                <span v-if="cat.icon">{{ cat.icon }}</span>
                {{ cat.name }}
              </button>
            </div>
          </div>
          
          <!-- Products Grid -->
          <div class="grid grid-cols-2 gap-3 overflow-y-auto md:grid-cols-3 lg:grid-cols-4 max-h-96">
            <div 
              v-for="product in filteredProducts" 
              :key="product.id"
              class="transition-colors cursor-pointer card bg-base-200 hover:bg-base-300"
              @click="addToCart(product)"
            >
              <div class="p-3 card-body">
                <div class="mb-2 overflow-hidden rounded-lg aspect-square bg-base-300">
                  <img 
                    v-if="product.imageUrl"
                    :src="product.imageUrl" 
                    :alt="product.name"
                    class="object-cover w-full h-full"
                  />
                  <div v-else class="flex items-center justify-center w-full h-full">
                    <IconShoppingCart class="w-8 h-8 text-base-content/30" />
                  </div>
                </div>
                <h3 class="text-sm font-semibold truncate">{{ product.name }}</h3>
                <div class="text-sm font-bold text-primary">{{ formatCurrency(product.price) }}</div>
                
                <!-- Quantity Badge -->
                <div 
                  v-if="getCartQuantity(product.id) > 0" 
                  class="absolute badge badge-primary badge-sm top-2 right-2"
                >
                  {{ getCartQuantity(product.id) }}
                </div>
              </div>
            </div>
          </div>
          
          <!-- Empty State -->
          <div v-if="!filteredProducts.length" class="py-8 text-center text-base-content/60">
            No products found
          </div>
        </div>
      </div>
    </div>

    <!-- Right: Cart & Payment -->
    <div class="space-y-6">
        <!-- Cart Summary (POSCart-style) -->
        <div class="sticky z-20 self-start shadow-xl top-4 card bg-base-100 h-full">
          <div class="flex flex-col h-full bg-base-100">
            <!-- Header -->
            <div class="p-3 border-b">
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">Cart Summary</h2>
                <button
                  v-if="servicePlanItems.length > 0 || productItems.length > 0"
                  class="btn btn-ghost btn-xs text-error"
                  @click="clearCart"
                  title="Clear cart"
                >
                  Clear
                </button>
              </div>
              <div class="mt-1 text-xs text-base-content/60">
                {{ servicePlanItems.length + productItems.length }} item{{ (servicePlanItems.length + productItems.length) !== 1 ? 's' : '' }}
              </div>
            </div>

            <!-- Items List -->
            <div class="flex-1 p-2 overflow-y-auto">
              <div v-if="(servicePlanItems.length + productItems.length) === 0" class="py-12 text-center text-base-content/60">
                <IconShoppingCart class="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p class="mb-2 text-lg">Cart is empty</p>
                <p class="text-sm">Add items from the left</p>
              </div>

              <div v-else class="space-y-3">
                <div v-for="(item, idx) in [...servicePlanItems, ...productItems]" :key="(getCartItemIdentity(item) || idx) + '-cart'" class="shadow-sm card bg-base-200">
                  <div class="p-3 card-body">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1 min-w-0">
                        <h4 class="text-sm font-medium truncate">{{ item.name || item.product?.name }}</h4>
                        <div class="mt-1 text-xs text-base-content/60">
                          {{ formatCurrency(item.unitPrice || item.price || item.product?.price) }} each
                        </div>
                        <div v-if="item.variant?.name" class="mt-1 text-xs text-info">
                          Variant: {{ item.variant.name }}
                        </div>
                        <!-- Show selected extras -->
                        <div v-if="item.extras && item.extras.length > 0" class="mt-1 space-y-0.5">
                          <div v-for="extra in item.extras" :key="extra.id" class="text-xs text-success">
                            + {{ extra.name }} ({{ formatCurrency(parseFloat(extra.price) * (extra.quantity || 1)) }})
                          </div>
                        </div>
                      </div>
                      <button class="btn btn-ghost btn-xs text-error" @click="removeFromCart(item)">
                        <IconTrash class="w-4 h-4" />
                      </button>
                    </div>

                    <div class="flex items-center justify-between mt-2">
                      <div class="join">
                        <button class="join-item btn btn-xs" @click="updateQuantity(item, -1)">
                          <IconMinus class="w-3 h-3" />
                        </button>
                        <div class="px-3 join-item btn btn-xs no-animation">{{ item.quantity || 1 }}</div>
                        <button class="join-item btn btn-xs" @click="updateQuantity(item, 1)">
                          <IconPlus class="w-3 h-3" />
                        </button>
                      </div>
                      <div class="text-sm font-semibold text-primary">{{ formatCurrency((item.price || item.product?.price) * (item.quantity || 1)) }}</div>
                    </div>

                    <input type="text" placeholder="Notes" class="w-full mt-2 input input-bordered input-sm" :value="item.notes || ''" @input="(e) => item.notes = e.target.value" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer: voucher, totals, payment and submit -->
            <div class="p-3 space-y-3 border-t">
              <VoucherApplier
                :subtotal="totals.subtotal"
                :customer-id="selectedMember?.id"
                :disabled="!servicePlanItems.length && !productItems.length"
                @voucher-applied="handleVoucherApplied"
                @voucher-cleared="handleVoucherCleared"
              />

              <div class="space-y-2 text-sm">
                <div v-if="totals.discount && totals.discount > 0" class="flex justify-between text-base-content/60">
                  <span>Discount</span>
                  <span>-{{ formatCurrency(totals.discount) }}</span>
                </div>
                <div v-if="totals.serviceCharge && totals.serviceCharge > 0" class="flex justify-between text-base-content/60">
                  <span>Service Charge</span>
                  <span>{{ formatCurrency(totals.serviceCharge) }}</span>
                </div>
                <div v-if="totals.tax && totals.tax > 0" class="flex justify-between text-base-content/60">
                  <span>Tax</span>
                  <span>{{ formatCurrency(totals.tax) }}</span>
                </div>
              </div>

              <div class="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span class="text-primary">{{ formatCurrency(totals.total) }}</span>
              </div>

              <div class="my-2 divider"></div>

              <div class="space-y-2">
                <div class="form-control">
                  <label class="label"><span class="label-text">Payment Method</span></label>
                  <select v-model="paymentMethod" class="w-full select select-bordered">
                    <option disabled value="">Select payment method</option>
                    <option v-for="opt in paymentOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>

                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Amount Paid</span>
                    <button class="btn btn-ghost btn-xs" :disabled="!isCashPayment" @click="setFullPayment">Exact</button>
                  </label>
                  <CurrencyInput v-model="paymentAmount" input-class="w-full input input-bordered" :min="0" :disabled="!isCashPayment" />
                </div>

                <div v-if="isCashPayment && changeAmount > 0" class="flex justify-between font-medium text-success">
                  <span>Change</span>
                  <span>{{ formatCurrency(changeAmount) }}</span>
                </div>
                <div v-else-if="!isCashPayment && paymentMethod" class="text-xs text-base-content/60">
                  Non-cash payments always use the exact total: {{ formatCurrency(totals.total) }}
                </div>

                <div class="form-control">
                  <label class="label"><span class="label-text">Notes</span></label>
                  <textarea v-model="notes" class="w-full textarea textarea-bordered" rows="2" placeholder="Additional notes..."></textarea>
                </div>

                <button class="btn btn-primary btn-block" :disabled="loading || !isValid" @click="handleSubmit">
                  <span v-if="loading" class="loading loading-spinner"></span>
                  <span v-else>Complete Transaction</span>
                </button>

                <div v-if="!isValid" class="mt-2 text-xs text-error">
                  <p v-if="!locationId">• Select a location</p>
                  <p v-if="customerType === 'member' && !selectedMember">• Select a member</p>
                  <p v-if="customerType === 'non-member' && (!customerName)">• Enter customer info</p>
                  <p v-if="orderType === 'dine-in' && !tableId">• Select a table</p>
                  <p v-if="!servicePlanItems.length && !productItems.length">• Add items to cart</p>
                  <p v-if="isCashPayment && paymentAmount < totals.total">• Insufficient payment amount</p>
                  <p v-if="!isCashPayment && paymentMethod && Math.abs(paymentAmount - totals.total) >= 1">• Payment amount must match total exactly</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  </div>

  <!-- Member Selection Modal -->
  <dialog ref="memberModal" class="modal">
    <div class="w-11/12 max-w-3xl modal-box">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold">Select Member</h3>
        <button type="button" @click="closeMemberModal" class="btn btn-sm btn-circle btn-ghost">✕</button>
      </div>

      <div class="mb-4 form-control">
        <input
          ref="memberSearchInput"
          v-model="memberSearchQuery"
          type="text"
          placeholder="Search member by name, email, or phone..."
          class="w-full input input-bordered"
          @input="searchMembers"
          autocomplete="off"
        />
      </div>

      <div class="overflow-y-auto max-h-96">
        <div v-if="membersLoading || isSearchingMember" class="flex items-center justify-center py-12">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        <div v-else-if="(members && members.length === 0) && memberSearchQuery.trim() === ''" class="py-12 text-center text-base-content/60">
          No members available
        </div>
        <div v-else-if="memberSearchResults.length === 0 && memberSearchQuery.trim() !== ''" class="py-12 text-center text-base-content/60">
          No members found
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="member in (memberSearchResults.length ? memberSearchResults : members)"
            :key="member.id"
            @click="selectMember(member); closeMemberModal()"
            class="transition-all border cursor-pointer card bg-base-100 border-base-300 hover:border-primary hover:bg-base-200"
          >
            <div class="p-4 card-body">
              <div class="font-semibold">{{ member.name || member.firstName + ' ' + member.lastName }}</div>
              <div class="text-sm text-base-content/60">{{ member.phone }} • {{ member.email }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-action">
        <button type="button" @click="closeMemberModal" class="btn">Cancel</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button type="button" @click="closeMemberModal">close</button>
    </form>
  </dialog>

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
</template>
