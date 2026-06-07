/**
 * Feature Sync CLI Script
 * 
 * Usage:
 *   node scripts/syncFeatures.js                  # Sync all plans
 *   node scripts/syncFeatures.js --compare        # Compare only (dry-run)
 *   node scripts/syncFeatures.js --create         # Create missing plans
 *   node scripts/syncFeatures.js --health         # Health check
 *   node scripts/syncFeatures.js --preview Basic  # Preview plan features
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { sequelize } = require('../src/models');
const FeatureSyncService = require('../src/services/featureSyncService');

const args = process.argv.slice(2);
const command = args[0];
const param = args[1];

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    if (command === '--compare') {
      console.log('📊 Comparing features with registry...\n');
      const comparison = await FeatureSyncService.compareWithRegistry();
      
      comparison.forEach(plan => {
        console.log(`\n📋 Plan: ${plan.planName}`);
        console.log(`   Status: ${plan.inSync ? '✅ In Sync' : '⚠️  Out of Sync'}`);
        
        if (plan.differences.length > 0) {
          console.log(`   Differences (${plan.differences.length}):`);
          plan.differences.forEach(diff => {
            console.log(`   - ${diff.type}: ${diff.message}`);
          });
        }
      });
      
    } else if (command === '--create') {
      console.log('🆕 Creating missing plans...\n');
      const result = await FeatureSyncService.createMissingPlans();
      
      console.log(`\n${result.message}`);
      if (result.created.length > 0) {
        result.created.forEach(plan => {
          console.log(`✓ Created: ${plan.name} (${plan.id})`);
        });
      }
      
    } else if (command === '--health') {
      console.log('🏥 Running health check...\n');
      const health = await FeatureSyncService.healthCheck();
      
      console.log(`Status: ${health.healthy ? '✅ Healthy' : '⚠️  Needs Sync'}`);
      console.log(`Total Plans: ${health.totalPlans}`);
      console.log(`In Sync: ${health.inSync}`);
      console.log(`Out of Sync: ${health.outOfSync}`);
      
      if (!health.healthy) {
        console.log('\n⚠️  Plans needing sync:');
        health.details.forEach(plan => {
          console.log(`  - ${plan.planName} (${plan.differences.length} differences)`);
        });
        console.log('\nRun: node scripts/syncFeatures.js (to sync all)');
      }
      
    } else if (command === '--preview') {
      if (!param) {
        console.log('❌ Error: Plan name required');
        console.log('Usage: node scripts/syncFeatures.js --preview Basic');
        process.exit(1);
      }
      
      console.log(`🔍 Previewing features for plan: ${param}\n`);
      const features = FeatureSyncService.previewFeatures(param);
      console.log(JSON.stringify(features, null, 2));
      
    } else if (command === '--metadata') {
      console.log('📚 Feature metadata:\n');
      const metadata = FeatureSyncService.getMetadata();
      
      const categories = {};
      metadata.forEach(feature => {
        if (!categories[feature.category]) {
          categories[feature.category] = [];
        }
        categories[feature.category].push(feature);
      });
      
      for (const [category, features] of Object.entries(categories)) {
        console.log(`\n📂 ${category.toUpperCase()} (${features.length} features)`);
        features.forEach(f => {
          console.log(`   ${f.icon || '•'} ${f.label}`);
          console.log(`      ${f.description}`);
          if (f.availableIn) {
            console.log(`      Plans: ${f.availableIn.join(', ')}`);
          }
        });
      }
      
    } else {
      // Default: Sync all plans
      console.log('🔄 Syncing all subscription plans...\n');
      const result = await FeatureSyncService.syncAllPlans();
      
      console.log('\n' + '='.repeat(60));
      console.log('Sync Results:');
      console.log('='.repeat(60));
      
      const skippedPlans = result.skipped || [];
      const processedPlans = result.synced.filter(plan => !plan.skipped);
      
      processedPlans.forEach(plan => {
        const status = plan.changed ? '🔄 Updated' : '✓ No changes';
        const baseInfo = plan.detectedBase ? ` (base: ${plan.detectedBase})` : '';
        console.log(`${status} ${plan.planName}${baseInfo}`);
      });
      
      if (skippedPlans.length > 0) {
        console.log('\n⚠️  Skipped Plans (no base detected from name):');
        skippedPlans.forEach(plan => {
          console.log(`  - ${plan.planName}`);
          console.log(`    💡 Rename to include: Basic, Professional, or Enterprise`);
        });
      }
      
      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.forEach(error => {
          console.log(`  - ${error.planName}: ${error.error}`);
        });
      }
      
      console.log('\n' + '='.repeat(60));
      console.log(`✅ Synced: ${processedPlans.length} plans`);
      console.log(`⚠️  Skipped: ${skippedPlans.length} plans`);
      console.log(`❌ Errors: ${result.errors.length}`);
      console.log('='.repeat(60));
    }

    console.log('\n✓ Done\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Show help
if (command === '--help' || command === '-h') {
  console.log(`
Feature Sync CLI

Usage:
  node scripts/syncFeatures.js                   Sync all plans with registry
  node scripts/syncFeatures.js --compare         Compare features (dry-run)
  node scripts/syncFeatures.js --create          Create missing plans
  node scripts/syncFeatures.js --health          Health check
  node scripts/syncFeatures.js --preview <plan>  Preview plan features
  node scripts/syncFeatures.js --metadata        Show all available features
  node scripts/syncFeatures.js --help            Show this help

Examples:
  node scripts/syncFeatures.js --preview Basic
  node scripts/syncFeatures.js --compare
  node scripts/syncFeatures.js
  `);
  process.exit(0);
}

main();
