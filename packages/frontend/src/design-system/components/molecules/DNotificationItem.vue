<script setup>
/**
 * DNotificationItem — Single notification row with icon, title, description, time, and unread dot.
 *
 * Props:
 * - notification: { id, title, description, time, type?, read? }
 * - clickable: boolean
 */
const props = defineProps({
  notification: {
    type: Object,
    required: true,
    // { id, title: string, description: string, time: string, type: string, read: boolean }
  },
  clickable: { type: Boolean, default: true },
})

const emit = defineEmits(['click'])

const typeIcons = {
  info: 'i-tabler-info-circle',
  success: 'i-tabler-circle-check',
  warning: 'i-tabler-alert-triangle',
  error: 'i-tabler-alert-circle',
  payment: 'i-tabler-cash',
  member: 'i-tabler-user-plus',
  checkin: 'i-tabler-scan',
  order: 'i-tabler-shopping-cart',
}

const typeColors = {
  info: 'text-info bg-info/10',
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
  error: 'text-error bg-error/10',
  payment: 'text-emerald-500 bg-emerald-50',
  member: 'text-blue-500 bg-blue-50',
  checkin: 'text-purple-500 bg-purple-50',
  order: 'text-orange-500 bg-orange-50',
}

import { computed } from 'vue'

const icon = computed(() => typeIcons[props.notification.type] || typeIcons.info)
const colorClass = computed(() => typeColors[props.notification.type] || typeColors.info)
</script>

<template>
  <div
    :class="[
      'flex gap-3 p-3 rounded-xl border transition-colors',
      clickable ? 'cursor-pointer hover:bg-base-200' : '',
      notification.read ? 'border-transparent' : 'border-primary/20 bg-primary/5',
    ]"
    @click="clickable && emit('click', notification)"
  >
    <!-- Icon -->
    <div :class="['size-9 rounded-lg flex items-center justify-center shrink-0', colorClass]">
      <span :class="[icon, 'size-4.5']" />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-2">
        <p :class="['text-sm font-semibold truncate', !notification.read ? 'text-base-content' : 'text-base-content/70']">
          {{ notification.title }}
        </p>
        <!-- Unread dot -->
        <span
          v-if="!notification.read"
          class="size-2 rounded-full bg-primary shrink-0 mt-1.5"
        />
      </div>
      <p class="text-xs text-base-content/50 mt-0.5 line-clamp-2">{{ notification.description }}</p>
      <span class="text-[0.65rem] text-base-content/30 mt-1.5 block">{{ notification.time }}</span>
    </div>
  </div>
</template>
