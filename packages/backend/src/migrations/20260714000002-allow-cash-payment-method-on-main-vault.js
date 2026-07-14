'use strict';

/**
 * Allow both Tunai (cash) and Brankas Utama (main_vault) to use paymentMethod='cash'.
 * Method uniqueness is only needed for POS auto-match accounts (e_wallet, etc.).
 * Cash POS never auto-matches (EXCLUDED_PAYMENT_METHODS); one-per-tenant is enforced in app code.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS accounts_tenant_method_unique;
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX accounts_tenant_method_unique
      ON "Accounts" ("tenantId", "paymentMethod")
      WHERE "deletedAt" IS NULL
        AND "paymentMethod" IS NOT NULL
        AND "bankName" IS NULL
        AND "type" NOT IN ('cash', 'main_vault');
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS accounts_tenant_method_unique;
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX accounts_tenant_method_unique
      ON "Accounts" ("tenantId", "paymentMethod")
      WHERE "deletedAt" IS NULL
        AND "paymentMethod" IS NOT NULL
        AND "bankName" IS NULL;
    `);
  },
};
