const { Sequelize } = require('sequelize');
const config = require('../src/config/config.js').development;

async function cleanup() {
  const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: false
  });

  try {
    console.log('🧹 Cleaning up partial migrations...\n');

    // 1. Check SequelizeMeta
    const [migrations] = await sequelize.query(
      `SELECT name FROM "SequelizeMeta" WHERE name LIKE '20251126%' ORDER BY name`
    );
    
    console.log('📋 Found migrations to remove:', migrations.map(m => m.name));

    // 2. Delete migration records
    await sequelize.query(`DELETE FROM "SequelizeMeta" WHERE name LIKE '20251126%'`);
    console.log('✅ Migration records deleted\n');

    // 3. Drop productDetails column if exists
    await sequelize.query(`ALTER TABLE "Products" DROP COLUMN IF EXISTS "productDetails"`);
    console.log('✅ productDetails column dropped\n');

    // 4. Drop new tables if they exist
    await sequelize.query(`DROP TABLE IF EXISTS "StockMovements" CASCADE`);
    await sequelize.query(`DROP TABLE IF EXISTS "RestaurantTables" CASCADE`);
    await sequelize.query(`DROP TABLE IF EXISTS "Locations" CASCADE`);
    await sequelize.query(`DROP TABLE IF EXISTS "ProductCategories" CASCADE`);
    console.log('✅ Partial tables dropped\n');

    console.log('✨ Cleanup complete! Ready for fresh migration.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

cleanup();
