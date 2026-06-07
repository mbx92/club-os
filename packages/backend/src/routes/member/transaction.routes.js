const express = require('express');
const {
  getTransactionHistory,
  getTransactionDetail
} = require('../../controllers/member/memberTransactionController');
const { authenticate } = require('../../middlewares/authMiddleware');
const auditLog = require('../../middlewares/auditMiddleware');

const router = express.Router();

/**
 * @route GET /member/transactions
 * @name member.transactions.list
 * @desc Get member's transaction history with pagination and filters
 * @access Private - Member role
 * @query page, limit, status, type, startDate, endDate
 */
router.get('/',
  authenticate,
  auditLog('MEMBER_TRANSACTIONS_LIST'),
  getTransactionHistory
);

/**
 * @route GET /member/transactions/:id
 * @name member.transactions.detail
 * @desc Get transaction detail by ID
 * @access Private - Member role (can only view own transactions)
 */
router.get('/:id',
  authenticate,
  auditLog('MEMBER_TRANSACTION_DETAIL'),
  getTransactionDetail
);

module.exports = router;
