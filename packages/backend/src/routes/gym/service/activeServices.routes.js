const express = require('express');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireModule, requireFeature, enforceLimit } = require('../../../middlewares/featureGateMiddleware');
const auditLog = require('../../../middlewares/auditMiddleware');
const {
  getMemberActiveServices,
  getActiveServiceById,
  getWalkInActiveServices,
  purchaseServices,
  useSession,
  cancelActiveService,
  assignTrainer
} = require('../../../controllers/gym/service');

const router = express.Router();

/**
 * @route GET /service/active/walkin
 * @name activeServices.listWalkIn
 * @desc List all walk-in active services (memberId IS NULL)
 * @access Private
 * @query status, serviceType, date, page, limit
 */
router.get('/walkin',
  authenticate,
  requireModule('serviceManagement'),
  authorizeCasl('read', 'ActiveService'),
  auditLog('LIST_WALKIN_ACTIVE_SERVICES'),
  getWalkInActiveServices
);

/**
 * @route GET /service/active/:memberId
 * @name activeServices.listByMember
 * @desc Get all active services for a member
 * @access Private
 * @query status, serviceType
 */
router.get('/:memberId',
  authenticate,
  requireModule('serviceManagement'),
  authorizeCasl('read', 'ActiveService'),
  auditLog('LIST_MEMBER_ACTIVE_SERVICES'),
  getMemberActiveServices
);

/**
 * @route GET /service/active/detail/:id
 * @name activeServices.get
 * @desc Get active service by ID
 * @access Private
 */
router.get('/detail/:id',
  authenticate,
  requireModule('serviceManagement'),
  authorizeCasl('read', 'ActiveService'),
  auditLog('GET_ACTIVE_SERVICE'),
  getActiveServiceById
);

/**
 * @route POST /service/active/purchase
 * @name activeServices.purchase
 * @desc Purchase service plan(s) - supports single or bulk purchase with auto tax calculation
 * @access Private
 * @limits Enforces maxActiveServicesPerMember limit
 * @body memberId, servicePlans[] (or legacy: servicePlanId), paymentMethods[] (or legacy: paymentMethod, paidAmount), voucherCode, notes
 * @feature Auto-calculates tax from tenant.settings.transaction.taxEnable if enabled
 */
router.post('/purchase',
  authenticate,
  requireModule('serviceManagement'),
  authorizeCasl('create', 'ActiveService'),
  auditLog('PURCHASE_SERVICE_PLAN'),
  purchaseServices
);

/**
 * @route POST /service/active/bulk-purchase
 * @name activeServices.bulkPurchase
 * @desc Alias for /purchase endpoint (for backward compatibility)
 * @access Private
 * @deprecated Use /purchase endpoint instead (supports both single and bulk)
 */
router.post('/bulk-purchase',
  authenticate,
  requireModule('serviceManagement'),
  authorizeCasl('create', 'ActiveService'),
  auditLog('BULK_PURCHASE_SERVICE_PLANS'),
  purchaseServices
);

/**
 * @route POST /service/active/:id/use-session
 * @name activeServices.useSession
 * @desc Use one session from a session-based active service
 * @access Private
 * @feature sessionTracking
 * @body notes
 */
router.post('/:id/use-session',
  authenticate,
  requireModule('serviceManagement'),
  requireFeature('services.sessionTracking'),
  authorizeCasl('update', 'ActiveService'),
  auditLog('USE_SERVICE_SESSION'),
  useSession
);

/**
 * @route POST /service/active/:id/assign-trainer
 * @name activeServices.assignTrainer
 * @desc Assign or update trainer for an active service
 * @access Private
 * @feature trainerAssignment
 * @body trainerId
 */
router.post('/:id/assign-trainer',
  authenticate,
  requireModule('serviceManagement'),
  requireFeature('services.trainerAssignment'),
  authorizeCasl('update', 'ActiveService'),
  auditLog('ASSIGN_TRAINER_TO_SERVICE'),
  assignTrainer
);

/**
 * @route POST /service/active/:id/cancel
 * @name activeServices.cancel
 * @desc Cancel an active service
 * @access Private
 * @body reason
 */
router.post('/:id/cancel',
  authenticate,
  requireModule('serviceManagement'),
  authorizeCasl('delete', 'ActiveService'),
  auditLog('CANCEL_ACTIVE_SERVICE'),
  cancelActiveService
);

module.exports = router;
