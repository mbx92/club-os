'use strict';

/**
 * Switch Account uniqueness to bank-first:
 *   - One account per bankName per tenant (BCA, MANDIRI, ...)
 *   - All payment methods with that bank detail credit the same account
 *   - Keep method-only unique for accounts without bankName (e_wallet, etc.)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS accounts_tenant_method_bank_unique;
    `);

    // One bank account per tenant+bankName
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX accounts_tenant_bank_unique
      ON "Accounts" ("tenantId", "bankName")
      WHERE "deletedAt" IS NULL
        AND "bankName" IS NOT NULL;
    `);

    // Method-only accounts (no bank) remain unique per paymentMethod
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX accounts_tenant_method_unique
      ON "Accounts" ("tenantId", "paymentMethod")
      WHERE "deletedAt" IS NULL
        AND "paymentMethod" IS NOT NULL
        AND "bankName" IS NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS accounts_tenant_bank_unique;`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS accounts_tenant_method_unique;`);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX accounts_tenant_method_bank_unique
      ON "Accounts" ("tenantId", "paymentMethod", "bankName")
      WHERE "deletedAt" IS NULL
        AND "paymentMethod" IS NOT NULL;
    `);
  },
};
