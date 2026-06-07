const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../middlewares/caslMiddleware');
const auditLog = require('../../middlewares/auditMiddleware');
const {
  createIncome,
  getAllIncomes,
  getIncomeById,
  updateIncome,
  deleteIncome
} = require('../../controllers/finance');

const router = express.Router();

/**
 * @route POST /finance/incomes
 * @desc Create new income (manual entry)
 * @access Private (create Income)
 */
router.post('/',
  authenticate,
  authorizeCasl('create', 'Income'),
  createIncome,
  auditLog('CREATE_INCOME')
);

/**
 * @route GET /finance/incomes
 * @desc Get all incomes with filters
 * @access Private (read Income)
 */
router.get('/',
  authenticate,
  authorizeCasl('read', 'Income'),
  getAllIncomes
);

/**
 * @route GET /finance/incomes/:id
 * @desc Get income by ID
 * @access Private (read Income)
 */
router.get('/:id',
  authenticate,
  authorizeCasl('read', 'Income'),
  getIncomeById
);

/**
 * @route PUT /finance/incomes/:id
 * @desc Update income
 * @access Private (update Income)
 */
router.put('/:id',
  authenticate,
  authorizeCasl('update', 'Income'),
  updateIncome,
  auditLog('UPDATE_INCOME')
);

/**
 * @route DELETE /finance/incomes/:id
 * @desc Delete income
 * @access Private (delete Income)
 */
router.delete('/:id',
  authenticate,
  authorizeCasl('delete', 'Income'),
  deleteIncome,
  auditLog('DELETE_INCOME')
);

module.exports = router;
