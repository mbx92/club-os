<route lang="yaml">
meta:
  title: Income Categories
  layout: default
</route>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useIncomeCategories } from '@/composables/finances/useIncomeCategories'
import IncomeCategoryFormModal from '@/components/finances/IncomeCategoryFormModal.vue'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconTag,
  IconDotsVertical
} from '@tabler/icons-vue'

const { categories, loading, fetchCategories, deleteCategory, createCategory, updateCategory } = useIncomeCategories()

// Modal state
const showModal = ref(false)
const modalMode = ref('create')
const selectedCategory = ref(null)
const modalLoading = ref(false)

// Filter state
const showStats = ref(true)
const showInactive = ref(false)

const filteredCategories = computed(() => {
  return categories.value.filter(cat => {
    if (!showInactive.value && !cat.isActive) {
      return false
    }
    return true
  })
})

const loadCategories = async () => {
  await fetchCategories({ includeStats: showStats.value })
}

const handleCreate = () => {
  modalMode.value = 'create'
  selectedCategory.value = null
  showModal.value = true
}

const handleEdit = (category) => {
  modalMode.value = 'edit'
  selectedCategory.value = category
  showModal.value = true
}

const handleDelete = async (category) => {
  if (!confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
    return
  }
  
  try {
    await deleteCategory(category.id)
    await loadCategories()
  } catch (error) {
    console.error('Error deleting category:', error)
  }
}

const handleSubmit = async (data) => {
  modalLoading.value = true
  try {
    if (modalMode.value === 'create') {
      await createCategory(data)
    } else {
      await updateCategory(selectedCategory.value.id, data)
    }
    
    showModal.value = false
    await loadCategories()
  } catch (error) {
    console.error('Error saving category:', error)
  } finally {
    modalLoading.value = false
  }
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const getTypeLabel = (type) => {
  const labels = {
    donation: 'Donation',
    investment: 'Investment',
    grant: 'Grant',
    sponsorship: 'Sponsorship',
    other: 'Other'
  }
  return labels[type] || type
}

const getTypeClass = (type) => {
  const classes = {
    donation: 'badge-success',
    investment: 'badge-info',
    grant: 'badge-warning',
    sponsorship: 'badge-primary',
    other: 'badge-ghost'
  }
  return classes[type] || 'badge-ghost'
}

onMounted(async () => {
  await loadCategories()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Income Categories</h1>
        <p class="text-base-content/60 mt-1">Organize and manage income sources</p>
      </div>
      
      <button class="btn btn-primary" @click="handleCreate">
        <IconPlus class="w-5 h-5 mr-2" />
        Add Category
      </button>
    </div>

    <!-- Filters -->
    <div class="flex gap-4 mb-6">
      <label class="label cursor-pointer gap-2">
        <input
          v-model="showStats"
          type="checkbox"
          class="checkbox checkbox-sm"
          @change="loadCategories"
        />
        <span class="label-text">Show Statistics</span>
      </label>
      
      <label class="label cursor-pointer gap-2">
        <input
          v-model="showInactive"
          type="checkbox"
          class="checkbox checkbox-sm"
        />
        <span class="label-text">Show Inactive</span>
      </label>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredCategories.length === 0" class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <IconTag class="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p class="text-lg font-semibold text-base-content/60">No categories found</p>
        <p class="text-sm text-base-content/40 mt-1">Create your first income category to get started</p>
      </div>
    </div>

    <!-- Categories Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="category in filteredCategories"
        :key="category.id"
        class="card bg-base-100 shadow-xl hover:shadow-2xl transition-all"
      >
        <div class="card-body">
          <!-- Header -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                :style="{ backgroundColor: category.color || '#4CAF50' }"
              >
                {{ category.name.charAt(0).toUpperCase() }}
              </div>
              <div>
                <h3 class="font-bold text-lg">{{ category.name }}</h3>
                <div class="flex gap-2 mt-1">
                  <span class="badge badge-sm" :class="getTypeClass(category.type)">
                    {{ getTypeLabel(category.type) }}
                  </span>
                  <span v-if="!category.isActive" class="badge badge-sm badge-ghost">
                    Inactive
                  </span>
                </div>
              </div>
            </div>

            <!-- Dropdown Menu -->
            <div class="dropdown dropdown-end">
              <label tabindex="0" class="btn btn-ghost btn-sm btn-square">
                <IconDotsVertical class="w-5 h-5" />
              </label>
              <ul
                tabindex="0"
                class="dropdown-content menu p-2 shadow bg-base-200 rounded-box w-52 z-10"
              >
                <li>
                  <a @click="handleEdit(category)">
                    <IconEdit class="w-4 h-4" />
                    Edit
                  </a>
                </li>
                <li>
                  <a class="text-error" @click="handleDelete(category)">
                    <IconTrash class="w-4 h-4" />
                    Delete
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <!-- Description -->
          <p v-if="category.description" class="text-sm text-base-content/60 mb-4">
            {{ category.description }}
          </p>

          <!-- Statistics -->
          <div v-if="showStats && category.totalIncomes !== undefined" class="stats stats-vertical shadow bg-base-200 mt-auto">
            <div class="stat py-3">
              <div class="stat-title text-xs">Total Incomes</div>
              <div class="stat-value text-2xl">{{ category.totalIncomes || 0 }}</div>
            </div>
            
            <div class="stat py-3">
              <div class="stat-title text-xs">Total Amount</div>
              <div class="stat-value text-2xl text-success">
                {{ category.totalAmount ? formatCurrency(category.totalAmount) : 'Rp 0' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Form Modal -->
    <IncomeCategoryFormModal
      v-model="showModal"
      :mode="modalMode"
      :category="selectedCategory"
      :loading="modalLoading"
      @submit="handleSubmit"
    />
  </div>
</template>
