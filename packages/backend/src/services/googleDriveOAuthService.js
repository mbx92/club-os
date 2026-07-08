'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { Tenant } = require('../models');
const {
  getGoogleDriveConfig,
  resolveGoogleDriveConfig,
  validateGoogleDriveConfig,
  getGoogleAccessToken,
} = require('../../scripts/googleDriveBackup');

const GOOGLE_DRIVE_SCOPE = process.env.GOOGLE_DRIVE_OAUTH_SCOPE || 'https://www.googleapis.com/auth/drive.file';
const GOOGLE_TOKEN_URI = process.env.GOOGLE_DRIVE_OAUTH_TOKEN_URI || 'https://oauth2.googleapis.com/token';
const STATE_PURPOSE = 'google_drive_oauth';

function maskSecret(value, visible = 4) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.length <= visible * 2) return '••••••••';
  return `${raw.slice(0, visible)}••••${raw.slice(-visible)}`;
}

function buildOAuthConfigFromRecord(oauth = {}) {
  const oauthRecord = oauth && typeof oauth === 'object' ? oauth : {};
  const clientId = String(oauthRecord.clientId || '').trim();
  const clientSecret = String(oauthRecord.clientSecret || '').trim();
  const refreshToken = String(oauthRecord.refreshToken || '').trim();

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
    tokenUri: GOOGLE_TOKEN_URI,
  };
}

function resolveOAuthCredentials(oauthFromTenant = null) {
  const tenantOAuth = buildOAuthConfigFromRecord(oauthFromTenant);
  if (tenantOAuth) {
    return { source: 'tenant_settings', oauth: tenantOAuth };
  }

  const envConfig = getGoogleDriveConfig();
  if (envConfig.authType === 'oauth_refresh_token' && envConfig.oauthRefreshToken) {
    return { source: 'env', oauth: envConfig.oauthRefreshToken };
  }

  const partialTenant = oauthFromTenant && typeof oauthFromTenant === 'object'
    ? {
      clientId: String(oauthFromTenant.clientId || '').trim(),
      clientSecret: String(oauthFromTenant.clientSecret || '').trim(),
      refreshToken: '',
    }
    : null;

  if (partialTenant?.clientId && partialTenant?.clientSecret) {
    return { source: 'tenant_settings_partial', oauth: null, partial: partialTenant };
  }

  return { source: 'none', oauth: null };
}

function getPublicOAuthStatus(oauthFromTenant = null) {
  const resolved = resolveOAuthCredentials(oauthFromTenant);
  const clientId = resolved.oauth?.clientId
    || resolved.partial?.clientId
    || oauthFromTenant?.clientId
    || '';
  const hasClientSecret = Boolean(
    resolved.oauth?.clientSecret
    || resolved.partial?.clientSecret
    || oauthFromTenant?.clientSecret
  );
  const hasRefreshToken = Boolean(
    resolved.oauth?.refreshToken
    || oauthFromTenant?.refreshToken
  );

  return {
    credentialSource: resolved.source,
    connected: Boolean(resolved.oauth?.refreshToken),
    hasClientId: Boolean(clientId),
    hasClientSecret,
    hasRefreshToken,
    clientIdPreview: clientId ? maskSecret(clientId, 6) : '',
    refreshTokenPreview: hasRefreshToken ? maskSecret(oauthFromTenant?.refreshToken || resolved.oauth?.refreshToken, 4) : '',
    connectedAt: oauthFromTenant?.connectedAt || null,
    connectedEmail: oauthFromTenant?.connectedEmail || null,
    lastError: oauthFromTenant?.lastError || null,
  };
}

function resolveRedirectUri(req) {
  if (process.env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI) {
    return process.env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI;
  }

  const configuredApiUrl = String(process.env.PUBLIC_API_URL || '').trim().replace(/\/$/, '');
  if (configuredApiUrl) {
    return `${configuredApiUrl}/api/v1/admin/database/google-drive/oauth/callback`;
  }

  const host = req.get('host');
  const protocol = req.protocol || 'http';
  return `${protocol}://${host}/api/v1/admin/database/google-drive/oauth/callback`;
}

function signOAuthState({ tenantId, userId, redirectUri, frontendOrigin }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required for Google Drive OAuth state');
  }

  return jwt.sign({
    purpose: STATE_PURPOSE,
    tenantId,
    userId,
    redirectUri,
    frontendOrigin,
    nonce: crypto.randomBytes(12).toString('hex'),
  }, secret, { expiresIn: '15m' });
}

