'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PsychologyPackages', {
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
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Unique code per tenant (e.g., PKG-PAPI, PKG-FULL)'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      packageType: {
        type: Sequelize.ENUM('single', 'bundle'),
        defaultValue: 'single',
        comment: 'single = 1 test, bundle = multiple tests'
      },
      basePrice: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Base price before discount'
      },
      discountType: {
        type: Sequelize.ENUM('none', 'percentage', 'fixed'),
        defaultValue: 'none'
      },
      discountValue: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0,
        comment: 'Discount value (percentage or fixed amount)'
      },
      finalPrice: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Final price after discount (auto-calculated)'
      },
      estimatedDuration: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Total estimated duration in minutes (sum of all tests)'
      },
      testCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of tests in package (auto-calculated)'
      },
      validityDays: {
        type: Sequelize.INTEGER,
        defaultValue: 7,
        comment: 'How many days the order is valid after creation'
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Display order in listing'
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
    await queryInterface.addIndex('PsychologyPackages', ['tenantId', 'code'], {
      unique: true,
      name: 'psychology_packages_tenant_code_unique'
    });

    await queryInterface.addIndex('PsychologyPackages', ['tenantId', 'isActive'], {
      name: 'psychology_packages_tenant_active'
    });

    await queryInterface.addIndex('PsychologyPackages', ['tenantId', 'sortOrder'], {
      name: 'psychology_packages_tenant_sort'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PsychologyPackages');
  }
};
