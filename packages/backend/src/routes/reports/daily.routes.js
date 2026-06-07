/**
 * Daily Report Routes (Laporan Harian)
 * Mount path: /reports/finance  (appended to existing finance report routes)
 */
const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../middlewares/caslMiddleware');
const {
  getDailySummaryReport,
  exportDailySummaryReport,
} = require('../../controllers/reports/dailyReportController');

const router = express.Router();

/**
 * @route GET /reports/finance/daily-summary
 * @desc Daily summary report (Laporan Harian) - JSON
 * @query startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 * @access Private (read Transaction)
 */
router.get('/daily-summary',
  authenticate,
  authorizeCasl('read', 'Transaction'),
  getDailySummaryReport
);

/**
 * @route GET /reports/finance/daily-summary/export
 * @desc Export daily summary report as XLSX
 * @query startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 * @access Private (read Transaction)
 */
router.get('/daily-summary/export',
  authenticate,
  authorizeCasl('read', 'Transaction'),
  exportDailySummaryReport
);

module.exports = router;
