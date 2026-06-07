'use strict';
const ConcurrencyUtils = require('../utils/concurrency');

module.exports = (sequelize, DataTypes) => {
  const Voucher = sequelize.define('Voucher', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: true, // Null for superadmin global vouchers
      references: {
        model: 'Tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    scope: {
      type: DataTypes.ENUM('subscription', 'tenant'),
      allowNull: false,
      defaultValue: 'tenant'
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      allowNull: false
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    maxDiscountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    minPurchaseAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    },
    applicableTo: {
      type: DataTypes.ENUM('all', 'membership', 'product', 'specific_items', 'subscription_plan'),
      allowNull: false,
      defaultValue: 'all'
    },
    applicableItems: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    usageLimit: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    usageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    userUsageLimit: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    isCompliment: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'If true, this voucher is a compliment/free treat from the owner. Shown in Compliment Total on report, not in regular Discount.'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    }
  }, {
    tableName: 'Vouchers',
    timestamps: true,
    paranoid: true, // Enable soft deletes
    indexes: [
      // Note: Partial unique indexes are defined in migration file
      // (vouchers_tenant_code_unique and vouchers_superadmin_code_unique)
      
      // Index for code
      {
        fields: ['code']
      },
      // Index for applicableTo
      {
        fields: ['applicableTo']
      },
      // Index for isActive
      {
        fields: ['isActive']
      },
      // Index for date range
      {
        fields: ['startDate', 'endDate']
      },
      // Index for scope
      {
        fields: ['scope']
      },
      // Composite index for tenantId and scope
      {
        fields: ['tenantId', 'scope']
      }
    ],
    hooks: {
      beforeCreate: async (voucher, options) => {
        // Generate voucher code if not provided
        if (!voucher.code) {
          const date = new Date();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          
          // Use atomic operation to generate unique sequence
          const prefix = `VC${year}${month}`;
          voucher.code = await ConcurrencyUtils.generateUniqueSequence(
            Voucher,
            {
              tenantId: voucher.tenantId,
              code: {
                [sequelize.Op.like]: `${prefix}%`
              }
            },
            prefix,
            options.transaction
          );
        }
      },
      beforeValidate: (voucher) => {
        // Validate scope and tenantId relationship
        if (voucher.scope === 'subscription' && voucher.tenantId !== null) {
          throw new Error('Subscription-scoped vouchers must have null tenantId (superadmin only)');
        }
        
        if (voucher.scope === 'tenant' && !voucher.tenantId) {
          throw new Error('Tenant-scoped vouchers must have tenantId');
        }
        
        // Validate applicableTo based on scope
        if (voucher.scope === 'subscription' && voucher.applicableTo !== 'subscription_plan') {
          throw new Error('Subscription-scoped vouchers must have applicableTo = subscription_plan');
        }
        
        if (voucher.scope === 'tenant' && voucher.applicableTo === 'subscription_plan') {
          throw new Error('Tenant-scoped vouchers cannot use applicableTo = subscription_plan');
        }
        
        // Validate voucher dates
        if (voucher.startDate && voucher.endDate && voucher.startDate > voucher.endDate) {
          throw new Error('Start date must be before end date');
        }
        
        // Validate percentage voucher
        if (voucher.type === 'percentage' && (voucher.value < 0 || voucher.value > 100)) {
          throw new Error('Percentage value must be between 0 and 100');
        }
        
        // Validate fixed voucher
        if (voucher.type === 'fixed' && voucher.value < 0) {
          throw new Error('Fixed value must be greater than 0');
        }
      },
      beforeUpdate: async (voucher, options) => {
        // Optimistic locking: check version
        if (options.version !== undefined && voucher.version !== options.version) {
          throw new Error('Optimistic locking error: Voucher was modified by another transaction');
        }
        
        // Increment version
        voucher.version += 1;
      }
    }
  });

  Voucher.associate = function(models) {
    // Association with Tenant
    Voucher.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });

    // Association with User (who created the voucher)
    Voucher.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    // Association with User (who updated the voucher)
    Voucher.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });

    // Association with VoucherUsage
    Voucher.hasMany(models.VoucherUsage, {
      foreignKey: 'voucherId',
      as: 'voucherUsages'
    });
  };

  // Instance methods
  Voucher.prototype.isValid = function() {
    const now = new Date();
    return (
      this.isActive &&
      now >= this.startDate &&
      now <= this.endDate &&
      (this.usageLimit === null || this.usageCount < this.usageLimit)
    );
  };

  Voucher.prototype.isApplicableTo = function(itemType, itemId) {
    if (this.applicableTo === 'all') {
      return true;
    }
    
    if (this.applicableTo === itemType) {
      if (this.applicableItems && this.applicableItems.length > 0) {
        return this.applicableItems.includes(itemId);
      }
      return true;
    }
    
    return false;
  };

  Voucher.prototype.calculateDiscount = function(amount) {
    if (!this.isValid()) {
      return 0;
    }
    
    if (this.minPurchaseAmount && amount < this.minPurchaseAmount) {
      return 0;
    }
    
    let discount = 0;
    if (this.type === 'percentage') {
      discount = amount * (this.value / 100);
      if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
        discount = this.maxDiscountAmount;
      }
    } else if (this.type === 'fixed') {
      discount = this.value;
      if (discount > amount) {
        discount = amount;
      }
    }
    
    return discount;
  };

  Voucher.prototype.canBeUsedBy = async function(userId, models) {
    if (!this.userUsageLimit) {
      return true;
    }
    
    const usageCount = await models.VoucherUsage.count({
      where: {
        voucherId: this.id,
        userId: userId
      }
    });
    
    return usageCount < this.userUsageLimit;
  };

  return Voucher;
};