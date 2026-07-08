'use strict';

const { createError } = require('../../utils/errorCodes');
const logger = require('../../utils/logger');
const { resolveBackupOptionsForTenantId } = require('../../utils/backupGoogleDriveConfig');
const googleDriveOAuthService = require('../../services/googleDriveOAuthService');

function resolveTargetTenantId(req) {
  if (req.user?.isSuperAdmin && req.query?.tenantId) {
    return req.query.tenantId;
  }
  return req.user?.tenantId || null;
}

async function getGoogleDriveOAuthStatus(req, res, next) {
  try {
    const tenantId = resolveTargetTenantId(req);
    if (!tenantId) {
      throw createError('VALIDATION_ERROR', 'Tenant ID tidak ditemukan');
    }

    const oauth = await googleDriveOAuthService.getTenantGoogleDriveOAuth(tenantId);
    const status = googleDriveOAuthService.getPublicOAuthStatus(oauth);
    const backupOptions = await resolveBackupOptionsForTenantId(tenantId);
    const connection = await googleDriveOAuthService.testGoogleDriveConnection(backupOptions.googleDriveConfig);

    return res.json({
      success: true,
      data: {
        tenantId,
        redirectUri: googleDriveOAuthService.resolveRedirectUri(req),
        scope: googleDriveOAuthService.GOOGLE_DRIVE_SCOPE,
        status,
        connection,
      },
    });
  } catch (error) {
    return next(error);
  }
}

function resolveFrontendOrigin(req) {
  const headerOrigin = String(req.headers.origin || '').trim();
  if (headerOrigin) return headerOrigin;

  const referer = String(req.headers.referer || '').trim();
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch (_) {}
  }

  const configured = String(process.env.FRONTEND_URL || process.env.APP_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;

  return 'http://localhost:8081';
}

