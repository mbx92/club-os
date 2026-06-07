const express = require('express');
const router = express.Router();
const schedulerController = require('../../controllers/admin/schedulerController');
const { authenticate } = require('../../middlewares/authMiddleware');
const { requireSuperAdmin } = require('../../middlewares/superAdminMiddleware');

/**
 * Scheduler Monitoring Routes
 * All routes require super admin authentication
 */

// Get scheduler status
router.get('/status', 
  authenticate, 
  requireSuperAdmin,
  schedulerController.getStatus
);

// Trigger manual cleanups
router.post('/trigger/log-cleanup',
  authenticate,
  requireSuperAdmin,
  schedulerController.triggerLogCleanup
);

router.post('/trigger/report-cleanup',
  authenticate,
  requireSuperAdmin,
  schedulerController.triggerReportCleanup
);

router.post('/trigger/session-cleanup',
  authenticate,
  requireSuperAdmin,
  schedulerController.triggerSessionCleanup
);

module.exports = router;
