'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      level: {
        type: Sequelize.ENUM('info', 'warn', 'error', 'security', 'audit', 'debug'),
        allowNull: false,
        defaultValue: 'info'
      },
      action: {
        type: Sequelize.STRING,
        allowNull: true
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      },
      ipAddress: {
        type: Sequelize.STRING,
        allowNull: true
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      method: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      path: {
        type: Sequelize.STRING,
        allowNull: true
      },
      statusCode: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      errorStack: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('Logs', ['tenantId']);
    await queryInterface.addIndex('Logs', ['userId']);
    await queryInterface.addIndex('Logs', ['level']);
    await queryInterface.addIndex('Logs', ['action']);
    await queryInterface.addIndex('Logs', ['createdAt']);
    await queryInterface.addIndex('Logs', ['tenantId', 'level']);
    await queryInterface.addIndex('Logs', ['tenantId', 'createdAt']);
    await queryInterface.addIndex('Logs', ['tenantId', 'userId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Logs');
  }
};
