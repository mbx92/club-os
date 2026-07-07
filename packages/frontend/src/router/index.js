import { createRouter, createWebHistory } from 'vue-router'
import generatedRoutes from 'virtual:generated-pages'
import { setupLayouts } from './setupLayouts'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'
import { checkPermission } from '@/composables/usePermissions'
import { debug } from '@/utils/debug'

// Wrap pages with layouts
const routes = setupLayouts([
  ...generatedRoutes,
  // Catch-all route untuk 404 - harus di akhir
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/404'
  }
])

const router = createRouter({
  history: createWebHistory(),
  routes,
})

/**
 * Get the appropriate dashboard based on available modules
 * Priority: gym > restaurant > default (/)
 */
const getAvailableDashboard = (subscriptionStore, isSuperAdmin) => {
  // Super admin gets default dashboard
  if (isSuperAdmin) return '/'

  const modules = subscriptionStore.features?.modules || {}

  // Check available modules in priority order
  if (modules.gym) return '/'
  if (modules.restaurant) return '/restaurant'
  if (modules.nutrition) return '/nutrition'

  // Default fallback
  return '/'
}

// Redirect loop detection - track navigation history to prevent infinite loops
const navigationHistory = new Map()
const MAX_SAME_PATH_REDIRECTS = 3
const HISTORY_TTL = 5000 // 5 seconds

const checkRedirectLoop = (path) => {
  const now = Date.now()
  const history = navigationHistory.get(path) || { count: 0, timestamp: now }

  // Reset if TTL expired
  if (now - history.timestamp > HISTORY_TTL) {
    navigationHistory.set(path, { count: 1, timestamp: now })
    return false
  }

  // Increment counter
  history.count++
  history.timestamp = now
  navigationHistory.set(path, history)

  // Check if exceeded max redirects
  if (history.count > MAX_SAME_PATH_REDIRECTS) {
    debug.error('🚨 REDIRECT LOOP DETECTED for path:', path, 'Count:', history.count)
    navigationHistory.delete(path) // Reset
    return true
  }

  return false
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [path, history] of navigationHistory.entries()) {
    if (now - history.timestamp > HISTORY_TTL) {
      navigationHistory.delete(path)
    }
  }
}, HISTORY_TTL)

