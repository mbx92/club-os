<script setup>
import { computed } from 'vue'
import { IconSearch, IconPlus, IconMapPin, IconEdit, IconTrash, IconPhone } from '@tabler/icons-vue'

const props = defineProps({
  locations: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  searchQuery: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'update:searchQuery',
  'create',
  'edit',
  'delete',
  'viewDetail'
])
</script>

<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <!-- Search -->
      <div class="flex-1 w-full sm:max-w-md">
        <label class="input input-bordered flex items-center gap-2">
          <IconSearch class="w-5 h-5 opacity-70" />
          <input 
            type="text" 
            placeholder="Search locations..." 
            class="grow"
            :value="searchQuery"
            @input="$emit('update:searchQuery', $event.target.value)"
          />
        </label>
      </div>

      <!-- Create Button -->
      <button class="btn btn-primary btn-sm" @click="$emit('create')">
        <IconPlus class="w-4 h-4 mr-2" />
        Add Location
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="loading loading-spinner loading-lg"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="locations.length === 0" class="text-center py-12">
      <IconMapPin class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
      <h3 class="text-lg font-semibold mb-2">No locations found</h3>
      <p class="text-base-content/60 mb-4">
        {{ searchQuery ? 'Try adjusting your search' : 'Get started by adding your first location' }}
      </p>
      <button v-if="!searchQuery" class="btn btn-primary" @click="$emit('create')">
        <IconPlus class="w-5 h-5 mr-2" />
        Add Your First Location
      </button>
    </div>

    <!-- Locations Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div 
        v-for="location in locations" 
        :key="location.id"
        class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow"
      >
        <div class="card-body">
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2">
              <IconMapPin class="w-5 h-5 text-primary" />
              <h3 class="card-title text-base">{{ location.name }}</h3>
            </div>
            <div :class="['badge badge-sm', location.isActive ? 'badge-success' : 'badge-ghost']">
              {{ location.isActive ? 'Active' : 'Inactive' }}
            </div>
          </div>

          <p v-if="location.address" class="text-sm text-base-content/60 line-clamp-2 mb-2">
            {{ location.address }}
          </p>

          <div v-if="location.phone" class="text-sm text-base-content/60 mb-2 flex items-center gap-1">
            <IconPhone class="w-3 h-3" />
            <span>{{ location.phone }}</span>
          </div>

          <div class="flex items-center gap-2 text-sm text-base-content/60 mb-4">
            <span v-if="location.type" class="badge badge-outline badge-sm">{{ location.type }}</span>
            <span v-if="location.city">{{ location.city }}</span>
          </div>

          <div class="card-actions justify-end gap-2">
            <button 
              class="btn btn-sm btn-primary flex-1" 
              @click="$emit('viewDetail', location.id)"
            >
              View
            </button>
            <button 
              class="btn btn-sm btn-ghost" 
              @click.stop="$emit('edit', location)"
            >
              <IconEdit class="w-4 h-4" />
            </button>
            <button 
              class="btn btn-sm btn-ghost text-error" 
              @click.stop="$emit('delete', location.id)"
            >
              <IconTrash class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
