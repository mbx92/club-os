/**
 * Database Management Controller
 * Handles backup and restore operations
 * SUPER ADMIN ONLY
 */

const fs = require('fs');
const path = require('path');
const { createBackup } = require('../../../scripts/backupDatabase');
const { createSequelizeBackup } = require('../../../scripts/backupDatabaseSequelize');
const { createError } = require('../../utils/errorCodes');
const logger = require('../../utils/logger');
const { resolveBackupOptionsForTenantId } = require('../../utils/backupGoogleDriveConfig');
const productionImportService = require('../../services/productionImportService');

const backupsDir = path.join(process.cwd(), 'backups');
const SUPPORTED_CLOUD_PROVIDERS = ['google_drive', 'minio'];

function createDisabledCloudConfig() {
  return {
    enabled: false,
    required: false,
    source: 'request_scope',
  };
}

function createSelectedCloudConfig(config = {}) {
  return {
    ...config,
    enabled: true,
    required: true,
    source: config.source || 'request_scope',
  };
}

function normalizeCloudProvider(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();

  if (normalized === 'all') {
    return null;
  }

  if (normalized === 'google_drive' || normalized === 'google-drive' || normalized === 'googledrive') {
    return 'google_drive';
  }

  if (normalized === 'minio' || normalized === 's3') {
    return 'minio';
  }

  return '__invalid__';
}

function applyCloudProviderScope(backupOptions, cloudProvider) {
  if (!cloudProvider) {
    return {
      ...backupOptions,
      requestedCloudProvider: null,
    };
  }

  if (cloudProvider === 'google_drive') {
    return {
      ...backupOptions,
      requestedCloudProvider: cloudProvider,
      googleDriveConfig: createSelectedCloudConfig(backupOptions.googleDriveConfig),
      minioConfig: createDisabledCloudConfig(),
    };
  }

  if (cloudProvider === 'minio') {
    return {
      ...backupOptions,
      requestedCloudProvider: cloudProvider,
      googleDriveConfig: createDisabledCloudConfig(),
      minioConfig: createSelectedCloudConfig(backupOptions.minioConfig),
    };
  }

  return backupOptions;
}

async function resolveBackupOptions(req) {
  const targetTenantId = req.body?.tenantId || req.user.tenantId || null;
  const cloudProvider = normalizeCloudProvider(req.body?.cloudProvider);

  if (cloudProvider === '__invalid__') {
    throw createError(
      'VALIDATION_ERROR',
      `cloudProvider harus salah satu dari: ${SUPPORTED_CLOUD_PROVIDERS.join(', ')}`
    );
  }

  const backupOptions = await resolveBackupOptionsForTenantId(targetTenantId);
  return applyCloudProviderScope(backupOptions, cloudProvider);
}

function buildBackupFailure(err, backupOptions = {}) {
  const baseData = {
    targetTenantId: backupOptions.targetTenantId || null,
    targetTenantName: backupOptions.targetTenantName || null,
    resolutionSource: backupOptions.resolutionSource || null,
    requestedCloudProvider: backupOptions.requestedCloudProvider || null,
  };

  if (err?.code === 'GOOGLE_DRIVE_BACKUP_FAILED') {
    return {
      message: err.message,
      data: {
        ...baseData,
        ...(err.data || {}),
      },
    };
  }

  if (err?.code === 'MINIO_BACKUP_FAILED') {
    return {
      message: err.message,
      data: {
        ...baseData,
        ...(err.data || {}),
      },
    };
  }

  if (err?.code === 'NATIVE_BACKUP_FAILED') {
    return {
      message: `Backup database gagal saat menjalankan tool native: ${err.message}`,
      data: {
        ...baseData,
        stage: 'native_backup',
        reason: err.message,
      },
    };
  }

  return {
    message: err?.message || 'Database backup gagal',
    data: {
      ...baseData,
      originalCode: err?.code || null,
    },
  };
}

