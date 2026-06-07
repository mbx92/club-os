"use strict";
const { Model } = require("sequelize");
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/jwt');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Tenant, { foreignKey: "tenantId", as: "tenant" });
      User.belongsTo(models.Role, { foreignKey: "roleId", as: "role" });
      User.hasMany(models.Member, { foreignKey: "userId", as: "members" });
      User.hasMany(models.Payment, { foreignKey: "processedBy", as: "payments" });
      User.hasMany(models.CheckIn, { foreignKey: "checkedInBy", as: "checkIns" });
    }

    // Instance method to validate password
    async validatePassword(password) {
      return await bcrypt.compare(password, this.password);
    }

    // Instance method to generate JWT
    generateJWT() {
      const payload = {
        id: this.id,
        email: this.email,
        isSuperAdmin: this.isSuperAdmin,
        tenantId: this.tenantId,
        roleId: this.roleId
      };
      
      return generateToken(payload);
    }

    // Virtual getter for full name
    get name() {
      return `${this.firstName || ''} ${this.lastName || ''}`.trim();
    }
  }
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tenantId: {
        type: DataTypes.UUID,
        allowNull: true, // Allow null for superadmin
        references: {
          model: "Tenants",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      isSuperAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        set(value) {
          // Hash password before setting it
          const hash = bcrypt.hashSync(value, 10);
          this.setDataValue('password', hash);
        }
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      refreshToken: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      roleId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Roles",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      deviceEmployeeNo: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Employee number on Hikvision device for attendance matching',
      },
    },
    {
      sequelize,
      modelName: "User",
    }
  );
  return User;
};
