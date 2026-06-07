'use strict';

/**
 * Psychology Module Routes
 * 
 * All routes are prefixed with /api/v1/psychology
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads/psychology/settings/temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Allowed: PNG, JPG, JPEG, SVG'), false);
    }
  }
});

// Import controllers
const {
  testTypeController,
  patientController,
  packageController,
  priceRuleController,
  orderController,
  sessionController,
  publicController,
  invitationController,
  dashboardController,
  reportController,
  psikogramController,
  settingsController,
  utilityController,
  sessionLogController,
  sessionProgressController
} = require('../controllers');

// Import middlewares
const { authenticate } = require('../../../middlewares/authMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');

// Import validators
const { validate, testTypeValidators, patientValidators, packageValidators, priceRuleValidators, orderValidators, sessionValidators, invitationValidators, psikogramValidators, settingsValidators } = require('../validators');

// ============================================
// PUBLIC ROUTES (no authentication required)
// ============================================

// --- Invitation-based Registration Flow ---

/**
 * @route   GET /public/invite/:code
 * @desc    Get invitation info for registration page
 * @access  Public
 */
router.get('/public/invite/:code', publicController.getInvitation);

/**
 * @route   POST /public/invite/:code/register
 * @desc    Register via invitation (creates patient + order + sessions)
 * @access  Public
 */
router.post('/public/invite/:code/register', 
  validate(invitationValidators.register),
  publicController.registerViaInvitation
);

// --- Access Token Flow (after registration) ---

/**
 * @route   GET /public/access/:token
 * @desc    Validate access token and get test info
 * @access  Public
 */
router.get('/public/access/:token', publicController.validateToken);

/**
 * @route   POST /public/access/:token/session/:sessionId/start
 * @desc    Start a test session
 * @access  Public (token validated)
 */
router.post('/public/access/:token/session/:sessionId/start', publicController.startSession);

/**
 * @route   GET /public/access/:token/session/:sessionId/questions
 * @desc    Get test questions for session
 * @access  Public (token validated)
 */
router.get('/public/access/:token/session/:sessionId/questions', publicController.getQuestions);

/**
 * @route   POST /public/access/:token/session/:sessionId/save
 * @desc    Save progress (partial answers)
 * @access  Public (token validated)
 */
router.post('/public/access/:token/session/:sessionId/save', 
  validate(sessionValidators.saveProgress),
  publicController.saveProgress
);

/**
 * @route   POST /public/access/:token/session/:sessionId/submit
 * @desc    Submit final answers
 * @access  Public (token validated)
 */
router.post('/public/access/:token/session/:sessionId/submit',
  validate(sessionValidators.submitAnswers),
  publicController.submitAnswers
);

/**
 * @route   GET /public/access/:token/session/:sessionId/result
 * @desc    Get session result
 * @access  Public (token validated)
 */
router.get('/public/access/:token/session/:sessionId/result', publicController.getResult);

/**
 * @route   POST /public/access/:token/session/:sessionId/log
 * @desc    Create session log (single or batch)
 * @access  Public (token validated)
 */
router.post('/public/access/:token/session/:sessionId/log', sessionLogController.createPublicLog);

/**
 * @route   GET /public/psikogram/:token
 * @desc    Get psikogram by public token (no auth required)
 * @access  Public
 */
router.get('/public/psikogram/:token', psikogramController.getByPublicToken);

/**
 * @route   GET /public/psikograms/:token
 * @desc    Get psikogram by public token (no auth required) - alias
 * @access  Public
 */
router.get('/public/psikograms/:token', psikogramController.getByPublicToken);

/**
 * @route   GET /public/settings/:tenantId
 * @desc    Get psychology settings by tenantId (for public psikogram display)
 * @access  Public
 */
router.get('/public/settings/:tenantId', settingsController.getSettingsByTenantId);

// --- SSE Stream (auth via query token) ---

/**
 * @route   GET /sessions/:sessionId/logs/stream
 * @desc    Stream logs for specific session in real-time (SSE)
 * @access  Private (Admin) - Auth via query token (?token=JWT)
 * @note    Placed before authenticate middleware because EventSource doesn't support headers
 */
