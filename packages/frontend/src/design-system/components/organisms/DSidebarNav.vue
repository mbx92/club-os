<script setup>
/**
 * DSidebarNav — Collapsible sidebar navigation for the app shell.
 *
 * Props:
 * - logo: string — logo image URL
 * - brandName: string — displayed brand text
 * - navItems: Array<{ label, icon, path?, children?, badge?, badgeVariant?, active? }>
 * - collapsed: boolean — icon-only mode
 * - moduleContext: 'gym' | 'restaurant' — active module for accent color
 * - userProfile: { name, email, photo, tier? }
 * - bottomLinks: Array<{ label, icon, path? }>
 *
 * Events: @toggle-module, @nav-click, @collapse-toggle, @logout
 */
const props = defineProps({
  logo: { type: String, default: '' },
  brandName: { type: String, default: 'Dynasty Fitness' },
  navItems: { type: Array, default: () => [] },
  collapsed: { type: Boolean, default: false },
  moduleContext: {
    type: String,
    default: 'gym',
    validator: (v) => ['gym', 'restaurant'].includes(v),
  },
  userProfile: {
    type: Object,
    default: () => ({ name: '', email: '', photo: '', tier: '' }),
  },
  bottomLinks: { type: Array, default: () => [] },
})

const emit = defineEmits(['toggle-module', 'nav-click', 'collapse-toggle', 'logout'])

import { ref } from 'vue'

const openGroups = ref([])

function toggleGroup(groupLabel) {
  const idx = openGroups.value.indexOf(groupLabel)
  if (idx === -1) {
    openGroups.value.push(groupLabel)
  } else {
    openGroups.value.splice(idx, 1)
  }
}

function isGroupOpen(groupLabel) {
  return openGroups.value.includes(groupLabel)
}

const accentBorderColor = props.moduleContext === 'gym' ? 'border-[#2D6A9F]' : 'border-[#E8604C]'
</script>

