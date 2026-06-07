/**
 * Verify CFIT Instructions in Database
 * Checks that instructions were added correctly
 */

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const { Sequelize } = require('sequelize');

const config = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: false
};

async function verifyInstructions() {
  const sequelize = new Sequelize(config);

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Get CFIT test
    const [results] = await sequelize.query(`
      SELECT 
        id,
        name,
        code,
        jsonb_array_length(questions) as total_items,
        questions
      FROM "PsychologyTestTypes"
      WHERE code = 'CFIT'
      AND "tenantId" = 'cfb6ff5b-5e05-4a94-95c5-4584db9ac6d1'
    `);

    if (results.length === 0) {
      console.log('❌ CFIT test not found');
      process.exit(1);
    }

    const cfit = results[0];
    console.log('CFIT Test:', cfit.name);
    console.log('Total items:', cfit.total_items);
    console.log('');

    // Parse questions
    const questions = cfit.questions;
    
    // Count items by type
    const instructions = questions.filter(q => q.type === 'instruction');
    const questionItems = questions.filter(q => q.type === 'question');
    
    console.log('📊 Summary:');
    console.log(`  Instructions: ${instructions.length}`);
    console.log(`  Questions: ${questionItems.length}`);
    console.log('');

    // Show instruction details
    console.log('📝 Instruction Details:\n');
    
    instructions.forEach((inst, idx) => {
      console.log(`${idx + 1}. ${inst.subtest.toUpperCase()}`);
      console.log(`   Title: ${inst.title}`);
      console.log(`   Subtitle: ${inst.subtitle}`);
      console.log(`   Intro: ${inst.content.intro.substring(0, 60)}...`);
      console.log(`   Examples: ${inst.content.examples.length}`);
      console.log(`   Rules: ${inst.content.rules.length}`);
      console.log(`   Warnings: ${inst.content.warnings?.length || 0}`);
      console.log(`   Time Limit: ${inst.content.timeLimit}s`);
      console.log('');
    });

    // Show structure
    console.log('📁 Question Array Structure:\n');
    
    let currentSubtest = null;
    let subtestCount = 0;
    
    questions.forEach((item, idx) => {
      if (item.type === 'instruction') {
        currentSubtest = item.subtest;
        subtestCount = 0;
        console.log(`\n[${idx}] INSTRUCTION - ${item.subtest.toUpperCase()}`);
        console.log(`    "${item.title}"`);
      } else {
        subtestCount++;
        if (subtestCount === 1) {
          console.log(`[${idx}] Question ${item.number} (${item.subtest}) - First question`);
        }
      }
    });

    // Find last question per subtest
    console.log('\n\n📍 Subtest Boundaries:\n');
    
    const subtests = ['series', 'classification', 'matrices', 'topology'];
    subtests.forEach(subtest => {
      const subtestItems = questions.filter(q => q.subtest === subtest);
      const instruction = subtestItems.find(q => q.type === 'instruction');
      const subtestQuestions = subtestItems.filter(q => q.type === 'question');
      
      console.log(`${subtest.toUpperCase()}:`);
      console.log(`  Instruction: "${instruction.title}"`);
      console.log(`  Questions: ${subtestQuestions.length} items`);
      console.log(`  First: #${subtestQuestions[0].number}, Last: #${subtestQuestions[subtestQuestions.length - 1].number}`);
      console.log('');
    });

    console.log('✅ Verification complete!');
    console.log('\n🎯 Next Steps:');
    console.log('1. Frontend should detect type: "instruction"');
    console.log('2. Render instruction page with examples, rules, warnings');
    console.log('3. Show "Saya Mengerti, Mulai Tes" button');
    console.log('4. Start timer when user proceeds to questions');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

verifyInstructions();
