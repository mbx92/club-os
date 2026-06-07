<route lang="yaml">
meta:
  title: Tables
  layout: default
</route>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useRestaurantTables } from '@/composables/restaurant/useRestaurantTables'
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'
import { useNotification } from '@/composables/core/useNotification'
import TableListView from '@/components/restaurant/tables/TableListView.vue'
import TableFormModal from '@/components/restaurant/tables/TableFormModal.vue'
import TableReserveModal from '@/components/restaurant/tables/TableReserveModal.vue'
import { IconLayoutGrid } from '@tabler/icons-vue'

const router = useRouter()
const { showSuccess, showError } = useNotification()

const { 
  tables, 
  fetchTables, 
  createTable, 
  updateTable,
  reserveTable,
  releaseTable,
  deleteTable,
  setTableCleaning,
  loading 
} = useRestaurantTables()

const { locations, fetchLocations } = useRestaurantLocations()

const searchQuery = ref('')
const selectedStatus = ref('')
const selectedLocation = ref('')
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showReserveModal = ref(false)
const selectedTable = ref(null)
const selectedTableId = ref(null)

let searchTimeout = null
const debouncedSearch = (value) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadTables()
  }, 500)
}

watch(searchQuery, debouncedSearch)
watch([selectedStatus, selectedLocation], () => {
  loadTables()
})

const loadTables = async () => {
  const filters = {}
  
  if (searchQuery.value) {
    filters.search = searchQuery.value
  }
  
  if (selectedStatus.value) {
    filters.status = selectedStatus.value
  }
  
  if (selectedLocation.value) {
    filters.locationId = selectedLocation.value
  }
  
  await fetchTables(filters)
}

const getTablesArray = () => {
  if (!tables.value) return []
  if (Array.isArray(tables.value)) return tables.value
  if (tables.value.data && Array.isArray(tables.value.data)) return tables.value.data
  return []
}

const handleCreate = () => {
  selectedTable.value = null
  showCreateModal.value = true
}

const handleEdit = (table) => {
  selectedTable.value = table
  showEditModal.value = true
}

const handleCreateSubmit = async (tableData) => {
  try {
    const result = await createTable(tableData)
    showSuccess('Table created successfully!')
    showCreateModal.value = false
    loadTables()
  } catch (error) {
    // Try to show detailed backend error if available
    const payload = error?.response?.data || error?.data || error
    let message = 'Failed to create table'

    if (payload) {
      if (typeof payload === 'string') {
        message = payload
      } else if (payload.message) {
        message = payload.message
        // Append validation errors if present
        if (Array.isArray(payload.errors) && payload.errors.length) {
          const details = payload.errors.map(e => e.message || (e.path ? `${e.path}: ${e.message}` : JSON.stringify(e))).join('; ')
          message = `${message} — ${details}`
        }
      } else {
        // Fallback stringify
        try {
          message = JSON.stringify(payload)
        } catch (e) {
          message = String(payload)
        }
      }
    }

    showError(message, 8000)
  }
}

const handleEditSubmit = async (tableData) => {
  try {
    await updateTable(selectedTable.value.id, tableData)
    showSuccess('Table updated successfully!')
    showEditModal.value = false
    selectedTable.value = null
    loadTables()
  } catch (error) {
    showError('Failed to update table')
  }
}

const handleUpdateStatus = async (tableId, newStatus) => {
  try {
    await updateTableStatus(tableId, newStatus)
    showSuccess('Table status updated!')
    loadTables()
  } catch (error) {
    showError('Failed to update table status')
  }
}

const handleReserve = (tableId) => {
  selectedTableId.value = tableId
  showReserveModal.value = true
}

const handleReserveSubmit = async (reserveData) => {
  try {
    await reserveTable(selectedTableId.value, reserveData)
    showSuccess('Table reserved successfully!')
    showReserveModal.value = false
    selectedTableId.value = null
    loadTables()
  } catch (error) {
    showError('Failed to reserve table')
  }
}

const handleRelease = async (tableId) => {
  try {
    await releaseTable(tableId, { status: 'available' })
    showSuccess('Table marked as available!')
    loadTables()
  } catch (error) {
    showError('Failed to release table')
  }
}

const handleSetCleaning = async (tableId) => {
  try {
    await setTableCleaning(tableId)
    showSuccess('Table set for cleaning')
    loadTables()
  } catch (error) {
    showError('Failed to set table for cleaning')
  }
}

const handleDelete = async (tableId) => {
  try {
    await deleteTable(tableId)
    showSuccess('Table deleted successfully!')
    loadTables()
  } catch (error) {
    showError('Failed to delete table')
  }
}

const goToFloorPlan = () => {
  router.push('/restaurant/tables/floor-plan')
}

onMounted(async () => {
  await Promise.all([
    loadTables(),
    fetchLocations()
  ])
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold">Tables</h1>
        <p class="text-base-content/60 mt-1">Manage your restaurant tables and seating</p>
      </div>
      
      <button class="btn btn-secondary" @click="goToFloorPlan">
        <IconLayoutGrid class="w-5 h-5 mr-2" />
        Floor Plan View
      </button>
    </div>

    <!-- Table List -->
    <TableListView
      :tables="getTablesArray()"
      :loading="loading"
      :search-query="searchQuery"
      :selected-status="selectedStatus"
      :selected-location="selectedLocation"
      :locations="locations"
      @update:search-query="searchQuery = $event"
      @update:selected-status="selectedStatus = $event"
      @update:selected-location="selectedLocation = $event"
      @create="handleCreate"
      @edit="handleEdit"
      @delete="handleDelete"
      @reserve="handleReserve"
          @release="handleRelease"
          @clean="handleSetCleaning"
    />

    <!-- Create Modal -->
    <TableFormModal
      v-model="showCreateModal"
      :loading="loading"
      :locations="locations"
      @submit="handleCreateSubmit"
    />

    <!-- Edit Modal -->
    <TableFormModal
      v-if="selectedTable"
      v-model="showEditModal"
      :table="selectedTable"
      :loading="loading"
      :locations="locations"
      @submit="handleEditSubmit"
    />

    <!-- Reserve Modal -->
    <TableReserveModal
      :show="showReserveModal"
      :loading="loading"
      @close="showReserveModal = false; selectedTableId = null"
      @submit="handleReserveSubmit"
    />
  </div>
</template>
