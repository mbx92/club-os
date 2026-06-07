<template>
  <div class="member-layout flex min-h-screen flex-col">
    <!-- ── Top Bar ── -->
    <header class="member-topbar sticky top-0 z-50 flex h-[3.75rem] shrink-0 items-center border-b border-base-200 bg-base-100/85 backdrop-blur-lg">
      <div class="flex w-full items-center justify-between px-5">
        <!-- Left: Brand -->
        <div class="flex items-center gap-3">
          <img
            :src="logo"
            alt="Club OS"
            class="size-9 rounded-xl object-cover shadow-sm ring-1 ring-base-300"
          />
          <div class="hidden min-w-0 sm:block">
            <p class="text-[0.55rem] font-bold uppercase tracking-[0.3em] text-gym">Club OS</p>
            <h1 class="text-sm font-bold tracking-tight truncate">{{ tenantName }}</h1>
          </div>
        </div>

        <!-- Right: Actions -->
        <div class="flex items-center gap-2">
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

          <div class="dropdown dropdown-end">
            <div
              tabindex="0"
              role="button"
              class="flex cursor-pointer items-center gap-2.5 rounded-xl p-1.5 hover:bg-base-200 transition-colors"
            >
              <div class="avatar placeholder">
                <div class="app-shell-avatar w-8">
                  <span class="text-xs font-bold">{{ initials }}</span>
                </div>
              </div>
              <div class="hidden text-left md:block">
                <p class="max-w-[8.5rem] truncate text-xs font-semibold leading-tight">{{ displayName }}</p>
              </div>
            </div>
            <ul
              tabindex="0"
              class="dropdown-content menu mt-2 w-48 rounded-xl border border-base-200 bg-base-100 p-1.5 shadow-xl z-[100]"
            >
              <li>
                <button class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-error" @click="logout">
                  <IconLogout class="size-4 shrink-0" />
                  <span>Keluar</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </header>

    <!-- ── Main Content ── -->
    <main class="member-main flex-1">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/core/useTheme'
import { IconMoonStars, IconSun, IconLogout } from '@tabler/icons-vue'
import logo from '@/assets/dynasty-logo.jpg'

const auth = useAuthStore()
const router = useRouter()
const { isDark, toggleTheme, initTheme, setupThemeBroadcastListener } = useTheme()

onMounted(() => {
  initTheme()
  setupThemeBroadcastListener()
})

const tenantName = computed(() => auth.user?.tenant?.name || 'Club OS')

const displayName = computed(() =>
  auth.user?.name
  || auth.user?.username
  || auth.user?.email?.split('@')[0]
  || 'Member'
)

const initials = computed(() => {
  const s = displayName.value
  return s
    .toString()
    .split(/[^\w]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
})

async function logout() {
  try {
    await auth.logout()
    await router.push({ name: 'auth.login' })
  } catch {
    window.location.href = '/auth/login'
  }
}
</script>

<style scoped>
.member-layout {
  min-height: 100vh;
  min-height: 100dvh;
}

.member-topbar {
  box-shadow: 0 1px 0 0 color-mix(in oklab, var(--color-base-content) 5%, transparent);
}

.member-main {
  background: var(--color-base-200);
}
</style>
