/**
 * Migration script: Rename caslRules → rules in existing Role.permissions JSON rows.
 *
 * Run: node packages/backend/scripts/migrateCaslRulesToRules.js
 *
 * Idempoten — skips rows that already use 'rules'.
 */
const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.DB_URL || '';
if (!DATABASE_URL) {
  console.error('DATABASE_URL or DB_URL not set in .env');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    const [roles] = await sequelize.query(`SELECT id, name, permissions FROM "Roles"`);

    let updated = 0;
    let skipped = 0;

    for (const role of roles) {
      let perms = role.permissions;
      if (typeof perms === 'string') {
        try { perms = JSON.parse(perms); } catch { continue; }
      }
      if (!perms || typeof perms !== 'object') continue;
      if (!perms.caslRules) {
        skipped++;
        continue;
      }

      // Rename caslRules → rules
      perms.rules = perms.caslRules;
      delete perms.caslRules;

      await sequelize.query(
        `UPDATE "Roles" SET permissions = :perms, "updatedAt" = NOW() WHERE id = :id`,
        { replacements: { perms: JSON.stringify(perms), id: role.id } }
      );
      updated++;
      console.log(`  ✓ ${role.name} migrated`);
    }

    console.log(`\nDone. ${updated} roles migrated, ${skipped} skipped.`);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();
