'use strict';
const ConcurrencyUtils = require('../utils/concurrency');

module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
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
    transactionNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    transactionDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    transactionType: {
      type: DataTypes.ENUM('pos', 'restaurant', 'gym', 'psychology'),
      allowNull: false,
      defaultValue: 'pos',
      comment: 'Type of transaction: POS sale, restaurant order, gym membership, psychology test'
    },
    orderType: {
      type: DataTypes.ENUM('dine-in', 'takeaway', 'delivery'),
      allowNull: true,
      comment: 'Restaurant order type'
    },
    tableId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'RestaurantTables',
        key: 'id'
      },
      comment: 'Restaurant table for dine-in orders'
    },
    locationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Locations',
        key: 'id'
      },
      comment: 'Location where transaction occurred'
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    customerType: {
      type: DataTypes.ENUM('member', 'non-member'),
      allowNull: false,
      defaultValue: 'non-member'
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Customer name for non-member transactions'
    },
    customerPhone: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Customer phone for delivery orders'
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Tax amount calculated from (subtotal - voucherDiscount)'
    },
    serviceCharge: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Service charge amount (for restaurant orders). Formula: totalAmount = (subtotal - voucherDiscount) + tax + serviceCharge. Both tax and service charge calculated independently from subtotalAfterDiscount.'
    },
    voucherId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Vouchers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    voucherDiscount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Discount amount from voucher. Formula: subtotal - voucherDiscount + tax = totalAmount'
    },
    roundingAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Rounding adjustment applied to totalAmount (positive = rounded up, negative = rounded down). Zero when rounding is disabled.'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    paidAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Total amount paid by customer (may be more than totalAmount for cash payments with change)'
    },
    changeAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Change returned to customer. Important for cash reconciliation and audit trail.'
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled', 'refunded', 'partially_refunded', 'split', 'merged', 'paid'),
      allowNull: false,
      defaultValue: 'pending'
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the transaction/order was completed'
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the transaction/order was cancelled'
    },
    cancelledBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'User who cancelled the transaction'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    queueNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Queue number for prepaid orders (e.g., A-001, B-015)'
    },
    paymentTiming: {
      type: DataTypes.ENUM('prepaid', 'postpaid'),
      allowNull: true,
      comment: 'When payment is made: prepaid (pay first) or postpaid (pay after)'
    },
    queueCalledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the queue number was called for pickup'
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
    splitFromId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Transactions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'References the original order this was split from (null = not a split)'
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
    tableName: 'Transactions',
    timestamps: true,
    paranoid: true, // Enable soft deletes
    hooks: {
      beforeCreate: async (transaction, options) => {
        // Generate transaction number if not provided
        if (!transaction.transactionNumber) {
          const date = new Date();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          
          // Use prefix based on transaction type
          const prefixMap = {
            pos: 'POS',
            restaurant: 'RST',
            gym: 'GYM',
            psychology: 'PSY'
          };
          const typePrefix = prefixMap[transaction.transactionType] || 'TRX';
          const prefix = `${typePrefix}-${year}${month}${day}-`;
          
          // Use atomic operation to generate unique sequence
          // Args: Model, where, prefix, fieldName, transaction
          transaction.transactionNumber = await ConcurrencyUtils.generateUniqueSequence(
            Transaction,
            {
              tenantId: transaction.tenantId,
              transactionNumber: {
                [sequelize.Op.like]: `${prefix}%`
              }
            },
            prefix,
            'transactionNumber',
            options.transaction
          );
        }
      },
      beforeUpdate: async (transaction, options) => {
        // Optimistic locking: check version
        if (options.version !== undefined && transaction.version !== options.version) {
          throw new Error('Optimistic locking error: Transaction was modified by another transaction');
        }
        
        // Increment version
        transaction.version += 1;
      }
    }
  });

  Transaction.associate = function(models) {
    // Association with Tenant
    Transaction.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });

    // Association with Member (if customer is a member)
    Transaction.belongsTo(models.Member, {
      foreignKey: 'customerId',
      as: 'member',
      constraints: false
    });

    // Association with User (who created the transaction)
    Transaction.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    // Association with User (who created the transaction) - alias for orderController
    Transaction.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'createdByUser'
    });

    // Association with User (who cancelled)
    Transaction.belongsTo(models.User, {
      foreignKey: 'cancelledBy',
      as: 'cancelledByUser'
    });

    // Association with TransactionItems
    Transaction.hasMany(models.TransactionItem, {
      foreignKey: 'transactionId',
      as: 'transactionItems'
    });

    // Alias for restaurant module
    Transaction.hasMany(models.TransactionItem, {
      foreignKey: 'transactionId',
      as: 'items'
    });

    // Association with TransactionPayments
    Transaction.hasMany(models.TransactionPayment, {
      foreignKey: 'transactionId',
      as: 'payments'
    });

    // Association with Voucher
    Transaction.belongsTo(models.Voucher, {
      foreignKey: 'voucherId',
      as: 'voucher'
    });

    // Association with RestaurantTable
    Transaction.belongsTo(models.RestaurantTable, {
      foreignKey: 'tableId',
      as: 'table'
    });

    // Association with Location
    Transaction.belongsTo(models.Location, {
      foreignKey: 'locationId',
      as: 'location'
    });

    // Self-referencing: split bill tracking
    Transaction.belongsTo(models.Transaction, {
      foreignKey: 'splitFromId',
      as: 'splitFrom'
    });
    Transaction.hasMany(models.Transaction, {
      foreignKey: 'splitFromId',
      as: 'splitOrders'
    });
  };

  return Transaction;
};