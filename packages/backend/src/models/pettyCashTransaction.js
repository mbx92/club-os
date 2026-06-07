'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PettyCashTransaction extends Model {
    static associate(models) {
      // A petty cash transaction belongs to a tenant
      PettyCashTransaction.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      // A petty cash transaction belongs to a petty cash fund
      PettyCashTransaction.belongsTo(models.PettyCash, {
        foreignKey: 'pettyCashId',
        as: 'pettyCash'
      });

      // A petty cash transaction is performed by a user
      PettyCashTransaction.belongsTo(models.User, {
        foreignKey: 'performedBy',
        as: 'performer'
      });
    }
  }

  PettyCashTransaction.init({
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
      }
    },
    pettyCashId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'PettyCashes',
        key: 'id'
      }
    },
    transactionNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Auto-generated transaction number (e.g. PCT-2026-000001)'
    },
    type: {
      type: DataTypes.ENUM('initial', 'top_up', 'expense', 'sales_return', 'adjustment', 'withdrawal'),
      // sales_return = pengembalian modal petty cash dari hasil penjualan shift itu
      allowNull: false,
      comment: 'Transaction type'
    },
    fundSource: {
      type: DataTypes.ENUM('owner_cash', 'bank_transfer', 'revenue', 'other'),
      allowNull: true,
      defaultValue: null,
      comment: 'Asal dana (hanya untuk inflow): owner_cash=modal tunai owner, bank_transfer=transfer bank, revenue=dari hasil penjualan, other=lainnya. Null untuk outflow (expense, withdrawal).'
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Transaction amount (positive for inflow, negative for outflow)'
    },
    balanceBefore: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Balance before this transaction'
    },
    balanceAfter: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Balance after this transaction'
    },
    referenceType: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Polymorphic reference type (e.g. Expense, Transaction)'
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Polymorphic reference ID'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description/notes for this transaction'
    },
    transactionDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date of the transaction'
    },
    performedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'PettyCashTransaction',
    tableName: 'PettyCashTransactions',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['tenantId']
      },
      {
        fields: ['pettyCashId']
      },
      {
        fields: ['tenantId', 'pettyCashId']
      },
      {
        fields: ['type']
      },
      {
        fields: ['transactionDate']
      },
      {
        fields: ['referenceType', 'referenceId']
      },
      {
        fields: ['tenantId', 'transactionNumber'],
        unique: true
      },
      {
        fields: ['tenantId', 'pettyCashId', 'transactionDate']
      }
    ]
  });

  return PettyCashTransaction;
};
