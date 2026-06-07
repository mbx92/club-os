'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SubscriptionPlan extends Model {
    static associate(models) {
      // A plan can have many subscriptions
      SubscriptionPlan.hasMany(models.Subscription, { 
        foreignKey: 'planId', 
        as: 'subscriptions' 
      });
    }
  }
  SubscriptionPlan.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    duration: {
      type: DataTypes.INTEGER, // in days
      allowNull: false,
      defaultValue: 30
    },
    maxUsers: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1
    },
    maxMembers: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    features: {
      type: DataTypes.JSON,
      allowNull: true,
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
    modelName: 'SubscriptionPlan',
  });
  return SubscriptionPlan;
};