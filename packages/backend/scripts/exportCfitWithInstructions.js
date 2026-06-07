/**
 * Export CFIT Test with Instructions to JSON
 * Creates a complete JSON file that can be imported directly
 */

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

const config = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: false
};

async function exportCfit() {
  const sequelize = new Sequelize(config);

  try {
    console.log('============================================================');
    console.log('EXPORT CFIT TEST WITH INSTRUCTIONS');
    console.log('============================================================');
    console.log(`Database: ${config.database}\n`);

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get CFIT test
    const [results] = await sequelize.query(`
      SELECT 
        code,
        name,
        description,
        category,
        "estimatedDuration",
        questions,
        "answerSchema",
        "scoringConfig",
        config,
        "isActive",
        version
      FROM "PsychologyTestTypes"
      WHERE code = 'CFIT'
      AND "tenantId" = 'cfb6ff5b-5e05-4a94-95c5-4584db9ac6d1'
    `);

    if (results.length === 0) {
      console.log('❌ CFIT test not found');
      process.exit(1);
    }

    const cfit = results[0];
    
    // Build export object
    const exportData = {
      code: cfit.code,
      name: cfit.name,
      description: cfit.description,
      category: cfit.category,
      estimatedDuration: cfit.estimatedDuration,
      questions: cfit.questions, // Already includes instructions
      answerSchema: cfit.answerSchema,
      scoringConfig: cfit.scoringConfig,
      config: cfit.config,
      isActive: cfit.isActive,
      version: '1.4', // Increment version
      exportedAt: new Date().toISOString(),
      exportedBy: 'system',
      changelog: [
        {
          version: '1.4',
          date: '2025-12-11',
          changes: [
            'Added instruction pages for all 4 subtests',
            'Each instruction includes: title, subtitle, intro, examples, rules, warnings, timeLimit',
            'Series: 3 examples, 4 rules, 180s limit',
            'Classification: 2 examples, 4 rules, 240s limit',
            'Matrices: 3 examples, 4 rules, 180s limit',
            'Topology: 3 examples, 4 rules, 2 warnings, 150s limit',
            'Total structure: 4 instructions + 46 questions = 50 items'
          ]
        }
      ]
    };

    // Count items
    const instructions = cfit.questions.filter(q => q.type === 'instruction');
    const questions = cfit.questions.filter(q => q.type === 'question');

    console.log('📊 Export Summary:');
    console.log(`  Total items: ${cfit.questions.length}`);
    console.log(`  Instructions: ${instructions.length}`);
    console.log(`  Questions: ${questions.length}`);
    console.log('');

    // Show instruction summary
    console.log('📝 Instructions Included:');
    instructions.forEach((inst, idx) => {
      console.log(`  ${idx + 1}. ${inst.subtest.toUpperCase()}`);
      console.log(`     - Title: ${inst.title}`);
      console.log(`     - Examples: ${inst.content.examples.length}`);
      console.log(`     - Rules: ${inst.content.rules.length}`);
      console.log(`     - Time: ${inst.content.timeLimit}s`);
    });
    console.log('');

    // Save to file
    const outputDir = path.join(__dirname, '..', 'public', 'psychology', 'export');
    const outputFile = path.join(outputDir, 'CFIT_v1.4_with_instructions.json');

    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2), 'utf8');

    console.log('✅ Export successful!');
    console.log(`📁 File: ${outputFile}`);
    console.log('');
    console.log('============================================================');
    console.log('This JSON can now be imported to any environment without');
    console.log('needing to run the updateCfitWithInstructions.js script.');
    console.log('============================================================');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

exportCfit();
