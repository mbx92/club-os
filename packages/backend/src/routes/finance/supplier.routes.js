const express = require('express');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/permissionMiddleware');
const auditLog = require('../../middlewares/auditMiddleware');
const {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  toggleSupplierStatus
} = require('../../controllers/finance');

const router = express.Router();

/**
 * @route POST /finance/suppliers
 * @desc Create a new supplier
 * @access Private (create Supplier)
 */
router.post('/',
  authenticate,
  authorize('create', 'Supplier'),
  createSupplier,
  auditLog('CREATE_SUPPLIER')
);

/**
 * @route GET /finance/suppliers
 * @desc Get all suppliers (with search, filter, pagination)
 * @access Private (read Supplier)
 */
router.get('/',
  authenticate,
  authorize('read', 'Supplier'),
  getAllSuppliers
);

/**
 * @route GET /finance/suppliers/:id
 * @desc Get supplier by ID
 * @access Private (read Supplier)
 */
router.get('/:id',
  authenticate,
  authorize('read', 'Supplier'),
  getSupplierById
);

/**
 * @route PUT /finance/suppliers/:id
 * @desc Update supplier
 * @access Private (update Supplier)
 */
router.put('/:id',
  authenticate,
  authorize('update', 'Supplier'),
  updateSupplier,
  auditLog('UPDATE_SUPPLIER')
);

/**
 * @route PATCH /finance/suppliers/:id/toggle-status
 * @desc Toggle supplier active/inactive status
 * @access Private (update Supplier)
 */
router.patch('/:id/toggle-status',
  authenticate,
  authorize('update', 'Supplier'),
  toggleSupplierStatus,
  auditLog('TOGGLE_SUPPLIER_STATUS')
);

/**
 * @route DELETE /finance/suppliers/:id
 * @desc Delete supplier (soft delete)
 * @access Private (delete Supplier)
 */
router.delete('/:id',
  authenticate,
  authorize('delete', 'Supplier'),
  deleteSupplier,
  auditLog('DELETE_SUPPLIER')
);

module.exports = router;
