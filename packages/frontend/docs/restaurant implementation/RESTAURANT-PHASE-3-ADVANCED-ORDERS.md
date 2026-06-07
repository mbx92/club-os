# 💰 Phase 3: Advanced Order Features

**Duration:** Week 4  
**Effort:** ~25 hours  
**Priority:** HIGH  
**Dependencies:** Phase 1, 2 complete  
**Status:** 📋 Ready to Start

---

## 📊 Overview

Implement advanced order management features: split bills, merge bills, print receipts/kitchen tickets, and cash drawer control.

### Goals
1. ✅ Split bill functionality (equal & by items)
2. ✅ Merge multiple bills
3. ✅ Print receipts and kitchen tickets
4. ✅ Cash drawer integration
5. ✅ Enhanced order management

### Success Criteria
- Bills can be split equally (e.g., 3 ways)
- Bills can be split by assigning specific items
- Multiple orders can be merged into one
- Receipts print with proper formatting
- Kitchen tickets print to kitchen printer
- Cash drawer opens on payment completion

---

## 🗂️ Files to Create

### Components (5 files)
```
src/components/restaurant/orders/
├── SplitBillModal.vue               ✨ NEW (~4 hours)
├── MergeBillModal.vue               ✨ NEW (~3 hours)
├── Receipt.vue                      ✨ NEW (~4 hours)
├── KitchenTicket.vue                ✨ NEW (~3 hours)
└── PrintButton.vue                  ✨ NEW (~2 hours)
```

---

## 📝 Files to Modify

### Composables (1 file)
```
src/composables/restaurant/
└── useRestaurantOrders.js           📝 UPDATE (~3 hours)
```

### Pages (2 files)
```
src/pages/restaurant/orders/
├── [id].vue                         📝 UPDATE (~2 hours)
└── index.vue                        📝 UPDATE (~2 hours)
```

### Components (1 file)
```
src/components/restaurant/pos/
└── POSPaymentModal.vue              📝 UPDATE (~2 hours)
```

---

## 🔧 Implementation Details

### 1. Update useRestaurantOrders Composable

**File:** `src/composables/restaurant/useRestaurantOrders.js`

**Add Missing Methods:**

```javascript
// Split bill equally
const splitBillEqual = async (orderId, splits) => {
  loading.value = true
  error.value = null
  try {
    const response = await api.post(`/restaurant/orders/${orderId}/split`, {
      splitType: 'equal',
      splits
    })
    showSuccess(`Bill split into ${splits} parts`)
    return response.data
  } catch (err) {
    if (isDev) console.error('Split bill error:', err)
    error.value = err.message
    handleError(err, 'Failed to split bill')
    throw err
  } finally {
    loading.value = false
  }
}

// Split bill by items
const splitBillByItems = async (orderId, splits) => {
  loading.value = true
  error.value = null
  try {
    const response = await api.post(`/restaurant/orders/${orderId}/split`, {
      splitType: 'by_items',
      splits
    })
    showSuccess('Bill split by items')
    return response.data
  } catch (err) {
    if (isDev) console.error('Split bill error:', err)
    error.value = err.message
    handleError(err, 'Failed to split bill')
    throw err
  } finally {
    loading.value = false
  }
}

// Merge bills
const mergeBills = async (orderIds) => {
  loading.value = true
  error.value = null
  try {
    const response = await api.post('/restaurant/orders/merge', { orderIds })
    showSuccess(`${orderIds.length} orders merged successfully`)
    return response.data
  } catch (err) {
    if (isDev) console.error('Merge bills error:', err)
    error.value = err.message
    handleError(err, 'Failed to merge bills')
    throw err
  } finally {
    loading.value = false
  }
}

// Print receipt or kitchen ticket
const printOrder = async (orderId, type = 'receipt') => {
  loading.value = true
  error.value = null
  try {
    const response = await api.post(`/restaurant/orders/${orderId}/print?type=${type}`)
    
    if (response.data.success) {
      showSuccess(`${type === 'receipt' ? 'Receipt' : 'Kitchen ticket'} sent to printer`)
    } else if (response.data.skipped) {
      showSuccess(`Printer not configured, showing preview`)
    }
    
    return response.data
  } catch (err) {
    if (isDev) console.error('Print order error:', err)
    error.value = err.message
    handleError(err, 'Failed to print')
    throw err
  } finally {
    loading.value = false
  }
}

// Open cash drawer
const openCashDrawer = async () => {
  loading.value = true
  error.value = null
  try {
    const response = await api.post('/restaurant/orders/drawer/open')
    
    if (response.data.success) {
      showSuccess('Cash drawer opened')
    } else {
      showSuccess('Cash drawer not configured')
    }
    
    return response.data
  } catch (err) {
    if (isDev) console.error('Open cash drawer error:', err)
    error.value = err.message
    handleError(err, 'Failed to open cash drawer')
    throw err
  } finally {
    loading.value = false
  }
}

// Add to return object
return {
  // ... existing exports
  splitBillEqual,
  splitBillByItems,
  mergeBills,
  printOrder,
  openCashDrawer
}
```

