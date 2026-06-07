'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PsychologySettings extends Model {
    static associate(models) {
      // Belongs to Tenant
      PsychologySettings.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });
    }
  }

  PsychologySettings.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'Tenants',
        key: 'id'
      }
    },
    
    // Logo & Branding
    logo: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    footer: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    primaryColor: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#1e3a5f'
    },
    secondaryColor: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#6b7280'
    },
    
    // Psychologist Info
    psychologistName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    licenseNumber: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    
    // Institution Info
    institutionName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    tagline: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    institutionWebsite: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    institutionEmail: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    institutionPhone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    instagram: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    // Report Settings
    reportTitle: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'PSIKOGRAM'
    },
    reportSubtitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: 'Hasil Pemeriksaan Psikologis'
    },
    reportFooter: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Display Options
    showLogo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    showSignature: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    showWatermark: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    
    // Signature
    signature: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'PsychologySettings',
    tableName: 'PsychologySettings',
    indexes: [
      {
        unique: true,
        fields: ['tenantId'],
        name: 'psychology_settings_tenant_unique'
      }
    ]
  });

  return PsychologySettings;
};
