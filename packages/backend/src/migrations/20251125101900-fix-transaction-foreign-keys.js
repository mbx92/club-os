'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Fix TransactionItems.transactionId
      // Try to drop foreign key constraint (may not exist)
      try {
        await queryInterface.sequelize.query(
          `ALTER TABLE "TransactionItems" DROP CONSTRAINT IF EXISTS "TransactionItems_transactionId_fkey";`,
          { transaction }
        );
      } catch (err) {
        console.log('No constraint to drop for TransactionItems');
      }
      
      // Change column type to UUID using USING clause for casting
      await queryInterface.sequelize.query(
        `ALTER TABLE "TransactionItems" ALTER COLUMN "transactionId" TYPE UUID USING "transactionId"::uuid;`,
        { transaction }
      );
      
      // Re-add foreign key constraint
      await queryInterface.sequelize.query(
        `ALTER TABLE "TransactionItems" ADD CONSTRAINT "TransactionItems_transactionId_fkey" 
         FOREIGN KEY ("transactionId") REFERENCES "Transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
        { transaction }
      );

      // Fix TransactionPayments.transactionId
      // Try to drop foreign key constraint (may not exist)
      try {
        await queryInterface.sequelize.query(
          `ALTER TABLE "TransactionPayments" DROP CONSTRAINT IF EXISTS "TransactionPayments_transactionId_fkey";`,
          { transaction }
        );
      } catch (err) {
        console.log('No constraint to drop for TransactionPayments');
      }
      
      // Change column type to UUID using USING clause for casting
      await queryInterface.sequelize.query(
        `ALTER TABLE "TransactionPayments" ALTER COLUMN "transactionId" TYPE UUID USING "transactionId"::uuid;`,
        { transaction }
      );
      
      // Re-add foreign key constraint
      await queryInterface.sequelize.query(
        `ALTER TABLE "TransactionPayments" ADD CONSTRAINT "TransactionPayments_transactionId_fkey" 
         FOREIGN KEY ("transactionId") REFERENCES "Transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // No rollback - we don't want to convert UUID back to VARCHAR
    console.log('No rollback for fixing UUID types');
  }
};
