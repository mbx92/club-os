#!/usr/bin/env node
'use strict';

/**
 * Fix split orders that have completedAt = null
 * These were created before the fix was deployed
 */
const db = require('../src/models');

(async () => {
  try {
    const [rows] = await db.sequelize.query(
      `UPDATE "Transactions" 
       SET "completedAt" = "updatedAt" 
       WHERE status = 'split' AND "completedAt" IS NULL 
       RETURNING id, "transactionNumber", "completedAt"`
    );
    
    console.log(`Fixed ${rows.length} split order(s):`);
    rows.forEach(r => console.log(`  - ${r.transactionNumber} → completedAt: ${r.completedAt}`));
    
    if (rows.length === 0) {
      console.log('  No orders needed fixing.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
})();
