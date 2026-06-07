'use strict';
const ConcurrencyUtils = require('../utils/concurrency');

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
      allowNull: false,
      unique: true // Will be handled with a composite unique index with tenantId
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true
    },
    productType: {
      type: DataTypes.ENUM('food', 'beverage', 'other'),
      allowNull: false,
      defaultValue: 'food',
      comment: 'Product type for kitchen/bar routing: food → kitchen, beverage → bar'
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
      defaultValue: 0
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    minStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
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
    isTrackStock: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    productDetails: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    }
  }, {
    tableName: 'Products',
    timestamps: true,
    paranoid: true, // Enable soft deletes
    indexes: [
      // Composite unique index for tenantId and sku
      {
        unique: true,
        fields: ['tenantId', 'sku']
      },
      // Index for barcode
      {
        fields: ['barcode']
      },
      // Index for category
      {
        fields: ['category']
      },
      // Index for isActive
      {
        fields: ['isActive']
      }
    ],
    hooks: {
      beforeCreate: async (product, options) => {
        // Generate SKU if not provided
        if (!product.sku) {
          const categoryPrefix = product.category ? product.category.substring(0, 3).toUpperCase() : 'GEN';
          const date = new Date();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          
          // Use atomic operation to generate unique sequence
          const prefix = `${categoryPrefix}${year}${month}`;
          product.sku = await ConcurrencyUtils.generateUniqueSequence(
            Product,
            {
              tenantId: product.tenantId,
              sku: {
                [sequelize.Op.like]: `${prefix}%`
              }
            },
            prefix,
            options.transaction
          );
        }
      },
      beforeUpdate: async (product, options) => {
        // Optimistic locking: check version
        if (options.version !== undefined && product.version !== options.version) {
          throw new Error('Optimistic locking error: Product was modified by another transaction');
        }
        
        // Increment version
        product.version += 1;
        
        // Check if stock is below minimum
        if (product.stock <= product.minStock && product.isTrackStock) {
          // Here you could implement a notification system
          console.log(`Product ${product.name} is low in stock (${product.stock} left, minimum: ${product.minStock})`);
        }
      }
    }
  });

  Product.associate = function(models) {
    // Association with Tenant
    Product.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });

    // Association with User (who created the product)
    Product.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    // Association with User (who updated the product)
    Product.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });

    // Association with TransactionItems
    Product.hasMany(models.TransactionItem, {
      foreignKey: 'itemId',
      as: 'transactionItems',
      scope: {
        itemType: 'product'
      },
      constraints: false
    });
  };

  return Product;
};