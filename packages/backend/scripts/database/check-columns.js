const { sequelize } = require('./src/models');

(async () => {
  try {
    // Check if columns exist
    const [results] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Transactions' 
      AND column_name IN ('paidAmount', 'changeAmount') 
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== CHECKING paidAmount & changeAmount COLUMNS ===');
    console.log('\nColumns found in database:');
    console.table(results);
    
    if (results.length === 0) {
      console.log('\n❌ Columns NOT FOUND in database!');
      console.log('\nPossible reasons:');
      console.log('1. Migration file not executed');
      console.log('2. Wrong database environment');
      console.log('3. Migration failed silently');
    } else {
      console.log(`\n✅ Found ${results.length} column(s) in database`);
      
      // Check last transaction
      const [transactions] = await sequelize.query(`
        SELECT id, "transactionNumber", "totalAmount", "paidAmount", "changeAmount", "createdAt" 
        FROM "Transactions" 
        ORDER BY "createdAt" DESC 
        LIMIT 1
      `);
      
      console.log('\nLast transaction data:');
      console.table(transactions);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