router.get('/sessions/:sessionId/logs/stream', sessionLogController.streamSessionLogs);

/**
 * @route   GET /sessions/:sessionId/progress/stream
 * @desc    Stream session progress in real-time (SSE) - answers count, timer, etc
 * @access  Private (Admin) - Auth via query token (?token=JWT)
 * @note    Shows real-time progress: answered questions, subtest timers, current position
 */
router.get('/sessions/:sessionId/progress/stream', sessionProgressController.streamSessionProgress);

// ============================================
// AUTHENTICATED ROUTES
// ============================================

// Apply authentication and feature gate to all routes below
router.use(authenticate);
router.use(requireModule('psychology'));

// ----------------
// Test Types
// ----------------

/**
 * @route   GET /test-types
 * @desc    Get all test types
 * @access  Private
 */
router.get('/test-types', 
  authorizeCasl('read', 'PsychologyTestType'),
  testTypeController.getAll
);

/**
 * @route   POST /test-types/validate
 * @desc    Validate questions JSON (preview)
 * @access  Private (Admin)
 */
router.post('/test-types/validate', 
  authorizeCasl('create', 'PsychologyTestType'),
  testTypeController.validateQuestions
);

/**
 * @route   GET /test-types/export-files
 * @desc    Get list of available export files
 * @access  Private (Admin)
 */
router.get('/test-types/export-files',
  authorizeCasl('read', 'PsychologyTestType'),
  testTypeController.getExportFiles
);

/**
 * @route   POST /test-types/import
 * @desc    Import test type from JSON
 * @access  Private (Admin)
 */
router.post('/test-types/import',
  authorizeCasl('create', 'PsychologyTestType'),
  testTypeController.importFromJson
);

/**
 * @route   GET /test-types/:id
 * @desc    Get single test type
 * @access  Private
 */
router.get('/test-types/:id', 
  authorizeCasl('read', 'PsychologyTestType'),
  testTypeController.getById
);

/**
 * @route   GET /test-types/:id/export
 * @desc    Export test type to JSON
 * @access  Private (Admin)
 */
router.get('/test-types/:id/export',
  authorizeCasl('read', 'PsychologyTestType'),
  testTypeController.exportToJson
);

/**
 * @route   POST /test-types
 * @desc    Create test type
 * @access  Private (Admin)
 */
router.post('/test-types',
  authorizeCasl('create', 'PsychologyTestType'),
  validate(testTypeValidators.create),
  testTypeController.create
);

/**
 * @route   PUT /test-types/:id
 * @desc    Update test type
 * @access  Private (Admin)
 */
router.put('/test-types/:id',
  authorizeCasl('update', 'PsychologyTestType'),
  validate(testTypeValidators.update),
  testTypeController.update
);

/**
 * @route   DELETE /test-types/:id
 * @desc    Delete test type
 * @access  Private (Admin)
 */
router.delete('/test-types/:id', 
  authorizeCasl('delete', 'PsychologyTestType'),
  testTypeController.remove
);

// ----------------
// Patients
// ----------------

/**
 * @route   GET /patients
 * @desc    Get all patients
 * @access  Private
 */
router.get('/patients', 
  authorizeCasl('read', 'Patient'),
  patientController.getAll
);

/**
 * @route   GET /patients/search
 * @desc    Search patients (autocomplete)
 * @access  Private
 */
router.get('/patients/search', 
  authorizeCasl('read', 'Patient'),
  patientController.search
);

/**
 * @route   GET /patients/:id/history
 * @desc    Get patient test history
 * @access  Private
 */
router.get('/patients/:id/history',
  authorizeCasl('read', 'Patient'),
  patientController.getHistory
);

/**
 * @route   GET /patients/:id
 * @desc    Get single patient
 * @access  Private
 */
router.get('/patients/:id', 
  authorizeCasl('read', 'Patient'),
  patientController.getById
);

/**
 * @route   POST /patients
 * @desc    Create patient
 * @access  Private
 */
router.post('/patients',
  authorizeCasl('create', 'Patient'),
  validate(patientValidators.create),
  patientController.create
);

/**
 * @route   PUT /patients/:id
 * @desc    Update patient
 * @access  Private
 */
