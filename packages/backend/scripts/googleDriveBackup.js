const fs = require('fs');
const https = require('https');
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GOOGLE_TOKEN_URI = 'https://oauth2.googleapis.com/token';

function parseBoolean(value) {
  return String(value).toLowerCase() === 'true';
}

function hasOwnProperty(obj, key) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function parseFolderId(value) {
  if (!value) return null;

  if (/^[A-Za-z0-9_-]{10,}$/.test(value)) {
    return value;
  }

  const folderMatch = value.match(/\/folders\/([A-Za-z0-9_-]+)/);
  if (folderMatch) {
    return folderMatch[1];
  }

  const idMatch = value.match(/[?&]id=([A-Za-z0-9_-]+)/);
  return idMatch ? idMatch[1] : null;
}

function resolveServiceAccountKeyFilePath(rawPath) {
  if (!rawPath) return null;

  const normalized = String(rawPath).trim();
  const basename = path.basename(normalized);
  const candidates = [
    path.resolve(process.cwd(), normalized),
    path.resolve(process.cwd(), 'packages/backend', normalized),
    path.resolve(process.cwd(), 'packages/backend/src/secrets', basename),
    path.resolve(__dirname, '../src/secrets', basename),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(process.cwd(), normalized);
}

function getServiceAccountConfig() {
  if (process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON);
    return {
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
      tokenUri: parsed.token_uri || GOOGLE_TOKEN_URI,
    };
  }

  if (process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_FILE) {
    const filePath = resolveServiceAccountKeyFilePath(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_FILE);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
      tokenUri: parsed.token_uri || GOOGLE_TOKEN_URI,
    };
  }

  if (process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return {
      clientEmail: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
      tokenUri: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_TOKEN_URI || GOOGLE_TOKEN_URI,
    };
  }

  return null;
}

function getOAuthRefreshTokenConfig() {
  if (
    process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN
  ) {
    return {
      clientId: process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN,
      tokenUri: process.env.GOOGLE_DRIVE_OAUTH_TOKEN_URI || GOOGLE_TOKEN_URI,
    };
  }

  return null;
}

function getGoogleDriveConfig() {
  const folderId = parseFolderId(
    process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID ||
    process.env.GOOGLE_DRIVE_BACKUP_FOLDER_URL
  );

  const oauthRefreshToken = getOAuthRefreshTokenConfig();
  const serviceAccount = oauthRefreshToken ? null : getServiceAccountConfig();

  return {
    enabled: parseBoolean(process.env.GOOGLE_DRIVE_BACKUP_ENABLED),
    required: parseBoolean(process.env.GOOGLE_DRIVE_BACKUP_REQUIRED),
    folderId,
    authType: oauthRefreshToken ? 'oauth_refresh_token' : (serviceAccount ? 'service_account' : null),
    oauthRefreshToken,
    serviceAccount,
  };
}

function buildOAuthConfigFromParts(oauth = {}) {
  const clientId = String(oauth.clientId || '').trim();
  const clientSecret = String(oauth.clientSecret || '').trim();
  const refreshToken = String(oauth.refreshToken || '').trim();

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
    tokenUri: process.env.GOOGLE_DRIVE_OAUTH_TOKEN_URI || GOOGLE_TOKEN_URI,
  };
}

function resolveGoogleDriveConfig(overrides = null) {
  const baseConfig = getGoogleDriveConfig();
  const configOverrides = overrides || {};

  const resolvedFolderId = parseFolderId(
    configOverrides.folderId ||
    configOverrides.folderUrl ||
    baseConfig.folderId
  );

  const tenantOAuthRecord = configOverrides.oauth || null;
  const tenantOAuth = buildOAuthConfigFromParts(tenantOAuthRecord);
  const hasTenantOAuthPartial = Boolean(
    tenantOAuthRecord?.clientId && tenantOAuthRecord?.clientSecret
  );
  const oauthRefreshToken = tenantOAuth
    || (!hasTenantOAuthPartial ? baseConfig.oauthRefreshToken : null);
  const serviceAccount = oauthRefreshToken ? null : baseConfig.serviceAccount;

  return {
    enabled: hasOwnProperty(configOverrides, 'enabled')
      ? Boolean(configOverrides.enabled)
      : baseConfig.enabled,
    required: hasOwnProperty(configOverrides, 'required')
      ? Boolean(configOverrides.required)
      : baseConfig.required,
    folderId: resolvedFolderId,
    authType: oauthRefreshToken ? 'oauth_refresh_token' : (serviceAccount ? 'service_account' : null),
    oauthRefreshToken,
    serviceAccount,
    source: configOverrides.source || (overrides ? 'tenant_settings' : 'env'),
  };
}

