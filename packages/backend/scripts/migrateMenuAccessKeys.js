/**
 * Migration script: Normalize menuAccess keys in Role.permissions JSON.
 * - Remaps legacy keys (finance → finances, pos → gym.pos, etc.)
 * - Removes stale keys (psychology, etc.)
 * - Expands parent keys to include all children
 * - Resets admin/owner with manage-all to full menu list
 *
 * Run: node packages/backend/scripts/migrateMenuAccessKeys.js
 */

const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const {
  normalizeMenuAccess,
  getMenuAccessForRole,
  hasManageAllRule,
} = require('../src/utils/menuKeys');

const DATABASE_URL = process.env.DATABASE_URL || process.env.DB_URL || '';
if (!DATABASE_URL) {
  console.error('DATABASE_URL or DB_URL not set in .env');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, { dialect: 'postgres', logging: false });

async function migrate() {
  await sequelize.authenticate();
  console.log('[migrateMenuAccessKeys] Connected to database');

  const [roles] = await sequelize.query(`SELECT id, name, permissions FROM "Roles"`);

  let updated = 0;
  for (const role of roles) {
    let perms = {};
    try {
      perms = typeof role.permissions === 'string'
        ? JSON.parse(role.permissions)
        : (role.permissions || {});
    } catch {
      perms = {};
    }

    const rules = perms.rules || [];
    const roleName = role.name?.toLowerCase();
    let newMenuAccess;

    if (hasManageAllRule(rules) || roleName === 'admin' || roleName === 'owner') {
      newMenuAccess = getMenuAccessForRole(roleName);
    } else if (Array.isArray(perms.menuAccess) && perms.menuAccess.length > 0) {
      newMenuAccess = normalizeMenuAccess(perms.menuAccess);
    } else {
      newMenuAccess = getMenuAccessForRole(roleName);
    }

    const oldJson = JSON.stringify(perms.menuAccess || []);
    const newJson = JSON.stringify(newMenuAccess);
    if (oldJson === newJson) {
      console.log(`  ⏩ "${role.name}" — menuAccess already up to date (${newMenuAccess.length} keys)`);
      continue;
    }

    perms.menuAccess = newMenuAccess;
    await sequelize.query(
      `UPDATE "Roles" SET permissions = :permissions, "updatedAt" = NOW() WHERE id = :id`,
      { replacements: { permissions: JSON.stringify(perms), id: role.id } }
    );
    console.log(`  ✓ "${role.name}" — menuAccess updated (${(perms.menuAccess || []).length} → ${newMenuAccess.length} keys)`);
    updated++;
  }

  console.log(`[migrateMenuAccessKeys] Done. Updated ${updated} role(s).`);
  await sequelize.close();
}

migrate().catch(err => {
  console.error('[migrateMenuAccessKeys] Failed:', err);
  process.exit(1);
});
