'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('TestSessionLogs', {
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
      sessionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'PsychologySessions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      level: {
        type: Sequelize.ENUM('debug', 'info', 'warn', 'error'),
        allowNull: false,
        defaultValue: 'info',
        comment: 'Log level: debug, info, warn, error'
      },
      eventType: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Event type: test_started, question_answered, page_focus, page_blur, etc.'
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Human readable message'
      },
      data: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Additional event data (questionId, answer, timing, etc.)'
      },
      clientTimestamp: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp from client device'
      },
      ipAddress: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'Client IP address'
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Client user agent'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for efficient querying
    await queryInterface.addIndex('TestSessionLogs', ['tenantId']);
    await queryInterface.addIndex('TestSessionLogs', ['sessionId']);
    await queryInterface.addIndex('TestSessionLogs', ['level']);
    await queryInterface.addIndex('TestSessionLogs', ['eventType']);
    await queryInterface.addIndex('TestSessionLogs', ['createdAt']);
    await queryInterface.addIndex('TestSessionLogs', ['sessionId', 'eventType']);
    await queryInterface.addIndex('TestSessionLogs', ['sessionId', 'createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('TestSessionLogs');
  }
};
