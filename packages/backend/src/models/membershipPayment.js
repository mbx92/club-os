'use strict';
const ConcurrencyUtils = require('../utils/concurrency');

module.exports = (sequelize, DataTypes) => {
  const MembershipPayment = sequelize.define('MembershipPayment', {
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
    memberId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Members',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    membershipId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Memberships',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Payment method from tenant settings (cash, credit_card, debit_card, bank_transfer, qris, e_wallet, etc.)'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
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
      defaultValue: 0
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
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
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
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    }
  }, {
    tableName: 'MembershipPayments',
    timestamps: true,
    paranoid: true, // Enable soft deletes
    hooks: {
      beforeCreate: async (membershipPayment, options) => {
        // Generate receipt number if not provided
        if (!membershipPayment.receiptNumber) {
          const date = new Date();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          
          // Use atomic operation to generate unique sequence
          const prefix = `RCPT-${year}${month}-`;
          membershipPayment.receiptNumber = await ConcurrencyUtils.generateUniqueSequence(
            MembershipPayment,
            {
              tenantId: membershipPayment.tenantId,
              receiptNumber: {
                [sequelize.Op.like]: `${prefix}%`
              }
            },
            prefix,
            options.transaction
          );
        }
      },
      beforeUpdate: async (membershipPayment, options) => {
        // Optimistic locking: check version
        if (options.version !== undefined && membershipPayment.version !== options.version) {
          throw new Error('Optimistic locking error: MembershipPayment was modified by another transaction');
        }
        
        // Increment version
        membershipPayment.version += 1;
      }
    }
  });

  MembershipPayment.associate = function(models) {
    // Association with Tenant
    MembershipPayment.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });

    // Association with Member
    MembershipPayment.belongsTo(models.Member, {
      foreignKey: 'memberId',
      as: 'member'
    });

    // Association with Membership
    MembershipPayment.belongsTo(models.Membership, {
      foreignKey: 'membershipId',
      as: 'membership'
    });

    // Association with User (who created the payment)
    MembershipPayment.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    // Association with MembershipPaymentRefund
    MembershipPayment.hasMany(models.MembershipPaymentRefund, {
      foreignKey: 'paymentId',
      as: 'refunds'
    });

    // Association with Transaction
    MembershipPayment.belongsTo(models.Transaction, {
      foreignKey: 'transactionId',
      as: 'transaction'
    });

    // Association with Voucher
    MembershipPayment.belongsTo(models.Voucher, {
      foreignKey: 'voucherId',
      as: 'voucher'
    });
  };

  return MembershipPayment;
};