/**
 * Verify CFIT per Tenant
 */

const { PsychologyTestType, PsychologyNorm, Tenant, sequelize } = require('./src/models');

async function verifyCFITPerTenant() {
  try {
    console.log('🔍 Verifying CFIT data per tenant...\n');

    const tenants = await Tenant.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']]
    });

    for (const tenant of tenants) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 Tenant: ${tenant.name}`);
      console.log(`   ID: ${tenant.id}`);
      console.log(`${'='.repeat(60)}`);

      // Check CFIT test type
      const cfitTestType = await PsychologyTestType.findOne({
        where: {
          tenantId: tenant.id,
          code: 'CFIT'
        }
      });

      if (cfitTestType) {
        console.log('\n✅ CFIT Test Type: FOUND');
        console.log(`   ID: ${cfitTestType.id}`);
        console.log(`   Name: ${cfitTestType.name}`);
        console.log(`   Question Count: ${cfitTestType.questionCount}`);
        console.log(`   Active: ${cfitTestType.isActive}`);
        
        // Parse questions
        const questions = typeof cfitTestType.questions === 'string'
          ? JSON.parse(cfitTestType.questions)
          : cfitTestType.questions;
        
        console.log(`   Total Questions: ${questions.length}`);
        
        const questionsOnly = questions.filter(q => q.type === 'question');
        const examples = questions.filter(q => q.type === 'example');
        
        console.log(`   - Actual Questions: ${questionsOnly.length}`);
        console.log(`   - Examples: ${examples.length}`);
        
        // Check by subtest
        const subtests = ['series', 'classification', 'matrices', 'topology'];
        console.log('\n   By Subtest:');
        subtests.forEach(subtest => {
          const count = questionsOnly.filter(q => q.subtest === subtest).length;
          const exCount = examples.filter(q => q.subtest === subtest).length;
          console.log(`     - ${subtest}: ${count} questions, ${exCount} examples`);
        });
      } else {
        console.log('\n❌ CFIT Test Type: NOT FOUND');
      }

      // Check norms
      const normsCount = await PsychologyNorm.count({
        where: {
          tenantId: tenant.id,
          testTypeCode: 'CFIT'
        }
      });

      if (normsCount > 0) {
        console.log(`\n✅ Psychology Norms: ${normsCount} entries`);
        
        // Check score range
        const minScore = await PsychologyNorm.min('rawScore', {
          where: { tenantId: tenant.id, testTypeCode: 'CFIT' }
        });
        
        const maxScore = await PsychologyNorm.max('rawScore', {
          where: { tenantId: tenant.id, testTypeCode: 'CFIT' }
        });
        
        console.log(`   Score Range: ${minScore} - ${maxScore}`);
        
        // Check classifications
        const classifications = await sequelize.query(
          `SELECT DISTINCT classification 
           FROM "PsychologyNorms" 
           WHERE "tenantId" = :tenantId AND "testTypeCode" = 'CFIT'
           ORDER BY classification`,
          {
            replacements: { tenantId: tenant.id },
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        console.log(`   Classifications: ${classifications.map(c => c.classification).join(', ')}`);
      } else {
        console.log('\n❌ Psychology Norms: NOT FOUND');
      }

      // Summary
      const hasBoth = cfitTestType && normsCount > 0;
      console.log(`\n${hasBoth ? '✅' : '❌'} Status: ${hasBoth ? 'COMPLETE' : 'INCOMPLETE'}`);
    }

    console.log(`\n\n${'='.repeat(60)}`);
    console.log('📊 Overall Summary');
    console.log(`${'='.repeat(60)}`);
    
    const totalTestTypes = await PsychologyTestType.count({
      where: { code: 'CFIT' }
    });
    
    const totalNorms = await PsychologyNorm.count({
      where: { testTypeCode: 'CFIT' }
    });
    
    console.log(`Total CFIT Test Types: ${totalTestTypes}`);
    console.log(`Total CFIT Norms: ${totalNorms}`);
    console.log(`Tenants Checked: ${tenants.length}`);
    
    console.log('\n✅ Verification complete!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

verifyCFITPerTenant();
