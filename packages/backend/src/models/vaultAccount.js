'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VaultAccount extends Model {
    static associate(models) {
      VaultAccount.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });
      VaultAccount.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator'
      });
    }
  }

  VaultAccount.init({
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
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Display name, e.g. "Kas", "QRIS BCA", "Mandiri"'
    },
    accountType: {
      type: DataTypes.ENUM('cash', 'qris', 'bank_transfer', 'credit_card', 'debit_card', 'e_wallet', 'other'),
      allowNull: false,
      defaultValue: 'cash'
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Mapped payment method from TransactionPayment.paymentMethod'
    },
    bankName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Bank name if applicable'
    },
    balance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' }
    }
  }, {
    sequelize,
    modelName: 'VaultAccount',
    tableName: 'VaultAccounts',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['tenantId', 'name'], unique: true },
      { fields: ['tenantId'] },
      { fields: ['tenantId', 'isActive'] },
      { fields: ['tenantId', 'paymentMethod'] }
    ]
  });

  return VaultAccount;
};
