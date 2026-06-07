<template>
  <Teleport to="body">
    <TransitionGroup
      name="toast-slide"
      tag="div"
      class="fixed top-4 right-4 z-[99999] flex w-full max-w-sm flex-col gap-2"
    >
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="[
          'group relative overflow-hidden rounded-2xl border bg-base-100 shadow-lg',
          {
            'border-success/30': notification.type === 'success',
            'border-error/30': notification.type === 'error',
            'border-warning/30': notification.type === 'warning',
            'border-info/30': notification.type === 'info'
          }
        ]"
      >
        <!-- Accent left bar -->
        <div
          :class="[
            'absolute inset-y-0 left-0 w-1',
            {
              'bg-success': notification.type === 'success',
              'bg-error': notification.type === 'error',
              'bg-warning': notification.type === 'warning',
              'bg-info': notification.type === 'info'
            }
          ]"
        />

        <!-- Progress bar -->
        <div
          v-if="notification.duration && notification.duration > 0"
          class="absolute bottom-0 left-0 h-0.5 w-full bg-base-300/40"
        >
          <div
            :class="[
              'h-full animate-toast-progress',
              {
                'bg-success': notification.type === 'success',
                'bg-error': notification.type === 'error',
                'bg-warning': notification.type === 'warning',
                'bg-info': notification.type === 'info'
              }
            ]"
            :style="{ animationDuration: notification.duration + 'ms' }"
          />
        </div>

        <div class="flex gap-3 p-4">
          <!-- Icon -->
          <div class="shrink-0 pt-0.5">
            <IconCircleCheck v-if="notification.type === 'success'" class="size-5 text-success" />
            <IconAlertCircle v-else-if="notification.type === 'error'" class="size-5 text-error" />
            <IconAlertTriangle v-else-if="notification.type === 'warning'" class="size-5 text-warning" />
            <IconInfoCircle v-else class="size-5 text-info" />
          </div>

          <!-- Content -->
          <div class="min-w-0 flex-1">
            <p
              v-if="notification.title"
              class="text-sm font-semibold leading-5 text-base-content"
            >
              {{ notification.title }}
            </p>
            <p
              :class="[
                'text-sm leading-5',
                notification.title ? 'mt-0.5 text-base-content/60' : 'text-base-content/80',
              ]"
            >
              {{ notification.message }}
            </p>
          </div>

          <!-- Close button -->
          <button
            @click="removeNotification(notification.id)"
            class="shrink-0 self-start rounded-lg p-1 text-base-content/30 opacity-0 transition-all hover:bg-base-200 hover:text-base-content/60 group-hover:opacity-100"
          >
            <IconX class="size-4" />
          </button>
        </div>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup>
import { useNotification } from '@/composables/core/useNotification'
import {
  IconCircleCheck,
  IconAlertCircle,
  IconAlertTriangle,
  IconInfoCircle,
  IconX
} from '@tabler/icons-vue'

const { notifications, removeNotification } = useNotification()
</script>

<style scoped>
.toast-slide-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-slide-leave-active {
  transition: all 0.25s ease-in;
}

.toast-slide-enter-from {
  opacity: 0;
  transform: translateX(120%) scale(0.9);
}

.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(80%) scale(0.95);
}

.toast-slide-move {
  transition: transform 0.3s ease;
}

@keyframes toast-progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.animate-toast-progress {
  animation: toast-progress linear forwards;
}
</style>
