const LOCAL_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8081',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:8081',
];

function parseEnvOrigins(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildAllowedOrigins() {
  const allowed = new Set(LOCAL_DEV_ORIGINS);

  for (const origin of parseEnvOrigins(process.env.ALLOWED_ORIGINS)) {
    allowed.add(origin);
  }

  for (const origin of parseEnvOrigins(process.env.FRONTEND_URL)) {
    allowed.add(origin);
  }

  return allowed;
}

function isPrivateNetworkHostname(hostname) {
  if (!hostname) return false;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^10\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  return false;
}

function isPrivateNetworkOrigin(origin) {
  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === 'http:' || protocol === 'https:'
      ? isPrivateNetworkHostname(hostname)
      : false;
  } catch {
    return false;
  }
}

function allowPrivateNetworkOrigins() {
  const flag = String(process.env.CORS_ALLOW_PRIVATE_NETWORK || '').trim().toLowerCase();
  return flag === 'true' || flag === '1' || flag === 'yes';
}

function isOriginAllowed(origin, allowedOrigins = buildAllowedOrigins()) {
  if (!origin) return true;
  if (process.env.NODE_ENV === 'development') return true;
  if (allowedOrigins.has(origin)) return true;
  if (allowPrivateNetworkOrigins() && isPrivateNetworkOrigin(origin)) return true;
  return false;
}

function createCorsOptions() {
  const allowedOrigins = buildAllowedOrigins();

  return {
    origin(origin, callback) {
      if (isOriginAllowed(origin, allowedOrigins)) {
        callback(null, origin || true);
        return;
      }

      callback(new Error(`Origin "${origin}" is not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'x-client-ip',
      'x-client-name',
      'x-tenant-id',
    ],
    exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length'],
    maxAge: 86400,
  };
}

module.exports = {
  LOCAL_DEV_ORIGINS,
  buildAllowedOrigins,
  isPrivateNetworkOrigin,
  isOriginAllowed,
  createCorsOptions,
};
