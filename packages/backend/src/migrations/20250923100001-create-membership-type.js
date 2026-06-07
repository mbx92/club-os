'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('MembershipTypes', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Duration in days'
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      maxCheckIns: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Null for unlimited'
      },
      accessHours: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'e.g. { "monday": ["08:00", "22:00"], "tuesday": ["08:00", "22:00"] }'
      },
      facilities: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'e.g. ["gym", "pool", "sauna"]'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Add composite unique constraint for name and tenantId
    await queryInterface.addConstraint('MembershipTypes', {
      fields: ['name', 'tenantId'],
      type: 'unique',
      name: 'membershiptypes_name_tenant_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('MembershipTypes');
  }
};