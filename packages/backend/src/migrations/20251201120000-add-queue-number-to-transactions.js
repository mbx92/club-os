'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check existing columns
    const tableDesc = await queryInterface.describeTable('Transactions');
    
    // Add queueNumber column if not exists
    if (!tableDesc.queueNumber) {
      await queryInterface.addColumn('Transactions', 'queueNumber', {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Queue number for prepaid orders (e.g., A-001, B-015)'
      });
    }

    // Add paymentTiming column if not exists
    if (!tableDesc.paymentTiming) {
      // Check if ENUM type already exists
      const [enumTypes] = await queryInterface.sequelize.query(
        `SELECT 1 FROM pg_type WHERE typname = 'enum_Transactions_paymentTiming'`
      );
      
      if (enumTypes.length === 0) {
        // ENUM doesn't exist, create it first
        await queryInterface.sequelize.query(
          `CREATE TYPE "enum_Transactions_paymentTiming" AS ENUM ('prepaid', 'postpaid')`
        );
      }
      
      // Add column using existing ENUM type
      await queryInterface.sequelize.query(
        `ALTER TABLE "Transactions" ADD COLUMN "paymentTiming" "enum_Transactions_paymentTiming" DEFAULT NULL`
      );
    }

    // Add queueCalledAt column if not exists
    if (!tableDesc.queueCalledAt) {
      await queryInterface.addColumn('Transactions', 'queueCalledAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the queue number was called for pickup'
      });
    }

    // Add index for queue number lookup (ignore if exists)
    try {
      await queryInterface.addIndex('Transactions', ['tenantId', 'queueNumber', 'createdAt'], {
        name: 'idx_transactions_queue_lookup'
      });
    } catch (err) {
      if (!err.message.includes('already exists')) throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove index
    try {
      await queryInterface.removeIndex('Transactions', 'idx_transactions_queue_lookup');
    } catch (err) {
      // Index might not exist
    }
    
    // Remove columns
    const tableDesc = await queryInterface.describeTable('Transactions');
    
    if (tableDesc.queueCalledAt) {
      await queryInterface.removeColumn('Transactions', 'queueCalledAt');
    }
    if (tableDesc.paymentTiming) {
      await queryInterface.removeColumn('Transactions', 'paymentTiming');
    }
    if (tableDesc.queueNumber) {
      await queryInterface.removeColumn('Transactions', 'queueNumber');
    }
    
    // Remove ENUM type
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_Transactions_paymentTiming"`
    );
  }
};
