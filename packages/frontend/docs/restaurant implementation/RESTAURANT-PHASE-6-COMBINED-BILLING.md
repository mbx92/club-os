# 🏦 Phase 6: Combined Billing

**Duration:** Week 8  
**Effort:** ~15 hours  
**Priority:** MEDIUM (Feature-gated)  
**Dependencies:** Phase 1-5 complete  
**Status:** 📋 Ready to Start

---

## 📊 Overview

Implement combined billing system that allows selling gym memberships and restaurant products in a single transaction. This feature is gated by subscription plan.

### Goals
1. ✅ Combined billing transaction flow
2. ✅ Membership + products in one bill
3. ✅ Voucher validation for combined total
4. ✅ Split payments support
5. ✅ Feature flag integration

### Success Criteria
- Feature gated by 'combinedBilling' subscription feature
- Members can purchase membership renewal + restaurant products together
- Vouchers apply to combined total
- Split payments work across both item types
- Receipt clearly shows all items (membership + products)
- Transaction creates both membership record and order

---

## 🗂️ Files to Create

### Composables (1 file)
```
src/composables/restaurant/
└── useRestaurantBilling.js          ✨ NEW (~2 hours)
```

### Pages (1 file)
```
src/pages/billing/
└── combined.vue                     ✨ NEW (~4 hours)
```

### Components (3 files)
```
src/components/billing/
├── CombinedBillingForm.vue          ✨ NEW (~4 hours)
├── MembershipSelector.vue           ✨ NEW (~3 hours)
└── VoucherApplier.vue               ✨ NEW (~2 hours)
```

---

## 📝 Files to Modify

### Pages (1 file)
```
src/pages/restaurant/pos/
└── index.vue                        📝 UPDATE (~1 hour)
```

---

## 🔧 Implementation Details

### 1. Create useRestaurantBilling Composable

**File:** `src/composables/restaurant/useRestaurantBilling.js`

**API Endpoints:**
- POST `/restaurant/billing/combined`
- GET `/restaurant/billing/receipt/:id`
- POST `/restaurant/billing/validate-voucher`

**Code Structure:**
```javascript
import { ref } from 'vue'
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
  const loading = ref(false)
  const error = ref(null)

  // Check if combined billing is enabled
  const isCombinedBillingEnabled = () => {
    return subscriptionStore.hasFeature('combinedBilling')
  }

  // Create combined transaction
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

  // Get transaction receipt
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

  // Validate voucher for combined billing
  const validateVoucherForBilling = async (voucherData) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.post('/restaurant/billing/validate-voucher', voucherData)
      return response.data
    } catch (err) {
      if (isDev) console.error('Validate voucher error:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    transaction,
    receipt,
    loading,
    error,

    // Methods
    isCombinedBillingEnabled,
    createCombinedTransaction,
    getTransactionReceipt,
    validateVoucherForBilling
  }
}
```

**Time Estimate:** 2 hours

---

### 2. Create Combined Billing Page

**File:** `src/pages/billing/combined.vue`

**Features:**
- Member search and selection
- Membership type selector
- Restaurant products selector
- Cart with both memberships and products
- Voucher application
- Split payment support
- Receipt display

**Code Structure:**
```vue
<route lang="yaml">
meta:
  title: Combined Billing
  layout: default
</route>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRestaurantBilling } from '@/composables/restaurant/useRestaurantBilling'
import { useNotification } from '@/composables/core/useNotification'
import CombinedBillingForm from '@/components/billing/CombinedBillingForm.vue'

const router = useRouter()
const { isCombinedBillingEnabled, createCombinedTransaction, loading } = useRestaurantBilling()
const { showError } = useNotification()

const showReceipt = ref(false)
const completedTransaction = ref(null)

// Check feature access
const hasAccess = computed(() => isCombinedBillingEnabled())

const handleSubmit = async (transactionData) => {
  try {
    const result = await createCombinedTransaction(transactionData)
    completedTransaction.value = result
    showReceipt.value = true
  } catch (err) {
    console.error('Transaction error:', err)
  }
}

onMounted(() => {
  if (!hasAccess.value) {
    showError('Combined billing feature not available in your subscription plan')
    router.push('/restaurant')
  }
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Feature Gate Check -->
    <div v-if="!hasAccess" class="alert alert-warning">
      <span>Combined billing feature not available in your subscription plan</span>
      <router-link to="/subscriptions" class="btn btn-sm">Upgrade Plan</router-link>
    </div>

    <!-- Combined Billing Form -->
    <div v-else>
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-3xl font-bold">Combined Billing</h1>
          <p class="text-base-content/60">Membership + Restaurant Products</p>
        </div>
      </div>

      <CombinedBillingForm
        :loading="loading"
        @submit="handleSubmit"
      />
    </div>

    <!-- Receipt Modal -->
    <dialog :class="['modal', { 'modal-open': showReceipt }]">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">Transaction Complete</h3>
        <!-- Receipt component here -->
        <div class="modal-action">
          <button class="btn" @click="showReceipt = false">Close</button>
          <button class="btn btn-primary">Print Receipt</button>
        </div>
      </div>
    </dialog>
  </div>
</template>
```

