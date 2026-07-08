const fs = require('fs');
const crypto = require('crypto');
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getMimeType } = require('./googleDriveBackup');

function parseBoolean(value) {
  return String(value).toLowerCase() === 'true';
}

function hasOwnProperty(obj, key) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function parseEndpoint(value, useSsl = true) {
  if (!value) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const normalized = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `${useSsl ? 'https' : 'http'}://${trimmed}`;

  try {
    const parsed = new URL(normalized);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (error) {
    return null;
  }
}

function normalizeObjectPrefix(value) {
  if (!value) return '';
  return String(value).trim().replace(/^\/+|\/+$/g, '');
}

function getMinioBackupConfig() {
  const useSsl = parseBoolean(process.env.MINIO_BACKUP_USE_SSL);

  return {
    enabled: parseBoolean(process.env.MINIO_BACKUP_ENABLED),
    required: parseBoolean(process.env.MINIO_BACKUP_REQUIRED),
    endpoint: parseEndpoint(process.env.MINIO_BACKUP_ENDPOINT, useSsl),
    region: process.env.MINIO_BACKUP_REGION || 'us-east-1',
    bucket: process.env.MINIO_BACKUP_BUCKET || null,
    accessKeyId: process.env.MINIO_BACKUP_ACCESS_KEY || null,
    secretAccessKey: process.env.MINIO_BACKUP_SECRET_KEY || null,
    objectPrefix: normalizeObjectPrefix(process.env.MINIO_BACKUP_OBJECT_PREFIX),
    forcePathStyle: hasOwnProperty(process.env, 'MINIO_BACKUP_FORCE_PATH_STYLE')
      ? parseBoolean(process.env.MINIO_BACKUP_FORCE_PATH_STYLE)
      : true,
    useSsl,
  };
}

function resolveMinioBackupConfig(overrides = null) {
  const baseConfig = getMinioBackupConfig();
  const configOverrides = overrides || {};
  const useSsl = hasOwnProperty(configOverrides, 'useSsl')
    ? Boolean(configOverrides.useSsl)
    : baseConfig.useSsl;

  return {
    enabled: hasOwnProperty(configOverrides, 'enabled')
      ? Boolean(configOverrides.enabled)
      : baseConfig.enabled,
    required: hasOwnProperty(configOverrides, 'required')
      ? Boolean(configOverrides.required)
      : baseConfig.required,
    endpoint: parseEndpoint(configOverrides.endpoint || baseConfig.endpoint, useSsl),
    region: configOverrides.region || baseConfig.region || 'us-east-1',
    bucket: configOverrides.bucket || baseConfig.bucket,
    accessKeyId: configOverrides.accessKeyId || baseConfig.accessKeyId,
    secretAccessKey: configOverrides.secretAccessKey || baseConfig.secretAccessKey,
    objectPrefix: normalizeObjectPrefix(configOverrides.objectPrefix || baseConfig.objectPrefix),
    forcePathStyle: hasOwnProperty(configOverrides, 'forcePathStyle')
      ? Boolean(configOverrides.forcePathStyle)
      : baseConfig.forcePathStyle,
    useSsl,
    source: configOverrides.source || (overrides ? 'tenant_settings' : 'env'),
  };
}

function validateMinioBackupConfig(config) {
  if (!config.enabled) {
    return 'disabled';
  }

  if (!config.endpoint) {
    return 'missing endpoint';
  }

  if (!config.bucket) {
    return 'missing bucket';
  }

  if (!config.accessKeyId || !config.secretAccessKey) {
    return 'missing access credentials';
  }

  return null;
}

function buildObjectKey(backupResult, objectPrefix) {
  return objectPrefix ? `${objectPrefix}/${backupResult.filename}` : backupResult.filename;
}

function buildTestObjectKey(objectPrefix) {
  const suffix = `clubos-minio-test-${Date.now()}.txt`;
  return objectPrefix ? `${objectPrefix}/__healthcheck__/${suffix}` : `__healthcheck__/${suffix}`;
}

function sanitizeMetadataValue(value) {
  return String(value || '')
    .slice(0, 200)
    .replace(/[^a-zA-Z0-9!_.*'() -]/g, '_');
}

function buildContentMd5(buffer) {
  return crypto.createHash('md5').update(buffer).digest('base64');
}

function createS3Client(config) {
  return new S3Client({
    region: config.region || 'us-east-1',
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function createMinioOperationError(error, config, stage, objectKey) {
  const status = error?.$metadata?.httpStatusCode || error?.statusCode || null;
  const reason = error?.message || 'Unknown MinIO error';
  const hint = (
    status === 502
    || /xml parse error/i.test(reason)
    || /unexpected content/i.test(reason)
  )
    ? 'Endpoint mengembalikan respons non-S3; cek reverse proxy/CDN dan kompatibilitas path-style pada endpoint.'
    : null;
  const stageLabel = stage === 'cleanup'
    ? 'cleanup'
    : stage === 'connection_test'
      ? 'test koneksi'
      : 'upload';
  const wrappedError = new Error(`MinIO backup gagal saat ${stageLabel}: ${reason}${hint ? ` ${hint}` : ''}`);

  wrappedError.code = 'MINIO_BACKUP_FAILED';
  wrappedError.data = {
    provider: 'minio',
    stage,
    status,
    endpoint: config.endpoint || null,
    bucket: config.bucket || null,
    objectKey: objectKey || null,
    source: config.source || 'env',
    reason,
    hint,
  };

  return wrappedError;
}

async function putObjectToS3(client, config, objectKey, body, contentType, metadata = {}) {
  return client.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: objectKey,
    Body: body,
    ContentLength: body.length,
    ContentMD5: buildContentMd5(body),
    ContentType: contentType,
    Metadata: metadata,
  }));
}

async function maybeUploadBackupToS3(backupResult, overrides = null) {
  const config = resolveMinioBackupConfig(overrides);
  const configIssue = validateMinioBackupConfig(config);

  if (configIssue) {
    if (config.required && configIssue !== 'disabled') {
      throw new Error(`MinIO backup is required but ${configIssue}.`);
    }

    return {
      enabled: config.enabled,
      uploaded: false,
      skipped: true,
      reason: configIssue,
      source: config.source,
    };
  }

  const objectKey = buildObjectKey(backupResult, config.objectPrefix);

  try {
    const client = createS3Client(config);
    const fileBuffer = fs.readFileSync(backupResult.filePath);
    const response = await putObjectToS3(
      client,
      config,
      objectKey,
      fileBuffer,
      getMimeType(backupResult.filePath),
      {
        database: sanitizeMetadataValue(backupResult.database),
        environment: sanitizeMetadataValue(backupResult.environment),
        format: sanitizeMetadataValue(backupResult.format || 'unknown'),
        timestamp: sanitizeMetadataValue(backupResult.timestamp),
      }
    );

    return {
      enabled: true,
      uploaded: true,
      skipped: false,
      provider: 'minio',
      bucket: config.bucket,
      endpoint: config.endpoint,
      region: config.region,
      source: config.source,
      objectKey,
      eTag: response.ETag ? response.ETag.replace(/"/g, '') : null,
      versionId: response.VersionId || null,
    };
  } catch (error) {
    if (config.required) {
      throw createMinioOperationError(error, config, 'upload', objectKey);
    }

    return {
      enabled: true,
      uploaded: false,
      skipped: false,
      provider: 'minio',
      bucket: config.bucket,
      endpoint: config.endpoint,
      region: config.region,
      source: config.source,
      objectKey,
      error: error.message,
    };
  }
}

async function testMinioConnection(overrides = null) {
  const config = resolveMinioBackupConfig(overrides);
  const configIssue = validateMinioBackupConfig(config);

  if (configIssue) {
    return {
      ok: false,
      issue: configIssue,
      provider: 'minio',
      bucket: config.bucket || null,
      endpoint: config.endpoint || null,
      source: config.source || 'env',
    };
  }

  const client = createS3Client(config);
  const objectKey = buildTestObjectKey(config.objectPrefix);
  const payload = Buffer.from('club-os minio connectivity test', 'utf8');

  try {
    const response = await putObjectToS3(
      client,
      config,
      objectKey,
      payload,
      'text/plain; charset=utf-8',
      {
        kind: 'connectivity-test',
        timestamp: sanitizeMetadataValue(new Date().toISOString()),
      }
    );

    let cleanup = { attempted: false, deleted: false, error: null };

    try {
      cleanup.attempted = true;
      await client.send(new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
      }));
      cleanup.deleted = true;
    } catch (error) {
      cleanup.error = error.message;
    }

    return {
      ok: true,
      provider: 'minio',
      bucket: config.bucket,
      endpoint: config.endpoint,
      region: config.region,
      source: config.source,
      objectKey,
      eTag: response.ETag ? response.ETag.replace(/"/g, '') : null,
      cleanup,
    };
  } catch (error) {
    const wrapped = createMinioOperationError(error, config, 'connection_test', objectKey);
    return {
      ok: false,
      provider: 'minio',
      bucket: config.bucket,
      endpoint: config.endpoint,
      region: config.region,
      source: config.source,
      objectKey,
      status: wrapped.data.status,
      issue: wrapped.message,
      reason: wrapped.data.reason,
      hint: wrapped.data.hint || null,
    };
  }
}

module.exports = {
  maybeUploadBackupToS3,
  testMinioConnection,
  getMinioBackupConfig,
  resolveMinioBackupConfig,
  validateMinioBackupConfig,
  parseEndpoint,
  normalizeObjectPrefix,
};
