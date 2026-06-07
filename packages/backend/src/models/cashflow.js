'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CashFlow extends Model {
    static associate(models) {
      // A cash flow entry belongs to a tenant
      CashFlow.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      // A cash flow entry may belong to a location
      CashFlow.belongsTo(models.Location, {
        foreignKey: 'locationId',
        as: 'location'
      });

      // A cash flow entry may reference income
      CashFlow.belongsTo(models.Income, {
        foreignKey: 'incomeId',
        as: 'income'
      });

      // A cash flow entry may reference expense
      CashFlow.belongsTo(models.Expense, {
        foreignKey: 'expenseId',
        as: 'expense'
      });

      // A cash flow entry may reference transaction
      CashFlow.belongsTo(models.Transaction, {
        foreignKey: 'transactionId',
        as: 'transaction'
      });
    }
  }

  CashFlow.init({
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
    locationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Locations',
        key: 'id'
      }
    },
    incomeId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Incomes',
        key: 'id'
      }
    },
    expenseId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Expenses',
        key: 'id'
      }
    },
    transactionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Transactions',
        key: 'id'
      }
    },
    flowDate: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Date of cash flow'
    },
    type: {
      type: DataTypes.ENUM('inflow', 'outflow'),
      allowNull: false,
      comment: 'Cash flow direction'
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Cash flow category (operating, investing, financing)'
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Cash flow amount'
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'transfer', 'credit_card', 'debit_card', 'check', 'other'),
      allowNull: false,
      comment: 'Payment method'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Cash flow description'
    },
    referenceNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Reference number'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes'
    },
    isProjected: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether this is a projected/forecasted entry'
    }
  }, {
    sequelize,
    modelName: 'CashFlow',
    tableName: 'CashFlows',
    timestamps: true,
    paranoid: false,
    indexes: [
      {
        fields: ['tenantId']
      },
      {
        fields: ['tenantId', 'flowDate']
      },
      {
        fields: ['type']
      },
      {
        fields: ['category']
      },
      {
        fields: ['incomeId']
      },
      {
        fields: ['expenseId']
      },
      {
        fields: ['transactionId']
      },
      {
        fields: ['isProjected']
      }
    ]
  });

  return CashFlow;
};
