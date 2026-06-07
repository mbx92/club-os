const express = require('express');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');
const auditLog = require('../../../middlewares/auditMiddleware');
const {
  createCheckIn,
  getCheckIns,
  getCheckInById,
  updateCheckIn,
  deleteCheckIn,
  getCheckInStats
} = require('../../../controllers/gym/checkIn/checkInController');

const router = express.Router();

/**
 * @route GET /gym/check-ins
 * @name checkIns.list
 * @desc Get all check-ins with filtering
 * @access Private
 * @query page, limit, memberId, serviceType, startDate, endDate, sortBy, sortOrder
 */
router.get('/',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'CheckIn'),
  auditLog('LIST_CHECK_INS'),
  getCheckIns
);

/**
 * @route GET /gym/check-ins/stats
 * @name checkIns.stats
 * @desc Get check-in statistics
 * @access Private
 * @query startDate, endDate, memberId
 */
router.get('/stats',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'CheckIn'),
  auditLog('GET_CHECK_IN_STATS'),
  getCheckInStats
);

/**
 * @route GET /gym/check-ins/:id
 * @name checkIns.get
 * @desc Get check-in by ID
 * @access Private
 */
router.get('/:id',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'CheckIn'),
  auditLog('GET_CHECK_IN'),
  getCheckInById
);

/**
 * @route POST /gym/check-ins
 * @name checkIns.create
 * @desc Create check-in with auto session usage
 * @access Private
 * @body memberId, serviceType (optional), notes (optional)
 * @feature Auto-uses session for session-based services
 */
router.post('/',
  authenticate,
  requireModule('gym'),
  authorizeCasl('create', 'CheckIn'),
  auditLog('CREATE_CHECK_IN'),
  createCheckIn
);

/**
 * @route PUT /gym/check-ins/:id
 * @name checkIns.update
 * @desc Update check-in (checkout time or notes)
 * @access Private
 * @body checkOutTime (optional), notes (optional)
 */
router.put('/:id',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'CheckIn'),
  auditLog('UPDATE_CHECK_IN'),
  updateCheckIn
);

/**
 * @route DELETE /gym/check-ins/:id
 * @name checkIns.delete
 * @desc Delete check-in record
 * @access Private
 */
router.delete('/:id',
  authenticate,
  requireModule('gym'),
  authorizeCasl('delete', 'CheckIn'),
  auditLog('DELETE_CHECK_IN'),
  deleteCheckIn
);

module.exports = router;
