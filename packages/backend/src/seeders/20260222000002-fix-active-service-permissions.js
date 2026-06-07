'use strict';

/**
 * Seeder: Fix ActiveService permissions for cashier, manager, trainer roles
 *
 * Masalah: Route POST /services/purchase membutuhkan authorizeCasl('create', 'ActiveService')
 * tapi role cashier & manager hanya punya 'read' → Forbidden by CASL policy
 *
 * Fix:
 *   - cashier  : tambah create, update, delete ActiveService
 *   - manager  : tambah manage ActiveService
 *   - trainer  : tambah update ActiveService
 *
 * Berjalan idempoten: hanya update jika ActiveService.create belum ada.
 */

const { DEFAULT_ROLE_PERMISSIONS } = require('../../src/utils/defaultRolePermissions');

const ROLES_TO_FIX = ['cashier', 'manager', 'trainer', 'Cashier', 'Manager', 'Trainer'];

module.exports = {
  async up(queryInterface) {
    console.log('[fix-active-service-permissions] Starting...');

    const [roles] = await queryInterface.sequelize.query(
      `SELECT id, name, permissions FROM "Roles" WHERE LOWER(name) IN ('cashier','manager','trainer');`
    );

    for (const role of roles) {
      const ALIASES = { member: 'user' };
      const key = role.name.toLowerCase();
      const defaults = DEFAULT_ROLE_PERMISSIONS[role.name]
        || DEFAULT_ROLE_PERMISSIONS[key]
        || DEFAULT_ROLE_PERMISSIONS[ALIASES[key]];

      if (!defaults) {
        console.log(`[fix-active-service-permissions] Skipping "${role.name}" — no defaults defined`);
        continue;
      }

      let existing = {};
      try {
        existing = typeof role.permissions === 'string'
          ? JSON.parse(role.permissions)
          : (role.permissions || {});
      } catch (_) {
        existing = {};
      }

      // Cek apakah sudah punya ActiveService create/manage
      const caslRules = existing.caslRules || [];
      const alreadyFixed = caslRules.some(
        r => r.subject === 'ActiveService' && (r.action === 'create' || r.action === 'manage')
      );

      if (alreadyFixed) {
        console.log(`[fix-active-service-permissions] "${role.name}" already fixed — skipping`);
        continue;
      }

      const newPermissions = {
        ...existing,
        caslRules:  defaults.caslRules,
        uiFlags:    defaults.uiFlags,
        menuAccess: defaults.menuAccess,
      };

      await queryInterface.sequelize.query(
        `UPDATE "Roles" SET permissions = :permissions, "updatedAt" = NOW() WHERE id = :id`,
        { replacements: { permissions: JSON.stringify(newPermissions), id: role.id } }
      );

      const ruleCount = defaults.caslRules.length;
      console.log(`[fix-active-service-permissions] ✓ "${role.name}" updated (${ruleCount} rules)`);
    }

    console.log('[fix-active-service-permissions] Done.');
  },

  async down(queryInterface) {
    // Rollback: hapus create/update/delete ActiveService, kembalikan ke read-only
    const [roles] = await queryInterface.sequelize.query(
      `SELECT id, name, permissions FROM "Roles" WHERE LOWER(name) IN ('cashier','manager','trainer');`
    );

    for (const role of roles) {
      let existing = {};
      try {
        existing = typeof role.permissions === 'string'
          ? JSON.parse(role.permissions)
          : (role.permissions || {});
      } catch (_) {
        existing = {};
      }

      const cleaned = {
        ...existing,
        caslRules: (existing.caslRules || []).filter(
          r => !(r.subject === 'ActiveService' && r.action !== 'read')
        ),
      };

      await queryInterface.sequelize.query(
        `UPDATE "Roles" SET permissions = :permissions, "updatedAt" = NOW() WHERE id = :id`,
        { replacements: { permissions: JSON.stringify(cleaned), id: role.id } }
      );
    }

    console.log('[fix-active-service-permissions] Rollback complete');
  },
};
