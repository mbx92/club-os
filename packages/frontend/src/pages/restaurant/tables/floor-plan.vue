<route lang="yaml">
meta:
  title: Floor Plan
  layout: default
</route>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useRestaurantTables } from '@/composables/restaurant/useRestaurantTables'
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'
import { useNotification } from '@/composables/core/useNotification'
import FloorPlanCanvas from '@/components/restaurant/tables/FloorPlanCanvas.vue'
import TableFormModal from '@/components/restaurant/tables/TableFormModal.vue'
import TableReserveModal from '@/components/restaurant/tables/TableReserveModal.vue'
import TableStatusBadge from '@/components/restaurant/tables/TableStatusBadge.vue'
import DialogConfirm from '@/components/shared/DialogConfirm.vue'
import { 
  IconArrowLeft, 
  IconPlus, 
  IconEdit,
  IconTrash,
  IconDeviceFloppy
} from '@tabler/icons-vue'

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
  loading 
} = useRestaurantTables()

const { locations, fetchLocations } = useRestaurantLocations()

const floorPlanCanvas = ref(null)
const selectedLocation = ref('')
const selectedTable = ref(null)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showReserveModal = ref(false)
const hasUnsavedChanges = ref(false)

const reserveLoading = ref(false)

const dialogConfirm = ref(null)

const localTables = ref([])

watch(selectedLocation, () => {
  loadTables()
})

const loadTables = async () => {
  const filters = {}
  
  if (selectedLocation.value) {
    filters.locationId = selectedLocation.value
  }
  
  await fetchTables(filters)
  
  // Copy to local state for position updates
  const tablesArray = getTablesArray()
  localTables.value = JSON.parse(JSON.stringify(tablesArray))
  
  await nextTick()
  if (floorPlanCanvas.value) {
    floorPlanCanvas.value.redraw()
  }
}

const getTablesArray = () => {
  if (!tables.value) return []
  if (Array.isArray(tables.value)) return tables.value
  if (tables.value.data && Array.isArray(tables.value.data)) return tables.value.data
  return []
}

const handlePositionUpdate = (tableId, x, y) => {
  const table = localTables.value.find(t => t.id === tableId)
  if (table) {
    table.positionX = x
    table.positionY = y
    hasUnsavedChanges.value = true
  }
  
  if (floorPlanCanvas.value) {
    floorPlanCanvas.value.redraw()
  }
}

const handleSizeUpdate = (tableId, width, height) => {
  const table = localTables.value.find(t => t.id === tableId)
  if (table) {
    table.width = width
    table.height = height
    hasUnsavedChanges.value = true
  }
  
  if (floorPlanCanvas.value) {
    floorPlanCanvas.value.redraw()
  }
}

const handleSelectTable = (table) => {
  selectedTable.value = table
  
  if (floorPlanCanvas.value) {
    floorPlanCanvas.value.redraw()
  }
}

const handleCreateTable = () => {
  showCreateModal.value = true
}

const handleCreateSubmit = async (tableData) => {
  try {
    // Set default position for new table
    tableData.positionX = 100
    tableData.positionY = 100
    
    await createTable(tableData)
    showSuccess('Table created successfully!')
    showCreateModal.value = false
    loadTables()
  } catch (error) {
    showError('Failed to create table')
  }
}

const handleEditTable = () => {
  if (!selectedTable.value) return
  showEditModal.value = true
}

const openReserveModal = () => {
  if (!selectedTable.value) return
  showReserveModal.value = true
}

