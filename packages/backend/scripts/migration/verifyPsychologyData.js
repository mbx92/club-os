/**
 * Psychology Data Verification Script
 * 
 * Verifies data integrity after migration from gym database to psychology database.
 * 
 * Usage:
 *   node scripts/migration/verifyPsychologyData.js
 *   node scripts/migration/verifyPsychologyData.js --verbose
 */

const { Sequelize, QueryTypes } = require('sequelize');
const winston = require('winston');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/psychology-verification.log' })
  ]
});

const verbose = process.argv.includes('--verbose');

// Database connections
const sourceDb = new Sequelize(
  process.env.SOURCE_DB_NAME || 'gym_dev',
  process.env.SOURCE_DB_USER || 'root',
  process.env.SOURCE_DB_PASSWORD || '',
  {
    host: process.env.SOURCE_DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  }
);

const targetDb = new Sequelize(
  process.env.TARGET_DB_NAME || 'psychology_dev',
  process.env.TARGET_DB_USER || 'root',
  process.env.TARGET_DB_PASSWORD || '',
  {
    host: process.env.TARGET_DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  }
);

// Verification results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

/**
 * Verify table record counts match
 */
async function verifyRecordCounts() {
  logger.info('Verifying record counts...');
  
  const tables = [
    'PsychologyTestTypes',
    'PsychologyPackages',
    'PsychologyPackageItems',
    'PsychologyPriceRules',
    'PsychologyOrders',
    'PsychologyInvitations',
    'PsychologySessions',
    'PsychologyNorms',
    'PsychologySettings',
    'PsychologyReportCache'
  ];

  for (const table of tables) {
    try {
      const [sourceCount] = await sourceDb.query(
        `SELECT COUNT(*) as count FROM ${table}`,
        { type: QueryTypes.SELECT }
      );

      const [targetCount] = await targetDb.query(
        `SELECT COUNT(*) as count FROM ${table}`,
        { type: QueryTypes.SELECT }
      );

      const sourceTotal = sourceCount.count;
      const targetTotal = targetCount.count;

      if (sourceTotal === targetTotal) {
        results.passed.push(`${table}: ${targetTotal} records`);
        if (verbose) {
          logger.info(`✓ ${table}: ${targetTotal} records match`);
        }
      } else {
        results.failed.push(
          `${table}: Source has ${sourceTotal}, Target has ${targetTotal}`
        );
        logger.error(`✗ ${table}: Record count mismatch!`);
      }
    } catch (error) {
      results.failed.push(`${table}: Error checking counts - ${error.message}`);
      logger.error(`✗ ${table}: ${error.message}`);
    }
  }
}

/**
 * Verify foreign key integrity
 */
async function verifyForeignKeys() {
  logger.info('Verifying foreign key integrity...');

  const checks = [
    {
      table: 'PsychologyOrders',
      column: 'patientId',
      refTable: 'Patients',
      name: 'PsychologyOrders.patientId → Patients'
    },
    {
      table: 'PsychologyOrders',
      column: 'packageId',
      refTable: 'PsychologyPackages',
      name: 'PsychologyOrders.packageId → PsychologyPackages'
    },
    {
      table: 'PsychologyOrders',
      column: 'priceRuleId',
      refTable: 'PsychologyPriceRules',
      name: 'PsychologyOrders.priceRuleId → PsychologyPriceRules'
    },
    {
      table: 'PsychologySessions',
      column: 'orderId',
      refTable: 'PsychologyOrders',
      name: 'PsychologySessions.orderId → PsychologyOrders'
    },
    {
      table: 'PsychologyPackageItems',
      column: 'packageId',
      refTable: 'PsychologyPackages',
      name: 'PsychologyPackageItems.packageId → PsychologyPackages'
    },
    {
      table: 'PsychologyPackageItems',
      column: 'testTypeId',
      refTable: 'PsychologyTestTypes',
      name: 'PsychologyPackageItems.testTypeId → PsychologyTestTypes'
    }
  ];

  for (const check of checks) {
    try {
      const [orphans] = await targetDb.query(`
        SELECT COUNT(*) as count
        FROM ${check.table} t
        WHERE t.${check.column} IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM ${check.refTable} r
          WHERE r.id = t.${check.column}
        )
      `, { type: QueryTypes.SELECT });

      if (orphans.count === 0) {
        results.passed.push(`FK: ${check.name} - OK`);
        if (verbose) {
          logger.info(`✓ FK: ${check.name} - No orphans`);
        }
      } else {
        results.failed.push(`FK: ${check.name} - ${orphans.count} orphaned records`);
        logger.error(`✗ FK: ${check.name} - ${orphans.count} orphaned records!`);
      }
    } catch (error) {
      results.failed.push(`FK: ${check.name} - Error: ${error.message}`);
      logger.error(`✗ FK: ${check.name} - ${error.message}`);
    }
  }
}

