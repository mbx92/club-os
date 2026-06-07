# 📦 Phase 4: Stock Management Completion

**Duration:** Week 5  
**Effort:** ~20 hours  
**Priority:** HIGH  
**Dependencies:** Phase 1-3 complete  
**Status:** 📋 Ready to Start

---

## 📊 Overview

Complete stock management system with stock in/out operations, transfers between locations, bulk operations, and enhanced reporting.

### Goals
1. ✅ Stock in (purchase/receive) operations
2. ✅ Stock out (wastage/damage) operations
3. ✅ Stock transfers between locations
4. ✅ Bulk stock in for multiple products
5. ✅ Enhanced stock reports

### Success Criteria
- Stock in records purchases with unit cost
- Stock out tracks wastage and damage with reasons
- Stock can be transferred between locations
- Bulk operations handle multiple products efficiently
- Movement reports show complete audit trail
- Most moved products report available

---

## 🗂️ Files to Create

### Pages (1 file)
```
src/pages/restaurant/stock/
└── transfers.vue                    ✨ NEW (~3 hours)
```

### Components (4 files)
```
src/components/restaurant/stock/
├── StockInModal.vue                 ✨ NEW (~3 hours)
├── StockOutModal.vue                ✨ NEW (~3 hours)
├── StockTransferModal.vue           ✨ NEW (~4 hours)
└── BulkStockInModal.vue             ✨ NEW (~4 hours)
```

---

## 📝 Files to Modify

### Composables (1 file)
```
src/composables/restaurant/
└── useRestaurantStock.js            📝 UPDATE (~3 hours)
```

### Pages (2 files)
```
src/pages/restaurant/stock/
├── index.vue                        📝 UPDATE (~1 hour)
└── movements.vue                    📝 UPDATE (~1 hour)
```

---

## 🔧 Implementation Details

### 1. Update useRestaurantStock Composable

**File:** `src/composables/restaurant/useRestaurantStock.js`

**Add Missing Methods:**

