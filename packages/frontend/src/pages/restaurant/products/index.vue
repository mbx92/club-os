<route lang="yaml">
meta:
  title: Products
  layout: default
</route>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRestaurantProducts } from '@/composables/restaurant/useRestaurantProducts'
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'
import { useRestaurantCategories } from '@/composables/restaurant/useRestaurantCategories'
import ProductListView from '@/components/restaurant/products/ProductListView.vue'
import ProductFormModal from '@/components/restaurant/products/ProductFormModal.vue'
import StockAdjustmentModal from '@/components/restaurant/products/StockAdjustmentModal.vue'
import { useRouter } from 'vue-router'
import { useNotification } from '@/composables/core/useNotification'

const router = useRouter()
const { showSuccess, showError } = useNotification()

const { 
  products, 
  fetchProducts, 
  createProduct, 
  updateProduct,
  deleteProduct,
  adjustStock,
  loading 
} = useRestaurantProducts()

const { locations, fetchLocations } = useRestaurantLocations()
const { categories: categoryList, fetchCategories } = useRestaurantCategories()

// UI State
const viewMode = ref('grid')
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedLocation = ref('')
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showStockModal = ref(false)
const selectedProduct = ref(null)
const editProduct = ref(null)

// Pagination
const currentPage = ref(1)
const perPage = ref(12)
const totalPages = ref(1)
const totalProducts = ref(0)

// Categories from API
const categories = ref([])

// Debounce search
let searchTimeout = null
const debouncedSearch = (value) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadProducts()
  }, 500)
}

watch(searchQuery, debouncedSearch)
watch([selectedCategory, selectedLocation], () => {
  currentPage.value = 1
  loadProducts()
})

const loadProducts = async () => {
  const filters = {
    page: currentPage.value,
    perPage: perPage.value
  }

  if (searchQuery.value) {
    filters.search = searchQuery.value
  }

  if (selectedCategory.value) {
    filters.categoryId = selectedCategory.value
  }

  if (selectedLocation.value) {
    filters.locationId = selectedLocation.value
  }

  await fetchProducts(filters)

  // Handle pagination from response
  if (products.value && typeof products.value === 'object' && products.value.data) {
    totalPages.value = products.value.pagination?.totalPages || 1
    totalProducts.value = products.value.pagination?.total || products.value.data.length
  } else {
    totalProducts.value = products.value?.length || 0
    totalPages.value = Math.ceil(totalProducts.value / perPage.value)
  }
}

const getProductsArray = () => {
  if (!products.value) return []
  if (Array.isArray(products.value)) return products.value
  if (products.value.data && Array.isArray(products.value.data)) return products.value.data
  return []
}

// Load categories from API and format for dropdown
const loadCategories = async () => {
  try {
    const result = await fetchCategories({ includeCount: true })
    // Flatten categories for dropdown
    const flatten = (cats, prefix = '') => {
      let result = []
      for (const cat of cats) {
        const name = prefix ? `${prefix} > ${cat.name}` : cat.name
        result.push({ id: cat.id, name, displayName: name })
        if (cat.children && cat.children.length > 0) {
          result = result.concat(flatten(cat.children, name))
        }
      }
      return result
    }
    categories.value = flatten(result.data || categoryList.value)
  } catch (error) {
    console.error('Failed to load categories:', error)
    // Fallback to static categories
    categories.value = [
      { id: 'main-dish', name: 'Main Dish' },
      { id: 'appetizer', name: 'Appetizer' },
      { id: 'dessert', name: 'Dessert' },
      { id: 'beverage', name: 'Beverage' },
      { id: 'side-dish', name: 'Side Dish' },
      { id: 'salad', name: 'Salad' },
      { id: 'soup', name: 'Soup' },
      { id: 'snack', name: 'Snack' },
      { id: 'other', name: 'Other' }
    ]
  }
}

const handleCreateProduct = async (productData) => {
  try {
    const { imageFile, ...data } = productData
    await createProduct(data, imageFile)
    showSuccess('Product created successfully!')
    showCreateModal.value = false
    loadProducts()
  } catch (error) {
    showError('Failed to create product')
  }
}

