const { sequelize } = require('./src/models');

async function cleanupDiscountTax() {
  try {
    console.log('Deleting discount and tax items from TransactionItems...');
    
    const [result] = await sequelize.query(`
      DELETE FROM "TransactionItems" 
      WHERE "itemType"::text IN ('discount', 'tax')
      RETURNING id;
    `);
    
    console.log(`Deleted ${result.length} rows with itemType 'discount' or 'tax'`);
    
    // Verify
    const [count] = await sequelize.query(`
      SELECT COUNT(*) as total FROM "TransactionItems";
    `);
    
    console.log(`\nRemaining TransactionItems: ${count[0].total}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

cleanupDiscountTax();