```javascript
// Get movement by ID
const getMovementById = async (movementId) => {
  loading.value = true
  error.value = null
  try {
    const response = await api.get(`/restaurant/stock-movements/${movementId}`)
    return response.data
  } catch (err) {
    if (isDev) console.error('Get movement error:', err)
    error.value = err.message
    handleError(err, 'Failed to get stock movement')
    throw err
  } finally {
    loading.value = false
  }
}

// Get stock report with different types
const getStockReport = async (params = {}) => {
  loading.value = true
  error.value = null
  try {
    const queryString = new URLSearchParams({
      reportType: params.reportType || 'current',
      ...params
    }).toString()
    
    const response = await api.get(`/restaurant/stock-movements/report?${queryString}`)
    return response.data
  } catch (err) {
    if (isDev) console.error('Get stock report error:', err)
    error.value = err.message
    handleError(err, 'Failed to get stock report')
    throw err
  } finally {
    loading.value = false
  }
}

// Get stock summary by date range
const getStockSummary = async (startDate, endDate) => {
  loading.value = true
  error.value = null
  try {
    const response = await api.get(
      `/restaurant/stock-movements/summary?startDate=${startDate}&endDate=${endDate}`
    )
    return response.data
  } catch (err) {
    if (isDev) console.error('Get stock summary error:', err)
    error.value = err.message
    handleError(err, 'Failed to get stock summary')
    throw err
  } finally {
    loading.value = false
  }
}

// Get most moved products
const getMostMovedProducts = async (limit = 10) => {
  loading.value = true
  error.value = null
  try {
    const response = await api.get(`/restaurant/stock-movements/most-moved?limit=${limit}`)
    return response.data
  } catch (err) {
    if (isDev) console.error('Get most moved products error:', err)
    error.value = err.message
    handleError(err, 'Failed to get most moved products')
    throw err
  } finally {
    loading.value = false
  }
}

// Get product stock history
const getProductHistory = async (productId) => {
  loading.value = true
  error.value = null
  try {
    const response = await api.get(`/restaurant/stock-movements/product/${productId}`)
    return response.data
  } catch (err) {
    if (isDev) console.error('Get product history error:', err)
    error.value = err.message
    handleError(err, 'Failed to get product history')
    throw err
  } finally {
    loading.value = false
  }
}

// Record stock in (purchase/receive)
const recordStockIn = async (stockData) => {
  loading.value = true
  error.value = null
  try {
    const response = await api.post('/restaurant/stock-movements/stock-in', stockData)
    showSuccess('Stock in recorded successfully')
    return response.data
  } catch (err) {
    if (isDev) console.error('Record stock in error:', err)
    error.value = err.message
    handleError(err, 'Failed to record stock in')
    throw err
  } finally {
    loading.value = false
  }
}

// Record stock out (wastage/damage)
const recordStockOut = async (stockData) => {
  loading.value = true
  error.value = null
  try {
    const response = await api.post('/restaurant/stock-movements/stock-out', stockData)
    showSuccess('Stock out recorded successfully')
    return response.data
  } catch (err) {
    if (isDev) console.error('Record stock out error:', err)
    error.value = err.message
    handleError(err, 'Failed to record stock out')
    throw err
  } finally {
    loading.value = false
  }
}

// Record stock adjustment
const recordAdjustment = async (adjustmentData) => {
  loading.value = true
  error.value = null
  try {
    const response = await api.post('/restaurant/stock-movements/adjustment', adjustmentData)
    showSuccess('Stock adjustment recorded successfully')
    return response.data
  } catch (err) {
    if (isDev) console.error('Record adjustment error:', err)
    error.value = err.message
    handleError(err, 'Failed to record adjustment')
    throw err
  } finally {
    loading.value = false
  }
}

// Bulk stock in for multiple products
const bulkStockIn = async (bulkData) => {
  loading.value = true
  error.value = null
  try {
    const response = await api.post('/restaurant/stock-movements/bulk-stock-in', bulkData)
    showSuccess(`Bulk stock in recorded for ${bulkData.items.length} products`)
    return response.data
  } catch (err) {
    if (isDev) console.error('Bulk stock in error:', err)
    error.value = err.message
    handleError(err, 'Failed to record bulk stock in')
    throw err
  } finally {
    loading.value = false
  }
}

// Add to return object
return {
  // ... existing exports
  getMovementById,
  getStockReport,
  getStockSummary,
  getMostMovedProducts,
  getProductHistory,
  recordStockIn,
  recordStockOut,
  recordAdjustment,
  bulkStockIn
}
```

**Time Estimate:** 3 hours

---

### 2. Create StockInModal Component

**File:** `src/components/restaurant/stock/StockInModal.vue`

**Features:**
- Product selector
- Location selector
- Quantity input
- Unit cost input
- Reference/PO number
- Notes field
- Calculate total value

