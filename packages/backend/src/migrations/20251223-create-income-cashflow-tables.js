'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create IncomeCategories table
    await queryInterface.createTable('IncomeCategories', {
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
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      type: {
        type: Sequelize.ENUM('operational', 'investment', 'donation', 'other'),
        allowNull: false,
        defaultValue: 'operational'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: true
      },
      icon: {
        type: Sequelize.STRING,
        allowNull: true
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

    // Create Incomes table
    await queryInterface.createTable('Incomes', {
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
      categoryId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'IncomeCategories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      transactionId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Transactions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      incomeNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      taxAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      totalAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      incomeDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      receivedDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      paymentMethod: {
        type: Sequelize.ENUM('cash', 'transfer', 'credit_card', 'debit_card', 'check', 'other'),
        allowNull: true
      },
      referenceNumber: {
        type: Sequelize.STRING,
        allowNull: true
      },
      source: {
        type: Sequelize.STRING,
        allowNull: true
      },
      type: {
        type: Sequelize.ENUM('transactional', 'manual'),
        allowNull: false,
        defaultValue: 'manual'
      },
      status: {
        type: Sequelize.ENUM('pending', 'received', 'cancelled'),
        allowNull: false,
        defaultValue: 'received'
      },
      isRecurring: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      recurringFrequency: {
        type: Sequelize.ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly'),
        allowNull: true
      },
      recurringEndDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      attachments: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: []
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
        defaultValue: 0
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

    // Create CashFlows table
    await queryInterface.createTable('CashFlows', {
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
      incomeId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Incomes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      expenseId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Expenses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      transactionId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Transactions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      flowDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('inflow', 'outflow'),
        allowNull: false
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      paymentMethod: {
        type: Sequelize.ENUM('cash', 'transfer', 'credit_card', 'debit_card', 'check', 'other'),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      referenceNumber: {
        type: Sequelize.STRING,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isProjected: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
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

    // Add indexes for IncomeCategories
    await queryInterface.addIndex('IncomeCategories', ['tenantId']);
    await queryInterface.addIndex('IncomeCategories', ['tenantId', 'name'], {
      unique: true,
      name: 'income_categories_tenant_name_unique'
    });
    await queryInterface.addIndex('IncomeCategories', ['isActive']);

    // Add indexes for Incomes
    await queryInterface.addIndex('Incomes', ['tenantId']);
    await queryInterface.addIndex('Incomes', ['tenantId', 'incomeNumber'], {
      unique: true,
      name: 'incomes_tenant_number_unique'
    });
    await queryInterface.addIndex('Incomes', ['categoryId']);
    await queryInterface.addIndex('Incomes', ['locationId']);
    await queryInterface.addIndex('Incomes', ['transactionId']);
    await queryInterface.addIndex('Incomes', ['status']);
    await queryInterface.addIndex('Incomes', ['type']);
    await queryInterface.addIndex('Incomes', ['incomeDate']);
    await queryInterface.addIndex('Incomes', ['tenantId', 'incomeDate']);
    await queryInterface.addIndex('Incomes', ['tenantId', 'status', 'incomeDate']);

    // Add indexes for CashFlows
    await queryInterface.addIndex('CashFlows', ['tenantId']);
    await queryInterface.addIndex('CashFlows', ['tenantId', 'flowDate']);
    await queryInterface.addIndex('CashFlows', ['type']);
    await queryInterface.addIndex('CashFlows', ['category']);
    await queryInterface.addIndex('CashFlows', ['incomeId']);
    await queryInterface.addIndex('CashFlows', ['expenseId']);
    await queryInterface.addIndex('CashFlows', ['transactionId']);
    await queryInterface.addIndex('CashFlows', ['isProjected']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('CashFlows');
    await queryInterface.dropTable('Incomes');
    await queryInterface.dropTable('IncomeCategories');
  }
};
