'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create Vouchers table
    await queryInterface.createTable('Vouchers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: true, // Null for superadmin global vouchers
        references: {
          model: 'Tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      scope: {
        type: Sequelize.ENUM('subscription', 'tenant'),
        allowNull: false,
        defaultValue: 'tenant',
        comment: 'subscription: superadmin vouchers for billing, tenant: tenant vouchers for operations'
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
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
        type: Sequelize.ENUM('percentage', 'fixed'),
        allowNull: false
      },
      value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      maxDiscountAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      minPurchaseAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
      },
      applicableTo: {
        type: Sequelize.ENUM('all', 'membership', 'product', 'specific_items', 'subscription_plan'),
        allowNull: false,
        defaultValue: 'all',
        comment: 'subscription_plan for superadmin vouchers, others for tenant vouchers'
      },
      applicableItems: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      usageLimit: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      usageCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      userUsageLimit: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      isPublic: {
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
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
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

    // Create VoucherUsages table
    await queryInterface.createTable('VoucherUsages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      voucherId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Vouchers',
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
      memberId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Members',
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
      membershipPaymentId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'MembershipPayments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      discountAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      originalAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      finalAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      usageDetails: {
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

    // Add indexes for Vouchers table
    await queryInterface.addIndex('Vouchers', ['tenantId', 'code'], {
      unique: true,
      name: 'vouchers_tenant_code_unique'
    });

    await queryInterface.addIndex('Vouchers', ['code'], {
      name: 'vouchers_code_index'
    });

    await queryInterface.addIndex('Vouchers', ['applicableTo'], {
      name: 'vouchers_applicable_to_index'
    });

    await queryInterface.addIndex('Vouchers', ['isActive'], {
      name: 'vouchers_is_active_index'
    });

    await queryInterface.addIndex('Vouchers', ['startDate', 'endDate'], {
      name: 'vouchers_date_range_index'
    });

    await queryInterface.addIndex('Vouchers', ['scope'], {
      name: 'vouchers_scope_index'
    });

    await queryInterface.addIndex('Vouchers', ['tenantId', 'scope'], {
      name: 'vouchers_tenant_scope_index'
    });

    // Add indexes for VoucherUsages table
    await queryInterface.addIndex('VoucherUsages', ['voucherId'], {
      name: 'voucher_usages_voucher_id_index'
    });

    await queryInterface.addIndex('VoucherUsages', ['userId'], {
      name: 'voucher_usages_user_id_index'
    });

    await queryInterface.addIndex('VoucherUsages', ['memberId'], {
      name: 'voucher_usages_member_id_index'
    });

    await queryInterface.addIndex('VoucherUsages', ['transactionId'], {
      name: 'voucher_usages_transaction_id_index'
    });

    await queryInterface.addIndex('VoucherUsages', ['membershipPaymentId'], {
      name: 'voucher_usages_membership_payment_id_index'
    });

    await queryInterface.addIndex('VoucherUsages', ['voucherId', 'userId'], {
      name: 'voucher_usages_voucher_user_index'
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop all indexes first
    await queryInterface.removeIndex('Vouchers', 'vouchers_tenant_code_unique');
    await queryInterface.removeIndex('Vouchers', 'vouchers_code_index');
    await queryInterface.removeIndex('Vouchers', 'vouchers_applicable_to_index');
    await queryInterface.removeIndex('Vouchers', 'vouchers_is_active_index');
    await queryInterface.removeIndex('Vouchers', 'vouchers_date_range_index');
    await queryInterface.removeIndex('Vouchers', 'vouchers_scope_index');
    await queryInterface.removeIndex('Vouchers', 'vouchers_tenant_scope_index');
    await queryInterface.removeIndex('VoucherUsages', 'voucher_usages_voucher_id_index');
    await queryInterface.removeIndex('VoucherUsages', 'voucher_usages_user_id_index');
    await queryInterface.removeIndex('VoucherUsages', 'voucher_usages_member_id_index');
    await queryInterface.removeIndex('VoucherUsages', 'voucher_usages_transaction_id_index');
    await queryInterface.removeIndex('VoucherUsages', 'voucher_usages_membership_payment_id_index');
    await queryInterface.removeIndex('VoucherUsages', 'voucher_usages_voucher_user_index');

    // Drop tables in reverse order to avoid foreign key constraint issues
    await queryInterface.dropTable('VoucherUsages');
    await queryInterface.dropTable('Vouchers');
  }
};