/**
 * Psychology Data Migration Script
 * 
 * This script migrates psychology-related data from gym database to psychology database.
 * 
 * Usage:
 *   node scripts/migration/migratePsychologyData.js
 *   node scripts/migration/migratePsychologyData.js --dry-run
 *   node scripts/migration/migratePsychologyData.js --tables=Tenants,Users
 * 
 * Prerequisites:
 * 1. Both databases must exist (gym_db and psychology_db)
 * 2. Psychology database schema must be created (run migrations)
 * 3. Backup both databases before running
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
    new winston.transports.File({ filename: 'logs/psychology-migration.log' })
  ]
});

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const specificTables = args.find(arg => arg.startsWith('--tables='))
  ?.split('=')[1]
  ?.split(',') || null;

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

// Migration statistics
const stats = {
  totalRecords: 0,
  successRecords: 0,
  failedRecords: 0,
  skippedRecords: 0,
  tableStats: {}
};

/**
 * Test database connections
 */
async function testConnections() {
  logger.info('Testing database connections...');
  
  try {
    await sourceDb.authenticate();
    logger.info('✓ Source database connection successful');
  } catch (error) {
    logger.error('✗ Source database connection failed:', error.message);
    throw error;
  }

  try {
    await targetDb.authenticate();
    logger.info('✓ Target database connection successful');
  } catch (error) {
    logger.error('✗ Target database connection failed:', error.message);
    throw error;
  }
}

/**
 * Get tenants that have psychology data
 */
async function getTenantsWithPsychology() {
  logger.info('Finding tenants with psychology data...');
  
  const tenants = await sourceDb.query(`
    SELECT DISTINCT t.*
    FROM Tenants t
    WHERE EXISTS (
      SELECT 1 FROM PsychologyOrders po WHERE po.tenantId = t.id
    )
    OR EXISTS (
      SELECT 1 FROM PsychologyPackages pp WHERE pp.tenantId = t.id
    )
    ORDER BY t.id
  `, { type: QueryTypes.SELECT });

  logger.info(`Found ${tenants.length} tenants with psychology data`);
  return tenants;
}

/**
 * Migrate tenants
 */
async function migrateTenants(tenants) {
  logger.info(`Migrating ${tenants.length} tenants...`);
  
  if (isDryRun) {
    logger.info('[DRY RUN] Would migrate tenants:', tenants.map(t => t.code).join(', '));
    return tenants.length;
  }

  let migrated = 0;
  for (const tenant of tenants) {
    try {
      await targetDb.query(`
        INSERT INTO Tenants (
          id, name, code, contactEmail, contactPhone, address,
          city, state, postalCode, country, isActive, trialEndsAt,
          createdAt, updatedAt
        ) VALUES (
          :id, :name, :code, :contactEmail, :contactPhone, :address,
          :city, :state, :postalCode, :country, :isActive, :trialEndsAt,
          :createdAt, :updatedAt
        )
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          contactEmail = VALUES(contactEmail),
          updatedAt = VALUES(updatedAt)
      `, {
        replacements: tenant,
        type: QueryTypes.INSERT
      });
      
      migrated++;
      stats.tableStats.Tenants = (stats.tableStats.Tenants || 0) + 1;
    } catch (error) {
      logger.error(`Failed to migrate tenant ${tenant.code}:`, error.message);
      stats.failedRecords++;
    }
  }

  logger.info(`✓ Migrated ${migrated} tenants`);
  return migrated;
}

/**
 * Migrate users for psychology tenants
 */
