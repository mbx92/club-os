'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ServicePlans', {
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
      // TYPE DISCRIMINATOR
      serviceType: {
        type: Sequelize.ENUM('membership', 'class_package', 'pt_package', 'spa_package', 'custom'),
        allowNull: false,
        comment: 'Type of service: membership (time-based gym access), class_package (group classes), pt_package (personal training), spa_package (spa/massage), custom (tenant-defined)'
      },
      // Basic Info
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Service plan name (e.g., "30 Days Membership", "12x Yoga Package")'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      // Pricing
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'IDR'
      },
      // Duration Configuration
      durationType: {
        type: Sequelize.ENUM('time_based', 'session_based'),
        allowNull: false,
        comment: 'time_based for memberships, session_based for packages with limited sessions'
      },
      // For time_based services (membership)
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Duration in days for time-based services (e.g., 30, 90, 365)'
      },
      // For session_based services (classes, PT, spa)
      sessions: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Total number of sessions for session-based services (e.g., 8, 12, 20)'
      },
      validityDays: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Validity period in days for session-based packages (e.g., package expires in 60 days)'
      },
      // Access Control & Configuration
      accessControl: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Flexible configuration: { facilities: [], accessHours: {}, maxCheckIns: 30, applicableClassTypes: [], requiresTrainerAssignment: true }'
      },
      // Display & Status
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      isPopular: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Flag for popular/featured plans'
      },
      displayOrder: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Order for display in UI'
      },
      // Bundle Configuration
      isBundle: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this plan is a bundle of multiple services'
      },
      bundledServices: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of service plan IDs if this is a bundle'
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
    await queryInterface.addIndex('ServicePlans', ['tenantId']);
    await queryInterface.addIndex('ServicePlans', ['serviceType']);
    await queryInterface.addIndex('ServicePlans', ['isActive']);
    await queryInterface.addIndex('ServicePlans', ['tenantId', 'serviceType']);
    await queryInterface.addIndex('ServicePlans', ['tenantId', 'isActive']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ServicePlans');
  }
};
