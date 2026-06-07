'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PsychologyTestTypes', {
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
        comment: 'Unique code per tenant (e.g., PAPI, EPPS)'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      category: {
        type: Sequelize.ENUM('personality', 'aptitude', 'interest', 'cognitive', 'other'),
        defaultValue: 'personality',
        comment: 'Test category for classification'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      questionCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Auto-calculated from questions array length'
      },
      estimatedDuration: {
        type: Sequelize.INTEGER,
        defaultValue: 30,
        comment: 'Estimated duration in minutes'
      },
      questions: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of question objects (format varies by test type)'
      },
      answerSchema: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Auto-generated schema for validating answers'
      },
      scoringConfig: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Configuration for scoring (scales, methods, etc.)'
      },
      config: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Test-specific settings (allowBack, showProgress, etc.)'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: 'Optimistic locking version'
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
    await queryInterface.addIndex('PsychologyTestTypes', ['tenantId', 'code'], {
      unique: true,
      name: 'psychology_test_types_tenant_code_unique'
    });

    await queryInterface.addIndex('PsychologyTestTypes', ['tenantId', 'isActive'], {
      name: 'psychology_test_types_tenant_active'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PsychologyTestTypes');
  }
};
