'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create ENUM type first (PostgreSQL), ignore if already exists
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_PettyCashTransactions_fundSource"
          AS ENUM ('owner_cash', 'bank_transfer', 'revenue', 'other');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.addColumn('PettyCashTransactions', 'fundSource', {
      type: Sequelize.ENUM('owner_cash', 'bank_transfer', 'revenue', 'other'),
      allowNull: true,
      defaultValue: null
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('PettyCashTransactions', 'fundSource');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_PettyCashTransactions_fundSource";'
    );
  }
};
