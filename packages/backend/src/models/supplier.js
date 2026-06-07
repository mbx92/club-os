'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Supplier extends Model {
    static associate(models) {
      Supplier.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      // A supplier can be linked to many expenses
      if (models.Expense) {
        Supplier.hasMany(models.Expense, {
          foreignKey: 'supplierId',
          as: 'expenses'
        });
      }
    }
  }

  Supplier.init({
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
    code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Unique supplier code per tenant (e.g. SUP-001)'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Supplier/vendor company or person name'
    },
    contactPerson: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Primary contact person name'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true
    },
    province: {
      type: DataTypes.STRING,
      allowNull: true
    },
    postalCode: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    taxId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'NPWP or tax identification number'
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bankAccountNumber: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    bankAccountHolder: {
      type: DataTypes.STRING,
      allowNull: true
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Supplier category (e.g. food, equipment, cleaning, supplement)'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Supplier',
    tableName: 'Suppliers',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['tenantId', 'name'] },
      {
        fields: ['tenantId', 'code'],
        unique: true,
        name: 'suppliers_tenant_code_unique',
        where: { code: { [require('sequelize').Op.ne]: null } }
      },
      { fields: ['isActive'] },
      { fields: ['category'] }
    ]
  });

  return Supplier;
};
