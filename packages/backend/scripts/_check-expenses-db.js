#!/usr/bin/env node
'use strict';

// Quick diagnostic: check Expenses table structure in connected DB
const { sequelize } = require('../src/models');

async function main() {
  try {
    const [dbInfo] = await sequelize.query('SELECT current_database(), inet_server_addr(), inet_server_port();');
    console.log('=== DB INFO ===');
    console.log(JSON.stringify(dbInfo[0]));

    const [cols] = await sequelize.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='Expenses' ORDER BY ordinal_position;`
    );
    console.log('\n=== KOLOM Expenses ===');
    cols.forEach(r => console.log(` ${r.column_name.padEnd(25)} ${r.data_type}`));

    const hasBankName = cols.some(c => c.column_name === 'bankName');
    console.log('\nbankName exists:', hasBankName);

    const pmType = cols.find(c => c.column_name === 'paymentMethod');
    console.log('paymentMethod type:', pmType ? pmType.data_type : 'NOT FOUND');

    const [migs] = await sequelize.query(
      `SELECT name FROM "SequelizeMeta" WHERE name LIKE '%expense%' OR name LIKE '%bankname%' ORDER BY name;`
    );
    console.log('\n=== MIGRATION RECORDS ===');
    migs.forEach(r => console.log(' ' + r.name));
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await sequelize.close();
  }
}

main();