const handleViewDetail = (productId) => {
  router.push(`/restaurant/products/${productId}`)
}

const handleEdit = (product) => {
  editProduct.value = product
  showEditModal.value = true
}

const handleUpdateProduct = async (productData) => {
  try {
    const { imageFile, ...data } = productData
    await updateProduct(editProduct.value.id, data, imageFile)
    showSuccess('Product updated successfully!')
    showEditModal.value = false
    editProduct.value = null
    loadProducts()
  } catch (error) {
    showError('Failed to update product')
  }
}

const handleDelete = async (productId) => {
  if (!confirm('Are you sure you want to delete this product?')) return

  try {
    await deleteProduct(productId)
    showSuccess('Product deleted successfully!')
    loadProducts()
  } catch (error) {
    showError('Failed to delete product')
  }
}

const handleAdjustStock = (product) => {
  selectedProduct.value = product
  showStockModal.value = true
}

const handleStockAdjustment = async (adjustmentData) => {
  try {
    await adjustStock(adjustmentData.productId, {
      quantity: adjustmentData.quantity,
      type: adjustmentData.type,
      reason: adjustmentData.reason,
      notes: adjustmentData.notes
    })
    showSuccess('Stock adjusted successfully!')
    showStockModal.value = false
    selectedProduct.value = null
    loadProducts()
  } catch (error) {
    showError('Failed to adjust stock')
  }
}

const changePage = (page) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  loadProducts()
}

onMounted(async () => {
  await Promise.all([
    loadProducts(),
    fetchLocations(),
    loadCategories()
  ])
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold">Products</h1>
        <p class="text-base-content/60 mt-1">Manage your restaurant menu and inventory</p>
      </div>
    </div>

    <!-- Product List -->
    <ProductListView
      :products="getProductsArray()"
      :loading="loading"
      :view-mode="viewMode"
      :search-query="searchQuery"
      :selected-category="selectedCategory"
      :selected-location="selectedLocation"
      :categories="categories"
      :locations="locations"
      @update:search-query="searchQuery = $event"
      @update:selected-category="selectedCategory = $event"
      @update:selected-location="selectedLocation = $event"
      @update:view-mode="viewMode = $event"
      @create="showCreateModal = true"
      @view-detail="handleViewDetail"
      @edit="handleEdit"
      @delete="handleDelete"
      @adjust-stock="handleAdjustStock"
    />

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex justify-center mt-6">
      <div class="btn-group">
        <button 
          class="btn btn-sm" 
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >
          «
        </button>
        
        <button 
          v-for="page in totalPages" 
          :key="page"
          class="btn btn-sm"
          :class="{ 'btn-active': currentPage === page }"
          @click="changePage(page)"
        >
          {{ page }}
        </button>
        
        <button 
          class="btn btn-sm" 
          :disabled="currentPage === totalPages"
          @click="changePage(currentPage + 1)"
        >
          »
        </button>
      </div>
    </div>

    <!-- Showing Results -->
    <div v-if="totalProducts > 0" class="text-center text-sm text-base-content/60 mt-4">
      Showing {{ ((currentPage - 1) * perPage) + 1 }} - {{ Math.min(currentPage * perPage, totalProducts) }} of {{ totalProducts }} products
    </div>

    <!-- Create Modal -->
    <ProductFormModal
      v-model="showCreateModal"
      :loading="loading"
      :locations="locations"
      @submit="handleCreateProduct"
    />

    <!-- Edit Modal -->
    <ProductFormModal
      v-model="showEditModal"
      :product="editProduct"
      :loading="loading"
      :locations="locations"
      @submit="handleUpdateProduct"
    />

    <!-- Stock Adjustment Modal -->
    <StockAdjustmentModal
      v-if="selectedProduct"
      v-model="showStockModal"
      :product="selectedProduct"
      :loading="loading"
      @submit="handleStockAdjustment"
    />
  </div>
</template>
