'use strict';

/**
 * Ticket Category Routes - Ticketing Module
 * 
 * Routes for ticket category management
 * @module modules/ticketing/routes/ticketCategory
 */

const express = require('express');
const router = express.Router();
const ticketCategoryController = require('../controllers/ticketCategoryController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

// All routes require authentication and ticketing module access
router.use(authenticate);
router.use(requireModule('ticketing'));

/**
 * @route GET /api/v1/ticketing/categories
 * @desc Get all ticket categories
 * @access Private - requires 'read' permission on 'TicketCategory'
 */
router.get('/',
  authorizeCasl('read', 'TicketCategory'),
  ticketCategoryController.getAllCategories
);

/**
 * @route GET /api/v1/ticketing/categories/:id
 * @desc Get category by ID
 * @access Private - requires 'read' permission on 'TicketCategory'
 */
router.get('/:id',
  authorizeCasl('read', 'TicketCategory'),
  ticketCategoryController.getCategoryById
);

/**
 * @route POST /api/v1/ticketing/categories
 * @desc Create new category
 * @access Private - requires 'create' permission on 'TicketCategory'
 */
router.post('/',
  authorizeCasl('create', 'TicketCategory'),
  ticketCategoryController.createCategory
);

/**
 * @route PUT /api/v1/ticketing/categories/:id
 * @desc Update category
 * @access Private - requires 'update' permission on 'TicketCategory'
 */
router.put('/:id',
  authorizeCasl('update', 'TicketCategory'),
  ticketCategoryController.updateCategory
);

/**
 * @route DELETE /api/v1/ticketing/categories/:id
 * @desc Delete category
 * @access Private - requires 'delete' permission on 'TicketCategory'
 */
router.delete('/:id',
  authorizeCasl('delete', 'TicketCategory'),
  ticketCategoryController.deleteCategory
);

module.exports = router;
