'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Shift extends Model {
    static associate(models) {
      Shift.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant',
      });
      Shift.hasMany(models.EmployeeSchedule, {
        foreignKey: 'shiftId',
        as: 'schedules',
      });
      Shift.hasMany(models.EmployeeScheduleTemplate, {
        foreignKey: 'shiftId',
        as: 'templates',
      });
    }
  }

  Shift.init(
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
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      shiftStart: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      shiftEnd: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      color: {
        type: DataTypes.STRING(7),
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'Shift',
    }
  );

  return Shift;
};
