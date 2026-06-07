'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EmployeeSchedule extends Model {
    static associate(models) {
      EmployeeSchedule.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant',
      });
      EmployeeSchedule.belongsTo(models.SchedulePeriod, {
        foreignKey: 'periodId',
        as: 'period',
      });
      EmployeeSchedule.belongsTo(models.DeviceEmployee, {
        foreignKey: 'deviceEmployeeId',
        as: 'deviceEmployee',
      });
      EmployeeSchedule.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      EmployeeSchedule.belongsTo(models.Shift, {
        foreignKey: 'shiftId',
        as: 'shift',
      });
    }
  }

  EmployeeSchedule.init(
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
      periodId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'SchedulePeriods', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      deviceEmployeeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'DeviceEmployees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'References DeviceEmployee — the primary employee identifier for scheduling',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Optional link to system User (auto-filled if DeviceEmployee is linked)',
      },
      shiftId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Shifts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      shiftStart: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      shiftEnd: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      isOff: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'EmployeeSchedule',
    }
  );

  return EmployeeSchedule;
};
