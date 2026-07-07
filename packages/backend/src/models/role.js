'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Role extends Model {
    static associate(models) {
      Role.hasMany(models.User, { foreignKey: 'roleId', as: 'users' });
      Role.belongsTo(models.Tenant, { foreignKey: 'tenantId', as: 'tenant' });
    }

    /** True for the shared, platform-wide default roles (admin, manager, ...). */
    get isSystemRole() {
      return this.tenantId === null || this.tenantId === undefined;
    }
  }
  Role.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
      // Uniqueness is enforced at the DB level via two partial indexes
      // (see migration 20260707000001-add-tenant-id-to-roles.js):
      // globally-unique among system roles (tenantId IS NULL), and
      // unique per tenant among that tenant's custom roles.
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: true,
      // NULL = shared system/default role (admin, manager, cashier, ...).
      // Non-null = a role owned by, and only editable by, that tenant.
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Role',
  });
  return Role;
};
