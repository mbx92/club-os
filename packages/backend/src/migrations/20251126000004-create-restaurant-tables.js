'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('RestaurantTables', {
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
      tableNumber: {
        type: Sequelize.STRING,
        allowNull: false
      },
      tableName: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Display name like "VIP Table 1", "Outdoor A1"'
      },
      capacity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 4
      },
      positionX: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'X coordinate for layout visualization (Phase 4)'
      },
      positionY: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Y coordinate for layout visualization (Phase 4)'
      },
      width: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Width for layout visualization (Phase 4)'
      },
      height: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Height for layout visualization (Phase 4)'
      },
      shape: {
        type: Sequelize.ENUM('rectangle', 'circle', 'square'),
        allowNull: false,
        defaultValue: 'rectangle'
      },
      status: {
        type: Sequelize.ENUM('available', 'occupied', 'reserved', 'cleaning'),
        allowNull: false,
        defaultValue: 'available'
      },
      currentOrderId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Transactions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Current active transaction/order for this table'
      },
      occupiedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      occupiedBy: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Guest name or identifier'
      },
      qrCode: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'QR code for self-ordering feature'
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
    await queryInterface.addIndex('RestaurantTables', ['tenantId'], {
      name: 'idx_restaurant_tables_tenant_id'
    });

    await queryInterface.addIndex('RestaurantTables', ['locationId'], {
      name: 'idx_restaurant_tables_location_id'
    });

    await queryInterface.addIndex('RestaurantTables', ['status'], {
      name: 'idx_restaurant_tables_status'
    });

    await queryInterface.addIndex('RestaurantTables', ['currentOrderId'], {
      name: 'idx_restaurant_tables_current_order'
    });

    // Unique constraint for table number per tenant
    await queryInterface.addIndex('RestaurantTables', ['tableNumber', 'tenantId'], {
      name: 'idx_restaurant_tables_number_tenant',
      unique: true
    });

    // Common query: find available tables by location
    await queryInterface.addIndex('RestaurantTables', ['tenantId', 'locationId', 'status', 'isActive'], {
      name: 'idx_restaurant_tables_tenant_location_status'
    });

    console.log('✅ RestaurantTables table created');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('RestaurantTables');
    console.log('✅ RestaurantTables table dropped');
  }
};
