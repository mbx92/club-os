const express = require('express');
const router = express.Router();
const revenueController = require('../../controllers/admin/revenueController');
const { authenticate } = require('../../middlewares/authMiddleware');
const { requireSuperAdmin } = require('../../middlewares/superAdminMiddleware');

/**
 * Revenue Management Routes
 * All routes require super admin authentication
 */

// Preview invitation revenue impact
router.get('/invitation/preview',
  authenticate,
  requireSuperAdmin,
  revenueController.previewInvitationRevenue
);

// Recalculate invitation revenue (selected orders)
router.post('/invitation/recalculate',
  authenticate,
  requireSuperAdmin,
  revenueController.recalculateInvitationRevenue
);

module.exports = router;
