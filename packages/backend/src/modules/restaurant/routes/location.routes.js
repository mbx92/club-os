'use strict';

/**
 * Location Routes - Restaurant Module
 * 
 * @module modules/restaurant/routes/location.routes
 */

const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

// All routes require authentication and restaurant module access
router.use(authenticate);
router.use(requireModule('restaurant'));

/**
 * @route GET /api/v1/restaurant/locations
 * @desc Get all locations with filters
 * @access Private - requires 'read' permission on 'RestaurantLocation'
 */
router.get('/',
  authorize('read', 'RestaurantLocation'),
  locationController.getAllLocations
);

/**
 * @route GET /api/v1/restaurant/locations/with-stock
 * @desc Get locations with stock counts
 * @access Private - requires 'read' permission on 'RestaurantLocation'
 */
router.get('/with-stock',
  authorize('read', 'RestaurantLocation'),
  locationController.getLocationsWithStock
);

/**
 * @route GET /api/v1/restaurant/locations/:id
 * @desc Get location by ID with products and tables
 * @access Private - requires 'read' permission on 'RestaurantLocation'
 */
router.get('/:id',
  authorize('read', 'RestaurantLocation'),
  locationController.getLocationById
);

/**
 * @route GET /api/v1/restaurant/locations/:id/stock-summary
 * @desc Get stock summary for location
 * @access Private - requires 'read' permission on 'RestaurantLocation'
 */
router.get('/:id/stock-summary',
  authorize('read', 'RestaurantLocation'),
  locationController.getStockSummary
);

/**
 * @route GET /api/v1/restaurant/locations/distance/:fromId/:toId
 * @desc Calculate distance between two locations
 * @access Private - requires 'read' permission on 'RestaurantLocation'
 */
router.get('/distance/:fromId/:toId',
  authorize('read', 'RestaurantLocation'),
  locationController.calculateDistance
);

/**
 * @route POST /api/v1/restaurant/locations
 * @desc Create new location
 * @access Private - requires 'create' permission on 'RestaurantLocation'
 */
router.post('/',
  authorize('create', 'RestaurantLocation'),
  locationController.createLocation
);

/**
 * @route PUT /api/v1/restaurant/locations/:id
 * @desc Update location details
 * @access Private - requires 'update' permission on 'RestaurantLocation'
 */
router.put('/:id',
  authorize('update', 'RestaurantLocation'),
  locationController.updateLocation
);

/**
 * @route PATCH /api/v1/restaurant/locations/:id/toggle
 * @desc Toggle location active status
 * @access Private - requires 'update' permission on 'RestaurantLocation'
 */
router.patch('/:id/toggle',
  authorize('update', 'RestaurantLocation'),
  locationController.toggleActive
);

/**
 * @route DELETE /api/v1/restaurant/locations/:id
 * @desc Delete location (soft delete)
 * @access Private - requires 'delete' permission on 'RestaurantLocation'
 */
router.delete('/:id',
  authorize('delete', 'RestaurantLocation'),
  locationController.deleteLocation
);

module.exports = router;
