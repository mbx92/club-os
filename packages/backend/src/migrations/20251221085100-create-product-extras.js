'use strict';

/**
 * Migration: Create ProductExtras table
 * 
 * Stores customizable extras/additions for products (e.g., "Extra Telur +5000").
 * Multiple extras can be defined per product.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ProductExtras', {
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
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'The product this extra belongs to'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Name of the extra (e.g., "Extra Telur", "Extra Sambal")'
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Additional price for this extra'
      },
      inputType: {
        type: Sequelize.ENUM('radio', 'checkbox', 'select'),
        allowNull: false,
        defaultValue: 'checkbox',
        comment: 'UI input type for selecting this extra'
      },
      groupName: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Group name for organizing extras (e.g., "Toppings", "Protein", "Spice Level")'
      },
      isRequired: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether customer must select this extra'
      },
      isMultiple: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether multiple selections are allowed in this group'
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Display order of extras'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this extra is currently available'
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Indexes
    await queryInterface.addIndex('ProductExtras', ['tenantId'], {
      name: 'product_extras_tenant_idx'
    });

    await queryInterface.addIndex('ProductExtras', ['productId'], {
      name: 'product_extras_product_idx'
    });

    await queryInterface.addIndex('ProductExtras', ['tenantId', 'productId', 'isActive'], {
      name: 'product_extras_tenant_product_active_idx'
    });

    await queryInterface.addIndex('ProductExtras', ['groupName'], {
      name: 'product_extras_group_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ProductExtras');
  }
};