**Time Estimate:** 4 hours

---

### 3. Create CombinedBillingForm Component

**File:** `src/components/billing/CombinedBillingForm.vue`

**Features:**
- Member search (autocomplete)
- Customer type selector (member/walk-in)
- Membership selector (if applicable)
- Product selector
- Combined cart display
- Subtotals for each type
- Voucher input
- Payment method(s)
- Calculate change

**Code Structure:**
```vue
<script setup>
import { ref, computed } from 'vue'
import { IconSearch, IconUser, IconShoppingCart, IconCreditCard } from '@tabler/icons-vue'
import MembershipSelector from './MembershipSelector.vue'
import VoucherApplier from './VoucherApplier.vue'

const props = defineProps({
  loading: Boolean
})

const emit = defineEmits(['submit'])

// Form state
const customerType = ref('member') // 'member' or 'walk-in'
const selectedMember = ref(null)
const customerName = ref('')
const customerPhone = ref('')
const tableId = ref(null)
const locationId = ref('')
const orderType = ref('dine-in')

// Cart items
const membershipItems = ref([])
const productItems = ref([])
const voucher = ref(null)
const payments = ref([])
const notes = ref('')

// Computed
const subtotal = computed(() => {
  const membershipTotal = membershipItems.value.reduce((sum, item) => sum + item.price, 0)
  const productTotal = productItems.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  return membershipTotal + productTotal
})

const discountAmount = computed(() => voucher.value?.discountAmount || 0)

const totalAmount = computed(() => subtotal.value - discountAmount.value)

const paidAmount = computed(() => {
  return payments.value.reduce((sum, p) => sum + p.amount, 0)
})

const changeAmount = computed(() => {
  return Math.max(0, paidAmount.value - totalAmount.value)
})

const isValid = computed(() => {
  return (selectedMember.value || (customerName.value && customerPhone.value)) &&
         locationId.value &&
         (membershipItems.value.length > 0 || productItems.value.length > 0) &&
         paidAmount.value >= totalAmount.value
})

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
      ...membershipItems.value.map(m => ({
        type: 'membership',
        membershipTypeId: m.id,
        startDate: m.startDate
      })),
      ...productItems.value.map(p => ({
        type: 'product',
        productId: p.id,
        quantity: p.quantity,
        notes: p.notes
      }))
    ],
    payments: payments.value,
    voucherCode: voucher.value?.code,
    notes: notes.value
  }

  emit('submit', data)
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Left: Customer & Items Selection -->
    <div class="lg:col-span-2 space-y-6">
      <!-- Customer Selection -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Customer Information</h2>
          
          <!-- Customer Type -->
          <div class="tabs tabs-boxed">
            <button
              class="tab"
              :class="{ 'tab-active': customerType === 'member' }"
              @click="customerType = 'member'"
            >
              <IconUser class="w-4 h-4 mr-2" />
              Member
            </button>
            <button
              class="tab"
              :class="{ 'tab-active': customerType === 'walk-in' }"
              @click="customerType = 'walk-in'"
            >
              Walk-in
            </button>
          </div>

          <!-- Member Search -->
          <div v-if="customerType === 'member'" class="form-control">
            <label class="label">
              <span class="label-text">Search Member</span>
            </label>
            <!-- Member autocomplete component here -->
            <input
              type="text"
              class="input input-bordered w-full"
              placeholder="Search by name or phone"
            />
          </div>

          <!-- Walk-in Info -->
          <div v-else class="space-y-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Name *</span>
              </label>
              <input
                v-model="customerName"
                type="text"
                class="input input-bordered w-full"
              />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text">Phone *</span>
              </label>
              <input
                v-model="customerPhone"
                type="tel"
                class="input input-bordered w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Membership Selection -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Membership (Optional)</h2>
          <MembershipSelector
            :selected="membershipItems"
            @update:selected="membershipItems = $event"
          />
        </div>
      </div>

      <!-- Product Selection -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Restaurant Products</h2>
          <!-- Product selector component -->
        </div>
      </div>
    </div>

    <!-- Right: Cart & Payment -->
    <div class="space-y-6">
      <!-- Cart Summary -->
      <div class="card bg-base-100 shadow-xl sticky top-4">
        <div class="card-body">
          <h2 class="card-title">Cart</h2>

          <!-- Membership Items -->
          <div v-if="membershipItems.length > 0" class="mb-4">
            <h3 class="font-semibold mb-2">Memberships</h3>
            <div
              v-for="item in membershipItems"
              :key="item.id"
              class="flex justify-between items-center p-2 bg-base-200 rounded mb-2"
            >
              <span class="text-sm">{{ item.name }}</span>
              <span class="font-semibold">{{ formatCurrency(item.price) }}</span>
            </div>
          </div>

          <!-- Product Items -->
          <div v-if="productItems.length > 0" class="mb-4">
            <h3 class="font-semibold mb-2">Products</h3>
            <div
              v-for="item in productItems"
              :key="item.id"
              class="flex justify-between items-center p-2 bg-base-200 rounded mb-2"
            >
              <div class="flex-1">
                <div class="text-sm">{{ item.name }}</div>
                <div class="text-xs text-base-content/60">{{ item.quantity }}x {{ formatCurrency(item.price) }}</div>
              </div>
              <span class="font-semibold">{{ formatCurrency(item.price * item.quantity) }}</span>
            </div>
          </div>

          <div class="divider"></div>

          <!-- Totals -->
          <div class="space-y-2">
            <div class="flex justify-between">
              <span>Subtotal</span>
              <span>{{ formatCurrency(subtotal) }}</span>
            </div>
            <div v-if="discountAmount > 0" class="flex justify-between text-success">
              <span>Discount</span>
              <span>-{{ formatCurrency(discountAmount) }}</span>
            </div>
            <div class="divider my-2"></div>
            <div class="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>{{ formatCurrency(totalAmount) }}</span>
            </div>
          </div>

          <!-- Voucher -->
          <VoucherApplier
            :subtotal="subtotal"
            :customer-id="selectedMember?.id"
            @voucher-applied="voucher = $event"
            @voucher-cleared="voucher = null"
          />

          <!-- Payment Methods -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Payment</span>
            </label>
            <!-- Payment methods component -->
          </div>

          <!-- Submit -->
          <button
            class="btn btn-primary btn-block mt-4"
            :disabled="loading || !isValid"
            @click="handleSubmit"
          >
            <span v-if="loading" class="loading loading-spinner"></span>
            <span v-else>Complete Transaction</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
```

