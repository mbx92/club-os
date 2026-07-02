import * as Sentry from '@sentry/vue'
import { debug } from '@/utils/debug'

let vueAppInstance = null
let isInitialized = false
let currentSignature = ''

const EXPECTED_ERROR_NAMES = new Set([
  'AccessDeniedError',
  'FeatureGateError',
  'LimitReachedError',
  'SubscriptionRequiredError',
  'TenantInactiveError'
])

const normalizeGlitchtipConfig = (config = {}) => ({
  enabled: Boolean(config.enabled),
  dsn: config.dsn?.trim() || '',
  serverUrl: config.serverUrl?.trim() || '',
  environment: config.environment?.trim() || import.meta.env.MODE || 'production',
  projectSlug: config.projectSlug?.trim() || ''
})

const hasValidConfig = (config) => {
  return Boolean(config.enabled && config.dsn)
}

const buildSignature = (config) => {
  return JSON.stringify([
    config.enabled,
    config.dsn,
    config.serverUrl,
    config.environment,
    config.projectSlug,
  ])
}

const getUserDisplayName = (user = {}) => {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return fullName || undefined
}

const applyScopeContext = ({ user = null, tenant = null, config = null } = {}) => {
  if (!isInitialized) return

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: getUserDisplayName(user),
    })
  } else {
    Sentry.setUser(null)
  }

  if (tenant?.id) {
    Sentry.setTag('tenant_id', tenant.id)
  }

  if (tenant?.name) {
    Sentry.setTag('tenant_name', tenant.name)
  }

  if (tenant?.domain) {
    Sentry.setTag('tenant_domain', tenant.domain)
  }

  if (config?.projectSlug) {
    Sentry.setTag('glitchtip_project', config.projectSlug)
  }

  Sentry.setTag('runtime', 'frontend')
}

export const configureFrontendGlitchtip = (app, rawConfig = {}, context = {}) => {
  if (app) {
    vueAppInstance = app
  }

  if (!vueAppInstance) {
    return false
  }

  const config = normalizeGlitchtipConfig(rawConfig)

  if (!hasValidConfig(config)) {
    return false
  }

  const nextSignature = buildSignature(config)

  if (isInitialized && nextSignature === currentSignature) {
    applyScopeContext({ ...context, config })
    return true
  }

  if (isInitialized) {
    Sentry.close(2000).catch((error) => {
      debug.warn('[GlitchTip] Failed to close previous Sentry client:', error)
    })
  }

  Sentry.init({
    app: vueAppInstance,
    dsn: config.dsn,
    enabled: true,
    environment: config.environment,
    autoSessionTracking: false,
    attachProps: true,
    release: import.meta.env.VITE_APP_VERSION || import.meta.env.MODE || 'frontend',
    beforeSend(event) {
      event.tags = {
        ...(event.tags || {}),
        runtime: 'frontend',
      }

      if (config.projectSlug) {
        event.tags.glitchtip_project = config.projectSlug
      }

      return event
    },
  })

  isInitialized = true
  currentSignature = nextSignature
  applyScopeContext({ ...context, config })
  debug.log('[GlitchTip] Frontend reporting initialized')

  return true
}

export const syncFrontendGlitchtipContext = (context = {}) => {
  applyScopeContext({
    ...context,
    config: normalizeGlitchtipConfig(context.config || context.tenant?.settings?.integrations?.glitchtip || {}),
  })
}

export const shouldReportHandledFrontendError = (error) => {
  if (!isInitialized || !error) {
    return false
  }

  if (error.skipNotification || EXPECTED_ERROR_NAMES.has(error.name)) {
    return false
  }

  const statusCode = error.statusCode || error.status || error.response?.status
  const errorCode = error.code || error.data?.code || error.response?.data?.code

  if (typeof statusCode === 'number' && statusCode >= 500) {
    return true
  }

  if (['INTERNAL_ERROR', 'SERVICE_UNAVAILABLE'].includes(errorCode)) {
    return true
  }

  return error instanceof Error && !statusCode
}

export const captureFrontendException = (error, context = {}) => {
  if (!isInitialized) {
    return null
  }

  const exception = error instanceof Error
    ? error
    : new Error(typeof error === 'string' ? error : 'Frontend exception')

  return Sentry.withScope((scope) => {
    if (context.tags) {
      scope.setTags(context.tags)
    }

    if (context.extra) {
      scope.setExtras(context.extra)
    }

    if (context.contextName && context.contextData) {
      scope.setContext(context.contextName, context.contextData)
    }

    if (context.level) {
      scope.setLevel(context.level)
    }

    return scope.captureException(exception)
  })
}
