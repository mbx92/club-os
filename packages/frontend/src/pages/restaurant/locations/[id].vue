<route lang="yaml">
meta:
  title: Location Detail
  layout: default
</route>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'
import { useNotification } from '@/composables/core/useNotification'
import LocationFormModal from '@/components/restaurant/locations/LocationFormModal.vue'
import { 
  IconArrowLeft, 
  IconEdit, 
  IconTrash,
  IconMapPin,
  IconPhone,
  IconMail,
  IconBuilding
} from '@tabler/icons-vue'

const route = useRoute()
const router = useRouter()
const { showSuccess, showError } = useNotification()

const { 
  getLocationById, 
  updateLocation,
  deleteLocation,
  loading 
} = useRestaurantLocations()

const location = ref(null)
const showEditModal = ref(false)

const getTypeLabel = (type) => {
  const labels = {
    branch: 'Branch/Outlet',
    warehouse: 'Warehouse',
    kitchen: 'Central Kitchen',
    office: 'Office',
    main: 'Main Location'
  }
  return labels[type] || type
}

const loadLocation = async () => {
  const locationId = route.params.id
  const result = await getLocationById(locationId)
  if (result) {
    // Support API returning object under `data` or direct object
    location.value = result.data ? result.data : result
  } else {
    showError('Location not found')
    router.push('/restaurant/locations')
  }
}

const handleEdit = () => {
  showEditModal.value = true
}

const handleEditSubmit = async (locationData) => {
  try {
    await updateLocation(location.value.id, locationData)
    showSuccess('Location updated successfully!')
    showEditModal.value = false
    await loadLocation()
  } catch (error) {
    showError('Failed to update location')
  }
}

const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) return

  try {
    await deleteLocation(location.value.id)
    showSuccess('Location deleted successfully!')
    router.push('/restaurant/locations')
  } catch (error) {
    showError('Failed to delete location')
  }
}

