'use strict';
const ConcurrencyUtils = require('../utils/concurrency');

module.exports = (sequelize, DataTypes) => {
  const VoucherUsage = sequelize.define('VoucherUsage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    voucherId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Vouchers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    memberId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Members',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    transactionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Transactions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    membershipPaymentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'MembershipPayments',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    originalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    finalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    usageDetails: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'VoucherUsages',
    timestamps: true,
    paranoid: true, // Enable soft deletes
    indexes: [
      // Index for voucherId
      {
        fields: ['voucherId']
      },
      // Index for userId
      {
        fields: ['userId']
      },
      // Index for memberId
      {
        fields: ['memberId']
      },
      // Index for transactionId
      {
        fields: ['transactionId']
      },
      // Index for membershipPaymentId
      {
        fields: ['membershipPaymentId']
      },
      // Composite index for voucherId and userId
      {
        fields: ['voucherId', 'userId']
      }
    ],
    hooks: {
      afterCreate: async (voucherUsage, options) => {
        // Increment voucher usage count with atomic operation
        const { Voucher } = sequelize.models;
        const voucher = await Voucher.findByPk(voucherUsage.voucherId, {
          transaction: options.transaction,
          lock: options.transaction.LOCK.UPDATE
        });
        
        if (voucher) {
          // Use atomic increment to prevent race conditions
          await ConcurrencyUtils.atomicIncrement(
            voucher,
            'usageCount',
            1,
            { transaction: options.transaction }
          );
        }
      }
    }
  });

  VoucherUsage.associate = function(models) {
    // Association with Voucher
    VoucherUsage.belongsTo(models.Voucher, {
      foreignKey: 'voucherId',
      as: 'voucher'
    });

    // Association with User (who used the voucher)
    VoucherUsage.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // Association with Member (if used by a member)
    VoucherUsage.belongsTo(models.Member, {
      foreignKey: 'memberId',
      as: 'member'
    });

    // Association with Transaction (if used in a transaction)
    VoucherUsage.belongsTo(models.Transaction, {
      foreignKey: 'transactionId',
      as: 'transaction'
    });

    // Association with MembershipPayment (if used in a membership payment)
    VoucherUsage.belongsTo(models.MembershipPayment, {
      foreignKey: 'membershipPaymentId',
      as: 'membershipPayment'
    });
  };

  return VoucherUsage;
};