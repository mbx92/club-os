'use strict';

/**
 * Ticket Routes - Ticketing Module
 * 
 * Routes for ticket management
 * @module modules/ticketing/routes/ticket
 */

const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

// All routes require authentication and ticketing module access
router.use(authenticate);
router.use(requireModule('ticketing'));

/**
 * @route GET /api/v1/ticketing/tickets
 * @desc Get all tickets with filters
 * @access Private - requires 'read' permission on 'Ticket'
 */
router.get('/',
  authorizeCasl('read', 'Ticket'),
  ticketController.getAllTickets
);

/**
 * @route GET /api/v1/ticketing/tickets/:id
 * @desc Get ticket by ID
 * @access Private - requires 'read' permission on 'Ticket'
 */
router.get('/:id',
  authorizeCasl('read', 'Ticket'),
  ticketController.getTicketById
);

/**
 * @route POST /api/v1/ticketing/tickets
 * @desc Create new ticket
 * @access Private - requires 'create' permission on 'Ticket'
 */
router.post('/',
  authorizeCasl('create', 'Ticket'),
  ticketController.createTicket
);

/**
 * @route PUT /api/v1/ticketing/tickets/:id
 * @desc Update ticket
 * @access Private - requires 'update' permission on 'Ticket'
 */
router.put('/:id',
  authorizeCasl('update', 'Ticket'),
  ticketController.updateTicket
);

/**
 * @route PATCH /api/v1/ticketing/tickets/:id/status
 * @desc Update ticket status
 * @access Private - requires 'update' permission on 'Ticket'
 */
router.patch('/:id/status',
  authorizeCasl('update', 'Ticket'),
  ticketController.updateTicketStatus
);

/**
 * @route PATCH /api/v1/ticketing/tickets/:id/assign
 * @desc Assign ticket to staff
 * @access Private - requires 'update' permission on 'Ticket'
 */
router.patch('/:id/assign',
  authorizeCasl('update', 'Ticket'),
  ticketController.assignTicket
);

/**
 * @route DELETE /api/v1/ticketing/tickets/:id
 * @desc Delete ticket
 * @access Private - requires 'delete' permission on 'Ticket'
 */
router.delete('/:id',
  authorizeCasl('delete', 'Ticket'),
  ticketController.deleteTicket
);

module.exports = router;