// Global guard (single beforeEach)
router.beforeEach(async (to, from) => {
  // Check for redirect loops FIRST
  if (checkRedirectLoop(to.path)) {
    debug.error('🚨 Blocking navigation due to redirect loop. Redirecting to home.')
    return { path: '/', replace: true }
  }
  const auth = useAuthStore()
  const subscriptionStore = useSubscriptionStore()

  const isPublic = to.meta?.public === true
  const allowAuthenticated = to.meta?.allowAuthenticated === true
  const hasToken = !!(localStorage.getItem('token') || sessionStorage.getItem('token'))

  debug.log('🔒 Router Guard:', {
    from: from.path,
    to: to.path,
    hasToken,
    hasUser: !!auth.user,
    isPublic,
    allowAuthenticated
  })

  // Public error pages (full-screen, no sidebar)
  if (to.path === '/404' || to.path === '/core/errors/no-subscription' || to.name === 'NotFound' || to.name === 'errors.404' || to.name === 'core-errors-no-subscription') {
    debug.log('✅ Allowing public error page')
    return true
  }

  // Allow public routes immediately
  if (isPublic) {
    debug.log('✅ Public route - allowing access')
    return true
  }

  // Special case: If coming FROM login page TO login page, always allow
  // This prevents redirect loops when showing error messages
  if (from.path === '/auth/login' && to.path === '/auth/login') {
    debug.log('✅ Staying on login page (from login to login)')
    return true
  }

  // Don't fetch profile when going to /login (to avoid logout "pulling back")
  // Also skip if we're already on login page to prevent interference with error display
  if (hasToken && !auth.user && to.path !== '/auth/login') {
    try {
      await auth.initializeAuth()
    } catch (error) {
      // If initialization fails, clear tokens
      debug.warn('Failed to initialize auth:', error)
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('refreshToken')
      sessionStorage.removeItem('user')
    }
  }

  // Not logged in but trying to access private page → go to /login
  if (!isPublic && !(auth.user || hasToken)) {
    return { path: '/auth/login', query: { redirect: to.fullPath } }
  }

  // Public page, but already logged in → throw to redirect or /
  // Exception: Don't redirect away from /auth/login if user is not fully authenticated
  // Exception: Don't redirect away from error pages
  // This allows error messages to be shown after failed login attempts
  if (isPublic && !allowAuthenticated) {
    // Don't redirect from error pages - let user see the error
    if (to.path.startsWith('/core/errors/') || to.path === '/403' || to.path === '/404') {
      debug.log('✅ Allowing authenticated user to view error page:', to.path)
      return true
    }

    // Only redirect if we have both token AND user (fully authenticated)
    if (auth.user && hasToken) {
      // Wait for subscription to load first to determine available modules
      if (!subscriptionStore.subscription && !subscriptionStore.loading) {
        try {
          await subscriptionStore.fetchSubscription()
        } catch (err) {
          debug.warn('[Router Guard] Failed to fetch subscription for redirect:', err)
        }
      }

      const redirect = to.query.redirect?.toString()
      // If no explicit redirect, determine based on available modules
      const isSuperAdmin = auth.user?.isSuperAdmin === true
      
      // Check if user is member — redirect to member dashboard
      const userRoleName = typeof auth.user?.role === 'string'
        ? (auth.user.role || '').toLowerCase()
        : (auth.user?.role?.name || '').toLowerCase()
      const isMember = userRoleName === 'member'
      
      const defaultDashboard = isMember
        ? '/member/dashboard'
        : getAvailableDashboard(subscriptionStore, isSuperAdmin)
      
      const redirectTo = redirect || defaultDashboard

      debug.log('🔄 Redirecting authenticated user from public page to:', redirectTo)
      return redirectTo
    }
    // If we have token but no user, stay on the page (likely failed auth)
    if (hasToken && !auth.user) {
      debug.log('⚠️ Has token but no user - staying on page:', to.path)
      return true
    }
    debug.log('✅ Public page access allowed')
  }

  // Skip subscription checks for super admin
  const isSuperAdmin = auth.user?.isSuperAdmin === true

  // AGGRESSIVE PROTECTION: Check if user has active subscription
  const allowedWithoutSubscription = [
    '/subscription',
    '/auth',
    '/core/errors',
    '/404',
    '/403',
    '/member'
  ]

  const isAllowedRoute = allowedWithoutSubscription.some(route => to.path.startsWith(route))

  if (!isPublic && auth.user && !isAllowedRoute && !isSuperAdmin) {
    try {
      await subscriptionStore.ensureSubscriptionLoaded()
    } catch (err) {
      debug.warn('[Router Guard] Failed to ensure subscription loaded:', err)
    }

    // Check if user has subscription
    if (!subscriptionStore.hasSubscription && !subscriptionStore.isTrialActive) {
      debug.warn('[Router Guard] 🚫 BLOCKED - No active subscription detected')

      // Prevent redirect loop - don't redirect if already on error page
      if (to.path === '/core/errors/no-subscription') {
        debug.log('[Router Guard] Already on no-subscription page, allowing access')
        return true
      }

      // HARD BLOCK: Force redirect to no-subscription error page
      return { path: '/core/errors/no-subscription', replace: true }
    }
  }

  // Check module access (feature gating) - skip for super admin
  if (!isPublic && to.meta?.requiresModule && auth.user && !isSuperAdmin) {
    const requiredModule = to.meta.requiresModule
    const hasAccess = subscriptionStore.hasModule(requiredModule)

    debug.log('[Router Guard] Checking module access:', {
      module: requiredModule,
      hasAccess,
      path: to.path
    })

    if (!hasAccess) {
      debug.warn('[Router Guard] 🚫 BLOCKED - Module access denied:', requiredModule)

      // Find available dashboard
      const availableDashboard = getAvailableDashboard(subscriptionStore, isSuperAdmin)

      // Only redirect if available dashboard is different from current path
      // This prevents redirect loops
      const isErrorPage = to.path === '/404' || to.path === '/403' || to.path.startsWith('/core/errors/')
      if (availableDashboard && availableDashboard !== to.path && !isErrorPage) {
        debug.log('[Router Guard] Redirecting to available dashboard:', availableDashboard)
        return { path: availableDashboard, replace: true }
      }

      // If trying to access error page, allow it to prevent loops
      if (isErrorPage) {
        debug.log('[Router Guard] Allowing access to error page')
        return true
      }

      // Prevent redirect loop - don't redirect if already on subscription page
      if (to.path === '/subscription' || to.path.startsWith('/subscription/')) {
        debug.log('[Router Guard] Already on subscription page, allowing access')
        return true
      }

      // Show upgrade modal and redirect to subscription page
      subscriptionStore.showUpgradeModal({
        type: 'module',
        module: requiredModule,
        message: `Module ${requiredModule} tidak tersedia di plan Anda`,
        currentPlan: subscriptionStore.currentPlan
      })

      debug.log('[Router Guard] Redirecting to subscription page')
      return { path: '/subscription', replace: true }
    }
  }

  // Auto-redirect from root to appropriate dashboard based on available modules
  if (to.path === '/' && auth.user && !isSuperAdmin) {
    // Resolve role name — role can be a string ('Member') or object ({ name: 'Member' })
    const userRoleName = typeof auth.user?.role === 'string'
      ? (auth.user.role || '').toLowerCase()
      : (auth.user?.role?.name || '').toLowerCase()

    // Check if user is member — redirect to member dashboard
    const isMember = userRoleName === 'member'
    if (isMember) {
      debug.log('[Router Guard] Member role detected, redirecting to member dashboard')
      return { path: '/member/dashboard', replace: true }
    }

    const modules = subscriptionStore.features?.modules || {}

    // If user doesn't have gym module but has others, redirect
    if (!modules.gym) {
      const availableDashboard = getAvailableDashboard(subscriptionStore, isSuperAdmin)
      if (availableDashboard !== '/') {
        debug.log('[Router Guard] Root redirect - No gym module, redirecting to:', availableDashboard)
        return { path: availableDashboard, replace: true }
      }
    }
  }

  // Check role-based access (must be before other checks)
  if (!isPublic && to.meta?.requiresRole && auth.user) {
    const requiredRole = to.meta.requiresRole
    const userRole = auth.user.role
    const isSuperAdmin = auth.user.isSuperAdmin

    debug.log('[Router Guard] Checking role:', { requiredRole, userRole, isSuperAdmin, path: to.path })

    // If route requires super-admin but user is not super-admin
    if (requiredRole === 'super-admin' && !isSuperAdmin) {
      debug.log('[Router Guard] Access denied - redirecting to 403')
      return {
        path: '/403',
        query: { from: to.fullPath, reason: 'role' },
        replace: true,
      }
    }
  }

  // Check permission if private page and has meta.action + meta.subject
  if (!isPublic && to.meta?.action && to.meta?.subject) {
    // Only enforce if user is not super-admin
    if (!isSuperAdmin) {
      const action = to.meta.action
      const subject = to.meta.subject

      if (!checkPermission(action, subject)) {
        debug.log('[Router Guard] Permission denied:', { action, subject, path: to.path })
        return {
          path: '/403',
          query: { from: to.fullPath, reason: 'permission' },
          replace: true,
        }
      }
    }
  }

  // Set document title - use VITE_APP_TITLE or tenant name when available
  const appSuffix = import.meta.env.VITE_APP_TITLE || 'Gym Management'
  if (to.meta?.title) {
    document.title = `${to.meta.title} - ${appSuffix}`
  } else {
    const tenantName = auth.user?.tenant?.name || appSuffix
    document.title = tenantName
  }

  return true
})

export default router
