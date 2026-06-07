/**
 * Fix Role Permissions Format
 * 
 * Converts legacy kebab-case permissions format to CASL format.
 * 
 * Legacy format (WRONG):
 * {
 *   "members": ["read", "create"],
 *   "check-ins": ["read", "update"],
 *   ":id": ["read"]
 * }
 * 
 * CASL format (CORRECT):
 * {
 *   "caslRules": [
 *     { "subject": "Member", "actions": ["read", "create"], "conditions": {"tenantId": "$tenantId"} }
 *   ],
 *   "uiFlags": {},
 *   "menuAccess": []
 * }
 * 
 * Usage:
 *   node scripts/fixRolePermissionsFormat.js [--dry-run]
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.development') });

const { Role } = require('../src/models');
const { DEFAULT_ROLE_PERMISSIONS } = require('../src/utils/defaultRolePermissions');

/**
 * Mapping from kebab-case/camelCase keys to PascalCase CASL subjects
 */
const SUBJECT_MAPPING = {
  // Core
  'tenants': 'Tenant',
  'users': 'User',
  'roles': 'Role',
  'permissions': 'Permission',
  'dashboard': 'Dashboard',
  'logs': 'Log',
  'auditLogs': 'AuditLog',
  'notifications': 'Notification',
  'systemSettings': 'SystemSetting',
  
  // Gym Module
  'members': 'Member',
  'memberships': 'Membership',
  'membership-payments': 'MembershipPayment',
  'membershipPayments': 'MembershipPayment',
  'check-ins': 'CheckIn',
  'checkIns': 'CheckIn',
  'checkins': 'CheckIn',
  'staff': 'Staff',
  'staffAttendance': 'StaffAttendance',
  'staff-attendance': 'StaffAttendance',
  'shifts': 'Shift',
  'trainers': 'Trainer',
  'coaches': 'Coach',
  'trainingPackages': 'TrainingPackage',
  'training-packages': 'TrainingPackage',
  'trainingSessions': 'TrainingSession',
  'training-sessions': 'TrainingSession',
  'classes': 'ClassSchedule',
  'classSchedules': 'ClassSchedule',
  'class-schedules': 'ClassSchedule',
  'classEnrollments': 'ClassEnrollment',
  'class-enrollments': 'ClassEnrollment',
  'classBookings': 'ClassEnrollment',
  'activeServices': 'ActiveService',
  
  // Restaurant Module
  'restaurant': 'Restaurant',
  'restaurantCategories': 'RestaurantCategory',
  'restaurant-categories': 'RestaurantCategory',
  'restaurantProducts': 'RestaurantProduct',
  'restaurant-products': 'RestaurantProduct',
  'restaurantLocations': 'RestaurantLocation',
  'restaurant-locations': 'RestaurantLocation',
  'restaurantTables': 'RestaurantTable',
  'restaurant-tables': 'RestaurantTable',
  'tables': 'RestaurantTable',
  'orders': 'Order',
  'restaurantStock': 'RestaurantStock',
  'restaurant-stock': 'RestaurantStock',
  'stockMovements': 'RestaurantStock',
  'stock-movements': 'RestaurantStock',
  'restaurantReports': 'RestaurantReport',
  'restaurant-reports': 'RestaurantReport',
  
  // Finance Module
  'transactions': 'Transaction',
  'transactionPayments': 'TransactionPayment',
  'transaction-payments': 'TransactionPayment',
  'expenses': 'Expense',
  'cashRegisterSessions': 'CashRegisterSession',
  'cash-register-sessions': 'CashRegisterSession',
  'invoices': 'Invoice',
  'payments': 'Payment',
  'financeReports': 'FinanceReport',
  'finance-reports': 'FinanceReport',
  
  // Psychology Module
  'patients': 'Patient',
  'psychologySessions': 'PsychologySession',
  'psychology-sessions': 'PsychologySession',
  'psychologyPackages': 'PsychologyPackage',
  'psychology-packages': 'PsychologyPackage',
  'psychologyTests': 'PsychologyTest',
  'psychology-tests': 'PsychologyTest',
  'testResults': 'TestResult',
  'test-results': 'TestResult',
  'cfitTests': 'CfitTest',
  'cfit-tests': 'CfitTest',
  'testSubmissions': 'TestSubmission',
  'test-submissions': 'TestSubmission',
  'psychologyDashboard': 'PsychologyDashboard',
  'psychology-dashboard': 'PsychologyDashboard',
  
  // Subscription & Billing
  'subscriptions': 'Subscription',
  'subscriptionPlans': 'SubscriptionPlan',
  'subscription-plans': 'SubscriptionPlan',
  
  // Voucher
  'vouchers': 'Voucher',
  
  // Integrations
  'hikvisionDevices': 'HikvisionDevice',
  'hikvision-devices': 'HikvisionDevice',
  
  // POS Module
  'products': 'Product',
  'productCategories': 'ProductCategory',
  'product-categories': 'ProductCategory',
  'posProducts': 'POSProduct',
  'pos-products': 'POSProduct',
  'posCategories': 'POSCategory',
  'pos-categories': 'POSCategory',
  'posTransactions': 'POSTransaction',
  'pos-transactions': 'POSTransaction',
  'posReports': 'POSReport',
  'pos-reports': 'POSReport',
  
  // Locations
  'locations': 'Location',
};

