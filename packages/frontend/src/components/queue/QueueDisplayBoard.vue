<script setup>
import { computed } from 'vue'
import QueueNumberCard from './QueueNumberCard.vue'
import { IconClock, IconCheck, IconHistory } from '@tabler/icons-vue'

const props = defineProps({
  preparingOrders: {
    type: Array,
    default: () => []
  },
  readyOrders: {
    type: Array,
    default: () => []
  },
  lastCalled: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  tenantName: {
    type: String,
    default: ''
  },
  locationName: {
    type: String,
    default: ''
  }
})

const currentTime = computed(() => {
  return new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  })
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
    <!-- Header -->
    <div class="bg-black/20 backdrop-blur-sm py-4 px-6">
      <div class="container mx-auto flex items-center justify-between">
        <div>
          <h1 v-if="tenantName" class="text-3xl font-bold text-white">
            {{ tenantName }}
          </h1>
          <p v-if="locationName" class="text-white/60">
            {{ locationName }}
          </p>
        </div>
        <div class="text-right">
          <div class="text-4xl font-mono text-white font-bold">
            {{ currentTime }}
          </div>
          <div class="text-white/60 text-sm">
            Queue Display
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-32">
      <span class="loading loading-spinner loading-lg text-white"></span>
    </div>

    <!-- Main Content -->
    <div v-else class="container mx-auto px-6 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Preparing Section -->
        <div class="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
          <div class="flex items-center gap-3 mb-6">
            <div class="p-3 bg-warning/20 rounded-xl">
              <IconClock class="w-8 h-8 text-warning" />
            </div>
            <div>
              <h2 class="text-3xl font-bold text-warning">Preparing</h2>
              <p class="text-white/60">Please wait for your order</p>
            </div>
            <div class="ml-auto">
              <span class="badge badge-warning badge-lg text-xl font-bold">
                {{ preparingOrders.length }}
              </span>
            </div>
          </div>

          <div
            v-if="preparingOrders.length > 0"
            class="grid grid-cols-2 sm:grid-cols-3 gap-4"
          >
            <QueueNumberCard
              v-for="order in preparingOrders"
              :key="order.id"
              :queue-number="order.queueNumber"
              status="preparing"
              :order-type="order.orderType"
              size="lg"
            />
          </div>

          <div
            v-else
            class="text-center py-16 text-white/40"
          >
            <IconClock class="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p class="text-xl">No orders in preparation</p>
          </div>
        </div>

        <!-- Ready Section -->
        <div class="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-success/30 relative overflow-hidden">
          <!-- Animated background for ready section -->
          <div class="absolute inset-0 bg-success/5 animate-pulse"></div>

          <div class="relative z-10">
            <div class="flex items-center gap-3 mb-6">
              <div class="p-3 bg-success/20 rounded-xl animate-bounce">
                <IconCheck class="w-8 h-8 text-success" />
              </div>
              <div>
                <h2 class="text-3xl font-bold text-success">Ready for Pickup</h2>
                <p class="text-white/60">Please collect your order</p>
              </div>
              <div class="ml-auto">
                <span class="badge badge-success badge-lg text-xl font-bold">
                  {{ readyOrders.length }}
                </span>
              </div>
            </div>

            <div
              v-if="readyOrders.length > 0"
              class="grid grid-cols-2 sm:grid-cols-3 gap-4"
            >
              <QueueNumberCard
                v-for="order in readyOrders"
                :key="order.id"
                :queue-number="order.queueNumber"
                status="ready"
                :order-type="order.orderType"
                size="lg"
                animated
              />
            </div>

            <div
              v-else
              class="text-center py-16 text-white/40"
            >
              <IconCheck class="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p class="text-xl">No orders ready</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Last Called Section -->
      <div
        v-if="lastCalled.length > 0"
        class="mt-8 bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
      >
        <div class="flex items-center gap-3 mb-4">
          <IconHistory class="w-6 h-6 text-white/60" />
          <h3 class="text-xl font-semibold text-white/80">Recently Called</h3>
        </div>
        <div class="flex flex-wrap gap-3 justify-center">
          <span
            v-for="(queueNum, index) in lastCalled"
            :key="index"
            class="px-6 py-3 bg-white/10 rounded-xl text-white/60 font-mono text-xl"
          >
            {{ queueNum }}
          </span>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-8 text-center text-white/40 text-sm">
        <p>Auto-refreshing every 5 seconds</p>
      </div>
    </div>
  </div>
</template>
