const express = require('express');
const router = express.Router();
const ptSessionController = require('../../../controllers/gym/pt/ptSessionController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');
const auditLog = require('../../../middlewares/auditMiddleware');

router.use(authenticate);
router.use(requireModule('serviceManagement'));

/**
 * @route GET /gym/pt-sessions
 * @desc  Get all PT sessions with filters and pagination
 */
router.get('/',
  authorizeCasl('read', 'PTSession'),
  auditLog('GET_PT_SESSIONS'),
  ptSessionController.getAllPTSessions
);

/**
 * @route GET /gym/pt-sessions/:id
 * @desc  Get a single PT session by ID
 */
router.get('/:id',
  authorizeCasl('read', 'PTSession'),
  auditLog('GET_PT_SESSION'),
  ptSessionController.getPTSessionById
);

/**
 * @route POST /gym/pt-sessions
 * @desc  Create a new PT session
 * @body  activeServiceId, trainerId, memberId, sessionDate, durationMinutes, notes
 */
router.post('/',
  authorizeCasl('create', 'PTSession'),
  auditLog('CREATE_PT_SESSION'),
  ptSessionController.createPTSession
);

/**
 * @route PUT /gym/pt-sessions/:id
 * @desc  Update a PT session (status, notes, sessionDate, exerciseLog, etc.)
 * @body  status: scheduled | completed | cancelled | no_show
 *        deductSession (boolean, default true) — deduct from remainingSessions when completing
 */
router.put('/:id',
  authorizeCasl('update', 'PTSession'),
  auditLog('UPDATE_PT_SESSION'),
  ptSessionController.updatePTSession
);

/**
 * @route DELETE /gym/pt-sessions/:id
 * @desc  Soft-delete a PT session. Refunds session to active service if sessionUsed=true.
 */
router.delete('/:id',
  authorizeCasl('delete', 'PTSession'),
  auditLog('DELETE_PT_SESSION'),
  ptSessionController.deletePTSession
);

module.exports = router;
