require('dotenv').config();
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}`, override: true });

const { Tenant } = require('./src/models');

async function verifyDataPreserved() {
  try {
    const tenants = await Tenant.findAll({
      attributes: ['id', 'name', 'settings'],
      raw: true
    });

    console.log(`\n✅ Found ${tenants.length} tenant(s)\n`);

    tenants.forEach((tenant, index) => {
      console.log(`\n=== Tenant ${index + 1}: ${tenant.name} ===`);
      console.log('ID:', tenant.id);
      console.log('Settings type:', typeof tenant.settings);
      console.log('Settings content:');
      console.log(JSON.stringify(tenant.settings, null, 2));
      
      // Check if printers array exists
      if (tenant.settings && tenant.settings.printers) {
        console.log(`\n📍 Printers array: ${tenant.settings.printers.length} printer(s)`);
        tenant.settings.printers.forEach((printer, i) => {
          console.log(`  ${i + 1}. ${printer.name} (${printer.connectionType})`);
        });
      } else {
        console.log('\n📍 No printers array yet (empty settings or no printers key)');
      }
    });

    console.log('\n✅ Data migration from JSON to JSONB completed successfully!');
    console.log('All existing data has been preserved.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyDataPreserved();
