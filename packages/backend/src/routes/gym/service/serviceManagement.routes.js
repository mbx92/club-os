const express = require('express');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');
const auditLog = require('../../../middlewares/auditMiddleware');
const {
  getAllActiveServices,
  getServicesCalendar,
  assignTrainerToService,
  getServiceAlerts,
  getServiceStatistics,
  getServicesByMemberId
} = require('../../../controllers/gym/service/serviceManagementController');

const router = express.Router();

/**
 * @route GET /service/management/list
 * @name serviceManagement.listAll
 * @desc Get all active services with interactive display (remaining sessions, expiry dates)
 * @access Private
 * @query page, limit, search, serviceType, status, trainerId, expiringInDays, lowSessionsThreshold, sortBy, sortOrder
 */
router.get('/list',
  authenticate,
  requireModule('serviceManagement'),
  authorize('read', 'ActiveService'),
  auditLog('LIST_ALL_ACTIVE_SERVICES'),
  getAllActiveServices
);

/**
 * @route GET /service/management/calendar
 * @name serviceManagement.calendar
 * @desc Get services calendar view for a specific month
 * @access Private
 * @query year, month, serviceType, memberId
 */
router.get('/calendar',
  authenticate,
  requireModule('serviceManagement'),
  authorize('read', 'ActiveService'),
  auditLog('GET_SERVICES_CALENDAR'),
  getServicesCalendar
);

/**
 * @route GET /service/management/alerts
 * @name serviceManagement.alerts
 * @desc Get services with expiration alerts and low sessions
 * @access Private
 * @query daysThreshold (default: 7), lowSessionsThreshold (default: 3)
 */
router.get('/alerts',
  authenticate,
  requireModule('serviceManagement'),
  authorize('read', 'ActiveService'),
  auditLog('GET_SERVICE_ALERTS'),
  getServiceAlerts
);

/**
 * @route GET /service/management/stats
 * @name serviceManagement.stats
 * @desc Get service statistics for dashboard
 * @access Private
 */
router.get('/stats',
  authenticate,
  requireModule('serviceManagement'),
  authorize('read', 'ActiveService'),
  auditLog('GET_SERVICE_STATISTICS'),
  getServiceStatistics
);

/**
 * @route GET /service/management/member/:memberId
 * @name serviceManagement.getByMember
 * @desc Get all services for a specific member with detailed info
 * @access Private
 * @query status, serviceType, includeExpired
 */
router.get('/member/:memberId',
  authenticate,
  requireModule('serviceManagement'),
  authorize('read', 'ActiveService'),
  auditLog('GET_SERVICES_BY_MEMBER'),
  getServicesByMemberId
);

/**
 * @route POST /service/management/:serviceId/assign-trainer
 * @name serviceManagement.assignTrainer
 * @desc Assign or reassign trainer to an active service
 * @access Private
 * @body trainerId
 */
router.post('/:serviceId/assign-trainer',
  authenticate,
  requireModule('serviceManagement'),
  authorize('update', 'ActiveService'),
  auditLog('ASSIGN_TRAINER_SERVICE_MANAGEMENT'),
  assignTrainerToService
);

module.exports = router;
