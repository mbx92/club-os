/**
 * Database Management Routes
 * SUPER ADMIN OR ADMIN
 */

const express = require('express');
const router = express.Router();
const databaseController = require('../../controllers/admin/databaseController');
const googleDriveOAuthController = require('../../controllers/admin/googleDriveOAuthController');
const { authenticate } = require('../../middlewares/authMiddleware');
const { requireSuperAdminOrAdmin } = require('../../middlewares/superAdminMiddleware');

/**
 * Public OAuth callback from Google (validated via signed state token).
 */
router.get('/google-drive/oauth/callback', googleDriveOAuthController.handleGoogleDriveOAuthCallback);

// Apply authentication and role check to all routes below
router.use(authenticate);
router.use(requireSuperAdminOrAdmin);

/**
 * @route   POST /api/v1/admin/database/backup
 * @desc    Create database backup
 * @body    tenantId? Optional tenant ID used as settings source for backup.googleDrive/minio
 * @body    cloudProvider? Optional: google_drive | minio
 * @access  Super Admin or Admin
 */
router.post('/backup', databaseController.createDatabaseBackup);

/**
 * @route   POST /api/v1/admin/database/minio/test
 * @desc    Test MinIO/S3-compatible backup connection for tenant
 * @body    tenantId? Optional tenant ID used as settings source for backup.minio
 * @access  Super Admin or Admin
 */
router.post('/minio/test', databaseController.testMinioBackupConnection);

/**
 * @route   GET /api/v1/admin/database/google-drive/oauth/status
 * @desc    Google Drive OAuth connection status for tenant backup
 * @access  Super Admin or Admin
 */
router.get('/google-drive/oauth/status', googleDriveOAuthController.getGoogleDriveOAuthStatus);

/**
 * @route   GET /api/v1/admin/database/google-drive/oauth/authorize-url
 * @desc    Build Google OAuth authorize URL for tenant backup
 * @access  Super Admin or Admin
 */
router.get('/google-drive/oauth/authorize-url', googleDriveOAuthController.getGoogleDriveOAuthAuthorizeUrl);

/**
 * @route   POST /api/v1/admin/database/google-drive/oauth/disconnect
 * @desc    Remove stored Google Drive refresh token for tenant
 * @access  Super Admin or Admin
 */
router.post('/google-drive/oauth/disconnect', googleDriveOAuthController.disconnectGoogleDriveOAuth);

/**
 * @route   POST /api/v1/admin/database/google-drive/oauth/test
 * @desc    Test Google Drive backup authentication for tenant
 * @access  Super Admin or Admin
 */
router.post('/google-drive/oauth/test', googleDriveOAuthController.testGoogleDriveOAuthConnection);

/**
 * @route   GET /api/v1/admin/database/backups
 * @desc    List all backup files
 * @access  Super Admin or Admin
 */
router.get('/backups', databaseController.listBackups);

/**
 * @route   GET /api/v1/admin/database/download/:filename
 * @desc    Download backup file
 * @access  Super Admin or Admin
 */
router.get('/download/:filename', databaseController.downloadBackup);

/**
 * @route   DELETE /api/v1/admin/database/backups/:filename
 * @desc    Delete backup file
 * @access  Super Admin or Admin
 */
router.delete('/backups/:filename', databaseController.deleteBackup);

/**
 * @route   GET /api/v1/admin/database/info
 * @desc    Get database information and statistics
 * @access  Super Admin or Admin
 */
router.get('/info', databaseController.getDatabaseInfo);

router.get('/import/sources', databaseController.listImportSources);
router.get('/import/analyze', databaseController.analyzeImportSource);
router.get('/import/status', databaseController.getImportDatabaseStatus);
router.post('/import/drop-legacy', databaseController.dropLegacyTables);
router.post('/import/migrate', databaseController.runImportMigrations);
router.post('/import/restore', databaseController.restoreImportSource);

module.exports = router;
