'use strict';

/**
 * Ensure Cashier/Manager roles can access staff attendance API.
 * Some deployments still have legacy permissions without StaffAttendance.
 */
module.exports = {
  async up(queryInterface) {
    const [roles] = await queryInterface.sequelize.query(
      'SELECT id, name, permissions FROM "Roles" WHERE lower(name) IN (\'cashier\', \'manager\')'
    );

    for (const role of roles) {
      const permissions = typeof role.permissions === 'string'
        ? JSON.parse(role.permissions)
        : (role.permissions || {});

      const resources = { ...(permissions.resources || {}) };
      const roleKey = String(role.name || '').toLowerCase();
      const requiredActions = roleKey === 'manager'
        ? ['read', 'create', 'update']
        : ['read'];

      const current = Array.isArray(resources.StaffAttendance) ? resources.StaffAttendance : [];
      const merged = [...new Set([...current, ...requiredActions])];

      if (merged.length === current.length && current.length > 0) {
        continue;
      }

      resources.StaffAttendance = merged;

      const menuAccess = Array.isArray(permissions.menuAccess) ? [...permissions.menuAccess] : [];
      for (const key of ['back-office.attendance', 'back-office.attendance-report']) {
        if (!menuAccess.includes(key)) menuAccess.push(key);
      }

      permissions.resources = resources;
      permissions.menuAccess = menuAccess;

      await queryInterface.sequelize.query(
        'UPDATE "Roles" SET permissions = :permissions, "updatedAt" = NOW() WHERE id = :id',
        {
          replacements: {
            id: role.id,
            permissions: JSON.stringify(permissions),
          },
        }
      );
    }
  },

  async down() {
    // Non-destructive data fix — no rollback.
  },
};
