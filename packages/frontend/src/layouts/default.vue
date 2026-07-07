<script setup>
import logo from "@/assets/dynasty-logo.jpg";
import { ref, computed, onMounted, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useNavigation } from "@/composables/core/useNavigation";
import { useTheme } from "@/composables/core/useTheme";
import { useNotification } from "@/composables/core/useNotification";
import { useRouter, useRoute } from 'vue-router'

// Import icon components
import {
  IconLayoutDashboard,
  IconUsers,
  IconCalendarClock,
  IconSettings,
  IconLogout,
  IconLock,
  IconMenu2,
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconX,
  IconChevronsLeft,
  IconChevronsRight,
  IconMoonStars,
  IconSun,
  IconUser,
  IconBuilding,
  IconReceipt,
  IconReceipt2,
  IconList,
  IconUserStar,
  IconFileText,
  IconCreditCard,
  IconBarbell,
  IconCalendarTime,
  IconPackage,
  IconApple,
  IconChartBar,
  IconCash,
  IconClock,
  IconChartLine,
  IconStar,
  IconPalette,
  IconCheck,
  IconInfoCircle,
  IconTicket,
  IconDeviceIpadDollar,
  IconBasketDollar,
  IconCashRegister,
  IconDatabaseDollar,
  IconCalendarCheck,
  IconListCheck,
  IconCalendar,
  IconBell,
  IconDoorEnter,
  IconBrain,
  IconClipboardList,
  IconMail,
  IconDiscount,
  IconMassage,
  IconUserCheck,
  IconCrown,
  IconCalendarStats,
  IconListDetails,
  IconBellRinging,
  IconCalendarEvent,
  IconToolsKitchen2,
  IconMapPin,
  IconArmchair,
  IconLayoutGrid,
  IconBox,
  IconHistory,
  IconAlertTriangle,
  IconShoppingCart,
  IconTransfer,
  IconListNumbers,
  IconChefHat,
  IconFolder,
  IconFileAnalytics,
  IconFileInvoice,
  IconFileX,
  IconTag,
  IconDotsVertical,
  IconReportMoney,
  IconBarbellFilled,
  IconTrendingUp,
  IconCategory,
  IconFingerprint,
  IconDeviceDesktop,
  IconUserShield,
  IconBuildingSkyscraper,
  IconReportAnalytics,
  IconDeviceCctv,
  IconUsersGroup,
  IconClockHour4,
  IconUserDollar,
  IconWallet,
  IconIdBadge,
  IconUserSquare,
  IconChartPie,
  IconShoppingBag,
  IconTable,
  IconBuildingBank,
} from "@tabler/icons-vue";

const iconMap = {
  table: IconTable,
  "layout-dashboard": IconLayoutDashboard,
  users: IconUsers,
  "calendar-clock": IconCalendarClock,
  settings: IconSettings,
  building: IconBuilding,
  receipt: IconReceipt,
  list: IconList,
  "user-star": IconUserStar,
  "file-text": IconFileText,
  "credit-card": IconCreditCard,
  "barbell-outline": IconBarbell,
  "calendar-time": IconCalendarTime,
  package: IconPackage,
  apple: IconApple,
  "chart-bar": IconChartBar,
  "chart-pie": IconChartPie,
  "building-bank": IconBuildingBank,
  cash: IconCash,
  clock: IconClock,
  "chart-line": IconChartLine,
  crown: IconCrown,
  ticket: IconTicket,
  "device-ipad-dollar": IconDeviceIpadDollar,
  "basket-dollar": IconBasketDollar,
  "cash-register": IconCashRegister,
  "database-dollar": IconDatabaseDollar,
  "calendar-check": IconCalendarCheck,
  "list-check": IconListCheck,
  calendar: IconCalendar,
  bell: IconBell,
  "door-enter": IconDoorEnter,
  brain: IconBrain,
  "clipboard": IconClipboardList,
  mail: IconMail,
  discount: IconDiscount,
  massage: IconMassage,
  "user-check": IconUserCheck,
  "calendar-stats": IconCalendarStats,
  "list-details": IconListDetails,
  "bell-ringing": IconBellRinging,
  "calendar-event": IconCalendarEvent,
  "tools-kitchen-2": IconToolsKitchen2,
  "map-pin": IconMapPin,
  armchair: IconArmchair,
  "layout-grid": IconLayoutGrid,
  box: IconBox,
  history: IconHistory,
  "alert-triangle": IconAlertTriangle,
  dashboard: IconLayoutDashboard,
  "shopping-cart": IconShoppingCart,
  transfer: IconTransfer,
  "receipt-2": IconReceipt2,
  "list-numbers": IconListNumbers,
  "chef-hat": IconChefHat,
  folder: IconFolder,
  "file-analytics": IconFileAnalytics,
  barbell: IconBarbellFilled,
  "file-invoice": IconFileInvoice,
  "file-x": IconFileX,
  tag: IconTag,
  "dots-vertical": IconDotsVertical,
  "report-money": IconReportMoney,
  "trending-up": IconTrendingUp,
  category: IconCategory,
  fingerprint: IconFingerprint,
  "device-desktop": IconDeviceDesktop,
  "user-shield": IconUserShield,
  "building-skyscraper": IconBuildingSkyscraper,
  "report-analytics": IconReportAnalytics,
  "device-cctv": IconDeviceCctv,
  "users-group": IconUsersGroup,
  "clock-hour-4": IconClockHour4,
  "user-dollar": IconUserDollar,
  wallet: IconWallet,
  "id-badge": IconIdBadge,
  "user-square": IconUserSquare,
  "shopping-bag": IconShoppingBag,
};

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const { navigation } = useNavigation();

