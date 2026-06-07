/**
 * Quick script to fix orphan/duplicate migrations in SequelizeMeta
 * 
 * Problem: Some migrations were renamed after being run, causing:
 * - Orphan entries in SequelizeMeta (old name, file doesn't exist)
 * - Pending migrations (new name, file exists but already ran under old name)
 * 
 * This script marks the renamed migrations as "already run" so sequelize doesn't try to run them again.
 */

const { Sequelize } = require('sequelize');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, `../.env.${process.env.NODE_ENV || 'development'}`) });

const config = require('../src/config/config')[process.env.NODE_ENV || 'development'];

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: false,
});

async function fixMigrations() {
  console.log('🔧 Fixing duplicate/renamed migrations in SequelizeMeta...\n');
  console.log(`Database: ${config.database}`);
  console.log(`Host: ${config.host}:${config.port}\n`);

  // Migrations that were renamed and should be marked as already run
  // (because the old version ran and table/columns already exist)
  const migrationsToAdd = [
    '20251128010009-create-printer-settings.js',      // Renamed from 20251128010000-create-printer-settings.js
    '20251129100002-add-ip-useragent-to-psychology-sessions.js', // Renamed from 20251129100001-...
  ];

  for (const m of migrationsToAdd) {
    try {
      const [result] = await sequelize.query(
        `INSERT INTO "SequelizeMeta" (name) VALUES (:name) ON CONFLICT DO NOTHING`,
        { replacements: { name: m } }
      );
      console.log(`✅ Added: ${m}`);
    } catch (err) {
      console.error(`❌ Error adding ${m}: ${err.message}`);
    }
  }

  // Optional: Remove orphan entries (migrations in DB but file doesn't exist)
  // Uncomment if you want to clean these up too
  /*
  const orphansToRemove = [
    '20251128010000-create-printer-settings.js',
    '20251129100001-add-ip-useragent-to-psychology-sessions.js',
  ];

  for (const m of orphansToRemove) {
    try {
      await sequelize.query(
        `DELETE FROM "SequelizeMeta" WHERE name = :name`,
        { replacements: { name: m } }
      );
      console.log(`🗑️  Removed orphan: ${m}`);
    } catch (err) {
      console.error(`❌ Error removing ${m}: ${err.message}`);
    }
  }
  */

  await sequelize.close();
  console.log('\n✅ Done! Run npm run migration:check to verify.');
}

fixMigrations().catch(console.error);
