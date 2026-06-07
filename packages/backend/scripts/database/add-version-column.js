const { Sequelize } = require('sequelize');
require('dotenv').config();
require('dotenv').config({ path: '.env.development' });

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  logging: false
});

async function addVersionColumn() {
  try {
    await sequelize.query('ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0');
    console.log('✅ Column "version" added successfully to Transactions table');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

addVersionColumn();
