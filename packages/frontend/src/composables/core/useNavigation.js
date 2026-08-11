import { computed } from 'vue'
import { navigation, getNavigationByMode } from '@/navigation/navigation.js'
import { useTenantFeaturesStore } from '@/stores/tenantFeatures'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'
import { checkPermission } from '@/composables/usePermissions'
import { debug } from '@/utils/debug'

const isDev = import.meta.env.DEV

/**
 * Composable untuk mengelola navigation berdasarkan mode tenant dan user permissions.
 * Menu visibility now comes from backend menuAccess array — single source of truth.
 */
export function useNavigation() {
  const tenantFeatures = useTenantFeaturesStore()
  const authStore = useAuthStore()
  const subscriptionStore = useSubscriptionStore()

  const isSuperAdmin = computed(() => {
    return authStore.user?.isSuperAdmin === true
  })

  /**
   * Tenant admin (role "admin" or "owner") sees all menus.
   * Their access is only gated by subscription modules, not backend menuAccess.
   */
  const isTenantAdmin = computed(() => {
    const role = authStore.user?.role
    const name = typeof role === 'string' ? role : role?.name
    return name === 'admin' || name === 'owner'
  })

  /**
   * Check if user has permission for the given action+subject.
   */
  const canAccess = (action, subject) => {
    return checkPermission(action, subject)
  }

  /**
   * Check module/feature subscription access.
   */
  const hasSubscriptionAccess = (item) => {
      if (isSuperAdmin.value || isTenantAdmin.value) return true

    if (item.requireModule) {
      if (!subscriptionStore.hasModule(item.requireModule)) return false
    }

    if (item.requireFeature) {
      // Support flat string ("vouchers") and { category, name } ("transactions.vouchers")
      const feat = item.requireFeature
      const featureKey = typeof feat === 'string'
        ? feat
        : (feat.category && feat.name ? `${feat.category}.${feat.name}` : feat.name)
      if (!subscriptionStore.hasFeature(featureKey)) return false
    }

    return true
  }

  /**
   * Get allowed menu keys for current user — from backend menuAccess array.
   * null = show all (superAdmin).
   */
  const getAllowedMenuKeysForUser = () => {
    if (isSuperAdmin.value || isTenantAdmin.value) return null
    return authStore.permissions?.menuAccess || []
  }

  /**
   * Check if a menu item is allowed by backend menuAccess + subscription.
   */
  const isMenuAllowed = (item) => {
      if (isSuperAdmin.value || isTenantAdmin.value) return true
    if (!item.menuKey) return true

    const allowed = getAllowedMenuKeysForUser()
    if (allowed === null) return true
    return allowed.includes(item.menuKey)
  }

  /**
   * Filter a single navigation item based on menuAccess + subscription access.
   */
  const hasModuleAccess = (item) => {
      if (isSuperAdmin.value || isTenantAdmin.value) return true
    if (!isMenuAllowed(item)) return false
    if (!hasSubscriptionAccess(item)) return false
    return true
  }

  /**
   * Filter navigation recursively.
   */
  const filterByModuleAccess = (items) => {
    return items
      .map(item => {
        if (!isMenuAllowed(item)) return null

        if (item.children && item.children.length > 0) {
          if (!hasSubscriptionAccess(item)) return null
          const filteredChildren = filterByModuleAccess(item.children)
          if (filteredChildren.length > 0) {
            return { ...item, children: filteredChildren }
          }
          return null
        }

        if (!hasSubscriptionAccess(item)) return null
        return item
      })
      .filter(Boolean)
  }

  // Filtered navigation based on mode, menuAccess, and subscription
  const filteredNavigation = computed(() => {
    const mode = tenantFeatures.currentMode || 'gym'
    const user = authStore.user || null
    const modeFiltered = getNavigationByMode(mode, user)

    if (isSuperAdmin.value || isTenantAdmin.value) {
      if (isDev) debug.log('[Navigation] Admin - showing all menus:', modeFiltered.length)
      return modeFiltered
    }

    const filtered = filterByModuleAccess(modeFiltered)

    if (isDev) {
      debug.log('[Navigation] Filtered navigation:', {
        mode,
        userRole: authStore.user?.role,
        menuAccess: getAllowedMenuKeysForUser(),
        totalItems: navigation.length,
        afterModeFilter: modeFiltered.length,
        afterFilter: filtered.length,
      })
    }

    return filtered
  })

  return {
    navigation: filteredNavigation,
    allNavigation: navigation,
    currentMode: computed(() => tenantFeatures.currentMode),
    isSuperAdmin,
    isTenantAdmin,
    hasModuleAccess,
    isMenuAllowedByRole: isMenuAllowed,
    canAccess,
  }
}
