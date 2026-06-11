<script setup>
/**
 * DTopBar — Application header with breadcrumb, search, notifications, theme toggle, and user dropdown.
 *
 * Props:
 * - pageTitle: string — current page title
 * - breadcrumbs: Array<{ label, path? }>
 * - notificationCount: number — badge count on bell
 * - userProfile: { name, email, photo, tier? }
 * - moduleContext: 'gym' | 'restaurant'
 * - searchPlaceholder: string
 * - searchValue: string — v-model for search
 *
 * Events: @search, @notification-click, @theme-toggle, @profile-action, @logout
 */
const props = defineProps({
  pageTitle: { type: String, default: '' },
  breadcrumbs: { type: Array, default: () => [] },
  notificationCount: { type: Number, default: 0 },
  userProfile: {
    type: Object,
    default: () => ({ name: '', email: '', photo: '', tier: '' }),
  },
  moduleContext: {
    type: String,
    default: 'gym',
    validator: (v) => ['gym', 'restaurant'].includes(v),
  },
  searchPlaceholder: { type: String, default: 'Cari...' },
  searchValue: { type: String, default: '' },
})

const emit = defineEmits([
  'update:searchValue',
  'search',
  'notification-click',
  'theme-toggle',
  'profile-action',
  'logout',
])

import { ref } from 'vue'

const showUserDropdown = ref(false)

const moduleLabel = props.moduleContext === 'gym' ? 'GYM' : 'RESTAURANT'
const moduleColorClass = props.moduleContext === 'gym' ? 'text-[#2D6A9F]' : 'text-[#E8604C]'

function closeDropdown() {
  showUserDropdown.value = false
}

function onProfileAction(action) {
  emit('profile-action', action)
  closeDropdown()
}

function onLogout() {
  emit('logout')
  closeDropdown()
}
</script>

<template>
  <header class="app-shell-header club-topbar sticky top-0 z-30 border-b border-base-200">
    <div class="flex items-center gap-4 px-5 py-3">
      <!-- Page title + breadcrumbs -->
      <div class="flex-1 min-w-0">
        <!-- Module eyebrow -->
        <div class="club-eyebrow" :class="moduleColorClass">
          {{ moduleLabel }}
        </div>
        <h1 class="text-xl font-bold tracking-tight truncate">{{ pageTitle }}</h1>
        <!-- Breadcrumbs -->
        <div v-if="breadcrumbs.length" class="breadcrumbs text-xs pt-0 pb-0">
          <ul class="gap-1">
            <li v-for="(crumb, ci) in breadcrumbs" :key="ci">
              <a
                v-if="crumb.path && ci < breadcrumbs.length - 1"
                :href="crumb.path"
                class="text-base-content/40 hover:text-base-content/70"
              >
                {{ crumb.label }}
              </a>
              <span v-else class="text-base-content/60 font-medium">{{ crumb.label }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Right actions -->
      <div class="flex items-center gap-1.5 shrink-0">
        <!-- Global search -->
        <div class="relative hidden lg:block">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 pointer-events-none">
            <span class="i-tabler-search size-4" />
          </span>
          <input
            type="text"
            :value="searchValue"
            :placeholder="searchPlaceholder"
            class="input input-bordered input-sm pl-9 pr-3 w-56 text-xs"
            @input="emit('update:searchValue', $event.target.value)"
            @keydown.enter="emit('search', searchValue)"
          />
          <kbd v-if="!searchValue" class="absolute right-2 top-1/2 -translate-y-1/2 text-[0.6rem] text-base-content/20 pointer-events-none hidden xl:inline">
            /
          </kbd>
        </div>

        <!-- Search toggle (mobile) -->
        <button class="btn btn-ghost btn-sm btn-circle lg:hidden" aria-label="Search">
          <span class="i-tabler-search size-5" />
        </button>

        <!-- Notification bell -->
        <button
          class="btn btn-ghost btn-sm btn-circle relative"
          @click="emit('notification-click')"
          aria-label="Notifications"
        >
          <span class="i-tabler-bell size-5" />
          <span
            v-if="notificationCount > 0"
            class="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-error text-error-content text-[0.55rem] font-bold flex items-center justify-center"
          >
            {{ notificationCount > 99 ? '99+' : notificationCount }}
          </span>
        </button>

        <!-- Theme toggle -->
        <button
          class="btn btn-ghost btn-sm btn-circle"
          @click="emit('theme-toggle')"
          aria-label="Toggle theme"
        >
          <span class="i-tabler-sun size-5 dark:i-tabler-moon" />
        </button>

        <!-- User dropdown -->
        <div class="relative">
          <button
            class="flex items-center gap-2 rounded-xl p-1.5 hover:bg-base-200 transition-colors"
            @click="showUserDropdown = !showUserDropdown"
          >
            <DAvatar
              :src="userProfile.photo"
              :name="userProfile.name"
              size="sm"
              :tier="userProfile.tier"
            />
            <div v-if="userProfile.name" class="hidden sm:block text-left">
              <p class="text-xs font-semibold leading-tight truncate max-w-[8rem]">{{ userProfile.name }}</p>
              <p class="text-[0.6rem] text-base-content/40 leading-tight truncate max-w-[8rem]">{{ userProfile.email }}</p>
            </div>
          </button>

          <!-- Dropdown menu -->
          <Transition name="scale-in">
            <div
              v-if="showUserDropdown"
              class="absolute right-0 top-full mt-1 w-56 rounded-xl border border-base-300 bg-base-100 shadow-xl z-50 overflow-hidden"
            >
              <div class="p-3 border-b border-base-200">
                <DAvatar
                  :src="userProfile.photo"
                  :name="userProfile.name"
                  size="md"
                  :tier="userProfile.tier"
                />
                <p class="text-sm font-semibold mt-2">{{ userProfile.name }}</p>
                <p class="text-xs text-base-content/50">{{ userProfile.email }}</p>
              </div>
              <div class="p-1">
                <button class="w-full text-left px-3 py-2 text-sm hover:bg-base-200 rounded-lg flex items-center gap-2.5" @click="onProfileAction('profile')">
                  <span class="i-tabler-user-circle size-4 text-base-content/40" />Profil
                </button>
                <button class="w-full text-left px-3 py-2 text-sm hover:bg-base-200 rounded-lg flex items-center gap-2.5" @click="onProfileAction('settings')">
                  <span class="i-tabler-settings size-4 text-base-content/40" />Pengaturan
                </button>
                <button class="w-full text-left px-3 py-2 text-sm hover:bg-base-200 rounded-lg flex items-center gap-2.5" @click="onProfileAction('help')">
                  <span class="i-tabler-help-circle size-4 text-base-content/40" />Bantuan
                </button>
              </div>
              <div class="p-1 border-t border-base-200">
                <button class="w-full text-left px-3 py-2 text-sm hover:bg-error/10 rounded-lg flex items-center gap-2.5 text-error" @click="onLogout">
                  <span class="i-tabler-logout size-4" />Keluar
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.scale-in-enter-active {
  animation: scaleIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.scale-in-leave-active {
  animation: scaleIn 150ms cubic-bezier(0.4, 0, 1, 1) reverse forwards;
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95) translateY(-4px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
