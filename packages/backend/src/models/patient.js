'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Patient extends Model {
    static associate(models) {
      // Belongs to Tenant
      Patient.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      // Has many Orders
      Patient.hasMany(models.PsychologyOrder, {
        foreignKey: 'patientId',
        as: 'orders'
      });
    }

    /**
     * Calculate age from birthDate
     */
    getAge() {
      if (!this.birthDate) return null;
      const today = new Date();
      const birth = new Date(this.birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    }

    /**
     * Get display name
     */
    getDisplayName() {
      return this.fullName || this.email || this.code || 'Unknown';
    }
  }

  Patient.init({
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
    code: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    fullName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    sex: {
      type: DataTypes.ENUM('male', 'female'),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    personalData: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'education, occupation, maritalStatus, etc.'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Patient',
    tableName: 'Patients',
    indexes: [
      {
        fields: ['tenantId'],
        name: 'patients_tenant_id'
      },
      {
        fields: ['email'],
        name: 'patients_email'
      }
    ]
  });

  return Patient;
};
