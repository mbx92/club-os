# 🔧 Phase 1: Complete Core CRUD

**Duration:** Week 1-2  
**Effort:** ~30 hours  
**Priority:** CRITICAL  
**Status:** 📋 Ready to Start

---

## 📊 Overview

Complete all missing CRUD operations for categories, tables, and locations. Integrate voucher validation into POS and order completion flows.

### Goals
1. ✅ Categories fully functional (tree view, CRUD, reordering)
2. ✅ Voucher integration in POS and orders
3. ✅ Complete missing table endpoints
4. ✅ Complete missing location endpoints

### Success Criteria
- Categories can be created, edited, deleted, and reordered hierarchically
- Products can be assigned to categories
- Vouchers validate and apply discounts correctly
- All table statuses work (including cleaning)
- Location stock summaries display correctly

---

## 🗂️ Files to Create

### Composables (1 file)
```
src/composables/restaurant/
└── useRestaurantCategories.js       ✨ NEW (~2 hours)
```

### Pages (1 file)
```
src/pages/restaurant/categories/
└── index.vue                        ✨ NEW (~4 hours)
```

### Components (5 files)
```
src/components/restaurant/
├── categories/
│   ├── CategoryTree.vue             ✨ NEW (~3 hours)
│   ├── CategoryFormModal.vue        ✨ NEW (~2 hours)
│   ├── CategoryReorderModal.vue     ✨ NEW (~3 hours)
│   └── CategoryProductMover.vue     ✨ NEW (~2 hours)
└── pos/
    └── POSVoucherInput.vue          ✨ NEW (~2 hours)
```

---

## 📝 Files to Modify

### Composables (2 files)
```
src/composables/restaurant/
├── useRestaurantTables.js           📝 UPDATE (~2 hours)
└── useRestaurantLocations.js        📝 UPDATE (~2 hours)
```

### Components (2 files)
```
src/components/restaurant/
├── pos/POSPaymentModal.vue          📝 UPDATE (~1 hour)
└── orders/CompleteOrderModal.vue    📝 UPDATE (~1 hour)
```

### Pages (3 files)
```
src/pages/restaurant/
├── products/index.vue               📝 UPDATE (~1 hour)
└── pos/index.vue                    📝 UPDATE (~1 hour)
```

---

## 🔧 Implementation Details

### 1. Create useRestaurantCategories Composable

**File:** `src/composables/restaurant/useRestaurantCategories.js`

**API Endpoints:**
- GET `/restaurant/categories` - Get all categories
- GET `/restaurant/categories/tree` - Get category tree
- GET `/restaurant/categories/:id` - Get category by ID
- POST `/restaurant/categories` - Create category
- PUT `/restaurant/categories/:id` - Update category
- DELETE `/restaurant/categories/:id?moveProductsTo=` - Delete category
- POST `/restaurant/categories/reorder` - Reorder categories

