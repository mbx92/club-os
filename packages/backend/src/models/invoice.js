'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Invoice extends Model {
    static associate(models) {
      // An invoice belongs to a subscription
      Invoice.belongsTo(models.Subscription, { 
        foreignKey: 'subscriptionId', 
        as: 'subscription' 
      });
      
      // An invoice belongs to a tenant
      Invoice.belongsTo(models.Tenant, { 
        foreignKey: 'tenantId', 
        as: 'tenant' 
      });
      
      // An invoice can have many payments
      Invoice.hasMany(models.Payment, { 
        foreignKey: 'invoiceId', 
        as: 'payments' 
      });
    }
  }
  Invoice.init({
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
    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Subscriptions',
        key: 'id'
      }
    },
    invoiceNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    issueDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    status: {
      type: DataTypes.ENUM('draft', 'issued', 'paid', 'overdue', 'cancelled'),
      defaultValue: 'draft'
    },
    items: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Invoice',
    hooks: {
      beforeCreate: (invoice, options) => {
        // Note: invoiceNumber is now generated in the controller using sequenceService
        // to prevent race conditions. The hook is kept for backward compatibility
        // and will only generate if invoiceNumber is not provided.
        
        // Calculate total if not provided
        if (!invoice.total || invoice.total === 0) {
          invoice.total = parseFloat(invoice.amount) + parseFloat(invoice.tax || 0);
        }
      }
    }
  });
  return Invoice;
};