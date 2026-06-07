'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create Transactions table
    await queryInterface.createTable('Transactions', {
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
      transactionNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      transactionDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      customerId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      customerType: {
        type: Sequelize.ENUM('member', 'non-member'),
        allowNull: false,
        defaultValue: 'non-member'
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      tax: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      discount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      totalAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'cancelled', 'refunded'),
        allowNull: false,
        defaultValue: 'pending'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
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
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Create TransactionItems table
    await queryInterface.createTable('TransactionItems', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      transactionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Transactions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      itemType: {
        type: Sequelize.ENUM('membership', 'product'),
        allowNull: false
      },
      itemId: {
        type: Sequelize.UUID,
        allowNull: false
      },
      itemName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      unitPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      discount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      tax: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      itemDetails: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Create Products table
    await queryInterface.createTable('Products', {
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
      sku: {
        type: Sequelize.STRING,
        allowNull: false
      },
      barcode: {
        type: Sequelize.STRING,
        allowNull: true
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      taxRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0
      },
      stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      minStock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      unit: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pcs'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      isTrackStock: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      image: {
        type: Sequelize.STRING,
        allowNull: true
      },
      productDetails: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
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
      updatedBy: {
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
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Create TransactionPayments table
    await queryInterface.createTable('TransactionPayments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      transactionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Transactions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      paymentMethod: {
        type: Sequelize.ENUM('cash', 'credit_card', 'debit_card', 'bank_transfer', 'e_wallet', 'other'),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'IDR'
      },
      paymentDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending'
      },
      transactionId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      receiptNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      paymentDetails: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
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
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add composite unique index for Products (tenantId, sku)
    await queryInterface.addIndex('Products', ['tenantId', 'sku'], {
      unique: true,
      name: 'products_tenant_sku_unique'
    });

    // Add index for Products barcode
    await queryInterface.addIndex('Products', ['barcode'], {
      name: 'products_barcode_index'
    });

    // Add index for Products category
    await queryInterface.addIndex('Products', ['category'], {
      name: 'products_category_index'
    });

    // Add index for Products isActive
    await queryInterface.addIndex('Products', ['isActive'], {
      name: 'products_is_active_index'
    });

    // Add index for Transactions tenantId
    await queryInterface.addIndex('Transactions', ['tenantId'], {
      name: 'transactions_tenant_id_index'
    });

    // Add index for Transactions transactionDate
    await queryInterface.addIndex('Transactions', ['transactionDate'], {
      name: 'transactions_date_index'
    });

    // Add index for Transactions status
    await queryInterface.addIndex('Transactions', ['status'], {
      name: 'transactions_status_index'
    });

    // Add index for TransactionItems transactionId
    await queryInterface.addIndex('TransactionItems', ['transactionId'], {
      name: 'transaction_items_transaction_id_index'
    });

    // Add index for TransactionItems itemType
    await queryInterface.addIndex('TransactionItems', ['itemType'], {
      name: 'transaction_items_item_type_index'
    });

    // Add index for TransactionItems itemId
    await queryInterface.addIndex('TransactionItems', ['itemId'], {
      name: 'transaction_items_item_id_index'
    });

    // Add index for TransactionPayments transactionId
    await queryInterface.addIndex('TransactionPayments', ['transactionId'], {
      name: 'transaction_payments_transaction_id_index'
    });

    // Add index for TransactionPayments status
    await queryInterface.addIndex('TransactionPayments', ['status'], {
      name: 'transaction_payments_status_index'
    });

    // Add index for TransactionPayments paymentMethod
    await queryInterface.addIndex('TransactionPayments', ['paymentMethod'], {
      name: 'transaction_payments_method_index'
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop all indexes first
    await queryInterface.removeIndex('Products', 'products_tenant_sku_unique');
    await queryInterface.removeIndex('Products', 'products_barcode_index');
    await queryInterface.removeIndex('Products', 'products_category_index');
    await queryInterface.removeIndex('Products', 'products_is_active_index');
    await queryInterface.removeIndex('Transactions', 'transactions_tenant_id_index');
    await queryInterface.removeIndex('Transactions', 'transactions_date_index');
    await queryInterface.removeIndex('Transactions', 'transactions_status_index');
    await queryInterface.removeIndex('TransactionItems', 'transaction_items_transaction_id_index');
    await queryInterface.removeIndex('TransactionItems', 'transaction_items_item_type_index');
    await queryInterface.removeIndex('TransactionItems', 'transaction_items_item_id_index');
    await queryInterface.removeIndex('TransactionPayments', 'transaction_payments_transaction_id_index');
    await queryInterface.removeIndex('TransactionPayments', 'transaction_payments_status_index');
    await queryInterface.removeIndex('TransactionPayments', 'transaction_payments_method_index');

    // Drop tables in reverse order to avoid foreign key constraint issues
    await queryInterface.dropTable('TransactionPayments');
    await queryInterface.dropTable('TransactionItems');
    await queryInterface.dropTable('Products');
    await queryInterface.dropTable('Transactions');
  }
};