<route lang="yaml">
meta:
  title: Locations
  layout: default
</route>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'
import { useNotification } from '@/composables/core/useNotification'
import LocationListView from '@/components/restaurant/locations/LocationListView.vue'
import LocationFormModal from '@/components/restaurant/locations/LocationFormModal.vue'

const router = useRouter()
const { showSuccess, showError } = useNotification()

const { 
  locations, 
  fetchLocations, 
  createLocation, 
  updateLocation,
  deleteLocation,
  loading 
} = useRestaurantLocations()

const searchQuery = ref('')
const showCreateModal = ref(false)
const showEditModal = ref(false)
const selectedLocation = ref(null)

let searchTimeout = null
const debouncedSearch = (value) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadLocations()
  }, 500)
}

watch(searchQuery, debouncedSearch)

const loadLocations = async () => {
  const filters = {}
  if (searchQuery.value) {
    filters.search = searchQuery.value
  }
  await fetchLocations(filters)
}

const getLocationsArray = () => {
  if (!locations.value) return []
  if (Array.isArray(locations.value)) return locations.value
  if (locations.value.data && Array.isArray(locations.value.data)) return locations.value.data
  return []
}

const handleCreate = () => {
  selectedLocation.value = null
  showCreateModal.value = true
}

const handleEdit = (location) => {
  selectedLocation.value = location
  showEditModal.value = true
}

const handleCreateSubmit = async (locationData) => {
  try {
    const result = await createLocation(locationData)
    showSuccess('Location created successfully!')
    showCreateModal.value = false
    loadLocations()
    
    if (result && result.id) {
      router.push(`/restaurant/locations/${result.id}`)
    }
  } catch (error) {
    showError('Failed to create location')
  }
}

const handleEditSubmit = async (locationData) => {
  try {
    await updateLocation(selectedLocation.value.id, locationData)
    showSuccess('Location updated successfully!')
    showEditModal.value = false
    selectedLocation.value = null
    loadLocations()
  } catch (error) {
    showError('Failed to update location')
  }
}

const handleDelete = async (locationId) => {
  if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) return

  try {
    await deleteLocation(locationId)
    showSuccess('Location deleted successfully!')
    loadLocations()
  } catch (error) {
    showError('Failed to delete location')
  }
}

const handleViewDetail = (locationId) => {
  router.push(`/restaurant/locations/${locationId}`)
}

onMounted(() => {
  loadLocations()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold">Locations</h1>
        <p class="text-base-content/60 mt-1">Manage your restaurant branches and warehouses</p>
      </div>
    </div>

    <!-- Location List -->
    <LocationListView
      :locations="getLocationsArray()"
      :loading="loading"
      :search-query="searchQuery"
      @update:search-query="searchQuery = $event"
      @create="handleCreate"
      @edit="handleEdit"
      @delete="handleDelete"
      @view-detail="handleViewDetail"
    />

    <!-- Create Modal -->
    <LocationFormModal
      v-model="showCreateModal"
      :loading="loading"
      @submit="handleCreateSubmit"
    />

    <!-- Edit Modal -->
    <LocationFormModal
      v-if="selectedLocation"
      v-model="showEditModal"
      :location="selectedLocation"
      :loading="loading"
      @submit="handleEditSubmit"
    />
  </div>
</template>
