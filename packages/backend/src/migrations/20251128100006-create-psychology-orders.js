'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PsychologyOrders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      orderNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Auto-generated order number (e.g., PSY-20251128-0001)'
      },
      packageId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'PsychologyPackages',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      patientId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Patients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Patient who will take the test (filled during registration)'
      },
      priceRuleId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'PsychologyPriceRules',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Applied price rule/promo'
      },
      accessToken: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Unique token for accessing the test via QR/link'
      },
      qrCodeData: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Base64 encoded QR code image'
      },
      accessUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Full URL for accessing the test'
      },
      status: {
        type: Sequelize.ENUM('pending', 'paid', 'in_progress', 'completed', 'verified', 'cancelled', 'expired'),
        defaultValue: 'pending'
      },
      baseAmount: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0,
        comment: 'Original package price'
      },
      discountAmount: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0,
        comment: 'Total discount applied'
      },
      finalAmount: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0,
        comment: 'Final amount to pay'
      },
      paidAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      paymentMethod: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Payment method used (cash, transfer, etc.)'
      },
      paymentRef: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Payment reference number'
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When this order expires'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Indexes
    await queryInterface.addIndex('PsychologyOrders', ['tenantId', 'orderNumber'], {
      unique: true,
      name: 'psychology_orders_tenant_number_unique'
    });

    await queryInterface.addIndex('PsychologyOrders', ['accessToken'], {
      unique: true,
      name: 'psychology_orders_access_token_unique'
    });

    await queryInterface.addIndex('PsychologyOrders', ['tenantId', 'status'], {
      name: 'psychology_orders_tenant_status'
    });

    await queryInterface.addIndex('PsychologyOrders', ['patientId'], {
      name: 'psychology_orders_patient'
    });

    await queryInterface.addIndex('PsychologyOrders', ['packageId'], {
      name: 'psychology_orders_package'
    });

    await queryInterface.addIndex('PsychologyOrders', ['expiresAt'], {
      name: 'psychology_orders_expires'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PsychologyOrders');
  }
};
