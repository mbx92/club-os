'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('VaultAccounts', {
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
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Display name of vault account, e.g. "Kas", "QRIS BCA", "Mandiri"'
      },
      accountType: {
        type: Sequelize.ENUM('cash', 'qris', 'bank_transfer', 'credit_card', 'debit_card', 'e_wallet', 'other'),
        allowNull: false,
        defaultValue: 'cash',
        comment: 'Category of vault account'
      },
      paymentMethod: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Mapped payment method from TransactionPayment.paymentMethod, e.g. "cash", "qris", "bank_transfer"'
      },
      bankName: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Bank name if applicable, e.g. "BCA", "Mandiri", "BRI"'
      },
      balance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Current balance of this vault account'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Optional description for this vault account'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Display sort order'
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
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Unique: one vault account per tenant per name
    await queryInterface.addIndex('VaultAccounts', ['tenantId', 'name'], {
      unique: true,
      name: 'vault_accounts_tenant_name_unique'
    });
    await queryInterface.addIndex('VaultAccounts', ['tenantId']);
    await queryInterface.addIndex('VaultAccounts', ['tenantId', 'isActive']);
    await queryInterface.addIndex('VaultAccounts', ['tenantId', 'paymentMethod']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('VaultAccounts');
  }
};