<template>
  <aside
    :class="[
      'club-sidebar flex flex-col h-full transition-all duration-300 overflow-hidden',
      collapsed ? 'w-[4.5rem]' : 'w-[16rem]',
    ]"
  >
    <!-- Brand header -->
    <div class="club-sidebar-brand px-4 py-4 flex items-center gap-3 shrink-0">
      <img
        v-if="logo"
        :src="logo"
        alt="Logo"
        class="size-9 rounded-lg object-cover shrink-0"
      />
      <div
        v-else
        class="size-9 rounded-lg bg-white/10 flex items-center justify-center text-white font-bold text-sm shrink-0"
      >
        DF
      </div>
      <div v-if="!collapsed" class="min-w-0 overflow-hidden">
        <h2 class="text-white font-bold text-sm truncate">{{ brandName }}</h2>
      </div>
    </div>

    <!-- Module switcher -->
    <div v-if="!collapsed" class="px-3 pb-2 shrink-0">
      <div class="club-sidebar-badge text-xs">
        <span class="club-sidebar-dot" />
        <span>{{ moduleContext === 'gym' ? 'GYM Active' : 'Restaurant Active' }}</span>
      </div>
      <div class="flex gap-1.5 mt-2">
        <button
          :class="[
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border transition-all',
            moduleContext === 'gym'
              ? 'bg-[#2D6A9F]/20 border-[#2D6A9F]/40 text-[#7DBEF0]'
              : 'border-white/10 text-white/50 hover:text-white/80',
          ]"
          @click="emit('toggle-module', 'gym')"
        >
          <span class="i-tabler-dumbbell size-3.5" />
          <span>GYM</span>
        </button>
        <button
          :class="[
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border transition-all',
            moduleContext === 'restaurant'
              ? 'bg-[#E8604C]/20 border-[#E8604C]/40 text-[#F4A08C]'
              : 'border-white/10 text-white/50 hover:text-white/80',
          ]"
          @click="emit('toggle-module', 'restaurant')"
        >
          <span class="i-tabler-tools-kitchen-2 size-3.5" />
          <span>RESTAURANT</span>
        </button>
      </div>
    </div>

    <!-- Nav items -->
    <nav class="club-sidebar-nav flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
      <template v-for="(item, idx) in navItems" :key="idx">
        <!-- Separator -->
        <div v-if="item.separator" class="pt-3 pb-1.5">
          <span
            v-if="!collapsed"
            class="block px-2 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white/30"
          >
            {{ item.label }}
          </span>
        </div>

        <!-- Group with children -->
        <div v-else-if="item.children && item.children.length">
          <button
            v-if="!collapsed"
            class="club-nav-link w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm"
            :class="{ 'club-nav-link-active': item.active }"
            @click="toggleGroup(item.label)"
          >
            <span v-if="item.icon" :class="[item.icon, 'size-4 shrink-0']" />
            <span class="flex-1 text-left truncate">{{ item.label }}</span>
            <span
              class="size-3.5 shrink-0 transition-transform duration-200"
              :class="{ 'rotate-180': isGroupOpen(item.label) }"
            >
              <span class="i-tabler-chevron-down size-3.5" />
            </span>
          </button>
          <!-- Collapsed group trigger -->
          <div
            v-else
            class="club-nav-link flex items-center justify-center px-2 py-2 rounded-xl cursor-pointer tooltip tooltip-right"
            :data-tip="item.label"
          >
            <span v-if="item.icon" :class="[item.icon, 'size-5 shrink-0']" />
          </div>
          <!-- Children -->
          <Transition name="slide-down">
            <div v-if="isGroupOpen(item.label) || collapsed" class="ml-3 space-y-0.5 mt-0.5" :class="collapsed ? 'ml-0' : ''">
              <a
                v-for="(child, ci) in item.children"
                :key="ci"
                :href="child.path || '#'"
                :class="[
                  'club-nav-link flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm',
                  collapsed ? 'justify-center px-2' : '',
                  child.active ? 'club-nav-link-active' : '',
                ]"
                @click.prevent="emit('nav-click', child)"
              >
                <span v-if="child.icon" :class="[child.icon, 'size-4 shrink-0']" />
                <span v-if="!collapsed" class="truncate">{{ child.label }}</span>
                <DBadge
                  v-if="child.badge && !collapsed"
                  :variant="child.badgeVariant || 'neutral'"
                  size="xs"
                  class="ml-auto"
                >
                  {{ child.badge }}
                </DBadge>
              </a>
            </div>
          </Transition>
        </div>

        <!-- Single link -->
        <a
          v-else
          :href="item.path || '#'"
          :class="[
            'club-nav-link flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm',
            collapsed ? 'justify-center px-2' : '',
            item.active ? 'club-nav-link-active' : '',
          ]"
          @click.prevent="emit('nav-click', item)"
        >
          <span v-if="item.icon" :class="[item.icon, 'size-5 shrink-0']" />
          <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
          <DBadge
            v-if="item.badge && !collapsed"
            :variant="item.badgeVariant || 'neutral'"
            size="xs"
            class="ml-auto"
          >
            {{ item.badge }}
          </DBadge>
        </a>
      </template>
    </nav>

    <!-- User profile & bottom links -->
    <div class="club-sidebar-footer shrink-0 p-3 space-y-2 border-t border-white/5">
      <!-- Bottom links -->
      <div v-if="bottomLinks.length && !collapsed" class="space-y-0.5">
        <a
          v-for="(link, li) in bottomLinks"
          :key="li"
          :href="link.path || '#'"
          class="club-nav-link flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs"
          @click.prevent="emit('nav-click', link)"
        >
          <span v-if="link.icon" :class="[link.icon, 'size-3.5 shrink-0']" />
          <span>{{ link.label }}</span>
        </a>
      </div>

      <!-- Collapse toggle -->
      <button
        class="w-full flex items-center justify-center py-1.5 rounded-lg text-white/30 hover:text-white/60 transition-colors"
        @click="emit('collapse-toggle')"
      >
        <span
          :class="collapsed ? 'i-tabler-chevron-right' : 'i-tabler-chevron-left'"
          class="size-4 transition-transform duration-300"
        />
      </button>

      <!-- User profile mini -->
      <div
        v-if="userProfile.name"
        :class="[
          'flex items-center rounded-xl p-2 gap-2.5 bg-white/5',
          collapsed ? 'justify-center' : '',
        ]"
      >
        <DAvatar
          :src="userProfile.photo"
          :name="userProfile.name"
          size="sm"
          :tier="userProfile.tier"
        />
        <div v-if="!collapsed" class="flex-1 min-w-0">
          <p class="text-white text-xs font-semibold truncate">{{ userProfile.name }}</p>
          <p class="text-white/40 text-[0.65rem] truncate">{{ userProfile.email }}</p>
        </div>
        <button
          v-if="!collapsed"
          class="text-white/30 hover:text-white/60 transition-colors shrink-0"
          @click="emit('logout')"
          title="Logout"
        >
          <span class="i-tabler-logout size-4" />
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}
</style>
