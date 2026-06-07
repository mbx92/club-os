const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.development' });

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function checkSeeders() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    const [members] = await sequelize.query('SELECT COUNT(*) as count FROM "Members"');
    console.log(`\n📊 Members: ${members[0].count}`);

    const [servicePlans] = await sequelize.query('SELECT COUNT(*) as count FROM "ServicePlans"');
    console.log(`📊 Service Plans: ${servicePlans[0].count}`);

    const [memberDetails] = await sequelize.query(`
      SELECT "firstName", "lastName", "email", "phone", "membershipStatus" 
      FROM "Members" 
      LIMIT 5
    `);
    console.log('\n👥 Sample Members:');
    memberDetails.forEach(m => {
      console.log(`   - ${m.firstName} ${m.lastName} (${m.email}) - ${m.membershipStatus}`);
    });

    const [planDetails] = await sequelize.query(`
      SELECT "name", "serviceType", "price", "sessions", "duration" 
      FROM "ServicePlans" 
      ORDER BY "serviceType", "displayOrder" 
      LIMIT 10
    `);
    console.log('\n📋 Sample Service Plans:');
    planDetails.forEach(p => {
      const detail = p.sessions ? `${p.sessions} sessions` : `${p.duration} days`;
      console.log(`   - ${p.name} (${p.serviceType}) - Rp ${p.price.toLocaleString()} - ${detail}`);
    });

    await sequelize.close();
    console.log('\n✅ Check complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSeeders();
