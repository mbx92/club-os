'use strict';

/**
 * Shift Routes
 *
 * GET    /             → List shifts
 * GET    /:id          → Get one shift
 * POST   /             → Create shift
 * PUT    /:id          → Update shift
 * DELETE /:id          → Delete shift
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

const {
  listShifts,
  getShift,
  createShift,
  updateShift,
  deleteShift,
} = require('../../../controllers/gym/shift/shiftController');

/**
 * @route   GET /gym/shifts
 * @name    listShifts
 * @desc    List all shift definitions for tenant
 * @access  Private (admin/manager/staff)
 */
router.get('/',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'EmployeeSchedule'),
  listShifts
);

/**
 * @route   GET /gym/shifts/:id
 * @name    getShift
 * @desc    Get a single shift
 * @access  Private
 */
router.get('/:id',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'EmployeeSchedule'),
  getShift
);

/**
 * @route   POST /gym/shifts
 * @name    createShift
 * @desc    Create a new shift definition
 * @access  Private (admin/manager)
 */
router.post('/',
  authenticate,
  requireModule('gym'),
  authorizeCasl('create', 'EmployeeSchedule'),
  createShift
);

/**
 * @route   PUT /gym/shifts/:id
 * @name    updateShift
 * @desc    Update a shift definition
 * @access  Private (admin/manager)
 */
router.put('/:id',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'EmployeeSchedule'),
  updateShift
);

/**
 * @route   DELETE /gym/shifts/:id
 * @name    deleteShift
 * @desc    Delete a shift definition
 * @access  Private (admin)
 */
router.delete('/:id',
  authenticate,
  requireModule('gym'),
  authorizeCasl('delete', 'EmployeeSchedule'),
  deleteShift
);

module.exports = router;
