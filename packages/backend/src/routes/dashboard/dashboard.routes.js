const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../middlewares/caslMiddleware');
const auditLog = require('../../middlewares/auditMiddleware');
const { getMainDashboard } = require('../../controllers/dashboard/mainDashboardController');
const { getGlobalReport } = require('../../controllers/dashboard/globalReportController');

const router = express.Router();

/**
 * @route GET /dashboard/main
 * @name mainDashboard.overview
 * @desc Get unified dashboard combining gym, restaurant, and financial data
 * @access Private
 * @query locationId
 */
router.get('/main',
  authenticate,
  authorizeCasl('read', 'Transaction'),
  auditLog('MAIN_DASHBOARD'),
  getMainDashboard
);

/**
 * @route GET /dashboard/global-report
 * @name dashboard.globalReport
 * @desc Global analytics report untuk infografis — mencakup revenue, members,
 *       attendance, restaurant, service plans, finance balance, dan payment methods.
 * @access Private
 * @query period    - 7d | 30d | 90d | 1y  (default: 30d)
 * @query startDate - ISO date override start
 * @query endDate   - ISO date override end
 */
router.get('/global-report',
  authenticate,
  authorizeCasl('read', 'Transaction'),
  auditLog('GLOBAL_REPORT'),
  getGlobalReport
);

module.exports = router;
