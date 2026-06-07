'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Expense extends Model {
    static associate(models) {
      // An expense belongs to a tenant
      Expense.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      // An expense belongs to a category
      Expense.belongsTo(models.ExpenseCategory, {
        foreignKey: 'categoryId',
        as: 'category'
      });

      // An expense may belong to a location
      Expense.belongsTo(models.Location, {
        foreignKey: 'locationId',
        as: 'location'
      });

      // An expense may belong to a supplier
      if (models.Supplier) {
        Expense.belongsTo(models.Supplier, {
          foreignKey: 'supplierId',
          as: 'supplier'
        });
      }

      // An expense is created by a user
      Expense.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator'
      });

      // An expense may be approved by a user
      Expense.belongsTo(models.User, {
        foreignKey: 'approvedBy',
        as: 'approver'
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
    supplierId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Suppliers',
        key: 'id'
      },
      comment: 'Optional link to a supplier/vendor record'
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'ExpenseCategories',
        key: 'id'
      }
    },
    expenseNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Auto-generated expense number (e.g., EXP-2025-001234)'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Expense title/description'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Detailed description of expense'
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Expense amount'
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
    expenseDate: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Date of expense occurrence'
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Payment due date (for payables)'
    },
    paidDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Actual payment date'
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Payment method used (cash, bank_transfer, transfer, credit_card, debit_card, check, other)'
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Bank name for bank_transfer payment (e.g. BCA, Mandiri, BRI, BNI)'
    },
    paymentNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Payment-specific notes (e.g. card holder, last 4 digits, bank branch)'
    },
    referenceNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Reference/invoice number from vendor'
    },
    vendor: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Vendor/supplier name'
    },
    status: {
      type: DataTypes.ENUM('draft', 'pending', 'approved', 'paid', 'cancelled'),
      allowNull: false,
      defaultValue: 'draft',
      comment: 'Expense status'
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether this is a recurring expense'
    },
    recurringFrequency: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly'),
      allowNull: true,
      comment: 'Frequency if recurring'
    },
    recurringEndDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'End date for recurring expense'
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
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Version number for optimistic locking'
    }
  }, {
    sequelize,
    modelName: 'Expense',
    tableName: 'Expenses',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['tenantId']
      },
      {
        fields: ['tenantId', 'expenseNumber'],
        unique: true
      },
      {
        fields: ['categoryId']
      },
      {
        fields: ['locationId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['expenseDate']
      },
      {
        fields: ['createdBy']
      },
      {
        fields: ['tenantId', 'expenseDate']
      },
      {
        fields: ['tenantId', 'status', 'expenseDate']
      }
    ],
    hooks: {
      beforeValidate: (expense) => {
        // Calculate total amount
        expense.totalAmount = parseFloat(expense.amount || 0) + parseFloat(expense.taxAmount || 0);
      },
      beforeUpdate: (expense) => {
        // Increment version for optimistic locking
        expense.version += 1;
      }
    }
  });

  return Expense;
};
