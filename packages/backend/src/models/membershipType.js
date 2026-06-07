'use strict';
const { Model } = require('sequelize');

/**
 * @deprecated This model is deprecated. Use ServicePlan model instead.
 * MembershipType is being replaced by the unified ServicePlan system.
 * See: src/models/servicePlan.js
 * 
 * Migration path:
 * - ServicePlan with serviceType='membership' and durationType='time_based'
 * - All new implementations should use ServicePlan
 * - This model is kept for backward compatibility only
 */
module.exports = (sequelize, DataTypes) => {
  class MembershipType extends Model {
    static associate(models) {
      MembershipType.belongsTo(models.Tenant, { foreignKey: 'tenantId', as: 'tenant' });
      MembershipType.hasMany(models.Membership, { foreignKey: 'membershipTypeId', as: 'memberships' });
    }
  }
  
  MembershipType.init({
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
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER, // in days
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    maxCheckIns: {
      type: DataTypes.INTEGER, // null for unlimited
      allowNull: true
    },
    accessHours: {
      type: DataTypes.JSON, // e.g. { "monday": ["08:00", "22:00"], "tuesday": ["08:00", "22:00"] }
      allowNull: true
    },
    facilities: {
      type: DataTypes.JSON, // e.g. ["gym", "pool", "sauna"]
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'MembershipType',
  });
  
  return MembershipType;
};