'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ActiveService extends Model {
    static associate(models) {
      ActiveService.belongsTo(models.Tenant, { foreignKey: 'tenantId', as: 'tenant' });
      ActiveService.belongsTo(models.Member, { foreignKey: 'memberId', as: 'member' });
      ActiveService.belongsTo(models.ServicePlan, { foreignKey: 'servicePlanId', as: 'servicePlan' });
      ActiveService.belongsTo(models.Transaction, { foreignKey: 'purchaseTransactionId', as: 'purchaseTransaction' });
      ActiveService.belongsTo(models.Trainer, { foreignKey: 'assignedTrainerId', as: 'assignedTrainer' });
      
      // Relations for usage tracking
      ActiveService.hasMany(models.CheckIn, { 
        foreignKey: 'activeServiceId',
        as: 'checkIns'
      });
    }

    /**
     * Check if service is currently valid (active and not expired)
     */
    isValid() {
      if (this.status !== 'active') return false;
      
      const now = new Date();
      if (this.endDate && now > new Date(this.endDate)) return false;
      
      // For session-based, check if sessions remaining
      if (this.serviceType === 'session_based' && this.remainingSessions <= 0) {
        return false;
      }
      
      return true;
    }

    /**
     * Check if service has expired
     * Uses date-only comparison to avoid timezone issues with DATEONLY fields.
     * A service with endDate = '2026-03-04' is valid ON that date and only
     * expires when today's local date is AFTER '2026-03-04'.
     */
    hasExpired() {
      if (!this.endDate) return false;
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      return String(this.endDate) < todayStr; // expired only if endDate is strictly before today
    }

    /**
     * Check if sessions are depleted (for session-based services)
     */
    isSessionsDepleted() {
      return this.totalSessions && this.remainingSessions <= 0;
    }

    /**
     * Use one session (for session-based services)
     */
    async useSession(transaction = null) {
      if (this.remainingSessions <= 0) {
        throw new Error('No sessions remaining');
      }
      
      this.remainingSessions -= 1;
      
      // Update status if depleted
      if (this.remainingSessions === 0) {
        this.status = 'depleted';
      }
      
      await this.save({ transaction });
      return this.remainingSessions;
    }

    /**
     * Refund a session (for cancellations)
     */
    async refundSession(transaction = null) {
      if (this.remainingSessions >= this.totalSessions) {
        throw new Error('Cannot refund more sessions than total');
      }
      
      this.remainingSessions += 1;
      
      // Reactivate if was depleted
      if (this.status === 'depleted' && !this.hasExpired()) {
        this.status = 'active';
      }
      
      await this.save({ transaction });
      return this.remainingSessions;
    }

    /**
     * Get usage percentage
     */
    getUsagePercentage() {
      if (!this.totalSessions) return 0;
      const used = this.totalSessions - this.remainingSessions;
      return ((used / this.totalSessions) * 100).toFixed(2);
    }

    /**
     * Auto-update status based on expiry and sessions
     */
    async updateStatus(transaction = null) {
      let newStatus = this.status;
      
      if (this.hasExpired()) {
        newStatus = 'expired';
      } else if (this.isSessionsDepleted()) {
        newStatus = 'depleted';
      } else if (this.status === 'cancelled' || this.status === 'suspended') {
        // Keep cancelled/suspended status
        return;
      } else {
        newStatus = 'active';
      }
      
      if (this.status !== newStatus) {
        this.status = newStatus;
        await this.save({ transaction });
      }
    }
  }
  
  ActiveService.init({
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
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    memberId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Members',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    customerName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Customer name for walk-in purchases (when memberId is null)'
    },
    servicePlanId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'ServicePlans',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
      comment: 'Reference to the service plan this active service is based on'
    },
    // Service Type (denormalized for fast queries)
    serviceType: {
      type: DataTypes.ENUM('membership', 'class_package', 'pt_package', 'spa_package', 'custom'),
      allowNull: false,
      comment: 'Denormalized from ServicePlan for fast filtering'
    },
    // Validity Period
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Expiry date for the service'
    },
    // Session Tracking (for session-based services)
    totalSessions: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Total sessions available (for session-based services)'
    },
    remainingSessions: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Remaining sessions (decremented on usage)'
    },
    // Status
    status: {
      type: DataTypes.ENUM('active', 'expired', 'depleted', 'cancelled', 'suspended'),
      allowNull: false,
      defaultValue: 'active',
      comment: 'active: usable, expired: past endDate, depleted: no sessions left, cancelled: user cancelled, suspended: admin suspended'
    },
    // Auto-renewal
    autoRenew: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether service should auto-renew on expiry'
    },
    // Purchase Information
    purchaseTransactionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Transactions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Link to the transaction where this service was purchased'
    },
    purchaseDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    // Trainer Assignment (for PT and some class packages)
    assignedTrainerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Trainers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Assigned trainer for PT packages or dedicated class instructors'
    },
    // Pricing snapshot (at time of purchase)
    pricePaid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Price paid at time of purchase (snapshot)'
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'IDR'
    },
    // Discount/Voucher applied
    voucherId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Vouchers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    voucherDiscount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    // Flexible metadata for service-specific data
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Flexible storage for type-specific data (e.g., special notes, restrictions, custom fields)'
    },
    // Notes
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Optimistic Locking
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    }
  }, {
    sequelize,
    modelName: 'ActiveService',
    tableName: 'ActiveServices',
    timestamps: true,
    paranoid: true, // Soft deletes
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['memberId'] },
      { fields: ['servicePlanId'] },
      { fields: ['serviceType'] },
      { fields: ['status'] },
      { fields: ['endDate'] },
      { fields: ['tenantId', 'memberId', 'status'] },
      { fields: ['tenantId', 'serviceType', 'status'] },
      { fields: ['assignedTrainerId'] }
    ],
    hooks: {
      beforeCreate: (activeService, options) => {
        // Ensure sessions are set for session-based services
        if (activeService.totalSessions && !activeService.remainingSessions) {
          activeService.remainingSessions = activeService.totalSessions;
        }
      },
      beforeUpdate: async (activeService, options) => {
        // Optimistic locking: check version
        if (options.version !== undefined && activeService.version !== options.version) {
          throw new Error('Optimistic locking error: ActiveService was modified by another transaction');
        }
        
        // Increment version
        activeService.version += 1;
      },
      afterCreate: async (activeService, options) => {
        // Auto-update status if needed
        await activeService.updateStatus(options.transaction);
      }
    }
  });
  
  return ActiveService;
};