function verifyOAuthState(state) {
  const secret = process.env.JWT_SECRET;
  const payload = jwt.verify(state, secret);

  if (payload.purpose !== STATE_PURPOSE) {
    throw new Error('Invalid OAuth state purpose');
  }

  return payload;
}

function buildAuthorizeUrl({ clientId, redirectUri, state }) {
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', GOOGLE_DRIVE_SCOPE);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);
  return authUrl.toString();
}

async function exchangeAuthorizationCode({ clientId, clientSecret, code, redirectUri }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  }).toString();

  const response = await axios.post(GOOGLE_TOKEN_URI, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    validateStatus: () => true,
  });

  if (response.status >= 400) {
    const reason = response.data?.error_description || response.data?.error || 'OAuth exchange failed';
    const error = new Error(reason);
    error.status = response.status;
    error.response = response.data;
    throw error;
  }

  return response.data;
}

async function fetchGoogleAccountEmail(accessToken) {
  try {
    const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
      validateStatus: () => true,
    });

    if (response.status >= 400) {
      return null;
    }

    return response.data?.email || null;
  } catch (_) {
    return null;
  }
}

async function testGoogleDriveConnection(googleDriveConfigOverrides = null) {
  const config = resolveGoogleDriveConfig(googleDriveConfigOverrides);
  const issue = validateGoogleDriveConfig({ ...config, enabled: true });

  if (issue) {
    return {
      ok: false,
      issue,
      authType: config.authType,
      folderId: config.folderId,
      source: config.source,
    };
  }

  try {
    await getGoogleAccessToken(config);
    return {
      ok: true,
      authType: config.authType,
      folderId: config.folderId,
      source: config.source,
    };
  } catch (error) {
    return {
      ok: false,
      issue: error.message,
      authType: config.authType,
      folderId: config.folderId,
      source: config.source,
      status: error.response?.status || error.status || null,
      reason: error.response?.data?.error || null,
    };
  }
}

async function getTenantGoogleDriveOAuth(tenantId) {
  const tenant = await Tenant.findByPk(tenantId, { attributes: ['id', 'name', 'settings'] });
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  return tenant.settings?.backup?.googleDrive?.oauth || {};
}

async function saveTenantGoogleDriveOAuth(tenantId, oauthPatch) {
  const tenant = await Tenant.findByPk(tenantId, { attributes: ['id', 'settings'] });
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const currentSettings = tenant.settings || {};
  const currentBackup = currentSettings.backup || {};
  const currentGoogleDrive = currentBackup.googleDrive || {};
  const currentOAuth = currentGoogleDrive.oauth || {};

  const nextOAuth = {
    ...currentOAuth,
    ...oauthPatch,
  };

  if (oauthPatch.disconnect) {
    delete nextOAuth.refreshToken;
    delete nextOAuth.connectedAt;
    delete nextOAuth.connectedEmail;
    delete nextOAuth.lastError;
    delete nextOAuth.disconnect;
  }

  tenant.settings = {
    ...currentSettings,
    backup: {
      ...currentBackup,
      googleDrive: {
        ...currentGoogleDrive,
        oauth: nextOAuth,
      },
    },
  };

  tenant.changed('settings', true);
  await tenant.save();

  return nextOAuth;
}

function renderOAuthPopupResultHtml({ success, message, frontendOrigin = '*' }) {
  const payload = JSON.stringify({ type: 'google-drive-oauth', success, message });
  const targetOrigin = String(frontendOrigin || '*').replace(/'/g, "\\'");
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Google Drive OAuth</title>
  <style>
    body { font-family: sans-serif; padding: 24px; color: #222; }
  </style>
</head>
<body>
  <p>${success ? 'Google Drive berhasil dihubungkan. Jendela ini akan tertutup otomatis.' : `Gagal menghubungkan Google Drive: ${message}`}</p>
  <script>
    (function () {
      var payload = ${payload};
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(payload, '${targetOrigin}');
        }
      } catch (e) {}
      setTimeout(function () { window.close(); }, ${success ? 800 : 2500});
    })();
  </script>
</body>
</html>`;
}

module.exports = {
  GOOGLE_DRIVE_SCOPE,
  maskSecret,
  buildOAuthConfigFromRecord,
  resolveOAuthCredentials,
  getPublicOAuthStatus,
  resolveRedirectUri,
  signOAuthState,
  verifyOAuthState,
  buildAuthorizeUrl,
  exchangeAuthorizationCode,
  fetchGoogleAccountEmail,
  testGoogleDriveConnection,
  getTenantGoogleDriveOAuth,
  saveTenantGoogleDriveOAuth,
  renderOAuthPopupResultHtml,
};
