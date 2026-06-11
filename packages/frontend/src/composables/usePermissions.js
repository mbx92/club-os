/**
 * Permission helpers for frontend.
 * Replaces CASL checks with simple rule matching.
 */

import { useAuthStore } from '@/stores/auth'

function isTenantAdmin(user) {
  const role = user?.role
  const name = typeof role === 'string' ? role : role?.name
  return name === 'admin' || name === 'owner'
}

/**
 * Check if the user has a rule allowing action on subject.
 * Rules come from backend (authStore.permissions.rules).
 */
export function checkPermission(action, subject) {
  const auth = useAuthStore()
  if (auth.user?.isSuperAdmin || isTenantAdmin(auth.user)) return true

  const rules = auth.permissions?.rules || []
  return rules.some(r => {
    if (r.inverted) return false
    const actions = r.actions || []
    const actionMatch = actions.includes('manage') || actions.includes(action)
    const subjectMatch = r.subject === 'all' || r.subject === subject
    return actionMatch && subjectMatch
  })
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