function validateGoogleDriveConfig(config) {
  if (!config.enabled) {
    return 'disabled';
  }

  if (!config.folderId) {
    return 'missing folder ID';
  }

  if (config.authType === 'oauth_refresh_token') {
    if (
      !config.oauthRefreshToken?.clientId ||
      !config.oauthRefreshToken?.clientSecret ||
      !config.oauthRefreshToken?.refreshToken
    ) {
      return 'missing Google OAuth refresh token credentials';
    }

    return null;
  }

  if (config.authType === 'service_account') {
    if (!config.serviceAccount?.clientEmail || !config.serviceAccount?.privateKey) {
      return 'missing service account credentials';
    }

    return null;
  }

  return 'missing Google Drive credentials';
}

async function getServiceAccountAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);

  const assertion = jwt.sign(
    {
      iss: serviceAccount.clientEmail,
      scope: GOOGLE_DRIVE_SCOPE,
      aud: serviceAccount.tokenUri,
      iat: now,
      exp: now + 3600,
    },
    serviceAccount.privateKey,
    { algorithm: 'RS256' }
  );

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  }).toString();

  const response = await axios.post(serviceAccount.tokenUri, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.data.access_token;
}

async function getOAuthRefreshTokenAccessToken(oauthConfig) {
  const body = new URLSearchParams({
    client_id: oauthConfig.clientId,
    client_secret: oauthConfig.clientSecret,
    refresh_token: oauthConfig.refreshToken,
    grant_type: 'refresh_token',
  }).toString();

  const response = await axios.post(oauthConfig.tokenUri, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.data.access_token;
}

async function getGoogleAccessToken(config) {
  if (config.authType === 'oauth_refresh_token') {
    return getOAuthRefreshTokenAccessToken(config.oauthRefreshToken);
  }

  if (config.authType === 'service_account') {
    return getServiceAccountAccessToken(config.serviceAccount);
  }

  throw new Error('No supported Google Drive authentication method configured');
}

function getMimeType(filePath) {
  if (filePath.endsWith('.sql')) {
    return 'application/sql';
  }

  if (filePath.endsWith('.json')) {
    return 'application/json';
  }

  return 'application/octet-stream';
}

function getAxiosErrorDetails(error) {
  const status = error?.response?.status || null;
  const responseData = error?.response?.data;
  const errorCode = responseData?.error || error?.code || null;
  const errorDescription =
    responseData?.error_description ||
    responseData?.message ||
    responseData?.error?.message ||
    null;

  return {
    status,
    errorCode,
    errorDescription,
    responseData,
  };
}

function createGoogleDriveBackupError(error, config, stage) {
  const details = getAxiosErrorDetails(error);
  const readableStage = stage === 'authenticate' ? 'autentikasi Google Drive' : 'upload ke Google Drive';
  const reasonParts = [details.errorCode, details.errorDescription].filter(Boolean);
  const reasonText = reasonParts.length > 0
    ? reasonParts.join(' - ')
    : error.message;

  const wrappedError = new Error(`Google Drive backup gagal saat ${readableStage}: ${reasonText}`);
  wrappedError.code = 'GOOGLE_DRIVE_BACKUP_FAILED';
  wrappedError.data = {
    provider: 'google_drive',
    stage,
    status: details.status,
    folderId: config.folderId || null,
    authType: config.authType || null,
    source: config.source || 'env',
    reason: reasonText,
    response: details.responseData || null,
  };

  return wrappedError;
}

function uploadMultipartToDrive({ accessToken, filePath, folderId, metadata }) {
  return new Promise((resolve, reject) => {
    const fileStats = fs.statSync(filePath);
    const boundary = `backup-boundary-${Date.now().toString(16)}`;
    const metadataBuffer = Buffer.from(
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      `${JSON.stringify({ ...metadata, parents: [folderId] })}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${getMimeType(filePath)}\r\n\r\n`
    );
    const closingBuffer = Buffer.from(`\r\n--${boundary}--\r\n`);

    const request = https.request(
      {
        method: 'POST',
        hostname: 'www.googleapis.com',
        path: '/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,webContentLink,createdTime,size,parents',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': metadataBuffer.length + fileStats.size + closingBuffer.length,
        },
      },
      response => {
        const chunks = [];

        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => {
          const responseText = Buffer.concat(chunks).toString('utf8');

          if (response.statusCode >= 200 && response.statusCode < 300) {
            try {
              resolve(JSON.parse(responseText));
            } catch (error) {
              reject(new Error(`Google Drive upload returned invalid JSON: ${error.message}`));
            }
            return;
          }

          reject(
            new Error(
              `Google Drive upload failed (${response.statusCode}): ${responseText || 'Unknown error'}`
            )
          );
        });
      }
    );

    request.on('error', reject);
    request.write(metadataBuffer);

    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', error => request.destroy(error));
    fileStream.on('end', () => {
      request.write(closingBuffer);
      request.end();
    });
    fileStream.pipe(request, { end: false });
  });
}

