<template>
  <div class="app-public-shell relative min-h-screen">
    <!-- Theme switcher in top right corner -->
    <div class="app-theme-toggle">
      <label
        class="swap swap-rotate cursor-pointer"
        role="switch"
        :aria-checked="isDark"
        tabindex="0"
        @keydown.enter.prevent="toggleTheme()"
        @keydown.space.prevent="toggleTheme()"
      >
        <input
          type="checkbox"
          class="hidden"
          :checked="isDark"
          @change="toggleTheme"
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

    <RouterView />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useTheme } from '@/composables/core/useTheme';

const { initTheme, toggleTheme, isDark, setupThemeBroadcastListener } = useTheme();

onMounted(() => {
  initTheme();
  setupThemeBroadcastListener();
});
</script>
