import { computed } from 'vue'
import { navigation, getNavigationByMode } from '@/navigation/navigation.js'
import { getAllowedMenuKeys } from '@/navigation/roleMenuConfig.js'
import { useTenantFeaturesStore } from '@/stores/tenantFeatures'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'
import { debug } from '@/utils/debug'

const isDev = import.meta.env.DEV

/**
 * Composable untuk mengelola navigation berdasarkan mode tenant dan user permissions
 * Mode: 'gym' (default), 'fitness', atau 'full'
 * Filter navigation items berdasarkan tenantFeatures.mode, user.isSuperAdmin, dan module access
 */
export function useNavigation() {
  const tenantFeatures = useTenantFeaturesStore()
  const authStore = useAuthStore()
  const subscriptionStore = useSubscriptionStore()

  /**
   * Check if user is super admin (bypass all restrictions)
   */
  const isSuperAdmin = computed(() => {
    return authStore.user?.isSuperAdmin === true
  })

  /**
   * Check if user is admin role (more permissive)
   */
  const isAdmin = computed(() => {
    const role = authStore.user?.role
    return role === 'admin' || role === 'Admin' || role === 'ADMIN'
  })

  /**
   * Convert PascalCase CASL subject to lowercase plural key used in rolePermissions
   * e.g. "RestaurantTable" → "restauranttables", "Order" → "orders", "Member" → "members"
   * @param {string} subject
   * @returns {string}
   */
  const subjectToRoleKey = (subject) => {
    if (!subject) return ''
    // Convert to lowercase and add 's' for plural
    const lower = subject.toLowerCase()
    // Handle common suffixes
    if (lower.endsWith('y')) return lower.slice(0, -1) + 'ies'
    if (lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('ch') || lower.endsWith('sh')) return lower + 'es'
    return lower + 's'
  }

  /**
   * Check if user has CASL permission for the given action+subject
   * Uses permissions.caslRules AND permissions.rolePermissions from /permissions/user endpoint
   * @param {string} action - CASL action (read, create, update, delete, manage)
   * @param {string} subject - CASL subject (Member, Gym, CashRegisterSession, etc.)
   * @returns {boolean}
   */
  const canAccess = (action, subject) => {
    // Super admin bypasses all checks
    if (isSuperAdmin.value) return true

    const perms = authStore.permissions

    // If permissions not loaded yet, deny access
    if (!perms) {
      if (ENABLE_ACL_DEBUG) debug.log(`[Nav ACL] ❌ No permissions loaded - denying access`)
      return false
    }

    const hasRules = perms.caslRules && perms.caslRules.length > 0
    const hasRolePerms = perms.rolePermissions && Object.keys(perms.rolePermissions).length > 0

    // If permissions are completely empty AND user is admin, allow access.
    // This is a graceful degradation for when the backend migration script hasn't run yet,
    // causing roles to have empty caslRules. The actual API endpoints will return proper
    // 403 errors if the user truly lacks access.
    if (!hasRules && !hasRolePerms) {
      if (isAdmin.value) {
        if (ENABLE_ACL_DEBUG) debug.log(`[Nav ACL] ⚠️ ${action}:${subject} → admin role with empty permissions, allowing`)
        return true
      }
      if (ENABLE_ACL_DEBUG) debug.log(`[Nav ACL] ❌ Permissions loaded but empty - denying access`)
      return false
    }

    // 1. Check caslRules first
    const rules = perms.caslRules || []

    // Debug: Log first check attempt
    if (ENABLE_ACL_DEBUG) {
      const sampleRule = rules[0]
      debug.log(`[Nav ACL] Checking ${action}:${subject}`, {
        totalRules: rules.length,
        sampleRule,
        lookingFor: { action, subject }
      })
    }

    const hasCaslRule = rules.some(rule => {
      if (rule.inverted) return false

      // Use rule.actions (array) from backend
      let actions = rule.actions || []

      // Fallback: if actions array is empty, try rule.action (string) - backward compatibility
      if (actions.length === 0 && rule.action) {
        actions = [rule.action]
      }

      const actionMatch = actions.includes('manage') || actions.includes(action)
      const subjectMatch = rule.subject === 'all' || rule.subject === subject

      if (ENABLE_ACL_DEBUG && (actionMatch || subjectMatch)) {
        debug.log(`[Nav ACL] Rule match attempt:`, {
          ruleSubject: rule.subject,
          ruleActions: actions,
          ruleFallback: rule.action,
          targetSubject: subject,
          targetAction: action,
          actionMatch,
          subjectMatch,
          bothMatch: actionMatch && subjectMatch
        })
      }

      return actionMatch && subjectMatch
    })
    if (hasCaslRule) {
      if (ENABLE_ACL_DEBUG) debug.log(`[Nav ACL] ✅ ${action}:${subject} → allowed via caslRules`)
      return true
    }

    // 2. Fallback: check rolePermissions (case-insensitive key lookup)
    const rolePerm = perms.rolePermissions
    if (rolePerm) {
      const pluralKey = subjectToRoleKey(subject)
      const exactKey = subject
      const lowerExactKey = exactKey.toLowerCase()

      // Try exact subject first, then lowercase exact, then pluralized
      let perm = rolePerm[exactKey] || rolePerm[lowerExactKey] || rolePerm[pluralKey]

      let usedKey = perm ? (rolePerm[exactKey] ? exactKey : (rolePerm[lowerExactKey] ? lowerExactKey : pluralKey)) : null

      if (!perm) {
        // Case-insensitive lookup on any of the possible names
        const matchedKey = Object.keys(rolePerm).find(k => {
          const lk = k.toLowerCase()
          return lk === lowerExactKey || lk === pluralKey.toLowerCase()
        })
        if (matchedKey) {
          perm = rolePerm[matchedKey]
          usedKey = matchedKey
        }
      }

      if (perm) {
        let allowed = false;
        if (Array.isArray(perm)) {
          allowed = action === 'manage'
            ? perm.some(a => ['create', 'read', 'update', 'delete', 'manage'].includes(a))
            : perm.includes(action);
        } else {
          allowed = action === 'manage'
            ? (perm.create || perm.read || perm.update || perm.delete)
            : !!perm[action];
        }
        if (ENABLE_ACL_DEBUG) debug.log(`[Nav ACL] ${allowed ? '✅' : '❌'} ${action}:${subject} → rolePermissions[${usedKey}] = ${JSON.stringify(perm)}`)
        return allowed
      }
    }

    // Debug: Only log when explicitly enabled
    if (ENABLE_ACL_DEBUG) {
      const availableSubjects = rules
        .filter(r => r.actions && r.actions.length > 0)
        .map(r => r.subject)
        .filter((v, i, a) => a.indexOf(v) === i) // unique
        .slice(0, 10) // limit to first 10
      debug.log(`[Nav ACL] ❌ ${action}:${subject} → not found. Available subjects:`, availableSubjects.join(', '))
    }

    return false
  }

  /**
   * Check module/feature subscription access (non-CASL)
   * @param {Object} item - Navigation item
   * @returns {boolean}
   */
  const hasSubscriptionAccess = (item) => {
    if (isSuperAdmin.value) return true

    // Check module requirement
    if (item.requireModule) {
      const hasModule = subscriptionStore.hasModule(item.requireModule)
      if (!hasModule) return false
    }

    // Check feature requirement
    if (item.requireFeature) {
      const { category, name } = item.requireFeature
      const hasFeature = subscriptionStore.hasFeature(category, name)
      if (!hasFeature) return false
    }

    return true
  }

  /**
   * Get allowed menu keys for current user
   * Priority: backend menuAccess (if set by superadmin) > FE default ROLE_MENU_MAP
   * @returns {Array<string>|null} - null means show all (superAdmin)
   */
  const getAllowedMenuKeysForUser = () => {
    if (isSuperAdmin.value) return null // null = show all

    const role = authStore.user?.role || ''
    const backendMenuAccess = authStore.permissions?.menuAccess || null
    return getAllowedMenuKeys(role, backendMenuAccess)
  }

  /**
   * Check if a top-level menu item is allowed by role-based menuKey filter
   * @param {Object} item - Navigation item
   * @returns {boolean}
   */
  const isMenuAllowedByRole = (item) => {
    if (isSuperAdmin.value) return true

    // Only check items with menuKey (top-level items)
    if (!item.menuKey) return true // items without menuKey are not filtered

    const allowed = getAllowedMenuKeysForUser()
    if (allowed === null) return true // superAdmin
    return allowed.includes(item.menuKey)
  }

  /**
   * Filter navigation item based on role + subscription access
   * CASL is NOT used for menu filtering — pure FE role-based approach
   * @param {Object} item - Navigation item
   * @returns {boolean} - Whether item should be visible
   */
  const hasModuleAccess = (item) => {
    if (isSuperAdmin.value) return true

    // Role-based menuKey filter (FE-only)
    if (!isMenuAllowedByRole(item)) return false

    // Subscription/module checks still apply
    if (!hasSubscriptionAccess(item)) return false

    return true
  }

  /**
   * Filter navigation recursively based on role + subscription access
   * Parent items are shown if at least one child is accessible
   * @param {Array} items - Navigation items
   * @returns {Array} - Filtered navigation items
   */
  const filterByModuleAccess = (items) => {
    return items
      .map(item => {
        // Role-based menuKey check (applies to any item with menuKey)
        if (!isMenuAllowedByRole(item)) return null

        const hasChildren = item.children && item.children.length > 0

        if (hasChildren) {
          // Subscription check for parent
          if (!hasSubscriptionAccess(item)) return null

          const filteredChildren = filterByModuleAccess(item.children)

          // Only include parent if it has visible children
          if (filteredChildren.length > 0) {
            return { ...item, children: filteredChildren }
          }
          return null
        }

        // For leaf items: check subscription
        if (!hasSubscriptionAccess(item)) return null
        return item
      })
      .filter(Boolean)
  }

  // Filter navigation berdasarkan mode tenant, user permissions, dan module access
  const filteredNavigation = computed(() => {
    const mode = tenantFeatures.currentMode || 'gym'
    const user = authStore.user || null

    // First filter by mode and user permissions
    const modeFiltered = getNavigationByMode(mode, user)

    // Then filter by module access (if not super admin)
    if (isSuperAdmin.value) {
      if (isDev) debug.log('[Navigation] Super admin - showing all menus:', modeFiltered.length)
      return modeFiltered
    }

    const filtered = filterByModuleAccess(modeFiltered)

    if (isDev) {
      const allowedKeys = getAllowedMenuKeysForUser()
      debug.log('[Navigation] Filtered navigation:', {
        mode,
        userRole: authStore.user?.role,
        allowedMenuKeys: allowedKeys,
        totalItems: navigation.length,
        afterModeFilter: modeFiltered.length,
        afterRoleFilter: filtered.length,
        isSuperAdmin: isSuperAdmin.value
      })
    }

    return filtered
  })

  return {
    navigation: filteredNavigation,
    allNavigation: navigation,
    currentMode: computed(() => tenantFeatures.currentMode),
    isSuperAdmin,
    hasModuleAccess,
    isMenuAllowedByRole,
    canAccess
  }
}