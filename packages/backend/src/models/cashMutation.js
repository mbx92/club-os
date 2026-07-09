'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CashMutation extends Model {
    static associate(models) {
      CashMutation.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });
      CashMutation.belongsTo(models.Location, {
        foreignKey: 'locationId',
        as: 'location'
      });
      CashMutation.belongsTo(models.VaultAccount, {
        foreignKey: 'sourceVaultAccountId',
        as: 'sourceVaultAccount'
      });
      CashMutation.belongsTo(models.VaultAccount, {
        foreignKey: 'destinationVaultAccountId',
        as: 'destinationVaultAccount'
      });
      CashMutation.belongsTo(models.CashRegisterSession, {
        foreignKey: 'shiftSessionId',
        as: 'shiftSession'
      });
      CashMutation.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator'
      });
    }
  }

  CashMutation.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Tenants', key: 'id' }
    },
    locationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Locations', key: 'id' }
    },
    mutationNumber: {
      type: DataTypes.STRING(30),
      allowNull: true,
      comment: 'Auto-generated mutation number, e.g. CM-2026-000001'
    },
    sourceVaultAccountId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'VaultAccounts', key: 'id' }
    },
    destinationVaultAccountId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'VaultAccounts', key: 'id' }
    },
    sourceAccount: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    destinationAccount: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    mutationType: {
      type: DataTypes.ENUM(
        'drawer_to_vault_transfer',
        'vault_expense',
        'vault_adjustment',
        'transfer_between_accounts',
        'payment_inflow'
      ),
      allowNull: false
    },
    referenceType: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    referenceNumber: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    shiftSessionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'CashRegisterSessions', key: 'id' }
    },
    status: {
      type: DataTypes.ENUM('draft', 'pending', 'posted', 'cancelled'),
      allowNull: false,
      defaultValue: 'posted'
    },
    mutationDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' }
    }
  }, {
    sequelize,
    modelName: 'CashMutation',
    tableName: 'CashMutations',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['tenantId', 'mutationNumber'], unique: true },
      { fields: ['tenantId'] },
      { fields: ['tenantId', 'mutationDate'] },
      { fields: ['sourceVaultAccountId'] },
      { fields: ['destinationVaultAccountId'] },
      { fields: ['mutationType'] },
      { fields: ['status'] },
      { fields: ['referenceType', 'referenceId'] },
      { fields: ['shiftSessionId'] }
    ]
  });

  return CashMutation;
};
