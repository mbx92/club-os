'use strict';

/**
 * Revert PettyCashTransaction type enum: 'income' → 'sales_return'
 * 
 * sales_return = pengembalian modal petty cash dari hasil penjualan di shift tersebut.
 * Ini BUKAN customer refund — melainkan alur:
 *   1. Awal shift, petty cash dipakai untuk bayar expenses
 *   2. Akhir shift, uang dari penjualan digunakan untuk mengembalikan modal petty cash
 *   3. Transaksi pengembalian ini bertipe 'sales_return'
 */
module.exports = {
  async up(queryInterface) {
    // Step 1: Convert column to varchar temporarily
    await queryInterface.sequelize.query(`
      ALTER TABLE "PettyCashTransactions"
        ALTER COLUMN type TYPE VARCHAR(50);
    `);

    // Step 2: Drop existing enum
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_PettyCashTransactions_type";
    `);

    // Step 3: Create enum with sales_return (restored)
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_PettyCashTransactions_type"
        AS ENUM('initial', 'top_up', 'expense', 'sales_return', 'adjustment', 'withdrawal');
    `);

    // Step 4: Migrate existing 'income' rows back to 'sales_return'
    await queryInterface.sequelize.query(`
      UPDATE "PettyCashTransactions" SET type = 'sales_return' WHERE type = 'income';
    `);

    // Step 5: Convert column back to enum
    await queryInterface.sequelize.query(`
      ALTER TABLE "PettyCashTransactions"
        ALTER COLUMN type TYPE "enum_PettyCashTransactions_type"
        USING type::"enum_PettyCashTransactions_type";
    `);
  },

  async down(queryInterface) {
    // Undo: revert back to 'income'
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

    await queryInterface.sequelize.query(`
      UPDATE "PettyCashTransactions" SET type = 'income' WHERE type = 'sales_return';
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "PettyCashTransactions"
        ALTER COLUMN type TYPE "enum_PettyCashTransactions_type"
        USING type::"enum_PettyCashTransactions_type";
    `);
  },
};
