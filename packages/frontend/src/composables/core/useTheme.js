import { ref, computed, watch, onMounted, inject } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotification } from './useNotification'
import { useApi } from './useApi'

const isDev = import.meta.env.DEV
const LEGACY_THEME_ALIASES = {
  dynasty: 'dynasty-club',
  'dynasty-night': 'dynasty-club-night',
}

// Available theme pairs
export const THEME_PRESETS = [
  {
    id: 'dynasty-club',
    name: 'Dynasty Club',
    description: 'Premium charcoal and gold palette with clean surfaces for the Dynasty Fitness brand',
    light: 'dynasty-club',
    dark: 'dynasty-club-night',
    preview: { primary: '#F4A823', secondary: '#1A1A2E' }
  },
  {
    id: 'professional',
    name: 'Executive Strength',
    description: 'Clean professional palette for backoffice-heavy workflows',
    light: 'corporate',
    dark: 'business',
    preview: { primary: '#3b82f6', secondary: '#1e40af' }
  },
  {
    id: 'warm',
    name: 'Warm Momentum',
    description: 'Autumn bronze palette for energetic fitness and wellness operations',
    light: 'autumn',
    dark: 'coffee',
    preview: { primary: '#f97316', secondary: '#78350f' }
  },
  {
    id: 'fresh',
    name: 'Fresh Recovery',
    description: 'Balanced green palette for wellness-focused environments',
    light: 'emerald',
    dark: 'forest',
    preview: { primary: '#10b981', secondary: '#065f46' }
  },
  {
    id: 'vibrant',
    name: 'Studio Pulse',
    description: 'Playful energy for class-heavy or youth-oriented operations',
    light: 'cupcake',
    dark: 'dracula',
    preview: { primary: '#ec4899', secondary: '#9333ea' }
  },
  {
    id: 'minimal',
    name: 'Minimal Focus',
    description: 'Simple bright light mode with crisp dark mode contrast',
    light: 'light',
    dark: 'night',
    preview: { primary: '#570df8', secondary: '#1e3a8a' }
  },
  {
    id: 'luxury',
    name: 'Championship',
    description: 'Cool premium palette with gold highlights for a high-end club feel',
    light: 'winter',
    dark: 'luxury',
    preview: { primary: '#3b82f6', secondary: '#fbbf24' }
  },
  {
    id: 'cyber',
    name: 'After Hours',
    description: 'Muted gray in daylight with a stylized neon dark mode',
    light: 'lofi',
    dark: 'synthwave',
    preview: { primary: '#6366f1', secondary: '#ec4899' }
  }
]