const handleReserveSubmit = async (payload) => {
  if (!selectedTable.value) return
  reserveLoading.value = true
  try {
    await reserveTable(selectedTable.value.id, payload)
    showSuccess('Table reserved successfully')
    selectedTable.value.status = 'reserved'
    showReserveModal.value = false
    // refresh list
    await loadTables()
  } catch (err) {
    console.error('Reserve table error:', err)
    showError(err?.message || 'Failed to reserve table')
  } finally {
    reserveLoading.value = false
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

const handleDeleteTable = async () => {
  if (!selectedTable.value) return

  try {
    const confirmed = await dialogConfirm.value.open({
      title: 'Delete Table',
      message: `Are you sure you want to delete table ${selectedTable.value.tableNumber}?`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (!confirmed) return

    await deleteTable(selectedTable.value.id)
    showSuccess('Table deleted successfully!')
    selectedTable.value = null
    loadTables()
  } catch (error) {
    showError(error?.message || 'Failed to delete table')
  }
}

const handleStatusChange = async (newStatus) => {
  if (!selectedTable.value) return

  // Prevent manual setting of 'occupied' — occupied should only be set
  // when an order is created (handled by order flow).
  if (newStatus === 'occupied') {
    showError("Status 'occupied' can only be set automatically when creating an order")
    return
  }

  try {
    // Route to the appropriate API helper from the composable
    if (newStatus === 'reserved') {
      await reserveTable(selectedTable.value.id, { status: 'reserved' })
    } else if (newStatus === 'available') {
      await releaseTable(selectedTable.value.id, { status: 'available' })
    } else {
      // For statuses like 'cleaning' or custom statuses, use updateTable
      await updateTable(selectedTable.value.id, { status: newStatus })
    }

    showSuccess('Table status updated!')
    selectedTable.value.status = newStatus
    loadTables()
  } catch (error) {
    console.error('Failed to update table status:', error)
    showError('Failed to update table status')
  }
}

const savePositions = async () => {
  if (!hasUnsavedChanges.value) return

  try {
    // Update all tables with new positions and sizes
    const updatePromises = localTables.value.map(table => {
      const updateData = {
        positionX: table.positionX,
        positionY: table.positionY
      }
      
      // Include width and height if they exist
      if (table.width) updateData.width = table.width
      if (table.height) updateData.height = table.height
      
      return updateTable(table.id, updateData)
    })

    await Promise.all(updatePromises)
    showSuccess('Floor plan saved successfully!')
    hasUnsavedChanges.value = false
  } catch (error) {
    showError('Failed to save floor plan')
  }
}

onMounted(async () => {
  await fetchLocations()
  
  // Auto-select first location if available
  if (locations.value && locations.value.length > 0) {
    selectedLocation.value = locations.value[0].id
  }
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button class="btn btn-ghost btn-sm btn-circle" @click="router.push('/restaurant/tables')">
        <IconArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-3xl font-bold">Floor Plan Editor</h1>
        <p class="text-base-content/60 mt-1">Arrange your tables visually</p>
      </div>
      <div class="flex gap-2">
        <button 
          class="btn btn-success" 
          :disabled="!hasUnsavedChanges || loading"
          @click="savePositions"
        >
          <IconDeviceFloppy class="w-5 h-5 mr-2" />
          {{ hasUnsavedChanges ? 'Save Changes' : 'Saved' }}
        </button>
        <button class="btn btn-primary" @click="handleCreateTable">
          <IconPlus class="w-5 h-5 mr-2" />
          Add Table
        </button>
      </div>
    </div>

    <!-- Location Selector -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body p-4">
        <div class="flex items-center gap-4">
          <label class="label">
            <span class="label-text font-semibold">Select Location:</span>
          </label>
          <select 
            v-model="selectedLocation" 
            class="select select-bordered w-full max-w-xs"
          >
            <option value="">Select a location</option>
            <option v-for="location in locations" :key="location.id" :value="location.id">
              {{ location.name }}
            </option>
          </select>
          
          <div v-if="localTables.length > 0" class="text-sm text-base-content/60">
            {{ localTables.length }} table(s)
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Floor Plan Canvas -->
      <div class="lg:col-span-3">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body p-4">
            <div v-if="!selectedLocation" class="text-center py-12 text-base-content/60">
              <p>Please select a location to view floor plan</p>
            </div>
            
            <div v-else-if="loading" class="flex justify-center py-12">
              <div class="loading loading-spinner loading-lg"></div>
            </div>
            
            <div v-else-if="localTables.length === 0" class="text-center py-12 text-base-content/60">
              <p>No tables at this location</p>
              <button class="btn btn-primary mt-4" @click="handleCreateTable">
                <IconPlus class="w-5 h-5 mr-2" />
                Add Your First Table
              </button>
            </div>
            
            <FloorPlanCanvas
              v-else
              ref="floorPlanCanvas"
              :tables="localTables"
              :selected-table="selectedTable"
              @update:position="handlePositionUpdate"
              @update:size="handleSizeUpdate"
              @select="handleSelectTable"
            />
          </div>
        </div>
      </div>

      <!-- Sidebar - Table Details -->
      <div class="lg:col-span-1">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h3 class="card-title text-base mb-4">
              {{ selectedTable ? 'Table Details' : 'Selected Table' }}
            </h3>
            
            <div v-if="!selectedTable" class="text-center py-8 text-base-content/60">
              <p class="text-sm">Click on a table to view details</p>
            </div>
            
            <div v-else class="space-y-4">
              <!-- Table Number -->
              <div>
                <div class="text-xl font-bold">{{ selectedTable.tableNumber }}</div>
                <TableStatusBadge :status="selectedTable.status" size="sm" class="mt-1" />
              </div>

              <!-- Details -->
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-base-content/60">Capacity:</span>
                  <span class="font-semibold">{{ selectedTable.capacity }} guests</span>
                </div>
                
                <div v-if="selectedTable.section" class="flex justify-between">
                  <span class="text-base-content/60">Section:</span>
                  <span>{{ selectedTable.section }}</span>
                </div>

                <div class="flex justify-between">
                  <span class="text-base-content/60">Shape:</span>
                  <span class="capitalize">{{ selectedTable.shape }}</span>
                </div>

                <div class="flex justify-between">
                  <span class="text-base-content/60">Position:</span>
                  <span class="font-mono text-xs">
                    ({{ Math.round(selectedTable.positionX) }}, {{ Math.round(selectedTable.positionY) }})
                  </span>
                </div>
              </div>

              <div class="divider my-2"></div>

              <!-- Status Change -->
              <div>
                <div class="text-xs text-base-content/60 mb-2">Change Status:</div>
                <div class="flex flex-col gap-1">
                  <button 
                    class="btn btn-sm btn-success btn-outline"
                    :class="{ 'btn-success': selectedTable.status === 'available' }"
                    @click="handleStatusChange('available')"
                  >
                    Available
                  </button>
                  <button 
                    class="btn btn-sm btn-error btn-outline"
                    :class="{ 'btn-error': selectedTable.status === 'occupied', 'opacity-50 cursor-not-allowed': true }"
                    @click="handleStatusChange('occupied')"
                    disabled
                    title="Set automatically when creating an order"
                  >
                    Occupied
                  </button>
                  <button 
                    class="btn btn-sm btn-warning btn-outline"
                    :class="{ 'btn-warning': selectedTable.status === 'reserved' }"
                    @click="openReserveModal"
                  >
                    Reserved
                  </button>
                  <button 
                    class="btn btn-sm btn-info btn-outline opacity-50 cursor-not-allowed"
                    :class="{ 'btn-info': selectedTable.status === 'cleaning' }"
                    disabled
                    title="Cleaning status is not available"
                  >
                    Cleaning
                  </button>
                </div>
                <div class="text-xs text-base-content/60 mt-2">
                  Note: <strong>Occupied</strong> status is set automatically when creating an order and cannot be changed manually here.
                </div>
              </div>

              <div class="divider my-2"></div>

              <!-- Actions -->
              <div class="flex flex-col gap-2">
                <button class="btn btn-sm btn-primary btn-outline" @click="handleEditTable">
                  <IconEdit class="w-4 h-4 mr-2" />
                  Edit Details
                </button>
                <button class="btn btn-sm btn-error btn-outline" @click="handleDeleteTable">
                  <IconTrash class="w-4 h-4 mr-2" />
                  Delete Table
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="card bg-base-100 shadow-xl mt-4">
          <div class="card-body">
            <h3 class="card-title text-base mb-3">Quick Stats</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-base-content/60">Total Tables:</span>
                <span class="font-semibold">{{ localTables.length }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-base-content/60">Available:</span>
                <span class="font-semibold text-success">
                  {{ localTables.filter(t => t.status === 'available').length }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-base-content/60">Occupied:</span>
                <span class="font-semibold text-error">
                  {{ localTables.filter(t => t.status === 'occupied').length }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-base-content/60">Reserved:</span>
                <span class="font-semibold text-warning">
                  {{ localTables.filter(t => t.status === 'reserved').length }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

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
      :loading="reserveLoading"
      @close="() => { showReserveModal = false }"
      @submit="handleReserveSubmit"
    />
    
    <!-- Shared Confirm Dialog -->
    <DialogConfirm ref="dialogConfirm" />
  </div>
</template>
