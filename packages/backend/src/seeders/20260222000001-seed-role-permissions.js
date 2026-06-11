'use strict';

/**
 * Seeder: Seed default RBAC permissions into existing Roles
 *
 * Mengisi kolom `permissions` (JSON) pada setiap Role dengan:
 *   - rules      : array aturan RBAC dari defaultRolePermissions
 *   - uiFlags    : flag UI (canManageUsers, canViewLogs, …)
 *   - menuAccess : daftar menu key yang boleh diakses
 *
 * Berjalan idempoten: hanya update role yang belum memiliki rules.
 */

const { DEFAULT_ROLE_PERMISSIONS } = require('../../src/utils/defaultRolePermissions');

module.exports = {
  async up(queryInterface) {
    // Ambil semua role dari database
    const [roles] = await queryInterface.sequelize.query(
      `SELECT id, name, permissions FROM "Roles";`
    );

    for (const role of roles) {
      // Case-insensitive lookup + aliases so "Cashier"→"cashier", "Member"→"user"
      const ALIASES = { member: 'user' };
      const key = role.name.toLowerCase();
      const defaults = DEFAULT_ROLE_PERMISSIONS[role.name]
        || DEFAULT_ROLE_PERMISSIONS[key]
        || DEFAULT_ROLE_PERMISSIONS[ALIASES[key]];
      if (!defaults) {
        console.log(`[seed-role-permissions] Skipping "${role.name}" — no defaults defined`);
        continue;
      }

      // Parse existing permissions (bisa string JSON atau objek)
      let existing = {};
      try {
        existing = typeof role.permissions === 'string'
          ? JSON.parse(role.permissions)
          : (role.permissions || {});
      } catch (_) {
        existing = {};
      }

      // Hanya isi jika belum ada rules
      if (Array.isArray(existing.rules) && existing.rules.length > 0) {
        console.log(`[seed-role-permissions] "${role.name}" already has rules — skipping`);
        continue;
      }

      const newPermissions = {
        ...existing,
        rules:      defaults.rules,
        uiFlags:    defaults.uiFlags,
        menuAccess: defaults.menuAccess,
      };

      await queryInterface.sequelize.query(
        `UPDATE "Roles" SET permissions = :permissions, "updatedAt" = NOW() WHERE id = :id`,
        {
          replacements: {
            permissions: JSON.stringify(newPermissions),
            id: role.id,
          },
        }
      );

      console.log(`[seed-role-permissions] ✓ "${role.name}" permissions seeded (${defaults.rules.length} rules)`);
    }
  },

  async down(queryInterface) {
    // Hapus rules, uiFlags, menuAccess dari semua role (reset ke kosong)
    const [roles] = await queryInterface.sequelize.query(
      `SELECT id, name, permissions FROM "Roles";`
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

      const cleaned = { ...existing };
      delete cleaned.rules;
      delete cleaned.uiFlags;
      delete cleaned.menuAccess;

      await queryInterface.sequelize.query(
        `UPDATE "Roles" SET permissions = :permissions, "updatedAt" = NOW() WHERE id = :id`,
        {
          replacements: {
            permissions: JSON.stringify(cleaned),
            id: role.id,
          },
        }
      );
    }

    console.log('[seed-role-permissions] Rollback complete — rules removed from all roles');
  },
};
