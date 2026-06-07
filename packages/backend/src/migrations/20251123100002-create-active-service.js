'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ActiveServices', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()')
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
      memberId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Members',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      servicePlanId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ServicePlans',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Reference to the service plan this active service is based on'
      },
      // Service Type (denormalized)
      serviceType: {
        type: Sequelize.ENUM('membership', 'class_package', 'pt_package', 'spa_package', 'custom'),
        allowNull: false,
        comment: 'Denormalized from ServicePlan for fast filtering'
      },
      // Validity Period
      startDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      endDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Expiry date for the service'
      },
      // Session Tracking
      totalSessions: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Total sessions available (for session-based services)'
      },
      remainingSessions: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Remaining sessions (decremented on usage)'
      },
      // Status
      status: {
        type: Sequelize.ENUM('active', 'expired', 'depleted', 'cancelled', 'suspended'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'active: usable, expired: past endDate, depleted: no sessions left, cancelled: user cancelled, suspended: admin suspended'
      },
      // Auto-renewal
      autoRenew: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether service should auto-renew on expiry'
      },
      // Purchase Information
      purchaseTransactionId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Transactions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Link to the transaction where this service was purchased'
      },
      purchaseDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      // Trainer Assignment
      assignedTrainerId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Trainers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Assigned trainer for PT packages or dedicated class instructors'
      },
      // Pricing snapshot
      pricePaid: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Price paid at time of purchase (snapshot)'
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'IDR'
      },
      // Discount/Voucher
      voucherId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Vouchers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      voucherDiscount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      // Flexible metadata
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Flexible storage for type-specific data'
      },
      // Notes
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      // Optimistic Locking
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deletedAt: {
        allowNull: true,
        type: Sequelize.DATE
      }
    });

    // Add indexes
    await queryInterface.addIndex('ActiveServices', ['tenantId']);
    await queryInterface.addIndex('ActiveServices', ['memberId']);
    await queryInterface.addIndex('ActiveServices', ['servicePlanId']);
    await queryInterface.addIndex('ActiveServices', ['serviceType']);
    await queryInterface.addIndex('ActiveServices', ['status']);
    await queryInterface.addIndex('ActiveServices', ['endDate']);
    await queryInterface.addIndex('ActiveServices', ['tenantId', 'memberId', 'status']);
    await queryInterface.addIndex('ActiveServices', ['tenantId', 'serviceType', 'status']);
    await queryInterface.addIndex('ActiveServices', ['assignedTrainerId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ActiveServices');
  }
};
