'use strict';

/**
 * Restaurant Table Routes - Restaurant Module
 * 
 * @module modules/restaurant/routes/table.routes
 */

const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

// All routes require authentication and restaurant module access
router.use(authenticate);
router.use(requireModule('restaurant'));

/**
 * @route GET /api/v1/restaurant/tables
 * @desc Get all tables with filters
 * @query locationId - filter by location
 * @query status - filter by status (available, occupied, reserved, cleaning)
 * @query section - filter by section
 * @access Private - requires 'read' permission on 'RestaurantTable'
 */
router.get('/',
  authorize('read', 'RestaurantTable'),
  tableController.getAllTables
);

/**
 * @route GET /api/v1/restaurant/tables/statistics
 * @desc Get table occupancy statistics
 * @query locationId - filter by location
 * @query startDate - start date for stats
 * @query endDate - end date for stats
 * @access Private - requires 'read' permission on 'RestaurantTable'
 */
router.get('/statistics',
  authorize('read', 'RestaurantTable'),
  tableController.getTableStatistics
);

/**
 * @route GET /api/v1/restaurant/tables/stats
 * @desc Get table occupancy statistics (alias)
 * @query locationId - filter by location
 * @query startDate - start date for stats
 * @query endDate - end date for stats
 * @access Private - requires 'read' permission on 'RestaurantTable'
 */
router.get('/stats',
  authorize('read', 'RestaurantTable'),
  tableController.getTableStatistics
);

/**
 * @route GET /api/v1/restaurant/tables/layout/:locationId
 * @desc Get table layout for specific location
 * @access Private - requires 'read' permission on 'RestaurantTable'
 */
router.get('/layout/:locationId',
  authorize('read', 'RestaurantTable'),
  tableController.getTableLayout
);

/**
 * @route GET /api/v1/restaurant/tables/:id
 * @desc Get table by ID with current order
 * @access Private - requires 'read' permission on 'RestaurantTable'
 */
router.get('/:id',
  authorize('read', 'RestaurantTable'),
  tableController.getTableById
);

/**
 * @route POST /api/v1/restaurant/tables
 * @desc Create new table
 * @access Private - requires 'create' permission on 'RestaurantTable'
 */
router.post('/',
  authorize('create', 'RestaurantTable'),
  tableController.createTable
);

/**
 * @route PUT /api/v1/restaurant/tables/:id
 * @desc Update table details
 * @access Private - requires 'update' permission on 'RestaurantTable'
 */
router.put('/:id',
  authorize('update', 'RestaurantTable'),
  tableController.updateTable
);

/**
 * @route DELETE /api/v1/restaurant/tables/:id
 * @desc Delete table
 * @access Private - requires 'delete' permission on 'RestaurantTable'
 */
router.delete('/:id',
  authorize('delete', 'RestaurantTable'),
  tableController.deleteTable
);

/**
 * @route POST /api/v1/restaurant/tables/:id/occupy
 * @desc Occupy table (start order)
 * @body orderId - optional order ID to link
 * @body numberOfGuests - number of guests
 * @access Private - requires 'update' permission on 'RestaurantTable'
 */
router.post('/:id/occupy',
  authorize('update', 'RestaurantTable'),
  tableController.occupyTable
);

/**
 * @route POST /api/v1/restaurant/tables/:id/release
 * @desc Release table (finish order)
 * @access Private - requires 'update' permission on 'RestaurantTable'
 */
router.post('/:id/release',
  authorize('update', 'RestaurantTable'),
  tableController.releaseTable
);

/**
 * @route POST /api/v1/restaurant/tables/:id/reserve
 * @desc Reserve table
 * @body reservedFor - customer name
 * @body reservationTime - reservation datetime
 * @body numberOfGuests - number of guests
 * @body customerName - customer name
 * @body customerPhone - customer phone
 * @access Private - requires 'update' permission on 'RestaurantTable'
 */
router.post('/:id/reserve',
  authorize('update', 'RestaurantTable'),
  tableController.reserveTable
);

/**
 * @route POST /api/v1/restaurant/tables/:id/cleaning
 * @desc Set table for cleaning
 * @access Private - requires 'update' permission on 'RestaurantTable'
 */
router.post('/:id/cleaning',
  authorize('update', 'RestaurantTable'),
  tableController.setForCleaning
);

module.exports = router;
