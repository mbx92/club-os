/**
 * Check CFIT Raw Data
 */

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const { Sequelize } = require('sequelize');

const config = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: false
};

async function checkRaw() {
  const sequelize = new Sequelize(config);

  try {
    await sequelize.authenticate();
    
    const [results] = await sequelize.query(`
      SELECT questions
      FROM "PsychologyTestTypes"
      WHERE code = 'CFIT'
      AND "tenantId" = 'cfb6ff5b-5e05-4a94-95c5-4584db9ac6d1'
    `);

    const questions = results[0].questions;
    
    // Show first instruction
    const firstInstruction = questions.find(q => q.type === 'instruction');
    
    console.log('First Instruction Object:');
    console.log(JSON.stringify(firstInstruction, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkRaw();
