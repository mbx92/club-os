/**
 * Model Health Check Script
 * 
 * Comprehensive validation for Sequelize models:
 * 1. Check for duplicate model names
 * 2. Verify all models are loaded
 * 3. Test database connectivity per model
 * 4. Validate associations
 * 5. Test basic CRUD operations
 * 
 * Usage: node scripts/checkModelHealth.js
 */

const db = require('../src/models');
const { Sequelize } = require('sequelize');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80));
}

function subheader(title) {
  console.log('\n' + '─'.repeat(80));
  log(title, 'blue');
  console.log('─'.repeat(80));
}

/**
 * Check for duplicate model definitions
 */
async function checkDuplicateModels() {
  header('🔍 CHECKING FOR DUPLICATE MODELS');
  
  const models = Object.keys(db).filter(k => !['sequelize', 'Sequelize'].includes(k));
  const modelMap = new Map();
  const duplicates = [];
  
  models.forEach(modelName => {
    const model = db[modelName];
    const tableName = model.tableName || modelName;
    
    if (modelMap.has(tableName)) {
      duplicates.push({
        modelName,
        tableName,
        conflictsWith: modelMap.get(tableName)
      });
    } else {
      modelMap.set(tableName, modelName);
    }
  });
  
  if (duplicates.length === 0) {
    log('✅ No duplicate models found', 'green');
    log(`   Total models: ${models.length}`, 'green');
  } else {
    log('❌ DUPLICATE MODELS DETECTED!', 'red');
    duplicates.forEach(dup => {
      log(`   ⚠️  Model '${dup.modelName}' conflicts with '${dup.conflictsWith}'`, 'yellow');
      log(`      Both use table: '${dup.tableName}'`, 'yellow');
    });
  }
  
  return { total: models.length, duplicates: duplicates.length, duplicateList: duplicates };
}

/**
 * Test database connectivity for each model
 */
async function checkDatabaseConnectivity() {
  header('🔌 CHECKING DATABASE CONNECTIVITY');
  
  const models = Object.keys(db).filter(k => !['sequelize', 'Sequelize'].includes(k));
  const results = {
    success: [],
    failed: []
  };
  
  for (const modelName of models) {
    const model = db[modelName];
    
    try {
      // Try to describe the table
      await db.sequelize.getQueryInterface().describeTable(model.tableName);
      results.success.push(modelName);
      log(`✅ ${modelName.padEnd(25)} → ${model.tableName}`, 'green');
    } catch (error) {
      results.failed.push({ model: modelName, error: error.message });
      log(`❌ ${modelName.padEnd(25)} → ${error.message}`, 'red');
    }
  }
  
  console.log('\n' + '─'.repeat(80));
  log(`✅ Connected: ${results.success.length}`, 'green');
  log(`❌ Failed: ${results.failed.length}`, results.failed.length > 0 ? 'red' : 'green');
  
  return results;
}

/**
 * Validate model associations
 */
async function checkAssociations() {
  header('🔗 CHECKING MODEL ASSOCIATIONS');
  
  const models = Object.keys(db).filter(k => !['sequelize', 'Sequelize'].includes(k));
  const results = {
    withAssociations: [],
    withoutAssociations: [],
    brokenAssociations: []
  };
  
  models.forEach(modelName => {
    const model = db[modelName];
    const associations = Object.keys(model.associations || {});
    
    if (associations.length === 0) {
      results.withoutAssociations.push(modelName);
      log(`⚪ ${modelName.padEnd(25)} → No associations`, 'reset');
    } else {
      results.withAssociations.push(modelName);
      log(`✅ ${modelName.padEnd(25)} → ${associations.length} associations`, 'green');
      
      // Check if associated models exist
      associations.forEach(assocName => {
        const assoc = model.associations[assocName];
        const targetModel = assoc.target.name;
        
        if (!db[targetModel]) {
          results.brokenAssociations.push({
            model: modelName,
            association: assocName,
            targetModel
          });
          log(`   ⚠️  Broken: '${assocName}' → ${targetModel} (not found)`, 'yellow');
        } else {
          log(`   ✓ ${assocName} → ${targetModel}`, 'reset');
        }
      });
    }
  });
  
  console.log('\n' + '─'.repeat(80));
  log(`✅ Models with associations: ${results.withAssociations.length}`, 'green');
  log(`⚪ Models without associations: ${results.withoutAssociations.length}`, 'reset');
  log(`⚠️  Broken associations: ${results.brokenAssociations.length}`, results.brokenAssociations.length > 0 ? 'yellow' : 'green');
  
  return results;
}

/**
 * Test basic CRUD operations
 */
async function testCrudOperations() {
  header('🧪 TESTING CRUD OPERATIONS (Sample Models)');
  
  const testModels = ['Tenant', 'User', 'Product', 'ProductCategory', 'Location'];
  const results = {
    passed: [],
    failed: []
  };
  
  for (const modelName of testModels) {
    const model = db[modelName];
    
    if (!model) {
      log(`⚠️  ${modelName} not found, skipping...`, 'yellow');
      continue;
    }
    
    try {
      // Test count operation (safest)
      const count = await model.count();
      results.passed.push(modelName);
      log(`✅ ${modelName.padEnd(25)} → ${count} records`, 'green');
    } catch (error) {
      results.failed.push({ model: modelName, error: error.message });
      log(`❌ ${modelName.padEnd(25)} → ${error.message}`, 'red');
    }
  }
  
  console.log('\n' + '─'.repeat(80));
  log(`✅ CRUD tests passed: ${results.passed.length}/${testModels.length}`, 'green');
  log(`❌ CRUD tests failed: ${results.failed.length}/${testModels.length}`, results.failed.length > 0 ? 'red' : 'green');
  
  return results;
}

