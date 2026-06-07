'use strict';

const { Model } = require('sequelize');
const crypto = require('crypto');

module.exports = (sequelize, DataTypes) => {
  class PsychologyInvitation extends Model {
    static associate(models) {
      PsychologyInvitation.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });
      
      PsychologyInvitation.belongsTo(models.PsychologyPackage, {
        foreignKey: 'packageId',
        as: 'package'
      });
      
      PsychologyInvitation.belongsTo(models.Patient, {
        foreignKey: 'patientId',
        as: 'patient'
      });
      
      PsychologyInvitation.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator'
      });
      
      PsychologyInvitation.hasMany(models.PsychologyOrder, {
        foreignKey: 'invitationId',
        as: 'orders'
      });
    }

    /**
     * Generate unique invitation code
     */
    static generateCode() {
      const random = crypto.randomBytes(4).toString('hex').toUpperCase();
      return `INV-${random}`;
    }

    /**
     * Check if invitation is valid for registration
     */
    isValid() {
      // Must be active
      if (!this.isActive) return false;
      
      // Check expiration
      if (this.expiresAt && new Date() > this.expiresAt) return false;
      
      // Check max uses
      if (this.maxUses && this.usedCount >= this.maxUses) return false;
      
      return true;
    }

    /**
     * Get validation error message
     */
    getValidationError() {
      if (!this.isActive) return 'Invitation is no longer active';
      if (this.expiresAt && new Date() > this.expiresAt) return 'Invitation has expired';
      if (this.maxUses && this.usedCount >= this.maxUses) return 'Invitation has reached maximum registrations';
      return null;
    }

    /**
     * Increment usage count
     */
    async incrementUsage() {
      this.usedCount += 1;
      await this.save();
    }

    /**
     * Calculate test access expiry based on testExpiryHours
     */
    getTestExpiryDate() {
      const now = new Date();
      return new Date(now.getTime() + (this.testExpiryHours * 60 * 60 * 1000));
    }

    /**
     * Get remaining slots (null if unlimited)
     */
    getRemainingSlots() {
      if (!this.maxUses) return null;
      return Math.max(0, this.maxUses - this.usedCount);
    }
  }

  PsychologyInvitation.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true
    },
    packageId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    invitationType: {
      type: DataTypes.ENUM('open_registration', 'single_patient'),
      allowNull: false,
      defaultValue: 'open_registration',
      comment: 'Type of invitation'
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Patient ID for single_patient invitation type'
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    maxUses: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    usedCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    testExpiryHours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 72
    },
    requireFields: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: ['fullName', 'email', 'phone']
    },
    customFields: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    welcomeMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    successMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'PsychologyInvitation',
    tableName: 'PsychologyInvitations',
    timestamps: true,
    hooks: {
      beforeCreate: async (invitation) => {
        if (!invitation.code) {
          invitation.code = PsychologyInvitation.generateCode();
        }
      }
    }
  });

  return PsychologyInvitation;
};