/**
 * Verify tenant data integrity
 */
async function verifyTenantData() {
  logger.info('Verifying tenant data integrity...');

  try {
    // Check that all psychology orders have valid tenants
    const [invalidTenants] = await targetDb.query(`
      SELECT COUNT(*) as count
      FROM PsychologyOrders po
      LEFT JOIN Tenants t ON po.tenantId = t.id
      WHERE t.id IS NULL
    `, { type: QueryTypes.SELECT });

    if (invalidTenants.count === 0) {
      results.passed.push('Tenant integrity: All psychology orders have valid tenants');
      if (verbose) {
        logger.info('✓ All psychology orders have valid tenants');
      }
    } else {
      results.failed.push(`${invalidTenants.count} psychology orders with invalid tenants`);
      logger.error(`✗ ${invalidTenants.count} psychology orders with invalid tenants!`);
    }

    // Check tenant isolation
    const [crossTenant] = await targetDb.query(`
      SELECT COUNT(*) as count
      FROM PsychologyOrders po
      JOIN Patients p ON po.patientId = p.id
      WHERE po.tenantId != p.tenantId
    `, { type: QueryTypes.SELECT });

    if (crossTenant.count === 0) {
      results.passed.push('Tenant isolation: No cross-tenant references');
      if (verbose) {
        logger.info('✓ No cross-tenant references found');
      }
    } else {
      results.failed.push(`${crossTenant.count} cross-tenant violations`);
      logger.error(`✗ ${crossTenant.count} cross-tenant violations!`);
    }
  } catch (error) {
    results.failed.push(`Tenant verification error: ${error.message}`);
    logger.error(`✗ Tenant verification failed: ${error.message}`);
  }
}

/**
 * Verify data consistency
 */
async function verifyDataConsistency() {
  logger.info('Verifying data consistency...');

  try {
    // Check psychology sessions have valid orders
    const [invalidSessions] = await targetDb.query(`
      SELECT COUNT(*) as count
      FROM PsychologySessions ps
      LEFT JOIN PsychologyOrders po ON ps.orderId = po.id
      WHERE po.id IS NULL
    `, { type: QueryTypes.SELECT });

    if (invalidSessions.count === 0) {
      results.passed.push('Session consistency: All sessions have valid orders');
    } else {
      results.failed.push(`${invalidSessions.count} sessions with invalid orders`);
      logger.error(`✗ ${invalidSessions.count} sessions with invalid orders!`);
    }

    // Check order amounts are positive
    const [negativeAmounts] = await targetDb.query(`
      SELECT COUNT(*) as count
      FROM PsychologyOrders
      WHERE baseAmount < 0 OR finalAmount < 0
    `, { type: QueryTypes.SELECT });

    if (negativeAmounts.count === 0) {
      results.passed.push('Amount validation: No negative amounts');
    } else {
      results.warnings.push(`${negativeAmounts.count} orders with negative amounts`);
      logger.warn(`⚠ ${negativeAmounts.count} orders with negative amounts`);
    }

    // Check for duplicate invitations
    const [duplicateInvitations] = await targetDb.query(`
      SELECT accessToken, COUNT(*) as count
      FROM PsychologyInvitations
      GROUP BY accessToken
      HAVING COUNT(*) > 1
    `, { type: QueryTypes.SELECT });

    if (duplicateInvitations.length === 0) {
      results.passed.push('Invitation uniqueness: No duplicate access tokens');
    } else {
      results.warnings.push(`${duplicateInvitations.length} duplicate access tokens`);
      logger.warn(`⚠ ${duplicateInvitations.length} duplicate access tokens`);
    }
  } catch (error) {
    results.failed.push(`Data consistency check error: ${error.message}`);
    logger.error(`✗ Data consistency check failed: ${error.message}`);
  }
}

