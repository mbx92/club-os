'use strict';

/**
 * Location Model - Restaurant Module
 * 
 * Multi-location support for tenants with multiple branches/outlets/warehouses.
 * Each location can have its own inventory, tables, and staff.
 * 
 * @module modules/restaurant/models/location
 */

module.exports = (sequelize, DataTypes) => {
  const Location = sequelize.define('Location', {
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Location name (e.g., "Branch Sudirman", "Warehouse Central")'
    },
    code: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Unique location code for internal reference'
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true
    },
    province: {
      type: DataTypes.STRING,
      allowNull: true
    },
    postalCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Indonesia'
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    locationType: {
      type: DataTypes.ENUM('main', 'branch', 'outlet', 'warehouse', 'other'),
      allowNull: false,
      defaultValue: 'main',
      comment: 'Type of location for different business purposes'
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      comment: 'GPS latitude for map integration'
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      comment: 'GPS longitude for map integration'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'Locations',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['tenantId']
      },
      {
        fields: ['tenantId', 'code'],
        unique: true,
        name: 'locations_tenant_code_unique'
      },
      {
        fields: ['locationType']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  Location.associate = function(models) {
    // Tenant association
    Location.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });

    // Products at this location
    Location.hasMany(models.Product, {
      foreignKey: 'locationId',
      as: 'products'
    });

    // Restaurant tables at this location
    Location.hasMany(models.RestaurantTable, {
      foreignKey: 'locationId',
      as: 'tables'
    });

    // Stock movements at this location
    Location.hasMany(models.StockMovement, {
      foreignKey: 'locationId',
      as: 'stockMovements'
    });
  };

  /**
   * Instance method: Check if location is the main location
   */
  Location.prototype.isMain = function() {
    return this.locationType === 'main';
  };

  /**
   * Instance method: Get full address string
   */
  Location.prototype.getFullAddress = function() {
    const parts = [
      this.address,
      this.city,
      this.province,
      this.postalCode,
      this.country
    ].filter(Boolean);

    return parts.join(', ');
  };

  /**
   * Instance method: Check if location has GPS coordinates
   */
  Location.prototype.hasGPS = function() {
    return this.latitude !== null && this.longitude !== null;
  };

  /**
   * Instance method: Get GPS coordinates object
   */
  Location.prototype.getCoordinates = function() {
    if (!this.hasGPS()) return null;
    
    return {
      lat: parseFloat(this.latitude),
      lng: parseFloat(this.longitude)
    };
  };

  /**
   * Static method: Get main location for tenant
   */
  Location.getMainLocation = async function(tenantId) {
    return await this.findOne({
      where: {
        tenantId,
        locationType: 'main',
        isActive: true
      }
    });
  };

  /**
   * Static method: Get all active locations for tenant
   */
  Location.getActiveLocations = async function(tenantId) {
    return await this.findAll({
      where: {
        tenantId,
        isActive: true
      },
      order: [
        [sequelize.literal(`CASE WHEN "locationType" = 'main' THEN 0 ELSE 1 END`), 'ASC'],
        ['name', 'ASC']
      ]
    });
  };

  /**
   * Static method: Get locations with stock count
   */
  Location.getLocationsWithStockCount = async function(tenantId) {
    return await this.findAll({
      where: { tenantId, isActive: true },
      attributes: [
        'id',
        'name',
        'code',
        'locationType',
        [sequelize.fn('COUNT', sequelize.col('products.id')), 'productCount'],
        [sequelize.fn('SUM', sequelize.col('products.stockQuantity')), 'totalStock']
      ],
      include: [{
        model: sequelize.models.Product,
        as: 'products',
        attributes: [],
        where: { 
          isActive: true,
          trackInventory: true
        },
        required: false
      }],
      group: ['Location.id'],
      order: [
        [sequelize.literal(`CASE WHEN "locationType" = 'main' THEN 0 ELSE 1 END`), 'ASC'],
        ['name', 'ASC']
      ]
    });
  };

  /**
   * Static method: Calculate distance between two locations (Haversine formula)
   */
  Location.calculateDistance = function(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  /**
   * Instance method: Get distance to another location
   */
  Location.prototype.distanceTo = function(otherLocation) {
    if (!this.hasGPS() || !otherLocation.hasGPS()) {
      return null;
    }

    return Location.calculateDistance(
      parseFloat(this.latitude),
      parseFloat(this.longitude),
      parseFloat(otherLocation.latitude),
      parseFloat(otherLocation.longitude)
    );
  };

  /**
   * Hook: Generate unique code if not provided
   */
  Location.beforeCreate(async (location) => {
    if (!location.code) {
      const count = await Location.count({ where: { tenantId: location.tenantId } });
      const typePrefix = location.locationType.substring(0, 3).toUpperCase();
      location.code = `${typePrefix}-${String(count + 1).padStart(3, '0')}`;
    }
  });

  return Location;
};
