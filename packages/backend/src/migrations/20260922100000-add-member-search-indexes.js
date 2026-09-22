'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();

    await queryInterface.addIndex('Members', ['tenantId', 'membershipStatus'], {
      name: 'members_tenant_id_membership_status_idx'
    }).catch(() => {});

    await queryInterface.addIndex('Members', ['tenantId', 'isActive'], {
      name: 'members_tenant_id_is_active_idx'
    }).catch(() => {});

    if (dialect === 'postgres') {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS members_firstname_trgm_idx
        ON "Members" USING gin ("firstName" gin_trgm_ops);
      `);
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS members_lastname_trgm_idx
        ON "Members" USING gin ("lastName" gin_trgm_ops);
      `);
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS members_email_trgm_idx
        ON "Members" USING gin ("email" gin_trgm_ops);
      `);
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS members_phone_trgm_idx
        ON "Members" USING gin ("phone" gin_trgm_ops);
      `);
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS members_fullname_trgm_idx
        ON "Members" USING gin (
          (COALESCE("firstName", '') || ' ' || COALESCE("lastName", '')) gin_trgm_ops
        );
      `);
    }
  },

  async down(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();

    await queryInterface.removeIndex('Members', 'members_tenant_id_membership_status_idx').catch(() => {});
    await queryInterface.removeIndex('Members', 'members_tenant_id_is_active_idx').catch(() => {});

    if (dialect === 'postgres') {
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS members_firstname_trgm_idx;');
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS members_lastname_trgm_idx;');
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS members_email_trgm_idx;');
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS members_phone_trgm_idx;');
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS members_fullname_trgm_idx;');
    }
  }
};