**Time Estimate:** 3 hours

---

### 2. Create SplitBillModal Component

**File:** `src/components/restaurant/orders/SplitBillModal.vue`

**Features:**
- Split equally (number of people)
- Split by items (assign items to each person)
- Show subtotals for each split
- Apply tax and service charge proportionally

**Code Structure:**
```vue
<script setup>
import { ref, computed, watch } from 'vue'
import { IconUsers, IconReceipt } from '@tabler/icons-vue'

const props = defineProps({
  show: Boolean,
  order: Object,
  loading: Boolean
})

const emit = defineEmits(['close', 'submit'])

const splitType = ref('equal') // 'equal' or 'by_items'
const equalSplits = ref(2)
const itemSplits = ref([])

const isValid = computed(() => {
  if (splitType.value === 'equal') {
    return equalSplits.value >= 2
  }
  
  // For by_items, check all items assigned
  const assignedItems = new Set()
  itemSplits.value.forEach(split => {
    split.itemIds.forEach(id => assignedItems.add(id))
  })
  
  return assignedItems.size === props.order?.items.length
})

const resetForm = () => {
  splitType.value = 'equal'
  equalSplits.value = 2
  itemSplits.value = []
}

const handleSubmit = () => {
  if (splitType.value === 'equal') {
    emit('submit', {
      type: 'equal',
      splits: equalSplits.value
    })
  } else {
    emit('submit', {
      type: 'by_items',
      splits: itemSplits.value
    })
  }
}

const closeModal = () => {
  emit('close')
  setTimeout(resetForm, 300)
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const calculateEqualSplit = computed(() => {
  if (!props.order || splitType.value !== 'equal') return []
  
  const perPerson = props.order.totalAmount / equalSplits.value
  
  return Array.from({ length: equalSplits.value }, (_, i) => ({
    person: i + 1,
    amount: perPerson
  }))
})

watch(() => props.show, (val) => {
  if (val) {
    resetForm()
    if (props.order?.items) {
      // Initialize item splits
      itemSplits.value = [
        { customerName: 'Person 1', itemIds: [] }
      ]
    }
  }
})
</script>

<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box max-w-4xl">
      <h3 class="font-bold text-lg mb-4">Split Bill</h3>

      <!-- Split Type Selector -->
      <div class="tabs tabs-boxed mb-4">
        <button
          class="tab"
          :class="{ 'tab-active': splitType === 'equal' }"
          @click="splitType = 'equal'"
        >
          <IconUsers class="w-4 h-4 mr-2" />
          Split Equally
        </button>
        <button
          class="tab"
          :class="{ 'tab-active': splitType === 'by_items' }"
          @click="splitType = 'by_items'"
        >
          <IconReceipt class="w-4 h-4 mr-2" />
          Split by Items
        </button>
      </div>

      <!-- Equal Split -->
      <div v-if="splitType === 'equal'" class="space-y-4">
        <div class="form-control">
          <label class="label">
            <span class="label-text">Number of people</span>
          </label>
          <input
            v-model.number="equalSplits"
            type="number"
            class="input input-bordered w-full"
            min="2"
            max="10"
          />
        </div>

        <!-- Split Preview -->
        <div class="card bg-base-200">
          <div class="card-body">
            <h4 class="font-semibold mb-2">Split Preview</h4>
            <div class="space-y-2">
              <div
                v-for="split in calculateEqualSplit"
                :key="split.person"
                class="flex justify-between items-center p-3 bg-base-100 rounded"
              >
                <span>Person {{ split.person }}</span>
                <span class="font-bold">{{ formatCurrency(split.amount) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- By Items Split -->
      <div v-if="splitType === 'by_items'" class="space-y-4">
        <!-- Item assignment interface -->
        <div class="alert alert-info">
          <span>Assign each item to a person. Each item can only be assigned once.</span>
        </div>

        <!-- People list with item assignment -->
        <div
          v-for="(split, index) in itemSplits"
          :key="index"
          class="card bg-base-200"
        >
          <div class="card-body">
            <div class="flex justify-between items-center mb-2">
              <input
                v-model="split.customerName"
                type="text"
                class="input input-bordered input-sm"
                placeholder="Person name"
              />
              <button
                v-if="itemSplits.length > 1"
                class="btn btn-ghost btn-sm btn-square"
                @click="itemSplits.splice(index, 1)"
              >
                ×
              </button>
            </div>

            <!-- Item checkboxes -->
            <div class="space-y-1">
              <label
                v-for="item in order?.items"
                :key="item.id"
                class="flex items-center gap-2 p-2 hover:bg-base-100 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  :value="item.id"
                  v-model="split.itemIds"
                  class="checkbox checkbox-sm"
                />
                <span class="flex-1">{{ item.product.name }} ({{ item.quantity }}x)</span>
                <span class="font-semibold">{{ formatCurrency(item.subtotal) }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Add person button -->
        <button
          class="btn btn-outline btn-block"
          @click="itemSplits.push({ customerName: `Person ${itemSplits.length + 1}`, itemIds: [] })"
        >
          Add Person
        </button>
      </div>

      <div class="modal-action">
        <button class="btn btn-ghost" @click="closeModal" :disabled="loading">
          Cancel
        </button>
        <button
          class="btn btn-primary"
          @click="handleSubmit"
          :disabled="loading || !isValid"
        >
          <span v-if="loading" class="loading loading-spinner"></span>
          <span v-else>Split Bill</span>
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="closeModal">
      <button>close</button>
    </form>
  </dialog>
</template>
```

