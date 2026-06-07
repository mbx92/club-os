const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../middlewares/caslMiddleware');
const { requireModule } = require('../../middlewares/featureGateMiddleware');
const {
  getShareholders,
  createShareholder,
  updateShareholder,
  deleteShareholder,
  reorderShareholders
} = require('../../controllers/finance/shareholderController');

const router = express.Router();

router.use(authenticate, requireModule('finance'));

/**
 * @route GET /finance/shareholders
 * @desc List all shareholders for the tenant
 */
router.get('/', authorizeCasl('read', 'FinancialReport'), getShareholders);

/**
 * @route POST /finance/shareholders
 * @desc Create a new shareholder
 */
router.post('/', authorizeCasl('create', 'FinancialReport'), createShareholder);

/**
 * @route PUT /finance/shareholders/reorder
 * @desc Bulk update sortOrder
 * @body [{ id, sortOrder }, ...]
 */
router.put('/reorder', authorizeCasl('update', 'FinancialReport'), reorderShareholders);

/**
 * @route PUT /finance/shareholders/:id
 * @desc Update a shareholder
 */
router.put('/:id', authorizeCasl('update', 'FinancialReport'), updateShareholder);

/**
 * @route DELETE /finance/shareholders/:id
 * @desc Soft-delete a shareholder
 */
router.delete('/:id', authorizeCasl('delete', 'FinancialReport'), deleteShareholder);

module.exports = router;
