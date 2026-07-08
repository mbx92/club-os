/**
 * Permission helpers for frontend.
 * Uses the backend resource->actions mapping directly.
 */

import { useAuthStore } from '@/stores/auth'

const TENANT_ADMIN_ROLES = new Set(['admin', 'owner'])

function isTenantAdmin(user) {
  if (!user) return false
  if (user.isSuperAdmin) return true
  const role = user?.role
  const name = typeof role === 'string' ? role : role?.name
  return TENANT_ADMIN_ROLES.has(name?.toLowerCase())
}

/**
 * Check if the user can perform an action on a resource.
 */
export function checkPermission(action, subject) {
  const auth = useAuthStore()
  if (auth.user?.isSuperAdmin || isTenantAdmin(auth.user)) return true

  const resources = auth.permissions?.resources || {}
  const globalActions = resources['*'] || []
  if (globalActions.includes('*') || globalActions.includes(action)) return true

  const allowedActions = resources[subject] || []
  return allowedActions.includes('*') || allowedActions.includes(action)
}

/** True if user can perform any of the listed actions on a subject */
export function checkAnyPermission(actions, subject) {
  if (!Array.isArray(actions) || actions.length === 0) return false
  return actions.some(action => checkPermission(action, subject))
}

/**
 * Check if a menu key is in the user's backend menuAccess list.
 */
export function hasMenuAccess(key) {
  const auth = useAuthStore()
  if (auth.user?.isSuperAdmin || isTenantAdmin(auth.user)) return true
  const access = auth.permissions?.menuAccess || []
  return access.includes(key)
}