async function migrateUsers(tenantIds) {
  logger.info('Migrating users...');
  
  const users = await sourceDb.query(`
    SELECT * FROM Users
    WHERE tenantId IN (:tenantIds)
    ORDER BY id
  `, {
    replacements: { tenantIds },
    type: QueryTypes.SELECT
  });

  logger.info(`Found ${users.length} users to migrate`);
  
  if (isDryRun) {
    logger.info(`[DRY RUN] Would migrate ${users.length} users`);
    return users.length;
  }

  let migrated = 0;
  for (const user of users) {
    try {
      await targetDb.query(`
        INSERT INTO Users (
          id, tenantId, roleId, email, password, firstName, lastName,
          phone, position, isActive, isSuperAdmin, lastLoginAt,
          createdAt, updatedAt
        ) VALUES (
          :id, :tenantId, :roleId, :email, :password, :firstName, :lastName,
          :phone, :position, :isActive, :isSuperAdmin, :lastLoginAt,
          :createdAt, :updatedAt
        )
        ON DUPLICATE KEY UPDATE
          email = VALUES(email),
          firstName = VALUES(firstName),
          lastName = VALUES(lastName),
          updatedAt = VALUES(updatedAt)
      `, {
        replacements: user,
        type: QueryTypes.INSERT
      });
      
      migrated++;
      stats.tableStats.Users = (stats.tableStats.Users || 0) + 1;
    } catch (error) {
      logger.error(`Failed to migrate user ${user.email}:`, error.message);
      stats.failedRecords++;
    }
  }

  logger.info(`✓ Migrated ${migrated} users`);
  return migrated;
}

/**
 * Migrate patients
 */
async function migratePatients(tenantIds) {
  logger.info('Migrating patients...');
  
  const patients = await sourceDb.query(`
    SELECT * FROM Patients
    WHERE tenantId IN (:tenantIds)
    ORDER BY id
  `, {
    replacements: { tenantIds },
    type: QueryTypes.SELECT
  });

  logger.info(`Found ${patients.length} patients to migrate`);
  
  if (isDryRun) {
    logger.info(`[DRY RUN] Would migrate ${patients.length} patients`);
    return patients.length;
  }

  let migrated = 0;
  for (const patient of patients) {
    try {
      await targetDb.query(`
        INSERT INTO Patients (
          id, tenantId, fullName, email, phone, dateOfBirth,
          gender, address, city, state, postalCode, country,
          emergencyContactName, emergencyContactPhone,
          notes, isActive, createdAt, updatedAt
        ) VALUES (
          :id, :tenantId, :fullName, :email, :phone, :dateOfBirth,
          :gender, :address, :city, :state, :postalCode, :country,
          :emergencyContactName, :emergencyContactPhone,
          :notes, :isActive, :createdAt, :updatedAt
        )
        ON DUPLICATE KEY UPDATE
          fullName = VALUES(fullName),
          email = VALUES(email),
          phone = VALUES(phone),
          updatedAt = VALUES(updatedAt)
      `, {
        replacements: patient,
        type: QueryTypes.INSERT
      });
      
      migrated++;
      stats.tableStats.Patients = (stats.tableStats.Patients || 0) + 1;
    } catch (error) {
      logger.error(`Failed to migrate patient ${patient.id}:`, error.message);
      stats.failedRecords++;
    }
  }

  logger.info(`✓ Migrated ${migrated} patients`);
  return migrated;
}

/**
 * Migrate psychology table with all columns
 */
