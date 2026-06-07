/**
 * Test Restaurant Models Against Database Schema
 * 
 * This script validates that Sequelize models match the actual database schema.
 * It checks:
 * - All model fields exist in database
 * - All database columns are defined in models
 * - Data types match
 * - Foreign key relationships are correct
 * 
 * Usage: node scripts/testRestaurantModels.js
 */

const { Sequelize, DataTypes } = require('sequelize');
const config = require('../src/config/config.js')[process.env.NODE_ENV || 'development'];

// Import restaurant models
const ProductModel = require('../src/modules/restaurant/models/product');
const ProductCategoryModel = require('../src/modules/restaurant/models/productCategory');
const LocationModel = require('../src/modules/restaurant/models/location');
const RestaurantTableModel = require('../src/modules/restaurant/models/restaurantTable');
const StockMovementModel = require('../src/modules/restaurant/models/stockMovement');

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: false
});

// Initialize models
const Product = ProductModel(sequelize, DataTypes);
const ProductCategory = ProductCategoryModel(sequelize, DataTypes);
const Location = LocationModel(sequelize, DataTypes);
const RestaurantTable = RestaurantTableModel(sequelize, DataTypes);
const StockMovement = StockMovementModel(sequelize, DataTypes);

const models = {
  Product,
  ProductCategory,
  Location,
  RestaurantTable,
  StockMovement
};

// Type mapping for comparison
const typeMapping = {
  'UUID': ['uuid'],
  'STRING': ['character varying', 'varchar', 'text'],
  'TEXT': ['text'],
  'INTEGER': ['integer', 'int4'],
  'DECIMAL': ['numeric', 'decimal'],
  'BOOLEAN': ['boolean', 'bool'],
  'DATE': ['timestamp with time zone', 'timestamp without time zone', 'timestamptz'],
  'ENUM': ['user-defined'],
  'JSONB': ['jsonb'],
  'JSON': ['json', 'jsonb']
};

function normalizeType(type) {
  if (!type) return 'unknown';
  const typeStr = type.toString().toUpperCase();
  
  for (const [modelType, dbTypes] of Object.entries(typeMapping)) {
    if (typeStr.includes(modelType)) {
      return modelType;
    }
  }
  return typeStr;
}

function matchType(modelType, dbType) {
  const normalized = normalizeType(modelType);
  const dbTypeLower = dbType.toLowerCase();
  
  const validTypes = typeMapping[normalized];
  if (!validTypes) return false;
  
  return validTypes.some(type => dbTypeLower.includes(type));
}

async function getTableColumns(tableName) {
  const [columns] = await sequelize.query(`
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length,
      numeric_precision,
      numeric_scale
    FROM information_schema.columns
    WHERE table_name = '${tableName}'
    ORDER BY ordinal_position;
  `);
  return columns;
}

async function getForeignKeys(tableName) {
  const [fks] = await sequelize.query(`
    SELECT
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
      AND tc.table_name = '${tableName}';
  `);
  return fks;
}

