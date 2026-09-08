const CURRENT_BUILD_ID = typeof __APP_BUILD_ID__ === 'string'
  ? __APP_BUILD_ID__
  : 'development'
const RELOAD_MARKER_KEY = 'gym:deployment-reload'
const VERSION_PATH = `${import.meta.env.BASE_URL || '/'}version.json`
const CHECK_INTERVAL_MS = 60 * 1000

let monitorStarted = false
let checkInFlight = null

async function clearBrowserCaches() {
  if (!('caches' in window)) {
    return
  }

  const cacheNames = await window.caches.keys()
  await Promise.all(cacheNames.map(cacheName => window.caches.delete(cacheName)))
}

async function reloadForNewDeployment(deployedBuildId) {
  const reloadMarker = `${CURRENT_BUILD_ID}:${deployedBuildId}`

  // Prevent an endless reload loop if a proxy still serves the old index.
  if (sessionStorage.getItem(RELOAD_MARKER_KEY) === reloadMarker) {
    return
  }

  sessionStorage.setItem(RELOAD_MARKER_KEY, reloadMarker)
  await clearBrowserCaches()
  window.location.reload()
}

async function checkForNewDeployment() {
  if (checkInFlight) {
    return checkInFlight
  }

  checkInFlight = (async () => {
    try {
      const response = await fetch(`${VERSION_PATH}?check=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        return
      }

      const payload = await response.json()
      const deployedBuildId = payload?.buildId

      if (!deployedBuildId || deployedBuildId === CURRENT_BUILD_ID) {
        sessionStorage.removeItem(RELOAD_MARKER_KEY)
        return
      }

      await reloadForNewDeployment(deployedBuildId)
    } catch (error) {
      // Version checks must never interrupt the current user session.
      console.debug('[DeploymentVersion] Version check skipped:', error)
    } finally {
      checkInFlight = null
    }
  })()

  return checkInFlight
}

export function startDeploymentVersionMonitor() {
  if (monitorStarted || typeof window === 'undefined') {
    return
  }

  monitorStarted = true
  const check = () => checkForNewDeployment()

  check()
  const intervalId = window.setInterval(check, CHECK_INTERVAL_MS)
  window.addEventListener('focus', check)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      check()
    }
  })

  window.addEventListener('beforeunload', () => {
    window.clearInterval(intervalId)
  }, { once: true })
}

export { CURRENT_BUILD_ID, checkForNewDeployment, clearBrowserCaches }
