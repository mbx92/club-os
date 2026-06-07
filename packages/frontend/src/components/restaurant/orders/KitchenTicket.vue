<script setup>
import { computed } from 'vue'

const props = defineProps({
  order: {
    type: Object,
    required: true
  },
  settings: {
    type: Object,
    default: () => ({})
  }
})

// Format time
const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format date
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short'
  })
}

// Get order type label
const orderTypeLabel = computed(() => {
  switch (props.order.orderType) {
    case 'dine-in':
      return `TABLE ${props.order.table?.tableNumber || props.order.tableNumber || '-'}`
    case 'takeaway':
      return `QUEUE ${props.order.queueNumber || '-'}`
    case 'delivery':
      return 'DELIVERY'
    default:
      return props.order.orderType?.toUpperCase() || '-'
  }
})

// Get order display number
const displayNumber = computed(() => {
  if (props.order.orderType === 'dine-in') {
    return props.order.table?.tableNumber || props.order.tableNumber || '-'
  }
  return props.order.queueNumber || props.order.orderNumber || props.order.id?.slice(-4)
})
</script>

<template>
  <div class="kitchen-ticket bg-white text-black p-4 font-mono max-w-xs mx-auto">
    <!-- Header - Large and Bold -->
    <div class="text-center mb-4">
      <div class="text-4xl font-black tracking-wider mb-2">
        {{ displayNumber }}
      </div>
      <div class="text-xl font-bold uppercase bg-black text-white px-3 py-1 inline-block">
        {{ orderTypeLabel }}
      </div>
    </div>

    <!-- Order Info -->
    <div class="flex justify-between text-sm mb-3 border-b-2 border-dashed border-gray-400 pb-2">
      <div>
        <span class="font-bold">#{{ order.orderNumber || order.id?.slice(-6) }}</span>
      </div>
      <div class="text-right">
        <span>{{ formatDate(order.createdAt) }}</span>
        <span class="font-bold ml-2">{{ formatTime(order.createdAt) }}</span>
      </div>
    </div>

    <!-- Customer Info -->
    <div v-if="order.customerName || order.customer?.name" class="text-sm mb-3">
      <span class="font-bold">Customer:</span> {{ order.customerName || order.customer?.name }}
    </div>

    <!-- Items - Large and Clear -->
    <div class="space-y-4">
      <div
        v-for="(item, index) in order.items"
        :key="item.id"
        class="border-b border-gray-300 pb-3"
        :class="{ 'border-b-2 border-dashed': index === order.items.length - 1 }"
      >
        <div class="flex items-start gap-3">
          <!-- Quantity - Extra Large -->
          <div class="text-3xl font-black min-w-[50px] text-center">
            {{ item.quantity }}x
          </div>

          <!-- Item Details -->
          <div class="flex-1">
            <div class="text-xl font-bold uppercase leading-tight">
              {{ item.product?.name || item.name }}
            </div>

            <!-- Variants -->
            <div v-if="item.variants?.length" class="text-sm mt-1">
              <span
                v-for="(variant, vIdx) in item.variants"
                :key="vIdx"
                class="inline-block bg-gray-200 px-2 py-0.5 mr-1 mb-1 rounded"
              >
                {{ variant.name || variant }}
              </span>
            </div>

            <!-- Notes - Highlighted -->
            <div
              v-if="item.notes"
              class="mt-2 p-2 bg-yellow-100 border-2 border-yellow-400 text-sm font-bold"
            >
              ⚠️ {{ item.notes }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Order Notes -->
    <div
      v-if="order.notes"
      class="mt-4 p-3 bg-yellow-100 border-2 border-yellow-500"
    >
      <div class="text-sm font-bold uppercase mb-1">Order Notes:</div>
      <div class="text-lg font-medium">{{ order.notes }}</div>
    </div>

    <!-- Footer -->
    <div class="mt-4 pt-3 border-t-2 border-dashed border-gray-400">
      <div class="flex justify-between text-sm">
        <span>Total Items: <strong>{{ order.items?.reduce((sum, i) => sum + i.quantity, 0) }}</strong></span>
        <span>Printed: {{ formatTime(new Date()) }}</span>
      </div>
    </div>

    <!-- Cut Line Indicator -->
    <div class="mt-4 text-center text-xs text-gray-400">
      ✂ - - - - - - - - - - - - - - - - - - - - - ✂
    </div>
  </div>
</template>

<style scoped>
.kitchen-ticket {
  width: 80mm;
  min-height: auto;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

@media print {
  .kitchen-ticket {
    width: 80mm;
    margin: 0;
    padding: 3mm;
    box-shadow: none;
  }
}

@media screen {
  .kitchen-ticket {
    max-width: 320px;
  }
}
</style>
