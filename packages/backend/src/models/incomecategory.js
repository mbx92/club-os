'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class IncomeCategory extends Model {
    static associate(models) {
      // An income category belongs to a tenant
      IncomeCategory.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      // An income category has many incomes
      IncomeCategory.hasMany(models.Income, {
        foreignKey: 'categoryId',
        as: 'incomes'
      });
    }
  }

  IncomeCategory.init({
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
      comment: 'Category name (e.g., Membership Sales, Product Sales, Investment, Donation)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Category description'
    },
    type: {
      type: DataTypes.ENUM('operational', 'investment', 'donation', 'other'),
      allowNull: false,
      defaultValue: 'operational',
      comment: 'Type of income category'
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
      comment: 'Color code for UI display (e.g., #4CAF50)'
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Icon identifier for UI'
    }
  }, {
    sequelize,
    modelName: 'IncomeCategory',
    tableName: 'IncomeCategories',
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

  return IncomeCategory;
};
