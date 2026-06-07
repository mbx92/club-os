'use strict';

/**
 * Supplier/Vendor Management Controller
 * 
 * Master data CRUD for managing suppliers/vendors.
 * 
 * @module controllers/finance/supplierController
 */

const { Supplier, Expense, sequelize } = require('../../models');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');
const { getClientIp, getUserAgent } = require('../../utils/requestHelper');

/**
 * Create a new supplier
 * @route POST /api/v1/finance/suppliers
 */
async function createSupplier(req, res, next) {
  try {
    const { tenantId } = req.user;
    const {
      code, name, contactPerson, email, phone,
      address, city, province, postalCode,
      taxId, bankName, bankAccountNumber, bankAccountHolder,
      category, notes, isActive
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Supplier name is required'
      });
    }

    // Check for duplicate name within tenant
    const existingName = await Supplier.findOne({
      where: { tenantId, name: name.trim() }
    });
    if (existingName) {
      return res.status(400).json({
        success: false,
        code: 'SUPPLIER_NAME_EXISTS',
        message: 'Supplier with this name already exists'
      });
    }

    // Check for duplicate code within tenant (if provided)
    if (code) {
      const existingCode = await Supplier.findOne({
        where: { tenantId, code: code.trim() }
      });
      if (existingCode) {
        return res.status(400).json({
          success: false,
          code: 'SUPPLIER_CODE_EXISTS',
          message: 'Supplier with this code already exists'
        });
      }
    }

    const supplier = await Supplier.create({
      tenantId,
      code: code ? code.trim() : null,
      name: name.trim(),
      contactPerson,
      email,
      phone,
      address,
      city,
      province,
      postalCode,
      taxId,
      bankName,
      bankAccountNumber,
      bankAccountHolder,
      category,
      notes,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      data: supplier
    });

    logger.logInfo('Supplier created', {
      action: 'CREATE_SUPPLIER',
      userId: req.user.id,
      tenantId,
      supplierId: supplier.id,
      supplierName: supplier.name,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error creating supplier', {
      action: 'CREATE_SUPPLIER_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

/**
 * Get all suppliers with optional filtering, search, and pagination
 * @route GET /api/v1/finance/suppliers
 */
async function getAllSuppliers(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'ASC',
      search,
      isActive,
      category
    } = req.query;

    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
        { contactPerson: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: suppliers } = await Supplier.findAndCountAll({
      where,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: suppliers,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    logger.logError('Error fetching suppliers', {
      action: 'GET_SUPPLIERS_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

/**
 * Get supplier by ID
 * @route GET /api/v1/finance/suppliers/:id
 */
async function getSupplierById(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const supplier = await Supplier.findOne({ where });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        code: 'SUPPLIER_NOT_FOUND',
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      data: supplier
    });

  } catch (error) {
    logger.logError('Error fetching supplier', {
      action: 'GET_SUPPLIER_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

/**
 * Update supplier
 * @route PUT /api/v1/finance/suppliers/:id
 */
async function updateSupplier(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const updateData = req.body;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const supplier = await Supplier.findOne({ where });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        code: 'SUPPLIER_NOT_FOUND',
        message: 'Supplier not found'
      });
    }

    // Check for duplicate name if name is being changed
    if (updateData.name && updateData.name.trim() !== supplier.name) {
      const existingName = await Supplier.findOne({
        where: {
          tenantId: supplier.tenantId,
          name: updateData.name.trim(),
          id: { [Op.ne]: id }
        }
      });

      if (existingName) {
        return res.status(400).json({
          success: false,
          code: 'SUPPLIER_NAME_EXISTS',
          message: 'Supplier with this name already exists'
        });
      }
    }

    // Check for duplicate code if code is being changed
    if (updateData.code && updateData.code.trim() !== supplier.code) {
      const existingCode = await Supplier.findOne({
        where: {
          tenantId: supplier.tenantId,
          code: updateData.code.trim(),
          id: { [Op.ne]: id }
        }
      });

      if (existingCode) {
        return res.status(400).json({
          success: false,
          code: 'SUPPLIER_CODE_EXISTS',
          message: 'Supplier with this code already exists'
        });
      }
    }

    // Trim name and code if provided
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.code) updateData.code = updateData.code.trim();

    await supplier.update(updateData);

    res.json({
      success: true,
      data: supplier
    });

    logger.logInfo('Supplier updated', {
      action: 'UPDATE_SUPPLIER',
      userId: req.user.id,
      tenantId: supplier.tenantId,
      supplierId: id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error updating supplier', {
      action: 'UPDATE_SUPPLIER_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

/**
 * Delete supplier (soft delete)
 * @route DELETE /api/v1/finance/suppliers/:id
 */
async function deleteSupplier(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const supplier = await Supplier.findOne({ where });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        code: 'SUPPLIER_NOT_FOUND',
        message: 'Supplier not found'
      });
    }

    // Check if supplier is referenced by expenses (via supplierId)
    const expenseCount = await Expense.count({
      where: { supplierId: id }
    }).catch(() => 0); // gracefully handle if supplierId column doesn't exist yet

    if (expenseCount > 0) {
      return res.status(400).json({
        success: false,
        code: 'SUPPLIER_IN_USE',
        message: `Cannot delete supplier with ${expenseCount} linked expense(s). Deactivate instead.`
      });
    }

    await supplier.destroy();

    res.json({
      success: true,
      message: 'Supplier deleted successfully'
    });

    logger.logInfo('Supplier deleted', {
      action: 'DELETE_SUPPLIER',
      userId: req.user.id,
      tenantId: supplier.tenantId,
      supplierId: id,
      supplierName: supplier.name,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error deleting supplier', {
      action: 'DELETE_SUPPLIER_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

/**
 * Toggle supplier active status
 * @route PATCH /api/v1/finance/suppliers/:id/toggle-status
 */
async function toggleSupplierStatus(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const supplier = await Supplier.findOne({ where });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        code: 'SUPPLIER_NOT_FOUND',
        message: 'Supplier not found'
      });
    }

    await supplier.update({ isActive: !supplier.isActive });

    res.json({
      success: true,
      data: supplier,
      message: `Supplier ${supplier.isActive ? 'activated' : 'deactivated'} successfully`
    });

    logger.logInfo('Supplier status toggled', {
      action: 'TOGGLE_SUPPLIER_STATUS',
      userId: req.user.id,
      tenantId: supplier.tenantId,
      supplierId: id,
      isActive: supplier.isActive,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

  } catch (error) {
    logger.logError('Error toggling supplier status', {
      action: 'TOGGLE_SUPPLIER_STATUS_ERROR',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      error: error.message
    });
    next(error);
  }
}

module.exports = {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  toggleSupplierStatus
};
