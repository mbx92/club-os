const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../middlewares/caslMiddleware');
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
  authorizeCasl('create', 'IncomeCategory'),
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
  authorizeCasl('read', 'IncomeCategory'),
  getAllIncomeCategories
);

/**
 * @route PUT /finance/income-categories/:id
 * @desc Update income category
 * @access Private (update IncomeCategory)
 */
router.put('/:id',
  authenticate,
  authorizeCasl('update', 'IncomeCategory'),
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
  authorizeCasl('delete', 'IncomeCategory'),
  deleteIncomeCategory,
  auditLog('DELETE_INCOME_CATEGORY')
);

module.exports = router;
