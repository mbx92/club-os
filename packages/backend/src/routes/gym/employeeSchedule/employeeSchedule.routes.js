'use strict';

/**
 * Employee Schedule Routes (Simple)
 *
 * GET    /                → List schedules (with filters)
 * POST   /                → Create schedule(s) - single or bulk
 * PUT    /:id             → Update a schedule entry
 * DELETE /user/:userId    → Delete all schedules for a user
 * DELETE /:id             → Delete a single schedule entry
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

const {
  listSchedules,
  exportSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  deleteUserSchedules,
  generateFromTemplates,
  assignShifts,
} = require('../../../controllers/gym/employeeSchedule/employeeScheduleController');

/**
 * @route   GET /gym/employee-schedules/export
 * @name    exportEmployeeSchedules
 * @desc    Export employee schedules as Excel file
 * @access  Private (admin/manager)
 * @query   userId, employeeId, startDate, endDate, periodId, isOff
 */
router.get('/export',
  authenticate,
  requireModule('gym'),
  authorize('read', 'EmployeeSchedule'),
  exportSchedules
);

/**
 * @route   GET /gym/employee-schedules
 * @name    listEmployeeSchedules
 * @desc    List employee schedules
 * @access  Private (admin/manager)
 * @query   userId, startDate, endDate, isOff, page, limit
 */
router.get('/',
  authenticate,
  requireModule('gym'),
  authorize('read', 'EmployeeSchedule'),
  listSchedules
);

/**
 * @route   POST /gym/employee-schedules/generate-from-templates
 * @name    generateSchedulesFromTemplates
 * @desc    Expand weekly templates into concrete EmployeeSchedule rows for a date range.
 *          Body: { startDate, endDate, userId? }
 * @access  Private (admin/manager)
 */
router.post('/generate-from-templates',
  authenticate,
  requireModule('gym'),
  authorize('create', 'EmployeeSchedule'),
  generateFromTemplates
);

/**
 * @route   POST /gym/employee-schedules/assign-shifts
 * @name    assignEmployeeShifts
 * @desc    Assign shifts to employees for a date range.
 *          Mode 1 (per-date): { startDate, endDate, assignments: [{ userId, dates: { "2026-03-01": "shiftId", ... } }] }
 *          Mode 2 (uniform):  { startDate, endDate, assignments: [{ userId, shiftId, offDays: [0,6] }] }
 * @access  Private (admin/manager)
 */
router.post('/assign-shifts',
  authenticate,
  requireModule('gym'),
  authorize('create', 'EmployeeSchedule'),
  assignShifts
);

/**
 * @route   POST /gym/employee-schedules
 * @name    createEmployeeSchedule
 * @desc    Create schedule(s) for employee(s). Supports single or bulk.
 * @access  Private (admin/manager)
 */
router.post('/',
  authenticate,
  requireModule('gym'),
  authorize('create', 'EmployeeSchedule'),
  createSchedule
);

/**
 * @route   PUT /gym/employee-schedules/:id
 * @name    updateEmployeeSchedule
 * @desc    Update a schedule entry
 * @access  Private (admin/manager)
 */
router.put('/:id',
  authenticate,
  requireModule('gym'),
  authorize('update', 'EmployeeSchedule'),
  updateSchedule
);

/**
 * @route   DELETE /gym/employee-schedules/employee/:employeeId
 * @name    deleteEmployeeSchedulesByEmployeeNo
 * @desc    Delete all schedules for an employee (by employeeNo)
 * @access  Private (admin)
 * @query   startDate, endDate
 */
router.delete('/employee/:employeeId',
  authenticate,
  requireModule('gym'),
  authorize('delete', 'EmployeeSchedule'),
  deleteUserSchedules
);

/**
 * @route   DELETE /gym/employee-schedules/user/:userId
 * @name    deleteUserEmployeeSchedules
 * @desc    Delete all schedules for a user (optionally by date range)
 * @access  Private (admin)
 */
router.delete('/user/:userId',
  authenticate,
  requireModule('gym'),
  authorize('delete', 'EmployeeSchedule'),
  deleteUserSchedules
);

/**
 * @route   DELETE /gym/employee-schedules/employee/:employeeId
 * @name    deleteEmployeeSchedulesByEmployeeNo
 * @desc    Delete all schedules by employee number (DeviceEmployee.employeeNo)
 * @access  Private (admin)
 */
router.delete('/employee/:employeeId',
  authenticate,
  requireModule('gym'),
  authorize('delete', 'EmployeeSchedule'),
  deleteUserSchedules
);

/**
 * @route   DELETE /gym/employee-schedules/:id
 * @name    deleteEmployeeSchedule
 * @desc    Delete a single schedule entry
 * @access  Private (admin)
 */
router.delete('/:id',
  authenticate,
  requireModule('gym'),
  authorize('delete', 'EmployeeSchedule'),
  deleteSchedule
);

module.exports = router;
