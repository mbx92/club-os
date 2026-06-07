import { ref, computed, watch } from 'vue'

/**
 * Theme management composable (light/dark)
 * Persists preference to localStorage and applies data-theme attribute.
 *
 * @returns {{ current: ComputedRef<'dynasty-club'|'dynasty-club-night'>, isDark: ComputedRef<boolean>, toggle: () => void, setDark: (d: boolean) => void }}
 */
export function useTheme() {
  const THEME_KEY = 'dynasty-theme'
  const LIGHT = 'dynasty-club'
  const DARK = 'dynasty-club-night'

  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_KEY) : null
  const theme = ref(stored === DARK ? DARK : LIGHT)

  const current = computed(() => theme.value)
  const isDark = computed(() => theme.value === DARK)

  /** Apply the theme to document root */
  function applyTheme(value) {
    theme.value = value
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', value)
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_KEY, value)
    }
  }

  /** Toggle between light and dark */
  function toggle() {
    applyTheme(theme.value === LIGHT ? DARK : LIGHT)
  }

  /**
   * Set dark mode explicitly
   * @param {boolean} dark
   */
  function setDark(dark) {
    applyTheme(dark ? DARK : LIGHT)
  }

  // initial apply
  applyTheme(theme.value)

  // sync with system preference if no stored value
  if (!stored && typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    if (mq.matches) {
      applyTheme(DARK)
    }
    mq.addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(e.matches ? DARK : LIGHT)
      }
    })
  }

  return { current, isDark, toggle, setDark, LIGHT, DARK }
}