export function useTheme() {
  const authStore = useAuthStore()
  const { handleError } = useNotification()
  const api = useApi()
  
  const themeStorageKey = 'gym:theme:mode' // 'light' or 'dark'
  const themePresetCacheKey = 'gym:theme:preset' // cache last used preset
  const isDark = ref(false)
  const isLoading = ref(false)

  // Get cached preset from localStorage (fallback when not logged in)
  const getCachedPreset = () => {
    try {
      const cached = localStorage.getItem(themePresetCacheKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        const presetId = parsed.preset === 'dynasty' ? 'dynasty-club' : parsed.preset
        return THEME_PRESETS.find(p => p.id === presetId) || THEME_PRESETS[0]
      }
    } catch (e) {
      if (isDev) {
        console.error('[useTheme] Failed to get cached preset:', e)
      }
    }
    return THEME_PRESETS[0]
  }

  // Get current tenant theme preset from settings
  const currentPreset = computed(() => {
    const tenantTheme = authStore.tenantTheme
    if (isDev) {
      console.log('[useTheme] Computing currentPreset:', {
        tenantTheme,
        user: authStore.user?.email,
        hasSettings: !!authStore.user?.tenant?.settings
      })
    }
    
    // If user logged in and has tenant theme, use it
    if (tenantTheme?.preset) {
      const presetId = tenantTheme.preset === 'dynasty' ? 'dynasty-club' : tenantTheme.preset
      const preset = THEME_PRESETS.find(p => p.id === presetId) || THEME_PRESETS[0]
      if (isDev) {
        console.log('[useTheme] Preset from tenant:', preset.id)
      }
      return preset
    }
    
    // Otherwise use cached preset (for login page)
    const cached = getCachedPreset()
    if (isDev) {
      console.log('[useTheme] Preset from cache:', cached.id)
    }
    return cached
  })

  // Get light theme name
  const lightTheme = computed(() => {
    const theme = authStore.tenantTheme?.lightTheme || currentPreset.value.light
    const resolvedTheme = LEGACY_THEME_ALIASES[theme] || theme
    if (isDev) {
      console.log('[useTheme] Light theme:', resolvedTheme, 'from tenant:', authStore.tenantTheme?.lightTheme)
    }
    return resolvedTheme
  })

  // Get dark theme name
  const darkTheme = computed(() => {
    const theme = authStore.tenantTheme?.darkTheme || currentPreset.value.dark
    const resolvedTheme = LEGACY_THEME_ALIASES[theme] || theme
    if (isDev) {
      console.log('[useTheme] Dark theme:', resolvedTheme, 'from tenant:', authStore.tenantTheme?.darkTheme)
    }
    return resolvedTheme
  })

  // Current active theme name
  const currentTheme = computed(() => {
    return isDark.value ? darkTheme.value : lightTheme.value
  })

  // Apply theme to DOM
  const applyTheme = (dark) => {
    try {
      const themeName = dark ? darkTheme.value : lightTheme.value
      if (isDev) {
        console.log('[useTheme] Applying theme:', {
          isDark: dark,
          themeName,
          lightTheme: lightTheme.value,
          darkTheme: darkTheme.value,
          tenantTheme: authStore.tenantTheme
        })
      }
      document.documentElement.setAttribute('data-theme', themeName)
      if (isDev) {
        console.log('[useTheme] Theme applied to DOM:', themeName)
      }
    } catch (e) {
      if (isDev) {
        console.error('[useTheme] Failed to apply theme:', e)
      }
    }
  }

  // Toggle between light and dark
  const toggleTheme = () => {
    isDark.value = !isDark.value
    try {
      localStorage.setItem(themeStorageKey, isDark.value ? 'dark' : 'light')
    } catch (e) {
      if (isDev) {
        console.error('Failed to save theme mode:', e)
      }
    }
    applyTheme(isDark.value)
  }

  // Set specific mode
  const setThemeMode = (dark) => {
    isDark.value = dark
    try {
      localStorage.setItem(themeStorageKey, dark ? 'dark' : 'light')
    } catch (e) {}
    applyTheme(dark)
  }

  // Initialize theme on mount
  const initTheme = () => {
    // Clean up old theme system (ui_theme) - migration
    try {
      const oldTheme = localStorage.getItem('ui_theme')
      if (oldTheme) {
        if (isDev) {
          console.log('[useTheme] Migrating old theme system (ui_theme) to new system (gym:theme:mode)')
        }
        // Migrate to new system if no new value exists
        const newTheme = localStorage.getItem(themeStorageKey)
        if (!newTheme) {
          localStorage.setItem(themeStorageKey, oldTheme)
        }
        // Remove old key
        localStorage.removeItem('ui_theme')
        if (isDev) {
          console.log('[useTheme] Old theme system cleaned up')
        }
      }
    } catch (e) {
      if (isDev) {
        console.error('[useTheme] Failed to migrate old theme:', e)
      }
    }
    
    try {
      const saved = localStorage.getItem(themeStorageKey)
      if (saved === 'dark') isDark.value = true
      else if (saved === 'light') isDark.value = false
      else isDark.value = false // default light
    } catch (e) {
      isDark.value = false
    }
    applyTheme(isDark.value)
  }

  // Update tenant theme settings via API
  const updateTenantTheme = async (themeSettings) => {
    if (!api) {
      console.warn('[useTheme] API not available - cannot update tenant theme')
      return { success: false, error: 'API not available' }
    }
    
    isLoading.value = true
    if (isDev) {
      console.log('[useTheme] Updating tenant theme:', themeSettings)
    }
    try {
      // themeSettings should be: { preset: 'professional', lightTheme: 'corporate', darkTheme: 'business' }
      const response = await api.patch('/tenants/settings', {
        theme: themeSettings
      })
      
      if (isDev) {
        console.log('[useTheme] API response:', response)
      }
      
      if (response.success) {
        if (isDev) {
          console.log('[useTheme] Theme update successful, updating local state')
        }
        
        // Cache theme preset to localStorage (for login page)
        try {
          localStorage.setItem(themePresetCacheKey, JSON.stringify(themeSettings))
          if (isDev) {
            console.log('[useTheme] Theme cached to localStorage')
          }
        } catch (e) {
          if (isDev) {
            console.error('[useTheme] Failed to cache theme:', e)
          }
        }
        
        // Update local user data - ensure structure exists
        if (authStore.user?.tenant) {
          // Create settings object if it doesn't exist
          if (!authStore.user.tenant.settings) {
            if (isDev) {
              console.log('[useTheme] Creating settings object')
            }
            authStore.user.tenant.settings = {}
          }
          
          if (isDev) {
            console.log('[useTheme] Before update:', authStore.user.tenant.settings.theme)
          }
          authStore.user.tenant.settings.theme = themeSettings
          if (isDev) {
            console.log('[useTheme] After update:', authStore.user.tenant.settings.theme)
          }
          
          // Update storage
          const storage = localStorage.getItem('user') ? localStorage : sessionStorage
          storage.setItem('user', JSON.stringify(authStore.user))
          if (isDev) {
            console.log('[useTheme] Updated storage')
          }
        } else {
          if (isDev) {
            console.warn('[useTheme] Cannot update theme - user.tenant not found')
          }
        }
        
        // Broadcast theme change to other tabs
        try {
          localStorage.setItem('gym:theme:broadcast', JSON.stringify({
            timestamp: Date.now(),
            theme: themeSettings
          }))
          if (isDev) {
            console.log('[useTheme] Broadcast sent')
          }
        } catch (e) {
          if (isDev) {
            console.error('[useTheme] Failed to broadcast theme change:', e)
          }
        }
        
        // Force re-apply theme with new settings (live change!)
        if (isDev) {
          console.log('[useTheme] Re-applying theme in 50ms...')
        }
        setTimeout(() => {
          if (isDev) {
            console.log('[useTheme] Now applying theme')
          }
          applyTheme(isDark.value)
        }, 50)
        
        return { success: true }
      }
      
      throw new Error(response.message || 'Failed to update theme')
    } catch (error) {
      if (isDev) {
        console.error('[useTheme] Update tenant theme error:', error)
      }
      const errorMsg = handleError(error, 'Failed to update theme settings')
      return {
        success: false,
        error: errorMsg
      }
    } finally {
      isLoading.value = false
    }
  }

  // Listen for theme changes from other tabs/windows
  const setupThemeBroadcastListener = () => {
    if (typeof window === 'undefined') return
    
    const handleStorageChange = (e) => {
      if (e.key === 'gym:theme:broadcast' && e.newValue) {
        try {
          const broadcast = JSON.parse(e.newValue)
          if (broadcast.theme && authStore.user?.tenant) {
            // Create settings object if it doesn't exist
            if (!authStore.user.tenant.settings) {
              authStore.user.tenant.settings = {}
            }
            
            // Update local user data from broadcast
            authStore.user.tenant.settings.theme = broadcast.theme
            
            // Re-apply theme
            applyTheme(isDark.value)
            
            if (isDev) {
              console.log('[useTheme] Theme updated from another tab:', broadcast.theme)
            }
          }
        } catch (err) {
          if (isDev) {
            console.error('[useTheme] Failed to parse theme broadcast:', err)
          }
        }
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }

  // Watch for tenant theme changes (from any source)
  watch(() => authStore.tenantTheme, (newTheme, oldTheme) => {
    if (isDev) {
      console.log('[useTheme] Tenant theme watcher triggered:', {
        newTheme,
        oldTheme,
        changed: JSON.stringify(newTheme) !== JSON.stringify(oldTheme)
      })
    }
    if (newTheme) {
      if (isDev) {
        console.log('[useTheme] Re-applying theme from watcher')
      }
      applyTheme(isDark.value)
    }
  }, { deep: true, immediate: false })

  return {
    isDark,
    isLoading,
    currentTheme,
    lightTheme,
    darkTheme,
    currentPreset,
    THEME_PRESETS,
    toggleTheme,
    setThemeMode,
    initTheme,
    updateTenantTheme,
    setupThemeBroadcastListener
  }
}
