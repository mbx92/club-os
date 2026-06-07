'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ServicePlan extends Model {
    static associate(models) {
      ServicePlan.belongsTo(models.Tenant, { foreignKey: 'tenantId', as: 'tenant' });
      ServicePlan.belongsTo(models.Trainer, { foreignKey: 'trainerId', as: 'trainer' });
      ServicePlan.hasMany(models.ActiveService, { foreignKey: 'servicePlanId', as: 'activeServices' });
      ServicePlan.hasMany(models.TransactionItem, { 
        foreignKey: 'itemId',
        constraints: false,
        scope: { itemType: 'service_plan' },
        as: 'transactionItems'
      });
    }

    /**
     * Helper method to check if this is a time-based service
     */
    isTimeBased() {
      return this.durationType === 'time_based';
    }

    /**
     * Helper method to check if this is a session-based service
     */
    isSessionBased() {
      return this.durationType === 'session_based';
    }

    /**
     * Helper method to check if trainer is required
     */
    requiresTrainer() {
      return this.accessControl?.requiresTrainerAssignment === true;
    }

    /**
     * Calculate price per session for session-based services
     */
    getPricePerSession() {
      if (this.isSessionBased() && this.sessions > 0) {
        return (parseFloat(this.price) / this.sessions).toFixed(2);
      }
      return null;
    }

    /**
     * Check if service type is valid for a given class type
     */
    isValidForClassType(classType) {
      if (this.serviceType !== 'class_package') return false;
      
      const applicableTypes = this.accessControl?.applicableClassTypes;
      if (!applicableTypes || applicableTypes.length === 0) return true; // All classes
      
      return applicableTypes.includes(classType);
    }
  }
  
  ServicePlan.init({
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
    trainerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Trainers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Optional default trainer for this service plan (mainly for PT packages)'
    },
    // TYPE DISCRIMINATOR
    serviceType: {
      type: DataTypes.ENUM('membership', 'class_package', 'pt_package', 'spa_package', 'custom'),
      allowNull: false,
      comment: 'Type of service: membership (time-based gym access), class_package (group classes), pt_package (personal training), spa_package (spa/massage), custom (tenant-defined)'
    },
    // Basic Info
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Service plan name (e.g., "30 Days Membership", "12x Yoga Package")'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Pricing
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'IDR'
    },
    // Duration Configuration (polymorphic based on serviceType)
    durationType: {
      type: DataTypes.ENUM('time_based', 'session_based'),
      allowNull: false,
      comment: 'time_based for memberships, session_based for packages with limited sessions'
    },
    // For time_based services (membership)
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration in days for time-based services (e.g., 30, 90, 365)'
    },
    // For session_based services (classes, PT, spa)
    sessions: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Total number of sessions for session-based services (e.g., 8, 12, 20)'
    },
    validityDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Validity period in days for session-based packages (e.g., package expires in 60 days)'
    },
    // Access Control & Configuration (flexible JSON for different service types)
    accessControl: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Flexible configuration: { facilities: [], accessHours: {}, maxCheckIns: 30, applicableClassTypes: [], requiresTrainerAssignment: true }'
    },
    // Display & Status
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isPopular: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Flag for popular/featured plans'
    },
    allowWalkIn: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'If true, this plan can be sold to walk-in customers without a Member record'
    },
    pax: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Number of people included in this plan (e.g. 2 for "2 Pax Daily Pass"). Used for accurate headcount in shift reports.'
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Order for display in UI'
    },
    // Bundle Configuration (optional future enhancement)
    isBundle: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this plan is a bundle of multiple services'
    },
    bundledServices: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of service plan IDs if this is a bundle'
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
    modelName: 'ServicePlan',
    tableName: 'ServicePlans',
    timestamps: true,
    paranoid: true, // Soft deletes
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['serviceType'] },
      { fields: ['isActive'] },
      { fields: ['tenantId', 'serviceType'] },
      { fields: ['tenantId', 'isActive'] }
    ],
    hooks: {
      beforeValidate: (servicePlan, options) => {
        // Validate durationType vs duration/sessions
        if (servicePlan.durationType === 'time_based') {
          if (!servicePlan.duration || servicePlan.duration <= 0) {
            throw new Error('Duration is required for time_based services');
          }
          // Clear session fields for time-based
          servicePlan.sessions = null;
          servicePlan.validityDays = null;
        } else if (servicePlan.durationType === 'session_based') {
          if (!servicePlan.sessions || servicePlan.sessions <= 0) {
            throw new Error('Sessions is required for session_based services');
          }
          if (!servicePlan.validityDays || servicePlan.validityDays <= 0) {
            throw new Error('ValidityDays is required for session_based services');
          }
          // Clear duration for session-based
          servicePlan.duration = null;
        }
      },
      beforeUpdate: async (servicePlan, options) => {
        // Optimistic locking: check version
        if (options.version !== undefined && servicePlan.version !== options.version) {
          throw new Error('Optimistic locking error: ServicePlan was modified by another transaction');
        }
        
        // Increment version
        servicePlan.version += 1;
      }
    }
  });
  
  return ServicePlan;
};
