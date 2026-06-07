<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { IconClock, IconAlertTriangle } from '@tabler/icons-vue'

const props = defineProps({
  startTime: {
    type: [Date, String],
    required: true
  },
  warningMinutes: {
    type: Number,
    default: 15
  },
  criticalMinutes: {
    type: Number,
    default: 20
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  }
})

const elapsedSeconds = ref(0)
const timerInterval = ref(null)

const startDate = computed(() => {
  return props.startTime instanceof Date
    ? props.startTime
    : new Date(props.startTime)
})

const formattedTime = computed(() => {
  const mins = Math.floor(elapsedSeconds.value / 60)
  const secs = elapsedSeconds.value % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

const urgencyLevel = computed(() => {
  const mins = Math.floor(elapsedSeconds.value / 60)
  if (mins >= props.criticalMinutes) return 'critical'
  if (mins >= props.warningMinutes) return 'warning'
  return 'normal'
})

const timerClasses = computed(() => {
  const base = 'font-mono font-bold flex items-center gap-1'
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  }

  const urgencyClasses = {
    normal: 'text-base-content',
    warning: 'text-warning',
    critical: 'text-error animate-pulse'
  }

  return `${base} ${sizeClasses[props.size]} ${urgencyClasses[urgencyLevel.value]}`
})

const iconSize = computed(() => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }
  return sizes[props.size]
})

const updateTimer = () => {
  const now = new Date()
  elapsedSeconds.value = Math.floor((now - startDate.value) / 1000)
}

onMounted(() => {
  updateTimer()
  timerInterval.value = setInterval(updateTimer, 1000)
})

onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
})
</script>

<template>
  <div :class="timerClasses">
    <IconAlertTriangle v-if="urgencyLevel === 'critical'" :class="iconSize" />
    <IconClock v-else :class="iconSize" />
    <span>{{ formattedTime }}</span>
  </div>
</template>
