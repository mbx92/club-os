'use strict';

/**
 * RestaurantTable Model - Restaurant Module
 * 
 * Restaurant table management with real-time status tracking.
 * Supports table layout positioning, QR codes, and order assignment.
 * 
 * @module modules/restaurant/models/restaurantTable
 */

const { Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const RestaurantTable = sequelize.define('RestaurantTable', {
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
    locationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Locations',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Location where this table is located'
    },
    tableNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Table number or identifier (e.g., "T1", "A-5")'
    },
    tableName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Optional friendly name (e.g., "VIP Corner", "Window View")'
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 4,
      comment: 'Number of seats at this table'
    },
    
    // Layout positioning for UI
    positionX: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'X coordinate for table layout positioning'
    },
    positionY: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Y coordinate for table layout positioning'
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Table width for layout rendering'
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Table height for layout rendering'
    },
    shape: {
      type: DataTypes.ENUM('rectangle', 'circle', 'square'),
      allowNull: false,
      defaultValue: 'rectangle',
      comment: 'Table shape for UI rendering'
    },
    
    // Table status
    status: {
      type: DataTypes.ENUM('available', 'occupied', 'reserved', 'cleaning'),
      allowNull: false,
      defaultValue: 'available',
      comment: 'Current table status'
    },
    currentOrderId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Transactions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Current active order for this table'
    },
    occupiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when table was occupied'
    },
    occupiedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Guest name or identifier'
    },
    qrCode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'QR code data for self-ordering'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'RestaurantTables',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['tenantId']
      },
      {
        fields: ['locationId']
      },
      {
        fields: ['tableNumber', 'tenantId'],
        unique: true,
        name: 'restaurant_tables_number_tenant_unique'
      },
      {
        fields: ['status']
      },
      {
        fields: ['currentOrderId']
      },
      {
        fields: ['qrCode'],
        unique: true,
        name: 'restaurant_tables_qr_unique',
        where: {
          qrCode: {
            [require('sequelize').Op.ne]: null
          }
        }
      }
    ]
  });

  RestaurantTable.associate = function(models) {
    // Tenant association
    RestaurantTable.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });

    // Location association
    RestaurantTable.belongsTo(models.Location, {
      foreignKey: 'locationId',
      as: 'location'
    });

    // Current order association
    RestaurantTable.belongsTo(models.Transaction, {
      foreignKey: 'currentOrderId',
      as: 'currentOrder'
    });
  };

  /**
   * Instance method: Check if table is available
   */
  RestaurantTable.prototype.isAvailable = function() {
    return this.status === 'available' && this.isActive;
  };

  /**
   * Instance method: Check if table is occupied
   */
  RestaurantTable.prototype.isOccupied = function() {
    return this.status === 'occupied';
  };

  /**
   * Instance method: Get occupation duration in minutes
   */
  RestaurantTable.prototype.getOccupationDuration = function() {
    if (!this.occupiedAt) return 0;
    return Math.floor((new Date() - new Date(this.occupiedAt)) / 60000);
  };

  /**
   * Instance method: Occupy table
   */
  RestaurantTable.prototype.occupy = async function(orderId, guestName = null) {
    this.status = 'occupied';
    this.currentOrderId = orderId;
    this.occupiedAt = new Date();
    this.occupiedBy = guestName;
    await this.save();
  };

  /**
   * Instance method: Release table
   */
  RestaurantTable.prototype.release = async function() {
    this.status = 'available';
    this.currentOrderId = null;
    this.occupiedAt = null;
    this.occupiedBy = null;
    await this.save();
  };

  /**
   * Instance method: Set table to cleaning
   */
  RestaurantTable.prototype.setForCleaning = async function() {
    this.status = 'cleaning';
    this.currentOrderId = null;
    this.occupiedAt = null;
    this.occupiedBy = null;
    await this.save();
  };

  /**
   * Instance method: Reserve table
   */
  RestaurantTable.prototype.reserve = async function(guestName) {
    this.status = 'reserved';
    this.occupiedBy = guestName;
    await this.save();
  };

  /**
   * Instance method: Get table position object
   */
  RestaurantTable.prototype.getPosition = function() {
    return {
      x: this.positionX,
      y: this.positionY,
      width: this.width,
      height: this.height,
      shape: this.shape
    };
  };

  /**
   * Static method: Get available tables
   */
  RestaurantTable.getAvailableTables = async function(tenantId, locationId = null, minCapacity = null) {
    const where = {
      tenantId,
      status: 'available',
      isActive: true
    };

    if (locationId) {
      where.locationId = locationId;
    }

    if (minCapacity) {
      where.capacity = { [Op.gte]: minCapacity };
    }

    return await this.findAll({
      where,
      order: [['tableNumber', 'ASC']],
      include: [{
        model: sequelize.models.Location,
        as: 'location'
      }]
    });
  };

  /**
   * Static method: Get occupied tables with current orders
   */
  RestaurantTable.getOccupiedTables = async function(tenantId, locationId = null) {
    const where = {
      tenantId,
      status: 'occupied',
      isActive: true
    };

    if (locationId) {
      where.locationId = locationId;
    }

    return await this.findAll({
      where,
      order: [['occupiedAt', 'ASC']],
      include: [
        {
          model: sequelize.models.Location,
          as: 'location'
        },
        {
          model: sequelize.models.Transaction,
          as: 'currentOrder',
          include: ['items', 'payments']
        }
      ]
    });
  };

  /**
   * Static method: Get table statistics
   */
  RestaurantTable.getStatistics = async function(tenantId, locationId = null) {
    const where = { tenantId, isActive: true };
    if (locationId) where.locationId = locationId;

    const tables = await this.findAll({ where });
    
    const stats = {
      total: tables.length,
      available: tables.filter(t => t.status === 'available').length,
      occupied: tables.filter(t => t.status === 'occupied').length,
      reserved: tables.filter(t => t.status === 'reserved').length,
      cleaning: tables.filter(t => t.status === 'cleaning').length,
      totalCapacity: tables.reduce((sum, t) => sum + t.capacity, 0),
      occupancyRate: 0
    };

    stats.occupancyRate = stats.total > 0 
      ? ((stats.occupied / stats.total) * 100).toFixed(2) 
      : 0;

    return stats;
  };

  /**
   * Static method: Find table by QR code
   */
  RestaurantTable.findByQRCode = async function(qrCode) {
    return await this.findOne({
      where: { qrCode, isActive: true },
      include: [
        { model: sequelize.models.Location, as: 'location' },
        { model: sequelize.models.Tenant, as: 'tenant' }
      ]
    });
  };

  /**
   * Hook: Generate QR code on create if not provided
   */
  RestaurantTable.beforeCreate(async (table) => {
    if (!table.qrCode) {
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256')
        .update(`${table.tenantId}-${table.tableNumber}-${Date.now()}`)
        .digest('hex');
      table.qrCode = hash.substring(0, 16).toUpperCase();
    }
  });

  return RestaurantTable;
};
