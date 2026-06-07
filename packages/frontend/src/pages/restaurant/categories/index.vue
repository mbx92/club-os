<route lang="yaml">
meta:
  title: Categories
  layout: default
</route>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRestaurantCategories } from '@/composables/restaurant/useRestaurantCategories'
import { useNotification } from '@/composables/core/useNotification'
import CategoryTree from '@/components/restaurant/categories/CategoryTree.vue'
import CategoryFormModal from '@/components/restaurant/categories/CategoryFormModal.vue'
import CategoryDeleteModal from '@/components/restaurant/categories/CategoryDeleteModal.vue'
import {
  IconFolder,
  IconFolderPlus,
  IconSearch,
  IconFilter,
  IconRefresh,
  IconX,
  IconEdit,
  IconTrash
} from '@tabler/icons-vue'

const { showSuccess, showError } = useNotification()

const {
  categoryTree,
  categories,
  loading,
  getCategoryTree,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryActive
} = useRestaurantCategories()

// UI State
const viewMode = ref('tree')
const searchQuery = ref('')
const showActiveOnly = ref(false)

// Modal states
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)

// Selected items
const selectedCategory = ref(null)
const editingCategory = ref(null)
const deletingCategory = ref(null)
const parentForNew = ref(null)

// Statistics
const stats = computed(() => {
  const countAll = (cats) => {
    let total = 0
    let active = 0
    let withProducts = 0
    let totalProducts = 0

    cats.forEach((cat) => {
      total++
      if (cat.isActive !== false) active++
      const productCount = cat.productCount || cat._count?.products || 0
      if (productCount > 0) {
        withProducts++
        totalProducts += productCount
      }
      if (cat.children && cat.children.length > 0) {
        const childStats = countAll(cat.children)
        total += childStats.total
        active += childStats.active
        withProducts += childStats.withProducts
        totalProducts += childStats.totalProducts
      }
    })

    return { total, active, withProducts, totalProducts }
  }

  return countAll(categoryTree.value)
})

// Filtered categories for tree
const filteredCategories = computed(() => {
  if (!searchQuery.value && !showActiveOnly.value) {
    return categoryTree.value
  }

  const filterTree = (cats) => {
    return cats
      .map((cat) => {
        // Check if category matches filter
        const matchesSearch = !searchQuery.value ||
          cat.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
          cat.description?.toLowerCase().includes(searchQuery.value.toLowerCase())

        const matchesActive = !showActiveOnly.value || cat.isActive !== false

        // Filter children recursively
        const filteredChildren = cat.children ? filterTree(cat.children) : []

        // Include if matches or has matching children
        if ((matchesSearch && matchesActive) || filteredChildren.length > 0) {
          return {
            ...cat,
            children: filteredChildren
          }
        }
        return null
      })
      .filter(Boolean)
  }

  return filterTree(categoryTree.value)
})

// Load data
const loadCategories = async () => {
  try {
    // Use fetchCategories with tree=true so we reuse the single "get all" endpoint
    // and still receive a nested tree (if backend supports `tree=true`).
    const res = await fetchCategories({ tree: true, includeCount: true })

    // Normalize response: composable returns { data, total, ... } or an array
    if (res && res.data) {
      categoryTree.value = res.data
    } else if (Array.isArray(res)) {
      categoryTree.value = res
    } else if (res && Array.isArray(res.data)) {
      categoryTree.value = res.data
    } else {
      categoryTree.value = []
    }
  } catch (error) {
    showError('Failed to load categories')
  }
}

// CRUD handlers
const handleCreate = () => {
  parentForNew.value = null
  showCreateModal.value = true
}

const handleAddChild = (parent) => {
  parentForNew.value = parent
  showCreateModal.value = true
}

const handleEdit = (category) => {
  editingCategory.value = category
  showEditModal.value = true
}

const handleDelete = (category) => {
  deletingCategory.value = category
  showDeleteModal.value = true
}

const handleSelect = (category) => {
  selectedCategory.value = category
}

const handleToggleActive = async (category) => {
  try {
    await toggleCategoryActive(category)
    await loadCategories()
  } catch (error) {
    showError('Failed to update category status')
  }
}

const handleCreateSubmit = async (formData) => {
  try {
    await createCategory(formData)
    showCreateModal.value = false
    parentForNew.value = null
    await loadCategories()
  } catch (error) {
    showError('Failed to create category')
  }
}

const handleEditSubmit = async (formData) => {
  try {
    await updateCategory(editingCategory.value.id, formData)
    showEditModal.value = false
    editingCategory.value = null
    await loadCategories()
  } catch (error) {
    showError('Failed to update category')
  }
}

const handleDeleteConfirm = async ({ categoryId, moveProductsTo }) => {
  try {
    await deleteCategory(categoryId, moveProductsTo)
    showDeleteModal.value = false
    deletingCategory.value = null
    await loadCategories()
  } catch (error) {
    showError('Failed to delete category')
  }
}

