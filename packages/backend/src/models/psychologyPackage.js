'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PsychologyPackage extends Model {
    static associate(models) {
      // Belongs to Tenant
      PsychologyPackage.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      // Many-to-many with TestTypes through PackageItems
      PsychologyPackage.belongsToMany(models.PsychologyTestType, {
        through: models.PsychologyPackageItem,
        foreignKey: 'packageId',
        otherKey: 'testTypeId',
        as: 'testTypes'
      });

      // Has many PackageItems (for direct access with sortOrder)
      PsychologyPackage.hasMany(models.PsychologyPackageItem, {
        foreignKey: 'packageId',
        as: 'items'
      });

      // Has many Orders
      PsychologyPackage.hasMany(models.PsychologyOrder, {
        foreignKey: 'packageId',
        as: 'orders'
      });

      // Has many PriceRules
      PsychologyPackage.hasMany(models.PsychologyPriceRule, {
        foreignKey: 'packageId',
        as: 'priceRules'
      });
    }

    /**
     * Calculate final price based on discount
     */
    calculateFinalPrice() {
      const base = parseFloat(this.basePrice) || 0;
      const discountValue = parseFloat(this.discountValue) || 0;

      if (this.discountType === 'percentage') {
        return base - (base * discountValue / 100);
      } else if (this.discountType === 'fixed') {
        return Math.max(0, base - discountValue);
      }
      return base;
    }

    /**
     * Check if package is a bundle
     */
    isBundle() {
      return this.packageType === 'bundle';
    }
  }

  PsychologyPackage.init({
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
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    packageType: {
      type: DataTypes.ENUM('single', 'bundle'),
      defaultValue: 'single'
    },
    basePrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    discountType: {
      type: DataTypes.ENUM('none', 'percentage', 'fixed'),
      defaultValue: 'none'
    },
    discountValue: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    finalPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    estimatedDuration: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total duration in minutes'
    },
    testCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    validityDays: {
      type: DataTypes.INTEGER,
      defaultValue: 7
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'PsychologyPackage',
    tableName: 'PsychologyPackages',
    hooks: {
      beforeSave: (instance) => {
        // Auto-calculate finalPrice
        instance.finalPrice = instance.calculateFinalPrice();
      }
    },
    indexes: [
      {
        unique: true,
        fields: ['tenantId', 'code'],
        name: 'psychology_packages_tenant_code_unique'
      }
    ]
  });

  return PsychologyPackage;
};
