/**
 * Migration Sync Checker
 * 
 * Script untuk mengecek konsistensi antara:
 * 1. SequelizeMeta table (migration yang sudah dijalankan)
 * 2. File migration di folder src/migrations
 * 3. Struktur kolom di database vs operasi migration
 * 
 * Fitur:
 * - Deteksi migration yang belum dijalankan
 * - Deteksi migration yang ada di DB tapi filenya hilang
 * - Analisis potensi konflik (addColumn tapi kolom sudah ada, dll)
 * - Support multi-komputer development dengan shared DB
 * 
 * Usage:
 *   npm run migration:check              - Full check
 *   npm run migration:check -- --pending - Show pending migrations only
 *   npm run migration:check -- --orphan  - Show orphan migrations only
 *   npm run migration:check -- --analyze - Analyze potential conflicts
 *   npm run migration:check -- --fix     - Show fix suggestions
 * 
 * @author Gym Membership Backend Team
 */

const { Sequelize, QueryTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, `../.env.${process.env.NODE_ENV || 'development'}`) });

const config = require('../src/config/config')[process.env.NODE_ENV || 'development'];

// Migration folder path
const MIGRATIONS_PATH = path.resolve(__dirname, '../src/migrations');

// Create Sequelize instance
const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: false,
});

// Color helpers for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  console.log('\n' + '='.repeat(100));
  log(`📋 ${title}`, 'bright');
  console.log('='.repeat(100));
}

function logSubHeader(title) {
  console.log('\n' + '-'.repeat(80));
  log(`  ${title}`, 'cyan');
  console.log('-'.repeat(80));
}

/**
 * Get list of migrations from SequelizeMeta table
 */
async function getMigrationsFromDB() {
  try {
    // Check if SequelizeMeta exists
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'SequelizeMeta';
    `);

    if (tables.length === 0) {
      return { exists: false, migrations: [] };
    }

    const [migrations] = await sequelize.query(
      'SELECT name FROM "SequelizeMeta" ORDER BY name;'
    );

    return {
      exists: true,
      migrations: Array.isArray(migrations) ? migrations.map(m => m.name) : []
    };
  } catch (error) {
    console.error('Error fetching migrations from DB:', error.message);
    return { exists: false, migrations: [], error: error.message };
  }
}

/**
 * Get list of migration files from disk
 */
function getMigrationsFromDisk() {
  try {
    const files = fs.readdirSync(MIGRATIONS_PATH)
      .filter(file => file.endsWith('.js'))
      .sort();
    
    return files;
  } catch (error) {
    console.error('Error reading migration files:', error.message);
    return [];
  }
}

/**
 * Get all tables in the database
 */
async function getAllTables() {
  const [results] = await sequelize.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'Sequelize%'
    ORDER BY table_name;
  `);
  
  return results.map(row => row.table_name);
}

/**
 * Get columns for a specific table
 */
async function getTableColumns(tableName) {
  const [results] = await sequelize.query(`
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_name = '${tableName}'
      AND table_schema = 'public'
    ORDER BY ordinal_position;
  `);
  
  return results.map(col => col.column_name);
}

/**
 * Get all indexes for a table
 */
