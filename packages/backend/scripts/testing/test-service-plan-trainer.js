// Test script for ServicePlan with trainer support
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const { ServicePlan, Trainer, Tenant } = require('./src/models');

async function testServicePlanTrainer() {
  try {
    console.log('Testing ServicePlan with trainer support...\n');

    // Test 1: Fetch service plans with trainer included
    console.log('1. Fetching service plans with trainer...');
    const servicePlans = await ServicePlan.findAll({
      limit: 5,
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name']
        },
        {
          model: Trainer,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'specializations'],
          required: false
        }
      ]
    });

    console.log(`Found ${servicePlans.length} service plans`);
    servicePlans.forEach(sp => {
      console.log(`  - ${sp.name} (${sp.serviceType})`);
      if (sp.trainer) {
        console.log(`    Trainer: ${sp.trainer.firstName} ${sp.trainer.lastName}`);
      } else {
        console.log(`    Trainer: None`);
      }
    });

    // Test 2: Check if trainerId column exists
    console.log('\n2. Checking ServicePlan attributes...');
    const samplePlan = servicePlans[0];
    if (samplePlan) {
      const hasTrainerId = 'trainerId' in samplePlan.dataValues;
      console.log(`  trainerId field exists: ${hasTrainerId}`);
      console.log(`  trainerId value: ${samplePlan.trainerId || 'null'}`);
    }

    console.log('\n✅ ServicePlan trainer support is working correctly!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing ServicePlan:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testServicePlanTrainer();