**Time Estimate:** 4 hours

---

### 4. Create MembershipSelector Component

**File:** `src/components/billing/MembershipSelector.vue`

**Features:**
- List available membership types
- Select membership with duration
- Set start date
- Show price
- Multiple memberships support

**Time Estimate:** 3 hours

---

### 5. Create VoucherApplier Component

**File:** `src/components/billing/VoucherApplier.vue`

**Features:**
- Voucher code input
- Validate voucher
- Show discount amount
- Clear voucher
- Error handling

**Time Estimate:** 2 hours

---

### 6. Update POS Page

**File:** `src/pages/restaurant/pos/index.vue`

**Add combined billing option:**

```vue
<div v-if="isCombinedBillingEnabled()" class="flex gap-2 mb-4">
  <router-link to="/billing/combined" class="btn btn-outline btn-sm">
    <IconPlus class="w-4 h-4 mr-2" />
    Combined Billing
  </router-link>
</div>
```

**Time Estimate:** 1 hour

---

## ✅ Testing Checklist

### Feature Gating
- [ ] Feature unavailable without subscription
- [ ] Redirect to upgrade page if not enabled
- [ ] Feature available with proper subscription

### Combined Transactions
- [ ] Create transaction with membership only
- [ ] Create transaction with products only
- [ ] Create transaction with both membership and products
- [ ] Member search works
- [ ] Walk-in customer info captured

### Voucher Integration
- [ ] Apply voucher to combined total
- [ ] Voucher validation checks combined amount
- [ ] Invalid voucher shows error
- [ ] Clear voucher works

### Payment Processing
- [ ] Single payment method works
- [ ] Split payment works
- [ ] Change calculated correctly
- [ ] Receipt shows all items clearly

### Data Integrity
- [ ] Membership record created
- [ ] Order record created
- [ ] Transaction linked to both records
- [ ] Payment records accurate

---

## 📊 Progress Tracking

- [ ] useRestaurantBilling composable created
- [ ] Combined billing page created
- [ ] CombinedBillingForm component created
- [ ] MembershipSelector component created
- [ ] VoucherApplier component created
- [ ] POS page updated with combined billing link
- [ ] Feature flag verified in subscription store
- [ ] All tests passing

**Estimated Completion:** End of Week 8

---

## 🎉 Phase 6 Complete!

Congratulations! With Phase 6 complete, the Restaurant Module implementation is now 100% complete according to the Postman collection.

### Final Checklist
- [ ] All 72 API endpoints integrated
- [ ] All 9 composables created/updated
- [ ] All 26+ pages created/updated
- [ ] All 60+ components created
- [ ] Feature flags implemented
- [ ] Testing complete
- [ ] Documentation updated

---

## 🚀 Next Steps

1. **User Acceptance Testing (UAT)**
   - Test all workflows end-to-end
   - Gather user feedback
   - Fix any issues

2. **Performance Optimization**
   - Optimize bundle size
   - Implement lazy loading
   - Add caching strategies

3. **Documentation**
   - User manuals
   - Admin guides
   - API documentation

4. **Deployment**
   - Staging deployment
   - Production deployment
   - Monitor for issues

---

**Created:** December 1, 2025  
**Status:** 📋 Ready to Start  
**Final Phase:** 6/6
