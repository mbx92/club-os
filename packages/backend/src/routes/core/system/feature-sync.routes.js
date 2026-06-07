/**
 * Feature Sync Routes (Super Admin Only)
 * 
 * Routes untuk manage feature synchronization dari registry ke database.
 * Hanya dapat diakses oleh Super Admin.
 * 
 * @module routes/system/featureSync
 */

const express = require('express');
const router = express.Router();
const featureSyncController = require('../../../controllers/core/system/featureSyncController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { requireSuperAdmin } = require('../../../middlewares/superAdminMiddleware');

// All routes require authentication + super admin
router.use(authenticate);
router.use(requireSuperAdmin);

/**
 * @route   GET /api/admin/features/health
 * @desc    Check if all plans are in sync with registry
 * @access  Super Admin only
 */
router.get('/health', featureSyncController.healthCheck);

/**
 * @route   GET /api/admin/features/compare
 * @desc    Compare current features with registry (dry-run)
 * @access  Super Admin only
 */
router.get('/compare', featureSyncController.compareWithRegistry);

/**
 * @route   GET /api/admin/features/metadata
 * @desc    Get feature metadata for admin UI
 * @access  Super Admin only
 */
router.get('/metadata', featureSyncController.getMetadata);

/**
 * @route   GET /api/admin/features/preview/:planName
 * @desc    Preview features for a specific plan
 * @access  Super Admin only
 * @param   {string} planName - Plan name (Basic, Professional, Enterprise)
 */
router.get('/preview/:planName', featureSyncController.previewFeatures);

/**
 * @route   POST /api/admin/features/sync
 * @desc    Sync all subscription plans with registry
 * @access  Super Admin only
 */
router.post('/sync', featureSyncController.syncAllPlans);

/**
 * @route   POST /api/admin/features/sync/:planId
 * @desc    Sync specific plan by ID
 * @access  Super Admin only
 * @param   {string} planId - Plan ID (UUID)
 */
router.post('/sync/:planId', featureSyncController.syncPlanById);

/**
 * @route   POST /api/admin/features/create-missing
 * @desc    Create missing plans from registry
 * @access  Super Admin only
 */
router.post('/create-missing', featureSyncController.createMissingPlans);

module.exports = router;
