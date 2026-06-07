const { sequelize } = require('./src/models');

async function checkEnums() {
  try {
    // Check current enum values
    const [enumValues] = await sequelize.query(`
      SELECT e.enumlabel 
      FROM pg_enum e 
      JOIN pg_type t ON e.enumtypid = t.oid 
      WHERE t.typname = 'enum_TransactionItems_itemType'
      ORDER BY e.enumsortorder;
    `);
    
    console.log('Current ENUM values:', enumValues.map(v => v.enumlabel));
    
    // Check data with discount/tax
    const [discountTaxRows] = await sequelize.query(`
      SELECT COUNT(*) as count, "itemType"
      FROM "TransactionItems" 
      WHERE "itemType" IN ('discount', 'tax')
      GROUP BY "itemType";
    `);
    
    console.log('\nRows with discount/tax:', discountTaxRows);
    
    // Check all itemTypes in use
    const [allTypes] = await sequelize.query(`
      SELECT DISTINCT "itemType", COUNT(*) as count
      FROM "TransactionItems"
      GROUP BY "itemType"
      ORDER BY count DESC;
    `);
    
    console.log('\nAll itemTypes in database:', allTypes);
    
    // Check for existing temp types
    const [tempTypes] = await sequelize.query(`
      SELECT typname FROM pg_type 
      WHERE typname LIKE '%TransactionItems_itemType%';
    `);
    
    console.log('\nExisting enum types:', tempTypes.map(t => t.typname));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkEnums();
