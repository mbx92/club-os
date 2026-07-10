'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Expense extends Model {
    static associate(models) {
      Expense.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });
      Expense.belongsTo(models.ExpenseCategory, {
        foreignKey: 'categoryId',
        as: 'category'
      });
      Expense.belongsTo(models.Location, {
        foreignKey: 'locationId',
        as: 'location'
      });
      if (models.Supplier) {
        Expense.belongsTo(models.Supplier, {
          foreignKey: 'supplierId',
          as: 'supplier'
        });
      }
      Expense.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator'
      });
      Expense.belongsTo(models.User, {
        foreignKey: 'approvedBy',
        as: 'approver'
      });
      Expense.belongsTo(models.VaultAccount, {
        foreignKey: 'vaultAccountId',
        as: 'vaultAccount'
      });
      Expense.belongsTo(models.Account, {
        foreignKey: 'accountId',
        as: 'account'
      });
    }
  }

  Expense.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Tenants', key: 'id' }
    },
    locationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Locations', key: 'id' }
    },
    supplierId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Suppliers', key: 'id' },
      comment: 'Optional link to a supplier/vendor record'
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'ExpenseCategories', key: 'id' }
    },
    expenseNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Auto-generated expense number (e.g., EXP-2025-001234)'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    taxAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    expenseDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    paidDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fundSource: {
      type: DataTypes.STRING(30),
      allowNull: true,
      comment: 'Source of funds: cash_drawer, vault, bank, petty_cash'
    },
    vaultAccountId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Vault account used when fundSource = vault'
    },
    accountId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Linked Account — used for auto-debit when expense is paid',
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paymentNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    referenceNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    vendor: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'pending', 'approved', 'paid', 'cancelled'),
      allowNull: false,
      defaultValue: 'draft'
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    recurringFrequency: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly'),
      allowNull: true
    },
    recurringEndDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    attachments: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' }
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' }
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'Expense',
    tableName: 'Expenses',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['tenantId', 'expenseNumber'], unique: true },
      { fields: ['categoryId'] },
      { fields: ['locationId'] },
      { fields: ['status'] },
      { fields: ['expenseDate'] },
      { fields: ['createdBy'] },
      { fields: ['tenantId', 'expenseDate'] },
      { fields: ['tenantId', 'status', 'expenseDate'] },
      { fields: ['fundSource'] },
      { fields: ['vaultAccountId'] }
    ],
    hooks: {
      beforeValidate: (expense) => {
        expense.totalAmount = parseFloat(expense.amount || 0) + parseFloat(expense.taxAmount || 0);
      },
      beforeUpdate: (expense) => {
        expense.version += 1;
      }
    }
  });

  return Expense;
};
