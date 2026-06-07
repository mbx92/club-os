'use strict';

const { Model } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
  class Operator extends Model {
    static associate(models) {
      Operator.belongsTo(models.Tenant, { foreignKey: 'tenantId', as: 'tenant' });
    }

    // Validate PIN entered by user
    async validatePin(pin) {
      if (!this.pin) return false;
      return await bcrypt.compare(String(pin), this.pin);
    }
  }

  Operator.init(
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
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nama operator yang tampil di layar kasir',
      },
      pin: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Bcrypt-hashed PIN 4-6 digit',
        set(value) {
          if (value) {
            this.setDataValue('pin', bcrypt.hashSync(String(value), 10));
          }
        }
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      permissions: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'Permission map: { discount, void, refund, openShift, closeShift, settings, financialReport }',
      },
      notes: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Catatan opsional (jabatan, dll)',
      },
    },
    {
      sequelize,
      modelName: 'Operator',
    }
  );

  return Operator;
};