/**
 * Check for legacy/backup files
 */
async function checkLegacyFiles() {
  header('📂 CHECKING FOR LEGACY FILES');
  
  const fs = require('fs');
  const path = require('path');
  const modelsDir = path.join(__dirname, '../src/models');
  
  const files = fs.readdirSync(modelsDir);
  const legacyFiles = files.filter(f => 
    f.includes('.legacy') || 
    f.includes('.backup') || 
    f.includes('.old')
  );
  
  if (legacyFiles.length === 0) {
    log('✅ No legacy files found', 'green');
  } else {
    log(`⚠️  Found ${legacyFiles.length} legacy files:`, 'yellow');
    legacyFiles.forEach(file => {
      log(`   - ${file}`, 'yellow');
    });
  }
  
  return legacyFiles;
}

/**
 * Module-specific checks
 */
async function checkModuleModels() {
  header('🍽️ CHECKING MODULE-SPECIFIC MODELS');
  
  const moduleChecks = {
    restaurant: ['Product', 'ProductCategory', 'Location', 'RestaurantTable', 'StockMovement'],
    gym: ['Member', 'Membership', 'CheckIn', 'Trainer', 'ServicePlan'],
    core: ['Tenant', 'User', 'Role', 'Subscription', 'Transaction']
  };
  
  const results = {};
  
  for (const [moduleName, models] of Object.entries(moduleChecks)) {
    subheader(`${moduleName.toUpperCase()} Module`);
    
    const moduleResults = {
      loaded: [],
      missing: []
    };
    
    models.forEach(modelName => {
      if (db[modelName]) {
        moduleResults.loaded.push(modelName);
        log(`✅ ${modelName}`, 'green');
      } else {
        moduleResults.missing.push(modelName);
        log(`❌ ${modelName} - NOT FOUND`, 'red');
      }
    });
    
    results[moduleName] = moduleResults;
    
    console.log('─'.repeat(40));
    log(`Status: ${moduleResults.loaded.length}/${models.length} loaded`, 
        moduleResults.missing.length === 0 ? 'green' : 'yellow');
  }
  
  return results;
}

/**
 * Main health check
 */
async function runHealthCheck() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                    MODEL HEALTH CHECK SYSTEM                               ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════════════╝', 'cyan');
  
  const startTime = Date.now();
  const report = {};
  
  try {
    // 1. Check database connection
    log('\n⏳ Connecting to database...', 'yellow');
    await db.sequelize.authenticate();
    log('✅ Database connection successful', 'green');
    
    // 2. Check for duplicates
    report.duplicates = await checkDuplicateModels();
    
    // 3. Check database connectivity
    report.connectivity = await checkDatabaseConnectivity();
    
    // 4. Check associations
    report.associations = await checkAssociations();
    
    // 5. Test CRUD operations
    report.crud = await testCrudOperations();
    
    // 6. Check legacy files
    report.legacyFiles = await checkLegacyFiles();
    
    // 7. Module-specific checks
    report.modules = await checkModuleModels();
    
    // Final summary
    header('📊 HEALTH CHECK SUMMARY');
    
    const allPassed = 
      report.duplicates.duplicates === 0 &&
      report.connectivity.failed.length === 0 &&
      report.associations.brokenAssociations.length === 0 &&
      report.crud.failed.length === 0;
    
    console.log('');
    log(`Total Models Loaded: ${report.duplicates.total}`, 'cyan');
    log(`Duplicate Models: ${report.duplicates.duplicates}`, report.duplicates.duplicates > 0 ? 'red' : 'green');
    log(`Database Connectivity: ${report.connectivity.success.length}/${report.duplicates.total}`, 
        report.connectivity.failed.length > 0 ? 'yellow' : 'green');
    log(`Broken Associations: ${report.associations.brokenAssociations.length}`, 
        report.associations.brokenAssociations.length > 0 ? 'yellow' : 'green');
    log(`CRUD Test Failures: ${report.crud.failed.length}`, 
        report.crud.failed.length > 0 ? 'red' : 'green');
    log(`Legacy Files: ${report.legacyFiles.length}`, 
        report.legacyFiles.length > 0 ? 'yellow' : 'green');
    
    console.log('\n' + '─'.repeat(80));
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (allPassed) {
      log('✨ ALL HEALTH CHECKS PASSED! ✨', 'green');
      log(`   Models are ready for production use.`, 'green');
    } else {
      log('⚠️  Some issues detected. Please review the report above.', 'yellow');
    }
    
    log(`\n⏱️  Health check completed in ${duration}s`, 'cyan');
    console.log('='.repeat(80) + '\n');
    
    return allPassed ? 0 : 1;
    
  } catch (error) {
    console.error('\n');
    log('❌ HEALTH CHECK FAILED', 'red');
    log(`   Error: ${error.message}`, 'red');
    console.error(error.stack);
    return 1;
  } finally {
    await db.sequelize.close();
  }
}

// Run health check
if (require.main === module) {
  runHealthCheck()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runHealthCheck };
