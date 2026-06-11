'use strict';

/**
 * Employee Schedule Template Routes
 *
 * GET    /                → List templates (all days for tenant/user)
 * POST   /                → Upsert template(s) — accepts dayOfWeek (0–6), single or bulk via { schedules: [] }
 * PUT    /:id             → Update one template entry
 * DELETE /user/:userId    → Delete all templates for a user
 * DELETE /:id             → Delete one template entry
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

const {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  deleteUserTemplates,
} = require('../../../controllers/gym/employeeSchedule/employeeScheduleTemplateController');

/**
 * @route   GET /gym/employee-schedule-templates
 * @name    listEmployeeScheduleTemplates
 * @desc    List recurring weekly schedule templates
 * @access  Private (admin/manager)
 * @query   userId, dayOfWeek, page, limit
 */
router.get('/',
  authenticate,
  requireModule('gym'),
  authorize('read', 'EmployeeSchedule'),
  listTemplates
);

/**
 * @route   POST /gym/employee-schedule-templates
 * @name    createEmployeeScheduleTemplate
 * @desc    Create/upsert weekly schedule template(s). Accepts dayOfWeek (0=Sun…6=Sat).
 *          Single: { userId, dayOfWeek, shiftStart, shiftEnd, isOff, notes }
 *          Bulk:   { schedules: [{ userId, dayOfWeek, ... }] }
 * @access  Private (admin/manager)
 */
router.post('/',
  authenticate,
  requireModule('gym'),
  authorize('create', 'EmployeeSchedule'),
  createTemplate
);

/**
 * @route   PUT /gym/employee-schedule-templates/:id
 * @name    updateEmployeeScheduleTemplate
 * @desc    Update a single template entry
 * @access  Private (admin/manager)
 */
router.put('/:id',
  authenticate,
  requireModule('gym'),
  authorize('update', 'EmployeeSchedule'),
  updateTemplate
);

/**
 * @route   DELETE /gym/employee-schedule-templates/employee/:employeeId
 * @name    deleteEmployeeScheduleTemplatesByEmployeeNo
 * @desc    Delete all templates for a specific employee (by employeeNo)
 * @access  Private (admin)
 */
router.delete('/employee/:employeeId',
  authenticate,
  requireModule('gym'),
  authorize('delete', 'EmployeeSchedule'),
  deleteUserTemplates
);

/**
 * @route   DELETE /gym/employee-schedule-templates/user/:userId
 * @name    deleteUserEmployeeScheduleTemplates
 * @desc    Delete all templates for a specific user
 * @access  Private (admin)
 */
router.delete('/user/:userId',
  authenticate,
  requireModule('gym'),
  authorize('delete', 'EmployeeSchedule'),
  deleteUserTemplates
);

/**
 * @route   DELETE /gym/employee-schedule-templates/employee/:employeeId
 * @name    deleteEmployeeScheduleTemplatesByEmployeeNo
 * @desc    Delete all templates by employee number (DeviceEmployee.employeeNo)
 * @access  Private (admin)
 */
router.delete('/employee/:employeeId',
  authenticate,
  requireModule('gym'),
  authorize('delete', 'EmployeeSchedule'),
  deleteUserTemplates
);

/**
 * @route   DELETE /gym/employee-schedule-templates/:id
 * @name    deleteEmployeeScheduleTemplate
 * @desc    Delete a single template entry
 * @access  Private (admin)
 */
router.delete('/:id',
  authenticate,
  requireModule('gym'),
  authorize('delete', 'EmployeeSchedule'),
  deleteTemplate
);

module.exports = router;
