<script setup>
import { computed } from 'vue'
import { IconArmchair, IconMapPin } from '@tabler/icons-vue'

const props = defineProps({
  table: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['updateStatus', 'edit'])

const statuses = [
  { value: 'available', label: 'Available', color: 'success' },
  { value: 'occupied', label: 'Occupied', color: 'error' },
  { value: 'reserved', label: 'Reserved', color: 'warning' },
  { value: 'cleaning', label: 'Cleaning', color: 'info' }
]

const getStatusBadgeClass = computed(() => {
  const statusObj = statuses.find(s => s.value === props.table.status)
  return statusObj ? `badge-${statusObj.color}` : 'badge-ghost'
})

const getStatusLabel = computed(() => {
  const statusObj = statuses.find(s => s.value === props.table.status)
  return statusObj ? statusObj.label : props.table.status
})
</script>

<template>
  <div 
    class="card bg-base-100 shadow-xl hover:shadow-2xl transition-all cursor-pointer"
    @click="$emit('edit', table)"
  >
    <div class="card-body p-4">
      <div class="flex items-start justify-between mb-2">
        <div class="flex items-center gap-2">
          <IconArmchair class="w-6 h-6 text-primary" />
          <h3 class="card-title text-lg">{{ table.tableNumber }}</h3>
        </div>
        <div :class="['badge', getStatusBadgeClass]">
          {{ getStatusLabel }}
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-base-content/60">Capacity:</span>
          <span class="font-semibold">{{ table.capacity }} guests</span>
        </div>

        <div v-if="table.section" class="text-sm text-base-content/60">
          Section: {{ table.section }}
        </div>

        <div v-if="table.location" class="text-xs text-base-content/60 flex items-center gap-1">
          <IconMapPin class="w-3 h-3" />
          <span>{{ table.location.name }}</span>
        </div>
      </div>

      <!-- Quick Status Buttons -->
      <div class="mt-3 pt-3 border-t border-base-300">
        <div class="flex flex-wrap gap-1">
          <button
            v-for="status in statuses"
            :key="status.value"
            class="btn btn-xs"
            :class="table.status === status.value ? `btn-${status.color}` : 'btn-outline'"
            @click.stop="$emit('updateStatus', table.id, status.value)"
          >
            {{ status.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
