const Sentry = require('@sentry/node');

let TenantModel = null;
const tenantCache = new Map();
const clientCache = new Map();
const TENANT_CACHE_TTL_MS = 60 * 1000;

function getTenantModel() {
  if (!TenantModel) {
    const models = require('../models');
    TenantModel = models.Tenant;
  }

  return TenantModel;
}

function normalizeGlitchtipConfig(config = {}) {
  return {
    enabled: Boolean(config.enabled),
    dsn: typeof config.dsn === 'string' ? config.dsn.trim() : '',
    serverUrl: typeof config.serverUrl === 'string' ? config.serverUrl.trim() : '',
    environment: typeof config.environment === 'string' && config.environment.trim()
      ? config.environment.trim()
      : process.env.NODE_ENV || 'development',
    projectSlug: typeof config.projectSlug === 'string' ? config.projectSlug.trim() : '',
  };
}

function hasValidConfig(config = {}) {
  return Boolean(config.enabled && config.dsn);
}

function getEnvGlitchtipConfig() {
  const dsn = process.env.GLITCHTIP_DSN || process.env.SENTRY_DSN || '';
  const enabledFlag = process.env.GLITCHTIP_ENABLED;

  return normalizeGlitchtipConfig({
    enabled: enabledFlag === undefined ? Boolean(dsn) : enabledFlag === 'true',
    dsn,
    serverUrl: process.env.GLITCHTIP_SERVER_URL || '',
    environment: process.env.GLITCHTIP_ENVIRONMENT || process.env.NODE_ENV || 'development',
    projectSlug: process.env.GLITCHTIP_PROJECT_SLUG || 'backend',
  });
}

function resolveTenantId(context = {}) {
  return (
    context.tenantId ||
    context.req?.tenantId ||
    context.req?.tenant?.id ||
    context.req?.user?.tenantId ||
    context.user?.tenantId ||
    context.user?.tenant?.id ||
    context.meta?.tenantId ||
    context.request?.tenantId ||
    context.req?.headers?.['x-tenant-id'] ||
    context.headers?.['x-tenant-id'] ||
    null
  );
}

async function getTenantById(tenantId) {
  if (!tenantId) return null;

  const cached = tenantCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const Tenant = getTenantModel();
    const tenant = await Tenant.findByPk(tenantId, {
      attributes: ['id', 'name', 'domain', 'settings'],
    });

    tenantCache.set(tenantId, {
      value: tenant,
      expiresAt: Date.now() + TENANT_CACHE_TTL_MS,
    });

    return tenant;
  } catch (error) {
    console.error('[GlitchTip] Failed to resolve tenant config:', error.message);
    return null;
  }
}

async function resolveGlitchtipTarget(context = {}) {
  const tenantId = resolveTenantId(context);
  const tenant = await getTenantById(tenantId);
  const tenantConfig = normalizeGlitchtipConfig(
    tenant?.settings?.integrations?.glitchtip || {}
  );

  if (hasValidConfig(tenantConfig)) {
    return { config: tenantConfig, tenant };
  }

  const envConfig = getEnvGlitchtipConfig();
  if (hasValidConfig(envConfig)) {
    return { config: envConfig, tenant };
  }

  return { config: null, tenant };
}

function buildClientSignature(config) {
  return JSON.stringify([
    config.dsn,
    config.environment,
    config.projectSlug,
  ]);
}

function getClientForConfig(config) {
  const signature = buildClientSignature(config);
  if (clientCache.has(signature)) {
    return clientCache.get(signature);
  }

  const client = new Sentry.NodeClient({
    dsn: config.dsn,
    enabled: true,
    environment: config.environment,
    release: process.env.npm_package_version || 'backend',
    transport: Sentry.makeNodeTransport,
    stackParser: Sentry.defaultStackParser,
    integrations: Sentry.getDefaultIntegrationsWithoutPerformance(),
  });

  clientCache.set(signature, client);
  return client;
}

function buildErrorFromMessage(message, meta = {}) {
  if (meta.error instanceof Error) {
    return meta.error;
  }

  const errorMessage = meta.error || meta.message || message || 'Backend error';
  const error = new Error(errorMessage);

  if (meta.stack && !error.stack) {
    error.stack = meta.stack;
  }

  if (meta.name) {
    error.name = meta.name;
  }

  return error;
}

function applyScopeContext(scope, context = {}, tenant = null, config = null) {
  const req = context.req || context.request || null;
  const user = context.user || req?.user || null;

  scope.setTag('runtime', 'backend');

  if (config?.projectSlug) {
    scope.setTag('glitchtip_project', config.projectSlug);
  }

  if (tenant?.id) {
    scope.setTag('tenant_id', tenant.id);
  }

  if (tenant?.name) {
    scope.setTag('tenant_name', tenant.name);
  }

  if (tenant?.domain) {
    scope.setTag('tenant_domain', tenant.domain);
  }

  if (context.mechanism) {
    scope.setTag('mechanism', context.mechanism);
  }

  if (user) {
    scope.setUser({
      id: user.id,
      email: user.email,
      username: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || undefined,
    });
  }

  if (req) {
    scope.setContext('request', {
      method: req.method,
      path: req.originalUrl || req.path,
      ip: req.ip || req.headers?.['x-forwarded-for'] || req.headers?.['x-client-ip'] || null,
      query: req.query,
      params: req.params,
    });
  }

  if (context.extra && typeof context.extra === 'object') {
    scope.setExtras(context.extra);
  }
}

async function captureBackendException(error, context = {}) {
  try {
    const { config, tenant } = await resolveGlitchtipTarget(context);
    if (!config) {
      return null;
    }

    const client = getClientForConfig(config);
    const scope = new Sentry.Scope();
    scope.setClient(client);
    applyScopeContext(scope, context, tenant, config);

    const exception = error instanceof Error ? error : buildErrorFromMessage(null, { error });
    return scope.captureException(exception);
  } catch (captureError) {
    console.error('[GlitchTip] Failed to capture backend exception:', captureError.message);
    return null;
  }
}

async function captureBackendLog(message, meta = {}) {
  try {
    const { config, tenant } = await resolveGlitchtipTarget(meta);
    if (!config) {
      return null;
    }

    const client = getClientForConfig(config);
    const scope = new Sentry.Scope();
    scope.setClient(client);
    applyScopeContext(scope, meta, tenant, config);

    const error = buildErrorFromMessage(message, meta);
    scope.setExtra('log_message', message);
    return scope.captureException(error);
  } catch (captureError) {
    console.error('[GlitchTip] Failed to capture backend log:', captureError.message);
    return null;
  }
}

async function flushGlitchtip(timeout = 2000) {
  const clients = Array.from(clientCache.values());
  if (clients.length === 0) {
    return true;
  }

  const results = await Promise.allSettled(clients.map((client) => client.flush(timeout)));
  return results.every((result) => result.status === 'fulfilled' && result.value !== false);
}

module.exports = {
  captureBackendException,
  captureBackendLog,
  flushGlitchtip,
  getEnvGlitchtipConfig,
};
