'use strict';

/**
 * Ticket Comment Routes - Ticketing Module
 * 
 * Routes for ticket comments
 * @module modules/ticketing/routes/ticketComment
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // Merge params to access :ticketId
const ticketCommentController = require('../controllers/ticketCommentController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

// All routes require authentication and ticketing module access
router.use(authenticate);
router.use(requireModule('ticketing'));

/**
 * @route GET /api/v1/ticketing/tickets/:ticketId/comments
 * @desc Get all comments for a ticket
 * @access Private - requires 'read' permission on 'TicketComment'
 */
router.get('/',
  authorizeCasl('read', 'TicketComment'),
  ticketCommentController.getTicketComments
);

/**
 * @route POST /api/v1/ticketing/tickets/:ticketId/comments
 * @desc Create comment for a ticket
 * @access Private - requires 'create' permission on 'TicketComment'
 */
router.post('/',
  authorizeCasl('create', 'TicketComment'),
  ticketCommentController.createComment
);

/**
 * @route PUT /api/v1/ticketing/tickets/:ticketId/comments/:id
 * @desc Update comment
 * @access Private - requires 'update' permission on 'TicketComment'
 */
router.put('/:id',
  authorizeCasl('update', 'TicketComment'),
  ticketCommentController.updateComment
);

/**
 * @route DELETE /api/v1/ticketing/tickets/:ticketId/comments/:id
 * @desc Delete comment
 * @access Private - requires 'delete' permission on 'TicketComment'
 */
router.delete('/:id',
  authorizeCasl('delete', 'TicketComment'),
  ticketCommentController.deleteComment
);

module.exports = router;
