#!/usr/bin/env node
/**
 * Migration Script: Convert Permission Format
 * 
 * Converts existing role permissions from legacy format to new format:
 * - OLD: { action: 'read', subject: 'Member' }
 * - NEW: { subject: 'Member', actions: ['read'], conditions: { tenantId: '$tenantId' } }
 * 
 * Usage:
 *   node scripts/migratePermissionFormat.js [--dry-run]
 * 
 * Options:
 *   --dry-run    Preview changes without applying them
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Role } = require('../src/models');
const logger = require('../src/utils/logger');

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Convert single CASL rule from old format to new format
 */
function convertRule(rule) {
  // If rule already has 'actions' array, check if it's empty
  if (rule.actions !== undefined) {
    if (Array.isArray(rule.actions) && rule.actions.length > 0) {
      // Already in new format with actions array
      return {
        subject: rule.subject,
        actions: rule.actions,
        conditions: rule.conditions || { tenantId: '$tenantId' },
        fields: rule.fields,
        inverted: rule.inverted,
      };
    } else if (rule.action) {
      // Has 'action' (singular) as fallback
      return {
        subject: rule.subject,
        actions: [rule.action],
        conditions: rule.conditions || { tenantId: '$tenantId' },
        fields: rule.fields,
        inverted: rule.inverted,
      };
    }
  }
  
  // Old format: { action: 'read', subject: 'Member' }
  if (rule.action) {
    return {
      subject: rule.subject,
      actions: Array.isArray(rule.action) ? rule.action : [rule.action],
      conditions: rule.conditions || { tenantId: '$tenantId' },
      fields: rule.fields,
      inverted: rule.inverted,
    };
  }
  
  // Unknown format - return as is with warning
  console.warn('⚠️  Unknown rule format:', JSON.stringify(rule));
  return rule;
}

/**
 * Migrate permissions for a single role
 */
async function migrateRole(role) {
  const permissions = role.permissions || {};
  const oldCaslRules = permissions.caslRules || [];
  
  if (oldCaslRules.length === 0) {
    console.log(`   ⏩ Role "${role.name}": No CASL rules found, skipping`);
    return { processed: false, changes: 0 };
  }
  
  // Convert all rules
  const newCaslRules = oldCaslRules.map(convertRule);
  
  // Check if any changes were made
  const hasChanges = JSON.stringify(oldCaslRules) !== JSON.stringify(newCaslRules);
  
  if (!hasChanges) {
    console.log(`   ✓ Role "${role.name}": Already in new format (${oldCaslRules.length} rules)`);
    return { processed: true, changes: 0 };
  }
  
  console.log(`   🔄 Role "${role.name}": Converting ${oldCaslRules.length} rules`);
  
  // Show sample differences
  if (oldCaslRules.length > 0) {
    console.log('      OLD:', JSON.stringify(oldCaslRules[0], null, 2).split('\n').join('\n      '));
    console.log('      NEW:', JSON.stringify(newCaslRules[0], null, 2).split('\n').join('\n      '));
  }
  
  if (!DRY_RUN) {
    await role.update({
      permissions: {
        ...permissions,
        caslRules: newCaslRules,
      },
    });
    console.log(`   ✅ Role "${role.name}": Migration completed`);
  } else {
    console.log(`   🔍 Role "${role.name}": Would be migrated (dry-run mode)`);
  }
  
  return { processed: true, changes: oldCaslRules.length };
}

/**
 * Main migration function
 */
async function migratePermissions() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Permission Format Migration Script');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY-RUN (preview only)' : '✏️  WRITE (will apply changes)'}`);
  console.log('');
  
  try {
    // Fetch all roles
    const roles = await Role.findAll({
      order: [['name', 'ASC']],
    });
    
    console.log(`Found ${roles.length} roles to process\n`);
    
    const stats = {
      total: roles.length,
      processed: 0,
      skipped: 0,
      totalChanges: 0,
    };
    
    // Process each role
    for (const role of roles) {
      try {
        const result = await migrateRole(role);
        
        if (result.processed) {
          stats.processed++;
          stats.totalChanges += result.changes;
        } else {
          stats.skipped++;
        }
      } catch (error) {
        console.error(`   ❌ Error processing role "${role.name}":`, error.message);
      }
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('Migration Summary');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total roles:        ${stats.total}`);
    console.log(`Processed:          ${stats.processed}`);
    console.log(`Skipped:            ${stats.skipped}`);
    console.log(`Total rules changed: ${stats.totalChanges}`);
    
    if (DRY_RUN) {
      console.log('\n⚠️  DRY-RUN MODE: No changes were applied');
      console.log('Run without --dry-run to apply changes');
    } else {
      console.log('\n✅ Migration completed successfully!');
      
      logger.logSystem('Permission format migration completed', {
        action: 'PERMISSION_FORMAT_MIGRATION',
        stats,
      });
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    
    logger.error('Permission format migration failed', {
      action: 'PERMISSION_FORMAT_MIGRATION_FAILED',
      error: error.message,
      stack: error.stack,
    });
    
    process.exit(1);
  }
}

// Run migration
migratePermissions()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
