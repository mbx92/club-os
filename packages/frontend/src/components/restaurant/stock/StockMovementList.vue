<script setup>
import { computed } from 'vue'
import { IconPackage, IconArrowUp, IconArrowDown, IconAdjustments, IconTransfer, IconMapPin } from '@tabler/icons-vue'

const props = defineProps({
  movements: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['viewDetail'])

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getMovementTypeIcon = (type) => {
  const icons = {
    in: IconArrowUp,
    out: IconArrowDown,
    adjustment: IconAdjustments,
    transfer: IconTransfer
  }
  return icons[type] || IconPackage
}

const getMovementTypeClass = (type) => {
  const classes = {
    in: 'badge-success',
    out: 'badge-error',
    adjustment: 'badge-warning',
    transfer: 'badge-info'
  }
  return classes[type] || 'badge-ghost'
}

const getMovementTypeLabel = (type) => {
  const labels = {
    in: 'Stock In',
    out: 'Stock Out',
    adjustment: 'Adjustment',
    transfer: 'Transfer'
  }
  return labels[type] || type
}

const getQuantityColor = (type) => {
  if (type === 'in') return 'text-success'
  if (type === 'out') return 'text-error'
  return 'text-warning'
}
</script>

<template>
  <div class="space-y-3">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <div class="loading loading-spinner loading-lg"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="movements.length === 0" class="text-center py-8 text-base-content/60">
      <IconPackage class="w-12 h-12 mx-auto mb-2 opacity-50" />
      <p>No stock movements recorded</p>
    </div>

    <!-- Movement List -->
    <div v-else class="space-y-2">
      <div 
        v-for="movement in movements" 
        :key="movement.id"
        class="card bg-base-100 shadow hover:shadow-lg transition-shadow cursor-pointer"
        @click="$emit('viewDetail', movement)"
      >
        <div class="card-body p-4">
          <div class="flex items-start justify-between gap-3">
            <!-- Icon & Type -->
            <div class="flex items-start gap-3 flex-1">
              <div class="flex-shrink-0">
                <component 
                  :is="getMovementTypeIcon(movement.movementType)" 
                  class="w-8 h-8"
                  :class="movement.movementType === 'in' ? 'text-success' : movement.movementType === 'out' ? 'text-error' : 'text-warning'"
                />
              </div>
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-semibold truncate">{{ movement.product?.name || 'Unknown Product' }}</span>
                  <div :class="['badge badge-sm', getMovementTypeClass(movement.movementType)]">
                    {{ getMovementTypeLabel(movement.movementType) }}
                  </div>
                </div>
                
                <div class="text-sm text-base-content/60 mb-1">
                  {{ movement.reason || 'No reason provided' }}
                </div>
                
                <div class="text-xs text-base-content/40">
                  {{ formatDate(movement.createdAt) }}
                </div>

                <div v-if="movement.notes" class="text-xs text-base-content/60 mt-1 italic">
                  "{{ movement.notes }}"
                </div>
              </div>
            </div>

            <!-- Quantity -->
            <div class="text-right flex-shrink-0">
              <div class="text-xl font-bold" :class="getQuantityColor(movement.type)">
                {{ movement.type === 'in' ? '+' : movement.type === 'out' ? '-' : '±' }}{{ movement.quantity }}
              </div>
              <div class="text-xs text-base-content/60">{{ movement.product?.unit || 'pcs' }}</div>
            </div>
          </div>

          <!-- Location Info -->
          <div v-if="movement.location" class="text-xs text-base-content/60 mt-2 pt-2 border-t border-base-300 flex items-center gap-1">
            <IconMapPin class="w-3 h-3" />
            <span>{{ movement.location.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