async function getGoogleDriveOAuthAuthorizeUrl(req, res, next) {
  try {
    const tenantId = resolveTargetTenantId(req);
    if (!tenantId) {
      throw createError('VALIDATION_ERROR', 'Tenant ID tidak ditemukan');
    }

    const oauth = await googleDriveOAuthService.getTenantGoogleDriveOAuth(tenantId);
    const resolved = googleDriveOAuthService.resolveOAuthCredentials(oauth);
    const clientId = oauth.clientId || resolved.oauth?.clientId || resolved.partial?.clientId;
    const clientSecret = oauth.clientSecret || resolved.oauth?.clientSecret || resolved.partial?.clientSecret;

    if (!clientId || !clientSecret) {
      throw createError(
        'VALIDATION_ERROR',
        'Isi dan simpan Google OAuth Client ID serta Client Secret terlebih dahulu.'
      );
    }

    const redirectUri = googleDriveOAuthService.resolveRedirectUri(req);
    const frontendOrigin = resolveFrontendOrigin(req);
    const state = googleDriveOAuthService.signOAuthState({
      tenantId,
      userId: req.user.id,
      redirectUri,
      frontendOrigin,
    });
    const authorizeUrl = googleDriveOAuthService.buildAuthorizeUrl({
      clientId,
      redirectUri,
      state,
    });

    return res.json({
      success: true,
      data: {
        authorizeUrl,
        redirectUri,
        state,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function handleGoogleDriveOAuthCallback(req, res) {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      res.status(400).send(googleDriveOAuthService.renderOAuthPopupResultHtml({
        success: false,
        message: String(oauthError),
        frontendOrigin: '*',
      }));
      return;
    }

    if (!code || !state) {
      res.status(400).send(googleDriveOAuthService.renderOAuthPopupResultHtml({
        success: false,
        message: 'Kode OAuth atau state tidak ditemukan',
        frontendOrigin: '*',
      }));
      return;
    }

    const payload = googleDriveOAuthService.verifyOAuthState(state);
    const oauth = await googleDriveOAuthService.getTenantGoogleDriveOAuth(payload.tenantId);
    const clientId = oauth.clientId;
    const clientSecret = oauth.clientSecret;

    if (!clientId || !clientSecret) {
      res.status(400).send(googleDriveOAuthService.renderOAuthPopupResultHtml({
        success: false,
        message: 'Client ID/Secret belum disimpan di tenant settings',
        frontendOrigin: payload.frontendOrigin,
      }));
      return;
    }

    const tokenData = await googleDriveOAuthService.exchangeAuthorizationCode({
      clientId,
      clientSecret,
      code,
      redirectUri: payload.redirectUri,
    });

    if (!tokenData.refresh_token) {
      res.status(400).send(googleDriveOAuthService.renderOAuthPopupResultHtml({
        success: false,
        message: 'Google tidak mengembalikan refresh token. Cabut akses app di akun Google lalu coba lagi.',
        frontendOrigin: payload.frontendOrigin,
      }));
      return;
    }

    const connectedEmail = tokenData.access_token
      ? await googleDriveOAuthService.fetchGoogleAccountEmail(tokenData.access_token)
      : null;

    await googleDriveOAuthService.saveTenantGoogleDriveOAuth(payload.tenantId, {
      refreshToken: tokenData.refresh_token,
      connectedAt: new Date().toISOString(),
      connectedEmail,
      lastError: null,
    });

    logger.info('[googleDriveOAuth] tenant connected', {
      tenantId: payload.tenantId,
      userId: payload.userId,
      connectedEmail,
    });

    res.status(200).send(googleDriveOAuthService.renderOAuthPopupResultHtml({
      success: true,
      message: 'Google Drive connected',
      frontendOrigin: payload.frontendOrigin,
    }));
  } catch (error) {
    logger.error('[googleDriveOAuth] callback failed', { error: error.message });
    res.status(500).send(googleDriveOAuthService.renderOAuthPopupResultHtml({
      success: false,
      message: error.message,
      frontendOrigin: '*',
    }));
  }
}

async function disconnectGoogleDriveOAuth(req, res, next) {
  try {
    const tenantId = resolveTargetTenantId(req);
    if (!tenantId) {
      throw createError('VALIDATION_ERROR', 'Tenant ID tidak ditemukan');
    }

    await googleDriveOAuthService.saveTenantGoogleDriveOAuth(tenantId, { disconnect: true });

    return res.json({
      success: true,
      message: 'Google Drive OAuth disconnected',
    });
  } catch (error) {
    return next(error);
  }
}

async function testGoogleDriveOAuthConnection(req, res, next) {
  try {
    const tenantId = resolveTargetTenantId(req);
    if (!tenantId) {
      throw createError('VALIDATION_ERROR', 'Tenant ID tidak ditemukan');
    }

    const backupOptions = await resolveBackupOptionsForTenantId(tenantId);
    const connection = await googleDriveOAuthService.testGoogleDriveConnection(backupOptions.googleDriveConfig);

    if (!connection.ok) {
      const oauth = await googleDriveOAuthService.getTenantGoogleDriveOAuth(tenantId);
      if (oauth.refreshToken || oauth.clientId) {
        await googleDriveOAuthService.saveTenantGoogleDriveOAuth(tenantId, {
          lastError: connection.issue || connection.reason || 'Connection test failed',
        });
      }
    } else {
      await googleDriveOAuthService.saveTenantGoogleDriveOAuth(tenantId, { lastError: null });
    }

    return res.json({
      success: connection.ok,
      data: connection,
      message: connection.ok
        ? 'Koneksi Google Drive berhasil'
        : (connection.issue || connection.reason || 'Koneksi Google Drive gagal'),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getGoogleDriveOAuthStatus,
  getGoogleDriveOAuthAuthorizeUrl,
  handleGoogleDriveOAuthCallback,
  disconnectGoogleDriveOAuth,
  testGoogleDriveOAuthConnection,
};
