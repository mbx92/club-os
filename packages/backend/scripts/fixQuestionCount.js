#!/usr/bin/env node
'use strict';

/**
 * Script untuk fix questionCount pada semua PsychologyTestType
 * Menghitung ulang questionCount dengan exclude instructions
 * 
 * Usage:
 *   node scripts/fixQuestionCount.js --dry-run     # Preview saja
 *   node scripts/fixQuestionCount.js               # Execute fix
 */

// Load environment
const path = require('path');
const env = process.env.NODE_ENV || 'development';

// Load environment files based on NODE_ENV
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', `.env.${env}`), override: true });

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_DIALECT'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error(`\nPlease ensure .env.${env} file exists with database configuration.`);
  process.exit(1);
}

// Parse arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

console.log('='.repeat(60));
console.log('FIX QUESTION COUNT - EXCLUDE INSTRUCTIONS');
console.log('='.repeat(60));
console.log(`Environment: ${env}`);
console.log(`Mode: ${dryRun ? 'DRY RUN (preview only)' : 'EXECUTE'}`);
console.log(`Database: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
console.log('='.repeat(60));

async function main() {
  // Import after dotenv loaded
  const db = require('../src/models');
  const { PsychologyTestType } = db;

  try {
    // Connect to database
    await db.sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get all test types
    const testTypes = await PsychologyTestType.findAll({
      attributes: ['id', 'tenantId', 'code', 'name', 'questionCount', 'questions']
    });

    console.log(`Found ${testTypes.length} test types to check\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const testType of testTypes) {
      const questions = testType.questions || [];
      
      // Count only actual questions (exclude instructions)
      const actualQuestionCount = questions.filter(q => q.type === 'question').length;
      const totalItems = questions.length;
      const instructionCount = questions.filter(q => q.type === 'instruction').length;
      
      const needsUpdate = testType.questionCount !== actualQuestionCount;
      
      if (needsUpdate) {
        console.log(`📝 ${testType.code} (${testType.name})`);
        console.log(`   Total items: ${totalItems}`);
        console.log(`   Instructions: ${instructionCount}`);
        console.log(`   Actual questions: ${actualQuestionCount}`);
        console.log(`   Current questionCount: ${testType.questionCount}`);
        console.log(`   ${dryRun ? 'Would update to' : 'Updating to'}: ${actualQuestionCount}`);
        
        if (!dryRun) {
          await testType.update({ questionCount: actualQuestionCount });
          console.log(`   ✅ Updated!`);
        }
        
        updatedCount++;
        console.log('');
      } else {
        skippedCount++;
        if (args.includes('--verbose')) {
          console.log(`✓ ${testType.code}: questionCount already correct (${actualQuestionCount})`);
        }
      }
    }

    console.log('='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total test types: ${testTypes.length}`);
    console.log(`${dryRun ? 'Would update' : 'Updated'}: ${updatedCount}`);
    console.log(`Skipped (already correct): ${skippedCount}`);
    
    if (dryRun && updatedCount > 0) {
      console.log('\n💡 Run without --dry-run to apply changes');
    }

    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await db.sequelize.close();
    process.exit(1);
  }
}

main();
