'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ExpenseCategory extends Model {
    static associate(models) {
      // An expense category belongs to a tenant
      ExpenseCategory.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      // An expense category has many expenses
      ExpenseCategory.hasMany(models.Expense, {
        foreignKey: 'categoryId',
        as: 'expenses'
      });
    }
  }

  ExpenseCategory.init({
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Category name (e.g., Salary, Utilities, Supplies, Marketing)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Category description'
    },
    type: {
      type: DataTypes.ENUM('operational', 'fixed', 'variable', 'one_time'),
      allowNull: false,
      defaultValue: 'operational',
      comment: 'Type of expense category'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Whether category is active'
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
      comment: 'Color code for UI display (e.g., #FF5733)'
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Icon identifier for UI'
    }
  }, {
    sequelize,
    modelName: 'ExpenseCategory',
    tableName: 'ExpenseCategories',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['tenantId']
      },
      {
        fields: ['tenantId', 'name'],
        unique: true
      },
      {
        fields: ['isActive']
      }
    ]
  });

  return ExpenseCategory;
};