async function migratePsychologyTable(tableName, tenantIds) {
  logger.info(`Migrating ${tableName}...`);
  
  // Get all columns for the table
  const [columns] = await sourceDb.query(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = :database 
    AND TABLE_NAME = :tableName
    ORDER BY ORDINAL_POSITION
  `, {
    replacements: {
      database: process.env.SOURCE_DB_NAME || 'gym_dev',
      tableName
    },
    type: QueryTypes.SELECT
  });

  const columnNames = columns.map(c => c.COLUMN_NAME);
  const columnList = columnNames.join(', ');
  const placeholders = columnNames.map(c => `:${c}`).join(', ');
  const updateList = columnNames
    .filter(c => c !== 'id')
    .map(c => `${c} = VALUES(${c})`)
    .join(', ');

  // Get records to migrate
  const records = await sourceDb.query(`
    SELECT ${columnList} FROM ${tableName}
    WHERE tenantId IN (:tenantIds)
    ORDER BY id
  `, {
    replacements: { tenantIds },
    type: QueryTypes.SELECT
  });

  logger.info(`Found ${records.length} records in ${tableName}`);
  
  if (isDryRun) {
    logger.info(`[DRY RUN] Would migrate ${records.length} records from ${tableName}`);
    return records.length;
  }

  let migrated = 0;
  for (const record of records) {
    try {
      await targetDb.query(`
        INSERT INTO ${tableName} (${columnList})
        VALUES (${placeholders})
        ON DUPLICATE KEY UPDATE ${updateList}
      `, {
        replacements: record,
        type: QueryTypes.INSERT
      });
      
      migrated++;
      stats.tableStats[tableName] = (stats.tableStats[tableName] || 0) + 1;
    } catch (error) {
      logger.error(`Failed to migrate ${tableName} record ${record.id}:`, error.message);
      stats.failedRecords++;
    }
  }

  logger.info(`✓ Migrated ${migrated} records from ${tableName}`);
  return migrated;
}

/**
 * Main migration function
 */
async function runMigration() {
  const startTime = Date.now();
  
  logger.info('=================================================');
  logger.info('Psychology Data Migration Script');
  logger.info('=================================================');
  logger.info(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  logger.info(`Source DB: ${process.env.SOURCE_DB_NAME || 'gym_dev'}`);
  logger.info(`Target DB: ${process.env.TARGET_DB_NAME || 'psychology_dev'}`);
  
  if (specificTables) {
    logger.info(`Specific tables: ${specificTables.join(', ')}`);
  }
  
  logger.info('=================================================\n');

  try {
    // Test connections
    await testConnections();
    
    // Get tenants with psychology data
    const tenants = await getTenantsWithPsychology();
    const tenantIds = tenants.map(t => t.id);
    
    if (tenantIds.length === 0) {
      logger.warn('⚠ No tenants with psychology data found. Exiting.');
      return;
    }

    // Define migration order (important for foreign keys)
    const migrationTables = [
      'Tenants',
      'Users',
      'Patients',
      'PsychologyTestTypes',
      'PsychologyPackages',
      'PsychologyPackageItems',
      'PsychologyPriceRules',
      'PsychologyInvitations',
      'PsychologyOrders',
      'PsychologySessions',
      'PsychologyNorms',
      'PsychologySettings',
      'PsychologyReportCache'
    ];

    // Filter by specific tables if requested
    const tablesToMigrate = specificTables 
      ? migrationTables.filter(t => specificTables.includes(t))
      : migrationTables;

    logger.info(`Migrating ${tablesToMigrate.length} tables in order...\n`);

    // Migrate each table
    for (const table of tablesToMigrate) {
      try {
        let count = 0;
        
        if (table === 'Tenants') {
          count = await migrateTenants(tenants);
        } else if (table === 'Users') {
          count = await migrateUsers(tenantIds);
        } else if (table === 'Patients') {
          count = await migratePatients(tenantIds);
        } else {
          count = await migratePsychologyTable(table, tenantIds);
        }
        
        stats.totalRecords += count;
        stats.successRecords += count;
        
      } catch (error) {
        logger.error(`Failed to migrate ${table}:`, error.message);
        stats.failedRecords++;
      }
    }

    // Print summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    logger.info('\n=================================================');
    logger.info('Migration Summary');
    logger.info('=================================================');
    logger.info(`Status: ${isDryRun ? 'DRY RUN (No changes made)' : 'COMPLETED'}`);
    logger.info(`Duration: ${duration}s`);
    logger.info(`Total Records: ${stats.totalRecords}`);
    logger.info(`Successful: ${stats.successRecords}`);
    logger.info(`Failed: ${stats.failedRecords}`);
    logger.info(`\nRecords by Table:`);
    
    Object.entries(stats.tableStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([table, count]) => {
        logger.info(`  ${table.padEnd(30)} ${count}`);
      });
    
    logger.info('=================================================\n');
    
    if (!isDryRun && stats.failedRecords === 0) {
      logger.info('✅ Migration completed successfully!');
      logger.info('   Next steps:');
      logger.info('   1. Verify data integrity: node scripts/migration/verifyPsychologyData.js');
      logger.info('   2. Test psychology system functionality');
      logger.info('   3. Update application configurations');
    } else if (isDryRun) {
      logger.info('ℹ️  This was a dry run. No changes were made.');
      logger.info('   Remove --dry-run flag to perform actual migration.');
    } else {
      logger.warn('⚠️  Migration completed with errors. Check logs for details.');
    }

  } catch (error) {
    logger.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sourceDb.close();
    await targetDb.close();
  }
}

// Run migration
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