**Code Structure:**
```vue
<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  show: Boolean,
  products: Array,
  locations: Array,
  loading: Boolean
})

const emit = defineEmits(['close', 'submit'])

const formData = ref({
  productId: '',
  locationId: '',
  quantity: 1,
  unitCost: 0,
  reference: '',
  notes: ''
})

const selectedProduct = computed(() => {
  return props.products?.find(p => p.id === formData.value.productId)
})

const totalValue = computed(() => {
  return formData.value.quantity * formData.value.unitCost
})

const isValid = computed(() => {
  return formData.value.productId &&
         formData.value.locationId &&
         formData.value.quantity > 0 &&
         formData.value.unitCost > 0
})

const resetForm = () => {
  formData.value = {
    productId: '',
    locationId: '',
    quantity: 1,
    unitCost: 0,
    reference: '',
    notes: ''
  }
}

const handleSubmit = () => {
  emit('submit', { ...formData.value })
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

watch(() => props.show, (val) => {
  if (val) resetForm()
})
</script>

<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg mb-4">Record Stock In</h3>

      <div class="space-y-4">
        <!-- Product Selection -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Product *</span>
          </label>
          <select v-model="formData.productId" class="select select-bordered w-full">
            <option value="">Select product</option>
            <option
              v-for="product in products"
              :key="product.id"
              :value="product.id"
            >
              {{ product.name }} ({{ product.sku }})
            </option>
          </select>
        </div>

        <!-- Location Selection -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Location *</span>
          </label>
          <select v-model="formData.locationId" class="select select-bordered w-full">
            <option value="">Select location</option>
            <option
              v-for="location in locations"
              :key="location.id"
              :value="location.id"
            >
              {{ location.name }}
            </option>
          </select>
        </div>

        <!-- Quantity and Unit Cost -->
        <div class="grid grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Quantity *</span>
            </label>
            <input
              v-model.number="formData.quantity"
              type="number"
              class="input input-bordered w-full"
              min="1"
              step="1"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Unit Cost *</span>
            </label>
            <input
              v-model.number="formData.unitCost"
              type="number"
              class="input input-bordered w-full"
              min="0"
              step="1000"
            />
          </div>
        </div>

        <!-- Total Value Display -->
        <div v-if="totalValue > 0" class="alert alert-info">
          <span class="font-semibold">Total Value: {{ formatCurrency(totalValue) }}</span>
        </div>

        <!-- Reference/PO Number -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Reference / PO Number</span>
          </label>
          <input
            v-model="formData.reference"
            type="text"
            class="input input-bordered w-full"
            placeholder="e.g., PO-2024-001"
          />
        </div>

        <!-- Notes -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Notes</span>
          </label>
          <textarea
            v-model="formData.notes"
            class="textarea textarea-bordered w-full"
            placeholder="Optional notes"
            rows="3"
          ></textarea>
        </div>
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
          <span v-else>Record Stock In</span>
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="closeModal">
      <button>close</button>
    </form>
  </dialog>
</template>
```

**Time Estimate:** 3 hours

---

### 3. Create StockOutModal Component

**File:** `src/components/restaurant/stock/StockOutModal.vue`

**Features:**
- Product selector
- Location selector
- Quantity input
- Reason dropdown (damage, wastage, expired, theft, other)
- Notes field
- Confirmation step

**Time Estimate:** 3 hours

---

### 4. Create StockTransferModal Component

**File:** `src/components/restaurant/stock/StockTransferModal.vue`

**Features:**
- Product selector
- From location selector
- To location selector
- Quantity input
- Notes field
- Show current stock at both locations
- Validate sufficient stock at source