onMounted(() => {
  loadLocation()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="loading loading-spinner loading-lg"></div>
    </div>

    <div v-else-if="location">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <button class="btn btn-ghost btn-sm" @click="router.push('/restaurant/locations')">
          <IconArrowLeft class="w-5 h-5" />
        </button>
        <div class="flex-1">
          <h1 class="text-3xl font-bold">{{ location.name }}</h1>
          <div class="flex items-center gap-2 mt-1">
            <div :class="['badge', location.isActive ? 'badge-success' : 'badge-ghost']">
              {{ location.isActive ? 'Active' : 'Inactive' }}
            </div>
            <div class="badge badge-outline">{{ getTypeLabel(location.locationType) }}</div>
            <div v-if="location.code" class="text-sm text-base-content/60 ml-2">Code: <span class="font-mono">{{ location.code }}</span></div>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-primary btn-sm" @click="handleEdit">
            <IconEdit class="w-4 h-4 mr-2" />
            Edit
          </button>
          <button class="btn btn-error btn-sm btn-outline" @click="handleDelete">
            <IconTrash class="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      <!-- Location Details -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Info -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Address Card -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <div class="flex items-center gap-2 mb-4">
                <IconMapPin class="w-5 h-5 text-primary" />
                <h3 class="card-title text-base">Address</h3>
              </div>
              
                  <div class="space-y-2">
                    <p class="text-base-content/80">{{ location.address || 'No address provided' }}</p>
                    <div class="flex flex-wrap gap-2 text-sm text-base-content/60">
                      <span v-if="location.city">{{ location.city }}</span>
                      <span v-if="location.province">• {{ location.province }}</span>
                      <span v-if="location.postalCode">• {{ location.postalCode }}</span>
                    </div>
                    <p v-if="location.country" class="text-sm text-base-content/60">
                      {{ location.country }}
                    </p>
                    <div v-if="location.latitude || location.longitude" class="text-xs text-base-content/60 mt-2">
                      Coordinates: <span class="font-mono">{{ location.latitude || '-' }}, {{ location.longitude || '-' }}</span>
                    </div>
                  </div>
            </div>
          </div>

          <!-- Notes Card -->
          <div v-if="location.notes" class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h3 class="card-title text-base mb-2">Notes</h3>
              <p class="text-base-content/70">{{ location.notes }}</p>
            </div>
          </div>

          <!-- Associated Products -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h3 class="card-title text-base mb-4">Products at This Location</h3>
              <div v-if="location.products && location.products.length > 0" class="space-y-2">
                <div v-for="prod in location.products" :key="prod.id" class="flex items-center justify-between p-2 rounded hover:bg-base-200">
                  <div>
                    <div class="font-semibold">{{ prod.name }}</div>
                    <div class="text-xs text-base-content/60">SKU: {{ prod.sku }}</div>
                  </div>
                  <div class="text-right">
                    <div :class="['badge badge-sm', prod.isActive ? 'badge-success' : 'badge-ghost']">
                      {{ prod.isActive ? 'Active' : 'Inactive' }}
                    </div>
                    <div class="text-xs text-base-content/60 mt-1">Stock: {{ prod.stockQuantity ?? '-' }}</div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-8 text-base-content/60">
                No products at this location
              </div>
            </div>
          </div>

          <!-- Associated Tables (Placeholder) -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <div class="flex items-center justify-between mb-4">
                <h3 class="card-title text-base">Tables at This Location</h3>
                <router-link 
                  :to="`/restaurant/tables?location=${location.id}`"
                  class="btn btn-sm btn-ghost"
                >
                  View All →
                </router-link>
              </div>
              <div v-if="location.tables.length > 0">
                <div class="overflow-x-auto">
                  <table class="table table-zebra w-full">
                    <thead>
                      <tr>
                        <th>Table</th>
                        <th>Capacity</th>
                        <th>Status</th>
                        <th>Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="t in location.tables" :key="t.id">
                        <td class="font-semibold">{{ t.tableNumber }}</td>
                        <td>{{ t.capacity }}</td>
                        <td>
                          <div :class="['badge badge-sm', t.status === 'available' ? 'badge-success' : t.status === 'occupied' ? 'badge-error' : 'badge-warning']">
                            {{ t.status }}
                          </div>
                        </td>
                        <td>
                          <div :class="['badge badge-sm', t.isActive ? 'badge-success' : 'badge-ghost']">
                            {{ t.isActive ? 'Yes' : 'No' }}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div v-else class="text-center py-8 text-base-content/60">
                No tables at this location
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Contact Info Card -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h3 class="card-title text-base mb-4">Contact Information</h3>
              
              <div class="space-y-3">
                <div v-if="location.phone" class="flex items-start gap-3">
                  <IconPhone class="w-5 h-5 text-base-content/60 mt-0.5" />
                  <div>
                    <div class="text-xs text-base-content/60 mb-1">Phone</div>
                    <a :href="`tel:${location.phone}`" class="link link-hover">
                      {{ location.phone }}
                    </a>
                  </div>
                </div>

                <div v-if="location.email" class="flex items-start gap-3">
                  <IconMail class="w-5 h-5 text-base-content/60 mt-0.5" />
                  <div>
                    <div class="text-xs text-base-content/60 mb-1">Email</div>
                    <a :href="`mailto:${location.email}`" class="link link-hover">
                      {{ location.email }}
                    </a>
                  </div>
                </div>

                <div v-if="!location.phone && !location.email" class="text-center text-base-content/60 py-4">
                  No contact information provided
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Stats Card -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h3 class="card-title text-base mb-4">Quick Stats</h3>
              
                <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-base-content/60">Products</span>
                  <span class="font-semibold">{{ location.products ? location.products.length : '-' }}</span>
                </div>
                <div v-if="location.locationType === 'branch'" class="flex items-center justify-between">
                  <span class="text-base-content/60">Tables</span>
                  <span class="font-semibold">{{ location.tables ? location.tables.length : '-' }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-base-content/60">Stock Value</span>
                  <span class="font-semibold">-</span>
                </div>
              </div>

              <div class="text-xs text-base-content/60 mt-4">
                Stats will be available once integrated with products and tables
              </div>
            </div>
          </div>

          <!-- Location Type Card -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <div class="flex items-center gap-2 mb-2">
                <IconBuilding class="w-5 h-5 text-info" />
                <h3 class="card-title text-base">Location Type</h3>
              </div>
              <p class="text-base-content/70">{{ getTypeLabel(location.type) }}</p>
              
              <div class="mt-4 text-sm text-base-content/60">
                <p v-if="location.locationType === 'branch'">
                  This is a customer-facing branch with tables and POS
                </p>
                <p v-else-if="location.locationType === 'warehouse'">
                  This is a storage facility for inventory management
                </p>
                <p v-else-if="location.locationType === 'kitchen'">
                  This is a central kitchen for food preparation
                </p>
                <p v-else>
                  This is an office or administrative location
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <LocationFormModal
      v-if="location"
      v-model="showEditModal"
      :location="location"
      :loading="loading"
      @submit="handleEditSubmit"
    />
  </div>
</template>
