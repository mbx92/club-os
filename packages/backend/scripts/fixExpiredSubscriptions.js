const { Subscription, SubscriptionPlan, Tenant } = require('../src/models');
const { Op } = require('sequelize');

(async () => {
  try {
    console.log('='.repeat(60));
    console.log('SUBSCRIPTION CLEANUP - Fix Expired "active" Subscriptions');
    console.log('Current Time:', new Date().toISOString());
    console.log('='.repeat(60));

    // Find all subscriptions with status='active' but endDate is past
    const now = new Date();
    const expiredButActive = await Subscription.findAll({
      where: {
        status: 'active',
        endDate: {
          [Op.lt]: now // endDate < now
        }
      },
      include: [
        { model: SubscriptionPlan, as: 'plan' },
        { model: Tenant, as: 'tenant', attributes: ['id', 'name'] }
      ]
    });

    if (expiredButActive.length === 0) {
      console.log('\n✅ No expired subscriptions found with active status.');
      console.log('   Database is clean!');
      process.exit();
      return;
    }

    console.log(`\n⚠️  Found ${expiredButActive.length} subscription(s) that are expired but still marked as 'active':\n`);

    expiredButActive.forEach((s, index) => {
      const daysExpired = Math.ceil((now - new Date(s.endDate)) / (1000 * 60 * 60 * 24));
      console.log(`[${index + 1}] Tenant: ${s.tenant.name} (${s.tenant.id})`);
      console.log(`    Plan: ${s.plan.name}`);
      console.log(`    End Date: ${s.endDate}`);
      console.log(`    Expired: ${daysExpired} days ago`);
      console.log(`    Current Status: ${s.status} ❌ (should be 'expired')`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('UPDATING EXPIRED SUBSCRIPTIONS...');
    console.log('='.repeat(60));

    // Update all expired subscriptions to status = 'expired'
    const [updatedCount] = await Subscription.update(
      { status: 'expired' },
      {
        where: {
          status: 'active',
          endDate: {
            [Op.lt]: now
          }
        }
      }
    );

    console.log(`\n✅ Successfully updated ${updatedCount} subscription(s) to 'expired' status.`);
    console.log('\n' + '='.repeat(60));

  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
  }

  process.exit();
})();
