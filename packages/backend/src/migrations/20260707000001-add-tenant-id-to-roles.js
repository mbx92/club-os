'use strict';

/**
 * RBAC-01 fix: Roles were previously 100% global (no tenantId), shared by
 * every tenant on the platform, with a hard unique constraint on `name`.
 * Combined with tenant Admin/Owner bypassing permission checks, this let
 * any tenant Admin edit or delete a role used by every other tenant.
 *
 * This migration adds a nullable `tenantId`:
 *   - tenantId = NULL   -> shared system/default role (admin, manager, ...),
 *                          editable only by Super Admin from now on.
 *   - tenantId = <uuid> -> tenant-owned custom role, editable only by that
 *                          tenant's Admin/Owner (and Super Admin).
 *
 * The old single-column unique index on `name` is replaced with two partial
 * unique indexes so system role names stay globally unique, while each
 * tenant can have its own independently-named custom roles.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Roles', 'tenantId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Tenants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addIndex('Roles', ['tenantId'], {
      name: 'roles_tenant_id_idx',
    });

    // Backfill: any role whose name is NOT one of the shipped system
    // defaults is likely a tenant-created custom role. If exactly one
    // tenant's users reference it, attribute the role to that tenant so
    // existing custom roles don't get accidentally locked to Super Admin
    // only once write access is restricted below. Roles with zero or
    // multiple tenants using them are left as system-owned (tenantId NULL)
    // for a Super Admin to review manually.
    await queryInterface.sequelize.query(`
      UPDATE "Roles" r
      SET "tenantId" = sub.tenant_id
      FROM (
        SELECT u."roleId" AS role_id, u."tenantId" AS tenant_id
        FROM "Users" u
        WHERE u."tenantId" IS NOT NULL
        GROUP BY u."roleId", u."tenantId"
      ) sub
      WHERE r.id = sub.role_id
        AND LOWER(r.name) NOT IN (
          'admin', 'owner', 'manager', 'cashier', 'staff', 'trainer', 'kitchen', 'waiter', 'user', 'member'
        )
        AND (
          SELECT COUNT(DISTINCT u2."tenantId")
          FROM "Users" u2
          WHERE u2."roleId" = r.id AND u2."tenantId" IS NOT NULL
        ) = 1;
    `);

    // Drop the old blanket-unique constraint on `name` (name comes from the
    // original create-role migration as `unique: true`, which Postgres
    // implements as a unique index named "Roles_name_key" by default).
    try {
      await queryInterface.removeIndex('Roles', 'Roles_name_key');
    } catch (err) {
      // Index name can vary across environments/migration history — fall back
      // to removing the constraint by column if the default index name isn't found.
      await queryInterface.sequelize.query(
        'ALTER TABLE "Roles" DROP CONSTRAINT IF EXISTS "Roles_name_key";'
      );
    }

    // System roles (tenantId IS NULL) must keep globally-unique names.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX roles_system_name_unique
      ON "Roles" (name)
      WHERE "tenantId" IS NULL;
    `);

    // Tenant-owned custom roles only need to be unique within their tenant.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX roles_tenant_name_unique
      ON "Roles" (name, "tenantId")
      WHERE "tenantId" IS NOT NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS roles_tenant_name_unique;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS roles_system_name_unique;');
    await queryInterface.removeIndex('Roles', 'roles_tenant_id_idx');
    await queryInterface.removeColumn('Roles', 'tenantId');
    await queryInterface.addConstraint('Roles', {
      fields: ['name'],
      type: 'unique',
      name: 'Roles_name_key',
    });
  },
};
