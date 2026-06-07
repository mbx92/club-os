#!/usr/bin/env node

/**
 * Check Tenant Subscription Status
 * 
 * Helps diagnose subscription issues when users can't add new users
 * 
 * Usage: node scripts/checkTenantSubscription.js <tenantId>
 */

require('dotenv').config();
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const { Tenant, Subscription, SubscriptionPlan } = require('../src/models');

async function checkTenantSubscription(tenantId) {
  try {
    console.log('🔍 Checking Tenant Subscription Status');
    console.log('═══════════════════════════════════════\n');

    if (!tenantId) {
      console.log('❌ Please provide tenantId as argument');
      console.log('Usage: node scripts/checkTenantSubscription.js <tenantId>\n');
      process.exit(1);
    }

    // 1. Load tenant
    const tenant = await Tenant.findByPk(tenantId);
    
    if (!tenant) {
      console.log(`❌ Tenant not found: ${tenantId}\n`);
      process.exit(1);
    }

    console.log(`✅ Tenant found: ${tenant.name}`);
    console.log(`   ID: ${tenant.id}`);
    console.log(`   Email: ${tenant.email}\n`);

    // 2. Check trial status
    console.log('📅 Trial Status:');
    console.log('─────────────────────────────────────');
    console.log(`   Is On Trial: ${tenant.isOnTrial ? 'YES ✅' : 'NO'}`);
    
    if (tenant.trialEndDate) {
      const trialEnd = new Date(tenant.trialEndDate);
      const now = new Date();
      const isTrialActive = now <= trialEnd;
      
      console.log(`   Trial End Date: ${trialEnd.toISOString()}`);
      console.log(`   Current Date: ${now.toISOString()}`);
      console.log(`   Trial Active: ${isTrialActive ? 'YES ✅' : 'NO (EXPIRED) ❌'}`);
      
      if (isTrialActive) {
        const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
        console.log(`   Days Left: ${daysLeft} days`);
      }
    } else {
      console.log(`   Trial End Date: NOT SET`);
    }
    console.log('');

    // 3. Check subscriptions
    console.log('💳 Subscription Status:');
    console.log('─────────────────────────────────────');
    
    const subscriptions = await Subscription.findAll({
      where: { tenantId },
      include: [{ model: SubscriptionPlan, as: 'plan' }],
      order: [['createdAt', 'DESC']]
    });

    if (subscriptions.length === 0) {
      console.log('   ❌ NO SUBSCRIPTIONS FOUND\n');
    } else {
      console.log(`   Found ${subscriptions.length} subscription(s):\n`);
      
      subscriptions.forEach((sub, idx) => {
        const now = new Date();
        const startDate = sub.startDate ? new Date(sub.startDate) : null;
        const endDate = sub.endDate ? new Date(sub.endDate) : null;
        
        const isAfterStart = !startDate || now >= startDate;
        const isBeforeEnd = !endDate || now <= endDate;
        const isDateValid = isAfterStart && isBeforeEnd;
        const isStatusActive = sub.status === 'active';
        const isFullyActive = isStatusActive && isDateValid;
        
        console.log(`   ${idx + 1}. Subscription ID: ${sub.id}`);
        console.log(`      Plan: ${sub.plan?.name || 'N/A'}`);
        console.log(`      Status: ${sub.status} ${isStatusActive ? '✅' : '❌'}`);
        
        if (startDate) {
          console.log(`      Start Date: ${startDate.toISOString()}`);
          console.log(`      After Start: ${isAfterStart ? 'YES ✅' : 'NO (NOT YET) ❌'}`);
        } else {
          console.log(`      Start Date: NULL (assuming valid)`);
        }
        
        if (endDate) {
          console.log(`      End Date: ${endDate.toISOString()}`);
          console.log(`      Before End: ${isBeforeEnd ? 'YES ✅' : 'NO (EXPIRED) ❌'}`);
          
          if (isBeforeEnd && endDate) {
            const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            console.log(`      Days Left: ${daysLeft} days`);
          }
        } else {
          console.log(`      End Date: NULL (unlimited or invalid)`);
        }
        
        console.log(`      Current Date: ${now.toISOString()}`);
        console.log(`      Date Valid: ${isDateValid ? 'YES ✅' : 'NO ❌'}`);
        console.log(`      FULLY ACTIVE: ${isFullyActive ? 'YES ✅✅✅' : 'NO ❌❌❌'}`);
        console.log('');
      });
    }

    // 4. Check if tenant can add users
    console.log('👥 Can Add Users?');
    console.log('─────────────────────────────────────');
    
    let canAddUsers = false;
    let reason = '';

    // Check trial
    if (tenant.isOnTrial && tenant.trialEndDate) {
      const now = new Date();
      if (now <= new Date(tenant.trialEndDate)) {
        canAddUsers = true;
        reason = 'Trial is active';
      }
    }

    // Check active subscription
    if (!canAddUsers) {
      const activeSub = subscriptions.find(sub => {
        const now = new Date();
        const startDate = sub.startDate ? new Date(sub.startDate) : null;
        const endDate = sub.endDate ? new Date(sub.endDate) : null;
        const isAfterStart = !startDate || now >= startDate;
        const isBeforeEnd = !endDate || now <= endDate;
        return sub.status === 'active' && isAfterStart && isBeforeEnd;
      });

      if (activeSub) {
        canAddUsers = true;
        reason = `Active subscription: ${activeSub.plan?.name || activeSub.id}`;
      } else {
        reason = 'No active subscription or trial';
      }
    }

    console.log(`   Result: ${canAddUsers ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   Reason: ${reason}\n`);

    // 5. Recommendations
    if (!canAddUsers) {
      console.log('💡 Recommendations:');
      console.log('─────────────────────────────────────');
      
      if (subscriptions.length === 0) {
        console.log('   1. Create a new subscription for this tenant');
        console.log('   2. Or extend trial period if applicable');
      } else {
        const expiredSubs = subscriptions.filter(s => s.status === 'expired');
        const activeSubs = subscriptions.filter(s => s.status === 'active');
        
        if (activeSubs.length > 0) {
          console.log('   ⚠️  Subscription status is "active" but date range is invalid!');
          console.log('   1. Check if startDate is in the future');
          console.log('   2. Check if endDate has passed');
          console.log('   3. Update subscription dates or status');
        } else if (expiredSubs.length > 0) {
          console.log('   1. Renew expired subscription');
          console.log('   2. Or create a new subscription');
        } else {
          console.log('   1. Activate existing subscription');
          console.log('   2. Or check subscription dates');
        }
      }
      console.log('');
    }

    console.log('✅ Check complete\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
const tenantId = process.argv[2];
checkTenantSubscription(tenantId)
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