router.put('/patients/:id',
  authorizeCasl('update', 'Patient'),
  validate(patientValidators.update),
  patientController.update
);

/**
 * @route   DELETE /patients/:id
 * @desc    Delete patient
 * @access  Private
 */
router.delete('/patients/:id', 
  authorizeCasl('delete', 'Patient'),
  patientController.remove
);

// ----------------
// Packages
// ----------------

/**
 * @route   GET /packages
 * @desc    Get all packages
 * @access  Private
 */
router.get('/packages', 
  authorizeCasl('read', 'PsychologyPackage'),
  packageController.getAll
);

/**
 * @route   GET /packages/:id
 * @desc    Get single package
 * @access  Private
 */
router.get('/packages/:id', 
  authorizeCasl('read', 'PsychologyPackage'),
  packageController.getById
);

/**
 * @route   GET /packages/:id/price
 * @desc    Calculate package price
 * @access  Private
 */
router.get('/packages/:id/price', 
  authorizeCasl('read', 'PsychologyPackage'),
  packageController.calculatePrice
);

/**
 * @route   POST /packages
 * @desc    Create package
 * @access  Private (Admin)
 */
router.post('/packages',
  authorizeCasl('create', 'PsychologyPackage'),
  validate(packageValidators.create),
  packageController.create
);

/**
 * @route   PUT /packages/:id
 * @desc    Update package
 * @access  Private (Admin)
 */
router.put('/packages/:id',
  authorizeCasl('update', 'PsychologyPackage'),
  validate(packageValidators.update),
  packageController.update
);

/**
 * @route   DELETE /packages/:id
 * @desc    Delete package
 * @access  Private (Admin)
 */
router.delete('/packages/:id', 
  authorizeCasl('delete', 'PsychologyPackage'),
  packageController.remove
);

// ----------------
// Price Rules
// ----------------

/**
 * @route   GET /price-rules
 * @desc    Get all price rules
 * @access  Private (Admin)
 */
router.get('/price-rules', 
  authorizeCasl('read', 'PsychologyPriceRule'),
  priceRuleController.getAll
);

/**
 * @route   GET /price-rules/:id
 * @desc    Get single price rule
 * @access  Private (Admin)
 */
router.get('/price-rules/:id', 
  authorizeCasl('read', 'PsychologyPriceRule'),
  priceRuleController.getById
);

/**
 * @route   POST /price-rules
 * @desc    Create price rule
 * @access  Private (Admin)
 */
router.post('/price-rules',
  authorizeCasl('create', 'PsychologyPriceRule'),
  validate(priceRuleValidators.create),
  priceRuleController.create
);

/**
 * @route   PUT /price-rules/:id
 * @desc    Update price rule
 * @access  Private (Admin)
 */
router.put('/price-rules/:id',
  authorizeCasl('update', 'PsychologyPriceRule'),
  validate(priceRuleValidators.update),
  priceRuleController.update
);

/**
 * @route   DELETE /price-rules/:id
 * @desc    Delete price rule
 * @access  Private (Admin)
 */
router.delete('/price-rules/:id', 
  authorizeCasl('delete', 'PsychologyPriceRule'),
  priceRuleController.remove
);

/**
 * @route   PATCH /price-rules/:id/toggle
 * @desc    Toggle price rule active status
 * @access  Private (Admin)
 */
router.patch('/price-rules/:id/toggle', 
  authorizeCasl('update', 'PsychologyPriceRule'),
  priceRuleController.toggleActive
);

// ----------------
// Orders
// ----------------

/**
 * @route   GET /orders
 * @desc    Get all orders
 * @access  Private
 */
router.get('/orders', 
  authorizeCasl('read', 'PsychologyOrder'),
  orderController.getAll
);

/**
 * @route   GET /orders/:id
 * @desc    Get single order
 * @access  Private
 */
router.get('/orders/:id', 
  authorizeCasl('read', 'PsychologyOrder'),
  orderController.getById
);

/**
 * @route   POST /orders
 * @desc    Create order
 * @access  Private
 */
