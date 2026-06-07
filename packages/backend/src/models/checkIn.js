'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CheckIn extends Model {
    static associate(models) {
      CheckIn.belongsTo(models.Tenant, { foreignKey: 'tenantId', as: 'tenant' });
      CheckIn.belongsTo(models.Member, { foreignKey: 'memberId', as: 'member' });
      CheckIn.belongsTo(models.User, { foreignKey: 'checkedInBy', as: 'checkedBy' });
      CheckIn.belongsTo(models.ActiveService, { foreignKey: 'activeServiceId', as: 'activeService' });
    }
  }
  
  CheckIn.init({
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
    checkInTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    checkOutTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    checkedInBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    activeServiceId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'ActiveServices',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'CheckIn',
  });
  
  return CheckIn;
};