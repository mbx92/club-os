'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Tenant extends Model {
    static associate(models) {
      Tenant.hasMany(models.User, { foreignKey: 'tenantId', as: 'users' });
      Tenant.hasMany(models.Member, { foreignKey: 'tenantId', as: 'members' });
      Tenant.hasMany(models.Payment, { foreignKey: 'tenantId', as: 'payments' });
      Tenant.hasMany(models.CheckIn, { foreignKey: 'tenantId', as: 'checkIns' });
      
      // Add associations for billing system
      Tenant.hasMany(models.Subscription, { foreignKey: 'tenantId', as: 'subscriptions' });
      Tenant.hasMany(models.Invoice, { foreignKey: 'tenantId', as: 'invoices' });
      
      Tenant.belongsTo(models.Subscription, {
        foreignKey: 'subscriptionId',
        as: 'subscription'
      });
    }
  }
  Tenant.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    domain: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    logo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Subscriptions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    trialEndDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isOnTrial: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'Tenant',
  });
  return Tenant;
};
