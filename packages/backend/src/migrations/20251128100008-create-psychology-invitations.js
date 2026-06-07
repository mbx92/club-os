'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PsychologyInvitations', {
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
        type: Sequelize.STRING(32),
        allowNull: false,
        unique: true,
        comment: 'Short invitation code (e.g., INV-ABC123)'
      },
      packageId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'PsychologyPackages',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Invitation name/label (e.g., "Rekrutmen Batch 1")'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional info shown on registration page'
      },
      maxUses: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Maximum number of registrations (null = unlimited)'
      },
      usedCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Invitation link expiration'
      },
      testExpiryHours: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 72,
        comment: 'Hours until test access expires after registration'
      },
      requireFields: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: ['fullName', 'email', 'phone'],
        comment: 'Required registration fields'
      },
      customFields: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional custom fields for registration'
      },
      welcomeMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Custom welcome message on registration page'
      },
      successMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Custom message after successful registration'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('PsychologyInvitations', ['tenantId']);
    await queryInterface.addIndex('PsychologyInvitations', ['code'], { unique: true });
    await queryInterface.addIndex('PsychologyInvitations', ['packageId']);
    await queryInterface.addIndex('PsychologyInvitations', ['isActive']);
    await queryInterface.addIndex('PsychologyInvitations', ['expiresAt']);

    // Add invitationId to PsychologyOrders
    await queryInterface.addColumn('PsychologyOrders', 'invitationId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'PsychologyInvitations',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add registrationData to PsychologyOrders for custom field values
    await queryInterface.addColumn('PsychologyOrders', 'registrationData', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Custom registration field values'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('PsychologyOrders', 'registrationData');
    await queryInterface.removeColumn('PsychologyOrders', 'invitationId');
    await queryInterface.dropTable('PsychologyInvitations');
  }
};