const handleCloseDetails = () => {
  selectedCategory.value = null
}

// Initialize
onMounted(() => {
  loadCategories()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold flex items-center gap-3">
          Categories
        </h1>
        <p class="text-base-content/60 mt-1">
          Organize your products into categories and subcategories
        </p>
      </div>

      <!-- <button class="btn btn-primary gap-2" @click="handleCreate">
        <IconFolderPlus class="w-5 h-5" />
        New Category
      </button> -->
    </div>

    <!-- Statistics -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="stat bg-base-100 rounded-box shadow-sm">
        <div class="stat-title">Total Categories</div>
        <div class="stat-value text-2xl">{{ stats.total }}</div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow-sm">
        <div class="stat-title">Active</div>
        <div class="stat-value text-2xl text-success">{{ stats.active }}</div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow-sm">
        <div class="stat-title">With Products</div>
        <div class="stat-value text-2xl text-info">{{ stats.withProducts }}</div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow-sm">
        <div class="stat-title">Total Products</div>
        <div class="stat-value text-2xl text-primary">{{ stats.totalProducts }}</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
      <!-- Search -->
      <div class="form-control flex-1">
        <div class="relative w-full">
          <IconSearch aria-hidden="true" class="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/60 pointer-events-none z-10" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search categories..."
            class="input input-bordered w-full pl-10"
          />
        </div>
      </div>

      <!-- Active Only Toggle -->
      <div class="form-control">
        <label class="label cursor-pointer gap-2 mt-2">
          <input
            v-model="showActiveOnly"
            type="checkbox"
            class="toggle toggle-primary"
          />
          <span class="label-text">Active only</span>
        </label>
      </div>
    </div>

    <!-- Category Tree -->
    <div class="bg-base-100 rounded-box shadow-sm p-6">
      <CategoryTree
        :categories="filteredCategories"
        :loading="loading"
        v-model:viewMode="viewMode"
        @create="handleCreate"
        @edit="handleEdit"
        @delete="handleDelete"
        @add-child="handleAddChild"
        @select="handleSelect"
        @toggle-active="handleToggleActive"
        @refresh="loadCategories"
      />
    </div>

    <!-- Selected Category Details -->
    <div
      v-if="selectedCategory"
      class="mt-6 bg-base-100 rounded-box shadow-sm p-6"
    >
      <div class="flex items-start justify-between">
        <div>
          <h3 class="text-lg font-bold">{{ selectedCategory.name }}</h3>
          <p v-if="selectedCategory.description" class="text-base-content/60 mt-1">
            {{ selectedCategory.description }}
          </p>
        </div>
        <div class="flex items-start gap-2">
          <button
            class="btn btn-sm btn-ghost btn-square"
            @click="handleCloseDetails"
            title="Close details"
          >
            <IconX class="w-4 h-4" />
          </button>
          <button
            class="btn btn-sm btn-ghost btn-square"
            @click="handleEdit(selectedCategory)"
            title="Edit"
          >
            <IconEdit class="w-4 h-4" />
          </button>
          <button
            class="btn btn-sm btn-ghost btn-square text-error"
            @click="handleDelete(selectedCategory)"
            title="Delete"
          >
            <IconTrash class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="divider"></div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <span class="text-sm text-base-content/60">Products</span>
          <p class="font-semibold">
            {{ selectedCategory.productCount || selectedCategory._count?.products || 0 }}
          </p>
        </div>
        <div>
          <span class="text-sm text-base-content/60">Subcategories</span>
          <p class="font-semibold">
            {{ selectedCategory.children?.length || 0 }}
          </p>
        </div>
        <div>
          <span class="text-sm text-base-content/60">Display Order</span>
          <p class="font-semibold">{{ selectedCategory.displayOrder || 1 }}</p>
        </div>
        <div>
          <span class="text-sm text-base-content/60">Status</span>
          <p class="font-semibold">
            <span
              class="badge"
              :class="selectedCategory.isActive !== false ? 'badge-success' : 'badge-warning'"
            >
              {{ selectedCategory.isActive !== false ? 'Active' : 'Inactive' }}
            </span>
          </p>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <CategoryFormModal
      v-model="showCreateModal"
      :categories="categoryTree"
      :parent-category="parentForNew"
      :loading="loading"
      @submit="handleCreateSubmit"
    />

    <!-- Edit Modal -->
    <CategoryFormModal
      v-model="showEditModal"
      :category="editingCategory"
      :categories="categoryTree"
      :loading="loading"
      @submit="handleEditSubmit"
    />

    <!-- Delete Modal -->
    <CategoryDeleteModal
      v-model="showDeleteModal"
      :category="deletingCategory"
      :categories="categoryTree"
      :loading="loading"
      @confirm="handleDeleteConfirm"
    />
  </div>
</template>
