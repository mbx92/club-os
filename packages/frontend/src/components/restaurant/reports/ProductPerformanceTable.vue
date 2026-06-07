<script setup>
import { computed } from 'vue'

const props = defineProps({
  products: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  sortBy: {
    type: String,
    default: 'quantity'
  }
})

const emit = defineEmits(['sort'])

// Client-side sort — same data, different order → TransitionGroup does true FLIP
const sortedProducts = computed(() => {
  const list = [...props.products]
  if (props.sortBy === 'revenue') {
    list.sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
  } else {
    list.sort((a, b) => (b.quantity || 0) - (a.quantity || 0))
  }
  return list
})

// Max value for the performance bar (from sorted list)
const maxValue = computed(() => {
  if (!sortedProducts.value.length) return 0
  return Math.max(...sortedProducts.value.map(p =>
    props.sortBy === 'revenue' ? (p.revenue || 0) : (p.quantity || 0)
  ))
})

const getBarWidth = (product) => {
  const value = props.sortBy === 'revenue' ? product.revenue : product.quantity
  if (!maxValue.value) return 0
  return (value / maxValue.value) * 100
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value || 0)
}

const formatNumber = (n) => new Intl.NumberFormat('id-ID').format(n || 0)
</script>

<template>
  <div>
    <!-- Sort Toggle -->
    <div class="flex items-center gap-2 mb-4">
      <span class="text-sm text-base-content/60">Sort by:</span>
      <div class="join">
        <button
          class="join-item btn btn-xs"
          :class="sortBy === 'quantity' ? 'btn-primary' : 'btn-ghost'"
          @click="$emit('sort', 'quantity')"
        >Quantity</button>
        <button
          class="join-item btn btn-xs"
          :class="sortBy === 'revenue' ? 'btn-primary' : 'btn-ghost'"
          @click="$emit('sort', 'revenue')"
        >Revenue</button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 8" :key="i" class="skeleton h-10 w-full"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!products.length" class="text-center py-12 text-base-content/60">
      <p>No product data available</p>
    </div>

    <!-- List with FLIP animation (same pattern as /finances/analytics) -->
    <TransitionGroup v-else tag="div" name="rank" class="relative">
      <div
        v-for="(product, index) in sortedProducts"
        :key="product.id"
        class="flex items-center justify-between py-2.5 text-sm border-b border-base-200 last:border-0"
      >
        <!-- Left: rank + name + category -->
        <div class="flex items-center gap-2 min-w-0">
          <span class="font-bold text-base-content/30 w-5 text-right shrink-0 text-xs">{{ index + 1 }}</span>
          <div class="min-w-0">
            <p class="font-semibold truncate">{{ product.name }}</p>
            <p v-if="product.categoryName" class="text-xs text-base-content/40">{{ product.categoryName }}</p>
          </div>
        </div>

        <!-- Right: revenue + quantity + bar -->
        <div class="text-right shrink-0 ml-4">
          <p class="font-bold text-sm" :class="sortBy === 'revenue' ? 'text-success' : 'text-base-content/50'">
            {{ formatCurrency(product.revenue) }}
          </p>
          <p class="text-xs" :class="sortBy === 'quantity' ? 'text-primary font-semibold' : 'text-base-content/40'">
            {{ formatNumber(product.quantity) }} pcs
          </p>
          <div class="w-28 bg-base-200 rounded-full h-1.5 mt-1 ml-auto">
            <div
              class="h-1.5 rounded-full transition-all duration-500"
              :class="sortBy === 'revenue' ? 'bg-success' : 'bg-primary'"
              :style="{ width: `${getBarWidth(product)}%` }"
            />
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* Same FLIP animation as /finances/analytics */
.rank-move {
  transition: transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.rank-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.rank-leave-active {
  transition: opacity 0.2s ease;
  position: absolute;
  width: 100%;
}
.rank-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.rank-leave-to {
  opacity: 0;
}
</style>
