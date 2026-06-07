'use strict';

module.exports = {
  async up(queryInterface) {
    // Drop old unique indexes that don't account for soft-deleted rows
    await queryInterface.removeIndex('Trainers', 'trainers_tenant_email_unique');
    await queryInterface.removeIndex('Trainers', 'trainers_tenant_phone_unique');

    // Re-create as partial unique indexes (only enforce uniqueness for non-deleted rows)
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX "trainers_tenant_email_unique"
      ON "Trainers" ("tenantId", "email")
      WHERE "deletedAt" IS NULL AND "email" IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX "trainers_tenant_phone_unique"
      ON "Trainers" ("tenantId", "phone")
      WHERE "deletedAt" IS NULL AND "phone" IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    // Drop partial indexes
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "trainers_tenant_email_unique"`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "trainers_tenant_phone_unique"`);

    // Restore original non-partial unique indexes
    await queryInterface.addIndex('Trainers', ['tenantId', 'email'], {
      unique: true,
      name: 'trainers_tenant_email_unique',
    });
    await queryInterface.addIndex('Trainers', ['tenantId', 'phone'], {
      unique: true,
      name: 'trainers_tenant_phone_unique',
    });
  },
};
