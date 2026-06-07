'use strict';

/**
 * Schedule Period Routes
 *
 * Period-based employee scheduling. Each period has a date range
 * and contains multiple staff assignments per date.
 *
 * GET    /                              → List all periods
 * GET    /:id                           → Get period detail with assignments
 * POST   /                              → Create a new period
 * PUT    /:id                           → Update period info
 * DELETE /:id                           → Delete period + all assignments
 * PUT    /:id/status                    → Change period status (draft/active/closed)
 * POST   /:id/assign                   → Assign staff to period dates
 * POST   /:id/generate                 → Generate assignments from weekly templates
 * DELETE /:id/assignments/:assignmentId → Remove one assignment
 * DELETE /:id/assignments/user/:userId  → Remove all assignments for a staff
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

const {
  listPeriods,
  getPeriod,
  createPeriod,
  updatePeriod,
  deletePeriod,
  updatePeriodStatus,
  assignStaff,
  removeAssignment,
  removeUserAssignments,
  generateFromTemplates,
} = require('../../../controllers/gym/schedulePeriod/schedulePeriodController');

// ─── PERIOD CRUD ────────────────────────────────────────

/**
 * @route   GET /gym/schedule-periods
 * @name    listSchedulePeriods
 * @desc    List all schedule periods
 * @access  Private (admin/manager)
 * @query   status, startDate, endDate, page, limit
 */
router.get('/',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'EmployeeSchedule'),
  listPeriods
);

/**
 * @route   GET /gym/schedule-periods/:id
 * @name    getSchedulePeriod
 * @desc    Get period detail with all staff assignments grouped by date
 * @access  Private (admin/manager)
 * @query   userId — optional filter
 */
router.get('/:id',
  authenticate,
  requireModule('gym'),
  authorizeCasl('read', 'EmployeeSchedule'),
  getPeriod
);

/**
 * @route   POST /gym/schedule-periods
 * @name    createSchedulePeriod
 * @desc    Create a new schedule period (e.g. "Februari 2026")
 * @access  Private (admin/manager)
 * @body    { name, startDate, endDate, notes? }
 */
router.post('/',
  authenticate,
  requireModule('gym'),
  authorizeCasl('create', 'EmployeeSchedule'),
  createPeriod
);

/**
 * @route   PUT /gym/schedule-periods/:id
 * @name    updateSchedulePeriod
 * @desc    Update period info (name, dates, notes)
 * @access  Private (admin/manager)
 */
router.put('/:id',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'EmployeeSchedule'),
  updatePeriod
);

/**
 * @route   DELETE /gym/schedule-periods/:id
 * @name    deleteSchedulePeriod
 * @desc    Delete a period and all its assignments
 * @access  Private (admin)
 */
router.delete('/:id',
  authenticate,
  requireModule('gym'),
  authorizeCasl('delete', 'EmployeeSchedule'),
  deletePeriod
);

/**
 * @route   PUT /gym/schedule-periods/:id/status
 * @name    updateSchedulePeriodStatus
 * @desc    Change period status (draft → active → closed)
 * @access  Private (admin/manager)
 * @body    { status: 'draft' | 'active' | 'closed' }
 */
router.put('/:id/status',
  authenticate,
  requireModule('gym'),
  authorizeCasl('update', 'EmployeeSchedule'),
  updatePeriodStatus
);

// ─── STAFF ASSIGNMENTS ──────────────────────────────────

/**
 * @route   POST /gym/schedule-periods/:id/assign
 * @name    assignStaffToSchedulePeriod
 * @desc    Assign staff to dates within this period.
 *          Multiple staff per date supported.
 *          Mode 1 (per-date): { assignments: [{ userId|employeeId, dates: [{ date, shiftId, isOff? }] }] }
 *          Mode 2 (uniform):  { assignments: [{ userId|employeeId, shiftId, offDays: [0,6] }] }
 *          employeeId = DeviceEmployee.employeeNo (frontend sends this instead of userId)
 * @access  Private (admin/manager)
 */
router.post('/:id/assign',
  authenticate,
  requireModule('gym'),
  authorizeCasl('create', 'EmployeeSchedule'),
  assignStaff
);

/**
 * @route   POST /gym/schedule-periods/:id/generate
 * @name    generateSchedulePeriodFromTemplates
 * @desc    Generate assignments from weekly templates into this period
 * @access  Private (admin/manager)
 * @body    { userIds?: string[], employeeIds?: string[] }
 *          employeeIds = DeviceEmployee.employeeNo values
 */
router.post('/:id/generate',
  authenticate,
  requireModule('gym'),
  authorizeCasl('create', 'EmployeeSchedule'),
  generateFromTemplates
);

/**
 * @route   DELETE /gym/schedule-periods/:id/assignments/employee/:employeeId
 * @name    removeEmployeeSchedulePeriodAssignments
 * @desc    Remove all assignments for a specific employee (by employeeNo) from this period
 * @access  Private (admin)
 * @query   startDate, endDate
 */
router.delete('/:id/assignments/employee/:employeeId',
  authenticate,
  requireModule('gym'),
  authorizeCasl('delete', 'EmployeeSchedule'),
  removeUserAssignments
);

/**
 * @route   DELETE /gym/schedule-periods/:id/assignments/user/:userId
 * @name    removeUserSchedulePeriodAssignments
 * @desc    Remove all assignments for a specific staff from this period
 * @access  Private (admin)
 * @query   startDate, endDate
 */
router.delete('/:id/assignments/user/:userId',
  authenticate,
  requireModule('gym'),
  authorizeCasl('delete', 'EmployeeSchedule'),
  removeUserAssignments
);

/**
 * @route   DELETE /gym/schedule-periods/:id/assignments/:assignmentId
 * @name    removeSchedulePeriodAssignment
 * @desc    Remove a single assignment from a period
 * @access  Private (admin)
 */
router.delete('/:id/assignments/:assignmentId',
  authenticate,
  requireModule('gym'),
  authorizeCasl('delete', 'EmployeeSchedule'),
  removeAssignment
);

module.exports = router;
