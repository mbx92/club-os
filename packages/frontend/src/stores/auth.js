import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'
import { debug, isDebug as isDev } from '@/utils/debug'

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))
  const refreshToken = ref(localStorage.getItem('refreshToken'))
  const permissions = ref(null)

  const isAuthenticated = computed(() => !!token.value)

  const getActiveStorage = () => {
    return localStorage.getItem('token') ? localStorage : sessionStorage
  }

  const persistUser = (nextUser) => {
    if (!nextUser) return
    const storage = getActiveStorage()
    storage.setItem('user', JSON.stringify(nextUser))
  }

  const persistPermissions = (nextPermissions) => {
    if (!nextPermissions) return
    const storage = getActiveStorage()
    storage.setItem('permissions', JSON.stringify(nextPermissions))
  }

  const mergePermissionUser = (permissionUser) => {
    if (!permissionUser) return

    user.value = {
      ...user.value,
      id: permissionUser.id ?? user.value?.id,
      email: permissionUser.email ?? user.value?.email,
      firstName: permissionUser.firstName ?? user.value?.firstName,
      lastName: permissionUser.lastName ?? user.value?.lastName,
      isSuperAdmin: permissionUser.isSuperAdmin ?? user.value?.isSuperAdmin,
      tenantId: permissionUser.tenantId ?? user.value?.tenantId,
      role: permissionUser.role ?? user.value?.role,
    }

    persistUser(user.value)
  }

  const syncSubscriptionFromPermissions = async (permissionPayload) => {
    if (!permissionPayload?.subscription) return

    try {
      const { useSubscriptionStore } = await import('@/stores/subscription')
      const subscriptionStore = useSubscriptionStore()
      subscriptionStore.setData(permissionPayload.subscription)
    } catch (error) {
      debug.warn('[authStore] Failed to sync subscription from permissions payload:', error)
    }
  }
  
  // Get tenant theme settings from tenant.settings.theme
  const tenantTheme = computed(() => {
    const theme = user.value?.tenant?.settings?.theme || null
    debug.log('[authStore] tenantTheme computed:', {
      hasUser: !!user.value,
      hasTenant: !!user.value?.tenant,
      hasSettings: !!user.value?.tenant?.settings,
      theme
    })
    return theme
  })

  // Initialize auth state from storage
  const initializeAuth = async () => {
    if (isDev) debug.log('Initializing auth state...')
    
    // Try localStorage first (for "remember me" functionality)
    let savedToken = localStorage.getItem('token')
    let savedRefreshToken = localStorage.getItem('refreshToken')
    let savedUser = localStorage.getItem('user')
    let savedPermissions = localStorage.getItem('permissions')
    
    if (isDev) debug.log('localStorage token:', savedToken)
    
    // If not in localStorage, try sessionStorage
    if (!savedToken) {
      savedToken = sessionStorage.getItem('token')
      savedRefreshToken = sessionStorage.getItem('refreshToken')
      savedUser = sessionStorage.getItem('user')
      savedPermissions = sessionStorage.getItem('permissions')
      
      if (isDev) debug.log('sessionStorage token:', savedToken)
    }
    
    if (savedToken && savedRefreshToken && savedUser) {
      token.value = savedToken
      refreshToken.value = savedRefreshToken
      user.value = JSON.parse(savedUser)
      api.setToken(savedToken)
      
      // Load permissions if available
      if (savedPermissions) {
        permissions.value = JSON.parse(savedPermissions)
        if (isDev) debug.log('Permissions loaded from storage:', permissions.value)
      }
      
      // Fetch tenant settings if not present
      if (user.value?.tenant?.id && !user.value?.tenant?.settings) {
        if (isDev) debug.log('[authStore] Tenant settings not found in storage, fetching...')
        fetchTenantSettings().catch(err => {
          debug.warn('[authStore] Failed to fetch tenant settings on init:', err)
        })
      }
      
      // NOTE: Don't fetch subscription here - it's already loaded from localStorage cache
      // Subscription store automatically loads from cache on init
      if (isDev) debug.log('[authStore] Subscription will be loaded from cache by subscription store')

      fetchUserPermissions().catch(err => {
        debug.warn('[authStore] Failed to refresh permissions on init, keeping cached permissions:', err)
      })
      
      if (isDev) debug.log('Auth state initialized successfully')
    } else {
      if (isDev) debug.log('No valid auth tokens found in storage')
    }
  }

  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials)
      
      if (response.token && response.refreshToken) {
        // Save tokens and user data
        token.value = response.token
        refreshToken.value = response.refreshToken
        user.value = response.user
        
        // Determine storage method based on rememberMe
        const storage = credentials.rememberMe ? localStorage : sessionStorage
        
        // Save to selected storage
        storage.setItem('token', response.token)
        storage.setItem('refreshToken', response.refreshToken)
        storage.setItem('user', JSON.stringify(response.user))
        
        // Debug: Verify tokens are stored
        if (isDev) {
          debug.log('Token stored in', credentials.rememberMe ? 'localStorage' : 'sessionStorage')
          debug.log('Token:', storage.getItem('token'))
        }
        
        // Update API service token
        api.setToken(response.token)
        
        // Check if permissions included in login response (new backend behavior)
        if (response.permissions) {
          permissions.value = response.permissions
          if (isDev) debug.log('[authStore] Permissions included in login response:', permissions.value)
        } else {
          // Fallback: Fetch user permissions from separate endpoint (backward compatibility)
          try {
            await fetchUserPermissions()
            if (isDev) debug.log('[authStore] Permissions fetched from endpoint:', permissions.value)
          } catch (err) {
            debug.error('[authStore] Failed to fetch permissions after login:', err)
            // Continue login even if permissions fetch fails
          }
        }
        
        // Fetch tenant settings (including theme)
        try {
          await fetchTenantSettings()
        } catch (err) {
          debug.error('[authStore] Failed to fetch tenant settings after login:', err)
          // Continue login even if tenant settings fetch fails
        }
        
        // Handle subscription from permissions or fetch separately
        const { useSubscriptionStore } = await import('@/stores/subscription')
        const subscriptionStore = useSubscriptionStore()
        
        if (response.permissions?.subscription) {
          // Subscription included in permissions response
          try {
            subscriptionStore.setData(response.permissions.subscription)
            if (isDev) debug.log('[authStore] Subscription from login response:', {
              hasSubscription: subscriptionStore.hasSubscription,
              isTrialActive: subscriptionStore.isTrialActive
            })
          } catch (err) {
            debug.warn('[authStore] Failed to set subscription from response:', err)
          }
        } else {
          // Fetch subscription separately (backward compatibility)
          try {
            await subscriptionStore.fetchSubscription(true) // force=true to bypass cache
            if (isDev) debug.log('[authStore] Subscription fetched from API:', {
              hasSubscription: subscriptionStore.hasSubscription,
              isTrialActive: subscriptionStore.isTrialActive
            })
          } catch (err) {
            debug.warn('[authStore] Failed to fetch subscription after login:', err)
            // Don't fail login if subscription fetch fails
          }
        }
        
        // Save permissions to storage
        if (permissions.value) {
          storage.setItem('permissions', JSON.stringify(permissions.value))
          if (isDev) debug.log('[authStore] Permissions saved to storage:', permissions.value)
        } else {
          if (isDev) debug.warn('[authStore] No permissions to save - permissions.value is:', permissions.value)
        }
        
        if (isDev) {
          debug.log('[authStore] Login completed:', {
            hasToken: !!token.value,
            hasUser: !!user.value,
            hasPermissions: !!permissions.value,
            permissionsKeys: permissions.value ? Object.keys(permissions.value) : [],
            permissionsStructure: permissions.value ? {
              hasResources: !!(permissions.value.resources && Object.keys(permissions.value.resources).length),
              resourceCount: permissions.value.resources ? Object.keys(permissions.value.resources).length : 0,
              menuAccessCount: permissions.value.menuAccess?.length || 0
            } : null
          })
        }
        
        return {
          success: true,
          user: response.user,
          permissions: permissions.value
        }
      }
      
      throw new Error('Invalid response from server')
    } catch (error) {
      debug.error('Login error:', error)
      debug.log('Error structure:', {
        code: error.code,
        message: error.message,
        data: error.data,
        statusCode: error.statusCode
      })
      
      // Clear any existing tokens on failed login
      token.value = null
      refreshToken.value = null
      user.value = null
      permissions.value = null
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      localStorage.removeItem('permissions')
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('refreshToken')
      sessionStorage.removeItem('user')
      sessionStorage.removeItem('permissions')
      api.setToken(null)
      
      // Parse error from various possible locations
      // Priority: error.data (direct API response) > error.code/message (thrown error)
      const errorCode = error.data?.code || error.code || 'LOGIN_FAILED'
      const errorMessage = error.data?.message || error.message || 'Login failed'
      
      debug.log('Parsed error:', { errorCode, errorMessage })
      
      return {
        success: false,
        code: errorCode,
        message: errorMessage,
        error: errorMessage
      }
    }
  }

  const fetchUserPermissions = async () => {
    try {
      const response = await api.get('/permissions/user')
      
      if (isDev) {
        debug.log('[authStore] fetchUserPermissions response:', response)
      }
      
      // Handle different response formats from backend
      let perms = null
      
      if (response.success && response.data?.permissions) {
        perms = response.data.permissions
      } else if (response.data?.permissions) {
        perms = response.data.permissions
      } else if (response.success && response.data?.resources) {
        perms = response.data
      } else if (response.data?.resources) {
        perms = response.data
      } else if (response.permissions) {
        perms = response.permissions
      }
      
      if (perms) {
        permissions.value = perms
        mergePermissionUser(perms.user)
        persistPermissions(perms)
        await syncSubscriptionFromPermissions(perms)
        if (isDev) debug.log('[authStore] Permissions set:', {
          hasResources: !!(perms.resources && Object.keys(perms.resources).length),
          resourceCount: perms.resources ? Object.keys(perms.resources).length : 0,
          menuAccessCount: perms.menuAccess?.length || 0
        })
        return permissions.value
      }
      
      debug.warn('[authStore] No permissions found in response, using empty permissions')
      // Set minimal empty permissions structure so menu can show with lenient mode
      permissions.value = {
        resources: {},
        menuAccess: [],
        uiFlags: {}
      }
      return null
    } catch (error) {
      debug.error('[authStore] Fetch permissions error:', error)
      throw error
    }
  }

  const fetchTenantSettings = async () => {
    try {
      if (!user.value?.tenant?.id) {
        debug.warn('[authStore] No tenant ID available')
        return null
      }
      
      debug.log('[authStore] Fetching tenant settings for:', user.value.tenant.id)
      const response = await api.get(`/tenants/${user.value.tenant.id}`)
      
      if (response && response.settings) {
        debug.log('[authStore] Tenant settings fetched:', response.settings)
        
        // Update user.tenant with full data including settings
        if (user.value.tenant) {
          user.value.tenant.settings = response.settings
          
          // Update storage
          const storage = localStorage.getItem('user') ? localStorage : sessionStorage
          storage.setItem('user', JSON.stringify(user.value))
          
          debug.log('[authStore] Tenant settings updated in user object')
          
          // Cache theme preset to localStorage (for login page)
          if (response.settings.theme) {
            try {
              localStorage.setItem('gym:theme:preset', JSON.stringify(response.settings.theme))
              debug.log('[authStore] Theme preset cached to localStorage')
            } catch (e) {
              debug.error('[authStore] Failed to cache theme preset:', e)
            }
          }
        }
        
        return response.settings
      }
      
      throw new Error('Failed to fetch tenant settings')
    } catch (error) {
      debug.error('[authStore] Fetch tenant settings error:', error)
      return null
    }
  }

  const logout = async () => {
    try {
      if (refreshToken.value) {
        // Call logout endpoint to invalidate refresh token
        await api.post('/auth/logout', { refreshToken: refreshToken.value })
      }
    } catch (error) {
      debug.error('Logout error:', error)
    } finally {
      // Clear local state regardless of API call success
      token.value = null
      refreshToken.value = null
      user.value = null
      permissions.value = null
      
      // Clear both localStorage and sessionStorage
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      localStorage.removeItem('permissions')
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('refreshToken')
      sessionStorage.removeItem('user')
      sessionStorage.removeItem('permissions')
      
      // Clear subscription store data
      try {
        const { useSubscriptionStore } = await import('./subscription')
        const subscriptionStore = useSubscriptionStore()
        subscriptionStore.reset()
      } catch (error) {
        debug.error('[authStore] Failed to reset subscription store:', error)
      }
      
      // Update API service
      api.removeToken()
      
      // Don't redirect here - let the caller handle navigation
      // This prevents race conditions with router guards
    }
  }

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData)
      
      if (response.token) {
        showSuccess('Registration successful')
        return {
          success: true,
          token: response.token
        }
      }
      
      throw new Error('Invalid response from server')
    } catch (error) {
      debug.error('Registration error:', error)
      const errorMsg = handleError(error, 'Registration failed')
      return {
        success: false,
        error: errorMsg
      }
    }
  }

  const refreshAccessToken = async () => {
    try {
      if (!refreshToken.value) {
        throw new Error('No refresh token available')
      }
      
      const response = await api.post('/auth/refresh-token', {
        refreshToken: refreshToken.value
      })
      
      if (response.token) {
        token.value = response.token
        
        // Determine which storage to use (localStorage or sessionStorage)
        const storage = localStorage.getItem('token') ? localStorage : sessionStorage
        
        // Update token in the same storage it was originally stored
        storage.setItem('token', response.token)
        api.setToken(response.token)
        
        // Update permissions if included in refresh response
        if (response.permissions) {
          permissions.value = response.permissions
          storage.setItem('permissions', JSON.stringify(response.permissions))
          if (isDev) debug.log('[authStore] Permissions updated from refresh token:', permissions.value)
        }
        
        return response.token
      }
      
      throw new Error('Invalid response from server')
    } catch (error) {
      debug.error('Token refresh error:', error)
      
      // If refresh token is invalid, logout the user
      if (error.message.includes('invalid') || error.message.includes('expired')) {
        await logout()
      }
      
      throw error
    }
  }

  return {
    user,
    token,
    refreshToken,
    permissions,
    isAuthenticated,
    tenantTheme,
    initializeAuth,
    login,
    logout,
    register,
    fetchUserPermissions,
    fetchTenantSettings,
    refreshAccessToken
  }
})
