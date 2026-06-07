'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Income extends Model {
    static associate(models) {
      // An income belongs to a tenant
      Income.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      // An income belongs to a category
      Income.belongsTo(models.IncomeCategory, {
        foreignKey: 'categoryId',
        as: 'category'
      });

      // An income may belong to a location
      Income.belongsTo(models.Location, {
        foreignKey: 'locationId',
        as: 'location'
      });

      // An income may reference a transaction (for transactional income)
      Income.belongsTo(models.Transaction, {
        foreignKey: 'transactionId',
        as: 'transaction'
      });

      // An income is created by a user
      Income.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator'
      });
    }
  }

  Income.init({
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
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'IncomeCategories',
        key: 'id'
      }
    },
    transactionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Transactions',
        key: 'id'
      },
      comment: 'Reference to transaction if this is transactional income'
    },
    incomeNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Auto-generated income number (e.g., INC-2025-001234)'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Income title/description'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Detailed description of income'
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Income amount'
    },
    taxAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Tax amount if applicable'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total amount (amount + tax)'
    },
    incomeDate: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Date of income occurrence'
    },
    receivedDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Actual receipt date'
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'transfer', 'credit_card', 'debit_card', 'check', 'other'),
      allowNull: true,
      comment: 'Payment method received'
    },
    referenceNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Reference/invoice number'
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Income source/payer'
    },
    type: {
      type: DataTypes.ENUM('transactional', 'manual'),
      allowNull: false,
      defaultValue: 'manual',
      comment: 'Income type: transactional (auto from Transaction) or manual entry'
    },
    status: {
      type: DataTypes.ENUM('pending', 'received', 'cancelled'),
      allowNull: false,
      defaultValue: 'received',
      comment: 'Income status'
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether this is a recurring income'
    },
    recurringFrequency: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly'),
      allowNull: true,
      comment: 'Frequency if recurring'
    },
    recurringEndDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'End date for recurring income'
    },
    attachments: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of attachment file paths'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes'
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
      comment: 'Tags for categorization'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Version number for optimistic locking'
    }
  }, {
    sequelize,
    modelName: 'Income',
    tableName: 'Incomes',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['tenantId']
      },
      {
        fields: ['tenantId', 'incomeNumber'],
        unique: true
      },
      {
        fields: ['categoryId']
      },
      {
        fields: ['locationId']
      },
      {
        fields: ['transactionId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['type']
      },
      {
        fields: ['incomeDate']
      },
      {
        fields: ['tenantId', 'incomeDate']
      },
      {
        fields: ['tenantId', 'status', 'incomeDate']
      }
    ],
    hooks: {
      beforeValidate: (income) => {
        // Calculate total amount
        income.totalAmount = parseFloat(income.amount || 0) + parseFloat(income.taxAmount || 0);
      },
      beforeUpdate: (income) => {
        // Increment version for optimistic locking
        income.version += 1;
      }
    }
  });

  return Income;
};
