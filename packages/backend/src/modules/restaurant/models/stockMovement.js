'use strict';

/**
 * StockMovement Model - Restaurant Module
 * 
 * Immutable audit trail for all inventory movements.
 * Tracks stock in, out, adjustments, and transfers between locations.
 * 
 * @module modules/restaurant/models/stockMovement
 */

const { Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const StockMovement = sequelize.define('StockMovement', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Products',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
      comment: 'Product that was moved'
    },
    locationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Locations',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Location where movement occurred'
    },
    movementType: {
      type: DataTypes.ENUM('in', 'out', 'adjustment', 'transfer'),
      allowNull: false,
      comment: 'Type of stock movement'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Quantity moved (positive or negative)'
    },
    previousQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Stock quantity before movement'
    },
    newQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Stock quantity after movement'
    },
    referenceType: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Type of reference (e.g., "purchase_order", "sale", "adjustment")'
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID of reference record (e.g., TransactionId for sales)'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes about the movement'
    },
    performedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'User who performed the movement'
    }
  }, {
    tableName: 'StockMovements',
    timestamps: true,
    updatedAt: false, // Stock movements are immutable, no update timestamp
    paranoid: false, // Cannot be soft deleted
    indexes: [
      {
        fields: ['tenantId']
      },
      {
        fields: ['productId']
      },
      {
        fields: ['locationId']
      },
      {
        fields: ['movementType']
      },
      {
        fields: ['referenceType', 'referenceId']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['tenantId', 'productId', 'createdAt']
      }
    ]
  });

  StockMovement.associate = function(models) {
    // Tenant association
    StockMovement.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });

    // Product association
    StockMovement.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product'
    });

    // Location association
    StockMovement.belongsTo(models.Location, {
      foreignKey: 'locationId',
      as: 'location'
    });

    // User who performed the movement
    StockMovement.belongsTo(models.User, {
      foreignKey: 'performedBy',
      as: 'performer'
    });
  };

  /**
   * Instance method: Check if movement is incoming stock
   */
  StockMovement.prototype.isIncoming = function() {
    return this.movementType === 'in' || (this.movementType === 'adjustment' && this.quantity > 0);
  };

  /**
   * Instance method: Check if movement is outgoing stock
   */
  StockMovement.prototype.isOutgoing = function() {
    return this.movementType === 'out' || (this.movementType === 'adjustment' && this.quantity < 0);
  };

  /**
   * Instance method: Get absolute quantity
   */
  StockMovement.prototype.getAbsoluteQuantity = function() {
    return Math.abs(this.quantity);
  };

  /**
   * Static method: Record stock in
   */
  StockMovement.recordStockIn = async function({
    tenantId,
    productId,
    locationId,
    quantity,
    referenceType,
    referenceId,
    notes,
    performedBy,
    transaction
  }) {
    const product = await sequelize.models.Product.findByPk(productId, { transaction });
    if (!product) throw new Error('Product not found');

    const previousQuantity = product.stockQuantity;
    const newQuantity = previousQuantity + quantity;

    // Update product stock
    await product.update({ stockQuantity: newQuantity }, { transaction });

    // Record movement
    return await this.create({
      tenantId,
      productId,
      locationId,
      movementType: 'in',
      quantity,
      previousQuantity,
      newQuantity,
      referenceType,
      referenceId,
      notes,
      performedBy
    }, { transaction });
  };

  /**
   * Static method: Record stock out
   */
  StockMovement.recordStockOut = async function({
    tenantId,
    productId,
    locationId,
    quantity,
    referenceType,
    referenceId,
    notes,
    performedBy,
    transaction
  }) {
    const product = await sequelize.models.Product.findByPk(productId, { transaction });
    if (!product) throw new Error('Product not found');

    const previousQuantity = product.stockQuantity;
    const newQuantity = previousQuantity - quantity;

    if (newQuantity < 0 && product.trackInventory) {
      throw new Error(`Insufficient stock for product ${product.name}. Available: ${previousQuantity}, Required: ${quantity}`);
    }

    // Update product stock
    await product.update({ stockQuantity: newQuantity }, { transaction });

    // Record movement
    return await this.create({
      tenantId,
      productId,
      locationId,
      movementType: 'out',
      quantity: -quantity, // Negative for stock out
      previousQuantity,
      newQuantity,
      referenceType,
      referenceId,
      notes,
      performedBy
    }, { transaction });
  };

  /**
   * Static method: Record stock adjustment
   */
  StockMovement.recordAdjustment = async function({
    tenantId,
    productId,
    locationId,
    newQuantity,
    notes,
    performedBy,
    transaction
  }) {
    const product = await sequelize.models.Product.findByPk(productId, { transaction });
    if (!product) throw new Error('Product not found');

    const previousQuantity = product.stockQuantity;
    const quantity = newQuantity - previousQuantity;

    // Update product stock
    await product.update({ stockQuantity: newQuantity }, { transaction });

    // Record movement
    return await this.create({
      tenantId,
      productId,
      locationId,
      movementType: 'adjustment',
      quantity,
      previousQuantity,
      newQuantity,
      referenceType: 'manual_adjustment',
      notes,
      performedBy
    }, { transaction });
  };

  /**
   * Static method: Get stock movement history for product
   */
  StockMovement.getProductHistory = async function(productId, limit = 50) {
    return await this.findAll({
      where: { productId },
      order: [['createdAt', 'DESC']],
      limit,
      include: [
        { model: sequelize.models.Location, as: 'location' },
        { model: sequelize.models.User, as: 'performer', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });
  };

  /**
   * Static method: Get stock movement summary by date range
   */
  StockMovement.getSummaryByDateRange = async function(tenantId, startDate, endDate, locationId = null) {
    const where = {
      tenantId,
      createdAt: {
        [Op.between]: [startDate, endDate]
      }
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const movements = await this.findAll({
      where,
      attributes: [
        'movementType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.fn('ABS', sequelize.col('quantity'))), 'totalQuantity']
      ],
      group: ['movementType']
    });

    return movements.reduce((acc, m) => {
      acc[m.movementType] = {
        count: parseInt(m.dataValues.count),
        totalQuantity: parseInt(m.dataValues.totalQuantity) || 0
      };
      return acc;
    }, {});
  };

  /**
   * Static method: Get most moved products
   */
  StockMovement.getMostMovedProducts = async function(tenantId, startDate, endDate, limit = 10) {
    return await this.findAll({
      where: {
        tenantId,
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'productId',
        [sequelize.fn('COUNT', sequelize.col('StockMovement.id')), 'movementCount'],
        [sequelize.fn('SUM', sequelize.fn('ABS', sequelize.col('quantity'))), 'totalQuantity']
      ],
      include: [{
        model: sequelize.models.Product,
        as: 'product',
        attributes: ['id', 'name', 'sku', 'stockQuantity']
      }],
      group: ['productId', 'product.id'],
      order: [[sequelize.literal('totalQuantity'), 'DESC']],
      limit
    });
  };

  /**
   * Hook: Prevent updates - stock movements are immutable
   */
  StockMovement.beforeUpdate(() => {
    throw new Error('Stock movements cannot be updated. They are immutable audit records.');
  });

  /**
   * Hook: Prevent deletes - stock movements are permanent
   */
  StockMovement.beforeDestroy(() => {
    throw new Error('Stock movements cannot be deleted. They are permanent audit records.');
  });

  return StockMovement;
};