function updateMultipartInDrive({ accessToken, fileId, filePath, metadata }) {
  return new Promise((resolve, reject) => {
    const fileStats = fs.statSync(filePath);
    const boundary = `backup-boundary-${Date.now().toString(16)}`;
    const metadataBuffer = Buffer.from(
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${getMimeType(filePath)}\r\n\r\n`
    );
    const closingBuffer = Buffer.from(`\r\n--${boundary}--\r\n`);

    const request = https.request(
      {
        method: 'PATCH',
        hostname: 'www.googleapis.com',
        path: `/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,webContentLink,createdTime,size,parents`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': metadataBuffer.length + fileStats.size + closingBuffer.length,
        },
      },
      response => {
        const chunks = [];

        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => {
          const responseText = Buffer.concat(chunks).toString('utf8');

          if (response.statusCode >= 200 && response.statusCode < 300) {
            try {
              resolve(JSON.parse(responseText));
            } catch (error) {
              reject(new Error(`Google Drive update returned invalid JSON: ${error.message}`));
            }
            return;
          }

          reject(
            new Error(
              `Google Drive update failed (${response.statusCode}): ${responseText || 'Unknown error'}`
            )
          );
        });
      }
    );

    request.on('error', reject);
    request.write(metadataBuffer);

    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', error => request.destroy(error));
    fileStream.on('end', () => {
      request.write(closingBuffer);
      request.end();
    });
    fileStream.pipe(request, { end: false });
  });
}

async function listDriveFilesInFolder({ accessToken, folderId }) {
  const files = [];
  let pageToken = null;

  do {
    const response = await axios.get('https://www.googleapis.com/drive/v3/files', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        q: `'${folderId}' in parents and trashed = false`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: 'nextPageToken, files(id, name, size, mimeType, modifiedTime, parents)',
        pageSize: 1000,
        pageToken,
      },
    });

    files.push(...(response.data.files || []));
    pageToken = response.data.nextPageToken || null;
  } while (pageToken);

  return files;
}

async function maybeUploadBackupToGoogleDrive(backupResult, overrides = null) {
  const config = resolveGoogleDriveConfig(overrides);
  const configIssue = validateGoogleDriveConfig(config);

  if (configIssue) {
    if (config.required && configIssue !== 'disabled') {
      throw new Error(`Google Drive backup is required but ${configIssue}.`);
    }

    return {
      enabled: config.enabled,
      uploaded: false,
      skipped: true,
      reason: configIssue,
      source: config.source,
    };
  }

  try {
    let accessToken;
    try {
      accessToken = await getGoogleAccessToken(config);
    } catch (error) {
      throw createGoogleDriveBackupError(error, config, 'authenticate');
    }

    let uploadedFile;
    try {
      uploadedFile = await uploadMultipartToDrive({
      accessToken,
      filePath: backupResult.filePath,
      folderId: config.folderId,
      metadata: {
        name: backupResult.filename,
        description: [
          `Database backup for ${backupResult.database}`,
          `environment=${backupResult.environment}`,
          `format=${backupResult.format || path.extname(backupResult.filename).replace('.', '') || 'unknown'}`,
          `timestamp=${backupResult.timestamp}`,
        ].join(' | '),
      },
    });
    } catch (error) {
      throw createGoogleDriveBackupError(error, config, 'upload');
    }

    return {
      enabled: true,
      uploaded: true,
      skipped: false,
      folderId: config.folderId,
      authType: config.authType,
      source: config.source,
      fileId: uploadedFile.id,
      fileName: uploadedFile.name,
      webViewLink: uploadedFile.webViewLink || `https://drive.google.com/file/d/${uploadedFile.id}/view`,
      webContentLink: uploadedFile.webContentLink || null,
      createdTime: uploadedFile.createdTime || null,
      size: uploadedFile.size || String(backupResult.size || ''),
    };
  } catch (error) {
    if (config.required) {
      throw error;
    }

    return {
      enabled: true,
      uploaded: false,
      skipped: false,
      folderId: config.folderId,
      authType: config.authType,
      source: config.source,
      error: error.message,
    };
  }
}

module.exports = {
  maybeUploadBackupToGoogleDrive,
  parseFolderId,
  getGoogleDriveConfig,
  resolveGoogleDriveConfig,
  validateGoogleDriveConfig,
  getGoogleAccessToken,
  uploadMultipartToDrive,
  updateMultipartInDrive,
  listDriveFilesInFolder,
  getMimeType,
};
