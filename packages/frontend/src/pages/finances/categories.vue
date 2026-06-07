<route lang="yaml">
meta:
  title: Expense Categories
  layout: default
</route>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost btn-sm" @click="router.back()">
          <IconArrowLeft class="w-4 h-4" />
          Kembali
        </button>
        <div>
          <h1 class="text-3xl font-bold">Expense Categories</h1>
          <p class="text-base-content/60 mt-1">Organize your expenses with categories</p>
        </div>
      </div>
      <button
        class="btn btn-primary"
        @click="openCreateModal"
      >
        <IconPlus class="w-4 h-4 mr-2" />
        Add Category
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Status</span>
            </label>
            <select v-model="filters.isActive" class="select select-bordered w-full" @change="handleSearch">
              <option value="">All Status</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Search</span>
            </label>
            <label class="input input-bordered flex items-center gap-2">
              <IconSearch class="w-5 h-5 opacity-70" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search categories..."
                class="grow"
              />
              <button 
                v-if="searchQuery" 
                @click="searchQuery = ''"
                class="btn btn-ghost btn-xs btn-circle"
              >
                <IconX class="w-4 h-4" />
              </button>
            </label>
          </div>

          <div class="form-control">
            <label class="label cursor-pointer justify-start gap-4 h-[48px]">
              <input
                v-model="filters.includeStats"
                type="checkbox"
                class="checkbox checkbox-primary"
                @change="handleSearch"
              />
              <span class="label-text font-medium">Include Statistics</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Categories Grid -->
    <div v-else-if="filteredCategories.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="category in filteredCategories"
        :key="category.id"
        class="card bg-base-100 shadow-xl"
        :class="{ 'opacity-50': !category.isActive }"
      >
        <div class="card-body">
          <!-- Header with color indicator -->
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-3">
              <div
                class="w-4 h-4 rounded-full"
                :style="{ backgroundColor: category.color }"
              ></div>
              <h3 class="card-title text-lg">{{ category.name }}</h3>
            </div>
            <div class="dropdown dropdown-end">
              <label tabindex="0" class="btn btn-ghost btn-sm btn-circle">
                <IconDotsVertical class="w-4 h-4" />
              </label>
              <ul tabindex="0" class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 z-10">
                <li>
                  <a @click="openEditModal(category)">
                    <IconEdit class="w-4 h-4" />
                    Edit
                  </a>
                </li>
                <li>
                  <a @click="handleDelete(category)" class="text-error">
                    <IconTrash class="w-4 h-4" />
                    Delete
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <!-- Type Badge -->
          <div class="mb-3">
            <div :class="getTypeBadgeClass(category.type)">
              {{ formatType(category.type) }}
            </div>
          </div>

          <!-- Description -->
          <p v-if="category.description" class="text-sm text-base-content/60 mb-4">
            {{ category.description }}
          </p>

          <!-- Statistics (if included) -->
          <div v-if="category.stats" class="stats stats-vertical shadow w-full">
            <div class="stat py-2 px-4">
              <div class="stat-title text-xs">Total Expenses</div>
              <div class="stat-value text-lg">{{ formatCurrency(category.stats.totalExpenses) }}</div>
              <div class="stat-desc">{{ category.stats.expenseCount }} transactions</div>
            </div>
            <div class="stat py-2 px-4">
              <div class="stat-title text-xs">Average Amount</div>
              <div class="stat-value text-lg">{{ formatCurrency(category.stats.avgExpenseAmount) }}</div>
            </div>
          </div>

          <!-- Status -->
          <div class="flex items-center justify-between mt-4 pt-4 border-t border-base-300">
            <span class="text-sm font-medium">Status:</span>
            <div :class="category.isActive ? 'badge badge-success' : 'badge badge-ghost'">
              {{ category.isActive ? 'Active' : 'Inactive' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body items-center text-center py-12">
        <IconTag class="w-16 h-16 text-base-content/30 mb-4" />
        <h3 class="text-xl font-semibold mb-2">No Categories Found</h3>
        <p class="text-base-content/60 mb-6">Create categories to organize your expenses</p>
        <button class="btn btn-primary" @click="openCreateModal">
          <IconPlus class="w-4 h-4 mr-2" />
          Add Category
        </button>
      </div>
    </div>

    <!-- Expense Category Form Modal -->
    <ExpenseCategoryFormModal
      ref="categoryFormModal"
      :category="selectedCategory"
      :loading="actionLoading"
      @submit="handleSubmit"
    />

    <!-- Confirm Dialog -->
    <DialogConfirm ref="confirmDialog" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useExpenseCategories } from '@/composables/finances'
import ExpenseCategoryFormModal from '@/components/finances/ExpenseCategoryFormModal.vue'
import DialogConfirm from '@/components/shared/DialogConfirm.vue'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconTag,
  IconDotsVertical,
  IconSearch,
  IconX,
  IconArrowLeft
} from '@tabler/icons-vue'

const router = useRouter()

const {
  categories,
  loading,
  actionLoading,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = useExpenseCategories()

const categoryFormModal = ref(null)
const confirmDialog = ref(null)
const selectedCategory = ref(null)
const searchQuery = ref('')

const filters = ref({
  isActive: '',
  includeStats: true
})

const filteredCategories = computed(() => {
  let result = categories.value

  // Status Filter
  if (!filters.value.isActive || filters.value.isActive === '') {
    // No status filter
  } else {
    const isActive = filters.value.isActive === 'true'
    result = result.filter(c => c.isActive === isActive)
  }

  // Search Filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(c => 
      c.name.toLowerCase().includes(query) || 
      (c.description && c.description.toLowerCase().includes(query))
    )
  }

  return result
})

const hasCategories = computed(() => filteredCategories.value.length > 0)

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount || 0)
}

const formatType = (type) => {
  const typeMap = {
    operational: 'Operational',
    fixed: 'Fixed',
    variable: 'Variable',
    one_time: 'One Time'
  }
  return typeMap[type] || type
}

const getTypeBadgeClass = (type) => {
  const classes = {
    operational: 'badge badge-primary',
    fixed: 'badge badge-info',
    variable: 'badge badge-warning',
    one_time: 'badge badge-accent'
  }
  return classes[type] || 'badge'
}

const handleSearch = () => {
  loadCategories()
}

const loadCategories = async () => {
  const searchFilters = {}
  
  if (filters.value.isActive !== '') {
    searchFilters.isActive = filters.value.isActive === 'true'
  }
  
  if (filters.value.includeStats) {
    searchFilters.includeStats = true
  }
  
  await fetchCategories(searchFilters)
}

const openCreateModal = () => {
  selectedCategory.value = null
  categoryFormModal.value?.open()
}

const openEditModal = (category) => {
  selectedCategory.value = category
  categoryFormModal.value?.open(category)
}

const handleSubmit = async (categoryData) => {
  try {
    if (selectedCategory.value) {
      await updateCategory(selectedCategory.value.id, categoryData)
    } else {
      await createCategory(categoryData)
    }
    categoryFormModal.value?.close()
    await loadCategories()
  } catch (error) {
    console.error('Failed to submit category:', error)
  }
}

const handleDelete = async (category) => {
  const confirmed = await confirmDialog.value?.open({
    title: 'Delete Category',
    message: `Are you sure you want to delete category "${category.name}"? This action cannot be undone.`,
    confirmText: 'Delete',
    type: 'danger'
  })

  if (confirmed) {
    try {
      await deleteCategory(category.id)
      await loadCategories()
    } catch (error) {
      console.error('Failed to delete category:', error)
    }
  }
}

onMounted(() => {
  loadCategories()
})
</script>
