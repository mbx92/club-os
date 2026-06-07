require('dotenv').config();
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}`, override: true });

const { sequelize } = require('./src/models');

async function checkSettingsColumn() {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        column_name,
        data_type,
        udt_name
      FROM information_schema.columns
      WHERE table_name = 'Tenants'
        AND column_name = 'settings'
    `);

    console.log('Settings column info:');
    console.table(results);

    // Check actual value
    const [tenant] = await sequelize.query(`
      SELECT 
        id,
        name,
        pg_typeof(settings) as settings_type,
        settings
      FROM "Tenants"
      LIMIT 1
    `);

    console.log('\nSample tenant with settings type:');
    console.table(tenant);

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSettingsColumn();
