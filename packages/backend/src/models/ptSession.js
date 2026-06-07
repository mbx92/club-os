'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PTSession extends Model {
    static associate(models) {
      PTSession.belongsTo(models.Tenant, { foreignKey: 'tenantId', as: 'tenant' });
      PTSession.belongsTo(models.ActiveService, { foreignKey: 'activeServiceId', as: 'activeService' });
      PTSession.belongsTo(models.Trainer, { foreignKey: 'trainerId', as: 'trainer' });
      PTSession.belongsTo(models.Member, { foreignKey: 'memberId', as: 'member' });
      PTSession.belongsTo(models.CheckIn, { foreignKey: 'checkInId', as: 'checkIn' });
      PTSession.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    }

    isUpcoming() {
      return this.status === 'scheduled' && new Date(this.sessionDate) > new Date();
    }

    isPast() {
      return new Date(this.sessionDate) <= new Date();
    }
  }

  PTSession.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Tenants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    activeServiceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'ActiveServices', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    trainerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Trainers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    memberId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Members', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    sessionDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 60
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'completed', 'cancelled', 'no_show'),
      allowNull: false,
      defaultValue: 'scheduled'
    },
    sessionUsed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    checkInId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'CheckIns', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    exerciseLog: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'PTSession',
    tableName: 'PTSessions',
    timestamps: true,
    paranoid: true
  });

  return PTSession;
};
