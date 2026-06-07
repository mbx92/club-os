/**
 * Database Column Checker
 * 
 * Script untuk mengecek semua kolom pada semua tabel di database
 * Menampilkan informasi lengkap tentang struktur tabel:
 * - Nama tabel
 * - Nama kolom
 * - Tipe data
 * - Nullable
 * - Default value
 * - Primary key
 * - Foreign key
 * 
 * Usage: npm run db:check-columns
 */

const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, `../.env.${process.env.NODE_ENV || 'development'}`) });

const config = require('../src/config/config')[process.env.NODE_ENV || 'development'];

// Create Sequelize instance
const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: false, // Disable query logging for cleaner output
});

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
 * Get detailed column information for a table
 */
async function getTableColumns(tableName) {
  const query = `
    SELECT 
      c.column_name,
      c.data_type,
      c.character_maximum_length,
      c.numeric_precision,
      c.numeric_scale,
      c.is_nullable,
      c.column_default,
      CASE 
        WHEN pk.column_name IS NOT NULL THEN 'YES'
        ELSE 'NO'
      END as is_primary_key,
      CASE 
        WHEN fk.column_name IS NOT NULL THEN 
          fk.foreign_table_name || '.' || fk.foreign_column_name
        ELSE NULL
      END as foreign_key_reference
    FROM information_schema.columns c
    LEFT JOIN (
      SELECT ku.table_name, ku.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
        AND tc.table_schema = ku.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
    ) pk ON c.table_name = pk.table_name 
        AND c.column_name = pk.column_name
    LEFT JOIN (
      SELECT
        kcu.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    ) fk ON c.table_name = fk.table_name 
        AND c.column_name = fk.column_name
    WHERE c.table_name = '${tableName}'
      AND c.table_schema = 'public'
    ORDER BY c.ordinal_position;
  `;
  
  const [results] = await sequelize.query(query);
  return results;
}

/**
 * Format column type with length/precision
 */
function formatColumnType(column) {
  let type = column.data_type.toUpperCase();
  
  if (column.character_maximum_length) {
    type += `(${column.character_maximum_length})`;
  } else if (column.numeric_precision && column.numeric_scale !== null) {
    type += `(${column.numeric_precision},${column.numeric_scale})`;
  } else if (column.numeric_precision) {
    type += `(${column.numeric_precision})`;
  }
  
  return type;
}

/**
 * Print table information in a formatted way
 */
function printTableInfo(tableName, columns) {
  console.log('\n' + '='.repeat(100));
  console.log(`📋 TABLE: ${tableName.toUpperCase()}`);
  console.log('='.repeat(100));
  console.log(
    'Column Name'.padEnd(30) + 
    'Type'.padEnd(25) + 
    'Null'.padEnd(8) + 
    'Key'.padEnd(6) + 
    'Extra'
  );
  console.log('-'.repeat(100));
  
  columns.forEach(col => {
    const columnName = col.column_name.padEnd(30);
    const columnType = formatColumnType(col).padEnd(25);
    const nullable = col.is_nullable.padEnd(8);
    const key = (col.is_primary_key === 'YES' ? 'PRI' : col.foreign_key_reference ? 'FOR' : '').padEnd(6);
    
    let extra = [];
    if (col.column_default) {
      extra.push(`default: ${col.column_default.substring(0, 30)}`);
    }
    if (col.foreign_key_reference) {
      extra.push(`→ ${col.foreign_key_reference}`);
    }
    
    console.log(columnName + columnType + nullable + key + extra.join(', '));
  });
}

/**
 * Generate summary statistics
 */
function printSummary(allTableData) {
  console.log('\n' + '='.repeat(100));
  console.log('📊 DATABASE SUMMARY');
  console.log('='.repeat(100));
  
  if (!allTableData || allTableData.length === 0) {
    console.log('No table data available');
    return;
  }
  
  const totalTables = allTableData.length;
  const totalColumns = allTableData.reduce((sum, table) => {
    return sum + (Array.isArray(table.columns) ? table.columns.length : 0);
  }, 0);
  const tablesWithPK = allTableData.filter(table => 
    Array.isArray(table.columns) && table.columns.some(col => col.is_primary_key === 'YES')
  ).length;
  const tablesWithFK = allTableData.filter(table => 
    Array.isArray(table.columns) && table.columns.some(col => col.foreign_key_reference)
  ).length;
  
  console.log(`Total Tables: ${totalTables}`);
  console.log(`Total Columns: ${totalColumns}`);
  console.log(`Tables with Primary Key: ${tablesWithPK}`);
  console.log(`Tables with Foreign Keys: ${tablesWithFK}`);
  
  console.log('\n📊 Tables by Column Count:');
  allTableData
    .sort((a, b) => b.columns.length - a.columns.length)
    .slice(0, 10)
    .forEach((table, index) => {
      console.log(`  ${(index + 1).toString().padStart(2)}. ${table.name.padEnd(30)} - ${table.columns.length} columns`);
    });
}

