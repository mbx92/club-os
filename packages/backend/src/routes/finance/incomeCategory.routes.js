const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/permissionMiddleware');
const auditLog = require('../../middlewares/auditMiddleware');
const {
  createIncomeCategory,
  getAllIncomeCategories,
  updateIncomeCategory,
  deleteIncomeCategory
} = require('../../controllers/finance');

const router = express.Router();

/**
 * @route POST /finance/income-categories
 * @desc Create new income category
 * @access Private (create IncomeCategory)
 */
router.post('/',
  authenticate,
  authorize('create', 'IncomeCategory'),
  createIncomeCategory,
  auditLog('CREATE_INCOME_CATEGORY')
);

/**
 * @route GET /finance/income-categories
 * @desc Get all income categories
 * @access Private (read IncomeCategory)
 */
router.get('/',
  authenticate,
  authorize('read', 'IncomeCategory'),
  getAllIncomeCategories
);

/**
 * @route PUT /finance/income-categories/:id
 * @desc Update income category
 * @access Private (update IncomeCategory)
 */
router.put('/:id',
  authenticate,
  authorize('update', 'IncomeCategory'),
  updateIncomeCategory,
  auditLog('UPDATE_INCOME_CATEGORY')
);

/**
 * @route DELETE /finance/income-categories/:id
 * @desc Delete income category
 * @access Private (delete IncomeCategory)
 */
router.delete('/:id',
  authenticate,
  authorize('delete', 'IncomeCategory'),
  deleteIncomeCategory,
  auditLog('DELETE_INCOME_CATEGORY')
);

module.exports = router;
