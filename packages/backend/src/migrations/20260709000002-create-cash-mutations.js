'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CashMutations', {
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
      mutationNumber: {
        type: Sequelize.STRING(30),
        allowNull: false,
        comment: 'Auto-generated mutation number, e.g. CM-2026-000001'
      },
      sourceVaultAccountId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'VaultAccounts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Source vault account (NULL if from external like cash drawer)'
      },
      destinationVaultAccountId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'VaultAccounts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Destination vault account (NULL if outflow to external)'
      },
      sourceAccount: {
        type: Sequelize.STRING(30),
        allowNull: true,
        comment: 'Legacy: raw source label (cash_drawer, vault, petty_cash, bank, external)'
      },
      destinationAccount: {
        type: Sequelize.STRING(30),
        allowNull: true,
        comment: 'Legacy: raw destination label'
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      mutationType: {
        type: Sequelize.ENUM(
          'drawer_to_vault_transfer',
          'vault_expense',
          'vault_adjustment',
          'transfer_between_accounts',
          'payment_inflow'
        ),
        allowNull: false,
        comment: 'Type of vault mutation'
      },
      referenceType: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Type of referenced entity (Expense, CashRegisterSession, Transaction, etc.)'
      },
      referenceId: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'ID of referenced entity'
      },
      referenceNumber: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Display reference number from source entity'
      },
      shiftSessionId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'CashRegisterSessions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status: {
        type: Sequelize.ENUM('draft', 'pending', 'posted', 'cancelled'),
        allowNull: false,
        defaultValue: 'posted'
      },
      mutationDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional metadata like shiftDate, collectibleBase, alreadyCollected, etc.'
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
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
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Indexes
    await queryInterface.addIndex('CashMutations', ['tenantId', 'mutationNumber'], {
      unique: true,
      name: 'cash_mutations_tenant_number_unique'
    });
    await queryInterface.addIndex('CashMutations', ['tenantId']);
    await queryInterface.addIndex('CashMutations', ['tenantId', 'mutationDate']);
    await queryInterface.addIndex('CashMutations', ['sourceVaultAccountId']);
    await queryInterface.addIndex('CashMutations', ['destinationVaultAccountId']);
    await queryInterface.addIndex('CashMutations', ['mutationType']);
    await queryInterface.addIndex('CashMutations', ['status']);
    await queryInterface.addIndex('CashMutations', ['referenceType', 'referenceId']);
    await queryInterface.addIndex('CashMutations', ['shiftSessionId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('CashMutations');
  }
};
