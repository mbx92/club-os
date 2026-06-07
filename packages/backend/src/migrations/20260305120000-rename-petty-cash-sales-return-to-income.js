'use strict';

/**
 * Rename PettyCashTransaction type 'sales_return' → 'income'
 * Clarification: "sales_return" implies customer refund (revenue reduction).
 * The correct concept for petty cash is "income" — money flowing IN from sales proceeds.
 * Actual sales returns (customer refunds) are handled by the Transaction refund system.
 */
module.exports = {
  async up(queryInterface) {
    // PostgreSQL: convert column to varchar, drop old enum, create new enum, convert back
    await queryInterface.sequelize.query(`
      ALTER TABLE "PettyCashTransactions"
        ALTER COLUMN type TYPE VARCHAR(50);
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_PettyCashTransactions_type";
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_PettyCashTransactions_type"
        AS ENUM('initial', 'top_up', 'expense', 'income', 'adjustment', 'withdrawal');
    `);

    // Migrate any existing 'sales_return' rows just in case
    await queryInterface.sequelize.query(`
      UPDATE "PettyCashTransactions" SET type = 'income' WHERE type = 'sales_return';
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "PettyCashTransactions"
        ALTER COLUMN type TYPE "enum_PettyCashTransactions_type"
        USING type::"enum_PettyCashTransactions_type";
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "PettyCashTransactions"
        ALTER COLUMN type TYPE VARCHAR(50);
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_PettyCashTransactions_type";
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_PettyCashTransactions_type"
        AS ENUM('initial', 'top_up', 'expense', 'sales_return', 'adjustment', 'withdrawal');
    `);

    await queryInterface.sequelize.query(`
      UPDATE "PettyCashTransactions" SET type = 'sales_return' WHERE type = 'income';
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "PettyCashTransactions"
        ALTER COLUMN type TYPE "enum_PettyCashTransactions_type"
        USING type::"enum_PettyCashTransactions_type";
    `);
  },
};
