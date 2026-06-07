'use strict';

/**
 * Restaurant Table Controller - Restaurant Module
 * 
 * Handles table management with real-time status tracking, QR codes, and occupancy analytics.
 * Supports table layouts, reservations, and order linking.
 * 
 * @module modules/restaurant/controllers/tableController
 */

const { RestaurantTable, Location, Transaction } = require('../../../models');
const { Op } = require('sequelize');
const { createError } = require('../../../utils/errorCodes');

/**
 * Get all tables with filters
 */
const getAllTables = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { locationId, status } = req.query;

    const where = {};
    
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    if (status) {
      where.status = status;
    }

    const tables = await RestaurantTable.findAll({
      where,
      include: [
        { 
          model: Location, 
          as: 'location',
          attributes: ['id', 'name', 'code', 'locationType']
        },
        {
          model: Transaction,
          as: 'currentOrder',
          required: false,
          attributes: ['id', 'transactionNumber', 'totalAmount', 'createdAt']
        }
      ],
      order: [['tableNumber', 'ASC']]
    });

    // Calculate occupation stats
    const stats = {
      total: tables.length,
      available: tables.filter(t => t.status === 'available').length,
      occupied: tables.filter(t => t.status === 'occupied').length,
      reserved: tables.filter(t => t.status === 'reserved').length,
      cleaning: tables.filter(t => t.status === 'cleaning').length,
      totalCapacity: tables.reduce((sum, t) => sum + t.capacity, 0)
    };

    res.json({
      success: true,
      data: tables,
      stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get table by ID
 */
const getTableById = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const table = await RestaurantTable.findOne({
      where,
      include: [
        { model: Location, as: 'location' },
        { 
          model: Transaction, 
          as: 'currentOrder',
          include: ['transactionItems', 'payments']
        }
      ]
    });

    if (!table) {
      throw createError('TABLE_NOT_FOUND', 'Table not found');
    }

    // Calculate occupation duration if occupied
    let occupationDuration = null;
    if (table.status === 'occupied' && table.occupiedAt) {
      occupationDuration = table.getOccupationDuration();
    }

    res.json({
      success: true,
      data: {
        ...table.toJSON(),
        occupationDuration
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new table
 */
const createTable = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { 
      tableNumber, 
      tableName, 
      locationId, 
      capacity, 
      positionX, 
      positionY, 
      width, 
      height, 
      shape 
    } = req.body;

    const tableData = {
      tenantId,
      tableNumber,
      tableName,
      locationId,
      capacity,
      positionX,
      positionY,
      width,
      height,
      shape
    };

    // Validate location exists if provided
    if (locationId) {
      const location = await Location.findOne({
        where: { id: locationId, tenantId }
      });

      if (!location) {
        throw createError('LOCATION_NOT_FOUND', 'Location not found');
      }
    }

    // Check for duplicate table number in same tenant
    const existingTable = await RestaurantTable.findOne({
      where: {
        tenantId,
        tableNumber
      }
    });

    if (existingTable) {
      throw createError('DUPLICATE_TABLE', 'Table with this number already exists');
    }

    // Validate numeric fields before create
    if (tableData.capacity !== undefined) {
      const cap = Number(tableData.capacity);
      if (Number.isNaN(cap) || !Number.isInteger(cap) || cap < 0) {
        throw createError('INVALID_INPUT', 'Capacity must be a non-negative integer');
      }
      tableData.capacity = cap;
    }

    ['positionX', 'positionY', 'width', 'height'].forEach((f) => {
      if (tableData[f] !== undefined && tableData[f] !== null && tableData[f] !== '') {
        const n = Number(tableData[f]);
        if (Number.isNaN(n)) {
          throw createError('INVALID_INPUT', `${f} must be a number`);
        }
        // store integer coordinates/dimensions by rounding
        tableData[f] = Math.round(n);
      }
    });

    const table = await RestaurantTable.create(tableData);

    res.status(201).json({
      success: true,
      message: 'Table created successfully',
      data: table
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update table
 */
const updateTable = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const table = await RestaurantTable.findOne({ where });

    if (!table) {
      throw createError('TABLE_NOT_FOUND', 'Table not found');
    }

    // Check duplicate table number if changed
    if (req.body.tableNumber && req.body.tableNumber !== table.tableNumber) {
      const existingTable = await RestaurantTable.findOne({
        where: {
          tenantId: table.tenantId,
          tableNumber: req.body.tableNumber,
          id: { [Op.ne]: id }
        }
      });

      if (existingTable) {
        throw createError('DUPLICATE_TABLE', 'Table with this number already exists');
      }
    }

    // Only update allowed fields
    const allowedFields = [
      'tableNumber', 'tableName', 'locationId', 'capacity',
      'positionX', 'positionY', 'width', 'height', 'shape', 'isActive'
    ];
    
    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Validate numeric fields before update
    if (updateData.capacity !== undefined) {
      const cap = Number(updateData.capacity);
      if (Number.isNaN(cap) || !Number.isInteger(cap) || cap < 0) {
        throw createError('INVALID_INPUT', 'Capacity must be a non-negative integer');
      }
      updateData.capacity = cap;
    }

    ['positionX', 'positionY', 'width', 'height'].forEach((f) => {
      if (updateData[f] !== undefined && updateData[f] !== null && updateData[f] !== '') {
        const n = Number(updateData[f]);
        if (Number.isNaN(n)) {
          throw createError('INVALID_INPUT', `${f} must be a number`);
        }
        updateData[f] = Math.round(n);
      }
    });

    await table.update(updateData);

    res.json({
      success: true,
      message: 'Table updated successfully',
      data: table
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete table
 */
const deleteTable = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const table = await RestaurantTable.findOne({ where });

    if (!table) {
      throw createError('TABLE_NOT_FOUND', 'Table not found');
    }

    // Prevent deletion of occupied or reserved tables
    if (table.status === 'occupied' || table.status === 'reserved') {
      throw createError('INVALID_OPERATION', `Cannot delete ${table.status} table`);
    }

    await table.destroy();

    res.json({
      success: true,
      message: 'Table deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Occupy table (start order)
 */
const occupyTable = async (req, res, next) => {
  const t = await RestaurantTable.sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { orderId, guestName } = req.body;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const table = await RestaurantTable.findOne({ where, transaction: t });

    if (!table) {
      throw createError('TABLE_NOT_FOUND', 'Table not found');
    }

    if (table.status !== 'available') {
      throw createError('TABLE_NOT_AVAILABLE', `Table is ${table.status}`);
    }

    // Validate order exists if provided
    if (orderId) {
      const order = await Transaction.findOne({
        where: { id: orderId, tenantId: table.tenantId },
        transaction: t
      });

      if (!order) {
        throw createError('ORDER_NOT_FOUND', 'Order not found');
      }
    }

    // Occupy the table
    table.status = 'occupied';
    table.currentOrderId = orderId || null;
    table.occupiedAt = new Date();
    table.occupiedBy = guestName || null;
    await table.save({ transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: 'Table occupied successfully',
      data: table
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * Release table (finish order)
 */
const releaseTable = async (req, res, next) => {
  const t = await RestaurantTable.sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const table = await RestaurantTable.findOne({ where, transaction: t });

    if (!table) {
      throw createError('TABLE_NOT_FOUND', 'Table not found');
    }

    if (table.status === 'occupied') {
      // Release occupied table (finish order)
      table.status = 'available';
      table.currentOrderId = null;
      table.occupiedAt = null;
      table.occupiedBy = null;
      await table.save({ transaction: t });

      await t.commit();

      return res.json({
        success: true,
        message: 'Table released successfully',
        data: table
      });
    }

    if (table.status === 'reserved') {
      // Cancel reservation
      table.status = 'available';
      table.occupiedBy = null;
      await table.save({ transaction: t });

      await t.commit();

      return res.json({
        success: true,
        message: 'Reservation cancelled, table is now available',
        data: table
      });
    }

    // If table is marked for cleaning, finish cleaning and make it available
    if (table.status === 'cleaning') {
      table.status = 'available';
      table.currentOrderId = null;
      table.occupiedAt = null;
      table.occupiedBy = null;
      await table.save({ transaction: t });

      await t.commit();

      return res.json({
        success: true,
        message: 'Table cleaned and now available',
        data: table
      });
    }

    // If table is already available, treat release as idempotent and return success
    if (table.status === 'available') {
      // No state change needed, just commit and return current table
      await t.commit();
      return res.json({
        success: true,
        message: 'Table already available',
        data: table
      });
    }

    throw createError('INVALID_OPERATION', 'Table is not occupied or reserved');
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * Reserve table
 */
const reserveTable = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { guestName } = req.body;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const table = await RestaurantTable.findOne({ where });

    if (!table) {
      throw createError('TABLE_NOT_FOUND', 'Table not found');
    }

    if (table.status !== 'available') {
      throw createError('TABLE_NOT_AVAILABLE', `Table is ${table.status}`);
    }

    // Reserve the table
    table.status = 'reserved';
    table.occupiedBy = guestName || null;
    await table.save();

    res.json({
      success: true,
      message: 'Table reserved successfully',
      data: table
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set table for cleaning
 */
const setForCleaning = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const table = await RestaurantTable.findOne({ where });

    if (!table) {
      throw createError('TABLE_NOT_FOUND', 'Table not found');
    }

    await table.setForCleaning();

    res.json({
      success: true,
      message: 'Table set for cleaning',
      data: table
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get table statistics
 */
const getTableStatistics = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { locationId } = req.query;

    // Use static method from model
    const stats = await RestaurantTable.getStatistics(
      isSuperAdmin ? null : tenantId,
      locationId
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get table layout for specific location
 */
const getTableLayout = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { locationId } = req.params;

    const where = { locationId, isActive: true };
    
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const tables = await RestaurantTable.findAll({
      where,
      include: [
        { 
          model: Transaction, 
          as: 'currentOrder',
          required: false,
          attributes: ['id', 'transactionNumber', 'totalAmount']
        }
      ],
      order: [['tableNumber', 'ASC']]
    });

    // Return tables with position info for layout rendering
    const layout = tables.map(table => ({
      id: table.id,
      tableNumber: table.tableNumber,
      tableName: table.tableName,
      capacity: table.capacity,
      status: table.status,
      position: table.getPosition(),
      currentOrder: table.currentOrder,
      occupiedAt: table.occupiedAt,
      occupiedBy: table.occupiedBy
    }));

    res.json({
      success: true,
      data: layout
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Find table by QR code
 */
const findByQRCode = async (req, res, next) => {
  try {
    const { qrCode } = req.params;

    const table = await RestaurantTable.findByQRCode(qrCode);

    if (!table) {
      throw createError('TABLE_NOT_FOUND', 'Table not found');
    }

    res.json({
      success: true,
      data: table
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  occupyTable,
  releaseTable,
  reserveTable,
  setForCleaning,
  getTableStatistics,
  getTableLayout,
  findByQRCode
};