**Time Estimate:** 4 hours

---

### 3. Create MergeBillModal Component

**File:** `src/components/restaurant/orders/MergeBillModal.vue`

**Features:**
- Select multiple orders to merge
- Show combined total
- Preview merged bill

**Time Estimate:** 3 hours

---

### 4. Create Receipt Component

**File:** `src/components/restaurant/orders/Receipt.vue`

**Features:**
- Printable receipt format
- Company logo and info
- Order items with prices
- Tax and total
- Payment methods
- Thank you message

**Code Structure:**
```vue
<script setup>
import { computed } from 'vue'

const props = defineProps({
  order: {
    type: Object,
    required: true
  },
  printerSettings: {
    type: Object,
    default: () => ({})
  }
})

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}
</script>

<template>
  <div class="receipt-container max-w-sm mx-auto bg-white p-6 font-mono text-sm">
    <!-- Header -->
    <div class="text-center mb-4">
      <h2 class="text-xl font-bold">{{ printerSettings.businessName || 'Restaurant' }}</h2>
      <p class="text-xs">{{ printerSettings.address }}</p>
      <p class="text-xs">{{ printerSettings.phone }}</p>
    </div>

    <div class="border-t-2 border-dashed border-gray-400 my-2"></div>

    <!-- Order Info -->
    <div class="mb-4">
      <div class="flex justify-between">
        <span>Receipt #</span>
        <span class="font-bold">{{ order.transactionNumber }}</span>
      </div>
      <div class="flex justify-between">
        <span>Date</span>
        <span>{{ formatDate(order.createdAt) }}</span>
      </div>
      <div v-if="order.table" class="flex justify-between">
        <span>Table</span>
        <span>{{ order.table.tableNumber }}</span>
      </div>
      <div v-if="order.queueNumber" class="flex justify-between">
        <span>Queue #</span>
        <span class="font-bold text-lg">{{ order.queueNumber }}</span>
      </div>
      <div v-if="order.customerName" class="flex justify-between">
        <span>Customer</span>
        <span>{{ order.customerName }}</span>
      </div>
    </div>

    <div class="border-t-2 border-dashed border-gray-400 my-2"></div>

    <!-- Items -->
    <div class="mb-4">
      <div
        v-for="item in order.items"
        :key="item.id"
        class="mb-2"
      >
        <div class="flex justify-between">
          <span>{{ item.product.name }}</span>
        </div>
        <div class="flex justify-between text-xs pl-2">
          <span>{{ item.quantity }} x {{ formatCurrency(item.price) }}</span>
          <span>{{ formatCurrency(item.subtotal) }}</span>
        </div>
        <div v-if="item.notes" class="text-xs pl-2 text-gray-600">
          Note: {{ item.notes }}
        </div>
      </div>
    </div>

    <div class="border-t-2 border-dashed border-gray-400 my-2"></div>

    <!-- Totals -->
    <div class="space-y-1">
      <div class="flex justify-between">
        <span>Subtotal</span>
        <span>{{ formatCurrency(order.subtotal) }}</span>
      </div>
      <div v-if="order.taxAmount > 0" class="flex justify-between">
        <span>Tax</span>
        <span>{{ formatCurrency(order.taxAmount) }}</span>
      </div>
      <div v-if="order.discountAmount > 0" class="flex justify-between text-success">
        <span>Discount</span>
        <span>-{{ formatCurrency(order.discountAmount) }}</span>
      </div>
      <div class="border-t border-gray-400 pt-1 mt-1"></div>
      <div class="flex justify-between text-lg font-bold">
        <span>TOTAL</span>
        <span>{{ formatCurrency(order.totalAmount) }}</span>
      </div>
    </div>

    <!-- Payment -->
    <div v-if="order.payments && order.payments.length > 0" class="mt-4">
      <div class="border-t-2 border-dashed border-gray-400 my-2"></div>
      <div class="font-semibold mb-1">Payment:</div>
      <div
        v-for="payment in order.payments"
        :key="payment.id"
        class="flex justify-between"
      >
        <span class="capitalize">{{ payment.paymentMethod.replace('_', ' ') }}</span>
        <span>{{ formatCurrency(payment.amount) }}</span>
      </div>
      <div v-if="order.changeAmount > 0" class="flex justify-between mt-1">
        <span>Change</span>
        <span>{{ formatCurrency(order.changeAmount) }}</span>
      </div>
    </div>

    <div class="border-t-2 border-dashed border-gray-400 my-4"></div>

    <!-- Footer -->
    <div class="text-center text-xs">
      <p class="mb-1">Thank you for your visit!</p>
      <p v-if="printerSettings.footerMessage">{{ printerSettings.footerMessage }}</p>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .receipt-container {
    width: 80mm;
    margin: 0;
    padding: 10mm;
  }
}
</style>
```

