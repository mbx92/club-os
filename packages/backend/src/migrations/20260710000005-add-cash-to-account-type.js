'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // PostgreSQL ENUM: add 'cash' value
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'enum_Accounts_type' AND e.enumlabel = 'cash'
        ) THEN
          ALTER TYPE "enum_Accounts_type" ADD VALUE 'cash';
        END IF;
      END$$;
    `);
  },

  async down(queryInterface) {
    // PostgreSQL cannot easily remove ENUM values; leave as no-op
  },
};
