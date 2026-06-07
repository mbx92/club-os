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
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

// All routes require authentication and restaurant module access
router.use(authenticate);
router.use(requireModule('restaurant'));

/**
 * @route GET /api/v1/restaurant/locations
 * @desc Get all locations with filters
 * @access Private - requires 'read' permission on 'Location'
 */
router.get('/',
  authorizeCasl('read', 'Location'),
  locationController.getAllLocations
);

/**
 * @route GET /api/v1/restaurant/locations/with-stock
 * @desc Get locations with stock counts
 * @access Private - requires 'read' permission on 'Location'
 */
router.get('/with-stock',
  authorizeCasl('read', 'Location'),
  locationController.getLocationsWithStock
);

/**
 * @route GET /api/v1/restaurant/locations/:id
 * @desc Get location by ID with products and tables
 * @access Private - requires 'read' permission on 'Location'
 */
router.get('/:id',
  authorizeCasl('read', 'Location'),
  locationController.getLocationById
);

/**
 * @route GET /api/v1/restaurant/locations/:id/stock-summary
 * @desc Get stock summary for location
 * @access Private - requires 'read' permission on 'Location'
 */
router.get('/:id/stock-summary',
  authorizeCasl('read', 'Location'),
  locationController.getStockSummary
);

/**
 * @route GET /api/v1/restaurant/locations/distance/:fromId/:toId
 * @desc Calculate distance between two locations
 * @access Private - requires 'read' permission on 'Location'
 */
router.get('/distance/:fromId/:toId',
  authorizeCasl('read', 'Location'),
  locationController.calculateDistance
);

/**
 * @route POST /api/v1/restaurant/locations
 * @desc Create new location
 * @access Private - requires 'create' permission on 'Location'
 */
router.post('/',
  authorizeCasl('create', 'Location'),
  locationController.createLocation
);

/**
 * @route PUT /api/v1/restaurant/locations/:id
 * @desc Update location details
 * @access Private - requires 'update' permission on 'Location'
 */
router.put('/:id',
  authorizeCasl('update', 'Location'),
  locationController.updateLocation
);

/**
 * @route PATCH /api/v1/restaurant/locations/:id/toggle
 * @desc Toggle location active status
 * @access Private - requires 'update' permission on 'Location'
 */
router.patch('/:id/toggle',
  authorizeCasl('update', 'Location'),
  locationController.toggleActive
);

/**
 * @route DELETE /api/v1/restaurant/locations/:id
 * @desc Delete location (soft delete)
 * @access Private - requires 'delete' permission on 'Location'
 */
router.delete('/:id',
  authorizeCasl('delete', 'Location'),
  locationController.deleteLocation
);

module.exports = router;
