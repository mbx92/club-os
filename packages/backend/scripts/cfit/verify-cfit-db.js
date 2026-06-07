const { Sequelize } = require('sequelize');
const config = require('./src/config/config.js');

const sequelize = new Sequelize(config.development);

async function verify() {
  try {
    // Check CFIT test type
    const [testType] = await sequelize.query(`
      SELECT code, name, category, "questionCount", "estimatedDuration", "isActive"
      FROM "PsychologyTestTypes"
      WHERE code = 'CFIT'
      LIMIT 1
    `);
    
    console.log('=== CFIT Test Type ===');
    if (testType.length > 0) {
      console.log('OK Found:', testType[0]);
      
      // Check questions structure
      const [questionsData] = await sequelize.query(`
        SELECT jsonb_array_length(questions) as question_count
        FROM "PsychologyTestTypes"
        WHERE code = 'CFIT'
      `);
      console.log('OK Questions loaded:', questionsData[0].question_count, 'items (including examples)');
    } else {
      console.log('FAIL CFIT test type not found!');
    }
    
    // Check norms
    const [norms] = await sequelize.query(`
      SELECT COUNT(*) as count, 
             MIN("rawScore") as min_score,
             MAX("rawScore") as max_score,
             COUNT(DISTINCT "ageGroupLabel") as age_groups
      FROM "PsychologyNorms"
      WHERE "testTypeCode" = 'CFIT'
    `);
    
    console.log('\n=== CFIT Norms ===');
    if (norms.length > 0 && norms[0].count > 0) {
      console.log('OK Total norms:', norms[0].count);
      console.log('OK Score range:', norms[0].min_score, '-', norms[0].max_score);
      console.log('OK Age groups:', norms[0].age_groups);
    } else {
      console.log('FAIL No norms found!');
    }
    
    // Sample norms
    const [sampleNorms] = await sequelize.query(`
      SELECT "rawScore", "convertedScore", classification
      FROM "PsychologyNorms"
      WHERE "testTypeCode" = 'CFIT'
      ORDER BY "rawScore" DESC
      LIMIT 5
    `);
    
    console.log('\n=== Sample Norms (Top 5) ===');
    sampleNorms.forEach(norm => {
      console.log(`  Raw: ${norm.rawScore} -> IQ: ${norm.convertedScore || 'N/A'} -> ${norm.classification}`);
    });
    
    await sequelize.close();
    console.log('\n=== PHASE 2 COMPLETED ===');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verify();
