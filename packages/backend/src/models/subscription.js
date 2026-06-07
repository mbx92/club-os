'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Subscription extends Model {
    static associate(models) {
      // A subscription belongs to a tenant
      Subscription.belongsTo(models.Tenant, { 
        foreignKey: 'tenantId', 
        as: 'tenant' 
      });
      
      // A subscription belongs to a plan
      Subscription.belongsTo(models.SubscriptionPlan, { 
        foreignKey: 'planId', 
        as: 'plan' 
      });
      
      // A subscription can have many payments
      Subscription.hasMany(models.Payment, { 
        foreignKey: 'subscriptionId', 
        as: 'payments' 
      });
      
      // A subscription can have many invoices
      Subscription.hasMany(models.Invoice, { 
        foreignKey: 'subscriptionId', 
        as: 'invoices' 
      });
    }
  }
  Subscription.init({
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
    planId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'SubscriptionPlans',
        key: 'id'
      }
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'expired', 'cancelled', 'pending', 'trial'),
      defaultValue: 'pending'
    },
    autoRenew: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Subscription',
  });
  return Subscription;
};