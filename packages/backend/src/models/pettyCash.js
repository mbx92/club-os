'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PettyCash extends Model {
    static associate(models) {
      // A petty cash fund belongs to a tenant
      PettyCash.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      // A petty cash fund may belong to a location
      PettyCash.belongsTo(models.Location, {
        foreignKey: 'locationId',
        as: 'location'
      });

      // A petty cash fund is created by a user
      PettyCash.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator'
      });

      // A petty cash fund has many transactions
      PettyCash.hasMany(models.PettyCashTransaction, {
        foreignKey: 'pettyCashId',
        as: 'transactions'
      });
    }
  }

  PettyCash.init({
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
      }
    },
    locationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Locations',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Petty cash fund name (e.g. Modal Awal Harian)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of the petty cash fund'
    },
    initialAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Initial amount when the fund was created'
    },
    balance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Current balance of the petty cash fund'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'closed'),
      allowNull: false,
      defaultValue: 'active',
      comment: 'Fund status'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Version number for optimistic locking'
    }
  }, {
    sequelize,
    modelName: 'PettyCash',
    tableName: 'PettyCashes',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['tenantId']
      },
      {
        fields: ['tenantId', 'status']
      },
      {
        fields: ['locationId']
      },
      {
        fields: ['tenantId', 'locationId']
      }
    ],
    hooks: {
      beforeUpdate: (pettyCash) => {
        // Increment version for optimistic locking
        pettyCash.version += 1;
      }
    }
  });

  return PettyCash;
};