/**
 * Create database backup
 * POST /api/v1/admin/database/backup
 */
async function createDatabaseBackup(req, res, next) {
  let backupOptions = null;

  try {
    backupOptions = await resolveBackupOptions(req);

    logger.info('Database backup initiated', {
      userId: req.user.id,
      userName: req.user.name,
      isSuperAdmin: req.user.isSuperAdmin,
      targetTenantId: backupOptions.targetTenantId,
    });

    let result;
    
    // Try native backup first (pg_dump/mysqldump)
    try {
      result = await createBackup(backupOptions);
      result.format = 'sql';
    } catch (err) {
      if (err.code !== 'NATIVE_BACKUP_FAILED') {
        throw err;
      }

      // If native tools not available, use Sequelize backup (JSON format)
      logger.warn('Native backup failed, using Sequelize backup', {
        userId: req.user.id,
        targetTenantId: backupOptions.targetTenantId,
        error: err.message
      });
      
      result = await createSequelizeBackup(backupOptions);
      result.format = 'json';
      result.note = 'Backup created using Sequelize (JSON format). Install PostgreSQL/MySQL client tools for SQL format.';
    }

    logger.info('Database backup completed', {
      userId: req.user.id,
      filename: result.filename,
      size: result.sizeMB + ' MB'
    });

    res.status(201).json({
      success: true,
      message: 'Database backup created successfully',
      data: {
        filename: result.filename,
        size: result.sizeMB + ' MB',
        database: result.database,
        environment: result.environment,
        timestamp: result.timestamp,
        format: result.format || 'sql',
        note: result.note || null,
        downloadUrl: `/api/v1/admin/database/download/${result.filename}`,
        storedLocally: true,
        googleDrive: result.googleDrive || null,
        minio: result.minio || null,
        settingsSourceTenantId: backupOptions.targetTenantId,
        settingsSourceTenantName: backupOptions.targetTenantName || null,
        requestedCloudProvider: backupOptions.requestedCloudProvider || null,
      }
    });
  } catch (err) {
    logger.error('Database backup failed', {
      userId: req.user.id,
      error: err.message,
      stack: err.stack,
      details: err.data || null,
    });

    if (err.isOperational) {
      return next(err);
    }

    const backupFailure = buildBackupFailure(err, backupOptions);

    const wrappedError = createError('BACKUP_FAILED', backupFailure.message, backupFailure.data);
    wrappedError.stack = err.stack;
    return next(wrappedError);
  }
}

/**
 * List all backup files
 * GET /api/v1/admin/database/backups
 */