/**
 * Verify specific test data samples
 */
async function verifySampleData() {
  logger.info('Verifying sample data...');

  try {
    // Get sample psychology orders from source
    const sourceOrders = await sourceDb.query(`
      SELECT id, tenantId, patientId, packageId, baseAmount, finalAmount
      FROM PsychologyOrders
      ORDER BY id
      LIMIT 5
    `, { type: QueryTypes.SELECT });

    for (const sourceOrder of sourceOrders) {
      const [targetOrder] = await targetDb.query(`
        SELECT id, tenantId, patientId, packageId, baseAmount, finalAmount
        FROM PsychologyOrders
        WHERE id = :id
      `, {
        replacements: { id: sourceOrder.id },
        type: QueryTypes.SELECT
      });

      if (!targetOrder) {
        results.failed.push(`Sample order ${sourceOrder.id} not found in target`);
        logger.error(`✗ Sample order ${sourceOrder.id} missing!`);
        continue;
      }

      // Compare critical fields
      const fieldsMatch = 
        sourceOrder.tenantId === targetOrder.tenantId &&
        sourceOrder.patientId === targetOrder.patientId &&
        sourceOrder.packageId === targetOrder.packageId &&
        parseFloat(sourceOrder.baseAmount) === parseFloat(targetOrder.baseAmount) &&
        parseFloat(sourceOrder.finalAmount) === parseFloat(targetOrder.finalAmount);

      if (fieldsMatch) {
        results.passed.push(`Sample order ${sourceOrder.id} matches`);
        if (verbose) {
          logger.info(`✓ Sample order ${sourceOrder.id} verified`);
        }
      } else {
        results.failed.push(`Sample order ${sourceOrder.id} data mismatch`);
        logger.error(`✗ Sample order ${sourceOrder.id} mismatch!`);
        if (verbose) {
          logger.error('  Source:', sourceOrder);
          logger.error('  Target:', targetOrder);
        }
      }
    }
  } catch (error) {
    results.warnings.push(`Sample data verification skipped: ${error.message}`);
    logger.warn(`⚠ Sample data verification skipped: ${error.message}`);
  }
}

/**
 * Main verification function
 */
async function runVerification() {
  logger.info('=================================================');
  logger.info('Psychology Data Verification Script');
  logger.info('=================================================');
  logger.info(`Source DB: ${process.env.SOURCE_DB_NAME || 'gym_dev'}`);
  logger.info(`Target DB: ${process.env.TARGET_DB_NAME || 'psychology_dev'}`);
  logger.info(`Verbose: ${verbose}`);
  logger.info('=================================================\n');

  try {
    // Test connections
    await sourceDb.authenticate();
    await targetDb.authenticate();
    logger.info('✓ Database connections successful\n');

    // Run verification checks
    await verifyRecordCounts();
    await verifyForeignKeys();
    await verifyTenantData();
    await verifyDataConsistency();
    await verifySampleData();

    // Print summary
    logger.info('\n=================================================');
    logger.info('Verification Summary');
    logger.info('=================================================');
    logger.info(`Passed: ${results.passed.length}`);
    logger.info(`Failed: ${results.failed.length}`);
    logger.info(`Warnings: ${results.warnings.length}`);
    
    if (results.failed.length > 0) {
      logger.info('\n❌ Failed Checks:');
      results.failed.forEach(msg => logger.error(`  - ${msg}`));
    }
    
    if (results.warnings.length > 0) {
      logger.info('\n⚠️  Warnings:');
      results.warnings.forEach(msg => logger.warn(`  - ${msg}`));
    }

    if (verbose && results.passed.length > 0) {
      logger.info('\n✅ Passed Checks:');
      results.passed.forEach(msg => logger.info(`  - ${msg}`));
    }
    
    logger.info('=================================================\n');

    if (results.failed.length === 0) {
      logger.info('✅ All verification checks passed!');
      logger.info('   Psychology database is ready for use.');
    } else {
      logger.error('❌ Verification failed!');
      logger.error('   Please fix the issues before proceeding.');
      process.exit(1);
    }

  } catch (error) {
    logger.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await sourceDb.close();
    await targetDb.close();
  }
}

// Run verification
if (require.main === module) {
  runVerification()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runVerification };
