/**
 * Database Management Routes
 * SUPER ADMIN OR ADMIN
 */

const express = require('express');
const router = express.Router();
const databaseController = require('../../controllers/admin/databaseController');
const { authenticate } = require('../../middlewares/authMiddleware');
const { requireSuperAdminOrAdmin } = require('../../middlewares/roleMiddleware');

// Apply authentication and role check to all routes
router.use(authenticate);
router.use(requireSuperAdminOrAdmin);

/**
 * @route   POST /api/v1/admin/database/backup
 * @desc    Create database backup
 * @body    tenantId? Optional tenant ID used as settings source for backup.googleDrive
 * @access  Super Admin or Admin
 */
router.post('/backup', databaseController.createDatabaseBackup);

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

module.exports = router;