router.post('/orders',
  authorizeCasl('create', 'PsychologyOrder'),
  validate(orderValidators.create),
  orderController.create
);

/**
 * @route   PATCH /orders/:id/payment
 * @desc    Update payment status
 * @access  Private (Admin)
 */
router.patch('/orders/:id/payment',
  authorizeCasl('update', 'PsychologyOrder'),
  validate(orderValidators.updatePayment),
  orderController.updatePayment
);

/**
 * @route   POST /orders/:id/regenerate-token
 * @desc    Regenerate access token
 * @access  Private (Admin)
 */
router.post('/orders/:id/regenerate-token', 
  authorizeCasl('update', 'PsychologyOrder'),
  orderController.regenerateToken
);

/**
 * @route   POST /orders/:id/cancel
 * @desc    Cancel order
 * @access  Private (Admin)
 */
router.post('/orders/:id/cancel', 
  authorizeCasl('update', 'PsychologyOrder'),
  orderController.cancel
);

// ----------------
// Sessions
// ----------------

/**
 * @route   GET /sessions
 * @desc    Get all sessions with filters
 * @access  Private (Admin)
 */
router.get('/sessions', 
  authorizeCasl('read', 'PsychologySession'),
  sessionController.getAll
);

/**
 * @route   GET /sessions/cleanup/preview
 * @desc    Preview sessions that would be affected by cleanup
 * @access  Private (Admin)
 */
router.get('/sessions/cleanup/preview', 
  authorizeCasl('manage', 'PsychologySession'),
  sessionController.getCleanupPreview
);

/**
 * @route   POST /sessions/cleanup/run
 * @desc    Run session cleanup (mark timeout/abandoned)
 * @access  Private (Admin)
 */
router.post('/sessions/cleanup/run', 
  authorizeCasl('manage', 'PsychologySession'),
  sessionController.runCleanup
);

/**
 * @route   GET /sessions/:id
 * @desc    Get session details
 * @access  Private
 */
router.get('/sessions/:id', 
  authorizeCasl('read', 'PsychologySession'),
  sessionController.getById
);

/**
 * @route   POST /sessions/:id/start
 * @desc    Start session
 * @access  Private
 */
router.post('/sessions/:id/start', 
  authorizeCasl('update', 'PsychologySession'),
  sessionController.start
);

/**
 * @route   POST /sessions/:id/save
 * @desc    Save progress
 * @access  Private
 */
router.post('/sessions/:id/save',
  authorizeCasl('update', 'PsychologySession'),
  validate(sessionValidators.saveProgress),
  sessionController.saveProgress
);

/**
 * @route   POST /sessions/:id/submit
 * @desc    Submit answers
 * @access  Private
 */
router.post('/sessions/:id/submit',
  authorizeCasl('update', 'PsychologySession'),
  validate(sessionValidators.submitAnswers),
  sessionController.submit
);

/**
 * @route   GET /sessions/:id/result
 * @desc    Get session result
 * @access  Private
 */
router.get('/sessions/:id/result', 
  authorizeCasl('read', 'PsychologySession'),
  sessionController.getResult
);

/**
 * @route   POST /sessions/:id/recalculate
 * @desc    Recalculate scores
 * @access  Private (Admin)
 */
router.post('/sessions/:id/recalculate', 
  authorizeCasl('update', 'PsychologySession'),
  sessionController.recalculate
);

/**
 * @route   POST /sessions/:id/verify
 * @desc    Verify session result (admin marks as verified)
 * @access  Private (Admin)
 */
router.post('/sessions/:id/verify', 
  authorizeCasl('update', 'PsychologySession'),
  sessionController.verify
);

/**
 * @route   POST /sessions/:id/abandon
 * @desc    Manually mark session as abandoned
 * @access  Private (Admin)
 */
router.post('/sessions/:id/abandon', 
  authorizeCasl('update', 'PsychologySession'),
  sessionController.markAsAbandoned
);

/**
 * @route   GET /sessions/:id/logs
 * @desc    Get logs for specific session
 * @access  Private (Admin)
 */
router.get('/sessions/:id/logs', 
  authorizeCasl('read', 'PsychologySession'),
  sessionLogController.getLogsForSession
);

