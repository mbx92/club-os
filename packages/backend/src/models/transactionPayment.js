'use strict';

module.exports = (sequelize, DataTypes) => {
  const TransactionPayment = sequelize.define('TransactionPayment', {
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
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Payment method from tenant settings (cash, credit_card, debit_card, bank_transfer, qris, e_wallet, compliment, etc.). compliment = transaksi gratis dari owner, tidak masuk kas.'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'IDR'
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      allowNull: false,
      defaultValue: 'pending'
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    receiptNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    paymentDetails: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    accountId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Linked Account for non-cash payments (auto-matched or manually set)',
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
    }
  }, {
    tableName: 'TransactionPayments',
    timestamps: true,
    paranoid: true, // Enable soft deletes
    hooks: {
      beforeCreate: async (transactionPayment, options) => {
        // Generate receipt number if not provided
        if (!transactionPayment.receiptNumber) {
          const date = new Date();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          
          // Find the last receipt number for this month (include soft-deleted rows
          // to avoid collisions with the unique constraint)
          const { Op } = require('sequelize');
          const lastPayment = await TransactionPayment.findOne({
            where: {
              receiptNumber: {
                [Op.like]: `RCP-${year}${month}%`
              }
            },
            order: [['receiptNumber', 'DESC']],
            paranoid: false,
            transaction: options.transaction
          });
          
          let sequence = '0001';
          if (lastPayment && lastPayment.receiptNumber) {
            const lastSequence = parseInt(lastPayment.receiptNumber.split('-')[2]);
            sequence = String(lastSequence + 1).padStart(4, '0');
          }
          
          transactionPayment.receiptNumber = `RCP-${year}${month}-${sequence}`;
        }
      }
    }
  });

  TransactionPayment.associate = function(models) {
    TransactionPayment.belongsTo(models.Transaction, {
      foreignKey: 'transactionId',
      as: 'transaction'
    });
    TransactionPayment.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    TransactionPayment.belongsTo(models.Account, {
      foreignKey: 'accountId',
      as: 'account'
    });
  };

  return TransactionPayment;
};