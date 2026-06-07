'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TrainerCommission extends Model {
    static associate(models) {
      TrainerCommission.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      TrainerCommission.belongsTo(models.Trainer, {
        foreignKey: 'trainerId',
        as: 'trainer'
      });

      TrainerCommission.belongsTo(models.Transaction, {
        foreignKey: 'transactionId',
        as: 'transaction'
      });

      // Future: when Class model is created
      // TrainerCommission.belongsTo(models.Class, {
      //   foreignKey: 'classId',
      //   as: 'class'
      // });
    }

    // Mark commission as paid
    async markAsPaid(paymentMethod, notes) {
      this.status = 'paid';
      this.paidAt = new Date();
      this.paymentMethod = paymentMethod;
      if (notes) this.notes = notes;
      await this.save();
    }

    // Cancel commission
    async cancel(notes) {
      this.status = 'cancelled';
      if (notes) this.notes = notes;
      await this.save();
    }
  }

  TrainerCommission.init({
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
    trainerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Trainers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    transactionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Transactions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    classId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Classes',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    baseAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    commissionType: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      allowNull: false
    },
    commissionRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    commissionAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'TrainerCommission',
    hooks: {
      beforeValidate: (commission) => {
        // Auto-calculate commission amount if not provided
        if (!commission.commissionAmount) {
          if (commission.commissionType === 'percentage') {
            commission.commissionAmount = 
              (parseFloat(commission.baseAmount) * parseFloat(commission.commissionRate)) / 100;
          } else {
            commission.commissionAmount = parseFloat(commission.commissionRate);
          }
        }
      }
    }
  });

  return TrainerCommission;
};
