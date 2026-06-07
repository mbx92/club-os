/**
 * Feature Sync Controller
 * 
 * Controller untuk manage feature synchronization (Super Admin only)
 * 
 * @module controllers/featureSyncController
 */

const FeatureSyncService = require('../../../services/featureSyncService');

/**
 * Sync all subscription plans with feature registry
 * 
 * @route   POST /api/admin/features/sync
 * @access  Super Admin only
 */
exports.syncAllPlans = async (req, res) => {
  try {
    const result = await FeatureSyncService.syncAllPlans();

    res.json({
      success: true,
      message: `Synced ${result.synced.length} plans successfully`,
      data: result
    });
  } catch (error) {
    console.error('Error syncing plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync plans',
      error: error.message
    });
  }
};

/**
 * Sync specific plan by ID
 * 
 * @route   POST /api/admin/features/sync/:planId
 * @access  Super Admin only
 */
exports.syncPlanById = async (req, res) => {
  try {
    const { planId } = req.params;
    const result = await FeatureSyncService.syncPlanById(planId);

    res.json({
      success: true,
      message: `Plan ${result.planName} synced successfully`,
      data: result
    });
  } catch (error) {
    console.error('Error syncing plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync plan',
      error: error.message
    });
  }
};

/**
 * Compare current features with registry (dry-run)
 * 
 * @route   GET /api/admin/features/compare
 * @access  Super Admin only
 */
exports.compareWithRegistry = async (req, res) => {
  try {
    const comparison = await FeatureSyncService.compareWithRegistry();

    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Error comparing features:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compare features',
      error: error.message
    });
  }
};

/**
 * Preview features for a specific plan
 * 
 * @route   GET /api/admin/features/preview/:planName
 * @access  Super Admin only
 */
exports.previewFeatures = async (req, res) => {
  try {
    const { planName } = req.params;
    const features = FeatureSyncService.previewFeatures(planName);

    res.json({
      success: true,
      data: {
        planName,
        features
      }
    });
  } catch (error) {
    console.error('Error previewing features:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview features',
      error: error.message
    });
  }
};

/**
 * Get feature metadata for admin UI
 * 
 * @route   GET /api/admin/features/metadata
 * @access  Super Admin only
 */
exports.getMetadata = async (req, res) => {
  try {
    const metadata = FeatureSyncService.getMetadata();

    res.json({
      success: true,
      data: metadata
    });
  } catch (error) {
    console.error('Error getting metadata:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get feature metadata',
      error: error.message
    });
  }
};

/**
 * Health check: Verify all plans are in sync
 * 
 * @route   GET /api/admin/features/health
 * @access  Super Admin only
 */
exports.healthCheck = async (req, res) => {
  try {
    const health = await FeatureSyncService.healthCheck();

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error checking health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check health',
      error: error.message
    });
  }
};

/**
 * Create missing plans from registry
 * 
 * @route   POST /api/admin/features/create-missing
 * @access  Super Admin only
 */
exports.createMissingPlans = async (req, res) => {
  try {
    const result = await FeatureSyncService.createMissingPlans();

    res.json({
      success: true,
      message: result.message,
      data: result.created
    });
  } catch (error) {
    console.error('Error creating missing plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create missing plans',
      error: error.message
    });
  }
};
