'use strict';
const { Model } = require('sequelize');

/**
 * @deprecated This model is deprecated. Use ActiveService model instead.
 * Membership is being replaced by the unified ActiveService system.
 * See: src/models/activeService.js
 * 
 * Migration path:
 * - ActiveService with serviceType='membership'
 * - All new implementations should use ActiveService
 * - This model is kept for backward compatibility only
 */
module.exports = (sequelize, DataTypes) => {
  class Membership extends Model {
    static associate(models) {
      Membership.belongsTo(models.Tenant, { foreignKey: 'tenantId', as: 'tenant' });
      Membership.belongsTo(models.Member, { foreignKey: 'memberId', as: 'member' });
      Membership.belongsTo(models.MembershipType, { foreignKey: 'membershipTypeId', as: 'membershipType' });
      // Removed: Membership.hasMany(models.Payment, { foreignKey: 'membershipId', as: 'payments' });
      // Use MembershipPayment model instead for membership payments
    }
  }
  
  Membership.init({
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
      allowNull: false,
      references: {
        model: 'Members',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    membershipTypeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'MembershipTypes',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'paid', 'overdue', 'refunded', 'cancelled'),
      defaultValue: 'pending'
    },
    autoRenew: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    status: {
      type: DataTypes.ENUM('active', 'expired', 'cancelled', 'suspended'),
      defaultValue: 'active'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Membership',
  });
  
  return Membership;
};