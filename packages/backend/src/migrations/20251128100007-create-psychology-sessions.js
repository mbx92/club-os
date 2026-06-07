'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PsychologySessions', {
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
      orderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'PsychologyOrders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      testTypeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'PsychologyTestTypes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      sessionToken: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Unique token for this specific test session'
      },
      sessionNumber: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: 'Order of this test in the package (1, 2, 3...)'
      },
      status: {
        type: Sequelize.ENUM('pending', 'started', 'in_progress', 'paused', 'completed', 'verified', 'abandoned', 'timeout'),
        defaultValue: 'pending'
      },
      answers: {
        type: Sequelize.JSONB,
        defaultValue: null,
        comment: 'Raw answers submitted by patient'
      },
      scores: {
        type: Sequelize.JSONB,
        defaultValue: null,
        comment: 'Backend calculated scores (scales, needs, etc.)'
      },
      interpretation: {
        type: Sequelize.JSONB,
        defaultValue: null,
        comment: 'Backend generated interpretation/narratives'
      },
      subject: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Subject/patient data snapshot at test time'
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When patient started the test'
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When patient completed the test'
      },
      verifiedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When result was verified by psychologist'
      },
      verifiedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who verified the result'
      },
      lastActivityAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last activity timestamp for timeout detection'
      },
      currentQuestion: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: 'Current question index for progress tracking'
      },
      timeSpent: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Total time spent in seconds'
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Additional session data (browser, IP, etc.)'
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
    await queryInterface.addIndex('PsychologySessions', ['sessionToken'], {
      unique: true,
      name: 'psychology_sessions_token_unique'
    });

    await queryInterface.addIndex('PsychologySessions', ['orderId', 'sessionNumber'], {
      name: 'psychology_sessions_order_number'
    });

    await queryInterface.addIndex('PsychologySessions', ['tenantId', 'status'], {
      name: 'psychology_sessions_tenant_status'
    });

    await queryInterface.addIndex('PsychologySessions', ['testTypeId'], {
      name: 'psychology_sessions_test_type'
    });

    await queryInterface.addIndex('PsychologySessions', ['completedAt'], {
      name: 'psychology_sessions_completed'
    });

    await queryInterface.addIndex('PsychologySessions', ['verifiedAt'], {
      name: 'psychology_sessions_verified'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PsychologySessions');
  }
};
