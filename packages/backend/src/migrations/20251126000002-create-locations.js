'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Locations', {
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
      code: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
        comment: 'Unique location code (e.g., LOC001, BRANCH-A)'
      },
      address: {
        type: Sequelize.STRING,
        allowNull: true
      },
      city: {
        type: Sequelize.STRING,
        allowNull: true
      },
      province: {
        type: Sequelize.STRING,
        allowNull: true
      },
      postalCode: {
        type: Sequelize.STRING,
        allowNull: true
      },
      country: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'Indonesia'
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true
      },
      locationType: {
        type: Sequelize.ENUM('main', 'branch', 'warehouse'),
        allowNull: false,
        defaultValue: 'main'
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
        comment: 'GPS latitude for future features'
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
        comment: 'GPS longitude for future features'
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
    await queryInterface.addIndex('Locations', ['tenantId'], {
      name: 'idx_locations_tenant_id'
    });

    await queryInterface.addIndex('Locations', ['code'], {
      name: 'idx_locations_code',
      unique: true,
      where: {
        code: { [Sequelize.Op.ne]: null }
      }
    });

    await queryInterface.addIndex('Locations', ['locationType'], {
      name: 'idx_locations_type'
    });

    await queryInterface.addIndex('Locations', ['isActive'], {
      name: 'idx_locations_is_active'
    });

    await queryInterface.addIndex('Locations', ['tenantId', 'isActive'], {
      name: 'idx_locations_tenant_active'
    });

    console.log('✅ Locations table created');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Locations');
    console.log('✅ Locations table dropped');
  }
};
