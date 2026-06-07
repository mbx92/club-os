'use strict';
const { Model } = require('sequelize');
const { formatCurrency, formatPercentage } = require('../utils/formatters');

module.exports = (sequelize, DataTypes) => {
  class Trainer extends Model {
    static associate(models) {
      Trainer.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      Trainer.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });

      Trainer.hasMany(models.TrainerCommission, {
        foreignKey: 'trainerId',
        as: 'commissions'
      });

      // Future: when Class model is created
      // Trainer.hasMany(models.Class, {
      //   foreignKey: 'trainerId',
      //   as: 'classes'
      // });
    }

    // Get full name
    get fullName() {
      return `${this.firstName} ${this.lastName}`.trim();
    }

    // Calculate commission from amount
    calculateCommission(baseAmount) {
      if (this.commissionType === 'percentage') {
        return (baseAmount * this.commissionValue) / 100;
      } else {
        return parseFloat(this.commissionValue);
      }
    }

    // Get formatted commission rate (requires tenant to be included)
    getFormattedCommissionRate() {
      if (this.commissionType === 'percentage') {
        return formatPercentage(this.commissionValue);
      } else {
        return formatCurrency(this.commissionValue, this.tenant);
      }
    }

    // Check if trainer is available on specific day and time
    isAvailableAt(dayOfWeek, time) {
      if (!this.availability || !this.availability[dayOfWeek]) {
        return false;
      }

      const timeSlots = this.availability[dayOfWeek];
      return timeSlots.some(slot => {
        const [start, end] = slot.split('-');
        return time >= start && time <= end;
      });
    }
  }

  Trainer.init({
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
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: true
    },
    specializations: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      get() {
        const value = this.getDataValue('specializations');
        return Array.isArray(value) ? value : [];
      }
    },
    certifications: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      get() {
        const value = this.getDataValue('certifications');
        return Array.isArray(value) ? value : [];
      }
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    photoUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    commissionType: {
      type: DataTypes.ENUM('percentage', 'fixed', 'per_session'),
      allowNull: false,
      defaultValue: 'percentage'
    },
    commissionValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        validateCommissionValue(value) {
          if (this.commissionType === 'percentage' && value > 100) {
            throw new Error('Percentage commission cannot exceed 100%');
          }
        }
      }
    },
    commissionNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bankAccountNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bankAccountName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    availability: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      get() {
        const value = this.getDataValue('availability');
        return typeof value === 'object' && value !== null ? value : {};
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    hireDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Trainer',
    paranoid: true,
    hooks: {
      beforeValidate: async (trainer, options) => {
        // Ensure at least email or phone is provided
        if (!trainer.email && !trainer.phone) {
          throw new Error('Either email or phone must be provided');
        }
      }
    }
  });

  return Trainer;
};
