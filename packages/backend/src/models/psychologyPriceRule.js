'use strict';
const { Model, Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PsychologyPriceRule extends Model {
    static associate(models) {
      // Belongs to Tenant
      PsychologyPriceRule.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      // Belongs to Package (optional)
      PsychologyPriceRule.belongsTo(models.PsychologyPackage, {
        foreignKey: 'packageId',
        as: 'package'
      });

      // Has many Orders (that used this rule)
      PsychologyPriceRule.hasMany(models.PsychologyOrder, {
        foreignKey: 'priceRuleId',
        as: 'orders'
      });
    }

    /**
     * Check if rule is currently valid (time-based)
     */
    isCurrentlyValid() {
      if (!this.isActive) return false;
      
      const now = new Date();
      
      if (this.validFrom && now < new Date(this.validFrom)) {
        return false;
      }
      
      if (this.validUntil && now > new Date(this.validUntil)) {
        return false;
      }
      
      return true;
    }

    /**
     * Check if rule has remaining usage
     */
    hasRemainingUsage() {
      if (this.maxUsage === null) return true;
      return this.usageCount < this.maxUsage;
    }

    /**
     * Calculate discount for a given amount
     */
    calculateDiscount(amount) {
      const value = parseFloat(this.discountValue) || 0;
      
      if (this.discountType === 'percentage') {
        return amount * value / 100;
      } else if (this.discountType === 'fixed') {
        return Math.min(value, amount);
      }
      
      return 0;
    }

    /**
     * Increment usage count
     */
    async incrementUsage() {
      this.usageCount = (this.usageCount || 0) + 1;
      await this.save();
    }
  }

  PsychologyPriceRule.init({
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
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Promo code'
    },
    ruleType: {
      type: DataTypes.ENUM('package_discount', 'bulk_discount', 'time_based', 'member_discount', 'promo_code'),
      allowNull: false
    },
    packageId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'PsychologyPackages',
        key: 'id'
      }
    },
    discountType: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      allowNull: false
    },
    discountValue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    minQuantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    maxUsage: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'null = unlimited'
    },
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    validFrom: {
      type: DataTypes.DATE,
      allowNull: true
    },
    validUntil: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'PsychologyPriceRule',
    tableName: 'PsychologyPriceRules',
    indexes: [
      {
        fields: ['tenantId', 'isActive'],
        name: 'psychology_price_rules_tenant_active'
      },
      {
        fields: ['tenantId', 'priority'],
        name: 'psychology_price_rules_priority'
      }
    ]
  });

  return PsychologyPriceRule;
};