// Note: SSE stream route is defined above (before authenticate middleware)
// because EventSource doesn't support custom headers

// ----------------
// Session Logs
// ----------------

/**
 * @route   GET /session-logs
 * @desc    Get all session logs with filters
 * @access  Private (Admin)
 */
router.get('/session-logs', 
  authorizeCasl('read', 'PsychologySession'),
  sessionLogController.getSessionLogs
);

/**
 * @route   GET /session-logs/stats
 * @desc    Get session log statistics
 * @access  Private (Admin)
 */
router.get('/session-logs/stats', 
  authorizeCasl('read', 'PsychologySession'),
  sessionLogController.getLogStats
);

/**
 * @route   GET /session-logs/streams
 * @desc    Get active stream connections info
 * @access  Private (Admin)
 */
router.get('/session-logs/streams', 
  authorizeCasl('read', 'PsychologySession'),
  sessionLogController.getActiveStreams
);

/**
 * @route   DELETE /session-logs/cleanup
 * @desc    Cleanup old session logs (super admin only)
 * @access  Private (Super Admin)
 */
router.delete('/session-logs/cleanup', 
  authorizeCasl('delete', 'PsychologySession'),
  sessionLogController.cleanupOldLogs
);

// ----------------
// Invitations
// ----------------

/**
 * @route   GET /invitations
 * @desc    Get all invitations
 * @access  Private (Admin)
 */
router.get('/invitations', 
  authorizeCasl('read', 'PsychologyInvitation'),
  invitationController.getAll
);

/**
 * @route   GET /invitations/:id
 * @desc    Get single invitation
 * @access  Private (Admin)
 */
router.get('/invitations/:id', 
  authorizeCasl('read', 'PsychologyInvitation'),
  invitationController.getById
);

/**
 * @route   GET /invitations/:id/stats
 * @desc    Get invitation statistics
 * @access  Private (Admin)
 */
router.get('/invitations/:id/stats', 
  authorizeCasl('read', 'PsychologyInvitation'),
  invitationController.getStats
);

/**
 * @route   POST /invitations
 * @desc    Create invitation
 * @access  Private (Admin)
 */
router.post('/invitations',
  authorizeCasl('create', 'PsychologyInvitation'),
  validate(invitationValidators.create),
  invitationController.create
);

/**
 * @route   PUT /invitations/:id
 * @desc    Update invitation
 * @access  Private (Admin)
 */
router.put('/invitations/:id',
  authorizeCasl('update', 'PsychologyInvitation'),
  validate(invitationValidators.update),
  invitationController.update
);

/**
 * @route   PATCH /invitations/:id/toggle
 * @desc    Toggle invitation active status
 * @access  Private (Admin)
 */
router.patch('/invitations/:id/toggle', 
  authorizeCasl('update', 'PsychologyInvitation'),
  invitationController.toggleActive
);

/**
 * @route   DELETE /invitations/:id
 * @desc    Delete invitation
 * @access  Private (Admin)
 */
router.delete('/invitations/:id', 
  authorizeCasl('delete', 'PsychologyInvitation'),
  invitationController.remove
);

// ----------------
// Dashboard
// ----------------

/**
 * @route   GET /dashboard/overview
 * @desc    Get dashboard overview statistics
 * @access  Private (Admin)
 */
router.get('/dashboard/overview', 
  authorizeCasl('read', 'PsychologyOrder'),
  dashboardController.getOverview
);

/**
 * @route   GET /dashboard/popular-packages
 * @desc    Get popular packages
 * @access  Private (Admin)
 */
router.get('/dashboard/popular-packages', 
  authorizeCasl('read', 'PsychologyPackage'),
  dashboardController.getPopularPackages
);

/**
 * @route   GET /dashboard/recent-orders
 * @desc    Get recent orders
 * @access  Private (Admin)
 */
router.get('/dashboard/recent-orders', 
  authorizeCasl('read', 'PsychologyOrder'),
  dashboardController.getRecentOrders
);

/**
 * @route   GET /dashboard/revenue-chart
 * @desc    Get revenue chart data
 * @access  Private (Admin)
 */
