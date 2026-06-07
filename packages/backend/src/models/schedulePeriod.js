'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SchedulePeriod extends Model {
    static associate(models) {
      SchedulePeriod.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant',
      });
      SchedulePeriod.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator',
      });
      SchedulePeriod.hasMany(models.EmployeeSchedule, {
        foreignKey: 'periodId',
        as: 'schedules',
      });
    }
  }

  SchedulePeriod.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tenantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Period name e.g. "Februari 2026", "Week 8 - March"',
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('draft', 'active', 'closed'),
        allowNull: false,
        defaultValue: 'draft',
        comment: 'draft=being prepared, active=current schedule, closed=archived',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    },
    {
      sequelize,
      modelName: 'SchedulePeriod',
      validate: {
        startBeforeEnd() {
          if (this.startDate && this.endDate && this.startDate > this.endDate) {
            throw new Error('startDate must be before or equal to endDate');
          }
        },
      },
    }
  );

  return SchedulePeriod;
};
