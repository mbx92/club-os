'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MembershipPaymentRefund extends Model {
    static associate(models) {
      // A refund belongs to a membership payment
      MembershipPaymentRefund.belongsTo(models.MembershipPayment, { 
        foreignKey: 'paymentId', 
        as: 'payment' 
      });
      
      // A refund belongs to a user (who processed the refund)
      MembershipPaymentRefund.belongsTo(models.User, { 
        foreignKey: 'processedBy', 
        as: 'processor' 
      });
    }
  }

  MembershipPaymentRefund.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    paymentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'MembershipPayments',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    refundMethod: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Refund method from tenant settings (cash, credit_card, debit_card, bank_transfer, qris, e_wallet, etc.)'
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    refundDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    processedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'MembershipPaymentRefund',
    hooks: {
      beforeCreate: (refund, options) => {
        // Set refund date if not provided and status is completed
        if (!refund.refundDate && refund.status === 'completed') {
          refund.refundDate = new Date();
        }
      }
    }
  });
  
  return MembershipPaymentRefund;
};