router.get('/dashboard/revenue-chart', 
  authorizeCasl('read', 'PsychologyOrder'),
  dashboardController.getRevenueChart
);

/**
 * @route   GET /dashboard/test-completion-stats
 * @desc    Get test completion statistics
 * @access  Private (Admin)
 */
router.get('/dashboard/test-completion-stats', 
  authorizeCasl('read', 'PsychologySession'),
  dashboardController.getTestCompletionStats
);

// ----------------
// Reports
// ----------------

/**
 * @route   GET /reports/orders
 * @desc    Get order report
 * @access  Private (Admin)
 */
router.get('/reports/orders', 
  authorizeCasl('read', 'PsychologyOrder'),
  reportController.getOrderReport
);

/**
 * @route   GET /reports/revenue
 * @desc    Get revenue report
 * @access  Private (Admin)
 */
router.get('/reports/revenue', 
  authorizeCasl('read', 'PsychologyOrder'),
  reportController.getRevenueReport
);

/**
 * @route   GET /reports/test-completion
 * @desc    Get test completion report
 * @access  Private (Admin)
 */
router.get('/reports/test-completion', 
  authorizeCasl('read', 'PsychologySession'),
  reportController.getTestCompletionReport
);

/**
 * @route   GET /reports/patients
 * @desc    Get patient report with demographics
 * @access  Private (Admin)
 */
router.get('/reports/patients', 
  authorizeCasl('read', 'Patient'),
  reportController.getPatientReport
);

/**
 * @route   GET /reports/package-performance
 * @desc    Get package performance report
 * @access  Private (Admin)
 */
router.get('/reports/package-performance', 
  authorizeCasl('read', 'PsychologyPackage'),
  reportController.getPackagePerformanceReport
);

/**
 * @route   GET /reports/test-usage-billing
 * @desc    Get test usage billing report (for invoice/billing validation)
 * @access  Private (Admin)
 * @query   startDate, endDate, testTypeId, verified (verified|unverified|all)
 */
router.get('/reports/test-usage-billing', 
  authorizeCasl('read', 'PsychologySession'),
  reportController.getTestUsageBillingReport
);

// ----------------
// PDF Report Generation
// ----------------

/**
 * @route   POST /reports/:sessionId/pdf
 * @desc    Generate PDF report for a psychology session
 * @access  Private (requires read permission on PsychologySession)
 * @body    { reportType: 'full'|'summary', forceRegenerate: boolean, options: {} }
 */
router.post('/reports/:sessionId/pdf',
  authorizeCasl('read', 'PsychologySession'),
  reportController.generatePDFReport
);

/**
 * @route   GET /reports/download/:cacheId
 * @desc    Download generated PDF report
 * @access  Private (tenant-isolated)
 */
router.get('/reports/download/:cacheId',
  reportController.downloadPDFReport
);

/**
 * @route   GET /reports/:sessionId/status
 * @desc    Get PDF report cache status for a session
 * @access  Private (requires read permission on PsychologySession)
 */
router.get('/reports/:sessionId/status',
  authorizeCasl('read', 'PsychologySession'),
  reportController.getReportStatus
);

/**
 * @route   DELETE /reports/:sessionId/cache
 * @desc    Delete cached PDF reports for a session
 * @access  Private (requires manage permission on PsychologySession)
 */
router.delete('/reports/:sessionId/cache',
  authorizeCasl('manage', 'PsychologySession'),
  reportController.deleteReportCache
);

/**
 * @route   GET /reports/cache/stats
 * @desc    Get PDF cache statistics for tenant
 * @access  Private (Admin)
 */
router.get('/reports/cache/stats',
  authorizeCasl('read', 'PsychologySession'),
  reportController.getCacheStats
);

/**
 * @route   GET /reports/session/:sessionId/export/xlsx
 * @desc    Export session report to XLSX format
 * @access  Private (Admin)
 */
router.get('/reports/session/:sessionId/export/xlsx',
  authorizeCasl('read', 'PsychologySession'),
  reportController.exportSessionToXLSX
);

/**
 * @route   GET /reports/session/:sessionId/export/pdf
 * @desc    Export session report to PDF format
 * @access  Private (Admin)
 */
