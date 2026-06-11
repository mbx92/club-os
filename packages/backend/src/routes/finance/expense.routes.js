const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/permissionMiddleware');
const auditLog = require('../../middlewares/auditMiddleware');
const {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  approveExpense,
  markExpenseAsPaid,
  reopenExpense
} = require('../../controllers/finance');

const router = express.Router();

/**
 * @route POST /finance/expenses
 * @desc Create new expense
 * @access Private (create Expense)
 */
router.post('/',
  authenticate,
  authorize('create', 'Expense'),
  createExpense,
  auditLog('CREATE_EXPENSE')
);

/**
 * @route GET /finance/expenses
 * @desc Get all expenses with filters
 * @access Private (read Expense)
 */
router.get('/',
  authenticate,
  authorize('read', 'Expense'),
  getAllExpenses
);

/**
 * @route GET /finance/expenses/:id
 * @desc Get expense by ID
 * @access Private (read Expense)
 */
router.get('/:id',
  authenticate,
  authorize('read', 'Expense'),
  getExpenseById
);

/**
 * @route PUT /finance/expenses/:id
 * @desc Update expense
 * @access Private (update Expense)
 */
router.put('/:id',
  authenticate,
  authorize('update', 'Expense'),
  updateExpense,
  auditLog('UPDATE_EXPENSE')
);

/**
 * @route DELETE /finance/expenses/:id
 * @desc Delete expense
 * @access Private (delete Expense)
 */
router.delete('/:id',
  authenticate,
  authorize('delete', 'Expense'),
  deleteExpense,
  auditLog('DELETE_EXPENSE')
);

/**
 * @route POST /finance/expenses/:id/approve
 * @desc Approve expense
 * @access Private (update Expense)
 */
router.post('/:id/approve',
  authenticate,
  authorize('update', 'Expense'),
  approveExpense,
  auditLog('APPROVE_EXPENSE')
);

/**
 * @route POST /finance/expenses/:id/pay
 * @desc Mark expense as paid
 * @access Private (update Expense)
 */
router.post('/:id/pay',
  authenticate,
  authorize('update', 'Expense'),
  markExpenseAsPaid,
  auditLog('PAY_EXPENSE')
);

/**
 * @route POST /finance/expenses/:id/reopen
 * @desc Reopen an approved or paid expense back to pending
 * @access Private (update Expense)
 */
router.post('/:id/reopen',
  authenticate,
  authorize('update', 'Expense'),
  reopenExpense,
  auditLog('REOPEN_EXPENSE')
);

module.exports = router;