async function listBackups(req, res, next) {
  try {
    // Create backups directory if not exists
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const files = fs.readdirSync(backupsDir)
      .filter(file => file.endsWith('.sql') || file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(backupsDir, file);
        const stats = fs.statSync(filePath);
        
        // Parse filename to extract metadata
        // Format: backup_[env]_[database]_[timestamp].sql or .json
        const parts = file.replace('.sql', '').replace('.json', '').split('_');
        const environment = parts[1] || 'unknown';
        const format = file.endsWith('.json') ? 'json' : 'sql';
        
        return {
          filename: file,
          size: stats.size,
          sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
          createdAt: stats.mtime.toISOString(),
          environment,
          format,
          downloadUrl: `/api/v1/admin/database/download/${file}`
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort by newest first

    res.json({
      success: true,
      data: {
        backups: files,
        total: files.length,
        totalSizeMB: files.reduce((sum, file) => sum + parseFloat(file.sizeMB), 0).toFixed(2)
      }
    });
  } catch (err) {
    logger.error('Failed to list backups', {
      userId: req.user.id,
      error: err.message
    });
    
    next(createError('INTERNAL_ERROR', 'Failed to list backup files'));
  }
}

/**
 * Download backup file
 * GET /api/v1/admin/database/download/:filename
 */
async function downloadBackup(req, res, next) {
  try {
    const { filename } = req.params;
    
    // Security: validate filename (prevent directory traversal)
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw createError('INVALID_INPUT', 'Invalid filename');
    }
    
    if (!filename.endsWith('.sql') && !filename.endsWith('.json')) {
      throw createError('INVALID_INPUT', 'Only .sql and .json files can be downloaded');
    }

    const filePath = path.join(backupsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw createError('NOT_FOUND', 'Backup file not found');
    }

    logger.info('Backup file downloaded', {
      userId: req.user.id,
      userName: req.user.name,
      filename
    });

    // Set headers for file download
    const contentType = filename.endsWith('.json') ? 'application/json' : 'application/sql';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Stream file to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (err) {
    if (err.isOperational) {
      return next(err);
    }
    
    logger.error('Failed to download backup', {
      userId: req.user.id,
      filename: req.params.filename,
      error: err.message
    });
    
    next(createError('INTERNAL_ERROR', 'Failed to download backup file'));
  }
}

/**
 * Delete backup file
 * DELETE /api/v1/admin/database/backups/:filename
 */
async function deleteBackup(req, res, next) {
  try {
    const { filename } = req.params;
    
    // Security: validate filename
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw createError('INVALID_INPUT', 'Invalid filename');
    }
    
    if (!filename.endsWith('.sql') && !filename.endsWith('.json')) {
      throw createError('INVALID_INPUT', 'Only .sql and .json files can be deleted');
    }

    const filePath = path.join(backupsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw createError('NOT_FOUND', 'Backup file not found');
    }

    // Delete file
    fs.unlinkSync(filePath);

    logger.info('Backup file deleted', {
      userId: req.user.id,
      userName: req.user.name,
      filename
    });

    res.json({
      success: true,
      message: 'Backup file deleted successfully',
      data: { filename }
    });
  } catch (err) {
    if (err.isOperational) {
      return next(err);
    }
    
    logger.error('Failed to delete backup', {
      userId: req.user.id,
      filename: req.params.filename,
      error: err.message
    });
    
    next(createError('INTERNAL_ERROR', 'Failed to delete backup file'));
  }
}

/**
 * Get database info and statistics
 * GET /api/v1/admin/database/info
 */
async function getDatabaseInfo(req, res, next) {
  try {
    const { sequelize } = require('../../models');
    
    // Get database size
    const dialect = sequelize.getDialect();
    let dbInfo = {};
    let lastMigration = 'None';
    
    // Try to get database size based on dialect
    try {
      let sizeQuery;
      
      if (dialect === 'mysql') {
        sizeQuery = `
          SELECT 
            table_schema AS 'database',
            SUM(data_length + index_length) / 1024 / 1024 AS 'sizeMB',
            COUNT(*) AS 'tableCount'
          FROM information_schema.tables 
          WHERE table_schema = DATABASE()
          GROUP BY table_schema
        `;
      } else if (dialect === 'postgres') {
        sizeQuery = `
          SELECT 
            pg_database.datname AS "database",
            pg_database_size(pg_database.datname) / 1024 / 1024 AS "sizeMB",
            (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') AS "tableCount"
          FROM pg_database
          WHERE pg_database.datname = current_database()
        `;
      }
      
      if (sizeQuery) {
        const [results] = await sequelize.query(sizeQuery);
        dbInfo = results[0] || {};
      }
    } catch (sizeErr) {
      logger.warn('Failed to get database size', {
        userId: req.user.id,
        error: sizeErr.message
      });
    }

    // Try to get migration status
    try {
      const [migrations] = await sequelize.query(
        'SELECT name FROM SequelizeMeta ORDER BY name DESC LIMIT 1'
      );
      lastMigration = migrations[0]?.name || 'None';
    } catch (migErr) {
      logger.warn('Failed to get migration status', {
        userId: req.user.id,
        error: migErr.message
      });
    }

    res.json({
      success: true,
      data: {
        database: process.env.DB_NAME,
        dialect,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        environment: process.env.NODE_ENV,
        size: dbInfo.sizeMB ? parseFloat(dbInfo.sizeMB).toFixed(2) + ' MB' : 'Unknown',
        tableCount: dbInfo.tableCount || 'Unknown',
        lastMigration,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    logger.error('Failed to get database info', {
      userId: req.user.id,
      error: err.message,
      stack: err.stack
    });
    
    next(createError('INTERNAL_ERROR', 'Failed to retrieve database information'));
  }
}

async function listImportSources(req, res, next) {
  try {
    const sources = productionImportService.listImportSources();
    res.json({ success: true, data: { sources, total: sources.length } });
  } catch (err) {
    next(createError('INTERNAL_ERROR', err.message));
  }
}

async function analyzeImportSource(req, res, next) {
  try {
    const { sourceId } = req.query;
    if (!sourceId) throw createError('INVALID_INPUT', 'sourceId is required');
    const analysis = productionImportService.analyzeImportSource(sourceId);
    res.json({ success: true, data: analysis });
  } catch (err) {
    if (err.isOperational) return next(err);
    next(createError('INVALID_INPUT', err.message));
  }
}

async function getImportDatabaseStatus(req, res, next) {
  try {
    const status = await productionImportService.getCurrentDatabaseStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    next(createError('INTERNAL_ERROR', err.message));
  }
}

async function dropLegacyTables(req, res, next) {
  try {
    if (req.body?.confirm !== 'DROP-LEGACY') {
      throw createError('INVALID_INPUT', 'Confirmation text must be DROP-LEGACY');
    }

    if (process.env.NODE_ENV === 'production') {
      throw createError('FORBIDDEN', 'Dropping legacy tables from UI is blocked on production');
    }

    const result = await productionImportService.dropLegacyTablesOnDatabase();

    logger.warn('Legacy tables dropped via UI', {
      userId: req.user.id,
      userName: req.user.name,
      dropped: result.dropped,
      database: process.env.DB_NAME,
    });

    res.json({ success: true, message: result.message, data: result });
  } catch (err) {
    if (err.isOperational) return next(err);
    next(createError('INTERNAL_ERROR', err.message));
  }
}

async function runImportMigrations(req, res, next) {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw createError('FORBIDDEN', 'Running migrations from UI is blocked on production');
    }

    const result = await productionImportService.runPendingMigrations();

    logger.info('Migrations run via production import UI', {
      userId: req.user.id,
      userName: req.user.name,
    });

    res.json({ success: true, message: result.message, data: result });
  } catch (err) {
    next(createError('INTERNAL_ERROR', err.message || 'Migration failed'));
  }
}

async function restoreImportSource(req, res, next) {
  try {
    const { sourceId, confirm, dropDatabase = true } = req.body || {};

    if (!sourceId) throw createError('INVALID_INPUT', 'sourceId is required');
    if (confirm !== 'RESTORE') {
      throw createError('INVALID_INPUT', 'Confirmation text must be RESTORE');
    }

    if (process.env.NODE_ENV === 'production') {
      throw createError('FORBIDDEN', 'Restore from UI is blocked on production environment');
    }

    const result = await productionImportService.restoreFromSource(sourceId, { dropDatabase });

    logger.warn('Database restored via production import UI', {
      userId: req.user.id,
      userName: req.user.name,
      sourceId,
      database: process.env.DB_NAME,
      dropDatabase,
    });

    res.json({ success: true, message: result.message, data: result });
  } catch (err) {
    if (err.isOperational) return next(err);
    next(createError('INTERNAL_ERROR', err.message || 'Restore failed'));
  }
}

module.exports = {
  createDatabaseBackup,
  listBackups,
  downloadBackup,
  deleteBackup,
  getDatabaseInfo,
  listImportSources,
  analyzeImportSource,
  getImportDatabaseStatus,
  dropLegacyTables,
  runImportMigrations,
  restoreImportSource,
};
