'use strict';

module.exports = (sequelize, DataTypes) => {
  const TransactionItem = sequelize.define('TransactionItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    transactionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Transactions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    itemType: {
      type: DataTypes.ENUM('membership', 'product', 'service_plan'),
      allowNull: false
    },
    itemId: {
      type: DataTypes.UUID,
      allowNull: false // No longer nullable - all items must have itemId
    },
    itemName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    itemDetails: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    status: {
      type: DataTypes.ENUM('pending', 'preparing', 'ready', 'served', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Status of individual item (for kitchen tracking)'
    },
    isRefunded: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this item has been refunded (partial refund support)'
    },
    refundedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when this item was refunded'
    },
    refundTransactionId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Reference to the refund transaction created for this item'
    }
  }, {
    tableName: 'TransactionItems',
    timestamps: true,
    paranoid: true // Enable soft deletes
  });

  TransactionItem.associate = function(models) {
    // Association with Transaction
    TransactionItem.belongsTo(models.Transaction, {
      foreignKey: 'transactionId',
      as: 'transaction'
    });

    // Polymorphic association with Membership (if itemType is 'membership')
    TransactionItem.belongsTo(models.Membership, {
      foreignKey: 'itemId',
      as: 'membership',
      constraints: false
    });

    // Polymorphic association with Product (if itemType is 'product')
    TransactionItem.belongsTo(models.Product, {
      foreignKey: 'itemId',
      as: 'product',
      constraints: false
    });
  };

  return TransactionItem;
};