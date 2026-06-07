<script setup>
import { computed } from 'vue'

const props = defineProps({
  queueNumber: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'preparing',
    validator: (val) => ['paid', 'preparing', 'ready', 'called', 'completed'].includes(val)
  },
  orderType: {
    type: String,
    default: 'takeaway'
  },
  size: {
    type: String,
    default: 'lg',
    validator: (val) => ['sm', 'md', 'lg', 'xl'].includes(val)
  },
  animated: {
    type: Boolean,
    default: false
  },
  showStatus: {
    type: Boolean,
    default: true
  }
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'text-2xl p-3 min-w-[80px]'
    case 'md':
      return 'text-4xl p-4 min-w-[100px]'
    case 'lg':
      return 'text-6xl p-6 min-w-[140px]'
    case 'xl':
      return 'text-8xl p-8 min-w-[200px]'
    default:
      return 'text-6xl p-6 min-w-[140px]'
  }
})

const statusConfig = computed(() => {
  switch (props.status) {
    case 'paid':
      return {
        bgClass: 'bg-info/10 border-info',
        textClass: 'text-info',
        label: 'Paid',
        icon: '💳'
      }
    case 'preparing':
      return {
        bgClass: 'bg-warning/10 border-warning',
        textClass: 'text-warning',
        label: 'Preparing',
        icon: '⏳'
      }
    case 'ready':
      return {
        bgClass: 'bg-success/10 border-success',
        textClass: 'text-success',
        label: 'Ready',
        icon: '✅'
      }
    case 'called':
      return {
        bgClass: 'bg-primary/10 border-primary',
        textClass: 'text-primary',
        label: 'Called',
        icon: '📢'
      }
    case 'completed':
      return {
        bgClass: 'bg-base-200 border-base-300',
        textClass: 'text-base-content/50',
        label: 'Completed',
        icon: '✓'
      }
    default:
      return {
        bgClass: 'bg-base-200 border-base-300',
        textClass: 'text-base-content',
        label: 'Unknown',
        icon: '?'
      }
  }
})

const animationClass = computed(() => {
  if (!props.animated) return ''
  if (props.status === 'ready') return 'animate-pulse'
  if (props.status === 'called') return 'animate-bounce'
  return ''
})
</script>

<template>
  <div
    class="rounded-2xl border-2 text-center font-bold shadow-lg transition-all duration-300"
    :class="[
      sizeClasses,
      statusConfig.bgClass,
      animationClass
    ]"
  >
    <!-- Queue Number -->
    <div :class="statusConfig.textClass" class="font-mono tracking-wider">
      {{ queueNumber }}
    </div>

    <!-- Status Badge -->
    <div
      v-if="showStatus"
      class="mt-2 text-sm font-normal opacity-80"
      :class="statusConfig.textClass"
    >
      <span class="mr-1">{{ statusConfig.icon }}</span>
      {{ statusConfig.label }}
    </div>

    <!-- Order Type Badge -->
    <div
      v-if="orderType && size !== 'sm'"
      class="mt-1 text-xs font-normal opacity-60 uppercase tracking-wide"
    >
      {{ orderType }}
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse-scale {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

.animate-pulse-scale {
  animation: pulse-scale 2s ease-in-out infinite;
}
</style>