**Code Structure:**
```vue
<script setup>
import { ref, computed, watch } from 'vue'
import { IconArrowRight } from '@tabler/icons-vue'

const props = defineProps({
  show: Boolean,
  products: Array,
  locations: Array,
  loading: Boolean
})

const emit = defineEmits(['close', 'submit'])

const formData = ref({
  productId: '',
  fromLocationId: '',
  toLocationId: '',
  quantity: 1,
  notes: ''
})

const selectedProduct = computed(() => {
  return props.products?.find(p => p.id === formData.value.productId)
})

const fromLocation = computed(() => {
  return props.locations?.find(l => l.id === formData.value.fromLocationId)
})

const toLocation = computed(() => {
  return props.locations?.find(l => l.id === formData.value.toLocationId)
})

const availableStock = computed(() => {
  // In real implementation, fetch stock for selected product at from location
  return selectedProduct.value?.stockQuantity || 0
})

const isValid = computed(() => {
  return formData.value.productId &&
         formData.value.fromLocationId &&
         formData.value.toLocationId &&
         formData.value.fromLocationId !== formData.value.toLocationId &&
         formData.value.quantity > 0 &&
         formData.value.quantity <= availableStock.value
})

const resetForm = () => {
  formData.value = {
    productId: '',
    fromLocationId: '',
    toLocationId: '',
    quantity: 1,
    notes: ''
  }
}

const handleSubmit = () => {
  emit('submit', { ...formData.value })
}

const closeModal = () => {
  emit('close')
  setTimeout(resetForm, 300)
}

watch(() => props.show, (val) => {
  if (val) resetForm()
})
</script>

<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg mb-4">Transfer Stock</h3>

      <div class="space-y-4">
        <!-- Product Selection -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Product *</span>
          </label>
          <select v-model="formData.productId" class="select select-bordered w-full">
            <option value="">Select product</option>
            <option
              v-for="product in products"
              :key="product.id"
              :value="product.id"
            >
              {{ product.name }}
            </option>
          </select>
        </div>

        <!-- From/To Locations -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
          <!-- From Location -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">From Location *</span>
            </label>
            <select v-model="formData.fromLocationId" class="select select-bordered w-full">
              <option value="">Select location</option>
              <option
                v-for="location in locations"
                :key="location.id"
                :value="location.id"
                :disabled="location.id === formData.toLocationId"
              >
                {{ location.name }}
              </option>
            </select>
            <label v-if="selectedProduct && formData.fromLocationId" class="label">
              <span class="label-text-alt">Stock: {{ availableStock }}</span>
            </label>
          </div>

          <!-- Arrow -->
          <div class="flex justify-center mt-8">
            <IconArrowRight class="w-8 h-8 text-primary" />
          </div>

          <!-- To Location -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">To Location *</span>
            </label>
            <select v-model="formData.toLocationId" class="select select-bordered w-full">
              <option value="">Select location</option>
              <option
                v-for="location in locations"
                :key="location.id"
                :value="location.id"
                :disabled="location.id === formData.fromLocationId"
              >
                {{ location.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Quantity -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Quantity *</span>
          </label>
          <input
            v-model.number="formData.quantity"
            type="number"
            class="input input-bordered w-full"
            min="1"
            :max="availableStock"
            step="1"
          />
          <label v-if="formData.quantity > availableStock" class="label">
            <span class="label-text-alt text-error">
              Insufficient stock (available: {{ availableStock }})
            </span>
          </label>
        </div>

        <!-- Notes -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Notes</span>
          </label>
          <textarea
            v-model="formData.notes"
            class="textarea textarea-bordered w-full"
            placeholder="Optional notes"
            rows="2"
          ></textarea>
        </div>
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
          <span v-else>Transfer Stock</span>
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

### 5. Create BulkStockInModal Component

**File:** `src/components/restaurant/stock/BulkStockInModal.vue`

**Features:**
- Add multiple products at once
- Shared location and reference
- Individual quantity and unit cost per product
- Calculate total value
- CSV import option

**Time Estimate:** 4 hours

---

### 6. Create Stock Transfers Page

**File:** `src/pages/restaurant/stock/transfers.vue`

**Features:**
- List all stock transfers
- Filter by location, product, date
- Transfer history
- Initiate new transfer

**Time Estimate:** 3 hours

---

## ✅ Testing Checklist

### Stock In Operations
- [ ] Record stock in with all fields
- [ ] Verify stock quantity increased
- [ ] Unit cost saved correctly
- [ ] Reference number recorded
- [ ] Movement appears in history

### Stock Out Operations
- [ ] Record stock out for wastage
- [ ] Record stock out for damage
- [ ] Verify stock quantity decreased
- [ ] Reason saved correctly
- [ ] Movement appears in history

### Stock Transfers
- [ ] Transfer stock between locations
- [ ] Verify stock decreased at source
- [ ] Verify stock increased at destination
- [ ] Transfer history recorded
- [ ] Cannot transfer more than available stock

### Bulk Operations
- [ ] Bulk stock in for multiple products
- [ ] All products updated correctly
- [ ] Total value calculated correctly
- [ ] Reference applies to all items

### Reports
- [ ] Current stock report accurate
- [ ] Low stock report shows correct products
- [ ] Movement report shows all transactions
- [ ] Most moved products report
- [ ] Product history complete

---

## 📊 Progress Tracking

- [ ] useRestaurantStock updated (9 methods)
- [ ] StockInModal component created
- [ ] StockOutModal component created
- [ ] StockTransferModal component created
- [ ] BulkStockInModal component created
- [ ] Stock transfers page created
- [ ] Stock index page updated
- [ ] Stock movements page updated
- [ ] All tests passing

**Estimated Completion:** End of Week 5

---

## 🚀 Next Steps

After completing Phase 4, proceed to:
- **Phase 5:** Reports & Analytics
- Review `RESTAURANT-PHASE-5-REPORTS-ANALYTICS.md`

---

**Created:** December 1, 2025  
**Status:** 📋 Ready to Start