/**
 * Convert legacy permissions format to CASL format
 * @param {object} legacyPermissions - Old format with kebab-case keys
 * @param {string} roleName - Role name for default lookup
 * @returns {object} - CASL format permissions
 */
function convertToCAslFormat(legacyPermissions, roleName) {
  // If already has caslRules, return as-is
  if (legacyPermissions.caslRules && Array.isArray(legacyPermissions.caslRules)) {
    console.log(`   ℹ Role "${roleName}" already has caslRules format`);
    return legacyPermissions;
  }
  
  // Try to get defaults for this role
  const defaults = DEFAULT_ROLE_PERMISSIONS[roleName] || 
                   DEFAULT_ROLE_PERMISSIONS[roleName.toLowerCase()];
  
  if (defaults && defaults.caslRules) {
    console.log(`   ✓ Using default permissions for role "${roleName}"`);
    return {
      caslRules: defaults.caslRules,
      uiFlags: defaults.uiFlags || {},
      menuAccess: defaults.menuAccess || [],
    };
  }
  
  // Convert legacy format to CASL
  const caslRules = [];
  const legacyKeys = Object.keys(legacyPermissions).filter(
    key => !['caslRules', 'uiFlags', 'menuAccess'].includes(key)
  );
  
  if (legacyKeys.length === 0) {
    console.log(`   ⚠ Role "${roleName}" has empty permissions`);
    return {
      caslRules: [],
      uiFlags: {},
      menuAccess: [],
    };
  }
  
  console.log(`   → Converting ${legacyKeys.length} legacy keys to CASL format`);
  
  for (const key of legacyKeys) {
    // Skip invalid keys like ":id", ":voucherid"
    if (key.startsWith(':')) {
      console.log(`   ⚠ Skipping invalid key: "${key}"`);
      continue;
    }
    
    const subject = SUBJECT_MAPPING[key];
    if (!subject) {
      console.log(`   ⚠ No mapping found for key: "${key}" (skipping)`);
      continue;
    }
    
    const actions = legacyPermissions[key];
    if (!Array.isArray(actions)) {
      console.log(`   ⚠ Invalid actions format for key: "${key}" (skipping)`);
      continue;
    }
    
    // Create CASL rule
    caslRules.push({
      subject,
      actions,
      conditions: { tenantId: '$tenantId' },
    });
    
    console.log(`   ✓ Converted "${key}" → "${subject}" [${actions.join(', ')}]`);
  }
  
  return {
    caslRules,
    uiFlags: legacyPermissions.uiFlags || {},
    menuAccess: legacyPermissions.menuAccess || [],
  };
}

/**
 * Main migration function
 */
async function fixRolePermissions(dryRun = false) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Fix Role Permissions Format');
  console.log('  Convert legacy kebab-case format to CASL format');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be saved\n');
  }
  
  try {
    // Fetch all roles
    const roles = await Role.findAll({
      attributes: ['id', 'name', 'description', 'permissions', 'isActive'],
    });
    
    console.log(`Found ${roles.length} roles\n`);
    
    let fixed = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const role of roles) {
      console.log(`\n📋 Role: ${role.name} (${role.id})`);
      console.log(`   Active: ${role.isActive}`);
      
      try {
        const currentPermissions = role.permissions || {};
        
        // Show current format
        const currentKeys = Object.keys(currentPermissions);
        console.log(`   Current keys: ${currentKeys.length > 0 ? currentKeys.join(', ') : '(empty)'}`);
        
        // Convert to CASL format
        const newPermissions = convertToCAslFormat(currentPermissions, role.name);
        
        // Check if conversion needed
        if (JSON.stringify(currentPermissions) === JSON.stringify(newPermissions)) {
          console.log(`   ℹ No changes needed`);
          skipped++;
          continue;
        }
        
        console.log(`   New format: ${newPermissions.caslRules.length} CASL rules`);
        
        if (!dryRun) {
          await role.update({ permissions: newPermissions });
          console.log(`   ✅ Updated successfully`);
        } else {
          console.log(`   ℹ Would update (dry run)`);
        }
        
        fixed++;
      } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
        errors++;
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Summary');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`Total roles:    ${roles.length}`);
    console.log(`Fixed:          ${fixed}`);
    console.log(`Skipped:        ${skipped}`);
    console.log(`Errors:         ${errors}`);
    
    if (dryRun) {
      console.log('\n🔍 This was a DRY RUN - no changes were saved');
      console.log('   Run without --dry-run to apply changes');
    } else {
      console.log('\n✅ Migration completed successfully');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Run migration
fixRolePermissions(dryRun);