const pageTitle = computed(() => route.meta?.title || 'Dashboard');
const { isDark, toggleTheme, initTheme, setupThemeBroadcastListener } = useTheme();
const tenantName = computed(() => authStore.user?.tenant?.name || "Gym Management");

const accountLabel = computed(() =>
  authStore.user?.username
  || authStore.user?.email
  || 'User'
);

const userRoleLabel = computed(() => {
  const role = authStore.user?.role
  if (!role) return 'user'
  if (typeof role === 'string') return role
  return role.name || role.label || 'user'
});

const initials = computed(() => {
  const s = accountLabel.value;
  return s
    .toString()
    .split(/[^\w]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
});

const collapsed = ref(false);

// Expose isDev for template
const isDev = import.meta.env.DEV

onMounted(async () => {
  if (authStore.token && !authStore.user) {
    try {
      await authStore.initializeAuth();
    } catch {}
  }

  initTheme();

  const cleanup = setupThemeBroadcastListener();

  return () => {
    if (cleanup) cleanup();
  };
});

const logoutAuth = async () => {
  try {
    await authStore.logout();
    await router.push({ name: 'auth.login' })
  } catch (err) {
    console.error('Logout error:', err)
    window.location.href = '/auth/login'
  }
}

const lockSession = () => {
  sessionStorage.setItem('lockReturnPath', route.fullPath)
  router.push({ name: 'auth.login', query: { locked: '1' } })
}

// Close mobile drawer when a nav link is clicked
const closeDrawer = () => {
  const el = document.getElementById('gym-drawer')
  if (el) el.checked = false
}

const { showSuccess, handleError } = useNotification();
const showThemeModal = ref(false);
const { 
  currentPreset, 
  THEME_PRESETS, 
  updateTenantTheme, 
  isLoading: isThemeLoading 
} = useTheme();
const selectedPreset = ref(currentPreset.value);

// Watch currentPreset changes
watch(() => currentPreset.value, (newPreset) => {
  if (newPreset && !showThemeModal.value) {
    selectedPreset.value = newPreset
  }
}, { immediate: true })

const openThemeModal = () => {
  selectedPreset.value = currentPreset.value;
  if (isDev) {
    console.log('[Modal] Opening with preset:', selectedPreset.value)
  }
  showThemeModal.value = true;
};

const closeThemeModal = () => {
  showThemeModal.value = false;
};

const selectPresetInModal = (preset) => {
  if (isDev) {
    console.log('[Modal] Selected preset:', preset)
  }
  selectedPreset.value = preset
}

const saveTheme = async () => {
  if (isDev) {
    console.log('[Modal] Saving theme:', selectedPreset.value)
  }
  const result = await updateTenantTheme({
    preset: selectedPreset.value.id,
    lightTheme: selectedPreset.value.light,
    darkTheme: selectedPreset.value.dark
  });
  
  if (result.success) {
    showSuccess('Theme updated successfully');
    closeThemeModal();
  } else {
    handleError(result.error, 'Failed to update theme');
  }
};

// Tooltip for collapsed sidebar
const hoveredItem = ref(null);
const tooltipStyle = ref({ top: '0px', left: '0px' });

const showTooltip = (event, item) => {
  if (!collapsed.value) return;
  
  const rect = event.currentTarget.getBoundingClientRect();
  
  tooltipStyle.value = {
    top: `${rect.top}px`,
    left: `${rect.right + 8}px`
  };
  
  hoveredItem.value = item;
};

const hideTooltip = () => {
  hoveredItem.value = null;
};

// Check if any child route is active (supports nested children)
// Leaf nodes (no children) use EXACT matching only to avoid false positives
// e.g. Gym Dashboard "/gym" must not match "/gym/hikvision/..." which belongs to Back Office
const isChildActive = (item) => {
  if (!item.children || !item.children.length) return false;
  const currentPath = router.currentRoute.value.path;

  const matchesNode = (node) => {
    if (node.to) {
      // Exact match always works
      if (currentPath === node.to) return true;
      // Prefix match only for non-leaf nodes (sections that group child routes)
      if (node.children && node.children.length && currentPath.startsWith(node.to + '/')) return true;
    }
    // Recurse into children
    if (node.children && node.children.length) {
      return node.children.some(child => matchesNode(child));
    }
    return false;
  };

  return item.children.some(child => matchesNode(child));
};
</script>

<template>
  <div class="app-shell min-h-screen overflow-visible drawer lg:drawer-open">
    <input id="gym-drawer" type="checkbox" class="drawer-toggle" />

    <!-- MAIN CONTENT -->
    <div class="relative z-10 flex min-h-screen flex-col drawer-content">
      <header class="app-shell-header sticky top-0 z-50">
        <div class="flex h-[4.25rem] items-center gap-4 px-4 md:px-6">
          <!-- Left: menu + page title -->
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <label for="gym-drawer" class="btn btn-ghost btn-sm btn-circle lg:hidden">
              <IconMenu2 class="size-5" />
            </label>
            <div class="hidden min-w-0 sm:block">
              <p class="app-header-eyebrow truncate">{{ tenantName }}</p>
              <h1 class="app-header-title truncate">{{ pageTitle }}</h1>
            </div>
          </div>

          <!-- Right: actions + avatar -->
          <div class="flex shrink-0 items-center gap-2">
            <div class="app-header-toolbar">
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-circle"
                @click="openThemeModal()"
                title="Change Theme"
              >
                <IconPalette class="size-[1.15rem]" />
              </button>

              <button
                type="button"
                class="btn btn-ghost btn-sm btn-circle"
                :aria-pressed="isDark"
                @click="toggleTheme()"
                title="Toggle dark mode"
              >
                <IconMoonStars v-if="isDark" class="size-[1.15rem]" />
                <IconSun v-else class="size-[1.15rem]" />
              </button>
            </div>

            <div class="dropdown dropdown-end">
              <div
                tabindex="0"
                role="button"
                class="app-header-user-trigger cursor-pointer"
              >
                <div class="avatar placeholder">
                  <div class="app-shell-avatar w-9">
                    <span class="text-xs font-bold">{{ initials }}</span>
                  </div>
                </div>
              </div>
              <ul
                tabindex="0"
                class="app-header-dropdown dropdown-content menu mt-2 w-56 bg-base-100 p-1.5 z-[100]"
              >
                <li>
                  <RouterLink to="/core/profile" class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm">
                    <IconUser class="size-4 shrink-0 text-base-content/40" />
                    <span>Profile</span>
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/core/settings" class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm">
                    <IconSettings class="size-4 shrink-0 text-base-content/40" />
                    <span>Settings</span>
                  </RouterLink>
                </li>
                <li class="my-1 border-t border-base-200"></li>
                <li>
                  <a @click.prevent="logoutAuth()" class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-error">
                    <IconLogout class="size-4 shrink-0" />
                    <span>Logout</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </header>

      <main class="app-shell-main flex-1 px-4 py-4 md:px-6 md:py-6">
        <div class="app-shell-content mx-auto w-full max-w-[1600px]">
          <RouterView />
        </div>
      </main>
    </div>

    <!-- SIDEBAR -->
    <div class="drawer-side">
      <label for="gym-drawer" class="drawer-overlay"></label>
      <aside
        class="app-sidebar relative flex h-screen flex-col transition-[width] duration-300 ease-in-out"
        :class="collapsed ? 'w-[5.25rem]' : 'w-[17rem]'">

        <!-- Collapse toggle — sits on the seam between sidebar and navbar -->
        <div class="pointer-events-none absolute right-0 top-[2.125rem] z-50 hidden -translate-y-1/2 translate-x-1/2 lg:block">
          <button
            type="button"
            class="app-sidebar-collapse-btn pointer-events-auto flex size-7 items-center justify-center rounded-full border transition-all"
            :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            @click="collapsed = !collapsed"
          >
            <IconChevronsRight v-if="collapsed" class="size-3.5" />
            <IconChevronsLeft v-else class="size-3.5" />
          </button>
        </div>

        <!-- Brand header -->
        <div class="app-sidebar-brand flex h-[4.25rem] items-center gap-3 px-4">
          <img
            :src="logo"
            alt="Club OS"
            class="app-sidebar-logo size-10 rounded-xl object-cover select-none"
          />
          <div v-if="!collapsed" class="min-w-0 flex-1 text-left">
            <p class="app-sidebar-eyebrow truncate">Club OS</p>
            <h2 class="app-sidebar-title truncate">{{ tenantName }}</h2>
          </div>
          <label
            for="gym-drawer"
            class="btn btn-ghost btn-sm btn-circle ml-auto text-white/50 hover:text-white hover:bg-white/10 lg:hidden"
          >
            <IconX class="size-5" />
          </label>
        </div>

        <!-- Navigation menu -->
        <nav class="app-sidebar-nav flex-1 overflow-y-auto px-2.5 py-3">
          <ul class="flex flex-col gap-0.5">
            <li
              v-for="(item, i) in navigation"
              :key="item.to || i"
            >
              <!-- Menu with children -->
              <template v-if="item.children && item.children.length > 0">
                <details v-if="!collapsed" :open="isChildActive(item)" class="app-nav-group">
                  <summary
                    class="app-nav-link cursor-pointer"
                    :class="{ 'app-nav-link--active': isChildActive(item) }"
                  >
                    <span class="app-nav-icon">
                      <component :is="iconMap[item.icon]" class="size-4" />
                    </span>
                    <span class="truncate">{{ item.label }}</span>
                    <IconChevronsLeft class="app-nav-chevron size-3.5 rotate-[-90deg]" />
                  </summary>
                  <ul class="app-nav-children mt-1 space-y-0.5">
                    <li v-for="(child, j) in item.children" :key="child.to || j">
                      <template v-if="child.children && child.children.length > 0">
                        <details :open="isChildActive(child)" class="app-nav-group">
                          <summary
                            class="app-nav-link cursor-pointer"
                            :class="{ 'app-nav-link--active': isChildActive(child) }"
                          >
                            <span class="app-nav-icon">
                              <component :is="iconMap[child.icon]" class="size-3.5" />
                            </span>
                            <span class="truncate">{{ child.label }}</span>
                            <IconChevronsLeft class="app-nav-chevron size-3 rotate-[-90deg]" />
                          </summary>
                          <ul class="app-nav-children mt-1 space-y-0.5">
                            <li v-for="(grandChild, k) in child.children" :key="grandChild.to || k">
                              <RouterLink
                                :to="grandChild.to"
                                custom
                                v-slot="{ href, navigate, isActive }"
                              >
                                <a
                                  :href="href"
                                  @click="e => { navigate(e); closeDrawer() }"
                                  :class="[
                                    'app-nav-link',
                                    isActive ? 'app-nav-link--active' : '',
                                  ]"
                                >
                                  <span class="app-nav-icon">
                                    <component :is="iconMap[grandChild.icon]" class="size-3" />
                                  </span>
                                  <span class="truncate">{{ grandChild.label }}</span>
                                </a>
                              </RouterLink>
                            </li>
                          </ul>
                        </details>
                      </template>
                      <!-- Level 2 link -->
                      <RouterLink
                        v-else
                        :to="child.to"
                        custom
                        v-slot="{ href, navigate, isActive }"
                      >
                        <a
                          :href="href"
                          @click="e => { navigate(e); closeDrawer() }"
                          :class="[
                            'app-nav-link',
                            isActive ? 'app-nav-link--active' : '',
                          ]"
                        >
                          <span class="app-nav-icon">
                            <component :is="iconMap[child.icon]" class="size-3.5" />
                          </span>
                          <span class="truncate">{{ child.label }}</span>
                        </a>
                      </RouterLink>
                    </li>
                  </ul>
                </details>
                <!-- Collapsed: icon only -->
                <div
                  v-else
                  class="flex justify-center"
                  @mouseenter="showTooltip($event, item)"
                  @mouseleave="hideTooltip"
                >
                  <a
                    :class="[
                      'app-nav-link justify-center px-2',
                      isChildActive(item) ? 'app-nav-link--active' : '',
                    ]"
                  >
                    <span class="app-nav-icon">
                      <component :is="iconMap[item.icon]" class="size-4" />
                    </span>
                  </a>
                </div>
              </template>

              <!-- Menu without children (direct link) -->
              <RouterLink
                v-else
                :to="item.to"
                custom
                v-slot="{ href, navigate, isActive }"
              >
                <a
                  :href="href"
                  @click="e => { navigate(e); closeDrawer() }"
                  @mouseenter="showTooltip($event, item)"
                  @mouseleave="hideTooltip"
                  :class="[
                    'app-nav-link',
                    collapsed ? 'justify-center px-2' : '',
                    isActive ? 'app-nav-link--active' : '',
                  ]"
                >
                  <span class="app-nav-icon">
                    <component :is="iconMap[item.icon]" class="size-4" />
                  </span>
                  <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
                </a>
              </RouterLink>
            </li>
          </ul>
        </nav>

        <!-- Sidebar footer -->
        <div v-if="!collapsed" class="app-sidebar-footer shrink-0 p-3">
          <div class="app-sidebar-user flex items-center gap-2.5 p-2.5">
            <div class="avatar placeholder shrink-0">
              <div class="app-shell-avatar w-8">
                <span class="text-xs font-bold">{{ initials }}</span>
              </div>
            </div>
            <div class="min-w-0 flex-1 text-left">
              <p class="text-xs font-semibold truncate" :title="accountLabel">{{ accountLabel }}</p>
              <p class="user-role text-[0.6rem] capitalize truncate">{{ userRoleLabel }}</p>
            </div>
            <div class="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                class="app-sidebar-icon-btn"
                @click="lockSession()"
                title="Lock session"
              >
                <IconLock class="size-3.5" />
              </button>
              <button
                type="button"
                class="app-sidebar-icon-btn app-sidebar-icon-btn--danger"
                @click="logoutAuth()"
                title="Logout"
              >
                <IconLogout class="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Tooltip for collapsed sidebar -->
    <Teleport to="body">
      <div
        v-if="collapsed && hoveredItem"
        :style="{ 
          position: 'fixed', 
          top: tooltipStyle.top, 
          left: tooltipStyle.left,
          zIndex: 9999
        }"
        class="app-sidebar-tooltip whitespace-nowrap"
      >
        {{ hoveredItem.label }}
      </div>
    </Teleport>

    <!-- Theme Selection Modal -->
    <Teleport to="body">
      <div
        v-if="showThemeModal"
        class="modal modal-open"
        @click.self="closeThemeModal"
      >
        <div class="max-w-2xl modal-box">
          <div class="flex items-center justify-between mb-4">
            <h3 class="flex items-center gap-2 text-lg font-bold">
              <IconPalette class="w-6 h-6" />
              Choose Theme
            </h3>
            <button
              class="btn btn-sm btn-circle btn-ghost"
              @click="closeThemeModal"
            >
              <IconX class="w-5 h-5" />
            </button>
          </div>

          <div class="mb-4 alert alert-info">
            <IconInfoCircle class="w-5 h-5 shrink-0" />
            <span class="text-sm">Theme will apply to all users in: <strong>{{ tenantName }}</strong></span>
          </div>

          <!-- Theme Presets Grid -->
          <div class="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-2">
            <div
              v-for="preset in THEME_PRESETS"
              :key="preset.id"
              class="transition-all border-2 cursor-pointer card hover:shadow-md"
              :class="selectedPreset.id === preset.id ? 'border-primary bg-primary/5' : 'border-base-300'"
              @click="selectPresetInModal(preset)"
            >
              <div class="p-4 card-body">
                <div class="flex items-start gap-3">
                  <!-- Color Preview -->
                  <div class="flex gap-1 shrink-0">
                    <div class="w-6 h-6 rounded" :style="{ backgroundColor: preset.preview.primary }"></div>
                    <div class="w-6 h-6 rounded" :style="{ backgroundColor: preset.preview.secondary }"></div>
                  </div>
                  
                  <!-- Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 font-semibold">
                      {{ preset.name }}
                      <IconCheck v-if="selectedPreset.id === preset.id" class="w-4 h-4 text-primary" />
                    </div>
                    <div class="mt-1 text-xs opacity-70">{{ preset.description }}</div>
                    <div class="mt-1 text-xs opacity-50">
                      {{ preset.light }} / {{ preset.dark }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Actions -->
          <div class="modal-action">
            <button
              class="btn btn-ghost"
              @click="closeThemeModal"
              :disabled="isThemeLoading"
            >
              Cancel
            </button>
            <button
              class="btn btn-primary"
              :class="{ 'loading': isThemeLoading }"
              :disabled="isThemeLoading || selectedPreset.id === currentPreset.id"
              @click="saveTheme"
            >
              {{ isThemeLoading ? 'Saving...' : 'Save Theme' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
