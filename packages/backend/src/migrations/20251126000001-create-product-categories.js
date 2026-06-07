'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ProductCategories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
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
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      parentId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'ProductCategories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      color: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Hex color code for UI display'
      },
      icon: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Icon name or URL for UI display'
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('ProductCategories', ['tenantId'], {
      name: 'idx_product_categories_tenant_id'
    });

    await queryInterface.addIndex('ProductCategories', ['parentId'], {
      name: 'idx_product_categories_parent_id'
    });

    await queryInterface.addIndex('ProductCategories', ['sortOrder'], {
      name: 'idx_product_categories_sort_order'
    });

    await queryInterface.addIndex('ProductCategories', ['isActive'], {
      name: 'idx_product_categories_is_active'
    });

    // Composite index for common queries
    await queryInterface.addIndex('ProductCategories', ['tenantId', 'isActive', 'sortOrder'], {
      name: 'idx_product_categories_tenant_active_sort'
    });

    console.log('✅ ProductCategories table created');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ProductCategories');
    console.log('✅ ProductCategories table dropped');
  }
};
