'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ==========================================
    // 1. Create PettyCashes table (Modal Awal)
    // ==========================================
    await queryInterface.createTable('PettyCashes', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Petty cash fund name (e.g. Modal Awal Harian)'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Description of the petty cash fund'
      },
      initialAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Initial amount when the fund was created'
      },
      balance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Current balance of the petty cash fund'
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'closed'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Fund status'
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
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Version number for optimistic locking'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Indexes for PettyCashes
    await queryInterface.addIndex('PettyCashes', ['tenantId']);
    await queryInterface.addIndex('PettyCashes', ['tenantId', 'status']);
    await queryInterface.addIndex('PettyCashes', ['locationId']);
    await queryInterface.addIndex('PettyCashes', ['tenantId', 'locationId']);

    // ==========================================
    // 2. Create PettyCashTransactions table
    // ==========================================
    await queryInterface.createTable('PettyCashTransactions', {
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
      pettyCashId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'PettyCashes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      transactionNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Auto-generated transaction number (e.g. PCT-2026-000001)'
      },
      type: {
        type: Sequelize.ENUM('initial', 'top_up', 'expense', 'sales_return', 'adjustment', 'withdrawal'),
        allowNull: false,
        comment: 'Transaction type: initial=modal awal, top_up=penambahan, expense=bayar expense, sales_return=pengembalian dari penjualan, adjustment=penyesuaian, withdrawal=penarikan'
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Transaction amount (positive for inflow, negative for outflow)'
      },
      balanceBefore: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Balance before this transaction'
      },
      balanceAfter: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Balance after this transaction'
      },
      referenceType: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Polymorphic reference type (e.g. Expense, Transaction)'
      },
      referenceId: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Polymorphic reference ID'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Description/notes for this transaction'
      },
      transactionDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Date of the transaction'
      },
      performedBy: {
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
        defaultValue: Sequelize.literal('NOW()')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Indexes for PettyCashTransactions
    await queryInterface.addIndex('PettyCashTransactions', ['tenantId']);
    await queryInterface.addIndex('PettyCashTransactions', ['pettyCashId']);
    await queryInterface.addIndex('PettyCashTransactions', ['tenantId', 'pettyCashId']);
    await queryInterface.addIndex('PettyCashTransactions', ['type']);
    await queryInterface.addIndex('PettyCashTransactions', ['transactionDate']);
    await queryInterface.addIndex('PettyCashTransactions', ['referenceType', 'referenceId']);
    await queryInterface.addIndex('PettyCashTransactions', ['tenantId', 'transactionNumber'], { unique: true });
    await queryInterface.addIndex('PettyCashTransactions', ['tenantId', 'pettyCashId', 'transactionDate']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PettyCashTransactions');
    await queryInterface.dropTable('PettyCashes');
  }
};