**Code Structure:**
```javascript
import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useRestaurantCategories() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const isDev = import.meta.env.DEV

  // State
  const categories = ref([])
  const categoryTree = ref([])
  const category = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Fetch all categories
  const fetchCategories = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams({
        tree: params.tree || 'false',
        includeCount: params.includeCount !== false ? 'true' : 'false',
        ...params
      }).toString()
      
      const response = await api.get(`/restaurant/categories?${queryParams}`)
      
      if (params.tree === 'true' || params.tree === true) {
        categoryTree.value = response.data || []
        return categoryTree.value
      }
      
      categories.value = response.data || []
      return categories.value
    } catch (err) {
      if (isDev) console.error('Fetch categories error:', err)
      error.value = err.message
      handleError(err, 'Failed to fetch categories')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Get category tree
  const getCategoryTree = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get('/restaurant/categories/tree')
      categoryTree.value = response.data || []
      return categoryTree.value
    } catch (err) {
      if (isDev) console.error('Get category tree error:', err)
      error.value = err.message
      handleError(err, 'Failed to get category tree')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Get category by ID
  const getCategoryById = async (categoryId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/restaurant/categories/${categoryId}`)
      category.value = response.data
      return response.data
    } catch (err) {
      if (isDev) console.error('Get category error:', err)
      error.value = err.message
      handleError(err, 'Failed to get category')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Create category
  const createCategory = async (categoryData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/restaurant/categories', categoryData)
      showSuccess('Category created successfully')
      return response.data
    } catch (err) {
      if (isDev) console.error('Create category error:', err)
      error.value = err.message
      handleError(err, 'Failed to create category')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update category
  const updateCategory = async (categoryId, categoryData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.put(`/restaurant/categories/${categoryId}`, categoryData)
      showSuccess('Category updated successfully')
      return response.data
    } catch (err) {
      if (isDev) console.error('Update category error:', err)
      error.value = err.message
      handleError(err, 'Failed to update category')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Delete category
  const deleteCategory = async (categoryId, moveProductsTo = null) => {
    loading.value = true
    error.value = null
    try {
      const url = moveProductsTo 
        ? `/restaurant/categories/${categoryId}?moveProductsTo=${moveProductsTo}`
        : `/restaurant/categories/${categoryId}`
      
      await api.delete(url)
      showSuccess('Category deleted successfully')
      return true
    } catch (err) {
      if (isDev) console.error('Delete category error:', err)
      error.value = err.message
      handleError(err, 'Failed to delete category')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Reorder categories
  const reorderCategories = async (orders) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/restaurant/categories/reorder', { orders })
      showSuccess('Categories reordered successfully')
      return response.data
    } catch (err) {
      if (isDev) console.error('Reorder categories error:', err)
      error.value = err.message
      handleError(err, 'Failed to reorder categories')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    categories,
    categoryTree,
    category,
    loading,
    error,

    // Methods
    fetchCategories,
    getCategoryTree,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories
  }
}
```

**Time Estimate:** 2 hours

---

### 2. Update useRestaurantTables Composable

**File:** `src/composables/restaurant/useRestaurantTables.js`

**Add Missing Methods:**

```javascript
// Add these methods to existing composable

// Get table statistics
const getTableStatistics = async (params = {}) => {
  loading.value = true
  error.value = null
  try {
    const queryString = new URLSearchParams(params).toString()
    const url = `/restaurant/tables/statistics${queryString ? `?${queryString}` : ''}`
    const response = await api.get(url)
    return response.data
  } catch (err) {
    if (isDev) console.error('Get table statistics error:', err)
    error.value = err.message
    handleError(err, 'Failed to get table statistics')
    throw err
  } finally {
    loading.value = false
  }
}

// Get table layout for location
const getTableLayout = async (locationId) => {
  loading.value = true
  error.value = null
  try {
    const response = await api.get(`/restaurant/tables/layout/${locationId}`)
    return response.data
  } catch (err) {
    if (isDev) console.error('Get table layout error:', err)
    error.value = err.message
    handleError(err, 'Failed to get table layout')
    throw err
  } finally {
    loading.value = false
  }
}

// Set table for cleaning
const setTableCleaning = async (tableId) => {
  loading.value = true
  error.value = null
  try {
    const response = await api.post(`/restaurant/tables/${tableId}/cleaning`)
    showSuccess('Table set for cleaning')
    return response.data
  } catch (err) {
    if (isDev) console.error('Set table cleaning error:', err)
    error.value = err.message
    handleError(err, 'Failed to set table for cleaning')
    throw err
  } finally {
    loading.value = false
  }
}

// Add to return object
return {
  // ... existing exports
  getTableStatistics,
  getTableLayout,
  setTableCleaning
}
```

**Time Estimate:** 2 hours

---

### 3. Update useRestaurantLocations Composable

**File:** `src/composables/restaurant/useRestaurantLocations.js`

**Add Missing Methods:**

```javascript
// Add these methods to existing composable

// Get locations with stock counts
const getLocationsWithStock = async () => {
  loading.value = true
  error.value = null
  try {
    const response = await api.get('/restaurant/locations/with-stock')
    return response.data
  } catch (err) {
    if (isDev) console.error('Get locations with stock error:', err)
    error.value = err.message
    handleError(err, 'Failed to get locations with stock')
    throw err
  } finally {
    loading.value = false
  }
}

// Get stock summary for location
const getLocationStockSummary = async (locationId) => {
  loading.value = true
  error.value = null
  try {
    const response = await api.get(`/restaurant/locations/${locationId}/stock-summary`)
    return response.data
  } catch (err) {
    if (isDev) console.error('Get location stock summary error:', err)
    error.value = err.message
    handleError(err, 'Failed to get location stock summary')
    throw err
  } finally {
    loading.value = false
  }
}

// Calculate distance between locations
const calculateDistance = async (fromId, toId) => {
  loading.value = true
  error.value = null
  try {
    const response = await api.get(`/restaurant/locations/distance/${fromId}/${toId}`)
    return response.data
  } catch (err) {
    if (isDev) console.error('Calculate distance error:', err)
    error.value = err.message
    handleError(err, 'Failed to calculate distance')
    throw err
  } finally {
    loading.value = false
  }
}

// Toggle location active status
const toggleLocationActive = async (locationId) => {
  loading.value = true
  error.value = null
  try {
    const response = await api.patch(`/restaurant/locations/${locationId}/toggle`)
    showSuccess('Location status toggled')
    return response.data
  } catch (err) {
    if (isDev) console.error('Toggle location error:', err)
    error.value = err.message
    handleError(err, 'Failed to toggle location status')
    throw err
  } finally {
    loading.value = false
  }
}

// Add to return object
return {
  // ... existing exports
  getLocationsWithStock,
  getLocationStockSummary,
  calculateDistance,
  toggleLocationActive
}
```

**Time Estimate:** 2 hours

---

### 4. Create CategoryTree Component

**File:** `src/components/restaurant/categories/CategoryTree.vue`

**Features:**
- Hierarchical tree view
- Expand/collapse nodes
- Display product count per category
- Quick actions (edit, delete, add child)

**Code Structure:**
```vue
<script setup>
import { ref, computed } from 'vue'
import { IconChevronRight, IconChevronDown, IconEdit, IconTrash, IconPlus, IconFolder, IconFolderOpen } from '@tabler/icons-vue'

const props = defineProps({
  categories: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'delete', 'add-child', 'select'])

const expandedNodes = ref(new Set())

const toggleNode = (categoryId) => {
  if (expandedNodes.value.has(categoryId)) {
    expandedNodes.value.delete(categoryId)
  } else {
    expandedNodes.value.add(categoryId)
  }
}

const isExpanded = (categoryId) => expandedNodes.value.has(categoryId)
</script>

<template>
  <div class="space-y-2">
    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center py-8">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Empty state -->
    <div v-else-if="categories.length === 0" class="text-center py-8">
      <IconFolder class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
      <p class="text-base-content/60">No categories yet</p>
    </div>

    <!-- Category tree -->
    <div v-else class="space-y-1">
      <CategoryTreeNode
        v-for="category in categories"
        :key="category.id"
        :category="category"
        :expanded="isExpanded(category.id)"
        @toggle="toggleNode"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
        @add-child="emit('add-child', $event)"
        @select="emit('select', $event)"
      />
    </div>
  </div>
</template>

<template>
  <!-- Recursive tree node component -->
  <div class="category-tree-node">
    <div 
      class="flex items-center gap-2 p-2 rounded-lg hover:bg-base-200 cursor-pointer"
      @click="$emit('select', category)"
    >
      <!-- Expand/collapse -->
      <button
        v-if="category.children && category.children.length > 0"
        class="btn btn-ghost btn-xs btn-square"
        @click.stop="$emit('toggle', category.id)"
      >
        <IconChevronDown v-if="expanded" class="w-4 h-4" />
        <IconChevronRight v-else class="w-4 h-4" />
      </button>
      <div v-else class="w-8"></div>

      <!-- Icon -->
      <IconFolderOpen v-if="expanded" class="w-5 h-5 text-warning" />
      <IconFolder v-else class="w-5 h-5 text-base-content/60" />

      <!-- Name and count -->
      <div class="flex-1">
        <span class="font-medium">{{ category.name }}</span>
        <span v-if="category.productCount" class="text-sm text-base-content/60 ml-2">
          ({{ category.productCount }})
        </span>
      </div>

      <!-- Actions -->
      <div class="flex gap-1">
        <button
          class="btn btn-ghost btn-xs btn-square"
          @click.stop="$emit('add-child', category)"
          title="Add subcategory"
        >
          <IconPlus class="w-4 h-4" />
        </button>
        <button
          class="btn btn-ghost btn-xs btn-square"
          @click.stop="$emit('edit', category)"
          title="Edit"
        >
          <IconEdit class="w-4 h-4" />
        </button>
        <button
          class="btn btn-ghost btn-xs btn-square text-error"
          @click.stop="$emit('delete', category)"
          title="Delete"
        >
          <IconTrash class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Children -->
    <div v-if="expanded && category.children && category.children.length > 0" class="ml-8">
      <CategoryTreeNode
        v-for="child in category.children"
        :key="child.id"
        :category="child"
        :expanded="isExpanded(child.id)"
        @toggle="$emit('toggle', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @add-child="$emit('add-child', $event)"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>
```

**Time Estimate:** 3 hours

---

### 5. Create CategoryFormModal Component

**File:** `src/components/restaurant/categories/CategoryFormModal.vue`

**Features:**
- Create/edit category
- Parent category selector (for hierarchy)
- Display order
- Active status toggle

**Code Structure:**
```vue
<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  show: Boolean,
  category: Object,
  categories: Array,
  loading: Boolean
})

const emit = defineEmits(['close', 'submit'])

const formData = ref({
  name: '',
  description: '',
  parentId: null,
  displayOrder: 1,
  isActive: true
})

const isEdit = computed(() => !!props.category)

const resetForm = () => {
  if (props.category) {
    formData.value = { ...props.category }
  } else {
    formData.value = {
      name: '',
      description: '',
      parentId: null,
      displayOrder: 1,
      isActive: true
    }
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
      <h3 class="font-bold text-lg mb-4">
        {{ isEdit ? 'Edit Category' : 'Create Category' }}
      </h3>

      <div class="space-y-4">
        <!-- Name -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Name *</span>
          </label>
          <input
            v-model="formData.name"
            type="text"
            class="input input-bordered w-full"
            placeholder="e.g., Main Dishes"
            required
          />
        </div>

        <!-- Description -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Description</span>
          </label>
          <textarea
            v-model="formData.description"
            class="textarea textarea-bordered w-full"
            placeholder="Optional description"
            rows="3"
          ></textarea>
        </div>

        <!-- Parent Category -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Parent Category</span>
          </label>
          <select v-model="formData.parentId" class="select select-bordered w-full">
            <option :value="null">None (Top Level)</option>
            <option
              v-for="cat in categories"
              :key="cat.id"
              :value="cat.id"
              :disabled="cat.id === category?.id"
            >
              {{ cat.name }}
            </option>
          </select>
        </div>

        <!-- Display Order -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Display Order</span>
          </label>
          <input
            v-model.number="formData.displayOrder"
            type="number"
            class="input input-bordered w-full"
            min="1"
          />
        </div>

        <!-- Active Status -->
        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-4">
            <input
              v-model="formData.isActive"
              type="checkbox"
              class="toggle toggle-primary"
            />
            <span class="label-text">Active</span>
          </label>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn btn-ghost" @click="closeModal" :disabled="loading">
          Cancel
        </button>
        <button
          class="btn btn-primary"
          @click="handleSubmit"
          :disabled="loading || !formData.name"
        >
          <span v-if="loading" class="loading loading-spinner"></span>
          <span v-else>{{ isEdit ? 'Update' : 'Create' }}</span>
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="closeModal">
      <button>close</button>
    </form>
  </dialog>
</template>
```

**Time Estimate:** 2 hours

---

### 6. Create POSVoucherInput Component

**File:** `src/components/restaurant/pos/POSVoucherInput.vue`

**Features:**
- Voucher code input
- Real-time validation
- Display discount amount
- Clear voucher

**Code Structure:**
```vue
<script setup>
import { ref, computed } from 'vue'
import { IconTag, IconCheck, IconX, IconLoader } from '@tabler/icons-vue'
import { useRestaurantOrders } from '@/composables/restaurant/useRestaurantOrders'

const props = defineProps({
  subtotal: {
    type: Number,
    required: true
  },
  customerId: String
})

const emit = defineEmits(['voucher-applied', 'voucher-cleared'])

const { validateVoucher, loading } = useRestaurantOrders()

const voucherCode = ref('')
const validatedVoucher = ref(null)
const error = ref(null)

const hasVoucher = computed(() => !!validatedVoucher.value)

const handleValidate = async () => {
  if (!voucherCode.value.trim()) return

  error.value = null
  try {
    const result = await validateVoucher({
      code: voucherCode.value,
      amount: props.subtotal,
      customerId: props.customerId
    })

    validatedVoucher.value = result
    emit('voucher-applied', result)
  } catch (err) {
    error.value = err.message || 'Invalid voucher code'
    validatedVoucher.value = null
  }
}

const handleClear = () => {
  voucherCode.value = ''
  validatedVoucher.value = null
  error.value = null
  emit('voucher-cleared')
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
  <div class="space-y-2">
    <label class="label">
      <span class="label-text">Voucher Code</span>
    </label>

    <!-- Input with validation button -->
    <div v-if="!hasVoucher" class="join w-full">
      <input
        v-model="voucherCode"
        type="text"
        class="input input-bordered join-item flex-1"
        :class="{ 'input-error': error }"
        placeholder="Enter voucher code"
        @keyup.enter="handleValidate"
      />
      <button
        class="btn btn-primary join-item"
        @click="handleValidate"
        :disabled="loading || !voucherCode.trim()"
      >
        <IconLoader v-if="loading" class="w-4 h-4 animate-spin" />
        <IconTag v-else class="w-4 h-4" />
        Apply
      </button>
    </div>

    <!-- Applied voucher -->
    <div v-else class="alert alert-success">
      <IconCheck class="w-5 h-5" />
      <div class="flex-1">
        <div class="font-semibold">{{ validatedVoucher.code }}</div>
        <div class="text-sm">
          Discount: {{ formatCurrency(validatedVoucher.discountAmount) }}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm btn-circle" @click="handleClear">
        <IconX class="w-5 h-5" />
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="text-error text-sm">
      {{ error }}
    </div>
  </div>
</template>
```

**Time Estimate:** 2 hours

---

## ✅ Testing Checklist

### Categories
- [ ] Create top-level category
- [ ] Create child category
- [ ] Edit category name and description
- [ ] Change parent category (move in hierarchy)
- [ ] Reorder categories (drag and drop)
- [ ] Delete empty category
- [ ] Delete category with products (should prompt to move)
- [ ] Toggle category active status
- [ ] View category tree structure

### Vouchers
- [ ] Apply valid voucher in POS
- [ ] Apply valid voucher in order completion
- [ ] Try invalid voucher code
- [ ] Try expired voucher
- [ ] Try voucher with minimum purchase requirement
- [ ] Clear applied voucher
- [ ] Verify discount calculation

### Tables
- [ ] Get table statistics
- [ ] View table layout for location
- [ ] Set table to cleaning status
- [ ] Clean table returns to available

### Locations
- [ ] View locations with stock counts
- [ ] View location stock summary
- [ ] Calculate distance between two locations
- [ ] Toggle location active status

---

## 📊 Progress Tracking

- [ ] useRestaurantCategories composable created
- [ ] useRestaurantTables updated (3 methods)
- [ ] useRestaurantLocations updated (4 methods)
- [ ] CategoryTree component created
- [ ] CategoryFormModal component created
- [ ] CategoryReorderModal component created
- [ ] CategoryProductMover component created
- [ ] POSVoucherInput component created
- [ ] Categories page created
- [ ] Products page updated (category filter)
- [ ] POS payment modal updated (voucher)
- [ ] Order complete modal updated (voucher)
- [ ] All tests passing

**Estimated Completion:** End of Week 2

---

## 🚀 Next Steps

After completing Phase 1, proceed to:
- **Phase 2:** Queue & Kitchen Systems
- Review `RESTAURANT-PHASE-2-QUEUE-KITCHEN.md`

---

**Created:** December 1, 2025  
**Status:** 📋 Ready to Start
