'use strict';

/**
 * Ticket Priority Routes - Ticketing Module
 * 
 * Routes for ticket priority management
 * @module modules/ticketing/routes/ticketPriority
 */

const express = require('express');
const router = express.Router();
const ticketPriorityController = require('../controllers/ticketPriorityController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

// All routes require authentication and ticketing module access
router.use(authenticate);
router.use(requireModule('ticketing'));

/**
 * @route GET /api/v1/ticketing/priorities
 * @desc Get all ticket priorities
 * @access Private - requires 'read' permission on 'TicketPriority'
 */
router.get('/',
  authorizeCasl('read', 'TicketPriority'),
  ticketPriorityController.getAllPriorities
);

/**
 * @route GET /api/v1/ticketing/priorities/:id
 * @desc Get priority by ID
 * @access Private - requires 'read' permission on 'TicketPriority'
 */
router.get('/:id',
  authorizeCasl('read', 'TicketPriority'),
  ticketPriorityController.getPriorityById
);

/**
 * @route POST /api/v1/ticketing/priorities
 * @desc Create new priority
 * @access Private - requires 'create' permission on 'TicketPriority'
 */
router.post('/',
  authorizeCasl('create', 'TicketPriority'),
  ticketPriorityController.createPriority
);

/**
 * @route PUT /api/v1/ticketing/priorities/:id
 * @desc Update priority
 * @access Private - requires 'update' permission on 'TicketPriority'
 */
router.put('/:id',
  authorizeCasl('update', 'TicketPriority'),
  ticketPriorityController.updatePriority
);

/**
 * @route DELETE /api/v1/ticketing/priorities/:id
 * @desc Delete priority
 * @access Private - requires 'delete' permission on 'TicketPriority'
 */
router.delete('/:id',
  authorizeCasl('delete', 'TicketPriority'),
  ticketPriorityController.deletePriority
);

module.exports = router;
