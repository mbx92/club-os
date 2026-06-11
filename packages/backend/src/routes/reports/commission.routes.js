/**
 * Commission Report Routes
 * Mount path: /reports/commissions
 */
const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/permissionMiddleware');
const {
  getCommissionSummary,
  getCommissionTrends,
  getTrainerCommissionDetail
} = require('../../controllers/reports');

const router = express.Router();

/**
 * @route GET /reports/commissions/summary
 * @desc Commission summary with breakdown by trainer
 * @query startDate, endDate, status (pending|paid|cancelled)
 * @access Private (read TrainerCommission)
 */
router.get('/summary',
  authenticate,
  authorize('read', 'TrainerCommission'),
  getCommissionSummary
);

/**
 * @route GET /reports/commissions/trends
 * @desc Commission trends over time with forecasting
 * @query startDate, endDate, groupBy (daily|weekly|monthly)
 * @access Private (read TrainerCommission)
 */
router.get('/trends',
  authenticate,
  authorize('read', 'TrainerCommission'),
  getCommissionTrends
);

/**
 * @route GET /reports/commissions/by-trainer/:trainerId
 * @desc Detailed commission report for a specific trainer
 * @query startDate, endDate, status, page, limit
 * @access Private (read TrainerCommission)
 */
router.get('/by-trainer/:trainerId',
  authenticate,
  authorize('read', 'TrainerCommission'),
  getTrainerCommissionDetail
);

module.exports = router;