async function testModel(modelName, Model) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 Testing Model: ${modelName}`);
  console.log('='.repeat(80));

  const tableName = Model.tableName;
  const modelAttributes = Model.rawAttributes;
  
  let errors = [];
  let warnings = [];
  let success = 0;

  try {
    // Get database schema
    const dbColumns = await getTableColumns(tableName);
    const dbForeignKeys = await getForeignKeys(tableName);

    console.log(`\n✓ Table '${tableName}' exists with ${dbColumns.length} columns`);
    console.log(`✓ Model has ${Object.keys(modelAttributes).length} attributes defined\n`);

    // Create lookup maps
    const dbColumnMap = {};
    dbColumns.forEach(col => {
      dbColumnMap[col.column_name] = col;
    });

    const fkMap = {};
    dbForeignKeys.forEach(fk => {
      fkMap[fk.column_name] = fk;
    });

    // Check each model attribute against database
    console.log('Checking model attributes against database...');
    for (const [attrName, attrDef] of Object.entries(modelAttributes)) {
      const fieldName = attrDef.field || attrName;
      const dbColumn = dbColumnMap[fieldName];

      if (!dbColumn) {
        errors.push(`❌ Model field '${attrName}' (${fieldName}) not found in database table`);
        continue;
      }

      // Check data type
      const modelType = attrDef.type;
      const dbType = dbColumn.data_type;
      
      if (!matchType(modelType, dbType)) {
        warnings.push(`⚠️  Type mismatch: ${attrName} - Model: ${normalizeType(modelType)}, DB: ${dbType}`);
      } else {
        success++;
      }

      // Check nullable
      const modelNullable = attrDef.allowNull !== false;
      const dbNullable = dbColumn.is_nullable === 'YES';
      
      if (modelNullable !== dbNullable) {
        warnings.push(`⚠️  Nullable mismatch: ${attrName} - Model: ${modelNullable}, DB: ${dbNullable}`);
      }

      // Check foreign keys
      if (attrDef.references) {
        const fk = fkMap[fieldName];
        if (!fk) {
          warnings.push(`⚠️  Foreign key '${attrName}' defined in model but not found in database`);
        } else {
          const expectedTable = attrDef.references.model;
          const actualTable = fk.foreign_table_name;
          if (expectedTable !== actualTable) {
            errors.push(`❌ FK mismatch: ${attrName} references ${expectedTable} but DB has ${actualTable}`);
          }
        }
      }

      delete dbColumnMap[fieldName]; // Mark as checked
    }

    // Check for database columns not in model
    console.log('\nChecking database columns not in model...');
    const uncheckedColumns = Object.keys(dbColumnMap).filter(col => 
      !['createdAt', 'updatedAt', 'deletedAt'].includes(col)
    );

    if (uncheckedColumns.length > 0) {
      warnings.push(`⚠️  Database has ${uncheckedColumns.length} columns not defined in model: ${uncheckedColumns.join(', ')}`);
    }

    // Print results
    console.log(`\n${'─'.repeat(80)}`);
    console.log('📊 Test Results:');
    console.log(`${'─'.repeat(80)}`);
    console.log(`✅ Successful matches: ${success}`);
    console.log(`⚠️  Warnings: ${warnings.length}`);
    console.log(`❌ Errors: ${errors.length}`);

    if (warnings.length > 0) {
      console.log(`\n⚠️  Warnings:`);
      warnings.forEach(w => console.log(`   ${w}`));
    }

    if (errors.length > 0) {
      console.log(`\n❌ Errors:`);
      errors.forEach(e => console.log(`   ${e}`));
    }

    if (errors.length === 0 && warnings.length === 0) {
      console.log(`\n✨ Perfect match! Model '${modelName}' is fully synchronized with database schema.`);
    }

    return { success, warnings: warnings.length, errors: errors.length };

  } catch (error) {
    console.error(`\n❌ Error testing ${modelName}:`, error.message);
    return { success: 0, warnings: 0, errors: 1 };
  }
}

async function testAllModels() {
  console.log('\n🔍 Restaurant Models Database Schema Validation');
  console.log('='.repeat(80));
  console.log(`Database: ${config.database}`);
  console.log(`Host: ${config.host}:${config.port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(80));

  try {
    await sequelize.authenticate();
    console.log('\n✅ Database connection established\n');

    const results = {};
    for (const [modelName, Model] of Object.entries(models)) {
      results[modelName] = await testModel(modelName, Model);
    }

    // Summary
    console.log('\n\n');
    console.log('='.repeat(80));
    console.log('📊 OVERALL SUMMARY');
    console.log('='.repeat(80));

    const totalSuccess = Object.values(results).reduce((sum, r) => sum + r.success, 0);
    const totalWarnings = Object.values(results).reduce((sum, r) => sum + r.warnings, 0);
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);

    console.log(`\nModels Tested: ${Object.keys(models).length}`);
    console.log(`✅ Total Successful Matches: ${totalSuccess}`);
    console.log(`⚠️  Total Warnings: ${totalWarnings}`);
    console.log(`❌ Total Errors: ${totalErrors}`);

    console.log('\nModel Status:');
    for (const [modelName, result] of Object.entries(results)) {
      const status = result.errors === 0 
        ? (result.warnings === 0 ? '✅ Perfect' : '⚠️  Has Warnings')
        : '❌ Has Errors';
      console.log(`  ${status} - ${modelName}`);
    }

    if (totalErrors === 0 && totalWarnings === 0) {
      console.log('\n✨ All models are perfectly synchronized with database schema! ✨');
    } else if (totalErrors === 0) {
      console.log('\n👍 All models are functional, but some warnings should be reviewed.');
    } else {
      console.log('\n⚠️  Some models have errors that need to be fixed!');
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('\n❌ Database connection failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run tests
testAllModels().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