async function getTableIndexes(tableName) {
  const [results] = await sequelize.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = '${tableName}'
      AND schemaname = 'public';
  `);
  
  return results.map(idx => idx.indexname);
}

/**
 * Get all constraints for a table
 */
async function getTableConstraints(tableName) {
  const [results] = await sequelize.query(`
    SELECT constraint_name, constraint_type
    FROM information_schema.table_constraints
    WHERE table_name = '${tableName}'
      AND table_schema = 'public';
  `);
  
  return results.map(c => ({ name: c.constraint_name, type: c.constraint_type }));
}

/**
 * Parse migration file to extract operations
 */
function parseMigrationFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const operations = {
    createTable: [],
    dropTable: [],
    addColumn: [],
    removeColumn: [],
    renameColumn: [],
    changeColumn: [],
    addIndex: [],
    removeIndex: [],
    addConstraint: [],
    removeConstraint: [],
    rawQueries: [],
  };

  // Detect createTable
  const createTableRegex = /createTable\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = createTableRegex.exec(content)) !== null) {
    operations.createTable.push(match[1]);
  }

  // Detect dropTable
  const dropTableRegex = /dropTable\s*\(\s*['"`]([^'"`]+)['"`]/g;
  while ((match = dropTableRegex.exec(content)) !== null) {
    operations.dropTable.push(match[1]);
  }

  // Detect addColumn
  const addColumnRegex = /addColumn\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]/g;
  while ((match = addColumnRegex.exec(content)) !== null) {
    operations.addColumn.push({ table: match[1], column: match[2] });
  }

  // Detect removeColumn
  const removeColumnRegex = /removeColumn\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]/g;
  while ((match = removeColumnRegex.exec(content)) !== null) {
    operations.removeColumn.push({ table: match[1], column: match[2] });
  }

  // Detect renameColumn
  const renameColumnRegex = /renameColumn\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]/g;
  while ((match = renameColumnRegex.exec(content)) !== null) {
    operations.renameColumn.push({ table: match[1], oldColumn: match[2], newColumn: match[3] });
  }

  // Detect addIndex
  const addIndexRegex = /addIndex\s*\(\s*['"`]([^'"`]+)['"`]/g;
  while ((match = addIndexRegex.exec(content)) !== null) {
    operations.addIndex.push(match[1]);
  }

  // Detect removeIndex
  const removeIndexRegex = /removeIndex\s*\(\s*['"`]([^'"`]+)['"`]/g;
  while ((match = removeIndexRegex.exec(content)) !== null) {
    operations.removeIndex.push(match[1]);
  }

  // Detect addConstraint
  const addConstraintRegex = /addConstraint\s*\(\s*['"`]([^'"`]+)['"`]/g;
  while ((match = addConstraintRegex.exec(content)) !== null) {
    operations.addConstraint.push(match[1]);
  }

  // Detect removeConstraint
  const removeConstraintRegex = /removeConstraint\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]/g;
  while ((match = removeConstraintRegex.exec(content)) !== null) {
    operations.removeConstraint.push({ table: match[1], constraint: match[2] });
  }

  // Detect raw ALTER TABLE queries
  const alterTableRegex = /ALTER\s+TABLE\s+["']?(\w+)["']?\s+(\w+)\s+(?:COLUMN\s+)?["']?(\w+)["']?/gi;
  while ((match = alterTableRegex.exec(content)) !== null) {
    operations.rawQueries.push({
      table: match[1],
      action: match[2],
      column: match[3]
    });
  }

  // Check for conditional checks (describeTable usage)
  const hasConditionalChecks = content.includes('describeTable') || 
                                content.includes('tableDescription') ||
                                content.includes('if (!tableDescription') ||
                                content.includes('if (tableDescription');

  return {
    operations,
    hasConditionalChecks,
    usesTransaction: content.includes('transaction'),
  };
}

/**
 * Analyze potential conflicts for a pending migration
 */
async function analyzeMigrationConflicts(migrationFile, tables, tableColumns) {
  const filePath = path.join(MIGRATIONS_PATH, migrationFile);
  const parsed = parseMigrationFile(filePath);
  const conflicts = [];
  const warnings = [];
  const safeOperations = [];

  // Check createTable conflicts
  for (const tableName of parsed.operations.createTable) {
    if (tables.includes(tableName)) {
      conflicts.push({
        type: 'TABLE_EXISTS',
        severity: 'ERROR',
        message: `Table "${tableName}" already exists`,
        suggestion: parsed.hasConditionalChecks 
          ? 'Migration has conditional checks, may be safe'
          : 'Add conditional check: if (!await queryInterface.tableExists(...)) before createTable'
      });
    } else {
      safeOperations.push(`CREATE TABLE "${tableName}"`);
    }
  }

  // Check addColumn conflicts
  for (const { table, column } of parsed.operations.addColumn) {
    if (!tables.includes(table)) {
      warnings.push({
        type: 'TABLE_NOT_EXISTS',
        severity: 'WARNING',
        message: `Table "${table}" does not exist (for addColumn "${column}")`,
        suggestion: 'Table will be created by a previous migration or this migration creates it'
      });
    } else if (tableColumns[table] && tableColumns[table].includes(column)) {
      conflicts.push({
        type: 'COLUMN_EXISTS',
        severity: parsed.hasConditionalChecks ? 'WARNING' : 'ERROR',
        message: `Column "${column}" already exists in table "${table}"`,
        suggestion: parsed.hasConditionalChecks 
          ? 'Migration has conditional checks, should be safe'
          : 'Add conditional check: if (!tableDescription.columnName) before addColumn'
      });
    } else {
      safeOperations.push(`ADD COLUMN "${table}"."${column}"`);
    }
  }

  // Check removeColumn conflicts
  for (const { table, column } of parsed.operations.removeColumn) {
    if (!tables.includes(table)) {
      warnings.push({
        type: 'TABLE_NOT_EXISTS',
        severity: 'WARNING',
        message: `Table "${table}" does not exist (for removeColumn "${column}")`,
      });
    } else if (tableColumns[table] && !tableColumns[table].includes(column)) {
      conflicts.push({
        type: 'COLUMN_NOT_EXISTS',
        severity: parsed.hasConditionalChecks ? 'WARNING' : 'ERROR',
        message: `Column "${column}" does not exist in table "${table}" (cannot remove)`,
        suggestion: 'Column may have been removed by another migration or manual change'
      });
    } else {
      safeOperations.push(`REMOVE COLUMN "${table}"."${column}"`);
    }
  }

  // Check renameColumn conflicts
  for (const { table, oldColumn, newColumn } of parsed.operations.renameColumn) {
    if (tables.includes(table) && tableColumns[table]) {
      if (!tableColumns[table].includes(oldColumn) && tableColumns[table].includes(newColumn)) {
        // Already renamed - safe if has conditional checks
        if (!parsed.hasConditionalChecks) {
          conflicts.push({
            type: 'ALREADY_RENAMED',
            severity: 'ERROR',
            message: `Column "${oldColumn}" already renamed to "${newColumn}" in table "${table}"`,
            suggestion: 'Add conditional check: if (tableDescription.oldColumn && !tableDescription.newColumn)'
          });
        } else {
          safeOperations.push(`RENAME "${table}"."${oldColumn}" -> "${newColumn}" (conditional)`);
        }
      } else if (!tableColumns[table].includes(oldColumn)) {
        conflicts.push({
          type: 'SOURCE_COLUMN_NOT_EXISTS',
          severity: 'ERROR',
          message: `Source column "${oldColumn}" does not exist in table "${table}"`,
        });
      }
    }
  }

  return {
    file: migrationFile,
    parsed,
    conflicts,
    warnings,
    safeOperations,
    hasConditionalChecks: parsed.hasConditionalChecks,
    usesTransaction: parsed.usesTransaction,
    totalOperations: Object.values(parsed.operations).reduce((sum, arr) => sum + arr.length, 0),
  };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const showPendingOnly = args.includes('--pending');
  const showOrphanOnly = args.includes('--orphan');
  const analyzeConflicts = args.includes('--analyze');
  const showFix = args.includes('--fix');
  const verbose = args.includes('--verbose') || args.includes('-v');

  try {
    logHeader('MIGRATION SYNC CHECKER');
    log(`Database: ${config.database}`, 'cyan');
    log(`Host: ${config.host}:${config.port}`, 'cyan');
    log(`Environment: ${process.env.NODE_ENV || 'development'}`, 'cyan');

    // Test connection
    await sequelize.authenticate();
    log('\n✅ Database connection established', 'green');

    // Get migrations
    const dbMigrations = await getMigrationsFromDB();
    const diskMigrations = getMigrationsFromDisk();

    log(`\n📊 Found ${diskMigrations.length} migration files on disk`, 'blue');
    log(`📊 Found ${dbMigrations.migrations.length} migrations in database`, 'blue');

    if (!dbMigrations.exists) {
      log('\n⚠️  SequelizeMeta table does not exist!', 'yellow');
      log('   This means no migrations have been run yet.', 'yellow');
      log('   Run: npx sequelize-cli db:migrate', 'cyan');
    }

    // Find pending migrations (on disk but not in DB)
    const pendingMigrations = diskMigrations.filter(m => !dbMigrations.migrations.includes(m));
    
    // Find orphan migrations (in DB but not on disk)
    const orphanMigrations = dbMigrations.migrations.filter(m => !diskMigrations.includes(m));
    
    // Find synced migrations
    const syncedMigrations = diskMigrations.filter(m => dbMigrations.migrations.includes(m));

    // === PENDING MIGRATIONS ===
    if (!showOrphanOnly) {
      logSubHeader(`⏳ PENDING MIGRATIONS (${pendingMigrations.length})`);
      
      if (pendingMigrations.length === 0) {
        log('  ✅ All migrations have been applied!', 'green');
      } else {
        log('  Migrations that need to be run:', 'yellow');
        pendingMigrations.forEach((m, i) => {
          log(`  ${(i + 1).toString().padStart(3)}. ${m}`, 'yellow');
        });
        
        log('\n  To apply pending migrations, run:', 'cyan');
        log('  npx sequelize-cli db:migrate', 'cyan');
      }
    }

    // === ORPHAN MIGRATIONS ===
    if (!showPendingOnly) {
      logSubHeader(`👻 ORPHAN MIGRATIONS (${orphanMigrations.length})`);
      
      if (orphanMigrations.length === 0) {
        log('  ✅ No orphan migrations found!', 'green');
      } else {
        log('  ⚠️  Migrations in DB but file is missing:', 'red');
        orphanMigrations.forEach((m, i) => {
          log(`  ${(i + 1).toString().padStart(3)}. ${m}`, 'red');
        });
        
        log('\n  ⚠️  WARNING: These migrations were run but files are missing!', 'red');
        log('  This typically happens when:', 'yellow');
        log('    - Migration files were deleted after being run', 'yellow');
        log('    - Different git branches have different migrations', 'yellow');
        log('    - Someone else added migrations that you don\'t have', 'yellow');
        
        if (showFix) {
          log('\n  📝 FIX OPTIONS:', 'magenta');
          log('  1. Get the missing migration files from git/colleague', 'cyan');
          log('  2. Remove from SequelizeMeta (DANGEROUS - only if you know what you\'re doing):', 'cyan');
          orphanMigrations.forEach(m => {
            log(`     DELETE FROM "SequelizeMeta" WHERE name = '${m}';`, 'yellow');
          });
        }
      }
    }

    // === SYNCED MIGRATIONS ===
    if (verbose && !showPendingOnly && !showOrphanOnly) {
      logSubHeader(`✅ SYNCED MIGRATIONS (${syncedMigrations.length})`);
      syncedMigrations.forEach((m, i) => {
        log(`  ${(i + 1).toString().padStart(3)}. ${m}`, 'green');
      });
    }

    // === CONFLICT ANALYSIS ===
    if (analyzeConflicts && pendingMigrations.length > 0) {
      logSubHeader('🔍 CONFLICT ANALYSIS FOR PENDING MIGRATIONS');
      
      // Get current database state
      const tables = await getAllTables();
      const tableColumns = {};
      
      log('  Loading table structures...', 'blue');
      for (const table of tables) {
        tableColumns[table] = await getTableColumns(table);
      }
      
      let hasErrors = false;
      let hasWarnings = false;

      for (const migration of pendingMigrations) {
        const analysis = await analyzeMigrationConflicts(migration, tables, tableColumns);
        
        console.log();
        log(`  📄 ${migration}`, 'bright');
        
        if (analysis.hasConditionalChecks) {
          log(`     ✅ Has conditional checks (describeTable)`, 'green');
        }
        if (analysis.usesTransaction) {
          log(`     ✅ Uses transaction (safe rollback)`, 'green');
        }
        
        // Show conflicts
        if (analysis.conflicts.length > 0) {
          hasErrors = true;
          log(`     ❌ POTENTIAL CONFLICTS:`, 'red');
          analysis.conflicts.forEach(c => {
            const color = c.severity === 'ERROR' ? 'red' : 'yellow';
            log(`        - [${c.severity}] ${c.message}`, color);
            if (c.suggestion && showFix) {
              log(`          💡 ${c.suggestion}`, 'cyan');
            }
          });
        }
        
        // Show warnings
        if (analysis.warnings.length > 0) {
          hasWarnings = true;
          log(`     ⚠️  WARNINGS:`, 'yellow');
          analysis.warnings.forEach(w => {
            log(`        - ${w.message}`, 'yellow');
          });
        }
        
        // Show safe operations
        if (verbose && analysis.safeOperations.length > 0) {
          log(`     ✅ Safe operations:`, 'green');
          analysis.safeOperations.forEach(op => {
            log(`        - ${op}`, 'green');
          });
        }
        
        if (analysis.conflicts.length === 0 && analysis.warnings.length === 0) {
          log(`     ✅ No conflicts detected - safe to run`, 'green');
        }
      }

      // Summary
      console.log();
      if (hasErrors) {
        log('  ❌ POTENTIAL MIGRATION ERRORS DETECTED!', 'red');
        log('  Review the conflicts above before running migrations.', 'red');
        log('  Use --fix flag to see fix suggestions.', 'cyan');
      } else if (hasWarnings) {
        log('  ⚠️  Some warnings found, but migrations should be safe to run.', 'yellow');
      } else {
        log('  ✅ All pending migrations appear safe to run!', 'green');
      }
    }

    // === SUMMARY ===
    logHeader('SUMMARY');
    
    const statusIcon = (count, type) => {
      if (type === 'pending') return count > 0 ? '⏳' : '✅';
      if (type === 'orphan') return count > 0 ? '👻' : '✅';
      return '📊';
    };

    log(`${statusIcon(pendingMigrations.length, 'pending')} Pending migrations: ${pendingMigrations.length}`, pendingMigrations.length > 0 ? 'yellow' : 'green');
    log(`${statusIcon(orphanMigrations.length, 'orphan')} Orphan migrations: ${orphanMigrations.length}`, orphanMigrations.length > 0 ? 'red' : 'green');
    log(`✅ Synced migrations: ${syncedMigrations.length}`, 'green');

    // Overall status
    console.log();
    if (pendingMigrations.length === 0 && orphanMigrations.length === 0) {
      log('🎉 Database migrations are fully synced!', 'green');
    } else if (orphanMigrations.length > 0) {
      log('⚠️  Database has orphan migrations - sync with your team!', 'red');
    } else if (pendingMigrations.length > 0) {
      log('📝 Pending migrations need to be run: npx sequelize-cli db:migrate', 'yellow');
      if (!analyzeConflicts) {
        log('   Use --analyze flag to check for potential conflicts first', 'cyan');
      }
    }

    // Usage help
    console.log('\n' + '-'.repeat(80));
    log('📖 Usage:', 'bright');
    log('  npm run migration:check              - Full check', 'cyan');
    log('  npm run migration:check -- --pending - Show pending only', 'cyan');
    log('  npm run migration:check -- --orphan  - Show orphan only', 'cyan');
    log('  npm run migration:check -- --analyze - Analyze conflicts', 'cyan');
    log('  npm run migration:check -- --fix     - Show fix suggestions', 'cyan');
    log('  npm run migration:check -- --verbose - Verbose output', 'cyan');
    console.log('='.repeat(100));

    // Exit code based on status
    if (orphanMigrations.length > 0) {
      process.exit(2); // Orphan migrations found
    } else if (pendingMigrations.length > 0) {
      process.exit(1); // Pending migrations found
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  getMigrationsFromDB,
  getMigrationsFromDisk,
  analyzeMigrationConflicts,
};
