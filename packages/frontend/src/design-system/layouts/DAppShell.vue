<script setup>
/**
 * DAppShell — Complete authenticated app layout with responsive sidebar, header, toast outlet,
 * and module-aware accent coloring.
 *
 * Uses:
 * - DSidebarNav for navigation
 * - DTopBar for header
 * - useToast for global toast notifications
 * - useTheme for dark/light switching
 * - useModuleContext for gym/restaurant module context
 *
 * Props:
 * - navItems: Array — sidebar navigation items
 * - bottomLinks: Array — bottom sidebar links
 * - pageTitle: string — current page header title
 * - breadcrumbs: Array
 * - userProfile: object — current user data
 * - notificationCount: number
 * - searchValue: string — v-model global search
 * - logo: string — brand logo URL
 *
 * Slots: default (page content), header-actions
 */
const props = defineProps({
  navItems: { type: Array, default: () => [] },
  bottomLinks: { type: Array, default: () => [] },
  pageTitle: { type: String, default: 'Dashboard' },
  breadcrumbs: { type: Array, default: () => [] },
  userProfile: {
    type: Object,
    default: () => ({ name: '', email: '', photo: '', tier: '' }),
  },
  notificationCount: { type: Number, default: 0 },
  searchValue: { type: String, default: '' },
  logo: { type: String, default: '' },
})

const emit = defineEmits([
  'update:searchValue',
  'search',
  'nav-click',
  'toggle-module',
  'notification-click',
  'profile-action',
  'logout',
])

import { provide, computed } from 'vue'
import { useToast } from '../../composables/useToast.js'
import { useTheme } from '../../composables/useTheme.js'

const { toasts, config, remove: removeToast, clearAll } = useToast()
const { current, isDark, toggle: toggleTheme } = useTheme()

// Module context state
import { ref } from 'vue'
const activeModule = ref('gym')
const sidebarCollapsed = ref(false)

const accentColor = computed(() => activeModule.value === 'gym' ? '#2D6A9F' : '#E8604C')
const accentBg = computed(() => activeModule.value === 'gym' ? 'bg-[#2D6A9F]' : 'bg-[#E8604C]')

function handleToggleModule(module) {
  activeModule.value = module
  emit('toggle-module', module)
}

function handleProfileAction(action) {
  emit('profile-action', action)
}

// Provide toasts to children
provide('toasts', toasts)
provide('removeToast', removeToast)
provide('toastConfig', config)
provide('activeModule', activeModule)
provide('sidebarCollapsed', sidebarCollapsed)
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <div class="hidden lg:flex shrink-0 h-full">
      <DSidebarNav
        :nav-items="navItems"
        :bottom-links="bottomLinks"
        :collapsed="sidebarCollapsed"
        :module-context="activeModule"
        :user-profile="userProfile"
        :logo="logo"
        @toggle-module="handleToggleModule"
        @nav-click="emit('nav-click', $event)"
        @collapse-toggle="sidebarCollapsed = !sidebarCollapsed"
        @logout="emit('logout')"
      />
    </div>

    <!-- Mobile drawer (placeholder — projects typically use DaisyUI drawer) -->
    <!-- <div class="lg:hidden">mobile nav</div> -->

    <!-- Main content area -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Header -->
      <DTopBar
        :page-title="pageTitle"
        :breadcrumbs="breadcrumbs"
        :notification-count="notificationCount"
        :user-profile="userProfile"
        :module-context="activeModule"
        :search-value="searchValue"
        @update:search-value="emit('update:searchValue', $event)"
        @search="emit('search', $event)"
        @notification-click="emit('notification-click')"
        @theme-toggle="toggleTheme"
        @profile-action="handleProfileAction"
        @logout="emit('logout')"
      >
        <template #header-actions>
          <slot name="header-actions" />
        </template>
      </DTopBar>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto p-5">
        <div class="app-shell-content">
          <slot />
        </div>
      </main>
    </div>

    <!-- Toast notification outlet -->
    <div class="toast toast-end toast-bottom z-[999]">
      <TransitionGroup name="slide-up" tag="div" class="space-y-2">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'alert rounded-xl shadow-lg flex items-center gap-2',
            config[toast.type].bgClass,
          ]"
        >
          <span :class="[config[toast.type].icon ? 'i-tabler-' + config[toast.type].icon : 'i-tabler-info-circle', config[toast.type].iconClass, 'size-5']" />
          <span class="text-sm">{{ toast.message }}</span>
          <button class="ml-2 opacity-50 hover:opacity-100" @click="removeToast(toast.id)">
            <span class="i-tabler-x size-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