router.get('/reports/session/:sessionId/export/pdf',
  authorizeCasl('read', 'PsychologySession'),
  reportController.exportSessionToPDF
);

// ----------------
// Psikograms
// ----------------

/**
 * @route   GET /psikograms
 * @desc    Get all psikograms with pagination and filters
 * @access  Private
 */
router.get('/psikograms',
  authorizeCasl('read', 'PsychologySession'),
  psikogramController.getAll
);

/**
 * @route   GET /psikograms/:id
 * @desc    Get psikogram by ID
 * @access  Private
 */
router.get('/psikograms/:id',
  authorizeCasl('read', 'PsychologySession'),
  psikogramController.getById
);

/**
 * @route   GET /psikograms/:id/print
 * @desc    Get psikogram print data
 * @access  Private
 */
router.get('/psikograms/:id/print',
  authorizeCasl('read', 'PsychologySession'),
  psikogramController.getPrintData
);

/**
 * @route   GET /psikograms/:id/share
 * @desc    Generate public share URL for psikogram
 * @access  Private
 */
router.post('/psikograms/:id/share',
  authorizeCasl('read', 'PsychologySession'),
  psikogramController.generateShareUrl
);

/**
 * @route   POST /psikograms
 * @desc    Create new psikogram
 * @access  Private
 */
router.post('/psikograms',
  authorizeCasl('update', 'PsychologySession'),
  validate(psikogramValidators.create),
  psikogramController.create
);

/**
 * @route   PUT /psikograms/:id
 * @desc    Update psikogram
 * @access  Private
 */
router.put('/psikograms/:id',
  authorizeCasl('update', 'PsychologySession'),
  validate(psikogramValidators.update),
  psikogramController.update
);

/**
 * @route   DELETE /psikograms/:id
 * @desc    Delete psikogram
 * @access  Private
 */
router.delete('/psikograms/:id',
  authorizeCasl('delete', 'PsychologySession'),
  psikogramController.remove
);

// ----------------
// Settings
// ----------------

/**
 * @route   GET /settings
 * @desc    Get psychology settings for tenant
 * @access  Private
 */
router.get('/settings',
  authorizeCasl('read', 'PsychologySession'),
  settingsController.getSettings
);

/**
 * @route   POST /settings
 * @desc    Save/Update psychology settings
 * @access  Private (Admin)
 */
router.post('/settings',
  authorizeCasl('update', 'PsychologySession'),
  validate(settingsValidators.save),
  settingsController.saveSettings
);

/**
 * @route   POST /settings/upload
 * @desc    Upload file (logo, footer, signature)
 * @access  Private (Admin)
 * @body    multipart/form-data: file, type (logo|footer|signature)
 */
router.post('/settings/upload',
  authorizeCasl('update', 'PsychologySession'),
  upload.single('file'),
  settingsController.uploadFile
);

/**
 * @route   DELETE /settings/file/:type
 * @desc    Delete uploaded file
 * @access  Private (Admin)
 */
router.delete('/settings/file/:type',
  authorizeCasl('update', 'PsychologySession'),
  settingsController.deleteFile
);

// ----------------
// Utilities (Admin/Super Admin Only)
// ----------------

/**
 * @route   POST /utils/recalculate-scores
 * @desc    Recalculate session scores (with options)
 * @access  Private (Admin)
 * @body    { sessionId?, date?, status?, dryRun? }
 */
router.post('/utils/recalculate-scores',
  authorizeCasl('update', 'PsychologySession'),
  utilityController.recalculateScores
);

/**
 * @route   POST /utils/fix-question-count
 * @desc    Fix question count to exclude instructions
 * @access  Private (Admin)
 * @body    { testTypeId?, dryRun? }
 */
router.post('/utils/fix-question-count',
  authorizeCasl('update', 'PsychologyTestType'),
  utilityController.fixQuestionCount
);

/**
 * @route   GET /utils/session-stats
 * @desc    Get session statistics
 * @access  Private (Admin)
 * @query   startDate?, endDate?
 */
router.get('/utils/session-stats',
  authorizeCasl('read', 'PsychologySession'),
  utilityController.getSessionStats
);

module.exports = router;
