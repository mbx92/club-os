<route lang="yaml">
meta:
  title: Income Management
  layout: default
</route>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useIncomes } from '@/composables/finances/useIncomes'
import { useIncomeCategories } from '@/composables/finances/useIncomeCategories'
import IncomeFormModal from '@/components/finances/IncomeFormModal.vue'
import {
  IconPlus,
  IconSearch,
  IconFilter,
  IconEdit,
  IconTrash,
  IconEye,
  IconFileInvoice,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconTag
} from '@tabler/icons-vue'

const router = useRouter()

const { incomes, loading, pagination, fetchIncomes, deleteIncome, createIncome, updateIncome } = useIncomes()
const { categories, fetchCategories } = useIncomeCategories()

// Filter state
const filters = ref({
  search: '',
  type: '',
  status: '',
  categoryId: '',
  startDate: '',
  endDate: '',
  page: 1,
  limit: 20,
  sortBy: 'incomeDate',
  sortOrder: 'DESC'
})

// Modal state
const showModal = ref(false)
const modalMode = ref('create')
const selectedIncome = ref(null)
const modalLoading = ref(false)

// Locations (would come from another composable in production)
const locations = ref([])

// Debounced search
let searchTimeout = null
const debouncedSearch = computed({
  get: () => filters.value.search,
  set: (value) => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      filters.value.search = value
      filters.value.page = 1
      loadIncomes()
    }, 500)
  }
})

const loadIncomes = async () => {
  const params = { ...filters.value }
  
  // Remove empty filters
  Object.keys(params).forEach(key => {
    if (params[key] === '' || params[key] === null) {
      delete params[key]
    }
  })
  
  await fetchIncomes(params)
}

const loadCategories = async () => {
  await fetchCategories({ isActive: true })
}

const handleCreate = () => {
  modalMode.value = 'create'
  selectedIncome.value = null
  showModal.value = true
}

const handleEdit = (income) => {
  if (income.type === 'transactional') {
    alert('Transactional incomes cannot be edited. Please modify the source transaction.')
    return
  }
  
  modalMode.value = 'edit'
  selectedIncome.value = income
  showModal.value = true
}

const handleDelete = async (income) => {
  if (income.type === 'transactional') {
    alert('Transactional incomes cannot be deleted.')
    return
  }
  
  if (!confirm(`Are you sure you want to delete "${income.title}"?`)) {
    return
  }
  
  try {
    await deleteIncome(income.id)
    await loadIncomes()
  } catch (error) {
    console.error('Error deleting income:', error)
  }
}

const handleSubmit = async (data) => {
  modalLoading.value = true
  try {
    if (modalMode.value === 'create') {
      await createIncome(data)
    } else {
      await updateIncome(selectedIncome.value.id, data)
    }
    
    showModal.value = false
    await loadIncomes()
  } catch (error) {
    console.error('Error saving income:', error)
  } finally {
    modalLoading.value = false
  }
}

const clearFilters = () => {
  filters.value = {
    search: '',
    type: '',
    status: '',
    categoryId: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20,
    sortBy: 'incomeDate',
    sortOrder: 'DESC'
  }
  loadIncomes()
}

const activeFiltersCount = computed(() => {
  let count = 0
  if (filters.value.type) count++
  if (filters.value.status) count++
  if (filters.value.categoryId) count++
  if (filters.value.startDate) count++
  if (filters.value.endDate) count++
  return count
})

