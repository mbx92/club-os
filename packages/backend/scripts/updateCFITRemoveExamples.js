/**
 * Update CFIT Test Type - Remove Example Questions
 * 
 * Script ini akan:
 * 1. Load CFIT dari database
 * 2. Parse questions JSON
 * 3. Filter hanya questions (remove examples)
 * 4. Update scoringConfig (remove exampleCount)
 * 5. Update questionCount menjadi 46 (dari 57)
 * 6. Save back to database
 * 
 * Safe to run: Tidak akan affect existing test sessions
 */

const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

// Load database config
const env = process.env.NODE_ENV || 'development';
const config = require(path.join(__dirname, '../src/config/config.js'))[env];

// Initialize Sequelize
const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: false
});

async function updateCFITQuestions() {
  try {
    console.log('🔄 Starting CFIT update...\n');

    // Find all CFIT test types
    const [cfitTests] = await sequelize.query(`
      SELECT id, "tenantId", code, name, "questionCount", questions, "scoringConfig"
      FROM "PsychologyTestTypes"
      WHERE code = 'CFIT'
      AND "isActive" = true
    `);

    if (cfitTests.length === 0) {
      console.log('❌ No CFIT test types found in database');
      return;
    }

    console.log(`📋 Found ${cfitTests.length} CFIT test type(s):\n`);

    for (const test of cfitTests) {
      console.log(`\nProcessing: ${test.name} (${test.tenantId})`);
      console.log(`Current question count: ${test.questionCount}`);

      // Parse questions
      let questions = typeof test.questions === 'string' 
        ? JSON.parse(test.questions) 
        : test.questions;

      console.log(`Total items before: ${questions.length}`);
      
      // Count examples
      const exampleCount = questions.filter(q => q.type === 'example').length;
      const questionCount = questions.filter(q => q.type === 'question').length;
      
      console.log(`  - Examples: ${exampleCount}`);
      console.log(`  - Questions: ${questionCount}`);

      // Filter only questions (remove examples)
      const filteredQuestions = questions.filter(q => q.type === 'question');

      // Parse scoringConfig
      let scoringConfig = typeof test.scoringConfig === 'string'
        ? JSON.parse(test.scoringConfig)
        : test.scoringConfig;

      // Remove exampleCount from each subtest
      if (scoringConfig.subtests) {
        Object.keys(scoringConfig.subtests).forEach(subtestKey => {
          delete scoringConfig.subtests[subtestKey].exampleCount;
        });
      }

      // Update database
      await sequelize.query(`
        UPDATE "PsychologyTestTypes"
        SET 
          questions = :questions,
          "scoringConfig" = :scoringConfig,
          "questionCount" = :questionCount,
          "updatedAt" = NOW()
        WHERE id = :id
      `, {
        replacements: {
          id: test.id,
          questions: JSON.stringify(filteredQuestions),
          scoringConfig: JSON.stringify(scoringConfig),
          questionCount: filteredQuestions.length
        }
      });

      console.log(`\n✅ Updated successfully!`);
      console.log(`  - New question count: ${filteredQuestions.length}`);
      console.log(`  - Removed ${exampleCount} examples`);
      console.log(`  - Removed exampleCount from scoringConfig`);
    }

    console.log('\n\n✨ All CFIT test types updated successfully!');
    console.log('\n📌 Note: Existing test sessions are NOT affected by this change.');
    console.log('   New sessions will use the updated question set (46 questions only).');

  } catch (error) {
    console.error('❌ Error updating CFIT:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  updateCFITQuestions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { updateCFITQuestions };
