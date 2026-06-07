'use strict';

/**
 * Migration: Add restaurant fields to Transactions
 * 
 * Adds fields needed for restaurant orders:
 * - transactionType: POS, restaurant, gym
 * - orderType: dine-in, takeaway, delivery
 * - tableId: foreign key to RestaurantTables
 * - locationId: foreign key to Locations
 * - customerName: for non-member customers
 * - customerPhone: for delivery orders
 * - completedAt: when order was completed
 * - cancelledAt: when order was cancelled
 * - cancelledBy: who cancelled the order
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Add transactionType column
      await queryInterface.addColumn('Transactions', 'transactionType', {
        type: Sequelize.ENUM('pos', 'restaurant', 'gym', 'psychology'),
        allowNull: false,
        defaultValue: 'pos',
        comment: 'Type of transaction: POS sale, restaurant order, gym membership, psychology test'
      }, { transaction });

      // Add orderType column (for restaurant)
      await queryInterface.addColumn('Transactions', 'orderType', {
        type: Sequelize.ENUM('dine-in', 'takeaway', 'delivery'),
        allowNull: true,
        comment: 'Restaurant order type'
      }, { transaction });

      // Add tableId column
      await queryInterface.addColumn('Transactions', 'tableId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'RestaurantTables',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Restaurant table for dine-in orders'
      }, { transaction });

      // Add locationId column
      await queryInterface.addColumn('Transactions', 'locationId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Locations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Location where transaction occurred'
      }, { transaction });

      // Add customerName column
      await queryInterface.addColumn('Transactions', 'customerName', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Customer name for non-member transactions'
      }, { transaction });

      // Add customerPhone column
      await queryInterface.addColumn('Transactions', 'customerPhone', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Customer phone for delivery orders'
      }, { transaction });

      // Add completedAt column
      await queryInterface.addColumn('Transactions', 'completedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the transaction/order was completed'
      }, { transaction });

      // Add cancelledAt column
      await queryInterface.addColumn('Transactions', 'cancelledAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the transaction/order was cancelled'
      }, { transaction });

      // Add cancelledBy column
      await queryInterface.addColumn('Transactions', 'cancelledBy', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who cancelled the transaction'
      }, { transaction });

      // Add indexes
      await queryInterface.addIndex('Transactions', ['transactionType'], {
        name: 'transactions_transaction_type_idx',
        transaction
      });

      await queryInterface.addIndex('Transactions', ['tableId'], {
        name: 'transactions_table_id_idx',
        transaction
      });

      await queryInterface.addIndex('Transactions', ['locationId'], {
        name: 'transactions_location_id_idx',
        transaction
      });

      await queryInterface.addIndex('Transactions', ['orderType'], {
        name: 'transactions_order_type_idx',
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove indexes
      await queryInterface.removeIndex('Transactions', 'transactions_transaction_type_idx', { transaction });
      await queryInterface.removeIndex('Transactions', 'transactions_table_id_idx', { transaction });
      await queryInterface.removeIndex('Transactions', 'transactions_location_id_idx', { transaction });
      await queryInterface.removeIndex('Transactions', 'transactions_order_type_idx', { transaction });

      // Remove columns
      await queryInterface.removeColumn('Transactions', 'cancelledBy', { transaction });
      await queryInterface.removeColumn('Transactions', 'cancelledAt', { transaction });
      await queryInterface.removeColumn('Transactions', 'completedAt', { transaction });
      await queryInterface.removeColumn('Transactions', 'customerPhone', { transaction });
      await queryInterface.removeColumn('Transactions', 'customerName', { transaction });
      await queryInterface.removeColumn('Transactions', 'locationId', { transaction });
      await queryInterface.removeColumn('Transactions', 'tableId', { transaction });
      await queryInterface.removeColumn('Transactions', 'orderType', { transaction });
      await queryInterface.removeColumn('Transactions', 'transactionType', { transaction });

      // Remove ENUM types
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Transactions_transactionType";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Transactions_orderType";', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
