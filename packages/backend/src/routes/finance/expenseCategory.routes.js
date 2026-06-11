const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/permissionMiddleware');
const auditLog = require('../../middlewares/auditMiddleware');
const {
  createExpenseCategory,
  getAllExpenseCategories,
  updateExpenseCategory,
  deleteExpenseCategory
} = require('../../controllers/finance');

const router = express.Router();

/**
 * @route POST /finance/expense-categories
 * @desc Create expense category
 * @access Private (create ExpenseCategory)
 */
router.post('/',
  authenticate,
  authorize('create', 'ExpenseCategory'),
  createExpenseCategory,
  auditLog('CREATE_EXPENSE_CATEGORY')
);

/**
 * @route GET /finance/expense-categories
 * @desc Get all expense categories
 * @access Private (read ExpenseCategory)
 */
router.get('/',
  authenticate,
  authorize('read', 'ExpenseCategory'),
  getAllExpenseCategories
);

/**
 * @route PUT /finance/expense-categories/:id
 * @desc Update expense category
 * @access Private (update ExpenseCategory)
 */
router.put('/:id',
  authenticate,
  authorize('update', 'ExpenseCategory'),
  updateExpenseCategory,
  auditLog('UPDATE_EXPENSE_CATEGORY')
);

/**
 * @route DELETE /finance/expense-categories/:id
 * @desc Delete expense category
 * @access Private (delete ExpenseCategory)
 */
router.delete('/:id',
  authenticate,
  authorize('delete', 'ExpenseCategory'),
  deleteExpenseCategory,
  auditLog('DELETE_EXPENSE_CATEGORY')
);

module.exports = router;