const changePage = (newPage) => {
  filters.value.page = newPage
  loadIncomes()
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const getStatusClass = (status) => {
  const classes = {
    pending: 'badge-warning',
    received: 'badge-success',
    cancelled: 'badge-error'
  }
  return classes[status] || 'badge-ghost'
}

const getStatusLabel = (status) => {
  const labels = {
    pending: 'Pending',
    received: 'Received',
    cancelled: 'Cancelled'
  }
  return labels[status] || status
}

const getTypeClass = (type) => {
  return type === 'manual' ? 'badge-primary' : 'badge-info'
}

const getTypeLabel = (type) => {
  return type === 'manual' ? 'Manual' : 'Transactional'
}

onMounted(async () => {
  await Promise.all([
    loadIncomes(),
    loadCategories()
  ])
})

// Watch for filter changes
watch(
  () => [filters.value.type, filters.value.status, filters.value.categoryId, filters.value.startDate, filters.value.endDate],
  () => {
    filters.value.page = 1
    loadIncomes()
  }
)
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Income Management</h1>
        <p class="text-base-content/60 mt-1">Track and manage all income sources</p>
      </div>
      
      <div class="flex gap-2">
        <button
          class="btn btn-outline"
          @click="router.push('/finances/income-categories')"
        >
          <IconTag class="w-4 h-4 mr-2" />
          Kelola Kategori
        </button>
        <button class="btn btn-primary" @click="handleCreate">
          <IconPlus class="w-5 h-5 mr-2" />
          Add Income
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-sm mb-6">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Search -->
          <div class="form-control">
            <label class="input input-bordered flex items-center gap-2">
              <IconSearch class="w-5 h-5 opacity-70" />
              <input
                v-model="debouncedSearch"
                type="text"
                placeholder="Search income..."
                class="grow"
              />
            </label>
          </div>

          <!-- Type Filter -->
          <div class="form-control">
            <select v-model="filters.type" class="select select-bordered">
              <option value="">All Types</option>
              <option value="manual">Manual</option>
              <option value="transactional">Transactional</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="form-control">
            <select v-model="filters.status" class="select select-bordered">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <!-- Category Filter -->
          <div class="form-control">
            <select v-model="filters.categoryId" class="select select-bordered">
              <option value="">All Categories</option>
              <option
                v-for="category in categories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </div>

          <!-- Date Range -->
          <div class="form-control">
            <input
              v-model="filters.startDate"
              type="date"
              class="input input-bordered"
              placeholder="Start Date"
            />
          </div>

          <div class="form-control">
            <input
              v-model="filters.endDate"
              type="date"
              class="input input-bordered"
              placeholder="End Date"
            />
          </div>
        </div>

        <!-- Active Filters & Clear -->
        <div v-if="activeFiltersCount > 0" class="flex items-center gap-2 mt-4">
          <span class="badge badge-ghost">
            <IconFilter class="w-4 h-4 mr-1" />
            {{ activeFiltersCount }} filter{{ activeFiltersCount > 1 ? 's' : '' }} active
          </span>
          <button class="btn btn-ghost btn-xs" @click="clearFilters">
            <IconX class="w-4 h-4 mr-1" />
            Clear All
          </button>
        </div>
      </div>
    </div>

    <!-- Incomes Table -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div v-if="loading" class="text-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="incomes.length === 0" class="text-center py-12">
          <IconFileInvoice class="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p class="text-lg font-semibold text-base-content/60">No incomes found</p>
          <p class="text-sm text-base-content/40 mt-1">
            {{ activeFiltersCount > 0 ? 'Try adjusting your filters' : 'Create your first income entry' }}
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Income #</th>
                <th>Title</th>
                <th>Category</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Income Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="income in incomes" :key="income.id">
                <td class="font-mono text-xs">{{ income.incomeNumber }}</td>
                <td>
                  <div class="font-semibold">{{ income.title }}</div>
                  <div v-if="income.source" class="text-xs text-base-content/60">
                    {{ income.source }}
                  </div>
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <div
                      v-if="income.category?.color"
                      class="w-3 h-3 rounded-full"
                      :style="{ backgroundColor: income.category.color }"
                    ></div>
                    <span>{{ income.category?.name || '-' }}</span>
                  </div>
                </td>
                <td>
                  <span class="badge badge-sm" :class="getTypeClass(income.type)">
                    {{ getTypeLabel(income.type) }}
                  </span>
                </td>
                <td class="font-semibold text-success">
                  {{ formatCurrency(income.totalAmount || income.amount) }}
                </td>
                <td>{{ formatDate(income.incomeDate) }}</td>
                <td>
                  <span class="badge" :class="getStatusClass(income.status)">
                    {{ getStatusLabel(income.status) }}
                  </span>
                </td>
                <td>
                  <div class="flex gap-2">
                    <button
                      class="btn btn-ghost btn-sm"
                      @click="handleEdit(income)"
                      :disabled="income.type === 'transactional'"
                      :title="income.type === 'transactional' ? 'Transactional incomes cannot be edited' : 'Edit income'"
                    >
                      <IconEdit class="w-4 h-4" />
                    </button>
                    <button
                      class="btn btn-ghost btn-sm text-error"
                      @click="handleDelete(income)"
                      :disabled="income.type === 'transactional'"
                      :title="income.type === 'transactional' ? 'Transactional incomes cannot be deleted' : 'Delete income'"
                    >
                      <IconTrash class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.totalPages > 1" class="flex justify-center gap-2 mt-6">
          <button
            class="btn btn-sm"
            :disabled="pagination.page === 1"
            @click="changePage(pagination.page - 1)"
          >
            <IconChevronLeft class="w-4 h-4" />
          </button>
          
          <div class="flex items-center gap-2">
            <span class="text-sm">
              Page {{ pagination.page }} of {{ pagination.totalPages }}
            </span>
          </div>
          
          <button
            class="btn btn-sm"
            :disabled="pagination.page === pagination.totalPages"
            @click="changePage(pagination.page + 1)"
          >
            <IconChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Income Form Modal -->
    <IncomeFormModal
      v-model="showModal"
      :mode="modalMode"
      :income="selectedIncome"
      :categories="categories"
      :locations="locations"
      :loading="modalLoading"
      @submit="handleSubmit"
    />
  </div>
</template>
