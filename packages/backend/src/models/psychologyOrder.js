'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PsychologyOrder extends Model {
    static associate(models) {
      // Belongs to Tenant
      PsychologyOrder.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      // Belongs to Patient
      PsychologyOrder.belongsTo(models.Patient, {
        foreignKey: 'patientId',
        as: 'patient'
      });

      // Belongs to Package
      PsychologyOrder.belongsTo(models.PsychologyPackage, {
        foreignKey: 'packageId',
        as: 'package'
      });

      // Belongs to Price Rule (optional)
      PsychologyOrder.belongsTo(models.PsychologyPriceRule, {
        foreignKey: 'priceRuleId',
        as: 'priceRule'
      });

      // Belongs to User (creator)
      PsychologyOrder.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator'
      });

      // Belongs to Invitation (optional - for invitation-based orders)
      PsychologyOrder.belongsTo(models.PsychologyInvitation, {
        foreignKey: 'invitationId',
        as: 'invitation'
      });

      // Has many Sessions
      PsychologyOrder.hasMany(models.PsychologySession, {
        foreignKey: 'orderId',
        as: 'sessions'
      });
    }

    /**
     * Check if access token is still valid
     */
    isAccessValid() {
      if (!this.expiresAt) return false;
      return new Date() < new Date(this.expiresAt);
    }

    /**
     * Check if order has completed all sessions
     */
    async isCompleted() {
      if (!this.sessions || this.sessions.length === 0) {
        return false;
      }
      return this.sessions.every(s => s.status === 'completed');
    }

    /**
     * Calculate progress percentage
     */
    calculateProgress() {
      if (!this.sessions || this.sessions.length === 0) {
        return 0;
      }
      const completed = this.sessions.filter(s => s.status === 'completed').length;
      return Math.round((completed / this.sessions.length) * 100);
    }

    /**
     * Generate new access token
     */
    static generateAccessToken() {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let token = '';
      for (let i = 0; i < 12; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      // Format: XXXX-XXXX-XXXX
      return `${token.slice(0, 4)}-${token.slice(4, 8)}-${token.slice(8, 12)}`;
    }

    /**
     * Generate unique order number
     */
    static generateOrderNumber(tenantId) {
      const date = new Date();
      const yy = date.getFullYear().toString().slice(-2);
      const mm = (date.getMonth() + 1).toString().padStart(2, '0');
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `PSY-${yy}${mm}-${random}`;
    }
  }

  PsychologyOrder.init({
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
    orderNumber: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Patients',
        key: 'id'
      }
    },
    packageId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'PsychologyPackages',
        key: 'id'
      }
    },
    priceRuleId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'PsychologyPriceRules',
        key: 'id'
      }
    },
    accessToken: {
      type: DataTypes.STRING(100),
      allowNull: true, // Allow null on creation, hook will generate if not provided
      defaultValue: () => {
        // Generate default access token: XXXX-XXXX-XXXX format
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let token = '';
        for (let i = 0; i < 12; i++) {
          token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `${token.slice(0, 4)}-${token.slice(4, 8)}-${token.slice(8, 12)}`;
      },
      comment: 'Unique token for accessing the test via QR/link'
    },
    qrCodeData: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Base64 encoded QR code image'
    },
    accessUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Full URL for accessing the test'
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'in_progress', 'completed', 'verified', 'cancelled', 'expired'),
      defaultValue: 'pending'
    },
    baseAmount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      comment: 'Original package price'
    },
    discountAmount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      comment: 'Total discount applied'
    },
    finalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      comment: 'Final amount to pay'
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Payment method used (cash, transfer, etc.)'
    },
    paymentRef: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Payment reference number'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When this order expires'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    invitationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'PsychologyInvitations',
        key: 'id'
      },
      comment: 'Reference to invitation if order was created via invitation link'
    }
  }, {
    sequelize,
    modelName: 'PsychologyOrder',
    tableName: 'PsychologyOrders',
    indexes: [
      {
        fields: ['tenantId', 'orderNumber'],
        unique: true,
        name: 'psychology_orders_tenant_number'
      },
      {
        fields: ['tenantId', 'patientId'],
        name: 'psychology_orders_patient'
      },
      {
        fields: ['accessToken'],
        unique: true,
        name: 'psychology_orders_access_token'
      },
      {
        fields: ['tenantId', 'status'],
        name: 'psychology_orders_tenant_status'
      },
      {
        fields: ['expiresAt'],
        name: 'psychology_orders_expires'
      }
    ],
    hooks: {
      beforeCreate: async (order, options) => {
        // Generate order number if not provided
        if (!order.orderNumber) {
          order.orderNumber = PsychologyOrder.generateOrderNumber(order.tenantId);
        }
        
        // Generate access token if not provided
        if (!order.accessToken) {
          order.accessToken = PsychologyOrder.generateAccessToken();
        }
        
        // Calculate finalAmount if not provided
        if (!order.finalAmount) {
          order.finalAmount = (parseFloat(order.baseAmount) || 0) - (parseFloat(order.discountAmount) || 0);
        }
      }
    }
  });

  return PsychologyOrder;
};
