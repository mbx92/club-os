'use strict';

/**
 * Seeder: Fix stale menuAccess on existing roles.
 *
 * Beberapa role (cashier dkk) dibuat sebelum ROLE_MENU_MAP didefinisikan
 * dengan spesifik sub-keys. Mereka menyimpan parent-only keys seperti
 * ['dashboard', 'pos', 'restaurant', 'gym'] yang setelah expandParentMenuKeys
 * memberi akses ke SEMUA child menu.
 *
 * Seeder ini menyelaraskan menuAccess ke nilai dari ROLE_MENU_MAP
 * di utils/menuKeys.js.  Idempoten — aman dijalankan ulang.
 */

const { ROLE_MENU_MAP, normalizeMenuAccess } = require('../../src/utils/menuKeys');

module.exports = {
  async up(queryInterface) {
    const [roles] = await queryInterface.sequelize.query(
      `SELECT id, name, permissions FROM "Roles";`
    );

    let fixed = 0;

    for (const role of roles) {
      const roleName = (role.name || '').toLowerCase();
      const template = ROLE_MENU_MAP[roleName];
      if (!template || template.length === 0) continue;

      let perms = {};
      try {
        perms = typeof role.permissions === 'string'
          ? JSON.parse(role.permissions)
          : (role.permissions || {});
      } catch (_) {
        perms = {};
      }

      const currentMenu = perms.menuAccess || [];
      // Check if current menuAccess looks like it needs fixing:
      //   - empty (template exists but wasn't applied)
      //   - contains parent-only keys like 'pos', 'restaurant', 'gym' without sub-keys
      //   - significantly shorter than the template (likely a minimal old seeder value)
      const hasParentOnlyKeys = currentMenu.some(k =>
        typeof k === 'string' && !k.includes('.') && k !== 'dashboard' && k !== 'vouchers'
      );

      const normalized = normalizeMenuAccess(template);

      if (currentMenu.length === 0 || hasParentOnlyKeys || currentMenu.length < normalized.length * 0.5) {
        perms.menuAccess = normalized;

        await queryInterface.sequelize.query(
          `UPDATE "Roles" SET permissions = :permissions, "updatedAt" = NOW() WHERE id = :id`,
          {
            replacements: {
              permissions: JSON.stringify(perms),
              id: role.id,
            },
          }
        );

        console.log(`[fix-role-menu-access] ✓ "${role.name}" menuAccess fixed (${currentMenu.length}→${normalized.length} keys)`);
        fixed++;
      } else {
        console.log(`[fix-role-menu-access] · "${role.name}" menuAccess already OK (${currentMenu.length} keys)`);
      }
    }

    console.log(`[fix-role-menu-access] Done — fixed ${fixed} role(s)`);
  },

  async down(queryInterface) {
    // Rollback tidak diperlukan — menuAccess akan dikelola oleh admin UI
    console.log('[fix-role-menu-access] Rollback skipped (no destructive changes)');
  },
};
