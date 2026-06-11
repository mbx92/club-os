const express = require('express');
const router = express.Router();
const trainerController = require('../../../controllers/gym/trainer/trainerController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const { requireFeature } = require('../../../middlewares/featureGateMiddleware');

// All routes require authentication
router.use(authenticate);

// Require trainer management feature (Professional/Enterprise only)
router.use(requireFeature('trainerManagement'));

/**
 * @route   GET /api/v1/gym/trainers
 * @desc    Get all trainers with pagination and filters
 * @access  Private (read permission on Trainer)
 */
router.get('/',
  authorize('read', 'Trainer'),
  trainerController.getAllTrainers
);

/**
 * @route   GET /api/v1/gym/trainers/:id
 * @desc    Get trainer by ID
 * @access  Private (read permission on Trainer)
 */
router.get('/:id',
  authorize('read', 'Trainer'),
  trainerController.getTrainerById
);

/**
 * @route   POST /api/v1/gym/trainers
 * @desc    Create new trainer with auto-create user account
 * @access  Private (create permission on Trainer)
 */
router.post('/',
  authorize('create', 'Trainer'),
  trainerController.createTrainer
);

/**
 * @route   PUT /api/v1/gym/trainers/:id
 * @desc    Update trainer
 * @access  Private (update permission on Trainer)
 */
router.put('/:id',
  authorize('update', 'Trainer'),
  trainerController.updateTrainer
);

/**
 * @route   PATCH /api/v1/gym/trainers/:id/toggle-active
 * @desc    Enable / disable trainer (toggle isActive)
 * @access  Private (update permission on Trainer)
 */
router.patch('/:id/toggle-active',
  authorize('update', 'Trainer'),
  trainerController.toggleTrainerActive
);

/**
 * @route   POST /api/v1/gym/trainers/:id/restore
 * @desc    Restore soft-deleted trainer
 * @access  Private (update permission on Trainer)
 */
router.post('/:id/restore',
  authorize('update', 'Trainer'),
  trainerController.restoreTrainer
);

/**
 * @route   DELETE /api/v1/gym/trainers/:id
 * @desc    Delete trainer (soft delete)
 * @access  Private (delete permission on Trainer)
 */
router.delete('/:id',
  authorize('delete', 'Trainer'),
  trainerController.deleteTrainer
);

/**
 * @route   POST /api/v1/gym/trainers/:id/reset-password
 * @desc    Reset trainer password
 * @access  Private (update permission on Trainer)
 */
router.post('/:id/reset-password',
  authorize('update', 'Trainer'),
  trainerController.resetTrainerPassword
);

/**
 * @route   GET /api/v1/gym/trainers/:id/commissions
 * @desc    Get trainer commissions with pagination
 * @access  Private (read permission on TrainerCommission)
 * @feature Requires trainerCommission feature
 */
router.get('/:id/commissions',
  requireFeature('trainerCommission'),
  authorize('read', 'TrainerCommission'),
  trainerController.getTrainerCommissions
);

/**
 * @route   POST /api/v1/gym/trainers/:id/commissions/:commissionId/pay
 * @desc    Pay trainer commission
 * @access  Private (update permission on TrainerCommission)
 * @feature Requires trainerCommission feature
 */
router.post('/:id/commissions/:commissionId/pay',
  requireFeature('trainerCommission'),
  authorize('update', 'TrainerCommission'),
  trainerController.payCommission
);

/**
 * @route   POST /api/v1/gym/trainers/commissions/backfill
 * @desc    Backfill missing commissions for active services that have a trainer assigned
 *          but no commission record. Use ?dryRun=true to preview without writing to DB.
 * @access  Private (manage permission on TrainerCommission)
 * @feature Requires trainerCommission feature
 */
router.post('/commissions/backfill',
  requireFeature('trainerCommission'),
  authorize('manage', 'TrainerCommission'),
  trainerController.backfillCommissions
);

module.exports = router;