/**
 * Search for specific column across all tables
 */
function searchColumn(allTableData, searchTerm) {
  console.log('\n' + '='.repeat(100));
  console.log(`🔍 SEARCHING FOR COLUMN: "${searchTerm}"`);
  console.log('='.repeat(100));
  
  const results = [];
  
  allTableData.forEach(table => {
    const matchingColumns = table.columns.filter(col => 
      col.column_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (matchingColumns.length > 0) {
      results.push({ table: table.name, columns: matchingColumns });
    }
  });
  
  if (results.length === 0) {
    console.log(`No columns found matching "${searchTerm}"`);
  } else {
    console.log(`Found in ${results.length} table(s):\n`);
    results.forEach(result => {
      console.log(`📋 ${result.table}`);
      result.columns.forEach(col => {
        console.log(`   - ${col.column_name} (${formatColumnType(col)})`);
      });
      console.log();
    });
  }
}

/**
 * Export to JSON file
 */
async function exportToJSON(allTableData, outputPath) {
  const fs = require('fs').promises;
  const exportData = {
    generatedAt: new Date().toISOString(),
    database: config.database,
    environment: process.env.NODE_ENV || 'development',
    tables: allTableData.map(table => ({
      name: table.name,
      columnCount: table.columns.length,
      columns: table.columns.map(col => ({
        name: col.column_name,
        type: formatColumnType(col),
        nullable: col.is_nullable === 'YES',
        default: col.column_default,
        isPrimaryKey: col.is_primary_key === 'YES',
        foreignKey: col.foreign_key_reference
      }))
    }))
  };
  
  await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));
  console.log(`\n✅ Data exported to: ${outputPath}`);
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🔍 Database Column Checker');
    console.log('='.repeat(100));
    console.log(`Database: ${config.database}`);
    console.log(`Host: ${config.host}:${config.port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('='.repeat(100));
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Get all tables
    console.log('\n📥 Fetching table information...');
    const tables = await getAllTables();
    console.log(`Found ${tables.length} tables`);
    
    // Get columns for each table
    const allTableData = [];
    for (const tableName of tables) {
      const columns = await getTableColumns(tableName);
      if (columns && columns.length > 0) {
        allTableData.push({ name: tableName, columns });
      } else {
        console.log(`⚠️  Warning: No columns found for table "${tableName}"`);
      }
    }
    
    console.log(`✅ Successfully loaded ${allTableData.length} tables with column information`);
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const command = args[0];
    
    if (command === '--search' && args[1]) {
      // Search for specific column
      searchColumn(allTableData, args[1]);
    } else if (command === '--table' && args[1]) {
      // Show specific table only
      const tableData = allTableData.find(t => t.name.toLowerCase() === args[1].toLowerCase());
      if (tableData) {
        printTableInfo(tableData.name, tableData.columns);
      } else {
        console.log(`\n❌ Table "${args[1]}" not found`);
        console.log(`Available tables: ${allTableData.map(t => t.name).join(', ')}`);
      }
    } else if (command === '--export' && args[1]) {
      // Export to JSON
      await exportToJSON(allTableData, args[1]);
    } else if (command === '--summary') {
      // Show summary only
      printSummary(allTableData);
    } else {
      // Show all tables
      for (const tableData of allTableData) {
        printTableInfo(tableData.name, tableData.columns);
      }
      printSummary(allTableData);
    }
    
    console.log('\n' + '='.repeat(100));
    console.log('✅ Done!');
    console.log('='.repeat(100));
    
    // Usage help
    if (!command || command === '--help') {
      console.log('\n📖 Usage Options:');
      console.log('  npm run db:check-columns                    - Show all tables and columns');
      console.log('  npm run db:check-columns -- --summary       - Show summary only');
      console.log('  npm run db:check-columns -- --table Users   - Show specific table');
      console.log('  npm run db:check-columns -- --search email  - Search for column name');
      console.log('  npm run db:check-columns -- --export out.json - Export to JSON file');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { getAllTables, getTableColumns };