**Time Estimate:** 4 hours

---

### 5. Create KitchenTicket Component

**File:** `src/components/restaurant/orders/KitchenTicket.vue`

**Features:**
- Kitchen-focused format
- Large, readable text
- Item quantities and notes prominent
- Table/queue number highlighted

**Time Estimate:** 3 hours

---

### 6. Create PrintButton Component

**File:** `src/components/restaurant/orders/PrintButton.vue`

**Features:**
- Trigger print (receipt or kitchen ticket)
- Print preview modal
- Handle printer errors

**Time Estimate:** 2 hours

---

## ✅ Testing Checklist

### Split Bills
- [ ] Split bill equally (2-10 ways)
- [ ] Split bill by items (assign items to people)
- [ ] Verify subtotals are correct
- [ ] Tax and service charge applied proportionally
- [ ] Each split order has unique transaction number

### Merge Bills
- [ ] Merge 2 orders successfully
- [ ] Merge 3+ orders successfully
- [ ] Merged bill shows all items
- [ ] Merged bill total is correct
- [ ] Original orders marked as merged

### Print Features
- [ ] Print receipt to receipt printer
- [ ] Print kitchen ticket to kitchen printer
- [ ] Handle printer not configured gracefully
- [ ] Print preview works
- [ ] Receipt format is correct
- [ ] Kitchen ticket format is correct

### Cash Drawer
- [ ] Cash drawer opens on payment
- [ ] Manual cash drawer open works
- [ ] Handle drawer not configured gracefully

---

## 📊 Progress Tracking

- [ ] useRestaurantOrders updated (5 methods)
- [ ] SplitBillModal component created
- [ ] MergeBillModal component created
- [ ] Receipt component created
- [ ] KitchenTicket component created
- [ ] PrintButton component created
- [ ] Order detail page updated
- [ ] Orders list page updated
- [ ] POS payment modal updated
- [ ] All tests passing

**Estimated Completion:** End of Week 4

---

## 🚀 Next Steps

After completing Phase 3, proceed to:
- **Phase 4:** Stock Management Completion
- Review `RESTAURANT-PHASE-4-STOCK-COMPLETION.md`

---

**Created:** December 1, 2025  
**Status:** 📋 Ready to Start
