<template>
  <div class="app-public-shell relative flex h-dvh items-center justify-center overflow-hidden p-3 sm:p-4">
    <!-- Theme controller (top-right) -->
    <div class="app-theme-toggle z-20">
      <label
        class="swap swap-rotate cursor-pointer"
        role="switch"
        :aria-checked="isDark"
        tabindex="0"
        @keydown.enter.prevent="toggleAuthTheme()"
        @keydown.space.prevent="toggleAuthTheme()"
      >
        <input
          type="checkbox"
          class="hidden"
          :checked="isDark"
          @change="toggleAuthTheme"
          aria-label="Toggle theme"
        />
        <svg xmlns="http://www.w3.org/2000/svg" class="swap-off h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" class="swap-on h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </label>
    </div>

    <!-- Card Container -->
    <div class="relative z-10 h-full w-full max-w-6xl">
      <RouterView />
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue';
import { useTheme } from '@/composables/core/useTheme';

const { isDark } = useTheme();

const authThemeStorageKey = 'gym:theme:mode'

const applyAuthTheme = () => {
  const themeName = isDark.value ? 'dynasty-club-night' : 'dynasty-club'
  document.documentElement.setAttribute('data-theme', themeName)
}

const toggleAuthTheme = () => {
  isDark.value = !isDark.value

  try {
    localStorage.setItem(authThemeStorageKey, isDark.value ? 'dark' : 'light')
  } catch (e) {}

  applyAuthTheme()
}

onMounted(() => {
  document.body.classList.add('auth-shell')
  document.documentElement.classList.add('auth-shell-root')

  try {
    const saved = localStorage.getItem(authThemeStorageKey)
    isDark.value = saved === 'dark'
  } catch (e) {
    isDark.value = false
  }

  applyAuthTheme()
});

onBeforeUnmount(() => {
  document.body.classList.remove('auth-shell')
  document.documentElement.classList.remove('auth-shell-root')
})
</script>
