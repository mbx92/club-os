/**
 * Copy CFIT Test Type and Norms to Tenant A
 */

const { PsychologyTestType, PsychologyNorm, Tenant, sequelize } = require('./src/models');

async function copyCFITToTenantA() {
  console.log('🔄 Copying CFIT data to Tenant A...\n');

  const transaction = await sequelize.transaction();

  try {
    // 1. List all tenants
    const allTenants = await Tenant.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']]
    });

    console.log('📋 Available tenants:');
    allTenants.forEach((t, idx) => {
      console.log(`   ${idx + 1}. ${t.name} (${t.id})`);
    });

    // Find Dinasty Gym (tenant-a equivalent) and Tenant B
    const tenantA = allTenants.find(t => t.name === 'Dinasty Gym');
    const tenantB = allTenants.find(t => t.name === 'Tenant B');

    if (!tenantA) {
      console.error('\n❌ Dinasty Gym not found');
      return;
    }

    if (!tenantB) {
      console.error('\n❌ Tenant B not found');
      return;
    }

    console.log(`\n✅ Source: ${tenantB.name} (${tenantB.id})`);
    console.log(`✅ Target: ${tenantA.name} (${tenantA.id})`);

    // 2. Check if CFIT already exists for tenant-a
    const existingCFIT = await PsychologyTestType.findOne({
      where: {
        tenantId: tenantA.id,
        code: 'CFIT'
      },
      transaction
    });

    if (existingCFIT) {
      console.log('\n⚠️  CFIT already exists for ' + tenantA.name);
      console.log(`   ID: ${existingCFIT.id}`);
      console.log(`   Name: ${existingCFIT.name}`);
      console.log(`   Active: ${existingCFIT.isActive}`);
      
      console.log('🗑️  Deleting existing CFIT...');
      await existingCFIT.destroy({ transaction });
      console.log('✅ Deleted');
    }

    // 3. Get CFIT from tenant-b
    console.log(`\n🔍 Looking for CFIT in ${tenantB.name}...`);

    const cfitFromB = await PsychologyTestType.findOne({
      where: {
        tenantId: tenantB.id,
        code: 'CFIT'
      },
      transaction
    });

    if (!cfitFromB) {
      console.error(`❌ CFIT not found in ${tenantB.name}`);
      await transaction.rollback();
      return;
    }

    console.log(`✅ Found CFIT: ${cfitFromB.name}`);

    // 4. Copy CFIT to tenant-a
    console.log('\n📋 Copying CFIT test type...');
    const newCFIT = await PsychologyTestType.create({
      tenantId: tenantA.id,
      code: cfitFromB.code,
      name: cfitFromB.name,
      category: cfitFromB.category,
      description: cfitFromB.description,
      questionCount: cfitFromB.questionCount,
      estimatedDuration: cfitFromB.estimatedDuration,
      questions: cfitFromB.questions,
      answerSchema: cfitFromB.answerSchema,
      scoringConfig: cfitFromB.scoringConfig,
      config: cfitFromB.config,
      isActive: cfitFromB.isActive,
      version: cfitFromB.version
    }, { transaction });

    console.log(`✅ Created CFIT for ${tenantA.name} (ID: ${newCFIT.id})`);

    // 5. Copy PsychologyNorms
    console.log('\n📊 Copying psychology norms...');
    const normsFromB = await PsychologyNorm.findAll({
      where: {
        tenantId: tenantB.id,
        testTypeCode: 'CFIT'
      },
      transaction
    });

    console.log(`   Found ${normsFromB.length} norms in ${tenantB.name}`);

    // Check existing norms for tenant-a
    const existingNorms = await PsychologyNorm.findAll({
      where: {
        tenantId: tenantA.id,
        testTypeCode: 'CFIT'
      },
      transaction
    });

    if (existingNorms.length > 0) {
      console.log(`   Deleting ${existingNorms.length} existing norms...`);
      await PsychologyNorm.destroy({
        where: {
          tenantId: tenantA.id,
          testTypeCode: 'CFIT'
        },
        transaction
      });
    }

    // Create norms for tenant-a
    const normsToCreate = normsFromB.map(norm => ({
      tenantId: tenantA.id,
      testTypeCode: norm.testTypeCode,
      ageGroupLabel: norm.ageGroupLabel,
      ageMonthsStart: norm.ageMonthsStart,
      ageMonthsEnd: norm.ageMonthsEnd,
      rawScore: norm.rawScore,
      convertedScore: norm.convertedScore,
      classification: norm.classification
    }));

    await PsychologyNorm.bulkCreate(normsToCreate, { transaction });

    console.log(`✅ Created ${normsToCreate.length} norms for ${tenantA.name}`);

    await transaction.commit();

    // 6. Verify
    console.log('\n🔍 Verifying...');
    const verifyTestType = await PsychologyTestType.findOne({
      where: {
        tenantId: tenantA.id,
        code: 'CFIT'
      }
    });

    const verifyNorms = await PsychologyNorm.count({
      where: {
        tenantId: tenantA.id,
        testTypeCode: 'CFIT'
      }
    });

    console.log(`✅ CFIT Test Type: ${verifyTestType ? 'EXISTS' : 'NOT FOUND'}`);
    console.log(`✅ Norms Count: ${verifyNorms}`);

    if (verifyTestType && verifyNorms > 0) {
      console.log(`\n🎉 CFIT successfully copied to ${tenantA.name}!`);
      console.log('\n📝 Summary:');
      console.log(`   Test Type ID: ${verifyTestType.id}`);
      console.log(`   Code: ${verifyTestType.code}`);
      console.log(`   Name: ${verifyTestType.name}`);
      console.log(`   Question Count: ${verifyTestType.questionCount}`);
      console.log(`   Active: ${verifyTestType.isActive}`);
      console.log(`   Norms: ${verifyNorms} entries`);
    }

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

// Run
copyCFITToTenantA();
