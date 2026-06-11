const SKIP_REDIRECT_CODES = new Set([
  'MODULE_NOT_AVAILABLE',
  'FEATURE_NOT_AVAILABLE',
  'LIMIT_REACHED',
  'NO_ACTIVE_SHIFT',
])

let routerInstance = null

export function setAccessDeniedRouter(router) {
  routerInstance = router
}

/**
 * Whether a 403 response should redirect to the access denied page.
 * Feature gates, operator PIN, and shift errors are handled in-place.
 */
export function shouldRedirectOn403(data) {
  if (!data) return true
  if (data.requireOperatorPin) return false
  if (data.code && SKIP_REDIRECT_CODES.has(data.code)) return false
  return true
}

/**
 * Redirect user to the dedicated access denied page.
 */
export function redirectToAccessDenied({ from, reason, message } = {}) {
  if (typeof window !== 'undefined' && window.location.pathname === '/403') {
    return
  }

  const query = {}
  if (from) query.from = from
  if (reason) query.reason = reason
  if (message) query.message = message

  if (routerInstance) {
    routerInstance.push({ path: '/403', query, replace: true })
    return
  }

  const params = new URLSearchParams(query)
  const qs = params.toString()
  window.location.href = qs ? `/403?${qs}` : '/403'
}
