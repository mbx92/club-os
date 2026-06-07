'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      Payment.belongsTo(models.Tenant, { foreignKey: 'tenantId', as: 'tenant' });
      Payment.belongsTo(models.User, { foreignKey: 'processedBy', as: 'processor' });
      
      // Add associations for billing system
      Payment.belongsTo(models.Subscription, {
        foreignKey: 'subscriptionId',
        as: 'subscription'
      });
      
      Payment.belongsTo(models.Invoice, {
        foreignKey: 'invoiceId',
        as: 'invoice'
      });
    }
  }
  
  Payment.init({
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
    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: true, // For subscription payments
      references: {
        model: 'Subscriptions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: true, // For payments linked to invoices
      references: {
        model: 'Invoices',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Payment method from tenant settings (cash, credit_card, debit_card, bank_transfer, qris, e_wallet, etc.)'
    },
    paymentType: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Type of payment: subscription, membership, pos, restaurant, etc.'
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled'),
      defaultValue: 'pending'
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
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Payment',
  });
  
  return Payment;
};