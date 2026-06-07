'use strict';

/**
 * Product Model - Restaurant Module
 * 
 * Extended product model with JSONB support for flexible product data.
 * Used for POS items, restaurant menu items, and retail products.
 * 
 * @module modules/restaurant/models/product
 */

const { Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
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
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Legacy category field, use categoryId for new records'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Tax rate in percentage (e.g., 11 for 11%)'
    },
    stockQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'stockQuantity' // Maps to renamed column
    },
    minStockLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'minStockLevel' // Maps to renamed column
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pcs'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    trackInventory: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'trackInventory' // Maps to renamed column
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    imageUrl: {
      type: DataTypes.VIRTUAL,
      get() {
        const image = this.getDataValue('image');
        if (!image) return null;
        // Return full URL if it's already a URL (legacy), otherwise prepend base URL
        if (image.startsWith('http')) return image;

        // Use process.env.BASE_URL if available, otherwise construct from request headers if possible
        // Since we don't have request context here, we'll rely on a default or env var
        const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        // Ensure image has leading slash if missing
        const path = image.startsWith('/') ? image : `/${image}`;
        return `${baseUrl}${path}`;
      }
    },

    // ===== NEW FIELDS (PHASE-2) =====

    productDetails: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Flexible JSONB field for product variants, custom options, ingredients, etc.'
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'ProductCategories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    locationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Locations',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    taxable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this product is subject to tax'
    },
    isCustomized: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this product allows custom extras/additions'
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Optimistic locking version field'
    },

    // Product type for kitchen/bar routing
    productType: {
      type: DataTypes.ENUM('food', 'beverage', 'other'),
      allowNull: false,
      defaultValue: 'food',
      comment: 'Product type for kitchen/bar routing: food → kitchen printer, beverage → bar printer'
    },

    // Audit fields
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    tableName: 'Products',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['tenantId']
      },
      {
        fields: ['tenantId', 'sku'],
        unique: true,
        name: 'products_tenant_sku_unique'
      },
      {
        fields: ['categoryId']
      },
      {
        fields: ['locationId']
      },
      {
        fields: ['tenantId', 'categoryId', 'isActive']
      },
      {
        fields: ['tenantId', 'locationId', 'trackInventory']
      },
      {
        fields: ['id', 'version']
      }
    ]
  });

  Product.associate = function (models) {
    // Tenant association
    Product.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });

    // Category association
    Product.belongsTo(models.ProductCategory, {
      foreignKey: 'categoryId',
      as: 'productCategory'
    });

    // Location association
    Product.belongsTo(models.Location, {
      foreignKey: 'locationId',
      as: 'location'
    });

    // Stock movements
    Product.hasMany(models.StockMovement, {
      foreignKey: 'productId',
      as: 'stockMovements'
    });

    // Product extras
    Product.hasMany(models.ProductExtra, {
      foreignKey: 'productId',
      as: 'extras'
    });

    // Transaction items (polymorphic)
    Product.hasMany(models.TransactionItem, {
      foreignKey: 'itemId',
      constraints: false,
      scope: {
        itemType: 'product'
      },
      as: 'transactionItems'
    });

    // Audit trail
    Product.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    Product.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });
  };

  /**
   * Instance method: Check if stock is low
   */
  Product.prototype.isLowStock = function () {
    return this.trackInventory && this.stockQuantity <= this.minStockLevel;
  };

  /**
   * Instance method: Get product type from JSONB
   */
  Product.prototype.getProductType = function () {
    return this.productDetails?.productType || 'simple';
  };

  /**
   * Instance method: Check if product has variants
   */
  Product.prototype.hasVariants = function () {
    return this.getProductType() === 'variant' &&
      Array.isArray(this.productDetails?.variants) &&
      this.productDetails.variants.length > 0;
  };

  /**
   * Instance method: Get available variants
   */
  Product.prototype.getAvailableVariants = function () {
    if (!this.hasVariants()) return [];
    return this.productDetails.variants.filter(v => v.isAvailable !== false);
  };

  /**
   * Static method: Find products with low stock
   */
  Product.findLowStock = async function (tenantId, locationId = null) {
    const where = {
      tenantId,
      trackInventory: true,
      isActive: true
    };

    if (locationId) {
      where.locationId = locationId;
    }

    return await this.findAll({
      where,
      attributes: {
        include: [
          [sequelize.literal('("stockQuantity" <= "minStockLevel")'), 'isLowStock']
        ]
      },
      having: sequelize.literal('"stockQuantity" <= "minStockLevel"'),
      include: [
        { model: sequelize.models.ProductCategory, as: 'productCategory' },
        { model: sequelize.models.Location, as: 'location' }
      ]
    });
  };

  /**
   * Static method: Search products with JSONB queries
   */
  Product.searchByDetails = async function (tenantId, filters = {}) {
    const where = { tenantId, isActive: true };
    const jsonbConditions = [];

    // Filter by product type
    if (filters.productType) {
      jsonbConditions.push(
        sequelize.where(
          sequelize.cast(sequelize.json('productDetails.productType'), 'text'),
          '=',
          filters.productType
        )
      );
    }

    // Filter by availability
    if (typeof filters.isAvailable === 'boolean') {
      jsonbConditions.push(
        sequelize.where(
          sequelize.cast(sequelize.json('productDetails.isAvailable'), 'boolean'),
          '=',
          filters.isAvailable
        )
      );
    }

    // Combine conditions
    if (jsonbConditions.length > 0) {
      where[Op.and] = jsonbConditions;
    }

    return await this.findAll({ where });
  };

  /**
   * Hook: Increment version on update (optimistic locking)
   */
  Product.beforeUpdate((product) => {
    product.version += 1;
  });

  return Product;
};
