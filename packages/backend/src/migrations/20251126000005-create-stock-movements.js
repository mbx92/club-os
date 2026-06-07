'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('StockMovements', {
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
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      locationId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Locations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      movementType: {
        type: Sequelize.ENUM('in', 'out', 'adjustment', 'transfer'),
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Positive for in/adjustment, negative for out'
      },
      previousQuantity: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Stock quantity before this movement'
      },
      newQuantity: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Stock quantity after this movement'
      },
      referenceType: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Type: purchase, sale, adjustment, transfer, initial, etc.'
      },
      referenceId: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Reference to Transaction, PurchaseOrder, etc.'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      performedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who performed this stock movement'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('StockMovements', ['tenantId'], {
      name: 'idx_stock_movements_tenant_id'
    });

    await queryInterface.addIndex('StockMovements', ['productId'], {
      name: 'idx_stock_movements_product_id'
    });

    await queryInterface.addIndex('StockMovements', ['locationId'], {
      name: 'idx_stock_movements_location_id'
    });

    await queryInterface.addIndex('StockMovements', ['movementType'], {
      name: 'idx_stock_movements_type'
    });

    await queryInterface.addIndex('StockMovements', ['referenceType', 'referenceId'], {
      name: 'idx_stock_movements_reference'
    });

    await queryInterface.addIndex('StockMovements', ['createdAt'], {
      name: 'idx_stock_movements_created_at'
    });

    await queryInterface.addIndex('StockMovements', ['performedBy'], {
      name: 'idx_stock_movements_performed_by'
    });

    // Composite index for common audit queries
    await queryInterface.addIndex('StockMovements', ['tenantId', 'productId', 'createdAt'], {
      name: 'idx_stock_movements_tenant_product_date'
    });

    // Composite index for location-based inventory reports
    await queryInterface.addIndex('StockMovements', ['tenantId', 'locationId', 'movementType', 'createdAt'], {
      name: 'idx_stock_movements_location_audit'
    });

    console.log('✅ StockMovements table created');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('StockMovements');
    console.log('✅ StockMovements table dropped');
  }
};
