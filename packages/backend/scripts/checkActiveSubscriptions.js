const { Subscription, SubscriptionPlan, Tenant } = require('../src/models');

(async () => {
  try {
    const subs = await Subscription.findAll({
      where: { status: 'active' },
      include: [
        { 
          model: SubscriptionPlan, 
          as: 'plan' 
        },
        { 
          model: Tenant, 
          as: 'tenant', 
          attributes: ['id', 'name', 'isOnTrial', 'trialEndDate'] 
        }
      ],
      order: [['endDate', 'ASC']]
    });

    console.log('='.repeat(60));
    console.log('ACTIVE SUBSCRIPTIONS CHECK');
    console.log('Current Time:', new Date().toISOString());
    console.log('='.repeat(60));

    if (subs.length === 0) {
      console.log('\n❌ No active subscriptions found!');
    }

    subs.forEach((s, index) => {
      const now = new Date();
      const startDate = new Date(s.startDate);
      const endDate = new Date(s.endDate);
      const isExpired = now > endDate;
      const isNotStarted = now < startDate;
      const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

      console.log(`\n[${index + 1}] Tenant: ${s.tenant.name}`);
      console.log(`    Tenant ID: ${s.tenant.id}`);
      console.log(`    Plan: ${s.plan.name}`);
      console.log(`    Start Date: ${startDate.toISOString()}`);
      console.log(`    End Date: ${endDate.toISOString()}`);
      console.log(`    Status in DB: ${s.status}`);
      console.log(`    Is Trial: ${s.tenant.isOnTrial ? 'YES' : 'NO'}`);
      
      if (isNotStarted) {
        console.log(`    ⚠️  NOT STARTED YET (starts in ${Math.ceil((startDate - now) / (1000 * 60 * 60 * 24))} days)`);
      } else if (isExpired) {
        console.log(`    ❌ EXPIRED ${Math.abs(daysRemaining)} days ago`);
      } else {
        console.log(`    ✅ ACTIVE (${daysRemaining} days remaining)`);
      }
    });

    console.log('\n' + '='.repeat(60));
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  }

  process.exit();
})();
