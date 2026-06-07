<script setup>
import { computed } from 'vue'
import { 
  IconCash, 
  IconReceipt, 
  IconChartBar, 
  IconShoppingCart,
  IconTrendingUp,
  IconTrendingDown,
  IconUsers,
  IconClock
} from '@tabler/icons-vue'

const props = defineProps({
  summary: {
    type: Object,
    default: () => ({})
  },
  previousSummary: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// Format currency
const formatCurrency = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value || 0)
}

// Calculate growth
const calculateGrowth = (current, previous) => {
  if (!previous || previous === 0) return null
  return ((current - previous) / previous * 100).toFixed(1)
}

// Cards configuration
const cards = computed(() => [
  {
    title: 'Total Revenue',
    value: formatCurrency(props.summary?.totalRevenue),
    rawValue: props.summary?.totalRevenue || 0,
    previousValue: props.previousSummary?.totalRevenue || 0,
    icon: IconCash,
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  },
  {
    title: 'Total Orders',
    value: props.summary?.totalOrders || 0,
    rawValue: props.summary?.totalOrders || 0,
    previousValue: props.previousSummary?.totalOrders || 0,
    icon: IconReceipt,
    color: 'text-success',
    bgColor: 'bg-success/10'
  },
  {
    title: 'Avg Order Value',
    value: formatCurrency(props.summary?.avgOrderValue),
    rawValue: props.summary?.avgOrderValue || 0,
    previousValue: props.previousSummary?.avgOrderValue || 0,
    icon: IconChartBar,
    color: 'text-info',
    bgColor: 'bg-info/10'
  },
  {
    title: 'Items Sold',
    value: props.summary?.itemsSold || 0,
    rawValue: props.summary?.itemsSold || 0,
    previousValue: props.previousSummary?.itemsSold || 0,
    icon: IconShoppingCart,
    color: 'text-warning',
    bgColor: 'bg-warning/10'
  },
  {
    title: 'Customers Served',
    value: props.summary?.customersServed || props.summary?.totalOrders || 0,
    rawValue: props.summary?.customersServed || props.summary?.totalOrders || 0,
    previousValue: props.previousSummary?.customersServed || props.previousSummary?.totalOrders || 0,
    icon: IconUsers,
    color: 'text-secondary',
    bgColor: 'bg-secondary/10'
  },
  {
    title: 'Peak Hour',
    value: props.summary?.peakHour || '-',
    rawValue: null,
    previousValue: null,
    icon: IconClock,
    color: 'text-accent',
    bgColor: 'bg-accent/10',
    noGrowth: true
  }
])
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div 
      v-for="card in cards" 
      :key="card.title"
      class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
    >
      <div class="card-body p-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm text-base-content/60">{{ card.title }}</p>
            <div class="mt-1">
              <span v-if="loading" class="loading loading-dots loading-sm"></span>
              <span v-else class="text-2xl font-bold">{{ card.value }}</span>
            </div>
          </div>
          <div :class="['p-3 rounded-xl', card.bgColor]">
            <component :is="card.icon" :class="['w-6 h-6', card.color]" />
          </div>
        </div>
        
        <!-- Growth Indicator -->
        <div v-if="!card.noGrowth && !loading" class="mt-2 flex items-center gap-1">
          <template v-if="calculateGrowth(card.rawValue, card.previousValue)">
            <template v-if="parseFloat(calculateGrowth(card.rawValue, card.previousValue)) > 0">
              <IconTrendingUp class="w-4 h-4 text-success" />
              <span class="text-xs text-success">
                +{{ calculateGrowth(card.rawValue, card.previousValue) }}%
              </span>
              <span class="text-xs text-base-content/40">vs yesterday</span>
            </template>
            <template v-else-if="parseFloat(calculateGrowth(card.rawValue, card.previousValue)) < 0">
              <IconTrendingDown class="w-4 h-4 text-error" />
              <span class="text-xs text-error">
                {{ calculateGrowth(card.rawValue, card.previousValue) }}%
              </span>
              <span class="text-xs text-base-content/40">vs yesterday</span>
            </template>
            <template v-else>
              <span class="text-xs text-base-content/40">Same as yesterday</span>
            </template>
          </template>
          <span v-else class="text-xs text-base-content/40">No comparison data</span>
        </div>
      </div>
    </div>
  </div>
</template>
